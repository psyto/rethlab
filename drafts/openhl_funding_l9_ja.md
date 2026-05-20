# Building OpenHL Funding — L9 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L9 — `openhl-funding-interval-invariant-ja`

- **Module:** 3 (Clock state machine), sortOrder 1
- **Course-level sortOrder:** 9 (lesson 10 of 12)
- **Duration:** 30 min
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# レッスン 9 — Interval-gating 不変条件 — 3 つの deeper test

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-funding
```

…が 21 テストを通る（L4-L8 から 18 + 新規 3）。**新プロダクションコードなし。** 3 つの新テストが複数 operation にわたる clock セマンティクスのカバレッジを深める：

- **`premium_drives_settlement_signs`** — full 数学 composition が clock を流れる。mark > index → 正 premium → settlement の符号が一致。
- **`second_tick_requires_another_full_interval`** — Interval-gating が tick 間で persistent。成功 tick が clock を永久 unlock しない。
- **`capped_rate_when_premium_extreme`** — `compute_rate` の cap 挙動が `tick()` 経由で正しく surface。Layer が semantics を失わず compose。

教育の焦点は**複数 operation にわたる不変条件**、1 度だけではない。L8 のテストが guard が*1 度*動くことを verify。L9 のテストが*tick 間*で動くこと、layered composition が微妙なバグを導入しないことを verify。

## おさらい

L8 後：
- `FundingClock` が存在、`tick()` が `Option<FundingTick>` を返す。
- 3 サニティテストが確認：guard 動作、境界 fire、空 positions でも advance。
- 3 Module 2 関数すべてが `tick()` 経由で compose。

L8 のテストは clock を*最多 1 度*走らせる。L9 が clock を複数呼び出しで、非自明な入力で exercise、**不変条件が単一 operation を超えて成立する**ことを validate。

## プラン

1 ファイル編集：

1. **`crates/funding/src/clock.rs` に 3 テストを append** — 既存の `#[cfg(test)] mod tests` ブロック内、L8 の 3 サニティテストの後。

プロダクションコードなし、`lib.rs` 変更なし、L8 が既に追加した以上の import なし。

> 🛑 **考えてみよう。** スクロール前に — L8 の `first_tick_at_exact_interval_fires` テストは `tick(1_003_600, ...)` を 1 度発火し `Some` を返したと assert。なぜそれだけでは interval-gating 不変条件を verify するのに不十分？

（答え：**1 度の成功 tick は guard が `Some` を*返しうる*と言う。Guard が後で*再 engage* するとは言わない。** バグのある実装は最初の interval boundary で fire してから二度と gate しないかも — `1_003_600` 以降の全 `tick()` が時間に関わらず `Some` を返す。「interval ごとに最多 1 settlement」不変条件は、別の full interval が経過するまで second tick が拒否されることをテストする必要。**単一 operation テストが挙動を verify、複数 operation テストが state machine を verify。**）

## 手順

### Step 1: `premium_drives_settlement_signs` を追加

`mod tests` の L8 テストの後に：

```rust
    #[test]
    fn premium_drives_settlement_signs() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // mark 101, index 100 → premium = 0.01 = 10_000_000 ppb
        // rate = 10_000_000 / 8 = 1_250_000 ppb
        // long size 100 * mark 101 * rate / RATE_SCALE = 100*101*1.25e6 / 1e9
        // = 1.2625e10 / 1e9 = 12 (floor)
        // long pays → -12; short receives → +12.
        let out = clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &balanced_book())
            .expect("tick should fire");

        assert_eq!(out.premium, Premium(10_000_000));
        assert_eq!(out.rate, FundingRate(1_250_000));
        assert_eq!(out.settlements.len(), 2);
        assert_eq!(out.settlements[0].delta, Notional(-12));
        assert_eq!(out.settlements[1].delta, Notional(12));
    }
```

これが clock の**完全な数学 composition テスト**。すべての Module 2 関数が順番に exercise される：

