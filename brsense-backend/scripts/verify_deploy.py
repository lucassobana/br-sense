#!/usr/bin/env python3
# brsense-backend/scripts/verify_deploy.py
"""
Script rápido para verificar se a API está respondendo corretamente.
Uso: python scripts/verify_deploy.py [dev|prod]
"""
import requests
import sys

# Define URLs padrão
URLS = {
    "dev": "https://brsense-api-dev.fly.dev",
    "prod": "https://api.soilreadings.com",
    "local": "http://127.0.0.1:8000"
}

def main():
    env = sys.argv[1] if len(sys.argv) > 1 else "dev"
    base_url = URLS.get(env, env) # Aceita URL personalizada também
    
    print(f"🔍 Verificando API em: {base_url} ...\n")
    
    # 1. Health Check
    try:
        r = requests.get(f"{base_url}/")
        if r.status_code == 200:
            print(f"✅ Health Check: OK ({r.json()})")
        else:
            print(f"❌ Health Check FALHOU: {r.status_code}")
    except Exception as e:
        print(f"❌ Erro de Conexão: {e}")
        return

    # 2. Verificar Dispositivos
    try:
        r = requests.get(f"{base_url}/v1/devices")
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        print(f"✅ Dispositivos Listados: {count} encontrados")
    except Exception as e:
        print(f"❌ Falha ao listar dispositivos: {e}")

    # 3. Verificar Leituras Recentes
    try:
        r = requests.get(f"{base_url}/v1/readings/latest?limit=1")
        if r.status_code == 200:
            print("✅ Endpoint de Leituras: OK")
        else:
            print(f"⚠️ Endpoint de Leituras retornou {r.status_code}")
    except Exception:
        pass

    print("\n🏁 Verificação concluída.")

if __name__ == "__main__":
    main()