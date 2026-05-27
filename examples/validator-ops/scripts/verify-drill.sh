#!/usr/bin/env bash
set -euo pipefail
required=(
  artifacts/validator-ops-runbook.md
  artifacts/incident-head-lag.log
  artifacts/incident-double-signer.log
  artifacts/rollback-drill.log
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || { echo "[fail] missing $f"; exit 1; }
done
grep -q "ALERT=PAGE" artifacts/incident-head-lag.log || { echo "[fail] no page alert"; exit 1; }
grep -q "single-writer=PASS" artifacts/incident-double-signer.log || { echo "[fail] no single-writer pass"; exit 1; }
grep -q "recovery PASS" artifacts/rollback-drill.log || { echo "[fail] rollback not recovered"; exit 1; }
echo "[pass] validator-ops simulation checks passed"
