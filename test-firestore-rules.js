// Script para probar las reglas de Firestore
// Ejecutar en la consola del navegador para verificar permisos

class FirestoreRulesTester {
    constructor() {
        this.db = null;
        this.auth = null;
        this.testResults = [];
    }

    async init() {
        try {
            await this.waitForFirebase();
            this.db = window.firebaseDB;
            this.auth = window.firebaseAuth;
            
            console.log('🧪 Iniciando pruebas de reglas de Firestore...');
            await this.runAllTests();
            
        } catch (error) {
            console.error('❌ Error inicializando tester:', error);
        }
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
        throw new Error('Firebase no disponible');
    }

    async runAllTests() {
        console.log('\n🔍 EJECUTANDO PRUEBAS DE REGLAS...');
        console.log('=====================================');

        // Prueba 1: Lectura pública de eventos
        await this.testPublicEventRead();
        
        // Prueba 2: Lectura pública de inscripciones
        await this.testPublicInscripcionesRead();
        
        // Prueba 3: Lectura pública de usuarios
        await this.testPublicUsersRead();
        
        // Prueba 4: Creación de eventos (requiere autenticación)
        await this.testEventCreation();
        
        // Mostrar resultados
        this.showResults();
    }

    async testPublicEventRead() {
        console.log('\n🎯 Prueba 1: Lectura pública de eventos');
        
        try {
            const snapshot = await this.db.collection('eventos').limit(1).get();
            const success = !snapshot.empty;
            
            this.testResults.push({
                test: 'Lectura pública de eventos',
                success: success,
                message: success ? '✅ Éxito' : '⚠️ No hay eventos para leer'
            });
            
            console.log(`   ${success ? '✅' : '⚠️'} Lectura de eventos: ${success ? 'Permitida' : 'No hay eventos'}`);
            
        } catch (error) {
            this.testResults.push({
                test: 'Lectura pública de eventos',
                success: false,
                message: `❌ Error: ${error.message}`
            });
            
            console.log(`   ❌ Error leyendo eventos: ${error.message}`);
        }
    }

    async testPublicInscripcionesRead() {
        console.log('\n📝 Prueba 2: Lectura pública de inscripciones');
        
        try {
            const snapshot = await this.db.collection('inscripciones').limit(1).get();
            const success = true; // Si no hay error, la regla funciona
            
            this.testResults.push({
                test: 'Lectura pública de inscripciones',
                success: success,
                message: success ? '✅ Éxito' : '❌ Bloqueada'
            });
            
            console.log(`   ${success ? '✅' : '❌'} Lectura de inscripciones: ${success ? 'Permitida' : 'Bloqueada'}`);
            
        } catch (error) {
            this.testResults.push({
                test: 'Lectura pública de inscripciones',
                success: false,
                message: `❌ Error: ${error.message}`
            });
            
            console.log(`   ❌ Error leyendo inscripciones: ${error.message}`);
        }
    }

    async testPublicUsersRead() {
        console.log('\n👤 Prueba 3: Lectura pública de usuarios');
        
        try {
            const snapshot = await this.db.collection('users').limit(1).get();
            const success = true; // Si no hay error, la regla funciona
            
            this.testResults.push({
                test: 'Lectura pública de usuarios',
                success: success,
                message: success ? '✅ Éxito' : '❌ Bloqueada'
            });
            
            console.log(`   ${success ? '✅' : '❌'} Lectura de usuarios: ${success ? 'Permitida' : 'Bloqueada'}`);
            
        } catch (error) {
            this.testResults.push({
                test: 'Lectura pública de usuarios',
                success: false,
                message: `❌ Error: ${error.message}`
            });
            
            console.log(`   ❌ Error leyendo usuarios: ${error.message}`);
        }
    }

