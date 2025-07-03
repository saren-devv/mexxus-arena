#!/usr/bin/env python3
"""
MEXXUS ARENA - Backend Startup Script
====================================

Script to check dependencies and start the Flask backend server.
"""

import sys
import subprocess
import os

def check_dependencies():
    """Check if all required packages are installed."""
    required_packages = [
        'pandas', 'openpyxl', 'flask', 'flask_cors', 
        'reportlab', 'PIL', 'cv2', 'numpy'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'PIL':
                import PIL
            elif package == 'cv2':
                import cv2
            elif package == 'flask_cors':
                import flask_cors
            else:
                __import__(package)
            print(f"✅ {package} - OK")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} - MISSING")
    
    return missing_packages

def install_dependencies():
    """Install missing dependencies."""
    print("\n🔧 Installing missing dependencies...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False

def start_server():
    """Start the Flask backend server."""
    print("\n🚀 Starting MEXXUS ARENA Backend Server...")
    try:
        from bracket_generator import app
        app.run(debug=True, port=5500, host='localhost')
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return False

def main():
    print("🥋 MEXXUS ARENA - Backend Server 🥋")
    print("=" * 50)
    
    # Check if required directories exist
    directories = ['bracket_templates', 'fonts', 'uploads', 'results']
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"📁 Created directory: {directory}")
    
    # Check dependencies
    print("\n🔍 Checking dependencies...")
    missing = check_dependencies()
    
    if missing:
        print(f"\n⚠️ Missing packages: {', '.join(missing)}")
        install_choice = input("Do you want to install missing dependencies? (y/n): ")
        
        if install_choice.lower() == 'y':
            if install_dependencies():
                print("\n✅ All dependencies installed!")
            else:
                print("\n❌ Failed to install dependencies. Please install manually:")
                print("pip install -r requirements.txt")
                sys.exit(1)
        else:
            print("\n❌ Cannot start server without required dependencies.")
            sys.exit(1)
    else:
        print("\n✅ All dependencies are installed!")
    
    # Check if essential files exist
    essential_files = ['categorias_taekwondo.json']
    missing_files = [f for f in essential_files if not os.path.exists(f)]
    
    if missing_files:
        print(f"\n⚠️ Missing essential files: {', '.join(missing_files)}")
        print("Please make sure all required files are in place.")
    
    # Start server
    start_server()

if __name__ == "__main__":
    main() 