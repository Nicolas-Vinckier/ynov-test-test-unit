FROM node:22-alpine AS base

RUN apk add --no-cache curl
WORKDIR /usr/src/app
ENV PORT=3000

COPY package*.json ./

FROM base AS deps-prod
ENV NODE_ENV=production
RUN npm ci --omit=dev

FROM base AS deps-dev
ENV NODE_ENV=test
RUN npm ci

FROM deps-dev AS test
COPY eslint.config.js jest.config.js ./
COPY src ./src
COPY tests ./tests
CMD ["sh", "-c", "npm run lint && npm test"]

FROM deps-prod AS runtime
ENV NODE_ENV=production
COPY src ./src
EXPOSE 3000
CMD ["node", "src/server.js"]
