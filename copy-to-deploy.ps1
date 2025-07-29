# Script de copia automática para MEXXUS ARENA
Write-Host "=== SCRIPT DE COPIA AUTOMÁTICA - MEXXUS ARENA BETA 1.2 ===" -ForegroundColor Cyan
Write-Host "Copiando archivos al directorio de despliegue..." -ForegroundColor Green
Write-Host ""

# Verificar que existe el directorio deploy
if (-not (Test-Path "deploy")) {
    Write-Host "Creando directorio deploy..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "deploy" -Force
}

# Archivos principales
$files = @("app.js", "auth.js", "admin.js", "events.js", "public-events.js", 
           "firebase-config.js", "country-flags.js", "policies.js", "cors.json", 
           "bienvenida.txt", "index.html", "styles.css")

Write-Host "Copiando archivos principales..." -ForegroundColor Yellow
foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file "deploy/" -Force
        Write-Host "✓ Copiado: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ No encontrado: $file" -ForegroundColor Red
    }
}

Write-Host ""

# Archivos JSON
$jsonFiles = @("poomsae-categories.json", "taekwondo_categories.json", "toast.json")
Write-Host "Copiando archivos JSON..." -ForegroundColor Yellow
foreach ($file in $jsonFiles) {
    if (Test-Path $file) {
        Copy-Item $file "deploy/" -Force
        Write-Host "✓ Copiado: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ No encontrado: $file" -ForegroundColor Red
    }
}

Write-Host ""

# Directorios
$directories = @("img", "logos", "src")
Write-Host "Copiando directorios..." -ForegroundColor Yellow
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        # Eliminar directorio si existe en deploy
        if (Test-Path "deploy/$dir") {
            Remove-Item "deploy/$dir" -Recurse -Force
        }
        Copy-Item $dir "deploy/" -Recurse -Force
        Write-Host "✓ Copiado directorio: $dir" -ForegroundColor Green
    } else {
        Write-Host "✗ No encontrado directorio: $dir" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar archivos copiados
Write-Host "Verificando archivos copiados..." -ForegroundColor Yellow
$deployFiles = Get-ChildItem "deploy" -Recurse | Measure-Object
Write-Host "Total de archivos en deploy: $($deployFiles.Count)" -ForegroundColor Cyan

# Mostrar resumen de archivos principales
Write-Host ""
Write-Host "=== RESUMEN DE ARCHIVOS PRINCIPALES ===" -ForegroundColor Cyan
$mainFiles = @("index.html", "app.js", "styles.css", "auth.js", "admin.js")
foreach ($file in $mainFiles) {
    if (Test-Path "deploy/$file") {
        $size = (Get-Item "deploy/$file").Length
        $sizeKB = [math]::Round($size / 1KB, 2)
        Write-Host "✓ $file ($sizeKB KB)" -ForegroundColor Green
    } else {
        Write-Host "✗ $file (NO ENCONTRADO)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== PROCESO DE COPIA COMPLETADO ===" -ForegroundColor Green
Write-Host "Los archivos han sido copiados exitosamente al directorio deploy/" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Verificar que todos los archivos estén en deploy/" -ForegroundColor White
Write-Host "2. Probar localmente: python -m http.server 8000" -ForegroundColor White
Write-Host "3. Hacer commit: git add . && git commit -m 'Actualización'" -ForegroundColor White
Write-Host "4. Subir cambios: git push origin main" -ForegroundColor White
Write-Host "" 