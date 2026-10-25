# Compatibility entry point: exports use the supplied original Foxy.
& node (Join-Path $PSScriptRoot 'build-brand.mjs') @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
