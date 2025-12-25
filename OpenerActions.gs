/**
 * Opener-specific actions
 * Ring to Open, electric strike, continuous mode
 */

// Opener action codes
const OPENER_ACTIONS = {
  ACTIVATE_RTO: 1,
  DEACTIVATE_RTO: 2,
  ELECTRIC_STRIKE: 3,
  ACTIVATE_CONTINUOUS: 4,
  DEACTIVATE_CONTINUOUS: 5
};

// RTO-related states
const RTO_ACTIVE_STATES = [2, 3];
const RTO_INACTIVE_STATE = 1;

// Opener modes
const OPENER_MODES = {
  DOOR: 2,        // Normal door mode
  CONTINUOUS: 3   // Continuous mode
};

/**
 * Checks if a state indicates RTO is active
 * @param {number} state - Opener state
 * @returns {boolean} True if RTO is active
 */
function isRtoActive(state) {
  return RTO_ACTIVE_STATES.includes(state);
}

/**
 * Activates Ring to Open with verification and retry logic
 * @returns {Object} Result with success status and details
 */
function activateRTO() {
  // Validate configuration
  const configValidation = validateOpenerConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const openerId = getOpenerId();

  // Validate device type
  const typeValidation = validateDeviceType(openerId, DEVICE_TYPES.OPENER);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  // Check current state
  const currentState = extractState(typeValidation.deviceResponse);

  // Already in desired state?
  if (isRtoActive(currentState)) {
    return {
      success: true,
      message: MESSAGES.RTO_ALREADY_ACTIVE,
      state: currentState,
      stateName: getOpenerStateName(currentState),
      attempts: 0,
      timestamp: getTimestamp()
    };
  }

  // Send activation command and verify
  return executeOpenerActionWithVerification(
    openerId,
    OPENER_ACTIONS.ACTIVATE_RTO,
    RTO_ACTIVE_STATES,
    MESSAGES.RTO_ACTIVATED,
    MESSAGES.RTO_ACTIVATION_FAILED
  );
}

/**
 * Deactivates Ring to Open with verification and retry logic
 * @returns {Object} Result with success status and details
 */
function deactivateRTO() {
  // Validate configuration
  const configValidation = validateOpenerConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const openerId = getOpenerId();

  // Validate device type
  const typeValidation = validateDeviceType(openerId, DEVICE_TYPES.OPENER);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  // Check current state
  const currentState = extractState(typeValidation.deviceResponse);

  // Already in desired state?
  if (currentState === RTO_INACTIVE_STATE) {
    return {
      success: true,
      message: MESSAGES.RTO_ALREADY_INACTIVE,
      state: currentState,
      stateName: getOpenerStateName(currentState),
      attempts: 0,
      timestamp: getTimestamp()
    };
  }

  // Send deactivation command and verify
  return executeOpenerActionWithVerification(
    openerId,
    OPENER_ACTIONS.DEACTIVATE_RTO,
    [RTO_INACTIVE_STATE],
    MESSAGES.RTO_DEACTIVATED,
    MESSAGES.RTO_DEACTIVATION_FAILED
  );
}

/**
 * Toggles Ring to Open state
 * @returns {Object} Result with success status and details
 */
function toggleRTO() {
  // Validate configuration
  const configValidation = validateOpenerConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const openerId = getOpenerId();

  // Validate device type and get current state
  const typeValidation = validateDeviceType(openerId, DEVICE_TYPES.OPENER);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  const currentState = extractState(typeValidation.deviceResponse);

  // Toggle based on current state
  if (isRtoActive(currentState)) {
    return deactivateRTO();
  } else {
    return activateRTO();
  }
}

/**
 * Actuates the electric strike (opens the door)
 * This is a fire-and-forget action, no verification
 * @returns {Object} Result with success status
 */
function electricStrike() {
  // Validate configuration
  const configValidation = validateOpenerConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const openerId = getOpenerId();

  // Validate device type
  const typeValidation = validateDeviceType(openerId, DEVICE_TYPES.OPENER);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  // Send command (no verification for electric strike)
  const result = sendAction(openerId, OPENER_ACTIONS.ELECTRIC_STRIKE);

  if (result.success) {
    return {
      success: true,
      message: MESSAGES.ELECTRIC_STRIKE_SUCCESS,
      timestamp: getTimestamp()
    };
  } else {
    return {
      success: false,
      message: MESSAGES.ELECTRIC_STRIKE_FAILED,
      error: result.error,
      timestamp: getTimestamp()
    };
  }
}

