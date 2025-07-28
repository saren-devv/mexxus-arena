// Script de diagnóstico para problemas al guardar eventos
// Ejecutar en la consola del navegador cuando ocurra un error

console.log('🔍 DIAGNÓSTICO DE PROBLEMAS AL GUARDAR EVENTOS');
console.log('================================================');

// Función principal de diagnóstico
async function diagnosticarGuardarEvento() {
    console.log('\n1️⃣ Verificando configuración de Firebase...');
    await verificarFirebase();
    
    console.log('\n2️⃣ Verificando autenticación del usuario...');
    await verificarAutenticacion();
    
    console.log('\n3️⃣ Verificando permisos de Firestore...');
    await verificarPermisosFirestore();
    
    console.log('\n4️⃣ Verificando datos del formulario...');
    verificarFormularioEvento();
    
    console.log('\n5️⃣ Verificando configuración de Storage...');
    await verificarStorage();
    
    console.log('\n✅ Diagnóstico completado');
}

// Verificar configuración de Firebase
async function verificarFirebase() {
    try {
        if (!window.firebase) {
            console.log('❌ Firebase no está cargado');
            return false;
        }
        
        if (!window.firebaseDB) {
            console.log('❌ Firestore no está inicializado');
            return false;
        }
        
        if (!window.firebaseAuth) {
            console.log('❌ Firebase Auth no está inicializado');
            return false;
        }
        
        console.log('✅ Firebase configurado correctamente');
        return true;
    } catch (error) {
        console.log(`❌ Error verificando Firebase: ${error.message}`);
        return false;
    }
}

// Verificar autenticación del usuario
async function verificarAutenticacion() {
    try {
        const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
        
        if (!currentUser) {
            console.log('❌ Usuario no autenticado');
            console.log('💡 Solución: Iniciar sesión');
            return false;
        }
        
        console.log(`✅ Usuario autenticado: ${currentUser.email || currentUser.nombre}`);
        console.log(`🆔 UID: ${currentUser.uid}`);
        console.log(`📋 Tipo: ${currentUser.tipo}`);
        
        // Verificar token de autenticación
        try {
            const token = await window.firebaseAuth.currentUser.getIdToken();
            console.log('✅ Token de autenticación válido');
        } catch (tokenError) {
            console.log('❌ Token de autenticación inválido');
            console.log('💡 Solución: Cerrar sesión y volver a iniciar');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log(`❌ Error verificando autenticación: ${error.message}`);
        return false;
    }
}

// Verificar permisos de Firestore
async function verificarPermisosFirestore() {
    try {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            console.log('❌ No se puede verificar permisos sin usuario autenticado');
            return false;
        }
        
        // Intentar crear un documento de prueba
        const testDoc = {
            test: true,
            timestamp: new Date(),
            createdBy: currentUser.uid,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const testRef = await window.firebaseDB.collection('test_permissions').add(testDoc);
        console.log('✅ Permisos de escritura en Firestore OK');
        
        // Limpiar documento de prueba
        await testRef.delete();
        console.log('✅ Permisos de eliminación en Firestore OK');
        
        return true;
    } catch (error) {
        console.log(`❌ Error de permisos en Firestore: ${error.message}`);
        
        if (error.code === 'permission-denied') {
            console.log('💡 Problema: Permisos insuficientes');
            console.log('💡 Verificar reglas de Firestore');
        } else if (error.code === 'unauthenticated') {
            console.log('💡 Problema: Usuario no autenticado');
        }
        
        return false;
    }
}

// Verificar datos del formulario
function verificarFormularioEvento() {
    const campos = [
        'eventoNombre',
        'eventoFecha', 
        'eventoTipo',
        'eventoPais',
        'eventoCiudad',
        'eventoLugar',
        'eventoModalidad',
        'eventoDescripcion'
    ];
    
    console.log('📋 Verificando campos del formulario:');
    
    let todosCompletos = true;
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (!elemento) {
            console.log(`❌ Campo ${campo}: No encontrado en el DOM`);
            todosCompletos = false;
        } else {
            const valor = elemento.value.trim();
            if (!valor) {
                console.log(`❌ Campo ${campo}: Vacío`);
                todosCompletos = false;
            } else {
                console.log(`✅ Campo ${campo}: "${valor}"`);
            }
        }
    });
    
    if (todosCompletos) {
        console.log('✅ Todos los campos obligatorios están completos');
    } else {
        console.log('❌ Faltan campos obligatorios');
    }
    
    // Verificar fecha
    const fechaInput = document.getElementById('eventoFecha');
    if (fechaInput && fechaInput.value) {
        const fechaEvento = new Date(fechaInput.value + 'T12:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaEvento < hoy) {
            console.log('❌ La fecha del evento no puede ser en el pasado');
        } else {
            console.log('✅ Fecha del evento válida');
        }
    }
    
    return todosCompletos;
}

