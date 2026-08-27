# Toolshed â€” deployment & performance pass

Task 10 of the Neurofive Solutions Full Stack Web Development internship:
*Full-stack deployment & performance pass.*

The task 09 application, made deployable and then made fast. Everything below is
committed configuration, not instructions to follow by hand.

```
10-deployment/
â”œâ”€â”€ .github/workflows/ci.yml   API tests â†’ client tests + bundle budget
â”œâ”€â”€ render.yaml                one-click blueprint: API + disk, static client
â”œâ”€â”€ docker-compose.yml         the whole stack locally
â”œâ”€â”€ nginx.conf
â”œâ”€â”€ server/Dockerfile          multi-stage, non-root, healthchecked
â””â”€â”€ client/
    â”œâ”€â”€ netlify.toml Â· vercel.json
    â”œâ”€â”€ lighthouserc.json      score budgets, asserted in CI
    â””â”€â”€ scripts/check-bundle-size.mjs
```

---

## Architecture

```
        browser
           â”‚  HTTPS
           â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   static assets, 1-year immutable cache
  â”‚  Netlify/Vercel  â”‚   SPA rewrite â†’ index.html
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚  fetch, credentials: include
           â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   Node 22 Â· Express
  â”‚   Render web     â”‚   gzip Â· security headers Â· graceful SIGTERM
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚ SQLite on a disk â”‚   /var/data â€” NOT the ephemeral filesystem
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**The disk is the part people get wrong.** Render, Railway and Fly all reset the
container filesystem on every deploy. A SQLite file in the working directory
means every member account vanishes the next time you push. `render.yaml`
mounts a persistent disk and points `DATABASE_PATH` at it.

## Environment variables

Nothing is hard-coded and nothing has a working default in production.

| Where | Variable | Notes |
|---|---|---|
| API | `NODE_ENV=production` | turns on `secure` cookies and `sameSite: none` |
| API | `DATABASE_PATH` | must be on the mounted disk |
| API | `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` | `generateValue: true` in the blueprint â€” never in git |
| API | `CORS_ORIGIN` | the deployed client origin, exactly |
| Client | `VITE_API_URL` | the deployed API origin |

`tokens.js` throws at first use if a secret still says `replace-me`, so a
misconfigured deploy fails loudly instead of signing tokens with `"undefined"`.

## The performance pass

Five flagged issues, fixed. The brief asked for three.

### 1 Â· Render-blocking font stylesheet â€” the biggest one

A `<link rel="stylesheet">` to `fonts.googleapis.com` blocks first paint until it
round-trips to a third origin. Fixed with `preconnect` to both font hosts *plus*
loading the stylesheet at low priority:

```html
<link rel="stylesheet" href="â€¦&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="â€¦"></noscript>
```

`media="print"` means it never blocks rendering; `onload` flips it on.
`&display=swap` paints text in the fallback face immediately. The `<noscript>`
copy keeps fonts working for the minority without JS.

### 2 Â· One monolithic bundle â€” measured before and after

Vendor code was in the same chunk as app code, so **changing one line
invalidated the whole thing** for every returning visitor.

| | Before | After |
|---|---|---|
| app chunk | â€” | **5.1 KB** |
| react vendor | â€” | 58.9 KB |
| zustand | â€” | 0.7 KB |
| **single bundle** | **64.4 KB** | â€” |

A redeploy now invalidates **5.1 KB instead of 64.4 KB**. React barely changes;
my code changes daily.

A subtlety worth knowing: `manualChunks: { react: ['react', 'react-dom'] }`
looked right and **silently left react-dom in the app chunk** â€” `react-dom/client`
is a subpath export and does not match a bare package-name entry. The first
attempt produced a 3.6 KB "react" chunk, which is the tell. Matching on the
resolved module path fixes it.

### 3 Â· Uncompressed API responses

`compression()` on the API. The catalogue response: **2,272 B â†’ 632 B**, a 72%
reduction, verified with `curl -H 'Accept-Encoding: gzip'`.

### 4 Â· Cache headers that were wrong in both directions

Hashed asset filenames are immutable and should be cached for a year. `index.html`
must **not** be â€” cache it and a deploy serves stale HTML pointing at asset
filenames that no longer exist, producing a blank white page for anyone who
visited before. Both rules are in `netlify.toml`, `vercel.json`, `render.yaml`
and `nginx.conf`.

### 5 Â· Layout shift and missing SEO

- `font-display: swap` plus a system-font fallback stack, so the swap does not
  reflow the page.
- Real `<title>` and `<meta name="description">`, canonical URL, Open Graph and
  Twitter cards, `LocalBusiness` JSON-LD, `robots.txt`, `sitemap.xml`, a web
  manifest and an SVG favicon.
- `alt` text on every image; `lang="en-GB"`; `color-scheme` declared.

## Production hardening on the API

- **gzip** on all responses.
- **Security headers**: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Cross-Origin-Resource-Policy`. `x-powered-by` removed â€” verified absent.
- **Graceful shutdown**: `SIGTERM` finishes in-flight requests, checkpoints the
  SQLite WAL and closes cleanly, with a 10s hard-kill backstop. Without it every
  deploy drops live requests and leaves the WAL un-checkpointed.
- **Healthcheck** at `/api/health`, wired into both the Dockerfile and
  `render.yaml`.
- **Docker**: multi-stage, so the C++ toolchain needed to build `better-sqlite3`
  is not shipped in the runtime image; runs as the non-root `node` user.

## Budgets, enforced in CI

A budget nobody enforces is a wish, so both are asserted:

```
ok    index-BQX3uSQY.js     5.1 KB / 90 KB
ok    react-BTWVIjLd.js    58.9 KB / 90 KB
ok    state-JFM_I6Gv.js     0.7 KB / 90 KB
ok    index-Ca_U8R1r.css    3.4 KB / 12 KB
```

`lighthouserc.json` is run locally with npm run lh, and fails below **90 performance / 95 accessibility /
90 best-practices / 90 SEO**, and on CLS above 0.1. Three runs, median taken.

## Run the whole stack locally

```bash
export ACCESS_TOKEN_SECRET=$(openssl rand -hex 48)
export REFRESH_TOKEN_SECRET=$(openssl rand -hex 48)
cd client && npm ci && npm run build && cd ..
docker compose up --build          # client :8080, API :4000
```

## Deploy

```bash
npm run size          # bundle budget
npm run lh            # Lighthouse locally
```

**Render:** New â†’ Blueprint â†’ point at this repo. Set `CORS_ORIGIN` and
`VITE_API_URL` once both URLs exist; secrets generate themselves.

**Netlify/Vercel:** base directory `client`, build `npm run build`, publish
`dist`, set `VITE_API_URL`.

Both ends must be HTTPS or the `sameSite: none; secure` refresh cookie is
rejected and nobody can stay signed in.

## Verification

| Check | Result |
|---|---|
| 26 API tests after hardening | pass |
| security headers present | nosniff Â· DENY Â· Referrer-Policy |
| `x-powered-by` | absent |
| gzip on `/api/tools` | 2,272 B â†’ **632 B** |
| SIGTERM | logs, checkpoints WAL, exits cleanly |
| bundle budget | 4/4 under budget |
| app chunk vs. before | **64.4 KB â†’ 5.1 KB** |

