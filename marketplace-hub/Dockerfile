FROM node:20-alpine
RUN addgroup -S watink &&\
    adduser -S watink -G watink
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY public ./public
RUN chown -R watink:watink /app
USER watink
EXPOSE 8090
CMD ["npm","start"]
