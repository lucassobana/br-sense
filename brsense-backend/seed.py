# # seed.py
# from database import SessionLocal, engine, Base
# from models import User, Probe

# # Garante que as tabelas existam
# Base.metadata.create_all(bind=engine)

# db = SessionLocal()

# def create_test_data():
#     # 1. Verifica se já existe o usuário
#     if db.query(User).filter_by(email="admin@brsense.com").first():
#         print("Dados já existem.")
#         return

#     # 2. Cria um Usuário
#     user = User(name="Admin", email="admin@brsense.com", password="hashed_password")
#     db.add(user)
#     db.commit() # Comita para gerar o ID do usuário

#     # 3. Cria uma Sonda (Com o ESN que vamos simular: '0-12345')
#     probe = Probe(
#         user_id=user.id,
#         name="Sonda Alpha 1",
#         identifier="0-12345",  # <--- ESSE É O ID QUE VAMOS USAR NO TESTE
#         location="0, 0",
#         status="Instalado"
#     )
#     db.add(probe)
#     db.commit()
#     print("Dados de teste criados com sucesso!")

# if __name__ == "__main__":
#     create_test_data()
#     db.close()

# seed_test.py
from app.db.session import SessionLocal
from app.models.device import Device
from app.models.reading import Reading

db = SessionLocal()

# Tenta buscar ou criar uma sonda de teste
esn_teste = "TEST-01"
device = db.query(Device).filter(Device.esn == esn_teste).first()

if not device:
    print(f"Criando sonda {esn_teste}...")
    device = Device(esn=esn_teste, name="Sonda de Teste", location="0, 0")
    db.add(device)
    db.commit()
    print("Sonda criada com sucesso!")
else:
    print(f"Sonda {esn_teste} já existe no banco.")

db.close()