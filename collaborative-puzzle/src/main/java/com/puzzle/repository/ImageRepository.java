package com.puzzle.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.concurrent.TimeUnit;

@Repository
public class ImageRepository {
    
    private static final String KEY_PREFIX = "puzzle:image:";
    
    @Autowired
    @Qualifier("binaryRedisTemplate")
    private RedisTemplate<String, byte[]> redisTemplate;
    
    public void saveImage(String imageId, byte[] imageData) {
        String key = KEY_PREFIX + imageId;
        redisTemplate.opsForValue().set(key, imageData, 24, TimeUnit.HOURS);
    }
    
    public byte[] getImage(String imageId) {
        String key = KEY_PREFIX + imageId;
        return redisTemplate.opsForValue().get(key);
    }
    
    public void deleteImage(String imageId) {
        String key = KEY_PREFIX + imageId;
        redisTemplate.delete(key);
    }
}