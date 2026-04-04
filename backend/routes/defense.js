const router = require('express').Router();
const textToSpeech = require('@google-cloud/text-to-speech');
const speech = require('@google-cloud/speech');
const { Firestore } = require('@google-cloud/firestore');

const ttsClient = new textToSpeech.TextToSpeechClient();
const sttClient = new speech.SpeechClient();
const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });

// GET /api/defense/:token — get questions for this student
router.get('/:token', async (req, res) => {
  try {
    const doc = await db.collection('submissions').doc(req.params.token).get();
    if (!doc.exists) return res.status(404).json({ error: 'Invalid token' });

    const submission = doc.data();
    if (submission.status === 'pending' || submission.status === 'analyzing') {
      return res.status(202).json({ status: submission.status, message: 'Not ready yet' });
    }

    res.json({
      status: submission.status,
      questions: submission.questions || [],
      studentName: submission.studentName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/defense/tts — convert text to speech, return audio base64
router.post('/tts', async (req, res) => {
  try {
    const { text } = req.body;
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    res.json({
      audio: response.audioContent.toString('base64'),
      mimeType: 'audio/mp3',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/defense/stt — transcribe audio chunk
router.post('/stt', async (req, res) => {
  try {
    const { audio } = req.body; // base64 encoded audio from browser

    const [response] = await sttClient.recognize({
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
      },
      audio: { content: audio },
    });

    const transcript = response.results
      .map(r => r.alternatives[0].transcript)
      .join(' ');

    res.json({ transcript });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/defense/evaluate — called when session ends
router.post('/evaluate', async (req, res) => {
  try {
    const { token } = req.body;

    await db.collection('submissions').doc(token).update({
      status: 'evaluating',
      defenseCompletedAt: new Date().toISOString(),
    });

    // Agent 3 will pick this up and write the report
    // For now just acknowledge
    res.json({ success: true, status: 'evaluating' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;