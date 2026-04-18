const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  socketId: String,
  name: { type: String, required: true },
  avatar: { type: String, default: '' },
  score: { type: Number, default: 0 },
  answers: [{
    questionId: String,
    answerId: String,
    answerText: String,
    isCorrect: Boolean,
    timeTaken: Number,
    pointsEarned: Number,
    answeredAt: Date
  }],
  rank: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const sessionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hostSocketId: String,
  status: {
    type: String,
    enum: ['waiting', 'active', 'question_active', 'question_ended', 'leaderboard', 'finished'],
    default: 'waiting'
  },
  participants: [participantSchema],
  currentQuestionIndex: { type: Number, default: -1 },
  currentQuestionStartTime: Date,
  settings: {
    maxParticipants: { type: Number, default: 50 },
    showLeaderboardAfterEach: { type: Boolean, default: true },
    randomizeQuestions: { type: Boolean, default: false },
    randomizeOptions: { type: Boolean, default: false }
  },
  startedAt: Date,
  endedAt: Date,
  qrCode: String
}, { timestamps: true });

// Generate a unique 6-char code
sessionSchema.statics.generateCode = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = mongoose.model('Session', sessionSchema);
