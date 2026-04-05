const router = require('express').Router();
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });

router.get('/:reportId', async (req, res) => {
  try {
    const doc = await db.collection('reports').doc(req.params.reportId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(doc.data());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
