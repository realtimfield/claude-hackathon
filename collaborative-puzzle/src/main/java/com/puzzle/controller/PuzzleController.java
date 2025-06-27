package com.puzzle.controller;

import com.puzzle.model.PuzzleSession;
import com.puzzle.model.User;
import com.puzzle.service.PuzzleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PuzzleController {
    
    @Autowired
    private PuzzleService puzzleService;
    
    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(
            @RequestParam("image") MultipartFile image,
            @RequestParam("gridSize") int gridSize) {
        
        // Validate file
        if (image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No image provided"));
        }
        
        // Validate file type
        String contentType = image.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid file type. Only JPG and PNG are allowed"));
        }
        
        // Validate file size (10MB max)
        if (image.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "File too large. Maximum size is 10MB"));
        }
        
        try {
            PuzzleSession session = puzzleService.createSession(image, gridSize);
            return ResponseEntity.ok(Map.of("sessionId", session.getId()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process image"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable String sessionId) {
        PuzzleSession session = puzzleService.getSession(sessionId);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session);
    }
    
    @PostMapping("/sessions/{sessionId}/join")
    public ResponseEntity<?> joinSession(
            @PathVariable String sessionId,
            @RequestBody Map<String, String> request) {
        
        String name = request.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Name is required"));
        }
        
        try {
            User user = puzzleService.joinSession(sessionId, name.trim());
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}