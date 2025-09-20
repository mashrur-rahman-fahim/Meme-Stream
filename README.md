# 🤣 MemeStream - Social Meme Platform

![MemeStream Banner](MemeStreamApi/assets/MemeStream.png)

MemeStream is a comprehensive social media platform specifically designed for meme enthusiasts. Built with modern web technologies, it combines the fun of meme sharing with sophisticated social features, AI-powered content detection, real-time messaging, and an innovative points-based comedy ranking system.

## ✨ Features

### 🎯 Core Social Features
- **Smart Feed Algorithm** - AI-enhanced content distribution with friend prioritization and discovery
- **Real-time Chat** - Individual and group messaging with SignalR
- **Friend System** - Send/accept friend requests with comprehensive management
- **Meme Detection** - AI-powered content validation using Google Gemini
- **Points System** - LaughScore ranking based on engagement and humor
- **Live Notifications** - Real-time alerts for all platform activities

### 🤖 AI & Intelligence
- **Content Validation** - Automatic meme detection and quality scoring
- **Smart Feed Curation** - Algorithm balances friend content with discovery
- **Engagement Analysis** - Sophisticated scoring system for comedy ranking
- **Content Quality Signals** - Length optimization and media content bonuses

### 💬 Communication
- **Private Messaging** - One-on-one conversations with read receipts
- **Group Chats** - Create and manage group conversations
- **Real-time Updates** - Instant message delivery and notifications
- **File Sharing** - Image and media sharing in conversations

### 🏆 Gamification
- **LaughScore Points** - Earn points for reactions, shares, and comments
- **Comedy Rankings** - 8-tier system from "Meme Newbie" to "Meme Legend"
- **Leaderboards** - Platform-wide comedy rankings
- **Achievement System** - Track your meme mastery progression

## 🛠️ Tech Stack

### Backend (.NET 9)
- **Framework**: ASP.NET Core Web API
- **Database**: PostgreSQL with Entity Framework Core
- **Authentication**: JWT Bearer tokens with BCrypt password hashing
- **Real-time**: SignalR for live messaging and notifications
- **AI Integration**: Google Gemini API for meme detection
- **Email**: MailKit/MimeKit for verification and notifications
- **Architecture**: Clean architecture with controllers, services, and data layers

### Frontend (React 19)
- **Framework**: React 19 with Vite build tool
- **Routing**: React Router v7 for navigation
- **State Management**: React Query for server state + Context API
- **Styling**: Tailwind CSS with DaisyUI components
- **Real-time**: SignalR client for live updates
- **HTTP Client**: Axios with interceptors for API communication
- **Notifications**: React Hot Toast for user feedback

### Database Schema
- **Users**: Authentication, profiles, and preferences
- **Posts**: Memes with metadata and engagement tracking
- **Social**: Friends, reactions, comments, and shares
- **Messaging**: Private and group chat system
- **Notifications**: Real-time notification management

### DevOps & Deployment
- **Containerization**: Docker containers for both frontend and backend
- **Orchestration**: Docker Compose for local development
- **Cloud Deployment**: Render.com with PostgreSQL on Exonhost
- **CI/CD**: Automated deployments from GitHub

## 🚀 Quick Start

### Prerequisites
- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) (optional)

### 🐳 Docker Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MemeStream.git
   cd MemeStream
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5216
   - Swagger UI: http://localhost:5216/swagger

### 🔧 Local Development Setup

#### Backend Setup
```bash
cd MemeStreamApi
dotnet restore
dotnet ef database update
dotnet run
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 📋 Environment Configuration

#### Backend (.env in MemeStreamApi/)
```env
ConnectionStrings__MemeStreamDb=Host=localhost;Port=5432;Database=MemeStream;Username=postgres;Password=password
Jwt__Key=your-super-secret-jwt-key-here
Jwt__Issuer=http://localhost:5216
Jwt__Audience=http://localhost:5173
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env in frontend/)
```env
VITE_API_BASE_URL=http://localhost:5216/api
```

## 📁 Project Structure

