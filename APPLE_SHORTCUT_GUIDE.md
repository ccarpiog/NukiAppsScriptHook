# Guía de configuración de Apple Shortcuts

Esta guía explica cómo configurar Apple Shortcuts para usar el middleware de Nuki Apps Script Hook.

## Requisitos previos

1. Haber desplegado el Apps Script como Web App
2. Tener la URL del despliegue (formato: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`)

## Acciones disponibles

| Acción | Método | Parámetro | Descripción |
|--------|--------|-----------|-------------|
| Activar Ring to Open | POST | `?action=activateRTO` | Activa RTO en el Opener |
| Desactivar Ring to Open | POST | `?action=deactivateRTO` | Desactiva RTO |
| Alternar Ring to Open | POST | `?action=toggleRTO` | Cambia el estado de RTO |
| Abrir portero | POST | `?action=electricStrike` | Abre el portero (pulso) |
| Activar modo continuo | POST | `?action=activateContinuous` | Activa modo continuo |
| Desactivar modo continuo | POST | `?action=deactivateContinuous` | Desactiva modo continuo |
| Cerrar cerradura | POST | `?action=lock` | Cierra la Smart Lock |
| Abrir cerradura | POST | `?action=unlock` | Abre la Smart Lock |
| Abrir pestillo | POST | `?action=unlatch` | Abre el pestillo |
| Estado del Opener | GET | `?action=openerStatus` | Consulta estado del Opener |
| Estado de la cerradura | GET | `?action=lockStatus` | Consulta estado de la Smart Lock |
| Estado completo | GET | `?action=status` | Estado de todos los dispositivos |

## Shortcut básico (solo cambiar URL)

Si ya tienes un shortcut funcionando con la API de Nuki directamente, solo necesitas:

1. **Cambiar la URL** de `https://api.nuki.io/smartlock/{id}/action` a:
   ```
   https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=activateRTO
   ```

2. **Eliminar el header de Authorization** (ya no es necesario)

3. **Eliminar el body de la petición** (la acción va en la URL)

## Shortcut con notificaciones (recomendado)

Para aprovechar los mensajes de feedback del middleware:

### Paso 1: Obtener contenido de URL

- **Acción**: "Obtener contenido de URL" / "Get Contents of URL"
- **URL**: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=activateRTO`
- **Método**: POST
- **Headers**: (ninguno necesario)
- **Body**: (ninguno necesario)

### Paso 2: Obtener diccionario

- **Acción**: "Obtener diccionario de la entrada" / "Get Dictionary from Input"
- **Entrada**: Contenido de URL (del paso anterior)

### Paso 3: Obtener valor del mensaje

- **Acción**: "Obtener valor del diccionario" / "Get Value for Key"
- **Clave**: `message`
- **Diccionario**: Diccionario (del paso anterior)

### Paso 4: Mostrar notificación

- **Acción**: "Mostrar notificación" / "Show Notification"
- **Contenido**: Valor del diccionario (del paso anterior)

## Shortcut con manejo de errores (completo)

Para mostrar diferentes notificaciones según el resultado:

### Paso 1: Obtener contenido de URL
(igual que arriba)

### Paso 2: Obtener diccionario
(igual que arriba)

### Paso 3: Obtener valor de success

- **Acción**: "Obtener valor del diccionario"
- **Clave**: `success`

### Paso 4: Condición Si/If

- **Acción**: "Si" / "If"
- **Condición**: Valor del diccionario es igual a 1 (o "true")

### Paso 5a: Si es verdadero (éxito)

- **Acción**: "Obtener valor del diccionario"
- **Clave**: `message`
- **Acción**: "Mostrar notificación"
- **Título**: ✅ Nuki
- **Contenido**: (mensaje)

### Paso 5b: Si es falso (error)

- **Acción**: "Obtener valor del diccionario"
- **Clave**: `message`
- **Acción**: "Mostrar notificación"
- **Título**: ❌ Error
- **Contenido**: (mensaje)
- **Sonido**: Activar (para alertar del error)

## Ejemplos de respuestas

### Éxito
```json
{
  "success": true,
  "message": "Ring to Open activado correctamente",
  "state": 3,
  "stateName": "Ring to Open activo",
  "attempts": 1,
  "timestamp": "2025-12-25T18:30:00.000Z"
}
```

### Error
```json
{
  "success": false,
  "message": "Error al activar Ring to Open",
  "error": "Estado no cambió después de 4 verificaciones",
  "lastState": 1,
  "attempts": 4,
  "timestamp": "2025-12-25T18:30:15.000Z"
}
```

### Ya estaba en el estado deseado
```json
{
  "success": true,
  "message": "Ring to Open ya estaba activo",
  "state": 3,
  "stateName": "Ring to Open activo",
  "attempts": 0,
  "timestamp": "2025-12-25T18:30:00.000Z"
}
```

## Shortcut para consultar estado

### Paso 1: Obtener contenido de URL

- **URL**: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=status`
- **Método**: GET

### Paso 2-3: Obtener diccionario y valores

Obtener los valores que quieras mostrar:
- `opener.stateName` - Estado del Opener
- `opener.ringToOpenActive` - Si RTO está activo
- `smartlock.stateName` - Estado de la cerradura

### Paso 4: Mostrar resultado

- **Acción**: "Mostrar resultado" / "Show Result" o "Alerta" / "Alert"
- **Contenido**: Formatear los valores como prefieras

Ejemplo de texto:
```
Opener: {opener.stateName}
RTO: {opener.ringToOpenActive ? "Activo" : "Inactivo"}
Cerradura: {smartlock.stateName}
```

## Consejos

1. **Timeout**: El middleware puede tardar hasta 15 segundos si necesita reintentos. Asegúrate de que el shortcut no tenga un timeout muy corto.

2. **Automatizaciones**: Puedes usar estos shortcuts en automatizaciones de iOS (al llegar a casa, al salir, etc.)

3. **Widget**: Añade los shortcuts a un widget para acceso rápido.

4. **Siri**: Asigna frases de Siri a cada shortcut (ej: "Activa Ring to Open")

## Solución de problemas

| Problema | Solución |
|----------|----------|
| "Petición inválida" | Verifica que la URL tenga el parámetro `?action=...` |
| "Configuración incompleta" | Revisa que las Script Properties estén configuradas |
| "El dispositivo parece estar desconectado" | Verifica la conexión del dispositivo Nuki |
| Timeout | El comando puede tardar hasta 15s; aumenta el timeout del shortcut |
| "Method POST not allowed" | Estás usando GET para una acción que requiere POST |
