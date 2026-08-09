#!/usr/bin/env bash
# 轮询 GitHub Actions 运行状态直到完成
RUN_ID="${1:-31300815981}"
REPO="1dwz/codium-lite"
while true; do
  S=$(gh run view "$RUN_ID" --repo "$REPO" --json status --jq '.status' 2>&1)
  echo "$(date +%H:%M:%S) status=$S"
  if [ "$S" != "in_progress" ] && [ "$S" != "queued" ]; then
    echo "DONE: $S"
    gh run view "$RUN_ID" --repo "$REPO" --json conclusion --jq '.conclusion'
    break
  fi
  sleep 120
done
