# Building OpenHL Funding — L10 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L10 — `openhl-funding-no-catchup-ja`

- **Module:** 3 (Clock state machine), sortOrder 2
- **Course-level sortOrder:** 10 (lesson 11 of 12)
- **Duration:** 25 min
- **XP reward:** 50
- **Type:** CONTENT
- **Milestone:** Module 3 完了 — `crates/funding/` 全体が Stage 8b と byte-identical

### Content

````markdown
# レッスン 10 — No-catch-up 不変条件 — 1 テストで設計哲学

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-funding
```

…が 22 テストを通る（L4-L9 から 21 + 新規 1）。新テストは **`no_catchup_after_long_gap`** — validator が複数 interval を見逃したときどうなるかについての openhl の設計選択を pin するマイルストーンテスト。

L10 後：
- `crates/funding/` が **Stage 8b と byte-identical**（`cd94137`）。
- 22 テストすべて pass：20 手書きトレース + 2 proptest。
- Module 3（Clock state machine）が**完了**。
- Funding state machine が standalone crate として**production-shape**。

教育の焦点は**失敗モード下の設計哲学**：clock が遅れたとき、何が正しいセマンティクス？ 素朴な答え（tick を replay して catch up）は間違いで、L10 がその理由を説明する。

## おさらい

L9 後：
- 7 つの clock テスト中 6 つが pass。
- Interval-gating 副不変条件（境界、persistence）両方が verify 済み。
- 数学 composition が `tick()` 経由で正しく surface。

L9 が「normal operation」不変条件をカバー。L10 が「abnormal operation」不変条件をカバー — clock が*遅れた*ときの挙動。

## シナリオ

openhl チェーンが normal に動き、毎時 funding を settle してきたと想像。それから何かが起きる：

- Validator reboot（プロセス再起動 5 分）。
- ネットワーク分割（validator が再接続するまで 8 時間 chain 停止）。
- Leader のハードウェア障害、fallback validator が 30 分後に拾う。

原因が何であれ、次の `tick()` 呼び出しで `now - last_settled_at` が `interval_secs` を大きく超える。**Clock は何をすべき？**

2 つの設計選択：

### Choice A: Catch up

10 interval 分の funding を replay。各 replay は*現在*の mark/index/positions snapshot を使う。10 settlement を続けて適用。

**Pro**：各 interval が settlement を得る、chain が「遅れない」。

**Con**：
- **Stale-snapshot 問題**：全 10 settlement が*同じ*現在 snapshot を使う、各歴史的 interval boundary での snapshot ではない。Gap 中勝っていた trader が今 favorable な rate で計算された 10 settlement を支払う。Gap 中負けていた側が 10x で叩かれ、ポジションを閉じて逃げる機会を一度も持たない。
- **集中リスク**：1 度に 10x funding が、別々の毎時 10 支払いなら survive したアカウントを liquidate しうる。
- **Path dependency**：Funding history が gap が*いつ*起きたかに依存、累積時間だけでなく。

### Choice B: 1 度 settle、`now` に advance

現在 snapshot で*1 度* funding を適用、`last_settled_at` を `now` に advance。10 ミス interval は*スキップ*、replay せず。

**Pro**：
- **集中懲罰なし**：障害あたり最多 1 cap 設定 settlement。
- **Path-independent**：結果が現在 snapshot のみに依存、gap のタイミングに依らない。
- **外部 catch-up 可能**：Catch-up logic が欲しい呼び出し側は中間タイムスタンプでの fresh snapshot 付き繰り返し tick で自前実装できる。

**Con**：
- **失った revenue**：Funding が永久先物価格の equilibration メカニズム、interval スキップが basis への圧力を取り除く。

**openhl は Choice B を選ぶ。** Catch-up logic は、必要な人がいるなら clock の*外*に住む — 正しい歴史時刻での snapshot 付き繰り返し `tick()` 呼び出しで構築する。

> 🛑 **考えてみよう。** スクロール前に — Node reboot で 10 時間の funding を見逃した validator が、*現在*の snapshot から 10 tick を replay して埋め合わせようとする。**このアプローチで最も痛む trader はどれ？** ヒント：gap 中誰が負けていたかを考える。

（答え：**負けていた側が 10x で叩かれる。** 10 時間 gap 中、mark が index に比して高くドリフトしたとしよう — longs が「現実」世界で overpay していた。Choice A が*現在*の rate で 10 settlement を replay、すべて longs から charge。Basis の負け側に既にいた trader は、毎時 funding が適用されていたなら払っていたものの 10x を支払う。Worse、gap 中ポジションを閉じることができなかった（chain は停止していた）、catch-up が agency を持たない時間に対して retroactive に charge する形に見える。**Choice B が言う：見逃した 10 支払いをスキップして今から fresh で始める。Funding revenue に悪い、trader に公平。**）

## プラン

1 ファイル編集：

1. **`crates/funding/src/clock.rs` に `no_catchup_after_long_gap` を append** — 既存の `#[cfg(test)] mod tests` ブロック内、L9 テストの後。

