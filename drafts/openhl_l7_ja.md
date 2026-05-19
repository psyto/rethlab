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

このレッスンの終わりに:

```bash
cargo test -p openhl-consensus
```

…が **14 個のテストすべてに合格する** (L6 の Context impl から 5 個 + 署名と SigningProvider の新規 9 個)。Malachite が Ed25519 署名を chain に組み込むのに必要な 2 つのファイルが揃う:

- **`crates/consensus/src/signing.rs`** — vote と proposal の canonical byte encoding、および低レベルの sign/verify 関数
- **`crates/consensus/src/signing_provider.rs`** — validator の private key を保持し、Malachite の `SigningProvider<OpenHlContext>` trait を実装する `OpenHlSigningProvider` 構造体

9 個の新規テストがカバーするもの: 4 種類すべての署名対象型 (vote, proposal, proposal_part, vote_extension) について sign/verify ラウンドトリップ、vote と proposal の改ざん検出、別 provider 間の署名検証拒否。

## おさらい

L6 完了時点で `openhl-consensus` crate には以下がある:

```
crates/consensus/src/lib.rs   — pub mod bridge, context, types
crates/consensus/src/types/   — 7 個の型ファイル + mod.rs
crates/consensus/src/context.rs — OpenHlContext + Context impl + テスト 5 個
```

`cargo test -p openhl-consensus` でテスト 5 個が合格する。**署名はまだ一切存在しない** — vote と proposal は構築できるが、コードベース内のどこにもそれらに対して署名を生成・検証する処理がない。

## 計画

5 つやる:

1. **`crates/consensus/src/signing.rs` を作成** — `OpenHlVote` と `OpenHlProposal` の canonical byte encoding 関数、低レベルの `sign_vote` / `sign_proposal` / `verify_vote` 関数、`VerifierLike` trait shim、ユニットテスト 2 個。
2. **`crates/consensus/src/signing_provider.rs` を作成** — `PrivateKey` を保持する `OpenHlSigningProvider` 構造体、8 メソッドの `impl SigningProvider<OpenHlContext>` (4 つの sign/verify ペア)、ユニットテスト 7 個。
3. **両モジュールを `lib.rs` に配線** — `pub mod signing; pub mod signing_provider;` を追加。
4. **Cargo.toml の変更なし** — `informalsystems-malachitebft-signing-ed25519` は L6 で `rand` feature 付きで追加済み、追加要件なし。
5. **実行** — `cargo test -p openhl-consensus` で 14 個全部合格。

このレッスンが教えるのは **2 つのパターン**:

- **Canonical encoding** — 型付きメッセージを、すべての validator が同一に計算する確定的なバイト列に変換する。署名は **構造体** ではなく **バイト列** にコミットする。フィールドの encoding が変わると署名が検証できなくなる。
- **Trait 同士の配線** — Malachite の `SigningProvider` は、`signing.rs` の低レベル署名ロジックを **ラップする** trait。Provider は実行時状態 (鍵) を持ち、状態を持たない純粋関数に処理を委譲する。これは `ConsensusBridge` (trait) vs `InMemoryEvmBridge` (それを impl する構造体) と同じ分離パターン。

> 🛑 **予測してみよう。** スクロールする前に: `Vote` の canonical encoding は、どのフィールドを含む必要があるか? ヒント: 署名が何にコミットしているかを考える。コンセンサスにとって意味のある違いがある 2 つの vote について、その signing bytes が異なっていなければ、片方に対する有効な署名が、もう片方に対しても検証できてしまう。攻撃者は vote を replay または swap できる。

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

この関数は `OpenHlVote` をバイト列に変換する。**署名はこのバイト列にコミットする。** 悪意ある actor が `Vote` のどのフィールドを変えても、signing bytes が変わり、署名検証が失敗し、改ざんされた vote はすべての validator に拒否される。

バイトレイアウトを確認:

| バイト | フィールド | エンコード |
| - | - | - |
| 0..8 | `height` | u64 little-endian |
| 8..16 | `round` | i64 little-endian (round は "round 無し" を表す -1 もありうる) |
| 16 | `vote_type` | 0 = Prevote, 1 = Precommit |
| 17 | `value_id` tag | 0 = Nil, 1 = Val |
| 18..50 (Val の場合) | `value_id` 本体 | BlockHash の 32 バイト |
| 18..38 OR 50..70 | `address` | 20 バイト |

**なぜ little-endian?** x86 / ARM ホストでの慣習。**なぜ tag バイトを付ける?** `NilOrVal::Nil` は 1 バイト (tag 0) なのに対し、`NilOrVal::Val` は 33 バイト (tag 1 + 32 バイトのハッシュ) になる。Tag があるからパーサがどちらか判別できる。**なぜ validator address を含める?** Vote は **どの** vote かだけでなく **誰の** vote かも問う。同じ proposal に対して 100 人の validator が vote すれば、それぞれ別の signing-bytes 文字列が生成される。

