#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts
cat > artifacts/incident-double-signer.log <<LOG
2026-05-27T11:00:00Z signer_a pid=101 active
2026-05-27T11:00:05Z signer_b pid=202 active CONFLICT
2026-05-27T11:00:15Z ACTION=freeze_secondary
2026-05-27T11:00:30Z signer_b stopped
2026-05-27T11:00:45Z verify single-writer=PASS
LOG
echo "[ok] simulated double-signer incident -> artifacts/incident-double-signer.log"
