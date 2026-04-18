const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, TXT, and MD files are supported'));
  }
});

// Extract text from file
const extractText = async (filePath, mimetype) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else {
    return fs.readFileSync(filePath, 'utf-8');
  }
};

// Generate questions with Groq AI
const generateQuestionsWithAI = async (text, count = 10, difficulty = 'medium') => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const truncatedText = text.substring(0, 8000);

  const prompt = `You are a quiz generation expert. Based on the following content, generate exactly ${count} multiple-choice quiz questions.

CONTENT:
${truncatedText}

REQUIREMENTS:
- Difficulty: ${difficulty}
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE correct answer per question
- Questions should test understanding, not just memorization
- Make distractors plausible but clearly wrong to someone who understands the material

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "text": "Question text here?",
    "options": [
      {"id": "a", "text": "Option A text", "isCorrect": false},
      {"id": "b", "text": "Option B text", "isCorrect": true},
      {"id": "c", "text": "Option C text", "isCorrect": false},
      {"id": "d", "text": "Option D text", "isCorrect": false}
    ],
    "explanation": "Brief explanation of why the correct answer is right",
    "timeLimit": 30,
    "points": 100
  }
]

Generate exactly ${count} questions. Return only the JSON array, no other text.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 4000
  });

  const responseText = completion.choices[0]?.message?.content || '[]';

  // Clean and parse JSON
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid AI response format');

  return JSON.parse(jsonMatch[0]);
};

// Upload and generate quiz
router.post('/generate', authenticate, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { questionCount = 10, difficulty = 'medium', title } = req.body;

    // Extract text
    const text = await extractText(filePath, req.file.mimetype);
    if (!text || text.trim().length < 100) {
      return res.status(400).json({ error: 'File content too short or could not be extracted' });
    }

    // Generate questions
    const questions = await generateQuestionsWithAI(
      text,
      Math.min(parseInt(questionCount) || 10, 20),
      difficulty
    );

    const { v4: uuidv4 } = require('uuid');
    const processedQuestions = questions.map((q, idx) => ({
      ...q,
      id: uuidv4(),
      type: 'multiple_choice',
      orderIndex: idx
    }));

    res.json({
      questions: processedQuestions,
      sourceText: text.substring(0, 500) + '...',
      fileName: req.file.originalname,
      questionCount: processedQuestions.length
    });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate quiz' });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// Upload image for question
router.post('/image', authenticate, multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are supported'));
  }
}).single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
