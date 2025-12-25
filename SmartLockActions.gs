/**
 * Smart Lock-specific actions
 * Lock, unlock, unlatch
 */

// Smart Lock action codes
const SMARTLOCK_ACTIONS = {
  UNLOCK: 1,
  LOCK: 2,
  UNLATCH: 3,
  LOCK_N_GO: 4,
  LOCK_N_GO_UNLATCH: 5
};

// Smart Lock states
const SMARTLOCK_STATES = {
  // Terminal states
  LOCKED: 1,
  UNLOCKED: 3,
  UNLATCHED: 5,
  UNLOCKED_LOCK_N_GO: 6,

  // Transitional states (device is busy)
  UNLOCKING: 2,
  LOCKING: 4,
  UNLATCHING: 7,

  // Error states
  MOTOR_BLOCKED: 254,
  UNDEFINED: 255
};

// Transitional states to wait through during verification
const SMARTLOCK_TRANSITIONAL_STATES = [2, 4, 7];  // unlocking, locking, unlatching

/**
 * Checks if a state is a transitional state
 * @param {number} state - Smart Lock state
 * @returns {boolean} True if state is transitional
 */
function isTransitionalState(state) {
  return SMARTLOCK_TRANSITIONAL_STATES.includes(state);
}

/**
 * Locks the door with verification
 * @returns {Object} Result with success status and details
 */
function lock() {
  // Validate configuration
  const configValidation = validateSmartLockConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const smartlockId = getSmartlockId();

  // Validate device type
  const typeValidation = validateDeviceType(smartlockId, DEVICE_TYPES.SMARTLOCK);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  // Check current state
  const currentState = extractState(typeValidation.deviceResponse);

  // Already locked?
  if (currentState === SMARTLOCK_STATES.LOCKED) {
    return {
      success: true,
      message: MESSAGES.ALREADY_LOCKED,
      state: currentState,
      stateName: getSmartLockStateName(currentState),
      attempts: 0,
      timestamp: getTimestamp()
    };
  }

  // Check for motor blocked
  if (currentState === SMARTLOCK_STATES.MOTOR_BLOCKED) {
    return {
      success: false,
      message: MESSAGES.MOTOR_BLOCKED,
      state: currentState,
      stateName: getSmartLockStateName(currentState),
      timestamp: getTimestamp()
    };
  }

  // Send lock command and verify
  return executeSmartLockActionWithVerification(
    smartlockId,
    SMARTLOCK_ACTIONS.LOCK,
    [SMARTLOCK_STATES.LOCKED],
    MESSAGES.LOCK_SUCCESS,
    MESSAGES.LOCK_FAILED
  );
}

/**
 * Unlocks the door with verification
 * @returns {Object} Result with success status and details
 */
function unlock() {
  // Validate configuration
  const configValidation = validateSmartLockConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const smartlockId = getSmartlockId();

  // Validate device type
  const typeValidation = validateDeviceType(smartlockId, DEVICE_TYPES.SMARTLOCK);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  // Check current state
  const currentState = extractState(typeValidation.deviceResponse);

  // Already unlocked? (including lock 'n' go unlocked state)
  if (currentState === SMARTLOCK_STATES.UNLOCKED || currentState === SMARTLOCK_STATES.UNLOCKED_LOCK_N_GO) {
    return {
      success: true,
      message: MESSAGES.ALREADY_UNLOCKED,
      state: currentState,
      stateName: getSmartLockStateName(currentState),
      attempts: 0,
      timestamp: getTimestamp()
    };
  }

  // Check for motor blocked
  if (currentState === SMARTLOCK_STATES.MOTOR_BLOCKED) {
    return {
      success: false,
      message: MESSAGES.MOTOR_BLOCKED,
      state: currentState,
      stateName: getSmartLockStateName(currentState),
      timestamp: getTimestamp()
    };
  }

  // Send unlock command and verify
  return executeSmartLockActionWithVerification(
    smartlockId,
    SMARTLOCK_ACTIONS.UNLOCK,
    [SMARTLOCK_STATES.UNLOCKED, SMARTLOCK_STATES.UNLOCKED_LOCK_N_GO],
    MESSAGES.UNLOCK_SUCCESS,
    MESSAGES.UNLOCK_FAILED
  );
}

/**
 * Unlatches (opens) the door with verification
 * @returns {Object} Result with success status and details
 */
