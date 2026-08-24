# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Runtime
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Make nginx runtime dirs writable by the unprivileged `nginx` user.
# nginx:alpine ships these as root-owned; without this fix the container
# crashes on boot with "Permission denied" on /var/cache/nginx etc.
RUN chown -R nginx:nginx /usr/share/nginx/html \
                            /var/cache/nginx \
                            /var/log/nginx \
                            /var/run && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid && \
    sed -i 's/^user  nginx;/user nginx;/' /etc/nginx/nginx.conf

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
