// Script de diagnóstico para el error 400 de Firestore
// Copia y pega este código en la consola del navegador (F12)

console.log('🔍 Iniciando diagnóstico del error 400 de Firestore...');

// Función para verificar la configuración de Firebase
function verificarConfiguracionFirebase() {
    console.log('\n📋 Verificación de configuración Firebase');
    console.log('=====================================');
    
    try {
        // Verificar si Firebase está disponible
        if (typeof firebase === 'undefined') {
            console.log('❌ Firebase no está cargado');
            return false;
        }
        
        console.log('✅ Firebase está cargado');
        
        // Verificar configuración
        if (window.firebaseDB) {
            console.log('✅ Firestore DB está disponible');
        } else {
            console.log('❌ Firestore DB no está disponible');
            return false;
        }
        
        if (window.firebaseAuth) {
            console.log('✅ Firebase Auth está disponible');
        } else {
            console.log('❌ Firebase Auth no está disponible');
        }
        
        // Verificar configuración del proyecto
        const config = firebase.app().options;
        console.log(`📊 Proyecto ID: ${config.projectId}`);
        console.log(`🌐 Auth Domain: ${config.authDomain}`);
        console.log(`🔑 API Key: ${config.apiKey ? 'Configurada' : 'No configurada'}`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Error verificando configuración: ${error.message}`);
        return false;
    }
}

// Función para verificar el estado de autenticación
async function verificarAutenticacion() {
    console.log('\n🔐 Verificación de autenticación');
    console.log('=====================================');
    
    try {
        const currentUser = window.authManager.getCurrentUser();
        
        if (currentUser) {
            console.log(`✅ Usuario autenticado: ${currentUser.email}`);
            console.log(`🆔 UID: ${currentUser.uid}`);
            console.log(`📧 Email verificado: ${currentUser.emailVerified}`);
            
            // Verificar token de autenticación
            const token = await currentUser.getIdToken();
            console.log(`🎫 Token válido: ${token ? 'Sí' : 'No'}`);
            
            return true;
        } else {
            console.log('⚠️ Usuario no autenticado');
            console.log('💡 Esto puede causar problemas de permisos');
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Error verificando autenticación: ${error.message}`);
        return false;
    }
}

// Función para probar conexión básica a Firestore
async function probarConexionFirestore() {
    console.log('\n🌐 Prueba de conexión a Firestore');
    console.log('=====================================');
    
    try {
        // Prueba simple de lectura
        console.log('🔍 Probando lectura básica...');
        const testSnapshot = await window.firebaseDB.collection('eventos').limit(1).get();
        console.log(`✅ Conexión exitosa - ${testSnapshot.size} documentos leídos`);
        return true;
        
    } catch (error) {
        console.log(`❌ Error de conexión: ${error.message}`);
        console.log(`🔍 Código de error: ${error.code}`);
        
        if (error.code === 'permission-denied') {
            console.log('💡 Problema de permisos - verifica las reglas de Firestore');
        } else if (error.code === 'unavailable') {
            console.log('💡 Problema de conectividad - verifica tu conexión a internet');
        } else if (error.code === 'invalid-argument') {
            console.log('💡 Problema de configuración - verifica la configuración de Firebase');
        }
        
        return false;
    }
}

// Función para verificar las reglas de Firestore
async function verificarReglasFirestore() {
    console.log('\n📜 Verificación de reglas de Firestore');
    console.log('=====================================');
    
    try {
        // Probar lectura de eventos (debería ser pública)
        console.log('🔍 Probando lectura de eventos...');
        await window.firebaseDB.collection('eventos').limit(1).get();
        console.log('✅ Lectura de eventos: Permitida');
        
        // Probar lectura de inscripciones (debería ser pública)
        console.log('🔍 Probando lectura de inscripciones...');
        await window.firebaseDB.collection('inscripciones').limit(1).get();
        console.log('✅ Lectura de inscripciones: Permitida');
        
        // Probar lectura de usuarios (debería ser pública)
        console.log('🔍 Probando lectura de usuarios...');
        await window.firebaseDB.collection('users').limit(1).get();
        console.log('✅ Lectura de usuarios: Permitida');
        
        // Probar lectura de atletas (solo si está autenticado)
        const currentUser = window.authManager.getCurrentUser();
        if (currentUser) {
            console.log('🔍 Probando lectura de atletas...');
            await window.firebaseDB.collection('atletas')
                .where('academiaId', '==', currentUser.uid)
                .limit(1)
                .get();
            console.log('✅ Lectura de atletas: Permitida');
        } else {
            console.log('⚠️ Usuario no autenticado - omitiendo prueba de atletas');
        }
        
        return true;
        
    } catch (error) {
        console.log(`❌ Error en reglas: ${error.message}`);
        console.log(`🔍 Código de error: ${error.code}`);
        return false;
    }
}

