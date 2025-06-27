package com.puzzle;

import com.puzzle.model.PuzzleSession;
import com.puzzle.model.User;
import com.puzzle.repository.ImageRepository;
import com.puzzle.repository.PuzzleSessionRepository;
import com.puzzle.service.PuzzleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.file.Files;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.mockito.stubbing.Answer;

@ExtendWith(MockitoExtension.class)
public class PuzzleServiceTest {
    
    @Mock
    private PuzzleSessionRepository sessionRepository;
    
    @Mock
    private ImageRepository imageRepository;
    
    @InjectMocks
    private PuzzleService puzzleService;
    
    private PuzzleSession testSession;
    
    @BeforeEach
    void setUp() {
        testSession = new PuzzleSession();
        testSession.setId("test-session-id");
        testSession.setGridSize(3);
        testSession.setTotalPieces(9);
    }
    
    @Test
    void testCreateSession() throws IOException {
        // Load real test image
        ClassPathResource imageResource = new ClassPathResource("test-image.jpeg");
        byte[] imageBytes = Files.readAllBytes(imageResource.getFile().toPath());
        MockMultipartFile mockFile = new MockMultipartFile(
            "image", 
            "test-image.jpeg", 
            "image/jpeg", 
            imageBytes
        );
        
        // Mock repository behavior
        doAnswer(invocation -> {
            String imageId = invocation.getArgument(0);
            byte[] imageData = invocation.getArgument(1);
            assertTrue(imageId != null && !imageId.isEmpty());
            assertTrue(imageData.length > 0);
            return null;
        }).when(imageRepository).saveImage(anyString(), any(byte[].class));
        
        doNothing().when(sessionRepository).save(any(PuzzleSession.class));
        
        // Test session creation
        PuzzleSession session = puzzleService.createSession(mockFile, 3);
        
        assertNotNull(session);
        assertEquals(3, session.getGridSize());
        assertEquals(9, session.getTotalPieces());
        assertEquals(9, session.getPieces().size());
        assertFalse(session.isCompleted());
        
        // Verify original image was saved  
        verify(imageRepository, atLeastOnce()).saveImage(anyString(), any(byte[].class));
        verify(sessionRepository, times(1)).save(any(PuzzleSession.class));
        
        // Verify pieces have correct dimensions
        session.getPieces().forEach(piece -> {
            assertTrue(piece.getWidth() > 0);
            assertTrue(piece.getHeight() > 0);
            assertTrue(piece.getCurrentX() >= 0);
            assertTrue(piece.getCurrentY() >= 0);
        });
    }
    
    @Test
    void testJoinSession() {
        when(sessionRepository.findById("test-session-id")).thenReturn(testSession);
        doNothing().when(sessionRepository).save(any(PuzzleSession.class));
        
        User user = puzzleService.joinSession("test-session-id", "TestUser");
        
        assertNotNull(user);
        assertEquals("TestUser", user.getName());
        assertNotNull(user.getId());
        assertNotNull(user.getColor());
        
        verify(sessionRepository, times(1)).findById("test-session-id");
        verify(sessionRepository, times(1)).save(testSession);
    }
    
    @Test
    void testJoinSessionNotFound() {
        when(sessionRepository.findById("invalid-id")).thenReturn(null);
        
        assertThrows(IllegalArgumentException.class, () -> {
            puzzleService.joinSession("invalid-id", "TestUser");
        });
    }
    
    @Test
    void testInvalidGridSize() throws IOException {
        ClassPathResource imageResource = new ClassPathResource("test-image.jpeg");
        byte[] imageBytes = Files.readAllBytes(imageResource.getFile().toPath());
        MockMultipartFile mockFile = new MockMultipartFile(
            "image", 
            "test-image.jpeg", 
            "image/jpeg", 
            imageBytes
        );
        
        assertThrows(IllegalArgumentException.class, () -> {
            puzzleService.createSession(mockFile, 4); // Invalid grid size
        });
    }
    
    @Test
    void testGetSession() {
        when(sessionRepository.findById("test-session-id")).thenReturn(testSession);
        
        PuzzleSession result = puzzleService.getSession("test-session-id");
        
        assertNotNull(result);
        assertEquals("test-session-id", result.getId());
        verify(sessionRepository, times(1)).findById("test-session-id");
    }
    
    @Test
    void testGetSessionNotFound() {
        when(sessionRepository.findById("invalid-id")).thenReturn(null);
        
        PuzzleSession result = puzzleService.getSession("invalid-id");
        assertNull(result);
    }
}