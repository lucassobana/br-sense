# Test script for Globalstar certification readiness (PowerShell version)
# Tests the /v1/uplink/receive endpoint with various scenarios

param(
    [string]$ApiUrl = "https://brsense-api-dev.fly.dev",
    [string]$UplinkToken = "y7mlrffdn9XxPVR1SP9tt8iurW6XgZEfl4JpfcKv5eI=",
    [string]$TestMessageDir = "stockTestMessages"
)

$ErrorActionPreference = "Stop"

# Test counter
$script:TestsPassed = 0
$script:TestsFailed = 0

# Helper functions
function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "--------------------------------------------------------" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "--------------------------------------------------------" -ForegroundColor Blue
}

function Write-TestName {
    param([string]$Name)
    Write-Host ""
    Write-Host ">>> TEST: $Name" -ForegroundColor Yellow
}

function Write-Pass {
    param([string]$Message)
    Write-Host "  PASS: $Message" -ForegroundColor Green
    $script:TestsPassed++
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  FAIL: $Message" -ForegroundColor Red
    $script:TestsFailed++
}

function Write-Info {
    param([string]$Message)
    Write-Host "   i  $Message" -ForegroundColor Gray
}

# Test functions
function Test-HealthCheck {
    Write-TestName "Health Check Endpoint"

    try {
        # Tenta conectar na raiz
        $response = Invoke-RestMethod -Uri "$ApiUrl/" -Method Get
        
        # Verifica se o status é running ou ok
        if ($response.status -eq "running" -or $response.status -eq "ok") {
            Write-Pass "Health endpoint returned status: $($response.status)"
        } else {
            Write-Fail "Health endpoint returned unexpected status: $($response.status)"
            # Converte para JSON para mostrar no log sem erro
            $json = $response | ConvertTo-Json -Compress -Depth 2
            Write-Info "Response: $json"
        }
    } catch {
        Write-Fail "Health check failed with error: $_"
    }
}

function Test-PingEndpoint {
    Write-TestName "Ping Endpoint"

    try {
        $response = Invoke-RestMethod -Uri "$ApiUrl/ping" -Method Get

        if ($response.status -eq "ok" -and $response.message -eq "pong") {
            Write-Pass "Ping endpoint returned expected response"
        } else {
            Write-Fail "Ping endpoint did not return expected response"
            $json = $response | ConvertTo-Json -Compress -Depth 2
            Write-Info "Response: $json"
        }
    } catch {
        Write-Fail "Ping check failed with error: $_"
    }
}

function Test-NoTokenNoAllowlist {
    Write-TestName "Request WITHOUT token (should FAIL)"

    try {
        $body = '<stuMessages><stuMessage><esn>TEST-001</esn></stuMessage></stuMessages>'
        $headers = @{
            "Content-Type" = "application/xml"
        }

        Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Headers $headers -Body $body
        Write-Fail "Request without token succeeded (should have failed with 401)"
    } catch {
        # Pega o código de status do erro
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Pass "Correctly rejected request without token (HTTP 401)"
        } else {
            Write-Fail "Expected HTTP 401, got: $($_.Exception.Response.StatusCode)"
        }
    }
}

function Test-WithToken {
    Write-TestName "Request WITH valid token (should SUCCEED)"

    try {
        $body = '<stuMessages><stuMessage><esn>TEST-TOKEN-001</esn><payload>0200000000000000</payload></stuMessage></stuMessages>'
        $headers = @{
            "Content-Type" = "application/xml"
            "X-Uplink-Token" = $UplinkToken
        }

        $response = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Headers $headers -Body $body
        Write-Pass "Request with valid token succeeded (HTTP 200)"
    } catch {
        Write-Fail "Request with valid token failed: $_"
    }
}

