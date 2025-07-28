// Script para limpiar eventos duplicados en Firebase
// Este script identifica y elimina eventos duplicados basándose en nombre, fecha y academiaId

class EventosDuplicadosCleaner {
    constructor() {
        this.db = null;
        this.eventosDuplicados = [];
    }

    async init() {
        try {
            await this.waitForFirebase();
            this.db = window.firebaseDB;
            console.log('🧹 Inicializando limpiador de eventos duplicados...');
        } catch (error) {
            console.error('Error inicializando limpiador:', error);
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

    // Identificar eventos duplicados
    async identificarDuplicados() {
        try {
            console.log('🔍 Identificando eventos duplicados...');
            
            const snapshot = await this.db.collection('eventos').get();
            const eventos = [];
            
            snapshot.forEach(doc => {
                eventos.push({ id: doc.id, ...doc.data() });
            });

            console.log(`📊 Total de eventos encontrados: ${eventos.length}`);

            // Agrupar eventos por criterios de duplicación
            const grupos = this.agruparEventosPorDuplicados(eventos);
            
            this.eventosDuplicados = [];
            
            // Identificar duplicados en cada grupo
            Object.values(grupos).forEach(grupo => {
                if (grupo.length > 1) {
                    console.log(`⚠️ Grupo de duplicados encontrado: ${grupo[0].nombre} (${grupo.length} eventos)`);
                    this.eventosDuplicados.push(...grupo);
                }
            });

            console.log(`🎯 Total de eventos duplicados identificados: ${this.eventosDuplicados.length}`);
            
            return this.eventosDuplicados;
        } catch (error) {
            console.error('Error identificando duplicados:', error);
            return [];
        }
    }

    // Agrupar eventos por criterios de duplicación
    agruparEventosPorDuplicados(eventos) {
        const grupos = {};
        
        eventos.forEach(evento => {
            // Crear clave única basada en nombre, fecha y academiaId
            const fecha = evento.fecha ? evento.fecha.toDate ? evento.fecha.toDate().toISOString().split('T')[0] : evento.fecha.split('T')[0] : '';
            const clave = `${evento.nombre}_${fecha}_${evento.academiaId || evento.createdBy}`;
            
            if (!grupos[clave]) {
                grupos[clave] = [];
            }
            grupos[clave].push(evento);
        });
        
        return grupos;
    }

    // Mostrar información de duplicados
    mostrarInformacionDuplicados() {
        if (this.eventosDuplicados.length === 0) {
            console.log('✅ No se encontraron eventos duplicados');
            return;
        }

        console.log('\n📋 EVENTOS DUPLICADOS ENCONTRADOS:');
        console.log('=====================================');
        
        const grupos = this.agruparEventosPorDuplicados(this.eventosDuplicados);
        
        Object.entries(grupos).forEach(([clave, grupo]) => {
            if (grupo.length > 1) {
                console.log(`\n🎯 Grupo: ${grupo[0].nombre}`);
                console.log(`   Fecha: ${grupo[0].fecha ? grupo[0].fecha.toDate ? grupo[0].fecha.toDate().toISOString().split('T')[0] : grupo[0].fecha.split('T')[0] : 'N/A'}`);
                console.log(`   Academia: ${grupo[0].academiaId || grupo[0].createdBy}`);
                console.log(`   Cantidad: ${grupo.length} eventos`);
                
                grupo.forEach((evento, index) => {
                    const tieneImagen = evento.imagen ? '✅' : '❌';
                    console.log(`   ${index + 1}. ID: ${evento.id} | Imagen: ${tieneImagen} | Creado: ${evento.createdAt ? evento.createdAt.toDate ? evento.createdAt.toDate().toISOString() : evento.createdAt : 'N/A'}`);
                });
            }
        });
    }

    // Limpiar eventos duplicados (mantener el que tiene imagen)
    async limpiarDuplicados() {
        if (this.eventosDuplicados.length === 0) {
            console.log('✅ No hay eventos duplicados para limpiar');
            return;
        }

        try {
            console.log('🧹 Iniciando limpieza de eventos duplicados...');
            
            const grupos = this.agruparEventosPorDuplicados(this.eventosDuplicados);
            let eventosEliminados = 0;
            
            for (const [clave, grupo] of Object.entries(grupos)) {
                if (grupo.length > 1) {
                    console.log(`\n🔄 Procesando grupo: ${grupo[0].nombre}`);
                    
                    // Ordenar por: 1) tiene imagen, 2) fecha de creación más reciente
                    grupo.sort((a, b) => {
                        // Primero, priorizar eventos con imagen
                        const aTieneImagen = a.imagen ? 1 : 0;
                        const bTieneImagen = b.imagen ? 1 : 0;
                        
                        if (aTieneImagen !== bTieneImagen) {
                            return bTieneImagen - aTieneImagen;
                        }
                        
                        // Si ambos tienen o no tienen imagen, priorizar el más reciente
                        const aFecha = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
                        const bFecha = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
                        
                        return bFecha - aFecha;
                    });
                    
                    // Mantener el primer evento (el mejor) y eliminar el resto
                    const eventoAMantener = grupo[0];
                    const eventosAEliminar = grupo.slice(1);
                    
                    console.log(`   ✅ Manteniendo: ${eventoAMantener.id} (${eventoAMantener.imagen ? 'con imagen' : 'sin imagen'})`);
                    
                    for (const evento of eventosAEliminar) {
                        console.log(`   🗑️ Eliminando: ${evento.id} (${evento.imagen ? 'con imagen' : 'sin imagen'})`);
                        
                        // Eliminar el evento
                        await this.db.collection('eventos').doc(evento.id).delete();
                        eventosEliminados++;
                        
                        // También eliminar inscripciones asociadas
                        const inscripcionesSnapshot = await this.db.collection('inscripciones')
                            .where('eventoId', '==', evento.id)
                            .get();
                        
                        inscripcionesSnapshot.forEach(async (doc) => {
                            await doc.ref.delete();
                            console.log(`   🗑️ Eliminada inscripción: ${doc.id}`);
                        });
                    }
                }
            }
            
            console.log(`\n✅ Limpieza completada. ${eventosEliminados} eventos duplicados eliminados.`);
            
            // Limpiar la lista de duplicados
            this.eventosDuplicados = [];
            
        } catch (error) {
            console.error('Error limpiando duplicados:', error);
        }
    }

    // Ejecutar limpieza completa
    async ejecutarLimpieza() {
        await this.identificarDuplicados();
        this.mostrarInformacionDuplicados();
        
        if (this.eventosDuplicados.length > 0) {
            const confirmacion = confirm(`Se encontraron ${this.eventosDuplicados.length} eventos duplicados. ¿Desea proceder con la limpieza?`);
            
            if (confirmacion) {
                await this.limpiarDuplicados();
                console.log('🔄 Recargando página para mostrar cambios...');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        }
    }
}

// Función global para ejecutar la limpieza
window.limpiarEventosDuplicados = async function() {
    const cleaner = new EventosDuplicadosCleaner();
    await cleaner.init();
    await cleaner.ejecutarLimpieza();
};

// Función global para solo identificar duplicados
window.identificarEventosDuplicados = async function() {
    const cleaner = new EventosDuplicadosCleaner();
    await cleaner.init();
    await cleaner.identificarDuplicados();
    cleaner.mostrarInformacionDuplicados();
};

console.log('🧹 Limpiador de eventos duplicados cargado');
console.log('📝 Uso:');
console.log('   - limpiarEventosDuplicados() - Identificar y limpiar duplicados');
console.log('   - identificarEventosDuplicados() - Solo identificar duplicados'); 