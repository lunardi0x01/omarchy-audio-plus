#!/usr/bin/env bash
set -uo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

status=0

# model.js is the only part of this plugin testable outside a running
# Omarchy shell -- panel.qml needs qs.Ui/qs.Commons and the omarchy-audio-*
# helpers. See .claude/CLAUDE.md.
echo "== JS (model.js) =="
node --test tests/model.test.js || status=1

exit $status
