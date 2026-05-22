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

このレッスンで掴む概念:

- **No-catch-up は公平性の不変条件** — 10 interval 分のギャップが空いた後は、1 度だけ settle して `now` まで advance する。10 tick を replay してはいけない。現在のスナップショットで 10 回 replay すると、ギャップ中に position を閉じられなかった負け側に 10 倍の懲罰が集中してしまう。Funding の目的は equilibration であって、遡及的な強制ではない。
- **`now` へ advance する、`last_settled + interval` ではなく** — deadline は実際の settlement 時刻にリセットされ、数学的な「次の整列点」にはならない。Clock は見逃した interval を完全に忘れる。これが、このテストで pin する設計判断だ。
- **同じ `now` での second tick は state machine の最も厳しいテスト** — 2 つの呼び出しの間で時間は 1 ミリ秒も経過しておらず、変わったのは clock の内部 state だけだ。遅れた tick で `last_settled_at` を更新し忘れる実装を、すべて捕まえてくれる。
- **Catch-up ポリシーは clock の外側に置く** — Catch-up が必要な呼び出し側は、中間時点のスナップショットを伴って `tick()` を繰り返し呼ぶ wrapper を書けばよい。Clock 自身は過去の state にアクセスできないからこれはできない。プリミティブはミニマルに、ポリシーは呼び出し側に。
- **設計哲学はドキュメント、コード、テストの 3 箇所に住む** — Module doc が不変条件を約束し、`tick()` の `self.last_settled_at = now` の行がそれを強制し、`no_catchup_after_long_gap` がそれを証明する。それぞれが別の読者に対応する。

検証：

```bash
cargo test -p openhl-funding
```

上記の実行結果が 22 テストを通る（L4-L9 で書いた 21 + 新規 1）。

具体的な変更:

新規テストは **`no_catchup_after_long_gap`** — validator が複数 interval を見逃したときの挙動について、openhl の設計判断を pin するマイルストーンテストだ。

L10 後の状態：
- `crates/funding/` が **Stage 8b（`cd94137`）と byte-identical**。
- 22 テストすべて pass：手書きトレース 20 + proptest 2。
- Module 3（Clock state machine）が**完了**。
- Funding state machine が、独立した crate として **production grade** に達する。

教育上の焦点は、**失敗モード下での設計哲学**だ：clock が遅れたとき、何が正しい semantics なのか。素朴な答え（「tick を replay して追いつけばよい」）は間違いで、L10 ではその理由を説明する。

## おさらい

L9 後の状態：
- 7 つの clock テストのうち 6 つが pass している。
- Interval-gating の副不変条件（境界、持続性）が両方とも検証済み。
- 数学 composition が `tick()` 経由で正しく surface している。

L9 が「normal operation」の不変条件をカバーした。L10 では「abnormal operation」の不変条件 — clock が*遅れた*ときの挙動 — をカバーする。

## シナリオ

openhl チェーンが通常通り稼働し、毎時 funding を settle してきたとしよう。そこに何かが起きる：

- Validator reboot（プロセス再起動で 5 分）。
- ネットワーク分割（validator が再接続するまで 8 時間チェーンが停止）。
- Leader のハードウェア障害、fallback validator が 30 分後に引き継ぐ。

原因が何であれ、次の `tick()` 呼び出しで `now - last_settled_at` が `interval_secs` を大きく超える状態になる。**このとき clock は何をすべきか。**

設計判断は 2 つに分かれる：

### Choice A: Catch up する

10 interval 分の funding を replay する。各 replay は*現在*の mark / index / positions のスナップショットを使う。settlement を 10 回連続で適用する。

**Pro**：各 interval が settlement を得て、チェーンが「遅れない」。

**Con**：
- **stale-snapshot 問題**：10 個の settlement すべてが*同じ*現在スナップショットを使うことになり、各歴史的 interval 境界時点のスナップショットではない。Gap 中に勝っていた trader が、いまの有利な rate で計算された 10 個の settlement を支払う羽目になる。Gap 中に負け続けていた側は 10 倍の打撃を受け、しかも途中で position を閉じて逃げる機会は一度もなかった。
- **集中リスク**：1 度に 10 倍の funding がかかれば、毎時 1 回ずつ別々に支払っていれば耐えられたはずのアカウントが liquidate されうる。
- **path dependency**：funding の履歴が、gap が*いつ*発生したかに依存することになる — 累積時間だけでなく。

### Choice B: 1 度 settle して `now` に advance する

現在のスナップショットで*1 度だけ* funding を適用し、`last_settled_at` を `now` に進める。見逃した 10 個の interval は*スキップ*し、replay はしない。

