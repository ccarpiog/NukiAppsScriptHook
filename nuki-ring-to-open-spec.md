# Nuki Ring to Open - Google Apps Script Implementation Specification

## Overview

This document specifies a Google Apps Script web application that acts as a middleware between Apple Shortcuts and the Nuki Web API. The solution provides reliable feedback, retry logic, and state verification for activating "Ring to Open" (RTO) on a Nuki Opener device.

## Problem Statement

The current Apple Shortcut implementation has the following issues:

1. **Silent failures**: The Nuki Web API returns HTTP 204 even when the action fails to execute on the device
2. **No verification**: There's no check to confirm Ring to Open was actually activated
3. **No retry logic**: If the command fails, there's no automatic retry mechanism
4. **Limited feedback**: Apple Shortcuts can't easily process and display meaningful status information

## Solution Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ Apple Shortcut  │────▶│ Google Apps Script   │────▶│  Nuki Web API   │
│                 │◀────│ (Web App)            │◀────│                 │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │ Verification │
                        │ & Retry Loop │
                        └──────────────┘
```

## Nuki Web API Reference

### Base URL
```
https://api.nuki.io
```

### Authentication
All requests require a Bearer token in the Authorization header:
```
Authorization: Bearer {API_TOKEN}
```

### Relevant Endpoints

#### 1. Execute Action
```
POST /smartlock/{smartlockId}/action
Content-Type: application/json

{
  "action": 1
}
```

**Action codes for Opener:**
| Code | Action |
|------|--------|
| 1 | Activate Ring to Open |
| 2 | Deactivate Ring to Open |
| 3 | Electric strike actuation (open door) |
| 4 | Activate continuous mode |
| 5 | Deactivate continuous mode |

**Response:** HTTP 204 No Content (always, even on failure)

#### 2. Get Device State
```
GET /smartlock/{smartlockId}
```

**Response:** JSON object containing device state

**Relevant fields for Opener:**
```json
{
  "smartlockId": 9634641666,
  "type": 2,
  "name": "Opener Name",
  "state": {
    "mode": 2,
    "state": 3,
    "batteryCritical": false,
    "ringToOpenTimer": 30
  }
}
```

**Opener State Values:**
| State | Meaning |
|-------|---------|
| 0 | Untrained |
| 1 | Online (RTO inactive) |
| 2 | Ring to Open active |
| 3 | Ring to Open active |
| 4 | Open |
| 5 | Open |
| 6 | Opening |
| 7 | Opening |
| 253 | Boot run |
| 254 | Undefined |
| 255 | Undefined |

**Opener Mode Values:**
| Mode | Meaning |
|------|---------|
| 0 | Uninitialized |
| 1 | Pairing |
| 2 | Door mode (normal) |
| 3 | Continuous mode |
| 4 | Maintenance |

## Google Apps Script Implementation

### Configuration

The script should use Google Apps Script's Properties Service to store sensitive configuration:

```javascript
// Configuration keys to store in Script Properties
const CONFIG_KEYS = {
  NUKI_API_TOKEN: 'NUKI_API_TOKEN',
  OPENER_ID: 'OPENER_ID'
};
```

### Main Endpoints

The web app should expose the following endpoints via `doGet` and `doPost`:

#### 1. Activate Ring to Open
```
POST /?action=activateRTO
```

**Behavior:**
1. Send action=1 to Nuki API
2. Wait 2 seconds for the command to propagate
3. Verify state changed to RTO active (state 2 or 3)
4. If verification fails, retry up to 3 times with exponential backoff
5. Return success/failure with detailed message

**Response (JSON):**
```json
{
  "success": true,
  "message": "Ring to Open activado correctamente",
  "state": 3,
  "attempts": 1,
  "timestamp": "2025-12-25T18:30:00.000Z"
}
```

```json
{
  "success": false,
  "message": "Error al activar Ring to Open después de 3 intentos",
  "lastState": 1,
  "attempts": 3,
  "error": "Estado no cambió a RTO activo",
  "timestamp": "2025-12-25T18:30:15.000Z"
}
```

#### 2. Deactivate Ring to Open
```
POST /?action=deactivateRTO
```

**Behavior:**
1. Send action=2 to Nuki API
2. Wait 2 seconds
3. Verify state changed to online (state 1)
4. Retry logic same as activation

#### 3. Get Status
```
GET /?action=status
```

**Response (JSON):**
```json
{
  "success": true,
  "deviceName": "Portero",
  "mode": 2,
  "modeName": "Modo puerta",
  "state": 1,
  "stateName": "En línea",
  "ringToOpenActive": false,
  "batteryCritical": false,
  "timestamp": "2025-12-25T18:30:00.000Z"
}
```

#### 4. Toggle Ring to Open
```
POST /?action=toggleRTO
```

**Behavior:**
1. Get current state
2. If RTO is active (state 2 or 3), deactivate it
3. If RTO is inactive (state 1), activate it
4. Return new state with confirmation

### Core Functions

#### `activateRingToOpen(maxRetries = 3)`
```javascript
/**
 * Activates Ring to Open with verification and retry logic
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Object} Result object with success status and details
 */
