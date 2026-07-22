# Deploying to GitHub Pages (account: TheGroobe)

Hosting is GitHub Pages for now. The site lives in `site/`; a GitHub Action
(`.github/workflows/deploy-pages.yml`) publishes that folder on every push to `main`.

> **Account separation:** this repo must live on your personal **TheGroobe** GitHub —
> NOT the Stax/work account. The `gh` CLI on this machine is currently logged into the
> work account, so create + push the repo with your own credentials (or `gh auth login`
> as TheGroobe first). Nothing here is wired to any account until you run the steps below.

## 1. Create the repo under TheGroobe and push

From `projects/wedding-website/`:

```bash
# Option A — with gh, after logging in as TheGroobe (gh auth login):
gh repo create TheGroobe/wedding-website --private --source=. --remote=origin --push

# Option B — plain git, if you made the empty repo on github.com first:
git remote add origin https://github.com/TheGroobe/wedding-website.git
git push -u origin main
```

The OG tags and calendar links are baked to the custom domain
`https://alexmarriesmegana.com/` (set 2026-07-22; before that they pointed at the
github.io URL).

## 2. Turn on Pages

Repo → **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
The next push (or Actions → "Deploy to GitHub Pages" → Run workflow) publishes the site.

Live URL: **https://alexmarriesmegana.com/** (the old
`thegroobe.github.io/wedding-website` URL 301-redirects there)

> **Private-repo caveat:** GitHub Pages from a *private* repo needs a paid plan
> (GitHub Pro). On the free plan, either make the repo **public** (there are no secrets
> in it — the RSVP `/exec` URL is a public endpoint by design; the only exposure is your
> and Megana's contact details in the page source) or upgrade to Pro. If Pages won't
> publish, this is almost always why.

## 3. Custom domain (done 2026-07-22, via Namecheap)

- **Main domain: `alexmarriesmegana.com`** — set as the Pages custom domain
  (Settings → Pages → Custom domain; with a workflow deploy this lives in repo
  settings, no `CNAME` file needed). Namecheap Advanced DNS carries four `A`
  records on `@` → GitHub Pages IPs (185.199.108/109/110/111.153) and a
  `CNAME` `www` → `thegroobe.github.io`. GitHub auto-issues the TLS cert;
  "Enforce HTTPS" goes on after the cert lands.
- **Redirect domain: `meganasmassivemistake.com`** — Namecheap URL Redirect
  records (301 Permanent) on `@` and `www` → `https://alexmarriesmegana.com`.
  Namecheap's forwarder is HTTP-only on the source domain, fine for a gag domain.
- The absolute URLs (`og:url` + `og:image` in `site/index.html`, UIDs +
  `DESCRIPTION` links in `site/wedding.ics`) are baked to the main domain.

## Notes

- **`site/_headers` is inert on GitHub Pages** — it's a Cloudflare/Netlify feature. Pages
  serves `.ics` as `text/calendar` on its own, and the `download` attribute on the link
  handles the save-as behavior, so the calendar still works. Font/image cache headers just
  fall back to Pages' defaults. The file is kept in case hosting moves to Cloudflare later.
- **`site/.nojekyll`** tells Pages to serve files as-is (no Jekyll processing) — matters if
  you ever switch from Actions-based to branch-based publishing.
