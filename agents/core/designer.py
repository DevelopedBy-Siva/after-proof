import json

from core.prompts import QUESTION_PROMPT
from core.schemas import QuestionSet
from core.utils import get_model


def run_designer(
    analyst_output: dict,
    assignment_description: str,
    additional_details: str,
    difficulty: str = 'medium',
) -> dict:
    model = get_model()
    prompt = QUESTION_PROMPT.format(
        N=3,
        DIFFICULTY=difficulty,
        ASSIGNMENT_DESCRIPTION=assignment_description,
        ADDITIONAL_DETAILS=additional_details or 'None provided',
        ANALYSIS_JSON=json.dumps(analyst_output, indent=2),
    )

    response = model.generate_content(prompt)
    text = response.text.strip()

    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]

    parsed = json.loads(text.strip())

    if isinstance(parsed, list):
        parsed = {'questions': parsed}

    return QuestionSet.model_validate(parsed).model_dump()