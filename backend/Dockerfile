# Build from the REPO ROOT (the offline audio clips live in /assets):  docker build -f backend/Dockerfile .
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend backend
COPY assets assets

WORKDIR /app/backend
CMD ["sh", "start.sh"]
