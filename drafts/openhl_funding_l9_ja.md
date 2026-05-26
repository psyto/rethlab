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

このレッスンで掴む概念:

- **単一呼び出しテストは挙動を、複数呼び出しテストは state machine を検証する** — L8 で確認したのは guard が一度だけ `Some` を返せることだ。L9 の `second_tick_requires_another_full_interval` で確認するのは、guard が fire した*後にも再び engage する*ことだ。1 度 fire したきり以降は gate しなくなる buggy 実装を捕まえるには、3 連続の呼び出しが要る。
- **Composition テストが接続ミスを捕まえる** — 各ステップが unit test 済みでも、ステップ間の接続は別の関心事だ。`tick()` が `apply_funding` を `compute_rate` より先に呼ぶかもしれないし、`mark` を期待している場所に `index` を渡すかもしれない。`premium_drives_settlement_signs` のような full composition test が、unit test では捕まえられないバグを拾い上げる。
- **不変条件は通過する各レイヤーで再検証する** — `compute_rate` の cap は L6 で unit test 済みだが、`capped_rate_when_premium_extreme` で `tick()` 経由でも再検証する。呼び出しの途中で `params.rate_cap` を上書きするような接続バグは、下層のテストをすり抜けてしまう。
- **境界テストはペアで：just-before と exactly-at** — `now == last_settled_at + interval - 1`（None）と `now == last_settled_at + interval`（fire）が標準のペアだ。両方向から guard 条件の off-by-one を捕まえる。`+1` を追加しても、別のクラスのバグが捕まるわけではない。
- **失敗は state を変えない** — `tick()` が `None` を返したとき `last_settled_at` は不変のままだ。3 連続呼び出し（fire / gated / fire）の 3 回目の成功時刻から、この副不変条件が読み取れる。

検証：

```bash
cargo test -p openhl-funding
```

上記の実行結果が 21 テストを通る（L4-L8 で書いた 18 + 新規 3）。

具体的な変更:

**新しいプロダクションコードはない。** 新規テスト 3 つで、複数 operation にわたる clock の semantics カバレッジを深掘りする：

- **`premium_drives_settlement_signs`** — 数学の full composition が clock を流れる。mark > index → 正の premium → settlement の符号が一致する。
- **`second_tick_requires_another_full_interval`** — Interval-gating が tick 間でも持続する。成功した tick が、clock を永久に unlock してしまうわけではない。
- **`capped_rate_when_premium_extreme`** — `compute_rate` の cap 挙動が `tick()` 経由でも正しく surface する。レイヤーを重ねても semantics が失われない。

教育上の焦点は、**1 度きりではなく複数 operation にわたって成り立つ不変条件**だ。L8 のテストでは guard が*1 度*機能することを検証した。L9 のテストでは、それが*tick 間*でも機能すること、そしてレイヤーを重ねた composition が微妙なバグを持ち込まないことを検証する。

## おさらい

L8 後の状態：
- `FundingClock` が存在し、`tick()` は `Option<FundingTick>` を返す。
- サニティテスト 3 つで、guard の動作、境界での fire、空の positions でも advance すること、を確認済み。
- Module 2 の関数 3 つすべてが `tick()` 経由で compose されている。

L8 のテストはどれも clock を*高々 1 回*しか走らせない。L9 では clock を複数回呼び出し、非自明な入力で exercise しながら、**不変条件が単一 operation を超えて成立する**ことを検証する。

## プラン

ファイル編集は 1 つ：

1. **`crates/funding/src/clock.rs` にテストを 3 つ追加**する — 既存の `#[cfg(test)] mod tests` ブロック内、L8 のサニティテスト 3 つの後ろに置く。

プロダクションコードの変更はなし、`lib.rs` の変更もなし、L8 で既に追加した以上の import も要らない。

> 🛑 **考えてみよう。** スクロール前に — L8 の `first_tick_at_exact_interval_fires` テストでは、`tick(1_003_600, ...)` を 1 度呼んで `Some` が返ることを assert している。**それだけでは、なぜ interval-gating 不変条件の検証として不十分なのか？**

（答え：**1 度の成功 tick が示すのは、guard が `Some` を*返しうる*ということだけだ。その guard が後で*再び engage* するかどうかは何も示さない。** バグのある実装では、最初の interval 境界で fire してから二度と gate しなくなるかもしれない — `1_003_600` 以降のすべての `tick()` が、時間に関係なく `Some` を返してしまう、というケースだ。「interval ごとに最多 1 settlement」の不変条件を検証するには、別の full interval が経過するまで second tick が拒否されることを確認する必要がある。**単一 operation のテストは挙動を、複数 operation のテストは state machine を検証する。**）

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

