# Deployment

This is the runbook for shipping RethLab to Vercel + Neon at `rethlab.fabrknt.com`.

The site has no Next.js basePath — it lives at the root of the deploy URL. The first deploy uses `rethlab.vercel.app`; the custom subdomain `rethlab.fabrknt.com` gets added later via DNS.

---

## 1. Create the database (Neon)

1. Sign in at <https://neon.tech>.
2. Create project `rethlab` — pick a region close to your audience.
3. **Skip "Enable Neon Auth"** — RethLab uses NextAuth + Prisma, not Neon Auth.
4. Copy the **pooled** `DATABASE_URL` from Connection Details.

Free tier covers RethLab's needs (3 GB, scales to zero when idle).

---

## 2. Create the GitHub OAuth App

1. <https://github.com/settings/developers> → "OAuth Apps" tab → "New OAuth App".
2. **Application name**: RethLab
3. **Homepage URL**: `https://rethlab.fabrknt.com` (use `https://rethlab.vercel.app` if you're skipping the custom domain for now).
4. **Authorization callback URL**: `https://rethlab.fabrknt.com/api/auth/callback/github` (or `.vercel.app` equivalent).
5. Save → copy **Client ID** and generate a **Client secret**.

(Google OAuth is optional. Same callback pattern: `https://rethlab.fabrknt.com/api/auth/callback/google`.)

---

## 3. Stripe (test mode)

1. <https://dashboard.stripe.com> → Developers → API keys → copy the **Test mode** secret (`sk_test_...`).
2. Skip live mode until you've verified the donation flow.

---

## 4. Generate `AUTH_SECRET`

```bash
openssl rand -base64 32
```

---

## 5. Deploy to Vercel

If you haven't yet: install the Vercel CLI globally and run `vercel login`.

```bash
vercel link --project rethlab --scope <your-team>
```

Then add environment variables for production. The CLI prompts for each value:

```bash
printf "<neon-database-url>" | vercel env add DATABASE_URL production
printf "<auth-secret-from-step-4>" | vercel env add AUTH_SECRET production
printf "true" | vercel env add AUTH_TRUST_HOST production
printf "https://rethlab.vercel.app" | vercel env add AUTH_URL production
printf "https://rethlab.vercel.app" | vercel env add NEXT_PUBLIC_SITE_URL production
printf "<github-client-id>" | vercel env add GITHUB_ID production
printf "<github-client-secret>" | vercel env add GITHUB_SECRET production
printf "sk_test_..." | vercel env add STRIPE_SECRET_KEY production
printf "https://github.com/sponsors/psyto" | vercel env add NEXT_PUBLIC_GITHUB_SPONSORS_URL production
printf "false" | vercel env add ENABLE_DEV_AUTH production
printf "false" | vercel env add NEXT_PUBLIC_ENABLE_DEV_AUTH production
```

(Use `printf` rather than `echo` to avoid trailing newlines — those break URL fields.)

Trigger the first deploy:

```bash
vercel --prod
```

The build runs `prisma generate && prisma db push --accept-data-loss && next build`, so the schema is created in Neon during the build (your local network doesn't need to reach Neon).

---

## 6. Seed the courses (one-time)

After the first deploy, the database has empty tables. Load the 10 courses / 90 lessons via the admin endpoint:

```bash
curl -X POST "https://rethlab.vercel.app/api/admin/seed?key=$AUTH_SECRET&mode=full"
```

`mode=full` clears any existing course data and re-seeds. Use `mode=add` later when iterating to preserve user enrollments.

---

## 7. Custom domain (`rethlab.fabrknt.com`)

1. **DNS at the `fabrknt.com` registrar**: add a `CNAME` record:
   - Host/Name: `rethlab`
   - Value: `cname.vercel-dns.com`
   - TTL: default
2. **Vercel** → Project → Settings → Domains → Add `rethlab.fabrknt.com`. Vercel verifies DNS automatically (usually <30 min).
3. **Update env vars** to use the custom domain:
   ```bash
   vercel env rm AUTH_URL production --yes
   vercel env rm NEXT_PUBLIC_SITE_URL production --yes
   printf "https://rethlab.fabrknt.com" | vercel env add AUTH_URL production
   printf "https://rethlab.fabrknt.com" | vercel env add NEXT_PUBLIC_SITE_URL production
   ```
4. **Update GitHub OAuth App callback URL** to `https://rethlab.fabrknt.com/api/auth/callback/github`.
5. Redeploy: `vercel --prod`.

---

## 8. Enable Vercel Analytics + Speed Insights

The code already wires up `@vercel/analytics`. Turn it on in the dashboard:

1. Vercel → Project → **Analytics** tab → "Enable Web Analytics" (free for hobby projects).
2. **Speed Insights** tab → "Enable Speed Insights" (also free).
3. Re-deploy or wait for the next push to `main`; Vercel injects the tracking automatically.

Data appears in the Analytics tab after ~24 hours.

---

## 9. Verify SEO

1. **OG preview**: paste `https://rethlab.fabrknt.com/` into <https://cards-dev.twitter.com/validator> — confirm the ADD-opcode card renders.
2. **Search Console**: <https://search.google.com/search-console> → verify domain (DNS TXT record) → submit `https://rethlab.fabrknt.com/sitemap.xml`.
3. **Lighthouse**: Chrome DevTools → Lighthouse → run on the production URL. SEO and Best Practices should both score 90+.
4. **Canonical + hreflang sanity-check**:
   ```bash
   curl -s https://rethlab.fabrknt.com/courses/reth-beginner-en | grep -oE 'rel="canonical"[^/]+|hrefLang="[a-z]+" href="[^"]+"'
   ```
   Should show the canonical URL and two `<link rel="alternate">` entries (en, ja).

---

## 10. Going live with Stripe

When you've verified the donation flow with `sk_test_...` end-to-end (test card transaction → `/donate/thanks` renders):

1. Stripe Dashboard → switch to **Live mode**.
2. Copy `sk_live_...`.
3. Vercel → Settings → Environment Variables → update `STRIPE_SECRET_KEY` to the live key.
4. Redeploy.

---

## Updating the deployed site

- **Code changes**: push to `main` → Vercel auto-deploys.
- **Schema changes**: edit `prisma/schema.prisma` → next deploy runs `prisma db push --accept-data-loss` automatically.
- **Course content changes**: edit `prisma/seed-reth-*-{en,ja}.ts`, then either:
  - **Full re-seed** (drops user data): `curl -X POST "https://rethlab.fabrknt.com/api/admin/seed?key=$AUTH_SECRET&mode=full"`
  - **Add-only**: `mode=add` instead of `mode=full` — preserves existing courses and enrollments.

---

## Costs

- **Vercel Hobby**: free until ~100 GB bandwidth or build limits
- **Neon Free**: free up to 3 GB
- **Stripe**: 2.9% + 30¢ per donation, no monthly fee

Total at low traffic: **$0/month**.
