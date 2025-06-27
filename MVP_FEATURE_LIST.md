# MVP Feature List - Collaborative Jigsaw Puzzle

## 1. Infrastructure & Setup

### 1.1 Project Structure
- [ ] Initialize Spring Boot project with Maven/Gradle
- [ ] Set up React project within `frontend/` directory
- [ ] Configure multi-stage Dockerfile
- [ ] Create docker-compose.yml for development
- [ ] Create docker-compose.prod.yml for production
- [ ] Configure Spring Boot to serve React static files

### 1.2 Redis Integration
- [ ] Add Spring Data Redis dependencies
- [ ] Configure Redis connection settings
- [ ] Implement Redis health check endpoint
- [ ] Set up Redis data structures for sessions
- [ ] Configure TTL for automatic session cleanup

## 2. Backend Core Features

### 2.1 REST API Endpoints
- [ ] POST `/api/sessions/create` - Create new puzzle session with UUID
- [ ] POST `/api/sessions/{id}/join` - Join existing session
- [ ] POST `/api/sessions/{id}/upload` - Upload image for puzzle
- [ ] GET `/api/sessions/{id}/state` - Get current puzzle state
- [ ] GET `/api/images/{filename}` - Serve puzzle images

### 2.2 WebSocket Implementation
- [ ] Configure Spring WebSocket without STOMP
- [ ] Implement native WebSocket handler at `/ws/puzzle/{sessionId}`
- [ ] Handle WebSocket connection lifecycle (open, close, error)
- [ ] Implement message routing for different event types
- [ ] Add connection authentication/validation

### 2.3 Session Management Service
- [ ] Create SessionService for Redis operations
- [ ] Implement session creation with UUID generation
- [ ] Store session metadata in Redis Hash
- [ ] Manage active users with Redis Sorted Set
- [ ] Track piece positions in Redis Hash
- [ ] Implement session expiry with TTL

### 2.4 Image Processing Service
- [ ] Implement image upload validation (JPG/PNG, 10MB max)
- [ ] Create grid-based image slicer (3x3, 5x5, 8x8)
- [ ] Generate piece metadata (id, position, dimensions)
- [ ] Store uploaded images in local volume
- [ ] Create piece-to-image mapping

### 2.5 Puzzle Service
- [ ] Implement puzzle creation from uploaded image
- [ ] Generate random initial piece positions
- [ ] Calculate snap distance threshold (20px)
- [ ] Validate piece movements
- [ ] Track piece placement status

## 3. Frontend Core Features

### 3.1 React Application Setup
- [ ] Configure React Router for navigation
- [ ] Set up Redux Toolkit store
- [ ] Configure axios for API calls
- [ ] Implement React DnD for drag-and-drop

### 3.2 Screens & Components

#### Login Screen
- [ ] Create login form with name input
- [ ] Add "Create New Puzzle" button
- [ ] Add "Join Existing Puzzle" with UUID input
- [ ] Implement form validation
- [ ] Handle navigation to puzzle setup/workspace

#### Upload Screen
- [ ] Create file upload component
- [ ] Add file type/size validation
- [ ] Display upload progress
- [ ] Add difficulty selector (3x3, 5x5, 8x8)
- [ ] Implement "Create Puzzle" action

#### Puzzle Canvas
- [ ] Create main canvas component
- [ ] Implement piece rendering
- [ ] Set up drag-and-drop handlers
- [ ] Add drop zone detection
- [ ] Render user cursors

#### Puzzle Piece Component
- [ ] Create draggable piece component
- [ ] Display piece image segment
- [ ] Show drag preview
- [ ] Indicate when piece is placed
- [ ] Show user holding piece

#### User List Component
- [ ] Display active users in session
- [ ] Show user names
- [ ] Indicate user colors/cursors
- [ ] Update in real-time

### 3.3 WebSocket Integration
- [ ] Create useWebSocket hook with native WebSocket API
- [ ] Implement connection management
- [ ] Handle reconnection logic
- [ ] Parse and route incoming messages
- [ ] Throttle outgoing messages (60ms)

