using Newtonsoft.Json.Linq;
using LLama.Common;

namespace SwarmUI.LLMs;

/// <summary>Represents a single message in the conversation history.</summary>
public class ConversationMessage
{
    public string Role { get; set; } // "user", "assistant", "system"
    public string Content { get; set; }

    public ConversationMessage() { }

    public ConversationMessage(string role, string content)
    {
        Role = role;
        Content = content;
    }

    public JObject ToJson() => new()
    {
        ["role"] = Role,
        ["content"] = Content
    };

    public static ConversationMessage FromJson(JObject json)
    {
        return new ConversationMessage(
            json["role"]?.ToString() ?? "user",
            json["content"]?.ToString() ?? ""
        );
    }
}

/// <summary>Inputs for a request to an LLM.</summary>
public class LLMParamInput
{
    /// <summary>The user's current message.</summary>
    public string UserMessage { get; set; }

    /// <summary>The model to use for generation.</summary>
    public string Model { get; set; }

    /// <summary>Previous conversation history for context.</summary>
    public List<ConversationMessage> ConversationHistory { get; set; } = new();

    /// <summary>Legacy chat history support.</summary>
    public ChatHistory ChatHistory { get; set; }

    /// <summary>Optional system prompt/context.</summary>
    public string SystemPrompt { get; set; } = "You are a helpful assistant.";

    /// <summary>Maximum tokens to generate.</summary>
    public int? MaxTokens { get; set; }

    /// <summary>Temperature for generation (0-2, higher = more creative).</summary>
    public float? Temperature { get; set; }

    /// <summary>Build the full messages array for OpenAI-compatible APIs.</summary>
    public JArray BuildMessagesForAPI()
    {
        JArray messages = new();

        // Add system prompt if provided
        if (!string.IsNullOrWhiteSpace(SystemPrompt))
        {
            messages.Add(new JObject()
            {
                ["role"] = "system",
                ["content"] = SystemPrompt
            });
        }

        // Add conversation history
        foreach (ConversationMessage msg in ConversationHistory)
        {
            messages.Add(msg.ToJson());
        }

        // Add current user message
        messages.Add(new JObject()
        {
            ["role"] = "user",
            ["content"] = UserMessage
        });

        return messages;
    }

    /// <summary>Parse conversation history from JSON array.</summary>
    public static List<ConversationMessage> ParseHistoryFromJson(JArray historyJson)
    {
        if (historyJson is null) return new();

        List<ConversationMessage> history = new();
        foreach (JObject msgJson in historyJson.OfType<JObject>())
        {
            history.Add(ConversationMessage.FromJson(msgJson));
        }
        return history;
    }
}
