FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./package.json
COPY vite.config.js ./vite.config.js
COPY index.html ./index.html
COPY src ./src
COPY assets ./assets

RUN npm install --include=dev
RUN npm run build

FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
