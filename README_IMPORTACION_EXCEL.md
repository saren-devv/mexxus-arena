# Importación de Atletas desde Excel - MEXXUS ARENA

## Descripción

Esta funcionalidad permite importar múltiples atletas desde un archivo Excel (.xlsx, .xls) o CSV directamente a la lista de "Mis Atletas" en MEXXUS ARENA.

## Características

- ✅ **Validación automática** de columnas requeridas
- ✅ **Procesamiento inteligente** de diferentes formatos de fecha
- ✅ **Normalización de datos** (DNI, sexo, etc.)
- ✅ **Vista previa** antes de importar
- ✅ **Detección de duplicados** por DNI
- ✅ **Interfaz intuitiva** con drag & drop
- ✅ **Responsive** para dispositivos móviles

## Columnas Requeridas

El archivo Excel debe contener las siguientes columnas (en cualquier orden):

| Columna Requerida | Variaciones Aceptadas |
|-------------------|----------------------|
| **NOMBRE** | nombre, nombres, name, first_name |
| **APELLIDOS** | apellidos, apellido, last_name, surname |
| **DNI** | dni, documento, identificacion, id, cedula |
| **FECHA DE NACIMIENTO** | fecha de nacimiento, fecha_nacimiento, fecha nacimiento, birth_date, nacimiento, fecha |
| **SEXO** | sexo, genero, gender |

### Columnas Opcionales

El archivo puede contener columnas adicionales que serán ignoradas durante la importación:

- PESO (KG), PESO, WEIGHT
- GRADO, CINTURON, BELT, KUP, DAN
- MODALIDAD, MODALITY
- ACADEMIA, ACADEMY, DELEGACION
- Cualquier otra columna adicional

## Formatos de Fecha Soportados

- DD/MM/YYYY (ej: 15/03/2005)
- DD-MM-YYYY (ej: 15-03-2005)
- YYYY-MM-DD (ej: 2005-03-15)
- DD/MM/YY (ej: 15/03/05)
- DD-MM-YY (ej: 15-03-05)

## Formatos de Sexo Soportados

- **Masculino**: M, MASCULINO, MALE, HOMBRE, H
- **Femenino**: F, FEMENINO, FEMALE, MUJER

## Cómo Usar

### 1. Preparar el Archivo Excel

1. Abre Excel o Google Sheets
2. Crea una tabla con las columnas requeridas
3. Llena los datos de los atletas
4. Guarda como archivo Excel (.xlsx) o CSV

### 2. Importar en MEXXUS ARENA

1. Inicia sesión en tu cuenta de delegación
2. Ve a tu **Perfil de Delegación**
3. En la sección "Mis Atletas", haz clic en **"Agregar Mis Atletas"**
4. En el modal de registro, haz clic en **"IMPORTAR MI BASE DE DATOS"**
5. Arrastra y suelta tu archivo Excel o haz clic para seleccionarlo
6. Revisa la vista previa de los datos
7. Haz clic en **"Importar X Atletas"**

### 3. Verificar la Importación

- Los atletas importados aparecerán en tu lista de "Mis Atletas"
- Se mostrará un resumen con el número de atletas importados
- Los duplicados (mismo DNI) serán omitidos automáticamente

## Validaciones Automáticas

### DNI
- Debe tener exactamente 8 dígitos numéricos
- Se eliminan automáticamente espacios y caracteres especiales
- Se verifica que no exista otro atleta con el mismo DNI

### Fecha de Nacimiento
- Se valida que sea una fecha válida
- Se calcula automáticamente la edad
- Se aceptan múltiples formatos de fecha

### Nombres y Apellidos
- No pueden estar vacíos
- Se eliminan espacios extra al inicio y final

### Sexo
- Debe ser uno de los valores soportados
- Se normaliza a "Masculino" o "Femenino"

## Ejemplo de Archivo Excel

### Formato Básico (Solo columnas requeridas)
| NOMBRE | APELLIDOS | DNI | FECHA DE NACIMIENTO | SEXO |
|--------|-----------|-----|---------------------|------|
| Juan Carlos | Pérez García | 12345678 | 15/03/2005 | M |
| María Elena | Rodríguez López | 87654321 | 22/07/2003 | F |
| Carlos Alberto | Silva Mendoza | 11223344 | 10/12/2004 | Masculino |

### Formato Completo (Con columnas adicionales)
| DNI | NOMBRES | APELLIDOS | FECHA NACIMIENTO | PESO (KG) | GRADO | SEXO | MODALIDAD | ACADEMIA |
|-----|---------|-----------|------------------|-----------|-------|------|-----------|----------|
| 12345678 | Juan Carlos | Pérez García | 15/03/2005 | 65.5 | KUP-8 | M | POOMSAE | Academia A |
| 87654321 | María Elena | Rodríguez López | 22/07/2003 | 58.2 | KUP-6 | F | KYORUGI | Academia B |
| 11223344 | Carlos Alberto | Silva Mendoza | 10/12/2004 | 72.1 | KUP-7 | M | POOMSAE | Academia C |

## Solución de Problemas

### Error: "Columnas faltantes"
- Verifica que tu archivo tenga las columnas requeridas
- Asegúrate de que los nombres de las columnas coincidan con las variaciones aceptadas
- Revisa que no haya espacios extra en los nombres de las columnas
- **Nota importante**: El sistema ahora reconoce "FECHA NACIMIENTO" (sin "DE") como válida para la columna de fecha de nacimiento
- Si el error persiste, revisa la consola del navegador (F12) para ver información detallada del mapeo de columnas

### Error: "Datos incompletos o inválidos"
- Verifica que todas las filas tengan datos en todas las columnas
- Asegúrate de que el DNI tenga 8 dígitos
- Verifica que las fechas estén en un formato válido
- Confirma que el sexo sea uno de los valores aceptados

### Error: "Archivo demasiado grande"
- El tamaño máximo permitido es 5MB
- Considera dividir archivos grandes en múltiples archivos

### No se importan todos los atletas
- Revisa el resumen de importación
- Los duplicados (mismo DNI) se omiten automáticamente
- Las filas con datos inválidos se omiten

## Archivos del Sistema

### Archivo Python (Opcional)
- `excel_analyzer.py`: Analizador independiente para validar archivos Excel
- `requirements.txt`: Dependencias de Python

### Archivos JavaScript
- `app.js`: Lógica principal de importación
- `styles.css`: Estilos de la interfaz de importación

## Notas Técnicas

- La importación se realiza de forma asíncrona
- Se procesan los archivos en el navegador (no se suben al servidor)
- Los datos se validan antes de guardar en Firebase
- Se mantiene la integridad de los datos existentes
- La funcionalidad es compatible con todos los navegadores modernos

## Soporte

Si encuentras problemas con la importación:

1. Verifica que tu archivo Excel tenga el formato correcto
2. Revisa que todas las columnas requeridas estén presentes
3. Asegúrate de que los datos estén en el formato esperado
4. Contacta al administrador del sistema si el problema persiste

---

**Desarrollado por Santiago Alejandro Arones Quintanilla**  
**MEXXUS ARENA - Sistema de Gestión para Eventos Deportivos** 