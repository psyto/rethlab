# RethLab de-index → consolidate into fabrknt.com/dojo (2026-06-22)

Branch `cc/deindex-consolidate-to-dojo` sets a site-wide `robots: { index: false }` in
`src/app/layout.tsx`.

**Why:** RethLab is the same English Dojo content as `fabrknt.com/dojo` on a different host —
duplicate content competing with Dojo in search (515 pages indexed via the RethLab sitemap). With
JA going native on fabrknt.com soon, RethLab loses its only distinct value (design + JA) and is being
consolidated into Dojo.

**Important:** this de-indexes but **keeps RethLab live + its data intact** — the JA lessons here are
the migration source for Dojo's Japanese lessons (see the i18n RFC). Retire RethLab only after JA
lands on Dojo.

`robots.txt` is intentionally left crawlable so Google re-crawls and honors the `noindex`.
Manual step: remove `https://rethlab.fabrknt.com/sitemap.xml` from Google Search Console.

Full context + review request (Codex): `fabrknt/website` →
`docs/tasks/2026-06-22-i18n-prep-review-request.md` and `docs/2026-06-22-i18n-rfc.md`.
