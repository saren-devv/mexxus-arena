// Script para verificar que los datos existentes cumplan con las nuevas reglas de Firestore
// Ejecutar en la consola del navegador después de aplicar las nuevas reglas

class FirestoreDataVerifier {
    constructor() {
        this.db = null;
        this.auth = null;
        this.issues = [];
        this.fixed = 0;
    }

    async init() {
        try {
            // Esperar a que Firebase esté disponible
            await this.waitForFirebase();
            this.db = window.firebaseDB;
            this.auth = window.firebaseAuth;
            
            console.log('🔍 Iniciando verificación de datos...');
            await this.verifyAllCollections();
            
        } catch (error) {
            console.error('❌ Error inicializando verificador:', error);
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

    async verifyAllCollections() {
        console.log('\n📋 VERIFICANDO COLECCIONES...');
        console.log('=====================================');

        // Verificar eventos
        await this.verifyEventos();
        
        // Verificar inscripciones
        await this.verifyInscripciones();
        
        // Verificar atletas
        await this.verifyAtletas();
        
        // Verificar usuarios
        await this.verifyUsers();

        // Mostrar resumen
        this.showSummary();
    }

    async verifyEventos() {
        console.log('\n🎯 Verificando eventos...');
        
        try {
            const snapshot = await this.db.collection('eventos').get();
            let validCount = 0;
            let invalidCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const isValid = this.validateEvento(doc.id, data);
                
                if (isValid) {
                    validCount++;
                } else {
                    invalidCount++;
                }
            });

            console.log(`   ✅ Eventos válidos: ${validCount}`);
            console.log(`   ❌ Eventos con problemas: ${invalidCount}`);

        } catch (error) {
            console.error('   ❌ Error verificando eventos:', error);
        }
    }

    validateEvento(id, data) {
        const requiredFields = ['nombre', 'fecha', 'tipo', 'pais', 'ciudad', 'lugar', 'modalidad', 'descripcion'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            this.issues.push({
                collection: 'eventos',
                id: id,
                type: 'missing_fields',
                fields: missingFields,
                message: `Evento ${id} falta campos: ${missingFields.join(', ')}`
            });
            return false;
        }

        if (!data.createdBy) {
            this.issues.push({
                collection: 'eventos',
                id: id,
                type: 'missing_createdBy',
                message: `Evento ${id} no tiene createdBy`
            });
            return false;
        }

        if (!data.createdAt) {
            this.issues.push({
                collection: 'eventos',
                id: id,
                type: 'missing_createdAt',
                message: `Evento ${id} no tiene createdAt`
            });
            return false;
        }

        return true;
    }

    async verifyInscripciones() {
        console.log('\n📝 Verificando inscripciones...');
        
        try {
            const snapshot = await this.db.collection('inscripciones').get();
            let validCount = 0;
            let invalidCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const isValid = this.validateInscripcion(doc.id, data);
                
                if (isValid) {
                    validCount++;
                } else {
                    invalidCount++;
                }
            });

