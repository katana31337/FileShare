@echo off
REM ============================================
REM QuickShare — Cleanup Script (Windows)
REM ============================================
REM Использование: scripts\cleanup.bat

echo 🧹 Очистка QuickShare...
echo.

REM Остановить все контейнеры quickshare
echo 🛑 Остановка контейнеров...
docker ps -a --filter "name=quickshare" -q > temp_containers.txt 2>nul
if exist temp_containers.txt (
    for /f %%i in (temp_containers.txt) do docker stop %%i 2>nul
    del temp_containers.txt
)

REM Удалить все контейнеры quickshare
echo 🗑️  Удаление контейнеров...
docker ps -a --filter "name=quickshare" -q > temp_containers.txt 2>nul
if exist temp_containers.txt (
    for /f %%i in (temp_containers.txt) do docker rm -f %%i 2>nul
    del temp_containers.txt
)

REM Удалить volumes (опционально)
REM echo 🗂️  Удаление volumes...
REM docker volume ls --filter "name=quickshare" -q > temp_volumes.txt 2>nul
REM if exist temp_volumes.txt (
REM     for /f %%i in (temp_volumes.txt) do docker volume rm -f %%i 2>nul
REM     del temp_volumes.txt
REM )

REM Удалить networks
echo 🌐 Удаление networks...
docker network ls --filter "name=quickshare" -q > temp_networks.txt 2>nul
if exist temp_networks.txt (
    for /f %%i in (temp_networks.txt) do docker network rm %%i 2>nul
    del temp_networks.txt
)

echo.
echo ✅ Готово!
echo.
