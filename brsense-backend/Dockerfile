# Usa uma imagem Python leve e oficial
FROM python:3.10-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias para compilar pacotes (como psycopg2)
RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Copia e instala as dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código para dentro do container
COPY . .

# Expõe a porta que o FastAPI usa
EXPOSE 8000

# Comando para rodar a aplicação
# Ajuste "main:app" se o seu objeto 'app' estiver em outro lugar (ex: app.main:app)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]