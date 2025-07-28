# Instrucciones para Limpiar Eventos Duplicados

## 🚨 Problema Identificado
Tienes 4 eventos mostrados cuando solo creaste 2. Esto indica que hay eventos duplicados en la base de datos de Firebase, donde cada evento aparece dos veces: una con imagen y otra sin imagen.

## 🔧 Solución Implementada

He creado una herramienta automática para identificar y limpiar eventos duplicados. La herramienta:

1. **Identifica duplicados** basándose en nombre, fecha y academiaId
2. **Mantiene el mejor evento** (prioriza eventos con imagen)
3. **Elimina duplicados** y sus inscripciones asociadas
4. **Muestra información detallada** en la consola

## 📋 Cómo Usar la Herramienta

### Opción 1: Botón en la Interfaz (Recomendado)
1. Ve al panel de administración
2. Busca el botón **"🧹 Limpiar Duplicados"** en la sección de eventos
3. Haz clic en el botón
4. Confirma la acción cuando aparezca el diálogo

### Opción 2: Consola del Navegador
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console"
3. Ejecuta uno de estos comandos:

```javascript
// Para identificar y limpiar duplicados
limpiarEventosDuplicados()

// Para solo identificar duplicados (sin eliminar)
identificarEventosDuplicados()
```

## 🔍 Qué Hace la Herramienta

### 1. **Identificación de Duplicados**
- Agrupa eventos por nombre, fecha y academiaId
- Identifica grupos con más de 1 evento
- Muestra información detallada en la consola

### 2. **Criterios de Priorización**
La herramienta mantiene el evento que:
1. **Tiene imagen** (prioridad máxima)
2. **Es más reciente** (si ambos tienen o no tienen imagen)

### 3. **Limpieza Automática**
- Elimina eventos duplicados
- Elimina inscripciones asociadas a eventos eliminados
- Mantiene el evento mejor (con imagen)

## 📊 Información que Verás en la Consola

```
🔍 Identificando eventos duplicados...
📊 Total de eventos encontrados: 4
⚠️ Grupo de duplicados encontrado: Nombre del Evento (2 eventos)
🎯 Total de eventos duplicados identificados: 2

📋 EVENTOS DUPLICADOS ENCONTRADOS:
=====================================

🎯 Grupo: Nombre del Evento
   Fecha: 2024-01-15
   Academia: academia123
   Cantidad: 2 eventos
   1. ID: abc123 | Imagen: ✅ | Creado: 2024-01-15T10:30:00.000Z
   2. ID: def456 | Imagen: ❌ | Creado: 2024-01-15T10:35:00.000Z

🧹 Iniciando limpieza de eventos duplicados...
🔄 Procesando grupo: Nombre del Evento
   ✅ Manteniendo: abc123 (con imagen)
   🗑️ Eliminando: def456 (sin imagen)
   🗑️ Eliminada inscripción: inscripcion789

✅ Limpieza completada. 1 eventos duplicados eliminados.
```

## ⚠️ Importante

- **Hacer backup**: Antes de ejecutar la limpieza, considera exportar los datos
- **Verificar**: Revisa la información en la consola antes de confirmar
- **Inscripciones**: Las inscripciones de eventos eliminados también se eliminan
- **Recarga**: La página se recarga automáticamente después de la limpieza

## 🛡️ Seguridad

La herramienta es segura porque:
- Solo elimina eventos que son claramente duplicados
- Mantiene siempre el evento mejor (con imagen)
- Muestra información detallada antes de eliminar
- Requiere confirmación del usuario

## 🔄 Después de la Limpieza

1. La página se recargará automáticamente
2. Solo verás los eventos únicos (sin duplicados)
3. Los eventos mantendrán sus imágenes
4. Las inscripciones se mantendrán asociadas a los eventos correctos

## 📞 Si Necesitas Ayuda

Si tienes problemas o dudas:
1. Revisa la consola del navegador para ver los logs
2. Verifica que los eventos duplicados se identificaron correctamente
3. Si algo sale mal, puedes restaurar desde el backup de Firebase

## 🎯 Resultado Esperado

Después de ejecutar la limpieza:
- ✅ Solo verás 2 eventos (los que realmente creaste)
- ✅ Cada evento tendrá su imagen
- ✅ No habrá duplicados
- ✅ Las inscripciones estarán correctamente asociadas 