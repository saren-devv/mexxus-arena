// Script específico para solucionar el error "client has already been terminated"
// Copia y pega este código en la consola del navegador (F12)

console.log('🔧 Solucionando error "client has already been terminated"...');

// Función para verificar el estado actual de Firestore
function verificarEstadoFirestore() {
    console.log('\n🔍 Verificación del estado actual de Firestore');
    console.log('=====================================');
    
    try {
        if (!window.firebaseDB) {
            console.log('❌ Firestore no está disponible en window.firebaseDB');
            return 'no_disponible';
        }
        
        // Intentar una operación simple para verificar el estado
        console.log('🔍 Probando operación simple...');
        
        // Verificar si podemos acceder a las propiedades básicas
        if (typeof window.firebaseDB.collection === 'function') {
            console.log('✅ Firestore parece estar funcionando');
            return 'funcionando';
        } else {
            console.log('❌ Firestore no responde correctamente');
            return 'no_responde';
        }
        
    } catch (error) {
        console.log(`❌ Error verificando estado: ${error.message}`);
        
        if (error.message.includes('already been terminated')) {
            console.log('🔍 Confirmado: Cliente ya fue terminado');
            return 'terminado';
        } else if (error.message.includes('network')) {
            console.log('🔍 Problema de red detectado');
            return 'error_red';
        } else {
            console.log('🔍 Error desconocido');
            return 'error_desconocido';
        }
    }
}

