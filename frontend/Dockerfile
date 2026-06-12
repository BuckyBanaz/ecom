FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_APP_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL

COPY package*.json ./
# npm ci skips OS-specific optional deps when lockfile was generated elsewhere — npm install fixes that.
RUN npm ci && npm install --prefer-offline --no-audit

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
