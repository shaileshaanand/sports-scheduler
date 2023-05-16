FROM node:18-alpine as base

RUN mkdir -p /home/node/app/node_modules

RUN chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package*.json ./

COPY --chown=node:node prisma ./prisma


FROM base as development

# Install python/pip for djlint
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

RUN  npm ci && npx prisma generate

COPY --chown=node:node ./ ./

CMD ["npm","run","dev"]

EXPOSE 3000


FROM base as production

ENV NODE_ENV=production

RUN npm ci --omit=dev && npx prisma generate

COPY --chown=node:node ./ ./

CMD ["npm","run","prod"]

EXPOSE 3000
