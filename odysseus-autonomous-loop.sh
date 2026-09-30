#!/bin/bash

PROJECT_DIR="/Users/connormurphy/Documents/RPL/run-pace-logic_current"
LOG_FILE="$PROJECT_DIR/odysseus-autonomous-loop.log"

cd "$PROJECT_DIR" || exit 1

echo "==================================================" >> "$LOG_FILE"
echo "Autonomous Loop Triggered: $(date)" >> "$LOG_FILE"
echo "==================================================" >> "$LOG_FILE"

# Check if there are unchecked roadmap items
if grep -q "\[ \]" ROADMAP.md; then
    NEXT_TASK=$(grep "\[ \]" ROADMAP.md | head -n 1)
    echo "[INFO] Found next task: $NEXT_TASK" >> "$LOG_FILE"

    # Run local Aider session with qwen2.5-coder:7b targeting the task
    aider --model ollama_chat/qwen2.5-coder:7b \
          --message "You are Odysseus, the autonomous engineering agent for TrainPaceLab. Read ROADMAP.md, find the first unchecked item, implement the required code changes, run 'npm run build' to verify stability, mark that item as completed (change [ ] to [x]) in ROADMAP.md, and ensure everything is clean." \
          --yes-always \
          --no-auto-commits >> "$LOG_FILE" 2>&1

    # Verify build and sync to Git
    echo "[INFO] Running post-agent build check..." >> "$LOG_FILE"
    if npm run build >> "$LOG_FILE" 2>&1; then
        echo "[SUCCESS] Build passed! Committing and pushing progress..." >> "$LOG_FILE"
        git add .
        git commit -m "feat(odysseus): resolved $(echo "$NEXT_TASK" | cut -d'-' -f1) - $(date +'%Y-%m-%d %H:%M')"
        git push origin main >> "$LOG_FILE" 2>&1
        echo "[SUCCESS] Pushed latest milestone to main." >> "$LOG_FILE"
    else
        echo "[WARNING] Build failed after agent changes. Reverting working tree for safety..." >> "$LOG_FILE"
        git checkout . >> "$LOG_FILE" 2>&1
    fi
else
    echo "[INFO] All roadmap items are checked off! Loop resting." >> "$LOG_FILE"
fi

echo "Cycle completed at $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
