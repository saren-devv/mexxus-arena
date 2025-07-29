// Gestor de Eventos Públicos para la Página Principal
class PublicEventsManager {
    constructor() {
        this.db = null;
        this.eventosCache = [];
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 300000; // 5 minutos para eventos públicos
        this.currentEventoId = null; // Para almacenar el evento actual
        this.isLoading = false; // Prevenir cargas simultáneas
        this.initialized = false; // Prevenir inicializaciones múltiples
    }

    async init() {
        // Prevenir inicializaciones múltiples
        if (this.initialized) {
            console.log('🌐 Public Events Manager ya está inicializado');
            return;
        }

        try {
            await this.waitForFirebase();
            this.db = window.firebaseDB;
            await this.loadPublicEvents();
            this.setupEventListeners();
            this.initialized = true;
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

        // Auto-refresh cada 5 minutos (reducido de 1 minuto a 5 minutos)
        setInterval(() => {
            if (this.shouldRefreshCache() && !this.isLoading) {
                console.log('🔄 Auto-refresh de eventos públicos');
                this.loadPublicEvents();
            }
        }, 300000); // Verificar cada 5 minutos en lugar de cada minuto
    }

    shouldRefreshCache() {
        return !this.cacheTimestamp || 
               (Date.now() - this.cacheTimestamp) > this.CACHE_DURATION;
    }

    async loadPublicEvents() {
        const container = document.getElementById('eventosPublicos');
        if (!container) return;

        // Prevenir cargas simultáneas
        if (this.isLoading) {
            console.log('⏳ Ya hay una carga de eventos en progreso, saltando...');
            return;
        }

        try {
            this.isLoading = true;
            console.log('📥 Iniciando carga de eventos públicos...');

            // Verificar cache
            if (!this.shouldRefreshCache() && this.eventosCache.length > 0) {
                console.log('📋 Usando cache de eventos públicos');
                this.renderPublicEvents(this.eventosCache);
                this.isLoading = false;
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
            
            console.log(`✅ Eventos públicos cargados: ${eventosConInfo.length} eventos`);

        } catch (error) {
            console.error('Error cargando eventos públicos:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    }

    renderPublicEvents(eventos) {
        const container = document.getElementById('eventosPublicos');
        if (!container) return;

        console.log(`🎨 Renderizando ${eventos.length} eventos públicos`);

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

        // Limpiar contenedor antes de renderizar
        container.innerHTML = '';
        
        // Crear un Set para verificar duplicados por ID
        const eventosUnicos = [];
        const idsVistos = new Set();
        
        eventos.forEach(evento => {
            if (!idsVistos.has(evento.id)) {
                idsVistos.add(evento.id);
                eventosUnicos.push(evento);
            } else {
                console.warn(`⚠️ Evento duplicado detectado y eliminado: ${evento.nombre} (ID: ${evento.id})`);
            }
        });
        
        console.log(`🎯 Renderizando ${eventosUnicos.length} eventos únicos (${eventos.length - eventosUnicos.length} duplicados eliminados)`);
        
        eventosUnicos.forEach((evento, index) => {
            const eventoCard = this.createPublicEventCard(evento);
            // Aplicar delay escalonado para la animación
            eventoCard.style.animationDelay = `${(index + 1) * 0.1}s`;
            container.appendChild(eventoCard);
        });
    }

    createPublicEventCard(evento) {
        const card = document.createElement('div');
        card.className = 'evento-publico-card clickeable';
        
        // Aplicar efecto glass si el evento tiene imagen
        if (evento.imagen) {
            card.classList.add('has-background');
            // Establecer la imagen como fondo de la card
            card.style.setProperty('--evento-background-image', `url(${evento.imagen})`);
        }
        
        const fechaFormateada = this.formatDate(evento.fecha);
        const isEventoProximo = this.isEventoProximo(evento.fecha);
        
        card.innerHTML = `
            ${evento.imagen ? '<div class="background-image"></div>' : ''}
            <div class="evento-layout-horizontal">
                <!-- Imagen cuadrada 1:1 -->
                <div class="evento-imagen-container">
                    ${evento.imagen ? `
                        <img src="${evento.imagen}" alt="${evento.nombre}" class="evento-imagen-cuadrada" data-event-id="${evento.id}">
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
                            <span class="fecha-text">${fechaFormateada}</span>
                        </div>
                    </div>
                    
                    <div class="evento-publico-header">
                        <h3>${evento.nombre}</h3>
                        <div class="evento-badges">
                            ${isEventoProximo ? '<span class="badge-proximo">Próximo</span>' : ''}
                        </div>
                    </div>
                    
                    <!-- Ubicación con bandera debajo del título -->
                    <div class="evento-ubicacion-principal">
                        ${evento.pais ? getCountryFlagHTML(evento.pais) : '<span class="flag-icon" style="font-size: 1.2em; margin-right: 8px;">🌍</span>'}
                        <span class="ubicacion-text">
                            ${evento.ciudad ? evento.ciudad + (evento.pais ? ', ' : '') : ''}${evento.pais || ''}
                        </span>
                    </div>
                    
                    <div class="evento-publico-action">
                        <button class="btn btn-gold" data-event-id="${evento.id}">
                            INSCRIBIRSE
                        </button>
                    </div>

                    
                </div>
            </div>
        `;

        // Agregar event listeners
        this.addCardEventListeners(card, evento);

        return card;
    }

    addCardEventListeners(card, evento) {
        // Event listener para toda la card
        card.addEventListener('click', (e) => {
            // Prevenir que se ejecute si se hace clic en el botón específico
            if (e.target.closest('.btn')) {
                return;
            }
            
            // Si se hace clic en la imagen, abrir preview
            if (e.target.classList.contains('evento-imagen-cuadrada')) {
                if (evento.imagen) {
                    e.stopPropagation(); // Prevenir que se ejecute el clic de la card
                    if (window.imagePreviewManager) {
                        window.imagePreviewManager.openPreview(evento.imagen, evento.nombre);
                    }
                }
                return;
            }
            
            // Para cualquier otro clic en la card, navegar al panel
            this.showLoginPrompt(evento.id);
        });

        // Event listener específico para el botón
        const btn = card.querySelector('.btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevenir que se ejecute el clic de la card
                this.showLoginPrompt(evento.id);
            });
        }
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

    // Helper method to generate bases content HTML
    generateBasesContent(evento) {
        if (evento.basesPdf && evento.basesPdfNombre) {
            // Verificar si es una URL (nuevo formato) o base64 (formato anterior)
            const isUrl = evento.basesPdf.startsWith('http');
            
            return `
                <div class="bases-content">
                    <h4>Bases del Evento</h4>
                    <div class="bases-disponibles">
                        <p>Las bases y reglamentos del evento están disponibles para descarga:</p>
                        <a href="${evento.basesPdf}" 
                           ${isUrl ? 'target="_blank"' : 'download="' + evento.basesPdfNombre + '"'}
                           class="bases-link">
                            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            <span>${isUrl ? 'Ver' : 'Descargar'} ${evento.basesPdfNombre}</span>
                            <svg class="icon icon-download" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="bases-content">
                    <h4>Bases del Evento</h4>
                    <div class="bases-placeholder">
                        <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        <h5>Bases del Evento</h5>
                        <p>Las bases y reglamentos del evento se mostrarán aquí cuando estén disponibles.</p>
                    </div>
                </div>
            `;
        }
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

    showLoginPrompt(eventoId = null) {
        // Verificar si el usuario está logueado
        const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
        
        if (currentUser && currentUser.tipo === 'academia') {
            // Usuario logueado como academia - ir al panel de inscripción
            if (eventoId) {
                // Buscar el evento específico
                const evento = this.eventosCache.find(e => e.id === eventoId);
                if (evento) {
                    // Navegar al panel de inscripción
                    this.navigateToInscripcionPanel(evento);
                } else {
                    // Si no encontramos el evento específico, mostrar mensaje
                    if (window.authManager) {
                        window.authManager.showMessage('Evento no encontrado', 'error');
                    }
                }
            } else {
                // Si no hay eventoId específico, mostrar mensaje
                if (window.authManager) {
                    window.authManager.showMessage('Selecciona un evento para inscribirte', 'info');
                }
            }
        } else {
            // Usuario no logueado - mostrar modal de login
            document.getElementById('loginModal').style.display = 'flex';
            
            // Mostrar mensaje informativo
            setTimeout(() => {
                if (window.authManager) {
                    window.authManager.showMessage('Accede a tu cuenta de delegación para inscribirte en eventos', 'info');
                }
            }, 500);
        }
    }

    navigateToInscripcionPanel(evento) {
        console.log('🔄 Navegando al panel de inscripción para evento:', evento.id, evento.nombre);
        
        // Ocultar página principal
        const homePage = document.getElementById('homePage');
        if (homePage) {
            homePage.classList.remove('active');
        }

        // Mostrar panel de inscripción
        const panelInscripcion = document.getElementById('panelInscripcion');
        if (panelInscripcion) {
            panelInscripcion.classList.add('active');
        }

        // Cargar datos del evento en el panel
        console.log('📋 Cargando datos del evento en el panel...');
        this.loadEventoInPanel(evento);

        // Cargar alumnos inscritos si existe el manager
        if (window.panelInscripcionManager) {
            console.log('👥 Configurando panel de inscripción...');
            window.panelInscripcionManager.setCurrentEvento(evento);
            window.panelInscripcionManager.recargarAlumnosInscritos();
        } else {
            console.error('❌ Panel de inscripción manager no disponible');
        }
        
        console.log('✅ Navegación al panel completada');
    }

    loadEventoInPanel(evento) {
        // Cargar imagen del evento con overlay de modalidad
        const eventoImagen = document.getElementById('eventoImagenInscripcion');
        if (eventoImagen) {
            if (evento.imagen) {
                eventoImagen.innerHTML = `
                    <div class="evento-imagen-container-inscripcion">
                        <img src="${evento.imagen}" alt="${evento.nombre}" onclick="imagePreviewManager.openPreview('${evento.imagen}', '${evento.nombre.replace(/'/g, "\\'")}')">
                        ${evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null' ? `
                            <div class="evento-modalidad-overlay-inscripcion">
                                <span class="badge-modalidad-overlay-inscripcion">${evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                eventoImagen.innerHTML = `
                    <div class="evento-imagen-container-inscripcion">
                        <div class="evento-imagen-placeholder">
                            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                            </svg>
                        </div>
                        ${evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null' ? `
                            <div class="evento-modalidad-overlay-inscripcion">
                                <span class="badge-modalidad-overlay-inscripcion">${evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        }

        // Cargar información del evento
        const eventoNombre = document.getElementById('eventoNombreInscripcion');
        if (eventoNombre) {
            eventoNombre.textContent = evento.nombre;
        }

        const eventoFecha = document.getElementById('eventoFechaInscripcion');
        if (eventoFecha) {
            eventoFecha.textContent = this.formatDate(evento.fecha);
        }

        const eventoLugar = document.getElementById('eventoLugarInscripcion');
        if (eventoLugar) {
            eventoLugar.textContent = `${evento.lugar}${evento.pais || evento.ciudad ? ' - ' : ''}${evento.ciudad ? evento.ciudad + (evento.pais ? ', ' : '') : ''}${evento.pais || ''}`;
        }

        // Actualizar bandera en el panel de inscripción
        const eventoBanderaDetalleAcademia = document.getElementById('eventoBanderaDetalleAcademia');
        if (eventoBanderaDetalleAcademia) {
            if (evento.pais) {
                const countryCode = getCountryCode(evento.pais);
                if (countryCode !== 'XX') {
                    eventoBanderaDetalleAcademia.innerHTML = `<img src="https://flagcdn.com/w20/${countryCode.toLowerCase()}.png" alt="${evento.pais}" style="width: 20px; height: 15px; border-radius: 2px;">`;
                } else {
                    eventoBanderaDetalleAcademia.textContent = getCountryFlag(evento.pais);
                }
            } else {
                eventoBanderaDetalleAcademia.textContent = '🌍';
            }
        }

        const eventoDescripcion = document.getElementById('eventoDescripcionInscripcion');
        if (eventoDescripcion) {
            eventoDescripcion.textContent = evento.descripcion;
        }

        // Cargar bases del evento
        const basesContainer = document.getElementById('container-bases');
        if (basesContainer) {
            basesContainer.innerHTML = this.generateBasesContent(evento);
        }

        // Actualizar el tag "Competition" con el tipo de evento
        const competitionTag = document.querySelector('#panelInscripcion .evento-tags .tag:first-child');
        if (competitionTag) {
            competitionTag.textContent = evento.tipo || 'Competition';
        }

        // Cargar información de la delegación organizadora
        this.cargarInformacionOrganizador(evento);

        // Configurar botón de compartir
        this.configurarBotonesCompartir(evento);
    }

    async cargarInformacionOrganizador(evento) {
        try {
            // Verificar que Firebase esté inicializado
            if (!window.firebaseDB) {
                console.error('Firebase no está inicializado');
                return;
            }

            console.log('Cargando información del organizador para evento:', evento.nombre);
            console.log('academiaId del evento:', evento.academiaId);

            // Obtener información de la delegación organizadora
            if (evento.academiaId) {
                const academiaDoc = await window.firebaseDB.collection('users').doc(evento.academiaId).get();
                
                if (academiaDoc.exists) {
                    const academia = academiaDoc.data();
                    console.log('Datos de la academia encontrada:', academia);
                    
                    const organizadorElement = document.getElementById('eventoOrganizador');
                    if (organizadorElement) {
                        // Usar el nombre de la academia o el nombre de la delegación
                        const nombreAcademia = academia.nombre || academia.nombreDelegacion || academia.nombreAcademia || 'Delegación';
                        console.log('Nombre de la academia a mostrar:', nombreAcademia);
                        organizadorElement.textContent = nombreAcademia;
                    } else {
                        console.error('Elemento eventoOrganizador no encontrado en el DOM');
                    }
                } else {
                    console.log('No se encontró la academia con ID:', evento.academiaId);
                    // Si no se encuentra la academia, mostrar información básica
                    const organizadorElement = document.getElementById('eventoOrganizador');
                    if (organizadorElement) {
                        organizadorElement.textContent = 'Delegación';
                    }
                }
            } else {
                console.log('El evento no tiene academiaId');
                // Si no hay academiaId, mostrar información básica
                const organizadorElement = document.getElementById('eventoOrganizador');
                if (organizadorElement) {
                    organizadorElement.textContent = 'Delegación';
                }
            }
        } catch (error) {
            console.error('Error cargando información del organizador:', error);
            // En caso de error, mostrar información básica
            const organizadorElement = document.getElementById('eventoOrganizador');
            if (organizadorElement) {
                organizadorElement.textContent = 'Delegación';
            }
        }
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
        console.log('🔄 Forzando refresh de eventos públicos...');
        this.cacheTimestamp = null; // Invalidar cache
        await this.loadPublicEvents();
    }

    // Método para ver detalles de evento (llamado desde app.js)
    verDetallesEvento(eventoId) {
        console.log('🔄 Ver detalles de evento:', eventoId);
        
        // Buscar el evento en el cache
        const evento = this.eventosCache.find(e => e.id === eventoId);
        if (!evento) {
            console.error('Evento no encontrado en cache:', eventoId);
            if (window.authManager) {
                window.authManager.showMessage('Evento no encontrado', 'error');
            }
            return;
        }

        // Navegar al panel de detalles de evento para academias
        this.navegarADetallesEventoAcademia(eventoId);
    }

    navegarADetallesEventoAcademia(eventoId) {
        console.log('🔄 Navegando al panel de detalles de evento para academia:', eventoId);
        
        // Ocultar página principal
        const homePage = document.getElementById('homePage');
        if (homePage) {
            homePage.classList.remove('active');
        }

        // Ocultar perfil de delegación
        const perfilDelegacion = document.getElementById('perfilDelegacion');
        if (perfilDelegacion) {
            perfilDelegacion.classList.remove('active');
        }

        // Mostrar panel de detalles de evento para academias
        const detallesEventoAcademia = document.getElementById('detallesEventoAcademia');
        if (detallesEventoAcademia) {
            detallesEventoAcademia.classList.add('active');
        }

        // Cargar datos del evento
        this.cargarDetallesEventoAcademia(eventoId);
    }

    async cargarDetallesEventoAcademia(eventoId) {
        try {
            console.log('📋 Cargando detalles del evento para academia:', eventoId);
            
            // Almacenar el evento actual
            this.currentEventoId = eventoId;
            
            // Obtener datos del evento desde Firebase
            const eventoDoc = await window.firebaseDB.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) {
                console.error('Evento no encontrado en Firebase:', eventoId);
                if (window.authManager) {
                    window.authManager.showMessage('Evento no encontrado', 'error');
                }
                return;
            }

            const evento = { id: eventoDoc.id, ...eventoDoc.data() };
            console.log('📊 Datos del evento cargados:', evento);

            // Obtener total de participantes
            const inscripcionesSnapshot = await window.firebaseDB.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            let totalParticipantes = 0;
            const academiasInscritas = new Set();
            
            inscripcionesSnapshot.forEach(doc => {
                const inscripcion = doc.data();
                totalParticipantes += inscripcion.alumnos ? inscripcion.alumnos.length : 0;
                if (inscripcion.academiaId) {
                    academiasInscritas.add(inscripcion.academiaId);
                }
            });

            console.log('👥 Estadísticas cargadas:', { totalParticipantes, academiasInscritas: academiasInscritas.size });

            // Mostrar detalles del evento
            this.mostrarDetallesEventoAcademia(evento, totalParticipantes, academiasInscritas.size);

        } catch (error) {
            console.error('Error cargando detalles del evento:', error);
            if (window.authManager) {
                window.authManager.showMessage('Error al cargar detalles del evento', 'error');
            }
        }
    }

    mostrarDetallesEventoAcademia(evento, totalParticipantes, totalAcademias) {
        console.log('🎨 Mostrando detalles del evento para academia:', evento.nombre);

        // Actualizar título
        const titulo = document.getElementById('detallesEventoAcademiaTitulo');
        if (titulo) {
            titulo.innerHTML = `
                <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                </svg>
                ${evento.nombre}
            `;
        }

        // Cargar imagen del evento con overlay de modalidad
        const eventoImagen = document.getElementById('eventoImagenPrincipalAcademia');
        if (eventoImagen) {
            if (evento.imagen) {
                eventoImagen.innerHTML = `
                    <div class="evento-imagen-container-inscripcion">
                        <img src="${evento.imagen}" alt="${evento.nombre}" onclick="imagePreviewManager.openPreview('${evento.imagen}', '${evento.nombre.replace(/'/g, "\\'")}')">
                        ${evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null' ? `
                            <div class="evento-modalidad-overlay-inscripcion">
                                <span class="badge-modalidad-overlay-inscripcion">${evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                eventoImagen.innerHTML = `
                    <div class="evento-imagen-container-inscripcion">
                        <div class="evento-imagen-placeholder">
                            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                            </svg>
                        </div>
                        ${evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null' ? `
                            <div class="evento-modalidad-overlay-inscripcion">
                                <span class="badge-modalidad-overlay-inscripcion">${evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        }

        // Actualizar información del organizador
        const eventoOrganizador = document.getElementById('eventoOrganizadorAcademia');
        if (eventoOrganizador) {
            eventoOrganizador.textContent = evento.organizador || 'Delegación';
        }

        // Actualizar información del evento en el header
        const eventoNombre = document.getElementById('eventoNombreDetalleAcademia');
        if (eventoNombre) {
            eventoNombre.textContent = evento.nombre;
        }

        const eventoFecha = document.getElementById('eventoFechaDetalleAcademia');
        if (eventoFecha) {
            eventoFecha.textContent = this.formatDate(evento.fecha);
        }

        const eventoCiudad = document.getElementById('eventoCiudadDetalleAcademia');
        if (eventoCiudad) {
            // Usar el mismo formato que en el panel de inscripción
            eventoCiudad.textContent = `${evento.lugar}${evento.pais || evento.ciudad ? ' - ' : ''}${evento.ciudad ? evento.ciudad + (evento.pais ? ', ' : '') : ''}${evento.pais || ''}`;
        }

        // Actualizar bandera en el panel de detalles de academia
        const eventoBanderaDetalleAcademia = document.getElementById('eventoBanderaDetalleAcademia');
        if (eventoBanderaDetalleAcademia) {
            if (evento.pais) {
                const countryCode = getCountryCode(evento.pais);
                if (countryCode !== 'XX') {
                    eventoBanderaDetalleAcademia.innerHTML = `<img src="https://flagcdn.com/w20/${countryCode.toLowerCase()}.png" alt="${evento.pais}" style="width: 20px; height: 15px; border-radius: 2px;">`;
                } else {
                    eventoBanderaDetalleAcademia.textContent = getCountryFlag(evento.pais);
                }
            } else {
                eventoBanderaDetalleAcademia.textContent = '🌍';
            }
        }

        // Actualizar estadísticas en el header
        const totalParticipantesElement = document.getElementById('totalParticipantesAcademia');
        if (totalParticipantesElement) {
            totalParticipantesElement.textContent = totalParticipantes;
        }

        // Actualizar el tag "Competition" con el tipo de evento
        const competitionTag = document.querySelector('#detallesEventoAcademia .evento-tags .tag:first-child');
        if (competitionTag) {
            competitionTag.textContent = evento.tipo || 'Competition';
        }

        // Actualizar información en la pestaña de descripción
        const eventoDescripcion = document.getElementById('eventoDescripcionDetalleAcademia');
        if (eventoDescripcion) {
            eventoDescripcion.textContent = evento.descripcion || 'Sin descripción';
        }

        // Cargar bases del evento en la pestaña de bases
        const basesContainer = document.getElementById('container-bases-academia');
        if (basesContainer) {
            basesContainer.innerHTML = this.generateBasesContent(evento);
        }

        // Configurar las pestañas según el tipo de evento
        const tipoEvento = evento.modalidad || 'AMBAS';
        this.configurarPestanasSegunEventoAcademia(tipoEvento);

        // Configurar botones de acción
        this.configurarBotonesEventoAcademia(evento);

        // Cargar inscripciones en la tabla
        this.cargarInscripcionesEventoAcademia(evento.id);



        console.log('✅ Detalles del evento mostrados correctamente');
    }

    configurarBotonesEventoAcademia(evento) {
        // Botón editar evento
        const btnEditar = document.getElementById('btnEditarEventoDetalleAcademia');
        if (btnEditar) {
            btnEditar.onclick = () => {
                if (window.eventsManager) {
                    window.eventsManager.openEditEventoModal(evento.id);
                }
            };
        }

        // Botón eliminar evento
        const btnEliminar = document.getElementById('btnEliminarEventoDetalleAcademia');
        if (btnEliminar) {
            btnEliminar.onclick = () => {
                if (window.perfilDelegacionManager) {
                    window.perfilDelegacionManager.eliminarEvento(evento.id);
                }
            };
        }

        // Botón volver a mis eventos
        const btnVolver = document.getElementById('btnVolverMisEventos');
        if (btnVolver) {
            btnVolver.onclick = () => {
                this.volverAMisEventos();
            };
        }

        // Botón generar llaves de combate
        const btnGenerarLlaves = document.getElementById('btnGenerarLlaves');
        if (btnGenerarLlaves) {
            btnGenerarLlaves.onclick = () => {
                this.generarLlavesDeCombate(evento);
            };
        }

        // Botón exportar inscritos (vista academia)
        const btnExportarInscritosAcademia = document.getElementById('btnExportarInscritosAcademia');
        if (btnExportarInscritosAcademia) {
            btnExportarInscritosAcademia.onclick = () => {
                this.exportarInscripcionesAcademia(evento.id);
            };
        }

        // Configurar botón de compartir (vista academia)
        this.configurarBotonesCompartir(evento);

        // Configurar pestañas de navegación (no las de modalidad)
        this.configurarPestanasEventoAcademia();
    }

    // Método para configurar los botones de compartir
    configurarBotonesCompartir(evento) {
        // Botón de compartir en panel de inscripción
        const shareBtnInscripcion = document.querySelector('#panelInscripcion .share-btn');
        if (shareBtnInscripcion) {
            shareBtnInscripcion.onclick = () => {
                this.compartirEvento(evento);
            };
        }

        // Botón de compartir en detalles del evento academia
        const shareBtnAcademia = document.querySelector('#detallesEventoAcademia .share-btn');
        if (shareBtnAcademia) {
            shareBtnAcademia.onclick = () => {
                this.compartirEvento(evento);
            };
        }
    }

    // Método para compartir el evento
    async compartirEvento(evento) {
        try {
            // Generar el link del evento
            const eventLink = `${window.location.origin}${window.location.pathname}?evento=${evento.id}`;
            
            // Intentar usar la API de Web Share si está disponible
            if (navigator.share) {
                await navigator.share({
                    title: evento.nombre,
                    text: `¡Mira este evento de Taekwondo: ${evento.nombre}!`,
                    url: eventLink
                });
            } else {
                // Fallback: copiar al portapapeles
                await this.copiarAlPortapapeles(eventLink);
                
                // Mostrar mensaje de éxito
                if (window.authManager) {
                    window.authManager.showMessage('Link del evento copiado al portapapeles', 'success');
                }
            }
        } catch (error) {
            console.error('Error al compartir evento:', error);
            
            // Si falla el Web Share, intentar copiar al portapapeles
            try {
                const eventLink = `${window.location.origin}${window.location.pathname}?evento=${evento.id}`;
                await this.copiarAlPortapapeles(eventLink);
                
                if (window.authManager) {
                    window.authManager.showMessage('Link del evento copiado al portapapeles', 'success');
                }
            } catch (copyError) {
                console.error('Error al copiar al portapapeles:', copyError);
                if (window.authManager) {
                    window.authManager.showMessage('Error al copiar el link', 'error');
                }
            }
        }
    }

    // Método para copiar texto al portapapeles
    async copiarAlPortapapeles(texto) {
        if (navigator.clipboard && window.isSecureContext) {
            // Usar la API moderna del portapapeles
            await navigator.clipboard.writeText(texto);
        } else {
            // Fallback para navegadores más antiguos
            const textArea = document.createElement('textarea');
            textArea.value = texto;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
            } catch (error) {
                console.error('Error al copiar con execCommand:', error);
                throw error;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    configurarPestanasEventoAcademia() {
        const tabButtons = document.querySelectorAll('#detallesEventoAcademia .tab-btn');
        const tabContainers = document.querySelectorAll('#detallesEventoAcademia .tab-container');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remover clase active de todos los botones y contenedores
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContainers.forEach(container => container.classList.remove('active'));
                
                // Agregar clase active al botón clickeado
                button.classList.add('active');
                
                // Mostrar contenido correspondiente
                const targetContainer = document.getElementById(`container-${targetTab}`);
                if (targetContainer) {
                    targetContainer.classList.add('active');
                }
            });
        });

        // Configurar pestañas de modalidades para inscripciones
        const modalidadTabButtons = document.querySelectorAll('#detallesEventoAcademia .modalidad-tab-btn');
        const modalidadTablaContainers = document.querySelectorAll('#detallesEventoAcademia .modalidad-tabla-container');

        modalidadTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetModalidad = button.getAttribute('data-modalidad');
                
                // Remover clase active de todos los botones y contenedores de modalidad
                modalidadTabButtons.forEach(btn => btn.classList.remove('active'));
                modalidadTablaContainers.forEach(container => container.classList.remove('active'));
                
                // Agregar clase active al botón clickeado
                button.classList.add('active');
                
                // Mostrar tabla correspondiente
                const targetTabla = document.getElementById(`tabla-${targetModalidad}-academia`);
                if (targetTabla) {
                    targetTabla.classList.add('active');
                }
            });
        });
    }

    // Método para configurar las pestañas según el tipo de evento (similar al de app.js)
    configurarPestanasSegunEventoAcademia(tipoEvento) {
        const modalidadTabs = document.querySelector('#detallesEventoAcademia .modalidad-tabs');
        const tablaKyorugi = document.getElementById('tabla-kyorugi-academia');
        const tablaPoomsae = document.getElementById('tabla-poomsae-academia');
        
        if (!modalidadTabs || !tablaKyorugi || !tablaPoomsae) return;

        // Obtener los botones de pestañas
        const btnKyorugi = modalidadTabs.querySelector('[data-modalidad="kyorugi"]');
        const btnPoomsae = modalidadTabs.querySelector('[data-modalidad="poomsae"]');

        if (!btnKyorugi || !btnPoomsae) return;

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

    async cargarInscripcionesEventoAcademia(eventoId) {
        try {
            console.log('📋 Cargando inscripciones para evento:', eventoId);
            
            const inscripcionesSnapshot = await window.firebaseDB.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            const participantes = [];
            const academiasMap = new Map();

            // Obtener información de academias
            for (const inscripcionDoc of inscripcionesSnapshot.docs) {
                const inscripcion = inscripcionDoc.data();
                
                if (inscripcion.academiaId && !academiasMap.has(inscripcion.academiaId)) {
                    try {
                        const academiaDoc = await window.firebaseDB.collection('users').doc(inscripcion.academiaId).get();
                        if (academiaDoc.exists) {
                            const academia = academiaDoc.data();
                            academiasMap.set(inscripcion.academiaId, {
                                nombre: academia.nombre || academia.nombreDelegacion || academia.nombreAcademia || 'Academia',
                                abreviatura: academia.abreviatura || 'ACAD'
                            });
                        }
                    } catch (error) {
                        console.error('Error obteniendo datos de academia:', error);
                        academiasMap.set(inscripcion.academiaId, {
                            nombre: 'Academia',
                            abreviatura: 'ACAD'
                        });
                    }
                }

                // Agregar participantes de esta inscripción
                if (inscripcion.alumnos && Array.isArray(inscripcion.alumnos)) {
                    console.log('📋 Procesando inscripción con', inscripcion.alumnos.length, 'alumnos');
                    inscripcion.alumnos.forEach((alumno, index) => {
                        console.log(`👤 Alumno ${index + 1}:`, {
                            nombre: alumno.nombre,
                            apellido: alumno.apellido,
                            cinturon: alumno.cinturon,
                            dni: alumno.dni
                        });
                        
                        const academia = academiasMap.get(inscripcion.academiaId) || {
                            nombre: 'Academia',
                            abreviatura: 'ACAD'
                        };

                        participantes.push({
                            ...alumno,
                            academiaNombre: academia.nombre,
                            academiaAbreviatura: academia.abreviatura
                        });
                    });
                }
            }

            console.log('👥 Participantes cargados:', participantes.length);

            // Obtener el tipo de evento actual
            const eventoDoc = await window.firebaseDB.collection('eventos').doc(eventoId).get();
            const tipoEvento = eventoDoc.exists ? (eventoDoc.data().modalidad || 'AMBAS') : 'AMBAS';
            
            // Renderizar tabla
            this.renderizarTablaInscripcionesAcademia(participantes, tipoEvento);

        } catch (error) {
            console.error('Error cargando inscripciones:', error);
            if (window.authManager) {
                window.authManager.showMessage('Error al cargar inscripciones', 'error');
            }
        }
    }

    renderizarTablaInscripcionesAcademia(participantes, tipoEvento = 'AMBAS') {
        // Separar participantes por modalidad
        const participantesKyorugi = participantes.filter(p => p.modalidad === 'KYORUGI');
        const participantesPoomsae = participantes.filter(p => p.modalidad === 'POOMSAE');

        // Actualizar contadores solo si la modalidad está habilitada
        const kyorugiCount = document.getElementById('kyorugiCountAcademia');
        const poomsaeCount = document.getElementById('poomsaeCountAcademia');
        
        if (kyorugiCount && (tipoEvento === 'KYORUGI' || tipoEvento === 'AMBAS')) {
            kyorugiCount.textContent = participantesKyorugi.length;
        }
        if (poomsaeCount && (tipoEvento === 'POOMSAE' || tipoEvento === 'AMBAS')) {
            poomsaeCount.textContent = participantesPoomsae.length;
        }

        // Renderizar tabla KYORUGI solo si el evento lo permite
        if (tipoEvento === 'KYORUGI' || tipoEvento === 'AMBAS') {
            const tbodyKyorugi = document.getElementById('tablaKyorugiInscritosAcademia');
            if (tbodyKyorugi) {
                if (participantesKyorugi.length === 0) {
                    tbodyKyorugi.innerHTML = `
                        <tr class="no-participantes">
                            <td colspan="9" class="text-center">
                                <div class="empty-state">
                                    <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
                                    </svg>
                                    <p>No hay participantes KYORUGI inscritos</p>
                                    <p class="text-muted">Los participantes aparecerán aquí cuando se inscriban</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    tbodyKyorugi.innerHTML = participantesKyorugi.map((participante, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${participante.dni || '-'}</td>
                            <td>${participante.nombre || '-'}</td>
                            <td>${participante.apellido || '-'}</td>
                            <td>${participante.fechaNacimiento ? new Date(participante.fechaNacimiento).toLocaleDateString('es-ES') : '-'}</td>
                            <td>${participante.peso || '-'}</td>
                            <td>${participante.cinturon || '-'}</td>
                            <td>${participante.sexo || '-'}</td>
                            <td>${participante.academiaAbreviatura || '-'}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-info btn-sm" title="Editar">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                        </svg>
                                    </button>
                                    <button class="btn btn-danger btn-sm" title="Eliminar">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        }

        // Renderizar tabla POOMSAE solo si el evento lo permite
        if (tipoEvento === 'POOMSAE' || tipoEvento === 'AMBAS') {
            const tbodyPoomsae = document.getElementById('tablaPoomsaeInscritosAcademia');
            if (tbodyPoomsae) {
                if (participantesPoomsae.length === 0) {
                    tbodyPoomsae.innerHTML = `
                        <tr class="no-participantes">
                            <td colspan="9" class="text-center">
                                <div class="empty-state">
                                    <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
                                    </svg>
                                    <p>No hay participantes POOMSAE inscritos</p>
                                    <p class="text-muted">Los participantes aparecerán aquí cuando se inscriban</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    tbodyPoomsae.innerHTML = participantesPoomsae.map((participante, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${participante.dni || '-'}</td>
                            <td>${participante.nombre || '-'}</td>
                            <td>${participante.apellido || '-'}</td>
                            <td>${participante.fechaNacimiento ? new Date(participante.fechaNacimiento).toLocaleDateString('es-ES') : '-'}</td>
                            <td>${participante.cinturon || '-'}</td>
                            <td>${participante.poomsae || '-'}</td>
                            <td>${participante.sexo || '-'}</td>
                            <td>${participante.academiaAbreviatura || '-'}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-info btn-sm" title="Editar">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                        </svg>
                                    </button>
                                    <button class="btn btn-danger btn-sm" title="Eliminar">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        }
    }

    generarLlavesDeCombate(evento) {
        console.log('🔄 Generando llaves de combate para evento:', evento.nombre);
        
        // URL del generador de llaves en Render
        const urlGeneradorLlaves = 'https://filoai.onrender.com';
        
        // Abrir el generador de llaves en una nueva pestaña
        window.open(urlGeneradorLlaves, '_blank');
        
        // Mostrar mensaje informativo
        if (window.authManager) {
            window.authManager.showMessage('Generador de llaves de combate abierto en nueva pestaña', 'success');
        }
    }

    volverAMisEventos() {
        console.log('🔄 Volviendo a Mis Eventos');
        
        // Ocultar panel de detalles de evento
        const detallesEventoAcademia = document.getElementById('detallesEventoAcademia');
        if (detallesEventoAcademia) {
            detallesEventoAcademia.classList.remove('active');
        }

        // Mostrar perfil de delegación
        const perfilDelegacion = document.getElementById('perfilDelegacion');
        if (perfilDelegacion) {
            perfilDelegacion.classList.add('active');
        }

        // Recargar eventos si es necesario
        if (window.perfilDelegacionManager) {
            window.perfilDelegacionManager.cargarMisEventos();
        }
    }

    // Exportar lista de inscripciones para academias
    async exportarInscripcionesAcademia(eventoId) {
        try {
            if (!window.XLSX) {
                throw new Error('La librería XLSX no está cargada');
            }

            const eventoDoc = await window.firebaseDB.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) {
                window.authManager.showMessage('No se encontró el evento', 'error');
                return;
            }

            const evento = eventoDoc.data();
            const inscripcionesSnapshot = await window.firebaseDB.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            // Obtener información de academias
            const academiasMap = new Map();
            const academiasIds = new Set();
            
            inscripcionesSnapshot.forEach(doc => {
                const inscripcion = doc.data();
                if (inscripcion.academiaId) {
                    academiasIds.add(inscripcion.academiaId);
                }
            });

            // Obtener datos de academias desde la colección users
            for (const academiaId of academiasIds) {
                try {
                    const academiaDoc = await window.firebaseDB.collection('users').doc(academiaId).get();
                    if (academiaDoc.exists) {
                        const academia = academiaDoc.data();
                        academiasMap.set(academiaId, {
                            nombre: academia.nombre || academia.nombreDelegacion || academia.nombreAcademia || 'Academia',
                            abreviatura: academia.abreviatura || 'ACAD'
                        });
                    }
                } catch (error) {
                    console.error('Error obteniendo datos de academia:', error);
                    academiasMap.set(academiaId, {
                        nombre: 'Academia',
                        abreviatura: 'ACAD'
                    });
                }
            }

            // Preparar datos para Excel
            const data = [];
            
            inscripcionesSnapshot.forEach(doc => {
                const inscripcion = doc.data();
                const academia = academiasMap.get(inscripcion.academiaId) || {
                    nombre: 'Academia',
                    abreviatura: 'ACAD'
                };
                
                inscripcion.alumnos.forEach(alumno => {
                    data.push({
                        'DNI': alumno.dni || alumno.identificacion || '-',
                        'Nombres': alumno.nombre || alumno.nombres || '-',
                        'Apellidos': alumno.apellido || alumno.apellidos || '-',
                        'Fecha Nacimiento': alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento).toLocaleDateString('es-ES') : '-',
                        'Peso (kg)': alumno.peso ? `${alumno.peso}` : '-',
                        'Grado': alumno.cinturon ? (alumno.cinturon.includes('KUP') ? 
                            alumno.cinturon.replace('KUP-', '') + 'er KUP' : 
                            alumno.cinturon.replace('DAN-', '') + 'er DAN') : '-',
                        'Sexo': alumno.sexo || '-',
                        'Modalidad': alumno.modalidad || '-',
                        'Academia': academia.nombre || '-'
                    });
                });
            });

            if (data.length === 0) {
                window.authManager.showMessage('No hay inscripciones para exportar', 'warning');
                return;
            }

            // Crear workbook y worksheet
            const ws = window.XLSX.utils.json_to_sheet(data);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, "Inscripciones");

            // Ajustar ancho de columnas
            const colWidths = [
                { wch: 10 },  // DNI
                { wch: 20 },  // Nombres
                { wch: 20 },  // Apellidos
                { wch: 15 },  // Fecha Nacimiento
                { wch: 10 },  // Peso
                { wch: 15 },  // Grado
                { wch: 10 },  // Sexo
                { wch: 15 },  // Modalidad
                { wch: 25 }   // Academia
            ];
            ws['!cols'] = colWidths;

            // Generar archivo Excel
            const fileName = `inscripciones_${evento.nombre.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
            window.XLSX.writeFile(wb, fileName);
            
            window.authManager.showMessage('Lista de inscripciones exportada exitosamente', 'success');
        } catch (error) {
            console.error('Error exportando inscripciones:', error);
            window.authManager.showMessage(`Error al exportar inscripciones: ${error.message}`, 'error');
        }
    }


}

// Inicializar el gestor de eventos públicos
window.publicEventsManager = new PublicEventsManager();

// NO inicializar automáticamente - esperar a que app.js coordine la inicialización 