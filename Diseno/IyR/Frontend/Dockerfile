FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

COPY index.html ./index.html
COPY styles.css ./styles.css
COPY script_seeded.js ./script_seeded.js
COPY config.js ./config.js
COPY api_client.js ./api_client.js
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
