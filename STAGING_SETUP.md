# Staging Environment Setup

## What's Ready

The code infrastructure for staging is in place:

1. **StagingBanner** — Shows "STAGING — Not Live" orange banner at the top of every page when `NEXT_PUBLIC_IS_STAGING=true`
2. **Preview Staging button** — Appears on the admin dashboard when `NEXT_PUBLIC_STAGING_URL` is set, opens staging in a new tab
3. The production site shows neither of these (env vars are unset)

## Steps to Activate

### 1. Create a Staging Branch

```bash
git checkout -b staging
git push origin staging
```

### 2. Set Up Vercel Staging Deployment

In the Vercel dashboard:
- Go to Settings → Git
- Add a preview deployment for the `staging` branch
- Or create a second Vercel project pointed at the same repo with a branch filter for `staging`

### 3. Configure Environment Variables

**On the staging Vercel project:**
```
NEXT_PUBLIC_IS_STAGING=true
```
This enables the orange "STAGING — Not Live" banner.

**On the production Vercel project:**
```
NEXT_PUBLIC_STAGING_URL=https://staging-matwhizzer.vercel.app
```
(Replace with your actual staging URL)

This makes the "Preview Staging" button appear on the admin dashboard.

### 4. Database Options

**Option A — Shared database (simplest):**
Both staging and production point to the same Supabase project. Changes are immediately visible on both. Good for previewing UI changes.

**Option B — Separate staging database:**
Create a second Supabase project for staging. Copy the schema. Use different `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on the staging deployment. Good for testing data changes before pushing to production.

### 5. Workflow

1. Make changes on the `staging` branch
2. Push to trigger staging deployment
3. Click "Preview Staging" on admin dashboard to review
4. When approved, merge `staging` into `main` and push
5. Production auto-deploys from `main`
