# MEXXUS ARENA - Backend Setup

Este documento explica cómo configurar y ejecutar el backend de Python para la generación de brackets de MEXXUS ARENA.

## 📋 Requisitos

- Python 3.7 o superior
- pip (gestor de paquetes de Python)

## 🚀 Instalación Rápida

### Opción 1: Script Automático (Recomendado)
```bash
python start_backend.py
```

Este script automáticamente:
- Verifica las dependencias
- Instala paquetes faltantes
- Inicia el servidor

### Opción 2: Instalación Manual
```bash
# Instalar dependencias
pip install -r requirements.txt

# Ejecutar el servidor
python bracket_generator.py
```

## 📦 Dependencias

El sistema requiere los siguientes paquetes Python:

- **pandas**: Procesamiento de datos Excel
- **openpyxl**: Lectura de archivos Excel
- **flask**: Servidor web backend
- **flask-cors**: Manejo de CORS para APIs
- **reportlab**: Generación de PDFs
- **pillow**: Procesamiento de imágenes
- **opencv-python**: Detección de posiciones en brackets
- **numpy**: Operaciones matemáticas

## 🏗️ Estructura del Proyecto

```
mexxus_arena_actual/
├── bracket_generator.py        # Servidor Flask principal
├── start_backend.py           # Script de inicio
├── requirements.txt           # Dependencias Python
├── categorias_taekwondo.json  # Configuración de categorías
├── bracket_templates/         # Plantillas de brackets (PNG)
├── fonts/                     # Fuentes para brackets
├── uploads/                   # Archivos temporales
└── results/                   # Archivos generados
```

## 🔧 Configuración

### Categorías de Taekwondo
Las categorías se definen en `categorias_taekwondo.json`:

```json
{
  "INFANTIL A": {
    "EDAD": [7, 8],
    "SEXO": {
      "FEMENINO": ["-19", "-23", "-27", "-31", "+31"],
      "MASCULINO": ["-19", "-23", "-27", "-31", "+31"]
    }
  }
}
```

### Plantillas de Brackets
- Coloca archivos PNG en `bracket_templates/`
- Nombres: `2.png`, `3.png`, `4.png`, etc.
- Cada archivo corresponde al número de participantes

### Fuentes
- Coloca archivos TTF en `fonts/`
- `Anton-Regular.ttf`: Para títulos de categorías
- `Roboto-VariableFont_wdth,wght.ttf`: Para nombres de participantes

## 🌐 API Endpoints

### POST /api/generate-brackets
Genera brackets desde un archivo Excel.

**Parámetros:**
- `participants`: Archivo Excel (.xls, .xlsx)
- `eventoId`: ID del evento

**Respuesta:**
```json
{
  "status": "success",
  "total_participantes": 150,
  "total_categorias": 25,
  "files": {
    "pdf_brackets": "BRACKETS_VERTICALES_1234567890.pdf",
    "excel_categorias": "TODAS_LAS_CATEGORIAS.xlsx",
    "excel_solos": "SOLOS.xlsx"
  }
}
```

### GET /api/download/{filename}
Descarga archivos generados.

### GET /api/health
Verificación del estado del servidor.

## 📊 Formato del Excel de Entrada

El archivo Excel debe contener las siguientes columnas:

| Columna | Requerida | Descripción |
|---------|-----------|-------------|
| NOMBRES | ✅ | Nombres del participante |
| APELLIDOS | ✅ | Apellidos del participante |
| FECHA_NACIMIENTO | ✅ | Fecha de nacimiento (DD/MM/YYYY) |
| PESO | ✅ | Peso en kilogramos |
| SEXO | ✅ | Masculino/Femenino |
| NIVEL | ✅ | Grado KUP/DAN |
| ACADEMIA | ⚪ | Nombre de la academia/delegación |

## 🏃‍♂️ Ejecución

1. **Iniciar el backend:**
   ```bash
   python start_backend.py
   ```

2. **Verificar que está funcionando:**
   - Abrir: http://localhost:5000/api/health
   - Debe mostrar: `{"status": "ok", "message": "MEXXUS ARENA Bracket Generator is running"}`

3. **Usar desde el frontend:**
   - Abrir MEXXUS ARENA en el navegador
   - Ir a Admin → Evento → Llaves de Combate
   - Arrastrar archivo Excel o hacer clic para seleccionar
   - Los brackets se generarán automáticamente

## 🐛 Resolución de Problemas

### Error: "No se pudo conectar al servidor"
- Verificar que el backend esté ejecutándose
- Comprobar que el puerto 5000 esté disponible
- Revisar la consola por errores

### Error: "Missing dependencies"
- Ejecutar: `pip install -r requirements.txt`
- En Windows: `pip install opencv-python-headless` si OpenCV da problemas

### Error: "No template for X participants"
- Agregar plantillas PNG en `bracket_templates/`
- Nombres de archivo: número de participantes + `.png`

### Error: "Font loading failed"
- Verificar que las fuentes estén en `fonts/`
- El sistema usará fuentes del sistema como fallback

## 📈 Rendimiento

- **Tiempo de procesamiento**: ~2-5 segundos por 100 participantes
- **Memoria requerida**: ~100MB para archivos grandes
- **Concurrencia**: Soporta múltiples solicitudes simultáneas

## 🔒 Seguridad

- Validación de tipos de archivo (.xls, .xlsx únicamente)
- Nombres de archivo seguros (secure_filename)
- Limpieza automática de archivos temporales
- CORS configurado para desarrollo local

## 📝 Logs

Los logs se muestran en la consola del servidor:
- `INFO`: Operaciones normales
- `WARNING`: Advertencias no críticas
- `ERROR`: Errores que requieren atención

---

Para soporte adicional, contactar al desarrollador: **Santiago Alejandro Arones Quintanilla** 