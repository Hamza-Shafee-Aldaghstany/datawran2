FROM node:18-alpine

WORKDIR /usr/src/app

COPY index.html script.js world.topo.200410.3x5400x2700.jpg ./

RUN npm install -g http-server

EXPOSE 8080
CMD ["http-server", ".", "-p", "8080"]
