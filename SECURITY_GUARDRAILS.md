# LessonPilot — Security Guardrails

## Core Principles
- No unrestricted production access for agents.
- Read-only access where possible. Write ops require justification.
- Staging/preview first, production second.
- All API keys must be scoped to minimum required permissions.

## Human Approval Required

| Action | Risk | Why |
|--------|------|-----|
| Production deploy | High | Could break live app |
| DB migration (schema change) | High | Irreversible data impact |
| Table or column deletion | Critical | Data loss |
| Stripe config changes | High | Billing impact |
| DNS/domain changes | High | Downtime risk |
| Auth flow changes | High | Lockout risk |
| Bulk email sends | High | Reputation/spam risk |
| Data exports | Medium | Privacy/compliance |
| Bulk data deletion | Critical | Data loss |
| Service role key usage | High | Full DB access bypass |

## Agent Rules
1. Never store secrets in code, commits, logs, or chat.
2. Never use `SUPABASE_SERVICE_ROLE_KEY` except in API route handlers.
3. Never disable RLS policies.
4. Never expose internal API keys in client-side code.
5. Never run `DROP TABLE`, `TRUNCATE`, or `DELETE FROM` without `WHERE` on production.
6. Always validate user input before passing to OpenAI (prompt injection risk).
7. Always verify Stripe webhook signatures before processing.
8. Never expose OpenAI API key to the browser.

## Branch Protection
- `main` is protected. All changes via PR.
- No force pushes to `main`.
- Build must pass before merge.

## Audit Trail
- All changes must be committed with descriptive messages.
- DB schema changes must be documented in PR description.
- Stripe changes must be logged in `CHANGELOG_INTERNAL.md`.
- Env var additions must be documented in `ENVIRONMENT.md`.
