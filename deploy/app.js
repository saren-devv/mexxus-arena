// Aplicación Principal
class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // Esperar a que todos los managers estén listos
            await this.waitForManagers();
            
            // Inicializar eventos globales
            this.setupGlobalEvents();
            
            // Cargar texto de bienvenida
            await this.loadWelcomeText();
            
            // Inicializar managers
            window.eventsManager.init();
            
            // Inicializar publicEventsManager solo si estamos en la página principal
            if (document.getElementById('eventosPublicos')) {
                window.publicEventsManager.init();
            }
            
            // Manejar parámetros de URL para links compartidos
            this.handleUrlParameters();
            
            console.log('🚀 Aplicación MEXXUS ARENA inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.showError('Error al inicializar la aplicación');
        }
    }

    async waitForManagers() {
        // Esperar a que todos los managers estén disponibles
        const maxAttempts = 50;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            if (window.authManager && 
                window.eventsManager && 
                window.adminManager &&
                window.publicEventsManager) {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('No se pudieron cargar todos los managers');
    }

    setupGlobalEvents() {
        // Eventos globales de la aplicación
        
        // Cerrar modales con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Manejar errores no capturados
        window.addEventListener('error', (e) => {
            console.error('Error no capturado:', e.error);
            this.showError('Ha ocurrido un error inesperado');
        });

        // Prevenir pérdida de datos al cerrar
        window.addEventListener('beforeunload', (e) => {
            // Solo mostrar advertencia si hay formularios con datos
            const forms = document.querySelectorAll('form');
            let hasData = false;
            
            forms.forEach(form => {
                const inputs = form.querySelectorAll('input, textarea, select');
                inputs.forEach(input => {
                    if (input.value.trim() !== '') {
                        hasData = true;
                    }
                });
            });

            if (hasData) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Verificar conexión Firebase cada 30 segundos
        setInterval(() => {
            if (window.firebaseDB && window.firebaseAuth) {
                console.log('🔥 Firebase conectado correctamente');
            }
        }, 30000);
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showError(message) {
        if (window.authManager) {
            window.authManager.showMessage(message, 'error');
        } else {
            alert(message);
        }
    }

    // Métodos de utilidad global
    formatDate(dateString) {
        return window.eventsManager ? 
            window.eventsManager.formatDate(dateString) : 
            new Date(dateString + 'T00:00:00').toLocaleDateString();
    }

    // Función para exportar datos (debug) - Firebase
    async exportData() {
        if (!window.firebaseDB) {
            this.showError('Firebase no disponible');
            return;
        }
        
        try {
            // Exportar usuarios
            const usersSnapshot = await window.firebaseDB.collection('users').get();
            const users = [];
            usersSnapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });

            // Exportar eventos
            const eventosSnapshot = await window.firebaseDB.collection('eventos').get();
            const eventos = [];
            eventosSnapshot.forEach(doc => {
                eventos.push({ id: doc.id, ...doc.data() });
            });

            // Exportar inscripciones
            const inscripcionesSnapshot = await window.firebaseDB.collection('inscripciones').get();
            const inscripciones = [];
            inscripcionesSnapshot.forEach(doc => {
                inscripciones.push({ id: doc.id, ...doc.data() });
            });

            const data = {
                users,
                eventos,
                inscripciones,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `mexxus_events_backup_${new Date().toISOString().split('T')[0]}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('Datos exportados correctamente');
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.showError('Error al exportar datos');
        }
    }

    // Función para importar datos (debug) - Firebase
    importData(fileInput) {
        this.showError('Importación de datos deshabilitada con Firebase por seguridad. Use la consola de Firebase para restaurar datos.');
    }

    showSuccess(message) {
        if (window.authManager) {
            window.authManager.showMessage(message, 'success');
        } else {
            alert(message);
        }
    }

    // Función utilitaria para manejar estados de carga de botones
    setButtonLoading(button, isLoading, loadingText = null) {
        if (!button) return;
        
        if (isLoading) {
            // Guardar el texto original si no se ha guardado
            if (!button.hasAttribute('data-original-text')) {
                button.setAttribute('data-original-text', button.innerHTML);
            }
            
            if (loadingText) {
                // Modo con texto de carga
                button.classList.add('loading-text');
                button.innerHTML = `
                    <span class="loading-spinner"></span>
                    ${loadingText}
                `;
            } else {
                // Modo solo spinner
                button.classList.add('loading');
            }
            
            button.disabled = true;
        } else {
            // Restaurar estado original
            button.classList.remove('loading', 'loading-text');
            button.disabled = false;
            
            // Restaurar texto original
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
            }
        }
    }

    // Función para prevenir múltiples clicks
    preventMultipleClicks(button, callback, loadingText = null) {
        if (!button || button.disabled) return;
        
        this.setButtonLoading(button, true, loadingText);
        
        // Ejecutar callback
        if (typeof callback === 'function') {
            callback();
        }
    }

    // Cargar texto de bienvenida desde bienvenida.txt
    async loadWelcomeText() {
        try {
            const welcomeTextElement = document.getElementById('welcomeText');
            if (!welcomeTextElement) {
                return; // No hay elemento de bienvenida en esta página
            }

            const response = await fetch('bienvenida.txt');
            if (response.ok) {
                const text = await response.text();
                if (text.trim()) {
                    // Si hay contenido en el archivo, usarlo
                    welcomeTextElement.innerHTML = text.replace(/\n/g, '<br>');
                }
                // Si el archivo está vacío, se mantiene el contenido por defecto
            } else {
                console.log('📝 Archivo bienvenida.txt no encontrado, usando contenido por defecto');
            }
        } catch (error) {
            console.log('📝 Error cargando bienvenida.txt, usando contenido por defecto:', error);
        }
    }

    // Función para resetear la aplicación (debug) - Firebase
    async resetApp() {
        if (!confirm('¿Está seguro de que desea resetear toda la aplicación? Se perderán todos los datos de Firebase.')) {
            return;
        }
        
        if (!window.firebaseDB) {
            this.showError('Firebase no disponible');
            return;
        }

        try {
            // Cerrar sesión primero
            if (window.firebaseAuth.currentUser) {
                await window.firebaseAuth.signOut();
            }

            // Limpiar localStorage
            localStorage.clear();
            
            // Recargar página
            location.reload();
            
            this.showSuccess('Aplicación reseteada. Nota: Los datos de Firebase deben eliminarse manualmente desde la consola.');
        } catch (error) {
            console.error('Error reseteando aplicación:', error);
            this.showError('Error al resetear aplicación');
        }
    }

    // Método para manejar parámetros de URL para links compartidos
    async handleUrlParameters() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const eventoId = urlParams.get('evento');
            
            if (eventoId) {
                console.log('🔗 Link compartido detectado para evento:', eventoId);
                
                // Esperar a que los managers estén completamente inicializados
                await this.waitForManagers();
                
                // Verificar que el evento existe
                if (window.publicEventsManager && window.publicEventsManager.eventosCache) {
                    const evento = window.publicEventsManager.eventosCache.find(e => e.id === eventoId);
                    
                    if (evento) {
                        console.log('✅ Evento encontrado, navegando al panel de inscripción');
                        
                        // Navegar al panel de inscripción del evento
                        window.publicEventsManager.navigateToInscripcionPanel(evento);
                        
                        // Limpiar el parámetro de la URL sin recargar la página
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, newUrl);
                        
                        // Mostrar mensaje de bienvenida
                        if (window.authManager) {
                            window.authManager.showMessage(`¡Bienvenido al evento: ${evento.nombre}!`, 'success');
                        }
                    } else {
                        console.log('❌ Evento no encontrado en cache, intentando cargar desde Firebase');
                        
                        // Intentar cargar el evento desde Firebase
                        if (window.firebaseDB) {
                            const eventoDoc = await window.firebaseDB.collection('eventos').doc(eventoId).get();
                            
                            if (eventoDoc.exists) {
                                const evento = { id: eventoDoc.id, ...eventoDoc.data() };
                                console.log('✅ Evento cargado desde Firebase, navegando al panel');
                                
                                // Navegar al panel de inscripción del evento
                                window.publicEventsManager.navigateToInscripcionPanel(evento);
                                
                                // Limpiar el parámetro de la URL
                                const newUrl = window.location.pathname;
                                window.history.replaceState({}, document.title, newUrl);
                                
                                if (window.authManager) {
                                    window.authManager.showMessage(`¡Bienvenido al evento: ${evento.nombre}!`, 'success');
                                }
                            } else {
                                console.error('❌ Evento no encontrado en Firebase');
                                if (window.authManager) {
                                    window.authManager.showMessage('Evento no encontrado', 'error');
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error manejando parámetros de URL:', error);
        }
    }

    // Información de la aplicación
    getAppInfo() {
        return {
            name: 'Mexxus Arena',
            version: '2.0.0-Firebase',
            author: 'Sistema de Gestión de Eventos',
            description: 'Sistema para gestión de eventos deportivos y competencias con Firebase',
            backend: 'Firebase (Firestore + Authentication)',
            features: [
                'Autenticación en tiempo real',
                'Base de datos en la nube',
                'Gestión de eventos',
                'Inscripciones de alumnos',
                'Panel administrativo',
                'Dashboard por academia'
            ]
        };
    }
}

// Funciones de utilidad global
window.utils = {
    // Validar email
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Capitalizar primera letra
    capitalize: (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    // Formatear fecha para input
    formatDateForInput: (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toISOString().split('T')[0];
    },
    
    // Calcular edad
    calculateAge: (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate + 'T00:00:00');
        let age = today.getFullYear() - birth.getFullYear();
        const month = today.getMonth() - birth.getMonth();
        
        if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    },
    
    // Generar ID único
    generateId: () => {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Funciones de consola para debugging (disponibles en DevTools)
window.debug = {
    exportData: () => window.app.exportData(),
    resetApp: () => window.app.resetApp(),
    getStats: async () => {
        if (window.adminManager) {
            return await window.adminManager.getEstadisticasGenerales();
        }
        return 'Admin manager no disponible';
    },
    getCurrentUser: () => {
        return window.authManager ? window.authManager.getCurrentUser() : null;
    },
    createAdmin: () => {
        if (window.authManager) {
            return window.authManager.createAdminUser();
        }
        return 'Auth manager no disponible';
    },
    info: () => window.app.getAppInfo(),
    firebase: () => {
        return {
            auth: !!window.firebaseAuth,
            db: !!window.firebaseDB,
            user: window.firebaseAuth?.currentUser?.email || null,
            connected: !!(window.firebaseAuth && window.firebaseDB)
        };
    },
    // Nuevas funciones de debug para el problema de modalidad
    checkEventos: async () => {
        try {
            if (!window.firebaseDB) {
                return 'Firebase no disponible';
            }
            
            const snapshot = await window.firebaseDB.collection('eventos').get();
            const eventos = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                eventos.push({
                    id: doc.id,
                    nombre: data.nombre,
                    modalidad: data.modalidad,
                    modalidadType: typeof data.modalidad,
                    modalidadLength: data.modalidad ? data.modalidad.length : 'N/A',
                    hasModalidad: data.hasOwnProperty('modalidad'),
                    modalidadTruthy: !!data.modalidad,
                    modalidadValue: JSON.stringify(data.modalidad),
                    allFields: Object.keys(data)
                });
            });
            
            console.log('📊 Análisis detallado de eventos:', eventos);
            return eventos;
        } catch (error) {
            console.error('Error checking eventos:', error);
            return error.message;
        }
    },
    updateEventosWithModalidad: async () => {
        try {
            if (!window.firebaseDB) {
                return 'Firebase no disponible';
            }
            
            const snapshot = await window.firebaseDB.collection('eventos').get();
            const batch = window.firebaseDB.batch();
            let updated = 0;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                // Corregir modalidades problemáticas
                if (!data.hasOwnProperty('modalidad') || 
                    !data.modalidad || 
                    data.modalidad.trim() === '' || 
                    data.modalidad === null || 
                    data.modalidad === undefined) {
                    
                    // Agregar modalidad por defecto a eventos que no la tienen o tienen valor vacío
                    batch.update(doc.ref, { modalidad: 'POOMSAE' });
                    updated++;
                    console.log(`Actualizando evento ${data.nombre} - modalidad actual:`, JSON.stringify(data.modalidad));
                }
            });
            
            if (updated > 0) {
                await batch.commit();
                console.log(`✅ ${updated} eventos actualizados con modalidad válida`);
                
                // Invalidar caches
                if (window.adminManager) {
                    window.adminManager.invalidateCache();
                }
                if (window.publicEventsManager) {
                    window.publicEventsManager.cacheTimestamp = null;
                }
                
                return `${updated} eventos actualizados`;
            } else {
                return 'Todos los eventos ya tienen modalidad válida';
            }
        } catch (error) {
            console.error('Error updating eventos:', error);
            return error.message;
        }
    },
    clearCaches: () => {
        if (window.adminManager) {
            window.adminManager.invalidateCache();
        }
        if (window.publicEventsManager) {
            window.publicEventsManager.cacheTimestamp = null;
        }
        // Dashboard cache se maneja automáticamente
        console.log('✅ Cache del dashboard actualizado');
        console.log('🔄 Todos los caches invalidados');
        return 'Caches limpiados';
    },
    reloadAllViews: async () => {
        // Limpiar caches primero
        window.debug.clearCaches();
        
        // Recargar vista pública
        if (window.publicEventsManager) {
            await window.publicEventsManager.refresh();
        }
        
        // Recargar panel de admin si está activo
        if (window.adminManager && window.authManager?.isAdmin()) {
            await window.adminManager.loadAdminData();
        }
        
        // Recargar eventos públicos si está activo
        if (window.publicEventsManager) {
            await window.publicEventsManager.refresh();
        }
        
        console.log('🔄 Todas las vistas recargadas');
        return 'Vistas recargadas';
    },
    inspectEvento: async (nombreEvento) => {
        try {
            if (!window.firebaseDB) {
                return 'Firebase no disponible';
            }
            
            const snapshot = await window.firebaseDB.collection('eventos')
                .where('nombre', '==', nombreEvento)
                .get();
                
            if (snapshot.empty) {
                console.log('❌ Evento no encontrado:', nombreEvento);
                return 'Evento no encontrado';
            }
            
            const evento = snapshot.docs[0].data();
            const analisis = {
                id: snapshot.docs[0].id,
                modalidad: evento.modalidad,
                modalidadType: typeof evento.modalidad,
                modalidadValue: JSON.stringify(evento.modalidad),
                modalidadLength: evento.modalidad ? evento.modalidad.length : 'N/A',
                modalidadTrim: evento.modalidad ? evento.modalidad.trim() : 'N/A',
                modalidadTrimLength: evento.modalidad ? evento.modalidad.trim().length : 'N/A',
                hasModalidad: evento.hasOwnProperty('modalidad'),
                modalidadTruthy: !!evento.modalidad,
                conditionResult: !!(evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null'),
                allData: evento
            };
            
            console.log('🔍 Análisis detallado del evento:', analisis);
            return analisis;
        } catch (error) {
            console.error('Error inspeccionando evento:', error);
            return error.message;
        }
    }
};

        console.log('🏆 Bienvenido a MEXXUS ARENA!');
console.log('💡 Usa window.debug para funciones de depuración');
console.log('📧 Para crear admin usa: window.debug.createAdmin()');
console.log('🔥 Ahora con Firebase Backend!');

// ===== FUNCIONALIDAD DEL MENÚ HAMBURGUESA =====

// Clase para manejar el menú móvil
class MobileMenuManager {
    constructor() {
        this.hamburgerBtn = document.getElementById('hamburgerBtn');
        this.mobileMenu = document.getElementById('mobileMenu');
        this.mobileMenuContent = document.querySelector('.mobile-menu-content');
        this.isOpen = false;
        
        this.init();
    }

    init() {
        if (!this.hamburgerBtn || !this.mobileMenu) return;

        // Event listeners
        this.hamburgerBtn.addEventListener('click', () => this.toggleMenu());
        
        // Cerrar menú al hacer clic en el overlay
        this.mobileMenu.addEventListener('click', (e) => {
            if (e.target === this.mobileMenu) {
                this.closeMenu();
            }
        });

        // Cerrar menú con escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });

        // Los event listeners de autenticación son manejados por authManager

        // Cerrar menú al cambiar de tamaño de ventana
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.hamburgerBtn.classList.add('active');
        this.mobileMenu.classList.add('active');
        this.isOpen = true;
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
    }

    closeMenu() {
        this.hamburgerBtn.classList.remove('active');
        this.mobileMenu.classList.remove('active');
        this.isOpen = false;
        
        // Restaurar scroll del body
        document.body.style.overflow = '';
    }



    // Método para actualizar la visibilidad de botones cuando cambia el estado de autenticación
    updateAuthState(isLoggedIn, userInfo = '') {
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        const mobileRegisterBtn = document.getElementById('mobileRegisterBtn');
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        const mobileUserInfo = document.getElementById('mobileUserInfo');

        if (isLoggedIn) {
            // Usuario logueado
            if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');
            if (mobileRegisterBtn) mobileRegisterBtn.classList.add('hidden');
            if (mobileLogoutBtn) mobileLogoutBtn.classList.remove('hidden');
            if (mobileUserInfo) {
                mobileUserInfo.textContent = userInfo;
                mobileUserInfo.classList.remove('hidden');
            }
        } else {
            // Usuario no logueado
            if (mobileLoginBtn) mobileLoginBtn.classList.remove('hidden');
            if (mobileRegisterBtn) mobileRegisterBtn.classList.remove('hidden');
            if (mobileLogoutBtn) mobileLogoutBtn.classList.add('hidden');
            if (mobileUserInfo) mobileUserInfo.classList.add('hidden');
        }
    }
}

// ===== PANEL DE INSCRIPCIÓN MANAGER =====

class PanelInscripcionManager {
    constructor() {
        this.currentEvento = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botón para inscribir alumnos
        const btnInscribirAlumnos = document.getElementById('btnInscribirAlumnos');
        if (btnInscribirAlumnos) {
            btnInscribirAlumnos.addEventListener('click', () => {
                this.abrirModalInscripcion();
            });
        }

        // Botón para volver al dashboard
        const btnVolverDashboard = document.getElementById('btnVolverDashboard');
        if (btnVolverDashboard) {
            btnVolverDashboard.addEventListener('click', () => {
                this.volverAlDashboard();
            });
        }

        // Pestañas de modalidades
        this.setupModalidadTabs();
    }

    setupModalidadTabs() {
        const modalidadTabs = document.querySelectorAll('.modalidad-tab-btn');
        modalidadTabs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalidad = btn.getAttribute('data-modalidad');
                this.switchModalidadTab(modalidad);
            });
        });
    }

    switchModalidadTab(modalidad) {
        // Obtener todas las pestañas y tablas
        const modalidadTabs = document.querySelectorAll('.modalidad-tab-btn');
        const modalidadTablas = document.querySelectorAll('.modalidad-tabla-container');
        
        // Verificar si la pestaña solicitada está visible
        const targetTab = document.querySelector(`[data-modalidad="${modalidad}"]`);
        if (!targetTab || targetTab.style.display === 'none') {
            console.warn(`Pestaña ${modalidad} no está disponible para este evento`);
            return;
        }

        // Actualizar botones activos
        modalidadTabs.forEach(btn => {
            btn.classList.remove('active');
        });
        targetTab.classList.add('active');

        // Mostrar tabla correspondiente
        modalidadTablas.forEach(container => {
            container.classList.remove('active');
        });
        const targetTabla = document.getElementById(`tabla-${modalidad}`);
        if (targetTabla) {
            targetTabla.classList.add('active');
        }
    }

    abrirModalInscripcion() {
        if (this.currentEvento && this.currentEvento.id) {
            // Abrir el modal de inscripción usando el events manager
            // Pasar true para indicar que viene desde el panel (no mostrar alumnos existentes)
            if (window.eventsManager) {
                window.eventsManager.openInscripcionModal(this.currentEvento.id, true);
            }
        } else {
            console.error('No hay evento seleccionado para inscripción');
            if (window.authManager) {
                window.authManager.showMessage('Error: No hay evento seleccionado', 'error');
            }
        }
    }

    // Método para recargar la tabla de alumnos inscritos
    recargarAlumnosInscritos() {
        if (this.currentEvento && this.currentEvento.id) {
            this.loadAlumnosInscritosEnPanel(this.currentEvento.id);
        }
    }

    async loadAlumnosInscritosEnPanel(eventoId) {
        try {
            console.log('🔄 Cargando alumnos inscritos para evento:', eventoId);
            
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser || !window.firebaseDB) {
                console.error('❌ Usuario o Firebase no disponible');
                return;
            }

            console.log('👤 Usuario actual:', currentUser.uid);

            // Primero, obtener información del evento para determinar el tipo
            const eventoDoc = await window.firebaseDB.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) {
                console.error('❌ Evento no encontrado:', eventoId);
                return;
            }
            
            const eventoData = eventoDoc.data();
            const tipoEvento = eventoData.modalidad || 'AMBAS'; // Por defecto AMBAS si no está especificado
            
            console.log('📋 Tipo de evento:', tipoEvento);
            
            // Configurar las pestañas según el tipo de evento
            this.configurarPestanasSegunEvento(tipoEvento);

            const tbodyKyorugi = document.getElementById('tablaKyorugiInscritos');
            const tbodyPoomsae = document.getElementById('tablaPoomsaeInscritos');
            
            if (!tbodyKyorugi || !tbodyPoomsae) {
                console.error('❌ Elementos de tabla no encontrados');
                return;
            }

            // LIMPIEZA EXPLÍCITA: Limpiar ambas tablas antes de cargar nuevos datos
            console.log('🧹 Limpiando tablas antes de cargar nuevos datos...');
            tbodyKyorugi.innerHTML = '';
            tbodyPoomsae.innerHTML = '';

            // Mostrar loading en las tablas correspondientes
            const loadingHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <div class="loading-spinner">
                            <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                                    <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
                                </path>
                            </svg>
                            Cargando alumnos inscritos...
                        </div>
                    </td>
                </tr>
            `;
            
            const loadingHTMLPoomsae = `
                <tr>
                    <td colspan="9" class="text-center">
                        <div class="loading-spinner">
                            <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                                    <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
                                </path>
                            </svg>
                            Cargando alumnos inscritos...
                        </div>
                    </td>
                </tr>
            `;
            
            // Solo mostrar loading en las tablas que corresponden al tipo de evento
            if (tipoEvento === 'KYORUGI' || tipoEvento === 'AMBAS') {
                tbodyKyorugi.innerHTML = loadingHTML;
            }
            if (tipoEvento === 'POOMSAE' || tipoEvento === 'AMBAS') {
                tbodyPoomsae.innerHTML = loadingHTMLPoomsae;
            }

            // Buscar inscripción de esta academia en este evento específico
            console.log('🔍 Buscando inscripción para evento:', eventoId, 'y academia:', currentUser.uid);
            const inscripcionSnapshot = await window.firebaseDB.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .where('academiaId', '==', currentUser.uid)
                .get();

            console.log('📊 Resultados de búsqueda:', inscripcionSnapshot.size, 'inscripciones encontradas');
            
            // Log detallado de cada inscripción encontrada
            inscripcionSnapshot.forEach((doc, index) => {
                const inscripcion = doc.data();
                console.log(`📋 Inscripción ${index + 1}:`, {
                    id: doc.id,
                    eventoId: inscripcion.eventoId,
                    academiaId: inscripcion.academiaId,
                    totalAlumnos: inscripcion.alumnos ? inscripcion.alumnos.length : 0,
                    alumnos: inscripcion.alumnos
                });
            });

            if (inscripcionSnapshot.empty) {
                console.log('📭 No se encontraron inscripciones para este evento');
                const noDataHTML = `
                    <tr>
                        <td colspan="10" class="text-center">
                            <div class="no-alumnos-inscritos">
                                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                </svg>
                                <h4>No tienes alumnos inscritos</h4>
                                <p>Haz clic en "Inscribir Alumnos" para comenzar</p>
                            </div>
                        </td>
                    </tr>
                `;
                
                const noDataHTMLPoomsae = `
                    <tr>
                        <td colspan="9" class="text-center">
                            <div class="no-alumnos-inscritos">
                                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                </svg>
                                <h4>No tienes alumnos inscritos</h4>
                                <p>Haz clic en "Inscribir Alumnos" para comenzar</p>
                            </div>
                        </td>
                    </tr>
                `;
                
                if (tipoEvento === 'KYORUGI' || tipoEvento === 'AMBAS') {
                    tbodyKyorugi.innerHTML = noDataHTML;
                }
                if (tipoEvento === 'POOMSAE' || tipoEvento === 'AMBAS') {
                    tbodyPoomsae.innerHTML = noDataHTMLPoomsae;
                }
                return;
            }

            const inscripcionDoc = inscripcionSnapshot.docs[0];
            const inscripcionData = inscripcionDoc.data();
            
            console.log('📋 Datos de inscripción encontrada:', {
                inscripcionId: inscripcionDoc.id,
                eventoId: inscripcionData.eventoId,
                academiaId: inscripcionData.academiaId,
                totalAlumnos: inscripcionData.alumnos ? inscripcionData.alumnos.length : 0
            });
            
            console.log('📊 Datos completos de inscripción:', inscripcionData);
            console.log('👥 Array de alumnos completo:', inscripcionData.alumnos);

            if (!inscripcionData.alumnos || inscripcionData.alumnos.length === 0) {
                console.log('📭 La inscripción no tiene alumnos');
                const noDataHTML = `
                    <tr>
                        <td colspan="10" class="text-center">
                            <div class="no-alumnos-inscritos">
                                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                </svg>
                                <h4>No tienes alumnos inscritos</h4>
                                <p>Haz clic en "Inscribir Alumnos" para comenzar</p>
                            </div>
                        </td>
                    </tr>
                `;
                
                const noDataHTMLPoomsae = `
                    <tr>
                        <td colspan="9" class="text-center">
                            <div class="no-alumnos-inscritos">
                                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                </svg>
                                <h4>No tienes alumnos inscritos</h4>
                                <p>Haz clic en "Inscribir Alumnos" para comenzar</p>
                            </div>
                        </td>
                    </tr>
                `;
                
                if (tipoEvento === 'KYORUGI' || tipoEvento === 'AMBAS') {
                    tbodyKyorugi.innerHTML = noDataHTML;
                }
                if (tipoEvento === 'POOMSAE' || tipoEvento === 'AMBAS') {
                    tbodyPoomsae.innerHTML = noDataHTMLPoomsae;
                }
                return;
            }

            // Separar alumnos por modalidad
            const alumnosKyorugi = [];
            const alumnosPoomsae = [];
            
            inscripcionData.alumnos.forEach((alumno, index) => {
                console.log(`👤 Alumno ${index + 1} completo:`, alumno);
                console.log(`👤 Alumno ${index + 1} resumido:`, {
                    nombre: alumno.nombre,
                    apellido: alumno.apellido,
                    modalidad: alumno.modalidad,
                    dni: alumno.dni,
                    cinturon: alumno.cinturon
                });
                
                if (alumno.modalidad === 'KYORUGI') {
                    alumnosKyorugi.push({ ...alumno, originalIndex: index });
                } else if (alumno.modalidad === 'POOMSAE') {
                    alumnosPoomsae.push({ ...alumno, originalIndex: index });
                }
            });

            console.log('📊 Alumnos separados por modalidad:', {
                kyorugi: alumnosKyorugi.length,
                poomsae: alumnosPoomsae.length
            });

            // Renderizar tabla KYORUGI solo si el evento lo permite
            if (tipoEvento === 'KYORUGI' || tipoEvento === 'AMBAS') {
                tbodyKyorugi.innerHTML = '';
                if (alumnosKyorugi.length === 0) {
                    tbodyKyorugi.innerHTML = `
                        <tr>
                            <td colspan="10" class="text-center">
                                <div class="no-alumnos-inscritos">
                                    <p>No hay alumnos inscritos en KYORUGI</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    alumnosKyorugi.forEach((alumno, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${alumno.dni || 'N/A'}</td>
                            <td>${alumno.nombre || 'N/A'}</td>
                            <td>${alumno.apellido || 'N/A'}</td>
                            <td>${alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento).toLocaleDateString('es-ES') : 'N/A'}</td>
                            <td>${alumno.peso || 'N/A'}</td>
                            <td>${alumno.cinturon ? (alumno.cinturon.includes('KUP') ? alumno.cinturon.replace('KUP-', '') + 'er KUP' : alumno.cinturon.replace('DAN-', '') + 'er DAN') : 'N/A'}</td>
                            <td>${alumno.sexo || 'N/A'}</td>
                            <td>${currentUser.abreviatura || 'N/A'}</td>
                            <td class="acciones-cell">
                                <button class="btn btn-info btn-sm" onclick="panelInscripcionManager.editarAlumno('${inscripcionDoc.id}', ${alumno.originalIndex})">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                    </svg>
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="panelInscripcionManager.eliminarAlumnoDeInscripcion('${inscripcionDoc.id}', ${alumno.originalIndex})">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                    </svg>
                                </button>
                            </td>
                        `;
                        tbodyKyorugi.appendChild(row);
                    });
                }
            }

            // Renderizar tabla POOMSAE solo si el evento lo permite
            if (tipoEvento === 'POOMSAE' || tipoEvento === 'AMBAS') {
                tbodyPoomsae.innerHTML = '';
                if (alumnosPoomsae.length === 0) {
                    tbodyPoomsae.innerHTML = `
                        <tr>
                            <td colspan="10" class="text-center">
                                <div class="no-alumnos-inscritos">
                                    <p>No hay alumnos inscritos en POOMSAE</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    alumnosPoomsae.forEach((alumno, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${alumno.dni || 'N/A'}</td>
                            <td>${alumno.nombre || 'N/A'}</td>
                            <td>${alumno.apellido || 'N/A'}</td>
                            <td>${alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento).toLocaleDateString('es-ES') : 'N/A'}</td>
                            <td>${alumno.cinturon ? (alumno.cinturon.includes('KUP') ? alumno.cinturon.replace('KUP-', '') + 'er KUP' : alumno.cinturon.replace('DAN-', '') + 'er DAN') : 'N/A'}</td>
                            <td>${alumno.poomsae || 'N/A'}</td>
                            <td>${alumno.sexo || 'N/A'}</td>
                            <td>${currentUser.abreviatura || 'N/A'}</td>
                            <td class="acciones-cell">
                                <button class="btn btn-info btn-sm" onclick="panelInscripcionManager.editarAlumno('${inscripcionDoc.id}', ${alumno.originalIndex})">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                    </svg>
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="panelInscripcionManager.eliminarAlumnoDeInscripcion('${inscripcionDoc.id}', ${alumno.originalIndex})">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                    </svg>
                                </button>
                            </td>
                        `;
                        tbodyPoomsae.appendChild(row);
                    });
                }
            }

            // Actualizar contadores por modalidad solo para las modalidades disponibles
            const kyorugiCountElement = document.getElementById('kyorugiCount');
            const poomsaeCountElement = document.getElementById('poomsaeCount');
            const totalAlumnosElement = document.getElementById('totalAlumnosInscritos');
            
            if (kyorugiCountElement && (tipoEvento === 'KYORUGI' || tipoEvento === 'AMBAS')) {
                kyorugiCountElement.textContent = alumnosKyorugi.length;
            }
            if (poomsaeCountElement && (tipoEvento === 'POOMSAE' || tipoEvento === 'AMBAS')) {
                poomsaeCountElement.textContent = alumnosPoomsae.length;
            }
            if (totalAlumnosElement) {
                totalAlumnosElement.textContent = inscripcionData.alumnos.length;
            }

            console.log('✅ Carga de alumnos completada exitosamente');

        } catch (error) {
            console.error('❌ Error cargando alumnos inscritos:', error);
            const tbodyKyorugi = document.getElementById('tablaKyorugiInscritos');
            const tbodyPoomsae = document.getElementById('tablaPoomsaeInscritos');
            
            const errorHTML = `
                <tr>
                    <td colspan="10" class="text-center error">
                        Error al cargar alumnos inscritos
                    </td>
                </tr>
            `;
            
            const errorHTMLPoomsae = `
                <tr>
                    <td colspan="10" class="text-center error">
                        Error al cargar alumnos inscritos
                    </td>
                </tr>
            `;
            
            if (tbodyKyorugi) {
                tbodyKyorugi.innerHTML = errorHTML;
            }
            if (tbodyPoomsae) {
                tbodyPoomsae.innerHTML = errorHTMLPoomsae;
            }
        }
    }

    // Método para configurar las pestañas según el tipo de evento
    configurarPestanasSegunEvento(tipoEvento) {
        const modalidadTabs = document.querySelector('.modalidad-tabs');
        const tablaKyorugi = document.getElementById('tabla-kyorugi');
        const tablaPoomsae = document.getElementById('tabla-poomsae');
        
        if (!modalidadTabs || !tablaKyorugi || !tablaPoomsae) return;

        // Obtener los botones de pestañas
        const btnKyorugi = modalidadTabs.querySelector('[data-modalidad="kyorugi"]');
        const btnPoomsae = modalidadTabs.querySelector('[data-modalidad="poomsae"]');

        // Ocultar todas las pestañas y tablas primero
        btnKyorugi.style.display = 'none';
        btnPoomsae.style.display = 'none';
        tablaKyorugi.classList.remove('active');
        tablaPoomsae.classList.remove('active');

        // Configurar según el tipo de evento
        switch (tipoEvento) {
            case 'KYORUGI':
                // Solo mostrar pestaña KYORUGI
                btnKyorugi.style.display = 'block';
                tablaKyorugi.classList.add('active');
                btnKyorugi.classList.add('active');
                break;
                
            case 'POOMSAE':
                // Solo mostrar pestaña POOMSAE
                btnPoomsae.style.display = 'block';
                tablaPoomsae.classList.add('active');
                btnPoomsae.classList.add('active');
                break;
                
            case 'AMBAS':
            default:
                // Mostrar ambas pestañas
                btnKyorugi.style.display = 'block';
                btnPoomsae.style.display = 'block';
                tablaKyorugi.classList.add('active');
                btnKyorugi.classList.add('active');
                break;
        }
    }

    volverAlDashboard() {
        // Verificar si el usuario actual es administrador
        const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
        
        if (currentUser && currentUser.tipo === 'admin') {
            // Si es administrador, navegar al panel de administrador
            console.log('🔄 Administrador volviendo al panel de administrador');
            navigateToAdminPanel();
            return;
        }
        
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Mostrar la página principal (que ahora contiene el dashboard)
        const homePage = document.getElementById('homePage');
        if (homePage) {
            homePage.classList.add('active');
        }
        
        // Recargar eventos públicos
        if (window.publicEventsManager) {
            window.publicEventsManager.refresh();
        }
        
        // Limpiar el evento actual
        this.currentEvento = null;
    }

    // Método para establecer el evento actual (usado desde dashboard)
    setCurrentEvento(evento) {
        console.log('🔄 Cambiando evento actual:', evento ? evento.id : 'null');
        
        // Limpiar estado anterior antes de establecer el nuevo evento
        this.limpiarEstadoPanel();
        
        this.currentEvento = evento;
        
        // Configurar las pestañas según el tipo de evento
        if (evento && evento.modalidad) {
            this.configurarPestanasSegunEvento(evento.modalidad);
        }
    }

    // Método para limpiar completamente el estado del panel
    limpiarEstadoPanel() {
        console.log('🧹 Limpiando estado del panel de inscripción...');
        
        // Limpiar tablas
        const tbodyKyorugi = document.getElementById('tablaKyorugiInscritos');
        const tbodyPoomsae = document.getElementById('tablaPoomsaeInscritos');
        
        if (tbodyKyorugi) {
            tbodyKyorugi.innerHTML = '';
        }
        if (tbodyPoomsae) {
            tbodyPoomsae.innerHTML = '';
        }
        
        // Limpiar contadores
        const kyorugiCountElement = document.getElementById('kyorugiCount');
        const poomsaeCountElement = document.getElementById('poomsaeCount');
        const totalAlumnosElement = document.getElementById('totalAlumnosInscritos');
        
        if (kyorugiCountElement) {
            kyorugiCountElement.textContent = '0';
        }
        if (poomsaeCountElement) {
            poomsaeCountElement.textContent = '0';
        }
        if (totalAlumnosElement) {
            totalAlumnosElement.textContent = '0';
        }
        
        // Resetear pestañas a estado inicial
        this.configurarPestanasSegunEvento('AMBAS');
        
        console.log('✅ Estado del panel limpiado');
    }

    // Método para editar un alumno
    async editarAlumno(inscripcionId, alumnoIndex) {
        try {
            if (!this.currentEvento || !this.currentEvento.id) {
                throw new Error('No hay evento seleccionado');
            }

            // Obtener los datos del alumno para obtener su DNI
            const inscripcionDoc = await window.firebaseDB.collection('inscripciones').doc(inscripcionId).get();
            if (!inscripcionDoc.exists) {
                throw new Error('Inscripción no encontrada');
            }

            const inscripcionData = inscripcionDoc.data();
            const alumno = inscripcionData.alumnos[alumnoIndex];
            if (!alumno) {
                throw new Error('Alumno no encontrado');
            }

            // Usar el events manager para abrir el modal de edición de participantes
            if (window.eventsManager) {
                // Configurar el modo de edición en el events manager
                window.eventsManager.editingInscripcionId = inscripcionId;
                window.eventsManager.editingAlumnoIndex = alumnoIndex;
                
                // Abrir el modal de edición de participantes usando el DNI como identificador
                await window.eventsManager.openEditarParticipantesModal(this.currentEvento.id, alumno.dni);
            } else {
                throw new Error('Events manager no disponible');
            }

        } catch (error) {
            console.error('Error abriendo modal de edición:', error);
            if (window.authManager) {
                window.authManager.showMessage('Error al abrir el formulario de edición', 'error');
            }
        }
    }

    // Método para eliminar un alumno de la inscripción
    async eliminarAlumnoDeInscripcion(inscripcionId, alumnoIndex) {
        if (!confirm('¿Estás seguro de que quieres eliminar este alumno de la inscripción?')) {
            return;
        }

        try {
            if (!window.firebaseDB) {
                throw new Error('Firebase no disponible');
            }

            // Obtener la inscripción actual
            const inscripcionDoc = await window.firebaseDB.collection('inscripciones').doc(inscripcionId).get();
            if (!inscripcionDoc.exists) {
                throw new Error('Inscripción no encontrada');
            }

            const inscripcionData = inscripcionDoc.data();
            const alumnos = inscripcionData.alumnos || [];

            // Verificar que el índice sea válido
            if (alumnoIndex < 0 || alumnoIndex >= alumnos.length) {
                throw new Error('Índice de alumno inválido');
            }

            // Eliminar el alumno del array
            alumnos.splice(alumnoIndex, 1);

            // Actualizar la inscripción en Firebase
            await window.firebaseDB.collection('inscripciones').doc(inscripcionId).update({
                alumnos: alumnos,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Recargar la tabla
            this.recargarAlumnosInscritos();

            if (window.authManager) {
                window.authManager.showMessage('Alumno eliminado correctamente', 'success');
            }

        } catch (error) {
            console.error('Error eliminando alumno:', error);
            if (window.authManager) {
                window.authManager.showMessage('Error al eliminar alumno', 'error');
            }
        }
    }
}

// Función global para navegar a la página principal
function navigateToHome() {
    // Verificar si el usuario actual es administrador
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    
    if (currentUser && currentUser.tipo === 'admin') {
        // Si es administrador, navegar al panel de administrador
        console.log('🔄 Administrador navegando al panel de administrador');
        navigateToAdminPanel();
        return;
    }
    
    // Ocultar todas las páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Mostrar página principal
    const homePage = document.getElementById('homePage');
    if (homePage) {
        homePage.classList.add('active');
    }
    
    // Cerrar menú móvil si está abierto
    if (window.mobileMenuManager) {
        window.mobileMenuManager.closeMenu();
    }
    
    // Cerrar todos los modales
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Recargar eventos públicos
    if (window.publicEventsManager) {
        window.publicEventsManager.refresh();
    }
}

// Función para navegar al panel de administrador
function navigateToAdminPanel() {
    // Ocultar todas las páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Mostrar panel de administrador
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.classList.add('active');
    }
    
    // Cerrar menú móvil si está abierto
    if (window.mobileMenuManager) {
        window.mobileMenuManager.closeMenu();
    }
    
    // Cerrar todos los modales
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Inicializar el gestor del menú móvil y panel de inscripción
document.addEventListener('DOMContentLoaded', () => {
    window.mobileMenuManager = new MobileMenuManager();
    window.panelInscripcionManager = new PanelInscripcionManager();
    window.perfilDelegacionManager = new PerfilDelegacionManager();
});

// Lógica de activación de pestañas para el panel de inscripción
// (No afecta otros paneles ni lógica existente)
document.addEventListener('DOMContentLoaded', () => {
  const panelTabs = document.querySelectorAll('#panelInscripcion .evento-tabs .tab-btn');
  if (panelTabs.length > 0) {
    panelTabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-tab');
        // Actualizar botones activos
        panelTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Mostrar solo el contenedor correspondiente (dentro del div principal)
        document.querySelectorAll('#panelInscripcion .evento-inscripcion-main .tab-container').forEach(container => container.classList.remove('active'));
        const activeContainer = document.getElementById(`container-${tab}`);
        if (activeContainer) activeContainer.classList.add('active');
      });
    });
  }
});

