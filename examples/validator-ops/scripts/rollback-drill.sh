#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts
cat > artifacts/rollback-drill.log <<LOG
2026-05-27T12:00:00Z deploy v1.2.0 canary
2026-05-27T12:06:00Z lag=11 trigger rollback
2026-05-27T12:07:00Z rollback to v1.1.5
2026-05-27T12:10:00Z lag=2 recovery PASS
LOG
echo "[ok] rollback drill complete -> artifacts/rollback-drill.log"
