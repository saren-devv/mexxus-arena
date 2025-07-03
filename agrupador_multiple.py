#!/usr/bin/env python3
"""
Agrupador Múltiple de Participantes de Taekwondo
===============================================

Este script puede procesar múltiples archivos Excel con participantes de taekwondo
y agruparlos según los criterios de categorías definidos en el archivo JSON.

Funcionalidades:
- Procesar múltiples archivos Excel
- Combinar participantes de varios archivos
- Exportar por archivo separado o combinado
- Procesamiento automático de carpetas
- Generar brackets y PDF con todas las llaves

Autor: Asistente IA
Fecha: 2024
"""

import pandas as pd
import json
import os
import re
from datetime import datetime, date
from pathlib import Path
import argparse
import glob
from agrupador_taekwondo import AgrupadorTaekwondo
import subprocess
import sys
import tempfile
import shutil
import time

# Imports for bracket generation and PDF creation
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    from PIL import Image
except ImportError:
    print("⚠️ Módulos adicionales requeridos para generar PDF:")
    print("pip install reportlab pillow")
    print("Continuando sin funcionalidad de PDF...")

# Import the bracket generator functions
try:
    import sys
    sys.path.append('.')
    from brackets_real import mark_positions
except ImportError:
    print("⚠️ No se pudo importar brackets_real.py")
    print("Asegúrate de que el archivo brackets_real.py esté en el mismo directorio")


