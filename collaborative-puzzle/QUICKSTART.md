# Quick Start Guide

## Prerequisites
- Docker and Docker Compose installed
- Java 11+ (for local development)
- Node.js 18+ (for local frontend development)

## Running with Docker

1. Clone the repository
2. Run the application:
```bash
docker-compose up -d
```
3. Access the application at http://localhost:8080

## Local Development

### Backend
```bash
# Start Redis container
docker run -d -p 6379:6379 redis:7-alpine

# Build and run the backend
./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing the Application

1. Create a new puzzle session:
```bash
curl -X POST http://localhost:8080/api/sessions \
  -F "image=@cat.jpeg" \
  -F "gridSize=3"
```

2. Join the session using the returned session ID
3. Open multiple browser windows to test collaboration

## Running Tests
```bash
# Unit tests
./mvnw test

# Specific test class
./mvnw test -Dtest=PuzzleServiceTest
```

## API Documentation

### Create Session
```
POST /api/sessions
Content-Type: multipart/form-data

Parameters:
- image: Image file (JPEG, PNG)
- gridSize: 2, 3, 5, or 8

Response:
{
  "sessionId": "uuid"
}
```

### Get Session
```
GET /api/sessions/{sessionId}

Response:
{
  "id": "uuid",
  "imageUrl": "/api/images/{imageId}",
  "gridSize": 3,
  "totalPieces": 9,
  "pieces": [...],
  "users": {...},
  "createdAt": "2025-06-27T14:05:32.648",
  "completed": false
}
```

### Join Session
```
POST /api/sessions/{sessionId}/join
Content-Type: application/json

{
  "name": "PlayerName"
}

Response:
{
  "id": "userId",
  "name": "PlayerName",
  "color": "#FF6B6B"
}
```

## WebSocket Connection
```javascript
const ws = new WebSocket(`ws://localhost:8080/ws/puzzle/${sessionId}?userId=${userId}`);

// Message format
{
  "type": "PIECE_MOVE",
  "data": {
    "pieceId": 0,
    "x": 100,
    "y": 200
  }
}
```