#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts
cp -f ../runbook-template.md artifacts/validator-ops-runbook.md
cat > artifacts/metrics-baseline.json <<JSON
{
  "participation_rate": 0.996,
  "head_lag_slots": 1,
  "import_p99_ms": 1200,
  "peer_count": 48
}
JSON
echo "[ok] lab initialized"
