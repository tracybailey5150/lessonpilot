# LessonPilot — Backup & Recovery

## Supabase Database
- **Auto backups:** Supabase provides daily automated backups (Pro plan: point-in-time recovery).
- **Manual export:** Supabase Dashboard > Database > Backups, or `pg_dump` via connection string.
- **Recovery:** Restore from Supabase dashboard or import SQL dump.

## Stripe Data
- Stripe retains all payment/subscription data independently.
- Recovery: re-sync from Stripe Dashboard.
- Never delete Stripe customers or subscriptions without explicit human approval.

## Vercel (App)
- **Rollback:** Vercel Dashboard > Deployments > Promote previous deployment.
- Every push creates an immutable deployment. No data is lost on rollback.
- Env vars persist across deployments (managed in Vercel dashboard).

## GitHub (Code)
- All code is in `tracybailey5150/lessonpilot-app`.
- Use `git revert` for safe rollback. Avoid `git reset --hard` on shared branches.
- Branch protection on `main` prevents accidental force pushes.

## What Agents Cannot Delete
- Supabase tables or storage buckets
- Stripe products, prices, or customers
- Vercel production deployments
- DNS records
- The `main` branch

## Manual Recovery Steps
1. **App down:** Check Vercel status page, then Vercel logs, then rollback deployment.
2. **DB issue:** Check Supabase dashboard, restore from backup if needed.
3. **Auth broken:** Verify Supabase Auth config, check callback URLs, check app layout auth guard.
4. **Billing broken:** Check Stripe webhook logs, verify webhook secret.
5. **AI broken:** Check OpenAI API status, verify API key and billing, check rate limits.
6. **Email broken:** Check Resend dashboard for bounces/failures, verify API key.
