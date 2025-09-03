@echo off
REM MemeStream Local Development Setup Script for Windows

echo 🚀 Setting up MemeStream for local development...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

echo ✅ Docker is installed

REM Create .env file if it doesn't exist
if not exist "MemeStreamApi\.env" (
    echo 📝 Creating .env file from template...
    copy "MemeStreamApi\.env.production" "MemeStreamApi\.env"
    echo ⚠️  Please update the .env file with your actual credentials!
)

REM Build and start services
echo 🔨 Building and starting services...
docker-compose up --build -d

echo ⏳ Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Check if services are running
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo ✅ Services are running!
    echo.
    echo 🌐 Access your application:
    echo    Frontend: http://localhost:5173
    echo    Backend:  http://localhost:5216
    echo    API Docs: http://localhost:5216/swagger
    echo.
    echo 📊 Monitor logs with: docker-compose logs -f
    echo 🛑 Stop services with: docker-compose down
) else (
    echo ❌ Some services failed to start. Check logs with: docker-compose logs
)
