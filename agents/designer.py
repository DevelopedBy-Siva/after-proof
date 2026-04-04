import json
from agents.utils import get_model

def run_designer(analyst_output: dict, rubric: str, difficulty: str = "medium") -> list:
    model = get_model()

    prompt = f"""You are an oral defense question designer for academic integrity verification.

ANALYSIS OF STUDENT'S SUBMISSION:
{json.dumps(analyst_output, indent=2)}

PROFESSOR'S RUBRIC:
{rubric}

DIFFICULTY LEVEL: {difficulty}

Generate exactly 4 oral defense questions. Every question MUST:
1. Reference something SPECIFIC from the student's actual submission
2. Target at least one rubric criterion
3. Be impossible to answer correctly without genuine understanding
4. Not be answerable with a simple yes/no

Also provide a follow-up probe for each question to use if the student gives a vague answer.

Return ONLY a valid JSON array:
[
  {{
    "question": "the full question to ask the student",
    "targets_rubric": "which rubric criterion this tests",
    "references_submission": "what specific part of their submission this references",
    "follow_up_probe": "follow-up question if their answer is vague"
  }}
]

Return JSON only. No markdown, no explanation, no backticks."""

    response = model.generate_content(prompt)
    text = response.text.strip()

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    return json.loads(text)