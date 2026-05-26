# OpenHL を作る — L7 draft (JA) — C2 build-along 書き直し

> openhl SHA `23c2ba4` (signing.rs canonical encoding) + `9e810a7` (Stage 6a: OpenHlSigningProvider) 基準。build-along コースでは、この 2 つは教育的に切り離せないため 1 レッスンにまとめる。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。

---

## L7 — `openhl-signing-provider-ja`

- **モジュール:** 4 (CL types), モジュール内 sortOrder 1
- **コース全体 sortOrder:** 6 (15 レッスン中 7 番目)
- **所要時間:** 40 分
- **XP:** 80
- **type:** CONTENT

### Content

````markdown
# レッスン 7 — `OpenHlSigningProvider` と canonical encoding

## ゴール

このレッスンで掴む概念:

- **canonical encoding は consensus-critical。** 署名対象になるバイトレイアウトが *chain の spec の一部* であり、`serde::Serialize` から derive してはいけない理由。serde のバージョンが異なる validator 同士は、同じ vote から異なるバイト列を作って別物に署名し、結果として fork する。
- **stateful provider で wrap された純粋関数。** `sign_vote(vote, &sk)` は free function (テストはこれを直接呼ぶ)、`OpenHlSigningProvider` は key を保持して `sp.sign_vote(vote)` を Malachite に提供する。1 つのロジックを 2 通りの呼び出し方で使い分ける。
- **署名検証失敗による改ざん検出。** Ed25519 は「何が」改ざんされたかを知らない。単に verify が失敗するだけだ。vote の 1 バイトを flip して verification が失敗することを確認するテストは、canonical encoding が consensus-relevant なフィールドを漏れなくカバーしている証明になる。
- **型システムによる公開鍵 / 秘密鍵の分離。** Ed25519 は `sign` を `PrivateKey` にしか持たせない。公開鍵で署名しようとしたら compiler が拒否してくれる。
- **未使用機能への空バイト署名。** trait surface が要求するが chain が使わない機能 (vote extension、proposal part) については、確定的な空データに署名することで contract を honor しつつ、持っていないデータをでっちあげずに済む。

検証:

```bash
cargo test -p openhl-consensus
```

上記の実行結果が **14 個のテストすべてに合格する** (L6 の Context impl から 5 個 + 署名と SigningProvider の新規 9 個)。9 個の新規テストがカバーするもの: 4 種類すべての署名対象型 (vote、proposal、proposal_part、vote_extension) についての sign/verify ラウンドトリップ、vote と proposal の改ざん検出、別 provider が作った署名の検証拒否。

具体的な変更:

- `crates/consensus/src/signing.rs` — `OpenHlVote` と `OpenHlProposal` の canonical byte encoding、低レベルの `sign_vote / sign_proposal / verify_vote` 関数、`VerifierLike` shim、unit test 2 個。
- `crates/consensus/src/signing_provider.rs` — `PrivateKey` を保持する `OpenHlSigningProvider`、8 method (4 sign/verify pair) の `impl SigningProvider<OpenHlContext>`、unit test 7 個。
- `crates/consensus/src/lib.rs` — `pub mod signing; pub mod signing_provider;` を組み込む。
- Cargo.toml 変更なし (`informalsystems-malachitebft-signing-ed25519` 依存は L6 で入った)。

## おさらい

L6 完了時点で `openhl-consensus` crate には以下がある:

```
crates/consensus/src/lib.rs   — pub mod bridge, context, types
crates/consensus/src/types/   — 7 個の型ファイル + mod.rs
crates/consensus/src/context.rs — OpenHlContext + Context impl + テスト 5 個
```

`cargo test -p openhl-consensus` でテスト 5 個が合格する。**署名はまだ一切存在しない** — vote と proposal は構築できるが、コードベース中のどこにも、それらに対して署名を生成したり検証したりする処理がない。

## 計画

5 つやる:

1. **`crates/consensus/src/signing.rs` を作成する** — `OpenHlVote` と `OpenHlProposal` の canonical byte encoding 関数、低レベルの `sign_vote` / `sign_proposal` / `verify_vote` 関数、`VerifierLike` trait shim、ユニットテスト 2 個。
2. **`crates/consensus/src/signing_provider.rs` を作成する** — `PrivateKey` を保持する `OpenHlSigningProvider` 構造体、8 メソッドの `impl SigningProvider<OpenHlContext>` (4 つの sign/verify ペア)、ユニットテスト 7 個。
3. **両モジュールを `lib.rs` に組み込む** — `pub mod signing; pub mod signing_provider;` を追加。
4. **Cargo.toml の変更なし** — `informalsystems-malachitebft-signing-ed25519` は L6 で `rand` feature 付きで追加済み。追加要件はない。
5. **実行** — `cargo test -p openhl-consensus` で 14 個全部合格する。

