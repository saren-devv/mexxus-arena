// Sistema de Autenticación con Firebase
class FirebaseAuthManager {
    constructor() {
        this.currentUser = null;
        this.auth = null;
        this.db = null;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando AuthManager...');
        
        try {
            // Esperar a que el DOM esté listo
            await this.waitForDOM();
            console.log('✅ DOM está listo');
            
            // Esperar a que Firebase esté listo
            await this.waitForFirebase();
            console.log('✅ Firebase está listo');
            
            this.auth = window.firebaseAuth;
            this.db = window.firebaseDB;
            
            this.setupAuthListener();
            this.setupEventListeners();
            
            console.log('✅ AuthManager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando AuthManager:', error);
            // Intentar configurar listeners básicos aunque Firebase falle
            this.setupEventListenersBasic();
        }
    }

    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.firebaseAuth && window.firebaseDB) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error('Firebase no se pudo inicializar');
    }

    setupAuthListener() {
        // Listener para cambios de autenticación
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Usuario logueado
                console.log('👤 Usuario logueado:', user.email);
                await this.loadUserData(user);
                this.updateUI();
            } else {
                // Usuario deslogueado
                console.log('👋 Usuario deslogueado');
                this.currentUser = null;
                this.updateUI();
            }
        });
    }

    async loadUserData(firebaseUser) {
        try {
            console.log('👤 Cargando datos del usuario:', firebaseUser.uid);
            
            // Verificar que Firestore esté disponible
            if (!this.db) {
                throw new Error('Firestore no está inicializado');
            }
            
            // Obtener datos adicionales del usuario desde Firestore
            const userDoc = await this.db.collection('users').doc(firebaseUser.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...userData
                };
                console.log('✅ Datos del usuario cargados:', this.currentUser);
            } else {
                console.log('📝 Usuario no existe en Firestore, creando documento...');
                
                // Si es la primera vez, crear documento del usuario
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    nombre: firebaseUser.email.split('@')[0], // Nombre temporal
                    tipo: 'academia' // Por defecto academia, admin se asigna manualmente
                };
                
                // Guardar en Firestore
                await this.db.collection('users').doc(firebaseUser.uid).set({
                    nombre: this.currentUser.nombre,
                    email: this.currentUser.email,
                    tipo: this.currentUser.tipo,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('✅ Documento de usuario creado exitosamente');
            }
        } catch (error) {
            console.error('❌ Error cargando datos del usuario:', error);
            
            // Manejar errores específicos de permisos
            if (error.code === 'permission-denied') {
                console.error('🚫 Error de permisos en Firestore');
                this.showMessage('Error de permisos: Verifica las reglas de Firestore', 'error');
                
                // Crear usuario temporal sin datos de Firestore
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    nombre: firebaseUser.email.split('@')[0],
                    tipo: 'academia',
                    error: 'permission-denied'
                };
            } else if (error.code === 'unavailable') {
                console.error('🌐 Error de conectividad con Firestore');
                this.showMessage('Error de conectividad con la base de datos', 'error');
            } else if (error.message.includes('Missing or insufficient permissions')) {
                console.error('🔒 Permisos insuficientes en Firestore');
                this.showMessage('Error de permisos: Contacta al administrador', 'error');
                
                // Crear usuario temporal
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    nombre: firebaseUser.email.split('@')[0],
                    tipo: 'academia',
                    error: 'insufficient-permissions'
                };
            } else {
                this.showMessage('Error cargando datos del usuario: ' + error.message, 'error');
                
                // Crear usuario temporal en caso de error
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    nombre: firebaseUser.email.split('@')[0],
                    tipo: 'academia',
                    error: 'unknown-error'
                };
            }
        }
    }

    setupEventListeners() {
        console.log('🔗 Configurando event listeners...');
        
        // Configurar listeners básicos
        this.setupEventListenersBasic();
        
        // Formularios - verificar que existan
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            console.log('✅ Login form listener configurado');
        } else {
            console.warn('⚠️ loginForm no encontrado');
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            console.log('✅ Register form listener configurado');
        } else {
            console.warn('⚠️ registerForm no encontrado');
        }

        // Cerrar modales
        const closeButtons = document.querySelectorAll('.close');
        if (closeButtons.length > 0) {
            closeButtons.forEach(closeBtn => {
                closeBtn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.modal');
                    modal.style.display = 'none';
                    
                    // Limpiar formulario de registro si se cierra
                    if (modal.id === 'registerModal') {
                        document.getElementById('registerForm').reset();
                        this.clearFotoPerfilPreview();
                    }
                });
            });
            console.log(`✅ ${closeButtons.length} botones de cerrar configurados`);
        }

        // Configurar vista previa de foto de perfil en registro
        this.setupFotoPerfilPreview();

        // Cerrar modal haciendo clic fuera
        const modals = document.querySelectorAll('.modal');
        if (modals.length > 0) {
            modals.forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                        
                        // Limpiar formulario de registro si se cierra
                        if (modal.id === 'registerModal') {
                            document.getElementById('registerForm').reset();
                            this.clearFotoPerfilPreview();
                        }
                    }
                });
            });
            console.log(`✅ ${modals.length} modales configurados para cerrar al hacer clic fuera`);
        }

        // Agregar verificación de elementos críticos
        this.verifyRequiredElements();
    }

    setupEventListenersBasic() {
        console.log('🔗 Configurando listeners básicos...');
        
        // Botones de navegación - verificar que existan
        const buttons = [
            { id: 'loginBtn', action: () => this.showLoginModal(), name: 'Login' },
            { id: 'registerBtn', action: () => this.showRegisterModal(), name: 'Register' },
            { id: 'logoutBtn', action: () => this.logout(), name: 'Logout' },
            { id: 'mobileLoginBtn', action: () => this.showLoginModal(), name: 'Mobile Login' },
            { id: 'mobileRegisterBtn', action: () => this.showRegisterModal(), name: 'Mobile Register' },
            { id: 'mobileLogoutBtn', action: () => this.logout(), name: 'Mobile Logout' },
            { id: 'perfilBtn', action: () => this.showPerfil(), name: 'Perfil' },
            { id: 'btnCerrarSesionPerfil', action: () => this.logout(), name: 'Cerrar Sesión Perfil' }
        ];

        let configuredCount = 0;
        buttons.forEach(({ id, action, name }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', action);
                console.log(`✅ ${name} button listener configurado`);
                configuredCount++;
            } else {
                console.warn(`⚠️ ${name} button (${id}) no encontrado`);
            }
        });

        console.log(`🎯 Total listeners configurados: ${configuredCount}/${buttons.length}`);
    }

    verifyRequiredElements() {
        const requiredElements = [
            'loginModal', 'registerModal', 'loginForm', 'registerForm',
            'loginEmail', 'loginPassword', 'registerNombre', 'registerAbreviatura',
            'registerRepresentante', 'registerDniRepresentante', 'registerPassword', 'registerConfirmPassword'
        ];

        const navigationElements = [
            'loginBtn', 'registerBtn', 'logoutBtn', 'perfilBtn',
            'mobileLoginBtn', 'mobileRegisterBtn', 'mobileLogoutBtn'
        ];

        const missingRequired = requiredElements.filter(id => !document.getElementById(id));
        const missingNavigation = navigationElements.filter(id => !document.getElementById(id));
        
        if (missingRequired.length > 0) {
            console.warn('⚠️ Elementos críticos faltantes:', missingRequired);
        } else {
            console.log('✅ Todos los elementos críticos están presentes');
        }

        if (missingNavigation.length > 0) {
            console.warn('⚠️ Botones de navegación faltantes:', missingNavigation);
        } else {
            console.log('✅ Todos los botones de navegación están presentes');
        }
    }

    showLoginModal() {
        console.log('📝 Abriendo modal de login...');
        
        const loginModal = document.getElementById('loginModal');
        const loginEmail = document.getElementById('loginEmail');
        
        if (!loginModal) {
            console.error('❌ Modal de login no encontrado');
            this.showMessage('Error: Modal de login no disponible', 'error');
            return;
        }

        if (!loginEmail) {
            console.error('❌ Campo loginEmail no encontrado');
        }

        loginModal.style.display = 'flex';
        
        if (loginEmail) {
            loginEmail.focus();
        }
        
        // Cerrar menú móvil si está abierto
        if (window.mobileMenuManager && window.mobileMenuManager.isOpen) {
            window.mobileMenuManager.closeMenu();
        }
        
        console.log('✅ Modal de login abierto');
    }

    showRegisterModal() {
        console.log('📝 Abriendo modal de registro...');
        
        const registerModal = document.getElementById('registerModal');
        const registerNombre = document.getElementById('registerNombre');
        
        if (!registerModal) {
            console.error('❌ Modal de registro no encontrado');
            this.showMessage('Error: Modal de registro no disponible', 'error');
            return;
        }

        if (!registerNombre) {
            console.error('❌ Campo registerNombre no encontrado');
        }

        registerModal.style.display = 'flex';
        
        // Resetear el formulario al estado inicial
        if (window.resetRegisterForm) {
            window.resetRegisterForm();
        }
        
        if (registerNombre) {
            registerNombre.focus();
        }
        
        // Cerrar menú móvil si está abierto
        if (window.mobileMenuManager && window.mobileMenuManager.isOpen) {
            window.mobileMenuManager.closeMenu();
        }
        
        console.log('✅ Modal de registro abierto y reseteado');
    }

    showPerfil() {
        // Solo usuarios logueados de tipo academia pueden acceder al perfil
        if (!this.currentUser || this.currentUser.tipo !== 'academia') {
            this.showMessage('Acceso no autorizado al perfil', 'error');
            return;
        }

        // Delegar al perfilDelegacionManager
        if (window.perfilDelegacionManager) {
            window.perfilDelegacionManager.abrirPerfil();
        } else {
            this.showMessage('Sistema de perfil no disponible', 'error');
            console.error('❌ perfilDelegacionManager no disponible');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const emailOrAbreviatura = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!emailOrAbreviatura || !password) {
            this.showMessage('Por favor complete todos los campos', 'error');
            return;
        }

        try {
            // Mostrar estado de carga
            this.setLoading(true);
            
            let emailParaAuth = emailOrAbreviatura;
            
            // Si no contiene @ probablemente es una abreviatura
            if (!emailOrAbreviatura.includes('@')) {
                console.log('🔍 Buscando delegación por abreviatura:', emailOrAbreviatura.toUpperCase());
                
                // Buscar la delegación por abreviatura para obtener el email de autenticación
                const delegacionSnapshot = await this.db.collection('users')
                    .where('abreviatura', '==', emailOrAbreviatura.toUpperCase())
                    .get();
                
                if (delegacionSnapshot.empty) {
                    console.warn('❌ No se encontró delegación con abreviatura:', emailOrAbreviatura.toUpperCase());
                    this.showMessage('No existe una delegación con esta abreviatura', 'error');
                    return;
                }
                
                const delegacionData = delegacionSnapshot.docs[0].data();
                emailParaAuth = delegacionData.emailAuth || delegacionData.email;
                
                console.log('✅ Delegación encontrada, email para auth:', emailParaAuth ? 'presente' : 'faltante');
                
                if (!emailParaAuth) {
                    console.error('❌ Email de autenticación faltante para:', delegacionData.nombre);
                    this.showMessage('Error en la configuración de la delegación. Contacte al administrador.', 'error');
                    return;
                }
            }
            
            // Autenticar con Firebase
            const userCredential = await this.auth.signInWithEmailAndPassword(emailParaAuth, password);
            
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('loginForm').reset();
            this.showMessage(`¡Bienvenido de vuelta!`, 'success');
            
        } catch (error) {
            console.error('Error en login:', error);
            let errorMessage = 'El usuario y/o contraseña no son correctos';
            
            switch (error.code) {
                case 'auth/too-many-requests':
                    errorMessage = 'Demasiados intentos. Intenta más tarde';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Error de conexión. Verifique su conexión a internet';
                    break;
                default:
                    errorMessage = 'El usuario y/o contraseña no son correctos';
            }
            
            this.showMessage(errorMessage, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('registerNombre').value.trim();
        const abreviatura = document.getElementById('registerAbreviatura').value.trim();
        const representante = document.getElementById('registerRepresentante').value.trim();
        const dniRepresentante = document.getElementById('registerDniRepresentante').value.trim();
        const telefono = document.getElementById('registerTelefono').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const fotoPerfilFile = document.getElementById('registerFotoPerfil').files[0];

        // Validaciones campos obligatorios
        if (!nombre || !abreviatura || !representante || !dniRepresentante || !password || !confirmPassword) {
            this.showMessage('Por favor complete todos los campos obligatorios', 'error');
            return;
        }

        // Validar DNI del representante (8 dígitos)
        if (!/^\d{8}$/.test(dniRepresentante)) {
            this.showMessage('El DNI del representante debe tener exactamente 8 dígitos', 'error');
            return;
        }

        // Validar abreviatura (máximo 10 caracteres)
        if (abreviatura.length > 10) {
            this.showMessage('La abreviatura no puede tener más de 10 caracteres', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        // Validar email si se proporciona
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showMessage('El formato del correo electrónico no es válido', 'error');
            return;
        }

        try {
            this.setLoading(true);
            
            // Verificar si ya existe una delegación con la misma abreviatura
            const abreviaturaSnapshot = await this.db.collection('users')
                .where('abreviatura', '==', abreviatura.toUpperCase())
                .get();
            
            if (!abreviaturaSnapshot.empty) {
                this.showMessage('Ya existe una delegación con esta abreviatura', 'error');
                return;
            }

            // Verificar si ya existe un representante con el mismo DNI
            const dniSnapshot = await this.db.collection('users')
                .where('dniRepresentante', '==', dniRepresentante)
                .get();
            
            if (!dniSnapshot.empty) {
                this.showMessage('Ya existe una delegación registrada con este DNI de representante', 'error');
                return;
            }

            // Crear usuario en Firebase Auth usando email o generar uno temporal
            let emailParaAuth = email;
            if (!email) {
                // Si no se proporciona email, generar uno temporal basado en la abreviatura
                emailParaAuth = `${abreviatura.toLowerCase()}@temp.mexxusevents.com`;
            }

            const userCredential = await this.auth.createUserWithEmailAndPassword(emailParaAuth, password);
            const user = userCredential.user;
            
            // Manejar foto de perfil si se seleccionó una
            let fotoPerfilBase64 = null;
            if (fotoPerfilFile) {
                try {
                    fotoPerfilBase64 = await this.convertImageToBase64(fotoPerfilFile);
                } catch (imageError) {
                    console.error('Error procesando foto de perfil:', imageError);
                    this.showMessage('Error al procesar la foto de perfil, el registro continuará sin foto', 'warning');
                }
            }

            // Crear documento del usuario en Firestore con todos los campos
            await this.db.collection('users').doc(user.uid).set({
                nombre: nombre,
                abreviatura: abreviatura.toUpperCase(),
                representante: representante,
                dniRepresentante: dniRepresentante,
                telefono: telefono || null,
                email: email || null,
                emailAuth: emailParaAuth, // Email usado para autenticación
                fotoPerfil: fotoPerfilBase64,
                tipo: 'academia',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('registerModal').style.display = 'none';
            document.getElementById('registerForm').reset();
            this.clearFotoPerfilPreview(); // Limpiar vista previa de foto
            this.showMessage(`¡Registro exitoso! Bienvenida delegación ${nombre}!`, 'success');
            
        } catch (error) {
            console.error('Error en registro:', error);
            let errorMessage = 'Error al registrarse';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Ya existe una cuenta con este email';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es muy débil';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.showMessage('Has cerrado sesión', 'info');
            
            // Cerrar menú móvil si está abierto
            if (window.mobileMenuManager && window.mobileMenuManager.isOpen) {
                window.mobileMenuManager.closeMenu();
            }
            
            // Actualizar la UI para ocultar el panel de admin y mostrar la página principal
            this.updateUI();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            this.showMessage('Error al cerrar sesión', 'error');
        }
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const perfilBtn = document.getElementById('perfilBtn');
        const userInfo = document.getElementById('userInfo');
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const homePage = document.getElementById('homePage');
        const academiaDashboard = document.getElementById('academiaDashboard');
        const adminPanel = document.getElementById('adminPanel');

        // Verificar elementos críticos
        if (!homePage) {
            console.error('❌ Elemento homePage no encontrado en updateUI');
            return;
        }

        if (this.currentUser) {
            console.log('🔄 Actualizando UI para usuario logueado:', this.currentUser.tipo);
            
            // Usuario logueado
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden'); // Ocultar botón de logout del navbar
            if (userInfo) {
                userInfo.classList.remove('hidden');
                if (this.currentUser.tipo === 'admin') {
                    userInfo.textContent = `${this.currentUser.nombre} (${this.currentUser.tipo})`;
                } else {
                    // Para academias: mostrar solo la abreviatura
                    const abreviatura = this.currentUser.abreviatura;
                    userInfo.textContent = abreviatura || 'Delegación';
                }
            }

            // Mostrar botón de perfil solo para academias
            if (perfilBtn) {
                if (this.currentUser.tipo === 'academia') {
                    perfilBtn.classList.remove('hidden');
                    
                    // Actualizar foto de perfil en el botón
                    this.updatePerfilBtnFoto();
                } else {
                    perfilBtn.classList.add('hidden');
                }
            }

            // Controlar visibilidad del menú hamburguesa en móvil
            if (hamburgerBtn) {
                hamburgerBtn.classList.remove('user-not-logged-in');
                hamburgerBtn.classList.add('user-logged-in');
            }

            // Actualizar menú móvil
            if (window.mobileMenuManager) {
                let userDisplayName;
                if (this.currentUser.tipo === 'admin') {
                    userDisplayName = `${this.currentUser.nombre} (${this.currentUser.tipo})`;
                } else {
                    // Para academias: mostrar solo la abreviatura
                    const abreviatura = this.currentUser.abreviatura;
                    userDisplayName = abreviatura || 'Delegación';
                }
                window.mobileMenuManager.updateAuthState(true, userDisplayName);
            }

            if (this.currentUser.tipo === 'admin') {
                // Para administradores: ocultar página principal y mostrar solo panel de admin
                homePage.classList.remove('active');
                if (adminPanel) {
                    adminPanel.classList.add('active');
                    console.log('✅ Panel de admin activado - página principal oculta');
                }
                
                // Inicializar panel de administrador
                this.waitForManager('adminManager').then(() => {
                    if (window.adminManager) {
                        window.adminManager.init();
                    }
                }).catch(error => {
                    console.error('❌ Error inicializando adminManager:', error);
                });
            } else {
                // Para academias: mantener página principal activa y mostrar sección de dashboard
                homePage.classList.add('active');
                
                // Mostrar sección de dashboard en la página principal
                const dashboardSection = document.getElementById('dashboardSection');
                if (dashboardSection) {
                    dashboardSection.classList.remove('hidden');
                    console.log('✅ Sección de dashboard activada en página principal');
                }
                
                // Dashboard de academia se maneja a través de otros managers
                console.log('✅ Dashboard de academia disponible a través de eventsManager y adminManager');
            }
        } else {
            console.log('🔄 Actualizando UI para usuario no logueado');
            
            // Usuario no logueado
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (registerBtn) registerBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');

            // Ocultar botón de perfil
            if (perfilBtn) {
                perfilBtn.classList.add('hidden');
            }

            // Controlar visibilidad del menú hamburguesa en móvil
            if (hamburgerBtn) {
                hamburgerBtn.classList.remove('user-logged-in');
                hamburgerBtn.classList.add('user-not-logged-in');
            }

            // Actualizar menú móvil
            if (window.mobileMenuManager) {
                window.mobileMenuManager.updateAuthState(false);
            }

            // Mostrar solo página principal y ocultar sección de dashboard
            homePage.classList.add('active');
            const dashboardSection = document.getElementById('dashboardSection');
            if (dashboardSection) dashboardSection.classList.add('hidden');
            if (adminPanel) adminPanel.classList.remove('active');
            
            // Ocultar panel de inscripciones si está visible
            const panelInscripcion = document.getElementById('panelInscripcion');
            if (panelInscripcion) {
                panelInscripcion.classList.remove('active');
            }
            
            // Ocultar perfil de delegación si está visible
            const perfilDelegacion = document.getElementById('perfilDelegacion');
            if (perfilDelegacion) {
                perfilDelegacion.classList.remove('active');
            }
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

    async loadToastStyles() {
        if (this.toastStyles) return this.toastStyles;
        
        try {
            const response = await fetch('./toast.json');
            const data = await response.json();
            this.toastStyles = data.toastStyles;
            return this.toastStyles;
        } catch (error) {
            console.error('Error cargando estilos de toast:', error);
            // Fallback a estilos básicos
            return {
                base: {
                    backgroundColor: "#1A1A1A",
                    textColor: "#F8F8F8",
                    fontFamily: "Poppins, sans-serif",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    padding: "16px",
                    iconSize: "20px",
                    fontSize: "15px"
                },
                states: {
                    success: { icon: "✔️", iconColor: "#43FF64", progressColor: "#43FF64" },
                    error: { icon: "❌", iconColor: "#FF4C4C", progressColor: "#FF4C4C" },
                    warning: { icon: "⚠️", iconColor: "#FFA500", progressColor: "#FFA500" },
                    info: { icon: "ℹ️", iconColor: "#4DA6FF", progressColor: "#4DA6FF" },
                    custom: { icon: "💬", iconColor: "#B0B0B0", progressColor: "#B0B0B0" }
                }
            };
        }
    }

    async showMessage(message, type = 'info', duration = 4000) {
        console.log(`📢 Mensaje ${type.toUpperCase()}:`, message);
        
        // Guardar el tiempo de inicio para calcular el tiempo restante
        const startTime = Date.now();
        
        // Cargar estilos del JSON
        const styles = await this.loadToastStyles();
        const baseStyles = styles.base;
        const stateStyles = styles.states[type] || styles.states.custom;
        
        // Obtener o crear el contenedor de toasts
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }

        // Crear elemento de mensaje principal
        const messageDiv = document.createElement('div');
        messageDiv.className = `toast-message ${type}`;
        messageDiv.style.cssText = `
            background-color: ${baseStyles.backgroundColor};
            color: ${baseStyles.textColor};
            font-family: ${baseStyles.fontFamily};
            border-radius: ${baseStyles.borderRadius};
            box-shadow: ${baseStyles.boxShadow};
            padding: ${baseStyles.padding};
            font-size: ${baseStyles.fontSize};
            min-width: 300px;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
            pointer-events: auto;
            position: relative;
            overflow: hidden;
        `;

        // Crear contenido del mensaje
        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            position: relative;
            z-index: 2;
        `;

        // Crear icono
                        const iconSpan = document.createElement('span');
                iconSpan.innerHTML = stateStyles.icon;
                iconSpan.style.cssText = `
                    width: ${baseStyles.iconSize};
                    height: ${baseStyles.iconSize};
                    color: ${stateStyles.iconColor};
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                // Aplicar estilos al SVG
                const svg = iconSpan.querySelector('svg');
                if (svg) {
                    svg.style.cssText = `
                        width: 100%;
                        height: 100%;
                        stroke-width: 2px;
                    `;
                }

        // Crear texto del mensaje
        const textSpan = document.createElement('span');
        textSpan.textContent = message;
        textSpan.style.cssText = `
            flex: 1;
            word-wrap: break-word;
            line-height: 1.4;
        `;

        // Ensamblar contenido
        contentDiv.appendChild(iconSpan);
        contentDiv.appendChild(textSpan);
        messageDiv.appendChild(contentDiv);

        // Crear barra de progreso
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background-color: ${stateStyles.progressColor};
            width: 100%;
            transform-origin: left;
            animation: progress ${duration}ms linear forwards;
            z-index: 1;
        `;
        messageDiv.appendChild(progressBar);

        // Insertar en el contenedor
        toastContainer.appendChild(messageDiv);

        // Animar entrada
        requestAnimationFrame(() => {
            messageDiv.style.transform = 'translateX(0)';
        });

        // Función para remover el toast
        const removeToast = () => {
            messageDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
                // Remover el contenedor si no hay más mensajes
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        };

        // Auto-remover después de la duración especificada
        let autoRemoveTimer = setTimeout(removeToast, duration);

        // Permitir cerrar manualmente al hacer click
        messageDiv.addEventListener('click', () => {
            clearTimeout(autoRemoveTimer);
            removeToast();
        });

        // Pausar progreso al hacer hover
        messageDiv.addEventListener('mouseenter', () => {
            progressBar.style.animationPlayState = 'paused';
            clearTimeout(autoRemoveTimer); // Pausar el auto-remove también
        });

        messageDiv.addEventListener('mouseleave', () => {
            progressBar.style.animationPlayState = 'running';
            // Reiniciar el timer con el tiempo restante
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, duration - elapsedTime);
            autoRemoveTimer = setTimeout(removeToast, remainingTime);
        });

        return messageDiv;
    }

    // Métodos para ser usados por otros módulos
    getCurrentUser() {
        return this.currentUser;
    }

    getAuth() {
        return this.auth;
    }

    getDB() {
        return this.db;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.tipo === 'admin';
    }

    isAcademia() {
        return this.currentUser && this.currentUser.tipo === 'academia';
    }

    // Método para esperar a que un manager esté disponible
    async waitForManager(managerName) {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window[managerName]) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error(`${managerName} no disponible`);
    }

    // Configurar vista previa de foto de perfil en registro
    setupFotoPerfilPreview() {
        const fotoPerfilInput = document.getElementById('registerFotoPerfil');
        const preview = document.getElementById('fotoPerfilPreview');
        const previewImg = document.getElementById('fotoPerfilPreviewImg');
        const removeBtn = document.getElementById('removeFotoPerfilBtn');

        if (!fotoPerfilInput || !preview || !previewImg || !removeBtn) return;

        fotoPerfilInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validar archivo
                if (file.size > 5 * 1024 * 1024) {
                    this.showMessage('La foto es muy grande. Máximo 5MB permitido.', 'error');
                    fotoPerfilInput.value = '';
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    this.showMessage('El archivo debe ser una imagen.', 'error');
                    fotoPerfilInput.value = '';
                    return;
                }

                // Mostrar vista previa
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                this.clearFotoPerfilPreview();
            }
        });

        removeBtn.addEventListener('click', () => {
            fotoPerfilInput.value = '';
            this.clearFotoPerfilPreview();
        });
    }

    // Limpiar vista previa de foto de perfil
    clearFotoPerfilPreview() {
        const preview = document.getElementById('fotoPerfilPreview');
        const previewImg = document.getElementById('fotoPerfilPreviewImg');
        
        if (preview && previewImg) {
            preview.style.display = 'none';
            previewImg.src = '';
        }
    }

    // Actualizar foto de perfil en el botón
    updatePerfilBtnFoto() {
        const perfilBtnFoto = document.getElementById('perfilBtnFoto');
        const perfilBtnIcon = document.getElementById('perfilBtnIcon');
        
        if (!perfilBtnFoto || !perfilBtnIcon) return;
        
        if (this.currentUser && this.currentUser.fotoPerfil) {
            perfilBtnFoto.src = this.currentUser.fotoPerfil;
            perfilBtnFoto.style.display = 'block';
            perfilBtnIcon.style.display = 'none';
        } else {
            perfilBtnFoto.style.display = 'none';
            perfilBtnIcon.style.display = 'block';
        }
    }

    // Función para convertir imagen a base64 (similar a la de events.js)
    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Calcular dimensiones manteniendo aspecto
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 512; // Tamaño máximo para fotos de perfil

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
                    
                    // Usar JPEG con alta calidad para fotos de perfil
                    let finalImage = canvas.toDataURL('image/jpeg', 0.9);
                    let sizeInBytes = finalImage.length * 0.75;
                    
                    if (sizeInBytes > 500000) { // Si es muy grande, reducir calidad
                        finalImage = canvas.toDataURL('image/jpeg', 0.8);
                    }
                    
                    resolve(finalImage);
                };
                img.onerror = () => reject(new Error('Error al procesar la imagen'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    // Método para crear usuario admin (solo usar en desarrollo)
    async createAdminUser(email, password) {
        if (!email || !password) {
            console.error('❌ Email and password are required');
            this.showMessage('Email y contraseña son requeridos', 'error');
            return;
        }

        try {
            // Ensure we have Firebase Auth
            if (!this.auth) {
                throw new Error('Firebase Auth not initialized');
            }

            // Clean email and password
            const cleanEmail = String(email).trim();
            const cleanPassword = String(password).trim();

            console.log('🔍 Intentando crear usuario admin:', cleanEmail);

            // Try to create user directly
            try {
                const userCredential = await this.auth.createUserWithEmailAndPassword(
                    cleanEmail,
                    cleanPassword
                );
                
                const user = userCredential.user;
                console.log('✅ Usuario creado en Firebase Auth:', user.uid);

                // Set admin data in Firestore
                await this.db.collection('users').doc(user.uid).set({
                    email: cleanEmail,
                    tipo: 'admin',
                    nombre: 'Administrador Principal',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log('✅ Admin user created successfully:', user.uid);
                this.showMessage('Usuario admin creado exitosamente', 'success');
                return user;

            } catch (createError) {
                // If user already exists, try to sign in and update
                if (createError.code === 'auth/email-already-in-use') {
                    console.log('ℹ️ Usuario ya existe, intentando actualizar permisos...');
                    
                    try {
                        const signInCredential = await this.auth.signInWithEmailAndPassword(
                            cleanEmail,
                            cleanPassword
                        );
                        
                        const existingUser = signInCredential.user;
                        
                        // Update user data in Firestore to ensure admin privileges
                        await this.db.collection('users').doc(existingUser.uid).set({
                            email: cleanEmail,
                            tipo: 'admin',
                            nombre: 'Administrador Principal',
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });

                        console.log('✅ Existing user updated to admin:', existingUser.uid);
                        this.showMessage('Usuario existente actualizado a admin', 'success');
                        return existingUser;
                        
                    } catch (signInError) {
                        console.error('❌ Error signing in existing user:', signInError);
                        this.showMessage('Error al acceder al usuario existente: ' + signInError.message, 'error');
                        throw signInError;
                    }
                } else {
                    // Other creation errors
                    console.error('❌ Error creating user:', createError);
                    this.showMessage('Error al crear usuario: ' + createError.message, 'error');
                    throw createError;
                }
            }
        } catch (error) {
            console.error('❌ Error managing admin user:', error);
            this.showMessage('Error con usuario admin: ' + error.message, 'error');
            throw error;
        }
    }

    // Método de debugging para verificar el estado del sistemas
    debugAuthSystem() {
        console.log('🔍 ESTADO DEL SISTEMA DE AUTENTICACIÓN:');
        console.log('- Firebase Auth:', this.auth ? '✅ Disponible' : '❌ No disponible');
        console.log('- Firebase DB:', this.db ? '✅ Disponible' : '❌ No disponible');
        console.log('- Usuario actual:', this.currentUser ? `✅ ${this.currentUser.email || this.currentUser.abreviatura}` : '❌ No logueado');
        
        const requiredElements = [
            'loginBtn', 'registerBtn', 'logoutBtn', 'userInfo',
            'loginModal', 'registerModal', 'loginForm', 'registerForm',
            'loginEmail', 'loginPassword', 'registerNombre', 'registerAbreviatura',
            'registerRepresentante', 'registerDniRepresentante', 'registerPassword', 'registerConfirmPassword',
            'homePage', 'academiaDashboard', 'adminPanel'
        ];

        console.log('🎛️ ELEMENTOS DEL DOM:');
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            console.log(`- ${id}:`, element ? '✅ Presente' : '❌ Faltante');
        });

        console.log('📱 MANAGERS DISPONIBLES:');
        const managers = ['authManager', 'adminManager', 'eventsManager', 'publicEventsManager'];
        managers.forEach(manager => {
            console.log(`- ${manager}:`, window[manager] ? '✅ Disponible' : '❌ No disponible');
        });

        // Test de botones
        console.log('🔘 TESTING BOTONES:');
        this.testButtons();
    }

    // Método para probar que los botones funcionan
    testButtons() {
        const buttons = [
            { id: 'loginBtn', name: 'Login Button' },
            { id: 'registerBtn', name: 'Register Button' },
            { id: 'logoutBtn', name: 'Logout Button' },
            { id: 'perfilBtn', name: 'Perfil Button' },
            { id: 'mobileLoginBtn', name: 'Mobile Login Button' },
            { id: 'mobileRegisterBtn', name: 'Mobile Register Button' },
            { id: 'mobileLogoutBtn', name: 'Mobile Logout Button' }
        ];

        buttons.forEach(({ id, name }) => {
            const button = document.getElementById(id);
            if (!button) {
                console.log(`❌ ${name} (${id}): No encontrado`);
                return;
            }

            // Verificar si tiene event listeners
            const hasListeners = button.onclick || button._events || 
                               (window.getEventListeners && window.getEventListeners(button).click?.length > 0);
            
            console.log(`${hasListeners ? '✅' : '⚠️'} ${name} (${id}): ${hasListeners ? 'Con listeners' : 'Sin listeners detectables'}`);
        });
    }

    // Método para simular clicks (para testing)
    simulateClick(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            console.log(`🧪 Simulando click en ${buttonId}...`);
            button.click();
        } else {
            console.error(`❌ Botón ${buttonId} no encontrado`);
        }
    }

    // Static function to create a new admin user
    static async createNewAdmin() {
        if (!window.authManager || !window.authManager.auth || !window.authManager.db) {
            console.error('❌ Auth Manager not initialized');
            return;
        }
        
        try {
            const email = 'admin@mexxusarena.com';
            const password = 'admin123456';
            
            console.log('👑 Creando nuevo usuario administrador...');
            const user = await window.authManager.createAdminUser(email, password);
            
            if (user) {
                console.log('✅ Usuario administrador creado exitosamente');
                console.log('📧 Email:', email);
                console.log('🔑 Contraseña:', password);
                console.log('🆔 UID:', user.uid);
            }
            
            return user;
        } catch (error) {
            console.error('❌ Error creating admin:', error);
            throw error;
        }
    }

    // Function to delete all admin users - USE WITH CAUTION
    static async deleteAllAdminUsers() {
        if (!window.authManager || !window.authManager.db) {
            console.error('❌ Auth Manager not initialized');
            return;
        }

        if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar TODOS los usuarios admin? Esta acción no se puede deshacer.')) {
            console.log('❌ Operación cancelada por el usuario');
            return;
        }

        try {
            console.log('🔍 Buscando usuarios admin...');
            
            // Get all admin users from Firestore
            const adminUsersSnapshot = await window.authManager.db.collection('users')
                .where('tipo', '==', 'admin')
                .get();

            if (adminUsersSnapshot.empty) {
                console.log('ℹNo se encontraron usuarios admin');
                window.authManager.showMessage('No se encontraron usuarios admin para eliminar', 'info');
                return;
            }

            console.log(`🔍 Encontrados ${adminUsersSnapshot.size} usuarios admin`);

            // Delete from Firestore
            const batch = window.authManager.db.batch();
            const adminIds = [];

            adminUsersSnapshot.forEach(doc => {
                adminIds.push(doc.id);
                batch.delete(doc.ref);
                console.log(`📝 Marcando para eliminar: ${doc.data().email}`);
            });

            await batch.commit();
            console.log('✅ Usuarios admin eliminados de Firestore');

            // Note: We cannot delete users from Firebase Auth using the client SDK
            // This would require Firebase Admin SDK on the server side
            console.log('⚠️ Nota: Los usuarios aún existen en Firebase Auth pero no tienen permisos admin');
            
            window.authManager.showMessage(`${adminIds.length} usuarios admin eliminados exitosamente`, 'success');
            
            return adminIds;
        } catch (error) {
            console.error('❌ Error eliminando usuarios admin:', error);
            window.authManager.showMessage('Error al eliminar usuarios admin: ' + error.message, 'error');
            throw error;
        }
    }
}

// Inicializar gestor de autenticación con Firebase
window.authManager = new FirebaseAuthManager();

// Funciones globales de debugging (disponibles en consola)
window.debugAuth = () => {
    if (window.authManager) {
        window.authManager.debugAuthSystem();
    } else {
        console.error('❌ AuthManager no está disponible');
    }
};

window.testButton = (buttonId) => {
    if (window.authManager) {
        window.authManager.simulateClick(buttonId);
    } else {
        console.error('❌ AuthManager no está disponible');
    }
};

// Función para crear admin con credenciales personalizadas
window.createCustomAdmin = async (email, password, nombre = 'Administrador') => {
    if (!window.authManager) {
        console.error('❌ AuthManager no está disponible');
        return;
    }
    
    if (!email || !password) {
        console.error('❌ Email y contraseña son requeridos');
        return;
    }
    
    try {
        const user = await window.authManager.createAdminUser(email, password);
        if (user) {
            // Actualizar el nombre si se proporcionó uno personalizado
            if (nombre !== 'Administrador') {
                await window.authManager.db.collection('users').doc(user.uid).update({
                    nombre: nombre
                });
                console.log('✅ Nombre del admin actualizado:', nombre);
            }
        }
        return user;
    } catch (error) {
        console.error('❌ Error creando admin personalizado:', error);
        throw error;
    }
};

// Función para verificar el estado de Firebase
window.checkFirebaseStatus = () => {
    console.log('🔍 VERIFICANDO ESTADO DE FIREBASE:');
    console.log('- Firebase Auth:', window.firebaseAuth ? '✅ Disponible' : '❌ No disponible');
    console.log('- Firebase DB:', window.firebaseDB ? '✅ Disponible' : '❌ No disponible');
    console.log('- Auth Manager:', window.authManager ? '✅ Disponible' : '❌ No disponible');
    
    if (window.authManager) {
        console.log('- Auth Manager Auth:', window.authManager.auth ? '✅ Disponible' : '❌ No disponible');
        console.log('- Auth Manager DB:', window.authManager.db ? '✅ Disponible' : '❌ No disponible');
    }
    
    // Verificar configuración
    if (window.firebaseAuth) {
        console.log('- Proyecto Firebase:', window.firebaseAuth.app.options.projectId);
    }
};

// Log de inicialización
console.log('🚀 AuthManager creado. Usa debugAuth() en la consola para ver el estado del sistema.');
console.log('🧪 Usa testButton("loginBtn") para probar botones específicos.');
console.log('👑 Para crear admin: FirebaseAuthManager.createNewAdmin() o createCustomAdmin(email, password, nombre)');
console.log('🔍 Para verificar Firebase: checkFirebaseStatus()');

// ===== FUNCIONES PARA EL NUEVO DISEÑO DE LOGIN =====

// Función para toggle de visibilidad de contraseña
window.togglePasswordVisibility = function(inputId = 'loginPassword') {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = passwordInput.parentElement.querySelector('.password-toggle');
    
    if (!passwordInput || !toggleButton) {
        console.error('❌ No se encontró el campo de contraseña o el botón toggle');
        return;
    }
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L3.28,3L21.72,21.44L20.44,22.71L17.45,19.72C15.72,21.08 13.96,22 12,22C6.47,22 2,17.5 2,12C2,10.96 2.29,9.93 2.81,9L2,4.27M12,4A5,5 0 0,1 17,9C17,9.79 16.8,10.53 16.47,11.2L20.44,15.27C20.96,14.34 21.25,13.31 21.25,12.28C21.25,6.78 16.72,2.25 11.22,2.25C10.19,2.25 9.16,2.54 8.23,3.06L11.2,7.03C11.87,6.7 12.61,6.5 13.4,6.5C14.44,6.5 15.47,6.79 16.4,7.31L19.44,4.27C18.5,3.75 17.47,3.46 16.44,3.46C15.41,3.46 14.38,3.75 13.45,4.27L12,4.27Z"/>
            </svg>
        `;
    } else {
        passwordInput.type = 'password';
        toggleButton.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
            </svg>
        `;
    }
};

// ===== FUNCIONES PARA EL REGISTRO EN PASOS =====

// Función para ir al siguiente paso del registro
window.nextRegisterStep = function() {
    const currentStep = document.querySelector('.register-step:not([style*="display: none"])');
    const nextStep = currentStep.nextElementSibling;
    
    if (nextStep && nextStep.classList.contains('register-step')) {
        // Validar campos del paso actual
        const requiredFields = currentStep.querySelectorAll('input[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        // Validaciones específicas por paso
        const currentStepId = currentStep.id;
        
        if (currentStepId === 'registerStep1') {
            // Validar abreviatura (máximo 10 caracteres)
            const abreviatura = document.getElementById('registerAbreviatura');
            if (abreviatura && abreviatura.value.length > 10) {
                abreviatura.classList.add('error');
                isValid = false;
                alert('La abreviatura no puede tener más de 10 caracteres');
                return;
            }
        }
        
        if (currentStepId === 'registerStep2') {
            // Validar DNI (8 dígitos)
            const dni = document.getElementById('registerDniRepresentante');
            if (dni && !/^\d{8}$/.test(dni.value)) {
                dni.classList.add('error');
                isValid = false;
                alert('El DNI debe tener exactamente 8 dígitos');
                return;
            }
        }
        
        if (currentStepId === 'registerStep3') {
            // Validar email
            const email = document.getElementById('registerEmail');
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
                email.classList.add('error');
                isValid = false;
                alert('Por favor ingresa un email válido');
                return;
            }
            
            // Validar que las contraseñas coincidan
            const password = document.getElementById('registerPassword');
            const confirmPassword = document.getElementById('registerConfirmPassword');
            
            if (password && confirmPassword && password.value !== confirmPassword.value) {
                confirmPassword.classList.add('error');
                isValid = false;
                alert('Las contraseñas no coinciden');
                return;
            }
            
            // Validar longitud mínima de contraseña
            if (password && password.value.length < 6) {
                password.classList.add('error');
                isValid = false;
                alert('La contraseña debe tener al menos 6 caracteres');
                return;
            }
        }
        
        if (!isValid) {
            alert('Por favor completa todos los campos requeridos correctamente');
            return;
        }
        
        // Ocultar paso actual y mostrar siguiente
        currentStep.style.display = 'none';
        nextStep.style.display = 'block';
        
        // Determinar el número del siguiente paso
        const currentStepNumber = parseInt(currentStepId.replace('registerStep', ''));
        const nextStepNumber = currentStepNumber + 1;
        
        // Actualizar indicador de progreso (removido)
        // updateRegisterProgress(nextStepNumber);
        
        console.log(`✅ Paso ${currentStepNumber} completado, mostrando paso ${nextStepNumber}`);
    }
};

// Función para ir al paso anterior del registro
window.prevRegisterStep = function() {
    const currentStep = document.querySelector('.register-step:not([style*="display: none"])');
    const prevStep = currentStep.previousElementSibling;
    
    if (prevStep && prevStep.classList.contains('register-step')) {
        // Ocultar paso actual y mostrar anterior
        currentStep.style.display = 'none';
        prevStep.style.display = 'block';
        
        // Determinar el número del paso anterior
        const currentStepId = currentStep.id;
        const currentStepNumber = parseInt(currentStepId.replace('registerStep', ''));
        const prevStepNumber = currentStepNumber - 1;
        
        // Actualizar indicador de progreso (removido)
        // updateRegisterProgress(prevStepNumber);
        
        console.log(`✅ Volviendo al paso ${prevStepNumber}`);
    }
};



// Función para resetear el formulario de registro
window.resetRegisterForm = function() {
    const steps = document.querySelectorAll('.register-step');
    steps.forEach((step, index) => {
        if (index === 0) {
            step.style.display = 'block';
        } else {
            step.style.display = 'none';
        }
    });
    
    // Limpiar campos
    const inputs = document.querySelectorAll('#registerForm input');
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('error');
    });
    
    // Resetear indicador de progreso (removido)
    // updateRegisterProgress(1);
    
    // Limpiar preview de foto si existe
    const photoPreview = document.getElementById('registerPhotoPreview');
    if (photoPreview) {
        photoPreview.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
            </svg>
        `;
    }
    
    // Ocultar botón de quitar foto
    const removePhotoBtn = document.getElementById('removeRegisterPhotoBtn');
    if (removePhotoBtn) {
        removePhotoBtn.style.display = 'none';
    }
    
    console.log('✅ Formulario de registro reseteado');
};

// Función para login con Google
window.handleGoogleLogin = async function() {
    if (!window.authManager || !window.authManager.auth) {
        console.error('❌ AuthManager no está disponible');
        window.authManager?.showMessage('Error: Sistema de autenticación no disponible', 'error');
        return;
    }
    
    try {
        console.log('🔐 Iniciando login con Google...');
        
        // Mostrar estado de carga
        window.authManager.setLoading(true);
        
        // Configurar el proveedor de Google
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        // Intentar login con Google
        const result = await window.authManager.auth.signInWithPopup(provider);
        
        if (result.user) {
            console.log('✅ Login con Google exitoso:', result.user.email);
            
            // Cerrar modal de login
            document.getElementById('loginModal').style.display = 'none';
            
            // Mostrar mensaje de bienvenida
            window.authManager.showMessage(`¡Bienvenido ${result.user.displayName || result.user.email}!`, 'success');
            
            // Los datos del usuario se cargarán automáticamente a través del listener de auth
        }
        
    } catch (error) {
        console.error('❌ Error en login con Google:', error);
        
        let errorMessage = 'Error al iniciar sesión con Google';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = 'Inicio de sesión cancelado';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'El popup fue bloqueado. Permite popups para este sitio';
                break;
            case 'auth/account-exists-with-different-credential':
                errorMessage = 'Ya existe una cuenta con este email usando otro método de inicio de sesión';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Error de conexión. Verifica tu conexión a internet';
                break;
            default:
                errorMessage = 'Error al iniciar sesión con Google: ' + error.message;
        }
        
        window.authManager.showMessage(errorMessage, 'error');
        
    } finally {
        window.authManager.setLoading(false);
    }
}; 