### 3.4 State Management
- [ ] Create puzzleSlice with Redux Toolkit
- [ ] Manage piece positions
- [ ] Track user list
- [ ] Store session metadata
- [ ] Handle optimistic updates

## 4. Real-time Collaboration Features

### 4.1 Piece Movement Sync
- [ ] Send PIECE_MOVE events via WebSocket
- [ ] Receive and apply remote piece movements
- [ ] Implement movement throttling
- [ ] Handle concurrent move conflicts
- [ ] Update piece positions in Redux

### 4.2 Piece Snapping
- [ ] Calculate distance to correct position on drop
- [ ] Snap piece if within threshold (20px)
- [ ] Send PIECE_SNAP event
- [ ] Mark piece as placed
- [ ] Prevent moving placed pieces

### 4.3 User Presence
- [ ] Send USER_JOIN on connection
- [ ] Send USER_LEAVE on disconnect
- [ ] Broadcast user list updates
- [ ] Display user cursors
- [ ] Show piece ownership

## 5. Data Models

### 5.1 Backend Models
- [ ] Create PuzzleSession entity
- [ ] Create PuzzlePiece entity
- [ ] Create User entity
- [ ] Create DTOs for API requests/responses
- [ ] Create WebSocket message POJOs

### 5.2 Frontend Models
- [ ] Define TypeScript interfaces for entities
- [ ] Create API response types
- [ ] Define WebSocket message types
- [ ] Create Redux state interfaces

## 6. Error Handling & Validation

### 6.1 Backend Validation
- [ ] Validate session IDs
- [ ] Validate user names (alphanumeric, max 20 chars)
- [ ] Validate image uploads
- [ ] Validate piece movements
- [ ] Handle Redis connection errors

### 6.2 Frontend Error Handling
- [ ] Handle API errors gracefully
- [ ] Show user-friendly error messages
- [ ] Handle WebSocket disconnections
- [ ] Implement retry logic
- [ ] Display connection status

## 7. Development Tools & Configuration

### 7.1 Spring Boot Configuration
- [ ] Configure CORS for development
- [ ] Set up application profiles (dev, docker, production)
- [ ] Configure static resource serving
- [ ] Add health check endpoints
- [ ] Configure logging

### 7.2 Build Configuration
- [ ] Configure Maven/Gradle build
- [ ] Set up frontend build script
- [ ] Configure production build optimization
- [ ] Set up environment variables
- [ ] Create build documentation

## 8. Testing (Optional for MVP)

### 8.1 Backend Tests
- [ ] Unit tests for services
- [ ] Integration tests for REST endpoints
- [ ] WebSocket connection tests
- [ ] Redis integration tests

### 8.2 Frontend Tests
- [ ] Component unit tests
- [ ] Redux store tests
- [ ] WebSocket hook tests
- [ ] Drag-and-drop tests

## 9. Deployment & DevOps

### 9.1 Docker Setup
- [ ] Create multi-stage Dockerfile
- [ ] Configure docker-compose for development
- [ ] Configure docker-compose for production
- [ ] Set up volume mounts for uploads
- [ ] Configure networking between containers

### 9.2 Production Readiness
- [ ] Configure JVM memory settings
- [ ] Set up Redis memory limits
- [ ] Configure health checks
- [ ] Implement graceful shutdown
- [ ] Add monitoring endpoints

## Feature Priority Order

### Phase 1: Core Infrastructure (Week 1)
1. Project setup and structure
2. Docker configuration
3. Redis integration
4. Basic Spring Boot endpoints
5. React application skeleton

### Phase 2: Basic Functionality (Week 2)
1. Login and session creation
2. Image upload and processing
3. Puzzle piece generation
4. Basic puzzle canvas
5. Drag and drop implementation

### Phase 3: Real-time Features (Week 3)
1. WebSocket connection
2. Piece movement sync
3. User presence
4. Piece snapping
5. Error handling and polish

## Success Criteria
- Users can create/join puzzle sessions
- Images successfully convert to puzzle pieces
- Multiple users can move pieces simultaneously
- Pieces snap when close to correct position
- Application runs in Docker containers
- Redis stores all session state