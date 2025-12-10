# Estágio 1: Build (Gera os arquivos estáticos)
FROM node:18-alpine as build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Estágio 2: Produção (Serve com Nginx)
FROM nginx:alpine

# Copia os arquivos gerados no estágio anterior para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia configuração customizada do Nginx (veja passo abaixo)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]