プロダクションコードなし、`lib.rs` 変更なし。

## 手順

### Step 1: マイルストーンテストを追加

`capped_rate_when_premium_extreme` の後に：

```rust
    #[test]
    fn no_catchup_after_long_gap() {
        // If 10 intervals elapse before the next tick, we settle ONCE and
        // advance to `now`. We don't replay 10 settlements with stale state.
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);

        // Immediately ticking again at the same moment does NOT settle.
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
    }
```

**2 つの部分。** 各々が no-catch-up 不変条件の別の副 property を pin。

#### Part 1: 長 gap 後に 1 度 settle

```rust
        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);
```

セットアップ：genesis を `1_000_000`、それから `1_036_000`（= `1_000_000 + 10 × 3600`）で tick。10 full interval が経過。

**2 アサーション：**

1. **`out.is_some()`** — tick が*fire する*。遅れているからとスキップしない。**Choice B は「すべてをスキップ」ではない — 「1 度 settle」。**

2. **`clock.last_settled_at() == way_later`** — そして*決定的に*、clock は `now` に advance、`1_000_000 + 3600`（genesis から 1 interval 後）でも `1_000_000 + 10*3600`（genesis から 10 interval 後 — 数字は同じだが違う理由）でもない。**Clock が見逃した interval を完全に忘れる。**

> 🛑 **やりがちな勘違い。** 「テストは `out.settlements` のエントリが 1 つだけかもチェックすべきでは？」 **Settlement 数は positions に依存、gap には依存しない。** `balanced_book()`（long 100、short -100）で gap 長に関わらず 2 settlement を得る。テストの仕事は *1 tick* が fire することを verify、その tick がいくつの settlement を生むかではない。**Tick 数をテスト、settlement 数は別の関心。**

#### Part 2: 同じ `now` で re-fire しない

```rust
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
```

長 gap tick の後、即座に*同じ* `now` で `tick` をもう一度呼ぶ。**`None` を返す必要。** 遅れた tick の後でも interval-gating 不変条件がまだ成り立つことを証明する — tick を 2 回続けて呼んで double settlement を得ることはできない。

**なぜこのアサーションが重要？** バグのある実装が以下をしうるから：
- 「経過時間 >> interval」を検出して「追いつくまで continuously fire する」と決める（catch-up のバグバージョン）。
- 長 gap tick で `last_settled_at` の更新を忘れる、同じ `now` での subsequent tick が fire し続ける。

**同じ `now` が可能な最も厳しいテスト。** 2 tick の間に時間は経過しない、clock の内部 state だけが変化。`last_settled_at == way_later`（Part 1 から）なら、guard `now < last_settled_at + interval` は `way_later < way_later + 3600` になり、`0 < 3600`、true — `tick` が正しく `None` を返す。

### Step 2: テストを実行

```bash
cargo test -p openhl-funding
```

期待：

