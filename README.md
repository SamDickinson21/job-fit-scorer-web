# Job Fit Scorer (Web)

A small Next.js app: paste a company, role, and job description, get a
stacked-gaps fit verdict, then generate a cover letter draft with one click.
This is the web version of the CLI tool, same framework and profile, built
for faster day-to-day use.

## What it does

1. Paste company, role title, and the job description
2. Click **Evaluate Fit** — get a verdict (apply / apply with caveat / skip),
   the gaps found, bright spots, and what to address if you apply
3. Click **Generate Cover Letter** — drafts a letter using your voice rules
   and the gaps flagged in step 2
4. Every evaluation is saved automatically to a history list in your browser
   (no database, no server-side storage — it lives in your browser's
   localStorage, so it's private to your machine)

## Deploying to Vercel

You'll push this to GitHub, then import it into Vercel. Both are free for
this use case.

**1. Push to GitHub**

```bash
cd job-fit-scorer-web
git init
git add .
git commit -m "Initial commit: job fit scorer web app"
```

Create a new repo on GitHub (github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/job-fit-scorer-web.git
git branch -M main
git push -u origin main
```

**2. Import into Vercel**

- Go to vercel.com, sign in with GitHub
- Click "Add New" → "Project"
- Select the `job-fit-scorer-web` repo
- Before deploying, add an environment variable:
  - Name: `OPENROUTER_API_KEY`
  - Value: your OpenRouter key (get one free at openrouter.ai)
- Click Deploy

Vercel builds and gives you a live URL (something like
`job-fit-scorer-web.vercel.app`) within about a minute. Bookmark it — that's
your daily tool from here on, no terminal required.

**3. Redeploying after changes**

Any time you `git push` to the `main` branch, Vercel automatically rebuilds
and redeploys. No manual steps needed after the first setup.

## Local development (optional)

If you want to run it on your machine first to test:

```bash
npm install
cp .env.local.example .env.local   # then add your real key
npm run dev
```

Open http://localhost:3000.

## Project structure

```
app/
  page.tsx              -- the main UI (form, verdict panel, letter, history)
  api/score/route.ts     -- scores a JD against the profile
  api/letter/route.ts    -- drafts a cover letter from a completed score
  layout.tsx, globals.css
lib/
  profile.ts             -- your candidate profile (edit this to update your info)
  prompts.ts              -- the scoring and letter-writing system prompts
```

## Editing your profile

Open `lib/profile.ts` and edit the fields directly — skills, target roles,
compensation, hard-pass triggers, known gaps. It's the same shape as the
CLI tool's `profile.json`, just as a TypeScript file instead. No pipeline
data or reference names are stored here on purpose — the scoring logic
doesn't need them, and this repo may end up public.

## Notes

- The OpenRouter API key lives only in Vercel's environment variables and
  the API routes that run server-side. It is never sent to the browser.
- History is stored in your browser's localStorage, per-device. Clearing
  your browser data clears it. There's no login and no shared backend.
- Default model is `openrouter/free`, OpenRouter's auto-router for
  currently-available free models. Change `MODEL` in the two route files if
  you want to pin a specific model instead.
