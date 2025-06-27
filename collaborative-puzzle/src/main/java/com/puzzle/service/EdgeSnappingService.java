package com.puzzle.service;

import com.puzzle.model.EdgeCurve;
import com.puzzle.model.EdgeType;
import com.puzzle.model.PieceShape;
import com.puzzle.model.PuzzlePiece;
import com.puzzle.model.PuzzleSession;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EdgeSnappingService {
    
    private static final double EDGE_SNAP_THRESHOLD = 20.0; // pixels
    private static final double POSITION_TOLERANCE = 5.0; // pixels
    
    /**
     * Find potential edge-based snapping connections for a piece
     */
    public SnapResult findEdgeSnap(PuzzleSession session, PuzzlePiece draggedPiece, double newX, double newY) {
        if (draggedPiece.getShape() == null) {
            return new SnapResult(false, newX, newY, null);
        }
        
        List<PuzzlePiece> otherPieces = session.getPieces().stream()
                .filter(p -> p.getId() != draggedPiece.getId())
                .filter(p -> p.getShape() != null)
                .collect(Collectors.toList());
        
        // Check for edge-based connections
        for (PuzzlePiece otherPiece : otherPieces) {
            SnapResult edgeSnap = checkEdgeConnection(draggedPiece, otherPiece, newX, newY, session);
            if (edgeSnap.shouldSnap) {
                return edgeSnap;
            }
        }
        
        // Fallback to grid-based snapping for correct positioning
        return checkGridSnap(session, draggedPiece, newX, newY);
    }
    
    /**
     * Check if two pieces can connect via their edges
     */
    private SnapResult checkEdgeConnection(PuzzlePiece draggedPiece, PuzzlePiece targetPiece, 
                                         double newX, double newY, PuzzleSession session) {
        
        PieceShape draggedShape = draggedPiece.getShape();
        PieceShape targetShape = targetPiece.getShape();
        
        int baseWidth = session.getImageWidth() / session.getGridSize();
        int baseHeight = session.getImageHeight() / session.getGridSize();
        
        // Check all four edge connections
        EdgeConnection[] connections = {
            // Top edge of dragged piece connects to bottom edge of target
            new EdgeConnection(draggedShape.getTopEdge(), targetShape.getBottomEdge(), 
                             0, -baseHeight, "top-bottom"),
            // Right edge of dragged piece connects to left edge of target
            new EdgeConnection(draggedShape.getRightEdge(), targetShape.getLeftEdge(), 
                             baseWidth, 0, "right-left"),
            // Bottom edge of dragged piece connects to top edge of target
            new EdgeConnection(draggedShape.getBottomEdge(), targetShape.getTopEdge(), 
                             0, baseHeight, "bottom-top"),
            // Left edge of dragged piece connects to right edge of target
            new EdgeConnection(draggedShape.getLeftEdge(), targetShape.getRightEdge(), 
                             -baseWidth, 0, "left-right")
        };
        
        for (EdgeConnection connection : connections) {
            if (connection.edge1.isCompatibleWith(connection.edge2)) {
                // Calculate expected position for perfect connection
                double expectedX = targetPiece.getCurrentX() + connection.offsetX;
                double expectedY = targetPiece.getCurrentY() + connection.offsetY;
                
                // Check if dragged piece is close enough to snap
                double distance = Math.sqrt(Math.pow(newX - expectedX, 2) + Math.pow(newY - expectedY, 2));
                
                if (distance <= EDGE_SNAP_THRESHOLD) {
                    return new SnapResult(true, expectedX, expectedY, targetPiece);
                }
            }
        }
        
        return new SnapResult(false, newX, newY, null);
    }
    
    /**
     * Grid-based snapping for correct piece placement
     */
    private SnapResult checkGridSnap(PuzzleSession session, PuzzlePiece piece, double newX, double newY) {
        int baseWidth = session.getImageWidth() / session.getGridSize();
        int baseHeight = session.getImageHeight() / session.getGridSize();
        
        // Calculate target area offset
        int targetAreaX = 50;
        int targetAreaY = 50;
        
        // Calculate piece center
        double pieceCenterX = newX + (baseWidth / 2.0);
        double pieceCenterY = newY + (baseHeight / 2.0);
        
        // Find nearest grid position
        int nearestCol = (int) Math.round((pieceCenterX - targetAreaX) / (double) baseWidth);
        int nearestRow = (int) Math.round((pieceCenterY - targetAreaY) / (double) baseHeight);
        
        // Clamp to grid bounds
        nearestCol = Math.max(0, Math.min(nearestCol, session.getGridSize() - 1));
        nearestRow = Math.max(0, Math.min(nearestRow, session.getGridSize() - 1));
        
        // Calculate snap position
        double snapX = targetAreaX + nearestCol * baseWidth;
        double snapY = targetAreaY + nearestRow * baseHeight;
        
        // Check distance
        double distance = Math.sqrt(Math.pow(pieceCenterX - (snapX + baseWidth/2.0), 2) + 
                                   Math.pow(pieceCenterY - (snapY + baseHeight/2.0), 2));
        
        if (distance <= 80) { // Use existing snap threshold
            return new SnapResult(true, snapX, snapY, null);
        }
        
        return new SnapResult(false, newX, newY, null);
    }
    
    /**
     * Check if a piece is correctly placed (right position and rotation)
     */
    public boolean isCorrectlyPlaced(PuzzlePiece piece, PuzzleSession session) {
        int baseWidth = session.getImageWidth() / session.getGridSize();
        int baseHeight = session.getImageHeight() / session.getGridSize();
        int targetAreaX = 50;
        int targetAreaY = 50;
        
        // Expected position
        double expectedX = targetAreaX + piece.getCol() * baseWidth;
        double expectedY = targetAreaY + piece.getRow() * baseHeight;
        
        // Check position tolerance
        boolean correctPosition = Math.abs(piece.getCurrentX() - expectedX) <= POSITION_TOLERANCE &&
                                Math.abs(piece.getCurrentY() - expectedY) <= POSITION_TOLERANCE;
        
        // Check rotation
        boolean correctRotation = piece.getRotation() == piece.getCorrectRotation();
        
        return correctPosition && correctRotation;
    }
    
    /**
     * Get all pieces connected to a given piece
     */
    public List<PuzzlePiece> getConnectedPieces(PuzzlePiece startPiece, PuzzleSession session) {
        List<PuzzlePiece> connected = new ArrayList<>();
        List<PuzzlePiece> toCheck = new ArrayList<>();
        toCheck.add(startPiece);
        
        while (!toCheck.isEmpty()) {
            PuzzlePiece current = toCheck.remove(0);
            if (connected.contains(current)) {
                continue;
            }
            
            connected.add(current);
            
            // Find adjacent pieces that are connected
            for (PuzzlePiece other : session.getPieces()) {
                if (!connected.contains(other) && !toCheck.contains(other)) {
                    if (areConnected(current, other, session)) {
                        toCheck.add(other);
                    }
                }
            }
        }
        
        return connected;
    }
    
    /**
     * Check if two pieces are currently connected via edges
     */
    private boolean areConnected(PuzzlePiece piece1, PuzzlePiece piece2, PuzzleSession session) {
        if (piece1.getShape() == null || piece2.getShape() == null) {
            return false;
        }
        
        int baseWidth = session.getImageWidth() / session.getGridSize();
        int baseHeight = session.getImageHeight() / session.getGridSize();
        
        double dx = Math.abs(piece1.getCurrentX() - piece2.getCurrentX());
        double dy = Math.abs(piece1.getCurrentY() - piece2.getCurrentY());
        
        // Check if pieces are adjacent
        boolean adjacent = (dx <= baseWidth + POSITION_TOLERANCE && dy <= POSITION_TOLERANCE) ||
                          (dy <= baseHeight + POSITION_TOLERANCE && dx <= POSITION_TOLERANCE);
        
        if (!adjacent) {
            return false;
        }
        
        // Check edge compatibility
        PieceShape shape1 = piece1.getShape();
        PieceShape shape2 = piece2.getShape();
        
        // Determine which edges should connect based on relative position
        if (Math.abs(dx - baseWidth) <= POSITION_TOLERANCE && dy <= POSITION_TOLERANCE) {
            // Horizontally adjacent
            if (piece1.getCurrentX() < piece2.getCurrentX()) {
                return shape1.getRightEdge().isCompatibleWith(shape2.getLeftEdge());
            } else {
                return shape1.getLeftEdge().isCompatibleWith(shape2.getRightEdge());
            }
        } else if (Math.abs(dy - baseHeight) <= POSITION_TOLERANCE && dx <= POSITION_TOLERANCE) {
            // Vertically adjacent
            if (piece1.getCurrentY() < piece2.getCurrentY()) {
                return shape1.getBottomEdge().isCompatibleWith(shape2.getTopEdge());
            } else {
                return shape1.getTopEdge().isCompatibleWith(shape2.getBottomEdge());
            }
        }
        
        return false;
    }
    
    /**
     * Result of a snap operation
     */
    public static class SnapResult {
        public final boolean shouldSnap;
        public final double x;
        public final double y;
        public final PuzzlePiece connectedTo;
        
        public SnapResult(boolean shouldSnap, double x, double y, PuzzlePiece connectedTo) {
            this.shouldSnap = shouldSnap;
            this.x = x;
            this.y = y;
            this.connectedTo = connectedTo;
        }
    }
    
    /**
     * Edge connection information
     */
    private static class EdgeConnection {
        public final EdgeCurve edge1;
        public final EdgeCurve edge2;
        public final double offsetX;
        public final double offsetY;
        public final String type;
        
        public EdgeConnection(EdgeCurve edge1, EdgeCurve edge2, double offsetX, double offsetY, String type) {
            this.edge1 = edge1;
            this.edge2 = edge2;
            this.offsetX = offsetX;
            this.offsetY = offsetY;
            this.type = type;
        }
    }
}