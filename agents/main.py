import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from google.cloud import firestore

from agents.orchestrator import PipelineOrchestrator

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
        result = orchestrator.run_pipeline(request.json['submissionId'])
        return jsonify(result)
    except Exception as error:
        return jsonify({'error': str(error)}), 500


@app.post('/evaluate-defense')
def evaluate_defense():
    try:
        result = orchestrator.evaluate_session(request.json['sessionId'])
        return jsonify(result)
    except Exception as error:
        return jsonify({'error': str(error)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', '5001'))
    app.run(host='0.0.0.0', port=port, debug=True)