    async testEventCreation() {
        console.log('\n✏️ Prueba 4: Creación de eventos (requiere autenticación)');
        
        const currentUser = window.authManager?.getCurrentUser();
        
        if (!currentUser) {
            this.testResults.push({
                test: 'Creación de eventos',
                success: false,
                message: '⚠️ Usuario no autenticado (esperado)'
            });
            
            console.log('   ⚠️ Usuario no autenticado - no se puede probar creación');
            return;
        }

        try {
            // Intentar crear un evento de prueba
            const testEventData = {
                nombre: 'Evento de Prueba - ' + Date.now(),
                fecha: new Date(Date.now() + 86400000), // Mañana
                tipo: 'Torneo',
                pais: 'Perú',
                ciudad: 'Lima',
                lugar: 'Lugar de Prueba',
                modalidad: 'KYORUGI',
                descripcion: 'Evento de prueba para verificar reglas',
                createdBy: currentUser.uid,
                academiaId: currentUser.uid,
                createdAt: this.db.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('eventos').add(testEventData);
            
            this.testResults.push({
                test: 'Creación de eventos',
                success: true,
                message: '✅ Éxito - Evento creado'
            });
            
            console.log(`   ✅ Evento creado exitosamente: ${docRef.id}`);
            
            // Limpiar el evento de prueba
            await docRef.delete();
            console.log('   🧹 Evento de prueba eliminado');
            
        } catch (error) {
            this.testResults.push({
                test: 'Creación de eventos',
                success: false,
                message: `❌ Error: ${error.message}`
            });
            
            console.log(`   ❌ Error creando evento: ${error.message}`);
        }
    }

    showResults() {
        console.log('\n📊 RESULTADOS DE LAS PRUEBAS');
        console.log('=====================================');
        
        const passedTests = this.testResults.filter(r => r.success).length;
        const totalTests = this.testResults.length;
        
        console.log(`✅ Pruebas exitosas: ${passedTests}/${totalTests}`);
        
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`\n${index + 1}. ${status} ${result.test}`);
            console.log(`   ${result.message}`);
        });

        if (passedTests === totalTests) {
            console.log('\n🎉 ¡Todas las reglas funcionan correctamente!');
            console.log('🚀 Puedes usar la aplicación sin problemas.');
        } else {
            console.log('\n⚠️ Algunas reglas necesitan ajustes.');
            console.log('🔧 Revisa los errores y ajusta las reglas según sea necesario.');
        }
    }

    // Método para probar específicamente el error de eventos públicos
    async testPublicEventsError() {
        console.log('\n🔍 PRUEBA ESPECÍFICA: Error de eventos públicos');
        
        try {
            // Simular exactamente lo que hace PublicEventsManager
            const eventosSnapshot = await this.db.collection('eventos')
                .where('fecha', '>', new Date())
                .orderBy('fecha', 'asc')
                .limit(6)
                .get();

            console.log(`   ✅ Eventos cargados: ${eventosSnapshot.size}`);

            // Intentar cargar inscripciones
            const inscripcionesSnapshot = await this.db.collection('inscripciones').get();
            console.log(`   ✅ Inscripciones cargadas: ${inscripcionesSnapshot.size}`);

            console.log('   🎉 No hay errores de permisos');
            
        } catch (error) {
            console.log(`   ❌ Error detectado: ${error.message}`);
            console.log(`   🔍 Código de error: ${error.code}`);
            
            if (error.code === 'permission-denied') {
                console.log('   💡 Solución: Verifica que las reglas permitan lectura pública');
            }
        }
    }
}

// Funciones globales para ejecutar pruebas
window.testFirestoreRules = async () => {
    const tester = new FirestoreRulesTester();
    await tester.init();
    return tester;
};

window.testPublicEventsError = async () => {
    const tester = new FirestoreRulesTester();
    await tester.waitForFirebase();
    tester.db = window.firebaseDB;
    await tester.testPublicEventsError();
    return tester;
};

console.log('🧪 Script de pruebas de reglas cargado');
console.log('📝 Usa testFirestoreRules() para ejecutar todas las pruebas');
console.log('🔍 Usa testPublicEventsError() para probar específicamente el error de eventos públicos'); 