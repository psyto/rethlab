# Building OpenHL Funding — L10 draft (EN) — build-along

> Drafted against openhl SHA `cd94137` (Stage 8b — funding state machine).
> Course: `building-openhl-funding-en` (track: `reth-l1-architect`).

---

## L10 — `openhl-funding-no-catchup-en`

- **Module:** 3 (Clock state machine), sortOrder 2
- **Course-level sortOrder:** 10 (lesson 11 of 12)
- **Duration:** 25 min
- **XP reward:** 50
- **Type:** CONTENT
- **Milestone:** Module 3 complete — entire `crates/funding/` byte-identical to Stage 8b

### Content

````markdown
# Lesson 10 — No-catch-up invariant — the design philosophy in one test

## Goal

Concepts you'll grasp in this lesson:

- **No-catch-up as a fairness invariant** — after a 10-interval gap, settle *once* and advance to `now`; don't replay 10 ticks. Replaying with the current snapshot pummels the losing side 10x for time they couldn't have closed during. Funding's purpose is equilibration, not retroactive enforcement.
- **Advance to `now`, not to `last_settled + interval`** — the deadline resets to the actual settlement timestamp, not to a mathematically next-aligned one. The clock forgets missed intervals entirely; this is the design choice the test pins.
- **Same-`now` second-tick is the strictest possible state-machine test** — no time elapses between the two calls; only the clock's internal state has changed. Catches all implementations that fail to update `last_settled_at` on a late tick.
- **Catch-up policy lives outside the clock** — a caller wanting catch-up writes a wrapper that calls `tick()` repeatedly with snapshots at intermediate historical timestamps. The clock can't do this; it doesn't have access to historical state. The primitive stays minimal; policy stays in the caller.
- **Design philosophy lives in three places: doc, code, test** — module doc names the invariant, `tick()`'s `self.last_settled_at = now` line enforces it, `no_catchup_after_long_gap` proves it. Each location handles a different reader.

Verification:

```bash
cargo test -p openhl-funding
```

…passes 22 tests (21 from L4-L9 + 1 new).

Specific changes:

The new test is **`no_catchup_after_long_gap`** — the milestone test that pins openhl's design choice on what happens when a validator misses multiple intervals.

After L10:
- `crates/funding/` is **byte-identical to Stage 8b** (`cd94137`).
- All 22 tests pass: 20 hand-traced + 2 proptests.
- Module 3 (Clock state machine) is **complete**.
- The funding state machine is **production-shape** as a standalone crate.

The teaching focus is **design philosophy under failure modes**: when the clock falls behind, what's the right semantics? The naive answer (catch up by replaying ticks) is wrong, and L10 explains why.

## Recap

After L9:
- 6 of 7 clock tests pass.
- Both interval-gating sub-invariants verified (boundary, persistence).
- The math composition surfaces correctly through `tick()`.

L9 covered the "normal operation" invariant. L10 covers the "abnormal operation" invariant — what happens when the clock is *late*.

## The scenario

Imagine the openhl chain has been running normally, settling funding every hour. Then something happens:

- Validator reboot (process restart taking 5 minutes).
- Network partition (chain pause for 8 hours while validators reconnect).
- Hardware failure on the leader, fallback validator picks up after 30 minutes.

Whatever the cause, the next `tick()` call has `now - last_settled_at` far exceeding `interval_secs`. **What should the clock do?**

Two design choices:

### Choice A: Catch up

Replay 10 intervals' worth of funding. Each replay uses the *current* mark/index/positions snapshot. Apply 10 settlements in succession.

**Pros**: every interval gets a settlement, the chain "doesn't fall behind."

**Cons**: 
- **Stale-snapshot problem**: all 10 settlements use the *same* current snapshot, not the snapshot at each historical interval boundary. A trader who was winning during the gap pays for 10 settlements all computed from the now-favorable rate. Whichever side has been losing gets pummeled 10x, without ever having had a chance to close their position to escape it.
- **Concentrated risk**: 10x funding at once can liquidate accounts that would have survived 10 separate hourly payments.
- **Path dependency**: the funding history depends on *when* the gap occurred, not just on the cumulative time.

