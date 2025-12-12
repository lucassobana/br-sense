import sys
import os
from sqlalchemy import text

# Setup para importar o app
sys.path.append(os.getcwd())
from app.db.session import SessionLocal, engine
from app.settings import settings

def checar_banco():
    print(f"--- DIAGNÓSTICO DE BANCO DE DADOS ---")
    
    # 1. Mostrar qual URL está sendo usada (Mascarada por segurança)
    url = str(settings.DATABASE_URL)
    masked_url = url.replace(url.split(":")[2].split("@")[0], "****") if "@" in url else url
    print(f"🔌 Conectando em: {masked_url}")
    
    db = SessionLocal()
    try:
        # 2. Testar conexão simples
        db.execute(text("SELECT 1"))
        print("✅ Conexão SQL: OK")
        
        # 3. Contar dados
        device_count = db.execute(text("SELECT COUNT(*) FROM device")).scalar()
        reading_count = db.execute(text("SELECT COUNT(*) FROM reading")).scalar()
        
        print(f"\n📊 Estatísticas encontradas:")
        print(f"   - Dispositivos: {device_count}")
        print(f"   - Leituras:     {reading_count}")
        
        if device_count == 0:
            print("\n❌ O BANCO ESTÁ VAZIO! O seed não rodou neste banco.")
        else:
            print("\n✅ DADOS ENCONTRADOS! Se a API não mostra, ela está usando outra URL.")
            
    except Exception as e:
        print(f"\n❌ ERRO DE CONEXÃO: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    checar_banco()