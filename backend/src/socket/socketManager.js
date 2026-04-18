const Session = require('../models/Session');
const Quiz = require('../models/Quiz');

//This is just a simple comment line
// In-memory store for active sessions (faster than DB for real-time ops)
const activeSessions = new Map();

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ==================== HOST EVENTS ====================

    // Host creates/joins session room
    socket.on('host:join_session', async ({ sessionCode, hostToken }) => {
      try {
        const session = await Session.findOne({ code: sessionCode })
          .populate('quizId');

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Update host socket ID
        await Session.findByIdAndUpdate(session._id, { hostSocketId: socket.id });

        socket.join(`session:${sessionCode}`);
        socket.join(`host:${sessionCode}`);

        // Cache session data
        activeSessions.set(sessionCode, {
          sessionId: session._id.toString(),
          quiz: session.quizId,
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex,
          participants: new Map(),
          questionStartTime: null,
          questionAnswers: new Map()
        });

        // Send existing participants
        const existingParticipants = session.participants.filter(p => p.isActive);
        existingParticipants.forEach(p => {
          const cache = activeSessions.get(sessionCode);
          if (cache) {
            cache.participants.set(p.socketId || p._id.toString(), {
              id: p._id.toString(),
              socketId: p.socketId,
              name: p.name,
              avatar: p.avatar,
              score: p.score,
              streak: p.streak
            });
          }
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
          participants: existingParticipants
        });

      } catch (err) {
        console.error('host:join_session error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // Host starts the quiz
    socket.on('host:start_quiz', async ({ sessionCode }) => {
      try {
        await Session.findOneAndUpdate(
          { code: sessionCode },
          { status: 'active', startedAt: new Date() }
        );

        const cache = activeSessions.get(sessionCode);
        if (cache) cache.status = 'active';

        io.to(`session:${sessionCode}`).emit('quiz:started', { sessionCode });

      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Host sends next question
    socket.on('host:next_question', async ({ sessionCode }) => {
      try {
        const cache = activeSessions.get(sessionCode);
        if (!cache) return socket.emit('error', { message: 'Session not found' });

        const session = await Session.findOne({ code: sessionCode }).populate('quizId');
        const quiz = session.quizId;
        const nextIndex = (session.currentQuestionIndex || -1) + 1;

        if (nextIndex >= quiz.questions.length) {
          // Quiz finished
          await endQuiz(io, sessionCode, session._id);
          return;
        }

        const question = quiz.questions[nextIndex];
        const startTime = new Date();

        // Update DB
        await Session.findByIdAndUpdate(session._id, {
          currentQuestionIndex: nextIndex,
          currentQuestionStartTime: startTime,
          status: 'question_active'
        });

        // Update cache
        cache.currentQuestionIndex = nextIndex;
        cache.questionStartTime = startTime;
        cache.status = 'question_active';
        cache.questionAnswers = new Map();

        // Send question to everyone
        // Host gets full question with answers
        socket.emit('question:start_host', {
          question,
          questionIndex: nextIndex,
          totalQuestions: quiz.questions.length,
          startTime: startTime.toISOString()
        });

        // Participants get question WITHOUT correct answers
        const participantQuestion = {
          id: question.id,
          text: question.text,
          image: question.image,
          type: question.type,
          options: question.options.map(o => ({ id: o.id, text: o.text })),
          timeLimit: question.timeLimit,
          points: question.points,
          questionIndex: nextIndex,
          totalQuestions: quiz.questions.length,
          startTime: startTime.toISOString()
        };

        socket.to(`session:${sessionCode}`).emit('question:start', participantQuestion);

        // Auto-end question after time limit
        setTimeout(async () => {
          const currentCache = activeSessions.get(sessionCode);
          if (currentCache && currentCache.status === 'question_active' &&
              currentCache.currentQuestionIndex === nextIndex) {
            await endQuestion(io, sessionCode, session._id, question, nextIndex);
          }
        }, (question.timeLimit + 2) * 1000);

      } catch (err) {
        console.error('host:next_question error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // Host manually ends question
    socket.on('host:end_question', async ({ sessionCode }) => {
      try {
        const cache = activeSessions.get(sessionCode);
        if (!cache) return;

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
        io.to(`session:${sessionCode}`).emit('leaderboard:show', { leaderboard });

        await Session.findOneAndUpdate({ code: sessionCode }, { status: 'leaderboard' });
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

    // ==================== PARTICIPANT EVENTS ====================

    // Participant joins session
    socket.on('participant:join', async ({ sessionCode, name, avatar }) => {
      try {
        const session = await Session.findOne({
          code: sessionCode.toUpperCase(),
          status: { $ne: 'finished' }
        });

        if (!session) {
          socket.emit('error', { message: 'Session not found or already ended' });
          return;
        }

        if (session.participants.length >= session.settings.maxParticipants) {
          socket.emit('error', { message: 'Session is full (max 50 participants)' });
          return;
        }

        // Add participant to DB
        const participant = {
          socketId: socket.id,
          name: name.trim().substring(0, 30),
          avatar: avatar || generateAvatar(name),
          score: 0,
          answers: [],
          streak: 0,
          isActive: true,
          joinedAt: new Date()
        };

        await Session.findByIdAndUpdate(session._id, {
          $push: { participants: participant }
        });

        // Add to cache
        const cache = activeSessions.get(sessionCode.toUpperCase());
        if (cache) {
          cache.participants.set(socket.id, {
            id: socket.id,
            socketId: socket.id,
            name: participant.name,
            avatar: participant.avatar,
            score: 0,
            streak: 0
          });
        }

        socket.join(`session:${sessionCode.toUpperCase()}`);
        socket.join(`participant:${socket.id}`);

        // Confirm join
        socket.emit('participant:joined', {
          participant,
          session: {
            code: session.code,
            status: session.status,
            quizTitle: session.quizId?.title
          }
        });

        // Notify host and all participants
        const participants = await getParticipants(sessionCode.toUpperCase());
        io.to(`session:${sessionCode.toUpperCase()}`).emit('participants:updated', { participants });

        console.log(`${name} joined session ${sessionCode}`);

      } catch (err) {
        console.error('participant:join error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // Participant submits answer
    socket.on('participant:answer', async ({ sessionCode, questionId, answerId, answerText }) => {
      try {
        const cache = activeSessions.get(sessionCode);
        if (!cache || cache.status !== 'question_active') {
          socket.emit('answer:too_late');
          return;
        }

        // Check if already answered
        if (cache.questionAnswers.has(socket.id)) {
          socket.emit('answer:already_submitted');
          return;
        }

        const session = await Session.findOne({ code: sessionCode });
        const quiz = await Quiz.findById(session.quizId);
        const question = quiz.questions.find(q => q.id === questionId);

        if (!question) return socket.emit('error', { message: 'Question not found' });

        const timeTaken = (new Date() - cache.questionStartTime) / 1000;
        const correctOption = question.options.find(o => o.isCorrect);
        const isCorrect = answerId === correctOption?.id;

        // Calculate points (faster = more points)
        let pointsEarned = 0;
        if (isCorrect) {
          const timeBonus = Math.max(0, 1 - (timeTaken / question.timeLimit));
          pointsEarned = Math.round(question.points * (0.5 + 0.5 * timeBonus));
        }

        // Record answer in cache
        cache.questionAnswers.set(socket.id, {
          participantName: cache.participants.get(socket.id)?.name,
          answerId,
          isCorrect,
          timeTaken,
          pointsEarned
        });

        // Update DB
        await Session.findOneAndUpdate(
          { code: sessionCode, 'participants.socketId': socket.id },
          {
            $push: {
              'participants.$.answers': {
                questionId,
                answerId,
                answerText,
                isCorrect,
                timeTaken,
                pointsEarned,
                answeredAt: new Date()
              }
            },
            $inc: { 'participants.$.score': pointsEarned },
            ...(isCorrect ? { $inc: { 'participants.$.streak': 1 } } : { $set: { 'participants.$.streak': 0 } })
          }
        );

        // Update cache participant score
        const cachedParticipant = cache.participants.get(socket.id);
        if (cachedParticipant) {
          cachedParticipant.score += pointsEarned;
          if (isCorrect) cachedParticipant.streak += 1;
          else cachedParticipant.streak = 0;
        }

        // Confirm to participant
        socket.emit('answer:received', {
          isCorrect,
          pointsEarned,
          timeTaken: Math.round(timeTaken * 10) / 10,
          correctAnswerId: correctOption?.id
        });

        // Notify host of answer count
        const answerCount = cache.questionAnswers.size;
        const totalParticipants = cache.participants.size;
        io.to(`host:${sessionCode}`).emit('host:answer_update', {
          answerCount,
          totalParticipants,
          percentage: Math.round((answerCount / totalParticipants) * 100)
        });

        // Auto-end if all answered
        if (answerCount >= totalParticipants && totalParticipants > 0) {
          const currentSession = await Session.findOne({ code: sessionCode }).populate('quizId');
          const currentQuestion = currentSession.quizId.questions[cache.currentQuestionIndex];
          await endQuestion(io, sessionCode, currentSession._id, currentQuestion, cache.currentQuestionIndex);
        }

      } catch (err) {
        console.error('participant:answer error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // ==================== DISCONNECT ====================

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      // Find which session this socket was in
      for (const [sessionCode, cache] of activeSessions) {
        if (cache.participants.has(socket.id)) {
          cache.participants.delete(socket.id);

          // Mark as inactive in DB
          await Session.findOneAndUpdate(
            { code: sessionCode, 'participants.socketId': socket.id },
            { $set: { 'participants.$.isActive': false } }
          );

          const participants = await getParticipants(sessionCode);
          io.to(`session:${sessionCode}`).emit('participants:updated', { participants });
          break;
        }
      }
    });
  });
};

// Helper: End a question
async function endQuestion(io, sessionCode, sessionId, question, questionIndex) {
  const cache = activeSessions.get(sessionCode);
  if (!cache) return;

  cache.status = 'question_ended';

  await Session.findByIdAndUpdate(sessionId, { status: 'question_ended' });

  // Build answer stats
  const answerStats = {};
  question.options.forEach(o => { answerStats[o.id] = { count: 0, text: o.text, isCorrect: o.isCorrect }; });

  for (const [, ans] of cache.questionAnswers) {
    if (ans.answerId && answerStats[ans.answerId]) {
      answerStats[ans.answerId].count++;
    }
  }

  const correctAnswerId = question.options.find(o => o.isCorrect)?.id;
  const totalAnswers = cache.questionAnswers.size;

  io.to(`session:${sessionCode}`).emit('question:ended', {
    questionId: question.id,
    correctAnswerId,
    answerStats,
    totalAnswers,
    explanation: question.explanation,
    questionIndex
  });
}

// Helper: End the entire quiz
async function endQuiz(io, sessionCode, sessionId) {
  const cache = activeSessions.get(sessionCode);

  await Session.findByIdAndUpdate(sessionId, {
    status: 'finished',
    endedAt: new Date()
  });

  if (cache) cache.status = 'finished';

  const leaderboard = await getLeaderboard(sessionCode);

  io.to(`session:${sessionCode}`).emit('quiz:finished', { leaderboard });

  // Cleanup cache after delay
  setTimeout(() => activeSessions.delete(sessionCode), 60000);
}

// Helper: Get leaderboard
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

// Helper: Get participants
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

// Helper: Generate avatar emoji
function generateAvatar(name) {
  const avatars = ['🦊', '🐺', '🦁', '🐯', '🦝', '🐸', '🦋', '🦄', '🐉', '🦅', '🐬', '🦈', '🦍', '🐙', '🦑'];
  const index = name.charCodeAt(0) % avatars.length;
  return avatars[index];
}

module.exports = { initializeSocket };