```
MemeStream/
├── 🔧 Configuration & Deployment
│   ├── docker-compose.yml          # Docker orchestration
│   ├── DEPLOYMENT_GUIDE.md         # Production deployment guide
│   ├── DOCKER_README.md           # Docker setup instructions
│   └── render.yaml                # Render.com deployment config
│
├── 🗄️ MemeStreamApi/              # Backend .NET Core API
│   ├── controller/                # API controllers
│   │   ├── UserController.cs      # User management
│   │   ├── PostController.cs      # Meme posts with enhanced algorithm
│   │   ├── ChatController.cs      # Real-time messaging
│   │   ├── FriendRequestController.cs # Social connections
│   │   ├── NotificationController.cs  # Real-time notifications
│   │   └── MemeDetectorController.cs  # AI content validation
│   ├── model/                     # Data models and DTOs
│   ├── services/                  # Business logic layer
│   ├── data/                      # Entity Framework context
│   ├── hubs/                      # SignalR hubs for real-time features
│   └── Migrations/                # Database migrations
│
├── 🎨 frontend/                   # React Frontend Application
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Feed.jsx          # Enhanced feed with seen posts tracking
│   │   │   ├── PostCard.jsx      # Meme post display
│   │   │   ├── Chat/             # Messaging components
│   │   │   └── Navbar.jsx        # Navigation
│   │   ├── Pages/                # Route components
│   │   │   ├── HomePage.jsx      # Main feed
│   │   │   ├── ProfilePage.jsx   # User profiles with LaughScore
│   │   │   ├── FriendsPage.jsx   # Friend management
│   │   │   └── *ChatPage.jsx     # Messaging interfaces
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useEnhancedFeed.js # Smart feed management
│   │   │   └── useFeedQuery.js   # React Query hooks
│   │   ├── services/             # API communication
│   │   ├── context/              # React Context providers
│   │   └── utils/                # Helper functions
│   └── public/                   # Static assets
│
└── 📚 Documentation/
    ├── FEED_ALGORITHM.md          # Comprehensive feed algorithm docs
    ├── MEME_DETECTION_ALGORITHM.md # AI content validation system
    ├── NOTIFICATION_SYSTEM_COMPREHENSIVE.md # Real-time notifications
    ├── MEME_POINTS_SYSTEM.md      # LaughScore comedy ranking
    └── PERFORMANCE_OPTIMIZATIONS.md # System optimizations
```

## 🔥 Key Algorithms & Systems

### 🧠 Enhanced Feed Algorithm (v4.0)
- **Smart Scoring**: Balanced friend/discovery content with 45+ parameters
- **Content Quality Signals**: Length optimization, media bonuses, peak hours
- **Diversity Engine**: Prevents clustering with sophisticated interleaving
- **Real-time Updates**: 25 posts per page with infinite scroll
- **Seen Posts Tracking**: Smart refresh prioritizing unseen content

### 🤖 AI Meme Detection
- **Google Gemini Integration**: Advanced content analysis
- **Quality Scoring**: Humor assessment and appropriateness checking
- **Content Validation**: Ensures platform standards compliance
- **Real-time Processing**: Instant feedback during post creation

### 🏆 LaughScore Points System
- **Unique User Interactions**: Reactions (5pts), Shares (3pts), Comments (2pts)
- **8-Tier Ranking System**: From "Meme Newbie" to "Meme Legend"
- **Real-time Updates**: Instant score recalculation
- **Anti-Gaming Measures**: Spam prevention and authentic engagement

### 📱 Real-time Communication
- **SignalR Integration**: Bi-directional real-time communication
- **Message Delivery**: Instant messaging with read receipts
- **Live Notifications**: Real-time alerts for all platform activities
- **Group Management**: Dynamic group creation and management

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Security**: BCrypt hashing with salt
- **CORS Protection**: Configured cross-origin resource sharing
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Entity Framework parameterized queries
- **Rate Limiting**: API endpoint protection (configurable)

## 📊 Performance Optimizations

### Frontend Optimizations
- **Virtual Scrolling**: Handles thousands of posts efficiently
- **React Query Caching**: Smart server state management
- **Lazy Loading**: On-demand component and image loading
- **Memoization**: Optimized re-rendering with React.memo
- **Code Splitting**: Bundled optimization with Vite

