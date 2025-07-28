// Mapeo de países a códigos de banderas (emojis)
const COUNTRY_FLAGS = {
    'Afganistán': '🇦🇫',
    'Alemania': '🇩🇪',
    'Albania': '🇦🇱',
    'Andorra': '🇦🇩',
    'Antigua y Barbuda': '🇦🇬',
    'Arabia Saudita': '🇸🇦',
    'Argentina': '🇦🇷',
    'Armenia': '🇦🇲',
    'Australia': '🇦🇺',
    'Austria': '🇦🇹',
    'Azerbaiyán': '🇦🇿',
    'Bahrein': '🇧🇭',
    'Bangladés': '🇧🇩',
    'Barbados': '🇧🇧',
    'Belice': '🇧🇿',
    'Bélgica': '🇧🇪',
    'Bielorrusia': '🇧🇾',
    'Bolivia': '🇧🇴',
    'Bosnia y Herzegovina': '🇧🇦',
    'Brasil': '🇧🇷',
    'Bulgaria': '🇧🇬',
    'Bután': '🇧🇹',
    'Canadá': '🇨🇦',
    'Chile': '🇨🇱',
    'China': '🇨🇳',
    'Chipre': '🇨🇾',
    'Ciudad del Vaticano': '🇻🇦',
    'Colombia': '🇨🇴',
    'Corea del Sur': '🇰🇷',
    'Costa Rica': '🇨🇷',
    'Croacia': '🇭🇷',
    'Cuba': '🇨🇺',
    'Dinamarca': '🇩🇰',
    'Dominica': '🇩🇲',
    'Ecuador': '🇪🇨',
    'Egipto': '🇪🇬',
    'El Salvador': '🇸🇻',
    'Emiratos Árabes Unidos': '🇦🇪',
    'Eslovaquia': '🇸🇰',
    'Eslovenia': '🇸🇮',
    'España': '🇪🇸',
    'Estonia': '🇪🇪',
    'Etiopía': '🇪🇹',
    'Estados Unidos': '🇺🇸',
    'Finlandia': '🇫🇮',
    'Francia': '🇫🇷',
    'Georgia': '🇬🇪',
    'Granada': '🇬🇩',
    'Grecia': '🇬🇷',
    'Guatemala': '🇬🇹',
    'Guyana': '🇬🇾',
    'Haití': '🇭🇹',
    'Honduras': '🇭🇳',
    'Hungría': '🇭🇺',
    'India': '🇮🇳',
    'Irán': '🇮🇷',
    'Irak': '🇮🇶',
    'Irlanda': '🇮🇪',
    'Islandia': '🇮🇸',
    'Israel': '🇮🇱',
    'Italia': '🇮🇹',
    'Jamaica': '🇯🇲',
    'Japón': '🇯🇵',
    'Jordania': '🇯🇴',
    'Kenia': '🇰🇪',
    'Kosovo': '🇽🇰',
    'Kuwait': '🇰🇼',
    'Letonia': '🇱🇻',
    'Líbano': '🇱🇧',
    'Liechtenstein': '🇱🇮',
    'Lituania': '🇱🇹',
    'Luxemburgo': '🇱🇺',
    'Macedonia del Norte': '🇲🇰',
    'Maldivas': '🇲🇻',
    'Malta': '🇲🇹',
    'Marruecos': '🇲🇦',
    'México': '🇲🇽',
    'Moldavia': '🇲🇩',
    'Mónaco': '🇲🇨',
    'Montenegro': '🇲🇪',
    'Nepal': '🇳🇵',
    'Nicaragua': '🇳🇮',
    'Nigeria': '🇳🇬',
    'Noruega': '🇳🇴',
    'Nueva Zelanda': '🇳🇿',
    'Omán': '🇴🇲',
    'Otro': '🌍',
    'Pakistán': '🇵🇰',
    'Palestina': '🇵🇸',
    'Panamá': '🇵🇦',
    'Países Bajos': '🇳🇱',
    'Paraguay': '🇵🇾',
    'Perú': '🇵🇪',
    'Polonia': '🇵🇱',
    'Portugal': '🇵🇹',
    'Puerto Rico': '🇵🇷',
    'Qatar': '🇶🇦',
    'Reino Unido': '🇬🇧',
    'República Checa': '🇨🇿',
    'República Dominicana': '🇩🇴',
    'Rumania': '🇷🇴',
    'Rusia': '🇷🇺',
    'San Cristóbal y Nieves': '🇰🇳',
    'San Marino': '🇸🇲',
    'San Vicente y las Granadinas': '🇻🇨',
    'Santa Lucía': '🇱🇨',
    'Serbia': '🇷🇸',
    'Sri Lanka': '🇱🇰',
    'Sudáfrica': '🇿🇦',
    'Suecia': '🇸🇪',
    'Suiza': '🇨🇭',
    'Surinam': '🇸🇷',
    'Siria': '🇸🇾',
    'Turquía': '🇹🇷',
    'Trinidad y Tobago': '🇹🇹',
    'Ucrania': '🇺🇦',
    'Uruguay': '🇺🇾',
    'Venezuela': '🇻🇪',
    'Yemen': '🇾🇪'
};

