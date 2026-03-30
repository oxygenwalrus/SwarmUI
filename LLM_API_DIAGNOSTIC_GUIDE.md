# LLM API Diagnostic & Testing Guide

## Overview

The LLM API has been enhanced with comprehensive diagnostic capabilities and full LM Studio integration. This guide will help you test and troubleshoot the implementation.

## Step 1: Check Backend Configuration

### Check LLM Diagnostics Endpoint

**Endpoint:** `POST /api/getllmdiagnostics`

**Request:**
```json
{
  "session_id": "your-session-id"
}
```

**Expected Response:**
```json
{
  "status": "ok",
  "backends": [
    {
      "id": 1,
      "type": "simpleremotellm",
      "name": "LM Studio",
      "status": "RUNNING",
      "address": "http://localhost:8000",
      "enabled": true,
      "connection_timeout_seconds": 30,
      "allow_idle": false
    }
  ],
  "backend_count": 1,
  "available_features": ["llm", "remote_llm"],
  "has_llm_support": true,
  "parameter_requirements": {
    "user_message": "required string - the user's input message",
    "chat_history": "optional array - previous messages...",
    "model": "optional string - LLM model name to use",
    "session_id": "required string - your session identifier"
  }
}
```

### Troubleshooting Backend Status

If `backend_count` is 0 or `has_llm_support` is false:
1. Check that you've configured the Remote LLM backend in SwarmUI settings
2. Ensure the backend is enabled and has an address configured
3. Look at the `status` field - should be "RUNNING" or "IDLE"

## Step 2: Generate Text

### HTTP Request (Non-Streaming)

**Endpoint:** `POST /api/generatellmtext`

**Request:**
```json
{
  "session_id": "your-session-id",
  "user_message": "What is 2+2?",
  "model": "your-model-name"
}
```

**Response Example:**
```json
{
  "result": "2+2 equals 4",
  "model_used": "SimpleRemoteLLMBackend",
  "success": true
}
```

### WebSocket Request (Streaming)

**Endpoint:** `WebSocket /api/generatellmtextws`

**Request:**
```json
{
  "session_id": "your-session-id",
  "user_message": "Tell me a short story",
  "model": "your-model-name"
}
```

**Response (Streamed in chunks):**
```json
{"chunk": "Once"}
{"chunk": " upon"}
{"chunk": " a"}
{"chunk": " time..."}
{"result": "Once upon a time..."}
```

## Step 3: Monitor Server Logs

The implementation includes detailed logging at each stage. Check your server logs for these messages:

### Successful Request Flow
```
[LLM API] GenerateLLMText called with input keys: session_id, user_message, model
[LLM API] User message: What is 2+2?...
[LLM API] Using model: gpt-3.5-turbo
[LLM API] Using backend: SimpleRemoteLLMBackend
[SimpleRemoteLLMBackend] Generating for model: gpt-3.5-turbo
[SimpleRemoteLLMBackend] Backend address: http://localhost:8000
[SimpleRemoteLLMBackend] Requesting: http://localhost:8000/v1/chat/completions
[SimpleRemoteLLMBackend] Response status: 200
[SimpleRemoteLLMBackend] Reading streamed response...
[SimpleRemoteLLMBackend] Stream completed
[SimpleRemoteLLMBackend] Final response length: 45
```

### Common Error Messages

**"Missing 'user_message' parameter"**
- The frontend didn't send the required `user_message` field
- Check the request JSON structure

**"No LLM backend configured"**
- No backends were initialized
- Run `getllmdiagnostics` to check backend status
- Verify LM Studio backend configuration

**"Cannot connect to LM Studio at [address]"**
- LM Studio is not running or unreachable
- Check the address in backend settings
- Ensure LM Studio is accessible at the configured URL

**Backend returned status 400: {'input' is required}**
- The backend is not receiving properly formatted requests
- Check the request body structure
- Verify model name is correct

## Step 4: Frontend Integration

### Expected Frontend Request Format

When sending from the frontend (roleplay chat):

```javascript
fetch('/api/generatellmtext', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: currentSessionId,
    user_message: userInput,
    model: selectedModel,
    chat_history: conversationHistory  // optional
  })
})
```

### Key Points for Frontend

1. **Required Fields:**
   - `session_id`: Your active session ID
   - `user_message`: The text to send to the LLM

2. **Optional Fields:**
   - `model`: Model name (if not provided, uses default)
   - `chat_history`: Array of previous messages

3. **Error Handling:**
   Check response for `error` field:
   ```javascript
   if (response.error) {
     console.error('LLM Error:', response.error);
     console.log('Details:', response.details);
     console.log('Received parameters:', response.received_parameters);
   }
   ```

## Step 5: What the Logs Tell You

### Parameter Validation Logs
Shows exactly what parameters were received:
```
[LLM API] Missing 'user_message' parameter. Available keys: session_id, chat_history
```
This helps identify what the frontend is sending vs what's expected.

### Backend Selection Logs
Shows which backend was chosen:
```
[LLM API] Using backend: SimpleRemoteLLMBackend
```

### Network Communication Logs
Shows the actual request and response:
```
[SimpleRemoteLLMBackend] Sending request: {...json...}
[SimpleRemoteLLMBackend] Response status: 200
[SimpleRemoteLLMBackend] Chunk: Some text...
```

### Error Details
Full exception information for debugging:
```
[SimpleRemoteLLMBackend] Error: [Full exception traceback]
```

## Configuration Checklist

- [ ] LM Studio backend created in SwarmUI admin panel
- [ ] Backend address set to correct LM Studio URL (e.g., `http://localhost:8000`)
- [ ] Backend is enabled
- [ ] Backend status shows "RUNNING" in diagnostics
- [ ] Model name configured or using defaults
- [ ] Authorization headers added if needed (in backend settings)
- [ ] `user_message` parameter being sent from frontend
- [ ] Session ID included in all requests

## Debug Mode

To enable more detailed logging, look for `Logs.Debug()` calls in:
- `src/WebAPI/LLMAPI.cs` - API endpoint logging
- `src/Backends/SimpleRemoteLLMBackend.cs` - Backend integration logging

You can adjust the log level in server settings to see all debug messages.

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 400 error "'input' is required" | Frontend not sending `user_message` parameter |
| No LLM backends showing | Backend not created or not initialized |
| "Cannot connect to LM Studio" | LM Studio not running or wrong address |
| WebSocket connection fails | Check firewall, port availability |
| Very slow responses | LM Studio model too large or underpowered hardware |
| Chunks not streaming | WebSocket not properly connected or streaming disabled |

## Next Steps

1. **Test Diagnostics:** Call `/api/getllmdiagnostics` to verify backend status
2. **Test HTTP Request:** Send a test message via `/api/generatellmtext`
3. **Test WebSocket:** Try streaming request with `/api/generatellmtextws`
4. **Frontend Integration:** Update roleplay chat to send proper request format
5. **Monitor Logs:** Check server logs for detailed diagnostic information