// ===== FUNCIONALIDAD DE VISTA PREVIA DE IMÁGENES =====

// Clase para manejar la vista previa de imágenes
class ImagePreviewManager {
    constructor() {
        this.modal = null;
        this.previewImg = null;
        this.closeBtn = null;
        this.isOpen = false;
        
        this.init();
    }

    init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        this.modal = document.getElementById('imagePreviewModal');
        this.previewImg = document.getElementById('imagePreviewImg');
        this.closeBtn = this.modal?.querySelector('.image-preview-close');

        if (!this.modal || !this.previewImg || !this.closeBtn) {
            console.warn('⚠️ Elementos del modal de vista previa no encontrados');
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Cerrar modal con el botón X
        this.closeBtn.addEventListener('click', () => this.closePreview());

        // Cerrar modal haciendo clic en el fondo
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closePreview();
            }
        });

        // Cerrar modal con la tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closePreview();
            }
        });

        // Prevenir que el clic en la imagen cierre el modal
        this.previewImg.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    openPreview(imageSrc, eventTitle) {
        if (!this.modal || !this.previewImg) {
            console.error('❌ Modal de vista previa no inicializado correctamente');
            return;
        }
        
        // Configurar contenido del modal
        this.previewImg.src = imageSrc;
        this.previewImg.alt = `Vista previa de ${eventTitle}`;

        // Mostrar modal
        this.modal.style.display = 'flex';
        this.isOpen = true;

        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';

        // Focus en el modal para accesibilidad
        this.modal.focus();
    }

    closePreview() {
        if (!this.modal) return;

        this.modal.style.display = 'none';
        this.isOpen = false;

        // Restaurar scroll del body
        document.body.style.overflow = '';

        // Limpiar contenido
        if (this.previewImg) {
            this.previewImg.src = '';
            this.previewImg.alt = '';
        }
    }

    // Método para verificar si el modal está abierto
    isModalOpen() {
        return this.isOpen;
    }
}

