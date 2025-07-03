// Dashboard de Academias con Firebase - Optimizado
class FirebaseDashboardManager {
    constructor() {
        this.currentUser = null;
        this.db = null;
        this.auth = null;
        // Cache para optimizar consultas
        this.eventosCache = new Map();
        this.inscripcionesCache = new Map();
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 60000; // 1 minuto
    }

    init() {
        this.currentUser = window.authManager.getCurrentUser();
        if (!this.currentUser || this.currentUser.tipo !== 'academia') {
            return;
        }

        this.waitForFirebase().then(() => {
            this.db = window.firebaseDB;
            this.auth = window.firebaseAuth;
            this.setupUI();
            this.loadDashboardData();
            console.log('📊 Dashboard Manager con Firebase inicializado');
        });
    }

    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.firebaseDB && window.firebaseAuth) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error('Firebase no disponible para Dashboard Manager');
    }

    setupUI() {
        // Mostrar nombre de la academia
        const academiaNombre = document.getElementById('academiaNombre');
        if (academiaNombre) {
            academiaNombre.textContent = this.currentUser.nombre;
        }
    }

    // Método optimizado para cargar todos los datos del dashboard de una vez
    async loadDashboardData() {
        this.showLoading(true);
        
        try {
            // Verificar cache
            if (this.isCacheValid()) {
                await this.loadFromCache();
                this.showLoading(false);
                return;
            }

            // Cargar próximos eventos para la sección principal
            await this.loadProximosEventosDashboard();

            // Cargar datos en paralelo para mejor rendimiento
            const [eventos, inscripciones] = await Promise.all([
                this.loadAllEventos(),
                this.loadAllInscripciones()
            ]);

            // Actualizar cache
            this.updateCache(eventos, inscripciones);

            // Renderizar datos
            await this.renderEventosDisponibles(eventos, inscripciones);

        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            this.showError('Error cargando datos del dashboard');
        } finally {
            this.showLoading(false);
        }
    }

    async loadProximosEventosDashboard() {
        const container = document.getElementById('proximosEventosDashboard');
        if (!container) return;

        try {
            // Verificar que Firebase esté disponible
            if (!this.db) {
                console.warn('Firebase no está inicializado');
                container.innerHTML = '<p class="text-center">Eventos no disponibles en este momento.</p>';
                return;
            }

            // Mostrar loading
            container.innerHTML = `
                <div class="loading-spinner">
                    <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                            <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
                        </path>
                    </svg>
                    Cargando eventos...
                </div>
            `;

            // Cargar eventos próximos desde Firebase
            const snapshot = await this.db.collection('eventos')
                .where('fecha', '>', new Date())
                .orderBy('fecha', 'asc')
                .limit(6)
                .get();

            const eventos = [];
            snapshot.forEach(doc => {
                eventos.push({ id: doc.id, ...doc.data() });
            });

            // Cargar inscripciones para calcular disponibilidad
            const inscripcionesSnapshot = await this.db.collection('inscripciones').get();
            const inscripciones = [];
            inscripcionesSnapshot.forEach(doc => {
                inscripciones.push({ id: doc.id, ...doc.data() });
            });

            // Renderizar eventos
            this.renderProximosEventos(eventos, inscripciones);

        } catch (error) {
            console.error('Error cargando próximos eventos para dashboard:', error);
            container.innerHTML = '<p class="text-center error">Error cargando próximos eventos</p>';
        }
    }

    renderProximosEventos(eventos, inscripciones) {
        const container = document.getElementById('proximosEventosDashboard');
        if (!container) return;

        if (eventos.length === 0) {
            container.innerHTML = `
                <div class="no-events">
                    <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
                    </svg>
                    <h3>No hay eventos programados</h3>
                    <p>Próximamente se anunciarán nuevos eventos deportivos.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        eventos.forEach(evento => {
            const eventoCard = this.createProximoEventoCard(evento, inscripciones);
            container.appendChild(eventoCard);
        });
    }

    createProximoEventoCard(evento, inscripciones) {
        const card = document.createElement('div');
        card.className = 'evento-publico-card evento-horizontal';
        
        // Calcular inscripciones para este evento
        const inscripcionesEvento = inscripciones.filter(
            inscripcion => inscripcion.eventoId === evento.id
        );
        
        let totalInscritos = 0;
        let miInscripcion = null;
        inscripcionesEvento.forEach(inscripcion => {
            totalInscritos += inscripcion.alumnos.length;
            if (inscripcion.academiaId === this.currentUser.uid) {
                miInscripcion = inscripcion;
            }
        });

        const fechaFormateada = window.eventsManager.formatDate(evento.fecha);
        const fechaLimiteFormateada = evento.fechaLimiteInscripcion ? window.eventsManager.formatDate(evento.fechaLimiteInscripcion) : null;
        const isEventoProximo = this.isEventoProximo(evento.fecha);
        
        card.innerHTML = `
            <div class="evento-layout-horizontal">
                <!-- Imagen cuadrada 1:1 -->
                <div class="evento-imagen-container">
                    ${evento.imagen ? `
                        <img src="${evento.imagen}" alt="${evento.nombre}" class="evento-imagen-cuadrada" onclick="imagePreviewManager.openPreview('${evento.imagen}', '${evento.nombre.replace(/'/g, "\\'")}')">
                    ` : `
                        <div class="evento-imagen-placeholder">
                            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                            </svg>
                        </div>
                    `}
                </div>

                <!-- Contenido del evento -->
                <div class="evento-contenido">
                    <div class="evento-publico-header">
                        <h3>${evento.nombre}</h3>
                        <div class="evento-badges">
                            ${isEventoProximo ? '<span class="badge-proximo">Próximo</span>' : ''}
                            ${miInscripcion ? '<span class="badge-proximo">Inscrito</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="evento-publico-info">
                        <div class="info-item">
                            <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
                            </svg>
                            <span class="info-text"><strong>Fecha:</strong> ${fechaFormateada}</span>
                        </div>
                        ${fechaLimiteFormateada ? `
                            <div class="info-item">
                                <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
                                </svg>
                                <span class="info-text"><strong>Inscripciones hasta:</strong> ${fechaLimiteFormateada}</span>
                            </div>
                        ` : ''}
                        <div class="info-item">
                            <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z"/>
                            </svg>
                            <span class="info-text"><strong>Ubicación:</strong> ${evento.lugar}</span>
                        </div>
                        ${evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null' ? `
                            <div class="info-item">
                                <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                                </svg>
                                <span class="info-text"><strong>Modalidad:</strong> ${evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="evento-publico-descripcion">
                        <p>${evento.descripcion}</p>
                    </div>
                    
                    <div class="evento-publico-action">
                        <button class="btn btn-gold" onclick="window.dashboardManager.openInscripcionModal('${evento.id}')">
                            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
                            </svg>
                            INSCRIBIR ALUMNO
                        </button>
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    isEventoProximo(fecha) {
        if (!fecha) return false;
        const eventoDate = fecha.toDate ? fecha.toDate() : new Date(fecha);
        const hoy = new Date();
        const unaSemana = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
        
        return (eventoDate - hoy) <= unaSemana && eventoDate > hoy;
    }

    async loadAllEventos() {
        // Esperar a que eventsManager esté inicializado
        if (!window.eventsManager || !window.eventsManager.db) {
            console.warn('Events Manager no está inicializado, esperando...');
            let attempts = 0;
            const maxAttempts = 50;
            
            while (attempts < maxAttempts) {
                if (window.eventsManager && window.eventsManager.db) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.eventsManager || !window.eventsManager.db) {
                console.error('Events Manager no se inicializó correctamente');
                return [];
            }
        }
        
        const eventos = await window.eventsManager.getEventosProximos();
        return eventos;
    }

    async loadAllInscripciones() {
        try {
            const inscripcionesSnapshot = await this.db.collection('inscripciones').get();
            const inscripciones = [];
            inscripcionesSnapshot.forEach(doc => {
                inscripciones.push({ id: doc.id, ...doc.data() });
            });
            return inscripciones;
        } catch (error) {
            console.error('Error cargando inscripciones:', error);
            return [];
        }
    }

    isCacheValid() {
        return this.cacheTimestamp && 
               (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION &&
               this.eventosCache.size > 0;
    }

    updateCache(eventos, inscripciones) {
        this.eventosCache.clear();
        this.inscripcionesCache.clear();
        
        eventos.forEach(evento => {
            this.eventosCache.set(evento.id, evento);
        });
        
        inscripciones.forEach(inscripcion => {
            this.inscripcionesCache.set(inscripcion.id, inscripcion);
        });
        
        this.cacheTimestamp = Date.now();
    }

    async loadFromCache() {
        // Cargar próximos eventos
        await this.loadProximosEventosDashboard();
        
        const eventos = Array.from(this.eventosCache.values());
        const inscripciones = Array.from(this.inscripcionesCache.values());
        
        await this.renderEventosDisponibles(eventos, inscripciones);
    }

    async loadEventosDisponibles() {
        // Método legacy - redirigir al nuevo método optimizado
        await this.loadDashboardData();
    }

    async renderEventosDisponibles(eventos, todasInscripciones) {
        const container = document.getElementById('eventosDisponibles');
        if (!container) return;

        try {
            // Limpiar el contenedor antes de agregar nuevos eventos
            container.innerHTML = '';

            if (eventos.length === 0) {
                container.innerHTML = '<p class="text-center">No hay eventos disponibles en este momento.</p>';
                return;
            }
            
            // Procesar todos los eventos en paralelo
            const eventosCards = await Promise.all(
                eventos.map(evento => this.createEventoCardOptimized(evento, todasInscripciones))
            );
            
            eventosCards.forEach(card => {
                if (card) container.appendChild(card);
            });
            
        } catch (error) {
            console.error('Error renderizando eventos disponibles:', error);
            container.innerHTML = '<p class="text-center error">Error cargando eventos</p>';
        }
    }

    createEventoCardOptimized(evento, todasInscripciones) {
        try {
            // Calcular inscripciones para este evento desde los datos ya cargados
            const inscripcionesEvento = todasInscripciones.filter(
                inscripcion => inscripcion.eventoId === evento.id
            );

            let totalInscritos = 0;
            let miInscripcion = null;
            let misAlumnosInscritos = 0;

            inscripcionesEvento.forEach(inscripcion => {
                totalInscritos += inscripcion.alumnos.length;
                if (inscripcion.academiaId === this.currentUser.uid) {
                    miInscripcion = inscripcion;
                    misAlumnosInscritos = inscripcion.alumnos.length;
                }
            });

            const puedeInscribirMas = true; // Siempre se puede inscribir

            const card = document.createElement('div');
            card.className = 'evento-publico-card';
            
            let actionButton = '';
            if (miInscripcion) {
                actionButton = `
                    <button class="btn btn-gold" onclick="window.dashboardManager.openInscripcionModal('${evento.id}')">
                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
                        </svg>
                        GESTIONAR INSCRIPCIÓN (${misAlumnosInscritos} inscrito${misAlumnosInscritos !== 1 ? 's' : ''})
                    </button>
                `;
            } else {
                actionButton = `
                    <button class="btn btn-gold" onclick="window.dashboardManager.openInscripcionModal('${evento.id}')">
                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
                        </svg>
                        INSCRIBIR ALUMNO
                    </button>
                `;
            }

            const fechaFormateada = window.eventsManager.formatDate(evento.fecha);
            const fechaLimiteFormateada = evento.fechaLimiteInscripcion ? window.eventsManager.formatDate(evento.fechaLimiteInscripcion) : null;
            
            card.innerHTML = `
                <div class="evento-layout-horizontal">
                    <!-- Imagen del evento -->
                    <div class="evento-imagen-container">
                        ${evento.imagen ? `
                            <img src="${evento.imagen}" alt="${evento.nombre}" class="evento-imagen-cuadrada" onclick="imagePreviewManager.openPreview('${evento.imagen}', '${evento.nombre.replace(/'/g, "\\'")}')">
                        ` : `
                            <div class="evento-imagen-placeholder">
                                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                                </svg>
                            </div>
                        `}
                    </div>
                    
                    <!-- Contenido del evento -->
                    <div class="evento-contenido">
                        <div class="evento-publico-header">
                            <h3>${evento.nombre}</h3>
                            <div class="evento-badges">
                                ${miInscripcion ? '<span class="badge-proximo">Inscrito</span>' : ''}
                            </div>
                        </div>
                        
                        <div class="evento-publico-info">
                            <div class="info-item">
                                <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
                                </svg>
                                <span class="info-text"><strong>Fecha:</strong> ${fechaFormateada}</span>
                            </div>
                            ${fechaLimiteFormateada ? `
                                <div class="info-item">
                                    <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
                                    </svg>
                                    <span class="info-text"><strong>Inscripciones hasta:</strong> ${fechaLimiteFormateada}</span>
                                </div>
                            ` : ''}
                            <div class="info-item">
                                <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z"/>
                                </svg>
                                <span class="info-text"><strong>Ubicación:</strong> ${evento.lugar}</span>
                            </div>
                            ${evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null' ? `
                                <div class="info-item">
                                    <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                                    </svg>
                                    <span class="info-text"><strong>Modalidad:</strong> ${evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="evento-publico-descripcion">
                            <p>${evento.descripcion}</p>
                        </div>
                        
                        <div class="evento-publico-action">
                            ${actionButton}
                        </div>
                    </div>
                </div>
            `;

            return card;
        } catch (error) {
            console.error('Error creando card de evento optimizada:', error);
            const card = document.createElement('div');
            card.innerHTML = '<p class="error">Error cargando evento</p>';
            return card;
        }
    }

    showLoading(show) {
        const containers = ['eventosDisponibles'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                if (show) {
                    container.innerHTML = `
                        <div class="loading-spinner">
                            <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                                    <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
                                </path>
                            </svg>
                            Cargando...
                        </div>
                    `;
                }
            }
        });
    }

    showError(message) {
        const containers = ['eventosDisponibles'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `<p class="error">${message}</p>`;
            }
        });
    }

    // Invalidar cache cuando hay cambios
    invalidateCache() {
        this.eventosCache.clear();
        this.inscripcionesCache.clear();
        this.cacheTimestamp = null;
    }

    // Recargar datos forzadamente
    async refresh() {
        this.invalidateCache();
        await this.loadDashboardData();
    }

    async cancelarInscripcion(inscripcionId) {
        if (!confirm('¿Está seguro de que desea cancelar toda la inscripción a este evento?')) {
            return;
        }

        try {
            await this.db.collection('inscripciones').doc(inscripcionId).delete();
            window.authManager.showMessage('Inscripción cancelada correctamente', 'success');
            
            // Recargar la página
            window.location.reload();
            
        } catch (error) {
            console.error('Error cancelando inscripción:', error);
            window.authManager.showMessage('Error al cancelar inscripción', 'error');
        }
    }

    // Función para remover un alumno específico de una inscripción
    async removerAlumno(inscripcionId, alumnoIndex) {
        if (!confirm('¿Está seguro de que desea remover este alumno de la inscripción?')) {
            return;
        }

        try {
            const inscripcionDoc = await this.db.collection('inscripciones').doc(inscripcionId).get();
            
            if (!inscripcionDoc.exists) {
                window.authManager.showMessage('Inscripción no encontrada', 'error');
                return;
            }

            const inscripcion = inscripcionDoc.data();
            
            if (inscripcion.alumnos.length > 1) {
                // Remover solo el alumno específico
                const nuevosAlumnos = inscripcion.alumnos.filter((_, index) => index !== alumnoIndex);
                await this.db.collection('inscripciones').doc(inscripcionId).update({
                    alumnos: nuevosAlumnos,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Si es el único alumno, eliminar toda la inscripción
                await this.db.collection('inscripciones').doc(inscripcionId).delete();
            }
            
            window.authManager.showMessage('Alumno removido de la inscripción', 'success');
            
            // Recargar vistas
            this.loadEventosDisponibles();
            
            // Actualizar vista de admin si está disponible
            if (window.adminManager) {
                window.adminManager.loadInscripcionesPorEvento();
            }
        } catch (error) {
            console.error('Error removiendo alumno:', error);
            window.authManager.showMessage('Error al remover alumno', 'error');
        }
    }

    // Función para editar un alumno específico
    async editarAlumno(inscripcionId, alumnoIndex) {
        try {
            const inscripcionDoc = await this.db.collection('inscripciones').doc(inscripcionId).get();
            
            if (!inscripcionDoc.exists) {
                window.authManager.showMessage('Inscripción no encontrada', 'error');
                return;
            }

            const inscripcion = inscripcionDoc.data();
            const alumno = inscripcion.alumnos[alumnoIndex];
            
            if (!alumno) {
                window.authManager.showMessage('Alumno no encontrado', 'error');
                return;
            }

            // Verificar que el evento existe
            const evento = await this.db.collection('eventos').doc(inscripcion.eventoId).get();
            if (!evento.exists) {
                window.authManager.showMessage('Evento no encontrado', 'error');
                return;
            }

            // Abrir el nuevo modal de edición de participantes
            await window.eventsManager.openEditarParticipantesModal(inscripcion.eventoId, alumno.dni);

        } catch (error) {
            console.error('Error editando alumno:', error);
            window.authManager.showMessage('Error al editar alumno', 'error');
        }
    }

    // Obtener estadísticas de la academia
    async getEstadisticas() {
        try {
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
                .where('academiaId', '==', this.currentUser.uid)
                .get();

            let totalAlumnosInscritos = 0;
            let eventosParticipados = 0;
            let proximosEventos = 0;

            for (const inscripcionDoc of inscripcionesSnapshot.docs) {
                const inscripcion = inscripcionDoc.data();
                totalAlumnosInscritos += inscripcion.alumnos.length;
                eventosParticipados++;
                
                // Verificar si el evento es próximo
                const eventoDoc = await this.db.collection('eventos').doc(inscripcion.eventoId).get();
                if (eventoDoc.exists) {
                    const evento = eventoDoc.data();
                    if (!window.eventsManager.isEventoPasado(evento.fecha)) {
                        proximosEventos++;
                    }
                }
            }

            return {
                totalAlumnosInscritos,
                eventosParticipados,
                proximosEventos
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                totalAlumnosInscritos: 0,
                eventosParticipados: 0,
                proximosEventos: 0
            };
        }
    }

    // Mostrar estadísticas (opcional, se puede agregar a la UI)
    async mostrarEstadisticas() {
        const stats = await this.getEstadisticas();
        console.log('Estadísticas de la academia:', stats);
        return stats;
    }

    // Navegar al panel de inscripción
    async openInscripcionModal(eventoId) {
        try {
            // Obtener datos del evento
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) {
                window.authManager.showMessage('Evento no encontrado', 'error');
                return;
            }

            const evento = eventoDoc.data();
            
            // Guardar el evento actual para el panel de inscripción
            if (window.panelInscripcionManager) {
                window.panelInscripcionManager.setCurrentEvento({ id: eventoId, ...evento });
            }
            
            // Navegar al panel de inscripción
            this.navigateToPanelInscripcion();
            
        } catch (error) {
            console.error('Error navegando al panel de inscripción:', error);
            window.authManager.showMessage('Error al acceder al panel de inscripción', 'error');
        }
    }

    // Navegar al panel de inscripción
    navigateToPanelInscripcion() {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Mostrar el panel de inscripción
        const panelInscripcion = document.getElementById('panelInscripcion');
        if (panelInscripcion) {
            panelInscripcion.classList.add('active');
            
            // Cargar datos del evento en el panel
            if (window.panelInscripcionManager && window.panelInscripcionManager.currentEvento) {
                this.loadEventoInPanelInscripcion(window.panelInscripcionManager.currentEvento);
            }
        }
    }

    // Cargar datos del evento en el panel de inscripción
    loadEventoInPanelInscripcion(evento) {
        // Cargar nombre del evento
        const nombreElement = document.getElementById('eventoNombreInscripcion');
        if (nombreElement) {
            nombreElement.textContent = evento.nombre;
        }

        // Cargar fecha del evento
        const fechaElement = document.getElementById('eventoFechaInscripcion');
        if (fechaElement && evento.fecha) {
            const fechaFormateada = this.formatDate(evento.fecha);
            fechaElement.textContent = fechaFormateada;
        }

        // Cargar lugar del evento
        const lugarElement = document.getElementById('eventoLugarInscripcion');
        if (lugarElement) {
            lugarElement.textContent = evento.lugar;
        }

        // Cargar fecha límite
        const fechaLimiteElement = document.getElementById('eventoFechaLimiteInscripcion');
        if (fechaLimiteElement && evento.fechaLimiteInscripcion) {
            const fechaLimiteFormateada = this.formatDate(evento.fechaLimiteInscripcion);
            fechaLimiteElement.textContent = fechaLimiteFormateada;
        }

        // Cargar modalidad
        const modalidadElement = document.getElementById('eventoModalidadInscripcion');
        if (modalidadElement) {
            const modalidadTexto = evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad;
            modalidadElement.textContent = modalidadTexto;
        }

        // Cargar descripción
        const descripcionElement = document.getElementById('eventoDescripcionInscripcion');
        if (descripcionElement) {
            descripcionElement.textContent = evento.descripcion;
        }

        // Cargar imagen
        const imagenContainer = document.getElementById('eventoImagenInscripcion');
        if (imagenContainer) {
            if (evento.imagen) {
                imagenContainer.innerHTML = `<img src="${evento.imagen}" alt="${evento.nombre}">`;
            } else {
                imagenContainer.innerHTML = `
                    <div class="evento-imagen-placeholder">
                        <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                        </svg>
                        <p>Sin imagen</p>
                    </div>
                `;
            }
        }

        // Cargar alumnos inscritos
        this.loadAlumnosInscritosEnPanel(evento.id);
    }

    // Cargar alumnos inscritos en el panel
    async loadAlumnosInscritosEnPanel(eventoId) {
        const alumnosInscritosSection = document.getElementById('alumnosInscritosSection');
        const tablaAlumnosInscritos = document.getElementById('tablaAlumnosInscritos');
        const totalAlumnosInscritos = document.getElementById('totalAlumnosInscritos');

        if (!alumnosInscritosSection || !tablaAlumnosInscritos || !totalAlumnosInscritos) return;

        try {
            // Mostrar la sección
            alumnosInscritosSection.style.display = 'block';

            // Obtener el ID de la academia del usuario actual
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser || !currentUser.uid) {
                throw new Error('Usuario no autenticado');
            }

            // Obtener las inscripciones del evento para la academia actual
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .where('academiaId', '==', currentUser.uid)
                .get();

            if (inscripcionesSnapshot.empty) {
                tablaAlumnosInscritos.innerHTML = `
                    <tr>
                        <td colspan="11" class="text-center">
                            <div class="no-alumnos-inscritos">
                                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                                </svg>
                                <h4>No hay alumnos inscritos</h4>
                                <p>Aún no has inscrito alumnos en este evento</p>
                            </div>
                        </td>
                    </tr>
                `;
                totalAlumnosInscritos.textContent = '0 alumnos inscritos';
                return;
            }

            let alumnosHtml = '';
            let totalAlumnos = 0;

            inscripcionesSnapshot.forEach(inscripcionDoc => {
                const inscripcion = inscripcionDoc.data();
                if (inscripcion.alumnos && inscripcion.alumnos.length > 0) {
                    inscripcion.alumnos.forEach((alumno, index) => {
                        totalAlumnos++;
                        alumnosHtml += `
                            <tr>
                                <td>${totalAlumnos}</td>
                                <td>${alumno.dni || alumno.identificacion || '-'}</td>
                                <td>${alumno.nombre || alumno.nombres || '-'}</td>
                                <td>${alumno.apellido || alumno.apellidos || '-'}</td>
                                <td>${alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento).toLocaleDateString('es-ES') : '-'}</td>
                                <td>${alumno.peso || '-'} kg</td>
                                <td>${alumno.cinturon ? (alumno.cinturon.includes('KUP') ? alumno.cinturon.replace('KUP-', '') + 'er KUP' : alumno.cinturon.replace('DAN-', '') + 'er DAN') : '-'}</td>
                                <td>${alumno.sexo || '-'}</td>
                                <td>${alumno.modalidad || '-'}</td>
                                <td>${currentUser.abreviatura || currentUser.nombre || '-'}</td>
                                <td>
                                    <button class="btn btn-info btn-sm" onclick="window.dashboardManager.editarAlumno('${inscripcionDoc.id}', ${index})">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                        </svg>
                                        Editar
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="window.dashboardManager.eliminarAlumnoDeInscripcion('${inscripcionDoc.id}', ${index})">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                        </svg>
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
            });

            tablaAlumnosInscritos.innerHTML = alumnosHtml;
            totalAlumnosInscritos.textContent = `${totalAlumnos} alumno${totalAlumnos !== 1 ? 's' : ''} inscrito${totalAlumnos !== 1 ? 's' : ''}`;

        } catch (error) {
            console.error('Error cargando alumnos inscritos:', error);
            tablaAlumnosInscritos.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center">
                        <div class="error-message">
                            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                            </svg>
                            <h4>Error al cargar los alumnos</h4>
                            <p>Por favor, intenta de nuevo más tarde</p>
                        </div>
                    </td>
                </tr>
            `;
            window.authManager.showMessage('Error al cargar los alumnos inscritos', 'error');
        }
    }

    async eliminarAlumnoDeInscripcion(inscripcionId, alumnoIndex) {
        if (!confirm('¿Está seguro de que desea eliminar este alumno de la inscripción?')) {
            return;
        }

        try {
            const inscripcionRef = this.db.collection('inscripciones').doc(inscripcionId);
            const inscripcionDoc = await inscripcionRef.get();

            if (!inscripcionDoc.exists) {
                throw new Error('La inscripción no existe');
            }

            const inscripcion = inscripcionDoc.data();
            const alumnos = inscripcion.alumnos || [];

            if (alumnoIndex < 0 || alumnoIndex >= alumnos.length) {
                throw new Error('Índice de alumno inválido');
            }

            // Eliminar el alumno del array
            alumnos.splice(alumnoIndex, 1);

            if (alumnos.length === 0) {
                // Si no quedan alumnos, eliminar la inscripción completa
                await inscripcionRef.delete();
            } else {
                // Actualizar la inscripción con el array modificado
                await inscripcionRef.update({
                    alumnos: alumnos
                });
            }

            // Recargar la lista de alumnos
            if (window.panelInscripcionManager && window.panelInscripcionManager.currentEvento) {
                this.loadAlumnosInscritosEnPanel(window.panelInscripcionManager.currentEvento.id);
            }

            window.authManager.showMessage('Alumno eliminado correctamente', 'success');

        } catch (error) {
            console.error('Error eliminando alumno:', error);
            window.authManager.showMessage('Error al eliminar alumno', 'error');
        }
    }

    // Método auxiliar para formatear fechas
    formatDate(date) {
        if (!date) return '';
        const dateObj = date.toDate ? date.toDate() : new Date(date);
        const fechaFormateada = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        // Capitalizar la primera letra del día de la semana
        return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    }
}

// Inicializar dashboard manager
window.dashboardManager = new FirebaseDashboardManager(); 