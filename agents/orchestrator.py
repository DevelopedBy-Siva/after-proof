import json
import uuid
from typing import Any, Dict

from google.cloud import firestore

from agents.analyst import run_analyst
from agents.designer import run_designer
from agents.evaluator import run_evaluator
from agents.utils import download_pdf_from_gcs


class PipelineOrchestrator:
    def __init__(self, db: firestore.Client):
        self.db = db

    def run_pipeline(self, submission_id: str) -> Dict[str, Any]:
        submission_ref = self.db.collection('submissions').document(submission_id)
        try:
            submission_doc = submission_ref.get()
            if not submission_doc.exists:
                raise ValueError(f'Submission {submission_id} not found')

            submission = submission_doc.to_dict()
            assignment_doc = self.db.collection('assignments').document(submission['assignmentId']).get()
            assignment = assignment_doc.to_dict()
            if not assignment:
                raise ValueError(f"Assignment {submission['assignmentId']} not found")

            submission_ref.update({'status': 'analyzing'})
            submission_text = download_pdf_from_gcs(submission['gcsFileUrl'])
            if not submission_text.strip():
                raise ValueError('No extractable text found in submitted file')

            analysis = run_analyst(
                submission_text=submission_text,
                assignment_title=assignment['title'],
                assignment_description=assignment['description'],
                rubric=assignment['rubric'],
                reference_summary='\n'.join(assignment.get('referenceDocsGcs', [])),
            )

            question_set = run_designer(
                analyst_output=analysis,
                rubric=assignment['rubric'],
                assignment_description=assignment['description'],
                difficulty=assignment['difficulty'],
            )

            session_id = str(uuid.uuid4())
            self.db.collection('defense_sessions').document(session_id).set({
                'submissionId': submission_id,
                'studentName': submission['studentName'],
                'status': 'active',
                'transcript': [],
                'recordingGcsUrl': None,
                'startedAt': firestore.SERVER_TIMESTAMP,
                'endedAt': None,
            })

            submission_ref.update({
                'analysis': analysis,
                'questions': question_set['questions'],
                'status': 'ready_for_defense',
                'sessionId': session_id,
            })

            return {
                'submissionId': submission_id,
                'sessionId': session_id,
                'questions': question_set['questions'],
            }
        except Exception as error:
            submission_ref.update({
                'status': 'error',
                'error': str(error),
            })
            raise

    def evaluate_session(self, session_id: str) -> Dict[str, Any]:
        session_ref = self.db.collection('defense_sessions').document(session_id)
        session_doc = session_ref.get()
        if not session_doc.exists:
            raise ValueError(f'Session {session_id} not found')

        session = session_doc.to_dict()
        submission_ref = self.db.collection('submissions').document(session['submissionId'])
        submission = submission_ref.get().to_dict()
        assignment = self.db.collection('assignments').document(submission['assignmentId']).get().to_dict()

        report = run_evaluator(
            transcript_json=json.dumps(session.get('transcript', []), indent=2),
            analyst_output=submission['analysis'],
            rubric=assignment['rubric'],
        )

        report_id = str(uuid.uuid4())
        report_doc = {
            'sessionId': session_id,
            'submissionId': session['submissionId'],
            'assignmentId': submission['assignmentId'],
            'studentName': submission['studentName'],
            'overallScore': report['overall_score'],
            'understands': report['understands'],
            'weakIn': report['weak_in'],
            'cannotJustify': report['cannot_justify'],
            'rubricAlignment': report['rubric_alignment'],
            'recommendation': report['recommendation'],
            'summary': report['summary'],
            'generatedAt': firestore.SERVER_TIMESTAMP,
        }

        self.db.collection('reports').document(report_id).set(report_doc)
        submission_ref.update({
            'status': 'complete',
            'reportId': report_id,
        })
        session_ref.update({
            'status': 'complete',
            'endedAt': firestore.SERVER_TIMESTAMP,
        })

        response_report = {
            key: value
            for key, value in report_doc.items()
            if key != 'generatedAt'
        }

        return {'reportId': report_id, 'report': response_report}
