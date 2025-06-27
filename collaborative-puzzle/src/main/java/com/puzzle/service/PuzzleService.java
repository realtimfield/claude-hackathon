package com.puzzle.service;

import com.puzzle.model.PuzzlePiece;
import com.puzzle.model.PuzzleSession;
import com.puzzle.model.User;
import com.puzzle.model.PieceShape;
import com.puzzle.repository.ImageRepository;
import com.puzzle.repository.PuzzleSessionRepository;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
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
    
    @Autowired
    private ShapeGenerationService shapeGenerationService;
    
    
    @Autowired
    private EdgeSnappingService edgeSnappingService;
    
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
        
        // Frontend already compressed the image, now resize to fit in a square with padding
        int targetSize = 480; // Square size for the puzzle
        
        // Calculate dimensions preserving aspect ratio
        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();
        double aspectRatio = (double) originalWidth / originalHeight;
        
        int newWidth, newHeight;
        if (aspectRatio > 1) {
            // Wider than tall
            newWidth = targetSize;
            newHeight = (int) (targetSize / aspectRatio);
        } else {
            // Taller than wide
            newHeight = targetSize;
            newWidth = (int) (targetSize * aspectRatio);
        }
        
        // Resize maintaining aspect ratio
        BufferedImage scaledImage = Thumbnails.of(originalImage)
                .size(newWidth, newHeight)
                .keepAspectRatio(true)
                .asBufferedImage();
        
        // Create square image with padding
        BufferedImage resizedImage = new BufferedImage(targetSize, targetSize, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = resizedImage.createGraphics();
        
        // Fill with a neutral background color (light gray)
        g2d.setColor(new Color(240, 240, 240));
        g2d.fillRect(0, 0, targetSize, targetSize);
        
        // Calculate centering position
        int x = (targetSize - newWidth) / 2;
        int y = (targetSize - newHeight) / 2;
        
        // Draw the scaled image centered
        g2d.drawImage(scaledImage, x, y, null);
        g2d.dispose();
        
        String imageId = UUID.randomUUID().toString();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        
        // Save as JPEG (frontend already compressed it)
        ImageIO.write(resizedImage, "JPEG", baos);
        
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
        
        // Generate jigsaw shapes for all pieces
        PieceShape[][] shapes = shapeGenerationService.generatePuzzleShapes(gridSize, gridSize);
        
        // Create puzzle pieces and cut the image
        java.util.List<PuzzlePiece> pieces = createPuzzlePieces(gridSize, resizedImage.getWidth(), resizedImage.getHeight());
        cutImageIntoPieces(resizedImage, pieces, gridSize);
        
        // Assign shapes to pieces
        for (PuzzlePiece piece : pieces) {
            piece.setShape(shapes[piece.getRow()][piece.getCol()]);
        }
        
        session.setPieces(pieces);
        
        sessionRepository.save(session);
        return session;
    }
    
    private java.util.List<PuzzlePiece> createPuzzlePieces(int gridSize, int imageWidth, int imageHeight) {
        java.util.List<PuzzlePiece> pieces = new ArrayList<>();
        int pieceWidth = imageWidth / gridSize;
        int pieceHeight = imageHeight / gridSize;
        
        // Create pieces in random positions
        java.util.List<Integer> positions = new ArrayList<>();
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
                
                // Correct position (includes the target area offset)
                piece.setCorrectX(50 + col * pieceWidth);
                piece.setCorrectY(50 + row * pieceHeight);
                
                // Arrange pieces in a grid to the right of the target area
                // Container is 1200x800, image area is on the left, so scatter pieces in remaining space
                int randomPos = positions.get(pieceId);
                
                // Calculate grid arrangement based on available space
                // With square image (480x480), we have more room for pieces
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
                piece.setPlacedBy(null); // Initialize as null
                
                // Set random initial rotation (0, 90, 180, or 270 degrees)
                int[] rotations = {0, 90, 180, 270};
                piece.setRotation(rotations[new Random().nextInt(4)]);
                piece.setCorrectRotation(0); // Correct orientation is always 0
                
                pieces.add(piece);
                pieceId++;
            }
        }
        
        return pieces;
    }
    
    
    private void cutImageIntoPieces(BufferedImage originalImage, java.util.List<PuzzlePiece> pieces, int gridSize) {
        int pieceWidth = originalImage.getWidth() / gridSize;
        int pieceHeight = originalImage.getHeight() / gridSize;
        
        // Extension factor for tabs (25% on each side)
        double extensionFactor = 0.25;
        int extension = (int) (Math.max(pieceWidth, pieceHeight) * extensionFactor);
        
        for (PuzzlePiece piece : pieces) {
            try {
                // Calculate extended bounds for piece extraction
                int x = piece.getCol() * pieceWidth - extension;
                int y = piece.getRow() * pieceHeight - extension;
                int extractWidth = pieceWidth + (extension * 2);
                int extractHeight = pieceHeight + (extension * 2);
                
                // Clamp to image bounds
                int sourceX = Math.max(0, x);
                int sourceY = Math.max(0, y);
                int sourceWidth = Math.min(extractWidth, originalImage.getWidth() - sourceX);
                int sourceHeight = Math.min(extractHeight, originalImage.getHeight() - sourceY);
                
                // Create a larger canvas for the piece
                BufferedImage pieceImage = new BufferedImage(extractWidth, extractHeight, BufferedImage.TYPE_INT_RGB);
                Graphics2D g2d = pieceImage.createGraphics();
                
                // Fill with a neutral color for areas outside the image
                g2d.setColor(Color.LIGHT_GRAY);
                g2d.fillRect(0, 0, extractWidth, extractHeight);
                
                // Draw the extracted portion
                int destX = sourceX - x;
                int destY = sourceY - y;
                g2d.drawImage(originalImage.getSubimage(sourceX, sourceY, sourceWidth, sourceHeight), 
                             destX, destY, null);
                g2d.dispose();
                
                // Save the piece image with compression
                String pieceImageId = UUID.randomUUID().toString();
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                
                // Save piece as JPEG
                ImageIO.write(pieceImage, "JPEG", baos);
                
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
        
        // Just update position without connected piece movement for now
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
        
        // Use simplified grid-based snapping (original logic)
        int pieceWidth = session.getImageWidth() / session.getGridSize();
        int pieceHeight = session.getImageHeight() / session.getGridSize();
        
        // Calculate the target area offset (where puzzle should be assembled)
        int targetAreaX = 50;
        int targetAreaY = 50;
        
        // Calculate center of the piece for snapping
        double pieceCenterX = x + (pieceWidth / 2.0);
        double pieceCenterY = y + (pieceHeight / 2.0);
        
        // Find the closest grid position by checking all nearby grid cells
        double minDistance = Double.MAX_VALUE;
        int bestCol = -1;
        int bestRow = -1;
        
        // Calculate rough position to limit search area
        int centerCol = (int) Math.round((pieceCenterX - targetAreaX) / (double) pieceWidth);
        int centerRow = (int) Math.round((pieceCenterY - targetAreaY) / (double) pieceHeight);
        
        // Check nearby grid positions (including diagonals)
        for (int row = centerRow - 1; row <= centerRow + 1; row++) {
            for (int col = centerCol - 1; col <= centerCol + 1; col++) {
                // Skip out-of-bounds positions
                if (row < 0 || row >= session.getGridSize() || 
                    col < 0 || col >= session.getGridSize()) {
                    continue;
                }
                
                // Calculate the center of this grid position
                double gridCenterX = targetAreaX + col * pieceWidth + pieceWidth / 2.0;
                double gridCenterY = targetAreaY + row * pieceHeight + pieceHeight / 2.0;
                
                // Calculate distance from piece center to grid center
                double dist = Math.sqrt(Math.pow(pieceCenterX - gridCenterX, 2) + 
                                      Math.pow(pieceCenterY - gridCenterY, 2));
                
                if (dist < minDistance) {
                    minDistance = dist;
                    bestCol = col;
                    bestRow = row;
                }
            }
        }
        
        // If we didn't find a valid position, don't snap
        if (bestCol < 0 || bestRow < 0) {
            // Keep position as is
            piece.setCurrentX(x);
            piece.setCurrentY(y);
            piece.setPlaced(false);
            sessionRepository.save(session);
            return true;
        }
        
        int nearestCol = bestCol;
        int nearestRow = bestRow;
        
        // Calculate snap position
        double snapX = targetAreaX + nearestCol * pieceWidth;
        double snapY = targetAreaY + nearestRow * pieceHeight;
        
        // Use the minimum distance we already calculated
        double distance = minDistance;
        
        // For rotated pieces, we might need a slightly larger threshold due to visual/logical bounds mismatch
        int effectiveThreshold = snapThreshold;
        if (piece.getRotation() % 180 != 0) {
            // For 90 and 270 degree rotations, increase threshold slightly
            effectiveThreshold = (int)(snapThreshold * 1.2);
        }
        
        if (distance <= effectiveThreshold) {
            // Snap to grid position
            piece.setCurrentX(snapX);
            piece.setCurrentY(snapY);
            
            // Check if it's the correct position AND rotation
            if (nearestCol == piece.getCol() && nearestRow == piece.getRow() && 
                piece.getRotation() == piece.getCorrectRotation()) {
                // Only set placedBy if it wasn't already placed
                if (!piece.isPlaced()) {
                    piece.setPlacedBy(userId);
                }
                piece.setPlaced(true);
                
                // Check if puzzle is complete
                boolean allPlaced = session.getPieces().stream()
                    .allMatch(p -> p.isPlaced() && p.getRotation() == p.getCorrectRotation());
                if (allPlaced) {
                    session.setCompleted(true);
                }
            } else {
                // Piece is snapped but not in correct position or rotation
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
    
    public boolean rotatePiece(String sessionId, int pieceId, int direction, String userId) {
        PuzzleSession session = sessionRepository.findById(sessionId);
        if (session == null || session.isCompleted()) {
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
        
        // Rotate the piece (direction: 1 for clockwise, -1 for counter-clockwise)
        int currentRotation = piece.getRotation();
        int newRotation = (currentRotation + direction * 90) % 360;
        if (newRotation < 0) {
            newRotation += 360;
        }
        piece.setRotation(newRotation);
        
        // Check if piece needs to be re-evaluated for placement
        if (piece.isPlaced()) {
            // Re-check if it's still correctly placed with new rotation
            boolean correctPosition = piece.getCol() == (int)((piece.getCurrentX() - 50) / piece.getWidth()) &&
                                    piece.getRow() == (int)((piece.getCurrentY() - 50) / piece.getHeight());
            boolean correctRotation = piece.getRotation() == piece.getCorrectRotation();
            
            if (!correctPosition || !correctRotation) {
                piece.setPlaced(false);
                piece.setPlacedBy(null);
            }
        } else {
            // Check if the piece is now in the correct position and rotation
            int pieceWidth = piece.getWidth();
            int pieceHeight = piece.getHeight();
            int targetAreaX = 50;
            int targetAreaY = 50;
            
            // Calculate which grid position the piece is at (use same logic as placement check)
            int col = (int)((piece.getCurrentX() - targetAreaX) / pieceWidth);
            int row = (int)((piece.getCurrentY() - targetAreaY) / pieceHeight);
            
            // Check if it's at the correct position with correct rotation
            if (col == piece.getCol() && row == piece.getRow() && 
                piece.getRotation() == piece.getCorrectRotation()) {
                piece.setPlaced(true);
                piece.setPlacedBy(userId);
                
                // Check if puzzle is complete
                boolean allPlaced = session.getPieces().stream()
                    .allMatch(p -> p.isPlaced() && p.getRotation() == p.getCorrectRotation());
                if (allPlaced) {
                    session.setCompleted(true);
                }
            }
        }
        
        sessionRepository.save(session);
        return true;
    }
}