### Choice B: Settle once, advance to `now`

Apply funding *once* at the current snapshot, then advance `last_settled_at` to `now`. The 10 missed intervals are *skipped*, not replayed.

**Pros**:
- **No concentrated punishment**: at most one settlement at the cap per outage.
- **Path-independent**: the result depends only on the current snapshot, not on the gap's timing.
- **External catch-up possible**: a caller wanting catch-up logic can implement it themselves with repeated ticks + fresh snapshots at intermediate timestamps.

**Cons**:
- **Missing revenue**: funding is the equilibration mechanism for the perpetual price; skipping intervals removes pressure on the basis.

**openhl chooses Choice B.** The catch-up logic, if anyone needs it, lives *outside* the clock — built on repeated `tick()` calls with snapshots at the right historical times.

> 🛑 **Predict.** Before scrolling: a validator that missed 10 hours of funding due to a node reboot tries to make up for lost time by replaying 10 ticks from the *current* snapshot. **Which kind of trader gets hurt the most by this approach?** Hint: think about who's been losing during the gap.

(Answer: **The losing side gets pummeled 10x.** During a 10-hour gap, suppose mark drifted high relative to index — longs have been overpaying in the "real" world. Choice A replays 10 settlements at the *current* rate, all charging longs. The trader who was already on the losing side of the basis pays 10x what they would have if funding had been applied hourly. Worse, they couldn't have closed their position during the gap (the chain was paused); the catch-up appears to charge them retroactively for time they had no agency. **Choice B says: skip the 10 missed payments and start fresh now. Bad for funding revenue; fair to traders.**)

## Plan

One file edit:

1. **Append `no_catchup_after_long_gap` to `crates/funding/src/clock.rs`** — inside the existing `#[cfg(test)] mod tests` block, after the L9 tests.

No production code, no `lib.rs` changes.

## Walk-through

### Step 1: Add the milestone test

After `capped_rate_when_premium_extreme`, add:

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

**Two parts.** Each pins a separate sub-property of the no-catch-up invariant.

#### Part 1: settle once after long gap

```rust
        let way_later = 1_000_000 + 10 * 3600;
        let out = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(out.is_some(), "elapsed >> interval → tick fires");
        assert_eq!(clock.last_settled_at(), way_later);
```

The setup: genesis at `1_000_000`, then tick at `1_036_000` (= `1_000_000 + 10 × 3600`). Ten full intervals have elapsed.

**Two assertions:**

1. **`out.is_some()`** — the tick *does* fire. We don't skip it just because it's late. **Choice B isn't "skip everything" — it's "settle once."**

2. **`clock.last_settled_at() == way_later`** — and *crucially*, the clock advances to `now`, not to `1_000_000 + 3600` (one interval after genesis) or `1_000_000 + 10*3600` (ten intervals after genesis — same number but for different reasons). **The clock forgets the missed intervals entirely.**

> 🛑 **Anti-fluency.** "Why doesn't the test also check that there's only one entry in `out.settlements`?" **Because the settlements count depends on positions, not on the gap.** With `balanced_book()` (long 100, short -100), we get 2 settlements regardless of gap length. The test's job is to verify *one tick* fires, not how many settlements that tick produces. **Test the tick count; settlement count is a separate concern.**

#### Part 2: no re-fire at same `now`

```rust
        let again = clock.tick(way_later, MarkPrice(101), IndexPrice(100), &balanced_book());
        assert!(again.is_none(), "no duplicate settlement at same now");
```

After the long-gap tick, immediately call `tick` again at the *same* `now`. **It must return `None`.** This proves the interval-gating invariant still holds after a late tick — we can't get a double settlement by calling tick twice in a row.

**Why is this assertion important?** Because without it, a buggy implementation could:
- Detect "elapsed time >> interval" and decide "fire continuously until we catch up" (the buggy version of catch-up).
- Forget to update `last_settled_at` on the long-gap tick, so subsequent ticks at the same `now` keep firing.

**The same `now` is the strictest possible test.** No time has passed between the two ticks; only the clock's internal state has changed. If `last_settled_at == way_later` (from Part 1), then the guard `now < last_settled_at + interval` becomes `way_later < way_later + 3600`, which is `0 < 3600`, which is true — so `tick` correctly returns `None`.

### Step 2: Run tests

```bash
cargo test -p openhl-funding
```

Expected:

```
running 22 tests
test clock::tests::capped_rate_when_premium_extreme ... ok
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test clock::tests::no_catchup_after_long_gap ... ok
test clock::tests::premium_drives_settlement_signs ... ok
test clock::tests::second_tick_requires_another_full_interval ... ok
... (15 tests from L4-L7)

test result: ok. 22 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**22 tests, all green.** Module 3 closes. `crates/funding/` is byte-identical to Stage 8b.

Common errors:

- **`Part 1 fails: `out.is_none()`** — your guard's comparison is wrong direction. Re-check: `if now < last_settled_at + interval { return None; }`. At `now = 1_036_000` and `last_settled_at = 1_000_000`, `now < 1_003_600` is false, so the guard doesn't return; the tick fires.
- **`Part 1 fails: `last_settled_at() != way_later`** — you advanced the clock to something other than `now`. Re-check the line `self.last_settled_at = now;` near the end of `tick()`. Common typo: `self.last_settled_at = self.last_settled_at + self.params.interval_secs;` (catch-up version) or `self.last_settled_at += self.params.interval_secs;` (similarly wrong).
- **Part 2 fails: `again.is_some()`** — `last_settled_at` wasn't updated on Part 1's tick. The Part 2 tick at the same `now` finds the gate at `genesis + interval` (still satisfied), so it fires erroneously. Re-check the Part 1 assignment.

## Design reflection

Four load-bearing decisions in this lesson:

1. **Settle once on long gaps, advance to `now`.** The alternative (catch up by replaying intervals) creates concentrated punishment for the losing side without giving them the chance to close. Funding's purpose is *equilibration*, not retroactive enforcement. **Choice B aligns the math with fairness, at the cost of some funding revenue.**

2. **The same-`now` second-tick test is the strictest possible.** No time elapses; only state has changed. Catches all implementations that fail to update `last_settled_at` on a late tick. **For state machines, "same input, repeated call" reveals state-update bugs.**

3. **Catch-up logic lives outside the clock.** A caller wanting catch-up can call `tick()` repeatedly with snapshots at intermediate historical timestamps. **The clock is the primitive; the policy is the caller's.**

4. **Design philosophy lives in documentation + tests.** The clock's module doc names the invariant; this test enforces it; the test comments + this lesson explain *why*. **Three places to find the rationale: doc, code, test.**

## Answer key

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/ ./crates/funding/ --recursive
```

After L10, `crates/funding/` is **byte-identical to Stage 8b**. The diff is empty.

**Module 3 closes.** Module 4 (capstone) is L11.

Return:

```bash
git checkout main
```

## Common questions

**Q: What if I want catch-up semantics? Can I configure it?**
Not from inside the clock. You'd have to write a wrapper that calls `tick()` repeatedly with snapshots at historical intermediate timestamps:

```rust
// Pseudocode for an external catch-up wrapper:
while clock.last_settled_at() + interval < now {
    let next_target = clock.last_settled_at() + interval;
    let historical_snapshot = fetch_snapshot_at(next_target);  // !!! complex !!!
    clock.tick(next_target, historical_snapshot.mark, ...);
}
clock.tick(now, current_snapshot.mark, ...);
```

The hard part is `fetch_snapshot_at(historical_timestamp)` — the caller has to know what mark/index/positions looked like at past times. **That's why catch-up isn't in the clock: it requires historical state the clock doesn't have.** The application layer (which has the chain database) can do it.

**Q: How long can the gap be before `way_later` overflows?**
`u64::MAX` seconds is roughly `5.8 × 10^11` years — well past heat death. The `saturating_add` in the guard handles `last_settled_at` near `u64::MAX`, but in practice we don't reach that regime. **The pathological case is the guard's responsibility; the realistic case is the design's.**

**Q: What if `mark` and `index` are both reasonable values at `way_later`, but the *gap* was caused by mark/index oracle being unavailable?**
The clock doesn't know about oracle staleness. If you call `tick()` with a stale mark, you get funding based on the stale data. **Oracle freshness is the caller's responsibility.** Production deployments add an oracle-staleness check before calling `tick()` — and skip the call if the oracle is too old. The skip happens above the clock; the clock just trusts its inputs.

**Q: Should we add a warning log when a long-gap tick happens?**
Logging is a side effect. The clock is pure (no I/O). A wrapper can log the gap if it cares: `if elapsed > 2*interval { log!("late tick: {} hours behind", elapsed/3600); }`. **Keep the primitive pure; let the wrapper observe.**

## Module 3 milestone — what you've built

After L10:
- **Module 3 complete.** Clock state machine + 7 tests covering interval-gating, no-catch-up, math composition, cap surfacing.
- **Entire crate byte-identical to Stage 8b.** ~635 LOC across types.rs / compute.rs / clock.rs.
- **22 tests** total: 20 hand-traced + 2 proptest.
- **Zero rustdoc warnings.**

The funding state machine is now a **complete, tested, production-shape** crate. It computes funding deterministically, gates on the right cadence, and refuses to introduce path-dependent settlements after gaps.

What's left:
- **Module 4 (Capstone, L11)** — synthesis, deferred items, bridge-integration preview. No code.
- **Future course** — wiring this crate into the bridge (oracle integration, balance updates, liquidation triggers).

## Next lesson (L11)

L11 is the capstone — no new code. We sketch the architecture, name the items deferred from this course (oracle integration, balance updates, liquidations, multi-market funding, funding-as-EVM-event), and trace where each will live when shipped. The lesson is for cementing the mental model and seeing the funding state machine as a piece of the larger openhl architecture.
````

---

## Seed-file slot

L10 lands in Module 3 at sortOrder 2 (closes the module):

```typescript
{
  title: 'Lesson 10 — No-catch-up invariant — the design philosophy in one test',
  slug: 'openhl-funding-no-catchup-en',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 25,
  xpReward: 50,
  content: `# Lesson 10 — No-catch-up invariant — the design philosophy in one test\n\n...`
},
```

## SHA pinning discipline

L10 cites `cd94137` (Stage 8b). After L10, `crates/funding/` is byte-identical to Stage 8b. **Stage 8b reproduced in full.** Module 3 closes; L11 is the capstone synthesis.

## Style review notes (self-critique before paste)

- **§Goal frames L10 as the Module 3 milestone** with the byte-identical-to-Stage-8b achievement.
- **§The scenario** establishes the failure mode concretely (reboot, partition, hardware failure) before discussing the design choice.
- **§Choice A / Choice B** lays out the alternatives explicitly with pros/cons, making the design choice debatable rather than dogmatic.
- **§Predict on "which trader gets hurt most"** earns the fairness argument — readers reason through who suffers from concentrated catch-up.
- **§Step 1 splits the test into two parts** with separate sub-property analysis.
- **§Anti-fluency on settlements-count** preempts the test-scope reflex.
- **§Step 1 Part 2 explains why same-`now` is the strictest test**.
- **§Design reflection 1-4** name distinct patterns (settle-once-vs-catch-up, same-input-reveals-state, policy-outside-primitive, philosophy-in-three-places).
- **§Common questions** address external catch-up implementation, overflow, oracle staleness, logging.
- **§Module 3 milestone summary** celebrates the byte-identical achievement.
- **L11 preview** is concrete: no code, synthesis, deferred items.
