# Build with the frontend folder as the context:  docker build frontend
# Serves the React app and proxies /api and /media to the backend, so the browser sees ONE origin (the login cookie
# would not be sent between two *.up.railway.app domains).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# env: PORT (set by Railway), BACKEND_URL (e.g. http://backend.railway.internal:8000)
