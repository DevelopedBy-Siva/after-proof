const router = require('express').Router();
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });
const storage = new Storage({ projectId: process.env.GOOGLE_PROJECT_ID });
const upload = multer({ storage: multer.memoryStorage() });

async function findAssignmentByToken(token) {
  const snapshot = await db.collection('assignments').get();

  for (const doc of snapshot.docs) {
    const assignment = doc.data();
    if (assignment.studentTokens?.[token]) {
      return {
        id: doc.id,
        data: assignment,
        student: assignment.studentTokens[token],
      };
    }
  }

  return null;
}

async function findSubmissionByToken(token) {
  const snapshot = await db.collection('submissions').where('studentToken', '==', token).limit(1).get();
  return snapshot.empty ? null : { id: snapshot.docs[0].id, data: snapshot.docs[0].data() };
}

router.get('/:token', async (req, res) => {
  try {
    const match = await findAssignmentByToken(req.params.token);
    if (!match) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const submission = await findSubmissionByToken(req.params.token);
    const status = submission?.data?.status || 'pending';

    if (match.student.used && !submission) {
      return res.status(404).json({ error: 'Token already used' });
    }

    res.json({
      assignmentTitle: match.data.title,
      description: match.data.description,
      additionalDetails: match.data.additionalDetails || '',
      deadline: match.data.deadline,
      studentName: match.student.name,
      difficulty: match.data.difficulty,
      status,
      sessionId: submission?.data?.sessionId || null,
      submissionId: submission?.id || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:token', upload.single('file'), async (req, res) => {
  try {
    const match = await findAssignmentByToken(req.params.token);
    if (!match) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    if (match.student.used) {
      return res.status(400).json({ error: 'This token has already been used' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    const submissionId = uuidv4();
    const bucket = storage.bucket(process.env.GCS_BUCKET);
    const objectPath = `submissions/${submissionId}/${req.file.originalname}`;
    const object = bucket.file(objectPath);

    await object.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    const gcsFileUrl = `gs://${process.env.GCS_BUCKET}/${objectPath}`;

    await db.collection('submissions').doc(submissionId).set({
      assignmentId: match.id,
      studentToken: req.params.token,
      studentName: match.student.name,
      gcsFileUrl,
      status: 'analyzing',
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection('assignments').doc(match.id).update({
      [`studentTokens.${req.params.token}.used`]: true,
    });

    axios.post(`${process.env.AGENT_SERVICE_URL}/run-pipeline`, {
      submissionId,
    }).catch((error) => {
      console.error('Pipeline trigger failed:', error.message);
    });

    res.json({ submissionId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:token/status', async (req, res) => {
  try {
    const submission = await findSubmissionByToken(req.params.token);

    if (!submission) {
      return res.json({ status: 'pending' });
    }

    res.json({
      status: submission.data.status,
      sessionId: submission.data.sessionId || null,
      reportId: submission.data.reportId || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