1. `compute_premium(MarkPrice(101), IndexPrice(100))` → `Premium(10_000_000)`（1% premium）。
2. `compute_rate(Premium(10_000_000), hyperliquid_default)` → `FundingRate(1_250_000)`（divisor 8 後 0.125%）。
3. `apply_funding(&[Pos(1, 100), Pos(2, -100)], MarkPrice(101), FundingRate(1_250_000))` → `[Settlement(-12), Settlement(+12)]`。

**5 行のブロックコメントが紙の数学。** このテストをデバッグする誰でも手で算術 verify できる：`100 × 101 × 1_250_000 = 12_625_000_000`。`RATE_SCALE = 1_000_000_000` で割る（整数 rounding zero 方向）と `12`。`apply_funding` の符号 flip で long が `-12`、short が `+12`。**コメントが documentation、テストが spec。**

**各ステップが個別にテスト済みなのにこのテストが存在する理由は？** Composition が独自の関心だから。`tick()` が間違った順で間違った関数を呼びうる — 例：`compute_rate` の前に `apply_funding`、`mark` を期待しているところに `index` を渡す。**Composition テストが unit テストの見逃す配線エラーを捕まえる。**

> 🛑 **やりがちな勘違い。** 「このテストは `apply_funding` のテストを duplicate する。Per-account アサーションを落として `out.rate` だけチェックすべき？」 **No。** このテストの要点は*composition*。`apply_funding` のテストが pass するが `premium_drives_settlement_signs` が fail するなら、バグは `tick()` が呼び出しを配線する方法 — `apply_funding` の中ではない。**各 layer に独自の composition テストが必要。** 3 layer 深いなら最低 3 composition テスト。

### Step 2: `second_tick_requires_another_full_interval` を追加

`premium_drives_settlement_signs` の後に：

```rust
    #[test]
    fn second_tick_requires_another_full_interval() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // First tick at +3600.
        clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &balanced_book())
            .expect("first tick fires");

        // +3599 from first tick → not enough.
        let early = clock.tick(1_007_199, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(early.is_none());

        // +3600 from first tick → fires.
        let on_time = clock.tick(1_007_200, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(on_time.is_some());
    }
```

**3 tick call、3 アサーション。** 構造が story を語る：

1. **`1_003_600` の最初の tick** — fire（L8 の境界ケース）。この後 `last_settled_at = 1_003_600`。
2. **`1_007_199` の 2 つ目の tick** — `1_007_199 - 1_003_600 = 3599`。Interval の 1 秒不足。`None` を返す。
3. **`1_007_200` の 3 つ目の tick** — `1_007_200 - 1_003_600 = 3600`。ちょうど interval。`Some` を返す。

**テストする不変条件**：「Interval guard が成功 tick ごとに再 engage する」。`genesis_time` に対してだけチェックする（`last_settled_at` でなく）素朴な実装は `1_003_600` 以降の全 tick で fire する — このテストがそれを捕まえる。

**最小 counterexample**：L8 の `first_tick_at_exact_interval_fires` と L9 の `second_tick_requires_another_full_interval` の間で verify されている唯一のことは、`last_settled_at` が*gating reference* であり、`genesis_time` ではないこと。**3 call が state-machine 持続性をテストする最小。**

> 🛑 **考えてみよう。** 上の 3 tick それぞれの後の `clock.last_settled_at()` は？

（答え：
- Tick 1（成功）後：`1_003_600`。
- Tick 2（None — gated）後：変化なし、まだ `1_003_600`。
- Tick 3（成功）後：`1_007_200`。

**Clock が gated call で advance しない。** これが interval-gating 不変条件の 2 つ目の部分：失敗で state は変わらない。テストは tick 2 後の `last_settled_at` を明示的に assert しないが、tick 3 がちょうど `1_003_600 + 3600` で成功することが含意する。）

### Step 3: `capped_rate_when_premium_extreme` を追加

`second_tick_requires_another_full_interval` の後に：

