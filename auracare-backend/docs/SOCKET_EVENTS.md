# Socket.IO Event Standardization

This document outlines the standardized event names, room structure, and authentication patterns used in the AuraCare WebSocket implementation.

## Room Naming Convention

- **Patient Room**: `patient:<patientId>`
  - Example: `patient:507f1f77bcf86cd799439011`
  - Used for patient-specific events
  - Automatically joined by the patient and their family members

- **Staff Room**: `staff`
  - Global room for all staff/doctors/nurses
  - Used for system-wide notifications and alerts

## Standard Event Names

### Connection Events
- `connect` - When a client connects
- `disconnect` - When a client disconnects
- `connect_error` - When there's a connection error
- `server_heartbeat` - Sent every 30 seconds for connection health checking

### Alert Events
- `alert_created` - New alert generated
- `alert_acknowledged` - Alert was acknowledged by staff
- `alert_resolved` - Alert was resolved

### Vital Signs
- `vitals_update` - Regular vital signs update

### Emotion & Behavior
- `emotion_detected` - When patient emotion is detected
- `autoplay_media` - When system triggers media playback

### Media
- `media_added` - New media uploaded
- `media_approved` - Media approved by staff
- `media_rejected` - Media rejected by staff

### Room Control
- `lighting_update` - Room lighting changed
- `temperature_update` - Room temperature changed

### History & Audit
- `history_update` - New history entry added

### WebRTC (for future use)
- `webrtc_ready`
- `webrtc_offer`
- `webrtc_answer`
- `webrtc_ice_candidate`

## Authentication

1. **Connection**: Clients must provide a valid JWT token during connection
2. **Role-based Access**:
   - Patients can only join their own room
   - Family members can join their patient's room
   - Staff can join the staff room and any patient room

## Error Handling

- All error events are emitted as `error`
- Error objects include:
  ```typescript
  {
    code: string;  // Error code (e.g., 'AUTH_ERROR')
    message: string;  // Human-readable message
    details?: any;    // Additional error details
  }
  ```

## Best Practices

1. **Event Naming**:
   - Use past tense for events that indicate something happened (e.g., 'alert_created')
   - Use present tense for state updates (e.g., 'vitals_update')
   - Use snake_case for all event names

2. **Room Management**:
   - Join rooms on connection
   - Leave rooms when no longer needed
   - Use the socket service for room management

3. **Error Handling**:
   - Always handle error events
   - Implement reconnection logic
   - Log errors appropriately

## Testing

To test the WebSocket implementation:

```bash
# Install dependencies
npm install socket.io-client uuid

# Run tests
node test-socket-events.js
```

## Legacy Events

The following legacy events are still supported but deprecated:

| Legacy Event     | New Standard Event |
|------------------|-------------------|
| new_alert       | alert_created    |
| alert_updated   | alert_acknowledged/alert_resolved |
| vitals          | vitals_update    |
| new_media       | media_added      |
| media_approval  | media_approved   |
| room_lighting   | lighting_update  |

## Security Considerations

- Always validate all incoming events
- Never trust client-provided room names
- Use server-side authorization checks
- Rate limit event emission
- Log all critical operations
