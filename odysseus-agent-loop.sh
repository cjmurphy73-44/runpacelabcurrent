#!/bin/bash

# Configuration
PROJECT_DIR="/Users/connormurphy/Documents/RPL/run-pace-logic_current"
LOG_FILE="$PROJECT_DIR/odysseus-automation.log"

cd "$PROJECT_DIR" || exit 1

echo "==================================================" >> "$LOG_FILE"
echo "Odysseus Free Local Agent Loop Triggered: $(date)" >> "$LOG_FILE"
echo "==================================================" >> "$LOG_FILE"

# 1. Check if there are tasks left in ROADMAP.md
if ! grep -q "\[ \]" ROADMAP.md; then
    echo "[INFO] No unchecked roadmap items found. Loop resting." >> "$LOG_FILE"
    exit 0
fi

# 2. Extract the next uncompleted task
NEXT_TASK=$(grep -m 1 "\[ \]" ROADMAP.md)
echo "[INFO] Autonomous Target Acquired: $NEXT_TASK" >> "$LOG_FILE"

# 3. Run Aider using your local Ollama coder model non-interactively
echo "Running local AI agent implementation..." >> "$LOG_FILE"
aider --model ollama/qwen2.5-coder:7b --message "Read ROADMAP.md, find the first unchecked task, implement the code changes required in the codebase, run npm run build to verify, and mark the task as complete [x] in ROADMAP.md." --yes-always >> "$LOG_FILE" 2>&1

# 4. Verify build integrity
echo "Verifying production build..." >> "$LOG_FILE"
npm run build >> "$LOG_FILE" 2>&1
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "[SUCCESS] Build passed cleanly after local AI iteration." >> "$LOG_FILE"
    
    # 5. Commit and push progress to main
    if [[ -n $(git status -s) ]]; then
        echo "Committing and pushing AI progress to main..." >> "$LOG_FILE"
        git add .
        git commit -m "feat(odysseus): autonomous local AI milestone - $(date +'%Y-%m-%d %H:%M')"
        git push origin main >> "$LOG_FILE" 2>&1
        echo "[SUCCESS] Pushed latest progress to main." >> "$LOG_FILE"
    else
        echo "[INFO] Working tree clean. No changes produced by local agent." >> "$LOG_FILE"
    fi
else
    echo "[WARNING] Build failed following local AI changes. Reverting changes for safety..." >> "$LOG_FILE"
    git checkout . >> "$LOG_FILE" 2>&1
fi

echo "Cycle completed at $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
