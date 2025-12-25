# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Google Apps Script web application that serves as middleware between Apple Shortcuts and the Nuki Web API. It provides reliable feedback, retry logic, and state verification for controlling Nuki devices:

- **Nuki Opener**: Ring to Open (RTO), continuous mode, electric strike actuation
- **Nuki Smart Lock Pro**: Lock, unlock, unlatch (open door)

The script solves the problem of Nuki API's silent failures (HTTP 204 even on failure) by adding verification and retry logic.

## Architecture

```
Apple Shortcut → Google Apps Script (Web App) → Nuki Web API
                        ↓
                 Verification & Retry Loop
```

## Google Apps Script specifics

- **No local execution**: Code runs in Google's cloud. Use the Apps Script editor at script.google.com or deploy via clasp (but never use clasp automatically - always ask user first).
- **Configuration**: Store `NUKI_API_TOKEN`, `OPENER_ID`, and `SMARTLOCK_ID` in Script Properties (Project Settings > Script Properties), never in code.
- **Deployment**: Deploy as Web App with "Execute as: Me" and appropriate access level.
- **Files use `.gs` extension**: Main code goes in `Code.gs`, with optional separation into `Config.gs`, `NukiApi.gs`, `Messages.gs`.

## API endpoints

The web app exposes these endpoints via `doGet` and `doPost`:

### Opener endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `?action=activateRTO` | POST | Activate Ring to Open with verification |
| `?action=deactivateRTO` | POST | Deactivate Ring to Open with verification |
| `?action=toggleRTO` | POST | Toggle current RTO state |
| `?action=openerStatus` | GET | Get Opener device state |
| `?action=electricStrike` | POST | Actuate electric strike (buzz open) |
| `?action=activateContinuous` | POST | Activate continuous mode |
| `?action=deactivateContinuous` | POST | Deactivate continuous mode |

### Smart Lock endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `?action=lock` | POST | Lock the door |
| `?action=unlock` | POST | Unlock the door |
| `?action=unlatch` | POST | Unlatch/open the door |
| `?action=lockStatus` | GET | Get Smart Lock device state |

### General endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `?action=status` | GET | Get status of all devices |

## Nuki API reference

- **Base URL**: `https://api.nuki.io`
- **Auth**: Bearer token in Authorization header
- **Important**: POST action returns HTTP 204 always, even on failure - must verify state separately

### Smart Lock (type 0) action codes

| Code | Action |
|------|--------|
| 1 | Unlock |
| 2 | Lock |
| 3 | Unlatch (open door) |
| 4 | Lock 'n' Go |
| 5 | Lock 'n' Go with unlatch |

### Smart Lock states

| State | Meaning |
|-------|---------|
| 1 | Locked |
| 2 | Unlocking |
| 3 | Unlocked |
| 4 | Locking |
| 5 | Unlatched |
| 6 | Unlocked (lock 'n' go) |
| 7 | Unlatching |
| 254 | Motor blocked |
| 255 | Undefined |

### Opener (type 2) action codes

| Code | Action |
|------|--------|
| 1 | Activate RTO |
| 2 | Deactivate RTO |
| 3 | Electric strike actuation |
| 4 | Activate continuous mode |
| 5 | Deactivate continuous mode |

### Opener states

| State | Meaning |
|-------|---------|
| 1 | Online (RTO inactive) |
| 2, 3 | RTO active |
| 4, 5 | Open |
| 6, 7 | Opening |

## Testing

```bash
# Via curl after deployment
# Opener actions
curl -X POST "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=activateRTO"
curl -X POST "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=electricStrike"

# Smart Lock actions
curl -X POST "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=unlock"
curl -X POST "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=unlatch"

# Status
curl "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=status"
```

## Language requirements

- All user-facing messages in Spanish (see MESSAGES object in spec)
- Code comments and documentation in English
