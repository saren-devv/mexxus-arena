# Configurar CORS en Firebase Storage

## 🚨 Problema
Error de CORS al acceder a Firebase Storage desde desarrollo local:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/taekwondo-zarumilla.firebasestorage.app/o/test-permissions' from origin 'http://127.0.0.1:5500' has been blocked by CORS policy
```

## 🔧 Solución

### Paso 1: Instalar Google Cloud SDK

1. **Descarga e instala Google Cloud SDK**:
   - Ve a: https://cloud.google.com/sdk/docs/install
   - Descarga para tu sistema operativo
   - Instala siguiendo las instrucciones

2. **Inicializa gcloud**:
   ```bash
   gcloud init
   ```

### Paso 2: Autenticarse

```bash
gcloud auth login
gcloud config set project taekwondo-zarumilla
```

### Paso 3: Aplicar Configuración CORS

```bash
gsutil cors set cors.json gs://taekwondo-zarumilla.appspot.com
```

### Paso 4: Verificar Configuración

```bash
gsutil cors get gs://taekwondo-zarumilla.appspot.com
```

## 🛠️ Alternativa: Usar Firebase CLI

Si tienes Firebase CLI instalado:

```bash
# Instalar Firebase CLI si no lo tienes
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Configurar CORS
firebase init storage
```

## 🔍 Verificar que Funciona

Después de aplicar la configuración CORS:

1. **Recarga la página** de tu aplicación
2. **Abre la consola** del navegador (F12)
3. **Ejecuta**:
   ```javascript
   await checkStorageConfig()
   ```
4. **Deberías ver**:
   - ✅ Firebase Storage está inicializado
   - ✅ Usuario autenticado: [tu-email]
   - ✅ Permisos de lectura verificados

## 📋 Configuración CORS Detallada

El archivo `cors.json` incluye:

- **Orígenes permitidos**: `http://127.0.0.1:5500`, `localhost:5500`, etc.
- **Métodos HTTP**: GET, POST, PUT, DELETE, HEAD, OPTIONS
- **Headers permitidos**: Content-Type, Authorization, etc.
- **Cache**: 3600 segundos (1 hora)

## 🚀 Para Producción

Cuando despliegues a producción, actualiza el archivo `cors.json` con tu dominio real:

```json
{
  "origin": ["https://tu-dominio-real.com"],
  "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
  "maxAgeSeconds": 3600,
  "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
}
```

## 🔧 Solución Temporal

Si no puedes configurar CORS inmediatamente, puedes:

1. **Usar un servidor local diferente**:
   ```bash
   # En lugar de Live Server, usa:
   python -m http.server 8000
   # o
   npx serve .
   ```

2. **Modificar el código temporalmente** para evitar la verificación de permisos:
   ```javascript
   // Comentar temporalmente esta línea en checkStorageConfiguration()
   // await testRef.getMetadata();
   ```

## 📞 Si el Problema Persiste

1. **Verifica que el proyecto sea correcto**: `taekwondo-zarumilla`
2. **Confirma que estés autenticado**: `gcloud auth list`
3. **Revisa los logs de Firebase Console** para errores adicionales
4. **Prueba con un dominio diferente** temporalmente 