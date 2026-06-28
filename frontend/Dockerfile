FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    root /usr/share/nginx/html;
    index index.html;

    # HTML, never cache (so new asset hashes are picked up immediately)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }

    # Hashed assets, cache aggressively (filename changes on every build)
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
