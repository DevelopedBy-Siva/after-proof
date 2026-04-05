const router = require('express').Router();
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });

router.get('/:reportId', async (req, res) => {
  try {
    const doc = await db.collection('reports').doc(req.params.reportId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = doc.data();
    const sessionDoc = await db.collection('defense_sessions').doc(report.sessionId).get();
    const submissionDoc = await db.collection('submissions').doc(report.submissionId).get();
    const assignmentDoc = await db.collection('assignments').doc(report.assignmentId).get();

    res.json({
      ...report,
      transcript: sessionDoc.exists ? sessionDoc.data().transcript || [] : [],
      assignmentTitle: assignmentDoc.exists ? assignmentDoc.data().title : '',
      assignmentDescription: assignmentDoc.exists ? assignmentDoc.data().description : '',
      additionalDetails: assignmentDoc.exists ? assignmentDoc.data().additionalDetails || '' : '',
      analysis: submissionDoc.exists ? submissionDoc.data().analysis || {} : {},
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
