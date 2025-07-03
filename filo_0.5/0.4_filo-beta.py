#!/usr/bin/env python3
"""
Example Usage - FILO 0.3-beta Complete Tournament Generator
========================================================

This script demonstrates how to use the multiple grouper to generate
a complete tournament with:
- Single Excel with all categories
- Automatically generated brackets
- PDF with all brackets

Author: AI Assistant
Date: 2024
"""

from agrupador_multiple import AgrupadorMultiple
from pathlib import Path
from category_logger import load_categories, generate_category_combinations

def validate_categories(df_participantes):
    """
    Validates that all generated categories match the official ones.
    
    Args:
        df_participantes (pandas.DataFrame): DataFrame with participants
        
    Returns:
        tuple: (bool, list) - (is_valid, list of invalid categories)
    """
    # Load official categories
    categories = load_categories()
    if not categories:
        raise Exception("Could not load official categories from categorias_taekwondo.json")
        
    # Generate all valid combinations
    valid_categories = generate_category_combinations(categories)
    
    # Get unique categories from participants
    participant_categories = df_participantes['categoria_completa'].unique()
    
    # Find invalid categories
    invalid_categories = []
    for category in participant_categories:
        if category not in valid_categories:
            invalid_categories.append(category)
    
    return len(invalid_categories) == 0, invalid_categories

def generar_torneo_completo_ejemplo():
    """
    Example of how to generate a complete tournament.
    """
    print("🥋 FILO 0.3-BETA COMPLETE TOURNAMENT GENERATOR - EXAMPLE 🥋")
    print("=" * 50)
    
    # Configuration
    archivo_excel = "inscripciones_III_Match_Internacional_de_Taekwondo___Zarumilla_2025.xlsx"
    carpeta_salida = "torneo_completo_ejemplo"
    
    # Verify file exists
    if not Path(archivo_excel).exists():
        print(f"❌ File not found: {archivo_excel}")
        print("💡 Make sure you have an Excel file with participants in the current directory")
        return
    
    try:
        # Create grouper
        agrupador = AgrupadorMultiple()
        
        # Process file
        print(f"\n📊 Processing: {archivo_excel}")
        df_participantes = agrupador.procesar_participantes(archivo_excel)
        
        if df_participantes is not None and len(df_participantes) > 0:
            # Generate complete categories
            df_participantes['categoria_completa'] = df_participantes.apply(
                lambda row: agrupador.generar_nombre_categoria(
                    row['categoria_edad'],
                    row['sexo_normalizado'], 
                    row['nivel_normalizado'],
                    row['categoria_peso']
                ), axis=1
            )
            
            # Validate categories
            print("\n🔍 Validating categories...")
            is_valid, invalid_categories = validate_categories(df_participantes)
            
            if not is_valid:
                print("❌ Found invalid categories:")
                for cat in invalid_categories:
                    print(f"  • {cat}")
                print("\n💡 Please check that all categories match the official ones in categorias_taekwondo.json")
                return
                
            print("✅ All categories are valid!")
            
            # Add source file
            df_participantes['archivo_origen'] = Path(archivo_excel).stem
            
            # Generate complete tournament
            resultados = agrupador.generar_todo_completo(df_participantes, carpeta_salida)
            
            # Show results
            print(f"\n🎉 COMPLETE TOURNAMENT GENERATED SUCCESSFULLY!")
            print(f"📂 Check folder: {Path(carpeta_salida).absolute()}")
            
            if resultados['excel_categorias']:
                print(f"✅ Single Excel: {Path(resultados['excel_categorias']).name}")
            
            if resultados['imagenes_brackets']:
                print(f"✅ Brackets generated: {len(resultados['imagenes_brackets'])}")
            
            if resultados['pdf_brackets']:
                print(f"✅ PDF created: {Path(resultados['pdf_brackets']).name}")
            
        else:
            print("❌ Could not process participants")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def generar_desde_multiples_archivos():
    """
    Example of how to generate a tournament from multiple Excel files.
    """
    print("\n" + "="*50)
    print("🥋 GENERATOR FROM MULTIPLE FILES 🥋")
    print("=" * 50)
    
    # Search for all Excel files in current directory
    archivos_excel = list(Path(".").glob("*.xlsx"))
    
    if not archivos_excel:
        print("❌ No Excel files found in current directory")
        return
    
    print(f"📁 Excel files found: {len(archivos_excel)}")
    for archivo in archivos_excel:
        print(f"  • {archivo.name}")
    
    try:
        # Create grouper
        agrupador = AgrupadorMultiple()
        
        # Process multiple files
        archivos_str = [str(archivo) for archivo in archivos_excel]
        df_combinado = agrupador.procesar_multiples_archivos(archivos_str, combinar=True)
        
        if df_combinado is not None and len(df_combinado) > 0:
            # Validate categories
            print("\n🔍 Validating categories...")
            is_valid, invalid_categories = validate_categories(df_combinado)
            
            if not is_valid:
                print("❌ Found invalid categories:")
                for cat in invalid_categories:
                    print(f"  • {cat}")
                print("\n💡 Please check that all categories match the official ones in categorias_taekwondo.json")
                return
                
            print("✅ All categories are valid!")
            
            # Generate complete tournament
            carpeta_salida = "torneo_multiple_archivos"
            resultados = agrupador.generar_todo_completo(df_combinado, carpeta_salida)
            
            print(f"\n🎉 TOURNAMENT FROM MULTIPLE FILES COMPLETED!")
            print(f"📂 Check folder: {Path(carpeta_salida).absolute()}")
            
        else:
            print("❌ Could not process files")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Run example with one file
    generar_torneo_completo_ejemplo()
    
    # Run example with multiple files
    generar_desde_multiples_archivos() 