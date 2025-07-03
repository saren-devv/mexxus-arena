try:
    from flask import Flask, request, render_template, send_file, redirect, url_for, flash  # type: ignore
except ImportError:
    raise ImportError("Flask library not found. Please install it with 'pip install flask'.")
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import pandas as pd
import sys
from pathlib import Path
import time
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import tempfile
import re
import random
import requests
import urllib.parse

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# Folders for templates and results
TEMPLATE_FOLDER = 'bracket_templates'
OUTPUT_FOLDER = 'results'
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Custom font configuration
CUSTOM_FONTS = {
    'category': {
        'google_font': 'Anton',  # Bold, impactful font for categories
        'size': 48,
        'file': 'fonts/Anton-Regular.ttf'  # Direct path to the font file
    },
    'names': {
        'google_font': 'Roboto',  # Clean, modern font for participant names
        'size': 20,
        'file': 'fonts/Roboto-Regular.ttf'  # Direct path to the font file
    }
}

# Default font paths for different operating systems
FONT_PATHS = {
    'win32': [
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/segoeui.ttf',
    ],
    'darwin': [  # macOS
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/Arial.ttf',
    ],
    'linux': [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        '/usr/share/fonts/TTF/Arial.ttf',
    ]
}

def load_font(font_type='regular', font_category='names'):
    """
    Load a font for use in brackets.
    
    Args:
        font_type (str): 'regular' or 'bold'
        font_category (str): 'category' or 'names'
        
    Returns:
        ImageFont: The loaded font
    """
    try:
        config = CUSTOM_FONTS[font_category]
        print(f"\nAttempting to load font for {font_category}...")
        
        # Try to use the manually added font file
        font_path = os.path.join(os.path.dirname(__file__), config['file'])
        print(f"Looking for font file at: {font_path}")
        
        if os.path.exists(font_path):
            try:
                font = ImageFont.truetype(font_path, config['size'])
                print(f"Successfully loaded {config['google_font']} font with size {config['size']}")
                return font
            except Exception as e:
                print(f"Error loading font file {font_path}: {str(e)}")
        else:
            print(f"Font file not found at {font_path}")
        
        # If manual font fails, try system fonts
        print("Manual font failed, trying system fonts...")
        if sys.platform in FONT_PATHS:
            for font_path in FONT_PATHS[sys.platform]:
                if os.path.exists(font_path):
                    try:
                        font = ImageFont.truetype(font_path, config['size'])
                        print(f"Loaded system font: {font_path}")
                        return font
                    except Exception:
                        continue
        
        # If all else fails, use default font
        print("WARNING: All font loading attempts failed, using default font")
        return ImageFont.load_default()
    except Exception as e:
        print(f"Warning: Could not load font ({e}), falling back to default")
        return ImageFont.load_default()

# -- Detection Functions --

