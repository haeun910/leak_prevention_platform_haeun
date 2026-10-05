# 배포 가이드 (무료 구성)

```text
브라우저
  -> Vercel (React 프론트엔드)
  -> Hugging Face Spaces (FastAPI 백엔드 + KoELECTRA NER 모델, Docker)
  -> Supabase (PostgreSQL DB)
```

| 구성 요소 | 서비스 | 비고 |
|---|---|---|
| 프론트엔드 | Vercel Hobby | 무료 |
| 백엔드 | Hugging Face Spaces CPU basic | 무료, 16GB RAM. 48시간 미사용 시 잠들고 첫 접속에 1~2분 소요 |
| 모델 가중치 | Hugging Face 모델 저장소 | 무료, 비공개 가능 |
| DB | Supabase Free | 무료, 500MB. 1주일 미사용 시 프로젝트 일시정지됨 (대시보드에서 재개) |

## 1. Supabase — DB 만들기

1. https://supabase.com 에서 New project 생성 (Region: Northeast Asia (Seoul) 권장). DB 비밀번호를 기록해 둡니다.
2. 프로젝트 상단의 **Connect** 버튼 → **Session pooler** 의 URI를 복사합니다.

```text
postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

- `Direct connection`은 IPv6 전용이라 Hugging Face에서 접속이 안 될 수 있으므로 **Session pooler**를 사용합니다.
- 비밀번호에 `@`, `#`, `/` 같은 특수문자가 있으면 URL 인코딩해야 합니다 (예: `@` → `%40`).
- 테이블은 백엔드가 처음 시작될 때 자동으로 생성되며, Supabase REST API로 데이터가 노출되지 않도록 RLS(Row Level Security)도 자동으로 켜집니다.

## 2. Hugging Face — 모델 업로드 (한 번만)

`backend/models/model.safetensors`는 용량 때문에 git에 포함되지 않습니다. 모델 폴더를 **비공개** 모델 저장소에 올립니다.

```bash
pip install -U huggingface_hub
hf auth login                      # https://huggingface.co/settings/tokens 에서 Write 토큰 발급
hf upload <HF아이디>/veil-koelectra-ner backend/models . --private
```

그리고 **Read 권한 토큰**을 하나 더 발급해 둡니다 (Space가 비공개 모델을 내려받을 때 사용, 아래 `HF_TOKEN`).

## 3. Hugging Face Spaces — 백엔드 배포

1. https://huggingface.co/new-space 에서 Space 생성
   - SDK: **Docker** → Blank
   - Hardware: **CPU basic (Free)**
   - Visibility: **Public** (Vercel 프론트엔드가 호출해야 하므로 공개 필요. 코드만 공개되고 비밀값·모델은 노출되지 않음)
2. Space의 **Settings → Variables and secrets** 에서 **Secret**으로 추가:

```text
DATABASE_URL=<1단계에서 복사한 Supabase Session pooler URI>
JWT_SECRET_KEY=<길고 랜덤한 문자열>
ADMIN_PASSWORD=<관리자(admin) 계정 비밀번호>
OPENAI_API_KEY=<OpenAI API 키>
NER_MODEL_REPO=<HF아이디>/veil-koelectra-ner
HF_TOKEN=<Read 토큰>
ALLOWED_ORIGINS=*            # 5단계에서 Vercel 주소로 변경
```

3. `backend` 폴더를 Space에 업로드합니다. **`.env`·DB·모델 가중치가 공개 Space에 올라가지 않도록 반드시 `--exclude`를 붙입니다.**

```bash
hf upload <HF아이디>/veil-backend backend . --repo-type space \
  --exclude ".env" --exclude ".env.*" --exclude "venv/*" --exclude "*.db" \
  --exclude "models/*.safetensors" --exclude "models/*.bin" --exclude "*__pycache__*"
```

4. Space의 **Logs** 탭에서 빌드가 끝나고 `[NER] 모델 로드 완료`가 나오는지 확인합니다.
   백엔드 주소는 `https://<HF아이디>-veil-backend.hf.space` 형태이며, `/docs`에서 API 문서를 볼 수 있습니다.

`backend/README.md`의 front matter(`sdk: docker`, `app_port: 8000`)가 Space 설정 역할을 합니다.

## 4. Vercel — 프론트엔드 배포

1. Vercel에서 GitHub 저장소를 Import 하고 **Root Directory**를 `frontend`로 지정합니다 (Framework: Vite).
2. 환경변수 추가:

```text
VITE_API_BASE_URL=https://<HF아이디>-veil-backend.hf.space/api
```

3. Deploy. `frontend/vercel.json`이 모든 경로를 `index.html`로 보내므로 `/chat`, `/dashboard`에서 새로고침해도 404가 나지 않습니다.

## 5. 연결 마무리

Space의 `ALLOWED_ORIGINS` Secret을 Vercel 주소로 바꾸면 Space가 자동으로 재시작됩니다.

```text
ALLOWED_ORIGINS=https://<your-app>.vercel.app
```

쉼표로 여러 개 지정할 수 있습니다 (JSON 배열 형식도 가능).

## 변경 사항 반영

- 프론트엔드: GitHub에 push하면 Vercel이 자동 재배포합니다.
- 백엔드: 3단계의 `hf upload` 명령을 다시 실행합니다.
- Space가 재시작되면 보안 정책상 모든 사용자가 다시 로그인해야 합니다.

## 로컬 개발

`backend/.env`에 `DATABASE_URL`을 지정하지 않으면 SQLite(`admin_logs.db`)를 사용합니다.
프론트엔드는 `npm run dev` 시 `/api` 요청을 `http://localhost:8000`으로 프록시합니다.

## (참고) Render 배포

`render.yaml`도 남아 있습니다. 모델 메모리 때문에 2GB 이상인 유료 `standard` 플랜이 필요합니다.