// Mapeo alternativo usando códigos de país ISO para mayor compatibilidad
const COUNTRY_CODES = {
    'Afganistán': 'AF',
    'Alemania': 'DE',
    'Albania': 'AL',
    'Andorra': 'AD',
    'Antigua y Barbuda': 'AG',
    'Arabia Saudita': 'SA',
    'Argentina': 'AR',
    'Armenia': 'AM',
    'Australia': 'AU',
    'Austria': 'AT',
    'Azerbaiyán': 'AZ',
    'Bahrein': 'BH',
    'Bangladés': 'BD',
    'Barbados': 'BB',
    'Belice': 'BZ',
    'Bélgica': 'BE',
    'Bielorrusia': 'BY',
    'Bolivia': 'BO',
    'Bosnia y Herzegovina': 'BA',
    'Brasil': 'BR',
    'Bulgaria': 'BG',
    'Bután': 'BT',
    'Canadá': 'CA',
    'Chile': 'CL',
    'China': 'CN',
    'Chipre': 'CY',
    'Ciudad del Vaticano': 'VA',
    'Colombia': 'CO',
    'Corea del Sur': 'KR',
    'Costa Rica': 'CR',
    'Croacia': 'HR',
    'Cuba': 'CU',
    'Dinamarca': 'DK',
    'Dominica': 'DM',
    'Ecuador': 'EC',
    'Egipto': 'EG',
    'El Salvador': 'SV',
    'Emiratos Árabes Unidos': 'AE',
    'Eslovaquia': 'SK',
    'Eslovenia': 'SI',
    'España': 'ES',
    'Estonia': 'EE',
    'Etiopía': 'ET',
    'Estados Unidos': 'US',
    'Finlandia': 'FI',
    'Francia': 'FR',
    'Georgia': 'GE',
    'Granada': 'GD',
    'Grecia': 'GR',
    'Guatemala': 'GT',
    'Guyana': 'GY',
    'Haití': 'HT',
    'Honduras': 'HN',
    'Hungría': 'HU',
    'India': 'IN',
    'Irán': 'IR',
    'Irak': 'IQ',
    'Irlanda': 'IE',
    'Islandia': 'IS',
    'Israel': 'IL',
    'Italia': 'IT',
    'Jamaica': 'JM',
    'Japón': 'JP',
    'Jordania': 'JO',
    'Kenia': 'KE',
    'Kosovo': 'XK',
    'Kuwait': 'KW',
    'Letonia': 'LV',
    'Líbano': 'LB',
    'Liechtenstein': 'LI',
    'Lituania': 'LT',
    'Luxemburgo': 'LU',
    'Macedonia del Norte': 'MK',
    'Maldivas': 'MV',
    'Malta': 'MT',
    'Marruecos': 'MA',
    'México': 'MX',
    'Moldavia': 'MD',
    'Mónaco': 'MC',
    'Montenegro': 'ME',
    'Nepal': 'NP',
    'Nicaragua': 'NI',
    'Nigeria': 'NG',
    'Noruega': 'NO',
    'Nueva Zelanda': 'NZ',
    'Omán': 'OM',
    'Otro': 'XX',
    'Pakistán': 'PK',
    'Palestina': 'PS',
    'Panamá': 'PA',
    'Países Bajos': 'NL',
    'Paraguay': 'PY',
    'Perú': 'PE',
    'Polonia': 'PL',
    'Portugal': 'PT',
    'Puerto Rico': 'PR',
    'Qatar': 'QA',
    'Reino Unido': 'GB',
    'República Checa': 'CZ',
    'República Dominicana': 'DO',
    'Rumania': 'RO',
    'Rusia': 'RU',
    'San Cristóbal y Nieves': 'KN',
    'San Marino': 'SM',
    'San Vicente y las Granadinas': 'VC',
    'Santa Lucía': 'LC',
    'Serbia': 'RS',
    'Sri Lanka': 'LK',
    'Sudáfrica': 'ZA',
    'Suecia': 'SE',
    'Suiza': 'CH',
    'Surinam': 'SR',
    'Siria': 'SY',
    'Turquía': 'TR',
    'Trinidad y Tobago': 'TT',
    'Ucrania': 'UA',
    'Uruguay': 'UY',
    'Venezuela': 'VE',
    'Yemen': 'YE'
};

