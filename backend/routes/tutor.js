const router = require('express').Router();
const { Firestore } = require('@google-cloud/firestore');
const { VertexAI } = require('@google-cloud/vertexai');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.VERTEX_AI_LOCATION,
});

router.post('/chat', async (req, res) => {
  try {
    const { reportId, message, history = [] } = req.body;

    if (!reportId || !message) {
      return res.status(400).json({ error: 'reportId and message are required' });
    }

    const reportDoc = await db.collection('reports').doc(reportId).get();
    if (!reportDoc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportDoc.data();
    const sessionDoc = await db.collection('defense_sessions').doc(report.sessionId).get();
    const submissionDoc = await db.collection('submissions').doc(report.submissionId).get();
    const assignmentDoc = await db.collection('assignments').doc(report.assignmentId).get();

    const model = vertexAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
    const prompt = `You are an academic tutor reviewing a student's oral defense session.
Keep answers concise, spoken-word natural, and specific to the student's actual performance.

ASSIGNMENT:
${assignmentDoc.data()?.description || ''}

ADDITIONAL DETAILS:
${assignmentDoc.data()?.additionalDetails || ''}

COMPREHENSION REPORT:
${JSON.stringify(report, null, 2)}

DEFENSE Q&A:
${JSON.stringify(sessionDoc.data()?.transcript || [], null, 2)}

SUBMISSION ANALYSIS:
${JSON.stringify(submissionDoc.data()?.analysis || {}, null, 2)}

ADAPTIVE QUESTIONING CONTEXT:
${JSON.stringify((sessionDoc.data()?.transcript || []).map((entry) => ({
  questionText: entry.questionText,
  followUpAsked: entry.followUpAsked,
  voiceSignals: entry.voiceSignals,
})), null, 2)}

Explain clearly whether the student sounded like they understood their own submission or were relying on AI without understanding. Use markdown.`;

    const contents = [
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'model', parts: [{ text: 'Ready to help the student understand their defense results.' }] },
      ...history,
      { role: 'user', parts: [{ text: message }] },
    ];

    const result = await model.generateContent({ contents });
    const reply = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a tutor response.';

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
