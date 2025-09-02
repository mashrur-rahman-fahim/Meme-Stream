# MemeStream - Docker & Deployment Setup

A social media platform for meme sharing with AI-powered meme detection, built with .NET 9 API and React frontend.

## 🏗️ Architecture

- **Backend**: .NET 9 Web API with Entity Framework Core
- **Frontend**: React 19 + Vite + Tailwind CSS + DaisyUI
- **Database**: PostgreSQL (Exonhost for production)
- **AI Integration**: Google Gemini for meme detection
- **Email**: SMTP integration for notifications
- **Authentication**: JWT with email verification

## 🐳 Docker Setup

### Prerequisites

- Docker Desktop installed
- Git repository cloned
- Environment variables configured

### Quick Start (Local Development)

**Windows:**

```cmd
setup-local.bat
```

**Linux/Mac:**

```bash
chmod +x setup-local.sh
./setup-local.sh
```

**Manual Setup:**

```bash
# 1. Copy environment file
cp MemeStreamApi/.env.production MemeStreamApi/.env

# 2. Update .env with your credentials

# 3. Build and run
docker-compose up --build
```

### Services

| Service  | Port | URL                           | Description       |
| -------- | ---- | ----------------------------- | ----------------- |
| Frontend | 5173 | http://localhost:5173         | React application |
| Backend  | 5216 | http://localhost:5216         | .NET API          |
| Database | 5432 | localhost:5432                | PostgreSQL        |
| Swagger  | 5216 | http://localhost:5216/swagger | API Documentation |

## 🚀 Production Deployment (Render + Exonhost)

### Step 1: Database Setup (Exonhost)

1. Create PostgreSQL database on Exonhost
2. Note connection details for environment variables

### Step 2: Backend Deployment (Render)

1. Create new Web Service on Render
2. Connect GitHub repository
3. Configure:
   - **Root Directory**: `MemeStreamApi`
   - **Runtime**: Docker
   - **Dockerfile**: `MemeStreamApi/Dockerfile`

### Step 3: Frontend Deployment (Render)

1. Create new Web Service on Render
2. Configure:
   - **Root Directory**: `frontend`
   - **Runtime**: Docker
   - **Dockerfile**: `frontend/Dockerfile`

### Step 4: Environment Variables

**Backend Environment Variables:**

```bash
ConnectionStrings__MemeStreamDb=Host=your-db-host;Port=5432;Database=your-db;Username=user;Password=pass;SSL Mode=Require;
Jwt__Key=your-secret-key
Jwt__Issuer=https://your-backend.onrender.com
Jwt__Audience=https://your-frontend.onrender.com
GEMINI_API_KEY=your-gemini-key
FRONTEND_URL=https://your-frontend.onrender.com
SENDER_EMAIL=your-email@gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Frontend Environment Variables:**

```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

## 📁 Docker Files Overview

### Backend Dockerfile (`MemeStreamApi/Dockerfile`)

- Multi-stage build for optimization
- .NET 9 runtime
- Security hardening with non-root user
- Health check support

### Frontend Dockerfile (`frontend/Dockerfile`)

- Node.js build stage
- Nginx production server
- Static file optimization
- Environment variable support

### Nginx Configuration (`frontend/nginx.conf`)

- Client-side routing support
- Asset caching
- Security headers
- Gzip compression

## 🔧 Environment Configuration

### Local Development (.env)

Copy and modify `MemeStreamApi/.env.production`:

```bash
ConnectionStrings__MemeStreamDb=Host=postgres;Port=5432;Database=MemeStream;Username=postgres;Password=password
FRONTEND_URL=http://localhost:5173
Jwt__Issuer=http://localhost:5216
Jwt__Audience=http://localhost:5173
```

### Production (.env.production)

- Database: Exonhost connection string with SSL
- URLs: HTTPS Render service URLs
- Security: Strong JWT keys, secure SMTP credentials

## 🛠️ Development Commands

```bash
# Start all services
docker-compose up

# Build and start (rebuild images)
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean up (remove volumes)
docker-compose down -v
```

## 🔍 Troubleshooting

### Common Issues

**Database Connection:**

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres
```

**Backend Issues:**

```bash
# Check backend logs
docker-compose logs backend

# Restart backend only
docker-compose restart backend
```

**Frontend Build Issues:**

```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build frontend --no-cache
```

### Port Conflicts

If ports are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "3000:80" # Change frontend port
  - "5000:80" # Change backend port
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

- **Backend**: `GET /health`
- **Frontend**: `GET /health` (nginx)

### Monitoring Commands

```bash
# Check service health
curl http://localhost:5216/health
curl http://localhost:5173/health

# Monitor resource usage
docker stats

# View service status
docker-compose ps
```

## 🔒 Security Considerations

### Development

- Default passwords (change for production)
- HTTP connections (okay for local)
- Debug logging enabled

### Production

- Strong passwords and JWT keys
- HTTPS everywhere
- Secure database connections (SSL)
- Environment variables (not hardcoded)
- Regular updates

## 📚 Additional Resources

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Detailed production deployment
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Render Documentation](https://render.com/docs)
- [Exonhost Documentation](https://exonhost.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Test with Docker locally
4. Submit pull request

## 📄 License

This project is licensed under the MIT License.
