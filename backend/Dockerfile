FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces는 컨테이너를 UID 1000 사용자로 실행하므로
# 해당 사용자가 쓸 수 있도록 홈/앱 폴더 소유자를 맞춰 둔다 (Render·docker-compose는 root로 실행)
RUN useradd -m -u 1000 user
ENV HOME=/home/user

WORKDIR /app

COPY requirements.txt .
# CPU 전용 torch를 먼저 설치 (기본 PyPI torch는 CUDA 포함이라 이미지가 수 GB로 커짐)
RUN pip install --no-cache-dir torch==2.3.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=user app ./app
COPY --chown=user config.yaml ./config.yaml
# 모델 가중치는 NER_MODEL_REPO에서 내려받으므로 models 폴더에 쓰기 권한이 필요함
COPY --chown=user models ./models

EXPOSE 8000
# Render 등 PaaS는 PORT 환경변수로 포트를 지정함
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