**Pro**：
- **集中的な懲罰がない**：障害 1 回あたり、最大でも cap 上限の settlement が 1 つだけ。
- **path-independent**：結果が現在のスナップショットだけに依存し、gap のタイミングには依らない。
- **外部での catch-up が可能**：catch-up ロジックが欲しい呼び出し側は、中間タイムスタンプでの fresh なスナップショットを使って `tick()` を繰り返し呼ぶことで、自前で実装できる。

**Con**：
- **失われる revenue**：funding は永久先物価格の equilibration メカニズムなので、interval をスキップすれば basis にかかる圧力もその分減る。

**openhl では Choice B を採る。** Catch-up ロジックが必要な人は、clock の*外側*でそれを構築する — 正しい歴史時刻のスナップショットを伴って `tick()` を繰り返し呼ぶ形だ。

時間が大きく飛んだ直後に state machine がどう振る舞うか、Choice A と Choice B を 1 枚の障害シナリオで並べると差が一目で見える:

```
1_000_000 (Genesis、last_settled_at = 1_000_000)
   │
   ▼  +3,600 秒 (正常に 1 interval 経過)
1_003_600 ── 【正常 Tick】成功 ──► last_settled_at = 1_003_600
   │
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
   ░░  障害発生! 10 時間チェーンが停止             ░░
   ░░  trader は position を閉じられない          ░░
   ░░  mark が index 上に乖離し続けたとする        ░░
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
   │
   ▼  +36,000 秒 (再起動後の最初のブロック)
1_039_600 ── 【遅れてきた Tick】
                  │
                  ├─► ❌ Choice A (catch-up replay):
                  │     現在のスナップショットを使って 10 回連続で settle を replay
                  │     負けていた側 (longs) に毎時 cap 上限が 10 連発で襲いかかる
                  │     trader は gap 中に position を閉じる手段がなかった
                  │     →「動けなかった時間に対する retroactive な強制」になる
                  │     last_settled_at の遷移は 1,003,600 → 1,007,200 → ... → 1,039,600
                  │
                  └─► 🟢 Choice B (openhl の採用、本実装):
                        現在のスナップショットで 1 度だけ settle
                        見逃した 9 interval 分の settlement は完全にスキップ
                        clock は一気に `now = 1_039_600` まで advance
                        →「funding revenue は失うが、trader にはフェア」
                        last_settled_at = 1_003_600 ──► 1_039_600 ✨ (1 ステップ)
```

ポイントは「Choice B では `last_settled_at` の遷移が常に 1 ステップで完結する」ということだ。10 時間の gap だろうが 10 秒の gap だろうが、`tick()` は 1 回呼ばれて 1 回 advance するだけ。これが path-independence (gap のタイミングに結果が依存しないこと) の正体であり、テスト 1 本でこの不変条件全体を pin できる理由でもある。

> 🛑 **考えてみよう。** スクロール前に — ノード再起動で 10 時間の funding を取り逃がした validator が、*現在*のスナップショットから 10 tick を replay して埋め合わせようとする場面を考える。**このアプローチで一番痛い目に遭うのはどの trader か？** ヒント：gap 中に負けていたのは誰か、を考えよ。

（答え：**負けていた側が 10 倍の打撃を食らう。** 10 時間の gap の間、mark が index に対して上振れし続けたとしよう — 「現実」世界では longs が overpay していた状態だ。Choice A は*現在*の rate で settlement を 10 回 replay する、すべて longs から charge する形だ。Basis の負け側にすでに居た trader は、毎時 funding が適用されていたなら払っていたはずの 10 倍を支払う羽目になる。さらに悪いことに、gap 中は position を閉じることもできなかった（チェーン自体が止まっていたからだ）。catch-up は、trader が動けなかった時間に対して retroactive に charge しているように見える。**Choice B はこう言う：見逃した 10 回の支払いはスキップして、今から fresh に始めよう、と。Funding revenue には悪いが、trader にはフェアだ。**）

## プラン

ファイル編集は 1 つ：

1. **`crates/funding/src/clock.rs` に `no_catchup_after_long_gap` を追加**する — 既存の `#[cfg(test)] mod tests` ブロック内、L9 のテストの後ろに置く。

プロダクションコードの変更も `lib.rs` の変更もなし。

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

**2 つのパートで構成する。** それぞれが no-catch-up 不変条件の別の副 property を pin する。

#### Part 1: 長い gap の後でも settle は 1 度だけ

```rust
        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);
```

セットアップ：genesis を `1_000_000` にしておき、`1_036_000`（= `1_000_000 + 10 × 3600`）で tick を呼ぶ。10 個の interval を full に経過した状態だ。

**アサーションは 2 つ**：

1. **`out.is_some()`** — tick が*fire する*。遅れているからといってスキップはしない。**Choice B は「全部スキップ」ではなく、「1 度だけ settle する」だ。**

