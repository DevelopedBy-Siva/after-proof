const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { Firestore } = require('@google-cloud/firestore');
const { google } = require('googleapis');

const db = new Firestore({ projectId: process.env.GOOGLE_PROJECT_ID });

// Google Calendar OAuth client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost'
);
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
});
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Hardcoded student list for hackathon demo
const STUDENTS = [
  { name: 'Student One',  email: 'playwith.duke@gmail.com' },
];

// POST /api/assignments — create assignment + send calendar invites
router.post('/', async (req, res) => {
  try {
    const { title, description, rubric, difficulty, deadline } = req.body;
    const assignmentId = uuidv4();

    // Generate a unique token per student
    const students = STUDENTS.map(s => ({
      ...s,
      token: uuidv4(),
    }));

    // Save assignment to Firestore
    await db.collection('assignments').doc(assignmentId).set({
      id: assignmentId,
      title,
      description,
      rubric,
      difficulty,
      deadline,
      students,
      createdAt: new Date().toISOString(),
    });

    // Save each student submission placeholder
    for (const student of students) {
      await db.collection('submissions').doc(student.token).set({
        token: student.token,
        assignmentId,
        studentName: student.name,
        studentEmail: student.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }

    // Send Google Calendar invite to each student
    for (const student of students) {
      const submissionUrl = `${process.env.BASE_URL}/s/${student.token}`;
      try {
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `Assignment: ${title}`,
            description: `Submit your work here:\n${submissionUrl}\n\nRubric:\n${rubric}`,
            start: { dateTime: deadline, timeZone: 'UTC' },
            end:   { dateTime: deadline, timeZone: 'UTC' },
            attendees: [{ email: student.email }],
          },
        });
      } catch (calErr) {
        console.warn(`Calendar invite failed for ${student.email}:`, calErr.message);
        // Don't fail the whole request if calendar fails
      }
    }

    res.json({ success: true, assignmentId, students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments — list all assignments (prof dashboard)
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('assignments').orderBy('createdAt', 'desc').get();
    const assignments = snapshot.docs.map(doc => doc.data());
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/:id — single assignment
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('assignments').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;