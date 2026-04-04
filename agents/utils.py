import vertexai
from vertexai.generative_models import GenerativeModel
from google.cloud import storage
import PyPDF2
import io
import os
from dotenv import load_dotenv

load_dotenv()

vertexai.init(
    project=os.getenv("GOOGLE_PROJECT_ID"),
    location=os.getenv("VERTEX_AI_LOCATION")
)

def get_model():
    return GenerativeModel(os.getenv("GEMINI_MODEL"))

def download_pdf_from_gcs(gcs_path: str) -> str:
    """Download a PDF from GCS and extract text."""
    # gcs_path looks like gs://bucket-name/path/to/file.pdf
    gcs_path = gcs_path.replace("gs://", "")
    bucket_name, blob_path = gcs_path.split("/", 1)

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    pdf_bytes = blob.download_as_bytes()

    # Extract text from PDF
    reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"

    return text.strip()