// Verificar configuración de Storage
async function verificarStorage() {
    try {
        if (!window.firebaseStorage) {
            console.log('❌ Firebase Storage no está inicializado');
            return false;
        }
        
        console.log('✅ Firebase Storage inicializado');
        
        // Verificar si hay archivos seleccionados
        const imagenFile = document.getElementById('eventoImagen')?.files[0];
        const basesFile = document.getElementById('eventoBasesPdf')?.files[0];
        
        if (imagenFile) {
            console.log(`📷 Imagen seleccionada: ${imagenFile.name} (${(imagenFile.size / 1024 / 1024).toFixed(2)} MB)`);
            
            if (imagenFile.size > 5 * 1024 * 1024) {
                console.log('⚠️ Imagen muy grande (máximo 5MB recomendado)');
            }
        }
        
        if (basesFile) {
            console.log(`📄 PDF seleccionado: ${basesFile.name} (${(basesFile.size / 1024 / 1024).toFixed(2)} MB)`);
            
            if (basesFile.size > 10 * 1024 * 1024) {
                console.log('⚠️ PDF muy grande (máximo 10MB recomendado)');
            }
        }
        
        return true;
    } catch (error) {
        console.log(`❌ Error verificando Storage: ${error.message}`);
        return false;
    }
}

// Función para simular el guardado de un evento (solo para testing)
async function simularGuardarEvento() {
    console.log('\n🧪 SIMULANDO GUARDADO DE EVENTO...');
    
    try {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            throw new Error('Usuario no autenticado');
        }
        
        const eventoData = {
            nombre: 'Evento de Prueba',
            fecha: new Date(),
            tipo: 'COMPETENCIA',
            pais: 'Perú',
            ciudad: 'Lima',
            lugar: 'Coliseo de Prueba',
            modalidad: 'KYORUGI',
            descripcion: 'Evento de prueba para diagnóstico',
            createdBy: currentUser.uid,
            academiaId: currentUser.uid,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await window.firebaseDB.collection('eventos').add(eventoData);
        console.log('✅ Evento de prueba creado exitosamente');
        console.log(`🆔 ID del evento: ${docRef.id}`);
        
        // Limpiar evento de prueba
        await docRef.delete();
        console.log('✅ Evento de prueba eliminado');
        
        return true;
    } catch (error) {
        console.log(`❌ Error en simulación: ${error.message}`);
        return false;
    }
}

// Exportar funciones para uso en consola
window.diagnosticoEvento = {
    ejecutar: diagnosticarGuardarEvento,
    simular: simularGuardarEvento,
    verificarFirebase,
    verificarAutenticacion,
    verificarPermisosFirestore,
    verificarFormularioEvento,
    verificarStorage
};

console.log('\n📝 FUNCIONES DISPONIBLES:');
console.log('- window.diagnosticoEvento.ejecutar() - Ejecutar diagnóstico completo');
console.log('- window.diagnosticoEvento.simular() - Simular guardado de evento');
console.log('- window.diagnosticoEvento.verificarFirebase() - Solo verificar Firebase');
console.log('- window.diagnosticoEvento.verificarAutenticacion() - Solo verificar autenticación');
console.log('- window.diagnosticoEvento.verificarPermisosFirestore() - Solo verificar permisos');
console.log('- window.diagnosticoEvento.verificarFormularioEvento() - Solo verificar formulario');
console.log('- window.diagnosticoEvento.verificarStorage() - Solo verificar Storage');

console.log('\n💡 Para ejecutar el diagnóstico completo, usa: window.diagnosticoEvento.ejecutar()'); 