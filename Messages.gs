/**
 * Localized strings and state/mode name mappings
 * All user-facing text in Spanish
 */

const MESSAGES = {
  // Success messages
  RTO_ACTIVATED: 'Ring to Open activado correctamente',
  RTO_DEACTIVATED: 'Ring to Open desactivado correctamente',
  RTO_ALREADY_ACTIVE: 'Ring to Open ya estaba activo',
  RTO_ALREADY_INACTIVE: 'Ring to Open ya estaba desactivado',
  LOCK_SUCCESS: 'Puerta cerrada correctamente',
  UNLOCK_SUCCESS: 'Puerta abierta correctamente',
  UNLATCH_SUCCESS: 'Pestillo abierto correctamente',
  ALREADY_LOCKED: 'La puerta ya estaba cerrada',
  ALREADY_UNLOCKED: 'La puerta ya estaba abierta',
  ALREADY_UNLATCHED: 'El pestillo ya estaba abierto',
  ELECTRIC_STRIKE_SUCCESS: 'Portero abierto correctamente',
  CONTINUOUS_ACTIVATED: 'Modo continuo activado',
  CONTINUOUS_DEACTIVATED: 'Modo continuo desactivado',
  CONTINUOUS_ALREADY_ACTIVE: 'Modo continuo ya estaba activo',
  CONTINUOUS_ALREADY_INACTIVE: 'Modo continuo ya estaba desactivado',

  // Error messages
  RTO_ACTIVATION_FAILED: 'Error al activar Ring to Open',
  RTO_DEACTIVATION_FAILED: 'Error al desactivar Ring to Open',
  LOCK_FAILED: 'Error al cerrar la puerta',
  UNLOCK_FAILED: 'Error al abrir la puerta',
  UNLATCH_FAILED: 'Error al abrir el pestillo',
  ELECTRIC_STRIKE_FAILED: 'Error al abrir el portero',
  CONTINUOUS_ACTIVATION_FAILED: 'Error al activar modo continuo',
  CONTINUOUS_DEACTIVATION_FAILED: 'Error al desactivar modo continuo',
  CONFIG_MISSING: 'Configuración incompleta: falta {field}',
  API_ERROR: 'Error de comunicación con Nuki API',
  UNKNOWN_ACTION: 'Acción no reconocida: {action}',
  DEVICE_OFFLINE: 'El dispositivo parece estar desconectado',
  WRONG_DEVICE_TYPE: 'El dispositivo configurado no es del tipo esperado',
  MOTOR_BLOCKED: 'Motor bloqueado - revisar cerradura'
};

// Opener state names (Spanish)
const OPENER_STATE_NAMES = {
  0: 'Sin entrenar',
  1: 'En línea',
  2: 'Ring to Open activo',
  3: 'Ring to Open activo',
  4: 'Abierto',
  5: 'Abierto',
  6: 'Abriendo',
  7: 'Abriendo',
  253: 'Iniciando',
  254: 'Estado desconocido',
  255: 'Estado desconocido'
};

// Opener mode names (Spanish)
const OPENER_MODE_NAMES = {
  0: 'Sin inicializar',
  1: 'Emparejando',
  2: 'Modo puerta',
  3: 'Modo continuo',
  4: 'Mantenimiento'
};

// Smart Lock state names (Spanish)
const SMARTLOCK_STATE_NAMES = {
  1: 'Cerrado',
  2: 'Abriendo',
  3: 'Abierto',
  4: 'Cerrando',
  5: 'Pestillo abierto',
  6: 'Abierto (lock n go)',
  7: 'Abriendo pestillo',
  254: 'Motor bloqueado',
  255: 'Estado desconocido'
};

/**
 * Gets the human-readable name for an Opener state
 * @param {number} state - State code
 * @returns {string} Spanish state name
 */
function getOpenerStateName(state) {
  return OPENER_STATE_NAMES[state] || 'Desconocido';
}

/**
 * Gets the human-readable name for an Opener mode
 * @param {number} mode - Mode code
 * @returns {string} Spanish mode name
 */
function getOpenerModeName(mode) {
  return OPENER_MODE_NAMES[mode] || 'Desconocido';
}

/**
 * Gets the human-readable name for a Smart Lock state
 * @param {number} state - State code
 * @returns {string} Spanish state name
 */
function getSmartLockStateName(state) {
  return SMARTLOCK_STATE_NAMES[state] || 'Desconocido';
}

/**
 * Formats a message with placeholder replacement
 * @param {string} template - Message template with {placeholder} syntax
 * @param {Object} values - Key-value pairs for replacement (optional)
 * @returns {string} Formatted message
 */
function formatMessage(template, values) {
  if (!values) {
    return template;
  }
  let result = template;
  for (const key in values) {
    // Replace all occurrences of the placeholder
    const placeholder = new RegExp('\\{' + key + '\\}', 'g');
    result = result.replace(placeholder, values[key]);
  }
  return result;
}
