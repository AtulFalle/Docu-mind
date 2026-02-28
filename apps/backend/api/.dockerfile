# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY . .
RUN npm install
RUN npx nx build api

# Production stage
FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/dist/apps/backend/api ./dist
COPY package.json .
RUN npm install --omit=dev
RUN npm cache clean --force

CMD ["node", "dist/main.js"]