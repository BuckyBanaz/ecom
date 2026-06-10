FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_APP_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL

COPY package*.json ./
# npm ci on Alpine often skips Rollup's musl optional binary (lockfile from another OS).
RUN npm ci \
    && ROLLUP_VER="$(node -p "require('rollup/package.json').version")" \
    && npm install --no-save "@rollup/rollup-linux-x64-musl@${ROLLUP_VER}"

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
