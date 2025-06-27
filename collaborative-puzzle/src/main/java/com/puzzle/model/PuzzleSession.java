package com.puzzle.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PuzzleSession implements Serializable {
    private String id;
    private String imageUrl;
    private int gridSize;
    private int totalPieces;
    private List<PuzzlePiece> pieces = new ArrayList<>();
    private Map<String, User> users = new HashMap<>();
    private LocalDateTime createdAt;
    private boolean completed;
    private int imageWidth;
    private int imageHeight;
}