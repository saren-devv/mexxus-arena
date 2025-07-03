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
        // Tabs del panel de admin
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                // Verificar si estamos en la página de detalles del evento
                if (document.getElementById('detallesEvento') && document.getElementById('detallesEvento').classList.contains('active')) {
                    this.switchEventoDetallesTab(tab);
                } else {
                    this.switchTab(tab);
                }
            });
        });

        // Botón crear evento
        const crearEventoBtn = document.getElementById('crearEventoBtn');
        if (crearEventoBtn) {
            crearEventoBtn.addEventListener('click', () => {
                window.eventsManager.openCreateEventoModal();
            });
        }
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
                case 'llaves':
                    await this.loadLlavesEvento(eventoId);
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

    async loadLlavesEvento(eventoId) {
        // Implementar carga/generación de llaves para el evento específico
        console.log('Cargando llaves para evento:', eventoId);
        this.initializeLlavesDragDrop();
    }

    // Initialize drag and drop functionality for llaves section
    initializeLlavesDragDrop() {
        const dropZone = document.getElementById('llavesDropZone');
        const fileInput = document.getElementById('llavesFileInput');
        const selectedFile = document.getElementById('llavesSelectedFile');
        const selectedFileName = selectedFile?.querySelector('.llaves-selected-file-name');
        const removeFileBtn = selectedFile?.querySelector('.llaves-remove-file');
        const form = document.getElementById('llavesUploadForm');
        const loadingOverlay = document.getElementById('llavesLoadingOverlay');
        const successOverlay = document.getElementById('llavesSuccessOverlay');

        if (!dropZone || !fileInput || !selectedFile || !form) {
            console.log('Llaves drag and drop elements not found');
            return;
        }

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop zone when dragging over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.highlightDropZone(dropZone), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.unhighlightDropZone(dropZone), false);
        });

        // Handle dropped files
        dropZone.addEventListener('drop', (e) => this.handleLlavesDrop(e, fileInput, selectedFile, selectedFileName, dropZone), false);
        
        // Handle click to select files
        dropZone.addEventListener('click', () => fileInput.click());
        
        // Handle file selection through input
        fileInput.addEventListener('change', (e) => this.handleLlavesFiles(e, selectedFile, selectedFileName, dropZone));

        // Handle remove file button
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => this.removeLlavesFile(fileInput, selectedFile, selectedFileName, dropZone));
        }

        // Handle form submission
        form.addEventListener('submit', (e) => this.handleLlavesSubmit(e, fileInput, loadingOverlay));
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlightDropZone(dropZone) {
        dropZone.classList.add('dragover');
    }

    unhighlightDropZone(dropZone) {
        dropZone.classList.remove('dragover');
    }

    handleLlavesDrop(e, fileInput, selectedFile, selectedFileName, dropZone) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        // Assign files to the actual input element
        if (files.length > 0) {
            // Create a new DataTransfer object to assign to the input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            fileInput.files = dataTransfer.files;
        }
        
        this.handleLlavesFiles({ target: { files: files } }, selectedFile, selectedFileName, dropZone);
    }

    handleLlavesFiles(e, selectedFile, selectedFileName, dropZone) {
        const files = e.target.files;
        if (files.length) {
            const file = files[0];
            if (file.name.match(/\.(xls|xlsx)$/)) {
                selectedFile.style.display = 'flex';
                selectedFileName.textContent = file.name;
                dropZone.style.borderColor = 'var(--color-gold)';
                dropZone.style.background = 'rgba(169, 143, 113, 0.1)';
            } else {
                window.authManager.showMessage('Por favor, selecciona un archivo Excel válido (.xls o .xlsx)', 'error');
                this.removeLlavesFile(e.target, selectedFile, selectedFileName, dropZone);
            }
        }
    }

    removeLlavesFile(fileInput, selectedFile, selectedFileName, dropZone) {
        fileInput.value = '';
        selectedFile.style.display = 'none';
        selectedFileName.textContent = '';
        dropZone.style.borderColor = 'var(--color-gray-300)';
        dropZone.style.background = 'var(--color-gray-50)';
    }

    async handleLlavesSubmit(e, fileInput, loadingOverlay) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('llavesSubmitBtn');
        
        if (!fileInput.files.length) {
            window.authManager.showMessage('Por favor, selecciona un archivo Excel', 'error');
            return;
        }

        const eventoId = this.currentEventoId;
        if (!eventoId) {
            window.authManager.showMessage('Error: No se pudo identificar el evento', 'error');
            return;
        }

        // Disable button and show loading
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <div class="llaves-loading-spinner" style="width: 20px; height: 20px; margin-right: 10px;"></div>
                Generando...
            `;
        }
        
        loadingOverlay.style.display = 'flex';

        try {
            // Create FormData to send file
            const formData = new FormData();
            formData.append('participants', fileInput.files[0]);
            formData.append('eventoId', eventoId);

            // Call the Python backend API
            await this.generateLlavesWithBackend(formData);
            
        } catch (error) {
            console.error('Error generating llaves:', error);
            window.authManager.showMessage('Error al generar las llaves de combate: ' + error.message, 'error');
            
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
                    </svg>
                    Generar Llaves
                `;
            }
            
            loadingOverlay.style.display = 'none';
        }
    }

    async generateLlavesWithBackend(formData) {
        try {
            // Show loading overlay
            this.showLoadingOverlay();
            
            // Disable the submit button
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) submitBtn.disabled = true;

            // Make the API call
            const response = await fetch(window.mexxusConfig.generateBracketsUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al generar las llaves');
            }

            const result = await response.json();
            console.log('Backend response:', result);

            if (result.status === 'success') {
                // Download PDF
                if (result.files.pdf) {
                    const pdfResponse = await fetch(`${window.mexxusConfig.downloadUrl}/${result.files.pdf}`);
                    if (pdfResponse.ok) {
                        const blob = await pdfResponse.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = result.files.pdf;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                    }
                }

                // Download Excel
                if (result.files.excel) {
                    const excelResponse = await fetch(`${window.mexxusConfig.downloadUrl}/${result.files.excel}`);
                    if (excelResponse.ok) {
                        const blob = await excelResponse.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = result.files.excel;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                    }
                }

                // Show success message
                this.showSuccessMessage('¡Llaves generadas con éxito!', 'Los archivos se han descargado automáticamente.');
            } else {
                throw new Error('Error al generar las llaves');
            }
        } catch (error) {
            console.error('Error generating llaves:', error);
            this.showErrorMessage('Error al generar las llaves', error.message || 'Asegúrate de que el servidor Python esté ejecutándose.');
        } finally {
            // Hide loading overlay and re-enable submit button
            this.hideLoadingOverlay();
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    resetLlavesForm() {
        const fileInput = document.getElementById('llavesFileInput');
        const selectedFile = document.getElementById('llavesSelectedFile');
        const selectedFileName = selectedFile?.querySelector('.llaves-selected-file-name');
        const dropZone = document.getElementById('llavesDropZone');
        const submitBtn = document.getElementById('llavesSubmitBtn');
        const loadingOverlay = document.getElementById('llavesLoadingOverlay');
        const successOverlay = document.getElementById('llavesSuccessOverlay');

        // Reset file input and UI
        if (fileInput) this.removeLlavesFile(fileInput, selectedFile, selectedFileName, dropZone);
        
        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
                </svg>
                Generar Llaves
            `;
        }
        
        // Hide overlays
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (successOverlay) successOverlay.style.display = 'none';
    }

    async loadConfiguracionEvento(eventoId) {
        // Implementar carga de configuración para el evento específico
        console.log('Cargando configuración para evento:', eventoId);
    }

    // Método optimizado para cargar todos los datos del admin de una vez
    async loadAdminData() {
        this.showLoading(true);
        
        try {
            // Verificar cache
            if (this.isCacheValid()) {
                await this.loadFromCache();
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

        } catch (error) {
            console.error('Error cargando datos del admin:', error);
            this.showError('Error cargando datos del panel de administración');
        } finally {
            this.showLoading(false);
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
        
        await this.renderCurrentTab(eventos, inscripciones, academias);
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
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
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
        
        // Renderizar datos desde cache si está disponible
        if (this.isCacheValid()) {
            const eventos = Array.from(this.eventosCache.values());
            const inscripciones = Array.from(this.inscripcionesCache.values());
            const academias = Array.from(this.academiasCache.values());
            this.renderCurrentTab(eventos, inscripciones, academias);
        } else {
            this.loadAdminData();
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
                eventos.map(evento => this.createEventoAdminCardOptimized(evento, todasInscripciones))
            );
            
            eventosCards.forEach(card => {
                if (card) container.appendChild(card);
            });
            
        } catch (error) {
            console.error('Error renderizando eventos:', error);
            container.innerHTML = '<p class="text-center error">Error cargando eventos</p>';
        }
    }

    createEventoAdminCardOptimized(evento, todasInscripciones) {
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
                            ${evento.fechaLimiteInscripcion ? `
                                <div class="info-item">
                                    <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
                                    </svg>
                                    <span class="info-text"><strong>Inscripciones hasta:</strong> ${window.eventsManager.formatDate(evento.fechaLimiteInscripcion)}</span>
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
                eventos.map(evento => this.createEventoInscripcionesCardOptimized(evento, todasInscripciones, academiasMap))
            );
            
            eventosInscripcionesCards.forEach(card => {
                if (card) container.appendChild(card);
            });
            
        } catch (error) {
            console.error('Error renderizando inscripciones:', error);
            container.innerHTML = '<p class="text-center error">Error cargando inscripciones</p>';
        }
    }

    createEventoInscripcionesCardOptimized(evento, todasInscripciones, academiasMap) {
        try {
            // Filtrar inscripciones para este evento
            const inscripcionesEvento = todasInscripciones.filter(
                inscripcion => inscripcion.eventoId === evento.id
            );

            const card = document.createElement('div');
            card.className = 'evento-inscripciones-card';
            card.setAttribute('data-evento-id', evento.id);
            
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

            // Preparar datos para Excel
            const data = [];
            
            inscripcionesSnapshot.forEach(doc => {
                const inscripcion = doc.data();
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
                        'Academia': inscripcion.academiaNombre || '-'
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
        const fechaFormateada = window.eventsManager.formatDate(evento.fecha);
        const fechaLimiteFormateada = window.eventsManager.formatDate(evento.fechaLimiteInscripcion);
        const isEventoPasado = window.eventsManager.isEventoPasado(evento.fecha);
        
        // Actualizar título
        document.getElementById('detallesEventoTitulo').innerHTML = `
            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
            </svg>
            ${evento.nombre}
        `;

        // Actualizar imagen
        const imagenContainer = document.getElementById('eventoImagenPrincipal');
        if (evento.imagen) {
            imagenContainer.innerHTML = `
                <img src="${evento.imagen}" alt="${evento.nombre}" 
                     onclick="imagePreviewManager.openPreview('${evento.imagen}', '${evento.nombre.replace(/'/g, "\\'")}')">
            `;
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

        // Actualizar información del evento
        document.getElementById('eventoNombreDetalle').textContent = evento.nombre;
        document.getElementById('eventoFechaDetalle').textContent = fechaFormateada;
        document.getElementById('eventoFechaLimiteDetalle').textContent = fechaLimiteFormateada;
        document.getElementById('eventoLugarDetalle').textContent = evento.lugar;
        document.getElementById('eventoModalidadDetalle').textContent = evento.modalidad;
        document.getElementById('eventoInscripcionesDetalle').textContent = `${totalParticipantes} participantes inscritos`;
        document.getElementById('eventoDescripcionDetalle').textContent = evento.descripcion;

        // Actualizar estado del evento
        const estadoBadge = document.getElementById('eventoEstadoDetalle');
        if (isEventoPasado) {
            estadoBadge.textContent = 'Finalizado';
            estadoBadge.className = 'estado-badge pasado';
        } else {
            estadoBadge.textContent = 'Próximo';
            estadoBadge.className = 'estado-badge proximo';
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

        if (btnEditar) {
            btnEditar.addEventListener('click', () => this.enableAdminProfileEditing());
        }

        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.saveAdminProfile());
        }

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelAdminProfileEditing());
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

    showLoadingOverlay() {
        const loadingOverlay = document.getElementById('llavesLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('llavesLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    showSuccessMessage(title, details) {
        const successOverlay = document.getElementById('llavesSuccessOverlay');
        if (successOverlay) {
            // Update success message
            const successTitle = successOverlay.querySelector('.llaves-success-message');
            const successDetails = successOverlay.querySelector('.llaves-success-details');
            
            if (successTitle) successTitle.textContent = title;
            if (successDetails) successDetails.textContent = details;
            
            // Show the overlay
            successOverlay.style.display = 'flex';
        }
    }

    showErrorMessage(title, details) {
        // Hide loading overlay first
        this.hideLoadingOverlay();
        
        // Show error using the existing toast system
        window.authManager.showMessage(`${title}: ${details}`, 'error');
    }
}

// Inicializar admin manager con Firebase
window.adminManager = new FirebaseAdminManager(); 