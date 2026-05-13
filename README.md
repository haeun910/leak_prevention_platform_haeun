# SecureAI — 기업 정보 유출 방지 실시간 AI 마스킹 플랫폼

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
venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example .env        # .env 파일 생성 후 API 키 입력

uvicorn app.main:app --reload
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
| 규칙 기반 | 전화번호, 이메일, 주민번호, 외국인등록번호, 여권번호, 차량번호, 계좌번호, 카드번호, IP |
| 모델 기반 | 이름, 주소, 비밀번호, API 키, 문서명/파일명 |

## 기술 스택

- **Backend**: Python, FastAPI, SQLAlchemy, KoELECTRA
- **Frontend**: React, Vite, Zustand, Axios
- **LLM**: OpenAI GPT-4o (Claude, Gemini 추후 지원 예정)


## 날짜별 수정 이력
- **04.27** : [전화번호], [계좌번호] 오탐 수정 <br>
    → backend\app\pipeline\regex_layer.py<br>
    → backend\app\api\mask.py<br>
    → backend\app\schemas\models.py<br>
    → backend\app\main.py<br>

- **04.30** : 새로고침 시 대화 내용 사라지는 문제 수정 <br>
    → 마스킹 한 원문이 localStorage에 저장되는 문제 수정 <br>
    → 채팅 전송 후 입력창에 바로 포커스 가도록 수정 <br>

- **05.03** : 직책 마스킹 예외 처리 <br>
    → 관리자 대시보드 로그인 화면 생성 <br>
    → 마스킹 로그 시간 수정 중 <br>

- **05.04** : 마스킹 로그 시간 수정 <br>
→ 관리자 대시보드 로그인 정리 <br>
→ 마스킹 비율 재조정 (추후 다시 체크 할 예정) <br>

- **05.11** : 채팅 내용 DB 저장 전환 (localStorage → DB) <br>
→ ChatConversation, ChatMessage 테이블 추가 <br>
→ 채팅 저장/조회/삭제 API 추가 (`/mask/conversations`) <br>
→ 사용자별 본인 채팅만 조회되도록 수정 <br>
→ `/api/auth/me` 엔드포인트 추가 <br>
→ 서버 재시작 시 토큰 자동 무효화 (보안 강화) <br>
→ chatStore.js persist 제거, DB 연동으로 교체 <br>
→ 새로고침 시 채팅창 유지, 서버 재시작 시 로그인 화면 표시 <br>
