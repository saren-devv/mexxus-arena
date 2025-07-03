#!/usr/bin/env python3
"""
Agrupador de Participantes de Taekwondo
======================================

Este script lee un archivo Excel con participantes de taekwondo y los agrupa
según los criterios de categorías definidos en el archivo JSON.

Criterios de agrupación:
- Edad (determina la categoría)
- Sexo (masculino/femenino)
- Nivel (basado en KUP/DAN)
- Peso (según rangos de la categoría)

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


class AgrupadorTaekwondo:
    """Clase principal para agrupar participantes de taekwondo según criterios oficiales."""
    
    def __init__(self, archivo_categorias="categorias_taekwondo.json"):
        """
        Inicializa el agrupador con las categorías de taekwondo.
        
        Args:
            archivo_categorias (str): Ruta al archivo JSON con las categorías
        """
        self.categorias = self._cargar_categorias(archivo_categorias)
        self.mapeo_niveles = {
            # KUP 10 al 7 - Festival
            "10": "Festival", "9": "Festival", "8": "Festival", "7": "Festival",
            # KUP 6 al 3 - Noveles
            "6": "Noveles", "5": "Noveles", "4": "Noveles", "3": "Noveles",
            # KUP 2 y KUP 1 - Avanzados (los DAN se manejan directamente en normalizar_kup_dan)
            "2": "Avanzados", "1": "Avanzados"
        }
    
    def _cargar_categorias(self, archivo):
        """Carga las categorías desde el archivo JSON."""
        try:
            with open(archivo, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise Exception(f"Error al cargar categorías: {e}")
    
    def calcular_edad(self, fecha_nacimiento):
        """
        Calcula la edad actual basada en la fecha de nacimiento.
        
        Args:
            fecha_nacimiento: Fecha de nacimiento (puede ser string o datetime)
            
        Returns:
            int: Edad en años
        """
        if pd.isna(fecha_nacimiento):
            return None
            
        try:
            # Convertir a datetime si es string
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
            
            # Convertir a date si es datetime
            if isinstance(fecha_nacimiento, datetime):
                fecha_nacimiento = fecha_nacimiento.date()
            elif hasattr(fecha_nacimiento, 'date'):
                fecha_nacimiento = fecha_nacimiento.date()
            
            # Calcular edad
            hoy = date.today()
            edad = hoy.year - fecha_nacimiento.year
            
            # Ajustar si no ha cumplido años
            if (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day):
                edad -= 1
                
            return edad
            
        except Exception:
            return None
    
    def normalizar_kup_dan(self, kup_dan):
        """
        Normaliza el valor KUP/DAN a un formato estándar.
        
        Args:
            kup_dan: Valor del grado (ej: "5to KUP", "1er DAN", "3")
            
        Returns:
            str: Nivel normalizado para el mapeo
        """
        if pd.isna(kup_dan):
            return "Festival"
            
        kup_dan_str = str(kup_dan).upper().strip()
        
        # Buscar DAN - todos los DAN son Avanzados
        if 'DAN' in kup_dan_str:
            return "Avanzados"
        
        # Extraer número
        numeros = re.findall(r'\d+', kup_dan_str)
        if numeros:
            numero = numeros[0]
            return self.mapeo_niveles.get(numero, "Festival")
        
        return "Festival"
    
    def normalizar_sexo(self, sexo):
        """
        Normaliza el sexo a formato estándar.
        
        Args:
            sexo: Sexo del participante
            
        Returns:
            str: "MASCULINO" o "FEMENINO"
        """
        if pd.isna(sexo):
            return None
            
        sexo_str = str(sexo).upper().strip()
        
        if sexo_str in ['M', 'MASCULINO', 'MALE', 'HOMBRE']:
            return "MASCULINO"
        elif sexo_str in ['F', 'FEMENINO', 'FEMALE', 'MUJER']:
            return "FEMENINO"
        
        return None
    
    def determinar_categoria_edad(self, edad):
        """
        Determina la categoría de edad según los criterios.
        
        Args:
            edad (int): Edad del participante
            
        Returns:
            str: Nombre de la categoría de edad
        """
        if edad is None:
            return None
            
        for categoria, criterios in self.categorias.items():
            edad_min, edad_max = criterios['EDAD']
            if edad_min <= edad <= edad_max:
                return categoria
        
        return None
    
    def determinar_categoria_peso(self, peso, categoria_edad, sexo):
        """
        Determina la categoría de peso según los criterios.
        
        Args:
            peso (float): Peso del participante
            categoria_edad (str): Categoría de edad
            sexo (str): Sexo del participante
            
        Returns:
            str: Categoría de peso (ej: "-45", "+65") sin "KG"
        """
        if peso is None or categoria_edad is None or sexo is None:
            return None
            
        try:
            peso = float(peso)
        except:
            return None
        
        criterios = self.categorias[categoria_edad]
        
        # Obtener rangos de peso
        if isinstance(criterios.get('PESOS'), list):
            # Mismos pesos para ambos sexos
            rangos_peso = criterios['PESOS']
        elif isinstance(criterios.get('SEXO'), dict) and sexo in criterios['SEXO']:
            # Pesos específicos por sexo
            rangos_peso = criterios['SEXO'][sexo]
        else:
            return None
            
        # Ordenar rangos de peso para procesamiento correcto
        rangos_numericos = []
        rango_plus = None
        
        for rango in rangos_peso:
            if rango.startswith('+'):
                rango_plus = rango
            else:
                # Convertir -XX a número
                rangos_numericos.append(float(rango[1:]))
        
        rangos_numericos.sort()
        
        # Encontrar el rango apropiado
        if rango_plus and peso > float(rango_plus[1:]):
            return rango_plus
            
        for limite in rangos_numericos:
            if peso <= limite:
                return f"-{int(limite)}"
        
        # Si el peso es mayor que todos los rangos numéricos y hay un rango plus, usar ese
        if rango_plus:
            return rango_plus
            
        return None
    
    def procesar_participantes(self, archivo_excel):
        """
        Lee y procesa el archivo Excel de participantes.
        
        Args:
            archivo_excel (str): Ruta al archivo Excel
            
        Returns:
            pandas.DataFrame: DataFrame procesado
        """
        try:
            # Leer archivo Excel
            df = pd.read_excel(archivo_excel)
            print(f"✓ Archivo leído: {len(df)} participantes encontrados")
            print(f"✓ Columnas: {list(df.columns)}")
            
            # Normalizar nombres de columnas
            df.columns = df.columns.str.strip()
            
            # Mapear columnas comunes
            mapeo_columnas = {}
            for col in df.columns:
                col_lower = col.lower().strip()
                if any(word in col_lower for word in ['nombre', 'name']) and 'apellido' not in col_lower:
                    mapeo_columnas['nombres'] = col
                elif any(word in col_lower for word in ['apellido', 'surname']):
                    mapeo_columnas['apellidos'] = col
                elif any(word in col_lower for word in ['fecha', 'nacimiento', 'birth']):
                    mapeo_columnas['fecha_nacimiento'] = col
                elif any(word in col_lower for word in ['peso', 'weight']):
                    mapeo_columnas['peso'] = col
                elif any(word in col_lower for word in ['kup', 'dan', 'grado']):
                    mapeo_columnas['nivel'] = col
                elif any(word in col_lower for word in ['sexo', 'género', 'gender']):
                    mapeo_columnas['sexo'] = col
                elif any(word in col_lower for word in ['abreviatura', 'abbreviation', 'abrev']):
                    mapeo_columnas['abreviatura'] = col
            
            print(f"✓ Mapeo de columnas detectado: {mapeo_columnas}")
            
            # Verificar que todas las columnas necesarias estén mapeadas
            columnas_requeridas = ['nombres', 'apellidos', 'fecha_nacimiento', 'peso', 'nivel', 'sexo', 'abreviatura']
            columnas_faltantes = [col for col in columnas_requeridas if col not in mapeo_columnas]
            
            if columnas_faltantes:
                print(f"✗ No se pudieron mapear las siguientes columnas: {columnas_faltantes}")
                print("💡 Revisa que tu archivo Excel tenga columnas con nombres similares a:")
                print("   - NOMBRES o NAME")
                print("   - APELLIDOS o SURNAME") 
                print("   - FECHA DE NACIMIENTO o BIRTH DATE")
                print("   - PESO o WEIGHT")
                print("   - KUP, DAN o GRADO")
                print("   - SEXO, GÉNERO o GENDER")
                print("   - ABREVIATURA o ABBREVIATION")
                raise Exception(f"No se pudieron mapear columnas: {columnas_faltantes}")
            
            # Crear mapeo inverso para renombrar (original -> nuevo)
            mapeo_inverso = {v: k for k, v in mapeo_columnas.items()}
            df = df.rename(columns=mapeo_inverso)
            
            print(f"✓ Columnas renombradas exitosamente")
            
            # Procesar datos
            df['edad'] = df['fecha_nacimiento'].apply(self.calcular_edad)
            df['nivel_normalizado'] = df['nivel'].apply(self.normalizar_kup_dan)
            df['sexo_normalizado'] = df['sexo'].apply(self.normalizar_sexo)
            df['categoria_edad'] = df['edad'].apply(self.determinar_categoria_edad)
            df['categoria_peso'] = df.apply(
                lambda row: self.determinar_categoria_peso(
                    row['peso'], row['categoria_edad'], row['sexo_normalizado']
                ), axis=1
            )
            
            # Filtrar participantes válidos
            df_valido = df[
                df['edad'].notna() & 
                df['nivel_normalizado'].notna() & 
                df['sexo_normalizado'].notna() & 
                df['categoria_edad'].notna() & 
                df['categoria_peso'].notna()
            ].copy()
            
            print(f"✓ Participantes válidos: {len(df_valido)}/{len(df)}")
            
            return df_valido
            
        except Exception as e:
            print(f"✗ Error al procesar archivo: {e}")
            return None
    
    def generar_nombre_categoria(self, categoria_edad, sexo, nivel, peso):
        """
        Genera el nombre completo de la categoría.
        
        Args:
            categoria_edad (str): Categoría de edad
            sexo (str): Sexo
            nivel (str): Nivel
            peso (str): Categoría de peso (sin "KG")
            
        Returns:
            str: Nombre completo de la categoría
        """
        # Replace underscores with spaces in division name
        division = categoria_edad.replace('_', ' ')
        
        # Ensure weight format matches JSON exactly
        peso_formatted = peso
        if peso.startswith('-'):
            peso_formatted = f"-{int(float(peso[1:]))}"  # Convert -45.0 to -45
        elif peso.startswith('+'):
            peso_formatted = f"+{int(float(peso[1:]))}"  # Convert +65.0 to +65
            
        return f"{nivel} {division} {sexo} {peso_formatted}"
    
    def agrupar_y_exportar(self, df, carpeta_salida="categorias_exportadas"):
        """
        Agrupa los participantes y exporta a archivos Excel separados.
        
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


