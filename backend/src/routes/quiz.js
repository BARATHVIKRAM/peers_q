const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Quiz = require('../models/Quiz');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all quizzes for user
router.get('/', authenticate, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .sort({ updatedAt: -1 })
      .select('-questions');
    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single quiz
router.get('/:id', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create quiz
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, questions, tags, category, isPublic } = req.body;

    const processedQuestions = (questions || []).map((q, idx) => ({
      ...q,
      id: q.id || uuidv4(),
      orderIndex: idx
    }));

    const quiz = await Quiz.create({
      title,
      description,
      questions: processedQuestions,
      tags,
      category,
      isPublic,
      createdBy: req.user._id
    });

    res.status(201).json({ quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update quiz
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, questions, tags, category, isPublic, coverImage } = req.body;

    const processedQuestions = (questions || []).map((q, idx) => ({
      ...q,
      id: q.id || uuidv4(),
      orderIndex: idx
    }));

    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { title, description, questions: processedQuestions, tags, category, isPublic, coverImage },
      { new: true }
    );

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete quiz
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Quiz.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
