# Product Requirements Document: Collaborative Jigsaw Puzzle

## Executive Summary

The Collaborative Jigsaw Puzzle is a real-time web application that enables multiple users to work together on solving digital jigsaw puzzles. Users can upload images, which are automatically converted into puzzle pieces, and collaborate in a shared workspace to assemble the puzzle.

### MVP Focus
The minimum viable product will deliver a functional collaborative puzzle experience with:
- Simple user login (name only)
- UUID-based puzzle sessions for easy sharing
- Basic image upload and grid-based puzzle generation
- Real-time collaborative piece movement
- Puzzle pieces should snap into place
- No complex features like piece rotation, or alternative piece shapes.

## Product Overview

### Vision
Create an engaging, collaborative puzzle-solving experience that brings people together through shared problem-solving and creativity.

### Target Users
- Friends and families looking for online activities
- Remote teams seeking team-building exercises
- Educational institutions for collaborative learning
- Puzzle enthusiasts wanting a digital experience

## MVP Features (Must Have)

### 1. Basic User Login
- Simple name entry (no registration/authentication)
- Join puzzle session with UUID
- Create new puzzle session with auto-generated UUID

### 2. Image Upload
- Support JPG/PNG formats
- 10MB file size limit
- Fixed difficulty options (3x3, 5x5, 8x8 grid)

### 3. Basic Puzzle Generation
- Simple grid-based rectangular pieces (no interlocking shapes)
- Unique piece identifiers
- Random initial placement on canvas

### 4. Real-time Collaboration
- Multiple users in same puzzle session
- Real-time piece movement synchronization
- Basic drag and drop (no rotation)
- See other users' cursors and names in the room

## Nice-to-Have Features (Post-MVP)

### 1. Enhanced User Experience
- Session persistence/rejoin capability
- User avatars or color coding
- Active user indicators on pieces
- User cursor tracking

### 2. Advanced Image Management
- GIF support
- Image preview before puzzle creation
- Image cropping/adjustment tools
- Custom difficulty settings

### 3. Advanced Puzzle Features
- Classic interlocking jigsaw piece shapes
- Piece rotation capability
- Snap-to-grid when pieces are close
- Visual/audio feedback for correct connections
- Progress percentage indicator
- Grouped piece movement

### 4. Workspace Enhancements
- Pan and zoom controls
- Reference image toggle
- Piece edge highlighting
- "Find my pieces" feature
- Workspace boundaries
- Mini-map navigation

### 5. Social Features
- In-game chat
- Completion celebrations/animations
- Time tracking and leaderboards
- Share completed puzzle results
- Spectator mode

## Technical Architecture

### Frontend
- **Framework**: React for reactive UI
- **Real-time**: Native WebSocket API (no external libraries)
- **Canvas**: HTML5 Canvas or SVG for puzzle rendering
- **State Management**: Redux Toolkit for state handling
- **Deployment**: Built and served from Spring Boot static resources

### Backend
- **Server**: Java with Spring Boot framework (serves both API and React frontend)
- **Real-time**: Native WebSocket support via Spring WebSocket
  - Room-based architecture for puzzle session isolation
  - Direct WebSocket connections without STOMP protocol
- **Data Store**: Redis (REQUIRED for MVP)
  - Primary datastore for all application data
  - Stores puzzle sessions, user data, piece positions
  - Each puzzle session identified by UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
  - Automatic session expiry with TTL
  - No SQL database needed for MVP
- **Image Processing**: Java ImageIO or ImageMagick integration for piece generation
- **Static Resources**: Spring Boot serves React build output from /static
- **Build Tool**: Maven or Gradle
- **Java Version**: Java 11+ (LTS)

### Infrastructure
- **Containerization**: Docker for both local development and production deployment
  - Application container + Redis container via docker-compose
- **Hosting**: Cloud platform with Docker support (AWS ECS, Google Cloud Run, or Kubernetes)
- **CDN**: For image delivery (post-MVP)
- **Container Registry**: Docker Hub or cloud provider registry

## User Experience Flow

1. **Landing Page**
   - Welcome message
   - "Start New Puzzle" or "Join Existing Puzzle" options

