import json
from agents.utils import get_model

def run_analyst(submission_text: str, assignment_brief: str, rubric: str, ref_docs: str = "") -> dict:
    model = get_model()

    prompt = f"""You are an academic submission analyst.

ASSIGNMENT BRIEF:
{assignment_brief}

PROFESSOR'S RUBRIC (what must be demonstrated to pass):
{rubric}

REFERENCE MATERIALS:
{ref_docs if ref_docs else "None provided"}

STUDENT SUBMISSION:
{submission_text}

Analyze the submission carefully. Return ONLY a valid JSON object with these exact keys:
{{
  "key_concepts": ["list of concepts the student addressed"],
  "weak_areas": ["topics that are vague, shallow, or incorrect"],
  "rubric_gaps": ["rubric criteria not met or poorly addressed"],
  "methodology": "brief description of the student's approach",
  "notable_claims": ["specific claims made that can be probed in oral defense"],
  "overall_impression": "one sentence summary"
}}

Return JSON only. No markdown, no explanation, no backticks."""

    response = model.generate_content(prompt)
    text = response.text.strip()

    # Strip markdown code fences if model adds them anyway
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    return json.loads(text)