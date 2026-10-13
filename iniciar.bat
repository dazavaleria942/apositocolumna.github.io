@echo off
chcp 65001 >nul
title Tutorial 3D - Procedimiento de Columna
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  echo Iniciando el tutorial en http://localhost:5173 ...
  echo Para detenerlo, cierre esta ventana o presione Ctrl + C.
  node scripts\serve.mjs --open
) else (
  echo Node.js no esta instalado. Se abrira la version autocontenida.
  start "" "%~dp0dist\index.html"
)
