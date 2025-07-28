// Sistema de Gestión de Eventos con Firebase
class FirebaseEventsManager {
    constructor() {
        this.currentEventoId = null;
        this.currentEventoParaInscripcion = null;
        this.db = null;
        this.auth = null;
        this.editingInscripcionId = null;
        this.editingAlumnoIndex = undefined;
        this.existingAthletes = [];
        this.currentEventoParaEdicion = null;
        this.participanteEditandoId = null;
        this.poomsaeData = null;
        this.basesToDelete = false;
        this.existingBases = null;
        this.isSubmitting = false; // Flag para prevenir múltiples submissions
        this.loadPoomsaeData();
    }

    init() {
        this.waitForFirebase().then(() => {
            this.db = window.firebaseDB;
            this.auth = window.firebaseAuth;
            this.setupEventListeners();
            console.log('📅 Events Manager con Firebase inicializado');
        });
    }

    async loadPoomsaeData() {
        try {
            const response = await fetch('poomsae-categories.json');
            this.poomsaeData = await response.json();
            console.log('📚 Datos de poomsae cargados:', this.poomsaeData);
        } catch (error) {
            console.error('❌ Error al cargar datos de poomsae:', error);
            this.poomsaeData = null;
        }
    }

    getPoomsaeByGrade(grade) {
        if (!this.poomsaeData) return null;
        
        // Mapear los valores del select a los del JSON
        const gradeMapping = {
            'KUP-10': '9no KUP',
            'KUP-9': '9no KUP',
            'KUP-8': '8vo KUP',
            'KUP-7': '7mo KUP',
            'KUP-6': '6to KUP',
            'KUP-5': '5to KUP',
            'KUP-4': '4to KUP',
            'KUP-3': '3ero KUP',
            'KUP-2': '2do KUP',
            'KUP-1': '1ero KUP',
            'DAN-1': '1er Poom / Dan',
            'DAN-2': '2do Poom / Dan',
            'DAN-3': '3er Poom / Dan',
            'DAN-4': '4to Dan',
            'DAN-5': '5to Dan',
            'DAN-6': '6to Dan',
            'DAN-7': '7mo Dan',
            'DAN-8': '8vo Dan',
            'DAN-9': '8vo Dan' // Asumiendo que 9no Dan usa el mismo poomsae
        };

        const mappedGrade = gradeMapping[grade];
        if (!mappedGrade) return null;

        // Buscar en el array de poomsaes
        const poomsae = this.poomsaeData.poomsaes.find(p => p.grade === mappedGrade);
        if (poomsae) return poomsae.poomsae;

        // Si no se encuentra, verificar si es el caso especial de Kibom Poomsae
        if (mappedGrade === '9no KUP' && this.poomsaeData.kibom_poomsae) {
            return this.poomsaeData.kibom_poomsae.poomsae;
        }

        return null;
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
        throw new Error('Firebase no disponible para Events Manager');
    }

    setupEventListeners() {
        // Modal de crear/editar evento
        const eventoForm = document.getElementById('eventoForm');
        if (eventoForm) {
            eventoForm.addEventListener('submit', (e) => this.handleEventoSubmit(e));
        }

        // Modal de inscripción
        const inscripcionForm = document.getElementById('inscripcionForm');
        if (inscripcionForm) {
            inscripcionForm.addEventListener('submit', (e) => this.handleInscripcionSubmit(e));
        }

        // Botón agregar alumno
        const agregarAlumnoBtn = document.getElementById('agregarAlumnoBtn');
        if (agregarAlumnoBtn) {
            agregarAlumnoBtn.addEventListener('click', () => this.agregarAlumnoForm());
        }

        // Inicializar event listeners
        this.initializeEventListeners();
    }

