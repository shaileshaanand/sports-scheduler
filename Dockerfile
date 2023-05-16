FROM node:18-alpine

# Install python/pip for djlint
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools


RUN mkdir -p /home/node/app/node_modules

RUN chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package*.json .

COPY --chown=node:node prisma ./prisma

RUN  npm ci && npx prisma generate

COPY --chown=node:node . .

CMD ["npm","run","prod"]

EXPOSE 3000





