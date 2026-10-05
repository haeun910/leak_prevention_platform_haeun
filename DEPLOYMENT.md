# Deployment Guide

## Recommended split deployment

Use Vercel for the React frontend and Render for the FastAPI backend.

```text
Browser
  -> Vercel frontend
  -> Render backend /api
  -> Render persistent disk for SQLite
```

## 0. Upload the NER model weights (one time)

`backend/models/model.safetensors` is excluded from git (too large), so a server
built from GitHub has no model and only regex masking works. Upload the model
folder to a Hugging Face model repository (private is fine):

```bash
pip install huggingface_hub
huggingface-cli login
huggingface-cli upload <hf-username>/veil-koelectra-ner backend/models . --private
```

Then set `NER_MODEL_REPO=<hf-username>/veil-koelectra-ner` (and `HF_TOKEN` for a
private repo) on the backend. The server downloads the weights on first start.

## Backend on Render

The repository includes `render.yaml`, so you can use **New → Blueprint** and
select this repository. Or set it up manually:

1. Create a new Render Web Service.
2. Use the `backend` directory as the service root.
3. Select Docker as the runtime.
4. Choose an instance with at least 2 GB RAM (`standard`). torch + KoELECTRA
   does not fit in the 512 MB `starter` plan.
5. Add a persistent disk mounted at `/data`.
6. Set these environment variables:

```text
DATABASE_URL=sqlite:////data/admin_logs.db
JWT_SECRET_KEY=<strong random secret>
ADMIN_PASSWORD=<admin account password>
OPENAI_API_KEY=<your OpenAI API key>
OPENAI_MODEL=gpt-4o
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
NER_MODEL_REPO=<hf-username>/veil-koelectra-ner
HF_TOKEN=<Hugging Face read token, only for a private repo>
```

`ALLOWED_ORIGINS` accepts a comma-separated list or a JSON array.
If `ADMIN_PASSWORD` is not set, the `admin` account is created with the default
password `12345678` — always set it in production.

After the service is live, the backend URL will look like:

```text
https://leak-prevention-backend.onrender.com
```

The API base URL for the frontend is:

```text
https://leak-prevention-backend.onrender.com/api
```

## Frontend on Vercel

1. Create a new Vercel project from the `frontend` directory.
2. Set the build command:

```text
npm run build
```

3. Set the output directory:

```text
dist
```

4. Add this environment variable:

```text
VITE_API_BASE_URL=https://leak-prevention-backend.onrender.com/api
```

5. Deploy the frontend.

`frontend/vercel.json` rewrites every path to `index.html`, so refreshing on
`/chat` or `/dashboard` does not return a 404.

6. Copy the Vercel URL into the backend's `ALLOWED_ORIGINS` and redeploy the backend.

## Updating after changes

Frontend changes require a new Vercel deployment.

Backend code, dependencies, model, or Dockerfile changes require a new Render deployment.

Environment variable changes usually need a service restart or redeploy.

## Local development

For local Vite development, use:

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

If the variable is not set, the frontend falls back to `/api`, which works with the Docker/Nginx setup in `docker-compose.yml`.
