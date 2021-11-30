FROM node:gallium-alpine3.13

RUN mkdir -p /usr/local/minrepo/src
WORKDIR /usr/local/minrepo/src

COPY . .

RUN apk update \
    && apk add -q sqlite \
    && rm -rf node_modules \
    && npm install \
    && npm run build

WORKDIR /usr/local/minrepo

ENV NODE_ENV=production

RUN mv src/dist/* . \
    # && mv src/data . \
    && mv src/views . \
    && mv src/resource . \
    # && rm -rf data/repo/* \
    && mv src/package.json . \
    && rm -rf src/ \
    && npm install --production \
    # && mkdir data/db \
    # && mkdir data/repo \
    # && sqlite3 data/db/db.sqlite < resource/init.sql

EXPOSE 3000

CMD node main.js