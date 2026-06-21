# Review: RethLab de-index → consolidate into fabrknt.com/dojo

**Request:** `fabrknt/website/docs/tasks/2026-06-22-i18n-prep-review-request.md`  
**Reviewer:** Codex  
**Date:** 2026-06-22  
**Verdict:** APPROVED

## Findings

Severity: 🔴 blocker · 🟠 should-fix · 🟡 nit

No blocking findings on `cc/deindex-consolidate-to-dojo`.

## Notes

- `src/app/layout.tsx` sets site-wide `robots.index = false` / `follow = false`, including `googleBot`, which is a clear and correct de-index posture for a retiring duplicate-content host.
- `src/app/robots.ts` still allows crawl and keeps the sitemap exposed, which is appropriate for re-crawl discovery while `noindex` propagates.
- I verified the branch compiles with a safe `next build` invocation under a compatible Node runtime. I did **not** use `npm run build` for review because that script currently includes `prisma db push --accept-data-loss`, which is too risky for a read-mostly review run.

## Residual risks

- GSC cleanup is still manual: removing the submitted `rethlab.fabrknt.com/sitemap.xml` remains important so search tooling catches up with the new noindex posture.
- The repo still contains a broken parity script (`scripts/_sync-check.mjs`) due schema drift; that does not block this de-index branch, but it should be fixed before JA migration work begins.

## Follow-up suggestions

- After merge, keep RethLab live but do not add fresh indexable surface to it.
- Repair `_sync-check.mjs` before using RethLab as the JA migration source for Fabrknt Dojo.
