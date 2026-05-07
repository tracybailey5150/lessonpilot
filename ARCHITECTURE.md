# LessonPilot — Architecture

## Framework
Next.js 16 App Router with React 19. TypeScript strict mode. Tailwind CSS 4 via PostCSS (but inline styles used in JSX).

## Route Structure
```
src/app/
  (app)/       — Dashboard, courses (list/detail/lesson/quiz/progress/resources), new course, settings, shared
  (auth)/      — Login, signup
  api/         — REST endpoints for courses, lessons, quizzes, resources, stripe, tts, users, progress, parse-document
  auth/        — Supabase auth callback
  page.tsx     — Landing page
```

## Auth Model
- Supabase Auth (email/password).
- No server middleware — auth guard in `(app)/layout.tsx` (client-side).
- `supabase.auth.getSession()` checks session, redirects to `/login` if unauthenticated.
- Auth callback at `/auth/callback` for email confirmation flow.

## Database
- **Supabase PostgreSQL** (project: `hhqqwnqplvpddrxduvif`)
- Key tables: courses, lessons, quizzes, quiz_results, resources, progress, users/profiles, subscriptions.
- Embeddings stored for RAG (vector similarity search via `text-embedding-3-small`).

## Supabase Clients
| Client | Location | Use |
|--------|----------|-----|
| Browser (proxy) | `src/lib/supabase.ts` → `supabase` | Client components |
| Service role | `src/lib/supabase.ts` → `createServiceClient()` | API routes (server-only) |

## Payments
- Stripe SDK (`stripe` package + `@stripe/stripe-js`).
- Checkout at `/api/stripe/checkout`, portal at `/api/stripe/portal`, webhook at `/api/stripe/webhook`.

## AI
- OpenAI SDK (`openai` package).
- Lesson generation: `/api/lessons/generate`
- Quiz generation: `/api/quizzes/generate`
- RAG Q&A: `/api/lessons/qa` (embedding search + GPT completion)
- Study guide: `/api/courses/study-guide`
- Weakness guide: `/api/courses/weakness-guide`
- TTS: `/api/tts/generate`
- Resource research: `/api/resources/ai-research`
- Embeddings: `text-embedding-3-small` via `src/lib/openai.ts`

## Email
- Resend SDK (`resend` package) in `src/lib/email.ts`.
- Notifications: new signup, new subscription, contact form, new lead.
- Sends from `noreply@hookvault.app` (shared domain).

## Document Parsing
- `pdf-parse` for PDF document upload and text extraction at `/api/parse-document`.

## Third-Party Services
| Service | Purpose |
|---------|---------|
| Supabase | DB, Auth |
| OpenAI | AI generation, embeddings, TTS |
| Stripe | Payments |
| Resend | Transactional email |
| Vercel | Hosting, CDN, serverless |

## Deployment
Vercel auto-deploy on push to `main`. Serverless functions for API routes.

## Known Tech Debt
- Auth guard is client-side only (no server middleware). Consider adding proxy/middleware.
- No test suite.
- Supabase migrations directory exists but coverage unclear.
- Email sends from hookvault.app domain — should be lessonpilot.org.
