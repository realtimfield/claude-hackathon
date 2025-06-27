package com.puzzle.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.puzzle.model.PuzzlePiece;
import com.puzzle.model.PuzzleSession;
import com.puzzle.model.User;
import com.puzzle.model.WebSocketMessage;
import com.puzzle.service.PuzzleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class PuzzleWebSocketHandler extends TextWebSocketHandler {
    
    @Autowired
    private PuzzleService puzzleService;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    // Maps sessionId to WebSocket sessions
    private final Map<String, CopyOnWriteArraySet<WebSocketSession>> puzzleSessions = new ConcurrentHashMap<>();
    
    // Maps WebSocket session to user info
    private final Map<String, UserConnection> userConnections = new ConcurrentHashMap<>();
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = extractSessionId(session);
        
        // Extract userId from query params if available
        String userId = null;
        String query = session.getUri().getQuery();
        if (query != null && query.contains("userId=")) {
            userId = query.split("userId=")[1].split("&")[0];
        }
        
        // Add to puzzle session
        puzzleSessions.computeIfAbsent(sessionId, k -> new CopyOnWriteArraySet<>()).add(session);
        
        // Store user connection (userId may be null initially)
        userConnections.put(session.getId(), new UserConnection(sessionId, userId));
        
        // Send current session state to new user
        PuzzleSession puzzleSession = puzzleService.getSession(sessionId);
        if (puzzleSession != null && userId != null) {
            Map<String, Object> stateData = Map.of(
                "session", puzzleSession,
                "userId", userId
            );
            WebSocketMessage stateMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.SESSION_STATE, 
                stateData
            );
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(stateMessage)));
            
            // Notify other users about new user
            User user = puzzleSession.getUsers().get(userId);
            if (user != null) {
                Map<String, Object> joinData = Map.of("user", user);
                WebSocketMessage joinMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.USER_JOIN, 
                    joinData
                );
                broadcastToOthers(sessionId, session.getId(), joinMessage);
            }
        }
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        UserConnection userConn = userConnections.get(session.getId());
        if (userConn == null) return;
        
        WebSocketMessage wsMessage = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
        Map<String, Object> data = wsMessage.getData();
        
        switch (wsMessage.getType()) {
            case PIECE_MOVE:
                handlePieceMove(userConn, data);
                break;
                
            case PIECE_LOCK:
                handlePieceLock(userConn, data);
                break;
                
            case PIECE_UNLOCK:
                handlePieceUnlock(userConn, data);
                break;
                
            case PIECE_RELEASE:
                handlePieceRelease(userConn, data);
                break;
                
            case CURSOR_MOVE:
                handleCursorMove(userConn, data);
                break;
        }
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UserConnection userConn = userConnections.remove(session.getId());
        if (userConn != null) {
            // Remove from puzzle session
            CopyOnWriteArraySet<WebSocketSession> sessions = puzzleSessions.get(userConn.sessionId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    puzzleSessions.remove(userConn.sessionId);
                }
            }
            
            // Leave puzzle session
            puzzleService.leaveSession(userConn.sessionId, userConn.userId);
            
            // Notify other users
            Map<String, Object> leaveData = Map.of("userId", userConn.userId);
            WebSocketMessage leaveMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.USER_LEAVE, 
                leaveData
            );
            broadcastToOthers(userConn.sessionId, session.getId(), leaveMessage);
        }
    }
    
    private void handlePieceMove(UserConnection userConn, Map<String, Object> data) throws Exception {
        int pieceId = ((Number) data.get("pieceId")).intValue();
        double x = ((Number) data.get("x")).doubleValue();
        double y = ((Number) data.get("y")).doubleValue();
        
        boolean moved = puzzleService.movePiece(userConn.sessionId, pieceId, x, y, userConn.userId);
        
        if (moved) {
            data.put("userId", userConn.userId);
            
            // Send PIECE_MOVE with the original coordinates (no snapping during drag)
            WebSocketMessage moveMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.PIECE_MOVE, 
                data
            );
            broadcastToAll(userConn.sessionId, moveMessage);
        }
    }
    
    private void handlePieceLock(UserConnection userConn, Map<String, Object> data) throws Exception {
        int pieceId = ((Number) data.get("pieceId")).intValue();
        
        boolean locked = puzzleService.lockPiece(userConn.sessionId, pieceId, userConn.userId);
        
        if (locked) {
            data.put("userId", userConn.userId);
            WebSocketMessage lockMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.PIECE_LOCK, 
                data
            );
            broadcastToOthers(userConn.sessionId, userConn.userId, lockMessage);
        }
    }
    
    private void handlePieceUnlock(UserConnection userConn, Map<String, Object> data) throws Exception {
        int pieceId = ((Number) data.get("pieceId")).intValue();
        
        boolean unlocked = puzzleService.unlockPiece(userConn.sessionId, pieceId, userConn.userId);
        
        if (unlocked) {
            data.put("userId", userConn.userId);
            WebSocketMessage unlockMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.PIECE_UNLOCK, 
                data
            );
            broadcastToOthers(userConn.sessionId, userConn.userId, unlockMessage);
        }
    }
    
    private void handlePieceRelease(UserConnection userConn, Map<String, Object> data) throws Exception {
        int pieceId = ((Number) data.get("pieceId")).intValue();
        double x = ((Number) data.get("x")).doubleValue();
        double y = ((Number) data.get("y")).doubleValue();
        
        boolean released = puzzleService.releasePiece(userConn.sessionId, pieceId, x, y, userConn.userId);
        
        if (released) {
            PuzzleSession session = puzzleService.getSession(userConn.sessionId);
            
            // Get the actual piece with its updated (possibly snapped) position
            PuzzlePiece piece = session.getPieces().stream()
                .filter(p -> p.getId() == pieceId)
                .findFirst()
                .orElse(null);
            
            if (piece != null) {
                // Update data with the actual position (which may be snapped)
                data.put("x", piece.getCurrentX());
                data.put("y", piece.getCurrentY());
                data.put("userId", userConn.userId);
                
                // Send PIECE_MOVE with snapped position
                WebSocketMessage moveMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.PIECE_MOVE, 
                    data
                );
                broadcastToAll(userConn.sessionId, moveMessage);
            }
            
            // Check if puzzle is complete
            if (session.isCompleted()) {
                // First send the updated session state with all placedBy information
                WebSocketMessage sessionMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.SESSION_STATE,
                    Map.of("session", session, "userId", userConn.userId)
                );
                broadcastToAll(userConn.sessionId, sessionMessage);
                
                // Then send the completion message
                WebSocketMessage completeMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.PUZZLE_COMPLETE, 
                    Map.of("completedAt", System.currentTimeMillis())
                );
                broadcastToAll(userConn.sessionId, completeMessage);
            }
        }
    }
    
    private void handleCursorMove(UserConnection userConn, Map<String, Object> data) throws Exception {
        double x = ((Number) data.get("x")).doubleValue();
        double y = ((Number) data.get("y")).doubleValue();
        
        puzzleService.updateCursor(userConn.sessionId, userConn.userId, x, y);
        
        data.put("userId", userConn.userId);
        WebSocketMessage cursorMessage = new WebSocketMessage(
            WebSocketMessage.MessageType.CURSOR_MOVE, 
            data
        );
        broadcastToOthers(userConn.sessionId, userConn.userId, cursorMessage);
    }
    
    private void broadcastToAll(String sessionId, WebSocketMessage message) throws Exception {
        CopyOnWriteArraySet<WebSocketSession> sessions = puzzleSessions.get(sessionId);
        if (sessions != null) {
            String messageJson = objectMapper.writeValueAsString(message);
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(messageJson));
                }
            }
        }
    }
    
    private void broadcastToOthers(String sessionId, String excludeSessionId, WebSocketMessage message) throws Exception {
        CopyOnWriteArraySet<WebSocketSession> sessions = puzzleSessions.get(sessionId);
        if (sessions != null) {
            String messageJson = objectMapper.writeValueAsString(message);
            for (WebSocketSession session : sessions) {
                if (session.isOpen() && !session.getId().equals(excludeSessionId)) {
                    session.sendMessage(new TextMessage(messageJson));
                }
            }
        }
    }
    
    private String extractSessionId(WebSocketSession session) {
        String path = session.getUri().getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }
    
    private static class UserConnection {
        final String sessionId;
        String userId;
        
        UserConnection(String sessionId, String userId) {
            this.sessionId = sessionId;
            this.userId = userId;
        }
    }
}