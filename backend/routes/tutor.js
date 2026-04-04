const router = require('express').Router();
const { Firestore } = require('@google-cloud/firestore');
const { VertexAI } = require('@google-cloud/vertexai');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.VERTEX_AI_LOCATION,
});

// POST /api/tutor/chat — student asks AI tutor about their results
router.post('/chat', async (req, res) => {
  try {
    const { token, message, history = [] } = req.body;

    const doc = await db.collection('submissions').doc(token).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const submission = doc.data();
    const report = submission.report;

    const model = vertexAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL,
    });

    const systemContext = `You are a helpful academic tutor. 
The student just completed an oral defense. Here is their evaluation report:
${JSON.stringify(report, null, 2)}

Help them understand where they went wrong and how to improve.
Be specific — reference their actual answers from the defense.
Be encouraging but honest.`;

    const contents = [
      { role: 'user', parts: [{ text: systemContext }] },
      { role: 'model', parts: [{ text: 'I have reviewed your defense report. How can I help you understand your results?' }] },
      ...history,
      { role: 'user', parts: [{ text: message }] },
    ];

    const result = await model.generateContent({ contents });
    const reply = result.response.candidates[0].content.parts[0].text;

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;