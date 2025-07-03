# 🔧 Configuración Dinámica - MEXXUS ARENA

## ¿Qué se ha solucionado?

Anteriormente, la aplicación tenía hardcodeado `localhost:5000` en el código, lo que hacía imposible usarla en producción. Ahora se ha implementado una **configuración dinámica** que detecta automáticamente si estás en desarrollo o producción.

## ✅ Archivos Modificados

### 1. **config.js** (NUEVO)
- Sistema de configuración inteligente
- Detecta automáticamente desarrollo vs producción
- Maneja todas las URLs del backend

### 2. **admin.js** (MODIFICADO)
- Reemplazadas las URLs hardcodeadas
- Ahora usa `window.mexxusConfig` para obtener URLs dinámicamente

### 3. **index.html** (MODIFICADO)
- Incluye `config.js` antes de otros scripts

### 4. **test_backend.py** (MEJORADO)
- Ahora puede probar backends locales y remotos
- Acepta URLs como parámetro

## 🚀 Cómo Usar

### En Desarrollo (Local)
```bash
# Inicia el backend local
python start_backend.py

# Abre index.html en el navegador
# La app detectará automáticamente que estás en localhost
```

### En Producción (Netlify)
1. **Edita config.js**:
   ```javascript
   production: 'https://TU-BACKEND-URL.railway.app'
   ```
2. **Sube a Netlify**
3. **¡Listo!** La app detectará automáticamente que está en producción

## 🧪 Probar la Configuración

### Backend Local
```bash
python test_backend.py
```

### Backend en Producción
```bash
python test_backend.py tu-backend.railway.app
```

## 📋 Próximos Pasos

1. **Aloja el backend** en Railway/Render/Heroku
2. **Actualiza config.js** con la URL real
3. **Despliega en Netlify**
4. **Prueba la funcionalidad** de generar llaves

## 🔍 Detección Automática

La aplicación detecta automáticamente el entorno:
- **Desarrollo**: `localhost:5500`, `127.0.0.1:5500`, archivos locales
- **Producción**: Dominios como `.netlify.app`, `.vercel.app`, etc.

## 💡 Beneficios

- ✅ **No más cambios manuales** entre desarrollo y producción
- ✅ **Detección automática** del entorno
- ✅ **Configuración centralizada** en un solo archivo
- ✅ **Fácil mantenimiento** y actualización
- ✅ **Compatible con cualquier servicio** de hosting

¡Ahora tu aplicación MEXXUS ARENA funciona tanto en desarrollo como en producción! 🥋✨ 