2. **Login Screen**
   - Name input field
   - Room code (UUID) for joining specific puzzles
   - Auto-generated UUID for new puzzle sessions

3. **Puzzle Setup** (for new puzzles)
   - Image upload interface
   - Difficulty selection
   - "Create Puzzle" button

4. **Collaborative Workspace**
   - Scattered puzzle pieces
   - Reference image (toggleable)
   - User list sidebar
   - Progress indicator
   - Chat/communication panel (future enhancement)

5. **Completion**
   - Celebration animation
   - Time taken display
   - Option to start new puzzle

## Implementation Phases

### Phase 1 - MVP (2-3 weeks)
- Basic user login with name entry
- UUID-based puzzle sessions
- Image upload (JPG/PNG, 10MB limit)
- Simple rectangular grid pieces
- Real-time drag and drop synchronization
- Basic user list display

### Phase 2 - Core Enhancements (2-3 weeks)
- Interlocking jigsaw piece shapes
- Snap-to-position functionality
- Progress tracking
- Session persistence
- Reference image toggle
- Basic zoom controls

### Phase 3 - Polish & Advanced Features (3-4 weeks)
- Full pan/zoom controls
- Piece rotation
- Completion animations
- Chat functionality
- Mobile responsive design
- Performance optimizations

## Success Metrics

- Number of puzzles completed
- Average session duration
- Number of concurrent users
- User return rate
- Average completion time by difficulty

## Constraints & Considerations

### Performance
- Optimize for 2-10 concurrent users per puzzle session
- Support 100+ concurrent puzzle sessions
- Smooth drag operations (60 FPS target)
- Minimal latency for piece movements (<100ms)
- Efficient session cleanup when puzzles are abandoned
- Docker container memory limit: 512MB for MVP

### Deployment
- Single Docker image containing both frontend and backend
- Environment-based configuration via environment variables
- Health check endpoints for container orchestration
- Graceful shutdown handling for active sessions

### Accessibility
- Keyboard navigation support
- Screen reader compatibility where possible
- Color contrast compliance

### Security
- Input validation for uploads
- Rate limiting for image uploads
- Sanitization of user names

## Future Enhancements

- User accounts with puzzle history
- Custom piece shapes
- Competitive modes with timers
- Voice/video chat integration
- Mobile app versions
- AI-assisted puzzle solving hints
- Social features (share completed puzzles)
- Puzzle gallery/marketplace

## Risk Mitigation

### Technical Risks
- **Real-time sync issues**: Implement conflict resolution
- **Performance with large images**: Image optimization pipeline
- **Scalability**: Plan for horizontal scaling early

### User Experience Risks
- **Piece visibility**: Implement piece highlighting/finding
- **Accidental disconnections**: Auto-save and rejoin capability
- **Griefing**: Admin controls to reset pieces

## Timeline Estimate

- **MVP (Phase 1)**: 2-3 weeks - Functional collaborative puzzle
- **Phase 2**: 2-3 weeks - Enhanced puzzle mechanics
- **Phase 3**: 3-4 weeks - Polish and advanced features
- **Total**: 7-10 weeks for full-featured release

## MVP Definition Summary

### What's IN the MVP:
✅ Basic login (name only)
✅ UUID-based sessions
✅ Multiple concurrent puzzle rooms
✅ JPG/PNG upload (10MB limit)
✅ Simple rectangular grid pieces
✅ Real-time drag & drop sync
✅ Piece snapping when close to correct position
✅ User list display
✅ User cursor visibility
✅ Java Spring Boot backend serving React frontend
✅ Native WebSocket API (no external libraries)
✅ Fixed difficulty options (3x3, 5x5, 8x8)
✅ Redis as primary datastore (no SQL database)
✅ Docker containerization with docker-compose
✅ Multi-stage Docker build for optimized images

### What's NOT in the MVP:
❌ User authentication/accounts
❌ Interlocking piece shapes
❌ Piece rotation
❌ Zoom/pan controls
❌ Progress tracking
❌ Chat functionality
❌ Image preview
❌ Completion animations
❌ Mobile optimization
❌ External WebSocket libraries (using native API)
❌ SQL database (Redis only for MVP)
❌ Persistent storage beyond session lifetime