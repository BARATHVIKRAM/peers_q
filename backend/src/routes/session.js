const express = require('express');
const QRCode = require('qrcode');
const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Create session
router.post('/create', authenticate, async (req, res) => {
  try {
    const { quizId, settings } = req.body;

    const quiz = await Quiz.findOne({ _id: quizId, createdBy: req.user._id });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Generate unique code
    let code, existing;
    do {
      code = Session.generateCode();
      existing = await Session.findOne({ code, status: { $ne: 'finished' } });
    } while (existing);

    // Generate QR code
    const joinUrl = `${process.env.CLIENT_URL}/join/${code}`;
    const qrCode = await QRCode.toDataURL(joinUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#0A1628', light: '#FFFFFF' }
    });

    const session = await Session.create({
      code,
      quizId,
      hostId: req.user._id,
      settings: settings || {},
      qrCode
    });

    await Quiz.findByIdAndUpdate(quizId, { $inc: { totalPlays: 1 } });

    res.status(201).json({ session, joinUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session by code (for participants)
router.get('/code/:code', async (req, res) => {
  try {
    const session = await Session.findOne({
      code: req.params.code.toUpperCase(),
      status: { $ne: 'finished' }
    }).populate('quizId', 'title description coverImage');

    if (!session) return res.status(404).json({ error: 'Session not found or already ended' });
    if (session.participants.length >= session.settings.maxParticipants) {
      return res.status(400).json({ error: 'Session is full' });
    }

    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session results
router.get('/:id/results', authenticate, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, hostId: req.user._id })
      .populate('quizId');
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all sessions for host
router.get('/', authenticate, async (req, res) => {
  try {
    const sessions = await Session.find({ hostId: req.user._id })
      .populate('quizId', 'title')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