これが clock の**完全な数学 composition テスト**だ。Module 2 の関数がすべて順番に exercise される：

1. `compute_premium(MarkPrice(101), IndexPrice(100))` → `Premium(10_000_000)`（1% premium）。
2. `compute_rate(Premium(10_000_000), hyperliquid_default)` → `FundingRate(1_250_000)`（divisor 8 のあと 0.125%）。
3. `apply_funding(&[Pos(1, 100), Pos(2, -100)], MarkPrice(101), FundingRate(1_250_000))` → `[Settlement(-12), Settlement(+12)]`。

**5 行のブロックコメントは、そのまま紙の上の数学だ。** このテストをデバッグする人は誰でも、手で算術を検証できる：`100 × 101 × 1_250_000 = 12_625_000_000`。これを `RATE_SCALE = 1_000_000_000` で割る（整数除算なのでゼロ方向に丸まる）と `12`。`apply_funding` の符号反転で、long は `-12`、short は `+12` になる。**コメントが documentation、テストが spec として働く。**

**各ステップが既に個別にテストされているのに、なぜこのテストが必要なのか？** Composition 自体が独立した関心事だからだ。`tick()` が間違った順序で間違った関数を呼ぶ可能性がある — 例えば `compute_rate` の前に `apply_funding` を呼んでしまったり、`mark` を期待している箇所に `index` を渡してしまったり、といったことが起こりうる。**Composition テストは、unit テストでは見逃される接続ミスを捕まえてくれる。**

> 🛑 **やりがちな勘違い。** 「このテストは `apply_funding` のテストと重複している。アカウントごとのアサーションは落として、`out.rate` だけ確認すべきでは？」 **だめだ。** このテストの要点は*composition*にある。`apply_funding` のテストは pass するのに `premium_drives_settlement_signs` だけ fail するなら、バグは `tick()` が呼び出しを組み立てるやり方にあって、`apply_funding` の中にはない。**レイヤーごとに独自の composition テストが必要だ。** 3 レイヤー深ければ、最低 3 つの composition テストが必要になる。

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

**tick 呼び出し 3 回、アサーション 3 つ。** 構造そのものが story を語っている：

1. **`1_003_600` での最初の tick** — fire する（L8 の境界ケース）。これ以降 `last_settled_at = 1_003_600`。
2. **`1_007_199` での 2 つ目の tick** — `1_007_199 - 1_003_600 = 3599`、interval に 1 秒足りない。`None` を返す。
3. **`1_007_200` での 3 つ目の tick** — `1_007_200 - 1_003_600 = 3600`、ちょうど interval。`Some` を返す。

**ここで検証している不変条件**：「Interval guard は、成功した tick ごとに再 engage する」。`last_settled_at` ではなく `genesis_time` に対してだけチェックするような素朴な実装だと、`1_003_600` 以降のすべての tick で fire してしまう — このテストでそれを捕まえる。

**最小の counterexample**：L8 の `first_tick_at_exact_interval_fires` と L9 の `second_tick_requires_another_full_interval` を組み合わせて初めて、「gating の基準は `last_settled_at` であって `genesis_time` ではない」ことが検証される。**state machine の持続性を確かめるには、3 回の呼び出しが最小構成だ。**

> 🛑 **考えてみよう。** 上の各 tick の後で `clock.last_settled_at()` はそれぞれどうなるか。

（答え：
- Tick 1（成功）後：`1_003_600`。
- Tick 2（None — gated）後：変化なし、まだ `1_003_600`。
- Tick 3（成功）後：`1_007_200`。

**Clock は gated な呼び出しでは advance しない。** これが interval-gating 不変条件のもう 1 つの側面で、失敗時には state を変化させない。テスト自体は tick 2 後の `last_settled_at` を明示的には assert していないが、tick 3 がちょうど `1_003_600 + 3600` で成功することがそれを暗黙に保証している。）

3 連続呼び出しを時間軸で並べると、何が動いて何が動かないか (= ゲートの再エンゲージ) が一望できる:

