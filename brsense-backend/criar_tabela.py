# criar_tabelas.py
from app.db.session import engine
from app.db.base import Base
from app.models.device import Device
from app.models.reading import Reading
# Importe outros modelos se houver

print("Criando tabelas no banco de dados...")
Base.metadata.create_all(bind=engine)
print("Tabelas criadas com sucesso!")