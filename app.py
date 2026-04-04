from flask import Flask, request, jsonify
from dotenv import load_dotenv
from google.cloud import firestore
import os

load_dotenv()

from agents.utils import download_pdf_from_gcs
from agents.analyst import run_analyst
from agents.designer import run_designer
from agents.evaluator import run_evaluator

app = Flask(__name__)
db = firestore.Client(project=os.getenv("GOOGLE_PROJECT_ID"))

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/pipeline/run', methods=['POST'])
def run_pipeline():
    data = request.json
    submission_id = data['submissionId']
    gcs_path      = data['gcsPath']
    rubric        = data['rubric']
    difficulty    = data['difficulty']
    brief         = data['assignmentBrief']

    try:
        # Update status
        db.collection('submissions').document(submission_id).update({
            'status': 'analyzing'
        })

        # Extract text from submitted PDF
        print(f"[1/3] Downloading PDF from {gcs_path}")
        submission_text = download_pdf_from_gcs(gcs_path)

        # Agent 1 — Analyst
        print("[2/3] Running analyst agent...")
        analysis = run_analyst(submission_text, brief, rubric)

        # Agent 2 — Designer
        print("[3/3] Running question designer agent...")
        questions = run_designer(analysis, rubric, difficulty)

        # Save to Firestore, mark ready for defense
        db.collection('submissions').document(submission_id).update({
            'status': 'ready_for_defense',
            'analysis': analysis,
            'questions': questions,
        })

        print(f"Pipeline complete for {submission_id}")
        return jsonify({'status': 'ok', 'questions': questions})

    except Exception as e:
        print(f"Pipeline error: {e}")
        db.collection('submissions').document(submission_id).update({
            'status': 'error',
            'error': str(e)
        })
        return jsonify({'error': str(e)}), 500

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data          = request.json
    submission_id = data['submissionId']
    transcript    = data['transcript']

    try:
        doc = db.collection('submissions').document(submission_id).get()
        submission = doc.to_dict()

        print(f"Running evaluator for {submission_id}...")
        report = run_evaluator(
            transcript,
            submission['analysis'],
            data['rubric'],
            submission['questions']
        )

        db.collection('submissions').document(submission_id).update({
            'status': 'complete',
            'report': report,
            'transcript': transcript,
        })

        return jsonify({'status': 'ok', 'report': report})

    except Exception as e:
        print(f"Evaluator error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5001))
    print(f"Agent service running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)