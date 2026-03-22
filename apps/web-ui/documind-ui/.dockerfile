FROM node:22-alpine AS builder

WORKDIR /app
COPY . .
RUN npm install --force --legacy-peer-deps
RUN npx nx build documind-ui --configuration=production

FROM nginx:stable-alpine
COPY --from=builder /app/dist/apps/web-ui/documind-ui/browser /usr/share/nginx/html