# Deployment Guide

## Recommended split deployment

Use Vercel for the React frontend and Render for the FastAPI backend.

```text
Browser
  -> Vercel frontend
  -> Render backend /api
  -> Render persistent disk for SQLite
```

## Backend on Render

1. Create a new Render Web Service.
2. Use the `backend` directory as the service root.
3. Select Docker as the runtime.
4. Add a persistent disk mounted at `/data`.
5. Set these environment variables:

```text
DATABASE_URL=sqlite:////data/admin_logs.db
JWT_SECRET_KEY=<strong random secret>
OPENAI_API_KEY=<your OpenAI API key>
OPENAI_MODEL=gpt-4o
ALLOWED_ORIGINS=["https://your-vercel-app.vercel.app"]
```

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
