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
        const questions = submission.questions || [];
        const transcript = session.transcript || [];
        const maxAsks = 4;

        if (session.status === 'complete' || submission.status === 'evaluating' || submission.status === 'complete') {
          socket.emit('session_complete', { reportId: submission.reportId || null });
          return;
        }

        socket.data.sessionId = sessionId;
        socket.data.currentIndex = Math.min(
          transcript.reduce((maxIndex, entry) => Math.max(maxIndex, (entry.questionIndex ?? -1) + 1), 0),
          questions.length
        );
        socket.data.awaitingFollowUp = false;
        socket.data.completed = false;

        await db.collection('defense_sessions').doc(sessionId).update({
          status: 'active',
          startedAt: session.startedAt || FieldValue.serverTimestamp(),
        });

        await db.collection('submissions').doc(session.submissionId).update({
          status: 'defending',
        });

        socket.emit('session_ready', {
          questions,
          totalCount: questions.length,
          maxAsks,
        });

        if (transcript.length >= maxAsks || socket.data.currentIndex >= questions.length) {
          socket.emit('session_complete', { reportId: submission.reportId || null });
          return;
        }

        if (questions.length > 0) {
          const first = questions[socket.data.currentIndex];
          socket.emit('ask_question', {
            text: first.text,
            index: socket.data.currentIndex + 1,
            total: questions.length,
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

        if (socket.data.completed || session.status === 'complete' || submission.status === 'evaluating' || submission.status === 'complete') {
          socket.emit('session_complete', { reportId: submission.reportId || null });
          return;
        }

        if (!question) {
          socket.data.completed = true;
          socket.emit('session_complete', { reportId: submission.reportId || null });
          return;
        }

        const answerText = transcript || '';
        const vague = answerText.trim().split(/\s+/).filter(Boolean).length < 18;
        const askedCount = (session.transcript || []).length + 1;

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

        if (askedCount >= maxAsks) {
          socket.data.completed = true;
          socket.emit('session_complete', { reportId: submission.reportId || null });
          return;
        }

        if (vague && !awaitingFollowUp && question.follow_up) {
          socket.data.awaitingFollowUp = true;
          socket.emit('ask_followup', { text: question.follow_up });
          return;
        }

        socket.data.awaitingFollowUp = false;
        socket.data.currentIndex = currentIndex + 1;

        if (socket.data.currentIndex >= questions.length) {
          socket.data.completed = true;
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
