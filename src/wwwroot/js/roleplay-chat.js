/**
 * Roleplay Chat Component
 * Handles real-time LLM chat with streaming support and error recovery
 */

class RoleplayChat {
    constructor(sessionId, options = {}) {
        this.sessionId = sessionId;
        this.messageHistory = [];
        this.currentWS = null;
        this.isGenerating = false;
        this.lastError = null;

        // Configuration
        this.config = {
            maxRetries: 3,
            retryDelayMs: 1000,
            streamingEnabled: true,
            modelName: options.modelName || null,
            ...options
        };

        // Callbacks
        this.onMessage = options.onMessage || (() => {});
        this.onError = options.onError || (() => {});
        this.onStreamChunk = options.onStreamChunk || (() => {});
        this.onStatusChange = options.onStatusChange || (() => {});
    }

    /**
     * Check if LLM service is available
     */
    async checkServiceAvailable() {
        try {
            const response = await fetch('/api/getllmdiagnostics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: this.sessionId })
            });

            const data = await response.json();

            if (data.status !== 'ok') {
                throw new Error(data.error || 'Service check failed');
            }

            const isReady = data.has_llm_support && data.backend_count > 0;
            const status = {
                ready: isReady,
                backends: data.backends,
                backendCount: data.backend_count,
                features: data.available_features,
                error: isReady ? null : 'No LLM backend configured'
            };

            this.onStatusChange(status);
            return status;
        } catch (error) {
            const errorStatus = {
                ready: false,
                error: `Service check failed: ${error.message}`,
                backends: []
            };
            this.onStatusChange(errorStatus);
            return errorStatus;
        }
    }

    /**
     * Send message and get streaming response
     */
    async sendMessage(userMessage, retryCount = 0) {
        if (!userMessage || userMessage.trim() === '') {
            this.triggerError('Empty message');
            return null;
        }

        if (this.isGenerating) {
            this.triggerError('Already generating - please wait');
            return null;
        }

        this.isGenerating = true;

        try {
            // Add user message to history
            this.messageHistory.push({
                role: 'user',
                content: userMessage
            });

            // Callback for user message
            this.onMessage('user', userMessage);

            // Get response (with streaming)
            if (this.config.streamingEnabled) {
                return await this.sendMessageWithStreaming(userMessage);
            } else {
                return await this.sendMessageWithoutStreaming(userMessage);
            }
        } catch (error) {
            // Retry logic
            if (retryCount < this.config.maxRetries) {
                console.warn(`[RoleplayChat] Attempt ${retryCount + 1} failed, retrying...`, error);
                await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));

                // Remove the user message we added
                this.messageHistory.pop();

                return this.sendMessage(userMessage, retryCount + 1);
            } else {
                // All retries exhausted
                this.triggerError(`Failed after ${this.config.maxRetries} attempts: ${error.message}`);
                return null;
            }
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Send message with streaming response (WebSocket)
     */
    async sendMessageWithStreaming(userMessage) {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `ws://${window.location.host}/api/generatellmtextws`;
                const ws = new WebSocket(wsUrl);
                let fullResponse = '';
                let responseStarted = false;

                ws.onopen = () => {
                    const request = {
                        session_id: this.sessionId,
                        user_message: userMessage,
                        model: this.config.modelName,
                        chat_history: this.messageHistory.slice(0, -1) // Exclude the message we just added
                    };

                    console.log('[RoleplayChat] Sending streaming request:', request);
                    ws.send(JSON.stringify(request));
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);

                    if (data.error) {
                        console.error('[RoleplayChat] Stream error:', data.error);
                        this.triggerError(data.error);
                        ws.close();
                        reject(new Error(data.error));
                        return;
                    }

                    if (data.chunk) {
                        if (!responseStarted) {
                            responseStarted = true;
                            this.onMessage('assistant_start', '');
                        }
                        fullResponse += data.chunk;
                        this.onStreamChunk(data.chunk);
                    }

                    if (data.result) {
                        fullResponse = data.result;
                        if (!responseStarted) {
                            this.onMessage('assistant', fullResponse);
                        }
                    }
                };

                ws.onerror = (error) => {
                    console.error('[RoleplayChat] WebSocket error:', error);
                    this.triggerError('Connection error during streaming');
                    reject(error);
                };

                ws.onclose = () => {
                    if (fullResponse) {
                        // Add assistant message to history
                        this.messageHistory.push({
                            role: 'assistant',
                            content: fullResponse
                        });

                        if (responseStarted) {
                            this.onMessage('assistant_end', fullResponse);
                        }

                        resolve(fullResponse);
                    } else {
                        reject(new Error('No response received'));
                    }
                };

                this.currentWS = ws;
            } catch (error) {
                console.error('[RoleplayChat] Streaming setup error:', error);
                reject(error);
            }
        });
    }

    /**
     * Send message without streaming (HTTP POST)
     */
    async sendMessageWithoutStreaming(userMessage) {
        try {
            const response = await fetch('/api/generatellmtext', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    user_message: userMessage,
                    model: this.config.modelName,
                    chat_history: this.messageHistory.slice(0, -1)
                })
            });

            const data = await response.json();

            if (data.error) {
                // Provide helpful error messages
                if (data.received_parameters) {
                    console.error('[RoleplayChat] Parameter mismatch:', {
                        received: data.received_parameters,
                        expected: data.expected_format
                    });
                }
                throw new Error(data.error);
            }

            const result = data.result;

            // Add assistant message to history
            this.messageHistory.push({
                role: 'assistant',
                content: result
            });

            // Callback for assistant message
            this.onMessage('assistant', result);

            return result;
        } catch (error) {
            console.error('[RoleplayChat] HTTP request failed:', error);
            throw error;
        }
    }

    /**
     * Cancel current generation
     */
    cancelGeneration() {
        if (this.currentWS) {
            this.currentWS.close();
            this.currentWS = null;
        }
        this.isGenerating = false;
    }

    /**
     * Get conversation history
     */
    getHistory() {
        return [...this.messageHistory];
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.messageHistory = [];
    }

    /**
     * Get last N messages
     */
    getLastMessages(count) {
        return this.messageHistory.slice(-count);
    }

    /**
     * Set model to use for generation
     */
    setModel(modelName) {
        this.config.modelName = modelName;
    }

    /**
     * Internal: Trigger error callback
     */
    triggerError(message) {
        this.lastError = message;
        console.error('[RoleplayChat]', message);
        this.onError(message);
    }

    /**
     * Internal: Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoleplayChat;
}
