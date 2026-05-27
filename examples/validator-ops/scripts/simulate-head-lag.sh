#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts
cat > artifacts/incident-head-lag.log <<LOG
2026-05-27T10:00:00Z lag=2
2026-05-27T10:01:00Z lag=4
2026-05-27T10:02:00Z lag=9 ALERT=PAGE
2026-05-27T10:03:00Z lag=10 ALERT=PAGE
LOG
echo "[ok] simulated head lag incident -> artifacts/incident-head-lag.log"
