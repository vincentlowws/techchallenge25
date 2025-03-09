FROM node:16

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV API_KEY=${API_KEY}
ENV API_URL=${API_URL}
ENV PORT=${PORT}

CMD ["node", "server.js"]