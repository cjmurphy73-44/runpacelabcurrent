#!/bin/bash
CURRENT_DIR="$PWD"
echo "🧹 Deep cleaning all development processes and ports..."

# Kill ports and processes
lsof -ti:7860,7861 | xargs kill -9 2>/dev/null || true
pkill -f "odysseus" 2>/dev/null || true
pkill -f "trainpacelab" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true

echo "🚀 Launching Odysseus in a dedicated window..."
osascript -e 'tell application "Terminal" to do script "cd ~/odysseus && ./start-macos.sh"'

echo "✨ Reset complete. Cleaning up old windows..."
# Close any older terminal windows, keeping the two newest ones (current + new Odysseus window)
osascript -e 'tell application "Terminal" to close (every window whose id is not (id of front window))' 2>/dev/null || true

cd "$CURRENT_DIR"
echo "Ready!"
