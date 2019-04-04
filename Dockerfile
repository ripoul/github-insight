FROM node:11
WORKDIR /usr/src/app
COPY . .
RUN yarn install
EXPOSE 3000