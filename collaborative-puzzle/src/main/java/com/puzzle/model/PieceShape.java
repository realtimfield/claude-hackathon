package com.puzzle.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.awt.geom.Path2D;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PieceShape implements Serializable {
    private EdgeCurve topEdge;
    private EdgeCurve rightEdge;
    private EdgeCurve bottomEdge;
    private EdgeCurve leftEdge;
}