```
running 22 tests
test clock::tests::capped_rate_when_premium_extreme ... ok
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test clock::tests::no_catchup_after_long_gap ... ok
test clock::tests::premium_drives_settlement_signs ... ok
test clock::tests::second_tick_requires_another_full_interval ... ok
... (L4-L7 から 15 テスト)

test result: ok. 22 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**22 テスト全 green。** Module 3 が閉じる。`crates/funding/` が Stage 8b と byte-identical。

よくあるエラー：

- **Part 1 が fail：`out.is_none()`** — guard の比較方向が間違い。再確認：`if now < last_settled_at + interval { return None; }`。`now = 1_036_000`、`last_settled_at = 1_000_000` で、`now < 1_003_600` は false、guard が return しない、tick が fire。
- **Part 1 が fail：`last_settled_at() != way_later`** — clock を `now` 以外に advance させた。`tick()` 末尾近くの `self.last_settled_at = now;` 行を再確認。よくある typo：`self.last_settled_at = self.last_settled_at + self.params.interval_secs;`（catch-up 版）または `self.last_settled_at += self.params.interval_secs;`（同様に間違い）。
- **Part 2 が fail：`again.is_some()`** — `last_settled_at` が Part 1 の tick で更新されていない。同じ `now` の Part 2 tick が `genesis + interval` の gate（まだ満たされている）を見つけて誤って fire する。Part 1 の assignment を再確認。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **長 gap で 1 度 settle、`now` に advance。** 代替（interval を replay して catch up）が負け側に集中懲罰を、ポジションを閉じる機会なしに生む。Funding の目的は*equilibration*、retroactive enforcement ではない。**Choice B が数学を公平性と整合、いくらかの funding revenue を犠牲に。**

2. **同じ `now` での second-tick テストが可能な最も厳しい。** 時間が経過しない、state だけが変化。遅れた tick で `last_settled_at` 更新失敗の全実装を捕まえる。**State machine では「同じ input、繰り返し呼び出し」が state-update バグを露わにする。**

3. **Catch-up logic が clock の外に住む。** Catch-up が欲しい呼び出し側は中間歴史タイムスタンプでの snapshot 付き `tick()` を繰り返し呼べる。**Clock が primitive、policy は呼び出し側のもの。**

4. **設計哲学は documentation + テストに住む。** Clock の module doc が不変条件を名指す、このテストがそれを強制、テストコメント + このレッスンが*なぜ*を説明する。**理由付けを 3 箇所で見つけられる：doc、コード、テスト。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
```

L10 後、`crates/funding/` が **Stage 8b と byte-identical**。Diff が空。

**Module 3 閉じる。** Module 4（capstone）が L11。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: Catch-up セマンティクスが欲しい。Configurable にできる？**
Clock 内部からはできない。Wrapper を書く必要がある、歴史中間タイムスタンプでの snapshot 付き `tick()` を繰り返し呼ぶ：

```rust
// 外部 catch-up wrapper の擬似コード：
while clock.last_settled_at() + interval < now {
    let next_target = clock.last_settled_at() + interval;
    let historical_snapshot = fetch_snapshot_at(next_target);  // !!! complex !!!
    clock.tick(next_target, historical_snapshot.mark, ...);
}
clock.tick(now, current_snapshot.mark, ...);
```

難しい部分は `fetch_snapshot_at(historical_timestamp)` — 呼び出し側が過去時点での mark/index/positions の姿を知る必要。**だから catch-up が clock にない：clock が持たない歴史 state を要求する。** Application layer（chain database を持つ）がそれをできる。

**Q: `way_later` が overflow する前に gap はどれだけ長くなりうる？**
`u64::MAX` 秒はおよそ `5.8 × 10^11` 年 — heat death の遥か後。Guard の `saturating_add` が `u64::MAX` 近くの `last_settled_at` を扱うが、実用上その regime に届かない。**Pathological ケースは guard の責任、現実ケースは設計のもの。**