> 🛑 **やりがちな勘違い。** 「`bincode::serialize(v)` で結果に署名するだけじゃダメ?」 **ダメ。** 既製のシリアライゼーション形式はライブラリのバージョンが上がると変わりうる — 今日署名するものと明日署名するものが、struct は同一でも違ってしまう可能性がある。**Canonical** encoding は自分が 1 バイト単位でコントロールするもの。本番 chain は encoding を protobuf スキーマで定義するか、ここのように手書きで定義する。どちらにせよ、encoding は chain の wire format spec の一部になる。

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

**`vote_signing_bytes` との違いに注目:** Proposal の value は `NilOrVal` でラップされず、無条件で `BlockHash`。Proposal は必ず value を運ぶ。Nil を propose することはない。

**`p.value.0.0` が奇妙に見える。** `.0` アクセスを 2 段つないでいる。最初は `OpenHlValue(BlockHash)` から `BlockHash` を取り出し、次は `BlockHash([u8; 32])` から `[u8; 32]` を取り出す。newtype の層ごとに `.0` が必要。煩わしいが明示的。

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

どちらもメッセージの所有権を取り (通常の呼び出し側は渡したら以降使わないので)、canonical bytes を生成し、Ed25519 で署名し、`SignedMessage` でラップする。`SignedMessage::new(msg, sig)` は Malachite の標準ペアリング — 署名されたものはすべて `SignedMessage` としてエンジン内を流れる。

`crate::OpenHlContext` は L6 で作った `OpenHlContext`。Malachite の `SignedMessage` は context 型と inner message 型に対してジェネリック。

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

- **`verify_vote`** — `sign_vote` の逆。Canonical bytes を再計算し、public key の verify メソッドを呼び、true/false を返す。
- **`VerifierLike` trait** — 「Ed25519 署名を検証できる何か」に対する小さな抽象。理由: Malachite の `PublicKey` は `signature::Verifier` trait 経由で検証を提供しているが、自分の API の利用者にその trait を import させたくない。`VerifierLike` は自前の trait で、`signature::Verifier` への橋渡し impl を 1 つだけ提供する。**呼び出し側からは 1 つの trait に見え、裏で canonical な方に委譲する。**
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

2 つ目は **load-bearing** なテスト。**Canonical encoding が、意味のあるすべてのフィールドに対して敏感である** ことを証明する。encoding が壊れていた (例: `value_id` をバイト列に含め忘れた) 場合、tampered.value_id は異なるが signing bytes は同じになるため、テストは「改ざんされた vote が検証を通った」と失敗する。

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

構造体は `PrivateKey` を保持する。コンストラクタは外から鍵を受け取る (通常はディスクや環境変数から)。`public_key()` は対応する public key をオンデマンドで導出する — Ed25519 では public key は private key からスカラー乗算で導出可能で、ミリ秒オーダー。

`use` ブロックは `signing.rs` から低レベル関数を `as sign_X_with` リネーム付きで import する。**なぜリネーム?** `SigningProvider` trait に `sign_vote` と `sign_proposal` という名前のメソッドがあり、自前ヘルパーを名前衝突なしで呼びたいから。`_with` サフィックスは「これは trait メソッドが委譲する先の実装関数」を表す慣習。

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

- **`sign_vote` / `verify_signed_vote`** — `signing::sign_vote` に委譲 / public key の `verify` を `vote_signing_bytes` 付きで呼ぶ。標準。
- **`sign_proposal` / `verify_signed_proposal`** — 同じパターン。
- **`sign_proposal_part` / `verify_signed_proposal_part`** — **空バイトに署名する。** なぜか? `OpenHlProposalPart` は unit struct で、コミットすべきデータが存在しない。空ペイロードに署名しても valid な Ed25519 署名は生成される (private key 単独で確定的)。検証は「はい、この provider がこの署名を作った」を確認する。署名に情報量はないが、trait 表面は満たされる。
- **`sign_vote_extension` / `verify_signed_vote_extension`** — proposal_part と同じ。Vote extension は `()` (v0 では未使用) なので空バイトに署名する。

> 🛑 **やりがちな勘違い。** 「空バイトに署名するのは何か違う気がする — 意味あるの?」 **意味は、持っていないデータにコミットすることなく trait 表面を満たすこと。** Malachite エンジンは実行時にこれらメソッドを呼ぶ。panic したり Error を返したらエンジンがクラッシュする。空バイトに署名して valid な署名を返すことで、「はい、これは我々からの本物の署名です。ただし、メッセージの残りの部分以上に追加でコミットしているデータはありません」と言える。これら機能を使う本番 chain は実データを入れる。我々は入れないが、trait 表面はそのまま保たれる。

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

最後のテストが **load-bearing なセキュリティ保証**: 署名は特定の鍵に紐付く。これがなければ、誰でも別の validator の有効な署名を再利用して偽造できてしまう。

### Step 10: 両モジュールを `lib.rs` に配線

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