            console.log(`   ✅ Inscripciones válidas: ${validCount}`);
            console.log(`   ❌ Inscripciones con problemas: ${invalidCount}`);

        } catch (error) {
            console.error('   ❌ Error verificando inscripciones:', error);
        }
    }

    validateInscripcion(id, data) {
        if (!data.createdBy) {
            this.issues.push({
                collection: 'inscripciones',
                id: id,
                type: 'missing_createdBy',
                message: `Inscripción ${id} no tiene createdBy`
            });
            return false;
        }

        if (!data.createdAt) {
            this.issues.push({
                collection: 'inscripciones',
                id: id,
                type: 'missing_createdAt',
                message: `Inscripción ${id} no tiene createdAt`
            });
            return false;
        }

        return true;
    }

    async verifyAtletas() {
        console.log('\n🏃 Verificando atletas...');
        
        try {
            const snapshot = await this.db.collection('atletas').get();
            let validCount = 0;
            let invalidCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const isValid = this.validateAtleta(doc.id, data);
                
                if (isValid) {
                    validCount++;
                } else {
                    invalidCount++;
                }
            });

            console.log(`   ✅ Atletas válidos: ${validCount}`);
            console.log(`   ❌ Atletas con problemas: ${invalidCount}`);

        } catch (error) {
            console.error('   ❌ Error verificando atletas:', error);
        }
    }

    validateAtleta(id, data) {
        if (!data.createdBy) {
            this.issues.push({
                collection: 'atletas',
                id: id,
                type: 'missing_createdBy',
                message: `Atleta ${id} no tiene createdBy`
            });
            return false;
        }

        if (!data.createdAt) {
            this.issues.push({
                collection: 'atletas',
                id: id,
                type: 'missing_createdAt',
                message: `Atleta ${id} no tiene createdAt`
            });
            return false;
        }

        return true;
    }

    async verifyUsers() {
        console.log('\n👤 Verificando usuarios...');
        
        try {
            const snapshot = await this.db.collection('users').get();
            let validCount = 0;
            let invalidCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const isValid = this.validateUser(doc.id, data);
                
                if (isValid) {
                    validCount++;
                } else {
                    invalidCount++;
                }
            });

            console.log(`   ✅ Usuarios válidos: ${validCount}`);
            console.log(`   ❌ Usuarios con problemas: ${invalidCount}`);

        } catch (error) {
            console.error('   ❌ Error verificando usuarios:', error);
        }
    }

    validateUser(id, data) {
        // Los usuarios pueden no tener createdBy/createdAt ya que se crean automáticamente
        // Solo verificamos que existan datos básicos
        if (!data.email && !data.nombre) {
            this.issues.push({
                collection: 'users',
                id: id,
                type: 'missing_basic_data',
                message: `Usuario ${id} no tiene datos básicos (email o nombre)`
            });
            return false;
        }

        return true;
    }

    showSummary() {
        console.log('\n📊 RESUMEN DE VERIFICACIÓN');
        console.log('=====================================');
        
        if (this.issues.length === 0) {
            console.log('✅ ¡Excelente! Todos los datos cumplen con las nuevas reglas.');
            console.log('🎉 Puedes aplicar las reglas de seguridad sin problemas.');
        } else {
            console.log(`⚠️ Se encontraron ${this.issues.length} problemas:`);
            
            this.issues.forEach((issue, index) => {
                console.log(`\n${index + 1}. ${issue.message}`);
                console.log(`   Colección: ${issue.collection}`);
                console.log(`   ID: ${issue.id}`);
                console.log(`   Tipo: ${issue.type}`);
            });

            console.log('\n🔧 RECOMENDACIONES:');
            console.log('1. Corrige los problemas antes de aplicar las reglas');
            console.log('2. Usa el script de migración si es necesario');
            console.log('3. Verifica nuevamente después de las correcciones');
        }
    }

    // Método para corregir problemas comunes
    async fixCommonIssues() {
        if (this.issues.length === 0) {
            console.log('✅ No hay problemas que corregir');
            return;
        }

        console.log('\n🔧 CORRIGIENDO PROBLEMAS COMUNES...');
        
        for (const issue of this.issues) {
            if (issue.type === 'missing_createdBy' || issue.type === 'missing_createdAt') {
                await this.fixMissingFields(issue);
            }
        }

        console.log(`✅ Se corrigieron ${this.fixed} documentos`);
    }

    async fixMissingFields(issue) {
        try {
            const docRef = this.db.collection(issue.collection).doc(issue.id);
            const updateData = {};

            if (issue.type === 'missing_createdBy') {
                // Intentar inferir createdBy del documento
                updateData.createdBy = issue.id.split('_')[0] || 'unknown';
            }

            if (issue.type === 'missing_createdAt') {
                updateData.createdAt = this.db.FieldValue.serverTimestamp();
            }

            await docRef.update(updateData);
            this.fixed++;
            console.log(`   ✅ Corregido: ${issue.message}`);

        } catch (error) {
            console.error(`   ❌ Error corrigiendo ${issue.id}:`, error);
        }
    }
}

// Función global para ejecutar la verificación
window.verificarDatosFirestore = async () => {
    const verifier = new FirestoreDataVerifier();
    await verifier.init();
    return verifier;
};

// Función para corregir problemas
window.corregirProblemasFirestore = async () => {
    const verifier = await window.verificarDatosFirestore();
    await verifier.fixCommonIssues();
    return verifier;
};

console.log('🔍 Script de verificación de datos cargado');
console.log('📝 Usa verificarDatosFirestore() para verificar datos');
console.log('🔧 Usa corregirProblemasFirestore() para corregir problemas comunes'); 