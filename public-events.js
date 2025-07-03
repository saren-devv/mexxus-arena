// Gestor de Eventos Públicos para la Página Principal
class PublicEventsManager {
    constructor() {
        this.db = null;
        this.eventosCache = [];
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 300000; // 5 minutos para eventos públicos
    }

    async init() {
        try {
            await this.waitForFirebase();
            this.db = window.firebaseDB;
            await this.loadPublicEvents();
            this.setupEventListeners();
            console.log('🌐 Public Events Manager inicializado');
        } catch (error) {
            console.error('Error inicializando Public Events Manager:', error);
            this.showError();
        }
    }

    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 100; // Aumentar el tiempo de espera total
        
        while (attempts < maxAttempts) {
            if (window.firebaseDB && window.firebaseAuth) {
                // Verificar que Firebase esté realmente conectado haciendo una prueba simple
                try {
                    await window.firebaseDB.collection('eventos').limit(1).get();
                    return;
                } catch (error) {
                    console.log('Firebase conectándose...', attempts + 1);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 200)); // Esperar más tiempo entre intentos
            attempts++;
        }
        throw new Error('Firebase no disponible para Public Events Manager después de esperar');
    }

    setupEventListeners() {
        // Botón CTA para registro
        const ctaRegisterBtn = document.getElementById('ctaRegisterBtn');
        if (ctaRegisterBtn) {
            ctaRegisterBtn.addEventListener('click', () => {
                // Abrir modal de registro
                document.getElementById('registerModal').style.display = 'flex';
            });
        }

        // Auto-refresh cada 5 minutos
        setInterval(() => {
            if (this.shouldRefreshCache()) {
                this.loadPublicEvents();
            }
        }, 60000); // Verificar cada minuto
    }

    shouldRefreshCache() {
        return !this.cacheTimestamp || 
               (Date.now() - this.cacheTimestamp) > this.CACHE_DURATION;
    }

    async loadPublicEvents() {
        const container = document.getElementById('eventosPublicos');
        if (!container) return;

        try {
            // Verificar cache
            if (!this.shouldRefreshCache() && this.eventosCache.length > 0) {
                this.renderPublicEvents(this.eventosCache);
                return;
            }

            // Verificar que Firebase esté inicializado
            if (!this.db) {
                console.warn('Firebase no está inicializado en Public Events, intentando reconectar...');
                await this.waitForFirebase();
                this.db = window.firebaseDB;
                if (!this.db) {
                    this.showError();
                    return;
                }
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
                .limit(6) // Mostrar máximo 6 eventos en público
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

            // Agregar información de disponibilidad a cada evento
            const eventosConInfo = eventos.map(evento => {
                const inscripcionesEvento = inscripciones.filter(
                    inscripcion => inscripcion.eventoId === evento.id
                );
                
                let totalInscritos = 0;
                inscripcionesEvento.forEach(inscripcion => {
                    totalInscritos += inscripcion.alumnos.length;
                });

                return {
                    ...evento,
                    totalInscritos
                };
            });

            // Actualizar cache
            this.eventosCache = eventosConInfo;
            this.cacheTimestamp = Date.now();

            // Renderizar eventos
            this.renderPublicEvents(eventosConInfo);

        } catch (error) {
            console.error('Error cargando eventos públicos:', error);
            this.showError();
        }
    }

    renderPublicEvents(eventos) {
        const container = document.getElementById('eventosPublicos');
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
            const eventoCard = this.createPublicEventCard(evento);
            container.appendChild(eventoCard);
        });
    }

    createPublicEventCard(evento) {
        const card = document.createElement('div');
        card.className = 'evento-publico-card';
        
        const fechaFormateada = this.formatDate(evento.fecha);
        const fechaLimiteFormateada = evento.fechaLimiteInscripcion ? this.formatDate(evento.fechaLimiteInscripcion) : null;
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
                        <button class="btn btn-gold" onclick="publicEventsManager.showLoginPrompt()">
                            INSCRIBIRSE
                        </button>
                    </div>
                </div>
            </div>
        `;

        return card;
    }

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

    isEventoProximo(fecha) {
        if (!fecha) return false;
        const eventoDate = fecha.toDate ? fecha.toDate() : new Date(fecha);
        const hoy = new Date();
        const unaSemana = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
        
        return (eventoDate - hoy) <= unaSemana && eventoDate > hoy;
    }

    getDisponibilidadClass(porcentaje) {
        if (porcentaje >= 90) return 'disponibilidad-completo';
        if (porcentaje >= 70) return 'disponibilidad-medio';
        return 'disponibilidad-disponible';
    }

    showLoginPrompt() {
        // Mostrar modal de login
        document.getElementById('loginModal').style.display = 'flex';
        
        // Mostrar mensaje informativo
        setTimeout(() => {
            if (window.authManager) {
                window.authManager.showMessage('Accede a tu cuenta de delegación para inscribirte en eventos', 'info');
            }
        }, 500);
    }

    showError() {
        const container = document.getElementById('eventosPublicos');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error al cargar eventos</h3>
                    <p>No se pudieron cargar los eventos en este momento.</p>
                    <button class="btn btn-secondary" onclick="publicEventsManager.loadPublicEvents()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    // Método para refrescar manualmente
    async refresh() {
        this.cacheTimestamp = null; // Invalidar cache
        await this.loadPublicEvents();
    }
}

// Inicializar el gestor de eventos públicos
window.publicEventsManager = new PublicEventsManager();

// NO inicializar automáticamente - esperar a que app.js coordine la inicialización 