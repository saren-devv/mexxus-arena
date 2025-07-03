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
    }

    init() {
        this.waitForFirebase().then(() => {
            this.db = window.firebaseDB;
            this.auth = window.firebaseAuth;
            this.setupEventListeners();
            console.log('📅 Events Manager con Firebase inicializado');
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
            
            if (event.target === inscripcionModal) {
                this.closeInscripcionModal();
            } else if (event.target === atletasModal) {
                atletasModal.classList.remove('active');
                atletasModal.style.display = 'none';
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
    }

    // Crear o editar evento
    async handleEventoSubmit(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('eventoNombre').value.trim();
        const fecha = document.getElementById('eventoFecha').value;
        const fechaLimite = document.getElementById('eventoFechaLimite').value;
        const lugar = document.getElementById('eventoLugar').value.trim();
        const modalidad = document.getElementById('eventoModalidad').value;
        const descripcion = document.getElementById('eventoDescripcion').value.trim();
        const imagenFile = document.getElementById('eventoImagen').files[0];

        // Validar campos obligatorios
        if (!nombre || !fecha || !fechaLimite || !lugar || !modalidad || !descripcion) {
            window.authManager.showMessage('Por favor complete todos los campos obligatorios', 'error');
            return;
        }

        // Validar fechas
        const fechaEvento = new Date(fecha + 'T00:00:00');
        const fechaLimiteInscripcion = new Date(fechaLimite + 'T00:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaEvento < hoy) {
            window.authManager.showMessage('La fecha del evento no puede ser en el pasado', 'error');
            return;
        }

        if (fechaLimiteInscripcion >= fechaEvento) {
            window.authManager.showMessage('La fecha límite de inscripción debe ser anterior a la fecha del evento', 'error');
            return;
        }

        if (fechaLimiteInscripcion < hoy) {
            window.authManager.showMessage('La fecha límite de inscripción no puede ser en el pasado', 'error');
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
                fecha: new Date(fecha + 'T00:00:00'),
                fechaLimiteInscripcion: new Date(fechaLimite + 'T00:00:00'),
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

            if (this.currentEventoId) {
                // Editar evento existente
                await this.db.collection('eventos').doc(this.currentEventoId).update(eventoData);
                window.authManager.showMessage('Evento actualizado correctamente', 'success');
            } else {
                // Crear nuevo evento
                eventoData.createdBy = currentUser.uid;
                eventoData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                
                await this.db.collection('eventos').add(eventoData);
                window.authManager.showMessage('Evento creado correctamente', 'success');
            }

            this.closeEventoModal();
            
            // Actualizar vistas
            if (window.dashboardManager) {
                window.dashboardManager.invalidateCache();
                window.dashboardManager.loadDashboardData();
            }
            if (window.adminManager) {
                window.adminManager.invalidateCache();
                
                // Si estamos en la página de detalles del evento, recargar los detalles
                const paginaDetalles = document.getElementById('detallesEvento');
                if (paginaDetalles && paginaDetalles.classList.contains('active')) {
                    window.adminManager.cargarDetallesEvento(this.currentEventoId);
                } else {
                    window.adminManager.loadAdminData();
                }
            }

        } catch (error) {
            console.error('Error guardando evento:', error);
            window.authManager.showMessage('Error al guardar evento', 'error');
        } finally {
            this.setLoading(false);
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
            modalidad: form.querySelector('select[name="modalidad"]')?.value
        };

        // Validar que todos los campos requeridos estén presentes
        for (const [key, value] of Object.entries(formData)) {
            if (!value) {
                window.authManager.showMessage(`Por favor complete el campo ${key}`, 'error');
                return;
            }
        }

        // Convertir peso a número
        const peso = parseFloat(formData.peso);
        if (isNaN(peso)) {
            window.authManager.showMessage('El peso debe ser un número válido', 'error');
            return;
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

        // Determinar categoría de peso
        const categoriaPeso = this.determinarCategoriaPeso(peso, edad, formData.sexo);

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
            division: division,
            nivel: nivel,
            divisionPeso: categoriaPeso
        };

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
                    await this.db.collection('inscripciones').doc(inscripcionExistente.id).update({
                        alumnos: nuevosAlumnos,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Crear nueva inscripción
                    await this.db.collection('inscripciones').add({
                        eventoId: this.currentEventoParaInscripcion,
                        academiaId: currentUser.uid,
                        alumnos: [alumno],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                window.authManager.showMessage('Alumno inscrito correctamente', 'success');
            }

            // Actualizar la vista si es necesario
            if (window.dashboardManager) {
                window.dashboardManager.loadEventosDisponibles();
            }

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
        
        // Limpiar vista previa de imagen
        this.clearImagePreview();
        
        // Establecer fecha mínima como hoy
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('eventoFecha').min = today;
        document.getElementById('eventoFechaLimite').min = today;
        
        // Configurar evento de imagen
        this.setupImagePreview();
        
        document.getElementById('eventoModal').style.display = 'flex';
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
            
            // Limpiar vista previa de imagen
            this.clearImagePreview();
            
            // Llenar formulario con datos del evento
            document.getElementById('eventoNombre').value = evento.nombre || '';
            document.getElementById('eventoFecha').value = evento.fecha ? this.formatDateForInput(evento.fecha.toDate()) : '';
            document.getElementById('eventoFechaLimite').value = evento.fechaLimiteInscripcion ? this.formatDateForInput(evento.fechaLimiteInscripcion.toDate()) : '';
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
            
            // Configurar evento de imagen
            this.setupImagePreview();
            
            document.getElementById('eventoModal').style.display = 'flex';
        } catch (error) {
            console.error('Error cargando evento:', error);
            window.authManager.showMessage('Error al cargar evento', 'error');
        }
    }

    // Cerrar modal de evento
    closeEventoModal() {
        this.currentEventoId = null;
        document.getElementById('eventoModal').style.display = 'none';
        document.getElementById('eventoForm').reset();
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
                        const miInscripcion = miInscripcionSnapshot.docs[0].data();
                        this.loadExistingStudents(miInscripcion.alumnos);
                        
                        // Actualizar título del modal
                        document.getElementById('eventoInscripcionNombre').innerHTML = 
                            `${evento.nombre}<br><small style="color: #666;">Agregando más alumnos (${miInscripcion.alumnos.length} ya inscritos)</small>`;
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
                        <label>Modalidad:</label>
                        <select name="modalidad" required>
                            <option value="">Seleccionar modalidad...</option>
                            <option value="POOMSAE">POOMSAE</option>
                            <option value="KYORUGI">KYORUGI</option>
                        </select>
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
                        <label>Peso (kg):</label>
                        <input type="number" name="peso" min="15" max="200" step="0.1" placeholder="65.5" required>
                    </div>
                </div>
            </div>
        `;
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
                    <label>Modalidad:</label>
                    <select name="modalidad" required>
                        <option value="">Seleccionar modalidad...</option>
                        <option value="POOMSAE">POOMSAE</option>
                        <option value="KYORUGI">KYORUGI</option>
                    </select>
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
                    <label>Peso (kg):</label>
                    <input type="number" name="peso" min="15" max="200" step="0.1" placeholder="65.5" required>
                </div>
            </div>
        `;
        
        container.appendChild(newAlumnoForm);
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
            const cinturon = formulario.querySelector('select[name="cinturon"]').value;
            const sexo = formulario.querySelector('select[name="sexo"]').value;
            const peso = formulario.querySelector('input[name="peso"]').value;
            
            // Solo convertir si el formulario tiene datos válidos
            if (nombre && apellido && fechaNacimiento && dni && cinturon && sexo && peso) {
                // Validar datos básicos
                if (!/^\d{8}$/.test(dni)) {
                    window.authManager.showMessage(`DNI del alumno ${index + 1} debe tener 8 dígitos`, 'error');
                    return;
                }
                
                if (parseFloat(peso) < 20 || parseFloat(peso) > 200) {
                    window.authManager.showMessage(`Peso del alumno ${index + 1} debe estar entre 20-200 kg`, 'error');
                    return;
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
                summaryCard.className = 'alumno-summary-card';
                summaryCard.innerHTML = `
                    <div style="background: #d4edda; border: 2px solid #28a745; border-radius: 8px; padding: 15px; margin-bottom: 15px; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h4 style="color: #155724; margin: 0; flex-grow: 1;">
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
                            <div><strong>Cinturón:</strong> ${cinturonTexto}</div>
                            <div><strong>Sexo:</strong> ${sexo}</div>
                            <div><strong>Peso:</strong> ${peso} kg</div>
                        </div>
                        
                        <div style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                                                            <strong>Fecha de Nacimiento:</strong> ${new Date(fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES')}
                        </div>
                        
                        <!-- Campos ocultos para envío del formulario -->
                        <input type="hidden" name="nombre" value="${nombre}">
                        <input type="hidden" name="apellido" value="${apellido}">
                        <input type="hidden" name="fechaNacimiento" value="${fechaNacimiento}">
                        <input type="hidden" name="dni" value="${dni}">
                        <input type="hidden" name="cinturon" value="${cinturon}">
                        <input type="hidden" name="sexo" value="${sexo}">
                        <input type="hidden" name="peso" value="${peso}">
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

            // Eliminar inscripciones relacionadas
            const inscripcionesSnapshot = await this.db.collection('inscripciones')
                .where('eventoId', '==', eventoId)
                .get();

            const batch = this.db.batch();
            
            inscripcionesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Eliminar el evento
            batch.delete(this.db.collection('eventos').doc(eventoId));

            await batch.commit();

            window.authManager.showMessage('Evento eliminado correctamente', 'success');
            
            // Actualizar vistas
            if (window.adminManager) {
                window.adminManager.invalidateCache();
                window.adminManager.loadAdminData();
            }
            if (window.dashboardManager) {
                window.dashboardManager.invalidateCache();
                window.dashboardManager.loadDashboardData();
            }

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

    // Limpiar vista previa de imagen
    clearImagePreview() {
        const preview = document.getElementById('imagenPreview');
        const previewImg = document.getElementById('imagenPreviewImg');
        
        if (preview && previewImg) {
            preview.style.display = 'none';
            previewImg.src = '';
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
                form.querySelector('select[name="modalidad"]').value = participante.modalidad || '';
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
            const participanteData = {
                nombre: form.querySelector('input[name="nombre"]').value,
                apellido: form.querySelector('input[name="apellido"]').value,
                fechaNacimiento: form.querySelector('input[name="fechaNacimiento"]').value,
                dni: form.querySelector('input[name="dni"]').value,
                cinturon: form.querySelector('select[name="cinturon"]').value,
                sexo: form.querySelector('select[name="sexo"]').value,
                peso: parseFloat(form.querySelector('input[name="peso"]').value),
                modalidad: form.querySelector('select[name="modalidad"]').value
            };

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
}

// Inicializar gestor de eventos con Firebase
window.eventsManager = new FirebaseEventsManager(); 