```
タイムライン (秒)
1_000_000 ── Genesis (FundingClock::new、last_settled_at = 1_000_000)
    │
    │   +3,600 秒 (= 1 interval ちょうど)
    ▼
1_003_600 ── Tick 1: 成功 ✨
              now ≥ last_settled_at + interval を満たす → fire
              Some(FundingTick { settled_at: 1_003_600, ... }) を返す
              ──► last_settled_at = 1_003_600 にリセット
    │
    │   +3,599 秒 (まだ 1 秒足りない)
    ▼
1_007_199 ── Tick 2: 拒否 🛑
              now < last_settled_at + interval (1_007_200) → guard で None
              ──► last_settled_at = 1_003_600 のまま (state は汚さない)
    │
    │   さらに +1 秒 (ちょうど 1 interval 達成)
    ▼
1_007_200 ── Tick 3: 成功 ✨
              now ≥ last_settled_at + interval を再び満たす → fire
              ──► last_settled_at = 1_007_200 にリセット
```

このタイムラインの timestamp はすべて Unix 時間の**秒単位**として読む。したがって `+3600` は 1 時間、`+3599` は「1 秒不足」を意味する（ミリ秒系の `+3_600_000` ではない）。

このテストの load-bearing なポイントは **Tick 1 の成功が clock を恒久的に unlock してしまわないこと** — つまり Tick 3 を fire させるには、Tick 1 を起点に新たに 1 interval を待つ必要がある、という再エンゲージの不変条件だ。3 つ並べないとこの「ゲートが閉じ直す」挙動は観測できない。

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

**`tick()` 経由で呼ばれたときも、`compute_rate` の cap が正しく clamp として効くことを検証する。** 数学：

1. `compute_premium(MarkPrice(200), IndexPrice(100))` → `Premium(1_000_000_000)`（100% premium）。
2. `compute_rate(Premium(1_000_000_000), {divisor=8, cap=40M})` → raw = `1_000_000_000 / 8 = 125_000_000`。`±40_000_000` に clamp → `FundingRate(40_000_000)`。

**`compute_rate` のテストが既に clamping をカバーしているのに、なぜこのテストが必要なのか？** `tick()` 側で rate を unwrap したり、いじったり、bypass したりしないことを確認する必要があるからだ。**Cap が clock を経由しても変化せずに surface することを示す。**

このテストが本当に守っているのは、L4〜L6 で組んだ「型安全なリレー」が `tick()` の中でも一切値を歪めずに繋がっている、という不変条件だ。データの通り道を図で書くと:

```
[MarkPrice(200), IndexPrice(100)] ──► compute_premium ──► Premium(1_000_000_000)
                                                                │
                                                                ▼
            FundingParams { divisor: 8, cap: 4e7 } ──► compute_rate ──► FundingRate(40_000_000)
                                                                              │
                                                                  ※ ここが lossless に
                                                                    通り抜けているか？
                                                                              ▼
                                            FundingTick { rate: FundingRate(40_000_000), .. }
                                                                              │
                                                                              ▼
                                                       out.rate == FundingRate(40_000_000) ✨
```

assert している実体は「`compute_rate` の戻り値が `FundingTick` の `rate` フィールドにそのまま代入されて表面化していること」だ。例えば `tick()` が誤って `compute_rate` の結果を `.0` で剥がしたまま代入したり、別の `FundingParams` で再計算したりしていれば、ここで値が `40_000_000` 以外に変質して即座に検出される。**型のリレー (Pipeline) が壊れていないことを、実際にデータを通して証明している。**

微妙な接続バグ — 例：`compute_rate(premium, FundingParams { rate_cap: FundingRate(0), ..params })` のようなもの — は、このテストで壊れる（cap ゼロ → rate ゼロ → settlement なし）。**Composition テストは、unit テストでは拾えないものを捕まえる。**

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

**21 テストすべて green。** うち 6 つが `clock::tests` に置かれている（L8 で 3 つ + L9 で 3 つ）。

よくあるエラー：

- **`premium_drives_settlement_signs` が `Notional(-13)` あるいは `Notional(-11)` で失敗する** — rounding の off-by-one だ。数学を再確認しよう：`100 × 101 × 1_250_000 = 12_625_000_000`。`1_000_000_000` で割ると `12.625`、整数除算はゼロ方向に truncate するので `12`、符号反転で `-12` だ。これと違う数値が出るなら、`*`（debug で overflow すると panic）、`saturating_mul`、`wrapping_mul` のどれを使っているかを確認すること。
- **`second_tick_requires_another_full_interval` が second tick で失敗する** — guard が `last_settled_at` ではなく `genesis_time` と比較している場合だ。L8 のコードを読み直そう：guard は `now < self.last_settled_at.saturating_add(...)` であって、*`now < self.params.genesis_time + ...` ではない*。
- **`capped_rate_when_premium_extreme` が `FundingRate(125_000_000)` を返す** — `compute_rate` で clamp が効いていない場合だ。L6 を再確認すること：`raw.clamp(-cap, cap)` の行があるはずだ。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **Composition テストが接続ミスを捕まえる。** 各ステップが unit-test されていても、ステップ間の接続は別の関心事だ。**3 ステップの pipeline には、最低でも composition テストが必要だ — 各ステップの配置に 1 つずつ、加えてマルチステップの composition テストを 1 つ。** `premium_drives_settlement_signs` が後者にあたる。

