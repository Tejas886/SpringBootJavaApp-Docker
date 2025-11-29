FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/chat-app-0.0.1-SNAPSHOT.jar app.jar


# Create a directory for the sound file
RUN mkdir -p /app/static/sounds

# Create an empty mp3 file for the notification sound
# In a real scenario, you'd include an actual sound file
RUN touch /app/static/sounds/message.mp3

EXPOSE 9999
ENTRYPOINT ["java", "-jar", "app.jar"]
