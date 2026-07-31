# Base44 SDK & Architecture Guide for Odysseus

## 1. Project Directory Structure
- base44/functions/ : Backend serverless functions (Deno / TS)
- src/ : React Frontend (components, pages, api)

## 2. Serverless Backend Functions (base44/functions/)
Always include 'User-Agent': 'runpacelab-app' in external headers.
Use createClientFromRequest(req) for auth context.

## 3. Frontend Integration
Invoke functions via: base44.functions.invoke('functionName', payload)

## 4. Development Workflow
1. Fix/refactor locally with Odysseus.
2. Run: git add . && git commit -m 'update' && git push
3. Base44 automatically builds and deploys from main.
