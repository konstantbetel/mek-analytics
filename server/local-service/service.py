"""Локальный HTTP-сервис поверх Ollama.

Эндпоинты:
  GET  /health -> {"ok": true, "model": "..."}
  POST /parse  -> {"ok": true, "result": {...}}   body: {"text"|"image", "mode", "prompt"}

Работает и с Ollama (qwen2.5vl:7b / qwen2.5:3b), и с любым OpenAI-совместимым
эндпоинтом (LM Studio, llama.cpp server) — достаточно переменной LLM_BACKEND.
"""

import os
import json
import base64
import urllib.request

HOST = os.environ.get("SERVICE_HOST", "127.0.0.1")
PORT = int(os.environ.get("SERVICE_PORT", "8848"))
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5vl:7b")
OPENAI_URL = os.environ.get("OPENAI_URL", "http://127.0.0.1:8080/v1/chat/completions")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "qwen2.5-vl")
BACKEND = os.environ.get("LLM_BACKEND", "ollama")
TIMEOUT = int(os.environ.get("LLM_TIMEOUT", "600"))


def _post_json(url, payload, timeout=TIMEOUT):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _ollama_available():
    try:
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def call_ollama(prompt, text=None, image=None):
    parts = []
    if image:
        parts.append(image)
    if text:
        parts.append(text)
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1, "num_ctx": 4096},
    }
    if image:
        payload["images"] = [image]
    if text:
        payload["prompt"] = prompt + "\n\n" + text
    data = _post_json(f"{OLLAMA_URL}/api/generate", payload)
    return data.get("response", "")


def call_openai(prompt, text=None, image=None):
    content = [{"type": "text", "text": prompt + ("\n\n" + text if text else "")}]
    if image:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": "data:image/png;base64," + image},
            }
        )
    payload = {
        "model": OPENAI_MODEL,
        "messages": [{"role": "user", "content": content}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    data = _post_json(OPENAI_URL, payload)
    return data["choices"][0]["message"]["content"]


def extract_json(text):
    if not text:
        return None
    raw = text
    if "```" in raw:
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.lower().startswith("json"):
            raw = raw[4:]
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(raw[start : end + 1])
    except Exception:
        return None


def handle_parse(body):
    prompt = body.get("prompt") or "Верни только JSON."
    text = body.get("text")
    image = body.get("image")
    if image and "," in image[:64] and image.startswith("data:"):
        image = image.split(",", 1)[1]

    if BACKEND == "openai":
        raw = call_openai(prompt, text, image)
    else:
        raw = call_ollama(prompt, text, image)

    parsed = extract_json(raw)
    if parsed is None:
        parsed = {"raw": raw, "error": "model did not return JSON"}
    return {"ok": True, "result": parsed, "backend": BACKEND, "model": OLLAMA_MODEL if BACKEND != "openai" else OPENAI_MODEL}


def handle_health():
    if BACKEND == "openai":
        return {"ok": True, "backend": "openai", "model": OPENAI_MODEL}
    tags = _ollama_available()
    if tags is None:
        return {"ok": False, "backend": "ollama", "error": "ollama is not running"}
    models = [m.get("name") for m in tags.get("models", [])]
    return {"ok": OLLAMA_MODEL in models or bool(models), "backend": "ollama",
            "model": OLLAMA_MODEL, "models": models}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.rstrip("/") in ("/health", ""):
            self._send(200, handle_health())
        else:
            self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") != "/parse":
            self._send(404, {"ok": False, "error": "not found"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except Exception as e:
            self._send(400, {"ok": False, "error": f"bad json: {e}"})
            return
        try:
            self._send(200, handle_parse(body))
        except Exception as e:
            self._send(502, {"ok": False, "error": str(e)})

    def log_message(self, fmt, *args):
        print("[service]", fmt % args, flush=True)


if __name__ == "__main__":
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    print(f"service on http://{HOST}:{PORT} backend={BACKEND}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
