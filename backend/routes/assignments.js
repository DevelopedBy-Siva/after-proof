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

function getFrontendBaseUrl() {
  const configuredUrl = String(process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');

  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) {
    console.warn('[assignments] FRONTEND_URL is missing; falling back to https://defendly.web.app');
    return 'https://defendly.web.app';
  }

  return 'http://localhost:5173';
}

function normalizeCustomStudents(customStudents = []) {
  return customStudents
    .filter((student) => student && typeof student === 'object')
    .map((student) => ({
      name: String(student.name || '').trim(),
      email: String(student.email || '').trim().toLowerCase(),
    }))
    .filter((student) => student.name && student.email);
}

function mergeStudents(defaultStudents, customStudents) {
  const seenEmails = new Set();
  const merged = [];

  for (const student of [...defaultStudents, ...customStudents]) {
    const email = String(student.email || '').trim().toLowerCase();
    const name = String(student.name || '').trim();

    if (!name || !email || seenEmails.has(email)) {
      continue;
    }

    seenEmails.add(email);
    merged.push({ name, email });
  }

  return merged;
}

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
        understanding: report?.understanding ?? null,
      };
    })
  );

  return {
    id: doc.id,
    title: assignment.title,
    description: assignment.description,
    additionalDetails: assignment.additionalDetails || '',
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
      additionalDetails,
      difficulty,
      deadline,
      referenceDocUrls = [],
      customStudents = [],
    } = req.body;

    if (!title || !description || !difficulty || !deadline) {
      return res.status(400).json({ error: 'title, description, difficulty, and deadline are required' });
    }

    const assignmentId = uuidv4();
    const mergedStudents = mergeStudents(STUDENTS, normalizeCustomStudents(customStudents));
    const studentTokens = Object.fromEntries(
      mergedStudents.map((student) => [
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
      additionalDetails: additionalDetails || '',
      difficulty,
      deadline,
      createdAt: FieldValue.serverTimestamp(),
      referenceDocsGcs: referenceDocUrls,
      studentTokens,
    });

    const frontendBaseUrl = getFrontendBaseUrl();
    const tokens = Object.entries(studentTokens).map(([token, student]) => ({
      token,
      name: student.name,
      email: student.email,
      submitUrl: `${frontendBaseUrl}/submit/${token}`,
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
            summary: `AfterProof assignment: ${title}`,
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
