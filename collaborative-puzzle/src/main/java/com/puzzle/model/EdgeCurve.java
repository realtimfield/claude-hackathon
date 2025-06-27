package com.puzzle.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EdgeCurve implements Serializable {
    private EdgeType type;
    
    public boolean isCompatibleWith(EdgeCurve other) {
        if (this.type == EdgeType.FLAT || other.type == EdgeType.FLAT) {
            return false; // Flat edges don't connect to anything
        }
        
        // TAB connects to CUTOUT and vice versa
        return (this.type == EdgeType.TAB && other.type == EdgeType.CUTOUT) ||
               (this.type == EdgeType.CUTOUT && other.type == EdgeType.TAB);
    }
}