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
    (cd ~/odysseus && ./start-macos.sh > /dev/null 2>&1 &)
    
    echo "⏳ Waiting for Odysseus to bind port 7860..."
    for i in {1..15}; do
        if lsof -Pi :7860 -sTCP:LISTEN -t >/dev/null; then
            echo "✅ Odysseus is up on port 7860!"
            break
        fi
        sleep 1
    done
fi

# 3. Start Frontend via Base44 CLI with remote backend proxy (port 7861 / default)
echo "⚡ Starting Base44 remote dev server..."
base44 dev --remote &

echo "🎉 All systems go!"
echo "   🔹 Odysseus AI:    http://127.0.0.1:7860"
echo "   🔹 Base44 Cloud:   https://trainpacelab.base44.app"
