FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache git

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
