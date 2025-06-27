# Multi-stage build
FROM maven:3.8.6-openjdk-11 AS builder

WORKDIR /app

# Install Node.js 18 for frontend build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Copy and build frontend first
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Now copy backend files
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy backend source code
COPY src ./src

# Copy the built frontend files to Spring Boot's static resources
RUN mkdir -p src/main/resources/static && \
    cp -r frontend/build/* src/main/resources/static/

# Build the application (which will include the already-built frontend)
RUN mvn clean package -DskipTests

# Runtime stage
FROM openjdk:11-jre-slim

WORKDIR /app

# Copy the built JAR file
COPY --from=builder /app/target/collaborative-puzzle-*.jar app.jar

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]