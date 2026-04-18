# Deployment runbook

One-time setup to get this repo pushing to GitHub and deploying to Cloudflare
Pages under `siriusganesh.com`.

## 1. Create the GitHub repo

Pick a name — `siriusganesh.com` or `portfolio` both work. Create it **empty**
(no README, no .gitignore, no license) at <https://github.com/new>.

Copy the SSH or HTTPS URL it gives you.

## 2. Push the local repo

From inside this directory (`site/`):

```bash
# From the site/ folder in your workspace
git init -b main
git add .
git commit -m "Initial commit: Astro portfolio rebuild"
git remote add origin <URL-from-step-1>
git push -u origin main
```

## 3. Connect Cloudflare Pages

1. Go to <https://dash.cloudflare.com/> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorize GitHub if you haven't already
3. Pick the repo you just pushed
4. Project settings:
   - **Production branch**: `main`
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Under **Environment variables**, add:
   - `NODE_VERSION` = `20`
6. Click **Save and Deploy**

First build takes 1–2 minutes. You'll get a URL like
`siriusganesh-portfolio.pages.dev` when it's done.

## 4. Attach the custom domain

In the Pages project → **Custom domains** → **Set up a custom domain**:

1. Enter `siriusganesh.com`
2. Cloudflare detects the domain is in the same account and offers to wire DNS
   automatically — confirm
3. Repeat for `www.siriusganesh.com` (Cloudflare will 308-redirect it to apex
   by default)

TLS cert provisions automatically. Usually live within a minute.

## 5. Cut over from Vercel

The old site is on Vercel. Once the Cloudflare Pages deployment is serving at
`siriusganesh.com`:

- Log into Vercel, find the old portfolio project, and either delete it or
  disconnect the custom domain. The Vercel `*.vercel.app` URL will still work
  but nothing will route traffic there.

## 6. Sanity check

- `https://siriusganesh.com/` loads the new site
- `https://siriusganesh.com/Resume_SG.pdf` returns the PDF
- View source → check `<title>` and `<meta description>` are the new ones
- Open in phone browser, test the nav, resume link, and contact links

## Ongoing: how to push a change

### Small change (typo, new stat, updated resume)

```bash
# edit a file, e.g. src/data/content.ts or public/Resume_SG.pdf
git add -A
git commit -m "Update resume to April 2026 version"
git push
```

Cloudflare Pages builds and deploys automatically. Takes ~90 seconds.

### Bigger change (new section, design tweak)

```bash
git checkout -b redesign-projects
# edit freely
git push -u origin redesign-projects
```

Cloudflare comments on the GitHub PR with a preview URL like
`redesign-projects.siriusganesh-portfolio.pages.dev`. Review it. When happy,
merge the PR → production deploys automatically.

### Rollback

In the Pages dashboard → **Deployments** → pick any previous deployment →
**Rollback to this deployment**. Takes seconds.

## Reference

- Cloudflare Pages docs: <https://developers.cloudflare.com/pages/>
- Astro deployment docs: <https://docs.astro.build/en/guides/deploy/cloudflare/>
