# The docs site as a small web server. Only the built files reach the final image.
FROM node:22-slim AS build
WORKDIR /repo
RUN npm install -g pnpm@12.16.1
COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build

FROM nginx:1.29-alpine
COPY docs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/docs/dist/ /usr/share/nginx/html/
