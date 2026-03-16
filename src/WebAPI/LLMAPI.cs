using System.Net.WebSockets;
using Newtonsoft.Json.Linq;
using SwarmUI.Accounts;
using SwarmUI.Backends;
using SwarmUI.Core;
using SwarmUI.LLMs;

namespace SwarmUI.WebAPI;

[API.APIClass("API routes for LLM Text Generation and directly related features.")]
public abstract class LLMAPI
{
    public static void Register()
    {
        API.RegisterAPICall(GenerateLLMText, true, Permissions.BasicTextGeneration);
        API.RegisterAPICall(GenerateLLMTextWS, true, Permissions.BasicTextGeneration);
        API.RegisterAPICall(GetLLMDiagnostics, false, Permissions.BasicTextGeneration);
    }

    [API.APIDescription("Get diagnostic information about LLM backend configuration and status.",
        """
            "status": "ok",
            "backends": [
                {
                    "id": 1,
                    "type": "simpleremotellm",
                    "name": "LM Studio",
                    "status": "RUNNING",
                    "address": "http://localhost:8000",
                    "enabled": true
                }
            ],
            "detected_model": "model-name",
            "available_features": ["llm", "remote_llm"],
            "parameter_requirements": {
                "user_message": "required string - the user's input message",
                "chat_history": "optional array - conversation history",
                "model": "optional string - model to use"
            }
        """)]
    public static async Task<JObject> GetLLMDiagnostics(Session session)
    {
        JObject result = new();
        try
        {
            // Get all LLM backends
            JArray backendsArray = new();
            foreach (BackendData backend in Program.Backends.AllBackends.Values.Where(b => b?.AbstractBackend is AbstractLLMBackend))
            {
                JObject backendObj = new()
                {
                    ["id"] = backend.ID,
                    ["type"] = backend.Type,
                    ["name"] = backend.Name,
                    ["status"] = backend.AbstractBackend.Status.ToString(),
                    ["enabled"] = backend.AbstractBackend.IsEnabled,
                };

                // Add backend-specific info
                if (backend.AbstractBackend is SimpleRemoteLLMBackend remoteBackend)
                {
                    backendObj["address"] = remoteBackend.Settings.Address;
                    backendObj["connection_timeout_seconds"] = remoteBackend.Settings.ConnectionAttemptTimeoutSeconds;
                    backendObj["allow_idle"] = remoteBackend.Settings.AllowIdle;
                }

                backendsArray.Add(backendObj);
            }

            // Get available features
            JArray featuresArray = new(Program.Backends.CurrentSupportedFeatures.ToArray());

            result["status"] = "ok";
            result["backends"] = backendsArray;
            result["backend_count"] = backendsArray.Count;
            result["available_features"] = featuresArray;
            result["has_llm_support"] = featuresArray.Any(f => f.ToString().Contains("llm"));
            result["parameter_requirements"] = new JObject()
            {
                ["user_message"] = "required string - the user's input message",
                ["chat_history"] = "optional array - previous messages in format [{\"role\": \"user/assistant\", \"content\": \"...\"}]",
                ["model"] = "optional string - LLM model name to use",
                ["session_id"] = "required string - your session identifier"
            };

            return result;
        }
        catch (Exception ex)
        {
            Logs.Error($"Error getting LLM diagnostics: {ex.ReadableString()}");
            return new JObject()
            {
                ["status"] = "error",
                ["error"] = ex.Message,
                ["details"] = ex.ReadableString()
            };
        }
    }

