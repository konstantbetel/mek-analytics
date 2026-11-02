#!/usr/bin/env bash
# Запуск локального сервиса модели (Linux/macOS).
#   ./run.sh ollama-vision   # qwen2.5vl:7b — картинка целиком
#   ./run.sh ollama-text     # qwen2.5:3b   — только текст (быстро на CPU)
#   ./run.sh ollama-echo     # без модели, только заглушка

set -euo pipefail
cd "$(dirname "$0")"

MODE="${1:-ollama-text}"

case "$MODE" in
  ollama-vision) export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5vl:7b}";;
  ollama-text)   export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:3b}";;
  ollama-echo)   export LLM_BACKEND="${LLM_BACKEND:-echo}";;
  *) echo "unknown mode: $MODE" >&2; exit 1;;
esac

if [ -d .venv ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
else
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip >/dev/null
fi

echo "starting service, mode=$MODE, model=${OLLAMA_MODEL:-none}"
exec python3 service.py
