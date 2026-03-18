# Kohya LoRA Training Extension for SwarmUI

Integrates **Kohya SS** LoRA training with SwarmUI, providing a convenient interface to train custom LoRAs without leaving SwarmUI.

## Features

- 🎨 **Train LoRAs** for SD 1.5, SDXL, and Flux.1
- ⚡ **Fast training** on consumer GPUs (16GB VRAM supported)
- 📊 **Dataset management** for organizing training images
- 🎁 **LoRA browser** showing all trained models
- 📖 **Integrated guides** with recommended settings

## Installation

### Step 1: Install Kohya SS

Download and extract Kohya SS to a folder next to SwarmUI:

```bash
# From SwarmUI parent directory
cd ..
# Download from: https://github.com/bmaltais/kohya_ss/releases
# Extract to:
unzip kohya_ss-vX.X.zip
```

Your folder structure should look like:
```
C:\Users\Phala\
  ├── SwarmUI/
  └── kohya_ss/
      ├── gui.bat
      ├── gui.ps1
      └── ...
```

### Step 2: Enable Extension

This extension is auto-detected when you place it in `src/Extensions/`.

If needed, add to your SwarmUI startup:
```bash
launch-windows.bat  # Automatically loads all extensions
```

### Step 3: Start Kohya

Launch Kohya web interface:

**Windows:**
```bash
cd ../kohya_ss
gui.bat
```

Access at: http://localhost:7860

## Usage

### In SwarmUI

1. Look for **"Kohya Training"** tab/section (once extension loads)
2. Use the **Training Datasets** section to see your training folders
3. Use the **Trained LoRAs** section to browse completed models

### Actual Training (Kohya UI)

1. Go to http://localhost:7860
2. Click **"LoRA"** tab
3. Configure:
   - **Model**: Your base model (e.g., `models/Stable-diffusion/sd_xl_base_1.0.safetensors`)
   - **Training data dir**: `training_data/my_style` (or your folder)
   - **Output dir**: `Models/Loras/my_lora_v1`
   - **Batch size**: 1-2 (for 16GB VRAM)
   - **Epochs**: 10-20
4. Click **"Train"**

## Training Folder Structure

Create image folders here:

```
SwarmUI/
└── training_data/
    ├── my_style/
    │   ├── image_1.jpg
    │   ├── image_2.jpg
    │   └── ... (20-50 images)
    │
    ├── character_style/
    │   └── ... (images)
    │
    └── concept_lora/
        └── ... (images)
```

## Recommended Settings (16GB VRAM)

### SD 1.5
- **Batch size**: 2-4
- **Resolution**: 512x512
- **Training time**: ~10 min for 10 epochs
- **Use case**: Quick style tests, subjects, concepts

### SDXL
- **Batch size**: 1-2
- **Resolution**: 512x512 (or 768x512)
- **Training time**: ~30 min for 10 epochs
- **Use case**: Higher quality outputs, professional styles

### Flux.1
- **Batch size**: 1
- **Resolution**: 512x512 (keep lower for 16GB)
- **Training time**: ~45 min for 5 epochs
- **Use case**: Best quality, latest model
- **Note**: Better results with [ai-toolkit](https://github.com/ostris/ai-toolkit)

## Trained LoRA Output

All trained LoRAs save to:
```
SwarmUI/Models/Loras/
```

They automatically appear in SwarmUI's **LoRA** parameter, ready to use!

## Tips

✅ **Best Practices**
- Use **20-50 clean images** per LoRA (quality > quantity)
- Images should be **512px+** resolution
- Keep consistent **subjects/styles** in each folder
- Train **10-20 epochs** (usually overkill beyond this)
- Use **mixed precision (fp16)** for speed

❌ **Common Issues**
- **"Out of memory"**: Reduce batch size to 1
- **Poor quality**: Add more images or train more epochs
- **Slow training**: Enable `xFormers` in Kohya settings
- **Can't find Kohya**: Ensure it's extracted to `C:\Users\Phala\kohya_ss`

## Advanced: Using ai-toolkit for Flux

For better Flux.1 results, use [ai-toolkit](https://github.com/ostris/ai-toolkit):

```bash
git clone https://github.com/ostris/ai-toolkit.git
cd ai-toolkit
pip install -r requirements.txt

# Create config.json then train:
python train.py --config config.json
```

This is faster and produces better LoRAs than Kohya for Flux.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Kohya not found | Make sure it's extracted to `../kohya_ss/` next to SwarmUI |
| Extension not loading | Rebuild SwarmUI: `launch-windows.bat` |
| Training crashes | Reduce batch size, enable gradient checkpointing in Kohya |
| Trained LoRA not appearing | Check `Models/Loras/` folder, refresh page |

## Links

- **Kohya SS**: https://github.com/bmaltais/kohya_ss
- **ai-toolkit**: https://github.com/ostris/ai-toolkit
- **LoRA Resources**: https://civitai.com/ (browse examples)
- **Training Guide**: https://github.com/bmaltais/kohya_ss/wiki

---

**Created for SwarmUI v0.9.8+**
*Extension adds UI/API layer for Kohya training integration*
