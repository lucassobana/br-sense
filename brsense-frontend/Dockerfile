# Estágio de Build
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# DECLARA QUE ACEITAMOS ESSE ARGUMENTO
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM

ARG VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL

RUN npm run build

# Estágio de Servidor (Nginx para servir os arquivos estáticos)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Configuração opcional do Nginx para React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]