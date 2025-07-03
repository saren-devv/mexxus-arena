# 🚀 Configuración de GitHub para MEXXUS ARENA

## Paso 1: Crear repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en "New repository" (botón verde)
3. Configura:
   - **Repository name**: `mexxus-arena`
   - **Description**: `MEXXUS ARENA - Sistema de gestión para eventos deportivos de taekwondo`
   - **Visibility**: Public (recomendado)
   - ❌ NO marques "Add a README file"
   - ❌ NO marques "Add .gitignore"
   - ❌ NO marques "Choose a license"
4. Haz clic en "Create repository"

## Paso 2: Conectar repositorio local con GitHub

Una vez creado el repositorio, ejecuta estos comandos en tu terminal:

```bash
# Reemplaza TU_USUARIO con tu nombre de usuario de GitHub
git remote add origin https://github.com/saren-devv/mexxus-arena
git branch -M main
git push -u origin main
```

## Paso 3: Verificar que todo esté subido

Ve a tu repositorio en GitHub y verifica que todos los archivos estén ahí:
- ✅ `bracket_generator.py`
- ✅ `requirements.txt`
- ✅ `Procfile`
- ✅ `config.js`
- ✅ `index.html`
- ✅ Y todos los demás archivos

## Paso 4: Continuar con Railway

Una vez que el repositorio esté en GitHub, podremos continuar con el despliegue en Railway.

---

**Nota**: Si necesitas ayuda con algún paso, dime tu nombre de usuario de GitHub y te ayudo con los comandos exactos. 