# Configurações da API
$BaseUrl = "http://127.0.0.1:8000/webhook/globalstar"
$Headers = @{ "Content-Type" = "application/json" }

# Função auxiliar para enviar requisições
function Enviar-Telemetria {
    param (
        [string]$NomeTeste,
        [string]$JsonPayload
    )

    Write-Host "---------------------------------------------------" -ForegroundColor Cyan
    Write-Host "Executando: $NomeTeste" -ForegroundColor Yellow
    Write-Host "Payload: $JsonPayload" -ForegroundColor DarkGray

    try {
        $Response = Invoke-RestMethod -Uri $BaseUrl -Method Post -Headers $Headers -Body $JsonPayload
        Write-Host "STATUS: SUCESSO" -ForegroundColor Green
        Write-Host "Resposta da API:" ($Response | ConvertTo-Json -Depth 2)
    }
    catch {
        Write-Host "STATUS: FALHA" -ForegroundColor Red
        Write-Host "Erro:" $_.Exception.Message
        if ($_.Exception.Response) {
             # Tenta ler o corpo do erro se houver
             $Reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
             Write-Host "Detalhe:" $Reader.ReadToEnd()
        }
    }
}

# --- CENÁRIO 1: Atualizar a sonda TEST-01 (Brasília -> São Paulo) ---
$Payload1 = '{
    "esn": "TEST-01",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "batteryState": "GOOD"
}'
Enviar-Telemetria -NomeTeste "Movendo TEST-01 para São Paulo" -JsonPayload $Payload1

# --- CENÁRIO 2: Simular uma Nova Sonda (TEST-NEW-02) ---
# Nota: Isso testará se seu sistema cria sondas novas ou apenas ignora
$Payload2 = '{
    "esn": "TEST-NEW-02",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "batteryState": "LOW"
}'
Enviar-Telemetria -NomeTeste "Sonda Nova em Nova York" -JsonPayload $Payload2

# --- CENÁRIO 3: Simular Erro (Sem ESN) ---
$PayloadErro = '{
    "latitude": -10.0000,
    "longitude": -50.0000
}'
Enviar-Telemetria -NomeTeste "Teste de Erro (Sem ESN)" -JsonPayload $PayloadErro

Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host "Simulação concluída." -ForegroundColor Cyan