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

…で引き続き 38 テストが pass する。**`build_payload` への小さな変更** — 約 8 行 — で L9 の `Vec::new()` placeholder を `std::mem::take(...)` に置き換え、新しい payload ごとに前回の `build_payload` 呼び出し以降に CLOB が蓄積した fill をすべて drain する。

Drain は **forward-only**: fill が payload N に attach された時点で `pending_fills` から消え、payload N+1 には現れない。これが bridge が consumer に対して行う data-flow の約束 — 各 payload が build 時点で取られた fill snapshot を 1 つ所有する。

L10 は短い (focused な変更が 1 箇所だけ)。L11 で full pipeline を exercise する integration test を書く。

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

Order を submit できる。Fill が `pending_fills` に蓄積していく。`pending_fill_count()` が buffer サイズを報告する。**だが `build_payload` は buffer を無視している** — pending tuple の 3 番目要素として `Vec::new()` を挿入しているからだ。そのため `payload_fills(id)` は、buffer に entry があっても `Some(vec![])` を返してしまう。

L10 でそのギャップを閉じる。

## 計画

1 箇所の 1 変更。`crates/evm/src/live_node.rs` の `build_payload` メソッド内、次の行:

```rust
s.pending.insert(id, (hash, header, Vec::new()));
```

上記の実行結果が:

```rust
let drained_fills = std::mem::take(
    &mut *self
        .pending_fills
        .lock()
        .expect("pending_fills mutex poisoned"),
);
s.pending.insert(id, (hash, header, drained_fills));
```

…に変わる。レッスン全体でコードは 8 行。興味深いのは **`std::mem::take` が何をするか** と、**forward-only な drain 意味論を選ぶ理由**。

> 🛑 **考えてみよう。** スクロールする前に: `std::mem::take(&mut v)` は `v` の内容の所有権を奪い、`v` を `Default::default()` に置き換える。`Vec<Fill>` の場合、vector の中身をまるごと取り出し、`v` は空の `Vec<Fill>` になる。**問題が 1 つ:** 代わりに `v.drain(..).collect::<Vec<_>>()` で同じ効果を出せるか? 実用上の違いは何か?

(答え: `drain(..)` は要素を 1 つずつ取り除く iterator を返す。`mem::take` は `Vec<Fill>` 全体を値で swap する — pointer swap 1 回で済み、要素ごとの仕事はない。N fill の Vec に対して `drain` は O(N) + iterator のオーバーヘッドだが、`mem::take` は O(1) constant time。**「全部取って default にリセット」をやるなら `mem::take` のほうが速く、意図も明確。**)

## 手順

### Step 1: 変更する行を見つける

`crates/evm/src/live_node.rs` を開く。`impl<P> ConsensusBridge for LiveRethEvmBridge<P>` 内の `build_payload` を見つける。Body 末尾近く (`Ok(PayloadId(id))` の直前) にスクロール。L9 placeholder 行が見えるはず:

```rust
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header, Vec::new()));    // 今は空 Vec<Fill>; L10 がここで pending_fills を drain する
        Ok(PayloadId(id))
    }
```

L9 のコメントが明示的にここを指している。これが変更場所。

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

新しい statement が 2 個: `let drained_fills` block と修正後の insert。コメントは意図的に書いている — 将来の reader に **drain-on-build 意味論** を文書化する役目がある。

新しいコードを注意深く読む:

1. **`self.pending_fills.lock()`** — mutex を acquire する。`LockResult<MutexGuard<Vec<Fill>>>` を返す。`.expect("pending_fills mutex poisoned")` が結果を unwrap する (poisoned mutex に対する `expect` で問題ない — L9 の設計の振り返り参照)。
2. **`.lock().expect(...)`** が `MutexGuard<Vec<Fill>>` を返す。`MutexGuard` は `Deref<Target = Vec<Fill>>` だが `DerefMut` も持っている。Vec の所有権を取るには `&mut Vec<Fill>` が必要で、それを `&mut *guard` で得る。
3. **`std::mem::take(&mut *guard)`** が swap を行う: Vec の heap-pointer + len + capacity が MutexGuard から `drained_fills` 変数に move し、MutexGuard 側の Vec は `Vec::default()` (= `Vec::new()` — allocation なしの空 Vec) に置き換わる。
4. **MutexGuard が block 式の末尾で drop される** — lock が release される。
5. **`s.pending.insert(id, (hash, header, drained_fills))`** で fill の snapshot を新 payload と共に保存する。**pending_fills buffer は今は空で、次の submit ラウンドに備える。**

`std::mem::take(...)` 式全体が **lock 下の atomic 操作** になっている — 他の caller が「半分 drain された状態」を見ることはない。`pending_fills` は full か空のどちらかで、mid-drain にはならない。

> 🛑 **やりがちな勘違い。** 「`collect` して別途 clear すればよいのでは — `let drained = guard.iter().copied().collect::<Vec<_>>(); guard.clear();` のように」。 **できる — caller から見える結果は同じ。** だが: (a) `iter().copied().collect()` は O(N) の copy 作業 + O(N) の clear 作業がかかる (`mem::take` の O(1) の pointer swap と比べて) し、(b) 2 step 版では、`pending_fill_count()` を読んでいる誰かが既に collect 済みなのに古い count を見てしまう窓ができる。`mem::take` は外側から見て atomic。**One-shot の swap のほうが速く、より correct。**

