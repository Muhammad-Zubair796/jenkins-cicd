# Use Java 17 to match your Maven build
FROM eclipse-temurin:17-jre-alpine

WORKDIR /opt/app

# This copies whatever .jar file Maven created in the target folder
COPY target/*.jar app.jar

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
