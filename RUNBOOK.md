# LessonPilot — Runbook

## Local Development
1. Clone repo: `git clone https://github.com/tracybailey5150/lessonpilot-app.git`
2. Install: `npm install`
3. Copy env: `cp .env.example .env.local` and fill in values
4. Run: `npm run dev` (starts at http://localhost:3000)

## Required Env Vars for Local
See `ENVIRONMENT.md` for full list. Minimum: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.

## Build & Lint
```bash
npm run build    # must pass before any deploy
npm run lint     # ESLint check
```

## Deploy
- **Auto:** Push to `main` triggers Vercel production deploy.
- **Manual:** `vercel --prod` from linked project directory.
- **Preview:** Push to any non-main branch for preview URL.

## Rollback
1. Go to Vercel Dashboard > Deployments.
2. Find last known good deployment.
3. Click "..." > "Promote to Production".

## Check Logs
- **Vercel:** Dashboard > Functions tab, or `vercel logs <url>`.
- **Supabase:** Dashboard > Logs (API, Auth, Postgres).

## Verify Services

| Service | How to Check |
|---------|--------------|
| **App** | Visit https://lessonpilot.org, confirm page loads |
| **Auth** | Try login/signup flow, check Supabase Auth > Users |
| **Supabase** | Dashboard > Table Editor, verify tables exist |
| **Stripe** | Stripe Dashboard > Webhooks, check recent events |
| **AI** | Create a course, verify lesson generation works |
| **TTS** | Open a lesson, trigger TTS, verify audio plays |
| **Email** | Resend Dashboard > Emails, check delivery status |

## Common Failures

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 500 on all pages | Missing env vars | Check Vercel env config |
| Auth redirect loop | Supabase URL/key wrong | Verify SUPABASE env vars |
| Lessons not generating | OPENAI_API_KEY missing | Set OpenAI key in Vercel |
| TTS silent | OpenAI key or quota issue | Check API key and billing |
| Webhook 401 | Stripe secret mismatch | Re-copy STRIPE_WEBHOOK_SECRET |
| Email not sending | RESEND_API_KEY missing | Check Resend dashboard |
| Build fails | TypeScript errors | Run `npm run build` locally first |
| RAG returns no results | Embeddings not generated | Check embedding pipeline and OpenAI key |
