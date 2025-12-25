# Implementation plan

## Overview

This document outlines the step-by-step implementation plan for the Nuki Apps Script Hook - a Google Apps Script web application that serves as middleware between Apple Shortcuts and the Nuki Web API.

## File structure

```
/
├── Code.gs              # Main entry points (doGet, doPost) and request routing
├── Config.gs            # Configuration handling and validation
├── NukiApi.gs           # Nuki API wrapper functions
├── OpenerActions.gs     # Opener-specific actions (RTO, electric strike, continuous mode)
├── SmartLockActions.gs  # Smart Lock-specific actions (lock, unlock, unlatch)
├── Messages.gs          # Spanish UI strings and state/mode name mappings
├── appsscript.json      # Apps Script manifest (already exists)
└── CLAUDE.md            # Project guidance (already exists)
```

## Implementation phases

### Phase 1: Core infrastructure

#### Step 1.1: Config.gs - Configuration management

Create configuration handling with validation:

```javascript
// Functions to implement:
getConfig()           // Returns { apiToken, openerId, smartlockId } from Script Properties
validateConfig()      // Checks required properties exist, returns { valid, missing[] }
getApiToken()         // Returns NUKI_API_TOKEN
getOpenerId()         // Returns OPENER_ID
getSmartlockId()      // Returns SMARTLOCK_ID
```

Properties to read from Script Properties:
- `NUKI_API_TOKEN` (required)
- `OPENER_ID` (required for Opener actions)
- `SMARTLOCK_ID` (required for Smart Lock actions)

#### Step 1.2: Messages.gs - Localized strings

Create all user-facing messages in Spanish:

```javascript
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

  // Error messages
  RTO_ACTIVATION_FAILED: 'Error al activar Ring to Open',
  RTO_DEACTIVATION_FAILED: 'Error al desactivar Ring to Open',
  LOCK_FAILED: 'Error al cerrar la puerta',
  UNLOCK_FAILED: 'Error al abrir la puerta',
  UNLATCH_FAILED: 'Error al abrir el pestillo',
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

// Helper functions:
getOpenerStateName(state)     // Returns OPENER_STATE_NAMES[state] or 'Desconocido'
getOpenerModeName(mode)       // Returns OPENER_MODE_NAMES[mode] or 'Desconocido'
getSmartLockStateName(state)  // Returns SMARTLOCK_STATE_NAMES[state] or 'Desconocido'
```

#### Step 1.3: NukiApi.gs - API wrapper

Create low-level API communication layer:

```javascript
const NUKI_BASE_URL = 'https://api.nuki.io';

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 2000,
  backoffMultiplier: 1.5,
  maxDelay: 10000
};

// Functions to implement:
sendAction(deviceId, actionCode)  // POST /smartlock/{id}/action, returns { success, error? }
getDeviceState(deviceId)          // GET /smartlock/{id}, returns device state object
makeApiRequest(method, endpoint, payload?)  // Low-level request handler with auth
sleep(ms)                         // Wrapper for Utilities.sleep()
isDeviceOnline(deviceResponse)    // Check if device is online (has valid state object)
```

**Important: State extraction**

The Nuki API returns state nested inside the response:
```json
{
  "smartlockId": 123,
  "type": 2,
  "state": {
    "state": 3,        // <-- actual state value is here
    "mode": 2,
    "batteryCritical": false
  }
}
```

The `getDeviceState()` function must extract `response.state.state` for the actual state value and `response.state.mode` for the mode.

**Offline detection**

A device is considered offline if:
- The `state` object is missing or empty
- The API returns an error status code

```javascript
function isDeviceOnline(deviceResponse) {
  return deviceResponse &&
         deviceResponse.state &&
         typeof deviceResponse.state.state === 'number';
}
```

Error handling:
- Catch network errors and return structured error response
- Log all API calls with timestamps
- Handle rate limiting (add delays between requests)
- Check for offline devices before attempting actions

### Phase 2: Device-specific actions

#### Step 2.1: OpenerActions.gs - Opener functionality

