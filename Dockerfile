FROM node:18-alpine

RUN mkdir -p /home/node/app/node_modules

RUN chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package*.json .

COPY --chown=node:node prisma ./prisma

RUN  npm ci && npx prisma generate

COPY --chown=node:node . .

CMD ["npm","run","prod"]

EXPOSE 3000