このレッスンが教えるのは **2 つのパターン** だ:

- **Canonical encoding** — 型付きメッセージを、すべての validator が同一に計算できる確定的なバイト列に変換する。署名は **構造体** ではなく **バイト列** にコミットする。フィールドの encoding が変わると、署名が検証できなくなる。
- **Trait 同士の接続** — Malachite の `SigningProvider` は、`signing.rs` の低レベル署名ロジックを **ラップする** trait だ。Provider は実行時状態 (鍵) を持ち、処理を状態を持たない純粋関数に委譲する。これは `ConsensusBridge` (trait) と `InMemoryEvmBridge` (それを impl する構造体) と同じ分離パターンだ。

> 🛑 **考えてみよう。** スクロールする前に: `Vote` の canonical encoding はどのフィールドを含む必要があるか? ヒント: 署名が何にコミットしているかを考える。コンセンサスにとって意味のある違いがある 2 つの vote について、もし signing bytes が同一になっていれば、片方に対する有効な署名がもう片方にも通ってしまう。攻撃者は vote を replay したり swap したりできる。

## 手順

### Step 1: `crates/consensus/src/signing.rs` を作成

モジュール docstring と import から:

```rust
//! Canonical encoding + signing for proposals and votes.
//!
//! v0 uses a simple length-prefixed concatenation rather than Protobuf/SSZ.
//! Real production validators will want a stable serialization format
//! (Module 2's `openhl-codec` crate is the natural home for that).

use informalsystems_malachitebft_core_types::{NilOrVal, Round, SignedMessage, VoteType};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, Signature};

use crate::types::{OpenHlProposal, OpenHlVote};
```

各 import の用途:
- `NilOrVal, Round, VoteType` — `OpenHlVote` / `OpenHlProposal` 内に現れる Malachite の型
- `SignedMessage` — メッセージと署名をペアにする Malachite の wrapper
- `PrivateKey, Signature` — Malachite の Ed25519 鍵と署名の型
- 自前の `OpenHlProposal, OpenHlVote` — encoding 対象のメッセージ型

### Step 2: `OpenHlVote` の canonical encoding を書く

これが load-bearing な関数。次に追加:

```rust
/// Canonical bytes that a vote signature commits to.
#[must_use]
pub fn vote_signing_bytes(v: &OpenHlVote) -> Vec<u8> {
    let mut buf = Vec::with_capacity(128);
    buf.extend_from_slice(&v.height.0.to_le_bytes());
    buf.extend_from_slice(&round_to_i64(v.round).to_le_bytes());
    buf.push(match v.vote_type {
        VoteType::Prevote => 0,
        VoteType::Precommit => 1,
    });
    match v.value_id {
        NilOrVal::Nil => buf.push(0),
        NilOrVal::Val(h) => {
            buf.push(1);
            buf.extend_from_slice(&h.0);
        }
    }
    buf.extend_from_slice(&v.address.0);
    buf
}
```

この関数は `OpenHlVote` をバイト列に変換する。**署名はこのバイト列にコミットする。** 悪意ある actor が `Vote` のどのフィールドを変えても signing bytes が変わり、署名検証が失敗し、改ざんされた vote はすべての validator に拒否される。

バイトレイアウトを確認:

| バイト | フィールド | エンコード |
| - | - | - |
| 0..8 | `height` | u64 little-endian |
| 8..16 | `round` | i64 little-endian (round は "round 無し" を表す -1 もありうる) |
| 16 | `vote_type` | 0 = Prevote, 1 = Precommit |
| 17 | `value_id` tag | 0 = Nil, 1 = Val |
| 18..50 (Val の場合) | `value_id` 本体 | BlockHash の 32 バイト |
| 18..38 OR 50..70 | `address` | 20 バイト |

`value_id = Val(...)` のときの 70 バイトの並びをメモリ図にすると、署名対象になるバイト列の正体が 1 枚で見える:

