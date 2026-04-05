const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { google } = require('googleapis');
const { STUDENTS } = require('../config');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function buildAssignmentView(doc) {
  const assignment = doc.data();
  const students = await Promise.all(
    Object.entries(assignment.studentTokens || {}).map(async ([token, student]) => {
      const submissionSnapshot = await db
        .collection('submissions')
        .where('studentToken', '==', token)
        .limit(1)
        .get();

      const submission = submissionSnapshot.empty ? null : submissionSnapshot.docs[0].data();
      let report = null;

      if (submission?.reportId) {
        const reportDoc = await db.collection('reports').doc(submission.reportId).get();
        report = reportDoc.exists ? reportDoc.data() : null;
      }

      return {
        token,
        name: student.name,
        email: student.email,
        used: student.used,
        status: submission?.status || (student.used ? 'uploaded' : 'pending'),
        submissionId: submission?.id || null,
        sessionId: submission?.sessionId || null,
        reportId: submission?.reportId || null,
        overallScore: report?.overallScore ?? null,
      };
    })
  );

  return {
    id: doc.id,
    title: assignment.title,
    description: assignment.description,
    rubric: assignment.rubric,
    difficulty: assignment.difficulty,
    deadline: assignment.deadline,
    createdAt: assignment.createdAt,
    referenceDocsGcs: assignment.referenceDocsGcs || [],
    students,
  };
}

router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      rubric,
      difficulty,
      deadline,
      referenceDocUrls = [],
    } = req.body;

    if (!title || !description || !rubric || !difficulty || !deadline) {
      return res.status(400).json({ error: 'title, description, rubric, difficulty, and deadline are required' });
    }

    const assignmentId = uuidv4();
    const studentTokens = Object.fromEntries(
      STUDENTS.map((student) => [
        uuidv4(),
        {
          name: student.name,
          email: student.email,
          used: false,
        },
      ])
    );

    await db.collection('assignments').doc(assignmentId).set({
      title,
      description,
      rubric,
      difficulty,
      deadline,
      createdAt: FieldValue.serverTimestamp(),
      referenceDocsGcs: referenceDocUrls,
      studentTokens,
    });

    const tokens = Object.entries(studentTokens).map(([token, student]) => ({
      token,
      name: student.name,
      email: student.email,
      submitUrl: `${process.env.BASE_URL || 'http://localhost:5173'}/submit/${token}`,
    }));

    console.log(`[assignments] created assignment ${assignmentId}`);
    for (const invitee of tokens) {
      console.log(`[assignments] ${invitee.name} <${invitee.email}> -> ${invitee.submitUrl}`);
    }

    for (const invitee of tokens) {
      try {
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `Defendly assignment: ${title}`,
            description: `Submit your work here: ${invitee.submitUrl}`,
            start: { dateTime: deadline, timeZone: 'UTC' },
            end: { dateTime: deadline, timeZone: 'UTC' },
            attendees: [{ email: invitee.email }],
          },
        });
      } catch (error) {
        console.warn(`Calendar invite failed for ${invitee.email}: ${error.message}`);
      }
    }

    res.json({ assignmentId, tokens });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const snapshot = await db.collection('assignments').orderBy('createdAt', 'desc').get();
    const assignments = await Promise.all(snapshot.docs.map(buildAssignmentView));
    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