class AgrupadorMultiple(AgrupadorTaekwondo):
    """Clase para procesar múltiples archivos Excel de participantes de taekwondo."""
    
    def __init__(self, archivo_categorias="categorias_taekwondo.json"):
        """
        Inicializa el agrupador múltiple.
        
        Args:
            archivo_categorias (str): Ruta al archivo JSON con las categorías
        """
        super().__init__(archivo_categorias)
        self.archivos_procesados = []
        self.participantes_por_archivo = {}
    
    def procesar_multiples_archivos(self, archivos_excel, combinar=True):
        """
        Procesa múltiples archivos Excel.
        
        Args:
            archivos_excel (list): Lista de rutas a archivos Excel
            combinar (bool): Si True, combina todos los participantes en un solo DataFrame
            
        Returns:
            pandas.DataFrame o dict: DataFrame combinado o diccionario con DataFrames por archivo
        """
        print(f"🔄 Procesando {len(archivos_excel)} archivos Excel...")
        print("=" * 60)
        
        todos_participantes = []
        participantes_por_archivo = {}
        archivos_exitosos = []
        archivos_fallidos = []
        
        for i, archivo in enumerate(archivos_excel, 1):
            try:
                print(f"\n📊 [{i}/{len(archivos_excel)}] Procesando: {Path(archivo).name}")
                
                # Procesar archivo individual
                df = self.procesar_participantes(archivo)
                
                if df is not None and len(df) > 0:
                    # Generar nombre de categoría completa
                    df['categoria_completa'] = df.apply(
                        lambda row: self.generar_nombre_categoria(
                            row['categoria_edad'],
                            row['sexo_normalizado'], 
                            row['nivel_normalizado'],
                            row['categoria_peso']
                        ), axis=1
                    )
                    
                    # Agregar columna con origen del archivo
                    df['archivo_origen'] = Path(archivo).stem
                    
                    # Almacenar por archivo
                    participantes_por_archivo[Path(archivo).stem] = df
                    
                    # Agregar a la lista combinada
                    todos_participantes.append(df)
                    archivos_exitosos.append(archivo)
                    
                    print(f"✅ {len(df)} participantes válidos encontrados")
                else:
                    print(f"❌ No se encontraron participantes válidos")
                    archivos_fallidos.append(archivo)
                    
            except Exception as e:
                print(f"❌ Error procesando {Path(archivo).name}: {e}")
                archivos_fallidos.append(archivo)
        
        # Resumen del procesamiento
        print(f"\n📈 RESUMEN DEL PROCESAMIENTO MÚLTIPLE:")
        print(f"  • Archivos procesados exitosamente: {len(archivos_exitosos)}")
        print(f"  • Archivos con errores: {len(archivos_fallidos)}")
        
        if archivos_fallidos:
            print(f"  • Archivos fallidos:")
            for archivo in archivos_fallidos:
                print(f"    - {Path(archivo).name}")
        
        # Almacenar información
        self.archivos_procesados = archivos_exitosos
        self.participantes_por_archivo = participantes_por_archivo
        
        if combinar and todos_participantes:
            # Combinar todos los DataFrames
            df_combinado = pd.concat(todos_participantes, ignore_index=True)
            
            total_participantes = len(df_combinado)
            archivos_origen = df_combinado['archivo_origen'].nunique()
            
            print(f"  • Total participantes combinados: {total_participantes}")
            print(f"  • Archivos de origen: {archivos_origen}")
            print(f"  • Distribución por archivo:")
            
            for archivo, cantidad in df_combinado['archivo_origen'].value_counts().items():
                print(f"    - {archivo}: {cantidad} participantes")
            
            return df_combinado
        
        elif not combinar and participantes_por_archivo:
            return participantes_por_archivo
        
        else:
            print("❌ No se pudieron procesar participantes de ningún archivo")
            return None
    
    def buscar_archivos_excel(self, patron_busqueda):
        """
        Busca archivos Excel usando patrones.
        
        Args:
            patron_busqueda (str): Patrón de búsqueda (ej: "*.xlsx", "participantes_*.xlsx")
            
        Returns:
            list: Lista de archivos encontrados
        """
        archivos = glob.glob(patron_busqueda)
        archivos_excel = [f for f in archivos if f.endswith(('.xlsx', '.xls'))]
        
        print(f"🔍 Buscando archivos con patrón: {patron_busqueda}")
        print(f"✅ {len(archivos_excel)} archivos Excel encontrados:")
        
        for archivo in archivos_excel:
            print(f"  • {Path(archivo).name}")
        
        return archivos_excel
    
    def procesar_carpeta(self, carpeta, patron="*.xlsx"):
        """
        Procesa todos los archivos Excel de una carpeta.
        
        Args:
            carpeta (str): Ruta de la carpeta
            patron (str): Patrón de archivos a buscar
            
        Returns:
            pandas.DataFrame: DataFrame combinado con todos los participantes
        """
        ruta_busqueda = Path(carpeta) / patron
        archivos = self.buscar_archivos_excel(str(ruta_busqueda))
        
        if archivos:
            return self.procesar_multiples_archivos(archivos, combinar=True)
        else:
            print(f"❌ No se encontraron archivos Excel en: {carpeta}")
            return None
    
    def identificar_solos(self, df):
        """
        Identifica participantes que están solos en su categoría.
        
        Args:
            df (pandas.DataFrame): DataFrame con los participantes
            
        Returns:
            tuple: (DataFrame con solos, DataFrame sin solos)
        """
        # Contar participantes por categoría
        conteo_categoria = df.groupby('categoria_completa').size()
        
        # Identificar categorías con un solo participante
        categorias_solos = conteo_categoria[conteo_categoria == 1].index
        
        # Separar participantes solos y no solos
        solos = df[df['categoria_completa'].isin(categorias_solos)].copy()
        no_solos = df[~df['categoria_completa'].isin(categorias_solos)].copy()
        
        return solos, no_solos

    def exportar_solos(self, df_solos, carpeta_salida):
        """
        Exporta los participantes solos a un archivo Excel.
        
        Args:
            df_solos (pandas.DataFrame): DataFrame con participantes solos
            carpeta_salida (str): Carpeta donde guardar el archivo
        """
        if len(df_solos) == 0:
            print("ℹ️ No se encontraron participantes solos")
            return
            
        # Crear carpeta si no existe
        os.makedirs(carpeta_salida, exist_ok=True)
        
        # Ruta del archivo de solos
        archivo_solos = Path(carpeta_salida) / "SOLOS.xlsx"
        
        # Preparar DataFrame para exportación
        df_export = df_solos.copy()
        
        # Asegurar que las columnas estén en el formato correcto
        columnas_requeridas = ['nombres', 'apellidos', 'edad', 'peso', 'nivel', 'sexo', 'abreviatura', 'categoria_completa']
        columnas_presentes = [col for col in columnas_requeridas if col in df_export.columns]
        
        # Seleccionar solo las columnas necesarias
        df_export = df_export[columnas_presentes]
        
        # Renombrar columnas para exportación
        mapeo_columnas = {
            'nombres': 'NOMBRES',
            'apellidos': 'APELLIDOS',
            'edad': 'EDAD',
            'peso': 'PESO',
            'nivel': 'NIVEL',
            'sexo': 'SEXO',
            'abreviatura': 'ABREVIATURA',
            'categoria_completa': 'CATEGORIA'
        }
        
        df_export = df_export.rename(columns=mapeo_columnas)
        
        # Ordenar por categoría para mejor visualización
        if 'CATEGORIA' in df_export.columns:
            df_export = df_export.sort_values(['CATEGORIA', 'NOMBRES', 'APELLIDOS'])
        else:
            df_export = df_export.sort_values(['NOMBRES', 'APELLIDOS'])
        
        # Exportar a Excel
        df_export.to_excel(archivo_solos, index=False)
        print(f"📄 {len(df_solos)} participantes solos exportados a: {archivo_solos}")
        
        # Generar resumen de solos por archivo origen si existe la columna
        if 'archivo_origen' in df_solos.columns:
            resumen_solos = df_solos.groupby('archivo_origen').size()
            print("\n📊 Distribución de solos por archivo origen:")
            for archivo, cantidad in resumen_solos.items():
                print(f"  • {archivo}: {cantidad} participante(s)")

    def exportar_combinado(self, df_combinado, carpeta_salida="categorias_combinadas"):
        """
        Exporta participantes combinados de múltiples archivos.
        
        Args:
            df_combinado (pandas.DataFrame): DataFrame con participantes de múltiples archivos
            carpeta_salida (str): Carpeta donde guardar los archivos
        """
        print(f"\n📁 Exportando categorías combinadas a: {carpeta_salida}")
        
        # Identificar y separar participantes solos
        solos, no_solos = self.identificar_solos(df_combinado)
        
        # Exportar participantes no solos usando el método original
        if len(no_solos) > 0:
            self.agrupar_y_exportar(no_solos, carpeta_salida)
        
        # Exportar participantes solos
        self.exportar_solos(solos, carpeta_salida)
        
        # Crear resumen por archivo origen
        resumen_path = Path(carpeta_salida) / "resumen_archivos_origen.xlsx"
        
        resumen_data = []
        for archivo, cantidad in df_combinado['archivo_origen'].value_counts().items():
            resumen_data.append({
                'Archivo_Origen': archivo,
                'Participantes_Totales': cantidad,
                'Participantes_Solos': len(solos[solos['archivo_origen'] == archivo]) if len(solos) > 0 else 0,
                'Participantes_En_Llaves': len(no_solos[no_solos['archivo_origen'] == archivo]) if len(no_solos) > 0 else 0,
                'Categorias': df_combinado[df_combinado['archivo_origen'] == archivo]['categoria_completa'].nunique()
            })
        
        resumen_df = pd.DataFrame(resumen_data)
        resumen_df.to_excel(resumen_path, index=False)
        
        print(f"📊 Resumen por archivo origen guardado en: {resumen_path}")

    def exportar_categorias_unico_excel(self, df_combinado, carpeta_salida="categorias_combinadas"):
        """
        Exporta todas las categorías en un solo archivo Excel con múltiples hojas.
        
        Args:
            df_combinado (pandas.DataFrame): DataFrame con participantes de múltiples archivos
            carpeta_salida (str): Carpeta donde guardar los archivos
        """
        print(f"\n📁 Exportando categorías en Excel único a: {carpeta_salida}")
        
        # Crear carpeta si no existe
        os.makedirs(carpeta_salida, exist_ok=True)
        
        # Identificar y separar participantes solos
        solos, no_solos = self.identificar_solos(df_combinado)
        
        # Exportar participantes solos como antes
        self.exportar_solos(solos, carpeta_salida)
        
        if len(no_solos) == 0:
            print("ℹ️ No hay categorías con múltiples participantes para generar brackets")
            return None
        
        # Crear archivo Excel con múltiples hojas
        archivo_categorias = Path(carpeta_salida) / "TODAS_LAS_CATEGORIAS.xlsx"
        
        # Preparar datos para exportación
        grupos = no_solos.groupby('categoria_completa')
        
        with pd.ExcelWriter(archivo_categorias, engine='openpyxl') as writer:
            for categoria, grupo in grupos:
                # Ensure weight category is preserved in sheet name
                nombre_hoja = categoria
                # Remove invalid Excel sheet name characters
                nombre_hoja = re.sub(r'[<>:"/\\|?*\[\]]', '_', nombre_hoja)
                # If name is too long for Excel (31 chars max), preserve the weight category
                if len(nombre_hoja) > 31:
                    partes = nombre_hoja.split()
                    peso = partes[-1]  # Get the weight category
                    nivel = partes[0]  # Get the level (Festival/Noveles)
                    division = ' '.join(partes[1:-2])  # Get the division (INFANTIL A/B/C, etc)
                    genero = partes[-2]  # Get gender
                    
                    # Use single letter for gender in Excel sheet names
                    if genero == "MASCULINO":
                        genero_corto = "M"
                    else:  # FEMENINO
                        genero_corto = "F"
                    
                    # Try to keep as much information as possible while staying under 31 chars
                    # Calculate available space for division
                    espacio_disponible = 31 - len(f"{nivel} {genero_corto} {peso}") - 2  # -2 for spaces
                    if espacio_disponible > 0:
                        division = division[:espacio_disponible]
                    nombre_hoja = f"{nivel} {division} {genero_corto} {peso}"[:31]
                
                # Seleccionar y renombrar columnas para exportación
                columnas_exportar = ['nombres', 'apellidos', 'edad', 'peso', 'nivel', 'sexo', 'abreviatura']
                grupo_export = grupo[columnas_exportar].copy()
                grupo_export.columns = ['NOMBRES', 'APELLIDOS', 'EDAD', 'PESO', 'NIVEL', 'SEXO', 'ABREVIATURA']
                
                # Escribir en la hoja
                grupo_export.to_excel(writer, sheet_name=nombre_hoja, index=False)
                print(f"  • {categoria}: {len(grupo)} participantes → Hoja: {nombre_hoja}")
        
        print(f"\n✅ Archivo único creado: {archivo_categorias}")
        
        # Crear resumen por archivo origen
        resumen_path = Path(carpeta_salida) / "resumen_archivos_origen.xlsx"
        resumen_data = []
        for archivo, cantidad in df_combinado['archivo_origen'].value_counts().items():
            resumen_data.append({
                'Archivo_Origen': archivo,
                'Participantes_Totales': cantidad,
                'Participantes_Solos': len(solos[solos['archivo_origen'] == archivo]) if len(solos) > 0 else 0,
                'Participantes_En_Llaves': len(no_solos[no_solos['archivo_origen'] == archivo]) if len(no_solos) > 0 else 0,
                'Categorias': df_combinado[df_combinado['archivo_origen'] == archivo]['categoria_completa'].nunique()
            })
        
        resumen_df = pd.DataFrame(resumen_data)
        resumen_df.to_excel(resumen_path, index=False)
        print(f"📊 Resumen por archivo origen guardado en: {resumen_path}")
        
        return archivo_categorias

    def generar_brackets_desde_excel(self, archivo_excel, carpeta_salida):
        """
        Genera brackets para todas las categorías desde un archivo Excel con múltiples hojas.
        
        Args:
            archivo_excel (str): Ruta al archivo Excel con las categorías
            carpeta_salida (str): Carpeta donde guardar las imágenes de brackets
        
        Returns:
            list: Lista de rutas de imágenes generadas
        """
        print(f"\n🖼️ Generando brackets desde: {archivo_excel}")
        
        # Crear carpeta para brackets si no existe
        carpeta_brackets = Path(carpeta_salida) / "brackets"
        os.makedirs(carpeta_brackets, exist_ok=True)
        
        # Leer todas las hojas del Excel
        hojas = pd.read_excel(archivo_excel, sheet_name=None)
        imagenes_generadas = []
        
        for nombre_hoja, df in hojas.items():
            try:
                print(f"\n📋 Procesando categoría: {nombre_hoja}")
                
                # Verificar que tenemos las columnas necesarias
                if 'NOMBRES' not in df.columns or 'APELLIDOS' not in df.columns:
                    print(f"❌ Hoja {nombre_hoja} no tiene las columnas necesarias")
                    continue
                
                # Crear lista de participantes con abreviatura de academia
                participantes = []
                for _, row in df.iterrows():
                    nombre_completo = f"{row['NOMBRES']} {row['APELLIDOS']}"
                    abreviatura = row.get('ABREVIATURA', '')
                    # Convert to string and check if it's not empty
                    abrev_str = str(abreviatura) if pd.notna(abreviatura) else ''
                    if abrev_str.strip():
                        nombre_con_abrev = f"{nombre_completo} ({abrev_str.strip()})"
                    else:
                        nombre_con_abrev = nombre_completo
                    participantes.append(nombre_con_abrev)
                count = len(participantes)
                
                print(f"  • Participantes: {count}")
                
                # Verificar que existe la plantilla
                template_name = f"{count}.png"
                template_path = Path("bracket_templates") / template_name
                
                if not template_path.exists():
                    print(f"❌ No existe plantilla para {count} participantes: {template_name}")
                    continue
                
                # Generar nombre de archivo de salida
                output_filename = f"{nombre_hoja}_bracket.jpg"
                output_path = carpeta_brackets / output_filename
                
                # Generar bracket usando la función de brackets_real.py
                try:
                    mark_positions(
                        image_path=str(template_path),
                        participants=participantes,
                        output_path=str(output_path),
                        category_name=nombre_hoja.replace('_', ' ')
                    )
                    
                    imagenes_generadas.append(str(output_path))
                    print(f"  ✅ Bracket generado: {output_filename}")
                    
                except Exception as e:
                    print(f"  ❌ Error generando bracket: {e}")
                    continue
                    
            except Exception as e:
                print(f"❌ Error procesando hoja {nombre_hoja}: {e}")
                continue
        
        print(f"\n🎉 {len(imagenes_generadas)} brackets generados exitosamente")
        return imagenes_generadas

    def crear_pdf_brackets(self, imagenes_brackets, carpeta_salida):
        """
        Crea un PDF con todas las imágenes de brackets.
        
        Args:
            imagenes_brackets (list): Lista de rutas de imágenes
            carpeta_salida (str): Carpeta donde guardar el PDF
        
        Returns:
            str: Ruta del archivo PDF generado
        """
        try:
            from reportlab.lib.pagesizes import letter, A4
            from reportlab.pdfgen import canvas
            from reportlab.lib.utils import ImageReader
            from PIL import Image as PILImage
        except ImportError:
            print("❌ No se pueden crear PDFs. Instala: pip install reportlab pillow")
            return None
        
        if not imagenes_brackets:
            print("❌ No hay imágenes de brackets para crear PDF")
            return None
        
        print(f"\n📄 Creando PDF con {len(imagenes_brackets)} brackets...")
        
        # Crear archivo PDF
        timestamp = int(time.time())
        pdf_path = Path(carpeta_salida) / f"BRACKETS_VERTICALES_{timestamp}.pdf"
        c = canvas.Canvas(str(pdf_path), pagesize=A4)
        page_width, page_height = A4
        
        # Calculate layout for multiple images per page - arranged vertically
        margin = 15  # Small margin for tight packing
        vertical_gap = 10  # Small gap between brackets
        available_width = page_width - 2 * margin
        available_height = page_height - 2 * margin
        
        # Try to fit 2-3 brackets per page vertically
        images_per_page = 2
        
        for page_start in range(0, len(imagenes_brackets), images_per_page):
            page_images = imagenes_brackets[page_start:page_start + images_per_page]
            
            # Calculate dimensions for this page
            num_images_on_page = len(page_images)
            
            # Adjust layout based on number of images - all arranged vertically
            if num_images_on_page == 1:
                # Single image - use full page
                positions = [(margin, margin, available_width, available_height)]
            elif num_images_on_page == 2:
                # Two images - stacked vertically
                img_height = (available_height - vertical_gap) / 2
                positions = [
                    (margin, margin + img_height + vertical_gap, available_width, img_height),
                    (margin, margin, available_width, img_height)
                ]
            else:  # 3 images
                # Three images - all stacked vertically
                img_height = (available_height - 2 * vertical_gap) / 3
                positions = [
                    (margin, margin + 2 * (img_height + vertical_gap), available_width, img_height),
                    (margin, margin + img_height + vertical_gap, available_width, img_height),
                    (margin, margin, available_width, img_height)
                ]
            
            # Place images on the page
            for i, imagen_path in enumerate(page_images):
                try:
                    if i >= len(positions):
                        break
                        
                    x, y, max_width, max_height = positions[i]
                    
                    print(f"  • Agregando imagen {page_start + i + 1}/{len(imagenes_brackets)}: {Path(imagen_path).name}")
                    
                    # Open and process image
                    with PILImage.open(imagen_path) as img:
                        # Convert to RGB if necessary
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        # Calculate dimensions
                        img_width, img_height = img.size
                        aspect_ratio = img_width / img_height
                        
                        # Fit image within allocated space
                        if aspect_ratio > max_width / max_height:
                            # Image is wider - fit to width
                            new_width = max_width
                            new_height = new_width / aspect_ratio
                        else:
                            # Image is taller - fit to height
                            new_height = max_height
                            new_width = new_height * aspect_ratio
                        
                        # Center image within allocated space
                        final_x = x + (max_width - new_width) / 2
                        final_y = y + (max_height - new_height) / 2
                        
                        # Add image to PDF
                        c.drawImage(ImageReader(img), final_x, final_y, width=new_width, height=new_height)
                        
                except Exception as e:
                    print(f"  ❌ Error agregando imagen {imagen_path}: {e}")
                    continue
            
            # New page if there are more images (except for the last page)
            if page_start + images_per_page < len(imagenes_brackets):
                c.showPage()
        
        # Save PDF
        c.save()
        total_pages = (len(imagenes_brackets) + images_per_page - 1) // images_per_page
        print(f"\n✅ PDF creado exitosamente: {pdf_path}")
        print(f"📄 Total de páginas: {total_pages} ({len(imagenes_brackets)} brackets apilados verticalmente)")
        return str(pdf_path)

    def generar_todo_completo(self, df_combinado, carpeta_salida="torneo_completo"):
        """
        Función principal que genera todo: Excel único, brackets y PDF.
        
        Args:
            df_combinado (pandas.DataFrame): DataFrame con todos los participantes
            carpeta_salida (str): Carpeta donde guardar todo
        
        Returns:
            dict: Diccionario con las rutas de los archivos generados
        """
        print(f"\n🏆 GENERANDO TORNEO COMPLETO EN: {carpeta_salida}")
        print("=" * 60)
        
        resultados = {
            'excel_categorias': None,
            'excel_solos': None,
            'imagenes_brackets': [],
            'pdf_brackets': None,
            'resumen': None
        }
        
        # 1. Crear Excel único con todas las categorías
        print("\n📋 PASO 1: Creando Excel único con categorías...")
        excel_categorias = self.exportar_categorias_unico_excel(df_combinado, carpeta_salida)
        resultados['excel_categorias'] = excel_categorias
        
        if excel_categorias:
            # 2. Generar todas las imágenes de brackets
            print("\n🖼️ PASO 2: Generando imágenes de brackets...")
            imagenes = self.generar_brackets_desde_excel(excel_categorias, carpeta_salida)
            resultados['imagenes_brackets'] = imagenes
            
            # 3. Crear PDF con todos los brackets
            if imagenes:
                print("\n📄 PASO 3: Creando PDF con todos los brackets...")
                pdf_path = self.crear_pdf_brackets(imagenes, carpeta_salida)
                resultados['pdf_brackets'] = pdf_path
        
        # 4. Generar reporte completo
        print("\n📊 PASO 4: Generando reporte completo...")
        self.generar_reporte_completo(df_combinado, carpeta_salida)
        
        # Resumen final
        print(f"\n🎉 TORNEO COMPLETO GENERADO:")
        print(f"  📂 Carpeta: {Path(carpeta_salida).absolute()}")
        if resultados['excel_categorias']:
            print(f"  📋 Excel categorías: {Path(resultados['excel_categorias']).name}")
        if resultados['imagenes_brackets']:
            print(f"  🖼️ Imágenes brackets: {len(resultados['imagenes_brackets'])} generadas")
        if resultados['pdf_brackets']:
            print(f"  📄 PDF brackets: {Path(resultados['pdf_brackets']).name}")
        
        return resultados

    def agrupar_y_exportar(self, df, carpeta_salida="categorias_exportadas"):
        """
        Agrupa los participantes y exporta a archivos Excel separados.
        Versión actualizada para incluir abreviatura de academia.
        
        Args:
            df (pandas.DataFrame): DataFrame con participantes procesados
            carpeta_salida (str): Carpeta donde guardar los archivos
        """
        # Crear carpeta de salida
        Path(carpeta_salida).mkdir(exist_ok=True)
        
        # Generar nombre de categoría completa
        df['categoria_completa'] = df.apply(
            lambda row: self.generar_nombre_categoria(
                row['categoria_edad'],
                row['sexo_normalizado'], 
                row['nivel_normalizado'],
                row['categoria_peso']
            ), axis=1
        )
        
        # Agrupar y exportar
        grupos = df.groupby('categoria_completa')
        print(f"\n✓ Se encontraron {len(grupos)} categorías diferentes:")
        
        for categoria, grupo in grupos:
            # Limpiar nombre de archivo
            nombre_archivo = re.sub(r'[<>:"/\\|?*]', '_', categoria)
            archivo_salida = Path(carpeta_salida) / f"{nombre_archivo}.xlsx"
            
            # Seleccionar columnas para exportar
            columnas_exportar = ['nombres', 'apellidos', 'edad', 'peso', 'nivel', 'sexo', 'abreviatura']
            grupo_export = grupo[columnas_exportar].copy()
            
            # Renombrar columnas para exportación
            grupo_export.columns = ['NOMBRES', 'APELLIDOS', 'EDAD', 'PESO', 'NIVEL', 'SEXO', 'ABREVIATURA']
            
            # Exportar a Excel
            grupo_export.to_excel(archivo_salida, index=False)
            
            print(f"  • {categoria}: {len(grupo)} participantes → {archivo_salida}")
        
        print(f"\n✅ Exportación completada en: {Path(carpeta_salida).absolute()}")

    def exportar_por_separado(self, participantes_dict, carpeta_base="categorias_por_archivo"):
        """
        Exporta cada archivo por separado en subcarpetas.
        
        Args:
            participantes_dict (dict): Diccionario con DataFrames por archivo
            carpeta_base (str): Carpeta base donde crear subcarpetas
        """
        print(f"\n📁 Exportando por archivo separado en: {carpeta_base}")
        
        # Crear DataFrame combinado para identificar solos
        df_combinado = pd.concat(participantes_dict.values(), ignore_index=True)
        solos, _ = self.identificar_solos(df_combinado)
        
        for nombre_archivo, df in participantes_dict.items():
            subcarpeta = Path(carpeta_base) / nombre_archivo
            print(f"\n📂 Procesando: {nombre_archivo}")
            
            # Identificar solos específicos de este archivo
            solos_archivo = solos[solos['archivo_origen'] == nombre_archivo] if len(solos) > 0 else pd.DataFrame()
            
            # Obtener participantes no solos
            no_solos_archivo = df[~df.index.isin(solos_archivo.index)]
            
            # Exportar no solos
            if len(no_solos_archivo) > 0:
                self.agrupar_y_exportar(no_solos_archivo, str(subcarpeta))
            
            # Exportar solos
            if len(solos_archivo) > 0:
                self.exportar_solos(solos_archivo, str(subcarpeta))

    def generar_reporte_completo(self, df_o_dict, carpeta_salida):
        """
        Genera un reporte completo del procesamiento múltiple.
        
        Args:
            df_o_dict: DataFrame combinado o diccionario de DataFrames
            carpeta_salida (str): Carpeta donde guardar el reporte
        """
        reporte_path = Path(carpeta_salida) / "reporte_procesamiento_multiple.txt"
        
        with open(reporte_path, 'w', encoding='utf-8') as f:
            f.write("🥋 REPORTE DE PROCESAMIENTO MÚLTIPLE - TAEKWONDO 🥋\n")
            f.write("=" * 60 + "\n\n")
            
            f.write(f"📅 Fecha de procesamiento: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"📂 Carpeta de salida: {carpeta_salida}\n\n")
            
            if isinstance(df_o_dict, pd.DataFrame):
                # Reporte combinado
                solos, no_solos = self.identificar_solos(df_o_dict)
                
                f.write("📊 PROCESAMIENTO COMBINADO\n")
                f.write("-" * 30 + "\n")
                f.write(f"Total participantes: {len(df_o_dict)}\n")
                f.write(f"Participantes solos: {len(solos)}\n")
                f.write(f"Participantes en llaves: {len(no_solos)}\n")
                f.write(f"Archivos procesados: {len(self.archivos_procesados)}\n")
                f.write(f"Categorías generadas: {df_o_dict['categoria_completa'].nunique()}\n\n")
                
                f.write("Distribución por archivo origen:\n")
                for archivo, cantidad in df_o_dict['archivo_origen'].value_counts().items():
                    solos_archivo = len(solos[solos['archivo_origen'] == archivo]) if len(solos) > 0 else 0
                    f.write(f"  • {archivo}:\n")
                    f.write(f"    - Total: {cantidad} participantes\n")
                    f.write(f"    - Solos: {solos_archivo} participantes\n")
                    f.write(f"    - En llaves: {cantidad - solos_archivo} participantes\n")
                
            else:
                # Reporte por separado
                df_combinado = pd.concat(df_o_dict.values(), ignore_index=True)
                solos, no_solos = self.identificar_solos(df_combinado)
                
                f.write("📊 PROCESAMIENTO POR SEPARADO\n")
                f.write("-" * 30 + "\n")
                f.write(f"Total participantes: {len(df_combinado)}\n")
                f.write(f"Participantes solos: {len(solos)}\n")
                f.write(f"Participantes en llaves: {len(no_solos)}\n")
                f.write(f"Archivos procesados: {len(df_o_dict)}\n\n")
                
                for nombre_archivo, df in df_o_dict.items():
                    solos_archivo = len(solos[solos['archivo_origen'] == nombre_archivo]) if len(solos) > 0 else 0
                    f.write(f"📄 {nombre_archivo}:\n")
                    f.write(f"  • Total participantes: {len(df)}\n")
                    f.write(f"  • Participantes solos: {solos_archivo}\n")
                    f.write(f"  • Participantes en llaves: {len(df) - solos_archivo}\n")
                    f.write(f"  • Categorías: {df['categoria_completa'].nunique()}\n\n")
        
        print(f"📝 Reporte completo guardado en: {reporte_path}")


def main():
    """Función principal para procesamiento múltiple."""
    parser = argparse.ArgumentParser(
        description="Agrupa participantes de múltiples archivos Excel de taekwondo"
    )
    parser.add_argument(
        "archivos", 
        nargs='+',
        help="Archivos Excel o patrón de búsqueda (ej: *.xlsx, archivo1.xlsx archivo2.xlsx)"
    )
    parser.add_argument(
        "-o", "--output", 
        default="categorias_multiple",
        help="Carpeta de salida (default: categorias_multiple)"
    )
    parser.add_argument(
        "-c", "--categorias",
        default="categorias_taekwondo.json",
        help="Archivo JSON con categorías (default: categorias_taekwondo.json)"
    )
    parser.add_argument(
        "--separado",
        action="store_true",
        help="Procesar archivos por separado en lugar de combinarlos"
    )
    parser.add_argument(
        "--carpeta",
        help="Procesar todos los Excel de una carpeta"
    )
    parser.add_argument(
        "--completo",
        action="store_true",
        help="Generar torneo completo: Excel único + brackets + PDF"
    )
    
    args = parser.parse_args()
    
    print("🥋 AGRUPADOR MÚLTIPLE DE PARTICIPANTES DE TAEKWONDO 🥋")
    print("=" * 65)
    
    try:
        # Crear agrupador múltiple
        agrupador = AgrupadorMultiple(args.categorias)
        
        # Determinar archivos a procesar
        if args.carpeta:
            # Procesar carpeta completa
            print(f"\n📂 Procesando carpeta: {args.carpeta}")
            resultado = agrupador.procesar_carpeta(args.carpeta)
            
            if resultado is not None:
                if args.completo:
                    agrupador.generar_todo_completo(resultado, args.output)
                else:
                    agrupador.exportar_combinado(resultado, args.output)
                    agrupador.generar_reporte_completo(resultado, args.output)
        
        else:
            # Expandir patrones de archivos
            archivos_a_procesar = []
            for patron in args.archivos:
                if '*' in patron or '?' in patron:
                    archivos_encontrados = agrupador.buscar_archivos_excel(patron)
                    archivos_a_procesar.extend(archivos_encontrados)
                else:
                    archivos_a_procesar.append(patron)
            
            if not archivos_a_procesar:
                print("❌ No se encontraron archivos para procesar")
                return
            
            # Procesar archivos
            if args.separado:
                # Procesamiento por separado
                resultado = agrupador.procesar_multiples_archivos(archivos_a_procesar, combinar=False)
                if resultado is not None and len(resultado) > 0:
                    agrupador.exportar_por_separado(resultado, args.output)
                    agrupador.generar_reporte_completo(resultado, args.output)
            elif args.completo:
                # Procesamiento completo: Excel único + brackets + PDF
                resultado = agrupador.procesar_multiples_archivos(archivos_a_procesar, combinar=True)
                if resultado is not None and len(resultado) > 0:
                    agrupador.generar_todo_completo(resultado, args.output)
            else:
                # Procesamiento combinado tradicional
                resultado = agrupador.procesar_multiples_archivos(archivos_a_procesar, combinar=True)
                if resultado is not None and len(resultado) > 0:
                    agrupador.exportar_combinado(resultado, args.output)
                    agrupador.generar_reporte_completo(resultado, args.output)
        
        print(f"\n🎉 ¡Procesamiento múltiple completado!")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main() 