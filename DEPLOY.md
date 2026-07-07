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

Keep the repo name **`wedding-website`** — the OG tags and calendar links are baked to
`https://thegroobe.github.io/wedding-website/`. (Renaming the repo means updating those URLs.)

## 2. Turn on Pages

Repo → **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
The next push (or Actions → "Deploy to GitHub Pages" → Run workflow) publishes the site.

Live URL: **https://thegroobe.github.io/wedding-website/**

> **Private-repo caveat:** GitHub Pages from a *private* repo needs a paid plan
> (GitHub Pro). On the free plan, either make the repo **public** (there are no secrets
> in it — the RSVP `/exec` URL is a public endpoint by design; the only exposure is your
> and Megana's contact details in the page source) or upgrade to Pro. If Pages won't
> publish, this is almost always why.

## 3. (Later) Custom domain via Cloudflare

You own a domain on Cloudflare. To use it instead of the github.io URL:
1. Repo → Settings → Pages → Custom domain → enter the domain → Save (this commits a `CNAME` file).
2. In Cloudflare DNS: add a `CNAME` for `www` → `thegroobe.github.io`, and for the apex
   use Cloudflare's flattened `A`/`AAAA` records pointing at GitHub Pages' IPs
   (185.199.108–111.153 / the IPv6 set). Set the records to **DNS-only** (grey cloud) first
   to let GitHub issue the TLS cert, then you can proxy if desired.
3. Update the two absolute URLs to the custom domain: `og:url` + `og:image` in
   `site/index.html`, and the two `DESCRIPTION` links in `site/wedding.ics`.

## Notes

- **`site/_headers` is inert on GitHub Pages** — it's a Cloudflare/Netlify feature. Pages
  serves `.ics` as `text/calendar` on its own, and the `download` attribute on the link
  handles the save-as behavior, so the calendar still works. Font/image cache headers just
  fall back to Pages' defaults. The file is kept in case hosting moves to Cloudflare later.
- **`site/.nojekyll`** tells Pages to serve files as-is (no Jekyll processing) — matters if
  you ever switch from Actions-based to branch-based publishing.