// Inicializar el gestor de vista previa de imágenes
window.imagePreviewManager = new ImagePreviewManager();

// ===== PERFIL DE DELEGACIÓN MANAGER =====

class PerfilDelegacionManager {
    constructor() {
        this.atletas = [];
        this.eventos = [];
        this.atletaEditandoId = null;
        this.currentSection = 'atletas';
        this.eventoAEliminar = null;
        this.setupEventListeners();
        this.setupModalHandlers();
        this.setupImportHandlers();
        this.setupDeleteModalHandlers();
        this.setupFileInputHandlers();
    }

    setupEventListeners() {
        // El botón de perfil se maneja desde authManager para evitar duplicación
        // Solo configuramos los botones internos del perfil

        // Botón para volver al dashboard desde perfil
        const btnVolverDashboardPerfil = document.getElementById('btnVolverDashboardPerfil');
        if (btnVolverDashboardPerfil) {
            btnVolverDashboardPerfil.addEventListener('click', () => {
                this.volverAlDashboard();
            });
        }

        // Configurar eventos de foto de perfil
        this.setupFotoPerfilEvents();

        // Botones de edición de perfil
        const btnEditarPerfil = document.getElementById('btnEditarPerfil');
        const btnGuardarPerfil = document.getElementById('btnGuardarPerfil');
        const btnCancelarPerfil = document.getElementById('btnCancelarPerfil');

        if (btnEditarPerfil) {
            btnEditarPerfil.addEventListener('click', () => {
                this.activarEdicion();
            });
        }

        if (btnGuardarPerfil) {
            btnGuardarPerfil.addEventListener('click', () => {
                this.guardarCambios();
            });
        }

        if (btnCancelarPerfil) {
            btnCancelarPerfil.addEventListener('click', () => {
                this.cancelarEdicion();
            });
        }

        // Botón para agregar atleta
        const btnAgregarAtleta = document.getElementById('btnAgregarAtleta');
        if (btnAgregarAtleta) {
            btnAgregarAtleta.addEventListener('click', () => {
                this.agregarAtleta();
            });
        }

        // Botones de navegación del perfil
        const btnMisAtletas = document.getElementById('btnMisAtletas');
        const btnMisEventos = document.getElementById('btnMisEventos');

        if (btnMisAtletas) {
            btnMisAtletas.addEventListener('click', () => {
                this.mostrarSeccionAtletas();
            });
        }

        if (btnMisEventos) {
            btnMisEventos.addEventListener('click', () => {
                this.mostrarSeccionEventos();
            });
        }

        // Botón para crear evento
        const btnCrearEvento = document.getElementById('btnCrearEvento');
        if (btnCrearEvento && !btnCrearEvento.hasAttribute('data-app-listener')) {
            btnCrearEvento.setAttribute('data-app-listener', 'true');
            btnCrearEvento.addEventListener('click', () => {
                this.crearEventoConLoading();
            });
        }
    }