```
【 Vote (Val ケース) の canonical signing-bytes — 全 70 バイト 】

┌────────────────┬────────────────┬───┬───┬───────────────────────────────┬─────────────────────────┐
│   Height (8B)  │   Round (8B)   │Typ│Tag│      Value ID  (32B / hash)    │ Validator Address (20B) │
└────────────────┴────────────────┴───┴───┴───────────────────────────────┴─────────────────────────┘
 0              8               16  17  18                              50                         70  (offset / bytes)
 [── u64 LE ──] [── i64 LE ──]   │   │   [─────── BlockHash 本体 ───────] [───── 20-byte Eth addr ──]
                                 │   │
                                 │   └── 0 = Nil  /  1 = Val            (※ Nil なら本体 32B は省略され、addr が 18..38 に来る)
                                 └────── 0 = Prevote  /  1 = Precommit

  どの validator が、どの host (x86 / ARM / RISC-V / …) でこの関数を走らせても、
  上の 70 バイトは **完全に同一** に生成される ─ 1 バイトのズレも許されない。
  この 70 バイトが「Ed25519 が署名するメッセージ」そのものになる。
```

**なぜ little-endian?** x86 / ARM ホストでの慣習だからだ。**なぜ tag バイトを付ける?** `NilOrVal::Nil` は 1 バイト (tag 0)、`NilOrVal::Val` は 33 バイト (tag 1 + 32 バイトのハッシュ) になる。Tag があるので、パーサがどちらか判別できる。**なぜ validator address を含めるのか?** Vote は **どの** vote かだけでなく **誰の** vote かも表すからだ。同じ proposal に対して 100 人の validator が vote すれば、それぞれ別の signing-bytes 文字列が生成される。

> 🛑 **やりがちな勘違い。** 「`bincode::serialize(v)` の結果に署名するだけではダメか?」 **ダメだ。** 既製のシリアライゼーション形式は、ライブラリのバージョンが上がると変わりうる — 今日署名するものと明日署名するものが、struct は同一でも違ってしまう可能性がある。**canonical** encoding は自分で 1 バイト単位までコントロールするものだ。本番 chain では encoding を protobuf スキーマで定義するか、ここのように手書きで定義する。どちらにせよ encoding は chain の wire format spec の一部になる。

### Step 3: `OpenHlProposal` の canonical encoding を書く

次に proposal の encoding:

```rust
/// Canonical bytes that a proposal signature commits to.
#[must_use]
pub fn proposal_signing_bytes(p: &OpenHlProposal) -> Vec<u8> {
    let mut buf = Vec::with_capacity(128);
    buf.extend_from_slice(&p.height.0.to_le_bytes());
    buf.extend_from_slice(&round_to_i64(p.round).to_le_bytes());
    buf.extend_from_slice(&p.value.0.0);
    buf.extend_from_slice(&round_to_i64(p.pol_round).to_le_bytes());
    buf.extend_from_slice(&p.address.0);
    buf
}
```

Proposal のレイアウト:

| バイト | フィールド | エンコード |
| - | - | - |
| 0..8 | `height` | u64 LE |
| 8..16 | `round` | i64 LE |
| 16..48 | `value.0.0` | BlockHash の 32 バイト |
| 48..56 | `pol_round` | i64 LE (proof-of-lock round) |
| 56..76 | `address` | 20 バイト |

**`vote_signing_bytes` との違いに注目。** Proposal の value は `NilOrVal` でラップされず、無条件で `BlockHash` だ。Proposal は必ず value を運ぶので、Nil を propose することはない。

**`p.value.0.0` は奇妙に見える。** `.0` アクセスを 2 段重ねている。最初は `OpenHlValue(BlockHash)` から `BlockHash` を取り出し、次に `BlockHash([u8; 32])` から `[u8; 32]` を取り出す。newtype の層ごとに `.0` が必要だ。煩わしいが明示的になる。

### Step 4: `sign_vote` と `sign_proposal` 関数を追加

```rust
#[must_use]
pub fn sign_vote(v: OpenHlVote, sk: &PrivateKey) -> SignedMessage<crate::OpenHlContext, OpenHlVote> {
    let sig = sk.sign(&vote_signing_bytes(&v));
    SignedMessage::new(v, sig)
}

#[must_use]
pub fn sign_proposal(
    p: OpenHlProposal,
    sk: &PrivateKey,
) -> SignedMessage<crate::OpenHlContext, OpenHlProposal> {
    let sig = sk.sign(&proposal_signing_bytes(&p));
    SignedMessage::new(p, sig)
}
```

