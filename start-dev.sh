#!/bin/bash
echo "⚡ Starting TrainPaceLab Full Ecosystem..."

# 1. Check Ollama
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "🤖 Starting Ollama..."
    ollama serve &
    sleep 2
else
    echo "✅ Ollama is running."
fi

# 2. Start Odysseus and WAIT for port 7860 to be ready
if lsof -Pi :7860 -sTCP:LISTEN -t >/dev/null; then
    echo "✅ Odysseus AI is already running on port 7860."
else
    echo "⚡ Starting Odysseus AI on port 7860..."
    cd ~/odysseus && ./start-macos.sh > /dev/null 2>&1 &
    cd - > /dev/null
    
    echo "⏳ Waiting for Odysseus to bind port 7860..."
    for i in {1..15}; do
        if lsof -Pi :7860 -sTCP:LISTEN -t >/dev/null; then
            echo "✅ Odysseus is up on port 7860!"
            break
        fi
        sleep 1
    done
fi

# 3. Start Base44 App (guaranteed to see 7860 is taken and land on 7861)
if lsof -Pi :7861 -sTCP:LISTEN -t >/dev/null || lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null; then
    echo "✅ Base44 dev server is already active."
else
    echo "⚡ Starting Base44 remote dev server on port 7861..."
    base44 dev --remote &
    sleep 3
fi

# 4. Automatically open all browser tabs
echo "🌐 Opening Odysseus, Local App, and Base44 Cloud Editor..."
sleep 2
open http://127.0.0.1:7860
open http://localhost:7861
open https://app.base44.com/apps/6a504ebe6a5a6d1be058226c/editor/preview

echo ""
echo "🎉 All systems go!"
echo "   🔹 Odysseus AI:    http://127.0.0.1:7860"
echo "   🔹 Base44 Local:   http://localhost:7861"
echo "   🔹 Base44 Cloud:   https://app.base44.com/apps/6a504ebe6a5a6d1be058226c/editor/preview"
echo "--------------------------------------------------"
