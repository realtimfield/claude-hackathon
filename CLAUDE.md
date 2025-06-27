# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Collaborative Jigsaw Puzzle** web application that allows multiple users to work together in real-time to solve digital jigsaw puzzles.

### Technology Stack
- **Backend**: Java 11+ with Spring Boot (serves both API and static files)
- **Frontend**: React 18+ with Redux Toolkit
- **Database**: Redis (primary datastore - no SQL database)
- **Real-time**: Native WebSocket API (no external libraries like Socket.io)
- **Deployment**: Docker with docker-compose

### Project Structure
```
collaborative-puzzle/
├── src/main/java/com/puzzle/    # Spring Boot backend
├── src/main/resources/static/   # React build output
├── frontend/                    # React source code
├── Dockerfile                   # Multi-stage build
├── docker-compose.yml          # Development environment
└── docker-compose.prod.yml     # Production environment
```

## Key Development Commands

### Local Development
```bash
# Option 1: Using Docker (Recommended)
docker-compose up

# Option 2: Manual setup
docker run -p 6379:6379 redis:7-alpine  # Start Redis first
mvn spring-boot:run                     # Backend
cd frontend && npm start                # Frontend dev server
```

### Building for Production
```bash
# Build and run with Docker
docker build -t collaborative-puzzle:latest .
docker-compose -f docker-compose.yml up -d
```

## Important Technical Decisions

1. **Single Application**: Spring Boot serves both the React frontend and backend API
2. **Redis Only**: No SQL database - Redis handles all data storage
3. **Native WebSocket**: Use browser's native WebSocket API, not libraries
4. **UUID Sessions**: Each puzzle session has a unique UUID identifier
5. **No Authentication**: Simple name-based login for MVP

## Code Style Guidelines

1. **Java Backend**:
   - Use Spring Boot conventions
   - Service layer for business logic
   - DTOs for API contracts
   - Proper error handling with @ControllerAdvice

2. **React Frontend**:
   - Functional components with hooks
   - Redux Toolkit for state management
   - TypeScript interfaces for type safety
   - CSS modules or styled-components

3. **WebSocket Messages**:
   - JSON format with `type` field
   - Types: PIECE_MOVE, PIECE_RELEASE, PIECE_LOCK, PIECE_UNLOCK, USER_JOIN, USER_LEAVE, CURSOR_MOVE, SESSION_STATE, PUZZLE_COMPLETE

## MVP Features Checklist

✅ Implemented:
- Basic login (name only)
- UUID-based puzzle sessions
- Image upload (JPG/PNG, 10MB max)
- Grid-based rectangular pieces (3x3, 5x5, 8x8)
- Real-time drag & drop synchronization
- Piece snapping to ANY grid position (80px threshold)
- Snap-on-release behavior (not during drag)
- User cursor visibility with color coding
- Players list in left sidebar
- Puzzle area with outline border
- Docker containerization with optimized build
- Puzzle completion detection
- Piece locking during drag (prevents conflicts)
- Individual piece images stored in Redis

❌ Not in MVP:
- User authentication/accounts
- Interlocking puzzle piece shapes
- Piece rotation
- Zoom/pan controls
- Chat functionality
- Progress tracking
- Visual indicators for correct placement

## Common Tasks

### Adding a New API Endpoint
1. Create controller method in `PuzzleController.java`
2. Add service method in appropriate service class
3. Create DTOs if needed
4. Update frontend API service

### Implementing a New WebSocket Message Type
1. Add message type to WebSocket handler
2. Create message DTO
3. Update frontend WebSocket hook
4. Add Redux action if state change needed

### Modifying Puzzle Mechanics
1. Update `PuzzleService.java` for backend logic
2. Modify `PuzzleCanvas.jsx` for frontend rendering
3. Ensure WebSocket sync for multiplayer

## Testing Guidelines

- Backend: JUnit with MockMvc for controllers
- Frontend: React Testing Library for components
- WebSocket: Integration tests with test containers
- Always test with multiple concurrent users

## Performance Considerations

- Throttle WebSocket messages to 60ms intervals
- Use React.memo for PuzzlePiece components
- Implement Redis connection pooling
- Set appropriate TTL for Redis keys

## Troubleshooting

1. **Redis Connection Issues**: Ensure Redis is running before starting the app
2. **WebSocket Disconnects**: Check CORS configuration and network settings
3. **Build Failures**: Clear Maven/npm caches and rebuild
4. **Docker Issues**: Check port conflicts and volume permissions
5. **Cursor Offset**: Fixed by proper container offset calculations with getBoundingClientRect()
6. **Pieces Not Snapping**: Ensure snap threshold is adequate (80px) and algorithm checks all nearby grid cells

## Recent Implementation Details

### Piece Snapping Algorithm (PuzzleService.releasePiece)
- Calculates piece center position for more accurate snapping
- Checks all 4 nearby grid cells to find the closest position
- Snaps to ANY valid grid position, not just correct positions
- No visual feedback for correct placement (by design)

### Docker Build Optimization
- Frontend built first for better layer caching
- Node.js upgraded from v12 to v18 for compatibility
- Frontend build copied to Spring Boot static resources

### Redis Configuration
- Two templates: JSON serialized (primary) and binary (for images)
- Individual piece images stored as byte arrays
- Session data uses GenericJackson2JsonRedisSerializer