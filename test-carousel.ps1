$token = "2H5Xpkc3BNYf1ZmlF5szlgWooMgw19"
$ticketId = "1"
$baseUrl = "http://localhost:8080"

if ($ticketId -notmatch '^\d+$') { Write-Host "ticketId inválido. Informe apenas dígitos." -ForegroundColor Red; exit 1 }

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

$body = @{
    cards = @(
        @{
            header = @{
                title    = "iPhone 15 Pro"
                subtitle = "Lançamento"
                imageUrl = "https://picsum.photos/400/300?random=1"
            }
            body    = "128GB, Titânio Azul"
            footer  = "R$ 7.999,00"
            buttons = @(
                @{ type = "url"; displayText = "Comprar Agora"; url = "https://example.com/iphone" },
                @{ type = "reply"; displayText = "Mais Informações"; id = "info_iphone" }
            )
        },
        @{
            header = @{
                title    = "MacBook Air M3"
                imageUrl = "https://picsum.photos/400/300?random=2"
            }
            body    = "13 polegadas, 8GB RAM"
            footer  = "R$ 9.499,00"
            buttons = @(
                @{ type = "url"; displayText = "Ver Detalhes"; url = "https://example.com/macbook" }
            )
        }
    )
} | ConvertTo-Json -Depth 10

$url = "$baseUrl/external/messages/carousel/$ticketId"
Write-Host "POST $url" -ForegroundColor Cyan

try {
  $resp = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
  Write-Host "✅ Carrossel enviado com sucesso" -ForegroundColor Green
  $resp | ConvertTo-Json -Depth 10
} catch {
  Write-Host "❌ Falha ao enviar carrossel" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host $responseBody
  } else {
    Write-Host $_.Exception.Message
  }
  exit 1
}
