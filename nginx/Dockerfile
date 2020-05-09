#complie ts
FROM node as compile
#install ts
RUN npm install -g typescript
# Create Directory for the Container
WORKDIR /app/src
# Only copy the package.json file to work directory
COPY src/package.json /app/src
# Install all Packages
RUN npm install
# Copy all other source code to work directory
COPY src/ /app/src
# TypeScript
RUN tsc

#copy static stuff and run nginx
FROM nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY html /usr/local/nginx/html
#copy tsc output
COPY --from=compile /app/html/js /usr/local/nginx/html/js
RUN ls /usr/local/nginx/html/js