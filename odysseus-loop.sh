#!/bin/bash

# Configuration
PROJECT_DIR="/Users/connormurphy/Documents/RPL/run-pace-logic_current"
LOG_FILE="$PROJECT_DIR/odysseus-automation.log"

cd "$PROJECT_DIR" || exit 1

echo "==================================================" >> "$LOG_FILE"
echo "Odysseus Autonomous Loop Triggered: $(date)" >> "$LOG_FILE"
echo "==================================================" >> "$LOG_FILE"

# 1. Run the test suite to verify current state
echo "Running test suite..." >> "$LOG_FILE"
npm test >> "$LOG_FILE" 2>&1
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "[SUCCESS] All tests passed cleanly." >> "$LOG_FILE"
    
    # 2. Check git status for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        echo "Changes detected. Committing and pushing to main..." >> "$LOG_FILE"
        git add .
        git commit -m "chore(odysseus): automated checkpoint sync - $(date +'%Y-%m-%d %H:%M')"
        git push origin main >> "$LOG_FILE" 2>&1
        echo "[SUCCESS] Pushed latest progress to main." >> "$LOG_FILE"
    else
        echo "[INFO] Working tree clean. No changes to push." >> "$LOG_FILE"
    fi
else
    echo "[WARNING] Test suite reported failures. Halting auto-push." >> "$LOG_FILE"
fi

echo "Cycle completed at $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
