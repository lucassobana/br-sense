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

Write-Host "`n=== TESTANDO CERTIFICACAO GLOBALSTAR ($Env) ===" -ForegroundColor Cyan
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
Write-Host "2. Testando Heartbeat Vazio ..." -NoNewline
try {
    $Body = '<?xml version="1.0" encoding="UTF-8"?><stuMessages />'
    $Resp = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (200 OK)" -ForegroundColor Green
    $Resp | Out-String | Write-Host
} catch {
    Write-Host " FALHA ($($_.Exception.Message))" -ForegroundColor Red
    Write-Host "   Detalhe: $($_.Exception.Response.GetResponseStream() | ForEach-Object{ $_.ReadToEnd() })" -ForegroundColor Yellow
}

# 3. Teste de Mensagem Real
Write-Host "3. Testando Ingestao de Dados..." -NoNewline
Write-Host "3.1 Testando Ingestao de Dados stu nulo..." -NoNewline
try {
    # Payload simulado
    $Body = Get-Content -Path ".\scripts\body\EmptyStuMessage_Rev8.xml" -Raw
    $Resp = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (Dados aceitos)" -ForegroundColor Green
    $Resp | Out-String | Write-Host
} catch {
    Write-Host " FALHA" -ForegroundColor Red
}

Write-Host "`nTeste Concluido." -ForegroundColor Cyan

Write-Host "3.2 Testando Ingestao de Dados prvmsgs nulo..." -NoNewline
try {
    # Payload simulado
    $Body = Get-Content -Path ".\scripts\body\EmptyProvMessage_Rev8.xml" -Raw
    $Resp = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (Dados aceitos)" -ForegroundColor Green
    $Resp | Out-String | Write-Host
} catch {
    Write-Host " FALHA" -ForegroundColor Red
}

Write-Host "`nTeste Concluido." -ForegroundColor Cyan

Write-Host "3.3 Testando Ingestao de Dados stu..." -NoNewline
try {
    # Payload simulado
    $Body = Get-Content -Path ".\scripts\body\StuMessage_Rev8.xml" -Raw
    $Resp = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (Dados aceitos)" -ForegroundColor Green
    $Resp | Out-String | Write-Host
} catch {
    Write-Host " FALHA" -ForegroundColor Red
}

Write-Host "`nTeste Concluido." -ForegroundColor Cyan

Write-Host "3.4 Testando Ingestao de Dados prvmsgs..." -NoNewline
try {
    # Payload simulado
    $Body = Get-Content -Path ".\scripts\body\ProvisionMessage_Rev8.xml" -Raw
    $Resp = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (Dados aceitos)" -ForegroundColor Green
    $Resp | Out-String | Write-Host
} catch {
    Write-Host " FALHA" -ForegroundColor Red
}

Write-Host "`nTeste Concluido." -ForegroundColor Cyan

Write-Host "3.5 Testando Ingestao de 200 Dados stu..." -NoNewline
try {
    # Payload simulado
    $Body = Get-Content -Path ".\scripts\body\LargeStuMessage_Rev8.xml" -Raw
    $Resp = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (Dados aceitos)" -ForegroundColor Green
    $Resp | Out-String | Write-Host
} catch {
    Write-Host " FALHA" -ForegroundColor Red
}

Write-Host "`nTeste Concluido." -ForegroundColor Cyan

Write-Host "3.6 Testando Ingestao de 200 Dados prvmsgs..." -NoNewline
try {
    # Payload simulado
    $Body = Get-Content -Path ".\scripts\body\MultiPartStuMessage_Rev8.xml" -Raw
    $Resp = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Body $Body -Headers @{"Content-Type"="application/xml"; "X-Uplink-Token"=$Token} -ErrorAction Stop
    Write-Host " SUCESSO (Dados aceitos)" -ForegroundColor Green
    $Resp | Out-String | Write-Host
} catch {
    Write-Host " FALHA" -ForegroundColor Red
}

Write-Host "`nTeste Concluido." -ForegroundColor Cyan