def main():
    """Función principal del script."""
    parser = argparse.ArgumentParser(
        description="Agrupa participantes de taekwondo según criterios oficiales"
    )
    parser.add_argument(
        "archivo_excel", 
        help="Archivo Excel con los participantes"
    )
    parser.add_argument(
        "-o", "--output", 
        default="categorias_exportadas",
        help="Carpeta de salida (default: categorias_exportadas)"
    )
    parser.add_argument(
        "-c", "--categorias",
        default="categorias_taekwondo.json",
        help="Archivo JSON con categorías (default: categorias_taekwondo.json)"
    )
    
    args = parser.parse_args()
    
    print("🥋 AGRUPADOR DE PARTICIPANTES DE TAEKWONDO 🥋")
    print("=" * 50)
    
    try:
        # Crear agrupador
        agrupador = AgrupadorTaekwondo(args.categorias)
        
        # Procesar participantes
        print(f"\n📊 Procesando: {args.archivo_excel}")
        df = agrupador.procesar_participantes(args.archivo_excel)
        
        if df is not None and len(df) > 0:
            # Agrupar y exportar
            print(f"\n📁 Exportando a: {args.output}")
            agrupador.agrupar_y_exportar(df, args.output)
        else:
            print("✗ No se pudieron procesar los participantes")
            
    except Exception as e:
        print(f"✗ Error: {e}")


if __name__ == "__main__":
    main() 