FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
# CPU 전용 torch를 먼저 설치 (기본 PyPI torch는 CUDA 포함이라 이미지가 수 GB로 커짐)
RUN pip install --no-cache-dir torch==2.3.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY config.yaml ./config.yaml
COPY models ./models

EXPOSE 8000
# Render 등 PaaS는 PORT 환경변수로 포트를 지정함
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