```rust
    #[test]
    fn capped_rate_when_premium_extreme() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        // mark 200, index 100 → premium = 1.0 = 1e9 ppb
        // raw rate = 1e9 / 8 = 1.25e8; cap = 4e7 → clamps to 4e7.
        let out = clock
            .tick(1_003_600, MarkPrice(200), IndexPrice(100), &balanced_book())
            .unwrap();
        assert_eq!(out.rate, FundingRate(40_000_000));
    }
```

**`compute_rate` の cap が `tick()` 経由で呼ばれたとき正しく clamp することをテスト。** 数学：

1. `compute_premium(MarkPrice(200), IndexPrice(100))` → `Premium(1_000_000_000)`（100% premium）。
2. `compute_rate(Premium(1_000_000_000), {divisor=8, cap=40M})` → raw = `1_000_000_000 / 8 = 125_000_000`。`±40_000_000` に clamp → `FundingRate(40_000_000)`。

**`compute_rate` のテストが既に clamping をカバーするのに、なぜこのテストが存在する？** `tick()` が rate を適用前に unwrap・fiddle・bypass しないことを知る必要があるから。**Cap が clock を変化なく surface する。**

微妙な配線バグ — 例：`compute_rate(premium, FundingParams { rate_cap: FundingRate(0), ..params })` — はこのテストを破る（cap ゼロ → rate ゼロ → settlement なし）。**Composition テストが unit テストにできないことを捕まえる。**

### Step 4: テストを実行

```bash
cargo test -p openhl-funding
```

期待：

```
running 21 tests
test clock::tests::capped_rate_when_premium_extreme ... ok
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test clock::tests::premium_drives_settlement_signs ... ok
test clock::tests::second_tick_requires_another_full_interval ... ok
... (L4-L7 compute.rs から 15 テスト)

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**21 テスト全 green。** うち 6 つが今 `clock::tests` に住む（L8 から 3 + L9 から 3）。

よくあるエラー：

- **`premium_drives_settlement_signs` が `Notional(-13)` か `Notional(-11)` で fail** — rounding の off-by-one。数学を再確認：`100 × 101 × 1_250_000 = 12_625_000_000`。`1_000_000_000` で割ると `12.625`。整数除算がゼロに向けて truncate → `12`。符号 flip → `-12`。違う数字なら `*`（debug overflow で panic）、`saturating_mul`、`wrapping_mul` のどれを使っているか確認。
- **`second_tick_requires_another_full_interval` が second tick で fail** — guard が `last_settled_at` でなく `genesis_time` と比較している。L8 のコードを再読：guard は `now < self.last_settled_at.saturating_add(...)`、*`now < self.params.genesis_time + ...` ではない*。
- **`capped_rate_when_premium_extreme` が `FundingRate(125_000_000)` を返す** — `compute_rate` が clamp していない。L6 を再確認：`raw.clamp(-cap, cap)` 行があるはず。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **Composition テストが配線エラーを捕まえる。** 各ステップが unit-test されていても、ステップ間の配線は別の関心。**3 ステップ pipeline は最低 3 composition テスト（各ステップの正しい配置に 1 つ）+ multi-step composition テスト 1 つが必要。** `premium_drives_settlement_signs` が後者。

2. **State machine は multi-call テストが必要。** 単一 operation が偶然に不変条件を満たすことがある、複数 operation だけが state machine が一貫に強制するかを確認。**`first_tick_at_exact_interval_fires` だけでは不十分なので `second_tick_requires_another_full_interval` が存在。**

3. **各 gate で境界テスト。** Inclusive 境界（`now == last_settled_at + interval`）と exclusive 境界（`now == last_settled_at + interval - 1`）両方をテスト必要。**1 秒不足と 1 秒経過後が標準ペア。**

4. **各 layer の不変条件にそれぞれ surface テスト。** `compute_rate` テストが cap clamp を証明。`tick` テストが cap が composition で*生存*することを証明。**Composition が semantics を失いうる、不変条件が trav する各 layer で verify。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
```

