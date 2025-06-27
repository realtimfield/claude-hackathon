package com.puzzle.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.puzzle.model.PuzzleSession;
import com.puzzle.model.PuzzlePiece;
import com.puzzle.model.User;
import com.puzzle.service.PuzzleService;
import com.puzzle.model.WebSocketMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PuzzleWebSocketHandlerTest {

    @Mock
    private PuzzleService puzzleService;
    
    @Mock
    private ObjectMapper mockObjectMapper;

    @Mock
    private WebSocketSession session;

    @InjectMocks
    private PuzzleWebSocketHandler handler;

    private ObjectMapper objectMapper = new ObjectMapper();
    private PuzzleSession puzzleSession;
    private User testUser;

    @BeforeEach
    void setUp() {
        // Set up test data
        puzzleSession = new PuzzleSession();
        puzzleSession.setId("test-session-id");
        puzzleSession.setGridSize(3);
        puzzleSession.setTotalPieces(9);
        puzzleSession.setPieces(new ArrayList<>());
        puzzleSession.setUsers(new HashMap<>());

        // Add test pieces
        for (int i = 0; i < 9; i++) {
            PuzzlePiece piece = new PuzzlePiece();
            piece.setId(i);
            piece.setRow(i / 3);
            piece.setCol(i % 3);
            piece.setCurrentX(100 + i * 50);
            piece.setCurrentY(100 + i * 50);
            piece.setPlaced(false);
            puzzleSession.getPieces().add(piece);
        }

        testUser = new User();
        testUser.setId("test-user-id");
        testUser.setName("TestUser");
        testUser.setColor("#FF0000");
    }

    @Test
    void testAfterConnectionEstablished() throws Exception {
        when(session.getUri()).thenReturn(java.net.URI.create("ws://localhost:8080/ws/puzzle/test-session-id?userId=test-user-id"));
        when(session.getId()).thenReturn("ws-session-id");
        when(puzzleService.getSession("test-session-id")).thenReturn(puzzleSession);
        
        // Add user to session
        puzzleSession.getUsers().put(testUser.getId(), testUser);

        handler.afterConnectionEstablished(session);

        verify(session, atLeastOnce()).sendMessage(any(TextMessage.class));
    }

    @Test
    void testHandlePieceMoveMessage() throws Exception {
        // Setup
        when(session.getUri()).thenReturn(java.net.URI.create("ws://localhost:8080/ws/puzzle/test-session-id?userId=test-user-id"));
        when(session.getId()).thenReturn("ws-session-id");
        when(puzzleService.getSession("test-session-id")).thenReturn(puzzleSession);
        
        // Add user to session
        puzzleSession.getUsers().put(testUser.getId(), testUser);

        // Establish connection
        handler.afterConnectionEstablished(session);

        // Send piece move message
        Map<String, Object> moveData = new HashMap<>();
        moveData.put("pieceId", 0);
        moveData.put("x", 200.0);
        moveData.put("y", 300.0);
        
        WebSocketMessage moveMessage = new WebSocketMessage(
            WebSocketMessage.MessageType.PIECE_MOVE,
            moveData
        );

        handler.handleTextMessage(session, new TextMessage(objectMapper.writeValueAsString(moveMessage)));

        verify(puzzleService).movePiece(eq("test-session-id"), eq(0), eq(200.0), eq(300.0), eq(testUser.getId()));
    }

    @Test
    void testHandlePieceLockMessage() throws Exception {
        // Setup
        when(session.getUri()).thenReturn(java.net.URI.create("ws://localhost:8080/ws/puzzle/test-session-id?userId=test-user-id"));
        when(session.getId()).thenReturn("ws-session-id");
        when(puzzleService.getSession("test-session-id")).thenReturn(puzzleSession);
        
        // Add user to session
        puzzleSession.getUsers().put(testUser.getId(), testUser);

        // Establish connection
        handler.afterConnectionEstablished(session);

        // Send piece lock message
        Map<String, Object> lockData = new HashMap<>();
        lockData.put("pieceId", 0);
        
        WebSocketMessage lockMessage = new WebSocketMessage(
            WebSocketMessage.MessageType.PIECE_LOCK,
            lockData
        );

        when(puzzleService.lockPiece(eq("test-session-id"), eq(0), eq(testUser.getId()))).thenReturn(true);

        handler.handleTextMessage(session, new TextMessage(objectMapper.writeValueAsString(lockMessage)));

        verify(puzzleService).lockPiece(eq("test-session-id"), eq(0), eq(testUser.getId()));
    }

    @Test
    void testHandlePieceUnlockMessage() throws Exception {
        // Setup
        when(session.getUri()).thenReturn(java.net.URI.create("ws://localhost:8080/ws/puzzle/test-session-id?userId=test-user-id"));
        when(session.getId()).thenReturn("ws-session-id");
        when(puzzleService.getSession("test-session-id")).thenReturn(puzzleSession);
        
        // Add user to session
        puzzleSession.getUsers().put(testUser.getId(), testUser);

        // Establish connection
        handler.afterConnectionEstablished(session);

        // Send piece unlock message
        Map<String, Object> unlockData = new HashMap<>();
        unlockData.put("pieceId", 0);
        
        WebSocketMessage unlockMessage = new WebSocketMessage(
            WebSocketMessage.MessageType.PIECE_UNLOCK,
            unlockData
        );

        handler.handleTextMessage(session, new TextMessage(objectMapper.writeValueAsString(unlockMessage)));

        verify(puzzleService).unlockPiece(eq("test-session-id"), eq(0), eq(testUser.getId()));
    }

    @Test
    void testAfterConnectionClosed() throws Exception {
        // Setup
        when(session.getUri()).thenReturn(java.net.URI.create("ws://localhost:8080/ws/puzzle/test-session-id?userId=test-user-id"));
        when(session.getId()).thenReturn("ws-session-id");
        when(puzzleService.getSession("test-session-id")).thenReturn(puzzleSession);

        // Establish connection first
        handler.afterConnectionEstablished(session);

        // Close connection
        handler.afterConnectionClosed(session, CloseStatus.NORMAL);

        // WebSocketHandler should handle cleanup internally
        // Verify connection was removed from internal maps (indirectly via no exceptions)
    }
}