FROM php:8.3-cli-alpine AS base

RUN apk add --no-cache curl
WORKDIR /usr/src/app
ENV PORT=3000

FROM base AS test

COPY src ./src
COPY tests ./tests
CMD ["php", "tests/TestRunner.php"]

FROM base AS runtime

COPY src ./src
EXPOSE 3000
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-3000} src/index.php"]