### Backend Optimizations
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: Configurable response caching
- **Async Operations**: Non-blocking I/O operations
- **Pagination**: Efficient data loading (25 posts/page)

## 🌐 API Endpoints

### Authentication
- `POST /api/User/register` - User registration
- `POST /api/User/login` - User authentication
- `GET /api/User/profile` - Get user profile

### Social Features
- `GET /api/Post/feed` - Enhanced personalized feed
- `POST /api/Post/create` - Create new meme post
- `POST /api/Reaction/create` - Add reaction to post
- `GET /api/FriendRequest/get/friends` - Get friends list

### Real-time Features
- `SignalR Hub: /notificationHub` - Live notifications
- `SignalR Hub: /chatHub` - Real-time messaging

### AI Features
- `POST /api/MemeDetector/analyze` - Content analysis
- `GET /api/LaughScore/user/{id}` - Get user comedy score

## 🎯 Unique Features

### 1. **Smart Content Distribution**
Advanced algorithm balancing friend content with platform discovery, featuring:
- Hourly time decay precision
- Content quality signals
- Media content bonuses
- Peak hours optimization
- Sophisticated diversity mixing

### 2. **Comedy Gamification**
Comprehensive points system that measures and rewards humor:
- Unique user interaction tracking
- 8-tier comedy ranking system
- Real-time leaderboards
- Achievement progression
- Community recognition

### 3. **AI-Powered Quality Control**
Google Gemini integration ensuring platform quality:
- Automatic meme detection
- Content appropriateness scoring
- Real-time validation feedback
- Quality assurance automation

### 4. **Real-time Social Experience**
Seamless real-time interactions across the platform:
- Instant messaging with groups
- Live notification system
- Real-time engagement tracking
- Dynamic content updates

## 🧪 Testing

### Backend Testing
```bash
cd MemeStreamApi
dotnet test
```

### Frontend Testing
```bash
cd frontend
npm run test
```

### Integration Testing
```bash
# Start all services
docker-compose up -d

# Run integration tests
npm run test:integration
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 🚀 Deployment

### Production Deployment (Render.com)
See detailed [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for step-by-step instructions.

Quick deployment checklist:
1. Set up PostgreSQL database (Exonhost)
2. Deploy backend API to Render
3. Deploy frontend to Render
4. Configure environment variables
5. Test all functionality

### Docker Production
```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d

# With custom environment
docker-compose --env-file .env.production up -d
```

## 📈 Monitoring & Analytics

### Application Metrics
- User engagement rates
- Content quality scores
- Feed algorithm performance
- Real-time message delivery
- Comedy ranking distributions

### Performance Monitoring
- API response times
- Database query performance
- Real-time connection health
- Frontend load times
- User retention metrics

## 🔧 Configuration

### Backend Configuration (appsettings.json)
```json
{
  "ConnectionStrings": {
    "MemeStreamDb": "Host=localhost;Database=MemeStream;Username=postgres;Password=password"
  },
  "Jwt": {
    "Key": "your-jwt-secret-key",
    "Issuer": "http://localhost:5216",
    "Audience": "http://localhost:5173"
  },
  "GeminiAI": {
    "ApiKey": "your-gemini-api-key",
    "ModelName": "gemini-1.5-flash"
  }
}
```

### Frontend Configuration (vite.config.js)
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5216'
    }
  }
})
```

## 🤝 Community

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community discussions and questions
- **Wiki**: Detailed technical documentation
- **Discord**: Real-time community chat (link in bio)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** - Content analysis and meme detection
- **React Community** - Amazing frontend framework and ecosystem
- **ASP.NET Core Team** - Robust backend framework
- **SignalR** - Real-time communication capabilities
- **Tailwind CSS** - Beautiful and efficient styling
- **React Query** - Excellent server state management

## 📧 Contact

- **Project Maintainer**: [Your Name](mailto:your.email@example.com)
- **Project Repository**: [GitHub](https://github.com/yourusername/MemeStream)
- **Live Demo**: [MemeStream App](https://your-app.onrender.com)

---

**Built with ❤️ for the meme community**

*MemeStream - Where humor meets technology. Share laughs, build connections, and climb the comedy leaderboard!* 🚀✨
