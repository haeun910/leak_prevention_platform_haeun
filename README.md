# VeilAI — 기업 정보 유출 방지 실시간 AI 마스킹 플랫폼

## 실행 방법

### 1. 모델 파일 배치
```
backend/models/
├── config.json
├── model.safetensors
├── tokenizer.json
└── tokenizer_config.json
```

### 2. 백엔드 실행
```bash
cd backend
python -m venv venv
venv\Scripts\activate # MAC : source venv/bin/activate
pip install -r requirements.txt

cp ../.env.example .env        # .env 파일 생성 후 API 키 입력

uvicorn app.main:app --port 8001
# → http://localhost:8000
# → API 문서: http://localhost:8000/docs
```

### 3. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## 마스킹 대상

| 구분 | 항목 |
|---|---|
| 규칙 기반 | 전화번호, 이메일, 주민번호, 외국인등록번호, 여권번호, 차량번호, 계좌번호, 카드번호 |
| 모델 기반 | 이름, 주소, 비밀번호, API 키, 문서명/파일명 |

## 기술 스택

- **Backend**: Python, FastAPI, SQLAlchemy, KoELECTRA
- **Frontend**: React, Vite, Zustand, Axios
- **LLM**: OpenAI GPT-4o | Claude-sonnet-4-6 | Gemini-2.5-flash