どちらもメッセージの所有権を取り (通常、呼び出し側は渡したら以降は使わないので)、canonical bytes を生成し、Ed25519 で署名し、`SignedMessage` でラップする。`SignedMessage::new(msg, sig)` は Malachite の標準ペアリングで、署名されたものはすべて `SignedMessage` としてエンジン内を流れる。

`crate::OpenHlContext` は L6 で作った `OpenHlContext` だ。Malachite の `SignedMessage` は context 型と inner message 型に対してジェネリックになっている。

### Step 5: `verify_vote` 関数と `VerifierLike` trait を追加

```rust
/// Verify a vote signature against the public key recorded for `vote.address`.
/// Returns false on bad signature.
#[must_use]
pub fn verify_vote(v: &OpenHlVote, sig: &Signature, public_key: &impl VerifierLike) -> bool {
    public_key.verify_msg(&vote_signing_bytes(v), sig).is_ok()
}

/// Trait shim so consumers can pass `&malachitebft_signing_ed25519::PublicKey`
/// without depending on the underlying `signature` crate's trait surface.
pub trait VerifierLike {
    fn verify_msg(&self, msg: &[u8], sig: &Signature) -> Result<(), VerifyError>;
}

#[derive(Debug)]
pub struct VerifyError;

impl VerifierLike for informalsystems_malachitebft_signing_ed25519::PublicKey {
    fn verify_msg(&self, msg: &[u8], sig: &Signature) -> Result<(), VerifyError> {
        self.verify(msg, sig).map_err(|_| VerifyError)
    }
}

fn round_to_i64(r: Round) -> i64 {
    r.as_i64()
}
```

3 つのピース:

- **`verify_vote`** — `sign_vote` の逆だ。Canonical bytes を再計算し、public key の verify メソッドを呼び、true/false を返す。
- **`VerifierLike` trait** — 「Ed25519 署名を検証できる何か」に対する小さな抽象だ。理由は次のとおり: Malachite の `PublicKey` は `signature::Verifier` trait 経由で検証を提供しているが、こちらの API の利用者にその trait を import させたくない。`VerifierLike` は自前の trait で、`signature::Verifier` への橋渡し impl を 1 つだけ提供する。**呼び出し側からは 1 つの trait に見え、裏で canonical な方に委譲する。**
- **`round_to_i64`** — 1 行ヘルパー。`Round` は Malachite の `i64` wrapper で、`.as_i64()` メソッドで中身を取れる。このヘルパーで包むと呼び出し側が読みやすくなる。

### Step 6: `signing.rs` にテストを 2 個追加

末尾に追加:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OpenHlAddress, OpenHlHeight};
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    #[test]
    fn vote_signature_round_trips() {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let vote = OpenHlVote {
            height: OpenHlHeight(7),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        };
        let signed = sign_vote(vote.clone(), &sk);
        assert!(verify_vote(&vote, &signed.signature, &pk));
    }

    #[test]
    fn vote_signature_is_field_sensitive() {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let vote = OpenHlVote {
            height: OpenHlHeight(7),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        };
        let signed = sign_vote(vote.clone(), &sk);
        // Mutate value_id; signature should no longer verify.
        let mut tampered = vote;
        tampered.value_id = NilOrVal::Val(BlockHash([0x43; 32]));
        assert!(!verify_vote(&tampered, &signed.signature, &pk));
    }
}
```

テスト 2 つ:

- **`vote_signature_round_trips`** — Vote に署名し、検証する。合格。
- **`vote_signature_is_field_sensitive`** — Vote に署名し、コピーの 1 フィールドを変更し、変更後のコピーに対して検証する。失敗するべき。

2 つ目は **load-bearing** なテストだ。**canonical encoding が意味のあるすべてのフィールドに対して敏感である** ことを証明する。encoding が壊れていた (例: `value_id` をバイト列に含め忘れた) 場合、tampered.value_id は異なるが signing bytes は同じになるので、「改ざんされた vote が検証を通った」とテストは失敗する。

### Step 7: `crates/consensus/src/signing_provider.rs` を作成

冒頭:

```rust
//! `SigningProvider` implementation — the trait the Malachite engine plugs in.
//!
//! Holds our private key as state; delegates the actual signing to
//! [`crate::signing`]'s canonical encoding so the wire format and the engine
//! interface stay consistent.

