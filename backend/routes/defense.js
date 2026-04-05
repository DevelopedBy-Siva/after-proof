const router = require('express').Router();
const axios = require('axios');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const speech = require('@google-cloud/speech');
const { Storage } = require('@google-cloud/storage');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });
const storage = new Storage({ projectId: process.env.GOOGLE_PROJECT_ID });
const upload = multer({ storage: multer.memoryStorage() });
const speechClient = new speech.SpeechClient();
const SYNC_TRANSCRIBE_MAX_BYTES = 5 * 1024 * 1024;

function getRecognitionConfig(mimeType = '') {
  if (mimeType.includes('webm')) {
    return {
      encoding: 'WEBM_OPUS',
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
    };
  }

  if (mimeType.includes('ogg')) {
    return {
      encoding: 'OGG_OPUS',
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
    };
  }

  if (mimeType.includes('wav')) {
    return {
      encoding: 'LINEAR16',
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
    };
  }

  return {
    languageCode: 'en-US',
    enableAutomaticPunctuation: true,
    model: 'latest_long',
  };
}

function buildTranscript(response) {
  return (response.results || [])
    .map((result) => result.alternatives?.[0]?.transcript || '')
    .join(' ')
    .trim();
}

async function transcribeShortAudio(file) {
  const [response] = await speechClient.recognize({
    audio: {
      content: file.buffer.toString('base64'),
    },
    config: getRecognitionConfig(file.mimetype),
  });

  return buildTranscript(response);
}

async function transcribeLongAudio(sessionId, file) {
  if (!process.env.GCS_BUCKET) {
    throw new Error('GCS_BUCKET is required for long audio transcription');
  }

  const bucket = storage.bucket(process.env.GCS_BUCKET);
  const objectPath = `defense-audio/${sessionId}/${uuidv4()}-${file.originalname || 'audio'}`;
  const object = bucket.file(objectPath);

  await object.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });

  try {
    const [operation] = await speechClient.longRunningRecognize({
      audio: {
        uri: `gs://${process.env.GCS_BUCKET}/${objectPath}`,
      },
      config: getRecognitionConfig(file.mimetype),
    });
    const [response] = await operation.promise();
    return buildTranscript(response);
  } finally {
    await object.delete({ ignoreNotFound: true }).catch((error) => {
      console.warn(`Failed to delete temp audio ${objectPath}: ${error.message}`);
    });
  }
}

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

router.post('/:sessionId/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const sessionDoc = await db.collection('defense_sessions').doc(req.params.sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'audio is required' });
    }

    const transcript = req.file.size > SYNC_TRANSCRIBE_MAX_BYTES
      ? await transcribeLongAudio(sessionId, req.file)
      : await transcribeShortAudio(req.file);

    res.json({ transcript });
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
