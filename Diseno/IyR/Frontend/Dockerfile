FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

COPY index.html ./index.html
COPY assets ./assets
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
