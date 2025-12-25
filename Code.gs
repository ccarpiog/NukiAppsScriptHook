/**
 * Main entry points for the Nuki Apps Script Hook web application
 * Handles routing for GET and POST requests
 */

/**
 * Handles GET requests
 * @param {Object} e - Event object with query parameters
 * @returns {ContentService.TextOutput} JSON response
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Handles POST requests
 * @param {Object} e - Event object with query parameters and POST body
 * @returns {ContentService.TextOutput} JSON response
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Routes requests to appropriate handlers based on action parameter
 * @param {Object} e - Event object
 * @param {string} method - HTTP method (GET or POST)
 * @returns {ContentService.TextOutput} JSON response
 */
function handleRequest(e, method) {
  try {
    // Guard against missing event object (e.g., manual run from editor)
    if (!e || !e.parameter) {
      return jsonResponse({
        success: false,
        message: 'Petición inválida',
        timestamp: getTimestamp()
      });
    }

    const action = e.parameter.action;

    if (!action) {
      return jsonResponse({
        success: false,
        message: 'Falta el parámetro action',
        timestamp: getTimestamp()
      });
    }

    console.log('[' + getTimestamp() + '] [Router] ' + method + ' action=' + action);

    let result;

    switch (action) {
      // Opener actions (POST)
      case 'activateRTO':
        validateMethod(method, 'POST');
        result = activateRTO();
        break;

      case 'deactivateRTO':
        validateMethod(method, 'POST');
        result = deactivateRTO();
        break;

      case 'toggleRTO':
        validateMethod(method, 'POST');
        result = toggleRTO();
        break;

      case 'electricStrike':
        validateMethod(method, 'POST');
        result = electricStrike();
        break;

      case 'activateContinuous':
        validateMethod(method, 'POST');
        result = activateContinuous();
        break;

      case 'deactivateContinuous':
        validateMethod(method, 'POST');
        result = deactivateContinuous();
        break;

      // Opener status (GET)
      case 'openerStatus':
        validateMethod(method, 'GET');
        result = getOpenerStatus();
        break;

      // Smart Lock actions (POST)
      case 'lock':
        validateMethod(method, 'POST');
        result = lock();
        break;

      case 'unlock':
        validateMethod(method, 'POST');
        result = unlock();
        break;

      case 'unlatch':
        validateMethod(method, 'POST');
        result = unlatch();
        break;

      // Smart Lock status (GET)
      case 'lockStatus':
        validateMethod(method, 'GET');
        result = getSmartLockStatus();
        break;

      // Combined status (GET)
      case 'status':
        validateMethod(method, 'GET');
        result = getCombinedStatus();
        break;

      default:
        result = {
          success: false,
          message: formatMessage(MESSAGES.UNKNOWN_ACTION, { action: action }),
          timestamp: getTimestamp()
        };
    }

    return jsonResponse(result);

  } catch (error) {
    const errorMessage = error && error.message ? error.message : String(error);
    console.error('[' + getTimestamp() + '] [Router] Error: ' + errorMessage);

    // Check if it's a method validation error
    if (errorMessage && errorMessage.startsWith && errorMessage.startsWith('Method')) {
      return jsonResponse({
        success: false,
        message: errorMessage,
        timestamp: getTimestamp()
      });
    }

    return jsonResponse({
      success: false,
      message: MESSAGES.API_ERROR,
      error: errorMessage,
      timestamp: getTimestamp()
    });
  }
}

/**
 * Validates that the request method matches expected method
 * @param {string} actual - Actual HTTP method
 * @param {string} expected - Expected HTTP method
 * @throws {Error} If methods don't match
 */
function validateMethod(actual, expected) {
  if (actual !== expected) {
    throw new Error('Method ' + actual + ' not allowed. Use ' + expected + '.');
  }
}

/**
 * Gets combined status of all configured devices
 * Fails gracefully per device - returns status for each configured device
 * @returns {Object} Combined status object
 */
function getCombinedStatus() {
  const result = {
    success: true,
    timestamp: getTimestamp()
  };

  // Get Opener status if configured
  const openerConfig = validateOpenerConfig();
  if (openerConfig.valid) {
    result.opener = getOpenerStatus();
  } else {
    result.opener = {
      success: false,
      error: formatMessage(MESSAGES.CONFIG_MISSING, { field: openerConfig.missing.join(', ') })
    };
  }

  // Get Smart Lock status if configured
  const smartlockConfig = validateSmartLockConfig();
  if (smartlockConfig.valid) {
    result.smartlock = getSmartLockStatus();
  } else {
    result.smartlock = {
      success: false,
      error: formatMessage(MESSAGES.CONFIG_MISSING, { field: smartlockConfig.missing.join(', ') })
    };
  }

  return result;
}

/**
 * Creates a JSON response
 * @param {Object} data - Data to return as JSON
 * @returns {ContentService.TextOutput} JSON response with proper content type
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
