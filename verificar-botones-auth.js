// Script para verificar que todos los botones de autenticación estén presentes
// Copia y pega este código en la consola del navegador (F12)

console.log('🔍 Verificando botones de autenticación...');

// Función para verificar botones requeridos
function verificarBotonesAuth() {
    console.log('\n📋 Verificación de botones de autenticación');
    console.log('=====================================');
    
    // Botones requeridos
    const botonesRequeridos = [
        { id: 'loginBtn', nombre: 'Login (Desktop)', tipo: 'desktop' },
        { id: 'registerBtn', nombre: 'Register (Desktop)', tipo: 'desktop' },
        { id: 'logoutBtn', nombre: 'Logout (Desktop)', tipo: 'desktop' },
        { id: 'perfilBtn', nombre: 'Perfil (Desktop)', tipo: 'desktop' },
        { id: 'mobileLoginBtn', nombre: 'Login (Mobile)', tipo: 'mobile' },
        { id: 'mobileRegisterBtn', nombre: 'Register (Mobile)', tipo: 'mobile' },
        { id: 'mobileLogoutBtn', nombre: 'Logout (Mobile)', tipo: 'mobile' }
    ];
    
    const resultados = [];
    
    botonesRequeridos.forEach(boton => {
        const elemento = document.getElementById(boton.id);
        
        if (elemento) {
            console.log(`✅ ${boton.nombre}: Presente`);
            
            // Verificar si está visible
            const esVisible = !elemento.classList.contains('hidden') && 
                             elemento.style.display !== 'none' && 
                             elemento.offsetParent !== null;
            
            if (esVisible) {
                console.log(`   👁️ ${boton.nombre}: Visible`);
            } else {
                console.log(`   👁️ ${boton.nombre}: Oculto (normal)`);
            }
            
            // Verificar si tiene event listeners
            const tieneListeners = elemento.onclick !== null || 
                                  elemento.getAttribute('onclick') !== null;
            
            if (tieneListeners) {
                console.log(`   🎯 ${boton.nombre}: Con listeners`);
            } else {
                console.log(`   ⚠️ ${boton.nombre}: Sin listeners (se configuran en JS)`);
            }
            
            resultados.push({ ...boton, presente: true, visible: esVisible, listeners: tieneListeners });
            
        } else {
            console.log(`❌ ${boton.nombre}: FALTANTE`);
            resultados.push({ ...boton, presente: false, visible: false, listeners: false });
        }
    });
    
    return resultados;
}

// Función para verificar elementos críticos
function verificarElementosCriticos() {
    console.log('\n🔧 Verificación de elementos críticos');
    console.log('=====================================');
    
    const elementosCriticos = [
        { id: 'loginModal', nombre: 'Modal de Login' },
        { id: 'registerModal', nombre: 'Modal de Register' },
        { id: 'loginForm', nombre: 'Formulario de Login' },
        { id: 'registerForm', nombre: 'Formulario de Register' },
        { id: 'userInfo', nombre: 'Info de Usuario' },
        { id: 'mobileUserInfo', nombre: 'Info de Usuario (Mobile)' }
    ];
    
    const resultados = [];
    
    elementosCriticos.forEach(elemento => {
        const el = document.getElementById(elemento.id);
        
        if (el) {
            console.log(`✅ ${elemento.nombre}: Presente`);
            resultados.push({ ...elemento, presente: true });
        } else {
            console.log(`❌ ${elemento.nombre}: FALTANTE`);
            resultados.push({ ...elemento, presente: false });
        }
    });
    
    return resultados;
}

// Función para verificar campos de formulario
function verificarCamposFormulario() {
    console.log('\n📝 Verificación de campos de formulario');
    console.log('=====================================');
    
    const camposLogin = [
        { id: 'loginEmail', nombre: 'Email (Login)' },
        { id: 'loginPassword', nombre: 'Password (Login)' }
    ];
    
    const camposRegister = [
        { id: 'registerNombre', nombre: 'Nombre (Register)' },
        { id: 'registerAbreviatura', nombre: 'Abreviatura (Register)' },
        { id: 'registerRepresentante', nombre: 'Representante (Register)' },
        { id: 'registerDniRepresentante', nombre: 'DNI Representante (Register)' },
        { id: 'registerPassword', nombre: 'Password (Register)' },
        { id: 'registerConfirmPassword', nombre: 'Confirmar Password (Register)' }
    ];
    
    const todosLosCampos = [...camposLogin, ...camposRegister];
    const resultados = [];
    
    todosLosCampos.forEach(campo => {
        const el = document.getElementById(campo.id);
        
        if (el) {
            console.log(`✅ ${campo.nombre}: Presente`);
            resultados.push({ ...campo, presente: true });
        } else {
            console.log(`❌ ${campo.nombre}: FALTANTE`);
            resultados.push({ ...campo, presente: false });
        }
    });
    
    return resultados;
}

