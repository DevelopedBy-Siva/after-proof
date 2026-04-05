import vertexai
from vertexai.generative_models import GenerativeModel
from google.cloud import storage
import PyPDF2
import io
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID")
LOCATION   = os.getenv("VERTEX_AI_LOCATION")
MODEL      = os.getenv("GEMINI_MODEL")

vertexai.init(project=PROJECT_ID, location=LOCATION)

def get_model():
    return GenerativeModel(MODEL)

def download_pdf_from_gcs(gcs_path: str) -> str:
    gcs_path    = gcs_path.replace("gs://", "")
    bucket_name, blob_path = gcs_path.split("/", 1)

    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(bucket_name)
    blob   = bucket.blob(blob_path)

    pdf_bytes = blob.download_as_bytes()
    reader    = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    text      = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"

    return text.strip()