2. **`clock.last_settled_at() == way_later`** — そして*決定的に重要*なのは、clock が `now` に advance するという点だ — `1_000_000 + 3600`（genesis から 1 interval 後）でもなければ、`1_000_000 + 10*3600`（genesis から 10 interval 後 — 数値は偶然同じだが理由は別）でもない。**Clock は見逃した interval を完全に忘れる。**

> 🛑 **やりがちな勘違い。** 「テストでは `out.settlements` のエントリが 1 つだけかどうかも確かめるべきでは？」 **Settlement の個数は positions に依存するもので、gap には依存しない。** `balanced_book()`（long 100、short -100）なら、gap の長さに関わらず settlement は 2 つ得られる。このテストの仕事は*tick が 1 回*fire することを検証することであって、その tick がいくつの settlement を生むかを問うことではない。**tick の回数をテストする — settlement の個数は別の関心事だ。**

#### Part 2: 同じ `now` では再 fire しない

```rust
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
```

長い gap の tick の直後、*同じ* `now` で `tick` をもう一度呼ぶ。**`None` を返す必要がある。** 遅れた tick の後でも interval-gating 不変条件が依然として成り立つこと — 続けて tick を 2 回呼んで double settlement を得ることはできない、ということ — を示すテストだ。

**なぜこのアサーションが重要なのか？** バグのある実装が、以下のような挙動を取りうるからだ：
- 「経過時間 >> interval」を検知して「追いつくまで連続的に fire する」と判断する（catch-up のバグ版）。
- 長い gap の tick で `last_settled_at` を更新し忘れ、同じ `now` の後続 tick が fire し続ける。

**同じ `now` というのは、可能な限り最も厳しいテスト**だ。2 回の tick の間で時間は 1 ミリ秒も経過せず、変化するのは clock の内部 state だけだ。`last_settled_at == way_later`（Part 1 の結果）なら、guard 条件 `now < last_settled_at + interval` は `way_later < way_later + 3600`、すなわち `0 < 3600` で true となり、`tick` は正しく `None` を返す。

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

**22 テストすべて green。** Module 3 が閉じる。`crates/funding/` が Stage 8b と byte-identical になる。

よくあるエラー：

- **Part 1 が失敗：`out.is_none()`** — guard の比較方向を間違えた場合だ。確認しよう：`if now < last_settled_at + interval { return None; }`。`now = 1_036_000`、`last_settled_at = 1_000_000` のもとで `now < 1_003_600` は false、guard は return せず、tick が fire するはずだ。
- **Part 1 が失敗：`last_settled_at() != way_later`** — clock を `now` 以外の値に advance させてしまった場合だ。`tick()` 末尾付近の `self.last_settled_at = now;` の行を再確認すること。よくある typo は `self.last_settled_at = self.last_settled_at + self.params.interval_secs;`（catch-up 版）や `self.last_settled_at += self.params.interval_secs;`（こちらも同じく誤り）だ。
- **Part 2 が失敗：`again.is_some()`** — Part 1 の tick で `last_settled_at` が更新されていない場合だ。同じ `now` での Part 2 の tick が `genesis + interval` の gate（まだ満たされている）を見つけて、誤って fire してしまう。Part 1 の代入を再確認すること。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **長い gap が起きても settle は 1 度、advance 先は `now`。** 代替案（interval を replay して catch up する）では、負けていた側に集中的な懲罰を、position を閉じる機会も与えずに課すことになる。Funding の目的は*equilibration* であって、retroactive な enforcement ではない。**Choice B は funding revenue を多少犠牲にしてでも、数学を公平性と揃える。**

2. **同じ `now` での second tick テストは、可能な限り最も厳しい。** 時間は経過せず、変化するのは state だけだ。遅れた tick で `last_settled_at` を更新し忘れる実装を、すべて捕まえてくれる。**state machine では「同じ入力で連続呼び出し」が、state 更新のバグを最も鋭くあぶり出す。**

3. **Catch-up ロジックは clock の外に置く。** Catch-up を必要とする呼び出し側は、歴史的な中間タイムスタンプでのスナップショットを伴って `tick()` を繰り返し呼べる。**Clock は primitive、ポリシーは呼び出し側の責任だ。**