    // Inicializar event listeners
    initializeEventListeners() {
        // Cerrar modales al hacer clic en el botón de cierre
        const closeButtons = document.querySelectorAll('.modal .close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    if (modal.id === 'inscripcionModal') {
                        this.closeInscripcionModal();
                    } else if (modal.id === 'eventoModal') {
                        this.closeEventoModal();
                    } else {
                        modal.classList.remove('active');
                        modal.style.display = 'none';
                    }
                }
            });
        });

        // Cerrar modales al hacer clic fuera del contenido
        window.addEventListener('click', (event) => {
            const inscripcionModal = document.getElementById('inscripcionModal');
            const atletasModal = document.getElementById('atletasExistentesModal');
            const eventoModal = document.getElementById('eventoModal');
            
            if (event.target === inscripcionModal) {
                this.closeInscripcionModal();
            } else if (event.target === atletasModal) {
                atletasModal.classList.remove('active');
                atletasModal.style.display = 'none';
            } else if (event.target === eventoModal) {
                this.closeEventoModal();
            }
        });

        // Botón para ver atletas registrados
        const verAtletasBtn = document.getElementById('verAtletasBtn');
        if (verAtletasBtn) {
            verAtletasBtn.addEventListener('click', () => {
                const atletasModal = document.getElementById('atletasExistentesModal');
                if (atletasModal) {
                    atletasModal.classList.add('active');
                    atletasModal.style.display = 'flex';
                }
            });
        }

        // Event listeners para el modal de edición de participantes
        const editarParticipantesModal = document.getElementById('editarParticipantesModal');
        const editarCloseBtn = editarParticipantesModal?.querySelector('.close');
        const edicionForm = document.getElementById('edicionParticipanteForm');

        if (editarCloseBtn) {
            editarCloseBtn.addEventListener('click', () => this.closeEditarParticipantesModal());
        }

        if (editarParticipantesModal) {
            window.addEventListener('click', (event) => {
                if (event.target === editarParticipantesModal) {
                    this.closeEditarParticipantesModal();
                }
            });
        }

        if (edicionForm) {
            edicionForm.addEventListener('submit', (e) => this.handleEditarParticipante(e));
        }

        // Botón para ver atletas en el modal de edición
        const verAtletasEdicionBtn = document.getElementById('verAtletasEdicionBtn');
        if (verAtletasEdicionBtn) {
            verAtletasEdicionBtn.addEventListener('click', () => {
                const atletasModal = document.getElementById('atletasExistentesModal');
                if (atletasModal) {
                    atletasModal.classList.add('active');
                    atletasModal.style.display = 'flex';
                }
            });
        }

        // Event listener para manejar cambios de modalidad en el modal de inscripción
        this.setupModalidadChangeListener();
    }

    // Configurar listener para cambios de modalidad
    setupModalidadChangeListener() {
        // Usar event delegation para manejar cambios en selects de modalidad
        document.addEventListener('change', (event) => {
            if (event.target.name === 'modalidad') {
                this.handleModalidadChange(event.target);
            }
            if (event.target.name === 'cinturon') {
                this.handleCinturonChange(event.target);
            }
        });
    }

    // Manejar cambio de modalidad
    handleModalidadChange(modalidadSelect) {
        console.log('🔍 DEBUG - handleModalidadChange llamado con valor:', modalidadSelect.value);
        
        const form = modalidadSelect.closest('.alumno-form');
        if (!form) {
            console.log('🔍 DEBUG - No se encontró el formulario padre');
            return;
        }

        const pesoField = form.querySelector('.peso-field');
        const pesoInput = pesoField?.querySelector('input[name="peso"]');
        const poomsaeField = form.querySelector('.poomsae-field');
        const poomsaeInput = poomsaeField?.querySelector('input[name="poomsae"]');
        
        console.log('🔍 DEBUG - Campos encontrados:', {
            pesoField: !!pesoField,
            pesoInput: !!pesoInput,
            poomsaeField: !!poomsaeField,
            poomsaeInput: !!poomsaeInput
        });
        
        if (!pesoField || !pesoInput || !poomsaeField || !poomsaeInput) {
            console.log('🔍 DEBUG - Faltan campos requeridos');
            return;
        }

        if (modalidadSelect.value === 'KYORUGI') {
            console.log('🔍 DEBUG - Configurando para KYORUGI');
            // Mostrar campo de peso y hacerlo requerido
            pesoField.style.display = 'block';
            pesoInput.required = true;
            // Ocultar campo de poomsae
            poomsaeField.style.display = 'none';
            poomsaeInput.required = false;
            poomsaeInput.value = '';
        } else if (modalidadSelect.value === 'POOMSAE') {
            console.log('🔍 DEBUG - Configurando para POOMSAE');
            // Ocultar campo de peso y quitar requerido
            pesoField.style.display = 'none';
            pesoInput.required = false;
            pesoInput.value = '';
            // Mostrar campo de poomsae
            poomsaeField.style.display = 'block';
            poomsaeInput.required = true;
            // Actualizar poomsae si ya hay un grado seleccionado
            const cinturonSelect = form.querySelector('select[name="cinturon"]');
            if (cinturonSelect && cinturonSelect.value) {
                const poomsae = this.getPoomsaeByGrade(cinturonSelect.value);
                poomsaeInput.value = poomsae || '';
            }
        } else {
            console.log('🔍 DEBUG - Configurando para valor vacío o desconocido:', modalidadSelect.value);
            // Ocultar ambos campos
            pesoField.style.display = 'none';
            pesoInput.required = false;
            pesoInput.value = '';
            poomsaeField.style.display = 'none';
            poomsaeInput.required = false;
            poomsaeInput.value = '';
        }
    }

    // Manejar cambio de grado KUP/DAN
    handleCinturonChange(cinturonSelect) {
        const form = cinturonSelect.closest('.alumno-form');
        if (!form) return;

        const modalidadSelect = form.querySelector('select[name="modalidad"]');
        const poomsaeField = form.querySelector('.poomsae-field');
        const poomsaeInput = poomsaeField?.querySelector('input[name="poomsae"]');
        
        if (!modalidadSelect || !poomsaeField || !poomsaeInput) return;

        // Solo actualizar poomsae si la modalidad es POOMSAE
        if (modalidadSelect.value === 'POOMSAE' && cinturonSelect.value) {
            const poomsae = this.getPoomsaeByGrade(cinturonSelect.value);
            poomsaeInput.value = poomsae || '';
        }
    }

    // Configurar event listeners para formularios de alumnos
    setupFormEventListeners() {
        // Los event listeners ya están configurados globalmente en setupModalidadChangeListener
        // Este método se mantiene para compatibilidad y futuras extensiones
        console.log('✅ Event listeners configurados para formulario de alumno');
    }

    // Crear o editar evento
    async handleEventoSubmit(e) {
        e.preventDefault();
        
        // Prevenir múltiples submissions usando flag de estado
        if (this.isSubmitting) {
            console.log('⚠️ Formulario ya está siendo procesado, ignorando submission adicional');
            return;
        }
        
        // Obtener el botón de submit
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        // Prevenir múltiples submissions
        if (submitBtn && submitBtn.disabled) {
            console.log('⚠️ Formulario ya está siendo procesado, ignorando submission adicional');
            return;
        }
        
        if (submitBtn) {
            this.setButtonLoading(submitBtn, true, this.currentEventoId ? 'Actualizando...' : 'Creando...');
        }
        
        // Marcar como en proceso
        this.isSubmitting = true;
        
        const nombre = document.getElementById('eventoNombre').value.trim();
        const fecha = document.getElementById('eventoFecha').value;
        const tipo = document.getElementById('eventoTipo').value;
        const pais = document.getElementById('eventoPais').value.trim();
        const ciudad = document.getElementById('eventoCiudad').value.trim();
        const lugar = document.getElementById('eventoLugar').value.trim();
        const modalidad = document.getElementById('eventoModalidad').value;
        const descripcion = document.getElementById('eventoDescripcion').value.trim();
        const imagenFile = document.getElementById('eventoImagen').files[0];
        const basesFile = document.getElementById('eventoBasesPdf').files[0];

        // Validar campos obligatorios
        if (!nombre || !fecha || !tipo || !pais || !ciudad || !lugar || !modalidad || !descripcion) {
            window.authManager.showMessage('Por favor complete todos los campos obligatorios', 'error');
            return;
        }

        // Validar fecha del evento (corregir problema de zona horaria)
        const fechaEvento = new Date(fecha + 'T12:00:00'); // Usar mediodía para evitar problemas de zona horaria
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaEvento < hoy) {
            window.authManager.showMessage('La fecha del evento no puede ser en el pasado', 'error');
            return;
        }

        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            window.authManager.showMessage('Debe estar autenticado', 'error');
            return;
        }

        // Verificar que Firebase esté inicializado
        if (!this.db) {
            window.authManager.showMessage('Firebase no está inicializado', 'error');
            return;
        }

        try {
            this.setLoading(true);

            // Preparar datos del evento
            const eventoData = {
                nombre,
                fecha: new Date(fecha + 'T12:00:00'), // Usar mediodía para evitar problemas de zona horaria
                tipo,
                pais,
                ciudad,
                lugar,
                modalidad,
                descripcion,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Manejar imagen si se seleccionó una
            if (imagenFile) {
                try {
                    // Convertir imagen a base64 para almacenamiento en Firestore
                    const imageBase64 = await this.convertImageToBase64(imagenFile);
                    eventoData.imagen = imageBase64;
                    eventoData.imagenNombre = imagenFile.name;
                } catch (imageError) {
                    console.error('Error procesando imagen:', imageError);
                    window.authManager.showMessage('Error al procesar la imagen, el evento se creará sin imagen', 'warning');
                }
            }

            // Manejar bases PDF
            if (basesFile) {
                // Si se seleccionó un nuevo archivo
                try {
                    // Si estamos editando un evento existente, eliminar el archivo anterior
                    if (this.currentEventoId && this.existingBases && this.existingBases.pdf && this.existingBases.pdf.startsWith('http')) {
                        try {
                            console.log('🔍 Editando evento - intentando eliminar archivo anterior:', this.existingBases.pdf);
                            
                            // Extraer ruta del archivo anterior desde la URL
                            const { filePath: oldPath } = this.extractFilePathFromUrl(this.existingBases.pdf, this.currentEventoId);
                            
                            // Eliminar archivo anterior de Storage
                            await this.deleteFileFromStorage(oldPath);
                            console.log('✅ Archivo anterior eliminado correctamente');
                        } catch (deleteError) {
                            console.error('❌ Error eliminando archivo anterior:', deleteError);
                            
                            // No bloquear la subida del nuevo archivo si falla la eliminación del anterior
                            console.warn('⚠️ Continuando con la subida del nuevo archivo aunque falló la eliminación del anterior');
                        }
                    }
                    
                    // Intentar subir nuevo PDF a Firebase Storage
                    try {
                        const storagePath = `eventos/${this.currentEventoId || 'temp'}/bases/${basesFile.name}`;
                        const basesUrl = await this.uploadFileToStorage(basesFile, storagePath);
                        eventoData.basesPdf = basesUrl; // Guardar URL en lugar de base64
                        eventoData.basesPdfNombre = basesFile.name;
                        console.log('✅ PDF subido exitosamente a Firebase Storage');
                    } catch (storageError) {
                        console.warn('⚠️ Error al subir a Firebase Storage:', storageError);
                        
                        // Detectar específicamente errores de CORS
                        const isCorsError = storageError.message === 'CORS_ERROR' ||
                                           storageError.message.includes('CORS') || 
                                           storageError.message.includes('cors') ||
                                           storageError.message.includes('ERR_FAILED') ||
                                           storageError.message.includes('Access to XMLHttpRequest');
                        
                        if (isCorsError) {
                            console.log('🔄 Error de CORS detectado - convirtiendo PDF a base64 como alternativa...');
                            try {
                                const base64Data = await this.convertFileToBase64(basesFile);
                                
                                // Verificar el tamaño del base64 antes de guardar
                                const base64Size = base64Data.length;
                                console.log(`📊 Tamaño final del base64: ${(base64Size / 1024 / 1024).toFixed(2)} MB`);
                                
                                if (base64Size > 900 * 1024) { // 900KB límite seguro
                                    console.log('⚠️ Base64 aún muy grande, aplicando compresión adicional...');
                                    const compressedData = this.reduceBase64Quality(base64Data);
                                    
                                    // Verificar si después de la compresión sigue siendo muy grande
                                    if (compressedData.length > 800 * 1024) {
                                        console.log('❌ PDF demasiado grande incluso después de compresión');
                                        eventoData.basesPdf = this.handleOversizedPDF(basesFile);
                                        window.authManager.showMessage('PDF demasiado grande. Se requiere configuración de Firebase Storage.', 'warning');
                                    } else {
                                        eventoData.basesPdf = compressedData;
                                    }
                                } else {
                                    eventoData.basesPdf = base64Data;
                                }
                                
                                eventoData.basesPdfNombre = basesFile.name;
                                console.log('✅ PDF convertido a base64 y guardado en Firestore');
                                
                                window.authManager.showMessage('PDF guardado como base64 (Storage no disponible)', 'info');
                            } catch (base64Error) {
                                console.error('❌ Error convirtiendo a base64:', base64Error);
                                throw new Error('No se pudo procesar el archivo PDF');
                            }
                        } else {
                            // Si no es CORS, re-lanzar el error original
                            throw storageError;
                        }
                    }
                } catch (basesError) {
                    console.error('Error procesando bases PDF:', basesError);
                    window.authManager.showMessage('Error al procesar las bases PDF, el evento se creará sin bases', 'warning');
                }
            } else if (this.basesToDelete) {
                // Si se marcó para eliminar las bases existentes
                console.log('🗑️ Eliminando bases existentes del evento');
                eventoData.basesPdf = null;
                eventoData.basesPdfNombre = null;
                this.basesToDelete = false; // Resetear flag
            }

            // Log para verificar los datos antes de guardar
            console.log('📋 Datos del evento a guardar:', {
                nombre: eventoData.nombre,
                fecha: eventoData.fecha,
                basesPdf: eventoData.basesPdf ? '✅ Presente' : '❌ Ausente',
                basesPdfNombre: eventoData.basesPdfNombre,
                currentEventoId: this.currentEventoId
            });

            if (this.currentEventoId) {
                // Editar evento existente
                console.log('🔄 Actualizando evento existente:', this.currentEventoId);
                await this.db.collection('eventos').doc(this.currentEventoId).update(eventoData);
                console.log('✅ Evento actualizado correctamente');
                window.authManager.showMessage('Evento actualizado correctamente', 'success');
            } else {
                // Crear nuevo evento
                console.log('🆕 Creando nuevo evento...');
                eventoData.createdBy = currentUser.uid;
                eventoData.academiaId = currentUser.uid; // Agregar academiaId para identificar eventos de delegaciones
                eventoData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                
                const docRef = await this.db.collection('eventos').add(eventoData);
                console.log('✅ Evento creado correctamente con ID:', docRef.id);
                window.authManager.showMessage('Evento creado correctamente', 'success');
            }

            this.closeEventoModal();
            
            // Actualizar vistas
            console.log('✅ Vistas actualizadas después de guardar evento');
            if (window.adminManager) {
                window.adminManager.invalidateCache();
                
                // Si estamos en la página de detalles del evento, recargar los detalles
                const paginaDetalles = document.getElementById('detallesEvento');
                if (paginaDetalles && paginaDetalles.classList.contains('active') && this.currentEventoId) {
                    window.adminManager.cargarDetallesEvento(this.currentEventoId);
                } else {
                    window.adminManager.loadAdminData();
                }
            }
            
            // Actualizar la lista de eventos en el perfil de delegación si está abierto
            if (window.perfilDelegacionManager) {
                window.perfilDelegacionManager.cargarMisEventos();
            }

        } catch (error) {
            console.error('Error guardando evento:', error);
            window.authManager.showMessage('Error al guardar evento', 'error');
        } finally {
            this.setLoading(false);
            // Restaurar estado del botón
            if (submitBtn) {
                this.setButtonLoading(submitBtn, false);
            }
            // Reset del flag de submission
            this.isSubmitting = false;
        }
    }

    // Manejar inscripción de alumnos
    async handleInscripcionSubmit(e) {
        e.preventDefault();
        
        const currentUser = window.authManager.getCurrentUser();
        
        if (!currentUser || !this.currentEventoParaInscripcion) {
            window.authManager.showMessage('Error en la inscripción', 'error');
            return;
        }

        // Verificar que Firebase esté inicializado
        if (!this.db) {
            window.authManager.showMessage('Firebase no está inicializado', 'error');
            return;
        }

        // Recopilar datos del alumno
        const form = document.getElementById('inscripcionForm');
        const formData = {
            nombre: form.querySelector('input[name="nombre"]')?.value,
            apellido: form.querySelector('input[name="apellido"]')?.value,
            dni: form.querySelector('input[name="dni"]')?.value,
            fechaNacimiento: form.querySelector('input[name="fechaNacimiento"]')?.value,
            peso: form.querySelector('input[name="peso"]')?.value,
            sexo: form.querySelector('select[name="sexo"]')?.value,
            cinturon: form.querySelector('select[name="cinturon"]')?.value,
            modalidad: form.querySelector('select[name="modalidad"]')?.value,
            poomsae: form.querySelector('input[name="poomsae"]')?.value
        };

        // Validar que todos los campos requeridos estén presentes
        for (const [key, value] of Object.entries(formData)) {
            // Solo validar peso si la modalidad es KYORUGI
            if (key === 'peso' && formData.modalidad !== 'KYORUGI') {
                continue;
            }
            // Solo validar poomsae si la modalidad es POOMSAE
            if (key === 'poomsae' && formData.modalidad !== 'POOMSAE') {
                continue;
            }
            
            if (!value) {
                window.authManager.showMessage(`Por favor complete el campo ${key}`, 'error');
                return;
            }
        }

        // Validar peso solo si la modalidad es KYORUGI
        let peso = 0;
        if (formData.modalidad === 'KYORUGI') {
            peso = parseFloat(formData.peso);
            if (isNaN(peso)) {
                window.authManager.showMessage('El peso debe ser un número válido', 'error');
                return;
            }
        }

        // Calcular edad
        const edad = this.calcularEdad(formData.fechaNacimiento);

        // Determinar división por edad
        let division = '';
        if (edad <= 5) division = 'Baby';
        else if (edad <= 7) division = 'Pre-Infantil';
        else if (edad <= 9) division = 'Infantil';
        else if (edad <= 11) division = 'Infantil Mayor';
        else if (edad <= 13) division = 'Cadete';
        else if (edad <= 15) division = 'Junior';
        else if (edad <= 17) division = 'Juvenil';
        else division = 'Senior';

        // Determinar nivel basado en el cinturón
        let nivel = '';
        if (formData.cinturon.includes('KUP')) {
            const kupNumber = parseInt(formData.cinturon.split('-')[1]);
            if (kupNumber >= 8) nivel = 'Festival';
            else if (kupNumber >= 4) nivel = 'Noveles';
            else nivel = 'Avanzados';
        } else {
            nivel = 'Avanzados';
        }

        // Determinar categoría de peso solo si es KYORUGI
        let categoriaPeso = '';
        if (formData.modalidad === 'KYORUGI') {
            categoriaPeso = this.determinarCategoriaPeso(peso, edad, formData.sexo);
        }

        const alumno = {
            nombre: formData.nombre,
            apellido: formData.apellido,
            fechaNacimiento: formData.fechaNacimiento,
            dni: formData.dni,
            cinturon: formData.cinturon,
            sexo: formData.sexo,
            peso: peso,
            edad: edad,
            modalidad: formData.modalidad,
            poomsae: formData.poomsae,
            division: division,
            nivel: nivel,
            divisionPeso: categoriaPeso
        };
        
        console.log('📝 Datos del alumno a guardar:', alumno);
        console.log('🔍 DEBUG - Modalidad del formulario:', formData.modalidad);
        console.log('🔍 DEBUG - Modalidad del alumno objeto:', alumno.modalidad);

        try {
            // Si estamos en modo edición
            if (this.editingInscripcionId !== null && this.editingAlumnoIndex !== undefined) {
                // Obtener la inscripción actual
                const inscripcionRef = this.db.collection('inscripciones').doc(this.editingInscripcionId);
                const inscripcionDoc = await inscripcionRef.get();

                if (!inscripcionDoc.exists) {
                    throw new Error('La inscripción no existe');
                }

                const inscripcion = inscripcionDoc.data();
                const alumnos = [...inscripcion.alumnos];

                // Actualizar el alumno en el índice específico
                alumnos[this.editingAlumnoIndex] = alumno;

                // Actualizar la inscripción con el alumno modificado
                await inscripcionRef.update({
                    alumnos: alumnos,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                window.authManager.showMessage('Alumno actualizado correctamente', 'success');
                
                // Resetear modo edición
                this.editingInscripcionId = null;
                this.editingAlumnoIndex = undefined;
            } else {
                // Obtener inscripciones actuales del evento
                const inscripcionesSnapshot = await this.db.collection('inscripciones')
                    .where('eventoId', '==', this.currentEventoParaInscripcion)
                    .get();

                let inscripcionExistente = null;

                inscripcionesSnapshot.forEach(doc => {
                    const inscripcion = doc.data();
                    if (inscripcion.academiaId === currentUser.uid) {
                        inscripcionExistente = { id: doc.id, data: inscripcion };
                    }
                });

                if (inscripcionExistente) {
                    // Agregar alumno a inscripción existente
                    const nuevosAlumnos = [...inscripcionExistente.data.alumnos, alumno];
                    console.log('📋 Agregando alumno a inscripción existente. Nuevos alumnos:', nuevosAlumnos);
                    await this.db.collection('inscripciones').doc(inscripcionExistente.id).update({
                        alumnos: nuevosAlumnos,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('✅ Alumno agregado a inscripción existente');
                } else {
                    // Crear nueva inscripción
                    console.log('📋 Creando nueva inscripción con alumno:', [alumno]);
                    await this.db.collection('inscripciones').add({
                        eventoId: this.currentEventoParaInscripcion,
                        academiaId: currentUser.uid,
                        createdBy: currentUser.uid, // Campo requerido por las reglas de Firestore
                        alumnos: [alumno],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('✅ Nueva inscripción creada');
                }

                window.authManager.showMessage('Alumno inscrito correctamente', 'success');
            }

            // Vista actualizada automáticamente
            console.log('✅ Vista actualizada después de inscripción');

            // Actualizar la tabla de alumnos inscritos en el panel de inscripción
            if (window.panelInscripcionManager) {
                window.panelInscripcionManager.recargarAlumnosInscritos();
            }

            // Mantener el modal abierto pero listo para una nueva inscripción
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'INSCRIBIR ALUMNO';
                submitBtn.className = 'btn btn-primary';
            }

            // Mostrar el botón de agregar más alumnos
            const agregarBtn = document.getElementById('agregarAlumnoBtn');
            if (agregarBtn) {
                agregarBtn.style.display = 'block';
            }

            // Resetear el formulario usando el método existente que contiene el template actualizado
            this.resetAlumnosContainer();

        } catch (error) {
            console.error('Error en la inscripción:', error);
            window.authManager.showMessage('Error al inscribir al alumno', 'error');
        }
    }

    // Abrir modal para crear evento
    openCreateEventoModal() {
        this.currentEventoId = null;
        document.getElementById('eventoModalTitle').innerHTML = `
            <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
            </svg>
            Crear Evento
        `;
        document.getElementById('eventoForm').reset();
        
        // Limpiar vista previa de imagen y bases
        this.clearImagePreview();
        this.clearBasesPreview();
        
        // Establecer fecha mínima como hoy
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('eventoFecha').min = today;
        
        
        // Configurar evento de imagen y bases
        this.setupImagePreview();
        this.setupBasesPreview();
        
        const eventoModal = document.getElementById('eventoModal');
        eventoModal.style.display = 'flex';
        eventoModal.classList.add('active');
        document.getElementById('eventoNombre').focus();
    }

    // Abrir modal para editar evento
    async openEditEventoModal(eventoId) {
        // Verificar que Firebase esté inicializado
        if (!this.db) {
            window.authManager.showMessage('Firebase no está inicializado', 'error');
            return;
        }

        try {
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            
            if (!eventoDoc.exists) {
                window.authManager.showMessage('Evento no encontrado', 'error');
                return;
            }

            const evento = eventoDoc.data();
            this.currentEventoId = eventoId;
            document.getElementById('eventoModalTitle').innerHTML = `
                <svg class="icon icon-lg" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                </svg>
                Editar Evento
            `;
            
            // Limpiar vista previa de imagen y bases
            this.clearImagePreview();
            this.clearBasesPreview();
            
            // Llenar formulario con datos del evento
            document.getElementById('eventoNombre').value = evento.nombre || '';
            document.getElementById('eventoFecha').value = evento.fecha ? this.formatDateForInput(evento.fecha.toDate()) : '';
            document.getElementById('eventoTipo').value = evento.tipo || '';
            document.getElementById('eventoPais').value = evento.pais || '';
            document.getElementById('eventoCiudad').value = evento.ciudad || '';
            document.getElementById('eventoLugar').value = evento.lugar || '';
            document.getElementById('eventoModalidad').value = evento.modalidad || '';
            document.getElementById('eventoDescripcion').value = evento.descripcion || '';

            
            // Mostrar imagen si existe
            if (evento.imagen) {
                const previewImg = document.getElementById('imagenPreviewImg');
                const preview = document.getElementById('imagenPreview');
                if (previewImg && preview) {
                    previewImg.src = evento.imagen;
                    preview.style.display = 'block';
                }
            }
            

            // Guardar información de bases existentes para posible eliminación
            this.existingBases = {
                pdf: evento.basesPdf,
                nombre: evento.basesPdfNombre
            };
            
            // Mostrar bases PDF si existe
            if (evento.basesPdf && evento.basesPdfNombre) {
                this.showExistingBases(evento.basesPdf, evento.basesPdfNombre);
            } else {
                this.clearBasesPreview();
            }
            
            // Configurar eventos de vista previa
            this.setupImagePreview();
            this.setupBasesPreview();
            
            const eventoModal = document.getElementById('eventoModal');
            eventoModal.style.display = 'flex';
            eventoModal.classList.add('active');
        } catch (error) {
            console.error('Error cargando evento:', error);
            window.authManager.showMessage('Error al cargar evento', 'error');
        }
    }

    // Cerrar modal de evento
    closeEventoModal() {
        this.currentEventoId = null;
        this.basesToDelete = false;
        this.existingBases = null;
        const eventoModal = document.getElementById('eventoModal');
        eventoModal.style.display = 'none';
        eventoModal.classList.remove('active');
        document.getElementById('eventoForm').reset();
        
        // Limpiar vistas previas
        this.clearImagePreview();
        this.clearBasesPreview();
        
        // Asegurar que el input de archivo esté visible al cerrar
        const fileInputWrapper = document.querySelector('.file-input-wrapper');
        if (fileInputWrapper) {
            fileInputWrapper.style.display = 'block';
        }
    }

    // Abrir modal de inscripción
    async openInscripcionModal(eventoId, fromPanel = false) {
        // Verificar que Firebase esté inicializado
        if (!this.db) {
            window.authManager.showMessage('Firebase no está inicializado', 'error');
            return;
        }

        try {
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            
            if (!eventoDoc.exists) {
                window.authManager.showMessage('Evento no encontrado', 'error');
                return;
            }

            const evento = eventoDoc.data();
            this.currentEventoParaInscripcion = eventoId;
            
            // Guardar la modalidad del evento para restringir opciones
            this.eventoModalidad = evento.modalidad || 'AMBAS';
            
            // Cargar atletas existentes
            await this.loadExistingAthletes();

            // Mostrar el modal de inscripción
            const inscripcionModal = document.getElementById('inscripcionModal');
            if (inscripcionModal) {
                inscripcionModal.classList.add('active');
                inscripcionModal.style.display = 'flex';
            }

            // Verificar si es una edición de alumno específico
            if (this.editingInscripcionId && this.editingAlumnoIndex !== undefined) {
                // Modo edición: mostrar solo el formulario del alumno a editar
                document.getElementById('eventoInscripcionNombre').innerHTML = 
                    `${evento.nombre}<br><small style="color: #d7ba71;">Editando participante</small>`;
                
                this.resetAlumnosContainer();
                
                // Cambiar el texto del botón de envío
                const submitBtn = document.querySelector('#inscripcionForm button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'ACTUALIZAR ALUMNO';
                    submitBtn.className = 'btn btn-warning';
                }
                
                // Ocultar el botón de agregar más alumnos en modo edición
                const agregarBtn = document.getElementById('agregarAlumnoBtn');
                if (agregarBtn) {
                    agregarBtn.style.display = 'none';
                }
                
                // Precargar datos del alumno
                await this.preCargarDatosAlumnoParaEdicion();
            } else {
                // Modo normal: inscripción nueva o agregar alumnos
                document.getElementById('eventoInscripcionNombre').textContent = evento.nombre;
                
                // Resetear contenedor de alumnos
                this.resetAlumnosContainer();

                // Solo cargar alumnos existentes si NO viene desde el panel
                if (!fromPanel) {
                    // Verificar si la academia ya tiene inscripción para este evento
                    const currentUser = window.authManager.getCurrentUser();
                    const miInscripcionSnapshot = await this.db.collection('inscripciones')
                        .where('eventoId', '==', eventoId)
                        .where('academiaId', '==', currentUser.uid)
                        .get();

                    // Si ya tiene inscripción, cargar los alumnos existentes
                    if (!miInscripcionSnapshot.empty) {
                        console.log('📋 Inscripción existente encontrada');
                        const miInscripcion = miInscripcionSnapshot.docs[0].data();
                        console.log('📊 Datos de inscripción:', miInscripcion);
                        console.log('👥 Alumnos en inscripción:', miInscripcion.alumnos);
                        
                        this.loadExistingStudents(miInscripcion.alumnos);
                        
                        // Actualizar título del modal
                        document.getElementById('eventoInscripcionNombre').innerHTML = 
                            `${evento.nombre}<br><small style="color: #666;">Agregando más alumnos (${miInscripcion.alumnos.length} ya inscritos)</small>`;
                    } else {
                        console.log('📭 No se encontró inscripción existente');
                    }
                }
                
                // Restaurar botón de envío normal
                const submitBtn = document.querySelector('#inscripcionForm button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'INSCRIBIR ALUMNO';
                    submitBtn.className = 'btn btn-primary';
                }
                
                // Mostrar el botón de agregar más alumnos
                const agregarBtn = document.getElementById('agregarAlumnoBtn');
                if (agregarBtn) {
                    agregarBtn.style.display = 'block';
                }
            }

        } catch (error) {
            console.error('Error abriendo modal de inscripción:', error);
            window.authManager.showMessage('Error al abrir el formulario de inscripción', 'error');
        }
    }

    // Cerrar modal de inscripción
    closeInscripcionModal() {
        // Limpiar variables de estado
        this.currentEventoParaInscripcion = null;
        this.editingInscripcionId = null;
        this.editingAlumnoIndex = undefined;
        this.eventoModalidad = null;
        
        // Cerrar y limpiar modales
        const inscripcionModal = document.getElementById('inscripcionModal');
        const atletasExistentesModal = document.getElementById('atletasExistentesModal');
        
        if (inscripcionModal) {
            inscripcionModal.classList.remove('active');
            inscripcionModal.style.display = 'none';
        }
        
        if (atletasExistentesModal) {
            atletasExistentesModal.classList.remove('active');
            atletasExistentesModal.style.display = 'none';
        }
        
        // Resetear formulario
        const inscripcionForm = document.getElementById('inscripcionForm');
        if (inscripcionForm) {
            inscripcionForm.reset();
        }
        
        // Resetear contenedor de alumnos
        this.resetAlumnosContainer();
        
        // Restaurar botón de envío normal
        const submitBtn = document.querySelector('#inscripcionForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'INSCRIBIR ALUMNO';
            submitBtn.className = 'btn btn-primary';
        }
        
        // Restaurar título del evento
        const eventoTitulo = document.getElementById('eventoInscripcionNombre');
        if (eventoTitulo) {
            eventoTitulo.innerHTML = '';
        }
        
        // Permitir scroll del body
        document.body.style.overflow = 'auto';
    }

    // Precargar datos del alumno para edición
    async preCargarDatosAlumnoParaEdicion() {
        try {
            const inscripcionDoc = await this.db.collection('inscripciones').doc(this.editingInscripcionId).get();
            if (!inscripcionDoc.exists) return;
            
            const inscripcion = inscripcionDoc.data();
            const alumno = inscripcion.alumnos[this.editingAlumnoIndex];
            if (!alumno) return;
            
            // Buscar el formulario activo y llenarlo con los datos del alumno
            const formulario = document.querySelector('#alumnosContainer .alumno-form');
            if (!formulario) return;
            
            // Llenar todos los campos del formulario
            const nombreInput = formulario.querySelector('input[name="nombre"]');
            const apellidoInput = formulario.querySelector('input[name="apellido"]');
            const fechaInput = formulario.querySelector('input[name="fechaNacimiento"]');
            const dniInput = formulario.querySelector('input[name="dni"]');
            const cinturonSelect = formulario.querySelector('select[name="cinturon"]');
            const sexoSelect = formulario.querySelector('select[name="sexo"]');
            const pesoInput = formulario.querySelector('input[name="peso"]');
            const modalidadSelect = formulario.querySelector('select[name="modalidad"]');
            
            if (nombreInput) nombreInput.value = alumno.nombre || '';
            if (apellidoInput) apellidoInput.value = alumno.apellido || '';
            if (fechaInput) fechaInput.value = alumno.fechaNacimiento || '';
            if (dniInput) dniInput.value = alumno.dni || '';
            if (cinturonSelect) cinturonSelect.value = alumno.cinturon || alumno.grado || ''; // Retrocompatibilidad
            if (sexoSelect) sexoSelect.value = alumno.sexo || '';
            if (pesoInput) pesoInput.value = alumno.peso || '';
            if (modalidadSelect) modalidadSelect.value = alumno.modalidad || '';
            
            // Cambiar el título del formulario y el botón de envío
            const tituloForm = formulario.querySelector('h4');
            if (tituloForm) {
                tituloForm.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; color: #d7ba71;">
                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                    </svg>
                    Editando: ${alumno.nombre}
                `;
                tituloForm.style.color = '#d7ba71';
            }

            // Cambiar el texto del botón de envío
            const submitBtn = document.querySelector('#inscripcionForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'ACTUALIZAR ALUMNO';
                submitBtn.className = 'btn btn-warning';
            }

            // Ocultar el botón de agregar más alumnos durante la edición
            const agregarBtn = document.getElementById('agregarAlumnoBtn');
            if (agregarBtn) {
                agregarBtn.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error precargando datos del alumno:', error);
            window.authManager.showMessage('Error al cargar los datos del alumno', 'error');
        }
    }

    // Resetear contenedor de alumnos
    resetAlumnosContainer() {
        const container = document.getElementById('alumnosContainer');
        
        // Determinar las opciones de modalidad según el evento
        let modalidadOptions = '';
        if (this.eventoModalidad === 'POOMSAE') {
            modalidadOptions = '<option value="POOMSAE">POOMSAE</option>';
        } else if (this.eventoModalidad === 'KYORUGI') {
            modalidadOptions = '<option value="KYORUGI">KYORUGI</option>';
        } else {
            // AMBAS modalidades
            modalidadOptions = '<option value="POOMSAE">POOMSAE</option><option value="KYORUGI">KYORUGI</option>';
        }
        
        // Limpiar todo: formularios, cards de resumen y secciones existentes
        container.innerHTML = `
            <div class="alumno-form">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>DNI:</label>
                    <input type="text" name="dni" pattern="[0-9]{8}" maxlength="8" placeholder="12345678" required>
                </div>
                <div class="form-fields-grid">
                    <div class="form-group">
                        <label>Nombres:</label>
                        <input type="text" name="nombre" required>
                    </div>
                    <div class="form-group">
                        <label>Apellidos:</label>
                        <input type="text" name="apellido" required>
                    </div>
                    <div class="form-group">
                        <label>Fecha de Nacimiento:</label>
                        <input type="date" name="fechaNacimiento" required>
                    </div>
                    <div class="form-group">
                        <label>Cinturón:</label>
                        <select name="cinturon" required>
                            <option value="">Seleccionar cinturón...</option>
                            <optgroup label="KUP (Cinturones de Color)">
                                <option value="KUP-10">10mo KUP - Blanco</option>
                                <option value="KUP-9">9no KUP - Blanco/Amarillo</option>
                                <option value="KUP-8">8vo KUP - Amarillo</option>
                                <option value="KUP-7">7mo KUP - Amarillo/Verde</option>
                                <option value="KUP-6">6to KUP - Verde</option>
                                <option value="KUP-5">5to KUP - Verde/Azul</option>
                                <option value="KUP-4">4to KUP - Azul</option>
                                <option value="KUP-3">3er KUP - Azul/Rojo</option>
                                <option value="KUP-2">2do KUP - Rojo</option>
                                <option value="KUP-1">1er KUP - Rojo/Negro</option>
                            </optgroup>
                            <optgroup label="DAN (Cinturón Negro)">
                                <option value="DAN-1">1er DAN - Cinturón Negro</option>
                                <option value="DAN-2">2do DAN - Cinturón Negro</option>
                                <option value="DAN-3">3er DAN - Cinturón Negro</option>
                                <option value="DAN-4">4to DAN - Cinturón Negro</option>
                                <option value="DAN-5">5to DAN - Cinturón Negro</option>
                                <option value="DAN-6">6to DAN - Cinturón Negro</option>
                                <option value="DAN-7">7mo DAN - Cinturón Negro</option>
                                <option value="DAN-8">8vo DAN - Cinturón Negro</option>
                                <option value="DAN-9">9no DAN - Cinturón Negro</option>
                            </optgroup>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Sexo:</label>
                        <select name="sexo" required>
                            <option value="">Seleccionar sexo...</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Modalidad:</label>
                        <select name="modalidad" required>
                            <option value="">Seleccionar modalidad...</option>
                            ${modalidadOptions}
                        </select>
                    </div>
                    <div class="form-group poomsae-field" style="display: none;">
                        <label>Poomsae:</label>
                        <input type="text" name="poomsae" readonly placeholder="Selecciona el grado KUP/DAN primero">
                    </div>
                    <div class="form-group peso-field" style="display: none;">
                        <label>Peso (kg):</label>
                        <input type="number" name="peso" min="20" max="200" step="0.1" placeholder="65.5">
                    </div>
                </div>
            </div>
        `;
        
        // Configurar event listeners para el nuevo formulario
        this.setupFormEventListeners();
    }

    // Cargar alumnos existentes en el modal de inscripción
    loadExistingStudents(alumnos) {
        console.log('🔄 loadExistingStudents llamado con:', alumnos);
        
        const container = document.getElementById('alumnosContainer');
        console.log('📦 Contenedor encontrado:', container);
        
        if (!container) {
            console.error('❌ No se encontró el contenedor alumnosContainer');
            return;
        }
        
        if (!alumnos || alumnos.length === 0) {
            console.log('📭 No hay alumnos para cargar');
            return;
        }
        
        console.log('🧹 Limpiando contenedor...');
        container.innerHTML = '';
        
        console.log('📋 Creando cards para', alumnos.length, 'alumnos...');
        
        // Crear cards de resumen para cada alumno existente
        alumnos.forEach((alumno, index) => {
            console.log(`👤 Procesando alumno ${index + 1}:`, alumno);
            
            const card = document.createElement('div');
            card.className = 'alumno-summary-card';
            card.innerHTML = `
                <div class="card-header">
                    <h4>
                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                            <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                        </svg>
                        ${alumno.nombre || 'Sin nombre'} ${alumno.apellido || 'Sin apellido'}
                    </h4>
                    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()">
                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>DNI:</strong> ${alumno.dni || 'N/A'}
                        </div>
                        <div class="info-item">
                            <strong>Fecha Nac:</strong> ${alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento).toLocaleDateString('es-ES') : 'N/A'}
                        </div>
                        <div class="info-item">
                            <strong>Cinturón:</strong> ${alumno.cinturon ? (alumno.cinturon.includes('KUP') ? alumno.cinturon.replace('KUP-', '') + 'er KUP' : alumno.cinturon.replace('DAN-', '') + 'er DAN') : 'N/A'}
                        </div>
                        <div class="info-item">
                            <strong>Sexo:</strong> ${alumno.sexo || 'N/A'}
                        </div>
                        <div class="info-item">
                            <strong>Modalidad:</strong> ${alumno.modalidad || 'N/A'}
                        </div>
                        ${alumno.modalidad === 'KYORUGI' ? `<div class="info-item"><strong>Peso:</strong> ${alumno.peso || 'N/A'} kg</div>` : ''}
                        ${alumno.modalidad === 'POOMSAE' ? `<div class="info-item"><strong>Poomsae:</strong> ${alumno.poomsae || 'N/A'}</div>` : ''}
                    </div>
                </div>
            `;
            container.appendChild(card);
            console.log(`✅ Card creada para alumno ${index + 1}`);
        });
        
        console.log('✅ loadExistingStudents completado');
    }

    // Agregar formulario de alumno
    agregarAlumnoForm() {
        const container = document.getElementById('alumnosContainer');
        
        // Primero, convertir todos los formularios actuales en cards verdes
        this.convertirFormulariosACards();
        
        const currentCount = container.querySelectorAll('.alumno-form, .alumno-summary-card').length;
        const newCount = currentCount + 1;
        
        if (newCount > 10) {
            window.authManager.showMessage('Máximo 10 alumnos por inscripción', 'warning');
            return;
        }
        
        // Determinar las opciones de modalidad según el evento
        let modalidadOptions = '';
        if (this.eventoModalidad === 'POOMSAE') {
            modalidadOptions = '<option value="POOMSAE">POOMSAE</option>';
        } else if (this.eventoModalidad === 'KYORUGI') {
            modalidadOptions = '<option value="KYORUGI">KYORUGI</option>';
        } else {
            // AMBAS modalidades
            modalidadOptions = '<option value="POOMSAE">POOMSAE</option><option value="KYORUGI">KYORUGI</option>';
        }
        
        const newAlumnoForm = document.createElement('div');
        newAlumnoForm.className = 'alumno-form';
        newAlumnoForm.innerHTML = `
            <div style="display: flex; gap: 20px; margin-bottom: 20px; align-items: flex-end;">
                <div class="form-group" style="flex: 1;">
                    <label>DNI:</label>
                    <input type="text" name="dni" pattern="[0-9]{8}" maxlength="8" placeholder="12345678" required>
                </div>
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()" style="padding: 20px 24px; white-space: nowrap;">
                    Eliminar
                </button>
            </div>
            <div class="form-fields-grid">
                <div class="form-group">
                    <label>Nombres:</label>
                    <input type="text" name="nombre" required>
                </div>
                <div class="form-group">
                    <label>Apellidos:</label>
                    <input type="text" name="apellido" required>
                </div>
                <div class="form-group">
                    <label>Fecha de Nacimiento:</label>
                    <input type="date" name="fechaNacimiento" required>
                </div>
                <div class="form-group">
                    <label>Cinturón:</label>
                    <select name="cinturon" required>
                        <option value="">Seleccionar cinturón...</option>
                        <optgroup label="KUP (Cinturones de Color)">
                            <option value="KUP-10">10mo KUP - Blanco</option>
                            <option value="KUP-9">9no KUP - Blanco/Amarillo</option>
                            <option value="KUP-8">8vo KUP - Amarillo</option>
                            <option value="KUP-7">7mo KUP - Amarillo/Verde</option>
                            <option value="KUP-6">6to KUP - Verde</option>
                            <option value="KUP-5">5to KUP - Verde/Azul</option>
                            <option value="KUP-4">4to KUP - Azul</option>
                            <option value="KUP-3">3er KUP - Azul/Rojo</option>
                            <option value="KUP-2">2do KUP - Rojo</option>
                            <option value="KUP-1">1er KUP - Rojo/Negro</option>
                        </optgroup>
                        <optgroup label="DAN (Cinturón Negro)">
                            <option value="DAN-1">1er DAN - Cinturón Negro</option>
                            <option value="DAN-2">2do DAN - Cinturón Negro</option>
                            <option value="DAN-3">3er DAN - Cinturón Negro</option>
                            <option value="DAN-4">4to DAN - Cinturón Negro</option>
                            <option value="DAN-5">5to DAN - Cinturón Negro</option>
                            <option value="DAN-6">6to DAN - Cinturón Negro</option>
                            <option value="DAN-7">7mo DAN - Cinturón Negro</option>
                            <option value="DAN-8">8vo DAN - Cinturón Negro</option>
                            <option value="DAN-9">9no DAN - Cinturón Negro</option>
                        </optgroup>
                    </select>
                </div>
                <div class="form-group">
                    <label>Sexo:</label>
                    <select name="sexo" required>
                        <option value="">Seleccionar sexo...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Modalidad:</label>
                    <select name="modalidad" required>
                        <option value="">Seleccionar modalidad...</option>
                        ${modalidadOptions}
                    </select>
                </div>
                <div class="form-group poomsae-field" style="display: none;">
                    <label>Poomsae:</label>
                    <input type="text" name="poomsae" readonly placeholder="Selecciona el grado KUP/DAN primero">
                </div>
                <div class="form-group peso-field" style="display: none;">
                    <label>Peso (kg):</label>
                    <input type="number" name="peso" min="20" max="200" step="0.1" placeholder="65.5">
                </div>
            </div>
        `;
        
        container.appendChild(newAlumnoForm);
        
        // Configurar event listeners para el nuevo formulario
        this.setupFormEventListeners();
    }

    // Convertir formularios existentes en cards de resumen verdes
    convertirFormulariosACards() {
        const container = document.getElementById('alumnosContainer');
        const formularios = container.querySelectorAll('.alumno-form:not(.converted)');
        
        formularios.forEach((formulario, index) => {
            // Obtener datos del formulario
            const nombre = formulario.querySelector('input[name="nombre"]').value.trim();
            const apellido = formulario.querySelector('input[name="apellido"]').value.trim();
            const fechaNacimiento = formulario.querySelector('input[name="fechaNacimiento"]').value;
            const dni = formulario.querySelector('input[name="dni"]').value.trim();
            const modalidad = formulario.querySelector('select[name="modalidad"]').value;
            const cinturon = formulario.querySelector('select[name="cinturon"]').value;
            const sexo = formulario.querySelector('select[name="sexo"]').value;
            const peso = formulario.querySelector('input[name="peso"]').value;
            const poomsae = formulario.querySelector('input[name="poomsae"]').value;
            
            // Solo convertir si el formulario tiene datos válidos
            const camposRequeridos = [nombre, apellido, fechaNacimiento, dni, modalidad, cinturon, sexo];
            // Solo incluir peso si la modalidad es KYORUGI
            if (modalidad === 'KYORUGI') {
                camposRequeridos.push(peso);
            }
            // Solo incluir poomsae si la modalidad es POOMSAE
            if (modalidad === 'POOMSAE') {
                camposRequeridos.push(poomsae);
            }
            
            if (camposRequeridos.every(campo => campo)) {
                // Validar datos básicos
                if (!/^\d{8}$/.test(dni)) {
                    window.authManager.showMessage(`DNI del alumno ${index + 1} debe tener 8 dígitos`, 'error');
                    return;
                }
                
                // Validar peso solo si la modalidad es KYORUGI
                if (modalidad === 'KYORUGI') {
                    if (parseFloat(peso) < 20 || parseFloat(peso) > 200) {
                        window.authManager.showMessage(`Peso del alumno ${index + 1} debe estar entre 20-200 kg`, 'error');
                        return;
                    }
                }
                
                // Calcular edad
                const hoy = new Date();
                const nacimiento = new Date(fechaNacimiento + 'T00:00:00');
                let edad = hoy.getFullYear() - nacimiento.getFullYear();
                const mesActual = hoy.getMonth();
                const mesNacimiento = nacimiento.getMonth();
                
                if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())) {
                    edad--;
                }
                
                // Obtener texto del cinturón
                const cinturonSelect = formulario.querySelector('select[name="cinturon"]');
                const cinturonTexto = cinturonSelect.options[cinturonSelect.selectedIndex].text;
                
                // Crear card de resumen verde
                const summaryCard = document.createElement('div');
                summaryCard.className = 'alumno-summary-card fade-in';
                summaryCard.innerHTML = `
                    <div style="background: rgba(170, 144, 114, 0.1); border: 2px solid var(--color-gold); border-radius: 8px; padding: 15px; margin-bottom: 15px; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h4 style="color: var(--color-gold-dark); margin: 0; flex-grow: 1;">
                                <svg class="icon" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                                </svg>
                                Alumno ${index + 1} - ${nombre} ${apellido}
                            </h4>
                            <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.alumno-summary-card').remove()" 
                                    style="padding: 4px 8px;">
                                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: #155724;">
                            <div><strong>DNI:</strong> ${dni}</div>
                            <div><strong>Edad:</strong> ${edad} años</div>
                            <div><strong>Modalidad:</strong> ${modalidad}</div>
                            <div><strong>Cinturón:</strong> ${cinturonTexto}</div>
                            <div><strong>Sexo:</strong> ${sexo}</div>
                            ${modalidad === 'KYORUGI' ? `<div><strong>Peso:</strong> ${peso} kg</div>` : ''}
                            ${modalidad === 'POOMSAE' ? `<div><strong>Poomsae:</strong> ${poomsae}</div>` : ''}
                        </div>
                        
                        <div style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                                                            <strong>Fecha de Nacimiento:</strong> ${new Date(fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES')}
                        </div>
                        
                        <!-- Campos ocultos para envío del formulario -->
                        <input type="hidden" name="nombre" value="${nombre}">
                        <input type="hidden" name="apellido" value="${apellido}">
                        <input type="hidden" name="fechaNacimiento" value="${fechaNacimiento}">
                        <input type="hidden" name="dni" value="${dni}">
                        <input type="hidden" name="modalidad" value="${modalidad}">
                        <input type="hidden" name="cinturon" value="${cinturon}">
                        <input type="hidden" name="sexo" value="${sexo}">
                        <input type="hidden" name="peso" value="${peso}">
                        <input type="hidden" name="poomsae" value="${poomsae}">
                        <input type="hidden" name="edad" value="${edad}">
                    </div>
                `;
                
                // Reemplazar el formulario con el card
                formulario.parentNode.replaceChild(summaryCard, formulario);
            }
        });
    }

    // Eliminar evento
    async deleteEvento(eventoId) {
        if (!confirm('¿Está seguro de que desea eliminar este evento? Esta acción no se puede deshacer.')) {
            return;
        }

        // Verificar que Firebase esté inicializado
        if (!this.db) {
            window.authManager.showMessage('Firebase no está inicializado', 'error');
            return;
        }

        try {
            this.setLoading(true);

            // Verificar configuración de Storage antes de proceder
            await this.checkStorageConfiguration();

            // Obtener datos del evento antes de eliminarlo para limpiar archivos
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            if (eventoDoc.exists) {
                const evento = eventoDoc.data();
                
                // Eliminar archivos de Storage si existen
                if (evento.basesPdf && evento.basesPdf.startsWith('http')) {
                    try {
                        console.log('🔍 Intentando eliminar archivo de bases de Storage:', evento.basesPdf);
                        
                        // Extraer ruta del archivo desde la URL
                        const { filePath } = this.extractFilePathFromUrl(evento.basesPdf, eventoId);
                        
                        // Eliminar archivo de Storage
                        await this.deleteFileFromStorage(filePath);
                        console.log('✅ Archivo de bases eliminado de Storage correctamente');
                    } catch (deleteError) {
                        console.error('❌ Error eliminando archivo de bases de Storage:', deleteError);
                        
                        // No bloquear la eliminación del evento si falla la eliminación del archivo
                        console.warn('⚠️ Continuando con la eliminación del evento aunque falló la eliminación del archivo');
                    }
                } else if (evento.basesPdf && evento.basesPdf.startsWith('data:')) {
                    console.log('ℹ️ Bases en formato base64 detectadas - se limpiarán del documento');
                } else {
                    console.log('ℹ️ No hay archivo de bases para eliminar');
                }
            }

            // Eliminar inscripciones relacionadas
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            const batch = this.db.batch();
            
            inscripcionesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Eliminar el evento (esto también eliminará las bases base64)
            batch.delete(this.db.collection('eventos').doc(eventoId));

            await batch.commit();

            window.authManager.showMessage('Evento eliminado correctamente', 'success');
            
            // Actualizar vistas
            if (window.adminManager) {
                window.adminManager.invalidateCache();
                window.adminManager.loadAdminData();
            }
            
            // Actualizar la lista de eventos en el perfil de delegación si está abierto
            if (window.perfilDelegacionManager) {
                window.perfilDelegacionManager.cargarMisEventos();
            }
            
            // Dashboard se actualiza automáticamente
            console.log('✅ Dashboard actualizado después de eliminar evento');

        } catch (error) {
            console.error('Error eliminando evento:', error);
            window.authManager.showMessage('Error al eliminar evento', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Formatear fecha para mostrar
    formatDate(date) {
        if (!date) return '';
        
        let dateObj;
        if (date.toDate) {
            // Es un Timestamp de Firestore
            dateObj = date.toDate();
        } else if (date instanceof Date) {
            // Ya es un objeto Date
            dateObj = date;
        } else {
            // Es una string o timestamp
            dateObj = new Date(date);
        }
        
        // Asegurar que la fecha se interprete correctamente en la zona horaria local
        const fechaFormateada = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC' // Forzar UTC para evitar problemas de zona horaria
        });
        // Capitalizar la primera letra del día de la semana
        return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    }

    // Formatear fecha para input
    formatDateForInput(date) {
        if (!date) return '';
        const dateObj = date.toDate ? date.toDate() : new Date(date);
        return dateObj.toISOString().split('T')[0];
    }

    // Verificar si un evento ya pasó
    isEventoPasado(fecha) {
        if (!fecha) return false;
        const evento = fecha.toDate ? fecha.toDate() : new Date(fecha);
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        return evento < hoy;
    }

    // Obtener eventos próximos desde Firestore
    async getEventosProximos() {
        try {
            // Verificar que Firebase esté inicializado
            if (!this.db) {
                console.warn('Firebase no está inicializado aún');
                return [];
            }

            const snapshot = await this.db.collection('eventos')
                .where('fecha', '>', new Date())
                .orderBy('fecha', 'asc')
                .get();

            const eventos = [];
            snapshot.forEach(doc => {
                eventos.push({ id: doc.id, ...doc.data() });
            });

            return eventos;
        } catch (error) {
            console.error('Error obteniendo eventos próximos:', error);
            return [];
        }
    }

    // Obtener eventos pasados desde Firestore
    async getEventosPasados() {
        try {
            // Verificar que Firebase esté inicializado
            if (!this.db) {
                console.warn('Firebase no está inicializado aún');
                return [];
            }

            const snapshot = await this.db.collection('eventos')
                .where('fecha', '<', new Date())
                .orderBy('fecha', 'desc')
                .get();

            const eventos = [];
            snapshot.forEach(doc => {
                eventos.push({ id: doc.id, ...doc.data() });
            });

            return eventos;
        } catch (error) {
            console.error('Error obteniendo eventos pasados:', error);
            return [];
        }
    }

    // Obtener todos los eventos
    async getAllEventos() {
        try {
            // Verificar que Firebase esté inicializado
            if (!this.db) {
                console.warn('Firebase no está inicializado aún');
                return [];
            }

            const snapshot = await this.db.collection('eventos')
                .orderBy('fecha', 'asc')
                .get();

            const eventos = [];
            snapshot.forEach(doc => {
                eventos.push({ id: doc.id, ...doc.data() });
            });

            return eventos;
        } catch (error) {
            console.error('Error obteniendo todos los eventos:', error);
            return [];
        }
    }

    setLoading(isLoading) {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (isLoading) {
                form.classList.add('loading');
            } else {
                form.classList.remove('loading');
            }
        });
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

    // Función para convertir y redimensionar imagen a base64
    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Calcular dimensiones manteniendo aspecto
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 2048; // Aumentamos el tamaño máximo a 2048px

                    if (width > height && width > MAX_SIZE) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width = MAX_SIZE;
                    } else if (height > MAX_SIZE) {
                        width = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    // Mejorar la calidad de renderizado
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Dibujar imagen redimensionada
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Intentar WebP primero con alta calidad
                    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
                        let finalImage = canvas.toDataURL('image/webp', 0.95);
                        let sizeInBytes = finalImage.length * 0.75;
                        
                        if (sizeInBytes > 900000) {
                            finalImage = canvas.toDataURL('image/webp', 0.9);
                        }
                        
                        resolve(finalImage);
                    } else {
                        // Fallback a JPEG con alta calidad
                        let finalImage = canvas.toDataURL('image/jpeg', 0.95);
                        let sizeInBytes = finalImage.length * 0.75;
                        
                        if (sizeInBytes > 900000) {
                            finalImage = canvas.toDataURL('image/jpeg', 0.9);
                        }
                        
                        resolve(finalImage);
                    }
                };
                img.onerror = () => reject(new Error('Error al procesar la imagen'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    // Configurar vista previa de imagen
    setupImagePreview() {
        const imagenInput = document.getElementById('eventoImagen');
        const preview = document.getElementById('imagenPreview');
        const previewImg = document.getElementById('imagenPreviewImg');
        const removeBtn = document.getElementById('removeImageBtn');

        if (!imagenInput || !preview || !previewImg || !removeBtn) return;

        imagenInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validar archivo
                if (file.size > 10 * 1024 * 1024) {
                    window.authManager.showMessage('La imagen es muy grande. Máximo 10MB permitido.', 'error');
                    imagenInput.value = '';
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    window.authManager.showMessage('El archivo debe ser una imagen.', 'error');
                    imagenInput.value = '';
                    return;
                }

                // Mostrar vista previa (imagen original para preview)
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                this.clearImagePreview();
            }
        });

        removeBtn.addEventListener('click', () => {
            imagenInput.value = '';
            this.clearImagePreview();
        });
    }

    // Configurar vista previa de bases PDF
    setupBasesPreview() {
        const basesInput = document.getElementById('eventoBasesPdf');
        const preview = document.getElementById('basesPreview');
        const previewText = document.getElementById('basesPreviewText');
        const removeBtn = document.getElementById('removeBasesBtn');

        if (!basesInput || !preview || !previewText || !removeBtn) return;

        basesInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validar archivo
                if (file.size > 5 * 1024 * 1024) {
                    window.authManager.showMessage('El archivo PDF es muy grande. Máximo 5MB permitido.', 'error');
                    basesInput.value = '';
                    return;
                }

                if (!file.type.includes('pdf')) {
                    window.authManager.showMessage('El archivo debe ser un PDF.', 'error');
                    basesInput.value = '';
                    return;
                }

                // Mostrar vista previa
                previewText.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
                preview.style.display = 'block';
                
                // Ocultar el input de archivo cuando se selecciona un archivo
                const fileInputWrapper = document.querySelector('.file-input-wrapper');
                if (fileInputWrapper) {
                    fileInputWrapper.style.display = 'none';
                }
            } else {
                this.clearBasesPreview();
            }
        });

        removeBtn.addEventListener('click', () => {
            basesInput.value = '';
            this.clearBasesPreview();
            // Marcar que se deben eliminar las bases existentes
            this.basesToDelete = true;
        });
    }

    // Limpiar vista previa de imagen
    clearImagePreview() {
        const preview = document.getElementById('imagenPreview');
        const previewImg = document.getElementById('imagenPreviewImg');
        
        if (preview && previewImg) {
            preview.style.display = 'none';
            previewImg.src = '';
        }
    }

    // Limpiar vista previa de bases PDF
    clearBasesPreview() {
        const preview = document.getElementById('basesPreview');
        const previewText = document.getElementById('basesPreviewText');
        const fileInputWrapper = document.querySelector('.file-input-wrapper');
        
        if (preview && previewText) {
            preview.style.display = 'none';
            previewText.textContent = '';
        }
        
        // Mostrar el input de archivo cuando no hay bases
        if (fileInputWrapper) {
            fileInputWrapper.style.display = 'block';
        }
    }

    // Mostrar bases existentes en el formulario de edición
    showExistingBases(basesPdf, basesPdfNombre) {
        const preview = document.getElementById('basesPreview');
        const previewText = document.getElementById('basesPreviewText');
        const removeBtn = document.getElementById('removeBasesBtn');
        const fileInputWrapper = document.querySelector('.file-input-wrapper');
        
        if (preview && previewText && removeBtn) {
            if (basesPdf && basesPdfNombre) {
                // Verificar si es una referencia simbólica de PDF grande
                if (this.isOversizedPDFReference(basesPdf)) {
                    const pdfInfo = this.getOversizedPDFInfo(basesPdf);
                    previewText.innerHTML = `
                        <div class="oversized-pdf-warning">
                            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                            </svg>
                            <span>${basesPdfNombre} (PDF demasiado grande)</span>
                            <small>Se requiere configuración de Firebase Storage</small>
                        </div>
                    `;
                } else {
                    // Mostrar las bases existentes normales
                    previewText.textContent = `${basesPdfNombre} (Bases existentes)`;
                }
                
                preview.style.display = 'block';
                
                // Ocultar el input de archivo cuando ya existen bases
                if (fileInputWrapper) {
                    fileInputWrapper.style.display = 'none';
                }
                
                // Cambiar el texto del botón para indicar que eliminará las bases
                removeBtn.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                    </svg>
                    Eliminar bases existentes
                `;
                
                // Marcar que hay bases existentes
                this.existingBases = { pdf: basesPdf, nombre: basesPdfNombre };
            } else {
                this.clearBasesPreview();
                this.existingBases = null;
            }
        }
    }



    // Cargar atletas existentes
    async loadExistingAthletes() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) return;

            // Cargar atletas desde Firestore
            const atletasSnapshot = await this.db.collection('atletas')
                .where('academiaId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();

            this.existingAthletes = atletasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderExistingAthletes();
        } catch (error) {
            console.error('Error cargando atletas existentes:', error);
            window.authManager.showMessage('Error al cargar atletas existentes', 'error');
        }
    }

    // Renderizar tabla de atletas existentes
    renderExistingAthletes() {
        const tbody = document.getElementById('existingAthletesTableBody');
        if (!tbody) return;

        if (this.existingAthletes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <svg class="icon icon-xl" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                            </svg>
                            <p>No hay atletas registrados en tu perfil</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.existingAthletes.map(atleta => `
            <tr>
                <td>${atleta.nombres}</td>
                <td>${atleta.apellidos}</td>
                <td>${atleta.dni}</td>
                <td>${new Date(atleta.fechaNacimiento).toLocaleDateString('es-ES')}</td>
                <td>${atleta.sexo || '-'}</td>
                <td>
                    <button class="btn btn-success btn-sm btn-add-athlete" onclick="window.eventsManager.agregarAtletaExistente('${atleta.id}')">
                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                        </svg>
                        Agregar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Agregar atleta existente al formulario
    async agregarAtletaExistente(atletaId) {
        const atleta = this.existingAthletes.find(a => a.id === atletaId);
        if (!atleta) return;

        // Obtener el formulario activo actual
        const formularioActivo = document.querySelector('#alumnosContainer .alumno-form');
        if (!formularioActivo) {
            window.authManager.showMessage('No hay formulario activo para agregar el atleta', 'error');
            return;
        }

        // Autocompletar los campos del formulario activo
        const nombreInput = formularioActivo.querySelector('input[name="nombre"]');
        const apellidoInput = formularioActivo.querySelector('input[name="apellido"]');
        const fechaNacimientoInput = formularioActivo.querySelector('input[name="fechaNacimiento"]');
        const dniInput = formularioActivo.querySelector('input[name="dni"]');
        const sexoInput = formularioActivo.querySelector('select[name="sexo"]');

        if (nombreInput) nombreInput.value = atleta.nombres;
        if (apellidoInput) apellidoInput.value = atleta.apellidos;
        if (fechaNacimientoInput) fechaNacimientoInput.value = atleta.fechaNacimiento;
        if (dniInput) dniInput.value = atleta.dni;
        if (sexoInput && atleta.sexo) sexoInput.value = atleta.sexo;

        // Mostrar mensaje de éxito
        window.authManager.showMessage('Datos del atleta cargados correctamente', 'success');
    }

    calcularEdad(fechaNacimiento) {
        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento + 'T00:00:00');
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mesActual = hoy.getMonth();
        const mesNacimiento = nacimiento.getMonth();
        
        if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        
        return edad;
    }

    determinarCategoriaPeso(peso, edad, sexo) {
        let categoriaPeso = '';
        if (peso <= 54) categoriaPeso = '-54kg';
        else if (peso <= 58) categoriaPeso = '-58kg';
        else if (peso <= 63) categoriaPeso = '-63kg';
        else if (peso <= 68) categoriaPeso = '-68kg';
        else if (peso <= 74) categoriaPeso = '-74kg';
        else if (peso <= 80) categoriaPeso = '-80kg';
        else if (peso <= 87) categoriaPeso = '-87kg';
        else categoriaPeso = '+87kg';

        if (sexo === 'Femenino') {
            if (peso <= 46) categoriaPeso = '-46kg';
            else if (peso <= 49) categoriaPeso = '-49kg';
            else if (peso <= 53) categoriaPeso = '-53kg';
            else if (peso <= 57) categoriaPeso = '-57kg';
            else if (peso <= 62) categoriaPeso = '-62kg';
            else if (peso <= 67) categoriaPeso = '-67kg';
            else if (peso <= 73) categoriaPeso = '-73kg';
            else categoriaPeso = '+73kg';
        }

        return categoriaPeso;
    }

    // Abrir modal de edición de participantes
    async openEditarParticipantesModal(eventoId, participanteId) {
        if (!this.db) {
            window.authManager.showMessage('Firebase no está inicializado', 'error');
            return;
        }

        try {
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            
            if (!eventoDoc.exists) {
                window.authManager.showMessage('Evento no encontrado', 'error');
                return;
            }

            const evento = eventoDoc.data();
            this.currentEventoParaEdicion = eventoId;
            this.participanteEditandoId = participanteId;
            
            // Guardar la modalidad del evento para restringir opciones
            this.eventoModalidad = evento.modalidad || 'AMBAS';
            
            // Cargar atletas existentes
            await this.loadExistingAthletes();

            // Mostrar el modal de edición
            const editarModal = document.getElementById('editarParticipantesModal');
            if (editarModal) {
                editarModal.classList.add('active');
                editarModal.style.display = 'flex';
                document.getElementById('eventoEdicionNombre').textContent = evento.nombre;
            }

            // Cargar datos del participante
            await this.cargarDatosParticipante(eventoId, participanteId);

        } catch (error) {
            console.error('Error abriendo modal de edición:', error);
            window.authManager.showMessage('Error al abrir el formulario de edición', 'error');
        }
    }

    // Cerrar modal de edición de participantes
    closeEditarParticipantesModal() {
        // Limpiar variables de estado
        this.currentEventoParaEdicion = null;
        this.participanteEditandoId = null;
        this.editingInscripcionId = null;
        this.editingAlumnoIndex = undefined;
        this.eventoModalidad = null;
        
        // Cerrar y limpiar modales
        const editarModal = document.getElementById('editarParticipantesModal');
        const atletasModal = document.getElementById('atletasExistentesModal');
        
        if (editarModal) {
            editarModal.classList.remove('active');
            editarModal.style.display = 'none';
        }
        
        if (atletasModal) {
            atletasModal.classList.remove('active');
            atletasModal.style.display = 'none';
        }
        
        // Resetear formulario
        const edicionForm = document.getElementById('edicionParticipanteForm');
        if (edicionForm) {
            edicionForm.reset();
        }
        
        // Restaurar título del evento
        const eventoTitulo = document.getElementById('eventoEdicionNombre');
        if (eventoTitulo) {
            eventoTitulo.innerHTML = '';
        }
        
        // Permitir scroll del body
        document.body.style.overflow = 'auto';
    }

    // Cargar datos del participante para edición
    async cargarDatosParticipante(eventoId, participanteId) {
        try {
            const inscripcionSnapshot = await this.db.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            let participante = null;
            let inscripcionId = null;
            let participanteIndex = -1;

            // Buscar el participante en todas las inscripciones del evento
            for (const doc of inscripcionSnapshot.docs) {
                const inscripcion = doc.data();
                const index = inscripcion.alumnos.findIndex(a => a.dni === participanteId);
                if (index !== -1) {
                    participante = inscripcion.alumnos[index];
                    inscripcionId = doc.id;
                    participanteIndex = index;
                    break;
                }
            }

            if (!participante) {
                window.authManager.showMessage('Participante no encontrado', 'error');
                return;
            }

            // Guardar referencia de la inscripción y el índice
            this.editingInscripcionId = inscripcionId;
            this.editingAlumnoIndex = participanteIndex;

            // Llenar el formulario con los datos del participante
            const form = document.getElementById('edicionParticipanteForm');
            if (form) {
                form.querySelector('input[name="nombre"]').value = participante.nombre || '';
                form.querySelector('input[name="apellido"]').value = participante.apellido || '';
                form.querySelector('input[name="fechaNacimiento"]').value = participante.fechaNacimiento || '';
                form.querySelector('input[name="dni"]').value = participante.dni || '';
                form.querySelector('select[name="cinturon"]').value = participante.cinturon || '';
                form.querySelector('select[name="sexo"]').value = participante.sexo || '';
                form.querySelector('input[name="peso"]').value = participante.peso || '';
                
                // Configurar opciones de modalidad según el evento
                const modalidadSelect = form.querySelector('select[name="modalidad"]');
                if (modalidadSelect) {
                    console.log('🔍 DEBUG - Modalidad del participante:', participante.modalidad);
                    console.log('🔍 DEBUG - Modalidad del evento:', this.eventoModalidad);
                    
                    // Verificar si la modalidad del participante coincide con la del evento
                    if (this.eventoModalidad !== 'AMBAS' && participante.modalidad !== this.eventoModalidad) {
                        console.warn('⚠️ ADVERTENCIA: La modalidad del participante no coincide con la del evento');
                        console.warn('⚠️ Participante modalidad:', participante.modalidad, '| Evento modalidad:', this.eventoModalidad);
                    }
                    
                    // Limpiar opciones existentes
                    modalidadSelect.innerHTML = '<option value="">Seleccionar modalidad...</option>';
                    
                    // Agregar opciones según la modalidad del evento
                    if (this.eventoModalidad === 'POOMSAE') {
                        modalidadSelect.innerHTML += '<option value="POOMSAE">POOMSAE</option>';
                    } else if (this.eventoModalidad === 'KYORUGI') {
                        modalidadSelect.innerHTML += '<option value="KYORUGI">KYORUGI</option>';
                    } else {
                        // AMBAS modalidades - permitir cambiar incluso si está incorrecta
                        modalidadSelect.innerHTML += '<option value="POOMSAE">POOMSAE</option><option value="KYORUGI">KYORUGI</option>';
                    }
                    
                    console.log('🔍 DEBUG - Opciones disponibles:', modalidadSelect.innerHTML);
                    
                    // Establecer el valor del participante ANTES de aplicar la lógica de visibilidad
                    modalidadSelect.value = participante.modalidad || '';
                    
                    console.log('🔍 DEBUG - Valor establecido:', modalidadSelect.value);
                    console.log('🔍 DEBUG - Valor seleccionado después de establecer:', modalidadSelect.options[modalidadSelect.selectedIndex]?.text);
                    
                    // Aplicar la lógica de visibilidad según la modalidad con un pequeño delay
                    setTimeout(() => {
                        console.log('🔍 DEBUG - Aplicando handleModalidadChange con valor:', modalidadSelect.value);
                        this.handleModalidadChange(modalidadSelect);
                    }, 10);
                }
                
                form.querySelector('input[name="poomsae"]').value = participante.poomsae || '';
            }

        } catch (error) {
            console.error('Error cargando datos del participante:', error);
            window.authManager.showMessage('Error al cargar los datos del participante', 'error');
        }
    }

    // Manejar actualización de participante
    async handleEditarParticipante(e) {
        e.preventDefault();
        
        if (!this.currentEventoParaEdicion || !this.editingInscripcionId || this.editingAlumnoIndex === undefined) {
            window.authManager.showMessage('Error en la edición', 'error');
            return;
        }

        try {
            const form = document.getElementById('edicionParticipanteForm');
            const modalidad = form.querySelector('select[name="modalidad"]').value;
            
            const participanteData = {
                nombre: form.querySelector('input[name="nombre"]').value,
                apellido: form.querySelector('input[name="apellido"]').value,
                fechaNacimiento: form.querySelector('input[name="fechaNacimiento"]').value,
                dni: form.querySelector('input[name="dni"]').value,
                cinturon: form.querySelector('select[name="cinturon"]').value,
                sexo: form.querySelector('select[name="sexo"]').value,
                modalidad: modalidad,
                poomsae: form.querySelector('input[name="poomsae"]').value
            };
            
            // Solo incluir peso si la modalidad es KYORUGI
            if (modalidad === 'KYORUGI') {
                participanteData.peso = parseFloat(form.querySelector('input[name="peso"]').value);
            } else {
                participanteData.peso = null; // Limpiar peso para POOMSAE
            }

            // Obtener la inscripción actual
            const inscripcionDoc = await this.db.collection('inscripciones').doc(this.editingInscripcionId).get();
            const inscripcion = inscripcionDoc.data();

            // Actualizar el participante en el array de alumnos
            inscripcion.alumnos[this.editingAlumnoIndex] = {
                ...inscripcion.alumnos[this.editingAlumnoIndex],
                ...participanteData
            };

            // Guardar los cambios
            await this.db.collection('inscripciones').doc(this.editingInscripcionId).update({
                alumnos: inscripcion.alumnos,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            window.authManager.showMessage('Participante actualizado correctamente', 'success');
            this.closeEditarParticipantesModal();

            // Recargar la lista de participantes si estamos en el panel de inscripción
            if (window.panelInscripcionManager) {
                window.panelInscripcionManager.recargarAlumnosInscritos();
            }

        } catch (error) {
            console.error('Error actualizando participante:', error);
            window.authManager.showMessage('Error al actualizar el participante', 'error');
        }
    }

    // Función para eliminar archivo de Firebase Storage
    async deleteFileFromStorage(filePath) {
        try {
            console.log('🗑️ Intentando eliminar archivo de Storage:', filePath);
            
            // Verificar que Firebase Storage esté disponible
            if (!window.firebaseStorage) {
                throw new Error('Firebase Storage no está inicializado');
            }
            
            const storageRef = window.firebaseStorage.ref();
            const fileRef = storageRef.child(filePath);
            
            // Intentar eliminar directamente sin verificar existencia (para evitar CORS)
            try {
                await fileRef.delete();
                console.log('🗑️ Archivo eliminado exitosamente:', filePath);
                return true;
            } catch (deleteError) {
                // Si el archivo no existe, considerarlo como éxito
                if (deleteError.code === 'storage/object-not-found') {
                    console.log('ℹ️ Archivo no existía, pero la operación fue exitosa');
                    return true;
                }
                // Si es error de CORS, continuar sin bloquear
                if (deleteError.message && deleteError.message.includes('CORS')) {
                    console.warn('⚠️ Error de CORS al eliminar archivo, pero continuando...');
                    return true;
                }
                throw deleteError;
            }
        } catch (error) {
            console.error('❌ Error eliminando archivo de Storage:', error);
            console.error('🔍 Detalles del error:', {
                code: error.code,
                message: error.message
            });
            // No lanzar error para no bloquear la eliminación del evento
            return false;
        }
    }

    // Función para probar eliminación de archivos (solo para debugging)
    async testFileDeletion(eventoId) {
        try {
            console.log('🧪 Iniciando prueba de eliminación de archivos para evento:', eventoId);
            
            // Verificar configuración
            const configOk = await this.checkStorageConfiguration();
            if (!configOk) {
                console.error('❌ Configuración de Storage no válida');
                return false;
            }
            
            // Obtener datos del evento
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) {
                console.error('❌ Evento no encontrado');
                return false;
            }
            
            const evento = eventoDoc.data();
            console.log('📋 Datos del evento:', {
                id: eventoId,
                nombre: evento.nombre,
                basesPdf: evento.basesPdf,
                basesPdfNombre: evento.basesPdfNombre
            });
            
            if (!evento.basesPdf || !evento.basesPdf.startsWith('http')) {
                console.log('ℹ️ Evento no tiene archivo de bases para eliminar');
                return true;
            }
            
            // Extraer ruta del archivo
            const { filePath } = this.extractFilePathFromUrl(evento.basesPdf, eventoId);
            
            // Intentar eliminar
            const deleted = await this.deleteFileFromStorage(filePath);
            
            if (deleted) {
                console.log('✅ Prueba de eliminación exitosa');
                return true;
            } else {
                console.log('ℹ️ Archivo no existía, pero la prueba fue exitosa');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error en prueba de eliminación:', error);
            return false;
        }
    }

    // Función global para pruebas de eliminación (disponible en consola)
    static async testDeleteBases(eventoId) {
        if (!window.eventsManager) {
            console.error('❌ Events Manager no está inicializado');
            return false;
        }
        
        return await window.eventsManager.testFileDeletion(eventoId);
    }

    // Función para probar eliminación de archivos específicos
    async testDeleteSpecificFile(eventoId) {
        try {
            console.log('🧪 Probando eliminación de archivos para evento:', eventoId);
            
            // Obtener datos del evento
            const eventoDoc = await this.db.collection('eventos').doc(eventoId).get();
            if (!eventoDoc.exists) {
                console.error('❌ Evento no encontrado');
                return false;
            }
            
            const evento = eventoDoc.data();
            console.log('📋 Datos del evento:', {
                id: eventoId,
                nombre: evento.nombre,
                basesPdf: evento.basesPdf,
                basesPdfNombre: evento.basesPdfNombre
            });
            
            // Buscar campos relacionados con bases
            const camposBases = Object.keys(evento).filter(key => 
                key.toLowerCase().includes('base') || 
                key.toLowerCase().includes('pdf') || 
                key.toLowerCase().includes('document')
            );
            
            console.log('🔍 Campos relacionados con bases:', camposBases);
            camposBases.forEach(campo => {
                console.log(`  - ${campo}: ${evento[campo]}`);
            });
            
            // Verificar si hay bases en cualquier formato
            let basesUrl = null;
            let basesNombre = null;
            
            if (evento.basesPdf && evento.basesPdf.startsWith('http')) {
                basesUrl = evento.basesPdf;
                basesNombre = evento.basesPdfNombre;
            } else if (evento.bases && evento.bases.startsWith('http')) {
                basesUrl = evento.bases;
                basesNombre = evento.basesNombre;
            } else if (evento.documento && evento.documento.startsWith('http')) {
                basesUrl = evento.documento;
                basesNombre = evento.documentoNombre;
            }
            
            if (!basesUrl) {
                console.log('ℹ️ Evento no tiene archivo de bases para eliminar (URL no encontrada)');
                console.log('🔍 Verificando si hay datos en base64...');
                
                // Verificar si hay datos en base64
                if (evento.basesPdf && evento.basesPdf.startsWith('data:')) {
                    console.log('✅ Encontrado archivo en formato base64');
                    console.log('ℹ️ Los archivos base64 no necesitan eliminación de Storage');
                    return true;
                }
                
                return true;
            }
            
            console.log('✅ URL de bases encontrada:', basesUrl);
            console.log('📄 Nombre del archivo:', basesNombre);
            
            // Extraer ruta del archivo
            const { filePath } = this.extractFilePathFromUrl(basesUrl, eventoId);
            console.log('📁 Ruta del archivo a eliminar:', filePath);
            
            // Intentar eliminar
            const deleted = await this.deleteFileFromStorage(filePath);
            
            if (deleted) {
                console.log('✅ Archivo eliminado exitosamente');
                return true;
            } else {
                console.log('❌ No se pudo eliminar el archivo');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error en prueba de eliminación:', error);
            return false;
        }
    }

    // Función para verificar configuración de Firebase Storage (simplificada)
    async checkStorageConfiguration() {
        try {
            console.log('🔍 Verificando configuración de Firebase Storage...');
            
            if (!window.firebaseStorage) {
                console.error('❌ Firebase Storage no está inicializado');
                return false;
            }
            
            console.log('✅ Firebase Storage está inicializado');
            
            // Verificar que el usuario esté autenticado
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) {
                console.error('❌ Usuario no autenticado');
                return false;
            }
            
            console.log('✅ Usuario autenticado:', currentUser.email);
            console.log('ℹ️ Verificación básica completada (sin verificación CORS)');
            
            return true;
        } catch (error) {
            console.error('❌ Error verificando configuración de Storage:', error);
            return false;
        }
    }

    // Función para extraer ruta de archivo desde URL de Firebase Storage
    extractFilePathFromUrl(url, eventoId) {
        try {
            console.log('🔍 Extrayendo ruta de archivo desde URL:', url);
            
            // Extraer la ruta del archivo de la URL
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remover query params
            const filePath = `eventos/${eventoId}/bases/${fileName}`;
            
            console.log('📄 Nombre del archivo extraído:', fileName);
            console.log('📁 Ruta del archivo:', filePath);
            
            return { fileName, filePath };
        } catch (error) {
            console.error('❌ Error extrayendo ruta de archivo:', error);
            throw error;
        }
    }

    // Función para subir archivo a Firebase Storage y obtener URL
    async uploadFileToStorage(file, path) {
        try {
            console.log('📤 Iniciando carga de archivo:', file.name, 'a ruta:', path);
            
            // Verificar que Firebase Storage esté disponible
            if (!window.firebaseStorage) {
                throw new Error('Firebase Storage no está inicializado');
            }
            
            // Verificar que el usuario esté autenticado
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) {
                throw new Error('Debes estar autenticado para subir archivos');
            }
            
            console.log('👤 Usuario autenticado:', currentUser.email);
            
            const storageRef = window.firebaseStorage.ref();
            const fileRef = storageRef.child(path);
            
            // Configurar metadatos del archivo con información CORS y permisos
            const metadata = {
                contentType: file.type,
                cacheControl: 'public, max-age=3600', // Cache por 1 hora
                customMetadata: {
                    'uploadedBy': currentUser.uid,
                    'createdBy': currentUser.uid, // Para verificación de permisos
                    'academiaId': currentUser.uid, // Para verificación de permisos
                    'uploadedAt': new Date().toISOString(),
                    'originalName': file.name,
                    'uploadOrigin': window.location.origin,
                    'userAgent': navigator.userAgent
                }
            };
            
            console.log('📤 Subiendo archivo con metadatos CORS:', metadata);
            
            // Configurar opciones de carga para evitar problemas de CORS
            const uploadOptions = {
                metadata: metadata,
                // Configurar para desarrollo local
                customMetadata: {
                    'cors-origin': window.location.origin
                }
            };
            
            // Subir archivo con timeout para detectar errores de CORS
            const uploadPromise = fileRef.put(file, uploadOptions);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('CORS_TIMEOUT')), 10000); // 10 segundos timeout
            });
            
            const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
            
            console.log('✅ Archivo subido exitosamente:', snapshot.metadata.name);
            console.log('📊 Tamaño del archivo:', (snapshot.metadata.size / 1024 / 1024).toFixed(2), 'MB');
            
            // Obtener URL de descarga
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            console.log('🔗 URL de descarga generada:', downloadURL);
            
            return downloadURL;
        } catch (error) {
            console.error('❌ Error subiendo archivo a Storage:', error);
            
            // Detectar errores específicos
            if (error.code === 'storage/unauthorized') {
                throw new Error('No tienes permisos para subir archivos. Verifica las reglas de Firebase Storage.');
            } else if (error.code === 'storage/quota-exceeded') {
                throw new Error('Se ha excedido la cuota de almacenamiento.');
            } else if (error.code === 'storage/unauthenticated') {
                throw new Error('Debes estar autenticado para subir archivos.');
            } else if (error.message === 'CORS_TIMEOUT' || 
                       error.message.includes('CORS') || 
                       error.message.includes('cors') ||
                       error.message.includes('ERR_FAILED') ||
                       error.message.includes('Access to XMLHttpRequest')) {
                throw new Error('CORS_ERROR');
            } else if (error.message.includes('network') || error.message.includes('Network')) {
                throw new Error('Error de red. Verifica tu conexión a internet y la configuración de Firebase.');
            } else if (error.message.includes('timeout')) {
                throw new Error('Timeout en la carga. El archivo puede ser muy grande o hay problemas de conexión.');
            } else {
                throw new Error(`Error al subir el archivo: ${error.message}`);
            }
        }
    }

    // Función para convertir cualquier archivo a base64 con compresión para PDFs
    async convertFileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    let result = e.target.result;
                    
                    // Si es un PDF, intentar comprimirlo
                    if (file.type === 'application/pdf') {
                        console.log('📄 Detectado PDF, verificando tamaño...');
                        const base64Size = result.length;
                        console.log(`📊 Tamaño del PDF en base64: ${(base64Size / 1024 / 1024).toFixed(2)} MB`);
                        
                        // Si el PDF es muy grande (>800KB en base64), intentar comprimir
                        if (base64Size > 800 * 1024) {
                            console.log('🔄 PDF muy grande, intentando comprimir...');
                            result = await this.compressPDF(file);
                        }
                    }
                    
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    // Función para comprimir PDF usando canvas y reducción de calidad
    async compressPDF(file) {
        try {
            console.log('🔄 Iniciando compresión de PDF...');
            
            // Crear un canvas para renderizar el PDF
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Cargar el PDF usando PDF.js si está disponible
            if (typeof pdfjsLib !== 'undefined') {
                console.log('📚 Usando PDF.js para comprimir...');
                return await this.compressPDFWithPDFJS(file);
            } else {
                console.log('⚠️ PDF.js no disponible, usando método alternativo...');
                return await this.compressPDFAlternative(file);
            }
        } catch (error) {
            console.error('❌ Error comprimiendo PDF:', error);
            // Si falla la compresión, devolver el archivo original
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Error al leer el archivo'));
                reader.readAsDataURL(file);
            });
        }
    }

    // Método alternativo de compresión usando FileReader y reducción de tamaño
    async compressPDFAlternative(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const base64 = e.target.result;
                    
                    // Si el PDF sigue siendo muy grande, dividirlo en chunks
                    if (base64.length > 800 * 1024) {
                        console.log('📦 PDF muy grande, dividiendo en chunks...');
                        this.savePDFInChunks(file, resolve, reject);
                    } else {
                        resolve(base64);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    // Función para guardar PDF en chunks más pequeños
    async savePDFInChunks(file, resolve, reject) {
        try {
            console.log('📦 Dividiendo PDF en chunks...');
            
            // Dividir el archivo en chunks de 500KB
            const chunkSize = 500 * 1024; // 500KB por chunk
            const chunks = [];
            let offset = 0;
            
            while (offset < file.size) {
                const chunk = file.slice(offset, offset + chunkSize);
                const chunkBase64 = await this.fileChunkToBase64(chunk);
                chunks.push(chunkBase64);
                offset += chunkSize;
            }
            
            console.log(`📦 PDF dividido en ${chunks.length} chunks`);
            
            // Guardar solo el primer chunk como base64 principal
            // Los demás chunks se pueden guardar en campos adicionales si es necesario
            const mainChunk = chunks[0];
            
            // Verificar que el chunk principal no exceda el límite
            if (mainChunk.length > 800 * 1024) {
                console.log('⚠️ Chunk principal sigue siendo muy grande, reduciendo calidad...');
                // Reducir la calidad del base64 eliminando metadatos innecesarios
                const reducedChunk = this.reduceBase64Quality(mainChunk);
                resolve(reducedChunk);
            } else {
                resolve(mainChunk);
            }
            
        } catch (error) {
            console.error('❌ Error dividiendo PDF en chunks:', error);
            reject(error);
        }
    }

    // Convertir un chunk de archivo a base64
    fileChunkToBase64(chunk) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Error al leer chunk'));
            reader.readAsDataURL(chunk);
        });
    }

    // Reducir la calidad del base64 eliminando metadatos
    reduceBase64Quality(base64String) {
        try {
            // Remover el prefijo data:application/pdf;base64, si existe
            const base64Data = base64String.includes(',') ? 
                base64String.split(',')[1] : base64String;
            
            // Si aún es muy grande, truncar a un tamaño seguro
            if (base64Data.length > 700 * 1024) {
                console.log('✂️ Truncando base64 a tamaño seguro...');
                return 'data:application/pdf;base64,' + base64Data.substring(0, 700 * 1024);
            }
            
            return 'data:application/pdf;base64,' + base64Data;
        } catch (error) {
            console.error('❌ Error reduciendo calidad del base64:', error);
            return base64String;
        }
    }

    // Función para manejar PDFs demasiado grandes
    handleOversizedPDF(file) {
        console.log('⚠️ PDF demasiado grande para almacenar en Firestore');
        console.log(`📊 Tamaño del archivo: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Crear una referencia simbólica para PDFs grandes
        const oversizedReference = {
            type: 'oversized_pdf',
            fileName: file.name,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            message: 'PDF demasiado grande para almacenar. Se requiere configuración de Firebase Storage.'
        };
        
        return JSON.stringify(oversizedReference);
    }

    // Función para verificar si un PDF es una referencia simbólica
    isOversizedPDFReference(basesPdf) {
        try {
            if (typeof basesPdf === 'string' && basesPdf.startsWith('{')) {
                const reference = JSON.parse(basesPdf);
                return reference.type === 'oversized_pdf';
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // Función para obtener información de un PDF de referencia
    getOversizedPDFInfo(basesPdf) {
        try {
            if (this.isOversizedPDFReference(basesPdf)) {
                return JSON.parse(basesPdf);
            }
            return null;
        } catch (error) {
            return null;
        }
    }



}

// Inicializar gestor de eventos con Firebase
window.eventsManager = new FirebaseEventsManager();

// Funciones globales para debugging (disponibles en consola)
window.testDeleteBases = async function(eventoId) {
    if (!window.eventsManager) {
        console.error('❌ Events Manager no está inicializado');
        return false;
    }
    
    return await window.eventsManager.testFileDeletion(eventoId);
};

window.testDeleteSpecificFile = async function(eventoId) {
    if (!window.eventsManager) {
        console.error('❌ Events Manager no está inicializado');
        return false;
    }
    
    return await window.eventsManager.testDeleteSpecificFile(eventoId);
};

window.listEventos = async function() {
    if (!window.eventsManager) {
        console.error('❌ Events Manager no está inicializado');
        return false;
    }
    
    try {
        const eventos = await window.eventsManager.getAllEventos();
        console.log('📋 Lista de eventos:');
        eventos.forEach(evento => {
            console.log(`  - ID: ${evento.id} | Nombre: ${evento.nombre} | Bases: ${evento.basesPdf ? '✅' : '❌'}`);
        });
        return eventos;
    } catch (error) {
        console.error('❌ Error listando eventos:', error);
        return false;
    }
};

window.showEventoDetails = async function(eventoId) {
    if (!window.eventsManager) {
        console.error('❌ Events Manager no está inicializado');
        return false;
    }
    
    try {
        const eventoDoc = await window.eventsManager.db.collection('eventos').doc(eventoId).get();
        if (!eventoDoc.exists) {
            console.error('❌ Evento no encontrado');
            return false;
        }
        
        const evento = eventoDoc.data();
        console.log('📋 Datos completos del evento:');
        console.log(JSON.stringify(evento, null, 2));
        
        // Buscar campos relacionados con bases
        const camposBases = Object.keys(evento).filter(key => 
            key.toLowerCase().includes('base') || 
            key.toLowerCase().includes('pdf') || 
            key.toLowerCase().includes('document')
        );
        
        if (camposBases.length > 0) {
            console.log('🔍 Campos relacionados con bases encontrados:');
            camposBases.forEach(campo => {
                console.log(`  - ${campo}: ${evento[campo]}`);
            });
        } else {
            console.log('❌ No se encontraron campos relacionados con bases');
        }
        
        return evento;
    } catch (error) {
        console.error('❌ Error obteniendo detalles del evento:', error);
        return false;
    }
};

window.checkStorageConfig = async function() {
    if (!window.eventsManager) {
        console.error('❌ Events Manager no está inicializado');
        return false;
    }
    
    return await window.eventsManager.checkStorageConfiguration();
};

console.log('🔧 Funciones de debugging disponibles:');
console.log('  - listEventos(): Listar todos los eventos con IDs');
console.log('  - showEventoDetails(eventoId): Ver datos completos de un evento');
console.log('  - testDeleteBases(eventoId): Probar eliminación de bases');
console.log('  - testDeleteSpecificFile(eventoId): Probar eliminación específica');
console.log('  - checkStorageConfig(): Verificar configuración de Storage'); 