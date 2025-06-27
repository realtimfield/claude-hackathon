package com.puzzle.model;

public enum EdgeType {
    FLAT,    // Straight edge for puzzle border
    TAB,     // Protruding knob that fits into cutout
    CUTOUT   // Indented socket that receives tab
}