4. **設計哲学は documentation とテストに置く。** Clock の module doc で不変条件を名指し、このテストでそれを強制し、テストコメントとこのレッスンが*なぜ*を説明する。**根拠を 3 箇所（doc、コード、テスト）から見つけられる。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
```

L10 後、`crates/funding/` は **Stage 8b と byte-identical** になる。Diff は空だ。

**Module 3 が閉じる。** Module 4（capstone）は L11 で扱う。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: catch-up の semantics が欲しい。configurable にできるか？**
Clock 内部では設定できない。wrapper を書いて、歴史的な中間タイムスタンプのスナップショットを伴った `tick()` を繰り返し呼ぶ必要がある：

```rust
// 外部 catch-up wrapper の擬似コード：
while clock.last_settled_at() + interval < now {
    let next_target = clock.last_settled_at() + interval;
    let historical_snapshot = fetch_snapshot_at(next_target);  // !!! complex !!!
    clock.tick(next_target, historical_snapshot.mark, ...);
}
clock.tick(now, current_snapshot.mark, ...);
```

難しいのは `fetch_snapshot_at(historical_timestamp)` の部分だ — 呼び出し側が過去時点での mark / index / positions の姿を知っている必要がある。**だからこそ catch-up は clock の内側にはない：clock が持っていない歴史 state を要求するからだ。** Application 層（chain database を持つ層）ならそれが可能だ。

この `// !!! complex !!!` が指している「複雑さ」を clock の内側に取り込もうとすると、こういう破滅が起きる: clock 自身が **過去 N interval 分の (mark, index, position snapshot) をオンチェーンに永続化** しておく必要が出てくる。HL のように 1 時間 interval で 1 ヶ月分でも保持しようとすれば、`24 × 30 = 720` 個のスナップショットを **すべての market 分** だけ抱える state バルーンになる — おまけにそのストレージ自体が consensus state に組み込まれるので、ストレージレイアウトを変えるたびに network upgrade が必要になる。**「pure かつ軽量な state machine」という `openhl-funding` クレートの美点が一瞬で蒸発する。** 一方、application 層なら chain database をすでに持っているので、`fetch_snapshot_at(t)` は「block T の state root を引いて position を読む」程度のコストで済む。「primitive はミニマルに、policy は外側に」という責任分離が、ここでは具体的にストレージサイズの 720 倍差として現れている。

**Q: `way_later` が overflow する前に、gap はどれだけ長くできるのか？**
`u64::MAX` 秒はおよそ `5.8 × 10^11` 年 — 宇宙の熱的死のはるか先だ。Guard の `saturating_add` は `last_settled_at` が `u64::MAX` 近くでも安全に扱うが、実用上はその領域に届かない。**pathological なケースは guard の責任、現実のケースは設計の責任だ。**

**Q: `way_later` の時点で `mark` と `index` は合理的な値だが、gap の原因がそもそも mark / index oracle の停止だったらどうなるか？**
Clock は oracle が stale かどうかを知らない。stale な mark で `tick()` を呼べば、stale なデータに基づいた funding が出る。**Oracle の鮮度は呼び出し側の責任だ。** 本番デプロイでは `tick()` を呼ぶ前に oracle-staleness チェックを足す — oracle が古すぎる場合は呼び出しをスキップする。スキップは clock の上位で起きるべきで、clock 側は入力を信頼するだけだ。

**Q: 長い gap での tick が起きたときに warning ログを足すべきか？**
ログ出力は side effect だ。Clock は pure（I/O なし）に保つ。気になる場合は wrapper 側で gap をログに残せばよい：`if elapsed > 2*interval { log!("late tick: {} hours behind", elapsed/3600); }`。**primitive を pure に保ち、観測は wrapper に任せる。**

## Module 3 マイルストーン — 築き上げたもの

L10 後の状態：
- **Module 3 完了。** Clock state machine と 7 つのテストが、interval-gating、no-catch-up、数学の composition、cap の surfacing をカバーしている。
- **Crate 全体が Stage 8b と byte-identical**。types.rs / compute.rs / clock.rs を合わせて ~635 LOC。
- **テスト合計 22 個**：手書きトレース 20 + proptest 2。
- **Rustdoc warning ゼロ。**

Funding state machine は今や、**完成し、テスト済みで、production grade** の crate になっている。Funding を deterministic に計算し、正しい cadence で gate し、gap 後に path-dependent な settlement を持ち込むことを拒む。

残っているもの：
- **Module 4（Capstone、L11）** — 統合、先送り項目、bridge integration のプレビュー。コードはなし。
- **将来のコース** — この crate を bridge に組み込んでいく（oracle 統合、balance 更新、liquidation トリガーなど）。

## 次のレッスン（L11）

L11 は capstone だ — 新規コードはない。アーキテクチャをスケッチし、このコースで先送りした項目を名指し（oracle 統合、balance 更新、liquidation、マルチマーケット funding、EVM event としての funding）、それぞれが将来どこに置かれるかをたどる。Funding state machine を、より大きな openhl アーキテクチャの中の一部として捉えるメンタルモデルを固めるレッスンだ。
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
