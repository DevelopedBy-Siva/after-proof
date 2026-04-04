const router = require('express').Router();
const { Firestore } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const axios = require('axios');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });
const storage = new Storage();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/submissions/:token — student opens their link
router.get('/:token', async (req, res) => {
  try {
    const submDoc = await db.collection('submissions').doc(req.params.token).get();
    if (!submDoc.exists) return res.status(404).json({ error: 'Invalid token' });

    const submission = submDoc.data();
    const assignDoc = await db.collection('assignments').doc(submission.assignmentId).get();
    const assignment = assignDoc.data();

    res.json({
      studentName: submission.studentName,
      status: submission.status,
      assignment: {
        title: assignment.title,
        description: assignment.description,
        rubric: assignment.rubric,
        difficulty: assignment.difficulty,
        deadline: assignment.deadline,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/submissions/:token — student uploads their PDF
router.post('/:token', upload.single('file'), async (req, res) => {
  try {
    const submDoc = await db.collection('submissions').doc(req.params.token).get();
    if (!submDoc.exists) return res.status(404).json({ error: 'Invalid token' });

    const submission = submDoc.data();
    if (submission.status !== 'pending') {
      return res.status(400).json({ error: 'Already submitted' });
    }

    // Upload file to GCS
    const bucket = storage.bucket(process.env.GCS_BUCKET);
    const fileName = `submissions/${req.params.token}/${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype }
    });

    const gcsPath = `gs://${process.env.GCS_BUCKET}/${fileName}`;

    // Update Firestore status
    await db.collection('submissions').doc(req.params.token).update({
      status: 'analyzing',
      gcsPath,
      submittedAt: new Date().toISOString(),
    });

    // Fetch assignment for rubric + difficulty
    const assignDoc = await db.collection('assignments').doc(submission.assignmentId).get();
    const assignment = assignDoc.data();

    // Trigger agent pipeline (fire and forget)
    axios.post(`${process.env.AGENT_SERVICE_URL}/pipeline/run`, {
      submissionId: req.params.token,
      assignmentId: submission.assignmentId,
      gcsPath,
      rubric: assignment.rubric,
      difficulty: assignment.difficulty,
      assignmentBrief: assignment.description,
    }).catch(err => console.error('Pipeline trigger failed:', err.message));

    res.json({ success: true, status: 'analyzing' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;