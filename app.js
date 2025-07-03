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
            
            // Inicializar managers
            window.eventsManager.init();
            
            // Inicializar publicEventsManager solo si estamos en la página principal
            if (document.getElementById('eventosPublicos')) {
                window.publicEventsManager.init();
            }
            
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
                window.dashboardManager && 
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

    // Información de la aplicación
    getAppInfo() {
        return {
            name: 'MEXXUS ARENA - Sistema de Gestión',
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
        if (window.dashboardManager) {
            window.dashboardManager.invalidateCache();
        }
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
        
        // Recargar dashboard si está activo
        if (window.dashboardManager && window.authManager?.isAcademia()) {
            await window.dashboardManager.loadDashboardData();
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

        console.log('🏆 Bienvenido a MEXXUS ARENA v2.0!');
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
        if (this.currentEvento && this.currentEvento.id && window.dashboardManager) {
            window.dashboardManager.loadAlumnosInscritosEnPanel(this.currentEvento.id);
        }
    }

    volverAlDashboard() {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Mostrar el dashboard de academia
        const academiaDashboard = document.getElementById('academiaDashboard');
        if (academiaDashboard) {
            academiaDashboard.classList.add('active');
            
            // Actualizar datos del dashboard una sola vez
            if (window.dashboardManager) {
                window.dashboardManager.loadEventosDisponibles();
            }
        }
        
        // Limpiar el evento actual
        this.currentEvento = null;
    }

    // Método para establecer el evento actual (usado desde dashboard)
    setCurrentEvento(evento) {
        this.currentEvento = evento;
    }
}

// Inicializar el gestor del menú móvil y panel de inscripción
document.addEventListener('DOMContentLoaded', () => {
    window.mobileMenuManager = new MobileMenuManager();
    window.panelInscripcionManager = new PanelInscripcionManager();
    window.perfilDelegacionManager = new PerfilDelegacionManager();
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
        this.atletaEditandoId = null;
        this.setupEventListeners();
        this.setupModalHandlers();
        this.setupImportHandlers();
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
    }

    setupModalHandlers() {
        // Modal de registro de atleta
        const registroModal = document.getElementById('registroAtletaModal');
        const registroCloseBtn = registroModal.querySelector('.close');
        const registroForm = document.getElementById('registroAtletaForm');

        registroCloseBtn.addEventListener('click', () => {
            this.cerrarModalRegistro();
        });

        window.addEventListener('click', (e) => {
            if (e.target === registroModal) {
                this.cerrarModalRegistro();
            }
        });

        registroForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistroAtleta();
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

        // Botón para descargar plantilla
        const btnDescargarPlantilla = document.getElementById('btnDescargarPlantilla');
        if (btnDescargarPlantilla) {
            btnDescargarPlantilla.addEventListener('click', () => {
                this.descargarPlantillaExcel();
            });
        }
    }

    descargarPlantillaExcel() {
        try {
            // Datos de ejemplo para la plantilla con el orden correcto
            const datosEjemplo = [
                {
                    'NUMERO DE ORDEN': 1,
                    'NOMBRES': 'Juan Carlos',
                    'APELLIDOS': 'Pérez González',
                    'DNI': '12345678',
                    'FECHA DE NACIMIENTO': '15/03/1995',
                    'SEXO': 'Masculino'
                },
                {
                    'NUMERO DE ORDEN': 2,
                    'NOMBRES': 'María José',
                    'APELLIDOS': 'Rodríguez Silva',
                    'DNI': '87654321',
                    'FECHA DE NACIMIENTO': '22/08/1998',
                    'SEXO': 'Femenino'
                },
                {
                    'NUMERO DE ORDEN': 3,
                    'NOMBRES': 'Carlos',
                    'APELLIDOS': 'Mendoza',
                    'DNI': '11223344',
                    'FECHA DE NACIMIENTO': '10/12/2000',
                    'SEXO': 'M'
                }
            ];

            // Crear libro de trabajo
            const ws = XLSX.utils.json_to_sheet(datosEjemplo);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Atletas");

            // Configurar ancho de columnas
            const colWidths = [
                { wch: 15 }, // NUMERO DE ORDEN
                { wch: 20 }, // NOMBRES
                { wch: 25 }, // APELLIDOS
                { wch: 12 }, // DNI
                { wch: 20 }, // FECHA DE NACIMIENTO
                { wch: 12 }  // SEXO
            ];
            ws['!cols'] = colWidths;

            // Descargar archivo
            const fileName = 'plantilla_atletas_ejemplo.xlsx';
            XLSX.writeFile(wb, fileName);

            window.authManager.showMessage('Plantilla de ejemplo descargada exitosamente', 'success');

        } catch (error) {
            console.error('Error generando plantilla:', error);
            window.authManager.showMessage('Error al generar la plantilla de ejemplo', 'error');
        }
    }

    async handleFileImport(file) {
        if (!file) return;

        try {
            // Show loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p class="loading-text">Importando atletas...</p>
                    <p class="loading-progress">0%</p>
                </div>
            `;
            document.body.appendChild(loadingOverlay);

            // Validar tipo de archivo
            const validTypes = [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv'
            ];

            if (!validTypes.includes(file.type)) {
                document.body.removeChild(loadingOverlay);
                window.authManager.showMessage('Formato de archivo no soportado. Por favor, usa Excel (.xlsx, .xls) o CSV.', 'error');
                return;
            }

            // Validar tamaño (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                document.body.removeChild(loadingOverlay);
                window.authManager.showMessage('El archivo es demasiado grande. El tamaño máximo es 5MB.', 'error');
                return;
            }

            // Leer archivo como ArrayBuffer
            const data = await this.readFileAsArrayBuffer(file);
            
            // Procesar con XLSX
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convertir a JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                document.body.removeChild(loadingOverlay);
                window.authManager.showMessage('El archivo no contiene datos válidos.', 'error');
                return;
            }

            // Validar columnas requeridas
            const requiredColumns = ['NUMERO DE ORDEN', 'NOMBRES', 'APELLIDOS', 'DNI', 'FECHA DE NACIMIENTO', 'SEXO'];
            const fileColumns = Object.keys(jsonData[0]).map(col => col.toUpperCase().trim());
            
            const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col));
            
            if (missingColumns.length > 0) {
                document.body.removeChild(loadingOverlay);
                window.authManager.showMessage(
                    `Faltan las siguientes columnas requeridas: ${missingColumns.join(', ')}. Las columnas deben ser exactamente: ${requiredColumns.join(', ')}`, 
                    'error'
                );
                return;
            }

            // Procesar datos y crear atletas
            await this.processAthleteData(jsonData, loadingOverlay);

        } catch (error) {
            console.error('Error procesando archivo:', error);
            const loadingOverlay = document.querySelector('.loading-overlay');
            if (loadingOverlay) {
                document.body.removeChild(loadingOverlay);
            }
            window.authManager.showMessage('Error al procesar el archivo: ' + error.message, 'error');
        }
    }

    async processAthleteData(jsonData, loadingOverlay) {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            document.body.removeChild(loadingOverlay);
            throw new Error('Debe iniciar sesión para importar atletas');
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        const totalAtletas = jsonData.length;
        const atletasImportados = [];

        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            try {
                // Update progress
                const progress = Math.round(((i + 1) / totalAtletas) * 100);
                const progressText = loadingOverlay.querySelector('.loading-progress');
                if (progressText) {
                    progressText.textContent = `${progress}%`;
                }
                const loadingText = loadingOverlay.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = `Importando atleta ${i + 1} de ${totalAtletas}...`;
                }

                // Normalizar nombres de columnas (case insensitive)
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toUpperCase().trim()] = row[key];
                });

                // Extraer y validar datos
                const nombres = this.validateAndCleanString(normalizedRow['NOMBRES'], `Fila ${i + 2}: NOMBRES`);
                const apellidos = this.validateAndCleanString(normalizedRow['APELLIDOS'], `Fila ${i + 2}: APELLIDOS`);
                const dniValue = this.validateAndCleanDNI(normalizedRow['DNI'], `Fila ${i + 2}: DNI`);
                const fechaNacimiento = this.validateAndFormatDate(normalizedRow['FECHA DE NACIMIENTO'], `Fila ${i + 2}: FECHA DE NACIMIENTO`);
                const sexo = this.validateAndCleanSex(normalizedRow['SEXO'], `Fila ${i + 2}: SEXO`);

                // Calcular edad
                const hoy = new Date();
                const fechaNac = new Date(fechaNacimiento);
                let edad = hoy.getFullYear() - fechaNac.getFullYear();
                const mes = hoy.getMonth() - fechaNac.getMonth();
                if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                    edad--;
                }

                // Verificar si ya existe un atleta con el mismo DNI
                const atletaSnapshot = await window.firebaseDB.collection('atletas')
                    .where('dni', '==', dniValue)
                    .where('academiaId', '==', currentUser.uid)
                    .get();

                if (!atletaSnapshot.empty) {
                    errors.push(`Fila ${i + 2}: Ya existe un atleta con DNI ${dniValue}`);
                    errorCount++;
                    continue;
                }

                // Crear documento del atleta en Firestore
                const atletaRef = await window.firebaseDB.collection('atletas').add({
                    academiaId: currentUser.uid,
                    nombres: nombres,
                    apellidos: apellidos,
                    dni: dniValue,
                    fechaNacimiento: fechaNacimiento,
                    sexo: sexo,
                    edad: edad,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    importedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Store the imported athlete data for verification
                atletasImportados.push({
                    id: atletaRef.id,
                    nombres,
                    apellidos,
                    dni: dniValue
                });

                successCount++;

            } catch (error) {
                errors.push(`Fila ${i + 2}: ${error.message}`);
                errorCount++;
            }
        }

        // Verificar la integridad de los datos importados
        let verificationText = loadingOverlay.querySelector('.loading-text');
        if (verificationText) {
            verificationText.textContent = 'Verificando integridad de datos...';
        }

        // Verificar que todos los atletas fueron importados correctamente
        const verificacionPromises = atletasImportados.map(async (atleta) => {
            const doc = await window.firebaseDB.collection('atletas').doc(atleta.id).get();
            return {
                exists: doc.exists,
                data: doc.data(),
                expected: atleta
            };
        });

        const resultadosVerificacion = await Promise.all(verificacionPromises);
        const atletasFaltantes = resultadosVerificacion.filter(r => !r.exists || r.data.dni !== r.expected.dni);

        // Remover overlay de carga
        document.body.removeChild(loadingOverlay);

        // Mostrar resultados
        const importModal = document.getElementById('importDBModal');
        importModal.style.display = 'none';
        importModal.classList.remove('active');

        if (atletasFaltantes.length > 0) {
            window.authManager.showMessage(`Error: Se detectaron ${atletasFaltantes.length} atletas con datos incompletos o incorrectos. Por favor, intente importar nuevamente.`, 'error');
            return;
        }

        if (successCount > 0) {
            // Recargar lista de atletas
            await this.cargarAtletas();
            
            // Verificar que la tabla se cargó completamente
            const tablaAtletas = document.querySelector('.tabla-atletas tbody');
            const filasTabla = tablaAtletas ? tablaAtletas.getElementsByTagName('tr').length : 0;
            
            if (filasTabla !== successCount) {
                window.authManager.showMessage(`Advertencia: La tabla muestra ${filasTabla} atletas de ${successCount} importados. Actualizando...`, 'warning');
                await this.cargarAtletas(); // Intentar cargar nuevamente
            }
        }

        let message = `Importación completada.\n✅ ${successCount} atletas importados exitosamente`;
        if (errorCount > 0) {
            message += `\n❌ ${errorCount} errores encontrados:\n${errors.join('\n')}`;
        }
        window.authManager.showMessage(message, errorCount > 0 ? 'warning' : 'success');
    }

    validateAndCleanString(value, fieldName) {
        if (!value || typeof value !== 'string' && typeof value !== 'number') {
            throw new Error(`${fieldName} es requerido`);
        }
        const cleaned = String(value).trim();
        if (!cleaned) {
            throw new Error(`${fieldName} no puede estar vacío`);
        }
        return cleaned;
    }

    validateAndCleanDNI(value, fieldName) {
        if (!value) {
            throw new Error(`${fieldName} es requerido`);
        }
        
        const cleaned = String(value).trim().replace(/[^\d]/g, '');
        
        if (!/^\d{8}$/.test(cleaned)) {
            throw new Error(`${fieldName} debe tener exactamente 8 dígitos`);
        }
        
        return cleaned;
    }

    validateAndFormatDate(value, fieldName) {
        if (!value) {
            throw new Error(`${fieldName} es requerida`);
        }

        let date;
        
        // Intentar parsear diferentes formatos de fecha
        if (typeof value === 'number') {
            // Excel serial date
            date = new Date((value - 25569) * 86400 * 1000);
        } else if (typeof value === 'string') {
            // String date - intentar varios formatos
            const dateStr = value.trim();
            
            // Formato DD/MM/YYYY
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
                const [day, month, year] = dateStr.split('/');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            // Formato DD-MM-YYYY
            else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
                const [day, month, year] = dateStr.split('-');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            // Formato YYYY-MM-DD
            else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
                date = new Date(dateStr);
            }
            // Intentar parseo directo
            else {
                date = new Date(dateStr);
            }
        } else if (value instanceof Date) {
            date = value;
        } else {
            throw new Error(`${fieldName} tiene un formato no válido`);
        }

        if (isNaN(date.getTime())) {
            throw new Error(`${fieldName} no es una fecha válida`);
        }

        // Validar que la fecha sea razonable
        const hoy = new Date();
        const hace150anos = new Date(hoy.getFullYear() - 150, 0, 1);
        
        if (date > hoy) {
            throw new Error(`${fieldName} no puede ser una fecha futura`);
        }
        
        if (date < hace150anos) {
            throw new Error(`${fieldName} no puede ser anterior a ${hace150anos.getFullYear()}`);
        }

        // Devolver en formato YYYY-MM-DD
        return date.toISOString().split('T')[0];
    }

    validateAndCleanSex(value, fieldName) {
        if (!value) {
            throw new Error(`${fieldName} es requerido`);
        }

        const cleaned = String(value).trim().toLowerCase();
        
        // Mapear diferentes variaciones a los valores estándar
        const maleVariations = ['m', 'masculino', 'male', 'hombre', 'varón'];
        const femaleVariations = ['f', 'femenino', 'female', 'mujer'];

        if (maleVariations.includes(cleaned)) {
            return 'Masculino';
        } else if (femaleVariations.includes(cleaned)) {
            return 'Femenino';
        } else {
            throw new Error(`${fieldName} debe ser Masculino o Femenino (encontrado: ${value})`);
        }
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
    }

    volverAlDashboard() {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Mostrar el dashboard de academia
        const academiaDashboard = document.getElementById('academiaDashboard');
        if (academiaDashboard) {
            academiaDashboard.classList.add('active');
        }

        // Cancelar edición si estaba activa
        if (this.isEditing) {
            this.cancelarEdicion();
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

            // Guardar datos originales
            this.originalData = { ...userData };

        } catch (error) {
            console.error('Error cargando datos del perfil:', error);
            window.authManager.showMessage('Error al cargar datos del perfil', 'error');
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
                            Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.perfilDelegacionManager.eliminarAtleta('${atleta.id}')">
                            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                            </svg>
                            Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    editarAtleta(atletaId) {
        // Encontrar el atleta en la lista actual
        const atleta = this.atletas.find(a => a.id === atletaId);
        if (!atleta) {
            window.authManager.showMessage('Atleta no encontrado', 'error');
            return;
        }

        // Poblar el formulario de registro con los datos del atleta
        document.getElementById('atletaNombres').value = atleta.nombres || '';
        document.getElementById('atletaApellidos').value = atleta.apellidos || '';
        document.getElementById('atletaDni').value = atleta.dni || '';
        document.getElementById('atletaFechaNacimiento').value = atleta.fechaNacimiento || '';
        document.getElementById('atletaSexo').value = atleta.sexo || '';

        // Cambiar el modo a edición
        this.atletaEditandoId = atletaId;
        
        // Cambiar el texto del botón de envío
        const submitBtn = document.querySelector('#registroAtletaForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Actualizar Atleta';
        }

        // Cambiar el título del modal
        const modalTitle = document.querySelector('#registroAtletaModal h2');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                </svg>
                Editar Atleta
            `;
        }

        // Mostrar el modal
        const modal = document.getElementById('registroAtletaModal');
        modal.style.display = 'block';
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
        // Asegurar que estamos en modo "agregar"
        this.atletaEditandoId = null;
        
        // Limpiar formulario
        document.getElementById('registroAtletaForm').reset();
        
        // Asegurar que el texto y título estén en modo "agregar"
        const submitBtn = document.querySelector('#registroAtletaForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Registrar Atleta';
        }
        
        const modalTitle = document.querySelector('#registroAtletaModal h2');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                </svg>
                Registrar Nuevo Atleta
            `;
        }
        
        const modal = document.getElementById('registroAtletaModal');
        modal.style.display = 'block';
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
                window.authManager.showMessage('Debe iniciar sesión para gestionar atletas', 'error');
                return;
            }

            const isEditing = !!this.atletaEditandoId;

            if (!isEditing) {
                // MODO CREAR: Verificar si ya existe un atleta con el mismo DNI
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

                window.authManager.showMessage('Atleta registrado exitosamente', 'success');
            } else {
                // MODO EDITAR: Verificar DNI duplicado solo si cambió
                const atletaActual = this.atletas.find(a => a.id === this.atletaEditandoId);
                if (atletaActual && atletaActual.dni !== dni) {
                    const atletaSnapshot = await window.firebaseDB.collection('atletas')
                        .where('dni', '==', dni)
                        .where('academiaId', '==', currentUser.uid)
                        .get();

                    if (!atletaSnapshot.empty) {
                        window.authManager.showMessage('Ya existe otro atleta registrado con este DNI', 'error');
                        return;
                    }
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

                window.authManager.showMessage('Atleta actualizado exitosamente', 'success');
            }

            // Cerrar modal y limpiar formulario
            this.cerrarModalRegistro();

            // Recargar lista de atletas
            await this.cargarAtletas();

        } catch (error) {
            console.error('Error gestionando atleta:', error);
            window.authManager.showMessage('Error al gestionar atleta', 'error');
        }
    }

    cerrarModalRegistro() {
        const modal = document.getElementById('registroAtletaModal');
        modal.style.display = 'none';
        
        // Resetear formulario
        document.getElementById('registroAtletaForm').reset();
        
        // Resetear modo edición
        this.atletaEditandoId = null;
        
        // Restaurar texto del botón
        const submitBtn = document.querySelector('#registroAtletaForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Registrar Atleta';
        }
        
        // Restaurar título del modal
        const modalTitle = document.querySelector('#registroAtletaModal h2');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                </svg>
                Registrar Nuevo Atleta
            `;
        }
    }
}