### Step 3: 他に何も変わっていないことを verify

`cargo check -p openhl-evm` を走らせる。修正したばかりの行だけが異なる状態でコンパイルが通り、波及効果はなく、他のテストも壊れていないはず。`build_payload` の signature は変わらない (引き続き `async fn ... -> Result<PayloadId, BridgeError>`) ので、caller 側はこの変更に気づかない。

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

これが L11 の integration test が大まかにやることだ。ただし L11 では real な Reth node を bootstrap した上で実行する。L10 は基礎の機構を動くようにするだけ。

## テスト

```bash
cargo test -p openhl-evm --release
```

~30 秒後 (incremental compile):

```
... 38 tests ...

test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Course 6 の既存テストはすべて引き続き pass する。L9 + L10 の変更は構造的なもの — matching engine は既存テストで exercise されない (それは L11) が、これまで動いていたものはすべて動き続ける。

変更が効いているかを quick に `grep` で確認する:

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

1. **Submit 時ではなく build_payload で drain する。** Submit は `pending_fills` に push するだけで、buffer を空にするのは `build_payload` のみ。意図的だ — **fill は組み立てられた payload 単位でグループ化される** ものであって、到着順にグループ化されるものではない。下流の payload-consumer は「前回の payload と今回の payload の間に起きた fill の batch」という coherent な view を得る。Submit 時に drain してしまうと、bridge がどの fill がどの payload と一緒に行くかを track するサイドチャンネルを別途持つ必要が出てくる — 状態が増え、帳簿管理が増える。

2. **`std::mem::take` が正しい primitive。** O(1)、lock 下で atomic、意図 (「全部取って default を残す」) を明確に signal する。代替の `collect::<Vec<_>>(...drain(..))` + 明示的 clear は O(N) で、半 drain 状態の窓もできる。**標準ライブラリの primitive を知っておくことが、より遅くバグの多い自前版を再発明してしまう事故から自分を守る。**

3. **Drain は forward-only。** Payload N には、(前回の build_payload 呼び出し) と (今回の呼び出し) の間に produce された fill が attach される。以前の payload は、後で arrive した fill で更新されない。これは chain の意味論と一致している: block が build されたら、その content は frozen。**Buffer-then-drain の形が、明示的なグループ化メカニズムを使わずに「この block に何があるか」を encode する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 428cc26
diff -u ~/code/my-openhl/crates/evm/src/live_node.rs ./crates/evm/src/live_node.rs
```

L10 後、bridge コードは `428cc26` と **機能的に等価** (doc コメント以外) になる。参照との唯一の差は integration test — `clob_fills_flow_into_payload` がコードにまだない。それが L11 で扱うところ。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `pending_fills` に大量の fill (たとえば 1000 個) があったらどうなる?**
`std::mem::take` は依然 O(1)。Vec 自体が heap allocation を所有しており、`mem::take` は (pointer, length, capacity) の triple を swap するだけだから。要素ごとの仕事はない。下流の consumer が最終的に 1000 fill を iterate することになるが、それは consumer のコストであって drain のコストではない。

**Q: 2 つの `build_payload` 呼び出しが race して、両方とも full fill set を持つことはないのか?**
ない。`std::mem::take` が `MutexGuard` の下で実行されているから。Lock が保持されている間、他のスレッドは lock を acquire できない。最初の build_payload が full set を得て、2 番目は空 Vec を得る (最初の呼び出しが `Vec::default()` で置き換えているため)。**Mutex が drain を直列化する。**

**Q: `build_payload` が drain **後** に error したら?**
Fill は `pending_fills` から消えたが payload には入らなかったことになる — 実質的に失われる (submit されたが commit されていない)。**これは real なバグクラスで**、production コードでは handle すべき (たとえば build_payload の残処理を行う前に、drain した fill を recovery queue に保存するなど)。本コースの v0 single-validator devnet では failure path が稀なので loss を許容する。production hardening は下流の仕事。

**Q: `drained_fills` を `state` lock 内ではなく、別の lock で取るのはなぜ?**
`pending_fills` と `state` が別々の mutex だから (L9 の設計判断)。まず `state` を lock し (新しい payload ID を計算するため)、次に `pending_fills` を短く lock し (swap のためだけ)、そのまま state lock を使って `pending` への insert を続ける。**操作が独立しているなら、長い lock 1 つよりも短い lock 2 つのほうがよい。**

## 次のレッスン (L11)

Bridge にデータフローが通った。**ただし end-to-end で動くことはまだ証明していない。** L11 で `clob_fills_flow_into_payload` integration test を書く:

1. Real Reth `EthereumNode` を bootstrap する (course 6 と同じパターン)。
2. Live provider で `LiveRethEvmBridge` を construct する。
3. 空 book で `build_payload` を呼ぶ — fill が attach されていないことを verify する (`payload_fills` が `Some(vec![])` を返す)。
4. Maker BID @ 100、続いて crossing taker SELL @ 100 を submit する — fill が produce される。
5. `pending_fill_count == 1` を verify する。
6. 次の payload を build する — fill が drain され、なおかつ attach されることを verify する。
7. `pending_fill_count == 0` を verify する。
8. 以前の (pre-orders) payload が retroactively fill されなかったことを verify する (drain は forward-only)。

L11 後、Course 7 の pipeline 全体を exercise する integration test が 1 個揃う。**それが「動く CLOB-integrated bridge を build した」というマイルストーン。**
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
