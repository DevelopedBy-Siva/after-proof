const router = require('express').Router();
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });

// GET /api/reports/:token — get evaluation report
router.get('/:token', async (req, res) => {
  try {
    const doc = await db.collection('submissions').doc(req.params.token).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const submission = doc.data();
    if (!submission.report) {
      return res.status(202).json({ status: submission.status, message: 'Report not ready' });
    }

    res.json({
      studentName: submission.studentName,
      status: submission.status,
      report: submission.report,
      defenseCompletedAt: submission.defenseCompletedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;