// Función para obtener la bandera de un país (usando emojis)
function getCountryFlag(countryName) {
    return COUNTRY_FLAGS[countryName] || '🌍'; // Bandera genérica si no se encuentra
}

// Función para obtener el código de país ISO
function getCountryCode(countryName) {
    return COUNTRY_CODES[countryName] || 'XX';
}

// Función para obtener la bandera como imagen desde un servicio web
function getCountryFlagImage(countryName, size = 24) {
    const countryCode = getCountryCode(countryName);
    if (countryCode === 'XX') return '🌍'; // Fallback para países no mapeados
    
    // Usar flagcdn.com para obtener imágenes de banderas
    return `https://flagcdn.com/w${size}/${countryCode.toLowerCase()}.png`;
}

// Función para actualizar la bandera en el formulario
function updateCountryFlag() {
    const paisSelect = document.getElementById('eventoPais');
    const flagDisplay = document.getElementById('countryFlagDisplay');
    
    if (paisSelect && flagDisplay) {
        const selectedCountry = paisSelect.value;
        if (selectedCountry) {
            const countryCode = getCountryCode(selectedCountry);
            if (countryCode !== 'XX') {
                // Usar imagen de bandera
                flagDisplay.innerHTML = `<img src="https://flagcdn.com/w20/${countryCode.toLowerCase()}.png" alt="${selectedCountry}" style="width: 20px; height: 15px; margin-right: 8px; border-radius: 2px;">`;
            } else {
                // Fallback a emoji
                flagDisplay.textContent = '🌍';
            }
            flagDisplay.style.display = 'inline-block';
        } else {
            flagDisplay.style.display = 'none';
        }
    }
}

// Función para obtener la bandera HTML de un país
function getCountryFlagHTML(countryName, className = 'flag-icon') {
    const countryCode = getCountryCode(countryName);
    if (countryCode !== 'XX') {
        return `<img src="https://flagcdn.com/w20/${countryCode.toLowerCase()}.png" alt="${countryName}" class="${className}" style="width: 20px; height: 15px; margin-right: 8px; border-radius: 2px;">`;
    } else {
        const flag = getCountryFlag(countryName);
        return `<span class="${className}" style="font-size: 1.2em; margin-right: 8px;">${flag}</span>`;
    }
}

// Función para obtener solo la bandera (texto o imagen)
function getCountryFlagOnly(countryName) {
    const countryCode = getCountryCode(countryName);
    if (countryCode !== 'XX') {
        return `<img src="https://flagcdn.com/w20/${countryCode.toLowerCase()}.png" alt="${countryName}" style="width: 20px; height: 15px; border-radius: 2px;">`;
    } else {
        return getCountryFlag(countryName);
    }
}

// Exportar para uso global
window.COUNTRY_FLAGS = COUNTRY_FLAGS;
window.COUNTRY_CODES = COUNTRY_CODES;
window.getCountryFlag = getCountryFlag;
window.getCountryCode = getCountryCode;
window.getCountryFlagImage = getCountryFlagImage;
window.updateCountryFlag = updateCountryFlag;
window.getCountryFlagHTML = getCountryFlagHTML;
window.getCountryFlagOnly = getCountryFlagOnly; 