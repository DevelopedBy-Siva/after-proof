import json

from core.prompts import ANALYST_PROMPT
from core.schemas import AnalystOutput
from core.utils import get_model


def run_analyst(
    submission_text: str,
    assignment_title: str,
    assignment_description: str,
    additional_details: str,
    reference_summary: str = '',
) -> dict:
    model = get_model()
    prompt = ANALYST_PROMPT.format(
        ASSIGNMENT_TITLE=assignment_title,
        ASSIGNMENT_DESCRIPTION=assignment_description,
        ADDITIONAL_DETAILS=additional_details or 'None provided',
        REFERENCE_SUMMARY=reference_summary or 'None provided',
        SUBMISSION_TEXT=submission_text,
    )

    response = model.generate_content(prompt)
    text = response.text.strip()

    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]

    parsed = json.loads(text.strip())
    return AnalystOutput.model_validate(parsed).model_dump()
