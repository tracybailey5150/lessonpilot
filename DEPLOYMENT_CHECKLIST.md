# LessonPilot — Deployment Checklist

## Pre-Deploy

- [ ] `npm install` — no errors
- [ ] `npm run build` — passes clean
- [ ] `npm run lint` — no errors
- [ ] No secrets in committed files (check `.env*` in `.gitignore`)
- [ ] New env vars added to Vercel dashboard (see `ENVIRONMENT.md`)
- [ ] New env vars added to `.env.example`
- [ ] Supabase migrations reviewed and tested locally
- [ ] Stripe mode confirmed (test vs live)
- [ ] Auth callback URLs verified in Supabase dashboard
- [ ] Vercel project linked (`vercel link`)
- [ ] Deploying to correct branch (`main` = production)

## Deploy

- [ ] Push to `main` (auto-deploys) OR run `vercel --prod`
- [ ] Verify deployment URL loads in browser

## Post-Deploy Smoke Test

- [ ] Homepage loads (https://lessonpilot.org)
- [ ] Login flow works
- [ ] Dashboard renders with data
- [ ] Create a new course from topic
- [ ] Generate a lesson via AI
- [ ] Generate a quiz and submit answers
- [ ] Test RAG Q&A on a lesson
- [ ] Test TTS audio generation
- [ ] Verify Stripe checkout flow
- [ ] Check Vercel function logs for errors

## Rollback Plan

1. Vercel Dashboard > Deployments
2. Find previous working deployment
3. Promote to Production
4. If DB migration was applied, coordinate manual rollback with Tracy

## If Something Breaks

1. Check Vercel function logs first
2. Check Supabase logs (API + Auth)
3. Check browser console for client errors
4. Verify env vars are set in Vercel
5. If critical: rollback immediately, investigate after