/**
 * Activates continuous mode with verification
 * @returns {Object} Result with success status and details
 */
function activateContinuous() {
  // Validate configuration
  const configValidation = validateOpenerConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const openerId = getOpenerId();

  // Validate device type
  const typeValidation = validateDeviceType(openerId, DEVICE_TYPES.OPENER);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  // Check current mode
  const currentMode = extractMode(typeValidation.deviceResponse);

  // Already in desired mode?
  if (currentMode === OPENER_MODES.CONTINUOUS) {
    return {
      success: true,
      message: MESSAGES.CONTINUOUS_ALREADY_ACTIVE,
      mode: currentMode,
      modeName: getOpenerModeName(currentMode),
      attempts: 0,
      timestamp: getTimestamp()
    };
  }

  // Send activation command and verify via mode
  return executeOpenerModeChangeWithVerification(
    openerId,
    OPENER_ACTIONS.ACTIVATE_CONTINUOUS,
    OPENER_MODES.CONTINUOUS,
    MESSAGES.CONTINUOUS_ACTIVATED,
    MESSAGES.CONTINUOUS_ACTIVATION_FAILED
  );
}

/**
 * Deactivates continuous mode with verification
 * @returns {Object} Result with success status and details
 */
function deactivateContinuous() {
  // Validate configuration
  const configValidation = validateOpenerConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const openerId = getOpenerId();

  // Validate device type
  const typeValidation = validateDeviceType(openerId, DEVICE_TYPES.OPENER);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  // Check current mode
  const currentMode = extractMode(typeValidation.deviceResponse);

  // Already in desired mode?
  if (currentMode === OPENER_MODES.DOOR) {
    return {
      success: true,
      message: MESSAGES.CONTINUOUS_ALREADY_INACTIVE,
      mode: currentMode,
      modeName: getOpenerModeName(currentMode),
      attempts: 0,
      timestamp: getTimestamp()
    };
  }

  // Send deactivation command and verify via mode
  return executeOpenerModeChangeWithVerification(
    openerId,
    OPENER_ACTIONS.DEACTIVATE_CONTINUOUS,
    OPENER_MODES.DOOR,
    MESSAGES.CONTINUOUS_DEACTIVATED,
    MESSAGES.CONTINUOUS_DEACTIVATION_FAILED
  );
}

/**
 * Gets the current status of the Opener
 * @returns {Object} Status object with device information
 */
function getOpenerStatus() {
  // Validate configuration
  const configValidation = validateOpenerConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      error: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const openerId = getOpenerId();
  const response = getDeviceState(openerId);

  if (!response.success) {
    return {
      success: false,
      error: MESSAGES.API_ERROR,
      details: response.error,
      timestamp: getTimestamp()
    };
  }

  if (!isDeviceOnline(response)) {
    return {
      success: false,
      error: MESSAGES.DEVICE_OFFLINE,
      timestamp: getTimestamp()
    };
  }

  const data = response.data;
  const state = data.state.state;
  const mode = data.state.mode;

  return {
    success: true,
    name: data.name,
    state: state,
    stateName: getOpenerStateName(state),
    mode: mode,
    modeName: getOpenerModeName(mode),
    ringToOpenActive: isRtoActive(state),
    batteryCritical: data.state.batteryCritical || false,
    timestamp: getTimestamp()
  };
}

/**
 * Executes an Opener action and verifies state change
 * Sends action once, then polls for expected state with retries
 * Transitional states don't count against the retry budget
 * @param {string} openerId - Opener device ID
 * @param {number} actionCode - Action code to send
 * @param {number[]} expectedStates - Expected states after action
 * @param {string} successMessage - Message on success
 * @param {string} failureMessage - Message on failure
 * @returns {Object} Result with success status and details
 */
