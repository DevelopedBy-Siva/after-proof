import json
from agents.utils import get_model

def run_evaluator(transcript: str, analyst_output: dict, rubric: str, questions: list) -> dict:
    model = get_model()

    prompt = f"""You are an oral defense comprehension evaluator.

ORIGINAL ANALYSIS OF SUBMISSION:
{json.dumps(analyst_output, indent=2)}

PROFESSOR'S RUBRIC:
{rubric}

DEFENSE QUESTIONS ASKED:
{json.dumps(questions, indent=2)}

FULL DEFENSE TRANSCRIPT:
{transcript}

Evaluate the student's comprehension based on their defense answers.
Be strict — partial or memorized answers should not score highly.

Return ONLY a valid JSON object:
{{
  "overall_score": <integer 0-100>,
  "understands": ["concepts the student clearly demonstrated understanding of"],
  "weak_in": ["topics where understanding was shallow or uncertain"],
  "cannot_justify": ["claims they made in submission but could not defend"],
  "rubric_verdicts": {{
    "<criterion>": "demonstrated" | "partial" | "not_demonstrated"
  }},
  "recommendation": "genuine_understanding" | "partial_understanding" | "ai_generated_does_not_understand",
  "summary": "2-3 sentence plain English summary of the defense performance"
}}

Return JSON only. No markdown, no explanation, no backticks."""

    response = model.generate_content(prompt)
    text = response.text.strip()

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    return json.loads(text)