    [API.APIDescription("Generate text from an LLM.",
        """
            "result": "The LLM response text"
        """)]
    public static async Task<JObject> GenerateLLMText(Session session,
        [API.APIParameter("JSON object with 'user_message' (required), 'chat_history' (optional), and 'model' (optional)")] JObject rawInput)
    {
        Logs.Info($"[LLM API] GenerateLLMText called with input keys: {string.Join(", ", rawInput.Keys)}");

        try
        {
            // Validate required parameters
            if (!rawInput.TryGetValue("user_message", out JToken userMessageToken))
            {
                Logs.Warn($"[LLM API] Missing 'user_message' parameter. Available keys: {string.Join(", ", rawInput.Keys)}");
                return new JObject()
                {
                    ["error"] = "'user_message' is required",
                    ["received_parameters"] = string.Join(", ", rawInput.Keys),
                    ["expected_format"] = new JObject()
                    {
                        ["user_message"] = "string (required)",
                        ["chat_history"] = "array (optional)",
                        ["model"] = "string (optional)"
                    }
                };
            }

            string userMessage = userMessageToken.ToString();
            Logs.Info($"[LLM API] User message: {userMessage.Substring(0, Math.Min(100, userMessage.Length))}...");

            // Get optional parameters
            string model = rawInput.TryGetValue("model", out JToken modelToken) ? modelToken.ToString() : null;
            Logs.Info($"[LLM API] Using model: {model ?? "(default)"}");

            // Parse chat history if provided
            List<ConversationMessage> conversationHistory = new();
            if (rawInput.TryGetValue("chat_history", out JToken historyToken) && historyToken is JArray historyArray)
            {
                conversationHistory = LLMParamInput.ParseHistoryFromJson(historyArray);
                Logs.Info($"[LLM API] Parsed {conversationHistory.Count} history messages");
            }

            // Build LLM input
            LLMParamInput llmInput = new()
            {
                UserMessage = userMessage,
                Model = model ?? "default",
                ConversationHistory = conversationHistory
            };

            // Add optional system prompt if provided
            if (rawInput.TryGetValue("system_prompt", out JToken systemToken))
            {
                llmInput.SystemPrompt = systemToken.ToString();
                Logs.Info($"[LLM API] Using custom system prompt");
            }

            // Add optional generation parameters
            if (rawInput.TryGetValue("max_tokens", out JToken maxTokensToken) && int.TryParse(maxTokensToken.ToString(), out int maxTokens))
            {
                llmInput.MaxTokens = maxTokens;
                Logs.Info($"[LLM API] Max tokens: {maxTokens}");
            }

            if (rawInput.TryGetValue("temperature", out JToken tempToken) && float.TryParse(tempToken.ToString(), out float temp))
            {
                llmInput.Temperature = temp;
                Logs.Info($"[LLM API] Temperature: {temp}");
            }

            // Get the first available LLM backend
            AbstractLLMBackend backend = Program.Backends.AllBackends.Values
                .Where(b => b?.AbstractBackend is AbstractLLMBackend)
                .Select(b => b.AbstractBackend as AbstractLLMBackend)
                .FirstOrDefault();

            if (backend is null)
            {
                Logs.Error("[LLM API] No LLM backend available");
                return new JObject()
                {
                    ["error"] = "No LLM backend configured",
                    ["available_backends"] = Program.Backends.AllBackends.Count,
                    ["llm_backends"] = Program.Backends.AllBackends.Values.Count(b => b?.AbstractBackend is AbstractLLMBackend)
                };
            }

            Logs.Info($"[LLM API] Using backend: {backend.GetType().Name}");

            // Generate the response
            string result = await backend.Generate(llmInput);
            Logs.Info($"[LLM API] Generation complete. Response length: {result.Length}");

            return new JObject()
            {
                ["result"] = result,
                ["model_used"] = backend.GetType().Name,
                ["success"] = true
            };
        }
        catch (Exception ex)
        {
            Logs.Error($"[LLM API] Error in GenerateLLMText: {ex.ReadableString()}");
            return new JObject()
            {
                ["error"] = ex.Message,
                ["error_type"] = ex.GetType().Name,
                ["details"] = ex.ReadableString()
            };
        }
    }

