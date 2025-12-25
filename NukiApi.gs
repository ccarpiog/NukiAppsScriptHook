/**
 * Nuki API wrapper functions
 * Handles all communication with the Nuki Web API
 */

const NUKI_BASE_URL = 'https://api.nuki.io';

// Device types
const DEVICE_TYPES = {
  SMARTLOCK: 0,
  OPENER: 2
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 2000,      // 2 seconds
  backoffMultiplier: 1.5,  // Each retry waits 1.5x longer
  maxDelay: 10000          // Cap at 10 seconds
};

/**
 * Gets current timestamp for logging
 * @returns {string} ISO timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Makes a single request to the Nuki API (no retry)
 * @param {string} method - HTTP method (GET, POST)
 * @param {string} endpoint - API endpoint path
 * @param {Object} payload - Request body for POST requests (optional)
 * @returns {Object} Response object { success, data?, error?, statusCode? }
 */
function makeApiRequestOnce(method, endpoint, payload) {
  const apiToken = getApiToken();
  if (!apiToken) {
    return { success: false, error: 'API token not configured' };
  }

  const url = NUKI_BASE_URL + endpoint;
  const options = {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + apiToken,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload && method === 'POST') {
    options.payload = JSON.stringify(payload);
  }

  try {
    console.log('[' + getTimestamp() + '] [NukiApi] ' + method + ' ' + endpoint);
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const contentText = response.getContentText();

    console.log('[' + getTimestamp() + '] [NukiApi] Response status: ' + statusCode);

    // 204 No Content is success for action endpoints
    if (statusCode === 204) {
      return { success: true, statusCode: statusCode };
    }

    // 2xx with JSON body
    if (statusCode >= 200 && statusCode < 300) {
      if (contentText) {
        const data = JSON.parse(contentText);
        return { success: true, data: data, statusCode: statusCode };
      }
      return { success: true, statusCode: statusCode };
    }

    // Rate limiting - should retry
    if (statusCode === 429) {
      return {
        success: false,
        error: 'Rate limited',
        statusCode: statusCode,
        retryable: true
      };
    }

    // Server errors - should retry
    if (statusCode >= 500) {
      return {
        success: false,
        error: 'HTTP ' + statusCode,
        statusCode: statusCode,
        retryable: true,
        body: contentText
      };
    }

    // Client errors - should not retry
    return {
      success: false,
      error: 'HTTP ' + statusCode,
      statusCode: statusCode,
      retryable: false,
      body: contentText
    };

  } catch (error) {
    console.error('[' + getTimestamp() + '] [NukiApi] Request failed: ' + error.message);
    return { success: false, error: error.message, retryable: true };
  }
}

/**
 * Makes a request to the Nuki API with retry logic
 * @param {string} method - HTTP method (GET, POST)
 * @param {string} endpoint - API endpoint path
 * @param {Object} payload - Request body for POST requests (optional)
 * @returns {Object} Response object { success, data?, error?, statusCode?, attempts? }
 */
function makeApiRequest(method, endpoint, payload) {
  let lastResult;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = calculateRetryDelay(attempt - 1);
      console.log('[' + getTimestamp() + '] [NukiApi] Retry ' + attempt + ' after ' + delay + 'ms');
      sleep(delay);
    }

    lastResult = makeApiRequestOnce(method, endpoint, payload);
    lastResult.attempts = attempt + 1;

    if (lastResult.success || !lastResult.retryable) {
      return lastResult;
    }
  }

  console.error('[' + getTimestamp() + '] [NukiApi] All retries exhausted');
  return lastResult;
}

/**
 * Sends an action command to a Nuki device
 * @param {string} deviceId - The device ID
 * @param {number} actionCode - The action code to send
 * @returns {Object} Result { success, error? }
 */
function sendAction(deviceId, actionCode) {
  const endpoint = '/smartlock/' + deviceId + '/action';
  const payload = { action: actionCode };

  const result = makeApiRequest('POST', endpoint, payload);

  if (result.success) {
    console.log('[NukiApi] Action ' + actionCode + ' sent to device ' + deviceId);
  } else {
    console.error('[NukiApi] Action failed: ' + result.error);
  }

  return result;
}

/**
 * Gets the current state of a Nuki device
 * @param {string} deviceId - The device ID
 * @returns {Object} Result { success, data?, error? }
 *   data contains: smartlockId, type, name, state: { state, mode, batteryCritical, ... }
 */
function getDeviceState(deviceId) {
  const endpoint = '/smartlock/' + deviceId;
  return makeApiRequest('GET', endpoint);
}

/**
 * Checks if a device response indicates the device is online
 * @param {Object} deviceResponse - Response from getDeviceState: { success, data: { state: { state, mode, ... } } }
 * @returns {boolean} True if device is online and has valid state
 */
function isDeviceOnline(deviceResponse) {
  return deviceResponse &&
         deviceResponse.success &&
         deviceResponse.data &&
         deviceResponse.data.state &&
         typeof deviceResponse.data.state.state === 'number';
}

/**
 * Extracts the state value from a device response
 * @param {Object} deviceResponse - Response from getDeviceState
 * @returns {number|null} State value or null if not available
 */
function extractState(deviceResponse) {
  if (isDeviceOnline(deviceResponse)) {
    return deviceResponse.data.state.state;
  }
  return null;
}

/**
 * Extracts the mode value from a device response
 * @param {Object} deviceResponse - Response from getDeviceState
 * @returns {number|null} Mode value or null if not available
 */
function extractMode(deviceResponse) {
  if (deviceResponse && deviceResponse.data && deviceResponse.data.state) {
    return deviceResponse.data.state.mode;
  }
  return null;
}

/**
 * Gets the device type from a device response
 * @param {Object} deviceResponse - Response from getDeviceState
 * @returns {number|null} Device type or null if not available
 */
function extractDeviceType(deviceResponse) {
  if (deviceResponse && deviceResponse.data) {
    return deviceResponse.data.type;
  }
  return null;
}

/**
 * Pauses execution for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  Utilities.sleep(ms);
}

/**
 * Calculates delay for retry attempt with exponential backoff
 * @param {number} attempt - Current attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(attempt) {
  const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Validates that a device is the expected type
 * @param {string} deviceId - The device ID
 * @param {number} expectedType - Expected device type (0=SmartLock, 2=Opener)
 * @returns {Object} Result { valid, deviceResponse?, error? }
 */
function validateDeviceType(deviceId, expectedType) {
  const response = getDeviceState(deviceId);

  if (!response.success) {
    return { valid: false, error: response.error };
  }

  if (!isDeviceOnline(response)) {
    return { valid: false, error: MESSAGES.DEVICE_OFFLINE, deviceResponse: response };
  }

  const actualType = extractDeviceType(response);
  if (actualType !== expectedType) {
    return { valid: false, error: MESSAGES.WRONG_DEVICE_TYPE, deviceResponse: response };
  }

  return { valid: true, deviceResponse: response };
}