function executeOpenerActionWithVerification(openerId, actionCode, expectedStates, successMessage, failureMessage) {
  // Send action once
  const actionResult = sendAction(openerId, actionCode);
  if (!actionResult.success) {
    return {
      success: false,
      message: failureMessage,
      error: actionResult.error,
      attempts: 1,
      timestamp: getTimestamp()
    };
  }

  // Poll for expected state
  // Transitional states don't count against retries
  let terminalRetries = 0;
  let pollAttempts = 0;
  const maxPolls = 10;  // Safety limit to prevent infinite loops

  // Opener transitional states (opening: 6, 7)
  const openerTransitionalStates = [6, 7];

  while (terminalRetries <= RETRY_CONFIG.maxRetries && pollAttempts < maxPolls) {
    pollAttempts++;

    // Wait before checking (initial delay or backoff based on terminal retries)
    const delay = terminalRetries === 0 ? RETRY_CONFIG.initialDelay : calculateRetryDelay(terminalRetries - 1);
    sleep(delay);

    // Check state
    const stateResponse = getDeviceState(openerId);
    if (!isDeviceOnline(stateResponse)) {
      console.error('[' + getTimestamp() + '] [Opener] Device offline during verification');
      terminalRetries++;
      continue;
    }

    const currentState = extractState(stateResponse);
    console.log('[' + getTimestamp() + '] [Opener] Poll ' + pollAttempts + ' - Current state: ' + currentState);

    // Check if we reached expected state
    if (expectedStates.includes(currentState)) {
      return {
        success: true,
        message: successMessage,
        state: currentState,
        stateName: getOpenerStateName(currentState),
        attempts: pollAttempts,
        timestamp: getTimestamp()
      };
    }

    // Transitional states - keep polling WITHOUT incrementing retry counter
    if (openerTransitionalStates.includes(currentState)) {
      console.log('[' + getTimestamp() + '] [Opener] In transitional state, continuing to poll');
      // Don't increment terminalRetries for transitional states
      continue;
    }

    // Terminal state that's not expected - count as retry
    console.log('[' + getTimestamp() + '] [Opener] State ' + currentState + ' not in expected states, retrying');
    terminalRetries++;
  }

  // All retries exhausted
  const finalResponse = getDeviceState(openerId);
  const finalState = extractState(finalResponse);

  return {
    success: false,
    message: failureMessage,
    error: 'Estado no cambió después de ' + pollAttempts + ' verificaciones',
    lastState: finalState,
    lastStateName: getOpenerStateName(finalState),
    attempts: pollAttempts,
    timestamp: getTimestamp()
  };
}

/**
 * Executes an Opener mode change and verifies
 * Sends action once, then polls for expected mode with retries
 * @param {string} openerId - Opener device ID
 * @param {number} actionCode - Action code to send
 * @param {number} expectedMode - Expected mode after action
 * @param {string} successMessage - Message on success
 * @param {string} failureMessage - Message on failure
 * @returns {Object} Result with success status and details
 */
function executeOpenerModeChangeWithVerification(openerId, actionCode, expectedMode, successMessage, failureMessage) {
  // Send action once
  const actionResult = sendAction(openerId, actionCode);
  if (!actionResult.success) {
    return {
      success: false,
      message: failureMessage,
      error: actionResult.error,
      attempts: 1,
      timestamp: getTimestamp()
    };
  }

  // Poll for expected mode
  let pollAttempts = 0;

  for (let poll = 0; poll <= RETRY_CONFIG.maxRetries; poll++) {
    pollAttempts++;

    // Wait before checking (initial delay or backoff)
    const delay = poll === 0 ? RETRY_CONFIG.initialDelay : calculateRetryDelay(poll - 1);
    sleep(delay);

    // Check mode
    const stateResponse = getDeviceState(openerId);
    if (!isDeviceOnline(stateResponse)) {
      console.error('[' + getTimestamp() + '] [Opener] Device offline during verification');
      continue;
    }

    const currentMode = extractMode(stateResponse);
    console.log('[' + getTimestamp() + '] [Opener] Poll ' + pollAttempts + ' - Current mode: ' + currentMode);

    // Check if we reached expected mode
    if (currentMode === expectedMode) {
      return {
        success: true,
        message: successMessage,
        mode: currentMode,
        modeName: getOpenerModeName(currentMode),
        attempts: pollAttempts,
        timestamp: getTimestamp()
      };
    }

    console.log('[' + getTimestamp() + '] [Opener] Mode ' + currentMode + ' not expected, retrying');
  }

  // All polls exhausted
  const finalResponse = getDeviceState(openerId);
  const finalMode = extractMode(finalResponse);

  return {
    success: false,
    message: failureMessage,
    error: 'Modo no cambió después de ' + pollAttempts + ' verificaciones',
    lastMode: finalMode,
    lastModeName: getOpenerModeName(finalMode),
    attempts: pollAttempts,
    timestamp: getTimestamp()
  };
}
