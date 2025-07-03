// MEXXUS ARENA - Configuration
// =============================

class Config {
    constructor() {
        // Detectar si estamos en desarrollo o producción
        this.isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.hostname === '';
        
        // URLs del backend
        this.API_ENDPOINTS = {
            development: 'http://localhost:5500',
            production: 'https://mexxus-arena-backend.onrender.com' // Cambiar por tu URL de producción
        };
        
        // URL base del API
        this.API_BASE_URL = this.isDevelopment ? 
            this.API_ENDPOINTS.development : 
            this.API_ENDPOINTS.production;
    }
    
    // Obtener URL completa del endpoint
    getApiUrl(endpoint) {
        return `${this.API_BASE_URL}${endpoint}`;
    }
    
    // Endpoints específicos
    get generateBracketsUrl() {
        return this.getApiUrl('/api/generate-brackets');
    }
    
    get downloadUrl() {
        return this.getApiUrl('/api/download');
    }
    
    get healthCheckUrl() {
        return this.getApiUrl('/api/health');
    }
    
    // Actualizar URL de producción dinámicamente
    setProductionUrl(url) {
        this.API_ENDPOINTS.production = url;
        if (!this.isDevelopment) {
            this.API_BASE_URL = url;
        }
    }
    
    // Verificar si el backend está disponible
    async checkBackendHealth() {
        try {
            const response = await fetch(this.healthCheckUrl, {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.warn('Backend health check failed:', error);
            return false;
        }
    }
}

// Crear instancia global de configuración
window.mexxusConfig = new Config();

// Mostrar información de configuración en consola
console.log('🥋 MEXXUS ARENA - Configuration Loaded');
console.log('Environment:', window.mexxusConfig.isDevelopment ? 'Development' : 'Production');
console.log('API Base URL:', window.mexxusConfig.API_BASE_URL); 