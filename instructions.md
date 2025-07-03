# 🥋 MEXXUS ARENA - Guía de Instalación de Generador de Brackets

## 📋 Resumen
Se ha implementado un sistema completo de generación de brackets que toma archivos Excel con participantes y genera automáticamente:
- PDF con todos los brackets de torneo
- Excel con categorías organizadas 
- Excel con participantes solos
- Imágenes individuales de cada bracket

## 🚀 Instalación Rápida

### 1. Iniciar el Backend
```bash
# Opción 1: Script automático (recomendado)
python start_backend.py

# Opción 2: Manual
pip install -r requirements.txt
python bracket_generator.py
```

### 2. Verificar que funciona
- Abrir: http://localhost:5000/api/health
- O ejecutar: `python test_backend.py`

### 3. Usar en MEXXUS ARENA
1. Abrir el navegador en la aplicación web
2. Ir a **Admin Panel** → **Evento** → **Llaves de Combate**
3. Arrastrar archivo Excel o hacer clic para seleccionar
4. ¡Los brackets se generan automáticamente!

## 📊 Formato del Excel

Tu archivo Excel debe tener estas columnas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| NOMBRES | Nombres del participante | Juan Carlos |
| APELLIDOS | Apellidos del participante | Pérez García |
| FECHA_NACIMIENTO | Fecha DD/MM/YYYY | 15/03/2010 |
| PESO | Peso en kilogramos | 45.5 |
| SEXO | Masculino/Femenino/M/F | Masculino |
| NIVEL | Grado KUP/DAN | 5º KUP |
| ACADEMIA | Nombre academia (opcional) | TAEKWONDO CHAMPIONS |

## ✨ Características

### 🎯 Procesamiento Inteligente
- Calcula automáticamente la edad de los participantes
- Clasifica por categorías de edad oficial (PRE INFANTIL, INFANTIL A/B/C, CADETE, JUVENIL, MAYORES)
- Agrupa por peso según categorías reglamentarias
- Separa por sexo y nivel (Festival, Noveles, Avanzados)

### 🖼️ Generación de Brackets
- Usa plantillas PNG profesionales para 2-7 participantes
- Detecta automáticamente posiciones libres en las plantillas
- Aplica fuentes personalizadas (Anton para títulos, Roboto para nombres)
- Incluye abreviaturas de academias en los nombres

### 📄 Archivos Generados
1. **PDF Vertical**: Todos los brackets en un solo archivo A4
2. **Excel Categorías**: Hoja separada por cada categoría
3. **Excel Solos**: Participantes sin competencia (categorías de 1 persona)
4. **Imágenes JPG**: Bracket individual por categoría

## 🛠️ Resolución de Problemas

### ❌ "No se pudo conectar al servidor"
```bash
# Verificar que el backend esté corriendo
python test_backend.py

# Si no está corriendo, iniciarlo
python start_backend.py
```

### ❌ "Missing dependencies" 
```bash
pip install -r requirements.txt
```

### ❌ "No template for X participants"
- El sistema incluye plantillas para 2-7 participantes
- Para más participantes, agregar archivos PNG en `bracket_templates/`
- Nombrar como: `8.png`, `9.png`, etc.

### ❌ "Font loading failed"
- Las fuentes están en la carpeta `fonts/`
- El sistema usa fuentes del sistema como respaldo

## 🎨 Personalización

### Agregar Nuevas Plantillas
1. Crear imagen PNG del bracket vacío
2. Guardar en `bracket_templates/` como `{numero_participantes}.png`
3. El sistema detectará automáticamente las posiciones

### Modificar Categorías
Editar `categorias_taekwondo.json`:
```json
{
  "NUEVA_CATEGORIA": {
    "EDAD": [15, 17],
    "SEXO": {
      "FEMENINO": ["-45", "-50", "+50"],
      "MASCULINO": ["-50", "-55", "+55"]
    }
  }
}
```

## 📈 Flujo Completo

1. **Usuario arrastra Excel** → Frontend (drag & drop)
2. **Archivo enviado** → Backend Python (Flask API)
3. **Procesamiento** → AgrupadorTaekwondo (clasificación)
4. **Generación** → BracketGenerator (imágenes + PDF)
5. **Descarga automática** → Usuario recibe archivos

## 🔧 Arquitectura Técnica

- **Frontend**: JavaScript (drag & drop interface)
- **Backend**: Python Flask (API REST)
- **Procesamiento**: Pandas (Excel) + OpenCV (detección de posiciones)
- **Generación**: Pillow (imágenes) + ReportLab (PDF)
- **Comunicación**: CORS habilitado para desarrollo local

---

## 🎉 ¡Listo para usar!

El sistema está completamente integrado con MEXXUS ARENA. Solo necesitas:
1. ✅ Iniciar el backend Python
2. ✅ Abrir la aplicación web 
3. ✅ Ir a Admin → Llaves de Combate
4. ✅ Arrastrar tu archivo Excel
5. ✅ ¡Disfrutar tus brackets automáticos!

Para soporte: **Santiago Alejandro Arones Quintanilla** 