use informalsystems_malachitebft_core_types::{SignedMessage, SigningProvider};
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, PublicKey, Signature};

use crate::context::OpenHlContext;
use crate::signing::{
    proposal_signing_bytes, sign_proposal as sign_proposal_with,
    sign_vote as sign_vote_with, vote_signing_bytes,
};
use crate::types::{OpenHlProposal, OpenHlProposalPart, OpenHlVote};

#[derive(Debug)]
pub struct OpenHlSigningProvider {
    private_key: PrivateKey,
}

impl OpenHlSigningProvider {
    #[must_use]
    pub const fn new(private_key: PrivateKey) -> Self {
        Self { private_key }
    }

    #[must_use]
    pub fn public_key(&self) -> PublicKey {
        self.private_key.public_key()
    }
}
```

構造体は `PrivateKey` を保持する。コンストラクタは外から鍵を受け取る (通常はディスクや環境変数から)。`public_key()` は対応する public key をオンデマンドで導出する — Ed25519 では private key からスカラー乗算で public key を導出でき、ミリ秒オーダーで済む。

`use` ブロックは `signing.rs` から低レベル関数を **`_with` サフィックスを付けたリネーム形式** (`sign_vote as sign_vote_with`、`sign_proposal as sign_proposal_with`) で import する。**なぜリネームするのか?** `SigningProvider` trait 側に `sign_vote` と `sign_proposal` という名前のメソッドがあり、自前ヘルパーを名前衝突なしで呼びたいからだ。`_with` サフィックスは「これは trait メソッドが委譲する先の実装関数」を表すローカル慣習で、特別なマクロや言語機能ではない (上のコードの `as ...` がそのまま新しい名前を作っているだけ)。

### Step 8: `SigningProvider` trait を実装 — 4 つの sign/verify ペア

```rust
impl SigningProvider<OpenHlContext> for OpenHlSigningProvider {
    fn sign_vote(&self, vote: OpenHlVote) -> SignedMessage<OpenHlContext, OpenHlVote> {
        sign_vote_with(vote, &self.private_key)
    }

