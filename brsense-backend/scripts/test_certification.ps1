# brsense-backend/scripts/test_certification.ps1
# Script de Teste de Pré-Certificação Globalstar
# Uso: .\scripts\test_certification.ps1 [dev|prod]

param(
    [string]$Env = "dev"
)

# Configuração
if ($Env -eq "prod") {
    $ApiUrl = "https://api.soilreadings.com"
} else {
    $ApiUrl = "https://brsense-api-dev.fly.dev"
}

# Token configurado no projeto
$Token = "y7mlrffdn9XxPVR1SP9tt8iurW6XgZEfl4JpfcKv5eI="

Write-Host "`n=== TESTANDO CERTIFICAÇÃO GLOBALSTAR ($Env) ===" -ForegroundColor Cyan
Write-Host "Alvo: $ApiUrl/v1/uplink/receive`n" -ForegroundColor Gray

# 1. Teste de Autenticação (Deve falhar 401)
Write-Host "1. Testando envio SEM Token..." -NoNewline
try {
    Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body "<xml></xml>" -Headers @{"Content-Type"="application/xml"} -ErrorAction Stop
    Write-Host " FALHA (Deveria ter bloqueado)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host " SUCESSO (Bloqueado 401)" -ForegroundColor Green
    } else {
        Write-Host " ERRO INESPERADO ($($_.Exception.Response.StatusCode))" -ForegroundColor Red
    }
}

# 2. Teste de Heartbeat Vazio (O que reprovou antes)
Write-Host "2. Testando Heartbeat Vazio (Correção Crítica)..." -NoNewline
try {
    $Body = '<?xml version="1.0" encoding="UTF-8"?><stuMessages />'
    $Resp = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (200 OK)" -ForegroundColor Green
} catch {
    Write-Host " FALHA ($($_.Exception.Message))" -ForegroundColor Red
    Write-Host "   Detalhe: $($_.Exception.Response.GetResponseStream() | %{ $_.ReadToEnd() })" -ForegroundColor Yellow
}

# 3. Teste de Mensagem Real
Write-Host "3. Testando Ingestão de Dados..." -NoNewline
try {
    # Payload simulado
    $Body = '<stuMessages><stuMessage><esn>0-CERT-TEST</esn><payload encoding="hex">0200000000000000</payload></stuMessage></stuMessages>'
    Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (Dados aceitos)" -ForegroundColor Green
} catch {
    Write-Host " FALHA" -ForegroundColor Red
}

Write-Host "`nTeste Concluído." -ForegroundColor Cyan