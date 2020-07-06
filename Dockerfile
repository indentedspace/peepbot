FROM node:13-alpine 

WORKDIR /usr/src/app

COPY ./package.json .
COPY ./yarn.lock .

RUN yarn install

COPY . .

RUN yarn build

CMD ["yarn", "start"]