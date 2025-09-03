# MemeStream Deployment Guide for Render

This guide will help you deploy the MemeStream application to Render with the database hosted on Exonhost.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **Exonhost Account**: Set up PostgreSQL database at [exonhost.com](https://exonhost.com)
3. **GitHub Repository**: Your code should be in a GitHub repository

## Database Setup (Exonhost)

1. **Create PostgreSQL Database on Exonhost**:

   - Log in to your Exonhost panel
   - Create a new PostgreSQL database instance
   - Note down the connection details:
     - Host
     - Port (usually 5432)
     - Database name
     - Username
     - Password

2. **Database Connection String Format**:
   ```
   Host=your-db-host.exonhost.com;Port=5432;Database=your-db-name;Username=your-username;Password=your-password;SSL Mode=Require;
   ```

## Backend Deployment (Render Web Service)

1. **Create New Web Service**:

   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your MemeStream code

2. **Configure Service Settings**:

   - **Name**: `memestream-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main` or your preferred branch
   - **Root Directory**: `MemeStreamApi`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `MemeStreamApi/Dockerfile`

3. **Environment Variables**:
   Set these in Render's Environment Variables section:

   ```bash
   # Database Configuration (from Exonhost)
   ConnectionStrings__MemeStreamDb=Host=your-exonhost-host;Port=5432;Database=your-db-name;Username=your-username;Password=your-password;SSL Mode=Require;

   # JWT Configuration
   Jwt__Key=G7v9x!pQz2Lk@1sT4wRb8Yc6Nf$0jVmrghebfghegdf
   Jwt__Issuer=https://your-backend-app.onrender.com
   Jwt__Audience=https://your-frontend-app.onrender.com

   # Gemini AI Configuration
   GEMINI_API_KEY=AIzaSyC_LOMralehMxQRh2p4t-P3Fyoasf2uNcc
   MODEL_NAME=gemini-1.5-flash

   # Email Configuration
   SENDER_NAME=MemeStream
   SENDER_EMAIL=mashrur9550@gmail.com
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=mashrur9550@gmail.com
   SMTP_PASSWORD=xapebgjvqgfahqiq

   # Frontend URL (will be updated after frontend deployment)
   FRONTEND_URL=https://your-frontend-app.onrender.com

   # Production environment
   ASPNETCORE_ENVIRONMENT=Production
   ```

4. **Advanced Settings**:
   - **Auto-Deploy**: Yes
   - **Health Check Path**: `/health` (optional)

## Frontend Deployment (Render Static Site)

1. **Create New Static Site**:

   - Go to Render Dashboard
   - Click "New" → "Static Site"
   - Connect the same GitHub repository

2. **Configure Static Site Settings**:

   - **Name**: `memestream-frontend`
   - **Branch**: `main` or your preferred branch
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

3. **Alternative: Web Service for Frontend**:
   If you prefer using Docker (recommended for consistency):
   - Create a "Web Service" instead
   - **Root Directory**: `frontend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `frontend/Dockerfile`
4. **Environment Variables for Frontend**:
   ```bash
   # Backend API URL (use your actual backend URL from step 1)
   VITE_API_BASE_URL=https://your-backend-app.onrender.com/api
   ```

## Post-Deployment Configuration

1. **Update Backend CORS**:

   - After frontend deployment, update the `FRONTEND_URL` environment variable in your backend service
   - Use the actual frontend URL: `https://your-frontend-app.onrender.com`

2. **Database Migrations**:

   - The application should run Entity Framework migrations automatically on startup
   - If not, you can run them manually through Render's shell access

3. **Test the Application**:
   - Visit your frontend URL
   - Try registering a new user
   - Test the meme detection feature
   - Verify email functionality

## File Structure for Deployment

Your repository should have this structure:

```
MemeStream/
├── MemeStreamApi/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── MemeStreamApi.csproj
│   └── ... (other backend files)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   ├── package.json
│   └── ... (other frontend files)
└── docker-compose.yml (for local testing)
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive environment variables to Git
2. **JWT Key**: Use a strong, unique JWT key for production
3. **Database**: Ensure your Exonhost database has proper security settings
4. **CORS**: Configure CORS properly to only allow your frontend domain

## Troubleshooting

1. **Build Failures**:

   - Check Render build logs
   - Ensure Dockerfile paths are correct
   - Verify environment variables are set

2. **Database Connection Issues**:

   - Verify Exonhost connection details
   - Check if SSL is required
   - Ensure database server is accessible

3. **CORS Errors**:
   - Update `FRONTEND_URL` environment variable in backend
   - Check that both services are deployed and accessible

## Cost Optimization

1. **Render Free Tier**: You can start with free tier for both services
2. **Database**: Consider Exonhost pricing plans
3. **Auto-Sleep**: Free tier services sleep after inactivity

## Monitoring

1. **Render Metrics**: Monitor service health and performance
2. **Database Monitoring**: Use Exonhost monitoring tools
3. **Application Logs**: Check Render logs for any issues

## Backup Strategy

1. **Database Backups**: Set up automated backups on Exonhost
2. **Code Backups**: Ensure your GitHub repository is properly maintained
3. **Environment Variables**: Document all environment variables securely
