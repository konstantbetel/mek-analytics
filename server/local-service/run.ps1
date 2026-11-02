# Запуск локального сервиса модели (Windows PowerShell).
#   .\run.ps1 ollama-vision   # qwen2.5vl:7b
#   .\run.ps1 ollama-text     # qwen2.5:3b
#   .\run.ps1 ollama-echo

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

param_ = $args[0]
if (-not $param_) { $param_ = "ollama-text" }

switch ($param_) {
  "ollama-vision" { $env:OLLAMA_MODEL = "qwen2.5vl:7b" }
  "ollama-text"   { $env:OLLAMA_MODEL = "qwen2.5:3b" }
  "ollama-echo"   { $env:LLM_BACKEND = "echo" }
  default { Write-Host "unknown mode: $param_"; exit 1 }
}

if (-not (Test-Path ".venv")) {
  py -3.12 -m venv .venv
}
& .\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null

Write-Host "starting service, mode=$param_"
& .\.venv\Scripts\python.exe service.py
