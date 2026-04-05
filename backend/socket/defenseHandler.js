const { Firestore, FieldValue } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });

module.exports = function registerDefenseNamespace(io) {
  const defense = io.of('/defense');

  defense.on('connection', (socket) => {
    socket.on('join_session', async ({ sessionId }) => {
      try {
        const sessionDoc = await db.collection('defense_sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
          socket.emit('session_error', { message: 'Session not found' });
          return;
        }

        const session = sessionDoc.data();
        const submissionDoc = await db.collection('submissions').doc(session.submissionId).get();
        const submission = submissionDoc.data();

        socket.data.sessionId = sessionId;
        socket.data.currentIndex = 0;
        socket.data.awaitingFollowUp = false;

        await db.collection('defense_sessions').doc(sessionId).update({
          status: 'active',
          startedAt: session.startedAt || FieldValue.serverTimestamp(),
        });

        await db.collection('submissions').doc(session.submissionId).update({
          status: 'defending',
        });

        socket.emit('session_ready', {
          questions: submission.questions || [],
          totalCount: (submission.questions || []).length,
        });

        if ((submission.questions || []).length > 0) {
          const first = submission.questions[0];
          socket.emit('ask_question', {
            text: first.text,
            index: 1,
            total: submission.questions.length,
          });
        }
      } catch (error) {
        console.error(error);
        socket.emit('session_error', { message: error.message });
      }
    });

    socket.on('answer_done', async ({ sessionId, transcript }) => {
      try {
        const sessionDoc = await db.collection('defense_sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
          socket.emit('session_error', { message: 'Session not found' });
          return;
        }

        const session = sessionDoc.data();
        const submissionDoc = await db.collection('submissions').doc(session.submissionId).get();
        const submission = submissionDoc.data();
        const questions = submission.questions || [];
        const currentIndex = socket.data.currentIndex || 0;
        const awaitingFollowUp = socket.data.awaitingFollowUp || false;
        const question = questions[currentIndex];

        if (!question) {
          socket.emit('session_complete', { reportId: submission.reportId || null });
          return;
        }

        const answerText = transcript || '';
        const vague = answerText.trim().split(/\s+/).filter(Boolean).length < 18;

        await db.collection('defense_sessions').doc(sessionId).update({
          transcript: FieldValue.arrayUnion({
            questionIndex: currentIndex,
            questionText: awaitingFollowUp ? question.follow_up : question.text,
            answerText,
            followUpAsked: awaitingFollowUp,
            voiceSignals: {
              hesitationCount: 0,
              fillerWordCount: 0,
              avgLatencyMs: 0,
              confidenceScore: vague ? 0.35 : 0.8,
            },
          }),
        });

        if (vague && !awaitingFollowUp && question.follow_up) {
          socket.data.awaitingFollowUp = true;
          socket.emit('ask_followup', { text: question.follow_up });
          return;
        }

        socket.data.awaitingFollowUp = false;
        socket.data.currentIndex = currentIndex + 1;

        if (socket.data.currentIndex >= questions.length) {
          socket.emit('session_complete', { reportId: submission.reportId || null });
          return;
        }

        const nextQuestion = questions[socket.data.currentIndex];
        socket.emit('ask_question', {
          text: nextQuestion.text,
          index: socket.data.currentIndex + 1,
          total: questions.length,
        });
      } catch (error) {
        console.error(error);
        socket.emit('session_error', { message: error.message });
      }
    });

    socket.on('voice_chunk', ({ text }) => {
      if (text) {
        socket.emit('transcript_live', { text });
      }
    });
  });
};
