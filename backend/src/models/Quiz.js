const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['multiple_choice', 'multiple_select', 'true_false', 'poll', 'open_ended'],
    default: 'multiple_choice'
  },
  text: { type: String, required: true },
  image: { type: String, default: '' },
  options: [{
    id: String,
    text: String,
    isCorrect: Boolean
  }],
  timeLimit: { type: Number, default: 30 },
  points: { type: Number, default: 100 },
  explanation: { type: String, default: '' },
  orderIndex: { type: Number, default: 0 }
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [questionSchema],
  isPublic: { type: Boolean, default: false },
  tags: [String],
  category: { type: String, default: 'general' },
  totalPlays: { type: Number, default: 0 },
  sourceDocument: {
    name: String,
    type: String,
    uploadedAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