    [API.APIDescription("Generate text from an LLM using WebSocket for streaming.",
        """
            // Chunks arrive as they're generated
            "chunk": "The"
            "chunk": " LLM"
            "chunk": " response"
            // Final message
            "result": "The complete response"
        """)]
    public static async Task<JObject> GenerateLLMTextWS(WebSocket socket, Session session,
        [API.APIParameter("JSON object with 'user_message' (required), 'chat_history' (optional), and 'model' (optional)")] JObject rawInput)
    {
        Logs.Info($"[LLM API] GenerateLLMTextWS called with input keys: {string.Join(", ", rawInput.Keys)}");

        try
        {
            // Validate required parameters
            if (!rawInput.TryGetValue("user_message", out JToken userMessageToken))
            {
                Logs.Warn($"[LLM API] Missing 'user_message' parameter in WS call. Available keys: {string.Join(", ", rawInput.Keys)}");
                return new JObject()
                {
                    ["error"] = "'user_message' is required",
                    ["received_parameters"] = string.Join(", ", rawInput.Keys)
                };
            }

            string userMessage = userMessageToken.ToString();
            Logs.Info($"[LLM API] WS User message: {userMessage.Substring(0, Math.Min(100, userMessage.Length))}...");

            string model = rawInput.TryGetValue("model", out JToken modelToken) ? modelToken.ToString() : null;
            Logs.Info($"[LLM API] WS Using model: {model ?? "(default)"}");

            // Parse chat history if provided
            List<ConversationMessage> conversationHistory = new();
            if (rawInput.TryGetValue("chat_history", out JToken historyToken) && historyToken is JArray historyArray)
            {
                conversationHistory = LLMParamInput.ParseHistoryFromJson(historyArray);
                Logs.Info($"[LLM API] WS Parsed {conversationHistory.Count} history messages");
            }

            // Build LLM input
            LLMParamInput llmInput = new()
            {
                UserMessage = userMessage,
                Model = model ?? "default",
                ConversationHistory = conversationHistory
            };

            // Add optional system prompt if provided
            if (rawInput.TryGetValue("system_prompt", out JToken systemToken))
            {
                llmInput.SystemPrompt = systemToken.ToString();
                Logs.Info($"[LLM API] WS Using custom system prompt");
            }

            // Get the first available LLM backend
            AbstractLLMBackend backend = Program.Backends.AllBackends.Values
                .Where(b => b?.AbstractBackend is AbstractLLMBackend)
                .Select(b => b.AbstractBackend as AbstractLLMBackend)
                .FirstOrDefault();

            if (backend is null)
            {
                Logs.Error("[LLM API] No LLM backend available for WS");
                return new JObject()
                {
                    ["error"] = "No LLM backend configured"
                };
            }

            Logs.Info($"[LLM API] WS Using backend: {backend.GetType().Name}");

            // Use the streaming generation
            await backend.GenerateLive(llmInput, "0", output =>
            {
                if (output is null) return;

                // Send chunks as they arrive
                if (output.TryGetValue("chunk", out JToken chunk))
                {
                    Logs.Debug($"[LLM API] WS Sending chunk: {chunk.ToString().Substring(0, Math.Min(50, chunk.ToString().Length))}");
                    Task sendTask = socket.SendJson(new JObject() { ["chunk"] = chunk }, API.WebsocketTimeout);
                    sendTask.Wait();
                }
                // Send final result
                else if (output.TryGetValue("result", out JToken result))
                {
                    Logs.Info($"[LLM API] WS Generation complete");
                    Task sendTask = socket.SendJson(new JObject() { ["result"] = result }, API.WebsocketTimeout);
                    sendTask.Wait();
                }
            });

            return new JObject() { ["success"] = true };
        }
        catch (Exception ex)
        {
            Logs.Error($"[LLM API] Error in GenerateLLMTextWS: {ex.ReadableString()}");
            return new JObject()
            {
                ["error"] = ex.Message,
                ["error_type"] = ex.GetType().Name
            };
        }
    }
}