2. **State machine には multi-call テストが必要。** 単一 operation で偶然に不変条件を満たしてしまうことがあり、それを排除して「state machine が一貫して強制しているか」を確認できるのは複数 operation だけだ。**`first_tick_at_exact_interval_fires` だけでは足りないからこそ `second_tick_requires_another_full_interval` が存在する。**

3. **各 gate で境界テストを行う。** inclusive な境界（`now == last_settled_at + interval`）と exclusive な境界（`now == last_settled_at + interval - 1`）の両方をテストする必要がある。**1 秒手前と 1 秒後の組が標準ペアだ。**

4. **各レイヤーの不変条件には、それぞれ surface テストを置く。** `compute_rate` のテストは cap clamp を証明する。`tick` のテストは、その cap が composition のもとでも*生き残る*ことを証明する。**Composition は semantics を失わせうるので、不変条件が経由する各レイヤーで検証する。**

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

**Q: なぜ `second_tick_requires_another_full_interval` は `+3601` をテストしないのか？**
`+3600` ちょうど*と* `+3599` を組み合わせれば境界の両側を pin できるからだ。`+3601` は `+3600` より少し多いだけで、同じ方向の話でしかない。**境界の 2 ケース（直前とちょうど）で十分**で、追加ケースが別のバグクラスを捕まえてくれるわけではない。

**Q: 「genesis vs last_settled_at」のバグを proptest で捕まえられないか？**
捕まえられる — `t2 < t1 + interval` を満たすランダムな `(t1, t2)` ペアで second tick が `None` を返すべき、という形にすればよい。ただし、手書きトレースのテストの方が意図がはっきりする：「`t1` で tick が成功した後、`t1 + 3599` の次の tick は gate される」。Proptest は property に強く、手書きトレースは名前付きのシナリオに強い。**state machine の挙動は通常シナリオ寄りだ。**

**Q: なぜ 3 つ目の tick として、例えば +7200（最初から 2 interval 後）を含めないのか？**
情報量が増えないからだ。`+3600` での 2 つ目の tick で「clock が正しい cadence で fire する」ことは既に立証している。3 つ目は同じことを繰り返すだけだ。**テストは検証するもので区別をつけるべきで**、繰り返しを足すべきではない。

**Q: テスト作者が `genesis_time = 0`（`1_000_000` ではなく）を使っていたらどうなる？**
数学は同じだが、テストの読みやすさが落ちる。`1_000_000`（とそれに対応する `1_003_600` 等）を使うと、すべてのアサーションから「clock が 3600 秒 advance する」パターンが視認できる。**テストデータは正しいだけでなく、読みやすくあるべきだ。**

## 次のレッスン（L10）

L10 では Module 3 を **no-catch-up 不変条件**で閉じる：マイルストーンテストの `no_catchup_after_long_gap` を扱う。シナリオは「validator が 10 時間のダウンタイムを経て reboot し、`now - last_settled_at = 36000`（10 interval）になっている」状態だ。素朴には「10 tick を replay して追いつく」と考えがちだが、今回の設計判断は **1 度だけ settle して `now` まで advance する**だ。レッスンでは「catch-up がなぜ tick スキップより悪いのか」を説明し、テストでその設計判断が enforce されていることを確認する。**テスト 1 つ、不変条件 1 つ、設計哲学を行動で示す。**
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
- **§Step 3 が数学と接続関心を説明** — 読者が composition テストが unit テストの見逃すものを捕まえる理由を見る。
- **§設計の振り返り 1-4** が distinct パターンを名指す（composition-tests-catch-wiring、multi-call-for-state-machines、boundary-at-every-gate、invariants-at-every-layer）。
- **§よくある質問**が境界対称性、proptest 適用可能性、繰り返し価値、テストデータ可読性を扱う。
- **L10 プレビュー**が具体的：1 マイルストーンテスト、no-catch-up 設計哲学。
