# Frontend LLM Integration Guide

## Request Format

### Standard HTTP Request (Non-Streaming)

```javascript
async function generateLLMResponse(userMessage, selectedModel) {
  try {
    const response = await fetch('/api/generatellmtext', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: getCurrentSessionId(),
        user_message: userMessage,
        model: selectedModel,
        chat_history: []  // optional
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('LLM Error:', data.error);
      if (data.received_parameters) {
        console.log('Sent parameters:', data.received_parameters);
        console.log('Expected parameters:', data.expected_format);
      }
      return null;
    }

    return data.result;
  } catch (error) {
    console.error('Request failed:', error);
  }
}
```

### WebSocket Streaming Request

```javascript
async function generateLLMResponseStreaming(userMessage, selectedModel, onChunk) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${window.location.host}/api/generatellmtextws`);

    let fullResponse = '';

    ws.onopen = () => {
      ws.send(JSON.stringify({
        session_id: getCurrentSessionId(),
        user_message: userMessage,
        model: selectedModel,
        chat_history: []  // optional
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        console.error('LLM Error:', data.error);
        reject(new Error(data.error));
        ws.close();
        return;
      }

      if (data.chunk) {
        // Received a chunk - call callback to update UI
        onChunk(data.chunk);
        fullResponse += data.chunk;
      }

      if (data.result) {
        // Final result received
        onChunk(data.result);
        fullResponse = data.result;
      }
    };

    ws.onclose = () => {
      resolve(fullResponse);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    };
  });
}
```

## Error Handling

### Handle Missing Parameters

```javascript
if (data.error === "'user_message' is required") {
  console.error('Missing required user_message');
  console.log('Expected format:', data.expected_format);
  // Show error to user
  displayError('Please enter a message');
}
```

### Handle Missing Backend

```javascript
if (data.error === "No LLM backend configured") {
  console.error('No LLM backend available');
  displayError('LLM backend not configured. Contact administrator.');
}
```

### Handle Connection Issues

```javascript
if (data.error.includes("Cannot connect to LM Studio")) {
  console.error('Cannot reach LM Studio');
  displayError('Unable to connect to LLM service. Please try again later.');
}
```

## Pre-Flight Checks

Before attempting generation, optionally check backend status:

```javascript
async function checkLLMBackendStatus() {
  try {
    const response = await fetch('/api/getllmdiagnostics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: getCurrentSessionId()
      })
    });

    const diagnostics = await response.json();

    return {
      ready: diagnostics.has_llm_support && diagnostics.backend_count > 0,
      backends: diagnostics.backends,
      status: diagnostics.status,
      error: diagnostics.error
    };
  } catch (error) {
    console.error('Diagnostics failed:', error);
    return { ready: false, error: error.message };
  }
}

// Use it
async function initializeChat() {
  const status = await checkLLMBackendStatus();

  if (!status.ready) {
    displayError('LLM service not available: ' + status.error);
    disableChat();
  } else {
    enableChat();
  }
}
```

## Response Field Reference

### HTTP Response Fields

| Field | Type | When Present | Meaning |
|-------|------|--------------|---------|
| `result` | string | Success | The generated LLM response |
| `model_used` | string | Success | Backend type that processed request |
| `success` | boolean | Success | Always `true` on success |
| `error` | string | Error | Error message |
| `received_parameters` | string | Error (invalid params) | What parameters were actually sent |
| `expected_format` | object | Error (invalid params) | What format was expected |

### WebSocket Message Types

Streaming responses arrive as separate JSON messages:

```javascript
// Chunk message (repeats multiple times)
{
  "chunk": "text chunk here"
}

// Final result message (sent once at end)
{
  "result": "complete response text"
}

// Error message
{
  "error": "error description"
}
```

## Complete Roleplay Chat Example

```javascript
class RoleplayChat {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.messageHistory = [];
  }

  async sendMessage(userMessage, selectedModel = null) {
    // Validate input
    if (!userMessage || userMessage.trim() === '') {
      console.error('Empty message');
      return null;
    }

    // Update UI - show user message
    this.addMessageToUI('user', userMessage);
    this.messageHistory.push({
      role: 'user',
      content: userMessage
    });

    try {
      // Check backend first
      const status = await this.checkBackend();
      if (!status.ready) {
        this.addMessageToUI('error', 'LLM service unavailable');
        return null;
      }

      // Generate response with streaming
      const assistantMessage = await new Promise((resolve, reject) => {
        const ws = new WebSocket(
          `ws://${window.location.host}/api/generatellmtextws`
        );
        let fullResponse = '';

        ws.onopen = () => {
          ws.send(JSON.stringify({
            session_id: this.sessionId,
            user_message: userMessage,
            model: selectedModel,
            chat_history: this.messageHistory.slice(0, -1)
          }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.error) {
            this.addMessageToUI('error', data.error);
            reject(new Error(data.error));
            return;
          }

          if (data.chunk) {
            fullResponse += data.chunk;
            this.updateLastMessageUI(fullResponse);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        ws.onclose = () => {
          resolve(fullResponse);
        };
      });

      // Add assistant response to history
      this.messageHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;
    } catch (error) {
      console.error('Generation failed:', error);
      this.addMessageToUI('error', 'Failed to generate response: ' + error.message);
      return null;
    }
  }

  async checkBackend() {
    try {
      const response = await fetch('/api/getllmdiagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId })
      });

      const data = await response.json();
      return {
        ready: data.has_llm_support && data.backend_count > 0,
        details: data
      };
    } catch (error) {
      console.error('Status check failed:', error);
      return { ready: false };
    }
  }

  addMessageToUI(role, content) {
    // Implementation specific to your UI framework
    console.log(`[${role}]: ${content}`);
  }

  updateLastMessageUI(content) {
    // Implementation specific to your UI framework
    console.log(`[updating]: ${content}`);
  }
}

// Usage
const chat = new RoleplayChat(sessionId);
const response = await chat.sendMessage('Hello, how are you?', 'gpt-3.5-turbo');
```

## Key Points for Frontend Implementation

1. **Always send `session_id`** - Required for all requests
2. **Always send `user_message`** - This is the actual text to generate from
3. **Model parameter is optional** - Will use backend default if not provided
4. **Chat history is optional** - Can enhance context but not required
5. **Use WebSocket for better UX** - Streaming shows text appearing in real-time
6. **Handle errors gracefully** - Check for `error` field in responses
7. **Monitor logs** - Server logs show exactly what's being sent/received

## Debugging Tips

1. **Open DevTools Network tab** - See actual requests/responses
2. **Check browser console** - See JavaScript errors
3. **Check server logs** - See backend processing details
4. **Use diagnostic endpoint** - Verify backend status before trying to generate
5. **Test with curl** - Verify endpoint works outside browser:
   ```bash
   curl -X POST http://localhost:8080/api/generatellmtext \
     -H "Content-Type: application/json" \
     -d '{"session_id":"test","user_message":"Hello"}'
   ```
