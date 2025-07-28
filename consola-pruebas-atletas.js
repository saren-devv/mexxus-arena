// Script específico para probar el error de carga de atletas
// Copia y pega este código en la consola del navegador (F12)

console.log('🏃 Iniciando pruebas específicas de atletas...');

// Función para esperar a que Firebase esté disponible
async function waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.firebaseDB && window.authManager) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    throw new Error('Firebase no disponible');
}

// Función para probar el error específico de atletas
async function testAtletasError() {
    console.log('\n🔍 Prueba específica: Error de carga de atletas');
    
    try {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            console.log('   ⚠️ Usuario no autenticado');
            console.log('   💡 Inicia sesión para probar la carga de atletas');
            return false;
        }
        
        console.log(`   👤 Usuario autenticado: ${currentUser.email}`);
        console.log(`   🆔 UID: ${currentUser.uid}`);
        
        // Simular exactamente lo que hace cargarAtletas()
        console.log('   🔍 Intentando cargar atletas...');
        const atletasSnapshot = await window.firebaseDB.collection('atletas')
            .where('academiaId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        console.log(`   ✅ Atletas cargados exitosamente: ${atletasSnapshot.size}`);
        
        if (atletasSnapshot.size > 0) {
            const primerAtleta = atletasSnapshot.docs[0].data();
            console.log(`   📋 Primer atleta: ${primerAtleta.nombres} ${primerAtleta.apellidos}`);
        }
        
        console.log('   🎉 No hay errores de permisos para atletas');
        return true;
        
    } catch (error) {
        console.log(`   ❌ Error detectado: ${error.message}`);
        console.log(`   🔍 Código de error: ${error.code}`);
        
        if (error.code === 'permission-denied') {
            console.log('   💡 Solución: Verifica que las reglas permitan lectura de atletas');
            console.log('   📋 Reglas necesarias:');
            console.log('      - Usuario autenticado');
            console.log('      - academiaId == request.auth.uid');
        } else if (error.code === 'unavailable') {
            console.log('   💡 Solución: Verifica la conexión a Firebase');
        } else {
            console.log('   💡 Solución: Revisa las reglas de Firestore');
        }
        return false;
    }
}

// Función para probar creación de atletas
async function testAtletasCreate() {
    console.log('\n➕ Prueba: Creación de atletas');
    
    try {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            console.log('   ⚠️ Usuario no autenticado - omitiendo prueba');
            return true;
        }
        
        // Crear un atleta de prueba (solo para probar permisos)
        const atletaTest = {
            academiaId: currentUser.uid,
            nombres: 'Test',
            apellidos: 'Atleta',
            dni: '12345678',
            fechaNacimiento: '2000-01-01',
            sexo: 'Masculino',
            edad: 24,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('   🔍 Intentando crear atleta de prueba...');
        const docRef = await window.firebaseDB.collection('atletas').add(atletaTest);
        
        console.log(`   ✅ Atleta creado exitosamente: ${docRef.id}`);
        
        // Eliminar el atleta de prueba
        await docRef.delete();
        console.log('   🗑️ Atleta de prueba eliminado');
        
        return true;
        
    } catch (error) {
        console.log(`   ❌ Error creando atleta: ${error.message}`);
        console.log(`   🔍 Código de error: ${error.code}`);
        return false;
    }
}

// Función para verificar estructura de datos
async function verificarEstructuraAtletas() {
    console.log('\n📊 Verificación de estructura de datos');
    
    try {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            console.log('   ⚠️ Usuario no autenticado - omitiendo verificación');
            return;
        }
        
        const atletasSnapshot = await window.firebaseDB.collection('atletas')
            .where('academiaId', '==', currentUser.uid)
            .limit(3)
            .get();
            
        if (atletasSnapshot.empty) {
            console.log('   📝 No hay atletas registrados');
            return;
        }
        
        console.log(`   📋 Encontrados ${atletasSnapshot.size} atletas:`);
        
        atletasSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`   ${index + 1}. ${data.nombres} ${data.apellidos}`);
            console.log(`      DNI: ${data.dni}`);
            console.log(`      academiaId: ${data.academiaId}`);
            console.log(`      createdAt: ${data.createdAt ? 'Sí' : 'No'}`);
        });
        
    } catch (error) {
        console.log(`   ❌ Error verificando estructura: ${error.message}`);
    }
}

// Función principal
async function ejecutarPruebasAtletas() {
    try {
        await waitForFirebase();
        
        console.log('\n🔍 EJECUTANDO PRUEBAS DE ATLETAS...');
        console.log('=====================================');

        const results = [];
        
        // Ejecutar pruebas
        results.push(await testAtletasError());
        results.push(await testAtletasCreate());
        
        // Verificar estructura
        await verificarEstructuraAtletas();
        
        // Mostrar resumen
        const passedTests = results.filter(r => r).length;
        const totalTests = results.length;
        
        console.log('\n📊 RESULTADOS DE LAS PRUEBAS DE ATLETAS');
        console.log('=====================================');
        console.log(`✅ Pruebas exitosas: ${passedTests}/${totalTests}`);

        if (passedTests === totalTests) {
            console.log('\n🎉 ¡Las reglas de atletas funcionan correctamente!');
            console.log('🚀 Puedes gestionar atletas sin problemas.');
        } else {
            console.log('\n⚠️ Hay problemas con las reglas de atletas.');
            console.log('🔧 Revisa los errores y ajusta las reglas según sea necesario.');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando pruebas de atletas:', error);
    }
}

// Ejecutar pruebas automáticamente
ejecutarPruebasAtletas();

// Hacer disponibles las funciones
window.testAtletasError = testAtletasError;
window.testAtletasCreate = testAtletasCreate;
window.verificarEstructuraAtletas = verificarEstructuraAtletas;

console.log('🏃 Script de pruebas de atletas cargado');
console.log('📝 Usa testAtletasError() para probar específicamente el error de atletas'); 