const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Use memory storage for images (no persistent disk on Render free tier)
const memoryStorage = multer.memoryStorage();

// Disk storage only for PDF/text (temp, deleted after use)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`);
  }
});

const docUpload = multer({
  storage: diskStorage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF, TXT, MD supported'));
  }
});

const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only image files supported'));
  }
});

// Extract text from uploaded file
const extractText = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  }
  return fs.readFileSync(filePath, 'utf-8');
};

// Generate questions with Groq AI
const generateQuestionsWithAI = async (text, count = 10, difficulty = 'medium', customPrompt = '') => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const truncated = text.substring(0, 8000);

  const prompt = `You are a quiz generation expert. Based on the following content, generate exactly ${count} multiple-choice quiz questions.

CONTENT:
${truncated}

REQUIREMENTS:
- Difficulty: ${difficulty}
${customPrompt ? `- Special instruction: ${customPrompt}` : ''}
- Each question must have exactly 4 options
- Only ONE correct answer per question
- Correct answer should be placed at a RANDOM position (not always second)
- Questions should test understanding, not just memorization
- Make distractors plausible but clearly wrong

Respond ONLY with a valid JSON array, no markdown, no backticks:
[
  {
    "text": "Question text here?",
    "options": [
      {"id": "a", "text": "Option A", "isCorrect": false},
      {"id": "b", "text": "Option B", "isCorrect": false},
      {"id": "c", "text": "Correct answer", "isCorrect": true},
      {"id": "d", "text": "Option D", "isCorrect": false}
    ],
    "explanation": "Why this is correct",
    "timeLimit": 30,
    "points": 100
  }
]

Generate exactly ${count} questions. JSON only, no other text.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 4000
  });

  const responseText = completion.choices[0]?.message?.content || '[]';
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid AI response format');
  return JSON.parse(jsonMatch[0]);
};

// ── Upload image → returns base64 data URL (works on any host) ──
router.post('/image', authenticate, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const mime = req.file.mimetype;
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;

    res.json({ imageUrl: dataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Upload doc + generate quiz ──
router.post('/generate', authenticate, docUpload.single('file'), async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { questionCount = 10, difficulty = 'medium', customPrompt = '' } = req.body;
    const text = await extractText(filePath);

    if (!text || text.trim().length < 100) {
      return res.status(400).json({ error: 'File content too short or unreadable' });
    }

    const questions = await generateQuestionsWithAI(
      text, Math.min(parseInt(questionCount) || 10, 20), difficulty, customPrompt
    );

    const { v4: uuidv4 } = require('uuid');
    const processed = questions.map((q, idx) => ({ ...q, id: uuidv4(), type: 'multiple_choice', orderIndex: idx }));

    res.json({ questions: processed, fileName: req.file.originalname, questionCount: processed.length });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate quiz' });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

// ── Generate quiz from pasted text ──
router.post('/generate-text', authenticate, async (req, res) => {
  try {
    const { text, questionCount = 10, difficulty = 'medium', customPrompt = '' } = req.body;
    if (!text || text.trim().length < 80) {
      return res.status(400).json({ error: 'Text too short (min 80 characters)' });
    }

    const questions = await generateQuestionsWithAI(
      text, Math.min(parseInt(questionCount) || 10, 20), difficulty, customPrompt
    );

    const { v4: uuidv4 } = require('uuid');
    const processed = questions.map((q, idx) => ({ ...q, id: uuidv4(), type: 'multiple_choice', orderIndex: idx }));

    res.json({ questions: processed, questionCount: processed.length });
  } catch (err) {
    console.error('generate-text error:', err);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

module.exports = router;