```

#### `deactivateRingToOpen(maxRetries = 3)`
```javascript
/**
 * Deactivates Ring to Open with verification and retry logic
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Object} Result object with success status and details
 */
```

#### `getOpenerState()`
```javascript
/**
 * Retrieves the current state of the Nuki Opener
 * @returns {Object} Device state object from Nuki API
 */
```

#### `sendNukiAction(actionCode)`
```javascript
/**
 * Sends an action command to the Nuki API
 * @param {number} actionCode - The action code to send (1-5)
 * @returns {boolean} True if HTTP 204 received
 */
```

#### `verifyState(expectedStates, timeout = 5000)`
```javascript
/**
 * Verifies the Opener reached an expected state
 * @param {number[]} expectedStates - Array of acceptable state values
 * @param {number} timeout - Time to wait before checking (ms)
 * @returns {Object} Verification result with current state
 */
```

### Helper Functions

#### `sleep(ms)`
```javascript
/**
 * Pauses execution for specified milliseconds
 * Using Utilities.sleep() in Apps Script
 */
```

#### `getStateName(state)`
```javascript
/**
 * Converts state code to human-readable name (in Spanish)
 * @param {number} state - State code
 * @returns {string} Human-readable state name
 */
```

#### `getModeName(mode)`
```javascript
/**
 * Converts mode code to human-readable name (in Spanish)
 * @param {number} mode - Mode code
 * @returns {string} Human-readable mode name
 */
```

### Error Handling

The script should handle these error scenarios:

1. **Network errors**: Catch and retry with exponential backoff
2. **API rate limiting**: Respect Nuki's rate limits, add delays between requests
3. **Invalid configuration**: Return clear error if API token or Opener ID missing
4. **Timeout**: If verification takes too long, return partial success with warning
5. **Unexpected states**: Log and return the unexpected state for debugging

### Retry Logic

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 2000,      // 2 seconds
  backoffMultiplier: 1.5,  // Each retry waits 1.5x longer
  maxDelay: 10000          // Cap at 10 seconds
};
```

### Logging

Use `console.log()` for debugging. Logs are viewable in Apps Script's execution log.

Log entries should include:
- Timestamp
- Action being performed
- API response codes
- State before and after
- Retry attempts
- Any errors

## UI Text Strings (Spanish)

All user-facing text should be in Spanish:

```javascript
const MESSAGES = {
  // Success messages
  RTO_ACTIVATED: 'Ring to Open activado correctamente',
  RTO_DEACTIVATED: 'Ring to Open desactivado correctamente',
  RTO_ALREADY_ACTIVE: 'Ring to Open ya estaba activo',
  RTO_ALREADY_INACTIVE: 'Ring to Open ya estaba desactivado',
  
  // Error messages
  RTO_ACTIVATION_FAILED: 'Error al activar Ring to Open',
  RTO_DEACTIVATION_FAILED: 'Error al desactivar Ring to Open',
  CONFIG_MISSING: 'Configuración incompleta: falta {field}',
  API_ERROR: 'Error de comunicación con Nuki API',
  UNKNOWN_ACTION: 'Acción no reconocida: {action}',
  DEVICE_OFFLINE: 'El dispositivo parece estar desconectado',
  
  // State names
  STATE_UNTRAINED: 'Sin entrenar',
  STATE_ONLINE: 'En línea',
  STATE_RTO_ACTIVE: 'Ring to Open activo',
  STATE_OPEN: 'Abierto',
  STATE_OPENING: 'Abriendo',
  STATE_BOOT: 'Iniciando',
  STATE_UNDEFINED: 'Estado desconocido',
  
  // Mode names
  MODE_UNINITIALIZED: 'Sin inicializar',
  MODE_PAIRING: 'Emparejando',
  MODE_DOOR: 'Modo puerta',
  MODE_CONTINUOUS: 'Modo continuo',
  MODE_MAINTENANCE: 'Mantenimiento'
};
```