L9 後：
- **clock.rs** が Stage 8b の 7 テスト中 6 つまで一致。`no_catchup_after_long_gap` のみ残る — それが L10 のマイルストーンテスト。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: `second_tick_requires_another_full_interval` がなぜ `+3601` もテストしない？**
`+3600` ちょうど*と* `+3599` 一緒で境界両側を pin するから。`+3601` は `+3600` より少し多いだけ — 同じ方向。**境界 2 ケース（直前と ちょうど）で十分。** 追加ケースは別のバグクラスを捕まえない。

**Q: 「genesis vs last_settled_at」バグを proptest で捕まえられた？**
できる — `t2 < t1 + interval` のランダム `(t1, t2)` ペアが second tick で `None` を生むべき。だが手書きトレーステストが意図を明確にする：「`t1` の tick の後、`t1 + 3599` の次の tick が gated」。Proptest は property に excel、手書きトレーステストは名前付き scenario に excel。**State-machine 挙動は通常 scenario。**

**Q: テストになぜ 3 つ目の tick を、例えば +7200（first から 2 interval）に含めない？**
情報を加えないから。`+3600` の 2 つ目の tick が既に clock が正しい cadence で fire することを確立、3 つ目は同じことの繰り返し。**テストは verify するもので distinguish すべき**、繰り返しを足すのでなく。

**Q: テスト author が `genesis_time = 0`（`1_000_000` でなく）にしていたら？**
数学は同一、だがテストは less helpful。`1_000_000`（と対応する `1_003_600` 等）を使うと「clock が 3600 秒 advance」パターンが全アサーションで見える。**テストデータは readable であるべき、正しいだけでなく。**

## 次のレッスン（L10）

L10 で Module 3 を **no-catch-up 不変条件**で閉じる：マイルストーンテスト `no_catchup_after_long_gap`。シナリオ：validator が 10 時間のダウンタイム後 reboot、`now - last_settled_at = 36000`（10 interval）。素朴な期待は「10 tick を replay して catch up」かも、だが設計選択は **1 度 settle して `now` に advance**。レッスンが catch-up がなぜ tick スキップより悪いかを説明、テストが設計選択が enforced されることを確認。**1 テスト、1 不変条件、設計哲学が action で。**
````

---

## Seed-file slot

L9 は Module 3 の sortOrder 1 に入る：

```typescript
{
  title: 'レッスン 9 — Interval-gating 不変条件 — 3 つの deeper test',
  slug: 'openhl-funding-interval-invariant-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 9 — Interval-gating 不変条件 — 3 つの deeper test\n\n...`
},
```

## SHA pinning discipline

L9 は `cd94137`（Stage 8b）を引用。L9 後、clock.rs が Stage 8b の 7 テスト中 6 つまで一致。残る 1 テスト（`no_catchup_after_long_gap`）が L10 のマイルストーン。

## Style review notes (self-critique before paste)

- **§ゴールが L9 を「新プロダクションコードなし」とフレーミング** — 読者がテストパターンに集中。
- **§考えてみよう（L8 単一 tick テストでは不十分）**が multi-call testing principle を正当化。
- **§Step 1 がテストブロックコメントで紙の数学を説明** — 読者が手で verify できる。
- **§やりがちな勘違い（`apply_funding` のテストを duplicate）**が test-redundancy 反射を composition-tests 論で先回り。
- **§Step 2 がテストを 3 番号付き tick call で narrate** — 読者が時間構造を見る。
- **§考えてみよう（各 tick 後の `last_settled_at`）**が「失敗で state 変化なし」副不変条件を正当化。
- **§Step 3 が数学と配線関心を説明** — 読者が composition テストが unit テストの見逃すものを捕まえる理由を見る。
- **§設計の振り返り 1-4** が distinct パターンを名指す（composition-tests-catch-wiring、multi-call-for-state-machines、boundary-at-every-gate、invariants-at-every-layer）。
- **§よくある質問**が境界対称性、proptest 適用可能性、繰り返し価値、テストデータ可読性を扱う。
- **L10 プレビュー**が具体的：1 マイルストーンテスト、no-catch-up 設計哲学。
