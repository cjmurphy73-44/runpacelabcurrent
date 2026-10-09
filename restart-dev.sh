#!/bin/bash
echo "🧹 Clearing ports 7860, 7861..."
lsof -ti:7860,7861 | xargs kill -9 2>/dev/null || true

echo "🔄 Restarting Odysseus..."
cd ~/odysseus && ./start-macos.sh &

echo "⚡ Restarting TrainPaceLab backend..."
trainpacelab
echo "✨ Development suite restarted successfully."