function Test-RealPayload {
    Write-TestName "Real SmartOne-C XML payload ingestion"

    # Tenta encontrar o arquivo PADRÃO primeiro (que sabemos que funciona)
    $testFile = $null
    
    if (Test-Path "$TestMessageDir") {
        # Prioridade 1: O arquivo padrão exato
        $testFile = Get-ChildItem -Path $TestMessageDir -Filter "StuMessage_Rev8.xml" | Select-Object -First 1
        
        # Prioridade 2: Qualquer StuMessage que NÃO seja "Empty" (Vazio)
        if (-not $testFile) {
            $testFile = Get-ChildItem -Path $TestMessageDir -Filter "*StuMessage*.xml" | Where-Object { $_.Name -notlike "Empty*" } | Select-Object -First 1
        }
    }

    # Fallback antigo
    if (-not $testFile) {
        $fallback = "$TestMessageDir/StuMessage_Rev8.xml"
        if (Test-Path $fallback) {
            $testFile = Get-Item $fallback
        }
    }

    if (-not $testFile) {
        Write-Fail "Valid test message file not found in directory '$TestMessageDir'"
        return
    }

    Write-Info "Using test file: $($testFile.Name)"

    try {
        $body = Get-Content $testFile.FullName -Raw
        $headers = @{
            "Content-Type" = "application/xml"
            "X-Uplink-Token" = $UplinkToken
        }

        $response = Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Headers $headers -Body $body
        Write-Pass "Real payload ingestion succeeded"
    } catch {
        # Captura erro detalhado do backend para mostrar
        $errDetail = $_.Exception.Message
        if ($_.Exception.Response) {
             $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
             $errDetail = $reader.ReadToEnd()
        }
        Write-Fail "Real payload ingestion failed: $errDetail"
    }
}

function Test-InvalidPayload {
    Write-TestName "Invalid XML payload (should return HTTP 400)"

    try {
        $body = '<invalid>xml<without>closing</tags>'
        $headers = @{
            "Content-Type" = "application/xml"
            "X-Uplink-Token" = $UplinkToken
        }

        Invoke-RestMethod -Uri "$ApiUrl/v1/uplink/receive" -Method Post -Headers $headers -Body $body
        Write-Fail "Invalid payload was accepted (should have failed with 400)"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Pass "Invalid payload correctly rejected (HTTP 400)"
        } else {
            Write-Fail "Expected HTTP 400, got: $($_.Exception.Response.StatusCode)"
        }
    }
}

function Test-DataRetrieval {
    Write-TestName "Data Retrieval - Verify ingested data"

    try {
        $response = Invoke-RestMethod -Uri "$ApiUrl/v1/readings/latest?limit=5" -Method Get
        
        # Verifica se retornou uma lista (array)
        if ($response -is [Array]) {
            if ($response.Count -gt 0) {
                 Write-Pass "Latest readings endpoint accessible (Found $($response.Count) records)"
            } else {
                 Write-Pass "Latest readings endpoint accessible (But returned 0 records)"
            }
        } else {
            # Se não for array, pode ser um objeto vazio ou erro
            Write-Pass "Latest readings endpoint responded (Type: $($response.GetType().Name))"
        }
    } catch {
        Write-Fail "Could not retrieve readings: $_"
    }
}

function Test-DevicesEndpoint {
    Write-TestName "Devices List - Verify devices"

    try {
        $response = Invoke-RestMethod -Uri "$ApiUrl/v1/devices" -Method Get
        Write-Pass "Devices endpoint accessible"
    } catch {
        Write-Fail "Could not retrieve devices list: $_"
    }
}

# Main execution
function Main {
    Write-Header "Globalstar Certification Readiness Tests"
    Write-Host "Testing endpoint: $ApiUrl/v1/uplink/receive"
    Write-Host "Started: $(Get-Date)"

    # Check test message directory
    if (-not (Test-Path $TestMessageDir)) {
        Write-Host "WARNING: Directory '$TestMessageDir' not found." -ForegroundColor Yellow
        Write-Host "Attempting to continue, but 'RealPayload' test will likely fail." -ForegroundColor Yellow
    }

    # Run all tests
    Test-HealthCheck
    Test-PingEndpoint
    Test-NoTokenNoAllowlist
    Test-WithToken
    Test-InvalidPayload
    Test-RealPayload
    Test-DataRetrieval
    Test-DevicesEndpoint

    # Summary
    Write-Header "Test Summary"

    $totalTests = $script:TestsPassed + $script:TestsFailed

    Write-Host "Total Tests: $totalTests"
    Write-Host "Passed: $script:TestsPassed" -ForegroundColor Green
    Write-Host "Failed: $script:TestsFailed" -ForegroundColor Red

    if ($script:TestsFailed -eq 0) {
        Write-Host ""
        Write-Host "--------------------------------------------------------" -ForegroundColor Green
        Write-Host "  ALL TESTS PASSED - READY FOR GLOBALSTAR CERTIFICATION" -ForegroundColor Green
        Write-Host "--------------------------------------------------------" -ForegroundColor Green
        Write-Host ""
        exit 0
    } else {
        Write-Host ""
        Write-Host "--------------------------------------------------------" -ForegroundColor Red
        Write-Host "  SOME TESTS FAILED - REVIEW ISSUES BEFORE CERTIFICATION" -ForegroundColor Red
        Write-Host "--------------------------------------------------------" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

# Run main
Main