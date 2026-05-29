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

## Row-Level Security (RLS)

**Status:** All tables secured. 10 total RLS policies. All `{authenticated}`. Zero `{public}` or `{anon}`.

**Scoping:** Every table is user-scoped through the `courses → users → supabase_auth_id = auth.uid()` chain.

**Tables (all owner-scoped):**
| Table | RLS Enabled | Policy Role |
|-------|-------------|-------------|
| courses | Yes | authenticated |
| lessons | Yes | authenticated |
| quizzes | Yes | authenticated |
| progress | Yes | authenticated |
| review_queue | Yes | authenticated |
| source_documents | Yes | authenticated |
| document_chunks | Yes | authenticated |
| course_resources | Yes | authenticated |
| curriculum_units | Yes | authenticated |
| users | Yes | authenticated |

**`shared_courses`:** RLS enabled (was previously disabled). No data policies needed — access controlled at application layer.

**Assessment:** Best-secured project in the ecosystem — was already properly scoped before hardening. No policy changes were needed during the 2026-05-28 audit.

## Audit Trail
- All changes must be committed with descriptive messages.
- DB schema changes must be documented in PR description.
- Stripe changes must be logged in `CHANGELOG_INTERNAL.md`.
- Env var additions must be documented in `ENVIRONMENT.md`.
