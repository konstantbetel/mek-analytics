# Подготовка Windows-окружения для локального парсера.
# Запуск от PowerShell (можно без админа):
#   .\setup-windows.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "1/4 Python 3.12"
$py = Get-Command py -ErrorAction SilentlyContinue
if (-not $py) {
  Write-Host "  не найден py.exe — поставь Python 3.12: winget install --id Python.Python.3.12 -e"
} else {
  py -3.12 --version
}

Write-Host "2/4 venv + pip"
if (-not (Test-Path ".venv")) { py -3.12 -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null
& .\.venv\Scripts\python.exe -m pip install pillow | Out-Null

Write-Host "3/4 Tesseract OCR"
$tess = Get-Command tesseract -ErrorAction SilentlyContinue
if (-not $tess) {
  $default = "C:\Program Files\Tesseract-OCR\tesseract.exe"
  if (Test-Path $default) {
    Write-Host "  найден $default — добавляю в PATH"
    [Environment]::SetEnvironmentVariable(
      "Path",
      [Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\Tesseract-OCR",
      "User")
    $env:Path += ";C:\Program Files\Tesseract-OCR"
  } else {
    Write-Host "  Tesseract не найден. Скачай https://github.com/UB-Mannheim/tesseract/wiki"
    Write-Host "  и ОБЯЗАТЕЛЬНО установи в C:\Program Files\Tesseract-OCR"
  }
} else {
  Write-Host "  tesseract: $(& tesseract --version | Select-Object -First 1)"
}

Write-Host "4/4 Ollama"
$oll = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $oll) {
  Write-Host "  не найден. Установи: winget install --id Ollama.Ollama -e"
  Write-Host "  затем: ollama pull qwen2.5:3b   (быстрый текстовый режим)"
  Write-Host "        ollama pull qwen2.5vl:7b (режим vision)"
} else {
  Write-Host "  ollama: $(& ollama --version)"
}

Write-Host ""
Write-Host "Готово. Дальше:"
Write-Host "  cd server\local-service"
Write-Host "  .\run.ps1 ollama-text"
Write-Host ""
Write-Host "Зависимости Node (в корне server):"
Write-Host "  cd ..\..\server ; npm install"
