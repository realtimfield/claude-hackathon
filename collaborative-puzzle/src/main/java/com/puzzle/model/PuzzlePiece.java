package com.puzzle.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PuzzlePiece implements Serializable {
    private int id;
    private int row;
    private int col;
    private double currentX;
    private double currentY;
    private double correctX;
    private double correctY;
    private int width;
    private int height;
    private String imageUrl; // URL to the piece image
    private boolean isPlaced;
    private String lockedBy; // User ID who is currently dragging this piece
}