/**
 * Configuration management for Nuki Apps Script Hook
 * Handles reading and validating Script Properties
 */

// Configuration keys stored in Script Properties
const CONFIG_KEYS = {
  NUKI_API_TOKEN: 'NUKI_API_TOKEN',
  OPENER_ID: 'OPENER_ID',
  SMARTLOCK_ID: 'SMARTLOCK_ID'
};

/**
 * Gets all configuration values from Script Properties
 * @returns {Object} Configuration object with apiToken, openerId, smartlockId
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    apiToken: props.getProperty(CONFIG_KEYS.NUKI_API_TOKEN),
    openerId: props.getProperty(CONFIG_KEYS.OPENER_ID),
    smartlockId: props.getProperty(CONFIG_KEYS.SMARTLOCK_ID)
  };
}

/**
 * Validates that required configuration properties exist
 * @param {string[]} requiredKeys - Array of required config keys to validate
 * @returns {Object} Validation result { valid: boolean, missing: string[] }
 */
function validateConfig(requiredKeys) {
  const config = getConfig();
  const missing = [];

  if (requiredKeys.includes('apiToken') && !config.apiToken) {
    missing.push('NUKI_API_TOKEN');
  }
  if (requiredKeys.includes('openerId') && !config.openerId) {
    missing.push('OPENER_ID');
  }
  if (requiredKeys.includes('smartlockId') && !config.smartlockId) {
    missing.push('SMARTLOCK_ID');
  }

  return {
    valid: missing.length === 0,
    missing: missing
  };
}

/**
 * Gets the Nuki API token
 * @returns {string|null} API token or null if not configured
 */
function getApiToken() {
  return PropertiesService.getScriptProperties().getProperty(CONFIG_KEYS.NUKI_API_TOKEN);
}

/**
 * Gets the Opener device ID
 * @returns {string|null} Opener ID or null if not configured
 */
function getOpenerId() {
  return PropertiesService.getScriptProperties().getProperty(CONFIG_KEYS.OPENER_ID);
}

/**
 * Gets the Smart Lock device ID
 * @returns {string|null} Smart Lock ID or null if not configured
 */
function getSmartlockId() {
  return PropertiesService.getScriptProperties().getProperty(CONFIG_KEYS.SMARTLOCK_ID);
}

/**
 * Validates configuration for Opener actions
 * @returns {Object} Validation result { valid: boolean, missing: string[] }
 */
function validateOpenerConfig() {
  return validateConfig(['apiToken', 'openerId']);
}

/**
 * Validates configuration for Smart Lock actions
 * @returns {Object} Validation result { valid: boolean, missing: string[] }
 */
function validateSmartLockConfig() {
  return validateConfig(['apiToken', 'smartlockId']);
}
