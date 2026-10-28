#!/bin/bash
# restarts the mock backend (fresh data) and runs the end-to-end test
cd "$(dirname "$0")/.."
for p in $(pgrep -f "node backend/mock_server"); do kill $p; done
sleep 0.5
node backend/mock_server.js 8790 > tests/out/mock.log 2>&1 &
sleep 1.5
node tests/e2e.js
