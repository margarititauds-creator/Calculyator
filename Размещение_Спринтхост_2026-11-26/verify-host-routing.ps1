param([string]$OutputPath = (Join-Path $PSScriptRoot 'host-routing-verification.json'))
$ErrorActionPreference = 'Stop'
$cases = @(
    @{ Name = 'main_https_redirect'; HostName = 'margarititavoronina.ru'; Path = '/'; ExpectedStatus = 302; ExpectedLocation = 'https://margarititavoronina.ru/' },
    @{ Name = 'public_config'; HostName = 'www.margarititavoronina.ru'; Path = '/api/config.json'; ExpectedStatus = 200 },
    @{ Name = 'privacy'; HostName = 'www.margarititavoronina.ru'; Path = '/privacy.html'; ExpectedStatus = 302; ExpectedLocation = 'https://d5dafk8hndmtgdf4nfio.3zvepvee.apigw.yandexcloud.net/privacy' },
    @{ Name = 'consent'; HostName = 'www.margarititavoronina.ru'; Path = '/consent.html'; ExpectedStatus = 302; ExpectedLocation = 'https://d5dafk8hndmtgdf4nfio.3zvepvee.apigw.yandexcloud.net/consent' },
    @{ Name = 'no_local_intake'; HostName = 'www.margarititavoronina.ru'; Path = '/api/submit'; ExpectedStatus = 404 },
    @{ Name = 'htaccess_not_public'; HostName = 'www.margarititavoronina.ru'; Path = '/.htaccess'; ExpectedStatus = 403 },
    @{ Name = 'acme_not_redirected'; HostName = 'margarititavoronina.ru'; Path = '/.well-known/acme-challenge/calculator-route-check'; ExpectedStatus = 404 }
)
$results = foreach ($case in $cases) {
    $routeUrl = 'http://' + $case.HostName + $case.Path
    $resolveRoute = $case.HostName + ':80:141.8.192.126'
    $headers = & curl.exe --silent --show-error --max-time 15 --resolve $resolveRoute --dump-header - --output NUL $routeUrl
    $curlExit = $LASTEXITCODE
    $statusLine = $headers | Where-Object { $_ -match '^HTTP/' } | Select-Object -Last 1
    $status = if ($statusLine -match '^HTTP/\S+\s+(\d+)') { [int]$Matches[1] } else { 0 }
    $locationLine = $headers | Where-Object { $_ -match '^Location:' } | Select-Object -Last 1
    $location = if ($locationLine) { ($locationLine -replace '^Location:\s*','').Trim() } else { $null }
    $passed = ($curlExit -eq 0 -and $status -eq $case.ExpectedStatus)
    if ($case.ExpectedLocation) { $passed = $passed -and ($location -ceq $case.ExpectedLocation) }
    if ($case.Name -eq 'acme_not_redirected') { $passed = $passed -and -not $location }
    [pscustomobject]@{ name=$case.Name; status=$status; location=$location; passed=$passed; curlExit=$curlExit }
}
$report = [ordered]@{ at=(Get-Date).ToString('o'); server='141.8.192.126'; scope='Public HTTP route checks only; no form submission; no DNS/hosts/VPN changes'; passed=@($results | Where-Object passed).Count; total=$results.Count; results=$results }
$json = $report | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($OutputPath, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
$json
