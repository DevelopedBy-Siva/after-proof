const router = require('express').Router();
const axios = require('axios');
const { Firestore, FieldValue } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });

router.get('/:sessionId', async (req, res) => {
  try {
    const sessionDoc = await db.collection('defense_sessions').doc(req.params.sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionDoc.data();
    const submissionDoc = await db.collection('submissions').doc(session.submissionId).get();
    const submission = submissionDoc.data();
    const assignmentDoc = await db.collection('assignments').doc(submission.assignmentId).get();
    const assignment = assignmentDoc.data();

    res.json({
      questions: submission.questions || [],
      studentName: session.studentName,
      assignmentTitle: assignment.title,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:sessionId/end', async (req, res) => {
  try {
    const { recordingGcsUrl } = req.body;
    const sessionRef = db.collection('defense_sessions').doc(req.params.sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionDoc.data();

    await sessionRef.update({
      status: 'complete',
      recordingGcsUrl: recordingGcsUrl || null,
      endedAt: FieldValue.serverTimestamp(),
    });

    await db.collection('submissions').doc(session.submissionId).update({
      status: 'evaluating',
    });

    const response = await axios.post(`${process.env.AGENT_SERVICE_URL}/evaluate-defense`, {
      sessionId: req.params.sessionId,
    });

    res.json({ reportId: response.data.reportId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
