# DOCUMENTACIÓN DEL PROYECTO MEXXUS ARENA

## ARCHIVOS PRINCIPALES DE LA APLICACIÓN

### index.html
**FUNCIÓN:** Página principal de la aplicación web que contiene toda la estructura HTML, incluyendo el header con navegación, la sección de eventos públicos, modales de autenticación y registro, y el dashboard para usuarios autenticados.

**IMPORTANCIA:** Es el punto de entrada principal de la aplicación. Contiene toda la interfaz de usuario y estructura base que permite la navegación entre diferentes secciones del sistema.

### app.js
**FUNCIÓN:** Archivo principal que inicializa toda la aplicación, coordina todos los managers (autenticación, eventos, dashboard, admin), maneja eventos globales, proporciona utilidades comunes y gestiona la importación masiva de atletas desde archivos Excel.

**IMPORTANCIA:** Es el núcleo de la aplicación que orquesta todos los componentes. Sin este archivo, la aplicación no podría funcionar correctamente ya que es responsable de la inicialización, coordinación de todos los módulos y la nueva funcionalidad de importación de atletas.

### auth.js
**FUNCIÓN:** Sistema completo de autenticación con Firebase que maneja el registro de delegaciones, inicio de sesión, gestión de usuarios, y control de acceso basado en roles (admin/academia).

**IMPORTANCIA:** Es fundamental para la seguridad de la aplicación. Gestiona toda la autenticación de usuarios y determina qué funcionalidades puede acceder cada tipo de usuario.

### events.js
**FUNCIÓN:** Gestor completo de eventos deportivos que permite crear, editar, eliminar eventos, gestionar inscripciones de participantes, y manejar toda la lógica relacionada con los eventos de taekwondo.

**IMPORTANCIA:** Es el corazón del sistema de gestión de eventos. Permite a los administradores crear y gestionar competencias, y a las academias inscribir participantes en los eventos.

### dashboard.js
**FUNCIÓN:** Panel de control para las academias registradas donde pueden ver eventos disponibles, gestionar sus inscripciones, ver estadísticas de participación y administrar su perfil.

**IMPORTANCIA:** Proporciona a las academias una interfaz intuitiva para gestionar su participación en eventos y mantener su información actualizada.

### admin.js
**FUNCIÓN:** Panel de administración completo que permite a los administradores gestionar todos los eventos, ver inscripciones, administrar academias, exportar datos y configurar el sistema.

**IMPORTANCIA:** Es la herramienta principal para los administradores del sistema, permitiendo el control total sobre eventos, usuarios y datos del sistema.

### public-events.js
**FUNCIÓN:** Gestor de eventos públicos que muestra en la página principal los eventos próximos para visitantes no autenticados, con información básica y llamadas a la acción para registro.

**IMPORTANCIA:** Es la cara pública de la aplicación que atrae a nuevas academias y muestra la actividad del sistema a visitantes.

### firebase-config.js
**FUNCIÓN:** Configuración y inicialización de Firebase (autenticación, base de datos Firestore, almacenamiento) que proporciona la infraestructura backend para toda la aplicación.

**IMPORTANCIA:** Es esencial para el funcionamiento de la aplicación ya que proporciona toda la infraestructura de base de datos y autenticación en la nube.

### styles.css
**FUNCIÓN:** Archivo de estilos CSS completo que define todo el diseño visual de la aplicación, incluyendo responsive design, animaciones, la identidad visual deportiva de MEXXUS ARENA y los estilos para la funcionalidad de importación de Excel.

**IMPORTANCIA:** Define la experiencia visual y de usuario de toda la aplicación. Sin este archivo, la aplicación no tendría estilos y sería completamente funcional pero visualmente inutilizable. Incluye los estilos para la nueva funcionalidad de importación masiva.

## ARCHIVOS DE CONFIGURACIÓN Y DATOS

### package.json
**FUNCIÓN:** Archivo de configuración del proyecto Node.js que define las dependencias (xlsx para exportación e importación de datos) y metadatos del proyecto.

**IMPORTANCIA:** Es necesario para la gestión de dependencias y para que otros desarrolladores puedan instalar las librerías necesarias.

### excel_analyzer.py
**FUNCIÓN:** Analizador independiente de archivos Excel que valida y procesa datos de atletas para importación masiva. Incluye validación de columnas, procesamiento de fechas y normalización de datos.

**IMPORTANCIA:** Proporciona una herramienta adicional para validar archivos Excel antes de la importación, útil para debugging y procesamiento de datos complejos.