    fn verify_signed_vote(
        &self,
        vote: &OpenHlVote,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&vote_signing_bytes(vote), signature).is_ok()
    }

    fn sign_proposal(
        &self,
        proposal: OpenHlProposal,
    ) -> SignedMessage<OpenHlContext, OpenHlProposal> {
        sign_proposal_with(proposal, &self.private_key)
    }

    fn verify_signed_proposal(
        &self,
        proposal: &OpenHlProposal,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key
            .verify(&proposal_signing_bytes(proposal), signature)
            .is_ok()
    }

    fn sign_proposal_part(
        &self,
        part: OpenHlProposalPart,
    ) -> SignedMessage<OpenHlContext, OpenHlProposalPart> {
        // ProposalPart is a unit struct in OpenHL (ValuePayload::ProposalOnly mode);
        // sign empty bytes so the type-level contract is honored but no extra
        // information is committed.
        let sig = self.private_key.sign(&[]);
        SignedMessage::new(part, sig)
    }

    fn verify_signed_proposal_part(
        &self,
        _part: &OpenHlProposalPart,
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&[], signature).is_ok()
    }

    fn sign_vote_extension(&self, ext: ()) -> SignedMessage<OpenHlContext, ()> {
        // Vote extensions are unused at v0 (Context::Extension = ()).
        let sig = self.private_key.sign(&[]);
        SignedMessage::new(ext, sig)
    }

    fn verify_signed_vote_extension(
        &self,
        _ext: &(),
        signature: &Signature,
        public_key: &PublicKey,
    ) -> bool {
        public_key.verify(&[], signature).is_ok()
    }
}
```

メソッド 8 個、ペア 4 つ:

- **`sign_vote` / `verify_signed_vote`** — `signing::sign_vote` に委譲 / public key の `verify` を `vote_signing_bytes` 付きで呼ぶ。標準的な形だ。
- **`sign_proposal` / `verify_signed_proposal`** — 同じパターン。
- **`sign_proposal_part` / `verify_signed_proposal_part`** — **空バイトに署名する。** なぜか? `OpenHlProposalPart` は unit struct で、コミットすべきデータが存在しないからだ。空ペイロードに署名しても valid な Ed25519 署名は生成される (private key だけで確定的)。検証は「はい、この provider がこの署名を作った」を確認する。署名に情報量はないが、trait 表面は満たされる。
- **`sign_vote_extension` / `verify_signed_vote_extension`** — proposal_part と同じ。Vote extension は `()` (v0 では未使用) なので、空バイトに署名する。

> 🛑 **やりがちな勘違い。** 「空バイトに署名するのは何か違う気がする — 意味があるのか?」 **意味は、持っていないデータにコミットすることなく trait 表面を満たすことだ。** Malachite エンジンは実行時にこれらのメソッドを呼ぶ。panic したり Error を返したらエンジンがクラッシュする。空バイトに署名して valid な署名を返すことで、「はい、これはこちらからの本物の署名だ。ただし、メッセージの残りの部分以上に追加でコミットしているデータはない」と言えるわけだ。これらの機能を使う本番 chain は実データを入れる。こちらは入れないが、trait 表面はそのまま保たれる。

### Step 9: `signing_provider.rs` にテストを 7 個追加

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValue};
    use informalsystems_malachitebft_core_types::{NilOrVal, Round, VoteType};
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    fn provider() -> (OpenHlSigningProvider, PublicKey) {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        (OpenHlSigningProvider::new(sk), pk)
    }

    fn sample_vote() -> OpenHlVote {
        OpenHlVote {
            height: OpenHlHeight(1),
            round: Round::new(0),
            value_id: NilOrVal::Val(BlockHash([0x42; 32])),
            vote_type: VoteType::Prevote,
            address: OpenHlAddress([0xaa; 20]),
        }
    }

    fn sample_proposal() -> OpenHlProposal {
        OpenHlProposal {
            height: OpenHlHeight(1),
            round: Round::new(0),
            value: OpenHlValue(BlockHash([0x42; 32])),
            pol_round: Round::Nil,
            address: OpenHlAddress([0xaa; 20]),
        }
    }

    #[test]
    fn vote_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let vote = sample_vote();
        let signed = sp.sign_vote(vote.clone());
        assert!(sp.verify_signed_vote(&vote, &signed.signature, &pk));
    }

    #[test]
    fn vote_tamper_detected() {
        let (sp, pk) = provider();
        let vote = sample_vote();
        let signed = sp.sign_vote(vote.clone());
        let mut tampered = vote;
        tampered.value_id = NilOrVal::Val(BlockHash([0x43; 32]));
        assert!(!sp.verify_signed_vote(&tampered, &signed.signature, &pk));
    }

    #[test]
    fn proposal_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let proposal = sample_proposal();
        let signed = sp.sign_proposal(proposal.clone());
        assert!(sp.verify_signed_proposal(&proposal, &signed.signature, &pk));
    }

    #[test]
    fn proposal_tamper_detected() {
        let (sp, pk) = provider();
        let proposal = sample_proposal();
        let signed = sp.sign_proposal(proposal.clone());
        let mut tampered = proposal;
        tampered.value = OpenHlValue(BlockHash([0x99; 32]));
        assert!(!sp.verify_signed_proposal(&tampered, &signed.signature, &pk));
    }

    #[test]
    fn proposal_part_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let part = OpenHlProposalPart;
        let signed = sp.sign_proposal_part(part);
        assert!(sp.verify_signed_proposal_part(&part, &signed.signature, &pk));
    }

    #[test]
    fn vote_extension_sign_verify_round_trips() {
        let (sp, pk) = provider();
        let signed = sp.sign_vote_extension(());
        assert!(sp.verify_signed_vote_extension(&(), &signed.signature, &pk));
    }

    #[test]
    fn signature_from_one_provider_does_not_verify_under_another() {
        let (sp1, _pk1) = provider();
        let (_sp2, pk2) = provider();
        let vote = sample_vote();
        let signed = sp1.sign_vote(vote.clone());
        // Signed by provider 1, verified against provider 2's public key — must fail.
        assert!(!sp1.verify_signed_vote(&vote, &signed.signature, &pk2));
    }
}
```

7 個のテストが表面をカバーする:

