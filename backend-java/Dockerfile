FROM eclipse-temurin:21-jdk-alpine AS base

RUN apk add --no-cache curl
WORKDIR /usr/src/app
ENV PORT=3000

FROM base AS test

COPY src ./src
COPY tests ./tests
RUN mkdir -p build/classes build/test-classes \
    && javac -d build/classes src/*.java \
    && javac -cp build/classes -d build/test-classes tests/*.java

CMD ["java", "-cp", "build/classes:build/test-classes", "TestRunner"]

FROM base AS runtime

COPY src ./src
RUN mkdir -p build/classes \
    && javac -d build/classes src/*.java

EXPOSE 3000
CMD ["java", "-cp", "build/classes", "App"]
