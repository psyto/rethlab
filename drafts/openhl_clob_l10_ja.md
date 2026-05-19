# OpenHL CLOB を作る — L10 draft (JA) — build-along

> openhl SHA `428cc26` (Stage 8d — CLOB fill が bridge payload に流れる) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L10 — `openhl-clob-bridge-drain-ja`

- **モジュール:** 4 (Bridge 統合), モジュール内 sortOrder 1
- **コース全体 sortOrder:** 9 (12 レッスン中 10 番目)
- **所要時間:** 25 分
- **XP:** 50
- **type:** CONTENT

### Content

````markdown
# レッスン 10 — `build_payload` が pending fill を drain する

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-evm --release
```

…依然 38 テスト pass する。**`build_payload` への小さな変更** — 約 8 行 — が L9 の `Vec::new()` placeholder を `std::mem::take(...)` に置き換え、新しい payload ごとに前回の `build_payload` 呼び出し以降に CLOB が蓄積した fill すべてを drain する。

Drain は **forward-only**: fill が payload N に attach されたら `pending_fills` から消え、payload N+1 には現れない。これが bridge が consumer に対してする data-flow promise — 各 payload が build 時点で取られた fill snapshot 1 つを所有する。

L10 は短い (focused な 1 変更)。L11 で full pipeline を exercise する integration test を書く。

## おさらい

L9 完了時点、bridge は:

```rust
// 新規フィールド
clob: Mutex<Book>,
pending_fills: Mutex<Vec<Fill>>,

// 新規メソッド
pub fn submit_order(&self, order: Order) -> FillResult     // fill を push
pub fn payload_fills(&self, id: PayloadId) -> Option<Vec<Fill>>  // fill を read
pub fn pending_fill_count(&self) -> usize                  // count を read
```

Order を submit できる。Fill が `pending_fills` に蓄積する。`pending_fill_count()` が buffer サイズを報告する。**だが `build_payload` は buffer を無視する** — pending tuple の 3 番目要素として `Vec::new()` を挿入。なので `payload_fills(id)` は buffer に entry があっても `Some(vec![])` を返す。

L10 がそのギャップを閉じる。

## 計画

1 箇所の 1 変更。`crates/evm/src/live_node.rs` の `build_payload` メソッド内、次の行:

```rust
s.pending.insert(id, (hash, header, Vec::new()));
```

…が:

```rust
let drained_fills = std::mem::take(
    &mut *self
        .pending_fills
        .lock()
        .expect("pending_fills mutex poisoned"),
);
s.pending.insert(id, (hash, header, drained_fills));
```

…に変わる。レッスン全体。コード 8 行。興味深いのは **`std::mem::take` が何をするか** と **forward-only drain 意味論が欲しい理由**。

> 🛑 **考えてみよう。** スクロールする前に: `std::mem::take(&mut v)` は `v` の内容の所有権を取り、`v` を `Default::default()` に置き換える。`Vec<Fill>` の場合、vector の内容を全部得て、`v` が空 `Vec<Fill>` になる。**1 つ質問:** 代わりに `v.drain(..).collect::<Vec<_>>()` で同じ効果を出せる? 実用上の違いは何か?

(答え: `drain(..)` は要素を 1 個ずつ取り除き iterator を返す。`mem::take` は `Vec<Fill>` 全体を値で swap する — pointer swap 1 回、要素ごとの仕事なし。N fill の Vec で `drain` は O(N) + iterator オーバーヘッド、`mem::take` は O(1) constant time。**`mem::take` は「全部取って default にリセット」に対してより速くより明確。**)

## 手順

### Step 1: 変更する行を見つける

`crates/evm/src/live_node.rs` を開く。`impl<P> ConsensusBridge for LiveRethEvmBridge<P>` 内の `build_payload` を見つける。Body 末尾近く (`Ok(PayloadId(id))` の直前) にスクロール。L9 placeholder 行が見えるはず:

```rust
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header, Vec::new()));    // 今は空 Vec<Fill>; L10 がここで pending_fills を drain する
        Ok(PayloadId(id))
    }
```

L9 のコメントが明示的にここを指す。これが変更場所。

### Step 2: drain で置き換え

`let hash = header.hash_slow();` から insert までのセクションを次に変更:

```rust
        let hash = header.hash_slow();

        // Drain whatever fills the CLOB has accumulated since the last
        // build_payload call. The fills attach to this payload so the bridge
        // can route them downstream (encode as EVM txs, return via
        // payload_fills, etc.). 8d keeps them as a parallel list; future
        // stages encode them into the block body.
        let drained_fills = std::mem::take(
            &mut *self
                .pending_fills
                .lock()
                .expect("pending_fills mutex poisoned"),
        );

        s.pending.insert(id, (hash, header, drained_fills));
        Ok(PayloadId(id))
    }