| テスト | 何を証明するか |
| - | - |
| `vote_sign_verify_round_trips` | Vote sign/verify ペアが機能する。 |
| `vote_tamper_detected` | 署名後に vote フィールドを変えると検証失敗。 |
| `proposal_sign_verify_round_trips` | Proposal で同じ。 |
| `proposal_tamper_detected` | Proposal で同じ。 |
| `proposal_part_sign_verify_round_trips` | 空バイト署名でも unit struct 型でラウンドトリップする。 |
| `vote_extension_sign_verify_round_trips` | vote_extension で同じ。 |
| `signature_from_one_provider_does_not_verify_under_another` | 暗号学的セキュリティ — 別の鍵が作る署名は交換不可能。 |

最後のテストは **load-bearing なセキュリティ保証** だ: 署名は特定の鍵に紐付く。これがなければ、誰でも別の validator の有効な署名を再利用して偽造できてしまう。

### Step 10: 両モジュールを `lib.rs` に組み込む

`crates/consensus/src/lib.rs` を開く。現在の中身:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
```

2 行追加:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

`pub mod signing;` と `pub mod signing_provider;` でモジュールを公開する。この層では再エクスポートは不要だ — 呼び出し側はフルパスで import する。

## テスト

```bash
cargo test -p openhl-consensus
```

期待される出力:

```
running 14 tests
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok
test signing::tests::vote_signature_is_field_sensitive ... ok
test signing::tests::vote_signature_round_trips ... ok
test signing_provider::tests::proposal_part_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_tamper_detected ... ok
test signing_provider::tests::signature_from_one_provider_does_not_verify_under_another ... ok
test signing_provider::tests::vote_extension_sign_verify_round_trips ... ok
test signing_provider::tests::vote_sign_verify_round_trips ... ok
test signing_provider::tests::vote_tamper_detected ... ok

test result: ok. 14 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

よくあるエラーと対処:

