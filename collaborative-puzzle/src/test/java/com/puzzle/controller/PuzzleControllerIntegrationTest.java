package com.puzzle.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.puzzle.model.PuzzleSession;
import com.puzzle.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.nio.file.Files;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Disabled("Requires Docker for testcontainers")
public class PuzzleControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }

    @Test
    void testCreateSessionAndJoin() throws Exception {
        // Load test image
        ClassPathResource imageResource = new ClassPathResource("test-image.jpeg");
        byte[] imageBytes = Files.readAllBytes(imageResource.getFile().toPath());
        MockMultipartFile imageFile = new MockMultipartFile(
                "image",
                "test-image.jpeg",
                "image/jpeg",
                imageBytes
        );

        // Create session
        MvcResult createResult = mockMvc.perform(multipart("/api/sessions")
                        .file(imageFile)
                        .param("gridSize", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").exists())
                .andReturn();

        Map<String, String> createResponse = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                Map.class
        );
        String sessionId = createResponse.get("sessionId");
        assertNotNull(sessionId);

        // Get session details
        MvcResult getResult = mockMvc.perform(get("/api/sessions/" + sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sessionId))
                .andExpect(jsonPath("$.gridSize").value(3))
                .andExpect(jsonPath("$.totalPieces").value(9))
                .andExpect(jsonPath("$.pieces").isArray())
                .andExpect(jsonPath("$.pieces.length()").value(9))
                .andReturn();

        PuzzleSession session = objectMapper.readValue(
                getResult.getResponse().getContentAsString(),
                PuzzleSession.class
        );
        assertEquals(sessionId, session.getId());
        assertEquals(9, session.getPieces().size());
        assertFalse(session.isCompleted());

        // Join session
        String joinRequest = "{\"name\": \"TestUser\"}";
        MvcResult joinResult = mockMvc.perform(post("/api/sessions/" + sessionId + "/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(joinRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("TestUser"))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.color").exists())
                .andReturn();

        User user = objectMapper.readValue(
                joinResult.getResponse().getContentAsString(),
                User.class
        );
        assertEquals("TestUser", user.getName());
        assertNotNull(user.getId());
        assertNotNull(user.getColor());

        // Verify user was added to session
        mockMvc.perform(get("/api/sessions/" + sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users['" + user.getId() + "']").exists())
                .andExpect(jsonPath("$.users['" + user.getId() + "'].name").value("TestUser"));
    }

    @Test
    void testInvalidSessionId() throws Exception {
        mockMvc.perform(get("/api/sessions/invalid-session-id"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testInvalidGridSize() throws Exception {
        ClassPathResource imageResource = new ClassPathResource("test-image.jpeg");
        byte[] imageBytes = Files.readAllBytes(imageResource.getFile().toPath());
        MockMultipartFile imageFile = new MockMultipartFile(
                "image",
                "test-image.jpeg",
                "image/jpeg",
                imageBytes
        );

        mockMvc.perform(multipart("/api/sessions")
                        .file(imageFile)
                        .param("gridSize", "4"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testJoinNonExistentSession() throws Exception {
        String joinRequest = "{\"name\": \"TestUser\"}";
        mockMvc.perform(post("/api/sessions/non-existent-id/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(joinRequest))
                .andExpect(status().isNotFound());
    }

    @Test
    void testImageRetrieval() throws Exception {
        // Create session first
        ClassPathResource imageResource = new ClassPathResource("test-image.jpeg");
        byte[] imageBytes = Files.readAllBytes(imageResource.getFile().toPath());
        MockMultipartFile imageFile = new MockMultipartFile(
                "image",
                "test-image.jpeg",
                "image/jpeg",
                imageBytes
        );

        MvcResult createResult = mockMvc.perform(multipart("/api/sessions")
                        .file(imageFile)
                        .param("gridSize", "3"))
                .andExpect(status().isOk())
                .andReturn();

        Map<String, String> createResponse = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                Map.class
        );
        String sessionId = createResponse.get("sessionId");

        // Get session to find image URL
        MvcResult getResult = mockMvc.perform(get("/api/sessions/" + sessionId))
                .andExpect(status().isOk())
                .andReturn();

        PuzzleSession session = objectMapper.readValue(
                getResult.getResponse().getContentAsString(),
                PuzzleSession.class
        );
        String imageUrl = session.getImageUrl();
        assertNotNull(imageUrl);
        assertTrue(imageUrl.startsWith("/api/images/"));

        // Test image retrieval
        mockMvc.perform(get(imageUrl))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG));
    }
}