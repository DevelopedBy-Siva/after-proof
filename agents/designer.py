import json

from agents.prompts import QUESTION_PROMPT
from agents.schemas import QuestionSet
from agents.utils import get_model


def run_designer(
    analyst_output: dict,
    rubric: str,
    assignment_description: str,
    difficulty: str = 'medium',
) -> dict:
    model = get_model()
    prompt = QUESTION_PROMPT.format(
        N=3,
        DIFFICULTY=difficulty,
        RUBRIC=rubric,
        ASSIGNMENT_DESCRIPTION=assignment_description,
        ANALYSIS_JSON=json.dumps(analyst_output, indent=2),
    )

    response = model.generate_content(prompt)
    text = response.text.strip()

    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]

    parsed = json.loads(text.strip())
    return QuestionSet.model_validate(parsed).model_dump()
