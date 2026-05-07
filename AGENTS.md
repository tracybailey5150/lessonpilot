# LessonPilot — Agent Instructions

## Project
- **Name:** LessonPilot
- **URL:** https://lessonpilot.org
- **Repo:** tracybailey5150/lessonpilot-app
- **Owner:** Tracy Bailey (tracybailey5150@icloud.com)

## Stack
Next.js 16 (App Router), React 19, Supabase (Auth + DB), OpenAI (GPT + embeddings), Stripe (billing), Resend (email), Recharts, pdf-parse, Tailwind CSS 4. TTS via OpenAI.

## Commands
| Action | Command |
|--------|---------|
| Install | `npm install` |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Start | `npm start` |

## Key Directories
| Path | Purpose |
|------|---------|
| `src/app/(app)/` | Authenticated app pages (dashboard, courses, settings, shared) |
| `src/app/(auth)/` | Auth pages (login, signup) |
| `src/app/api/` | API routes (courses, lessons, quizzes, resources, stripe, tts, users, progress) |
| `src/app/auth/` | Auth callback handler |
| `src/components/` | Shared components (DriveMode, VoiceSelector) |
| `src/lib/supabase.ts` | Supabase client + service client |
| `src/lib/openai.ts` | OpenAI client + embedding helper |
| `src/lib/email.ts` | Resend email notifications |

## Coding Rules
- TypeScript strict. No `any` unless unavoidable.
- Inline styles (not Tailwind utility classes in JSX). Dark theme default.
- Server Components by default. `'use client'` only when needed.
- API routes return `Response.json()`.
- Use `@/` path alias for all imports.
- No console.log in production code.

## UI Rules
- Dark theme: bg `#070C18` / `#0A0F1C`, accent `#38BDF8` (sky blue).
- Inline styles throughout (not Tailwind classes in JSX).
- All components must be responsive (mobile-first with sidebar + bottom nav).

## Database Rules
- All queries go through `src/lib/supabase.ts`.
- Use `supabase` (browser proxy client) for client components.
- Use `createServiceClient()` for API routes (service role key).
- Never expose service role key to client.

## Stripe Rules
- Stripe SDK used (`stripe` package). Webhook at `/api/stripe/webhook`.
- Portal management at `/api/stripe/portal`.
- Never store full card numbers.

## AI Rules
- OpenAI SDK for lesson generation, quiz generation, Q&A (RAG), study guides, TTS.
- Embeddings via `text-embedding-3-small` for RAG search.
- AI research endpoint for resource discovery.

## Deployment Rules
- Push to `main` triggers Vercel auto-deploy.
- All env vars must be set in Vercel dashboard before deploy.
- See `DEPLOYMENT_CHECKLIST.md` before any production push.

## Forbidden Actions
- Never commit `.env.local` or any secret values.
- Never delete Supabase tables or storage buckets without human approval.
- Never modify Stripe webhooks or pricing without human approval.
- Never push directly to `main` without a passing build.
- Never use `dangerouslySetInnerHTML` without sanitization.

## Human Approval Required
Production deploys, DB migrations, table/column deletion, Stripe config changes, DNS changes, auth flow changes, bulk email sends, data exports/deletions.

## Branching
- `main` = production. Always deployable.
- Feature branches: `feat/<name>`, bug fixes: `fix/<name>`.
- PRs required for all changes to `main`.

## Work Summary Format
After completing work, provide: what changed, files modified, migration needed (y/n), env vars added (y/n), risk level (low/med/high), testing notes.
