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
            // Obtener datos adicionales del usuario desde Firestore
            const userDoc = await this.db.collection('users').doc(firebaseUser.uid).get();
            
            if (userDoc.exists) {
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...userDoc.data()
                };
            } else {
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
            }
        } catch (error) {
            console.error('Error cargando datos del usuario:', error);
            this.showMessage('Error cargando datos del usuario', 'error');
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
                    e.target.closest('.modal').style.display = 'none';
                });
            });
            console.log(`✅ ${closeButtons.length} botones de cerrar configurados`);
        }

        // Cerrar modal haciendo clic fuera
        const modals = document.querySelectorAll('.modal');
        if (modals.length > 0) {
            modals.forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
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
            { id: 'heroLoginBtn', action: () => this.showLoginModal(), name: 'Hero Login' },
            { id: 'heroRegisterBtn', action: () => this.showRegisterModal(), name: 'Hero Register' },
            { id: 'logoutBtn', action: () => this.logout(), name: 'Logout' },
            { id: 'mobileLoginBtn', action: () => this.showLoginModal(), name: 'Mobile Login' },
            { id: 'mobileRegisterBtn', action: () => this.showRegisterModal(), name: 'Mobile Register' },
            { id: 'mobileLogoutBtn', action: () => this.logout(), name: 'Mobile Logout' },
            { id: 'perfilBtn', action: () => this.showPerfil(), name: 'Perfil' }
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
        
        if (registerNombre) {
            registerNombre.focus();
        }
        
        // Cerrar menú móvil si está abierto
        if (window.mobileMenuManager && window.mobileMenuManager.isOpen) {
            window.mobileMenuManager.closeMenu();
        }
        
        console.log('✅ Modal de registro abierto');
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
            
            // Crear documento del usuario en Firestore con todos los campos
            await this.db.collection('users').doc(user.uid).set({
                nombre: nombre,
                abreviatura: abreviatura.toUpperCase(),
                representante: representante,
                dniRepresentante: dniRepresentante,
                telefono: telefono || null,
                email: email || null,
                emailAuth: emailParaAuth, // Email usado para autenticación
                tipo: 'academia',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('registerModal').style.display = 'none';
            document.getElementById('registerForm').reset();
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
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (userInfo) {
                userInfo.classList.remove('hidden');
                userInfo.textContent = this.currentUser.tipo === 'admin' ? 
                    `${this.currentUser.nombre} (${this.currentUser.tipo})` : 
                    `${this.currentUser.abreviatura || this.currentUser.nombre}`;
            }

            // Mostrar botón de perfil solo para academias
            if (perfilBtn) {
                if (this.currentUser.tipo === 'academia') {
                    perfilBtn.classList.remove('hidden');
                } else {
                    perfilBtn.classList.add('hidden');
                }
            }

            // Actualizar menú móvil
            if (window.mobileMenuManager) {
                window.mobileMenuManager.updateAuthState(true, this.currentUser.tipo === 'admin' ? 
                    `${this.currentUser.nombre} (${this.currentUser.tipo})` : 
                    `${this.currentUser.abreviatura || this.currentUser.nombre}`);
            }

            // Ocultar página principal
            homePage.classList.remove('active');

            // Mostrar dashboard correspondiente
            if (this.currentUser.tipo === 'admin') {
                if (adminPanel) {
                    adminPanel.classList.add('active');
                    console.log('✅ Panel de admin activado');
                }
                if (academiaDashboard) academiaDashboard.classList.remove('active');
                
                // Inicializar panel de administrador
                this.waitForManager('adminManager').then(() => {
                    if (window.adminManager) {
                        window.adminManager.init();
                    }
                }).catch(error => {
                    console.error('❌ Error inicializando adminManager:', error);
                });
            } else {
                if (academiaDashboard) {
                    academiaDashboard.classList.add('active');
                    console.log('✅ Dashboard de academia activado');
                }
                if (adminPanel) adminPanel.classList.remove('active');
                
                // Inicializar dashboard de academia
                this.waitForManager('dashboardManager').then(() => {
                    if (window.dashboardManager) {
                        window.dashboardManager.init();
                    }
                }).catch(error => {
                    console.error('❌ Error inicializando dashboardManager:', error);
                });
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

            // Actualizar menú móvil
            if (window.mobileMenuManager) {
                window.mobileMenuManager.updateAuthState(false);
            }

            // Mostrar solo página principal
            homePage.classList.add('active');
            if (academiaDashboard) academiaDashboard.classList.remove('active');
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.toastStyles = data.toastStyles;
            return this.toastStyles;
        } catch (error) {
            console.warn('No se pudieron cargar los estilos de toast desde toast.json, usando estilos por defecto:', error.message);
            // Fallback a estilos básicos
            return {
                base: {
                    backgroundColor: "#1A1A1A",
                    textColor: "#F8F8F8",
                    fontFamily: "Inter, sans-serif",
                    borderRadius: "6px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                    padding: "16px",
                    iconSize: "24px",
                    fontSize: "14px"
                },
                states: {
                    success: { 
                        icon: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'></path><polyline points='22 4 12 14.01 9 11.01'></polyline></svg>", 
                        iconColor: "#aa9072", 
                        progressColor: "#aa9072" 
                    },
                    error: { 
                        icon: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><line x1='15' y1='9' x2='9' y2='15'></line><line x1='9' y1='9' x2='15' y2='15'></line></svg>", 
                        iconColor: "#aa9072", 
                        progressColor: "#aa9072" 
                    },
                    warning: { 
                        icon: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'></path><line x1='12' y1='9' x2='12' y2='13'></line><line x1='12' y1='17' x2='12.01' y2='17'></line></svg>", 
                        iconColor: "#aa9072", 
                        progressColor: "#aa9072" 
                    },
                    info: { 
                        icon: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><line x1='12' y1='16' x2='12' y2='12'></line><line x1='12' y1='8' x2='12.01' y2='8'></line></svg>", 
                        iconColor: "#aa9072", 
                        progressColor: "#aa9072" 
                    },
                    custom: { 
                        icon: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'></path></svg>", 
                        iconColor: "#aa9072", 
                        progressColor: "#aa9072" 
                    }
                }
            };
        }
    }

    async showMessage(message, type = 'info', duration = 4000) {
        console.log(`📢 Mensaje ${type.toUpperCase()}:`, message);
        
        try {
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

        // Guardar el tiempo de inicio para calcular el tiempo restante
        const startTime = Date.now();

        return messageDiv;
        } catch (error) {
            console.error('Error mostrando mensaje toast:', error);
            // Fallback a alert básico si falla el toast
            alert(`${type.toUpperCase()}: ${message}`);
        }
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

            // Check if user already exists
            try {
                const userCredential = await this.auth.signInWithEmailAndPassword(
                    String(email).trim(),
                    String(password).trim()
                );
                console.log('✅ Admin user already exists:', userCredential.user.uid);
                this.showMessage('El usuario admin ya existe', 'info');
                return userCredential.user;
            } catch (signInError) {
                // If sign in fails, user doesn't exist, so create it
                if (signInError.code === 'auth/user-not-found') {
                    // Create user in Firebase Auth
                    const userCredential = await this.auth.createUserWithEmailAndPassword(
                        String(email).trim(),
                        String(password).trim()
                    );
                    
                    const user = userCredential.user;

                    // Set admin data in Firestore
                    await this.db.collection('users').doc(user.uid).set({
                        email: email,
                        tipo: 'admin',
                        nombre: 'Admin Principal',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    console.log('✅ Admin user created successfully:', user.uid);
                    this.showMessage('Usuario admin creado exitosamente', 'success');
                    return user;
                } else {
                    throw signInError; // Re-throw if it's a different error
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
        const managers = ['authManager', 'dashboardManager', 'adminManager', 'eventsManager', 'publicEventsManager'];
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

    // Temporary function to create admin - REMOVE AFTER USE
    static async createNewAdmin() {
        if (!window.authManager || !window.authManager.auth || !window.authManager.db) {
            console.error('❌ Auth Manager not initialized');
            return;
        }
        try {
            const email = 'admin2@mexxusarena.com';
            const password = 'admin123';
            
            // Create user in Firebase Auth
            const userCredential = await window.authManager.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Set admin data in Firestore
            await window.authManager.db.collection('users').doc(user.uid).set({
                email: email,
                tipo: 'admin',
                nombre: 'Admin 2',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ New admin user created successfully:', user.uid);
            window.authManager.showMessage('Usuario admin creado exitosamente', 'success');
            return user;
        } catch (error) {
            console.error('❌ Error creating admin:', error);
            window.authManager.showMessage('Error al crear usuario admin: ' + error.message, 'error');
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
                console.log('ℹ️ No se encontraron usuarios admin');
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

// Log de inicialización
console.log('🚀 AuthManager creado. Usa debugAuth() en la consola para ver el estado del sistema.');
console.log('🧪 Usa testButton("loginBtn") para probar botones específicos.'); 