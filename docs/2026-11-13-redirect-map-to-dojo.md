# RethLab → fabrknt.com/dojo 対応表(案、2026-11-13)

2026-06-22 の [de-index](2026-06-22-deindex-note.md) の続き。あの時の条件「JA が Dojo に載ってから RethLab を畳む」は満たした(下の確認で JA の全ページが 200)。残りは rethlab.fabrknt.com の全 URL を 301 で Dojo に送ること。

## 今の状態(11-13 に実測)

- rethlab は全ページ `noindex, nofollow`(06-22 から)。canonical は自分自身のまま。検索からの流入はほぼなく、約 200 人/月は検索以外から来ている。
- live の sitemap は 515 URL(レッスン 468)。
- seed の slug を突き合わせた結果、rethlab で公開中のコース・レッスンは**全て Dojo に同じ slug で存在する**。rethlab にしかないのは未公開の 7 コース(latency-lighter / lean-ethereum-state / *-ja の非公開分など)だけで、sitemap に載っていない。
- 515 URL のうちコース・レッスン 511 本を下の規則で変換し、fabrknt.com で叩いた結果 **511 本すべて 200**。

## 対応の規則

| rethlab.fabrknt.com | fabrknt.com | 本数 |
| --- | --- | --- |
| `/courses/<c>-ja/lessons/<l>-ja` | `/ja/dojo/courses/<c>-en/lessons/<l>-en` | JA レッスン |
| `/courses/<c>-ja` | `/ja/dojo/courses/<c>-en` | JA コース |
| `/courses/<c>-en/lessons/<l>-en` | `/dojo/courses/<c>-en/lessons/<l>-en` | EN レッスン |
| `/courses/<c>-en` | `/dojo/courses/<c>-en` | EN コース |
| `/courses` | `/dojo/courses` | 1 |
| `/` | `/dojo` | 1 |

Dojo は EN の slug が公開の鍵で、JA は `/ja` の下に同じ `-en` の slug で出る。fabrknt.com の `apps/web/next.config.mjs` に同じ変換の規則がもうある(rethlab 形のパスが fabrknt.com に来た時用)。

## 個別に決めるもの

| rethlab | 案 | 理由 |
| --- | --- | --- |
| `/about` | `/dojo` | fabrknt.com/about は 404。Dojo のトップが一番近い |
| `/donate`, `/donate/thanks`, `/donate/cancel` | **要判断**: `/dojo` か、fabrknt.com に支援ページを作る | fabrknt.com/donate は 404。寄付を続けるかで決まる |
| `/auth/signin`, `/profile`, `/settings` | `/dojo` | Dojo にログインはない。登録者は 0 人(founder 確認 11-13)なので DB は捨ててよい |
| 未公開コースの URL | 転送はするが Dojo 側で 404 | 下の 7 コースはボツ(founder 決定 11-13)。一度も公開していないので 404 でよい |
| 既存の移動済み slug(next.config.js の retiredTo* / movedToRevm 等) | 既存の規則 → 上の規則の 2 段 | 本数が少ないので 2 回の転送で可。1 回にしたいなら行き先を直接 fabrknt.com に書き換える |

## rethlab にしかない中身(ボツ、Dojo へは移さない)

seed(`prisma/seed-*.ts`)と Dojo(`fabrknt/website/apps/web/lib/dojo-lessons/*.ts`)を slug で突き合わせた結果。どれも rethlab でも未公開。11-13 に founder がボツと決めた。

| コース | rethlab | Dojo | 状態 |
| --- | --- | --- | --- |
| reth-latency-lighter(Lighter を題材にした遅延の設計) | EN・JA 各 8 レッスン | なし | rethlab で seed への接続が未コミット(作業中) |
| reth-lean-ethereum-state(Lean Ethereum と状態の層) | EN 6 レッスン | なし | 同上 |
| reth-validator-ops-bootcamp | EN・JA | EN のみ(非公開) | JA が rethlab だけ |
| reth-consensus-economics | EN・JA | EN のみ(非公開) | JA が rethlab だけ |
| reth-multinode-testnet | EN・JA | EN のみ(非公開) | JA が rethlab だけ |
| reth-performance-capacity | EN・JA | EN のみ(非公開) | JA が rethlab だけ |
| reth-security-governance | EN・JA | EN のみ(非公開) | JA が rethlab だけ |

ほかに Dojo へ移さないもの:

- 両方にあるレッスンは **Dojo の方が新しい**(10-27〜11-06 の fact-check で直してある。rethlab の seed は 05-31 が最後)。rethlab の本文は古い版なので移さない。
- `examples/foundry-capstone`・`examples/validator-ops` は Dojo のレッスンが `github.com/psyto/rethlab` として 6 か所リンクしている。**サイトを畳んでもリポは残す**(アーカイブにする場合もリンクは生きる)。
- リポ直下の `rethlab-ja-vol1〜3`(pdf/epub)はサイトから配っていない。扱いは別に決める。

Dojo への移し方は既存の `scripts/extract-lessons.mjs` / `extract-lessons-ja.mjs`(rethlab の seed → `lib/dojo-lessons/*.ts`)。非公開のまま入れるなら `lib/private-dojo-courses.json` に slug を足す。

## 入れ方

`next.config.js` の `redirects()` の末尾に 4 本足した(既存の slug 移動の規則を先に当てるため)。JA レッスン・JA コース・`/courses/*` の 3 本と、それ以外の全パスを `https://fabrknt.com/dojo` へ送る 1 本。`/donate` もこの 1 本で `/dojo` へ行く。`robots.txt` だけは転送から外して、Google がクロールして 301 を読めるようにしてある。

## 手元での検証(11-13、`next dev` で転送を辿った)

sitemap の 515 URL と、`/profile`・`/settings`・`/donate/thanks`・既存の slug 移動 2 本・ボツのコース 1 本の計 522 本で確かめた。

- 519 本が 1 回の 301 で fabrknt.com の 200 に着く。
- 既存の slug 移動の 2 本(`staged-sync-en` と `advanced-welcome-ja`)は 2 回の 301 で 200 に着く。
- ボツのコース(`reth-latency-lighter-en`)は Dojo で 404。
- `robots.txt` は転送せず、200 のまま返る。

## 入れた後に確かめること

- 515 URL を rethlab 側から叩き、全て 1〜2 回の 301 で fabrknt.com の 200 に着く。
- `seo index` で旧 URL の扱いを、`seo compare` で切り替え日の前後の fabrknt.com/dojo のクリックを見る。
- 約 200 人/月の参照元(検索以外)を分析ツールで確かめ、リンク元が自分で直せる所(自分の README・他サイトのリンク)なら直接 Dojo に書き換える。
