package com.puzzle.service;

import com.puzzle.model.PuzzlePiece;
import com.puzzle.model.PuzzleSession;
import com.puzzle.model.User;
import com.puzzle.repository.ImageRepository;
import com.puzzle.repository.PuzzleSessionRepository;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PuzzleService {
    
    @Autowired
    private PuzzleSessionRepository sessionRepository;
    
    @Autowired
    private ImageRepository imageRepository;
    
    @Value("${puzzle.piece.snap-threshold}")
    private int snapThreshold;
    
    private final String[] CURSOR_COLORS = {
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57",
        "#FF9FF3", "#54A0FF", "#48DBFB", "#1DD1A1", "#F368E0"
    };
    
    public PuzzleSession createSession(MultipartFile imageFile, int gridSize) throws IOException {
        // Validate grid size
        if (gridSize != 3 && gridSize != 5 && gridSize != 8) {
            throw new IllegalArgumentException("Invalid grid size. Must be 3, 5, or 8.");
        }
        
        // Process and store image
        BufferedImage originalImage = ImageIO.read(imageFile.getInputStream());
        if (originalImage == null) {
            throw new IOException("Failed to read image. The file may be corrupted or in an unsupported format.");
        }
        
        BufferedImage resizedImage = Thumbnails.of(originalImage)
                .size(500, 400)
                .keepAspectRatio(true)
                .asBufferedImage();
        
        String imageId = UUID.randomUUID().toString();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(resizedImage, "png", baos);
        imageRepository.saveImage(imageId, baos.toByteArray());
        
        // Create puzzle session
        PuzzleSession session = new PuzzleSession();
        session.setId(UUID.randomUUID().toString());
        session.setImageUrl("/api/images/" + imageId);
        session.setGridSize(gridSize);
        session.setTotalPieces(gridSize * gridSize);
        session.setCreatedAt(LocalDateTime.now());
        session.setCompleted(false);
        session.setImageWidth(resizedImage.getWidth());
        session.setImageHeight(resizedImage.getHeight());
        
        // Create puzzle pieces and cut the image
        List<PuzzlePiece> pieces = createPuzzlePieces(gridSize, resizedImage.getWidth(), resizedImage.getHeight());
        cutImageIntoPieces(resizedImage, pieces, gridSize);
        session.setPieces(pieces);
        
        sessionRepository.save(session);
        return session;
    }
    
    private List<PuzzlePiece> createPuzzlePieces(int gridSize, int imageWidth, int imageHeight) {
        List<PuzzlePiece> pieces = new ArrayList<>();
        int pieceWidth = imageWidth / gridSize;
        int pieceHeight = imageHeight / gridSize;
        
        // Create pieces in random positions
        List<Integer> positions = new ArrayList<>();
        for (int i = 0; i < gridSize * gridSize; i++) {
            positions.add(i);
        }
        Collections.shuffle(positions);
        
        int pieceId = 0;
        for (int row = 0; row < gridSize; row++) {
            for (int col = 0; col < gridSize; col++) {
                PuzzlePiece piece = new PuzzlePiece();
                piece.setId(pieceId);
                piece.setRow(row);
                piece.setCol(col);
                piece.setWidth(pieceWidth);
                piece.setHeight(pieceHeight);
                
                // Correct position
                piece.setCorrectX(col * pieceWidth);
                piece.setCorrectY(row * pieceHeight);
                
                // Arrange pieces in a grid to the right of the target area
                // Container is 1200x800, image area is on the left, so scatter pieces in remaining space
                int randomPos = positions.get(pieceId);
                
                // Calculate grid arrangement based on available space
                // With smaller image (500x400), we have more room for pieces
                int scatterStartX = imageWidth + 100; // Start scatter area 100px right of image
                int maxX = 1150; // Leave 50px margin on the right
                int availableWidth = maxX - scatterStartX;
                
                // Calculate columns and rows for scatter area with proper spacing
                int pieceSpacing = 15; // Space between pieces
                int maxPieceSize = Math.max(pieceWidth, pieceHeight);
                int scatterCols = Math.max(1, availableWidth / (maxPieceSize + pieceSpacing));
                scatterCols = Math.min(scatterCols, gridSize); // Don't use more columns than grid size
                
                int randomRow = randomPos / scatterCols;
                int randomCol = randomPos % scatterCols;
                
                // Position pieces with proper spacing to avoid overlap
                int xPos = scatterStartX + (randomCol * (maxPieceSize + pieceSpacing));
                int yPos = 50 + (randomRow * (maxPieceSize + pieceSpacing));
                
                // Ensure pieces don't go off screen
                piece.setCurrentX(Math.min(xPos, maxX - pieceWidth));
                piece.setCurrentY(Math.min(yPos, 750 - pieceHeight)); // Container height is 800
                
                piece.setPlaced(false);
                pieces.add(piece);
                pieceId++;
            }
        }
        
        return pieces;
    }
    
    private void cutImageIntoPieces(BufferedImage originalImage, List<PuzzlePiece> pieces, int gridSize) {
        int pieceWidth = originalImage.getWidth() / gridSize;
        int pieceHeight = originalImage.getHeight() / gridSize;
        
        for (PuzzlePiece piece : pieces) {
            try {
                // Extract the piece from the original image
                int x = piece.getCol() * pieceWidth;
                int y = piece.getRow() * pieceHeight;
                
                // Handle edge pieces that might be slightly larger due to rounding
                int actualWidth = Math.min(pieceWidth, originalImage.getWidth() - x);
                int actualHeight = Math.min(pieceHeight, originalImage.getHeight() - y);
                
                BufferedImage pieceImage = originalImage.getSubimage(x, y, actualWidth, actualHeight);
                
                // Save the piece image
                String pieceImageId = UUID.randomUUID().toString();
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(pieceImage, "png", baos);
                imageRepository.saveImage(pieceImageId, baos.toByteArray());
                
                // Set the image URL for the piece
                piece.setImageUrl("/api/images/" + pieceImageId);
            } catch (IOException e) {
                throw new RuntimeException("Failed to create piece image", e);
            }
        }
    }
    
    public PuzzleSession getSession(String sessionId) {
        return sessionRepository.findById(sessionId);
    }
    
    public User joinSession(String sessionId, String userName) {
        PuzzleSession session = sessionRepository.findById(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Session not found");
        }
        
        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setName(userName);
        user.setColor(CURSOR_COLORS[session.getUsers().size() % CURSOR_COLORS.length]);
        user.setCursorX(0.0);
        user.setCursorY(0.0);
        
        session.getUsers().put(user.getId(), user);
        sessionRepository.save(session);
        
        return user;
    }
    
    public void leaveSession(String sessionId, String userId) {
        PuzzleSession session = sessionRepository.findById(sessionId);
        if (session != null) {
            session.getUsers().remove(userId);
            
            // Unlock any pieces locked by this user
            for (PuzzlePiece piece : session.getPieces()) {
                if (userId.equals(piece.getLockedBy())) {
                    piece.setLockedBy(null);
                }
            }
            
            sessionRepository.save(session);
        }
    }
    
    public boolean movePiece(String sessionId, int pieceId, double x, double y, String userId) {
        PuzzleSession session = sessionRepository.findById(sessionId);
        if (session == null) {
            return false;
        }
        
        // Don't allow any piece movement if puzzle is completed
        if (session.isCompleted()) {
            return false;
        }
        
        PuzzlePiece piece = session.getPieces().stream()
                .filter(p -> p.getId() == pieceId)
                .findFirst()
                .orElse(null);
        
        if (piece == null) {
            return false;
        }
        
        // Check if piece is locked by another user
        if (piece.getLockedBy() != null && !piece.getLockedBy().equals(userId)) {
            return false;
        }
        
        // Just update position without snapping during drag
        piece.setCurrentX(x);
        piece.setCurrentY(y);
        
        sessionRepository.save(session);
        return true;
    }
    
    public boolean releasePiece(String sessionId, int pieceId, double x, double y, String userId) {
        PuzzleSession session = sessionRepository.findById(sessionId);
        if (session == null) {
            return false;
        }
        
        // Don't allow any piece movement if puzzle is completed
        if (session.isCompleted()) {
            return false;
        }
        
        PuzzlePiece piece = session.getPieces().stream()
                .filter(p -> p.getId() == pieceId)
                .findFirst()
                .orElse(null);
        
        if (piece == null) {
            return false;
        }
        
        // Calculate piece dimensions
        int pieceWidth = session.getImageWidth() / session.getGridSize();
        int pieceHeight = session.getImageHeight() / session.getGridSize();
        
        // Calculate the target area offset (where puzzle should be assembled)
        int targetAreaX = 50; // matches the frontend positioning
        int targetAreaY = 50;
        
        // Calculate center of the piece for snapping
        double pieceCenterX = x + (pieceWidth / 2.0);
        double pieceCenterY = y + (pieceHeight / 2.0);
        
        // Find the closest grid position by checking all nearby candidates
        int baseCol = (int)Math.floor((pieceCenterX - targetAreaX) / (double)pieceWidth);
        int baseRow = (int)Math.floor((pieceCenterY - targetAreaY) / (double)pieceHeight);
        
        int nearestCol = -1;
        int nearestRow = -1;
        double minDistance = Double.MAX_VALUE;
        
        // Check 4 nearby grid cells (current cell and adjacent ones)
        for (int colOffset = 0; colOffset <= 1; colOffset++) {
            for (int rowOffset = 0; rowOffset <= 1; rowOffset++) {
                int testCol = baseCol + colOffset;
                int testRow = baseRow + rowOffset;
                
                // Skip if outside grid bounds
                if (testCol < 0 || testCol >= session.getGridSize() || 
                    testRow < 0 || testRow >= session.getGridSize()) {
                    continue;
                }
                
                // Calculate distance to this grid cell center
                double gridCenterX = targetAreaX + testCol * pieceWidth + (pieceWidth / 2.0);
                double gridCenterY = targetAreaY + testRow * pieceHeight + (pieceHeight / 2.0);
                double dist = Math.sqrt(
                    Math.pow(pieceCenterX - gridCenterX, 2) + 
                    Math.pow(pieceCenterY - gridCenterY, 2)
                );
                
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestCol = testCol;
                    nearestRow = testRow;
                }
            }
        }
        
        // Calculate snap position (top-left corner of the grid cell)
        double snapX = targetAreaX + nearestCol * pieceWidth;
        double snapY = targetAreaY + nearestRow * pieceHeight;
        
        double distance = minDistance;
        
        if (distance <= snapThreshold) {
            // Snap to grid position
            piece.setCurrentX(snapX);
            piece.setCurrentY(snapY);
            
            // Check if it's the correct position and mark as placed
            if (nearestCol == piece.getCol() && nearestRow == piece.getRow()) {
                piece.setPlaced(true);
                
                // Check if puzzle is complete
                boolean allPlaced = session.getPieces().stream().allMatch(PuzzlePiece::isPlaced);
                if (allPlaced) {
                    session.setCompleted(true);
                }
            } else {
                // Piece is snapped but not in correct position
                piece.setPlaced(false);
            }
        } else {
            // Keep position as is
            piece.setCurrentX(x);
            piece.setCurrentY(y);
            piece.setPlaced(false);
        }
        
        sessionRepository.save(session);
        return true;
    }
    
    public boolean lockPiece(String sessionId, int pieceId, String userId) {
        PuzzleSession session = sessionRepository.findById(sessionId);
        if (session == null) {
            return false;
        }
        
        // Don't allow locking pieces if puzzle is completed
        if (session.isCompleted()) {
            return false;
        }
        
        PuzzlePiece piece = session.getPieces().stream()
                .filter(p -> p.getId() == pieceId)
                .findFirst()
                .orElse(null);
        
        if (piece == null || 
            (piece.getLockedBy() != null && !piece.getLockedBy().equals(userId))) {
            return false;
        }
        
        piece.setLockedBy(userId);
        sessionRepository.save(session);
        return true;
    }
    
    public boolean unlockPiece(String sessionId, int pieceId, String userId) {
        PuzzleSession session = sessionRepository.findById(sessionId);
        if (session == null) {
            return false;
        }
        
        PuzzlePiece piece = session.getPieces().stream()
                .filter(p -> p.getId() == pieceId)
                .findFirst()
                .orElse(null);
        
        if (piece == null || !userId.equals(piece.getLockedBy())) {
            return false;
        }
        
        piece.setLockedBy(null);
        sessionRepository.save(session);
        return true;
    }
    
    public void updateCursor(String sessionId, String userId, double x, double y) {
        PuzzleSession session = sessionRepository.findById(sessionId);
        if (session != null && session.getUsers().containsKey(userId)) {
            User user = session.getUsers().get(userId);
            user.setCursorX(x);
            user.setCursorY(y);
            sessionRepository.save(session);
        }
    }
}