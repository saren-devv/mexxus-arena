# 🚀 Guía de Despliegue - MEXXUS ARENA

## Backend en Producción

### 📋 Paso 1: Preparar el Backend

Tu backend Python (`bracket_generator.py`) necesita ser alojado en un servicio como:
- **Railway** (Recomendado)
- **Render** 
- **Heroku**
- **PythonAnywhere**

### 🚂 Opción 1: Railway (Recomendado)

1. **Crear cuenta en Railway**:
   - Ve a [railway.app](https://railway.app)
   - Crea una cuenta gratuita

2. **Crear un nuevo proyecto**:
   - Click en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio

3. **Configurar el proyecto**:
   - Railway detectará automáticamente que es un proyecto Python
   - Asegúrate de que tienes `requirements.txt` en tu repo
   - El puerto se configurará automáticamente

4. **Obtener la URL**:
   - Una vez desplegado, obtendrás una URL como: `https://tu-proyecto.railway.app`

### 🔧 Paso 2: Configurar el Frontend

1. **Editar config.js**:
   ```javascript
   this.API_ENDPOINTS = {
       development: 'http://localhost:5500',
       production: 'https://tu-proyecto.railway.app' // ⭐ Cambia esta URL
   };
   ```

2. **Reemplazar la URL**:
   - Abre `config.js`
   - Cambia `https://your-backend-url.railway.app` por tu URL real
   - Ejemplo: `https://mexxus-arena-backend.railway.app`

### 🌐 Paso 3: Desplegar en Netlify

1. **Preparar el proyecto**:
   - Sube todos los archivos a GitHub
   - Incluye el `config.js` modificado

2. **Conectar con Netlify**:
   - Ve a [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Selecciona tu repositorio
   - Configura:
     - **Build command**: (dejar vacío para sitio estático)
     - **Publish directory**: (dejar vacío o poner `/`)

3. **Desplegar**:
   - Click "Deploy site"
   - Netlify te dará una URL como: `https://tu-sitio.netlify.app`

### 🧪 Paso 4: Probar la Conexión

1. **Probar el backend**:
   ```bash
   python test_backend.py tu-proyecto.railway.app
   ```

2. **Probar desde el frontend**:
   - Abre tu sitio en Netlify
   - Ve a la sección de administración
   - Intenta generar las llaves con un archivo Excel

### 📁 Estructura de Archivos Necesarios

```
mexxus_arena/
├── config.js ⭐ (Nuevo archivo)
├── index.html ⭐ (Modificado)
├── admin.js ⭐ (Modificado)
├── bracket_generator.py
├── requirements.txt
├── categorias_taekwondo.json
├── start_backend.py
├── test_backend.py ⭐ (Modificado)
└── ... (otros archivos)
```

### 🔍 Solución de Problemas

#### Error: ERR_CONNECTION_REFUSED
- ✅ Verifica que el backend esté corriendo en el puerto 5500
- ✅ Verifica que la URL en `config.js` sea correcta
- ✅ Verifica que el backend responda en `/api/health`

#### Error: CORS
- ✅ Asegúrate de que `flask_cors` esté instalado
- ✅ Verifica que `CORS(app)` esté en `bracket_generator.py`

#### Error: 404 Not Found
- ✅ Verifica que las rutas en el backend estén correctas
- ✅ Verifica que el frontend use las URLs correctas

### 📝 Ejemplo de Configuración Completa

1. **Backend en Railway**: `https://mexxus-arena-backend.railway.app`
2. **Frontend en Netlify**: `https://mexxus-arena.netlify.app`
3. **config.js**:
   ```javascript
   production: 'https://mexxus-arena-backend.railway.app'
   ```

### 🆘 Comandos Útiles

```bash
# Probar backend local
python test_backend.py

# Probar backend en producción
python test_backend.py mexxus-arena-backend.railway.app

# Iniciar backend local
python start_backend.py
```

¡Listo! Tu aplicación MEXXUS ARENA estará funcionando en producción. 🥋✨ 