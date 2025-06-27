package com.puzzle.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage implements Serializable {
    private MessageType type;
    private Map<String, Object> data;
    
    public enum MessageType {
        USER_JOIN,
        USER_LEAVE,
        PIECE_MOVE,
        PIECE_LOCK,
        PIECE_UNLOCK,
        PIECE_RELEASE,
        PIECE_PLACED,
        CURSOR_MOVE,
        PUZZLE_COMPLETE,
        SESSION_STATE
    }
}