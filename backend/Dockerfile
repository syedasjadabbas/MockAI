# Production-grade Dockerfile for MockAI FastAPI Backend on Render Web Service
FROM python:3.11-slim

# Prevent python from writing pyc files and buffer stdout/stderr for real-time logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    MEDIA_STORAGE_DIR=/app/media \
    UPLOAD_DIR=/app/uploads

WORKDIR /app

# Install system dependencies:
# - ffmpeg: audio extraction & transcoding from candidate webm takes (16kHz mono WAV)
# - libgl1 & libglib2.0-0: required for OpenCV and ONNX runtime C-extensions
# - curl: required for container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU-only build first (massive image size reduction ~400MB vs ~3.5GB)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install application dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache the sentence-transformers NLP model inside the image for zero cold-start delay
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application source code
COPY . .

# Pre-download YuNet face detection and Emotion-FERPlus ONNX models if not present
RUN python -c "from services.facial_analyzer import FacialAnalyzer; FacialAnalyzer()"

# Ensure storage directories exist
RUN mkdir -p /app/uploads /app/media /app/models

# Expose default port
EXPOSE 8000

# Healthcheck for container orchestrators
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT}/health || exit 1

# Launch uvicorn listening on 0.0.0.0 and dynamic $PORT provided by Render
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
