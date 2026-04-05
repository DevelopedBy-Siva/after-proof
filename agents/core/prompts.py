ANALYST_PROMPT = """
You are analyzing a student's submitted assignment in the context of what the
professor asked for. Your output will be used to generate targeted oral defense
questions that test genuine understanding.

Return ONLY valid JSON. No preamble, no markdown fences.

{{
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
    "assignment expectations or details the submission does not clearly address"
  ],
  "defensible_sections": [
    "specific passages or claims that are worth probing in a defense"
  ]
}}

--- PROFESSOR'S ASSIGNMENT BRIEF ---
Title: {ASSIGNMENT_TITLE}
Description: {ASSIGNMENT_DESCRIPTION}
Additional details / expectations: {ADDITIONAL_DETAILS}
Reference material summary (if any): {REFERENCE_SUMMARY}

--- STUDENT'S SUBMISSION ---
{SUBMISSION_TEXT}
"""


QUESTION_PROMPT = """
Generate exactly {N} oral defense questions for this student's submission.
Difficulty level: {DIFFICULTY}

STRICT RULES - every question must satisfy ALL of the following:
1. It references something SPECIFIC in the student's submission (quote or paraphrase
   the exact section it targets in "section_reference")
2. It is relevant to the assignment description or additional details
3. It is impossible to answer well without having understood and written the work
4. Generic topic questions are forbidden
5. Keep each question concise. Two sentences max.
6. Each question must have a concise follow-up for vague answers

Return ONLY valid JSON. No preamble, no markdown fences.

{{
  "questions": [
    {{
      "text": "the question asked aloud to the student",
      "section_reference": "the specific part of their submission this targets",
      "rubric_criterion": "which assignment expectation this tests",
      "follow_up": "a short follow-up if their answer is vague or evasive"
    }}
  ]
}}

--- PROFESSOR'S CONTEXT ---
Assignment description: {ASSIGNMENT_DESCRIPTION}
Additional details: {ADDITIONAL_DETAILS}

--- SUBMISSION ANALYSIS ---
{ANALYSIS_JSON}
"""


EVAL_PROMPT = """
Evaluate a student's oral defense performance and produce a comprehension report.

The evaluation is only about whether the student understands the submission they turned in.
The professor will evaluate the written document separately.

You have:
- The assignment context
- The student's original submission analysis
- Every question asked, with the student's transcribed answer and voice signals

Assess whether the student genuinely understands the work they submitted.
Questions and judgments should stay grounded in the student's own submission.

Return ONLY valid JSON. No preamble, no markdown fences.

{{
  "understanding": <0-100>,
  "confidence": "one of exactly: High | Medium | Low",
  "clarity": "one of exactly: High | Medium | Low",
  "ai_conclusion": "1-2 sentence conclusion about whether the student actually understands the submitted work",
  "student_summary_markdown": "markdown summary for the student explaining the result",
  "professor_summary_markdown": "markdown summary for the professor explaining where the defense did not align with the submission",
  "behavioral_summary_markdown": "markdown summary of hesitation, vagueness, confidence, clarity, and follow-up behavior",
  "qa_review": [
    {{
      "question_text": "question asked",
      "answer_text": "student answer",
      "is_correct": true,
      "why_marked_wrong_markdown": "if wrong or weak, explain exactly why; if acceptable, explain briefly why",
      "submission_alignment_markdown": "explain how this answer did or did not align with the student's own submission",
      "behavioral_signal_markdown": "mention hesitation, filler words, confidence, clarity, or follow-up behavior relevant to this answer"
    }}
  ],
  "understanding_gaps": [
    "specific concept or claim they could not explain"
  ],
  "recommendation": "one of exactly: Clearly understands submission | Partial understanding | Does not appear to understand submission"
}}

Scoring guidance:
- "understanding" should estimate how well the student demonstrated actual understanding of their own submitted work.
- "confidence" should reflect how assured and decisive the student sounded across the defense.
- "clarity" should reflect how clearly, directly, and coherently the student explained ideas.

Use these definitions:
- High confidence: answers are direct, assured, and show little hesitation.
- Medium confidence: some hesitation or uncertainty, but still reasonably steady.
- Low confidence: frequent hesitation, filler, uncertainty, evasion, or guessing.

- High clarity: explanations are specific, coherent, and easy to follow.
- Medium clarity: explanations are partly clear but inconsistent, vague in places, or incomplete.
- Low clarity: explanations are confusing, vague, rambling, or difficult to follow.

Behavioral cues should influence confidence and clarity, but not override evidence of actual understanding.
A confident but incorrect answer should not receive high understanding.
A hesitant but correct and grounded answer may still receive good understanding.

--- ASSIGNMENT CONTEXT ---
Description: {ASSIGNMENT_DESCRIPTION}
Additional details: {ADDITIONAL_DETAILS}

--- SUBMISSION ANALYSIS ---
{ANALYSIS_JSON}

--- DEFENSE TRANSCRIPT ---
{QA_JSON}
"""