// Función para verificar el estado de la red
function verificarRed() {
    console.log('\n🌐 Verificación de conectividad');
    console.log('=====================================');
    
    if (navigator.onLine) {
        console.log('✅ Conexión a internet: Activa');
    } else {
        console.log('❌ Conexión a internet: Inactiva');
        return false;
    }
    
    // Verificar si podemos acceder a Firebase
    fetch('https://firestore.googleapis.com/')
        .then(response => {
            if (response.ok) {
                console.log('✅ Acceso a Firestore API: Disponible');
            } else {
                console.log(`⚠️ Acceso a Firestore API: ${response.status} ${response.statusText}`);
            }
        })
        .catch(error => {
            console.log(`❌ Error accediendo a Firestore API: ${error.message}`);
        });
    
    return true;
}

// Función para limpiar caché y reconectar
async function limpiarCachéYReconectar() {
    console.log('\n🧹 Limpieza de caché y reconexión');
    console.log('=====================================');
    
    try {
        // Verificar si Firestore está disponible
        if (!window.firebaseDB) {
            console.log('❌ Firestore no está disponible');
            return false;
        }
        
        // Verificar si ya está desconectado
        console.log('🔍 Verificando estado de Firestore...');
        
        try {
            // Intentar desconectar Firestore
            console.log('🔌 Desconectando Firestore...');
            await window.firebaseDB.terminate();
            console.log('✅ Firestore desconectado exitosamente');
        } catch (terminateError) {
            if (terminateError.message.includes('already been terminated')) {
                console.log('⚠️ Firestore ya estaba desconectado');
            } else {
                console.log(`⚠️ Error al desconectar: ${terminateError.message}`);
            }
        }
        
        // Esperar un momento
        console.log('⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reconectar
        console.log('🔌 Reconectando Firestore...');
        try {
            await window.firebaseDB.enableNetwork();
            console.log('✅ Firestore reconectado exitosamente');
        } catch (enableError) {
            console.log(`⚠️ Error al reconectar: ${enableError.message}`);
            
            // Intentar reinicializar si es necesario
            console.log('🔄 Intentando reinicializar Firestore...');
            try {
                // Reinicializar Firestore
                const newDB = firebase.firestore();
                window.firebaseDB = newDB;
                console.log('✅ Firestore reinicializado');
            } catch (initError) {
                console.log(`❌ Error al reinicializar: ${initError.message}`);
                return false;
            }
        }
        
        // Probar conexión
        console.log('🧪 Probando conexión...');
        try {
            const testSnapshot = await window.firebaseDB.collection('eventos').limit(1).get();
            console.log(`✅ Conexión exitosa - ${testSnapshot.size} documentos leídos`);
        } catch (testError) {
            console.log(`❌ Error en prueba de conexión: ${testError.message}`);
            return false;
        }
        
        console.log('🎉 Reconexión completada exitosamente');
        return true;
        
    } catch (error) {
        console.log(`❌ Error general en reconexión: ${error.message}`);
        return false;
    }
}

// Función principal de diagnóstico
async function ejecutarDiagnosticoCompleto() {
    console.log('\n🔍 DIAGNÓSTICO COMPLETO DEL ERROR 400');
    console.log('=====================================');
    
    const resultados = [];
    
    // Ejecutar verificaciones
    resultados.push(verificarConfiguracionFirebase());
    resultados.push(await verificarAutenticacion());
    resultados.push(await probarConexionFirestore());
    resultados.push(await verificarReglasFirestore());
    resultados.push(verificarRed());
    
    // Mostrar resumen
    const exitosas = resultados.filter(r => r).length;
    const total = resultados.length;
    
    console.log('\n📊 RESUMEN DEL DIAGNÓSTICO');
    console.log('=====================================');
    console.log(`✅ Verificaciones exitosas: ${exitosas}/${total}`);
    
    if (exitosas === total) {
        console.log('\n🎉 ¡Todo parece estar funcionando correctamente!');
        console.log('💡 El error 400 puede ser temporal. Intenta:');
        console.log('   1. Recargar la página');
        console.log('   2. Limpiar caché del navegador');
        console.log('   3. Verificar conexión a internet');
    } else {
        console.log('\n⚠️ Se encontraron problemas:');
        console.log('🔧 Soluciones recomendadas:');
        
        if (!resultados[0]) {
            console.log('   - Verificar que Firebase esté cargado correctamente');
        }
        if (!resultados[1]) {
            console.log('   - Iniciar sesión nuevamente');
        }
        if (!resultados[2]) {
            console.log('   - Verificar configuración de Firebase');
        }
        if (!resultados[3]) {
            console.log('   - Actualizar reglas de Firestore');
        }
        if (!resultados[4]) {
            console.log('   - Verificar conexión a internet');
        }
    }
    
    // Ofrecer limpieza de caché
    console.log('\n🧹 ¿Quieres intentar limpiar caché y reconectar?');
    console.log('💡 Ejecuta: limpiarCachéYReconectar()');
}

// Ejecutar diagnóstico automáticamente
ejecutarDiagnosticoCompleto();

// Función alternativa para reconectar sin terminar
async function reconectarSimple() {
    console.log('\n🔄 Reconexión simple de Firestore');
    console.log('=====================================');
    
    try {
        if (!window.firebaseDB) {
            console.log('❌ Firestore no está disponible');
            return false;
        }
        
        // Deshabilitar red temporalmente
        console.log('🔌 Deshabilitando red...');
        await window.firebaseDB.disableNetwork();
        
        // Esperar un momento
        console.log('⏳ Esperando 1 segundo...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Habilitar red nuevamente
        console.log('🔌 Habilitando red...');
        await window.firebaseDB.enableNetwork();
        
        // Probar conexión
        console.log('🧪 Probando conexión...');
        const testSnapshot = await window.firebaseDB.collection('eventos').limit(1).get();
        console.log(`✅ Conexión exitosa - ${testSnapshot.size} documentos leídos`);
        
        console.log('🎉 Reconexión simple completada');
        return true;
        
    } catch (error) {
        console.log(`❌ Error en reconexión simple: ${error.message}`);
        return false;
    }
}

// Función para reinicializar completamente
async function reinicializarFirestore() {
    console.log('\n🔄 Reinicialización completa de Firestore');
    console.log('=====================================');
    
    try {
        // Verificar que Firebase esté disponible
        if (typeof firebase === 'undefined') {
            console.log('❌ Firebase no está disponible');
            return false;
        }
        
        // Crear nueva instancia de Firestore
        console.log('🔄 Creando nueva instancia de Firestore...');
        const newDB = firebase.firestore();
        
        // Configurar la nueva instancia
        newDB.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            experimentalForceLongPolling: true
        });
        
        // Reemplazar la instancia global
        window.firebaseDB = newDB;
        console.log('✅ Nueva instancia de Firestore creada');
        
        // Probar conexión
        console.log('🧪 Probando nueva conexión...');
        const testSnapshot = await newDB.collection('eventos').limit(1).get();
        console.log(`✅ Conexión exitosa - ${testSnapshot.size} documentos leídos`);
        
        console.log('🎉 Reinicialización completada');
        return true;
        
    } catch (error) {
        console.log(`❌ Error en reinicialización: ${error.message}`);
        return false;
    }
}

// Hacer funciones disponibles globalmente
window.ejecutarDiagnosticoCompleto = ejecutarDiagnosticoCompleto;
window.limpiarCachéYReconectar = limpiarCachéYReconectar;
window.reconectarSimple = reconectarSimple;
window.reinicializarFirestore = reinicializarFirestore;
window.verificarConfiguracionFirebase = verificarConfiguracionFirebase;
window.verificarAutenticacion = verificarAutenticacion;
window.probarConexionFirestore = probarConexionFirestore;
window.verificarReglasFirestore = verificarReglasFirestore;

console.log('🔍 Script de diagnóstico cargado');
console.log('📝 Funciones disponibles:');
console.log('   - ejecutarDiagnosticoCompleto() - Diagnóstico completo');
console.log('   - limpiarCachéYReconectar() - Reconexión completa');
console.log('   - reconectarSimple() - Reconexión simple (recomendada)');
console.log('   - reinicializarFirestore() - Reinicialización completa'); 