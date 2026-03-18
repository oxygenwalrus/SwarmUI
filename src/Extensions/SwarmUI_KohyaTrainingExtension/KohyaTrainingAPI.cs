using SwarmUI.Core;
using SwarmUI.Utils;
using SwarmUI.WebAPI;
using System.Diagnostics;

namespace SwarmUI.Builtin_KohyaTrainingExtension;

[API.APIClass("Routes for Kohya LoRA training integration.")]
public static class KohyaTrainingAPI
{
    /// <summary>Check if Kohya SS is installed and running.</summary>
    public static (bool installed, string path, bool running, string message) CheckKohyaStatus()
    {
        string kohyaPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "kohya_ss");
        string kohyaGui = Path.Combine(kohyaPath, "gui.bat");
        bool installed = Directory.Exists(kohyaPath) && File.Exists(kohyaGui);

        if (!installed)
        {
            return (false, kohyaPath, false, "Kohya SS not found. Install from https://github.com/bmaltais/kohya_ss");
        }

        // Check if running on typical Kohya port (7860)
        bool running = false;
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
            var response = client.GetAsync("http://localhost:7860/api/").Result;
            running = response.IsSuccessStatusCode;
        }
        catch { }

        return (true, kohyaPath, running, running ? "Kohya SS is running" : "Kohya SS installed but not running");
    }

    /// <summary>Get LoRA training configuration template.</summary>
    [API.APIRoute(HttpMethod.Get, "/api/kohya/training-template")]
    public static JObject GetTrainingTemplate()
    {
        return new JObject()
        {
            ["model_type"] = "sd",
            ["model_path"] = "models/Stable-diffusion/sd_xl_base_1.0.safetensors",
            ["train_data_dir"] = "training_data",
            ["output_dir"] = "Models/Loras/my_lora",
            ["output_name"] = "my_lora",
            ["learning_rate"] = 1e-4,
            ["num_train_epochs"] = 10,
            ["batch_size"] = 1,
            ["resolution"] = "512,512",
            ["clip_skip"] = 2,
            ["mixed_precision"] = "fp16",
            ["use_8bit_adam"] = true,
            ["gradient_checkpointing"] = true,
            ["xformers"] = true
        };
    }

    /// <summary>List available training datasets in training_data directory.</summary>
    [API.APIRoute(HttpMethod.Get, "/api/kohya/datasets")]
    public static JArray ListTrainingDatasets()
    {
        string trainingDir = Path.Combine(Directory.GetCurrentDirectory(), "training_data");
        JArray datasets = [];

        if (!Directory.Exists(trainingDir))
        {
            return datasets;
        }

        foreach (var dir in Directory.GetDirectories(trainingDir))
        {
            var images = Directory.GetFiles(dir, "*.{jpg,png,webp}", SearchOption.TopDirectoryOnly)
                .Where(f => f.EndsWith(".jpg") || f.EndsWith(".png") || f.EndsWith(".webp"))
                .ToList();

            datasets.Add(new JObject()
            {
                ["name"] = Path.GetFileName(dir),
                ["image_count"] = images.Count,
                ["path"] = dir
            });
        }

        return datasets;
    }

    /// <summary>Get status of Kohya service and suggest setup steps.</summary>
    [API.APIRoute(HttpMethod.Get, "/api/kohya/status")]
    public static JObject GetKohyaSetupStatus()
    {
        var (installed, path, running, message) = CheckKohyaStatus();
        JObject result = new()
        {
            ["installed"] = installed,
            ["running"] = running,
            ["status_message"] = message,
            ["kohya_path"] = path,
            ["launch_command"] = installed ? $"cd {path} && python gui.py" : "Install Kohya SS first"
        };

        if (!installed)
        {
            result["setup_steps"] = new JArray()
            {
                "1. Download Kohya SS from https://github.com/bmaltais/kohya_ss/releases",
                "2. Extract to SwarmUI/../kohya_ss directory",
                "3. Run gui.bat to start Kohya web interface",
                "4. Access at http://localhost:7860"
            };
        }

        return result;
    }

    /// <summary>List trained LoRA models from output directory.</summary>
    [API.APIRoute(HttpMethod.Get, "/api/kohya/trained-loras")]
    public static JArray ListTrainedLoRAs()
    {
        string loraDir = Path.Combine(Directory.GetCurrentDirectory(), "Models", "Loras");
        JArray loras = [];

        if (!Directory.Exists(loraDir))
        {
            return loras;
        }

        foreach (var file in Directory.GetFiles(loraDir, "*.safetensors").Union(Directory.GetFiles(loraDir, "*.ckpt")))
        {
            var info = new FileInfo(file);
            loras.Add(new JObject()
            {
                ["name"] = Path.GetFileNameWithoutExtension(file),
                ["filename"] = Path.GetFileName(file),
                ["size_mb"] = Math.Round(info.Length / 1024.0 / 1024.0, 2),
                ["created"] = info.CreationTime,
                ["path"] = file
            });
        }

        return loras;
    }
}