**Q: `way_later` で `mark` と `index` が合理的な値だが、gap の原因が mark/index oracle が利用不可だったら？**
Clock は oracle staleness を知らない。Stale mark で `tick()` を呼べば stale data に基づく funding を得る。**Oracle freshness は呼び出し側の責任。** Production deployment は `tick()` 呼び出し前に oracle-staleness チェックを追加 — oracle が古すぎたら call をスキップ。Skip が clock の上で起きる、clock は入力を信頼するだけ。

**Q: 長 gap tick が起きたとき warning log を追加すべき？**
Logging は side effect。Clock は pure（I/O なし）。Wrapper が気にすれば gap を log できる：`if elapsed > 2*interval { log!("late tick: {} hours behind", elapsed/3600); }`。**Primitive を pure に保つ、wrapper に観測させる。**

## Module 3 マイルストーン — 築いたもの

L10 後：
- **Module 3 完了。** Clock state machine + 7 テスト、interval-gating、no-catch-up、数学 composition、cap surfacing をカバー。
- **Crate 全体が Stage 8b と byte-identical。** types.rs / compute.rs / clock.rs にわたって ~635 LOC。
- **22 テスト**合計：20 手書きトレース + 2 proptest。
- **Rustdoc warning ゼロ。**

Funding state machine が今**完全、テスト済み、production-shape** crate。Funding を deterministic に計算、正しい cadence で gate、gap 後の path-dependent settlement の導入を拒否する。

残るもの：
- **Module 4（Capstone、L11）** — 統合、先送り項目、bridge-integration プレビュー。コードなし。
- **将来コース** — この crate を bridge に配線（oracle 統合、balance 更新、liquidation トリガー）。

## 次のレッスン（L11）

L11 は capstone — 新コードなし。Architecture を sketch、このコースから先送りした項目を名指し（oracle 統合、balance 更新、liquidation、マルチマーケット funding、EVM event としての funding）、それぞれが出荷時にどこに住むかを trace する。Funding state machine をより大きな openhl architecture の一部として見るメンタルモデルを cementing するレッスン。
````

---

## Seed-file slot

L10 は Module 3 の sortOrder 2（モジュールを閉じる）に入る：

```typescript
{
  title: 'レッスン 10 — No-catch-up 不変条件 — 1 テストで設計哲学',
  slug: 'openhl-funding-no-catchup-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 25,
  xpReward: 50,
  content: `# レッスン 10 — No-catch-up 不変条件 — 1 テストで設計哲学\n\n...`
},
```

## SHA pinning discipline

L10 は `cd94137`（Stage 8b）を引用。L10 後、`crates/funding/` が Stage 8b と byte-identical。**Stage 8b 完全再現。** Module 3 閉じる、L11 が capstone synthesis。

## Style review notes (self-critique before paste)

- **§ゴールが L10 を Module 3 マイルストーン**として byte-identical-to-Stage-8b 達成付きでフレーミング。
- **§シナリオ**が失敗モードを具体的に確立（reboot、partition、ハードウェア障害）、設計選択議論の前に。
- **§Choice A / Choice B** が代替を明示的に pros/cons で並べ、設計選択を dogma でなく debatable に。
- **§考えてみよう（誰が最も痛むか）**が公平性論を正当化 — 読者が集中 catch-up で誰が苦しむかを推論。
- **§Step 1 がテストを 2 つの部分に分割**し別の副 property 解析。
- **§やりがちな勘違い（settlement 数）**がテスト scope 反射を先回り。
- **§Step 1 Part 2 が同じ-`now` が最も厳しいテストである理由を説明**。
- **§設計の振り返り 1-4** が distinct パターンを名指す（settle-once-vs-catch-up、same-input-reveals-state、policy-outside-primitive、philosophy-in-three-places）。
- **§よくある質問**が外部 catch-up 実装、overflow、oracle staleness、logging を扱う。
- **§Module 3 マイルストーンまとめ**が byte-identical 達成を celebrate。
- **L11 プレビュー**が具体的：コードなし、synthesis、先送り項目。
