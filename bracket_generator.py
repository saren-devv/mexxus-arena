#!/usr/bin/env python3
"""
MEXXUS ARENA - Bracket Generator Backend
=======================================

Flask backend for generating tournament brackets from Excel files.
Integrates with the existing MEXXUS ARENA web application.

Autor: Santiago Alejandro Arones Quintanilla
Fecha: 2024
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import pandas as pd
import json
import tempfile
import shutil
from pathlib import Path
import time
import logging
from werkzeug.utils import secure_filename
import numpy as np
from datetime import datetime, date
import re
import cv2
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.secret_key = 'mexxus-arena-secret-key'

# Configuration
UPLOAD_FOLDER = os.path.abspath('uploads')
BRACKET_TEMPLATES_FOLDER = os.path.abspath('bracket_templates')
FONTS_FOLDER = os.path.abspath('fonts')
RESULTS_FOLDER = os.path.abspath('results')
ALLOWED_EXTENSIONS = {'xls', 'xlsx'}

# Create necessary directories
for folder in [UPLOAD_FOLDER, BRACKET_TEMPLATES_FOLDER, FONTS_FOLDER, RESULTS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class AgrupadorTaekwondo:
    """Clase principal para agrupar participantes de taekwondo según criterios oficiales."""
    
    def __init__(self, archivo_categorias="categorias_taekwondo.json"):
        """Inicializa el agrupador con las categorías de taekwondo."""
        try:
            with open(archivo_categorias, 'r', encoding='utf-8') as f:
                self.categorias = json.load(f)
        except Exception as e:
            logger.error(f"Error al cargar categorías: {e}")
            # Default categories if file not found
            self.categorias = self._get_default_categories()
        
        self.mapeo_niveles = {
            "10": "Festival", "9": "Festival", "8": "Festival", "7": "Festival",
            "6": "Noveles", "5": "Noveles", "4": "Noveles", "3": "Noveles",
            "2": "Avanzados", "1": "Avanzados"
        }
    
    def _get_default_categories(self):
        """Return default taekwondo categories if JSON file is not found."""
        return {
            "PRE INFANTIL": {"EDAD": [5, 6], "PESOS": ["-24", "+24"]},
            "INFANTIL A": {"EDAD": [7, 8], "PESOS": ["-19", "-23", "-27", "-31", "+31"]},
            "INFANTIL B": {"EDAD": [9, 10], "PESOS": ["-25", "-30", "-35", "+35"]},
            "INFANTIL C": {"EDAD": [11, 12], "PESOS": ["-30", "-35", "-40", "-45", "+45"]},
            "CADETE": {"EDAD": [13, 14], "PESOS": ["-33", "-37", "-41", "-45", "-49", "-53", "-57", "-61", "-65", "+65"]},
            "JUVENIL": {"EDAD": [15, 17], "PESOS": ["-45", "-48", "-51", "-55", "-59", "-63", "-68", "-73", "-78", "+78"]},
            "MAYORES": {"EDAD": [18, 50], "PESOS": ["-53", "-58", "-63", "-68", "-74", "-80", "-87", "+87"]}
        }
    
    def calcular_edad(self, fecha_nacimiento):
        """Calcula la edad actual basada en la fecha de nacimiento."""
        if pd.isna(fecha_nacimiento):
            return None
            
        try:
            if isinstance(fecha_nacimiento, str):
                formatos = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']
                for formato in formatos:
                    try:
                        fecha_nacimiento = datetime.strptime(fecha_nacimiento, formato)
                        break
                    except ValueError:
                        continue
                else:
                    return None
            
            if isinstance(fecha_nacimiento, datetime):
                fecha_nacimiento = fecha_nacimiento.date()
            elif hasattr(fecha_nacimiento, 'date'):
                fecha_nacimiento = fecha_nacimiento.date()
            
            hoy = date.today()
            edad = hoy.year - fecha_nacimiento.year
            
            if (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day):
                edad -= 1
                
            return edad
            
        except Exception:
            return None
    
    def normalizar_kup_dan(self, kup_dan):
        """Normaliza el valor KUP/DAN a un formato estándar."""
        if pd.isna(kup_dan):
            return "Festival"
            
        kup_dan_str = str(kup_dan).upper().strip()
        
        if 'DAN' in kup_dan_str:
            return "Avanzados"
        
        numeros = re.findall(r'\d+', kup_dan_str)
        if numeros:
            numero = numeros[0]
            return self.mapeo_niveles.get(numero, "Festival")
        
        return "Festival"
    
    def normalizar_sexo(self, sexo):
        """Normaliza el sexo a formato estándar."""
        if pd.isna(sexo):
            return None
            
        sexo_str = str(sexo).upper().strip()
        
        if sexo_str in ['M', 'MASCULINO', 'MALE', 'HOMBRE']:
            return "MASCULINO"
        elif sexo_str in ['F', 'FEMENINO', 'FEMALE', 'MUJER']:
            return "FEMENINO"
        
        return None
    
    def determinar_categoria_edad(self, edad):
        """Determina la categoría de edad según los criterios."""
        if edad is None:
            return None
            
        for categoria, criterios in self.categorias.items():
            edad_min, edad_max = criterios['EDAD']
            if edad_min <= edad <= edad_max:
                return categoria
        
        return None
    
    def determinar_categoria_peso(self, peso, categoria_edad, sexo):
        """Determina la categoría de peso según los criterios."""
        if peso is None or categoria_edad is None or sexo is None:
            return None
            
        try:
            peso = float(peso)
        except:
            return None
        
        criterios = self.categorias[categoria_edad]
        
        if isinstance(criterios.get('PESOS'), list):
            rangos_peso = criterios['PESOS']
        elif isinstance(criterios.get('SEXO'), dict) and sexo in criterios['SEXO']:
            rangos_peso = criterios['SEXO'][sexo]
        else:
            return None
        
        for categoria_peso in rangos_peso:
            if categoria_peso.startswith('+'):
                peso_min = float(categoria_peso[1:])
                if peso >= peso_min:
                    return categoria_peso
            elif categoria_peso.startswith('-'):
                peso_max = float(categoria_peso[1:])
                if peso <= peso_max:
                    return categoria_peso
        
        return None
    
    def generar_nombre_categoria(self, categoria_edad, sexo, nivel, peso):
        """Genera el nombre completo de la categoría."""
        if not all([categoria_edad, sexo, nivel, peso]):
            return None
        
        return f"{nivel} {categoria_edad} {sexo} {peso}"
    
    def procesar_participantes(self, archivo_excel):
        """Procesa participantes desde un archivo Excel."""
        try:
            df = pd.read_excel(archivo_excel)
            
            # Normalizar nombres de columnas
            df.columns = df.columns.str.upper().str.strip()
            
            # Mapear columnas comunes
            column_mapping = {
                'NOMBRES': ['NOMBRE', 'NOMBRES', 'NAME'],
                'APELLIDOS': ['APELLIDO', 'APELLIDOS', 'SURNAME'],
                'FECHA_NACIMIENTO': ['FECHA DE NACIMIENTO', 'FECHA_NACIMIENTO', 'BIRTHDATE'],
                'PESO': ['PESO', 'WEIGHT'],
                'SEXO': ['SEXO', 'GENERO', 'GENDER'],
                'NIVEL': ['NIVEL', 'KUP', 'DAN', 'GRADO'],
                'ACADEMIA': ['ACADEMIA', 'DELEGACION', 'CLUB']
            }
            
            # Encontrar columnas correctas
            for col_standard, col_variants in column_mapping.items():
                for variant in col_variants:
                    if variant in df.columns:
                        if col_standard != variant:
                            df[col_standard] = df[variant]
                        break
            
            # Procesar cada participante
            df['edad'] = df['FECHA_NACIMIENTO'].apply(self.calcular_edad)
            df['categoria_edad'] = df['edad'].apply(self.determinar_categoria_edad)
            df['sexo_normalizado'] = df['SEXO'].apply(self.normalizar_sexo)
            df['nivel_normalizado'] = df['NIVEL'].apply(self.normalizar_kup_dan)
            
            # Determinar categoría de peso
            df['categoria_peso'] = df.apply(
                lambda row: self.determinar_categoria_peso(
                    row['PESO'], row['categoria_edad'], row['sexo_normalizado']
                ), axis=1
            )
            
            # Filtrar participantes válidos
            df_validos = df.dropna(subset=['categoria_edad', 'sexo_normalizado', 'categoria_peso'])
            
            # Generar abreviatura si no existe
            if 'ACADEMIA' in df_validos.columns:
                df_validos['abreviatura'] = df_validos['ACADEMIA'].apply(
                    lambda x: ''.join([word[0].upper() for word in str(x).split()[:3]] if pd.notna(x) else ['UNK'])
                )
            else:
                df_validos['abreviatura'] = 'UNK'
            
            return df_validos
            
        except Exception as e:
            logger.error(f"Error procesando participantes: {e}")
            raise


class BracketGenerator:
    """Clase para generar brackets de tournament."""
    
    def __init__(self):
        self.template_folder = BRACKET_TEMPLATES_FOLDER
        self.fonts_folder = FONTS_FOLDER
    
    def load_font(self, font_category='names', size=20):
        """Carga una fuente para usar en los brackets."""
        try:
            font_configs = {
                'category': {'size': 48, 'file': 'Anton-Regular.ttf'},
                'names': {'size': size, 'file': 'Roboto-VariableFont_wdth,wght.ttf'}
            }
            
            config = font_configs.get(font_category, font_configs['names'])
            font_path = os.path.join(self.fonts_folder, config['file'])
            
            if os.path.exists(font_path):
                return ImageFont.truetype(font_path, config['size'])
            else:
                # Try system fonts as fallback
                system_fonts = [
                    'arial.ttf', 'Arial.ttf', 'segoeui.ttf',
                    'Helvetica.ttc', 'DejaVuSans.ttf'
                ]
                for font_name in system_fonts:
                    try:
                        return ImageFont.truetype(font_name, config['size'])
                    except:
                        continue
                
                return ImageFont.load_default()
        except Exception as e:
            logger.warning(f"Error loading font: {e}")
            return ImageFont.load_default()
    
    def detect_positions(self, image_path):
        """Detecta posiciones libres en la plantilla del bracket."""
        try:
            img = cv2.imread(image_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
            
            edges = cv2.Canny(binary, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=30, minLineLength=20, maxLineGap=5)
            
            centers = []
            if lines is not None:
                for x1, y1, x2, y2 in lines[:,0]:
                    if abs(y1 - y2) > 10 or abs(x2 - x1) < 10:
                        continue
                    centers.append(((x1+x2)//2, (y1+y2)//2))
            
            centers.sort(key=lambda c: c[1])
            
            # Merge nearby centers
            merged = []
            for cx, cy in centers:
                if not any(abs(cy-mcy)<10 and abs(cx-mcx)<10 for mcx,mcy in merged):
                    merged.append((cx, cy))
            
            return merged[:20]  # Limit to reasonable number of positions
            
        except Exception as e:
            logger.error(f"Error detecting positions: {e}")
            return []
    
    def mark_positions(self, image_path, participants, output_path, category_name=None):
        """Marca las posiciones en el bracket con los nombres de participantes."""
        try:
            img = Image.open(image_path)
            draw = ImageDraw.Draw(img)
            
            # Load fonts
            name_font = self.load_font('names', 20)
            category_font = self.load_font('category', 48)
            
            # Detect positions
            positions = self.detect_positions(image_path)
            
            # Add category name at the top if provided
            if category_name:
                img_width = img.size[0]
                # Draw category name at top center
                bbox = draw.textbbox((0, 0), category_name, font=category_font)
                text_width = bbox[2] - bbox[0]
                x = (img_width - text_width) // 2
                draw.text((x, 30), category_name, fill='black', font=category_font)
            
            # Add participant names
            for i, participant in enumerate(participants):
                if i >= len(positions):
                    break
                
                x, y = positions[i]
                
                # Adjust position slightly
                x = max(50, min(x, img.size[0] - 200))
                y = max(50, min(y, img.size[1] - 50))
                
                # Draw participant name
                draw.text((x, y), participant, fill='black', font=name_font)
            
            # Save the image
            img.save(output_path, 'JPEG', quality=95)
            logger.info(f"Bracket saved: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error marking positions: {e}")
            return False


class MexxusArenaProcessor:
    """Procesador principal para MEXXUS ARENA."""
    
    def __init__(self):
        self.agrupador = AgrupadorTaekwondo()
        self.bracket_generator = BracketGenerator()
    
    def process_excel_file(self, file_path, output_dir):
        """Procesa un archivo Excel y genera todos los brackets."""
        try:
            # 1. Procesar participantes
            df = self.agrupador.procesar_participantes(file_path)
            if df is None or len(df) == 0:
                raise Exception("No se encontraron participantes válidos")
            
            # 2. Generar categorías completas
            df['categoria_completa'] = df.apply(
                lambda row: self.agrupador.generar_nombre_categoria(
                    row['categoria_edad'],
                    row['sexo_normalizado'], 
                    row['nivel_normalizado'],
                    row['categoria_peso']
                ), axis=1
            )
            
            # 3. Crear Excel único con categorías
            excel_path = self.export_categories_to_excel(df, output_dir)
            
            # 4. Generar brackets
            bracket_images = self.generate_all_brackets(df, output_dir)
            
            # 5. Crear PDF
            pdf_path = self.create_pdf_from_brackets(bracket_images, output_dir)
            
            # 6. Crear Excel de solos
            solos_excel = self.export_solos_to_excel(df, output_dir)
            
            return {
                'excel_categorias': excel_path,
                'excel_solos': solos_excel,
                'pdf_brackets': pdf_path,
                'imagenes_brackets': bracket_images,
                'total_participantes': len(df),
                'total_categorias': df['categoria_completa'].nunique()
            }
            
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            raise
    
    def export_categories_to_excel(self, df, output_dir):
        """Exporta categorías a un Excel único con múltiples hojas."""
        try:
            excel_path = os.path.join(output_dir, 'TODAS_LAS_CATEGORIAS.xlsx')
            
            with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
                grupos = df.groupby('categoria_completa')
                
                for categoria, grupo in grupos:
                    # Limpiar nombre de hoja
                    sheet_name = re.sub(r'[^\w\s-]', '', categoria)[:31]
                    
                    # Seleccionar columnas para exportar
                    export_df = grupo[['NOMBRES', 'APELLIDOS', 'edad', 'PESO', 'nivel_normalizado', 'sexo_normalizado', 'abreviatura']].copy()
                    export_df.columns = ['NOMBRES', 'APELLIDOS', 'EDAD', 'PESO', 'NIVEL', 'SEXO', 'ABREVIATURA']
                    
                    # Escribir a Excel
                    export_df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            logger.info(f"Excel categorías creado: {excel_path}")
            return excel_path
            
        except Exception as e:
            logger.error(f"Error creating categories Excel: {e}")
            return None
    
    def export_solos_to_excel(self, df, output_dir):
        """Exporta participantes solos a Excel."""
        try:
            # Identificar participantes solos (categorías con 1 participante)
            categoria_counts = df['categoria_completa'].value_counts()
            categorias_solos = categoria_counts[categoria_counts == 1].index
            
            solos = df[df['categoria_completa'].isin(categorias_solos)]
            
            if len(solos) > 0:
                excel_path = os.path.join(output_dir, 'SOLOS.xlsx')
                export_df = solos[['NOMBRES', 'APELLIDOS', 'edad', 'PESO', 'nivel_normalizado', 'sexo_normalizado', 'abreviatura', 'categoria_completa']].copy()
                export_df.columns = ['NOMBRES', 'APELLIDOS', 'EDAD', 'PESO', 'NIVEL', 'SEXO', 'ABREVIATURA', 'CATEGORIA']
                export_df.to_excel(excel_path, index=False)
                logger.info(f"Excel solos creado: {excel_path}")
                return excel_path
            
            return None
            
        except Exception as e:
            logger.error(f"Error creating solos Excel: {e}")
            return None
    
    def generate_all_brackets(self, df, output_dir):
        """Genera todas las imágenes de brackets."""
        try:
            bracket_dir = os.path.join(output_dir, 'brackets')
            os.makedirs(bracket_dir, exist_ok=True)
            
            grupos = df.groupby('categoria_completa')
            bracket_images = []
            
            for categoria, grupo in grupos:
                # Skip if only one participant (solo)
                if len(grupo) <= 1:
                    continue
                
                # Create participants list
                participantes = []
                for _, row in grupo.iterrows():
                    nombre_completo = f"{row['NOMBRES']} {row['APELLIDOS']}"
                    abrev = str(row['abreviatura']) if pd.notna(row['abreviatura']) else ''
                    if abrev.strip():
                        nombre_con_abrev = f"{nombre_completo} ({abrev.strip()})"
                    else:
                        nombre_con_abrev = nombre_completo
                    participantes.append(nombre_con_abrev)
                
                # Find appropriate template
                count = len(participantes)
                template_name = f"{count}.png"
                template_path = os.path.join(self.bracket_generator.template_folder, template_name)
                
                if not os.path.exists(template_path):
                    logger.warning(f"No template for {count} participants: {template_name}")
                    continue
                
                # Generate bracket image
                output_filename = f"{categoria.replace(' ', '_')}_bracket.jpg"
                output_path = os.path.join(bracket_dir, output_filename)
                
                if self.bracket_generator.mark_positions(template_path, participantes, output_path, categoria):
                    bracket_images.append(output_path)
            
            logger.info(f"Generated {len(bracket_images)} bracket images")
            return bracket_images
            
        except Exception as e:
            logger.error(f"Error generating brackets: {e}")
            return []
    
    def create_pdf_from_brackets(self, bracket_images, output_dir):
        """Crea un PDF con todas las imágenes de brackets."""
        if not bracket_images:
            return None
        
        try:
            timestamp = int(time.time())
            pdf_path = os.path.join(output_dir, f'BRACKETS_VERTICALES_{timestamp}.pdf')
            
            c = canvas.Canvas(pdf_path, pagesize=A4)
            page_width, page_height = A4
            
            margin = 15
            available_width = page_width - 2 * margin
            available_height = page_height - 2 * margin
            images_per_page = 2
            
            for page_start in range(0, len(bracket_images), images_per_page):
                page_images = bracket_images[page_start:page_start + images_per_page]
                
                for i, imagen_path in enumerate(page_images):
                    try:
                        with Image.open(imagen_path) as img:
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            
                            img_width, img_height = img.size
                            aspect_ratio = img_width / img_height
                            
                            # Calculate position for vertical stacking
                            if len(page_images) == 1:
                                y_position = margin
                                img_height_calc = available_height
                            else:
                                img_height_calc = (available_height - 10) / len(page_images)
                                y_position = margin + i * (img_height_calc + 10)
                            
                            # Fit image
                            if aspect_ratio > available_width / img_height_calc:
                                new_width = available_width
                                new_height = new_width / aspect_ratio
                            else:
                                new_height = img_height_calc
                                new_width = new_height * aspect_ratio
                            
                            # Center horizontally
                            x_position = margin + (available_width - new_width) / 2
                            
                            c.drawImage(ImageReader(img), x_position, y_position, width=new_width, height=new_height)
                            
                    except Exception as e:
                        logger.error(f"Error adding image to PDF: {e}")
                        continue
                
                if page_start + images_per_page < len(bracket_images):
                    c.showPage()
            
            c.save()
            logger.info(f"PDF created: {pdf_path}")
            return pdf_path
            
        except Exception as e:
            logger.error(f"Error creating PDF: {e}")
            return None


# Global processor instance
processor = MexxusArenaProcessor()

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/generate-brackets', methods=['POST'])
def generate_brackets():
    try:
        # Check if a file was uploaded
        if 'participants' not in request.files:
            return jsonify({"error": "No se seleccionó ningún archivo"}), 400
        
        file = request.files['participants']
        
        # If no file was selected
        if file.filename == '':
            return jsonify({"error": "No se seleccionó ningún archivo"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Tipo de archivo no permitido. Use archivos .xls o .xlsx"}), 400

        # Create temporary directory for processing
        temp_dir = tempfile.mkdtemp()
        try:
            # Save uploaded file
            filename = secure_filename(file.filename)
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)
            logger.info(f"Archivo guardado en: {file_path}")
            
            # Create output directory
            output_dir = os.path.join(temp_dir, 'output')
            os.makedirs(output_dir, exist_ok=True)
            logger.info(f"Directorio de salida creado: {output_dir}")
            
            # Process the file using MexxusArenaProcessor
            from agrupador_multiple import AgrupadorMultiple
            agrupador = AgrupadorMultiple()
            df_combinado = agrupador.procesar_multiples_archivos([file_path], combinar=True)
            
            if df_combinado is not None:
                # Generate brackets and PDF
                logger.info("Generando brackets y PDF...")
                result = agrupador.generar_todo_completo(df_combinado, output_dir)
                logger.info(f"Resultado de generación: {result}")
                
                # Get PDF path from result dictionary
                if isinstance(result, dict) and result.get('pdf_brackets'):
                    pdf_path = result['pdf_brackets']
                    logger.info(f"Ruta del PDF encontrada: {pdf_path}")
                    
                    if os.path.exists(str(pdf_path)):
                        # Copy the PDF to a more permanent location
                        timestamp = Path(str(pdf_path)).stem.split('_')[-1]
                        permanent_filename = f'BRACKETS_VERTICALES_{timestamp}.pdf'
                        permanent_path = os.path.join(UPLOAD_FOLDER, permanent_filename)
                        
                        # Ensure the PDF exists and copy it
                        logger.info(f"Copiando PDF a ubicación permanente: {permanent_path}")
                        shutil.copy2(str(pdf_path), str(permanent_path))

                        # Copy SOLOS.xlsx to uploads folder
                        solos_path = os.path.join(output_dir, 'SOLOS.xlsx')
                        if os.path.exists(solos_path):
                            permanent_excel_path = os.path.join(UPLOAD_FOLDER, 'SOLOS.xlsx')
                            shutil.copy2(solos_path, permanent_excel_path)
                            logger.info(f"Archivo SOLOS.xlsx copiado a: {permanent_excel_path}")
                        else:
                            logger.warning("No se encontró el archivo SOLOS.xlsx")
                        
                        return jsonify({
                            'status': 'success',
                            'files': {
                                'pdf': permanent_filename,
                                'excel': 'SOLOS.xlsx'
                            }
                        })
                    else:
                        logger.error(f"PDF no encontrado en la ruta: {pdf_path}")
                        return jsonify({"error": "El archivo PDF generado no se encuentra en la ubicación esperada"}), 500
                else:
                    logger.error("No se encontró la ruta del PDF en el resultado")
                    return jsonify({"error": "Error al obtener la ruta del PDF generado"}), 500
            else:
                logger.error("No se encontraron participantes válidos")
                return jsonify({"error": "No se encontraron participantes válidos en el archivo"}), 400
        
        finally:
            # Clean up temporary directory
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Directorio temporal eliminado: {temp_dir}")
            except Exception as e:
                logger.error(f"Error al eliminar directorio temporal: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error en el procesamiento: {str(e)}")
        return jsonify({"error": f"Error al procesar el archivo: {str(e)}"}), 500

@app.route('/api/download/<filename>')
def download_file(filename):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            mimetype = 'application/pdf' if filename.endswith('.pdf') else 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            return send_file(
                str(file_path),
                as_attachment=True,
                download_name=filename,
                mimetype=mimetype
            )
        else:
            return jsonify({"error": "Archivo no encontrado"}), 404
    except Exception as e:
        logger.error(f"Error al descargar el archivo: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Get port from environment variable (for Railway) or use default
    port = int(os.environ.get('PORT', 5500))
    app.run(debug=False, host='0.0.0.0', port=port) 