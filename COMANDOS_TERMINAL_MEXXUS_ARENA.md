# COMANDOS DE TERMINAL - MEXXUS ARENA BETA 1.2

## 📋 ÍNDICE
1. [Configuración Inicial](#configuración-inicial)
2. [Comandos de Despliegue](#comandos-de-despliegue)
3. [Comandos de Desarrollo](#comandos-de-desarrollo)
4. [Comandos de Mantenimiento](#comandos-de-mantenimiento)
5. [Comandos de Firebase](#comandos-de-firebase)
6. [Comandos de Git](#comandos-de-git)
7. [Comandos de Limpieza](#comandos-de-limpieza)
8. [Comandos de Análisis](#comandos-de-análisis)

---

## 🚀 CONFIGURACIÓN INICIAL

### Instalar dependencias del proyecto principal
```bash
npm install
```

### Instalar dependencias del directorio de despliegue
```bash
cd deploy
npm install
cd ..
```

### Verificar estructura del proyecto
```bash
# Ver archivos principales
ls -la

# Ver contenido del directorio deploy
ls -la deploy/

# Verificar que todos los archivos necesarios estén presentes
ls -la deploy/img/ deploy/logos/ deploy/src/
```

---

## 📦 COMANDOS DE DESPLIEGUE

### Copiar archivos al directorio de despliegue (Windows PowerShell)
```powershell
# Copiar archivos principales
Copy-Item "app.js" "deploy/"
Copy-Item "auth.js" "deploy/"
Copy-Item "admin.js" "deploy/"
Copy-Item "events.js" "deploy/"
Copy-Item "public-events.js" "deploy/"
Copy-Item "firebase-config.js" "deploy/"
Copy-Item "country-flags.js" "deploy/"
Copy-Item "policies.js" "deploy/"
Copy-Item "cors.json" "deploy/"
Copy-Item "bienvenida.txt" "deploy/"
Copy-Item "index.html" "deploy/"
Copy-Item "styles.css" "deploy/"

# Copiar archivos JSON
Copy-Item "poomsae-categories.json" "deploy/"
Copy-Item "taekwondo_categories.json" "deploy/"
Copy-Item "toast.json" "deploy/"

# Copiar directorios completos
Copy-Item "img/" "deploy/" -Recurse -Force
Copy-Item "logos/" "deploy/" -Recurse -Force
Copy-Item "src/" "deploy/" -Recurse -Force
```

### Copiar archivos al directorio de despliegue (Linux/Mac)
```bash
# Copiar archivos principales
cp app.js deploy/
cp auth.js deploy/
cp admin.js deploy/
cp events.js deploy/
cp public-events.js deploy/
cp firebase-config.js deploy/
cp country-flags.js deploy/
cp policies.js deploy/
cp cors.json deploy/
cp bienvenida.txt deploy/
cp index.html deploy/
cp styles.css deploy/

# Copiar archivos JSON
cp poomsae-categories.json deploy/
cp taekwondo_categories.json deploy/
cp toast.json deploy/

# Copiar directorios completos
cp -r img/ deploy/
cp -r logos/ deploy/
cp -r src/ deploy/
```

### Script automatizado de copia (Windows PowerShell)
```powershell
# Crear script de copia automática
@"
# Script de copia automática para MEXXUS ARENA
Write-Host "Copiando archivos al directorio de despliegue..." -ForegroundColor Green

# Archivos principales
$files = @("app.js", "auth.js", "admin.js", "events.js", "public-events.js", 
           "firebase-config.js", "country-flags.js", "policies.js", "cors.json", 
           "bienvenida.txt", "index.html", "styles.css")

foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file "deploy/" -Force
        Write-Host "✓ Copiado: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ No encontrado: $file" -ForegroundColor Red
    }
}

# Archivos JSON
$jsonFiles = @("poomsae-categories.json", "taekwondo_categories.json", "toast.json")
foreach ($file in $jsonFiles) {
    if (Test-Path $file) {
        Copy-Item $file "deploy/" -Force
        Write-Host "✓ Copiado: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ No encontrado: $file" -ForegroundColor Red
    }
}

# Directorios
$directories = @("img", "logos", "src")
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Copy-Item $dir "deploy/" -Recurse -Force
        Write-Host "✓ Copiado directorio: $dir" -ForegroundColor Green
    } else {
        Write-Host "✗ No encontrado directorio: $dir" -ForegroundColor Red
    }
}

Write-Host "Proceso de copia completado!" -ForegroundColor Green
"@ | Out-File -FilePath "copy-to-deploy.ps1" -Encoding UTF8
```

### Ejecutar script de copia
```powershell
.\copy-to-deploy.ps1
```

---

## 🔧 COMANDOS DE DESARROLLO

### Iniciar servidor local de desarrollo
```bash
# Usando Python (si está instalado)
python -m http.server 8000

# Usando Node.js (si tienes http-server instalado)
npx http-server -p 8000

# Usando PHP (si está instalado)
php -S localhost:8000
```

### Verificar archivos antes del despliegue
```bash
# Verificar que todos los archivos necesarios estén en deploy/
cd deploy
ls -la

# Verificar tamaños de archivos
Get-ChildItem -Recurse | Sort-Object Length -Descending | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}} | Format-Table -AutoSize
```

### Validar archivos JSON
```bash
# Validar archivos JSON (requiere jq)
jq . deploy/poomsae-categories.json
jq . deploy/taekwondo_categories.json
jq . deploy/toast.json
jq . deploy/cors.json
```

---

## 🛠️ COMANDOS DE MANTENIMIENTO

### Limpiar archivos temporales
```bash
# Limpiar archivos .DS_Store (Mac)
find . -name ".DS_Store" -delete

# Limpiar archivos Thumbs.db (Windows)
Get-ChildItem -Recurse -Name "Thumbs.db" | Remove-Item -Force

# Limpiar archivos de backup
Get-ChildItem -Recurse -Name "*.bak" | Remove-Item -Force
Get-ChildItem -Recurse -Name "*.tmp" | Remove-Item -Force
```

### Verificar integridad de archivos
```bash
# Generar checksums de archivos importantes
Get-FileHash "deploy/index.html" -Algorithm SHA256
Get-FileHash "deploy/app.js" -Algorithm SHA256
Get-FileHash "deploy/styles.css" -Algorithm SHA256
```

### Optimizar imágenes (si tienes herramientas instaladas)
```bash
# Usando ImageMagick (si está instalado)
magick mogrify -quality 85 -resize 1920x1080 deploy/img/*.png
magick mogrify -quality 85 -resize 800x600 deploy/logos/*.png
```

---

## 🔥 COMANDOS DE FIREBASE

### Instalar Firebase CLI (si no está instalado)
```bash
npm install -g firebase-tools
```

### Iniciar sesión en Firebase
```bash
firebase login
```

### Inicializar proyecto Firebase
```bash
firebase init
```

### Desplegar a Firebase Hosting
```bash
# Desde el directorio raíz
firebase deploy --only hosting

# Desde el directorio deploy
cd deploy
firebase deploy --only hosting
cd ..
```

### Verificar reglas de Firestore
```bash
# Probar reglas de Firestore
firebase emulators:start --only firestore
```

---

## 📝 COMANDOS DE GIT

### Configurar repositorio Git
```bash
# Inicializar repositorio (si no existe)
git init

# Agregar archivos
git add .

# Hacer commit
git commit -m "Actualización MEXXUS ARENA Beta 1.2"

# Agregar remoto (reemplazar URL con tu repositorio)
git remote add origin https://github.com/tu-usuario/mexxus-arena.git

# Subir cambios
git push -u origin main
```

### Comandos de Git para desarrollo
```bash
# Ver estado del repositorio
git status

# Ver historial de commits
git log --oneline

# Crear nueva rama
git checkout -b feature/nueva-funcionalidad

# Cambiar entre ramas
git checkout main

# Fusionar rama
git merge feature/nueva-funcionalidad
```

---

## 🧹 COMANDOS DE LIMPIEZA

### Limpiar directorio deploy
```bash
# Limpiar directorio deploy completamente
Remove-Item "deploy/*" -Recurse -Force

# Recrear directorio deploy
New-Item -ItemType Directory -Path "deploy" -Force
```

### Limpiar archivos de node_modules
```bash
# Limpiar node_modules en directorio principal
Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Limpiar node_modules en deploy
Remove-Item "deploy/node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Reinstalar dependencias
npm install
cd deploy && npm install && cd ..
```

### Limpiar archivos de caché
```bash
# Limpiar caché de npm
npm cache clean --force

# Limpiar caché de Git
git gc --prune=now
```

---

## 📊 COMANDOS DE ANÁLISIS

### Analizar tamaño de archivos
```bash
# Ver tamaño de archivos en deploy
Get-ChildItem "deploy" -Recurse | Sort-Object Length -Descending | Select-Object Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}} | Format-Table -AutoSize
```

### Verificar dependencias
```bash
# Verificar dependencias obsoletas
npm outdated

# Actualizar dependencias
npm update
```

### Analizar rendimiento
```bash
# Verificar tamaño de bundle (si usas herramientas de bundling)
npx webpack-bundle-analyzer

# Analizar rendimiento con Lighthouse (si tienes Chrome instalado)
lighthouse https://tu-sitio.netlify.app --output html --output-path ./lighthouse-report.html
```

---

## 🚨 COMANDOS DE EMERGENCIA

### Restaurar desde backup
```bash
# Si tienes un backup, restaurar archivos
Copy-Item "backup/*" "." -Recurse -Force
```

### Revertir último commit
```bash
git reset --hard HEAD~1
```

### Limpiar completamente y reinstalar
```bash
# Limpiar todo y reinstalar
Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "deploy/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
npm install
cd deploy && npm install && cd ..
```

---

## 📋 CHECKLIST DE DESPLIEGUE

### Antes del despliegue:
- [ ] Ejecutar `.\copy-to-deploy.ps1`
- [ ] Verificar que todos los archivos estén en `deploy/`
- [ ] Probar localmente con `python -m http.server 8000`
- [ ] Verificar que no hay errores en la consola del navegador
- [ ] Hacer commit de cambios: `git add . && git commit -m "Preparación para despliegue"`

### Durante el despliegue:
- [ ] Subir cambios a Git: `git push origin main`
- [ ] Verificar que Netlify detecta los cambios automáticamente
- [ ] Revisar logs de build en Netlify

### Después del despliegue:
- [ ] Verificar que el sitio funciona correctamente
- [ ] Probar todas las funcionalidades principales
- [ ] Verificar que las imágenes se cargan correctamente
- [ ] Comprobar que Firebase está conectado

---

## 💡 CONSEJOS ADICIONALES

### Variables de entorno
Si necesitas configurar variables de entorno en Netlify:
1. Ve a Settings > Environment variables en tu dashboard de Netlify
2. Agrega las variables necesarias (API keys, etc.)

### Optimización de rendimiento
- Comprimir imágenes antes de subirlas
- Minificar CSS y JS en producción
- Usar CDN para archivos estáticos grandes

### Monitoreo
- Configurar alertas en Netlify para builds fallidos
- Usar Google Analytics para monitorear el tráfico
- Configurar logs de errores en Firebase

---

**Nota:** Este documento debe actualizarse cada vez que se agreguen nuevos archivos o se modifique la estructura del proyecto. 