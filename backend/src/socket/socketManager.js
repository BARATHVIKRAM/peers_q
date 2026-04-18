const Groq = require('groq-sdk');
const Session = require('../models/Session');
const Quiz = require('../models/Quiz');

// In-memory active session cache
const activeSessions = new Map();

const DEFAULT_NAMES = ['Cosmic Fox','Neon Tiger','Pixel Wolf','Quantum Bear','Solar Hawk','Turbo Panda','Blaze Shark','Echo Lynx','Storm Raven','Nova Owl'];
const DEFAULT_AVATARS = ['🦊','🐯','🐺','🐻','🦅','🐼','🦈','🐱','🦉','🌟'];

const getDefaultName = (index) => DEFAULT_NAMES[index % DEFAULT_NAMES.length];
const getDefaultAvatar = (index) => DEFAULT_AVATARS[index % DEFAULT_AVATARS.length];

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    // ============================================================
    // HOST EVENTS
    // ============================================================

    socket.on('host:join_session', async ({ sessionCode }) => {
      try {
        const session = await Session.findOne({ code: sessionCode }).populate('quizId');
        if (!session) return socket.emit('error', { message: 'Session not found' });

        await Session.findByIdAndUpdate(session._id, { hostSocketId: socket.id });

        socket.join(`session:${sessionCode}`);
        socket.join(`host:${sessionCode}`);

        // Build cache
        if (!activeSessions.has(sessionCode)) {
          activeSessions.set(sessionCode, {
            sessionId: session._id.toString(),
            quiz: session.quizId,
            status: session.status,
            currentQuestionIndex: -1,
            participants: new Map(),
            questionStartTime: null,
            questionAnswers: new Map(),
            questionEnded: false
          });
        }

        const cache = activeSessions.get(sessionCode);
        session.participants.filter(p => p.isActive).forEach(p => {
          cache.participants.set(p.socketId || p._id.toString(), {
            id: p._id.toString(),
            socketId: p.socketId,
            name: p.name,
            avatar: p.avatar,
            score: p.score,
            streak: p.streak
          });
        });

        socket.emit('host:session_ready', {
          session: {
            _id: session._id,
            code: session.code,
            status: session.status,
            qrCode: session.qrCode,
            settings: session.settings
          },
          quiz: session.quizId,
          participants: session.participants.filter(p => p.isActive)
        });
      } catch (err) {
        console.error('host:join_session error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('host:start_quiz', async ({ sessionCode }) => {
      try {
        await Session.findOneAndUpdate({ code: sessionCode }, { status: 'active', startedAt: new Date() });
        const cache = activeSessions.get(sessionCode);
        if (cache) {
          cache.status = 'active';
          cache.currentQuestionIndex = -1; // reset

          // Assign default names to participants who haven't set one
          let idx = 0;
          for (const [, p] of cache.participants) {
            if (!p.name || p.name.trim() === '') {
              p.name = getDefaultName(idx);
              p.avatar = getDefaultAvatar(idx);
              await Session.findOneAndUpdate(
                { code: sessionCode, 'participants.socketId': p.socketId },
                { $set: { 'participants.$.name': p.name, 'participants.$.avatar': p.avatar } }
              );
              io.to(p.socketId).emit('participant:name_assigned', { name: p.name, avatar: p.avatar });
            }
            idx++;
          }
        }
        io.to(`session:${sessionCode}`).emit('quiz:started', { sessionCode });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Host moves to next question (with 5s countdown buffer)
    socket.on('host:next_question', async ({ sessionCode }) => {
      try {
        const cache = activeSessions.get(sessionCode);
        if (!cache) return socket.emit('error', { message: 'Session not found' });

        const session = await Session.findOne({ code: sessionCode }).populate('quizId');
        const quiz = session.quizId;
        const nextIndex = cache.currentQuestionIndex + 1;

        // ── Check if quiz is actually over ──
        if (nextIndex >= quiz.questions.length) {
          await endQuiz(io, sessionCode, session._id);
          return;
        }

        cache.questionEnded = false;
        cache.questionAnswers = new Map();

        // ── 5-second buffer countdown before question ──
        io.to(`session:${sessionCode}`).emit('question:countdown', {
          seconds: 5,
          questionIndex: nextIndex,
          totalQuestions: quiz.questions.length,
          questionNumber: nextIndex + 1
        });

        setTimeout(async () => {
          // Re-fetch in case something changed during buffer
          const freshSession = await Session.findOne({ code: sessionCode }).populate('quizId');
          const question = freshSession.quizId.questions[nextIndex];
          const startTime = new Date();

          await Session.findByIdAndUpdate(freshSession._id, {
            currentQuestionIndex: nextIndex,
            currentQuestionStartTime: startTime,
            status: 'question_active'
          });

          cache.currentQuestionIndex = nextIndex;
          cache.questionStartTime = startTime;
          cache.status = 'question_active';

          // Host gets full question with answers
          socket.emit('question:start_host', {
            question,
            questionIndex: nextIndex,
            totalQuestions: freshSession.quizId.questions.length,
            startTime: startTime.toISOString()
          });

          // Participants get question WITHOUT correct answers
          const participantQ = {
            id: question.id,
            text: question.text,
            image: question.image,
            type: question.type,
            options: question.options.map(o => ({ id: o.id, text: o.text })),
            timeLimit: question.timeLimit,
            points: question.points,
            questionIndex: nextIndex,
            totalQuestions: freshSession.quizId.questions.length,
            startTime: startTime.toISOString()
          };
          socket.to(`session:${sessionCode}`).emit('question:start', participantQ);

          // Auto-end after time limit (+2s grace)
          setTimeout(async () => {
            const currentCache = activeSessions.get(sessionCode);
            if (currentCache &&
                !currentCache.questionEnded &&
                currentCache.status === 'question_active' &&
                currentCache.currentQuestionIndex === nextIndex) {
              await endQuestion(io, sessionCode, freshSession._id, question, nextIndex);
            }
          }, (question.timeLimit + 2) * 1000);

        }, 5000); // 5-second buffer

      } catch (err) {
        console.error('host:next_question error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // Host manually ends current question early
    socket.on('host:end_question', async ({ sessionCode }) => {
      try {
        const cache = activeSessions.get(sessionCode);
        if (!cache || cache.questionEnded) return;

        const session = await Session.findOne({ code: sessionCode }).populate('quizId');
        const question = session.quizId.questions[cache.currentQuestionIndex];
        await endQuestion(io, sessionCode, session._id, question, cache.currentQuestionIndex);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Host shows leaderboard
    socket.on('host:show_leaderboard', async ({ sessionCode }) => {
      try {
        const leaderboard = await getLeaderboard(sessionCode);
        await Session.findOneAndUpdate({ code: sessionCode }, { status: 'leaderboard' });
        const cache = activeSessions.get(sessionCode);
        if (cache) cache.status = 'leaderboard';
        io.to(`session:${sessionCode}`).emit('leaderboard:show', { leaderboard });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Host ends quiz early
    socket.on('host:end_quiz', async ({ sessionCode }) => {
      try {
        const session = await Session.findOne({ code: sessionCode });
        if (session) await endQuiz(io, sessionCode, session._id);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Host kicks participant
    socket.on('host:kick_participant', async ({ sessionCode, participantId }) => {
      try {
        const cache = activeSessions.get(sessionCode);
        if (cache) {
          for (const [socketId, p] of cache.participants) {
            if (p.id === participantId) {
              io.to(socketId).emit('participant:kicked');
              cache.participants.delete(socketId);
              break;
            }
          }
        }
        await Session.findOneAndUpdate(
          { code: sessionCode },
          { $set: { 'participants.$[elem].isActive': false } },
          { arrayFilters: [{ 'elem._id': participantId }] }
        );
        const participants = await getParticipants(sessionCode);
        io.to(`session:${sessionCode}`).emit('participants:updated', { participants });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ============================================================
    // PARTICIPANT EVENTS
    // ============================================================

    socket.on('participant:join', async ({ sessionCode, name, avatar }) => {
      try {
        const session = await Session.findOne({
          code: sessionCode.toUpperCase(),
          status: { $ne: 'finished' }
        });

        if (!session) return socket.emit('error', { message: 'Session not found or ended' });
        if (session.participants.filter(p => p.isActive).length >= session.settings.maxParticipants) {
          return socket.emit('error', { message: 'Session is full (max 50)' });
        }

        const cleanName = name?.trim()?.substring(0, 30) || '';
        const participantData = {
          socketId: socket.id,
          name: cleanName,
          avatar: avatar || '🎯',
          score: 0,
          answers: [],
          streak: 0,
          isActive: true,
          joinedAt: new Date()
        };

        await Session.findByIdAndUpdate(session._id, { $push: { participants: participantData } });

        const cache = activeSessions.get(sessionCode.toUpperCase());
        if (cache) {
          cache.participants.set(socket.id, {
            id: socket.id,
            socketId: socket.id,
            name: cleanName,
            avatar: participantData.avatar,
            score: 0,
            streak: 0
          });
        }

        socket.join(`session:${sessionCode.toUpperCase()}`);

        socket.emit('participant:joined', {
          participant: participantData,
          session: { code: session.code, status: session.status }
        });

        const participants = await getParticipants(sessionCode.toUpperCase());
        io.to(`session:${sessionCode.toUpperCase()}`).emit('participants:updated', { participants });

      } catch (err) {
        console.error('participant:join error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // Participant submits answer (supports multi-choice)
    socket.on('participant:answer', async ({ sessionCode, questionId, answerId, answerIds, answerText }) => {
      try {
        const cache = activeSessions.get(sessionCode);
        if (!cache || cache.status !== 'question_active') return socket.emit('answer:too_late');
        if (cache.questionAnswers.has(socket.id)) return socket.emit('answer:already_submitted');

        const session = await Session.findOne({ code: sessionCode });
        const quiz = await Quiz.findById(session.quizId);
        const question = quiz.questions.find(q => q.id === questionId);
        if (!question) return;

        const timeTaken = (new Date() - cache.questionStartTime) / 1000;
        let isCorrect = false;
        let selectedId = answerId;

        if (question.type === 'multiple_select') {
          // multi-choice: all correct options must be selected, no wrong ones
          const correctIds = new Set(question.options.filter(o => o.isCorrect).map(o => o.id));
          const selectedIds = new Set(answerIds || []);
          isCorrect = [...correctIds].every(id => selectedIds.has(id)) &&
                      [...selectedIds].every(id => correctIds.has(id));
          selectedId = (answerIds || []).join(',');
        } else {
          const correctOption = question.options.find(o => o.isCorrect);
          isCorrect = answerId === correctOption?.id;
        }

        let pointsEarned = 0;
        if (isCorrect) {
          const timeBonus = Math.max(0, 1 - (timeTaken / question.timeLimit));
          pointsEarned = Math.round(question.points * (0.5 + 0.5 * timeBonus));
        }

        cache.questionAnswers.set(socket.id, {
          participantName: cache.participants.get(socket.id)?.name,
          answerId: selectedId,
          isCorrect,
          timeTaken,
          pointsEarned
        });

        // Push answer + increment score (separated to avoid MongoDB conflict)
        await Session.findOneAndUpdate(
          { code: sessionCode, 'participants.socketId': socket.id },
          {
            $push: { 'participants.$.answers': { questionId, answerId: selectedId, answerText, isCorrect, timeTaken, pointsEarned, answeredAt: new Date() } },
            $inc: { 'participants.$.score': pointsEarned }
          }
        );
        // Streak update separate (cannot mix $inc and $set in same op)
        if (isCorrect) {
          await Session.findOneAndUpdate(
            { code: sessionCode, 'participants.socketId': socket.id },
            { $inc: { 'participants.$.streak': 1 } }
          );
        } else {
          await Session.findOneAndUpdate(
            { code: sessionCode, 'participants.socketId': socket.id },
            { $set: { 'participants.$.streak': 0 } }
          );
        }

        const cachedP = cache.participants.get(socket.id);
        if (cachedP) {
          cachedP.score += pointsEarned;
          if (isCorrect) cachedP.streak = (cachedP.streak || 0) + 1;
          else cachedP.streak = 0;
        }

        const correctOption = question.options.find(o => o.isCorrect);
        socket.emit('answer:received', {
          isCorrect,
          pointsEarned,
          timeTaken: Math.round(timeTaken * 10) / 10,
          correctAnswerId: correctOption?.id
        });

        const answerCount = cache.questionAnswers.size;
        const totalParticipants = cache.participants.size;

        io.to(`host:${sessionCode}`).emit('host:answer_update', {
          answerCount,
          totalParticipants,
          percentage:
            totalParticipants > 0
              ? Math.round((answerCount / totalParticipants) * 100)
              : 0
        });

// Timer always runs to completion — no auto-end when all answered
} catch (err) {
  console.error('participant:answer error:', err);
  socket.emit('error', { message: err.message });
}
});

    // ============================================================
    // DISCONNECT
    // ============================================================
    socket.on('disconnect', async () => {
      for (const [sessionCode, cache] of activeSessions) {
        if (cache.participants.has(socket.id)) {
          cache.participants.delete(socket.id);
          await Session.findOneAndUpdate(
            { code: sessionCode, 'participants.socketId': socket.id },
            { $set: { 'participants.$.isActive': false } }
          ).catch(() => {});
          const participants = await getParticipants(sessionCode).catch(() => []);
          io.to(`session:${sessionCode}`).emit('participants:updated', { participants });
          break;
        }
      }
    });
  });
};

// ── Helper: End a question ──
async function endQuestion(io, sessionCode, sessionId, question, questionIndex) {
  const cache = activeSessions.get(sessionCode);
  if (!cache || cache.questionEnded) return;

  cache.questionEnded = true;
  cache.status = 'question_ended';

  await Session.findByIdAndUpdate(sessionId, { status: 'question_ended' });

  const answerStats = {};
  question.options.forEach(o => {
    answerStats[o.id] = { count: 0, text: o.text, isCorrect: o.isCorrect };
  });

  for (const [, ans] of cache.questionAnswers) {
    if (ans.answerId) {
      // Handle multi-select (comma-separated IDs)
      const ids = ans.answerId.split(',');
      ids.forEach(id => {
        if (answerStats[id]) answerStats[id].count++;
      });
    }
  }

  const correctAnswerIds = question.options.filter(o => o.isCorrect).map(o => o.id);

  // Generate AI explanation via Groq (2-3 lines max)
  let aiExplanation = question.explanation || '';
  try {
    if (process.env.GROQ_API_KEY) {
      const correctOptionText = question.options.find(o => o.isCorrect)?.text || '';
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const resp = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 120,
        temperature: 0.4,
        messages: [{
          role: 'user',
          content: `Question: "${question.text}"\nCorrect answer: "${correctOptionText}"\n\nWrite a clear 2-sentence explanation of why this is correct. Be concise and educational. No bullet points, no markdown.`
        }]
      });
      const generated = resp.choices[0]?.message?.content?.trim();
      if (generated) aiExplanation = generated;
    }
  } catch (e) {
    console.error('Groq explanation error:', e.message);
    // fallback to stored explanation silently
  }

  io.to(`session:${sessionCode}`).emit('question:ended', {
    questionId: question.id,
    correctAnswerId: correctAnswerIds[0],
    correctAnswerIds,
    answerStats,
    totalAnswers: cache.questionAnswers.size,
    explanation: aiExplanation,
    questionIndex
  });

  // Host manually controls leaderboard via host:show_leaderboard event
}

// ── Helper: End quiz ──
async function endQuiz(io, sessionCode, sessionId) {
  const cache = activeSessions.get(sessionCode);

  await Session.findByIdAndUpdate(sessionId, { status: 'finished', endedAt: new Date() });
  if (cache) cache.status = 'finished';

  const leaderboard = await getLeaderboard(sessionCode);
  io.to(`session:${sessionCode}`).emit('quiz:finished', { leaderboard });

  setTimeout(() => activeSessions.delete(sessionCode), 120000);
}

// ── Helper: Leaderboard ──
async function getLeaderboard(sessionCode) {
  const session = await Session.findOne({ code: sessionCode });
  if (!session) return [];
  return session.participants
    .filter(p => p.isActive !== false)
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
      correctAnswers: p.answers.filter(a => a.isCorrect).length,
      totalAnswers: p.answers.length
    }));
}

// ── Helper: Participants list ──
async function getParticipants(sessionCode) {
  const session = await Session.findOne({ code: sessionCode });
  if (!session) return [];
  return session.participants
    .filter(p => p.isActive !== false)
    .map(p => ({
      id: p._id.toString(),
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak
    }));
}

module.exports = { initializeSocket };