// Función para reconectar sin usar terminate()
async function reconectarSinTerminar() {
    console.log('\n🔄 Reconexión sin terminar cliente');
    console.log('=====================================');
    
    try {
        // Verificar estado actual
        const estado = verificarEstadoFirestore();
        
        if (estado === 'no_disponible') {
            console.log('🔄 Firestore no está disponible, creando nueva instancia...');
            
            if (typeof firebase === 'undefined') {
                console.log('❌ Firebase no está disponible');
                return false;
            }
            
            // Crear nueva instancia
            const newDB = firebase.firestore();
            window.firebaseDB = newDB;
            console.log('✅ Nueva instancia de Firestore creada');
            
        } else if (estado === 'terminado') {
            console.log('🔄 Cliente terminado, creando nueva instancia...');
            
            // Crear nueva instancia
            const newDB = firebase.firestore();
            window.firebaseDB = newDB;
            console.log('✅ Nueva instancia de Firestore creada');
            
        } else {
            console.log('🔄 Intentando reconexión simple...');
            
            try {
                // Deshabilitar y habilitar red
                await window.firebaseDB.disableNetwork();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await window.firebaseDB.enableNetwork();
                console.log('✅ Reconexión de red completada');
                
            } catch (networkError) {
                console.log(`⚠️ Error en reconexión de red: ${networkError.message}`);
                console.log('🔄 Creando nueva instancia...');
                
                const newDB = firebase.firestore();
                window.firebaseDB = newDB;
                console.log('✅ Nueva instancia de Firestore creada');
            }
        }
        
        // Probar la nueva conexión
        console.log('🧪 Probando nueva conexión...');
        const testSnapshot = await window.firebaseDB.collection('eventos').limit(1).get();
        console.log(`✅ Conexión exitosa - ${testSnapshot.size} documentos leídos`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Error en reconexión: ${error.message}`);
        return false;
    }
}

// Función para reinicializar completamente Firebase
async function reinicializarCompleto() {
    console.log('\n🔄 Reinicialización completa de Firebase');
    console.log('=====================================');
    
    try {
        // Verificar que Firebase esté disponible
        if (typeof firebase === 'undefined') {
            console.log('❌ Firebase no está disponible');
            return false;
        }
        
        // Obtener configuración actual
        const config = firebase.app().options;
        console.log(`📊 Proyecto: ${config.projectId}`);
        
        // Crear nueva instancia de Firestore con configuración optimizada
        console.log('🔄 Creando nueva instancia optimizada...');
        const newDB = firebase.firestore();
        
        // Configurar para mejor estabilidad
        newDB.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            experimentalForceLongPolling: true,
            merge: true
        });
        
        // Reemplazar instancia global
        window.firebaseDB = newDB;
        console.log('✅ Nueva instancia optimizada creada');
        
        // Probar conexión
        console.log('🧪 Probando conexión optimizada...');
        const testSnapshot = await newDB.collection('eventos').limit(1).get();
        console.log(`✅ Conexión exitosa - ${testSnapshot.size} documentos leídos`);
        
        console.log('🎉 Reinicialización completa exitosa');
        return true;
        
    } catch (error) {
        console.log(`❌ Error en reinicialización completa: ${error.message}`);
        return false;
    }
}

// Función para solucionar el problema paso a paso
async function solucionarErrorTerminated() {
    console.log('\n🔧 SOLUCIÓN PASO A PASO');
    console.log('=====================================');
    
    const pasos = [];
    
    // Paso 1: Verificar estado actual
    console.log('\n📋 Paso 1: Verificando estado actual...');
    const estado = verificarEstadoFirestore();
    pasos.push(estado !== 'no_disponible');
    
    // Paso 2: Intentar reconexión simple
    console.log('\n📋 Paso 2: Intentando reconexión simple...');
    const reconexionExitosa = await reconectarSinTerminar();
    pasos.push(reconexionExitosa);
    
    // Paso 3: Si falla, reinicializar completamente
    if (!reconexionExitosa) {
        console.log('\n📋 Paso 3: Reinicialización completa...');
        const reinicializacionExitosa = await reinicializarCompleto();
        pasos.push(reinicializacionExitosa);
    } else {
        pasos.push(true); // Omitir paso 3
    }
    
    // Paso 4: Verificación final
    console.log('\n📋 Paso 4: Verificación final...');
    const verificacionFinal = verificarEstadoFirestore();
    pasos.push(verificacionFinal === 'funcionando');
    
    // Mostrar resumen
    const exitosos = pasos.filter(p => p).length;
    const total = pasos.length;
    
    console.log('\n📊 RESUMEN DE LA SOLUCIÓN');
    console.log('=====================================');
    console.log(`✅ Pasos exitosos: ${exitosos}/${total}`);
    
    if (exitosos === total) {
        console.log('\n🎉 ¡Problema solucionado exitosamente!');
        console.log('🚀 Firestore está funcionando correctamente');
    } else {
        console.log('\n⚠️ Algunos pasos fallaron');
        console.log('💡 Intenta recargar la página y ejecutar nuevamente');
    }
    
    return exitosos === total;
}

// Función para limpiar caché del navegador (manual)
function limpiarCacheManual() {
    console.log('\n🧹 Limpieza manual de caché');
    console.log('=====================================');
    console.log('📋 Pasos para limpiar caché manualmente:');
    console.log('1. Presiona Ctrl + Shift + Delete (Windows) o Cmd + Shift + Delete (Mac)');
    console.log('2. Selecciona "Todo el tiempo" en el rango de tiempo');
    console.log('3. Marca todas las opciones:');
    console.log('   - Cookies y otros datos del sitio');
    console.log('   - Archivos en caché e imágenes');
    console.log('   - Historial de navegación');
    console.log('   - Datos de formularios');
    console.log('4. Haz clic en "Borrar datos"');
    console.log('5. Recarga la página (Ctrl + F5)');
    console.log('6. Ejecuta nuevamente: solucionarErrorTerminated()');
}

// Ejecutar solución automáticamente
solucionarErrorTerminated();

// Hacer funciones disponibles globalmente
window.solucionarErrorTerminated = solucionarErrorTerminated;
window.reconectarSinTerminar = reconectarSinTerminar;
window.reinicializarCompleto = reinicializarCompleto;
window.verificarEstadoFirestore = verificarEstadoFirestore;
window.limpiarCacheManual = limpiarCacheManual;

console.log('\n🔧 Script de solución cargado');
console.log('📝 Funciones disponibles:');
console.log('   - solucionarErrorTerminated() - Solución automática');
console.log('   - reconectarSinTerminar() - Reconexión sin terminar');
console.log('   - reinicializarCompleto() - Reinicialización completa');
console.log('   - limpiarCacheManual() - Instrucciones de limpieza manual'); 