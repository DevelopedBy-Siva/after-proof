import json

from agents.prompts import EVAL_PROMPT
from agents.schemas import EvalReport
from agents.utils import get_model


def run_evaluator(transcript_json: str, analyst_output: dict, rubric: str) -> dict:
    model = get_model()
    prompt = EVAL_PROMPT.format(
        RUBRIC=rubric,
        ANALYSIS_JSON=json.dumps(analyst_output, indent=2),
        QA_JSON=transcript_json,
    )

    response = model.generate_content(prompt)
    text = response.text.strip()

    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]

    parsed = json.loads(text.strip())
    return EvalReport.model_validate(parsed).model_dump()
