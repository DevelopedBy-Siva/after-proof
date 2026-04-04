# Defendly — Comprehensive Build README
### Hackathon Track: Build With AI — The Agentic Frontier

> **You can generate the assignment. You can't fake the defense.**

---

## Table of Contents

1. [The Problem & Core Insight](#the-problem)
2. [System Overview](#system-overview)
3. [Full Tech Stack](#full-tech-stack)
4. [Architecture & Agent Design](#architecture)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [Two-Person Task Split](#task-split)
8. [Build Timeline (24 Hours)](#build-timeline)
9. [Environment Setup](#environment-setup)
10. [Gemini Prompts](#gemini-prompts)
11. [Demo Script](#demo-script)
12. [Judging Criteria Alignment](#judging-alignment)

---

## 1. The Problem & Core Insight <a name="the-problem"></a>

**The situation:**
Students submit AI-generated work. Tutors know. Students know tutors know. Everyone is pretending. The actual goal — *does the student understand the concept* — is completely lost in the charade.

**The insight:**
Don't detect AI usage. Verify understanding.

**The solution:**
At the moment of submission, every student is automatically asked to defend what they submitted. The tutor gets a comprehension score *alongside* the work. The submission becomes irrelevant. AI-written or not — doesn't matter. The only thing that matters is what happens in the 10 minutes after submit.

---

## 2. System Overview <a name="system-overview"></a>

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEFENDLY SYSTEM                          │
│                                                                 │
│  INSTRUCTOR                          STUDENT                    │
│  Dashboard (React)                   Defense UI (React)         │
│       │                                    │                    │
│       └──────────────┬─────────────────────┘                    │
│                      │                                          │
│              Node.js API (Cloud Run)                            │
│                      │                                          │
│         ┌────────────┼────────────┐                             │
│         │            │            │                             │
│     Firestore    Google Drive   ADK Orchestrator                │
│                                    │                            │
│                     ┌──────────────┼──────────────┐             │
│                  Agent 1       Agent 2-5        Agent 6         │
│                 Analyst      Interrogation     Reporter         │
│                     │         Pipeline            │             │
│                  Vertex AI (Gemini 1.5 Pro)    Gmail/Calendar   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Flow (10 steps)

| Step | Action | Who/What |
|------|--------|----------|
| 1 | Instructor creates assignment + rubric + difficulty | Instructor Dashboard |
| 2 | Students receive Gmail notification + Calendar deadline | Gmail API / Calendar API |
| 3 | Student uploads via unique link | Student UI |
| 4 | File stored in Google Drive, metadata in Firestore | Storage layer |
| 5 | Submission Analyst reads full doc via Gemini long-context | Agent 1 |
| 6 | Interrogation Designer generates 3–5 targeted questions | Agent 2 |
| 7 | Google Calendar event + Meet link auto-created | Calendar API |
| 8 | Interrogator conducts live voice defense (10 min) | Agent 3 + 4 |
| 9 | Evaluator scores: conceptual clarity, logic, depth, confidence | Agent 5 |
| 10 | Report + recording sent to instructor via Gmail | Agent 6 |

---

## 3. Full Tech Stack <a name="full-tech-stack"></a>

### Google Cloud (Core Infrastructure)

| Service | Purpose |
|---------|---------|
| **Vertex AI — Gemini 1.5 Pro** | Long-context document analysis, question generation, response evaluation |
| **Agent Development Kit (ADK)** | Multi-agent orchestration and A2A communication |
| **Cloud Run** | Serverless backend deployment (Node.js + Python) |
| **Firestore** | Session state, submission metadata, reports, agent outputs |
| **Cloud Storage / Google Drive** | Submission file storage |
| **Speech-to-Text API** | Real-time voice transcription during defense |
| **Cloud Logging / Monitoring** | Agent pipeline observability |

### Google Workspace Integration

| Service | Purpose |
|---------|---------|
| **Gmail API** | Assignment notifications, report delivery |
| **Google Calendar API** | Defense session scheduling, deadline events |
| **Google Meet** | Live voice defense session (Meet link generated) |
| **Google Drive API** | Submission storage and retrieval |

### Backend

| Tech | Purpose |
|------|---------|
| **Node.js (Express)** | REST API server on Cloud Run |
| **Python microservice** | ADK agent orchestration (Cloud Run) |
| **Firebase Admin SDK** | Firestore operations |
| **Google APIs Node.js client** | Workspace integrations |
| **Socket.IO** | Real-time defense session state updates |

### Frontend

| Tech | Purpose |
|------|---------|
| **React + Vite** | SPA for instructor dashboard and student defense UI |
| **TailwindCSS** | Styling |
| **React Query** | API state management |
| **Web Speech API** | Browser-side voice capture during defense |

---

## 4. Architecture & Agent Design <a name="architecture"></a>

### Agent Pipeline (ADK — Python)

```
Submission
    │
    ▼
┌──────────────────────────────────────┐
│  Agent 1: Submission Analyst         │
│  - Input: file from Drive            │
│  - Tool: Gemini 1.5 Pro (long ctx)   │
│  - Output: key_concepts[], weak_areas│
│            methodology, claims       │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Agent 2: Interrogation Designer     │
│  - Input: analyst output + difficulty│
│  - Tool: Gemini                      │
│  - Output: questions[] (3-5)         │
│    each tied to a submission section │
└──────────────┬───────────────────────┘
               │    ├──► Calendar API (creates Meet)
               ▼
┌──────────────────────────────────────┐
│  Agent 3: Interrogator               │
│  - Input: questions[], student voice │
│  - Tool: Speech-to-Text + Gemini     │
│  - Behavior: asks → listens →        │
│    decides to probe / clarify / next │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Agent 4: Voice Analysis             │
│  - Input: audio stream               │
│  - Detects: hesitation, filler words │
│    confidence level, response latency│
│  - Output: voice_signals{}           │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Agent 5: Understanding Evaluator    │
│  - Input: transcripts + voice_signals│
│  - Scores: clarity, logic, depth,    │
│    justification, confidence         │
│  - Detects: shallow answers, bluffing│
│  - Output: comprehension_report{}    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Agent 6: Report Generator           │
│  - Builds structured instructor doc  │
│  - Sends via Gmail                   │
│  - Stores in Firestore               │
└──────────────────────────────────────┘
```

### A2A Communication (ADK)

Each agent is a separate ADK `Agent` class with defined tools and a handoff protocol. The orchestrator manages the pipeline state in Firestore and passes structured JSON between agents.

```python
# Example agent handoff (ADK pattern)
class SubmissionAnalystAgent(Agent):
    tools = [gemini_analyze_tool, drive_fetch_tool]
    output_schema = AnalystOutput  # Pydantic model

class InterrogationDesignerAgent(Agent):
    tools = [gemini_question_gen_tool]
    input_schema = AnalystOutput
    output_schema = QuestionSet
```

---

## 5. Database Schema <a name="database-schema"></a>

### Firestore Collections

```
/classes/{classId}
  - instructorId: string
  - name: string
  - studentIds: string[]
  - createdAt: timestamp

/assignments/{assignmentId}
  - classId: string
  - title: string
  - description: string
  - rubric: string
  - difficulty: "easy" | "medium" | "hard"
  - deadline: timestamp
  - createdAt: timestamp

/submissions/{submissionId}
  - assignmentId: string
  - studentId: string
  - driveFileId: string
  - status: "submitted" | "analyzing" | "awaiting_defense" | "defended" | "complete"
  - submittedAt: timestamp

/defense_sessions/{sessionId}
  - submissionId: string
  - studentId: string
  - meetLink: string
  - questions: Question[]
  - transcripts: Transcript[]
  - voiceSignals: VoiceSignals
  - status: "scheduled" | "in_progress" | "complete"
  - recordingUrl: string
  - scheduledAt: timestamp

/reports/{reportId}
  - sessionId: string
  - submissionId: string
  - studentId: string
  - comprehensionScore: number  // 0-100
  - understands: string[]
  - weak: string[]
  - cannotJustify: string[]
  - fullTranscript: string
  - generatedAt: timestamp
```

---

## 6. API Design <a name="api-design"></a>

### REST Endpoints (Node.js / Express)

```
# Auth
POST   /api/auth/google          - OAuth2 login

# Instructor
POST   /api/classes              - Create class
POST   /api/assignments          - Create assignment
GET    /api/assignments/:id/submissions  - List submissions
GET    /api/reports/:submissionId        - Get comprehension report

# Student
GET    /api/submissions/link/:token      - Validate unique link
POST   /api/submissions                  - Submit assignment (multipart)
GET    /api/defense/:sessionId           - Get session questions

# Defense Session (Socket.IO)
WS     /defense/:sessionId       - Real-time voice session

# Webhooks (internal)
POST   /internal/pipeline/start  - Triggers ADK pipeline after submission
```

### Socket.IO Events (Defense Session)

```javascript
// Client → Server
socket.emit('voice_chunk', { data: audioBuffer, sessionId })
socket.emit('answer_complete', { sessionId, questionIndex })

// Server → Client
socket.emit('question', { text: string, index: number })
socket.emit('probe', { text: string })        // follow-up question
socket.emit('session_complete', { reportId })
```

---

## 7. Two-Person Task Split <a name="task-split"></a>

### Person A — Backend + Agent Pipeline

**Owns:** Python ADK agents, Node.js API, Firestore, Google Cloud infra

#### Setup (Hour 0–2)
- [ ] GCP project setup, enable all APIs (Vertex AI, Drive, Calendar, Gmail, Speech-to-Text, Firestore)
- [ ] Install ADK: `pip install google-adk`
- [ ] Service account + OAuth2 credentials
- [ ] Cloud Run project scaffold (Node.js + Python)
- [ ] Firestore collections setup

#### Core Backend (Hour 2–10)
- [ ] **Submission API** — POST /api/submissions (accepts file, writes to Drive + Firestore)
- [ ] **Unique link system** — generate + validate per-student tokens
- [ ] **ADK pipeline orchestrator** — triggers on submission webhook
- [ ] **Agent 1: Submission Analyst** — Drive fetch + Gemini long-context analysis
- [ ] **Agent 2: Interrogation Designer** — question generation with difficulty modes
- [ ] **Calendar API integration** — auto-create Meet event after questions generated
- [ ] **Gmail API** — send assignment notifications to students

#### Defense Engine (Hour 10–18)
- [ ] **Socket.IO server** — real-time voice session management
- [ ] **Agent 3: Interrogator** — manages question flow, probing logic
- [ ] **Agent 4: Voice Analysis** — Speech-to-Text + hesitation/confidence heuristics
- [ ] **Agent 5: Evaluator** — Gemini-based comprehension scoring
- [ ] **Agent 6: Report Generator** — structured report → Firestore → Gmail

#### Polish (Hour 18–24)
- [ ] Error handling + retries on agent pipeline
- [ ] Cloud Run deployment + environment variables
- [ ] End-to-end test with real submission

---

### Person B — Frontend + UX

**Owns:** React dashboards, student defense UI, real-time voice interface

#### Setup (Hour 0–2)
- [ ] React + Vite scaffold
- [ ] TailwindCSS setup
- [ ] Google OAuth2 login (react-oauth/google)
- [ ] API client setup (axios + React Query)
- [ ] Routing: instructor routes vs student routes

#### Instructor Dashboard (Hour 2–8)
- [ ] **Login page** — Google OAuth
- [ ] **Class management page** — create class, add students (email list)
- [ ] **Assignment creation form** — title, description, rubric, difficulty picker, deadline
- [ ] **Submissions view** — table: student name, submission status, defense status, score
- [ ] **Report view** — per-student: submission preview, questions asked, transcript, comprehension breakdown (understands X / weak in Y / can't justify Z)

#### Student Interface (Hour 8–14)
- [ ] **Unique link landing page** — assignment details + submit button
- [ ] **File upload component** — drag/drop, progress bar, one-submission lock
- [ ] **Defense waiting room** — shows Meet link + countdown after submission
- [ ] **Defense session UI** (for demo/simulation):
  - Current question display
  - Voice recording indicator (waveform animation)
  - Timer (10 min countdown)
  - Real-time transcription display

#### Demo Polish (Hour 14–20)
- [ ] **Demo mode** — simulated submission → instant question generation → simulated defense
- [ ] **Report visualization** — comprehension score gauge, color-coded strengths/weaknesses
- [ ] **Responsive design** — works on laptop for demo
- [ ] Loading states, error states, success states

#### Final Polish (Hour 20–24)
- [ ] Wire all frontend to real backend endpoints
- [ ] Live test with Person A's API
- [ ] Fix any integration issues
- [ ] Prepare 60-second demo flow

---

## 8. Build Timeline (24 Hours) <a name="build-timeline"></a>

```
Hour 0–2   │ BOTH: GCP setup, project scaffold, credentials
Hour 2–8   │ A: Submission API + Drive/Firestore
           │ B: Instructor dashboard + class/assignment forms
Hour 8–14  │ A: ADK agents 1–2 + Calendar/Gmail integrations
           │ B: Student submission UI + defense waiting room
Hour 14–18 │ A: ADK agents 3–5 (defense engine + evaluator)
           │ B: Defense session UI + report visualization
Hour 18–20 │ A: Agent 6 (report gen) + Cloud Run deploy
           │ B: Wire frontend to all endpoints
Hour 20–22 │ BOTH: Integration testing + bug fixes
Hour 22–24 │ BOTH: Demo rehearsal + final polish
```

---

## 9. Environment Setup <a name="environment-setup"></a>

### GCP APIs to Enable

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  speech.googleapis.com \
  gmail.googleapis.com \
  calendar-json.googleapis.com \
  drive.googleapis.com \
  firestore.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com
```

### Node.js Backend

```bash
mkdir defendly-api && cd defendly-api
npm init -y
npm install express firebase-admin googleapis \
  @google-cloud/speech socket.io cors dotenv multer
```

### Python ADK Service

```bash
mkdir defendly-agents && cd defendly-agents
pip install google-adk google-cloud-aiplatform \
  google-cloud-firestore pydantic python-dotenv
```

### React Frontend

```bash
npm create vite@latest defendly-ui -- --template react
cd defendly-ui
npm install @tanstack/react-query axios @react-oauth/google \
  tailwindcss lucide-react socket.io-client
```

### .env (Backend)

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
VERTEX_AI_LOCATION=us-central1
GEMINI_MODEL=gemini-1.5-pro
FIRESTORE_DATABASE=(default)
GOOGLE_OAUTH_CLIENT_ID=xxx
GOOGLE_OAUTH_CLIENT_SECRET=xxx
```

---

## 10. Gemini Prompts <a name="gemini-prompts"></a>

### Agent 1: Submission Analysis Prompt

```
You are an academic defense preparation agent. You will be given a student's assignment submission.

Your task: analyze the document and extract structured data for generating oral defense questions.

Return JSON only. No preamble.

{
  "key_concepts": ["..."],          // main ideas the student discusses
  "claims": ["..."],                // specific claims or conclusions made
  "methodology": "...",             // how the student approached the problem
  "weak_areas": ["..."],            // sections with vague, unsubstantiated, or unclear reasoning
  "assumptions": ["..."],           // explicit or implicit assumptions made
  "terminology": ["..."]            // domain-specific terms used
}

Assignment submission:
<submission>
{SUBMISSION_TEXT}
</submission>
```

### Agent 2: Question Generation Prompt

```
You are generating oral defense questions for a student who submitted an assignment.
Difficulty: {DIFFICULTY}
Rubric: {RUBRIC}

Based on the following analysis of their submission, generate exactly {N} questions.

Rules:
- Questions must be answerable ONLY if the student actually wrote and understood the submission
- No generic topic questions — every question must reference something specific from the submission
- Questions should probe methodology, justify claims, and expose weak reasoning
- Difficulty "hard" means questions that even the author would need to think about
- Return JSON only

{
  "questions": [
    {
      "text": "...",
      "targets": "...",            // which concept/section this probes
      "follow_up": "..."           // follow-up if answer is vague
    }
  ]
}

Submission analysis:
<analysis>
{ANALYSIS_JSON}
</analysis>
```

### Agent 5: Comprehension Evaluation Prompt

```
You are evaluating a student's oral defense performance.

You will receive:
- The original submission analysis
- The questions asked
- Transcripts of the student's answers
- Voice signals (hesitation, confidence, latency)

Your job: determine whether the student genuinely understands the work they submitted.

Return JSON only:

{
  "overall_score": 0-100,
  "understands": ["concept A", "..."],
  "weak_in": ["concept B", "..."],
  "cannot_justify": ["claim C", "..."],
  "signs_of_genuine_understanding": "...",
  "signs_of_superficial_knowledge": "...",
  "recommendation": "Likely authored | Likely AI-assisted but understands | Likely AI-generated, does not understand"
}

Submission analysis: {ANALYSIS_JSON}
Questions + Answers: {QA_TRANSCRIPT}
Voice signals: {VOICE_SIGNALS_JSON}
```

---

## 11. Demo Script <a name="demo-script"></a>

### 60-Second Hackathon Demo

**0:00 — Setup (10s)**
Show instructor dashboard. One assignment already created: "Explain gradient descent."
Rubric: "Must justify choice of learning rate and convergence behaviour." Difficulty: Hard.

**0:10 — Student submits (10s)**
Open student link. Drop in a clearly AI-generated PDF. Click submit.
Message: *"Your submission has been received. Your defense session has been scheduled."*

**0:20 — Questions appear (10s)**
Show the instructor dashboard updating in real-time. Three questions appear:
- *"You claim a learning rate of 0.01 was optimal. What would happen at 0.1?"*
- *"In section 2 you describe momentum — explain what problem it solves."*
- *"Your convergence graph is smooth. What conditions would cause oscillation?"*

**0:30 — Defense session (15s)**
Switch to student defense UI. Show the question. Student answers (live or pre-recorded).
Show real-time transcript appearing. Timer counting down.

**0:45 — Report (15s)**
Show instructor report:

```
COMPREHENSION REPORT — Student: Alex Chen
Submission quality: High (91/100)
Understanding: Low (34/100)

✅ Understands: basic definition of gradient descent
⚠️  Weak in: learning rate intuition, momentum
❌  Cannot justify: convergence claim in section 2

Recommendation: Likely AI-generated. Does not demonstrate understanding.
```

**Message to judges:** *"The submission was irrelevant the moment we built this."*

---

## 12. Judging Criteria Alignment <a name="judging-alignment"></a>

| Track Criterion | How Defendly Addresses It |
|----------------|--------------------------|
| **Agentic workflow** | 6-agent pipeline with A2A communication via ADK |
| **Google Cloud Platform** | Vertex AI, Cloud Run, Firestore, all Workspace APIs |
| **Long-context reasoning** | Gemini 1.5 Pro reads full student submissions |
| **Real-world gap bridged** | Solves active, widespread academic integrity problem |
| **Active collaborator (not passive tool)** | Agent adapts in real-time based on student responses |
| **Functional demo** | Full end-to-end flow demonstrable in 60 seconds |

---

## One-Line Pitch

> **Defendly doesn't grade what you submit. It grades whether you can stand behind it.**

---

*Built for Google Cloud Hackathon — Build With AI: The Agentic Frontier*
*Team: 2 members | Stack: Vertex AI + ADK + Google Workspace + React*
