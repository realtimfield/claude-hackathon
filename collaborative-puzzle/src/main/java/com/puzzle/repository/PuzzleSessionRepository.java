package com.puzzle.repository;

import com.puzzle.model.PuzzleSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.concurrent.TimeUnit;

@Repository
public class PuzzleSessionRepository {
    
    private static final String KEY_PREFIX = "puzzle:session:";
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Value("${puzzle.session.expiration}")
    private long sessionExpiration;
    
    public void save(PuzzleSession session) {
        String key = KEY_PREFIX + session.getId();
        redisTemplate.opsForValue().set(key, session, sessionExpiration, TimeUnit.SECONDS);
    }
    
    public PuzzleSession findById(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        return (PuzzleSession) redisTemplate.opsForValue().get(key);
    }
    
    public void delete(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        redisTemplate.delete(key);
    }
    
    public boolean exists(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
    
    public void updateExpiration(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        redisTemplate.expire(key, sessionExpiration, TimeUnit.SECONDS);
    }
}