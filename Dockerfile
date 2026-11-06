# Imagem da aplicação completa: o Angular compilado é servido pelo próprio Spring, na mesma origem da API.
# Os testes não rodam aqui, porque precisam do Docker; veja o README para rodá-los.

FROM node:24-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:21-jdk-alpine AS backend
WORKDIR /build
COPY backend/mvnw backend/pom.xml ./
COPY backend/.mvn .mvn
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY backend/src src
COPY --from=frontend /build/dist/frontend/browser src/main/resources/static
RUN ./mvnw -q -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S financetable && adduser -S financetable -G financetable
USER financetable
WORKDIR /app
COPY --from=backend /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
