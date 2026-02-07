FROM node:20-alpine

RUN apk add --no-cache git python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --production=false

COPY . .
RUN npm run build

RUN npm prune --production

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:3100/api/health || exit 1

CMD ["node", "dist/index.js"]
