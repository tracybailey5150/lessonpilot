# LessonPilot — Internal Changelog

## Format
Each entry follows this structure:
- **Date:** YYYY-MM-DD
- **Agent/Tool:** Who or what made the change
- **Summary:** What changed
- **Files Changed:** List of affected files
- **Risk Level:** Low / Medium / High / Critical
- **Migration Impact:** None / Schema change / Data migration
- **Deployment Status:** Not deployed / Preview / Production
- **Follow-up Needed:** None / Description of follow-up

---

## 2026-05-28 — RLS Security Audit
- Enabled RLS on `shared_courses` table (was disabled)
- Verified all 10 policies are properly user-scoped via courses → users → auth.uid() chain
- No policy changes needed — already fully secured
- 10 total policies. 0 public, 0 anon, 10 authenticated. All user-scoped.

---

## 2026-04-27 — Claude Agent
**Summary:** Initial operational documentation added.
**Files Changed:** AGENTS.md, PROJECT_CONTEXT.md, ARCHITECTURE.md, RUNBOOK.md, SECURITY_GUARDRAILS.md, MCP_TOOLS.md, DEPLOYMENT_CHECKLIST.md, ENVIRONMENT.md, BACKUP_AND_RECOVERY.md, CHANGELOG_INTERNAL.md, .env.example
**Risk Level:** Low
**Migration Impact:** None
**Deployment Status:** Not deployed
**Follow-up Needed:** None
