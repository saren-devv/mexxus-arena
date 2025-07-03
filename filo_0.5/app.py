from flask import Flask, render_template, request, send_file, flash, redirect, url_for, jsonify
import os
from werkzeug.utils import secure_filename
from agrupador_multiple import AgrupadorMultiple
import tempfile
import shutil
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'your-secret-key-123'  # Change this to a secure secret key in production

# Configure upload folder
UPLOAD_FOLDER = os.path.abspath('uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Configure allowed extensions
ALLOWED_EXTENSIONS = {'xls', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET', 'POST'])
def index():
    # Check if this is a status check request
    if request.args.get('check_status') == 'true':
        # Check if both files exist
        pdf_files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.pdf')]
        excel_files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('SOLOS.xlsx')]
        if pdf_files and excel_files:
            return jsonify({'status': 'success'})
        return jsonify({'status': 'processing'})
    
    # Check if this is a download request
    file_type = request.args.get('download')
    if file_type in ['pdf', 'excel']:
        if file_type == 'pdf':
            # Get the most recent PDF file
            pdf_files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.pdf')]
            if pdf_files:
                latest_pdf = max(pdf_files, key=lambda x: os.path.getctime(os.path.join(UPLOAD_FOLDER, x)))
                pdf_path = os.path.join(UPLOAD_FOLDER, latest_pdf)
                try:
                    return send_file(
                        str(pdf_path),
                        as_attachment=True,
                        download_name=latest_pdf,
                        mimetype='application/pdf'
                    )
                except Exception as e:
                    logger.error(f"Error al enviar el archivo PDF: {str(e)}")
                    return jsonify({'error': str(e)}), 500
            else:
                return jsonify({'error': 'No PDF file found'}), 404
        else:  # excel
            # Get the SOLOS.xlsx file
            excel_path = os.path.join(UPLOAD_FOLDER, 'SOLOS.xlsx')
            if os.path.exists(excel_path):
                try:
                    return send_file(
                        str(excel_path),
                        as_attachment=True,
                        download_name='SOLOS.xlsx',
                        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    )
                except Exception as e:
                    logger.error(f"Error al enviar el archivo Excel: {str(e)}")
                    return jsonify({'error': str(e)}), 500
            else:
                return jsonify({'error': 'No Excel file found'}), 404

    if request.method == 'POST':
        # Check if a file was uploaded
        if 'participants' not in request.files:
            flash('No se seleccionó ningún archivo', 'error')
            return redirect(request.url)
        
        file = request.files['participants']
        
        # If no file was selected
        if file.filename == '':
            flash('No se seleccionó ningún archivo', 'error')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            try:
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
                    
                    # Process the file
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
                                
                                # Return success status - the actual downloads will be handled by separate requests
                                return jsonify({
                                    'status': 'success',
                                    'files': {
                                        'pdf': permanent_filename,
                                        'excel': 'SOLOS.xlsx'
                                    }
                                })
                            else:
                                logger.error(f"PDF no encontrado en la ruta: {pdf_path}")
                                flash('El archivo PDF generado no se encuentra en la ubicación esperada', 'error')
                                return redirect(url_for('index', status='error'))
                        else:
                            logger.error("No se encontró la ruta del PDF en el resultado")
                            flash('Error al obtener la ruta del PDF generado', 'error')
                            return redirect(url_for('index', status='error'))
                    else:
                        logger.error("No se encontraron participantes válidos")
                        flash('No se encontraron participantes válidos en el archivo', 'error')
                        return redirect(url_for('index', status='error'))
                
                finally:
                    # Clean up temporary directory
                    try:
                        shutil.rmtree(temp_dir)
                        logger.info(f"Directorio temporal eliminado: {temp_dir}")
                    except Exception as e:
                        logger.error(f"Error al eliminar directorio temporal: {str(e)}")
                
            except Exception as e:
                logger.error(f"Error en el procesamiento: {str(e)}")
                flash(f'Error al procesar el archivo: {str(e)}', 'error')
                return redirect(url_for('index', status='error'))
        else:
            flash('Tipo de archivo no permitido. Use archivos .xls o .xlsx', 'error')
            return redirect(url_for('index', status='error'))
    
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True) 