from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.ingest import process_globalstar_data, parse_globalstar_xml

router = APIRouter()

@router.post("/webhook/globalstar", status_code=status.HTTP_200_OK)
async def globalstar_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recebe dados da Globalstar (XML ou JSON) e processa via Service.
    """
    content_type = request.headers.get('Content-Type', '')
    data = None

    try:
        # 1. Obter o corpo bruto da requisição
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8')

        # 2. Decidir como fazer o parse baseado no Content-Type
        if 'application/xml' in content_type or 'text/xml' in content_type:
            data = parse_globalstar_xml(body_str)
        elif 'application/json' in content_type:
            data = await request.json()
        else:
            # Fallback: Tenta JSON, se falhar tenta XML
            try:
                data = await request.json()
            except:
                data = parse_globalstar_xml(body_str)

        if not data:
            # Retornamos 200 mesmo em erro de formato para evitar retentativas infinitas do satélite
            return {"status": "ignored", "message": "Formato de dados vazio ou não suportado"}

        # 3. Chamar a camada de serviço
        success = process_globalstar_data(db, data)

        if success:
            return {"status": "success", "message": "Dados processados"}
        else:
            return {"status": "ignored", "message": "Dados ignorados (ESN não encontrado ou erro)"}

    except Exception as e:
        # Logar o erro real no servidor
        print(f"Erro crítico no webhook: {e}")
        # Retornar 500 apenas se quiser que a Globalstar tente reenviar
        raise HTTPException(status_code=500, detail=str(e))