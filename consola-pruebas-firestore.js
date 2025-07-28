// Script para probar las reglas de Firestore directamente en la consola
// Copia y pega este código en la consola del navegador (F12)

console.log('🧪 Iniciando pruebas de reglas de Firestore...');

// Función para esperar a que Firebase esté disponible
async function waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.firebaseDB && window.firebaseAuth) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    throw new Error('Firebase no disponible');
}

// Función para probar lectura pública de eventos
async function testPublicEventRead() {
    console.log('\n🎯 Prueba 1: Lectura pública de eventos');
    
    try {
        const snapshot = await window.firebaseDB.collection('eventos').limit(1).get();
        const success = !snapshot.empty;
        
        console.log(`   ${success ? '✅' : '⚠️'} Lectura de eventos: ${success ? 'Permitida' : 'No hay eventos'}`);
        return success;
        
    } catch (error) {
        console.log(`   ❌ Error leyendo eventos: ${error.message}`);
        return false;
    }
}

// Función para probar lectura pública de inscripciones
async function testPublicInscripcionesRead() {
    console.log('\n📝 Prueba 2: Lectura pública de inscripciones');
    
    try {
        const snapshot = await window.firebaseDB.collection('inscripciones').limit(1).get();
        console.log(`   ✅ Lectura de inscripciones: Permitida`);
        return true;
        
    } catch (error) {
        console.log(`   ❌ Error leyendo inscripciones: ${error.message}`);
        return false;
    }
}

// Función para probar lectura pública de usuarios
async function testPublicUsersRead() {
    console.log('\n👤 Prueba 3: Lectura pública de usuarios');
    
    try {
        const snapshot = await window.firebaseDB.collection('users').limit(1).get();
        console.log(`   ✅ Lectura de usuarios: Permitida`);
        return true;
        
    } catch (error) {
        console.log(`   ❌ Error leyendo usuarios: ${error.message}`);
        return false;
    }
}

// Función para probar lectura de atletas (solo para usuarios autenticados)
async function testAtletasRead() {
    console.log('\n🏃 Prueba 4: Lectura de atletas (usuario autenticado)');
    
    try {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            console.log(`   ⚠️ Usuario no autenticado - omitiendo prueba`);
            return true; // No es un error si no hay usuario autenticado
        }
        
        const snapshot = await window.firebaseDB.collection('atletas')
            .where('academiaId', '==', currentUser.uid)
            .limit(1)
            .get();
            
        console.log(`   ✅ Lectura de atletas: Permitida (${snapshot.size} atletas encontrados)`);
        return true;
        
    } catch (error) {
        console.log(`   ❌ Error leyendo atletas: ${error.message}`);
        console.log(`   🔍 Código de error: ${error.code}`);
        return false;
    }
}

// Función para probar específicamente el error de eventos públicos
async function testPublicEventsError() {
    console.log('\n🔍 Prueba específica: Error de eventos públicos');
    
    try {
        // Simular exactamente lo que hace PublicEventsManager
        const eventosSnapshot = await window.firebaseDB.collection('eventos')
            .where('fecha', '>', new Date())
            .orderBy('fecha', 'asc')
            .limit(6)
            .get();

        console.log(`   ✅ Eventos cargados: ${eventosSnapshot.size}`);

        // Intentar cargar inscripciones
        const inscripcionesSnapshot = await window.firebaseDB.collection('inscripciones').get();
        console.log(`   ✅ Inscripciones cargadas: ${inscripcionesSnapshot.size}`);

        console.log('   🎉 No hay errores de permisos');
        return true;
        
    } catch (error) {
        console.log(`   ❌ Error detectado: ${error.message}`);
        console.log(`   🔍 Código de error: ${error.code}`);
        
        if (error.code === 'permission-denied') {
            console.log('   💡 Solución: Verifica que las reglas permitan lectura pública');
        }
        return false;
    }
}

// Función principal para ejecutar todas las pruebas
async function ejecutarPruebasFirestore() {
    try {
        await waitForFirebase();
        
        console.log('\n🔍 EJECUTANDO PRUEBAS DE REGLAS...');
        console.log('=====================================');

        const results = [];
        
        // Ejecutar pruebas
        results.push(await testPublicEventRead());
        results.push(await testPublicInscripcionesRead());
        results.push(await testPublicUsersRead());
        results.push(await testAtletasRead());
        
        // Mostrar resumen
        const passedTests = results.filter(r => r).length;
        const totalTests = results.length;
        
        console.log('\n📊 RESULTADOS DE LAS PRUEBAS');
        console.log('=====================================');
        console.log(`✅ Pruebas exitosas: ${passedTests}/${totalTests}`);

        if (passedTests === totalTests) {
            console.log('\n🎉 ¡Todas las reglas funcionan correctamente!');
            console.log('🚀 Puedes usar la aplicación sin problemas.');
        } else {
            console.log('\n⚠️ Algunas reglas necesitan ajustes.');
            console.log('🔧 Revisa los errores y ajusta las reglas según sea necesario.');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando pruebas:', error);
    }
}

// Ejecutar pruebas automáticamente
ejecutarPruebasFirestore();

// También hacer disponible la función específica
window.testPublicEventsError = testPublicEventsError;

console.log('🧪 Script de pruebas cargado');
console.log('📝 Usa testPublicEventsError() para probar específicamente eventos públicos'); 