    setupModalHandlers() {
        // Modal de registro de atleta
        const registroModal = document.getElementById('registroAtletaModal');
        const registroCloseBtn = registroModal.querySelector('.close');
        const registroForm = document.getElementById('registroAtletaForm');

        registroCloseBtn.addEventListener('click', () => {
            registroModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === registroModal) {
                registroModal.style.display = 'none';
            }
        });

        registroForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistroAtleta();
        });

        // Modal de edición de atleta
        const editarModal = document.getElementById('editarAtletaModal');
        const editarCloseBtn = editarModal.querySelector('.close');
        const editarForm = document.getElementById('editarAtletaForm');

        editarCloseBtn.addEventListener('click', () => {
            editarModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === editarModal) {
                editarModal.style.display = 'none';
            }
        });

        editarForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditarAtleta();
        });

    }

    setupImportHandlers() {
        const btnImportarDB = document.getElementById('btnImportarDB');
        const importModal = document.getElementById('importDBModal');
        const dropzone = document.getElementById('importDropzone');
        const fileInput = document.getElementById('fileInput');
        const closeBtn = importModal.querySelector('.close');

        // Abrir modal de importación
        btnImportarDB.addEventListener('click', () => {
            importModal.style.display = 'flex';
            importModal.classList.add('active');
        });

        // Cerrar modal
        closeBtn.addEventListener('click', () => {
            importModal.style.display = 'none';
            importModal.classList.remove('active');
        });

        window.addEventListener('click', (e) => {
            if (e.target === importModal) {
                importModal.style.display = 'none';
                importModal.classList.remove('active');
            }
        });

        // Manejar drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            this.handleFileImport(files[0]);
        });

        // Manejar clic en dropzone
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            this.handleFileImport(file);
        });
    }

    async handleFileImport(file) {
        if (!file) return;

        // Validar tipo de archivo
        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];

        if (!validTypes.includes(file.type)) {
            window.authManager.showMessage('Formato de archivo no soportado. Por favor, usa Excel (.xlsx, .xls) o CSV.', 'error');
            return;
        }

        // Validar tamaño (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            window.authManager.showMessage('El archivo es demasiado grande. El tamaño máximo es 5MB.', 'error');
            return;
        }

        try {
            // Mostrar indicador de carga
            this.showImportProgress('Analizando archivo...');
            
            // Leer el archivo como ArrayBuffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Procesar el archivo Excel
            const result = await this.processExcelFile(arrayBuffer, file.name);
            
            if (result.success) {
                // Mostrar vista previa de los datos
                this.showImportPreview(result.data, result.total_rows, result.valid_rows, result.invalid_rows);
            } else {
                // Mostrar error
                window.authManager.showMessage(result.error, 'error');
                this.hideImportProgress();
            }
            
        } catch (error) {
            console.error('Error procesando archivo:', error);
            window.authManager.showMessage('Error al procesar el archivo: ' + error.message, 'error');
            this.hideImportProgress();
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    async processExcelFile(arrayBuffer, fileName) {
        try {
            // Verificar si XLSX está disponible
            if (!window.XLSX) {
                throw new Error('La librería XLSX no está cargada');
            }

            // Leer el archivo Excel
            const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir a JSON
            const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
                return {
                    success: false,
                    error: 'El archivo Excel debe tener al menos una fila de encabezados y una fila de datos'
                };
            }

            // Obtener encabezados (primera fila)
            const headers = jsonData[0].map(header => String(header).trim().toUpperCase());
            
            // Validar columnas requeridas
            const requiredColumns = ['NOMBRE', 'APELLIDOS', 'DNI', 'FECHA DE NACIMIENTO', 'SEXO'];
            const columnMapping = this.mapExcelColumns(headers, requiredColumns);
            
            // Debug: mostrar mapeo de columnas
            console.log('Headers encontrados:', headers);
            console.log('Mapeo de columnas:', columnMapping);
            
            const missingColumns = requiredColumns.filter(col => columnMapping[col] === null || columnMapping[col] === undefined);
            if (missingColumns.length > 0) {
                return {
                    success: false,
                    error: `Columnas faltantes: ${missingColumns.join(', ')}. Columnas encontradas: ${headers.join(', ')}. Mapeo: ${JSON.stringify(columnMapping)}`
                };
            }

            // Procesar datos
            const processedData = [];
            const invalidRows = [];
            
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row.length === 0) continue; // Fila vacía
                
                try {
                    const atleta = this.processExcelRow(row, columnMapping, headers);
                    if (atleta) {
                        processedData.push(atleta);
                    } else {
                        invalidRows.push({ row: i + 1, reason: 'Datos incompletos o inválidos' });
                    }
                } catch (error) {
                    invalidRows.push({ row: i + 1, reason: error.message });
                }
            }

            return {
                success: true,
                data: processedData,
                total_rows: jsonData.length - 1,
                valid_rows: processedData.length,
                invalid_rows: invalidRows.length,
                invalid_details: invalidRows
            };

        } catch (error) {
            return {
                success: false,
                error: 'Error procesando archivo Excel: ' + error.message
            };
        }
    }

    mapExcelColumns(headers, requiredColumns) {
        const mapping = {};
        
        const columnVariations = {
            'NOMBRE': ['nombre', 'nombres', 'name', 'first_name'],
            'APELLIDOS': ['apellidos', 'apellido', 'last_name', 'surname'],
            'DNI': ['dni', 'documento', 'identificacion', 'id', 'cedula'],
            'FECHA DE NACIMIENTO': ['fecha de nacimiento', 'fecha_nacimiento', 'fecha nacimiento', 'birth_date', 'nacimiento', 'fecha'],
            'SEXO': ['sexo', 'genero', 'gender']
        };

        for (const requiredCol of requiredColumns) {
            mapping[requiredCol] = null;
            const variations = columnVariations[requiredCol] || [requiredCol.toLowerCase()];
            
            // Buscar coincidencia exacta primero
            for (const variation of variations) {
                const index = headers.findIndex(header => 
                    header === variation.toUpperCase()
                );
                if (index !== -1) {
                    mapping[requiredCol] = index;
                    break;
                }
            }
            
            // Si no hay coincidencia exacta, buscar coincidencias parciales
            if (mapping[requiredCol] === null) {
                for (const variation of variations) {
                    const index = headers.findIndex(header => 
                        header.includes(variation.toUpperCase()) ||
                        variation.toUpperCase().includes(header) ||
                        header.replace(/\s+/g, '') === variation.toUpperCase().replace(/\s+/g, '')
                    );
                    if (index !== -1) {
                        mapping[requiredCol] = index;
                        break;
                    }
                }
            }
            
            // Si aún no hay coincidencia, buscar por palabras clave
            if (mapping[requiredCol] === null) {
                const keywords = {
                    'NOMBRE': ['nombre', 'nombres'],
                    'APELLIDOS': ['apellido', 'apellidos'],
                    'DNI': ['dni', 'documento', 'identificacion'],
                    'FECHA DE NACIMIENTO': ['fecha', 'nacimiento', 'birth'],
                    'SEXO': ['sexo', 'genero', 'gender']
                };
                
                const keywordsForCol = keywords[requiredCol] || [];
                for (const keyword of keywordsForCol) {
                    const index = headers.findIndex(header => 
                        header.toLowerCase().includes(keyword.toLowerCase())
                    );
                    if (index !== -1) {
                        mapping[requiredCol] = index;
                        break;
                    }
                }
            }
        }

        return mapping;
    }

    processExcelRow(row, columnMapping, headers) {
        try {
            // Debug: mostrar datos originales
            console.log('Procesando fila:', row);
            console.log('Mapeo usado:', columnMapping);
            
            const rawData = {
                nombres: row[columnMapping['NOMBRE']],
                apellidos: row[columnMapping['APELLIDOS']],
                dni: row[columnMapping['DNI']],
                fechaNacimiento: row[columnMapping['FECHA DE NACIMIENTO']],
                sexo: row[columnMapping['SEXO']]
            };
            
            console.log('Datos originales:', rawData);
            
            const atleta = {
                nombres: this.cleanString(rawData.nombres),
                apellidos: this.cleanString(rawData.apellidos),
                dni: this.cleanDNI(rawData.dni),
                fechaNacimiento: this.processDate(rawData.fechaNacimiento),
                sexo: this.processSex(rawData.sexo)
            };
            
            console.log('Datos procesados:', atleta);

            // Validar datos con información detallada
            const validationErrors = [];
            if (!atleta.nombres) validationErrors.push('nombres vacío');
            if (!atleta.apellidos) validationErrors.push('apellidos vacío');
            if (!atleta.dni) validationErrors.push('dni inválido');
            if (!atleta.fechaNacimiento) validationErrors.push('fecha inválida');
            if (!atleta.sexo) validationErrors.push('sexo inválido');
            
            if (validationErrors.length > 0) {
                console.log('Errores de validación:', validationErrors);
                return null;
            }

            return atleta;
        } catch (error) {
            console.error('Error procesando fila:', error);
            return null;
        }
    }

    cleanString(value) {
        if (!value) return '';
        
        const str = String(value).trim();
        if (!str || str === 'undefined' || str === 'null') return '';
        
        console.log(`String procesado: "${value}" -> "${str}"`);
        return str;
    }

    cleanDNI(value) {
        if (!value) return '';
        
        // Convertir a string y limpiar
        const dniStr = String(value).trim();
        if (!dniStr || dniStr === 'undefined' || dniStr === 'null') return '';
        
        // Extraer solo números
        const dniClean = dniStr.replace(/[^0-9]/g, '');
        
        // Verificar que tenga exactamente 8 dígitos
        if (dniClean.length === 8) {
            return dniClean;
        }
        
        console.log(`DNI inválido: "${dniStr}" -> "${dniClean}" (longitud: ${dniClean.length})`);
        return '';
    }

    processDate(value) {
        if (!value) return '';
        
        try {
            // Si es un objeto Date
            if (value instanceof Date) {
                return value.toISOString().split('T')[0];
            }
            
            // Si es un string, intentar parsearlo
            const dateStr = String(value).trim();
            if (!dateStr || dateStr === 'undefined' || dateStr === 'null') return '';
            
            console.log(`Procesando fecha: "${dateStr}"`);
            
            // Intentar diferentes formatos
            const formats = [
                /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
                /(\d{1,2})-(\d{1,2})-(\d{4})/,   // DD-MM-YYYY
                /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
                /(\d{1,2})\/(\d{1,2})\/(\d{2})/, // DD/MM/YY
                /(\d{1,2})-(\d{1,2})-(\d{2})/    // DD-MM-YY
            ];
            
            for (const format of formats) {
                const match = dateStr.match(format);
                if (match) {
                    let day, month, year;
                    
                    if (format.source.includes('YYYY')) {
                        [, day, month, year] = match;
                    } else {
                        [, day, month, year] = match;
                        year = year.length === 2 ? '20' + year : year;
                    }
                    
                    const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    console.log(`Fecha procesada: "${dateStr}" -> "${result}"`);
                    return result;
                }
            }
            
            console.log(`Fecha inválida: "${dateStr}" - no coincide con ningún formato`);
            return '';
        } catch (error) {
            console.error('Error procesando fecha:', error);
            return '';
        }
    }

    processSex(value) {
        if (!value) return '';
        
        const sexStr = String(value).trim();
        if (!sexStr || sexStr === 'undefined' || sexStr === 'null') return '';
        
        const sexUpper = sexStr.toUpperCase();
        const sexMapping = {
            'M': 'Masculino',
            'MASCULINO': 'Masculino',
            'MALE': 'Masculino',
            'HOMBRE': 'Masculino',
            'H': 'Masculino',
            'F': 'Femenino',
            'FEMENINO': 'Femenino',
            'FEMALE': 'Femenino',
            'MUJER': 'Femenino'
        };
        
        const result = sexMapping[sexUpper] || '';
        console.log(`Sexo procesado: "${sexStr}" -> "${result}"`);
        
        if (!result) {
            console.log(`Sexo inválido: "${sexStr}" - no reconocido`);
        }
        
        return result;
    }

    showImportProgress(message) {
        const dropzone = document.getElementById('importDropzone');
        if (dropzone) {
            dropzone.innerHTML = `
                <div class="import-progress">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    hideImportProgress() {
        const dropzone = document.getElementById('importDropzone');
        if (dropzone) {
            dropzone.innerHTML = `
                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                <p>Arrastra y suelta tu archivo Excel o CSV aquí</p>
                <p class="text-muted">o haz clic para seleccionar el archivo</p>
                <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" style="display: none;">
            `;
        }
    }

    restoreImportModal() {
        const modal = document.getElementById('importDBModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // Restaurar contenido original del modal
        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h2>
                <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                Importar Base de Datos (Beta)
            </h2>
            <div class="import-dropzone" id="importDropzone">
                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                <p>Arrastra y suelta tu archivo Excel o CSV aquí</p>
                <p class="text-muted">o haz clic para seleccionar el archivo</p>
                <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" style="display: none;">
            </div>
            <div class="import-info">
                <p class="text-muted">Formatos soportados: Excel (.xlsx, .xls) y CSV</p>
                <p class="text-muted">Tamaño máximo: 5MB</p>
            </div>
        `;
        
        // Reconfigurar eventos del modal
        this.setupImportHandlers();
    }

    showImportPreview(atletas, totalRows, validRows, invalidRows) {
        const modal = document.getElementById('importDBModal');
        const modalContent = modal.querySelector('.modal-content');
        
        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h2>
                <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z"/>
                </svg>
                Vista Previa de Importación
            </h2>
            
            <div class="import-summary">
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-number">${totalRows}</span>
                        <span class="stat-label">Total de filas</span>
                    </div>
                    <div class="stat-item valid">
                        <span class="stat-number">${validRows}</span>
                        <span class="stat-label">Válidas</span>
                    </div>
                    <div class="stat-item invalid">
                        <span class="stat-number">${invalidRows}</span>
                        <span class="stat-label">Inválidas</span>
                    </div>
                </div>
            </div>
            
            <div class="import-preview-table">
                <h4>Atletas a importar:</h4>
                <div class="table-container">
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nombres</th>
                                <th>Apellidos</th>
                                <th>DNI</th>
                                <th>Fecha Nac.</th>
                                <th>Sexo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${atletas.slice(0, 10).map((atleta, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${atleta.nombres}</td>
                                    <td>${atleta.apellidos}</td>
                                    <td>${atleta.dni}</td>
                                    <td>${new Date(atleta.fechaNacimiento).toLocaleDateString('es-ES')}</td>
                                    <td>${atleta.sexo}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${atletas.length > 10 ? `<p class="text-muted">Mostrando los primeros 10 de ${atletas.length} atletas</p>` : ''}
            </div>
            
            <div class="import-actions">
                <button type="button" class="btn btn-primary" onclick="window.perfilDelegacionManager.importarAtletas(${JSON.stringify(atletas).replace(/"/g, '&quot;')})">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                    </svg>
                    Importar ${atletas.length} Atletas
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.perfilDelegacionManager.cancelarImportacion()">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                    </svg>
                    Cancelar
                </button>
            </div>
        `;
        
        // Reconfigurar el botón de cerrar
        const closeBtn = modalContent.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            modal.classList.remove('active');
            this.restoreImportModal();
        });
    }

    abrirPerfil() {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Mostrar la página de perfil
        const perfilDelegacion = document.getElementById('perfilDelegacion');
        if (perfilDelegacion) {
            perfilDelegacion.classList.add('active');
        }

        // Cargar datos del perfil
        this.cargarDatosPerfil();
        this.cargarAtletas();
        
        // Asegurar que la sección de atletas esté activa por defecto
        this.mostrarSeccionAtletas();
    }

    volverAlDashboard() {
        // Verificar si el usuario actual es administrador
        const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
        
        if (currentUser && currentUser.tipo === 'admin') {
            // Si es administrador, navegar al panel de administrador
            console.log('🔄 Administrador volviendo al panel de administrador');
            navigateToAdminPanel();
            return;
        }
        
        // Cancelar edición si estaba activa
        if (this.isEditing) {
            this.cancelarEdicion();
        }
        
        // Recargar la página para actualizar todos los cambios
        console.log('🔄 Recargando página para actualizar cambios...');
        window.location.reload();
    }

    // Configurar eventos de foto de perfil
    setupFotoPerfilEvents() {
        const btnCambiarFoto = document.getElementById('btnCambiarFoto');
        const btnEliminarFoto = document.getElementById('btnEliminarFoto');
        const perfilFotoInput = document.getElementById('perfilFotoInput');

        if (btnCambiarFoto) {
            btnCambiarFoto.addEventListener('click', () => {
                perfilFotoInput.click();
            });
        }

        if (btnEliminarFoto) {
            btnEliminarFoto.addEventListener('click', () => {
                this.eliminarFotoPerfil();
            });
        }

        if (perfilFotoInput) {
            perfilFotoInput.addEventListener('change', (e) => {
                this.handleFotoPerfilChange(e);
            });
        }
    }

    // Manejar cambio de foto de perfil
    async handleFotoPerfilChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar archivo
        if (file.size > 5 * 1024 * 1024) {
            window.authManager.showMessage('La foto es muy grande. Máximo 5MB permitido.', 'error');
            return;
        }

        if (!file.type.startsWith('image/')) {
            window.authManager.showMessage('El archivo debe ser una imagen.', 'error');
            return;
        }

        try {
            // Convertir imagen a base64
            const fotoPerfilBase64 = await window.authManager.convertImageToBase64(file);
            
            // Actualizar vista previa
            this.actualizarFotoPerfilPreview(fotoPerfilBase64);
            
            // Guardar en Firebase
            await this.guardarFotoPerfil(fotoPerfilBase64);
            
            window.authManager.showMessage('Foto de perfil actualizada correctamente', 'success');
            
        } catch (error) {
            console.error('Error al procesar foto de perfil:', error);
            window.authManager.showMessage('Error al procesar la foto de perfil', 'error');
        }
    }

    // Actualizar vista previa de foto de perfil
    actualizarFotoPerfilPreview(fotoPerfilBase64) {
        const perfilFotoContainer = document.getElementById('perfilFotoContainer');
        const btnEliminarFoto = document.getElementById('btnEliminarFoto');
        
        if (perfilFotoContainer) {
            if (fotoPerfilBase64) {
                perfilFotoContainer.innerHTML = `<img src="${fotoPerfilBase64}" alt="Foto de perfil">`;
                if (btnEliminarFoto) {
                    btnEliminarFoto.classList.remove('hidden');
                }
            } else {
                perfilFotoContainer.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                    </svg>
                `;
                if (btnEliminarFoto) {
                    btnEliminarFoto.classList.add('hidden');
                }
            }
        }
    }

    // Guardar foto de perfil en Firebase
    async guardarFotoPerfil(fotoPerfilBase64) {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        await window.firebaseDB.collection('users').doc(currentUser.uid).update({
            fotoPerfil: fotoPerfilBase64,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Actualizar datos del usuario en authManager
        currentUser.fotoPerfil = fotoPerfilBase64;
        
        // Actualizar botón de perfil
        window.authManager.updatePerfilBtnFoto();
    }

    // Eliminar foto de perfil
    async eliminarFotoPerfil() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) return;

        try {
            await window.firebaseDB.collection('users').doc(currentUser.uid).update({
                fotoPerfil: null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Actualizar datos del usuario en authManager
            currentUser.fotoPerfil = null;
            
            // Actualizar vista
            this.actualizarFotoPerfilPreview(null);
            
            // Actualizar botón de perfil
            window.authManager.updatePerfilBtnFoto();
            
            window.authManager.showMessage('Foto de perfil eliminada correctamente', 'success');
            
        } catch (error) {
            console.error('Error al eliminar foto de perfil:', error);
            window.authManager.showMessage('Error al eliminar la foto de perfil', 'error');
        }
    }

    async cargarDatosPerfil() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) return;

            // Cargar datos desde Firebase
            const userDoc = await window.firebaseDB.collection('users').doc(currentUser.uid).get();
            if (!userDoc.exists) return;

            const userData = userDoc.data();
            
            // Llenar los campos
            document.getElementById('perfilNombre').value = userData.nombre || '';
            document.getElementById('perfilAbreviatura').value = userData.abreviatura || '';
            document.getElementById('perfilTelefono').value = userData.telefono || '';
            document.getElementById('perfilEmail').value = userData.email || '';
            document.getElementById('perfilRepresentante').value = userData.representante || '';
            document.getElementById('perfilDniRepresentante').value = userData.dniRepresentante || '';
            
            // Fecha de registro
            if (userData.createdAt) {
                const fecha = userData.createdAt.toDate();
                document.getElementById('perfilFechaRegistro').value = fecha.toLocaleDateString('es-ES');
            }

            // Cargar foto de perfil
            this.cargarFotoPerfil(userData.fotoPerfil);

            // Guardar datos originales
            this.originalData = { ...userData };

        } catch (error) {
            console.error('Error cargando datos del perfil:', error);
            window.authManager.showMessage('Error al cargar datos del perfil', 'error');
        }
    }

    // Cargar foto de perfil
    cargarFotoPerfil(fotoPerfilBase64) {
        const perfilFotoContainer = document.getElementById('perfilFotoContainer');
        const btnEliminarFoto = document.getElementById('btnEliminarFoto');
        
        if (perfilFotoContainer) {
            if (fotoPerfilBase64) {
                perfilFotoContainer.innerHTML = `<img src="${fotoPerfilBase64}" alt="Foto de perfil">`;
                if (btnEliminarFoto) {
                    btnEliminarFoto.classList.remove('hidden');
                }
            } else {
                perfilFotoContainer.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                    </svg>
                `;
                if (btnEliminarFoto) {
                    btnEliminarFoto.classList.add('hidden');
                }
            }
        }
    }

    activarEdicion() {
        this.isEditing = true;
        
        // Habilitar campos editables (excepto algunos)
        const campos = ['perfilNombre', 'perfilAbreviatura', 'perfilTelefono', 'perfilEmail', 'perfilRepresentante'];
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) {
                input.disabled = false;
            }
        });

        // Mostrar/ocultar botones
        document.getElementById('btnEditarPerfil').classList.add('hidden');
        document.getElementById('btnGuardarPerfil').classList.remove('hidden');
        document.getElementById('btnCancelarPerfil').classList.remove('hidden');
    }

    async guardarCambios() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) return;

            // Recopilar datos del formulario
            const datosActualizados = {
                nombre: document.getElementById('perfilNombre').value.trim(),
                abreviatura: document.getElementById('perfilAbreviatura').value.trim().toUpperCase(),
                telefono: document.getElementById('perfilTelefono').value.trim(),
                email: document.getElementById('perfilEmail').value.trim(),
                representante: document.getElementById('perfilRepresentante').value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Validaciones básicas
            if (!datosActualizados.nombre) {
                window.authManager.showMessage('El nombre de la delegación es obligatorio', 'error');
                return;
            }

            if (!datosActualizados.abreviatura) {
                window.authManager.showMessage('La abreviatura de la delegación es obligatoria', 'error');
                return;
            }

            if (datosActualizados.abreviatura.length > 10) {
                window.authManager.showMessage('La abreviatura no puede tener más de 10 caracteres', 'error');
                return;
            }

            if (!datosActualizados.representante) {
                window.authManager.showMessage('El nombre del representante es obligatorio', 'error');
                return;
            }

            // Verificar si la abreviatura ya existe (si ha cambiado)
            if (datosActualizados.abreviatura !== this.originalData.abreviatura) {
                const abreviaturaSnapshot = await window.firebaseDB.collection('users')
                    .where('abreviatura', '==', datosActualizados.abreviatura)
                    .get();
                
                if (!abreviaturaSnapshot.empty) {
                    window.authManager.showMessage('Ya existe una delegación con esta abreviatura', 'error');
                    return;
                }
            }

            // Actualizar en Firebase
            await window.firebaseDB.collection('users').doc(currentUser.uid).update(datosActualizados);

            // Actualizar datos del usuario actual
            Object.assign(this.originalData, datosActualizados);

            // Desactivar edición
            this.cancelarEdicion();

            window.authManager.showMessage('Perfil actualizado correctamente', 'success');

        } catch (error) {
            console.error('Error guardando cambios:', error);
            window.authManager.showMessage('Error al guardar los cambios', 'error');
        }
    }

    cancelarEdicion() {
        this.isEditing = false;

        // Restaurar valores originales
        document.getElementById('perfilNombre').value = this.originalData.nombre || '';
        document.getElementById('perfilAbreviatura').value = this.originalData.abreviatura || '';
        document.getElementById('perfilTelefono').value = this.originalData.telefono || '';
        document.getElementById('perfilEmail').value = this.originalData.email || '';
        document.getElementById('perfilRepresentante').value = this.originalData.representante || '';

        // Deshabilitar campos
        const campos = ['perfilNombre', 'perfilAbreviatura', 'perfilTelefono', 'perfilEmail', 'perfilRepresentante'];
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) {
                input.disabled = true;
            }
        });

        // Mostrar/ocultar botones
        document.getElementById('btnEditarPerfil').classList.remove('hidden');
        document.getElementById('btnGuardarPerfil').classList.add('hidden');
        document.getElementById('btnCancelarPerfil').classList.add('hidden');
    }

    async cargarAtletas() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) return;

            // Cargar atletas desde Firestore
            const atletasSnapshot = await window.firebaseDB.collection('atletas')
                .where('academiaId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();

            this.atletas = atletasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderizarTablaAtletas();

        } catch (error) {
            console.error('Error cargando atletas:', error);
            window.authManager.showMessage('Error al cargar atletas', 'error');
        }
    }

    // Métodos para navegación entre secciones
    mostrarSeccionAtletas() {
        // Actualizar botones de navegación
        document.getElementById('btnMisAtletas').classList.add('active');
        document.getElementById('btnMisEventos').classList.remove('active');

        // Mostrar sección de atletas
        document.getElementById('misAtletasSection').classList.add('active');
        document.getElementById('misEventosSection').classList.remove('active');

        // Actualizar sección actual
        this.currentSection = 'atletas';
    }

    async mostrarSeccionEventos() {
        // Actualizar botones de navegación
        document.getElementById('btnMisAtletas').classList.remove('active');
        document.getElementById('btnMisEventos').classList.add('active');

        // Mostrar sección de eventos
        document.getElementById('misAtletasSection').classList.remove('active');
        document.getElementById('misEventosSection').classList.add('active');

        // Actualizar sección actual
        this.currentSection = 'eventos';

        // Cargar eventos si no se han cargado antes
        await this.cargarMisEventos();
    }

    async cargarMisEventos() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) return;

            // Cargar eventos creados por esta delegación
            const eventosSnapshot = await window.firebaseDB.collection('eventos')
                .where('academiaId', '==', currentUser.uid)
                .orderBy('fecha', 'desc')
                .get();

            this.eventos = eventosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderizarMisEventos(this.eventos);

        } catch (error) {
            console.error('Error cargando eventos:', error);
            window.authManager.showMessage('Error al cargar eventos', 'error');
        }
    }

    renderizarMisEventos(eventos) {
        const eventosGrid = document.getElementById('misEventosGrid');
        const totalEventos = document.getElementById('totalEventos');

        if (totalEventos) {
            totalEventos.textContent = `(${eventos.length})`;
        }

        if (eventos.length === 0) {
            eventosGrid.innerHTML = `
                <div class="empty-state">
                    <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                    </svg>
                    <p>No hay eventos creados</p>
                    <p class="text-muted">Crea tu primer evento para comenzar a gestionar competencias</p>
                </div>
            `;
            return;
        }

        eventosGrid.innerHTML = eventos.map((evento, index) => {
            const fechaFormateada = new Date(evento.fecha.toDate()).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const fechaCapitalizada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
            
            return `
                <div class="evento-publico-card ${evento.imagen ? 'has-background' : ''}" ${evento.imagen ? `style="--evento-background-image: url(${evento.imagen}); animation-delay: ${(index + 1) * 0.1}s;"` : `style="animation-delay: ${(index + 1) * 0.1}s;"`}>
                    ${evento.imagen ? '<div class="background-image"></div>' : ''}
                    <div class="evento-layout-horizontal">
                        <!-- Imagen cuadrada 1:1 -->
                        <div class="evento-imagen-container">
                            ${evento.imagen ? `
                                <img src="${evento.imagen}" alt="${evento.nombre}" class="evento-imagen-cuadrada">
                            ` : `
                                <div class="evento-imagen-placeholder">
                                    <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                                    </svg>
                                </div>
                            `}
                            ${evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null' ? `
                                <div class="evento-modalidad-overlay">
                                    <span class="badge-modalidad-overlay">${evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad}</span>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Contenido del evento -->
                        <div class="evento-contenido">
                            <!-- Fecha arriba del título -->
                            <div class="evento-fecha-principal">
                                <div class="fecha-info">
                                    <span class="fecha-text">${fechaCapitalizada}</span>
                                </div>
                            </div>
                            
                            <div class="evento-publico-header">
                                <h3>${evento.nombre}</h3>
                            </div>
                            
                            <!-- Ubicación con bandera debajo del título -->
                            <div class="evento-ubicacion-principal">
                                ${evento.pais ? getCountryFlagHTML(evento.pais) : '<span class="flag-icon" style="font-size: 1.2em; margin-right: 8px;">🌍</span>'}
                                <span class="ubicacion-text">
                                    ${evento.pais ? evento.pais + ', ' : ''}${evento.ciudad || ''}
                                </span>
                            </div>
                            
                            <div class="evento-publico-action">
                                <button class="btn btn-primary btn-sm" onclick="window.perfilDelegacionManager.verEvento('${evento.id}')">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"/>
                                    </svg>
                                    Ver
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="window.perfilDelegacionManager.editarEvento('${evento.id}')">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                    </svg>
                                    Editar
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="window.perfilDelegacionManager.eliminarEvento('${evento.id}')">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                    </svg>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    crearEvento() {
        // Usar el modal existente de crear evento
        if (window.eventsManager) {
            window.eventsManager.openCreateEventoModal();
        } else {
            window.authManager.showMessage('Sistema de eventos no disponible', 'error');
        }
    }

    async crearEventoConLoading() {
        const btnCrearEvento = document.getElementById('btnCrearEvento');
        if (!btnCrearEvento) return;

        this.preventMultipleClicks(btnCrearEvento, async () => {
            try {
                if (window.eventsManager) {
                    await window.eventsManager.openCreateEventoModal();
                } else {
                    window.authManager.showMessage('Sistema de eventos no disponible', 'error');
                }
            } catch (error) {
                console.error('Error al crear evento:', error);
                window.authManager.showMessage('Error al abrir el modal de crear evento', 'error');
            } finally {
                this.setButtonLoading(btnCrearEvento, false);
            }
        }, 'Abriendo...');
    }

    // Métodos de utilidad para botones (copiados de la clase App)
    setButtonLoading(button, isLoading, loadingText = null) {
        if (!button) return;
        
        if (isLoading) {
            // Guardar el texto original si no se ha guardado
            if (!button.hasAttribute('data-original-text')) {
                button.setAttribute('data-original-text', button.innerHTML);
            }
            
            if (loadingText) {
                // Modo con texto de carga
                button.classList.add('loading-text');
                button.innerHTML = `
                    <span class="loading-spinner"></span>
                    ${loadingText}
                `;
            } else {
                // Modo solo spinner
                button.classList.add('loading');
            }
            
            button.disabled = true;
        } else {
            // Restaurar estado original
            button.classList.remove('loading', 'loading-text');
            button.disabled = false;
            
            // Restaurar texto original
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
            }
        }
    }

    // Función para prevenir múltiples clicks
    preventMultipleClicks(button, callback, loadingText = null) {
        if (!button || button.disabled) return;
        
        this.setButtonLoading(button, true, loadingText);
        
        // Ejecutar callback
        if (typeof callback === 'function') {
            callback();
        }
    }

    verEvento(eventoId) {
        // Navegar a la vista de detalles del evento
        if (window.publicEventsManager) {
            window.publicEventsManager.verDetallesEvento(eventoId);
        } else {
            window.authManager.showMessage('Sistema de eventos no disponible', 'error');
        }
    }

    editarEvento(eventoId) {
        // Abrir modal de edición de evento
        if (window.eventsManager) {
            window.eventsManager.openEditEventoModal(eventoId);
        } else {
            window.authManager.showMessage('Sistema de eventos no disponible', 'error');
        }
    }

    async eliminarEvento(eventoId) {
        // Buscar el evento en la lista
        const evento = this.eventos.find(e => e.id === eventoId);
        if (!evento) {
            window.authManager.showMessage('Evento no encontrado', 'error');
            return;
        }

        // Mostrar modal de confirmación
        this.mostrarModalConfirmacionEliminacion(evento);
    }

    renderizarTablaAtletas() {
        const tbody = document.getElementById('atletasTableBody');
        const totalAtletas = document.getElementById('totalAtletas');
        
        if (!tbody || !totalAtletas) return;

        // Actualizar contador
        totalAtletas.textContent = `(${this.atletas.length})`;

        if (this.atletas.length === 0) {
            tbody.innerHTML = `
                <tr class="no-atletas">
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                            </svg>
                            <p>No hay atletas registrados</p>
                            <p class="text-muted">Agrega atletas para poder inscribirlos en eventos</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.atletas.map((atleta, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${atleta.nombres}</td>
                <td>${atleta.apellidos}</td>
                <td>${atleta.dni}</td>
                <td>${new Date(atleta.fechaNacimiento).toLocaleDateString('es-ES')}</td>
                <td>${atleta.sexo || '-'}</td>
                <td>
                    <div class="acciones-cell">
                        <button class="btn btn-sm btn-warning" onclick="window.perfilDelegacionManager.editarAtleta('${atleta.id}')">
                            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.perfilDelegacionManager.eliminarAtleta('${atleta.id}')">
                            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    editarAtleta(atletaId) {
        // Buscar el atleta en la lista
        const atleta = this.atletas.find(a => a.id === atletaId);
        if (!atleta) {
            window.authManager.showMessage('Atleta no encontrado', 'error');
            return;
        }

        // Llenar el formulario con los datos del atleta
        document.getElementById('editarAtletaNombres').value = atleta.nombres || '';
        document.getElementById('editarAtletaApellidos').value = atleta.apellidos || '';
        document.getElementById('editarAtletaDni').value = atleta.dni || '';
        document.getElementById('editarAtletaFechaNacimiento').value = atleta.fechaNacimiento || '';
        document.getElementById('editarAtletaSexo').value = atleta.sexo || '';

        // Guardar el ID del atleta que se está editando
        this.atletaEditandoId = atletaId;

        // Mostrar el modal
        document.getElementById('editarAtletaModal').style.display = 'flex';
    }

    async eliminarAtleta(atletaId) {
        try {
            if (!confirm('¿Está seguro de eliminar este atleta?')) return;

            await window.firebaseDB.collection('atletas').doc(atletaId).delete();
            await this.cargarAtletas();
            window.authManager.showMessage('Atleta eliminado exitosamente', 'success');

        } catch (error) {
            console.error('Error eliminando atleta:', error);
            window.authManager.showMessage('Error al eliminar atleta', 'error');
        }
    }

    agregarAtleta() {
        const modal = document.getElementById('registroAtletaModal');
        modal.style.display = 'flex';
    }

    async handleRegistroAtleta() {
        try {
            const nombres = document.getElementById('atletaNombres').value.trim();
            const apellidos = document.getElementById('atletaApellidos').value.trim();
            const dni = document.getElementById('atletaDni').value.trim();
            const fechaNacimiento = document.getElementById('atletaFechaNacimiento').value;
            const sexo = document.getElementById('atletaSexo').value;

            // Validar que todos los campos estén llenos
            if (!nombres || !apellidos || !dni || !fechaNacimiento || !sexo) {
                window.authManager.showMessage('Por favor, complete todos los campos', 'error');
                return;
            }

            // Validar formato de DNI
            if (!/^\d{8}$/.test(dni)) {
                window.authManager.showMessage('El DNI debe tener 8 dígitos', 'error');
                return;
            }

            // Calcular edad
            const hoy = new Date();
            const fechaNac = new Date(fechaNacimiento);
            let edad = hoy.getFullYear() - fechaNac.getFullYear();
            const mes = hoy.getMonth() - fechaNac.getMonth();
            if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                edad--;
            }

            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) {
                window.authManager.showMessage('Debe iniciar sesión para registrar atletas', 'error');
                return;
            }

            // Verificar si ya existe un atleta con el mismo DNI
            const atletaSnapshot = await window.firebaseDB.collection('atletas')
                .where('dni', '==', dni)
                .where('academiaId', '==', currentUser.uid)
                .get();

            if (!atletaSnapshot.empty) {
                window.authManager.showMessage('Ya existe un atleta registrado con este DNI', 'error');
                return;
            }

            // Crear documento del atleta en Firestore
            await window.firebaseDB.collection('atletas').add({
                academiaId: currentUser.uid,
                nombres: nombres,
                apellidos: apellidos,
                dni: dni,
                fechaNacimiento: fechaNacimiento,
                sexo: sexo,
                edad: edad,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Cerrar modal y limpiar formulario
            const modal = document.getElementById('registroAtletaModal');
            modal.style.display = 'none';
            document.getElementById('registroAtletaForm').reset();

            // Recargar lista de atletas
            await this.cargarAtletas();

            window.authManager.showMessage('Atleta registrado exitosamente', 'success');

        } catch (error) {
            console.error('Error registrando atleta:', error);
            window.authManager.showMessage('Error al registrar atleta', 'error');
        }
    }

    async handleEditarAtleta() {
        try {
            if (!this.atletaEditandoId) {
                window.authManager.showMessage('Error: No se identificó el atleta a editar', 'error');
                return;
            }

            const nombres = document.getElementById('editarAtletaNombres').value.trim();
            const apellidos = document.getElementById('editarAtletaApellidos').value.trim();
            const dni = document.getElementById('editarAtletaDni').value.trim();
            const fechaNacimiento = document.getElementById('editarAtletaFechaNacimiento').value;
            const sexo = document.getElementById('editarAtletaSexo').value;

            // Validar que todos los campos estén llenos
            if (!nombres || !apellidos || !dni || !fechaNacimiento || !sexo) {
                window.authManager.showMessage('Por favor, complete todos los campos', 'error');
                return;
            }

            // Validar formato de DNI
            if (!/^\d{8}$/.test(dni)) {
                window.authManager.showMessage('El DNI debe tener 8 dígitos', 'error');
                return;
            }

            // Calcular edad
            const hoy = new Date();
            const fechaNac = new Date(fechaNacimiento);
            let edad = hoy.getFullYear() - fechaNac.getFullYear();
            const mes = hoy.getMonth() - fechaNac.getMonth();
            if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                edad--;
            }

            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) {
                window.authManager.showMessage('Debe iniciar sesión para editar atletas', 'error');
                return;
            }

            // Verificar si ya existe otro atleta con el mismo DNI (excluyendo el actual)
            const atletaSnapshot = await window.firebaseDB.collection('atletas')
                .where('dni', '==', dni)
                .where('academiaId', '==', currentUser.uid)
                .get();

            const atletaExistente = atletaSnapshot.docs.find(doc => doc.id !== this.atletaEditandoId);
            if (atletaExistente) {
                window.authManager.showMessage('Ya existe otro atleta registrado con este DNI', 'error');
                return;
            }

            // Actualizar documento del atleta en Firestore
            await window.firebaseDB.collection('atletas').doc(this.atletaEditandoId).update({
                nombres: nombres,
                apellidos: apellidos,
                dni: dni,
                fechaNacimiento: fechaNacimiento,
                sexo: sexo,
                edad: edad,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Cerrar modal y limpiar formulario
            const modal = document.getElementById('editarAtletaModal');
            modal.style.display = 'none';
            document.getElementById('editarAtletaForm').reset();

            // Limpiar ID del atleta editando
            this.atletaEditandoId = null;

            // Recargar lista de atletas
            await this.cargarAtletas();

            window.authManager.showMessage('Atleta actualizado exitosamente', 'success');

        } catch (error) {
            console.error('Error actualizando atleta:', error);
            window.authManager.showMessage('Error al actualizar atleta', 'error');
        }
    }

    // Métodos para importación masiva de atletas
    async importarAtletas(atletasData) {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) {
                window.authManager.showMessage('Debe iniciar sesión para importar atletas', 'error');
                return;
            }

            if (!atletasData || atletasData.length === 0) {
                window.authManager.showMessage('No hay datos válidos para importar', 'error');
                return;
            }

            // Verificar duplicados ANTES de importar
            this.showImportProgress('Verificando duplicados...');
            
            const duplicadosEncontrados = [];
            
            // Verificar cada atleta contra la base de datos existente
            for (const atleta of atletasData) {
                try {
                    const atletaSnapshot = await window.firebaseDB.collection('atletas')
                        .where('dni', '==', atleta.dni)
                        .where('academiaId', '==', currentUser.uid)
                        .get();

                    if (!atletaSnapshot.empty) {
                        duplicadosEncontrados.push({
                            dni: atleta.dni,
                            nombres: atleta.nombres,
                            apellidos: atleta.apellidos
                        });
                    }
                } catch (error) {
                    console.error('Error verificando duplicado:', error);
                }
            }

            // Si hay duplicados, mostrar advertencia e impedir importación
            if (duplicadosEncontrados.length > 0) {
                this.hideImportProgress();
                
                const mensajeAdvertencia = `Se encontraron ${duplicadosEncontrados.length} atleta(s) con DNI duplicado. La importación ha sido cancelada para evitar duplicados.`;
                
                window.authManager.showMessage(mensajeAdvertencia, 'warning');
                return;
            }

            // Si no hay duplicados, proceder con la importación
            this.showImportProgress('Importando atletas...');

            let importados = 0;
            let errores = 0;

            // Procesar cada atleta
            for (const atleta of atletasData) {
                try {
                    // Calcular edad
                    const fechaNac = new Date(atleta.fechaNacimiento);
                    const hoy = new Date();
                    let edad = hoy.getFullYear() - fechaNac.getFullYear();
                    const mes = hoy.getMonth() - fechaNac.getMonth();
                    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                        edad--;
                    }

                    // Crear documento del atleta en Firestore
                    await window.firebaseDB.collection('atletas').add({
                        academiaId: currentUser.uid,
                        nombres: atleta.nombres,
                        apellidos: atleta.apellidos,
                        dni: atleta.dni,
                        fechaNacimiento: atleta.fechaNacimiento,
                        sexo: atleta.sexo,
                        edad: edad,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    importados++;

                } catch (error) {
                    console.error('Error importando atleta:', error);
                    errores++;
                }
            }

            // Cerrar modal de importación
            const importModal = document.getElementById('importDBModal');
            importModal.style.display = 'none';
            importModal.classList.remove('active');

            // Restaurar modal original
            this.restoreImportModal();

            // Recargar lista de atletas
            await this.cargarAtletas();

            // Mostrar resumen de importación exitosa
            let mensaje = `✅ Importación completada exitosamente: ${importados} atletas importados`;
            if (errores > 0) {
                mensaje += `, ${errores} errores`;
            }

            window.authManager.showMessage(mensaje, 'success');

        } catch (error) {
            console.error('Error en importación masiva:', error);
            window.authManager.showMessage('Error durante la importación: ' + error.message, 'error');
            this.hideImportProgress();
        }
    }

    cancelarImportacion() {
        const importModal = document.getElementById('importDBModal');
        importModal.style.display = 'none';
        importModal.classList.remove('active');
        this.restoreImportModal();
    }

    // Métodos para el modal de confirmación de eliminación
    setupDeleteModalHandlers() {
        const deleteModal = document.getElementById('deleteEventModal');
        if (!deleteModal) return;

        const closeBtn = deleteModal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
        }

        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    deleteModal.style.display = 'none';
                }
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                if (this.eventoAEliminar) {
                    await this.confirmarEliminacionEvento(this.eventoAEliminar);
                }
            });
        }
    }

    setupFileInputHandlers() {
        // Configurar todos los inputs de tipo file personalizados
        const fileInputs = [
            { id: 'registerFotoPerfil', type: 'image' },
            { id: 'eventoImagen', type: 'image' },
            { id: 'eventoBasesPdf', type: 'pdf' },
            { id: 'fileInput', type: 'excel' }
        ];

        fileInputs.forEach(({ id, type }) => {
            const input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('change', (e) => {
                this.updateFileInputDisplay(id, e.target.files[0], type);
            });
        });
    }

    updateFileInputDisplay(inputId, file, type) {
        const wrapper = document.querySelector(`#${inputId}`).closest('.file-input-wrapper');
        if (!wrapper) return;

        const customInput = wrapper.querySelector('.file-input-custom');
        const fileText = wrapper.querySelector('.file-text');
        const fileHint = wrapper.querySelector('.file-hint');

        if (file) {
            // Archivo seleccionado
            customInput.classList.add('has-file');
            fileText.textContent = file.name;
            
            // Mostrar tamaño del archivo
            const fileSize = this.formatFileSize(file.size);
            fileHint.textContent = fileSize;
            
            // Cambiar icono según el tipo
            const icon = customInput.querySelector('.icon');
            if (type === 'image') {
                icon.innerHTML = '<path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>';
            } else if (type === 'pdf') {
                icon.innerHTML = '<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>';
            } else if (type === 'excel') {
                icon.innerHTML = '<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>';
            }

            // Manejo especial para la foto de perfil del registro
            if (inputId === 'registerFotoPerfil') {
                this.updateRegisterPhotoPreview(file);
            }
        } else {
            // Sin archivo
            customInput.classList.remove('has-file');
            
            // Restaurar texto original
            if (type === 'image') {
                fileText.textContent = 'Seleccionar imagen';
                fileHint.textContent = 'JPG, PNG, GIF';
            } else if (type === 'pdf') {
                fileText.textContent = 'Seleccionar archivo PDF';
                fileHint.textContent = 'PDF';
            } else if (type === 'excel') {
                fileText.textContent = 'Seleccionar archivo Excel o CSV';
                fileHint.textContent = 'XLSX, XLS, CSV';
            }

            // Manejo especial para la foto de perfil del registro
            if (inputId === 'registerFotoPerfil') {
                this.clearRegisterPhotoPreview();
            }
        }
    }

    updateRegisterPhotoPreview(file) {
        const preview = document.getElementById('registerPhotoPreview');
        const removeBtn = document.getElementById('removeRegisterPhotoBtn');
        
        if (!preview || !removeBtn) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        };
        reader.readAsDataURL(file);

        removeBtn.style.display = 'block';
        
        // Configurar el botón de quitar foto
        removeBtn.onclick = () => {
            this.clearRegisterPhotoPreview();
            document.getElementById('registerFotoPerfil').value = '';
            this.updateFileInputDisplay('registerFotoPerfil', null, 'image');
        };
    }

    clearRegisterPhotoPreview() {
        const preview = document.getElementById('registerPhotoPreview');
        const removeBtn = document.getElementById('removeRegisterPhotoBtn');
        
        if (!preview || !removeBtn) return;

        preview.innerHTML = `
            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
            </svg>
        `;
        removeBtn.style.display = 'none';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    mostrarModalConfirmacionEliminacion(evento) {
        this.eventoAEliminar = evento;
        const deleteModal = document.getElementById('deleteEventModal');
        const eventNameElement = document.getElementById('deleteEventName');
        
        if (!deleteModal || !eventNameElement) return;
        
        // Actualizar el nombre del evento en el modal
        eventNameElement.textContent = `"${evento.nombre}"`;
        
        // Mostrar el modal
        deleteModal.style.display = 'flex';
    }

    async confirmarEliminacionEvento(evento) {
        try {
            // Mostrar indicador de carga
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                        <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
                    </path>
                </svg>
                Eliminando...
            `;
            confirmBtn.disabled = true;

            // Eliminar el evento
            await window.firebaseDB.collection('eventos').doc(evento.id).delete();

            // Cerrar modal
            const deleteModal = document.getElementById('deleteEventModal');
            deleteModal.style.display = 'none';

            // Limpiar referencia
            this.eventoAEliminar = null;

            // Mostrar mensaje de éxito
            window.authManager.showMessage('Evento eliminado exitosamente', 'success');

            // Recargar eventos si estamos en la sección de eventos
            if (this.currentSection === 'eventos') {
                await this.cargarMisEventos();
            }

        } catch (error) {
            console.error('Error eliminando evento:', error);
            window.authManager.showMessage('Error al eliminar el evento', 'error');
            
            // Restaurar botón
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
}

// Inicializar la aplicación global
window.app = new App();