#!/usr/bin/env python3
"""
Simple test script for MEXXUS ARENA Backend
"""

import time
import sys
import os

def test_backend(backend_url=None):
    try:
        import requests
        
        # Determine backend URL
        if backend_url is None:
            backend_url = os.environ.get('BACKEND_URL', 'http://localhost:5500')
        
        print("🧪 Testing MEXXUS ARENA Backend...")
        print(f"📡 Backend URL: {backend_url}")
        
        # Test health endpoint
        try:
            health_url = f"{backend_url}/api/health"
            response = requests.get(health_url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Backend is running: {data.get('message', 'OK')}")
                return True
            else:
                print(f"❌ Backend returned status code: {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to backend at {backend_url}")
            print("💡 Make sure the backend is running and accessible.")
            return False
        except Exception as e:
            print(f"❌ Error testing backend: {e}")
            return False
            
    except ImportError:
        print("❌ requests library not found. Run: pip install requests")
        return False

if __name__ == "__main__":
    # Handle command line arguments
    backend_url = None
    if len(sys.argv) > 1:
        backend_url = sys.argv[1]
        if not backend_url.startswith('http'):
            backend_url = f"https://{backend_url}"
    
    if test_backend(backend_url):
        print("\n🎉 Backend test passed! Ready to process brackets.")
        print("💡 You can now use the web application to generate brackets.")
        sys.exit(0)
    else:
        print("\n⚠️ Backend test failed. Check the server status.")
        print("💡 Usage: python test_backend.py [backend_url]")
        print("   Example: python test_backend.py your-app.railway.app")
        sys.exit(1) 