- **`cannot find function 'sign_vote' in module 'super::signing'`** — `lib.rs` に `pub mod signing;` を追加し忘れている。Step 10 を再確認。
- **`error: trait 'SigningProvider' not implemented for 'OpenHlSigningProvider' — missing method 'sign_vote_extension'`** — 8 つのメソッド (sign 4 + verify 4) すべてが必須だ。一部しか実装していないと trait を満たせない。不足分を追加する。
- **`error: type alias 'Extension' is `()` so methods take `ext: ()`** — impl が `ext: ()` (verify では `_ext: &()`) を使っているか確認する。`Extension` のような placeholder ではない。
- **`vote_tamper_detected` テストが逆に失敗する** — Canonical encoding が `value_id` (または別フィールド) をバイト列に含めていない可能性がある。Step 2 を再確認 — 構造体の意味のあるフィールドはすべてバイト列に寄与しなければならない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Canonical encoding は `signing.rs` 側に置き、`serde::Serialize` からは導出しない。** `signing.rs` で自分がコントロールするバイトレベルレイアウトを定義する。なぜか? `serde` のバージョンは Rust edition 更新やライブラリアップグレードで変わりうるが、署名されたメッセージは、異なるバイナリバージョンを走らせている可能性のある validator 間でラウンドトリップしなければならない。Encoding をライブラリの詳細ではなく自分のコードに固定しておけば、wire format は chain の spec の一部になる。

2. **`SigningProvider` は純粋関数 `sign_vote` をラップし、鍵を状態として持つ。** `sign_vote` を `OpenHlSigningProvider` のメソッドにすることもできた。分離することで、**テスト** や **内部コード** は `sign_vote(vote, &sk)` を直接呼び (鍵を引数で渡す)、**Malachite エンジン** は trait メソッド `sp.sign_vote(vote)` を使える (provider が保持する鍵にバインドされている)。**同じロジックを、重複なく両方のユースケースに提供できる。**

3. **ProposalPart と Extension の空バイト署名。** Trait 表面がメソッドを要求するが、chain がその機能を使わない場合は、空データに対する確定的で検証可能な署名を提供する。これで、持っていないデータにコミットすることなく trait を honor できる。これらの機能を使う本番 chain は実データを入れる。こちらは入れないが、どちらの場合もエンジンはクラッシュしない。

4. **`VerifierLike` shim で依存の漏れを遮断する。** 目的は 1 つだけで、公開 API から外部 crate 依存を隠すことだ。`verify_vote` が `signature::Verifier` を直接呼ぶと、こちらの crate 利用者まで `signature` trait を意識することになる。上流が別ライブラリへ差し替わった瞬間、下流にも breaking change が波及する。  
`VerifierLike` を 1 枚かませれば、外部依存は `signing.rs` の `impl VerifierLike for PublicKey` に閉じ込められる。将来の変更点はそこ 1 箇所で済む。**原則は「自分の公開 API に他人の trait を直接出さない」。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 9e810a7
diff -u ~/code/my-openhl/crates/consensus/src/signing.rs ./crates/consensus/src/signing.rs
diff -u ~/code/my-openhl/crates/consensus/src/signing_provider.rs ./crates/consensus/src/signing_provider.rs
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

Doc コメントの文言には個人差が出てよい。Canonical encoding のバイト順、SigningProvider trait impl (特に何に委譲しているか)、テストパターンは厳密に一致するはず。

`9e810a7` の参照には、後のレッスンで追加するファイル (`runner.rs` の変更) も含まれる。このレッスンでは signing 関連ファイルだけを diff する。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: Nil vote の場合、`vote_signing_bytes` は `vote_type` を含めないのか?**
含める — `vote_type` は `value_id` が Nil でも Val でも常に 1 バイト (0 または 1) になる。条件分岐は `value_id` のためだけにある (Nil なら tag 1 バイト、Val なら tag 1 バイト + ハッシュ 32 バイト)。

**Q: 誤って public key で署名してしまうことはあるか?**
ない — Ed25519 は型で分離されている: `PrivateKey::sign(&[u8]) -> Signature` は存在するが、`PublicKey::sign` は存在しない。型システムが取り違えを防いでくれる。

**Q: ある validator の vote_signing_bytes が別の validator のものと食い違うと何が起きるか?**
両者が同じ proposal に vote する最初の round で chain が fork する。Validator A の署名は A 自身の encoding で検証成功する。Validator B が同じ vote を別の encoding で読むと、署名検証に失敗して vote を拒否する。同じ選挙について別々の集計結果が生まれ、別々の決定 value につながる。**だからこそ encoding は spec の一部であって、実装の詳細ではない。**

**Q: なぜ `OpenHlSigningProvider` は `Clone` を impl しないのか?**
Private key のコピーは明示的に行いたいからだ — `let sp_copy = sp.clone();` は事故的に書きやすい。本当にコピーが必要なら `OpenHlSigningProvider::new(self.private_key.clone())` を使う。`Clone` を切っておけば、private key の複製はまれで可視な操作になる。

## 次のレッスン (L8)

署名の表面が完成した。Malachite から provider にメッセージへの署名を依頼でき、検証はラウンドトリップする。しかし **Malachite はまだネットワーク越しの会話の仕方を知らない** — validator 間で vote を送るには encoding/decoding が必要だ。L8 では `OpenHlCodec` を実装する: ネットワーク転送、write-ahead logging、state sync のために、メモリ内型とバイト列を相互変換する trait だ。L8 終了後にはエンジン起動に必要なものがすべて揃う (codec + signing + context + node config)。同じレッスンで `OpenHlNode` を接続し、`start_engine` が動くことを証明する。
````

---

## Seed ファイルスロット

L7 は Module 4 (CL types) の sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 7 — OpenHlSigningProvider と canonical encoding',
  slug: 'openhl-signing-provider-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 7 — \`OpenHlSigningProvider\` と canonical encoding\n\n...`
},
```

## SHA pinning 規律

L7 が参照する openhl コミット (§答え合わせ):
- `23c2ba4` (multi-validator runner — signing.rs canonical encoding 初出)
- `9e810a7` (Stage 6a: OpenHlSigningProvider trait impl)

この 2 コミットを 1 つの build-along レッスンに統合するのは、両者が概念的に分離不可能だから — canonical encoding なしの SigningProvider trait は不完全で、trait なしの encoding は空っぽ。

## 翻訳セルフレビュー (paste 前)

- **「load-bearing」** は文脈上の意味 (構造を支える / 重要度が高い) で日本語化せず英語のまま保持。プログラマ向けの慣用なので残す。
- **「canonical encoding」** はそのまま (「正規エンコーディング」だと意味が薄まる)。
- **「trait surface」「trait 表面」** は「trait の API 表面」の意で。
- **「forkchoice」「fork」** は専門用語としてそのまま。
- **「sign/verify ペア」「sign/verify ラウンドトリップ」** はそのまま (専門語)。
- **タイトル/コードコメントは英語のまま** (オープンソース実装に英語のままコピーされる前提)。
- **「考えてみよう」「やりがちな勘違い」** は L4-L6 で確立した訳語と統一。
