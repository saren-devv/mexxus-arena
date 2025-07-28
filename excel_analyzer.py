#!/usr/bin/env python3
"""
Analizador de archivos Excel para importación de atletas en MEXXUS ARENA
Valida y procesa archivos Excel con datos de atletas para importación masiva.
"""

import pandas as pd
import json
import sys
import os
from datetime import datetime
import re

class ExcelAnalyzer:
    def __init__(self):
        self.required_columns = {
            'NOMBRE': ['nombre', 'nombres', 'name', 'first_name'],
            'APELLIDOS': ['apellidos', 'apellido', 'last_name', 'surname'],
            'DNI': ['dni', 'documento', 'identificacion', 'id', 'cedula'],
            'FECHA DE NACIMIENTO': ['fecha de nacimiento', 'fecha_nacimiento', 'birth_date', 'nacimiento', 'fecha'],
            'SEXO': ['sexo', 'genero', 'gender']
        }
        
    def analyze_excel_file(self, file_path):
        """
        Analiza un archivo Excel y valida que contenga las columnas requeridas.
        
        Args:
            file_path (str): Ruta al archivo Excel
            
        Returns:
            dict: Resultado del análisis con estado, mensajes y datos procesados
        """
        try:
            # Verificar que el archivo existe
            if not os.path.exists(file_path):
                return {
                    'success': False,
                    'error': 'El archivo no existe',
                    'data': None
                }
            
            # Leer el archivo Excel
            try:
                df = pd.read_excel(file_path)
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Error al leer el archivo Excel: {str(e)}',
                    'data': None
                }
            
            # Validar que el archivo no esté vacío
            if df.empty:
                return {
                    'success': False,
                    'error': 'El archivo Excel está vacío',
                    'data': None
                }
            
            # Obtener las columnas del archivo
            file_columns = [col.strip().upper() for col in df.columns]
            
            # Mapear columnas del archivo a columnas requeridas
            column_mapping = self._map_columns(file_columns)
            
            # Validar que todas las columnas requeridas estén presentes
            missing_columns = []
            for required_col, mapped_col in column_mapping.items():
                if not mapped_col:
                    missing_columns.append(required_col)
            
            if missing_columns:
                return {
                    'success': False,
                    'error': f'Columnas faltantes: {", ".join(missing_columns)}',
                    'data': None,
                    'file_columns': file_columns,
                    'required_columns': list(self.required_columns.keys())
                }
            
            # Procesar y validar los datos
            processed_data = self._process_data(df, column_mapping)
            
            return {
                'success': True,
                'message': f'Archivo analizado correctamente. {len(processed_data)} atletas encontrados.',
                'data': processed_data,
                'total_rows': len(df),
                'valid_rows': len(processed_data),
                'invalid_rows': len(df) - len(processed_data)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error inesperado: {str(e)}',
                'data': None
            }
    
    def _map_columns(self, file_columns):
        """
        Mapea las columnas del archivo a las columnas requeridas.
        
        Args:
            file_columns (list): Lista de columnas del archivo
            
        Returns:
            dict: Mapeo de columnas requeridas a columnas del archivo
        """
        mapping = {}
        
        for required_col, possible_names in self.required_columns.items():
            mapping[required_col] = None
            
            # Buscar coincidencias exactas primero
            for name in possible_names:
                if name.upper() in file_columns:
                    mapping[required_col] = name.upper()
                    break
            
            # Si no hay coincidencia exacta, buscar coincidencias parciales
            if not mapping[required_col]:
                for file_col in file_columns:
                    for name in possible_names:
                        if name.upper() in file_col or file_col in name.upper():
                            mapping[required_col] = file_col
                            break
                    if mapping[required_col]:
                        break
        
        return mapping
    
    def _process_data(self, df, column_mapping):
        """
        Procesa y valida los datos del DataFrame.
        
        Args:
            df (DataFrame): DataFrame con los datos
            column_mapping (dict): Mapeo de columnas
            
        Returns:
            list: Lista de atletas procesados y validados
        """
        processed_atletas = []
        
        for index, row in df.iterrows():
            try:
                # Extraer datos según el mapeo de columnas
                atleta = {
                    'nombres': str(row[column_mapping['NOMBRE']]).strip(),
                    'apellidos': str(row[column_mapping['APELLIDOS']]).strip(),
                    'dni': str(row[column_mapping['DNI']]).strip(),
                    'fechaNacimiento': self._process_date(row[column_mapping['FECHA DE NACIMIENTO']]),
                    'sexo': self._process_sex(row[column_mapping['SEXO']])
                }
                
                # Validar datos
                if self._validate_atleta(atleta):
                    processed_atletas.append(atleta)
                    
            except Exception as e:
                print(f"Error procesando fila {index + 1}: {str(e)}")
                continue
        
        return processed_atletas
    
    def _process_date(self, date_value):
        """
        Procesa y valida la fecha de nacimiento.
        
        Args:
            date_value: Valor de fecha del Excel
            
        Returns:
            str: Fecha en formato YYYY-MM-DD o None si es inválida
        """
        try:
            if pd.isna(date_value):
                return None
            
            # Si es un string, intentar parsearlo
            if isinstance(date_value, str):
                # Intentar diferentes formatos de fecha
                date_formats = [
                    '%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%Y/%m/%d',
                    '%d/%m/%y', '%d-%m-%y', '%y-%m-%d', '%y/%m/%d'
                ]
                
                for fmt in date_formats:
                    try:
                        parsed_date = datetime.strptime(date_value, fmt)
                        return parsed_date.strftime('%Y-%m-%d')
                    except ValueError:
                        continue
                
                return None
            
            # Si es un objeto datetime de pandas
            if hasattr(date_value, 'strftime'):
                return date_value.strftime('%Y-%m-%d')
            
            return None
            
        except Exception:
            return None
    
    def _process_sex(self, sex_value):
        """
        Procesa y valida el sexo.
        
        Args:
            sex_value: Valor de sexo del Excel
            
        Returns:
            str: Sexo normalizado o None si es inválido
        """
        try:
            if pd.isna(sex_value):
                return None
            
            sex_str = str(sex_value).strip().upper()
            
            # Mapear diferentes formas de escribir el sexo
            sex_mapping = {
                'M': 'Masculino',
                'MASCULINO': 'Masculino',
                'MALE': 'Masculino',
                'HOMBRE': 'Masculino',
                'H': 'Masculino',
                'F': 'Femenino',
                'FEMENINO': 'Femenino',
                'FEMALE': 'Femenino',
                'MUJER': 'Femenino'
            }
            
            return sex_mapping.get(sex_str, None)
            
        except Exception:
            return None
    
    def _validate_atleta(self, atleta):
        """
        Valida los datos de un atleta.
        
        Args:
            atleta (dict): Datos del atleta
            
        Returns:
            bool: True si los datos son válidos
        """
        # Validar nombres
        if not atleta['nombres'] or atleta['nombres'] == 'nan':
            return False
        
        # Validar apellidos
        if not atleta['apellidos'] or atleta['apellidos'] == 'nan':
            return False
        
        # Validar DNI (debe ser numérico y tener 8 dígitos)
        if not atleta['dni'] or atleta['dni'] == 'nan':
            return False
        
        dni_clean = re.sub(r'[^0-9]', '', atleta['dni'])
        if len(dni_clean) != 8:
            return False
        
        atleta['dni'] = dni_clean
        
        # Validar fecha de nacimiento
        if not atleta['fechaNacimiento']:
            return False
        
        # Validar sexo
        if not atleta['sexo']:
            return False
        
        return True

def main():
    """
    Función principal para ejecutar desde línea de comandos.
    """
    if len(sys.argv) != 2:
        print("Uso: python excel_analyzer.py <ruta_al_archivo_excel>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    analyzer = ExcelAnalyzer()
    
    result = analyzer.analyze_excel_file(file_path)
    
    # Imprimir resultado en formato JSON
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main() 