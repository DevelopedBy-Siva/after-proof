ANALYST_PROMPT = """
You are analyzing a student's submitted assignment in the context of what the
professor asked for. Your output will be used to generate targeted oral defense
questions that test genuine understanding.

Return ONLY valid JSON. No preamble, no markdown fences.

{
  "key_concepts": [
    "concepts the student explicitly discusses"
  ],
  "claims": [
    "specific conclusions or arguments the student makes"
  ],
  "methodology": "how the student approached the problem",
  "weak_areas": [
    "sections that are vague, unsubstantiated, or logically incomplete"
  ],
  "assumptions": [
    "things the student assumed without justifying"
  ],
  "rubric_gaps": [
    "rubric criteria that the submission does not clearly address"
  ],
  "defensible_sections": [
    "specific passages or claims that are worth probing in a defense"
  ]
}

--- PROFESSOR'S ASSIGNMENT BRIEF ---
Title: {ASSIGNMENT_TITLE}
Description: {ASSIGNMENT_DESCRIPTION}
Rubric / Learning objectives: {RUBRIC}
Reference material summary (if any): {REFERENCE_SUMMARY}

--- STUDENT'S SUBMISSION ---
{SUBMISSION_TEXT}
"""


QUESTION_PROMPT = """
Generate exactly {N} oral defense questions for this student's submission.
Difficulty level: {DIFFICULTY}

STRICT RULES — every question must satisfy ALL of the following:
1. It references something SPECIFIC in the student's submission (quote or paraphrase
   the exact section it targets in "section_reference")
2. It is RELEVANT to the professor's rubric or learning objectives
3. It is IMPOSSIBLE to answer well without having understood and written the work
4. Generic topic questions are FORBIDDEN ("What is X?", "Explain Y" with no submission anchor)
5. Each question must have a follow-up for when the student answers vaguely

For difficulty "easy":   test whether they understand their own conclusions
For difficulty "medium": probe their methodology and justify specific choices
For difficulty "hard":   challenge assumptions, ask what-if variants, expose gaps

Return ONLY valid JSON. No preamble, no markdown fences.

{
  "questions": [
    {
      "text": "the question asked aloud to the student",
      "section_reference": "the specific part of their submission this targets",
      "rubric_criterion": "which rubric point this tests",
      "follow_up": "if their answer is vague or evasive, ask this"
    }
  ]
}

--- PROFESSOR'S CONTEXT ---
Rubric: {RUBRIC}
Learning objectives: {ASSIGNMENT_DESCRIPTION}

--- SUBMISSION ANALYSIS ---
{ANALYSIS_JSON}
"""


EVAL_PROMPT = """
Evaluate a student's oral defense performance and produce a comprehension report.

You have:
- The professor's rubric and assignment context
- The student's original submission analysis
- Every question asked, with the student's transcribed answer and voice signals
- Voice signals per answer: hesitation count, filler word count, avg response
  latency in ms, estimated confidence score (0–1)

Assess whether the student genuinely understands the work they submitted.
A student who authored their own work will: answer quickly, refer to specific
details, self-correct naturally, and give consistent reasoning across questions.
A student who did not will: hesitate on specifics, give textbook definitions
instead of submission-specific answers, contradict themselves, and struggle with
follow-ups.

Return ONLY valid JSON. No preamble, no markdown fences.

{
  "overall_score": <0-100>,
  "understands": [
    "topic or concept they clearly grasped, with brief evidence"
  ],
  "weak_in": [
    "area where their knowledge was surface-level, with brief evidence"
  ],
  "cannot_justify": [
    "specific claim from their submission they could not defend"
  ],
  "rubric_alignment": [
    {
      "criterion": "rubric criterion text",
      "verdict": "demonstrated | partial | not demonstrated",
      "evidence": "brief quote or paraphrase from their answer"
    }
  ],
  "recommendation": "one of exactly: Clearly authored | Possibly AI-assisted but understands | AI-generated, does not understand",
  "summary": "2 sentences of plain English for the professor"
}

--- PROFESSOR'S CONTEXT ---
Rubric: {RUBRIC}

--- SUBMISSION ANALYSIS ---
{ANALYSIS_JSON}

--- DEFENSE TRANSCRIPT ---
{QA_JSON}
"""
