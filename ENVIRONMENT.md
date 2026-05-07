# LessonPilot — Environment Variables

## Required Variables

| Variable | Purpose | Local | Vercel | Where to Get |
|----------|---------|-------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API endpoint | Yes | Yes | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public/anon key | Yes | Yes | Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-only) | Yes | Yes | Supabase > Settings > API |
| `NEXT_PUBLIC_APP_URL` | App base URL | Yes (`http://localhost:3000`) | Yes (`https://lessonpilot.org`) | Manual |
| `OPENAI_API_KEY` | OpenAI API access (lessons, quizzes, TTS, embeddings) | Yes | Yes | OpenAI Dashboard > API Keys |
| `STRIPE_SECRET_KEY` | Stripe API secret | Optional | Yes | Stripe Dashboard > API Keys |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | Optional | Yes | Stripe Dashboard > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Optional | Yes | Stripe > Webhooks > Signing secret |
| `RESEND_API_KEY` | Resend email API key | Optional | Yes | Resend Dashboard > API Keys |

## Safety Notes
- `NEXT_PUBLIC_*` vars are exposed to the browser. Never put secrets in them.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Server-only, never expose to client.
- Use Stripe **test mode** keys locally. Never use live keys in development.
- `OPENAI_API_KEY` is required for all AI features (lessons, quizzes, RAG, TTS).
