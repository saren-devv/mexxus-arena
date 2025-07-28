// Panel de Administrador con Firebase - Optimizado
class FirebaseAdminManager {
    constructor() {
        this.currentTab = 'eventos';
        this.db = null;
        this.auth = null;
        // Cache para optimizar consultas
        this.eventosCache = new Map();
        this.inscripcionesCache = new Map();
        this.academiasCache = new Map();
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 60000; // 1 minuto
        this.currentEventoId = null;

        // Hacer la instancia disponible globalmente
        window.adminManager = this;
    }

    init() {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser || currentUser.tipo !== 'admin') {
            return;
        }

        this.waitForFirebase().then(() => {
            this.db = window.firebaseDB;
            this.auth = window.firebaseAuth;
            this.setupEventListeners();
            this.loadAdminData();
            console.log('👨‍💼 Admin Manager con Firebase inicializado');
        });
    }

    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.firebaseDB && window.firebaseAuth && window.eventsManager) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error('Firebase o Events Manager no disponible para Admin Manager');
    }

    setupEventListeners() {
        // Verificar si los event listeners ya están configurados
        if (this.eventListenersConfigured) {
            return;
        }
        
        // Tabs del panel de admin
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.closest('.tab-btn').getAttribute('data-tab');
                // Verificar si estamos en la página de detalles del evento
                if (document.getElementById('detallesEvento') && document.getElementById('detallesEvento').classList.contains('active')) {
                    this.switchEventoDetallesTab(tab);
                } else {
                    this.switchTab(tab);
                }
            });
        });

        // Botón crear evento (principal)
        const crearEventoBtn = document.getElementById('crearEventoBtn');
        if (crearEventoBtn && !crearEventoBtn.hasAttribute('data-admin-listener')) {
            crearEventoBtn.setAttribute('data-admin-listener', 'true');
            crearEventoBtn.addEventListener('click', () => {
                window.eventsManager.openCreateEventoModal();
            });
        }

        // Botón crear evento (quick action)
        const crearEventoBtnQuick = document.getElementById('crearEventoBtnQuick');
        if (crearEventoBtnQuick && !crearEventoBtnQuick.hasAttribute('data-admin-listener')) {
            crearEventoBtnQuick.setAttribute('data-admin-listener', 'true');
            crearEventoBtnQuick.addEventListener('click', () => {
                window.eventsManager.openCreateEventoModal();
            });
        }

        // Botón cerrar sesión (quick action)
        const btnCerrarSesionAdminQuick = document.getElementById('btnCerrarSesionAdminQuick');
        if (btnCerrarSesionAdminQuick) {
            btnCerrarSesionAdminQuick.addEventListener('click', () => {
                window.authManager.logout();
            });
        }

        // Botón editar perfil (header)
        const btnEditarPerfilAdminHeader = document.getElementById('btnEditarPerfilAdminHeader');
        if (btnEditarPerfilAdminHeader) {
            btnEditarPerfilAdminHeader.addEventListener('click', () => {
                this.enableAdminProfileEditing();
            });
        }

        // Botón exportar inscritos (vista admin)
        const btnExportarInscritos = document.getElementById('btnExportarInscritos');
        if (btnExportarInscritos) {
            btnExportarInscritos.addEventListener('click', () => {
                if (this.currentEventoId) {
                    this.exportarInscripciones(this.currentEventoId);
                } else {
                    window.authManager.showMessage('No hay evento seleccionado para exportar', 'warning');
                }
            });
        }
        
        // Marcar que los event listeners ya están configurados
        this.eventListenersConfigured = true;
    }

    switchEventoDetallesTab(tabName) {
        // Actualizar botones de tabs
        document.querySelectorAll('.evento-gestion-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.evento-gestion-tabs [data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Mostrar contenido correspondiente
        document.querySelectorAll('.evento-gestion-tabs .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`tab-${tabName}`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        // Cargar datos específicos según la pestaña
        this.loadEventoDetallesTabData(tabName);
    }

    async loadEventoDetallesTabData(tabName) {
        // Obtener el ID del evento actual desde la URL o almacenamiento
        const eventoId = this.currentEventoId;
        if (!eventoId) return;

        try {
            switch(tabName) {
                case 'inscripciones':
                    await this.loadInscripcionesEvento(eventoId);
                    break;
                case 'configuracion':
                    await this.loadConfiguracionEvento(eventoId);
                    break;
            }
        } catch (error) {
            console.error(`Error cargando datos para tab ${tabName}:`, error);
        }
    }

    async loadInscripcionesEvento(eventoId) {
        try {
            // Obtener datos del evento
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) {
                throw new Error('Evento no encontrado');
            }
            const evento = eventoDoc.data();

            // Obtener todas las inscripciones del evento
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            // Obtener todas las academias para mapear los nombres
            const academiasSnapshot = await this.db.collection('users')
                .where('tipo', '==', 'academia')
                .get();
            const academiasMap = new Map();
            academiasSnapshot.forEach(doc => {
                academiasMap.set(doc.id, doc.data());
            });

            // Procesar inscripciones
            let totalParticipantes = 0;
            let totalAcademias = 0;
            let inscripcionesTableBody = '';

            if (!inscripcionesSnapshot.empty) {
                const academiasProcesadas = new Set();

                inscripcionesSnapshot.forEach(doc => {
                    const inscripcion = doc.data();
                    const academia = academiasMap.get(inscripcion.academiaId);
                    
                    if (!academiasProcesadas.has(inscripcion.academiaId)) {
                        academiasProcesadas.add(inscripcion.academiaId);
                        totalAcademias++;
                    }

                    inscripcion.alumnos.forEach(alumno => {
                        totalParticipantes++;
                        
                        // Determinar categoría
                        const categoria = this.determinarCategoria(alumno.edad);

                        // Generar fila de la tabla
                        inscripcionesTableBody += `
                            <tr>
                                <td>${totalParticipantes}</td>
                                <td>${alumno.dni || alumno.identificacion || '-'}</td>
                                <td>${alumno.nombre || alumno.nombres || '-'}</td>
                                <td>${alumno.apellido || alumno.apellidos || '-'}</td>
                                <td>${alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento).toLocaleDateString() : '-'}</td>
                                <td>${alumno.peso || '-'} kg</td>
                                <td>${alumno.cinturon ? (alumno.cinturon.includes('KUP') ? alumno.cinturon.replace('KUP-', '') + 'er KUP' : alumno.cinturon.replace('DAN-', '') + 'er DAN') : '-'}</td>
                                <td>${alumno.sexo || '-'}</td>
                                <td>${alumno.modalidad || '-'}</td>
                                <td>${academia ? (academia.abreviatura || academia.nombre) : '-'}</td>
                            </tr>
                        `;
                    });
                });
            }

            // Actualizar estadísticas
            document.getElementById('totalParticipantes').textContent = totalParticipantes;
            document.getElementById('totalAcademias').textContent = totalAcademias;

            // Actualizar estadísticas en la columna izquierda también
            document.getElementById('totalParticipantesDetalle').textContent = totalParticipantes;
            document.getElementById('totalAcademiasDetalle').textContent = totalAcademias;
            document.getElementById('eventoInscripcionesDetalle').textContent = `${totalParticipantes} participantes inscritos`;

            // Actualizar tabla
            document.getElementById('inscripcionesTableBody').innerHTML = inscripcionesTableBody || `
                <tr>
                    <td colspan="11" class="text-center">
                        <div class="no-data-message">
                            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                            </svg>
                            <h4>No hay inscripciones</h4>
                            <p>Aún no hay participantes inscritos en este evento</p>
                        </div>
                    </td>
                </tr>
            `;

        } catch (error) {
            console.error('Error cargando inscripciones:', error);
            window.authManager.showMessage('Error al cargar las inscripciones', 'error');
        }
    }

    // Función auxiliar para determinar la categoría por edad
    determinarCategoria(edad) {
        if (edad <= 9) return 'PRE CADETES A';
        if (edad <= 11) return 'PRE CADETES B';
        if (edad <= 13) return 'PRE CADETES C';
        if (edad <= 15) return 'CADETES';
        if (edad <= 17) return 'PREJUVENIL';
        if (edad <= 22) return 'JUVENIL U22';
        return 'SENIOR';
    }



    async loadConfiguracionEvento(eventoId) {
        // Implementar carga de configuración para el evento específico
        console.log('Cargando configuración para evento:', eventoId);
    }

    // Método optimizado para cargar todos los datos del admin de una vez
    async loadAdminData() {
        this.showLoading(true);
        
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser || currentUser.tipo !== 'admin') {
                return;
            }

            // Actualizar información del administrador en el panel izquierdo
            this.updateAdminInfo(currentUser);

            // Cargar estadísticas
            await this.loadAdminStats();

            // Verificar cache
            if (this.isCacheValid()) {
                const { eventos, inscripciones, academias } = await this.loadFromCache();
                await this.renderCurrentTab(eventos, inscripciones, academias);
                this.showLoading(false);
                return;
            }

            // Cargar todos los datos en paralelo
            const [eventos, inscripciones, academias] = await Promise.all([
                this.loadAllEventos(),
                this.loadAllInscripciones(),
                this.loadAllAcademias()
            ]);

            // Actualizar cache
            this.updateCache(eventos, inscripciones, academias);

            // Renderizar según el tab actual
            await this.renderCurrentTab(eventos, inscripciones, academias);

            console.log('📊 Datos del admin cargados exitosamente');
        } catch (error) {
            console.error('❌ Error cargando datos del admin:', error);
            this.showError('Error cargando datos del administrador');
        } finally {
            this.showLoading(false);
        }
    }

    updateAdminInfo(user) {
        // Actualizar información del administrador
        const adminInfoNombre = document.getElementById('adminInfoNombre');
        const adminInfoEmail = document.getElementById('adminInfoEmail');
        const adminAvatarImg = document.getElementById('adminAvatarImg');
        const adminAvatarIcon = document.getElementById('adminAvatarIcon');

        if (adminInfoNombre) {
            adminInfoNombre.textContent = user.nombre || user.displayName || 'Administrador';
        }

        if (adminInfoEmail) {
            adminInfoEmail.textContent = user.email || 'admin@mexxusarena.com';
        }

        // Actualizar avatar
        if (adminAvatarImg && adminAvatarIcon) {
            if (user.fotoPerfil) {
                adminAvatarImg.src = user.fotoPerfil;
                adminAvatarImg.style.display = 'block';
                adminAvatarIcon.style.display = 'none';
            } else {
                adminAvatarImg.style.display = 'none';
                adminAvatarIcon.style.display = 'block';
            }
        }
    }

    async loadAdminStats() {
        try {
            // Obtener estadísticas desde Firebase
            const eventosSnapshot = await this.db.collection('eventos').get();
            const academiasSnapshot = await this.db.collection('users').where('tipo', '==', 'academia').get();

            const totalEventos = eventosSnapshot.size;
            const totalDelegaciones = academiasSnapshot.size;

            // Actualizar contadores en el panel
            const totalEventosAdmin = document.getElementById('totalEventosAdmin');
            const totalDelegacionesAdmin = document.getElementById('totalDelegacionesAdmin');

            if (totalEventosAdmin) {
                totalEventosAdmin.textContent = totalEventos;
            }

            if (totalDelegacionesAdmin) {
                totalDelegacionesAdmin.textContent = totalDelegaciones;
            }

        } catch (error) {
            console.error('Error cargando estadísticas del admin:', error);
        }
    }

    async loadAllEventos() {
        const eventos = await window.eventsManager.getAllEventos();
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

    async loadAllAcademias() {
        try {
            const usersSnapshot = await this.db.collection('users')
                .where('tipo', '==', 'academia')
                .get();
            const academias = [];
            usersSnapshot.forEach(doc => {
                academias.push({ id: doc.id, ...doc.data() });
            });
            return academias;
        } catch (error) {
            console.error('Error cargando academias:', error);
            return [];
        }
    }

    isCacheValid() {
        return this.cacheTimestamp && 
               (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION &&
               this.eventosCache.size > 0;
    }

    updateCache(eventos, inscripciones, academias) {
        this.eventosCache.clear();
        this.inscripcionesCache.clear();
        this.academiasCache.clear();
        
        eventos.forEach(evento => {
            this.eventosCache.set(evento.id, evento);
        });
        
        inscripciones.forEach(inscripcion => {
            this.inscripcionesCache.set(inscripcion.id, inscripcion);
        });
        
        academias.forEach(academia => {
            this.academiasCache.set(academia.id, academia);
        });
        
        this.cacheTimestamp = Date.now();
    }

    async loadFromCache() {
        const eventos = Array.from(this.eventosCache.values());
        const inscripciones = Array.from(this.inscripcionesCache.values());
        const academias = Array.from(this.academiasCache.values());
        
        return { eventos, inscripciones, academias };
    }

    async renderCurrentTab(eventos, inscripciones, academias) {
        switch(this.currentTab) {
            case 'eventos':
                await this.renderEventos(eventos, inscripciones);
                break;
            case 'academias':
                await this.renderAcademias(academias, inscripciones);
                break;
            case 'perfil':
                await this.renderPerfilAdmin();
                break;
            default:
                await this.renderEventos(eventos, inscripciones);
                break;
        }
    }

    switchTab(tabName) {
        // Actualizar botones de tabs
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.admin-tabs [data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Mostrar contenido correspondiente - usar selector correcto para admin panel
        document.querySelectorAll('#adminPanel .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        // Actualizar tab actual
        this.currentTab = tabName;
        
        // Cargar datos específicos según la pestaña
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        try {
            const { eventos, inscripciones, academias } = await this.loadFromCache();
            
            switch(tabName) {
                case 'eventos':
                    await this.renderEventos(eventos, inscripciones);
                    break;
                case 'academias':
                    await this.renderAcademias(academias, inscripciones);
                    break;
                case 'perfil':
                    await this.renderPerfilAdmin();
                    break;
            }
        } catch (error) {
            console.error(`Error cargando datos para tab ${tabName}:`, error);
        }
    }

    async loadEventos() {
        // Método legacy - redirigir al nuevo método optimizado
        await this.loadAdminData();
    }

    async renderEventos(eventos, todasInscripciones) {
        const container = document.getElementById('listaEventos');
        if (!container) return;

        try {
            if (eventos.length === 0) {
                container.innerHTML = '<p class="text-center">No hay eventos creados.</p>';
                return;
            }

            container.innerHTML = '';
            
            // Procesar todos los eventos en paralelo
            const eventosCards = await Promise.all(
                eventos.map((evento, index) => this.createEventoAdminCardOptimized(evento, todasInscripciones, index))
            );
            
            eventosCards.forEach((card, index) => {
                if (card) {
                    // Aplicar delay escalonado para la animación
                    card.style.animationDelay = `${(index + 1) * 0.1}s`;
                    container.appendChild(card);
                }
            });
            
        } catch (error) {
            console.error('Error renderizando eventos:', error);
            container.innerHTML = '<p class="text-center error">Error cargando eventos</p>';
        }
    }

    createEventoAdminCardOptimized(evento, todasInscripciones, index = 0) {
        try {
            // Calcular inscripciones para este evento desde los datos ya cargados
            const inscripcionesEvento = todasInscripciones.filter(
                inscripcion => inscripcion.eventoId === evento.id
            );

            let totalInscritos = 0;
            inscripcionesEvento.forEach(inscripcion => {
                totalInscritos += inscripcion.alumnos.length;
            });

            const card = document.createElement('div');
            card.className = 'evento-publico-card';

            // Aplicar efecto glass si el evento tiene imagen
            if (evento.imagen) {
                card.classList.add('has-background');
                // Establecer la imagen como fondo de la card
                card.style.setProperty('--evento-background-image', `url(${evento.imagen})`);
            }

            // Determinar estado del evento
            const hoy = new Date();
            const fechaEvento = evento.fecha.toDate();
            let statusClass = '';
            let statusText = '';

            if (fechaEvento < hoy) {
                statusClass = 'badge-status-finalizado';
                statusText = 'FINALIZADO';
            } else {
                statusClass = 'badge-status-proximo';
                statusText = 'PRÓXIMO';
            }
            
            card.innerHTML = `
                ${evento.imagen ? '<div class="background-image"></div>' : ''}
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
                                <span class="${statusClass}">${statusText}</span>
                            </div>
                        </div>
                        
                        <div class="evento-publico-info">
                            <div class="info-item">
                                <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
                                </svg>
                                <span class="info-text"><strong>Fecha:</strong> ${window.eventsManager.formatDate(evento.fecha)}</span>
                            </div>

                            <div class="info-item">
                                <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z"/>
                                </svg>
                                <span class="info-text"><strong>Ubicación:</strong> ${evento.pais ? evento.pais + ', ' : ''}${evento.ciudad ? evento.ciudad + ' - ' : ''}${evento.lugar}</span>
                            </div>
                            ${evento.modalidad && evento.modalidad.trim() && evento.modalidad !== 'null' ? `
                                <div class="info-item">
                                    <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                                    </svg>
                                    <span class="info-text"><strong>Modalidad:</strong> ${evento.modalidad === 'AMBAS' ? 'KYORUGI y POOMSAE' : evento.modalidad}</span>
                                </div>
                            ` : ''}
                            <div class="info-item">
                                <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
                                </svg>
                                <span class="info-text"><strong>Participantes:</strong> ${totalInscritos} inscritos</span>
                            </div>
                        </div>
                        
                        <div class="evento-publico-descripcion">
                            <p>${evento.descripcion}</p>
                        </div>
                        
                        <div class="evento-publico-action">
                            <button class="btn btn-gold" onclick="window.adminManager.navegarADetallesEvento('${evento.id}')">
                                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                                </svg>
                                VER DETALLES
                            </button>
                            <button class="btn btn-gold" onclick="window.adminManager.verDetallesEvento('${evento.id}')">
                                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
                                </svg>
                                VER INSCRIPCIONES
                            </button>
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

    verDetallesEvento(eventoId) {
        // Validar que el eventoId no esté vacío
        if (!eventoId || eventoId.trim() === '') {
            console.error('Error: eventoId está vacío o es inválido en verDetallesEvento');
            window.authManager.showMessage('Error: ID de evento inválido', 'error');
            return;
        }

        // Navegar a la página de detalles del evento donde están las inscripciones
        this.navegarADetallesEvento(eventoId);
        
        // Cambiar automáticamente a la pestaña de inscripciones en los detalles del evento
        setTimeout(() => {
            this.switchEventoDetallesTab('inscripciones');
        }, 100);
    }

    async loadInscripcionesPorEvento() {
        // Método legacy - redirigir al nuevo método optimizado
        await this.loadAdminData();
    }

    async renderInscripcionesPorEvento(eventos, todasInscripciones, academias) {
        const container = document.getElementById('inscripcionesPorEvento');
        if (!container) return;

        try {
            if (eventos.length === 0) {
                container.innerHTML = '<p class="text-center">No hay eventos creados.</p>';
                return;
            }

            container.innerHTML = '';
            
            // Crear mapa de academias para búsqueda rápida
            const academiasMap = new Map();
            academias.forEach(academia => {
                academiasMap.set(academia.id, academia);
            });
            
            // Procesar eventos en paralelo
            const eventosInscripcionesCards = await Promise.all(
                eventos.map((evento, index) => this.createEventoInscripcionesCardOptimized(evento, todasInscripciones, academiasMap, index))
            );
            
            eventosInscripcionesCards.forEach((card, index) => {
                if (card) {
                    // Aplicar delay escalonado para la animación
                    card.style.animationDelay = `${(index + 1) * 0.1}s`;
                    container.appendChild(card);
                }
            });
            
        } catch (error) {
            console.error('Error renderizando inscripciones:', error);
            container.innerHTML = '<p class="text-center error">Error cargando inscripciones</p>';
        }
    }

    createEventoInscripcionesCardOptimized(evento, todasInscripciones, academiasMap, index = 0) {
        try {
            // Filtrar inscripciones para este evento
            const inscripcionesEvento = todasInscripciones.filter(
                inscripcion => inscripcion.eventoId === evento.id
            );

            const card = document.createElement('div');
            card.className = 'evento-inscripciones-card';
            card.setAttribute('data-evento-id', evento.id);
            
            // Aplicar efecto glass si el evento tiene imagen
            if (evento.imagen) {
                card.classList.add('has-background');
                // Establecer la imagen como fondo de la card
                card.style.setProperty('--evento-background-image', `url(${evento.imagen})`);
            }
            
            const isEventoPasado = window.eventsManager.isEventoPasado(evento.fecha);
            const statusClass = isEventoPasado ? 'badge-status-finalizado' : 'badge-status-proximo';
            const statusText = isEventoPasado ? 'Finalizado' : 'Próximo';

            let totalInscritos = 0;
            inscripcionesEvento.forEach(inscripcion => {
                totalInscritos += inscripcion.alumnos.length;
            });

                                // Recolectar todos los alumnos con información de su academia
                    let todosLosAlumnos = [];
                    inscripcionesEvento.forEach(inscripcion => {
                        const academia = academiasMap.get(inscripcion.academiaId);
                        const academiaNombre = academia ? academia.nombre : 'Delegación no encontrada';
                        const academiaAbreviatura = academia ? academia.abreviatura : 'N/A';
                        
                        inscripcion.alumnos.forEach((alumno, index) => {
                    // Determinar categoría basada en edad
                    let categoria = 'SENIOR';
                    if (alumno.edad <= 9) categoria = 'PRE CADETES A';
                    else if (alumno.edad <= 11) categoria = 'PRE CADETES B';
                    else if (alumno.edad <= 13) categoria = 'PRE CADETES C';
                    else if (alumno.edad <= 15) categoria = 'CADETES';
                    else if (alumno.edad <= 17) categoria = 'PREJUVENIL';
                    else if (alumno.edad <= 22) categoria = 'JUVENIL U22';
                    
                    // Determinar género 
                    const sexo = alumno.sexo || 'Masculino';
                    
                    // Obtener cinturón (nuevo campo o retrocompatibilidad con grado)
                    let cinturon = 'Blanco';
                    const campoGrado = alumno.cinturon || alumno.grado; // Retrocompatibilidad
                    
                    if (campoGrado) {
                        // Mapeo basado en los valores KUP/DAN del formulario
                        switch(campoGrado) {
                            case 'KUP-10':
                                cinturon = '10er KUP - Blanco';
                                break;
                            case 'KUP-9':
                                cinturon = '9er KUP - Blanco/Amarillo';
                                break;
                            case 'KUP-8':
                                cinturon = '8er KUP - Amarillo';
                                break;
                            case 'KUP-7':
                                cinturon = '7er KUP - Amarillo/Verde';
                                break;
                            case 'KUP-6':
                                cinturon = '6er KUP - Verde';
                                break;
                            case 'KUP-5':
                                cinturon = '5er KUP - Verde/Azul';
                                break;
                            case 'KUP-4':
                                cinturon = '4er KUP - Azul';
                                break;
                            case 'KUP-3':
                                cinturon = '3er KUP - Azul/Rojo';
                                break;
                            case 'KUP-2':
                                cinturon = '2er KUP - Rojo';
                                break;
                            case 'KUP-1':
                                cinturon = '1er KUP - Rojo/Negro';
                                break;
                            case 'DAN-1':
                                cinturon = '1er DAN - Cinturón Negro';
                                break;
                            case 'DAN-2':
                                cinturon = '2er DAN - Cinturón Negro';
                                break;
                            case 'DAN-3':
                                cinturon = '3er DAN - Cinturón Negro';
                                break;
                            case 'DAN-4':
                                cinturon = '4er DAN - Cinturón Negro';
                                break;
                            case 'DAN-5':
                                cinturon = '5er DAN - Cinturón Negro';
                                break;
                            case 'DAN-6':
                                cinturon = '6er DAN - Cinturón Negro';
                                break;
                            case 'DAN-7':
                                cinturon = '7er DAN - Cinturón Negro';
                                break;
                            case 'DAN-8':
                                cinturon = '8er DAN - Cinturón Negro';
                                break;
                            case 'DAN-9':
                                cinturon = '9er DAN - Cinturón Negro';
                                break;
                            default:
                                // Retrocompatibilidad: si no es un valor KUP/DAN, usar el texto directamente
                                cinturon = campoGrado;
                                break;
                        }
                    }
                    
                    // Determinar división de peso
                    let divisionPeso = 'LIGTH';
                    const peso = alumno.peso || 0;
                    if (peso) {
                        if (peso <= 30) divisionPeso = 'LIGTH => (30kg)';
                        else if (peso <= 35) divisionPeso = 'MIDDLE => (35kg)';
                        else if (peso <= 40) divisionPeso = 'HEAVY => (40kg)';
                        else if (peso <= 45) divisionPeso = 'BANTHAM => (45kg)';
                        else if (peso <= 50) divisionPeso = 'WELTHER => (50kg)';
                        else if (peso <= 55) divisionPeso = 'LIGTH => (55kg)';
                        else if (peso <= 60) divisionPeso = 'MIDDLE => (60kg)';
                        else if (peso <= 65) divisionPeso = 'HEAVY => (65kg)';
                        else if (peso <= 70) divisionPeso = 'FEATHER => (70kg)';
                        else divisionPeso = 'SUPER HEAVY => (+70kg)';
                    }
                    
                    // Determinar nivel basado en cinturón
                    let nivel = 'Novatos';
                    if (campoGrado && (campoGrado.includes('KUP-4') || campoGrado.includes('KUP-3') || 
                                       campoGrado.includes('KUP-2') || campoGrado.includes('KUP-1') || 
                                       campoGrado.includes('DAN-'))) {
                        nivel = 'Avanzados';
                    }
                    
                                            todosLosAlumnos.push({
                            identificacion: alumno.dni || 'N/A',
                            nombres: alumno.nombre,
                            apellidos: alumno.apellido || 'N/A',
                            edad: alumno.edad,
                            categoria: categoria,
                            sexo: sexo,
                            cinturon: cinturon,
                            divisionPeso: divisionPeso,
                            nivel: nivel,
                            academia: academiaNombre,
                            abreviatura: academiaAbreviatura,
                            inscripcionId: inscripcion.id,
                            alumnoIndex: index
                        });
                });
            });

            card.innerHTML = `
                ${evento.imagen ? '<div class="background-image"></div>' : ''}
                <div class="evento-header">
                    <h4>${evento.nombre}
                        <span class="${statusClass}">
                            ${statusText}
                        </span>
                    </h4>
                    <div class="evento-info">
                        <div class="evento-info-item">
                            <strong>Fecha:</strong> ${window.eventsManager.formatDate(evento.fecha)}
                        </div>
                        <div class="evento-info-item">
                            <strong>Ubicación:</strong> ${evento.lugar}
                        </div>
                        <div class="evento-info-item">
                            <strong>Participantes:</strong> ${totalInscritos} inscritos
                        </div>
                    </div>
                </div>
                
                ${todosLosAlumnos.length === 0 ? 
                    '<p class="text-center">No hay inscripciones para este evento</p>' :
                    `<div class="participantes-tabla-container">
                        <table class="participantes-tabla">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>DNI</th>
                                    <th>Nombres</th>
                                    <th>Apellidos</th>
                                    <th>Fecha de Nacimiento</th>
                                    <th>Peso</th>
                                    <th>Grado KUP (Cinturón)</th>
                                    <th>Género</th>
                                    <th>Modalidad</th>
                                    <th>Academia (Abreviación)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${todosLosAlumnos.map((alumno, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${alumno.dni || alumno.identificacion || '-'}</td>
                                        <td>${alumno.nombres || alumno.nombre || '-'}</td>
                                        <td>${alumno.apellidos || alumno.apellido || '-'}</td>
                                        <td>${alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento).toLocaleDateString('es-ES') : '-'}</td>
                                        <td>${alumno.peso || '-'} kg</td>
                                        <td>${alumno.cinturon ? (alumno.cinturon.includes('KUP') ? alumno.cinturon.replace('KUP-', '') + 'er KUP' : alumno.cinturon.replace('DAN-', '') + 'er DAN') : '-'}</td>
                                        <td>${alumno.sexo || '-'}</td>
                                        <td>${alumno.modalidad || '-'}</td>
                                        <td>${alumno.abreviatura || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
                
                <div class="evento-admin-actions" style="margin-top: 15px;">
                    <button class="btn btn-info" onclick="adminManager.exportarInscripciones('${evento.id}')">
                        📊 Exportar Lista
                    </button>
                    ${!isEventoPasado ? `
                        <button class="btn btn-secondary" onclick="adminManager.enviarNotificaciones('${evento.id}')">
                            📧 Enviar Notificaciones
                        </button>
                    ` : ''}
                    <button class="btn btn-warning" onclick="limpiarEventosDuplicados()" style="margin-left: 10px;">
                        🧹 Limpiar Duplicados
                    </button>
                </div>
            `;

            return card;
        } catch (error) {
            console.error('Error creando card de inscripciones optimizada:', error);
            const card = document.createElement('div');
            card.innerHTML = '<p class="error">Error cargando inscripciones del evento</p>';
            return card;
        }
    }

    async loadAcademias() {
        // Método legacy - redirigir al nuevo método optimizado  
        await this.loadAdminData();
    }

    async renderAcademias(academias, todasInscripciones) {
        const container = document.getElementById('listaAcademias');
        if (!container) return;

        try {
            if (academias.length === 0) {
                container.innerHTML = '<p class="text-center">No hay academias registradas.</p>';
                return;
            }

            container.innerHTML = '';
            
            // Procesar academias en paralelo
            const academiasCards = await Promise.all(
                academias.map(academia => this.createAcademiaCardOptimized(academia, todasInscripciones))
            );
            
            academiasCards.forEach(card => {
                if (card) container.appendChild(card);
            });
            
        } catch (error) {
            console.error('Error renderizando academias:', error);
            container.innerHTML = '<p class="text-center error">Error cargando academias</p>';
        }
    }

    createAcademiaCardOptimized(academia, todasInscripciones) {
        try {
            // Calcular estadísticas desde los datos ya cargados
            const inscripcionesAcademia = todasInscripciones.filter(
                inscripcion => inscripcion.academiaId === academia.id
            );

            let totalEventosParticipados = inscripcionesAcademia.length;
            let totalAlumnosInscritos = 0;
            
            inscripcionesAcademia.forEach(inscripcion => {
                totalAlumnosInscritos += inscripcion.alumnos.length;
            });

            const card = document.createElement('div');
            card.className = 'academia-card';
            
            card.innerHTML = `
                <div class="academia-info">
                    <h4>${academia.nombre}</h4>
                    <div class="academia-stats">
                        <div class="academia-stat-item">
                            <span class="academia-stat-label">Email:</span>
                            <span class="academia-stat-value">${academia.email}</span>
                        </div>
                        <div class="academia-stat-item">
                            <span class="academia-stat-label">Eventos:</span>
                            <span class="academia-stat-value">${totalEventosParticipados} participados</span>
                        </div>
                        <div class="academia-stat-item">
                            <span class="academia-stat-label">Alumnos:</span>
                            <span class="academia-stat-value">${totalAlumnosInscritos} inscritos en total</span>
                        </div>
                    </div>
                </div>
                <div class="academia-actions">
                    <button class="btn btn-secondary" onclick="adminManager.verHistorialAcademia('${academia.id}')">
                        Ver Historial
                    </button>
                    <button class="btn btn-danger" onclick="adminManager.suspenderAcademia('${academia.id}')">
                        Suspender
                    </button>
                </div>
            `;

            return card;
        } catch (error) {
            console.error('Error creando card de academia optimizada:', error);
            const card = document.createElement('div');
            card.innerHTML = '<p class="error">Error cargando academia</p>';
            return card;
        }
    }

    showLoading(show) {
        const containers = ['listaEventos', 'inscripcionesPorEvento', 'listaAcademias'];
        
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
                    Cargando datos...
                </div>
            `;
                }
            }
        });
    }

    showError(message) {
        const containers = ['listaEventos', 'inscripcionesPorEvento', 'listaAcademias'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `<p class="text-center error">${message}</p>`;
            }
        });
    }

    // Invalidar cache cuando hay cambios
    invalidateCache() {
        this.eventosCache.clear();
        this.inscripcionesCache.clear();
        this.academiasCache.clear();
        this.cacheTimestamp = null;
    }

    // Recargar datos forzadamente
    async refresh() {
        this.invalidateCache();
        await this.loadAdminData();
    }

    // Remover alumno específico (función de admin)
    async removerAlumnoAdmin(eventoId, inscripcionId, alumnoIndex) {
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
            
            window.authManager.showMessage('Alumno removido por el administrador', 'success');
            
            this.loadInscripcionesPorEvento();
            this.loadEventos();
            
        } catch (error) {
            console.error('Error removiendo alumno:', error);
            window.authManager.showMessage('Error al remover alumno', 'error');
        }
    }

    // Exportar lista de inscripciones
    async exportarInscripciones(eventoId) {
        try {
            if (!window.XLSX) {
                throw new Error('La librería XLSX no está cargada');
            }

            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) {
                window.authManager.showMessage('No se encontró el evento', 'error');
                return;
            }

            const evento = eventoDoc.data();
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
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
                    const academiaDoc = await this.db.collection('users').doc(academiaId).get();
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

    // Simular envío de notificaciones
    async enviarNotificaciones(eventoId) {
        try {
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) return;

            const evento = eventoDoc.data();
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            if (inscripcionesSnapshot.empty) {
                window.authManager.showMessage('No hay inscripciones para notificar', 'warning');
                return;
            }

            // Simular envío
            setTimeout(() => {
                window.authManager.showMessage(
                    `Notificaciones enviadas a ${inscripcionesSnapshot.size} academias sobre el evento "${evento.nombre}"`, 
                    'success'
                );
            }, 1000);
        } catch (error) {
            console.error('Error enviando notificaciones:', error);
            window.authManager.showMessage('Error al enviar notificaciones', 'error');
        }
    }

    // Ver historial de una academia
    async verHistorialAcademia(academiaId) {
        try {
            const academiaDoc = await this.db.collection('users').doc(academiaId).get();
            if (!academiaDoc.exists) return;

            const academia = academiaDoc.data();
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
                .where('academiaId', '==', academiaId)
                .get();

            const eventosParticipados = [];
            
            for (const inscripcionDoc of inscripcionesSnapshot.docs) {
                const inscripcion = inscripcionDoc.data();
                const eventoDoc = await this.db.collection('eventos').doc(inscripcion.eventoId).get();
                
                if (eventoDoc.exists) {
                    eventosParticipados.push({
                        evento: { id: eventoDoc.id, ...eventoDoc.data() },
                        inscripcion: inscripcion
                    });
                }
            }

            let historialHTML = `
                <h3>Historial de ${academia.nombre}</h3>
                <p><strong>Email:</strong> ${academia.email}</p>
                <p><strong>Eventos participados:</strong> ${eventosParticipados.length}</p>
                <hr>
            `;

            if (eventosParticipados.length > 0) {
                historialHTML += '<h4>Eventos:</h4>';
                eventosParticipados.forEach(({ evento, inscripcion }) => {
                    historialHTML += `
                        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <strong>${evento.nombre}</strong><br>
                            Fecha: ${window.eventsManager.formatDate(evento.fecha)}<br>
                            Alumnos inscritos: ${inscripcion.alumnos.length}<br>
                            <small>Alumnos: ${inscripcion.alumnos.map(a => a.nombre).join(', ')}</small>
                        </div>
                    `;
                });
            } else {
                historialHTML += '<p>No ha participado en ningún evento.</p>';
            }

            // Mostrar en nueva ventana
            const newWindow = window.open('', '_blank', 'width=600,height=400,scrollbars=yes');
            newWindow.document.write(`
                <html>
                    <head><title>Historial - ${academia.nombre}</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        ${historialHTML}
                        <button onclick="window.close()">Cerrar</button>
                    </body>
                </html>
            `);
        } catch (error) {
            console.error('Error cargando historial:', error);
            window.authManager.showMessage('Error al cargar historial', 'error');
        }
    }

    // Suspender academia (simulado)
    suspenderAcademia(academiaId) {
        if (!confirm('¿Está seguro de que desea suspender esta academia?')) {
            return;
        }

        // En una implementación real, aquí se marcaría la academia como suspendida
        window.authManager.showMessage('Funcionalidad de suspensión simulada. La academia sería suspendida en un sistema real.', 'warning');
    }

    // Obtener estadísticas generales
    async getEstadisticasGenerales() {
        try {
            const academiasSnapshot = await this.db.collection('users')
                .where('tipo', '==', 'academia')
                .get();

            const eventosSnapshot = await this.db.collection('eventos').get();
            
            const inscripcionesSnapshot = await this.db.collection('inscripciones').get();
            
            let totalInscripciones = 0;
            inscripcionesSnapshot.forEach(doc => {
                const inscripcion = doc.data();
                totalInscripciones += inscripcion.alumnos.length;
            });

            const eventosProximos = await window.eventsManager.getEventosProximos();

            return {
                totalAcademias: academiasSnapshot.size,
                totalEventos: eventosSnapshot.size,
                eventosProximos: eventosProximos.length,
                totalInscripciones
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                totalAcademias: 0,
                totalEventos: 0,
                eventosProximos: 0,
                totalInscripciones: 0
            };
        }
    }

    // Función para navegar a la página de detalles del evento
    navegarADetallesEvento(eventoId) {
        // Validar que el eventoId no esté vacío
        if (!eventoId || eventoId.trim() === '') {
            console.error('Error: eventoId está vacío o es inválido en navegarADetallesEvento');
            window.authManager.showMessage('Error: ID de evento inválido', 'error');
            return;
        }

        // Almacenar el ID del evento actual
        this.currentEventoId = eventoId;
        
        // Ocultar el panel de admin
        document.getElementById('adminPanel').classList.remove('active');
        
        // Mostrar la página de detalles del evento
        document.getElementById('detallesEvento').classList.add('active');
        
        // Cargar los detalles del evento
        this.cargarDetallesEvento(eventoId);
    }

    // Función para cargar los detalles del evento en la página
    async cargarDetallesEvento(eventoId) {
        try {
            // Validar que el eventoId no esté vacío
            if (!eventoId || eventoId.trim() === '') {
                console.error('Error: eventoId está vacío o es inválido');
                window.authManager.showMessage('Error: ID de evento inválido', 'error');
                return;
            }

            // Configurar el evento actual
            this.currentEventoId = eventoId;

            // Mostrar loading
            this.mostrarLoadingDetalles(true);
            
            // Obtener evento de la cache o de Firebase
            let evento = this.eventosCache.get(eventoId);
            if (!evento) {
                const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
                if (eventoDoc.exists()) {
                    evento = { id: eventoDoc.id, ...eventoDoc.data() };
                } else {
                    throw new Error('Evento no encontrado');
                }
            }

            // Obtener inscripciones para este evento
            const inscripciones = Array.from(this.inscripcionesCache.values()).filter(
                inscripcion => inscripcion.eventoId === eventoId
            );

            // Calcular total de participantes
            let totalParticipantes = 0;
            inscripciones.forEach(inscripcion => {
                totalParticipantes += inscripcion.alumnos.length;
            });

            // Actualizar la interfaz
            this.mostrarDetallesEvento(evento, totalParticipantes);
            
            // Configurar botones
            this.configurarBotonesDetalles(eventoId);
            
        } catch (error) {
            console.error('Error cargando detalles del evento:', error);
            window.authManager.showMessage('Error cargando detalles del evento', 'error');
        } finally {
            this.mostrarLoadingDetalles(false);
        }
    }

    // Función para mostrar los detalles del evento en la interfaz
    mostrarDetallesEvento(evento, totalParticipantes) {
        // Actualizar título del evento
        document.getElementById('detallesEventoTitulo').innerHTML = `
            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
            </svg>
            ${evento.nombre}
        `;

        // Actualizar información del evento en la columna izquierda
        document.getElementById('eventoNombreDetalle').textContent = evento.nombre;
        document.getElementById('eventoFechaDetalle').textContent = evento.fecha ? new Date(evento.fecha).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '--';
        // Actualizar bandera y texto del país
        const eventoBanderaDetalle = document.getElementById('eventoBanderaDetalle');
        const eventoPaisTextoDetalle = document.getElementById('eventoPaisTextoDetalle');
        if (eventoBanderaDetalle && eventoPaisTextoDetalle) {
            if (evento.pais) {
                const countryCode = getCountryCode(evento.pais);
                if (countryCode !== 'XX') {
                    eventoBanderaDetalle.innerHTML = `<img src="https://flagcdn.com/w20/${countryCode.toLowerCase()}.png" alt="${evento.pais}" style="width: 20px; height: 15px; border-radius: 2px;">`;
                } else {
                    eventoBanderaDetalle.textContent = getCountryFlag(evento.pais);
                }
                eventoPaisTextoDetalle.textContent = evento.pais;
            } else {
                eventoBanderaDetalle.textContent = '🌍';
                eventoPaisTextoDetalle.textContent = '--';
            }
        }
        document.getElementById('eventoCiudadDetalle').textContent = evento.ciudad || '--';
        document.getElementById('eventoLugarDetalle').textContent = evento.lugar || '--';
        document.getElementById('eventoModalidadDetalle').textContent = evento.modalidad || '--';
        document.getElementById('eventoDescripcionDetalle').textContent = evento.descripcion || 'Sin descripción disponible';

        // Actualizar elementos de configuración
        document.getElementById('configPais').textContent = evento.pais || '--';
        document.getElementById('configCiudad').textContent = evento.ciudad || '--';
        document.getElementById('configLugar').textContent = evento.lugar || '--';
        
        // Actualizar fecha y estado en configuración
        const configFecha = document.getElementById('configFecha');
        if (configFecha) {
            configFecha.textContent = evento.fecha ? new Date(evento.fecha).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '--';
        }
        
        const configEstado = document.getElementById('configEstado');
        if (configEstado) {
            const fechaEvento = evento.fecha ? new Date(evento.fecha) : null;
            const hoy = new Date();
            
            if (fechaEvento) {
                if (fechaEvento > hoy) {
                    configEstado.textContent = 'Próximo';
                } else {
                    configEstado.textContent = 'Pasado';
                }
            } else {
                configEstado.textContent = '--';
            }
        }

        // Actualizar estado del evento
        const estadoElement = document.getElementById('eventoEstadoDetalle');
        const fechaEvento = evento.fecha ? new Date(evento.fecha) : null;
        const hoy = new Date();
        
        if (fechaEvento) {
            if (fechaEvento > hoy) {
                estadoElement.textContent = 'Próximo';
                estadoElement.className = 'estado-badge proximo';
            } else {
                estadoElement.textContent = 'Pasado';
                estadoElement.className = 'estado-badge pasado';
            }
        } else {
            estadoElement.textContent = '--';
            estadoElement.className = 'estado-badge';
        }

        // Actualizar imagen del evento
        const imagenContainer = document.getElementById('eventoImagenPrincipal');
        if (evento.imagenUrl) {
            imagenContainer.innerHTML = `<img src="${evento.imagenUrl}" alt="${evento.nombre}" onclick="window.adminManager.abrirVistaPrevia('${evento.imagenUrl}')">`;
        } else {
            imagenContainer.innerHTML = `
                <div class="evento-imagen-placeholder">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
                    </svg>
                    <p>Sin imagen</p>
                </div>
            `;
        }

        // Actualizar estadísticas en la columna izquierda
        document.getElementById('totalParticipantesDetalle').textContent = totalParticipantes || 0;
        document.getElementById('eventoInscripcionesDetalle').textContent = `${totalParticipantes || 0} participantes inscritos`;

        // Calcular total de academias (esto se puede optimizar)
        this.calcularTotalAcademias(evento.id).then(totalAcademias => {
            document.getElementById('totalAcademiasDetalle').textContent = totalAcademias || 0;
        });

        // Configurar botones de acción
        this.configurarBotonesDetalles(evento.id);
    }

    async calcularTotalAcademias(eventoId) {
        try {
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            const academiasUnicas = new Set();
            inscripcionesSnapshot.forEach(doc => {
                const inscripcion = doc.data();
                academiasUnicas.add(inscripcion.academiaId);
            });

            return academiasUnicas.size;
        } catch (error) {
            console.error('Error calculando total de academias:', error);
            return 0;
        }
    }

    // Función para configurar los botones de la página de detalles
    configurarBotonesDetalles(eventoId) {
        // Botón volver al admin
        const btnVolverAdmin = document.getElementById('btnVolverAdmin');
        if (btnVolverAdmin) {
            btnVolverAdmin.onclick = () => {
                document.getElementById('detallesEvento').classList.remove('active');
                document.getElementById('adminPanel').classList.add('active');
            };
        }

        // Botón editar evento
        const btnEditarEvento = document.getElementById('btnEditarEventoDetalle');
        if (btnEditarEvento) {
            btnEditarEvento.onclick = () => {
                // Ahora sí abrimos el modal de edición
                window.eventsManager.openEditEventoModal(eventoId);
            };
        }

        // Botón eliminar evento
        const btnEliminarEvento = document.getElementById('btnEliminarEventoDetalle');
        if (btnEliminarEvento) {
            btnEliminarEvento.onclick = () => {
                this.confirmarEliminarEvento(eventoId);
            };
        }
    }

    // Función para confirmar eliminación del evento
    async confirmarEliminarEvento(eventoId) {
        const evento = this.eventosCache.get(eventoId);
        const nombreEvento = evento ? evento.nombre : 'este evento';
        
        if (confirm(`¿Estás seguro de que deseas eliminar "${nombreEvento}"? Esta acción no se puede deshacer.`)) {
            try {
                await window.eventsManager.deleteEvento(eventoId);
                
                // Volver al panel de admin
                document.getElementById('detallesEvento').classList.remove('active');
                document.getElementById('adminPanel').classList.add('active');
                
                // Actualizar datos
                this.invalidateCache();
                await this.loadAdminData();
                
                window.authManager.showMessage('Evento eliminado correctamente', 'success');
            } catch (error) {
                console.error('Error eliminando evento:', error);
                window.authManager.showMessage('Error eliminando evento', 'error');
            }
        }
    }

    // Función para mostrar/ocultar loading en detalles
    mostrarLoadingDetalles(mostrar) {
        const container = document.getElementById('detallesEvento');
        if (mostrar) {
            container.style.opacity = '0.5';
            container.style.pointerEvents = 'none';
        } else {
            container.style.opacity = '1';
            container.style.pointerEvents = 'auto';
        }
    }

    async renderPerfilAdmin() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) {
                console.error('No hay usuario logueado');
                return;
            }

            // Cargar datos del perfil
            await this.loadAdminProfileData(currentUser);
            
            // Configurar event listeners para los botones del perfil
            this.setupAdminProfileEventListeners();
            
        } catch (error) {
            console.error('Error renderizando perfil admin:', error);
            window.authManager.showMessage('Error al cargar el perfil', 'error');
        }
    }

    async loadAdminProfileData(user) {
        try {
            // Llenar los campos con la información del usuario
            document.getElementById('adminPerfilNombre').value = user.nombre || 'Admin Principal';
            document.getElementById('adminPerfilEmail').value = user.email || '';
            
            // Formatear fecha de registro
            let fechaRegistro = 'No disponible';
            if (user.createdAt) {
                if (user.createdAt.toDate) {
                    fechaRegistro = user.createdAt.toDate().toLocaleDateString('es-ES');
                } else if (user.createdAt instanceof Date) {
                    fechaRegistro = user.createdAt.toLocaleDateString('es-ES');
                }
            }
            document.getElementById('adminPerfilFechaRegistro').value = fechaRegistro;
            
        } catch (error) {
            console.error('Error cargando datos del perfil admin:', error);
        }
    }

    setupAdminProfileEventListeners() {
        // Botón editar
        const btnEditar = document.getElementById('btnEditarPerfilAdmin');
        const btnGuardar = document.getElementById('btnGuardarPerfilAdmin');
        const btnCancelar = document.getElementById('btnCancelarPerfilAdmin');
        const btnCerrarSesion = document.getElementById('btnCerrarSesionAdmin');

        if (btnEditar) {
            btnEditar.addEventListener('click', () => this.enableAdminProfileEditing());
        }

        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.saveAdminProfile());
        }

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelAdminProfileEditing());
        }

        if (btnCerrarSesion) {
            btnCerrarSesion.addEventListener('click', () => {
                if (window.authManager) {
                    window.authManager.logout();
                }
            });
        }
    }

    enableAdminProfileEditing() {
        // Habilitar campos editables
        const editableFields = ['adminPerfilNombre'];
        editableFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = false;
                field.classList.add('editing');
            }
        });

        // Mostrar/ocultar botones
        document.getElementById('btnEditarPerfilAdmin').classList.add('hidden');
        document.getElementById('btnGuardarPerfilAdmin').classList.remove('hidden');
        document.getElementById('btnCancelarPerfilAdmin').classList.remove('hidden');

        // Guardar valores originales para cancelar
        this.originalAdminProfileData = {
            nombre: document.getElementById('adminPerfilNombre').value
        };
    }

    async saveAdminProfile() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) {
                throw new Error('No hay usuario logueado');
            }

            // Obtener valores actualizados
            const updatedData = {
                nombre: document.getElementById('adminPerfilNombre').value.trim()
            };

            // Validar datos
            if (!updatedData.nombre) {
                throw new Error('El nombre es obligatorio');
            }

            // Actualizar en Firestore
            await this.db.collection('users').doc(currentUser.uid).update({
                nombre: updatedData.nombre,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Actualizar datos en el authManager
            currentUser.nombre = updatedData.nombre;

            // Deshabilitar edición
            this.disableAdminProfileEditing();

            window.authManager.showMessage('Perfil actualizado correctamente', 'success');
            
        } catch (error) {
            console.error('Error guardando perfil admin:', error);
            window.authManager.showMessage('Error al guardar el perfil: ' + error.message, 'error');
        }
    }

    cancelAdminProfileEditing() {
        // Restaurar valores originales
        if (this.originalAdminProfileData) {
            document.getElementById('adminPerfilNombre').value = this.originalAdminProfileData.nombre;
        }

        // Deshabilitar edición
        this.disableAdminProfileEditing();
    }

    disableAdminProfileEditing() {
        // Deshabilitar campos
        const editableFields = ['adminPerfilNombre'];
        editableFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = true;
                field.classList.remove('editing');
            }
        });

        // Mostrar/ocultar botones
        document.getElementById('btnEditarPerfilAdmin').classList.remove('hidden');
        document.getElementById('btnGuardarPerfilAdmin').classList.add('hidden');
        document.getElementById('btnCancelarPerfilAdmin').classList.add('hidden');

        // Limpiar datos originales
        this.originalAdminProfileData = null;
    }

    abrirVistaPrevia(imageUrl) {
        // Usar el imagePreviewManager existente si está disponible
        if (window.imagePreviewManager) {
            window.imagePreviewManager.openPreview(imageUrl, 'Vista previa de imagen');
        } else {
            // Fallback: abrir en nueva pestaña
            window.open(imageUrl, '_blank');
        }
    }
}

// Inicializar admin manager con Firebase
window.adminManager = new FirebaseAdminManager(); 