```javascript
// Action codes
const OPENER_ACTIONS = {
  ACTIVATE_RTO: 1,
  DEACTIVATE_RTO: 2,
  ELECTRIC_STRIKE: 3,
  ACTIVATE_CONTINUOUS: 4,
  DEACTIVATE_CONTINUOUS: 5
};

// RTO-active states
const RTO_ACTIVE_STATES = [2, 3];
const RTO_INACTIVE_STATE = 1;

// All Opener states for complete mapping
const OPENER_STATES = {
  UNTRAINED: 0,
  ONLINE: 1,           // RTO inactive
  RTO_ACTIVE: [2, 3],  // Ring to Open active
  OPEN: [4, 5],
  OPENING: [6, 7],
  BOOT: 253,
  UNDEFINED: [254, 255]
};

// Functions to implement:
activateRTO(maxRetries)      // Activate with verification loop
deactivateRTO(maxRetries)    // Deactivate with verification loop
toggleRTO()                  // Check current state and toggle
electricStrike()             // Actuate electric strike (no verification needed)
activateContinuous()         // Activate continuous mode (verify via mode field)
deactivateContinuous()       // Deactivate continuous mode (verify via mode field)
getOpenerStatus()            // Get formatted status response

// Helpers:
verifyOpenerState(expectedStates, maxRetries)  // Poll until expected state or timeout
verifyOpenerMode(expectedMode, maxRetries)     // Poll until expected mode or timeout (for continuous mode)
isAlreadyInState(currentState, expectedStates) // Check if action is unnecessary
```

**"Already in desired state" handling**

Before sending an action, check if the device is already in the target state:
- If activating RTO and state is already 2 or 3 → return success with RTO_ALREADY_ACTIVE
- If deactivating RTO and state is already 1 → return success with RTO_ALREADY_INACTIVE

This avoids unnecessary API calls and false failure reports.