`pub mod signing;` と `pub mod signing_provider;` でモジュールを公開。この層では再エクスポートは不要 — 呼び出し側はフルパスで import する。

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
- **`error: trait 'SigningProvider' not implemented for 'OpenHlSigningProvider' — missing method 'sign_vote_extension'`** — 8 メソッド (sign 4 + verify 4) すべてが必須。一部しか実装していないと trait が満たされない。不足分を追加。
- **`error: type alias 'Extension' is `()` so methods take `ext: ()`** — impl が `ext: ()` (verify では `_ext: &()`) を使っていることを確認。`Extension` のような placeholder ではない。
- **`vote_tamper_detected` テストが逆に失敗する** — Canonical encoding が `value_id` (または別フィールド) をバイト列に含めていない可能性。Step 2 を再確認 — 構造体の意味のあるフィールドはすべてバイト列に寄与しなければならない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Canonical encoding は `signing.rs` にあり、`serde::Serialize` から導出しない。** `signing.rs` が自分でコントロールするバイトレベルレイアウトを定義する。なぜか? `serde` のバージョンは Rust edition 更新やライブラリアップグレードで変わりうるが、署名されたメッセージは異なるバイナリバージョンを走らせている可能性のある validator 間でラウンドトリップしなければならない。Encoding をライブラリ詳細ではなくコード (ライブラリ依存ではない) に固定すると、wire format は chain の spec の一部になる。

2. **`SigningProvider` は純粋関数 `sign_vote` をラップし、鍵を状態として持つ。** `sign_vote` を `OpenHlSigningProvider` のメソッドにすることもできた。分離することで、**テスト** や **内部コード** は `sign_vote(vote, &sk)` を直接呼べ (鍵を引数で渡す)、**Malachite エンジン** は trait メソッド `sp.sign_vote(vote)` を使える (provider が保持する鍵にバインド)。**同じロジックが両方のユースケースを重複なく提供する。**

3. **ProposalPart と Extension の空バイト署名。** Trait 表面がメソッドを要求するが、chain がその機能を使わない場合、空データに対する確定的で検証可能な署名を提供する。これは、持っていないデータにコミットすることなく trait を honor する。これら機能を使う本番 chain は実データを入れる。我々は入れないが、どちらの場合もエンジンはクラッシュしない。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 9e810a7
diff -u ~/code/my-openhl/crates/consensus/src/signing.rs ./crates/consensus/src/signing.rs
diff -u ~/code/my-openhl/crates/consensus/src/signing_provider.rs ./crates/consensus/src/signing_provider.rs
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

Doc コメントの文言には個人差が出てよい。Canonical encoding のバイト順、SigningProvider trait impl (特に何に委譲しているか)、テストパターンが厳密に一致していること。

`9e810a7` の参照には後のレッスンで追加する追加ファイル (`runner.rs` の変更) も含まれる。このレッスンでは signing 関連ファイルだけ diff する。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: Nil vote の場合 `vote_signing_bytes` は `vote_type` を含めないのか?**
含める — `vote_type` は `value_id` が Nil でも Val でも常に 1 バイト (0 または 1)。条件分岐は `value_id` のためだけ (Nil なら tag 1 バイト、Val なら tag 1 バイト + ハッシュ 32 バイト)。

**Q: 誤って public key で署名してしまうことはあるか?**
ない — Ed25519 は型で分離している: `PrivateKey::sign(&[u8]) -> Signature` は存在するが、`PublicKey::sign` は存在しない。型システムが取り違えを防ぐ。

**Q: ある validator の vote_signing_bytes が別の validator のと食い違うと何が起きる?**
両者が同じ proposal に vote する最初の round で chain が fork する。Validator A の署名は A 自身の encoding で検証成功。Validator B が同じ vote を別 encoding で読むと、署名検証失敗で vote を拒否。同じ選挙について別々の集計結果を生み、別々の決定 value につながる。**だから encoding は spec の一部であり、実装の詳細ではない。**

**Q: なぜ `OpenHlSigningProvider` は `Clone` を impl しないのか?**
Private key のコピーは明示的に行いたい — `let sp_copy = sp.clone();` は事故的に書きやすい。本当にコピーが必要なら `OpenHlSigningProvider::new(self.private_key.clone())` を使う。`Clone` を切ることで private key の複製はまれで可視になる。

## 次のレッスン (L8)

署名表面が完成した。Malachite が provider にメッセージへの署名を依頼でき、検証はラウンドトリップする。しかし **Malachite はまだネットワーク越しの会話の仕方を知らない** — validator 間で vote を送るには encoding/decoding が必要。L8 では `OpenHlCodec` を実装する: ネットワーク転送、write-ahead logging、state sync のためにメモリ内型とバイト列を相互変換する trait。L8 終了後、エンジン起動に必要なものはすべて揃う (codec + signing + context + node config); 同じレッスンで `OpenHlNode` を配線し、`start_engine` が動くことを証明する。
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
- **「予測してみよう」「やりがちな勘違い」** は L4-L6 で確立した訳語と統一。
