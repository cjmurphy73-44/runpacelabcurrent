#!/bin/bash

PROJECT_DIR="/Users/connormurphy/Documents/RPL/run-pace-logic_current"
LOG_FILE="$PROJECT_DIR/odysseus-market-research.log"

cd "$PROJECT_DIR" || exit 1

echo "==================================================" >> "$LOG_FILE"
echo "Market Research & Roadmap Sync Triggered: $(date)" >> "$LOG_FILE"
echo "==================================================" >> "$LOG_FILE"

echo "Executing competitive intelligence analysis via local AI..." >> "$LOG_FILE"
aider --model ollama/qwen2.5-coder:7b --message "You are the Lead Product Strategist for TrainPaceLab. Conduct a competitive research pass comparing us to platforms like TrainingPeaks, Runalyze, and V.O2. Identify 1 high-value feature gap or UX improvement, evaluate its feasibility, and append a well-structured task directly into ROADMAP.md." --yes-always >> "$LOG_FILE" 2>&1

echo "Market research cycle completed at $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
