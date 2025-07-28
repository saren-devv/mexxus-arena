# MEXXUS ARENA - Sistema de Gestión de Eventos Deportivos

## Descripción

MEXXUS ARENA es un sistema de gestión integral para organizadores de eventos deportivos de alto nivel. La aplicación permite a los organizadores gestionar eventos, competencias, inscribir participantes y administrar toda la logística de eventos deportivos.

## Características Principales

### 🏆 Gestión de Eventos

- Creación y administración de eventos deportivos
- Gestión de competencias y categorías
- Sistema de inscripciones de participantes
- Control de aforo y capacidad

### 👥 Gestión de Organizadores

- Registro y autenticación de organizadores
- Panel de administración personalizado
- Gestión de permisos y roles

### 📊 Sistema de Reportes

- Reportes de inscripciones
- Estadísticas de eventos
- Exportación de datos

### 🎨 Interfaz Moderna

- Diseño responsivo y moderno
- Paleta de colores profesional
- Experiencia de usuario optimizada

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Base de Datos**: Firestore (NoSQL)
- **Autenticación**: Firebase Auth
- **Hosting**: Firebase Hosting / Netlify

## Estructura del Proyecto

```
mexxus-arena-beta1.1/
├── deploy/                 # Carpeta para deployment
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos principales
│   ├── app.js            # Lógica principal de la aplicación
│   ├── auth.js           # Sistema de autenticación
│   ├── events.js         # Gestión de eventos
│   ├── admin.js          # Panel de administración
│   ├── public-events.js  # Eventos públicos
│   ├── firebase-config.js # Configuración de Firebase
│   ├── img/              # Imágenes del proyecto
│   └── logos/            # Logos de la marca
├── src/                   # Código fuente adicional
├── img/                   # Imágenes del proyecto principal
├── logos/                 # Logos de la marca
└── docs/                  # Documentación del proyecto
```

## Instalación y Configuración

### Prerrequisitos

- Node.js (opcional, para desarrollo local)
- Cuenta de Firebase
- Editor de código (VS Code recomendado)

### Pasos de Instalación

1. **Clonar el repositorio**

   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd mexxus-arena-beta1.1
   ```
2. **Configurar Firebase**

   - Crear un proyecto en Firebase Console
   - Habilitar Authentication y Firestore
   - Copiar la configuración a `firebase-config.js`
3. **Configurar reglas de Firestore**

   - Aplicar las reglas de seguridad en `firestore-rules.txt`
4. **Deployment**

   - Para Firebase Hosting: usar la carpeta `deploy/`
   - Para Netlify: usar la carpeta `deploy/` como directorio de build

## Deployment

### Firebase Hosting

```bash
firebase init hosting
firebase deploy
```

### Netlify

1. Conectar el repositorio a Netlify
2. Configurar el directorio de build como `deploy/`
3. Configurar el comando de build (opcional)

## Configuración de CORS

El proyecto incluye configuración de CORS para permitir el acceso desde diferentes dominios. Ver archivo `CONFIGURAR_CORS.md` para más detalles.

## Documentación

- `DOCUMENTACION_PROYECTO.md` - Documentación general del proyecto
- `MEXXUS_ARENA_BETA_1.1_DOCUMENTACION_COMPLETA.md` - Documentación completa
- `ANALISIS_VISUAL_MEXXUS_ARENA.md` - Análisis visual y UX

## Versión Actual

**Beta 1.1** - Sistema completo de gestión de eventos deportivos

## Contribución

Este proyecto está diseñado específicamente para organizadores de eventos deportivos. Para contribuciones, contactar al equipo de desarrollo.

## Licencia

Proyecto privado - Todos los derechos reservados

---

**MEXXUS ARENA** - Transformando la gestión de eventos deportivos