**Verification logic for RTO:**
1. Check current state first (handle "already in desired state")
2. Send action command
3. Wait `initialDelay` ms
4. Check current state
5. If in transitional state, continue polling (don't count as failure)
6. If in expected terminal state, return success
7. If in wrong terminal state after max retries, return failure

#### Step 2.2: SmartLockActions.gs - Smart Lock functionality

```javascript
// Action codes
const SMARTLOCK_ACTIONS = {
  UNLOCK: 1,
  LOCK: 2,
  UNLATCH: 3,
  LOCK_N_GO: 4,
  LOCK_N_GO_UNLATCH: 5
};

// States - terminal and transitional
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
const TRANSITIONAL_STATES = [2, 4, 7];  // unlocking, locking, unlatching

// Functions to implement:
lock(maxRetries)             // Lock with verification (expect state 1)
unlock(maxRetries)           // Unlock with verification (expect state 3)
unlatch(maxRetries)          // Unlatch with verification (expect state 5)
getSmartLockStatus()         // Get formatted status response

// Helpers:
verifySmartLockState(expectedStates, maxRetries)  // Poll until expected state or timeout
isAlreadyInState(currentState, expectedStates)    // Check if action is unnecessary
```

**"Already in desired state" handling for Smart Lock**

Before sending an action, check if the device is already in the target state:
- If locking and state is already 1 → return success with ALREADY_LOCKED
- If unlocking and state is already 3 or 6 → return success with ALREADY_UNLOCKED
- If unlatching and state is already 5 → return success with ALREADY_UNLATCHED

**Transitional state handling**

When verifying state changes:
- States 2 (unlocking), 4 (locking), 7 (unlatching) are transitional
- If device is in transitional state, continue polling without counting as failure
- Only fail if terminal state doesn't match expected after timeout

### Phase 3: Request routing and responses

#### Step 3.1: Code.gs - Main entry points

```javascript
// Entry points:
doGet(e)   // Handle GET requests (status endpoints)
doPost(e)  // Handle POST requests (action endpoints)

// Request routing:
handleRequest(e, method)  // Route to appropriate handler based on action param

// Response helpers:
jsonResponse(data)        // Return ContentService JSON response
errorResponse(message, details?)  // Return error JSON response
```

Action routing table:

| Action | Method | Handler |
|--------|--------|---------|
| activateRTO | POST | activateRTO() |
| deactivateRTO | POST | deactivateRTO() |
| toggleRTO | POST | toggleRTO() |
| openerStatus | GET | getOpenerStatus() |
| electricStrike | POST | electricStrike() |
| activateContinuous | POST | activateContinuous() |
| deactivateContinuous | POST | deactivateContinuous() |
| lock | POST | lock() |
| unlock | POST | unlock() |
| unlatch | POST | unlatch() |
| lockStatus | GET | getSmartLockStatus() |
| status | GET | getCombinedStatus() |

### Phase 4: Testing and deployment

#### Step 4.1: Manual testing

1. Deploy as web app with "Test deployment"
2. Test each endpoint with curl
3. Verify error handling with missing config
4. Test retry logic by simulating failures

#### Step 4.2: Production deployment

1. Create new deployment as "Web app"
2. Configure access level
3. Update Apple Shortcuts with new URL

## Response format

All endpoints return JSON with consistent structure:

### Success response

```json
{
  "success": true,
  "message": "Spanish message describing result",
  "state": 3,
  "stateName": "Ring to Open activo",
  "attempts": 1,
  "timestamp": "2025-12-25T18:30:00.000Z"
}
```

### Error response

```json
{
  "success": false,
  "message": "Spanish error message",
  "error": "Technical error details",
  "lastState": 1,
  "attempts": 3,
  "timestamp": "2025-12-25T18:30:15.000Z"
}
```

### Status response

```json
{
  "success": true,
  "opener": {
    "name": "Portero",
    "state": 1,
    "stateName": "En línea",
    "mode": 2,
    "modeName": "Modo puerta",
    "ringToOpenActive": false,
    "batteryCritical": false
  },
  "smartlock": {
    "name": "Cerradura",
    "state": 1,
    "stateName": "Cerrado",
    "batteryCritical": false
  },
  "timestamp": "2025-12-25T18:30:00.000Z"
}
```

## Implementation order

1. **Config.gs** - Foundation for all other modules
2. **Messages.gs** - Required for any user-facing response
3. **NukiApi.gs** - Core API communication
4. **OpenerActions.gs** - Opener functionality (matches existing spec)
5. **SmartLockActions.gs** - Smart Lock functionality (new)
6. **Code.gs** - Tie everything together with routing

## Key considerations

### Verification strategies

- **RTO activate/deactivate**: Must verify state changed (states 2,3 for active, state 1 for inactive)
- **Lock/Unlock**: Should verify state changed (state 1 for locked, state 3 for unlocked)
- **Unlatch**: Verify state 5 (unlatched) - note: door may auto-relock
- **Electric strike**: No verification needed (momentary action)
- **Continuous mode**: Verify via mode field, not state

### Timeout handling

- Apps Script has a 6-minute execution limit
- Total retry time should stay well under this
- With 3 retries at 2s, 3s, 4.5s delays = ~12 seconds max per action

### Error scenarios to handle

1. Missing API token → Return CONFIG_MISSING error
2. Missing device ID → Return CONFIG_MISSING error for that device
3. API unreachable → Retry then return API_ERROR
4. Device offline → Return DEVICE_OFFLINE
5. Unknown action → Return UNKNOWN_ACTION
6. Verification timeout → Return partial success with warning

## Decisions (reviewed with Codex)

### 1. Lock 'n' Go endpoints
**Decision:** Keep the API surface small for now with just lock/unlock/unlatch. Add `lockNGo` and `lockNGoUnlatch` later if needed in Shortcuts.

### 2. Combined status endpoint behavior
**Decision:** Fail gracefully per device. Return `success: true` at the top level with per-device status. If a device is not configured or offline, include an error for that specific device but still return the other device's status.

Example response when Opener is configured but Smart Lock is not:
```json
{
  "success": true,
  "opener": {
    "success": true,
    "name": "Portero",
    "state": 1,
    "stateName": "En línea",
    ...
  },
  "smartlock": {
    "success": false,
    "error": "SMARTLOCK_ID no configurado"
  },
  "timestamp": "2025-12-25T18:30:00.000Z"
}
```

### 3. Electric strike verification
**Decision:** Keep electric strike unverified. The Opener states 4/5/6/7 (open/opening) are transient and unreliable for verification. The action is fire-and-forget.

## Additional considerations (from Codex review)

### Device type validation
When sending actions, verify the device type matches the expected type:
- Opener actions should only go to devices with `type: 2`
- Smart Lock actions should only go to devices with `type: 0`

Return a clear error if the configured device ID points to the wrong device type.

### Security consideration
The web app URL is public by default. Consider:
- Using "Anyone with Google account" access level for basic auth
- Or adding a simple shared secret as a query parameter (e.g., `?secret=xxx&action=unlock`)

For now, proceed without auth but document this as a future enhancement.
