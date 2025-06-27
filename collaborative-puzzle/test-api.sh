#!/bin/bash

echo "Testing Collaborative Puzzle API..."

# Health check
echo -e "\n1. Testing health endpoint:"
curl -s http://localhost:8080/actuator/health | jq . || echo "Health endpoint not available"

# Use existing test image
echo -e "\n2. Using test image (cat.jpeg)..."

# Create a session
echo -e "\n3. Creating a puzzle session:"
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8080/api/sessions \
  -F "image=@cat.jpeg" \
  -F "gridSize=3")
echo "$SESSION_RESPONSE" | jq .

# Extract session ID
SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r .sessionId)
echo "Session ID: $SESSION_ID"

# Get session details
echo -e "\n4. Getting session details:"
curl -s http://localhost:8080/api/sessions/$SESSION_ID | jq .

# Join session
echo -e "\n5. Joining session:"
curl -s -X POST http://localhost:8080/api/sessions/$SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{"name": "TestUser"}' | jq .

# No cleanup needed - using existing cat.jpeg

echo -e "\nAPI tests complete!"