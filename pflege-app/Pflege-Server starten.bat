@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo  Pflege-Assistent - lokaler Hilfsserver
echo ============================================================
echo.

rem Python finden (entweder "python" oder der "py"-Launcher)
set "PY=python"
where python >nul 2>nul
if errorlevel 1 set "PY=py"
%PY% --version >nul 2>nul
if errorlevel 1 (
  echo FEHLER: Python wurde nicht gefunden.
  echo Bitte Python von https://www.python.org/downloads/ installieren
  echo und bei der Installation "Add Python to PATH" anhaken.
  echo.
  pause
  exit /b 1
)

echo [1/2] Pruefe / installiere benoetigte Bibliotheken (einmalig)...
%PY% -m pip install --quiet --disable-pip-version-check pymupdf pytesseract pillow
echo      (Fuer OCR gescannter Gutachten muss zusaetzlich das Programm
echo       "Tesseract-OCR" installiert sein. Ist es bereits eingerichtet.)
echo.
echo [2/2] Starte Server auf http://127.0.0.1:8765 ...
echo      Dieses Fenster bitte offen lassen, solange Sie die App nutzen.
echo      Der Browser oeffnet sich gleich automatisch.
echo.
%PY% "pflege_server.py"
echo.
echo Server wurde beendet.
pause
