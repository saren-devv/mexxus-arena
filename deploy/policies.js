// Funciones para manejar los modales de políticas
function showPolicyModal(policyType) {
    const modalId = getModalId(policyType);
    const modal = document.getElementById(modalId);
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Enfocar el modal para accesibilidad
        modal.focus();
        
        // Agregar evento para cerrar con Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closePolicyModal(policyType);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
}

function closePolicyModal(policyType) {
    const modalId = getModalId(policyType);
    const modal = document.getElementById(modalId);
    
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function getModalId(policyType) {
    const modalIds = {
        'privacy': 'privacyPolicyModal',
        'terms': 'termsPolicyModal',
        'cookies': 'cookiesPolicyModal',
        'data': 'dataPolicyModal'
    };
    
    return modalIds[policyType] || 'privacyPolicyModal';
}

// Inicializar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Cerrar modales al hacer clic en el botón de cerrar
    const closeButtons = document.querySelectorAll('.policy-modal .close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    // Cerrar modales al hacer clic fuera del contenido
    const policyModals = document.querySelectorAll('.policy-modal');
    policyModals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    // Agregar eventos a los enlaces de políticas
    const policyLinks = document.querySelectorAll('.policy-link');
    policyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const policyType = this.getAttribute('onclick').match(/showPolicyModal\('([^']+)'\)/)[1];
            showPolicyModal(policyType);
        });
    });
});

// Función global para ser llamada desde HTML
window.showPolicyModal = showPolicyModal;
window.closePolicyModal = closePolicyModal; 