def detect_free_line_positions(
    image_path,
    line_length_thresh=20,
    hough_threshold=30,
    min_line_gap=5,
    merge_gap=10,
    branch_width=5,
    branch_height=5
):
    pil_img = Image.open(image_path)
    gray = np.array(pil_img.convert('L'))
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    binary_bool = binary > 0
    
    # Add edge detection to improve line detection
    edges = cv2.Canny(binary, 50, 150, apertureSize=3)
    
    lines = cv2.HoughLinesP(
        edges,
        1, np.pi/180,
        threshold=hough_threshold,
        minLineLength=line_length_thresh,
        maxLineGap=min_line_gap
    )
    
    centers = []
    if lines is not None:
        for x1, y1, x2, y2 in lines[:,0]:
            if abs(y1 - y2) > 10 or abs(x2 - x1) < line_length_thresh/2:
                continue
            if x2 < x1:
                x1, x2 = x2, x1
            xs, xe = max(x1-branch_width,0), x1
            ys, ye = max(y1-branch_height,0), min(y1+branch_height, binary_bool.shape[0])
            centers.append(((x1+x2)//2, (y1+y2)//2))
    
    # CLASIFICAR CENTRO POR Y 
    centers.sort(key=lambda c:c[1])
    
    # DIVIDE LOS CENTROS   
    merged = []
    for cx, cy in centers:
        if not any(abs(cy-mcy)<merge_gap and abs(cx-mcx)<merge_gap for mcx,mcy in merged):
            merged.append((cx, cy))
    
    # DETECTAR LINEAS X 
    if not merged:
        lines = cv2.HoughLinesP(
            edges,
            1, np.pi/180,
            threshold=20,
            minLineLength=10,
            maxLineGap=10
        )
        if lines is not None:
            for x1, y1, x2, y2 in lines[:,0]:
                if abs(y1 - y2) <= 5:
                    merged.append(((x1+x2)//2, (y1+y2)//2))
    
    return merged

def detect_color_positions(
    image_path,
    area_thresh=20
):
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot open image: {image_path}")
    
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Expanded color ranges
    color_ranges = [
        # Red ranges (expanded)
        (np.array([0,50,50]), np.array([10,255,255])),
        (np.array([160,50,50]), np.array([179,255,255])),
        # Blue range (expanded)
        (np.array([90,50,50]), np.array([130,255,255])),
        # Black range
        (np.array([0,0,0]), np.array([180,255,50])),
    ]
    
    mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for low, high in color_ranges:
        color_mask = cv2.inRange(hsv, low, high)
        mask = cv2.bitwise_or(mask, color_mask)
    
    # Improve circle detection
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    centers = []
    for cnt in contours:
        if cv2.contourArea(cnt) < area_thresh:
            continue
            
        # Check circularity
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * cv2.contourArea(cnt) / (perimeter * perimeter)
        if circularity < 0.5:
            continue
            
        M = cv2.moments(cnt)
        if M['m00'] == 0:
            continue
            
        cx = int(M['m10']/M['m00'])
        cy = int(M['m01']/M['m00'])
        centers.append((cx, cy))
    
    # If no circles found, try to detect dots at the start of lines
    if not centers:
        # Find the leftmost point of each horizontal line
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in contours:
            if cv2.contourArea(cnt) > 10:
                leftmost = tuple(cnt[cnt[:,:,0].argmin()][0])
                centers.append(leftmost)
    
    # Sort by y coordinate primarily, then x coordinate
    centers.sort(key=lambda c: (c[1], c[0]))
    
    return centers

# -- Main marker function --

def mark_positions(
    image_path,
    participants,
    output_path,
    category_name=None,
    font_path=None,
    font_size=None,
    margin=25,
    line_params=None,
    color_params=None
):
    """
    Mark participant positions on a bracket template.
    """
    # Open image and convert to RGB
    pil_img = Image.open(image_path).convert('RGB')
    scale_factor = 2  # Double the resolution
    high_res_img = pil_img.resize((pil_img.width * scale_factor, pil_img.height * scale_factor), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(high_res_img)
    
    # Get positions for participants
    free_lines = detect_free_line_positions(image_path, **(line_params or {}))
    circles = detect_color_positions(image_path, **(color_params or {}))
    
    # Handle case where we have more participants than detected positions
    count = min(len(participants), max(len(circles), len(free_lines)))
    participants = participants[:count]
    
    # If no circles detected, use the start of lines as positions
    if not circles and free_lines:
        circles = [(x-10, y) for x, y in free_lines]
    
    # Ensure we have enough circles
    while len(circles) < count:
        if free_lines:
            circles.append((free_lines[0][0]-10, free_lines[0][1]))
    
    circles = circles[:count]
    remaining_lines = free_lines.copy() if free_lines else []
    
    # If no lines detected but we have circles, create virtual lines
    if not remaining_lines and circles:
        for cx, cy in circles:
            remaining_lines.append((cx + 400, cy))  # Keep extended line length
    
    assignments = []
    for name, (cx, cy) in zip(participants, circles):
        best_idx, best_dist = None, float('inf')
        for i, (lx, ly) in enumerate(remaining_lines):
            d = (lx-cx)**2 + (ly-cy)**2
            if d < best_dist:
                best_dist, best_idx = d, i
        if best_idx is not None:
            assignments.append((name, (cx, cy), remaining_lines.pop(best_idx)))
        else:
            # If no line found, create a virtual line
            virtual_line = (cx + 400, cy)  # Keep extended line length
            assignments.append((name, (cx, cy), virtual_line))
    
    # Load fonts for category and names
    category_font = load_font('bold', 'category')
    names_font = load_font('regular', 'names')
    
    print("Loaded fonts:")
    print(f"Category font: {category_font}")
    print(f"Names font: {names_font}")
    
    # Add category name at the top if provided
    if category_name:
        # Calculate position for category name
        bbox = draw.textbbox((0,0), category_name, font=category_font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        
        # Position category name on the left with some margin
        tx = margin * 2 * scale_factor
        ty = margin * 1.5 * scale_factor
        
        # Draw a subtle underline
        underline_y = ty + th + margin * 0.75 * scale_factor
        draw.line([(tx, underline_y), (tx + tw + margin * scale_factor, underline_y)], 
                 fill=(0,0,0), width=1 * scale_factor)
        
        # Draw the category name
        draw.text((tx, ty), category_name, font=category_font, fill=(0,0,0))
    
    # Draw participant names
    for name, (cx, cy), (lx, ly) in assignments:
        # Scale coordinates for high resolution
        cx, cy = cx * scale_factor, cy * scale_factor
        lx, ly = lx * scale_factor, ly * scale_factor
        
        bbox = draw.textbbox((0,0), name, font=names_font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        
        # Calculate position along the line
        line_length = lx - cx
        text_position = 0.85  # Place text at 85% along the line
        tx = cx + (line_length * text_position) - (tw // 2)  # Center text at position
        
        # Calculate vertical offset
        vertical_offset = min(
            th + margin * scale_factor * 0.4,
            max(
                th + margin * scale_factor * 0.6,
                line_length * 0.04
            )
        )
        ty = ly - vertical_offset  # Position text above the line
        
        # Draw text
        draw.text((tx, ty), name, font=names_font, fill=(0,0,0))
    
    # Resize back to original size with high-quality downsampling
    final_img = high_res_img.resize(pil_img.size, Image.Resampling.LANCZOS)
    
    # Convert to RGB before saving
    final_img = final_img.convert('RGB')
    
    # Save with high quality
    final_img.save(output_path, format='JPEG', quality=95)

def create_bracket_image(template_path, participants, output_path, font_path=None, font_size=None, category_name=None):
    """Create a bracket image with participant names."""
    # Load and scale up the template image
    template = Image.open(template_path)
    if template.mode != 'RGB':
        template = template.convert('RGB')
    scale_factor = 2
    img = template.resize((template.width * scale_factor, template.height * scale_factor), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(img)
    
    # Get system font if not provided
    if not font_path or not font_size:
        font_size = 40 * scale_factor if not font_size else font_size * scale_factor
        font = load_font(font_type='regular', font_category='names')
    else:
        font = ImageFont.truetype(font_path, font_size * scale_factor)
    
    # Try to load Arial Bold for category name
    try:
        category_font = ImageFont.truetype("arialbd.ttf", 72)  # Much larger font for category
    except:
        try:
            # Try to load from script directory
            category_font = ImageFont.truetype(os.path.join(os.path.dirname(__file__), "arialbd.ttf"), 72)
        except:
            # If Arial Bold not available, use regular font but larger
            category_font = load_font(font_type='regular', font_category='category')
    
    # Draw category name at the top if provided
    if category_name:
        # Get text dimensions for centering
        text_bbox = draw.textbbox((0, 0), category_name, font=category_font)
        text_width = text_bbox[2] - text_bbox[0]
        x = (img.width - text_width) // 2
        y = 40  # Position from top
        
        # Draw text twice to simulate bold if not using Arial Bold
        draw.text((x, y), category_name, fill="black", font=category_font)
        if "arialbd.ttf" not in str(category_font):
            draw.text((x+2, y), category_name, fill="black", font=category_font)
    
    # Get positions for participant names
    positions = detect_color_positions(template_path)
    if not positions:
        positions = detect_free_line_positions(template_path)
    
    # Ensure we have enough positions
    while len(positions) < len(participants):
        positions.append((100, 100 + len(positions) * 50))
    
    # Scale positions to match resized image
    scaled_positions = [(x * scale_factor, y * scale_factor) for x, y in positions]
    
    # Draw participant names
    for (x, y), name in zip(scaled_positions, participants):
        draw.text((x + 10, y - font_size//2), name, fill="black", font=font)
    
    # Save the image
    img.save(output_path, quality=95, dpi=(300, 300))
    return output_path

def create_vertical_pdf(bracket_files, output_pdf):
    # A4 dimensions in pixels at 300 DPI
    A4_WIDTH_PIXELS = 2480  # 8.27 inches * 300 DPI
    A4_HEIGHT_PIXELS = 3508  # 11.69 inches * 300 DPI
    
    # Minimal margins in pixels
    MARGIN_TOP = 50
    MARGIN_BOTTOM = 50
    MARGIN_SIDES = 50
    SPACE_BETWEEN = 50  # Space between brackets
    
    # Calculate available space in pixels
    available_width = A4_WIDTH_PIXELS - (2 * MARGIN_SIDES)
    available_height = (A4_HEIGHT_PIXELS - (2 * MARGIN_TOP + SPACE_BETWEEN)) / 2
    
    # Create PDF with maximum quality settings
    c = canvas.Canvas(output_pdf, pagesize=A4)
    c.setTitle("Tournament Brackets")
    
    # Process brackets two at a time
    for i in range(0, len(bracket_files), 2):
        # Create new page if not first page
        if i > 0:
            c.showPage()
            c.setTitle("Tournament Brackets")
        
        # Load and process first bracket
        img1 = Image.open(bracket_files[i])
        
        # Calculate scaling to fit width while maintaining aspect ratio
        scale_factor = available_width / img1.size[0]
        new_width = int(img1.size[0] * scale_factor)
        new_height = int(img1.size[1] * scale_factor)
        
        # If height is too large, scale based on height instead
        if new_height > available_height:
            scale_factor = available_height / img1.size[1]
            new_width = int(img1.size[0] * scale_factor)
            new_height = int(img1.size[1] * scale_factor)
        
        # Scale image with high quality
        img1 = img1.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save temporary file with maximum quality
        temp1 = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        img1.save(temp1.name, 'JPEG', quality=100)
        
        # Convert pixel measurements to points for PDF
        width_in_points = new_width * 72 / 300  # Convert pixels to points
        height_in_points = new_height * 72 / 300
        x_offset = (MARGIN_SIDES * 72 / 300) + ((available_width * 72 / 300) - width_in_points) / 2
        
        # Draw first image at top
        c.drawImage(
            temp1.name,
            x_offset,
            A4_HEIGHT_PIXELS - (MARGIN_TOP * 72 / 300) - height_in_points,
            width=width_in_points,
            height=height_in_points,
            preserveAspectRatio=True,
            mask='auto'
        )
        
        # Process second bracket if available
        if i + 1 < len(bracket_files):
            img2 = Image.open(bracket_files[i + 1])
            img2 = img2.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            temp2 = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            img2.save(temp2.name, 'JPEG', quality=100)
            
            # Draw second image at bottom
            c.drawImage(
                temp2.name,
                x_offset,
                MARGIN_BOTTOM * 72 / 300,
                width=width_in_points,
                height=height_in_points,
                preserveAspectRatio=True,
                mask='auto'
            )
            
            # Clean up temporary file
            temp2.close()
            os.unlink(temp2.name)
        
        # Clean up first temporary file
        temp1.close()
        os.unlink(temp1.name)
    
    # Set maximum quality PDF settings
    c.setLineCap(1)
    c.setLineJoin(1)
    c.setLineWidth(0.5)
    c.setPageCompression(0)  # Disable compression for maximum quality
    c.save()

def generar_nombre_archivo(categoria):
    """
    Genera un nombre de archivo válido para el bracket, preservando la categoría de peso.
    
    Args:
        categoria (str): Nombre completo de la categoría
        
    Returns:
        str: Nombre de archivo válido con la categoría de peso preservada
    """
    # Split the category name to isolate components
    partes = categoria.split()
    peso = partes[-1]  # Get the weight category
    nivel = partes[0]  # Get the level (Festival/Noveles)
    genero = partes[-2]  # Get gender
    division = ' '.join(partes[1:-2])  # Get the division (INFANTIL A/B/C, etc)
    
    # Join all parts except weight
    nombre_base = f"{nivel} {division} {genero}"
    
    # Clean invalid characters
    nombre_base = re.sub(r'[<>:"/\\|?*\[\]]', '_', nombre_base)
    peso = re.sub(r'[<>:"/\\|?*\[\]]', '_', peso)
    
    # Combine with weight, ensuring the weight category is preserved
    # Calculate available space for division
    espacio_disponible = 255 - len(f"{nivel} {genero} {peso}") - 2  # -2 for spaces
    if espacio_disponible > 0:
        division = division[:espacio_disponible]
    nombre_archivo = f"{nivel} {division} {genero} {peso}"
    
    return nombre_archivo

def generar_bracket_categoria(categoria, participantes, carpeta_salida, plantillas_path="bracket_templates"):
    """
    Genera un bracket para una categoría específica.
    
    Args:
        categoria (str): Nombre de la categoría
        participantes (list): Lista de participantes en la categoría
        carpeta_salida (str): Carpeta donde guardar los archivos generados
        plantillas_path (str): Ruta a la carpeta con las plantillas de brackets
        
    Returns:
        str: Ruta del archivo generado o None si hubo error
    """
    try:
        num_participantes = len(participantes)
        if num_participantes < 2:
            print(f"⚠️ No se puede generar bracket para {categoria}: menos de 2 participantes")
            return None
        
        # Determinar plantilla a usar
        template_path = os.path.join(plantillas_path, f"{num_participantes}.png")
        if not os.path.exists(template_path):
            print(f"⚠️ No hay plantilla para {num_participantes} participantes")
            return None
        
        # Generar nombre de archivo
        nombre_archivo = generar_nombre_archivo(categoria)
        output_path = os.path.join(carpeta_salida, "brackets", f"{nombre_archivo}_bracket.jpg")
        
        # Crear carpeta si no existe
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Cargar imagen template
        img = Image.open(template_path)
        
        # Convertir a RGB si es necesario
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Escalar imagen para mejor calidad
        scale_factor = 2
        img = img.resize((img.width * scale_factor, img.height * scale_factor), Image.Resampling.LANCZOS)
        
        # Crear objeto para dibujar
        draw = ImageDraw.Draw(img)
        
        # Cargar fuentes usando el nuevo sistema
        font_categoria = load_font('bold', 'category')
        font_nombres = load_font('regular', 'names')
        
        # Dibujar título de categoría centrado en la parte superior
        w, h = img.size
        text_bbox = draw.textbbox((0, 0), categoria, font=font_categoria)
        text_width = text_bbox[2] - text_bbox[0]
        x = (w - text_width) // 2
        y = 40  # Position from top
        
        # Draw text twice to simulate bold if not using a bold font
        draw.text((x, y), categoria, fill="black", font=font_categoria)
        if "bold" not in str(font_categoria).lower() and "bd" not in str(font_categoria).lower():
            draw.text((x+2, y), categoria, fill="black", font=font_categoria)
        
        # Posicionar nombres según plantilla
        posiciones = []
        if num_participantes == 2:
            posiciones = [(100, 200), (100, 400)]
        elif num_participantes == 3:
            posiciones = [(100, 150), (100, 300), (100, 450)]
        elif num_participantes == 4:
            posiciones = [(100, 100), (100, 250), (100, 400), (100, 550)]
        elif num_participantes == 5:
            posiciones = [(100, 100), (100, 200), (100, 300), (100, 400), (100, 500)]
        elif num_participantes == 6:
            posiciones = [(100, 100), (100, 200), (100, 300), (100, 400), (100, 500), (100, 600)]
        elif num_participantes == 7:
            posiciones = [(100, 100), (100, 200), (100, 300), (100, 400), (100, 500), (100, 600), (100, 700)]
        
        # Escalar posiciones
        posiciones = [(x * scale_factor, y * scale_factor) for x, y in posiciones]
        
        # Aleatorizar orden de participantes
        random.shuffle(participantes)
        
        # Dibujar nombres
        for i, (nombre, pos) in enumerate(zip(participantes, posiciones)):
            nombre_completo = f"{nombre['nombres']} {nombre['apellidos']}"
            draw.text(pos, nombre_completo, fill="black", font=font_nombres)
        
        # Guardar imagen
        img.save(output_path, quality=95, dpi=(300, 300))
        print(f"  ✅ Bracket generado: {os.path.basename(output_path)}")
        return output_path
        
    except Exception as e:
        print(f"❌ Error generando bracket para {categoria}: {str(e)}")
        return None

# -- Routes --

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        excel_file = request.files.get('participants')
        if not excel_file:
            flash('No se subió el archivo de participantes', 'error')
            return redirect(request.url)
        excel_path = os.path.join(OUTPUT_FOLDER, excel_file.filename)
        excel_file.save(excel_path)
        
        # Extract and format category name from filename
        filename_without_ext = os.path.splitext(excel_file.filename)[0]
        category_parts = filename_without_ext.split('_')
        category_name = ' '.join(category_parts).upper()
        
        df = pd.read_excel(excel_path)
        participants = (df['NOMBRES'] + ' ' + df['APELLIDOS']).tolist()
        count = len(participants)
        template_name = f"{count}-Team-Single-Elimination.png"
        template_path = os.path.join(TEMPLATE_FOLDER, template_name)
        if not os.path.exists(template_path):
            flash(f"No existe plantilla para {count} atletas", 'error')
            return redirect(request.url)
        output_filename = f"filled_{count}_team.jpg"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        create_bracket_image(
            template_path=template_path,
            participants=participants,
            output_path=output_path,
            category_name=category_name
        )
        return redirect(url_for('result', filename=output_filename))
    return render_template('index.html')

@app.route('/result/<filename>')
def result(filename):
    return send_file(os.path.join(OUTPUT_FOLDER, filename), mimetype='image/jpeg')

if __name__ == '__main__':
    app.run(debug=True)