### requirements.txt
**FUNCIÓN:** Archivo de dependencias de Python para el analizador de Excel, incluyendo pandas, openpyxl y xlrd.

**IMPORTANCIA:** Permite instalar las dependencias necesarias para ejecutar el analizador de Excel de forma independiente.

### ejemplo_atletas.csv
**FUNCIÓN:** Archivo de ejemplo con datos de atletas que sirve como plantilla para que los usuarios puedan crear sus propios archivos de importación.

**IMPORTANCIA:** Facilita a los usuarios la creación de archivos Excel correctamente formateados para la importación masiva de atletas.

### README_IMPORTACION_EXCEL.md
**FUNCIÓN:** Documentación completa de la funcionalidad de importación de atletas desde Excel, incluyendo guías de uso, formatos soportados y solución de problemas.

**IMPORTANCIA:** Proporciona a los usuarios una guía detallada para utilizar la nueva funcionalidad de importación masiva de atletas.

### taekwondo_categories.json
**FUNCIÓN:** Archivo de configuración completo que define modalidades (kyorugi/poomsae), categorías de peso, niveles de cinturón y toda la estructura organizativa del taekwondo.

**IMPORTANCIA:** Proporciona toda la lógica de clasificación y organización de competencias, siendo fundamental para la correcta categorización de participantes.

### toast.json
**FUNCIÓN:** Configuración de notificaciones toast que define los estilos, iconos y mensajes para diferentes tipos de notificaciones (éxito, error, advertencia, información).

**IMPORTANCIA:** Mejora la experiencia de usuario proporcionando feedback visual inmediato sobre las acciones realizadas en la aplicación.

### parametros de creacion de evento.txt
**FUNCIÓN:** Documento de referencia que lista los parámetros necesarios para crear un evento en el sistema.

**IMPORTANCIA:** Sirve como guía de desarrollo y documentación para entender qué campos son requeridos al crear eventos.

## ARCHIVOS DE IMAGEN Y RECURSOS

### mexxus_arena_logo.png
**FUNCIÓN:** Logo principal de MEXXUS ARENA que se muestra en el header y footer de la aplicación.

**IMPORTANCIA:** Es la identidad visual principal de la marca y se utiliza en toda la aplicación para mantener consistencia visual.

### logo 2025.png, logo 2025 2.png, logo 2025 4.png, logo 2025 5.png
**FUNCIÓN:** Variaciones del logo para diferentes contextos y tamaños de pantalla.

**IMPORTANCIA:** Permiten adaptar la identidad visual a diferentes dispositivos y contextos de uso.

### logos/mexxus_arena_footer.png
**FUNCIÓN:** Logo específico para el footer de la aplicación.

**IMPORTANCIA:** Mantiene la identidad visual en la parte inferior de la aplicación.

### a2.png
**FUNCIÓN:** Favicon de la aplicación que aparece en la pestaña del navegador.

**IMPORTANCIA:** Proporciona identidad visual en el navegador y ayuda a los usuarios a identificar la aplicación.

### icon.png
**FUNCIÓN:** Icono para dispositivos móviles (apple-touch-icon) que aparece cuando se añade la aplicación a la pantalla de inicio.

**IMPORTANCIA:** Mejora la experiencia en dispositivos móviles y permite que la aplicación se comporte como una app nativa.

## ARCHIVOS DE DOCUMENTACIÓN

### readme.md
**FUNCIÓN:** Archivo de documentación principal del proyecto (actualmente vacío).

**IMPORTANCIA:** Debería contener información sobre instalación, uso y desarrollo del proyecto para otros desarrolladores.

### DOCUMENTACION_PROYECTO.md
**FUNCIÓN:** Este archivo que documenta la estructura y propósito de todos los archivos del proyecto.

**IMPORTANCIA:** Proporciona una guía completa para entender la arquitectura y funcionamiento del sistema MEXXUS ARENA.

---

## RESUMEN DE LA ARQUITECTURA

MEXXUS ARENA es una aplicación web completa para la gestión de eventos deportivos de taekwondo que utiliza:

- **Frontend:** HTML5, CSS3, JavaScript vanilla
- **Backend:** Firebase (Autenticación, Firestore, Storage)
- **Arquitectura:** Modular con managers especializados
- **Usuarios:** Administradores y Academias/Delegaciones
- **Funcionalidad:** Gestión completa de eventos, inscripciones y participantes

La aplicación está diseñada para ser escalable, mantenible y proporcionar una excelente experiencia de usuario tanto para administradores como para academias participantes. 