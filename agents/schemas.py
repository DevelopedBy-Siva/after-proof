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


class QAReview(BaseModel):
    question_text: str
    answer_text: str
    is_correct: bool
    why_marked_wrong_markdown: str
    submission_alignment_markdown: str
    behavioral_signal_markdown: str


class EvalReport(BaseModel):
    overall_score: int
    ai_conclusion: str
    student_summary_markdown: str
    professor_summary_markdown: str
    behavioral_summary_markdown: str
    qa_review: List[QAReview]
    understanding_gaps: List[str]
    recommendation: Literal[
        'Clearly understands submission',
        'Partial understanding',
        'Does not appear to understand submission',
    ]
