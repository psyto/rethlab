# Deployment

This is the runbook for shipping RethLab to Vercel + Neon. Most steps require browser actions in your accounts; the local commands at the end push the schema and seed data into production.

The first deploy uses the default `rethlab.vercel.app` URL. Custom-domain setup (`fabrknt.com/rethlab`) is the last step — skip it if you want to ship faster and add the domain later.

---

## 1. Create the database (Neon)

1. Sign in at <https://neon.tech> (GitHub login is fine).
2. Create project — choose any region close to your audience.
3. From the project dashboard, copy the **pooled** `DATABASE_URL` (the one ending in `?sslmode=require` — Neon's UI labels it "Pooled connection").
4. Keep the URL handy. You'll paste it into Vercel and use it locally for the one-time seed.

Free tier covers RethLab's needs (3 GB storage, scales to zero when idle).

---

## 2. Create the OAuth apps

### GitHub OAuth (for sign-in)

1. <https://github.com/settings/developers> → "New OAuth App"
2. **Application name**: RethLab
3. **Homepage URL**: `https://rethlab.vercel.app` (replace later if using fabrknt.com)
4. **Authorization callback URL**: `https://rethlab.vercel.app/rethlab/api/auth/callback/github`
5. Save → copy **Client ID** and generate a **Client secret**.

### Google OAuth (optional — only if you want Google sign-in)

1. <https://console.cloud.google.com/apis/credentials> → Create OAuth client ID
2. Type: Web application
3. Authorized redirect URI: `https://rethlab.vercel.app/rethlab/api/auth/callback/google`
4. Copy **Client ID** and **Client secret**.

If you skip Google, leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` empty in Vercel — sign-in will still work via GitHub.

---

## 3. Stripe (test mode for now)

1. <https://dashboard.stripe.com> → Developers → API keys
2. Copy the **Test mode** secret key (`sk_test_...`).
3. Skip live mode until you've verified the donation flow end-to-end.

---

## 4. Generate `AUTH_SECRET`

```bash
openssl rand -base64 32
```

Save the output — you'll paste it into Vercel.

---

## 5. Push the schema to Neon (one-time)

Locally, point Prisma at the Neon URL just for this command:

```bash
DATABASE_URL="<paste-neon-url-here>" npx prisma db push
DATABASE_URL="<paste-neon-url-here>" npx prisma db seed
```

This creates all tables and loads the 8 courses / 16 modules / 74 lessons into Neon.

You only need to repeat this when the Prisma schema changes (re-run `db push`) or when you want to refresh course content (re-run `db seed`).

---

## 6. Deploy to Vercel

1. Sign in at <https://vercel.com> (GitHub login is fine).
2. **Add New → Project** → import `psyto/rethlab`.
3. Vercel auto-detects Next.js. Don't override Build Command or Output Directory.
4. **Environment Variables** — paste these in (all "Production" + "Preview"):

   | Key | Value |
   | :-- | :-- |
   | `DATABASE_URL` | Neon pooled URL from step 1 |
   | `AUTH_SECRET` | output from step 4 |
   | `AUTH_URL` | `https://rethlab.vercel.app` |
   | `AUTH_TRUST_HOST` | `true` |
   | `GITHUB_ID` | from step 2 |
   | `GITHUB_SECRET` | from step 2 |
   | `GOOGLE_CLIENT_ID` | from step 2 (optional) |
   | `GOOGLE_CLIENT_SECRET` | from step 2 (optional) |
   | `STRIPE_SECRET_KEY` | `sk_test_...` from step 3 |
   | `NEXT_PUBLIC_SITE_URL` | `https://rethlab.vercel.app` (origin only — no `/rethlab` suffix; the basePath is appended automatically) |
   | `NEXT_PUBLIC_GITHUB_SPONSORS_URL` | `https://github.com/sponsors/psyto` |
   | `ENABLE_DEV_AUTH` | `false` |
   | `NEXT_PUBLIC_ENABLE_DEV_AUTH` | `false` |

5. Hit **Deploy**.

First deploy takes ~2 minutes. After it completes, open `https://rethlab.vercel.app/rethlab/`.

---

## 7. Custom domain (`fabrknt.com`)

When you're ready:

1. Vercel → Project → Settings → Domains → Add `fabrknt.com`.
2. Vercel shows the required DNS record. At your domain registrar:
   - For apex (`fabrknt.com`): create an `A` record to `76.76.21.21`.
   - For `www`: create a `CNAME` to `cname.vercel-dns.com`.
3. Wait for DNS propagation (usually < 30 min).
4. **Update environment variables** in Vercel (origin only — no `/rethlab` suffix):
   - `AUTH_URL` → `https://fabrknt.com`
   - `NEXT_PUBLIC_SITE_URL` → `https://fabrknt.com`
5. **Update OAuth callbacks**:
   - GitHub: change Authorization callback URL to `https://fabrknt.com/rethlab/api/auth/callback/github`
   - Google (if used): change redirect URI similarly.
6. Redeploy (Vercel → Deployments → ... → Redeploy).

The site is now live at `https://fabrknt.com/rethlab`.

---

## 8. Enable Vercel Analytics + Speed Insights

The code already wires up `@vercel/analytics`. Turn it on in the dashboard:

1. Vercel → Project → **Analytics** tab → click "Enable Web Analytics" (free for hobby projects).
2. Same project → **Speed Insights** tab → click "Enable Speed Insights" (also free).
3. Re-deploy (or wait for the next push to `main`); Vercel injects the tracking automatically.

After ~24 hours, the Analytics tab shows page views, top paths, referrers, locales, devices. Speed Insights shows Core Web Vitals per route.

---

## 9. Verify SEO

After deploy, run the basics:

1. **Open Graph preview**:
   - Twitter / X: <https://cards-dev.twitter.com/validator>
   - Facebook: <https://developers.facebook.com/tools/debug/>
   - Paste `https://fabrknt.com/rethlab/` and confirm the OG card shows the ADD-opcode visual.

2. **Search engine indexing**:
   - <https://search.google.com/search-console> — verify domain ownership (DNS TXT record), submit `https://fabrknt.com/rethlab/sitemap.xml`.
   - <https://www.bing.com/webmasters> (optional) — same flow.

3. **Lighthouse**:
   - Chrome DevTools → Lighthouse tab → run on the production URL.
   - SEO and Best Practices should both score 90+.
   - Performance may dip on lesson pages because of Mermaid; that's acceptable since they're lazy-loaded.

4. **Canonical + hreflang sanity-check**:
   ```bash
   curl -s https://fabrknt.com/rethlab/courses/reth-beginner-en | grep -oE 'rel="canonical"[^/]+|hrefLang="[a-z]+" href="[^"]+"'
   ```
   Should show the canonical URL with `/rethlab/courses/reth-beginner-en` and two `<link rel="alternate">` entries (en, ja).

---

## 10. Going live with Stripe

When you've verified the donation flow with `sk_test_...` end-to-end (place a test card transaction, confirm `/donate/thanks` renders):

1. Stripe Dashboard → switch to **Live mode**.
2. Copy the live `sk_live_...` secret key.
3. Vercel → Settings → Environment Variables → update `STRIPE_SECRET_KEY` to the live key.
4. Redeploy.

Test by making a small real donation; refund yourself in the Stripe dashboard if you want.

---

## Updating the deployed site

- **Code changes**: push to `main` → Vercel auto-deploys.
- **Schema changes**: edit `prisma/schema.prisma`, then locally run `DATABASE_URL=<neon-url> npx prisma db push` before merging the change. (Or use `prisma migrate` if you want migration history.)
- **Course content changes**: edit `prisma/seed-reth-*-{en,ja}.ts`, then either:
  - **Full re-seed** (drops user data): `DATABASE_URL=<neon-url> npx prisma db seed`
  - **Add-only**: `curl -X POST "https://fabrknt.com/rethlab/api/admin/seed?key=$AUTH_SECRET&mode=add"` — preserves existing courses and user enrollments, only adds new courses.

---

## Costs

- **Vercel Hobby**: free until you hit ~100 GB/month bandwidth or build limits
- **Neon Free**: free up to 3 GB
- **Stripe**: 2.9% + 30¢ per donation (no monthly fee)

Total at low traffic: **$0/month**. Scales as needed without ops work on your side.
