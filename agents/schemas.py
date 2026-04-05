from typing import List, Literal

from pydantic import BaseModel


class AnalystOutput(BaseModel):
    key_concepts: List[str]
    claims: List[str]
    methodology: str
    weak_areas: List[str]
    assumptions: List[str]
    rubric_gaps: List[str]
    defensible_sections: List[str]


class Question(BaseModel):
    text: str
    section_reference: str
    rubric_criterion: str
    follow_up: str


class QuestionSet(BaseModel):
    questions: List[Question]


class RubricVerdict(BaseModel):
    criterion: str
    verdict: Literal['demonstrated', 'partial', 'not demonstrated']
    evidence: str


class EvalReport(BaseModel):
    overall_score: int
    understands: List[str]
    weak_in: List[str]
    cannot_justify: List[str]
    rubric_alignment: List[RubricVerdict]
    recommendation: Literal[
        'Clearly authored',
        'Possibly AI-assisted but understands',
        'AI-generated, does not understand',
    ]
    summary: str
