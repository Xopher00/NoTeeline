#!/bin/bash
set -e

export OLLAMA_HOST=0.0.0.0:11434
ollama serve &
OLLAMA_PID=$!

until curl -s http://localhost:11434/v1/models >/dev/null 2>&1; do
    sleep 1
done

cd /app/Backend
source whisper-venv/bin/activate
uvicorn whisper_server:app --host 0.0.0.0 --port 8000 &
WHISPER_PID=$!

node index.js &
BACKEND_PID=$!

cd /app/Frontend
yarn preview --port 3000 --host 0.0.0.0 &
FRONTEND_PID=$!

(
    if ! ollama list | grep -q "${LOCAL_MODEL}"; then
        echo "Pulling ${LOCAL_MODEL} in the background (first run only; cached in the ollama volume after this)..."
        ollama pull "${LOCAL_MODEL}"
        echo "${LOCAL_MODEL} ready."
    fi
) &
PULL_PID=$!

trap 'kill $OLLAMA_PID $WHISPER_PID $BACKEND_PID $FRONTEND_PID $PULL_PID 2>/dev/null' SIGTERM SIGINT
wait -n $OLLAMA_PID $WHISPER_PID $BACKEND_PID $FRONTEND_PID