// Función para probar funcionalidad de botones
async function probarFuncionalidadBotones() {
    console.log('\n🧪 Prueba de funcionalidad de botones');
    console.log('=====================================');
    
    try {
        // Verificar si authManager está disponible
        if (!window.authManager) {
            console.log('❌ AuthManager no está disponible');
            return false;
        }
        
        console.log('✅ AuthManager disponible');
        
        // Verificar si los botones tienen event listeners configurados
        const botones = ['loginBtn', 'registerBtn', 'logoutBtn', 'perfilBtn'];
        
        botones.forEach(id => {
            const boton = document.getElementById(id);
            if (boton) {
                // Verificar si tiene onclick configurado
                const tieneOnclick = boton.onclick !== null || boton.getAttribute('onclick') !== null;
                
                if (tieneOnclick) {
                    console.log(`✅ ${id}: Con onclick configurado`);
                } else {
                    console.log(`⚠️ ${id}: Sin onclick (se configura en JS)`);
                }
            }
        });
        
        return true;
        
    } catch (error) {
        console.log(`❌ Error probando funcionalidad: ${error.message}`);
        return false;
    }
}

// Función para mostrar resumen
function mostrarResumen(botones, elementos, campos, funcionalidad) {
    console.log('\n📊 RESUMEN DE VERIFICACIÓN');
    console.log('=====================================');
    
    const botonesPresentes = botones.filter(b => b.presente).length;
    const botonesTotal = botones.length;
    
    const elementosPresentes = elementos.filter(e => e.presente).length;
    const elementosTotal = elementos.length;
    
    const camposPresentes = campos.filter(c => c.presente).length;
    const camposTotal = campos.length;
    
    console.log(`🎯 Botones de autenticación: ${botonesPresentes}/${botonesTotal}`);
    console.log(`🔧 Elementos críticos: ${elementosPresentes}/${elementosTotal}`);
    console.log(`📝 Campos de formulario: ${camposPresentes}/${camposTotal}`);
    console.log(`🧪 Funcionalidad: ${funcionalidad ? '✅ OK' : '❌ Problemas'}`);
    
    // Mostrar botones faltantes
    const botonesFaltantes = botones.filter(b => !b.presente);
    if (botonesFaltantes.length > 0) {
        console.log('\n❌ Botones faltantes:');
        botonesFaltantes.forEach(b => {
            console.log(`   - ${b.nombre} (${b.id})`);
        });
    }
    
    // Mostrar elementos faltantes
    const elementosFaltantes = elementos.filter(e => !e.presente);
    if (elementosFaltantes.length > 0) {
        console.log('\n❌ Elementos críticos faltantes:');
        elementosFaltantes.forEach(e => {
            console.log(`   - ${e.nombre} (${e.id})`);
        });
    }
    
    // Mostrar campos faltantes
    const camposFaltantes = campos.filter(c => !c.presente);
    if (camposFaltantes.length > 0) {
        console.log('\n❌ Campos de formulario faltantes:');
        camposFaltantes.forEach(c => {
            console.log(`   - ${c.nombre} (${c.id})`);
        });
    }
    
    // Conclusión
    const todoOK = botonesPresentes === botonesTotal && 
                   elementosPresentes === elementosTotal && 
                   camposPresentes === camposTotal && 
                   funcionalidad;
    
    if (todoOK) {
        console.log('\n🎉 ¡Todos los elementos están presentes y funcionando!');
        console.log('✅ El sistema de autenticación está completo');
    } else {
        console.log('\n⚠️ Se encontraron elementos faltantes o problemas');
        console.log('🔧 Revisa los elementos faltantes y agrégalos al HTML');
    }
    
    return todoOK;
}

// Función principal
async function ejecutarVerificacionCompleta() {
    console.log('\n🔍 VERIFICACIÓN COMPLETA DE AUTENTICACIÓN');
    console.log('=====================================');
    
    // Ejecutar todas las verificaciones
    const botones = verificarBotonesAuth();
    const elementos = verificarElementosCriticos();
    const campos = verificarCamposFormulario();
    const funcionalidad = await probarFuncionalidadBotones();
    
    // Mostrar resumen
    const resultado = mostrarResumen(botones, elementos, campos, funcionalidad);
    
    return resultado;
}

// Ejecutar verificación automáticamente
ejecutarVerificacionCompleta();

// Hacer funciones disponibles globalmente
window.ejecutarVerificacionCompleta = ejecutarVerificacionCompleta;
window.verificarBotonesAuth = verificarBotonesAuth;
window.verificarElementosCriticos = verificarElementosCriticos;
window.verificarCamposFormulario = verificarCamposFormulario;
window.probarFuncionalidadBotones = probarFuncionalidadBotones;

console.log('\n🔍 Script de verificación cargado');
console.log('📝 Usa ejecutarVerificacionCompleta() para verificar todo'); 