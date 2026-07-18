# LessonPilot — AI Learning Platform

## Project
- **Domain:** lessonpilot.org
- **Repo:** tracybailey5150/lessonpilot-app
- **Supabase project:** hhqqwnqplvpddrxduvif
- **Vercel project:** prj_wOSLntbAjuYQWyHzm467Q8GjeE1I
- **Stack:** Next.js 16, TypeScript, inline styles, Supabase, OpenAI GPT-4.1, OpenAI TTS HD, Stripe, Cloudflare Turnstile

## What This Is
AI-powered course creation and learning platform. Users provide source material, AI builds full curriculum with lessons, quizzes, visual aids, and audio narration. Supports self-paced and multi-day bootcamp formats. Public catalog with marketplace pricing. Structured JSON import.

## Pricing
- Free: $0 — 3 courses, 10 lessons each
- Pro: $19/mo — unlimited courses, full AI, analytics
- Team: $99/mo — Pro + 10 seats, SSO
- Custom Course Build: $99-$1,500

## Active Courses (4 published)
- CTS Certification Master Study Guide — 24 lessons, 3-day bootcamp, $29
- PMP Certification Bootcamp — 12 lessons, 3-day bootcamp, $29
- AI Business Mastery — 24 lessons, 10-day, $24
- Hive Media Control — 21 lessons, 5-day, $19

## Key Features
- Public course catalog (/catalog) with category filters
- Cert exam detection (PMP, CompTIA, AWS, CISSP, CTS, etc.)
- Structured course import (/courses/import) — drag-drop JSON
- Multi-day bootcamp courses (1-14 days, 2-6 sections/day)
- Turnstile captcha on signup, autoconfirm enabled
- Course management from CC dashboard (tracybailey5150.com/courses)

## Auth
- Autoconfirm ON (no email verification)
- All demo bypasses removed
- RLS policies allow published course visibility to any auth user

## Owner Preferences
- Autonomous execution — don't ask, just do it
- Deploy without asking — push when ready
- Build better than competition
- No extras — no co-author tags or unsolicited additions