function unlatch() {
  // Validate configuration
  const configValidation = validateSmartLockConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      message: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const smartlockId = getSmartlockId();

  // Validate device type
  const typeValidation = validateDeviceType(smartlockId, DEVICE_TYPES.SMARTLOCK);
  if (!typeValidation.valid) {
    return {
      success: false,
      message: typeValidation.error,
      timestamp: getTimestamp()
    };
  }

  // Check current state
  const currentState = extractState(typeValidation.deviceResponse);

  // Already unlatched?
  if (currentState === SMARTLOCK_STATES.UNLATCHED) {
    return {
      success: true,
      message: MESSAGES.ALREADY_UNLATCHED,
      state: currentState,
      stateName: getSmartLockStateName(currentState),
      attempts: 0,
      timestamp: getTimestamp()
    };
  }

  // Check for motor blocked
  if (currentState === SMARTLOCK_STATES.MOTOR_BLOCKED) {
    return {
      success: false,
      message: MESSAGES.MOTOR_BLOCKED,
      state: currentState,
      stateName: getSmartLockStateName(currentState),
      timestamp: getTimestamp()
    };
  }

  // Send unlatch command and verify
  return executeSmartLockActionWithVerification(
    smartlockId,
    SMARTLOCK_ACTIONS.UNLATCH,
    [SMARTLOCK_STATES.UNLATCHED],
    MESSAGES.UNLATCH_SUCCESS,
    MESSAGES.UNLATCH_FAILED
  );
}

/**
 * Gets the current status of the Smart Lock
 * @returns {Object} Status object with device information
 */
function getSmartLockStatus() {
  // Validate configuration
  const configValidation = validateSmartLockConfig();
  if (!configValidation.valid) {
    return {
      success: false,
      error: formatMessage(MESSAGES.CONFIG_MISSING, { field: configValidation.missing.join(', ') }),
      timestamp: getTimestamp()
    };
  }

  const smartlockId = getSmartlockId();
  const response = getDeviceState(smartlockId);

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

  return {
    success: true,
    name: data.name,
    state: state,
    stateName: getSmartLockStateName(state),
    batteryCritical: data.state.batteryCritical || false,
    timestamp: getTimestamp()
  };
}

/**
 * Executes a Smart Lock action and verifies state change
 * Sends action once, then polls for expected state with retries
 * Transitional states don't count against the retry budget
 * @param {string} smartlockId - Smart Lock device ID
 * @param {number} actionCode - Action code to send
 * @param {number[]} expectedStates - Expected states after action
 * @param {string} successMessage - Message on success
 * @param {string} failureMessage - Message on failure
 * @returns {Object} Result with success status and details
 */
function executeSmartLockActionWithVerification(smartlockId, actionCode, expectedStates, successMessage, failureMessage) {
  // Send action once
  const actionResult = sendAction(smartlockId, actionCode);
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

  while (terminalRetries <= RETRY_CONFIG.maxRetries && pollAttempts < maxPolls) {
    pollAttempts++;

    // Wait before checking (initial delay or backoff based on terminal retries)
    const delay = terminalRetries === 0 ? RETRY_CONFIG.initialDelay : calculateRetryDelay(terminalRetries - 1);
    sleep(delay);

    // Check state
    const stateResponse = getDeviceState(smartlockId);
    if (!isDeviceOnline(stateResponse)) {
      console.error('[' + getTimestamp() + '] [SmartLock] Device offline during verification');
      terminalRetries++;
      continue;
    }

    const currentState = extractState(stateResponse);
    console.log('[' + getTimestamp() + '] [SmartLock] Poll ' + pollAttempts + ' - Current state: ' + currentState);

    // Check if we reached expected state
    if (expectedStates.includes(currentState)) {
      return {
        success: true,
        message: successMessage,
        state: currentState,
        stateName: getSmartLockStateName(currentState),
        attempts: pollAttempts,
        timestamp: getTimestamp()
      };
    }

    // Check for motor blocked error
    if (currentState === SMARTLOCK_STATES.MOTOR_BLOCKED) {
      return {
        success: false,
        message: MESSAGES.MOTOR_BLOCKED,
        state: currentState,
        stateName: getSmartLockStateName(currentState),
        attempts: pollAttempts,
        timestamp: getTimestamp()
      };
    }

    // Transitional states - keep polling WITHOUT incrementing retry counter
    if (isTransitionalState(currentState)) {
      console.log('[' + getTimestamp() + '] [SmartLock] In transitional state (' + getSmartLockStateName(currentState) + '), continuing to poll');
      // Don't increment terminalRetries for transitional states
      continue;
    }

    // Terminal state that's not expected - count as retry
    console.log('[' + getTimestamp() + '] [SmartLock] State ' + currentState + ' not in expected states, retrying');
    terminalRetries++;
  }

  // All retries exhausted
  const finalResponse = getDeviceState(smartlockId);
  const finalState = extractState(finalResponse);

  return {
    success: false,
    message: failureMessage,
    error: 'Estado no cambió después de ' + pollAttempts + ' verificaciones',
    lastState: finalState,
    lastStateName: getSmartLockStateName(finalState),
    attempts: pollAttempts,
    timestamp: getTimestamp()
  };
}
