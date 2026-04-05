import os
import traceback

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from google.cloud import firestore

from core.orchestrator import PipelineOrchestrator

load_dotenv()

app = Flask(__name__)
db = firestore.Client(project=os.getenv('GOOGLE_PROJECT_ID'))
orchestrator = PipelineOrchestrator(db)


@app.get('/health')
def health():
    return jsonify({'status': 'ok'})


@app.post('/run-pipeline')
def run_pipeline():
    try:
        payload = request.get_json(force=True) or {}
        submission_id = payload['submissionId']
        print(f'[run-pipeline] starting submissionId={submission_id}', flush=True)
        result = orchestrator.run_pipeline(submission_id)
        print(f'[run-pipeline] completed submissionId={submission_id}', flush=True)
        return jsonify(result)
    except Exception as error:
        print(f'[run-pipeline] failed: {error}', flush=True)
        traceback.print_exc()
        return jsonify({'error': str(error)}), 500


@app.post('/evaluate-defense')
def evaluate_defense():
    try:
        payload = request.get_json(force=True) or {}
        session_id = payload['sessionId']
        print(f'[evaluate-defense] starting sessionId={session_id}', flush=True)
        result = orchestrator.evaluate_session(session_id)
        print(f'[evaluate-defense] completed sessionId={session_id}', flush=True)
        return jsonify(result)
    except Exception as error:
        print(f'[evaluate-defense] failed: {error}', flush=True)
        traceback.print_exc()
        return jsonify({'error': str(error)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', '5001'))
    app.run(host='0.0.0.0', port=port, debug=True)
