@echo off
setlocal

echo ======================================================
echo   Watink Business Server - Windows (Docker)
echo ======================================================

where docker >nul 2>&1
if errorlevel 1 goto :erro_docker

docker compose version >nul 2>&1
if errorlevel 1 goto :erro_compose

echo [OK] Docker e Docker Compose detectados.
echo.
echo Escolha o modo:
echo   [1] Subir ambiente Business
echo   [2] Parar ambiente Business
echo   [3] Rebuild completo (down -v / build / up)
set /p "CHOICE=Digite sua escolha (1/2/3): "

if "%CHOICE%"=="2" goto :down
if "%CHOICE%"=="3" goto :rebuild
goto :up

:up
docker compose -f docker-compose.bussines.yml up -d
if errorlevel 1 goto :erro_start
echo [OK] Watink Business Server em execucao.
echo URL esperada: http://localhost (porta 80)
goto :eof

:down
docker compose -f docker-compose.bussines.yml down
echo [OK] Ambiente Business parado.
goto :eof

:rebuild
docker compose -f docker-compose.bussines.yml down -v
docker compose -f docker-compose.bussines.yml build --no-cache
docker compose -f docker-compose.bussines.yml up -d
if errorlevel 1 goto :erro_start
echo [OK] Rebuild concluido.
goto :eof

:erro_docker
echo [ERRO] Docker nao encontrado no PATH.
exit /b 1

:erro_compose
echo [ERRO] Docker Compose nao disponivel.
exit /b 1

:erro_start
echo [ERRO] Falha ao iniciar ambiente Business.
exit /b 1
