package com.puzzle.service;

import com.puzzle.model.EdgeCurve;
import com.puzzle.model.EdgeType;
import com.puzzle.model.PieceShape;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class ShapeGenerationService {
    
    
    private final Random random = new Random();
    
    /**
     * Generate jigsaw shapes for all pieces in a puzzle grid
     */
    public PieceShape[][] generatePuzzleShapes(int rows, int cols) {
        PieceShape[][] shapes = new PieceShape[rows][cols];
        
        // First pass: Create all pieces with initial edges
        for (int row = 0; row < rows; row++) {
            for (int col = 0; col < cols; col++) {
                shapes[row][col] = createPieceShape(row, col, rows, cols);
            }
        }
        
        // Second pass: Ensure edge compatibility between adjacent pieces
        for (int row = 0; row < rows; row++) {
            for (int col = 0; col < cols; col++) {
                ensureEdgeCompatibility(shapes, row, col, rows, cols);
            }
        }
        
        return shapes;
    }
    
    /**
     * Create initial piece shape with random edges
     */
    private PieceShape createPieceShape(int row, int col, int totalRows, int totalCols) {
        PieceShape shape = new PieceShape();
        
        // Top edge
        if (row == 0) {
            shape.setTopEdge(createFlatEdge());
        } else {
            shape.setTopEdge(createRandomCurvedEdge());
        }
        
        // Right edge
        if (col == totalCols - 1) {
            shape.setRightEdge(createFlatEdge());
        } else {
            shape.setRightEdge(createRandomCurvedEdge());
        }
        
        // Bottom edge
        if (row == totalRows - 1) {
            shape.setBottomEdge(createFlatEdge());
        } else {
            shape.setBottomEdge(createRandomCurvedEdge());
        }
        
        // Left edge
        if (col == 0) {
            shape.setLeftEdge(createFlatEdge());
        } else {
            shape.setLeftEdge(createRandomCurvedEdge());
        }
        
        return shape;
    }
    
    /**
     * Ensure adjacent pieces have compatible edges
     */
    private void ensureEdgeCompatibility(PieceShape[][] shapes, int row, int col, int totalRows, int totalCols) {
        PieceShape currentShape = shapes[row][col];
        
        // Check top neighbor
        if (row > 0) {
            PieceShape topNeighbor = shapes[row - 1][col];
            makeEdgesCompatible(currentShape.getTopEdge(), topNeighbor.getBottomEdge());
        }
        
        // Check left neighbor
        if (col > 0) {
            PieceShape leftNeighbor = shapes[row][col - 1];
            makeEdgesCompatible(currentShape.getLeftEdge(), leftNeighbor.getRightEdge());
        }
    }
    
    /**
     * Make two edges compatible (TAB ↔ CUTOUT)
     */
    private void makeEdgesCompatible(EdgeCurve edge1, EdgeCurve edge2) {
        if (edge1.getType() == EdgeType.FLAT || edge2.getType() == EdgeType.FLAT) {
            return; // Flat edges don't need compatibility
        }
        
        // If both are the same type, change one to be complementary
        if (edge1.getType() == edge2.getType()) {
            if (edge1.getType() == EdgeType.TAB) {
                edge2.setType(EdgeType.CUTOUT);
            } else {
                edge2.setType(EdgeType.TAB);
            }
        }
        
        // Match dimensions for proper fit
        matchEdgeDimensions(edge1, edge2);
    }
    
    /**
     * Match edge types between compatible edges (no dimensions needed)
     */
    private void matchEdgeDimensions(EdgeCurve edge1, EdgeCurve edge2) {
        // No additional matching needed - frontend will handle curves
    }
    
    /**
     * Create flat edge for puzzle borders
     */
    private EdgeCurve createFlatEdge() {
        EdgeCurve edge = new EdgeCurve();
        edge.setType(EdgeType.FLAT);
        return edge;
    }
    
    /**
     * Create random curved edge (TAB or CUTOUT)
     */
    private EdgeCurve createRandomCurvedEdge() {
        EdgeCurve edge = new EdgeCurve();
        // Random edge type
        edge.setType(random.nextBoolean() ? EdgeType.TAB : EdgeType.CUTOUT);
        return edge;
    }
    
    
    /**
     * Validate that all pieces in the grid have valid connections
     */
    public boolean validatePuzzleShapes(PieceShape[][] shapes) {
        int rows = shapes.length;
        int cols = shapes[0].length;
        
        for (int row = 0; row < rows; row++) {
            for (int col = 0; col < cols; col++) {
                if (!validatePieceConnections(shapes, row, col, rows, cols)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Validate that a piece has compatible edges with its neighbors
     */
    private boolean validatePieceConnections(PieceShape[][] shapes, int row, int col, int totalRows, int totalCols) {
        PieceShape piece = shapes[row][col];
        
        // Check top neighbor
        if (row > 0) {
            PieceShape topNeighbor = shapes[row - 1][col];
            if (!piece.getTopEdge().isCompatibleWith(topNeighbor.getBottomEdge())) {
                return false;
            }
        } else {
            // Top border must be flat
            if (piece.getTopEdge().getType() != EdgeType.FLAT) {
                return false;
            }
        }
        
        // Check right neighbor
        if (col < totalCols - 1) {
            PieceShape rightNeighbor = shapes[row][col + 1];
            if (!piece.getRightEdge().isCompatibleWith(rightNeighbor.getLeftEdge())) {
                return false;
            }
        } else {
            // Right border must be flat
            if (piece.getRightEdge().getType() != EdgeType.FLAT) {
                return false;
            }
        }
        
        // Check bottom neighbor
        if (row < totalRows - 1) {
            PieceShape bottomNeighbor = shapes[row + 1][col];
            if (!piece.getBottomEdge().isCompatibleWith(bottomNeighbor.getTopEdge())) {
                return false;
            }
        } else {
            // Bottom border must be flat
            if (piece.getBottomEdge().getType() != EdgeType.FLAT) {
                return false;
            }
        }
        
        // Check left neighbor
        if (col > 0) {
            PieceShape leftNeighbor = shapes[row][col - 1];
            if (!piece.getLeftEdge().isCompatibleWith(leftNeighbor.getRightEdge())) {
                return false;
            }
        } else {
            // Left border must be flat
            if (piece.getLeftEdge().getType() != EdgeType.FLAT) {
                return false;
            }
        }
        
        return true;
    }
}