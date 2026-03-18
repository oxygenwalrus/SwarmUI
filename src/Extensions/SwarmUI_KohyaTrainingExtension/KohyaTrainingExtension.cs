using SwarmUI.Core;
using System.Net.WebSockets;

namespace SwarmUI.Builtin_KohyaTrainingExtension;

/// <summary>Extension to integrate Kohya SS LoRA training with SwarmUI.</summary>
public class KohyaTrainingExtension : Extension
{
    public override string Name => "SwarmUI Kohya Training";
    public override string Description => "LoRA training integration with Kohya SS for SD 1.5 / SDXL / Flux.1 models";
    public override string Version => "1.0.0";

    public override void OnLoad(SwarmUICore core)
    {
        Logs.Info("Kohya Training Extension loaded");
        // Extension will register API routes via static initializer below
    }

    public override void OnPreInit()
    {
        // Optional: Pre-initialization setup
    }

    public override void OnPostInit()
    {
        Logs.Info("Kohya Training Extension initialized. Available at /extensions/kohya/");
    }

    /// <summary>Initialize Kohya training API routes.</summary>
    [System.Runtime.CompilerServices.ModuleInitializer]
    public static void RegisterKohyaAPIs()
    {
        if (SwarmUICore.CurrentCore is null)
        {
            return;
        }

        // Routes will be registered when extension initializes
        // See KohyaTrainingAPI.cs for endpoint definitions
    }
}
