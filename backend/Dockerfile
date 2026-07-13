# Build stage
FROM maven:3.9.7-eclipse-temurin-21 AS build

# Create a directory for the application
WORKDIR /app

# Copy the Maven project files
COPY pom.xml .
COPY src ./src

# Build the application, skipping tests to speed up the build process
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copy the built JAR file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]