## Deployment Instructions

### 1. Create the Apps Script Project

1. Go to https://script.google.com
2. Create a new project
3. Name it "Nuki Ring to Open Controller"

### 2. Set Up Configuration

1. Go to Project Settings > Script Properties
2. Add the following properties:
   - `NUKI_API_TOKEN`: Your Nuki Web API token
   - `OPENER_ID`: Your Opener's device ID (e.g., `9634641666`)

### 3. Deploy as Web App

1. Click "Deploy" > "New deployment"
2. Select type: "Web app"
3. Configure:
   - Description: "Nuki RTO Controller v1.0"
   - Execute as: "Me"
   - Who has access: "Anyone" (or "Anyone with Google account" for more security)
4. Click "Deploy"
5. Copy the web app URL

### 4. Update Apple Shortcut

Replace the current Nuki API call with a call to your Apps Script web app:

```
URL: https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=activateRTO
Method: POST
Headers: Content-Type: application/json
```

## Apple Shortcut Integration

### Recommended Shortcut Flow

1. **Call the Apps Script endpoint**
   ```
   URL: {WEB_APP_URL}?action=activateRTO
   Method: POST
   ```

2. **Parse JSON response**
   Use "Get Dictionary from Input"

3. **Check success field**
   Use "If" action to check if `success` equals `true`

4. **Show notification**
   - On success: Show `message` field as notification
   - On failure: Show `message` field with alert sound

### Alternative: Status Check Shortcut

Create a separate shortcut to check the current status:

1. **Call status endpoint**
   ```
   URL: {WEB_APP_URL}?action=status
   Method: GET
   ```

2. **Parse and display**
   Show formatted status:
   ```
   Estado: {stateName}
   Modo: {modeName}
   Batería baja: {batteryCritical ? "Sí" : "No"}
   ```

## Testing

### Manual Testing via curl

```bash
# Test activation
curl -X POST "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=activateRTO"

# Test status
curl "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=status"

# Test deactivation
curl -X POST "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=deactivateRTO"

# Test toggle
curl -X POST "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=toggleRTO"
```

### Expected Test Results

1. **Activation when RTO is off**: Should return success with state 2 or 3
2. **Activation when RTO is on**: Should return success (already active)
3. **Deactivation when RTO is on**: Should return success with state 1
4. **Deactivation when RTO is off**: Should return success (already inactive)
5. **Status check**: Should return current device state
6. **Toggle**: Should flip the current state

## Security Considerations

1. **API Token Storage**: Store the Nuki API token in Script Properties, never in code
2. **Access Control**: Consider restricting web app access to "Anyone with Google account"
3. **Rate Limiting**: The Nuki API has rate limits; don't spam requests
4. **HTTPS Only**: Apps Script endpoints are always HTTPS
5. **No Sensitive Data in URLs**: Use POST body for sensitive operations

## Future Enhancements

1. **Scheduled RTO**: Add time-based activation/deactivation
2. **Logging to Spreadsheet**: Track all activations for audit purposes
3. **Multiple Devices**: Support controlling multiple Openers
4. **Push Notifications**: Send notifications via email or other services
5. **Webhook Support**: React to Nuki device state changes

## File Structure

```
/
├── Code.gs              # Main script file
├── Config.gs            # Configuration handling
├── NukiApi.gs           # Nuki API wrapper functions
├── Messages.gs          # Spanish UI strings
└── README.md            # Setup instructions
```

## References

- [Nuki Web API Documentation](https://developer.nuki.io/page/nuki-web-api-1-3-0/3)
- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)
- [Nuki Developer Forum](https://developer.nuki.io/)
