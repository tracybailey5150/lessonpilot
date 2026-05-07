# LessonPilot — MCP Tools & Service Access

## Current Tools

| Tool | Purpose | Access Level | Allowed | Forbidden | Approval |
|------|---------|-------------|---------|-----------|----------|
| **GitHub** | Code, PRs, issues | Read/Write | Clone, branch, PR, review | Force push main, delete repo | Auto for branches, human for main merge |
| **Supabase** | DB, Auth | Read + scoped write | Query, insert, update, RLS check | DROP/TRUNCATE, disable RLS | Human for schema changes |
| **Vercel** | Deploy, env, logs | Read + deploy | Preview deploy, read logs, check status | Production deploy, env deletion | Human for production |
| **Stripe** | Billing | Read-only | View subscriptions, check webhooks | Create/modify products, change prices | Human for all writes |
| **Resend** | Email | Send (scoped) | Send transactional emails | Bulk sends, template deletion | Human for bulk |
| **OpenAI** | AI generation | API calls | Generate lessons, quizzes, embeddings, TTS | Change model config without approval | Human for model changes |

## Environment Scoping

| Tool | Local Dev | Preview | Production |
|------|-----------|---------|------------|
| GitHub | Full access | Full access | PR-only |
| Supabase | Dev project OK | Dev project | Prod read-only for agents |
| Vercel | Dev server | Auto-deploy | Human approval |
| Stripe | Test mode only | Test mode | Human approval |
| Resend | Optional | Test domain | Production domain |
| OpenAI | Dev key OK | Dev key | Production key |

## Future MCP Categories
- **Monitoring:** Sentry, LogDrain — error tracking, alerting.
- **Storage:** Supabase Storage — course asset uploads.
- **Analytics:** PostHog — usage tracking, course completion rates.