```

新しい statement 2 個: `let drained_fills` block と修正された insert。コメントは意図的 — 将来の reader に **drain-on-build 意味論** を文書化する。

新コードを注意深く walk:

1. **`self.pending_fills.lock()`** — mutex を acquire。`LockResult<MutexGuard<Vec<Fill>>>` を返す。`.expect("pending_fills mutex poisoned")` が結果を unwrap (poisoned mutex に対する `expect` は fine — L9 の設計の振り返り参照)。
2. **`.lock().expect(...)`** が `MutexGuard<Vec<Fill>>` を返す。`MutexGuard` は `Deref<Target = Vec<Fill>>` だが `DerefMut` も持つ。Vec の所有権を取るには `&mut Vec<Fill>` が必要、それを `&mut *guard` で得る。
3. **`std::mem::take(&mut *guard)`** が swap を行う: Vec の heap-pointer + len + capacity が MutexGuard から `drained_fills` 変数に move する; MutexGuard の Vec が `Vec::default()` (= `Vec::new()` — allocation なしの空 Vec) に置き換わる。
4. **MutexGuard が block 式の末尾で drop** — lock が release。
5. **`s.pending.insert(id, (hash, header, drained_fills))`** が fill の snapshot を新 payload と共に保存。**pending_fills buffer は今空、次の submit ラウンドに準備完了。**

`std::mem::take(...)` 式全体が **lock 下の単一 atomic 操作** — 他の caller が「半 drain 状態」を見ることはない。`pending_fills` は full または空、決して mid-drain ではない。

> 🛑 **やりがちな勘違い。** 「`collect` して別途 clear すれば、`let drained = guard.iter().copied().collect::<Vec<_>>(); guard.clear();` のように?」 **できる — caller に対する結果は同じ。** だが: (a) `iter().copied().collect()` が O(N) copy 仕事 + O(N) clear 仕事、`mem::take` の O(1) pointer swap に対し; (b) 2 step 版には `pending_fill_count()` を読んでいる誰かが既に collect 済みなのに古い count を見る窓がある。`mem::take` は外側から atomic。**One-shot swap は速くより correct。**

### Step 3: 他に何も変わっていないことを verify

`cargo check -p openhl-evm` を走らせる。今修正した行だけが異なってコンパイルされ、波及効果なし、他のテストが壊れていないはず。`build_payload` の signature は変わらない (依然 `async fn ... -> Result<PayloadId, BridgeError>`)、なので caller は気づかない。

「fill が本当に動いているか」のメンタルテストが欲しいなら:

```rust
// 概念的:
bridge.submit_order(order1);  // fill F1 → pending_fills: [F1]
bridge.submit_order(order2);  // fill F2 → pending_fills: [F1, F2]
assert_eq!(bridge.pending_fill_count(), 2);

let id1 = bridge.build_payload(...).await.unwrap();
// pending_fills は今空 (payload id1 に drain された)
assert_eq!(bridge.pending_fill_count(), 0);
// そして payload に fill が attach されている
assert_eq!(bridge.payload_fills(id1), Some(vec![F1, F2]));

let id2 = bridge.build_payload(...).await.unwrap();  // 今度は空 drain
assert_eq!(bridge.payload_fills(id2), Some(vec![]));  // retroactive fill なし
```

これが L11 の integration test が大まかにやることだが、real Reth node bootstrap に対して実行される。L10 は基礎機構を動かすだけ。

## テスト

```bash
cargo test -p openhl-evm --release
```

~30 秒後 (incremental compile):

```
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Course 6 の既存テストすべて依然 pass。L9 + L10 の変更は構造的 — matching engine は既存テストで exercise されない (L11 で来る)、だが以前動いていたものはすべて動き続ける。

変更が効いたかを quick `grep` で確認:

```bash
grep -n "std::mem::take" crates/evm/src/live_node.rs
# build_payload で 1 行を報告するはず — 今追加した変更。

grep -n "Vec::new()" crates/evm/src/live_node.rs
# build_payload の行はもう報告されないはず。(初期 pending_fills 初期化のような
# ファイル内の他の Vec::new() は fine。)
```

よくあるエラーと対処:

- **`error[E0596]: cannot borrow `*self.pending_fills.lock()...` as mutable`** — lock が `LockResult` を返し、`MutexGuard` に unwrap するために `.expect(...)` (または `.unwrap()`) が必要。`.lock().expect("...")` chain を再確認。
- **`error[E0277]: `MutexGuard<'_, Vec<Fill>>` doesn't implement `DerefMut`** — `&*guard` ではなく `&mut *guard` を使っていることを確認。`*guard` deref + `&mut` borrow が `&mut Vec<Fill>` をくれる。
- **`error: cannot move out of borrowed content`** — `std::mem::take(self.pending_fills.lock().expect(...))` のように (`&mut *` なしで) 試した。`mem::take` signature は `fn take<T: Default>(dest: &mut T) -> T`。引数は `&mut` でなければならず、MutexGuard を deref することで正しい shape を得る。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Submit ではなく build_payload で drain。** Submit は `pending_fills` に push する; `build_payload` だけがそれを空にする。意図的 — **fill が、それが組み立てられた payload でグループ化される**、来た順序ではない。下流の payload-consumer が「前の payload と今の payload の間に起きた fill のこの batch」という coherent な view を得る。Submit 時に drain すると、bridge がどの fill がどの payload と一緒に行くかを track するサイドチャンネルが必要 — state が増え、帳簿管理が増える。

2. **`std::mem::take` が正しい primitive。** O(1)、lock 下で atomic、意図 (「全部取って default を残す」) を signal する。代替 — `collect::<Vec<_>>(...drain(..))` + 明示的 clear — は O(N) で半 drain 窓がある。**標準ライブラリの primitive を知ることで、より遅いまたはバグのあるバージョンを発明することから自分を守る。**

3. **Drain は forward-only。** Payload N が (前回 build_payload 呼び出し) と (今回呼び出し) の間に produce された fill を attach する。以前の payload は、後で arrive した fill で更新されない。これが chain の意味論と一致: block が build されたら、その content は frozen。**Buffer-then-drain shape が、明示的なグループ化メカニズムを必要とせずに「この block に何があるか」を encode する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L10 後、bridge コードは `428cc26` と **機能的に等価** (doc コメント以外)。参照との唯一の差は integration test — `clob_fills_flow_into_payload` がコードにまだない。それが L11。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `pending_fills` に多くの fill (例えば 1000 個) があったら?**
`std::mem::take` は依然 O(1)。Vec 自体が heap allocation を所有する; `mem::take` は (pointer, length, capacity) triple を swap する。要素ごとの仕事なし。下流の consumer が最終的に 1000 fill を iterate するが、それは consumer のコストで drain のではない。

**Q: 2 つの `build_payload` 呼び出しが race して両方とも full fill set を持っていると考えたら?**
ない、`std::mem::take` が `MutexGuard` 下にあるから。Lock が保持されている間、他のスレッドは lock を acquire できない。最初の build_payload が full set を得る; 2 番目は空 Vec を得る (最初のが `Vec::default()` で置き換えたから)。**Mutex が drain を直列化する。**

**Q: `build_payload` が drain **後** に error したら?**
Fill は `pending_fills` から消えたが payload には入らなかった。実質的に失われる — submitted されたが committed されていない。**これは real なバグクラス**、production code が handle するべき (例: build_payload の残りをやる前に drain した fill を recovery queue に保存)。我々の v0 single-validator devnet では failure path が稀なので loss を受け入れる; production hardening は下流の仕事。

**Q: `drained_fills` が `state` lock 内ではなく — 別途 lock されるのは?**
`pending_fills` と `state` が別々の mutex だから (L9 設計判断)。最初に `state` を lock (新しい payload ID を計算)、それから briefly `pending_fills` を lock (swap のためだけ)、それから state lock を使って `pending` に insert を続ける。**操作が独立しているとき、2 つの短い lock が 1 つの長い lock より良い。**

## 次のレッスン (L11)

Bridge にデータフローがある。**end-to-end で動くことをまだ証明していない。** L11 で `clob_fills_flow_into_payload` integration test を書く:

1. Real Reth `EthereumNode` を bootstrap (course 6 と同じパターン)。
2. Live provider で `LiveRethEvmBridge` を construct。
3. 空 book で `build_payload` を呼ぶ — fill が attach されていないことを verify (`payload_fills` が `Some(vec![])` を返す)。
4. Maker BID @ 100、それから crossing taker SELL @ 100 を submit — fill が produce される。
5. `pending_fill_count == 1` を verify。
6. 次の payload を build — fill が drain され AND attach されることを verify。
7. `pending_fill_count == 0` を verify。
8. 以前の (pre-orders) payload が retroactively fill されなかったことを verify (drain は forward-only)。

L11 後、Course 7 の pipeline 全体を exercise する 1 つの integration test がある。**それが「動く CLOB-integrated bridge を build した」マイルストーン。**
````

---

## Seed ファイルスロット

L10 は Module 4 (Bridge 統合) sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 10 — build_payload が pending fill を drain する',
  slug: 'openhl-clob-bridge-drain-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 25,
  xpReward: 50,
  content: `# レッスン 10 — \`build_payload\` が pending fill を drain する\n\n...`
},
```

## SHA pinning 規律

同じ `428cc26`。L10 後、bridge は参照と機能的に等価; integration test (L11) のみ残る。
