# Collaborative Jigsaw Puzzle

A real-time collaborative jigsaw puzzle web application where multiple users can work together to solve puzzles.

## Features

- Real-time collaboration using WebSockets
- Drag and drop puzzle pieces
- Automatic piece snapping
- User cursor tracking
- Multiple grid sizes (3x3, 5x5, 8x8)
- Session-based gameplay with UUID
- Redis-based data persistence

## Technology Stack

- **Backend**: Java 11 with Spring Boot 2.7
- **Frontend**: React 18 with TypeScript and Redux Toolkit
- **Database**: Redis
- **Real-time**: Native WebSocket API
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Port 8080 available for the application
- Port 6379 available for Redis

### Running with Docker Compose

1. Clone the repository and navigate to the project directory:
```bash
cd collaborative-puzzle
```

2. Build and start the application:
```bash
docker-compose up --build
```

3. Open your browser and navigate to:
```
http://localhost:8080
```

### Development Mode

For development with hot-reload:

1. Start Redis:
```bash
docker-compose up redis
```

2. Start the Spring Boot backend:
```bash
./mvnw spring-boot:run
```

3. In a new terminal, start the React frontend:
```bash
cd frontend
npm install
npm run dev
```

4. Access the frontend at `http://localhost:3000`

## Usage

1. **Create a Session**: Upload an image (JPG/PNG, max 10MB) and select a grid size
2. **Join a Session**: Enter the session ID shared by another player
3. **Play**: Drag pieces from the right side to their correct positions
4. **Collaborate**: See other players' cursors and work together

## Project Structure

```
collaborative-puzzle/
├── src/main/java/com/puzzle/    # Spring Boot backend
│   ├── controller/              # REST endpoints
│   ├── service/                 # Business logic
│   ├── model/                   # Data models
│   ├── repository/              # Redis repositories
│   ├── websocket/               # WebSocket handlers
│   └── config/                  # Configuration classes
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── features/            # Redux slices
│   │   ├── store/               # Redux store
│   │   └── types/               # TypeScript types
│   └── public/
├── docker-compose.yml           # Development environment
└── docker-compose.prod.yml      # Production environment
```

## Production Deployment

For production deployment:

1. Build the production image:
```bash
docker build -t collaborative-puzzle:latest .
```

2. Set environment variables in `.env`:
```
REDIS_PASSWORD=your-secure-password
```

3. Run with production compose file:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## API Endpoints

- `POST /api/sessions` - Create a new puzzle session
- `GET /api/sessions/{sessionId}` - Get session details
- `POST /api/sessions/{sessionId}/join` - Join an existing session
- `GET /api/images/{imageId}` - Retrieve puzzle images
- `WS /ws/puzzle/{sessionId}` - WebSocket connection for real-time updates

## Environment Variables

- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `SERVER_PORT` - Application server port (default: 8080)

## Documentation

- [Quick Start Guide](QUICKSTART.md) - Get up and running quickly
- [Implementation Notes](IMPLEMENTATION_NOTES.md) - Technical details and decisions
- [Product Requirements](docs/PRD_Collaborative_Jigsaw_Puzzle.md) - Original requirements
- [Software Architecture](docs/SOFTWARE_ARCHITECTURE_MVP.md) - System design
- [MVP Feature List](docs/MVP_FEATURE_LIST.md) - Implemented features