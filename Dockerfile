FROM node:11
WORKDIR /usr/src/app
COPY ./app .
COPY wait-for-it.sh .
RUN yarn install
EXPOSE 8080
CMD [ "yarn", "run", "start" ]