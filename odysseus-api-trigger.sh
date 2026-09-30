#!/bin/bash

# Trigger Odysseus backend chat/agent engine
curl -X POST "http://localhost:8000/api/agent/run" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Odysseus, inspect ROADMAP.md, find the first unchecked item, implement the changes, run the build, and report back."
     }'
