'use strict';

(function () {
    if (window.swarmQualityCoach) {
        return;
    }

    const LIVE_SUMMARY_ID = 'swarm_quality_coach_live_summary';
    const GENERATE_COACH_BUTTON_ID = 'alt_quality_coach_button';
    const GENERATE_COACH_POPOVER_KEY = 'quality_coach_generate';
    const GENERATE_COACH_POPOVER_ID = `popover_${GENERATE_COACH_POPOVER_KEY}`;
    const REVIEW_MODAL_ID = 'swarm_quality_coach_review_modal';
    const REVIEW_SECTION_TITLES = ['Overall Assessment', 'Visible Problems', 'Prompt Adherence', 'Next Setting Changes'];
    const SAFE_OVERRIDE_KEYS = ['steps', 'cfgscale', 'width', 'height', 'sampler', 'scheduler'];
    const MAX_PIXEL_SAMPLE_DIM = 320;
    const MAX_EFFECTIVE_STEPS_FIX = 80;
    const RECTIFIED_COMPAT_PREFIXES = [
        'stable-diffusion-v3',
        'flux-1',
        'flux-2',
        'auraflow-v1',
        'hidream-i1',
        'z-image',
        'chroma',
        'chroma-radiance',
        'zeta-chroma',
        'lumina-2',
        'qwen-image',
        'hunyuan-image-2_1',
        'longcat-image',
        'omnigen-2'
    ];
    const PROMPT_STOPWORDS = new Set([
        'about', 'after', 'again', 'almost', 'also', 'among', 'around', 'because', 'before', 'being',
        'between', 'could', 'every', 'from', 'into', 'just', 'like', 'make', 'much', 'only', 'over',
        'prompt', 'render', 'scene', 'should', 'some', 'than', 'that', 'their', 'there', 'these', 'this',
        'those', 'very', 'with', 'without', 'would', 'while', 'have', 'having', 'under', 'across',
        'background', 'foreground', 'style', 'image', 'photo', 'illustration'
    ]);

    function qcEnsureArrays() {
        if (!Array.isArray(window.swarmPreflightProviders)) {
            window.swarmPreflightProviders = [];
        }
        if (!Array.isArray(window.swarmImageActionProviders)) {
            window.swarmImageActionProviders = [];
        }
        if (!Array.isArray(window.swarmImageReviewProviders)) {
            window.swarmImageReviewProviders = [];
        }
    }

    function qcNormalize(value) {
        return (value ?? '').toString().trim().toLowerCase();
    }

    function qcToNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function qcClamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function qcRound(value, digits = 2) {
        const factor = Math.pow(10, digits);
        return Math.round(value * factor) / factor;
    }

    function qcFormatNumber(value, digits = 2) {
        const numeric = qcToNumber(value);
        if (numeric === null) {
            return '';
        }
        if (Number.isInteger(numeric)) {
            return `${numeric}`;
        }
        return `${parseFloat(numeric.toFixed(digits))}`;
    }

    function qcBooleanSetting(name, defaultValue) {
        const value = internalSiteJsGetUserSetting(name, defaultValue);
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            const normalized = qcNormalize(value);
            if (normalized === 'true') {
                return true;
            }
            if (normalized === 'false') {
                return false;
            }
        }
        return Boolean(value);
    }

    function qcNumberSetting(name, defaultValue) {
        const value = internalSiteJsGetUserSetting(name, defaultValue);
        const numeric = qcToNumber(value);
        return numeric === null ? defaultValue : numeric;
    }

    function qcStringSetting(name, defaultValue) {
        const value = internalSiteJsGetUserSetting(name, defaultValue);
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        return `${value}`;
    }

    function qcGetSettings() {
        return {
            enabled: qcBooleanSetting('qualitycoach.enabled', true),
            showLiveSummary: qcBooleanSetting('qualitycoach.showlivesummary', true),
            blockOnWarnings: qcBooleanSetting('qualitycoach.blockonwarnings', true),
            preferredReviewProvider: qcNormalize(qcStringSetting('qualitycoach.preferredreviewprovider', 'auto')) || 'auto',
            enablePixelSignals: qcBooleanSetting('qualitycoach.enablepixelsignals', true),
            enableMetadataRules: qcBooleanSetting('qualitycoach.enablemetadatarules', true),
            clipWarningThreshold: qcClamp(qcNumberSetting('qualitycoach.clipwarningthreshold', 0.02), 0.001, 0.5),
            blurWarningThreshold: qcClamp(qcNumberSetting('qualitycoach.blurwarningthreshold', 0.035), 0.001, 1),
            saturationWarningThreshold: qcClamp(qcNumberSetting('qualitycoach.saturationwarningthreshold', 0.68), 0.1, 1),
            resolutionDriftTolerance: qcClamp(qcNumberSetting('qualitycoach.resolutiondrifttolerance', 0.35), 0.05, 2),
            effectiveStepsTarget: qcClamp(qcNumberSetting('qualitycoach.effectivestepstarget', 12), 4, 64)
        };
    }

    function qcIsEnabled() {
        return qcGetSettings().enabled;
    }

    function qcShouldBlockOnWarnings() {
        const settings = qcGetSettings();
        return settings.enabled && settings.blockOnWarnings;
    }

    function qcHumanizeKey(key) {
        return {
            cfgscale: 'CFG Scale',
            steps: 'Steps',
            width: 'Width',
            height: 'Height',
            sampler: 'Sampler',
            scheduler: 'Scheduler'
        }[key] || key;
    }

    function qcFormatValue(value) {
        if (value === null || value === undefined || value === '') {
            return '(unset)';
        }
        if (typeof value === 'number') {
            return Number.isInteger(value) ? `${value}` : qcFormatNumber(value, 3);
        }
        if (typeof value === 'boolean') {
            return value ? 'enabled' : 'disabled';
        }
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return `${value}`;
    }

    function qcDescribeOverride(key, value, originalInput) {
        const original = key in (originalInput || {}) ? qcFormatValue(originalInput[key]) : '(unset)';
        return `${qcHumanizeKey(key)}: ${original} -> ${qcFormatValue(value)}`;
    }

    function qcSummarizeOverrides(originalInput, overrides) {
        return Object.entries(overrides || {}).map(([key, value]) => qcDescribeOverride(key, value, originalInput));
    }

    function qcNormalizeIssue(issue, originalInput) {
        if (!issue || !issue.title) {
            return null;
        }
        const overrides = issue.overrides || {};
        let overrideSummary = issue.overrideSummary;
        if (!Array.isArray(overrideSummary)) {
            overrideSummary = qcSummarizeOverrides(originalInput, overrides);
        }
        return {
            title: issue.title,
            description: issue.description || issue.detail || '',
            recommended: issue.recommended || '',
            severity: issue.severity || 'warning',
            overrides,
            overrideSummary
        };
    }

    function qcFinalizeIssues(originalInput, rawIssues) {
        const issues = [];
        const mergedOverrides = {};
        for (const rawIssue of rawIssues || []) {
            const issue = qcNormalizeIssue(rawIssue, originalInput);
            if (!issue) {
                continue;
            }
            issues.push(issue);
            Object.assign(mergedOverrides, issue.overrides || {});
        }
        return { issues, mergedOverrides };
    }

    function qcGetModelContext(input) {
        const selectedModel = input?.model || currentModelHelper?.curModel || '';
        const helperData = typeof modelsHelpers?.getDataFor === 'function'
            ? modelsHelpers.getDataFor('Stable-Diffusion', selectedModel)
            : null;
        return {
            compatClass: qcNormalize(helperData?.modelClass?.compatClass?.id || currentModelHelper?.curCompatClass),
            standardWidth: qcToNumber(helperData?.modelClass?.standardWidth || currentModelHelper?.curWidth),
            standardHeight: qcToNumber(helperData?.modelClass?.standardHeight || currentModelHelper?.curHeight),
            modelName: qcNormalize(selectedModel),
            specialFormat: qcNormalize(currentModelHelper?.curSpecialFormat)
        };
    }

    function qcIsTurboModel(modelContext) {
        return modelContext.compatClass.includes('turbo')
            || modelContext.modelName.includes('turbo')
            || modelContext.specialFormat.includes('turbo');
    }

    function qcIsLowCfgFamily(modelContext) {
        return modelContext.compatClass.startsWith('flux-1')
            || modelContext.compatClass.startsWith('flux-2')
            || modelContext.compatClass.startsWith('hunyuan-video')
            || qcIsTurboModel(modelContext);
    }

    function qcIsRectifiedFamily(modelContext) {
        return RECTIFIED_COMPAT_PREFIXES.some(prefix => modelContext.compatClass.startsWith(prefix));
    }

    function qcIsRandomizingSampler(sampler) {
        return sampler.includes('ancestral') || sampler.includes('sde');
    }

    function qcSuggestNonRandomizingSampler(sampler) {
        if (sampler.includes('euler_ancestral_cfg_pp')) {
            return 'euler_cfg_pp';
        }
        if (sampler.includes('euler_ancestral')) {
            return 'euler';
        }
        if (sampler.includes('dpm_2_ancestral')) {
            return 'dpm_2';
        }
        if (sampler.includes('dpmpp_2s_ancestral_cfg_pp')) {
            return 'dpmpp_2m_cfg_pp';
        }
        if (sampler.includes('dpmpp_2s_ancestral')) {
            return 'dpmpp_2m';
        }
        if (sampler.includes('dpmpp_2m_sde') || sampler.includes('dpmpp_sde') || sampler.includes('dpmpp_3m_sde')) {
            return 'dpmpp_2m';
        }
        if (sampler.includes('er_sde')) {
            return 'euler';
        }
        return 'euler';
    }

    function qcExtractPromptTerms(text) {
        const parts = `${text || ''}`
            .toLowerCase()
            .replace(/<[^>]+>/g, ' ')
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(part => part.length >= 4 && !PROMPT_STOPWORDS.has(part));
        return [...new Set(parts)].slice(0, 64);
    }

    function qcFindPromptConflicts(prompt, negativePrompt) {
        const promptTerms = qcExtractPromptTerms(prompt);
        if (promptTerms.length === 0) {
            return [];
        }
        const negativeTerms = new Set(qcExtractPromptTerms(negativePrompt));
        return promptTerms.filter(term => negativeTerms.has(term)).slice(0, 6);
    }

    function qcAnalyzeGenerationInput(input, context = {}) {
        const settings = qcGetSettings();
        const modelContext = qcGetModelContext(input);
        if (!settings.enabled || !settings.enableMetadataRules || !input) {
            return { issues: [], mergedOverrides: {}, modelContext };
        }
        const rawIssues = [];
        const cfgScale = qcToNumber(input.cfgscale);
        const steps = qcToNumber(input.steps);
        const width = qcToNumber(input.width);
        const height = qcToNumber(input.height);
        const sampler = qcNormalize(input.sampler);
        const scheduler = qcNormalize(input.scheduler);
        const initCreativity = qcToNumber(input.initimagecreativity);
        const hasInitImage = Boolean(input.initimage);
        const conflictTerms = qcFindPromptConflicts(input.prompt, input.negativeprompt);

        if (cfgScale !== null && steps !== null && cfgScale >= 10 && steps >= 40 && scheduler !== 'turbo') {
            const overrides = {
                cfgscale: qcIsLowCfgFamily(modelContext) ? 1 : 7,
                steps: 30
            };
            rawIssues.push({
                title: 'CFG and steps are both in overbake territory',
                description: 'Very high CFG plus very high step counts often harden textures, clip tones, and make the image feel overprocessed.',
                recommended: 'Lowering both usually preserves detail while reducing the burnt or crunchy look.',
                overrides
            });
        }

        if (!hasInitImage && steps !== null && steps > 45 && scheduler !== 'turbo') {
            rawIssues.push({
                title: 'Step count is high enough that quality may flatten out',
                description: 'Once step counts climb this far, many models stop gaining meaningful detail and instead drift toward harsher or more brittle rendering.',
                recommended: 'Trim steps back unless this model has a proven reason to run unusually long.',
                overrides: { steps: 36 }
            });
        }

        if (width && height) {
            const aspectRatio = Math.max(width, height) / Math.max(1, Math.min(width, height));
            if (width > 2048 || height > 2048 || aspectRatio > 3) {
                const overrides = modelContext.standardWidth && modelContext.standardHeight
                    ? { width: modelContext.standardWidth, height: modelContext.standardHeight }
                    : {};
                rawIssues.push({
                    title: 'Resolution request is unusually extreme',
                    description: 'Very large sizes or very stretched aspect ratios often introduce composition drift, repeated details, or washed-out structure.',
                    recommended: modelContext.standardWidth && modelContext.standardHeight
                        ? `The selected model is usually happiest around ${modelContext.standardWidth}x${modelContext.standardHeight}.`
                        : 'Try stepping back toward the model native size or a milder aspect ratio.',
                    overrides
                });
            }
        }

        if (cfgScale !== null && qcIsLowCfgFamily(modelContext) && cfgScale > 1.5) {
            rawIssues.push({
                title: 'CFG scale is high for a low-CFG model family',
                description: 'This model family prefers CFG near 1. Higher values can burn contrast, muddy details, or overbake the result.',
                recommended: `Selected model family: ${modelContext.compatClass || 'current model'}.`,
                overrides: { cfgscale: 1 }
            });
        }

        if (cfgScale !== null && sampler.includes('cfg_pp') && cfgScale > 2) {
            rawIssues.push({
                title: 'CFG++ sampler is outside its usual CFG range',
                description: 'CFG++ samplers are designed for a lower CFG range than standard samplers.',
                recommended: 'Keep CFG++ samplers between 0 and 2 unless you have a model-specific reason to push higher.',
                overrides: { cfgscale: 2 }
            });
        }

        if (scheduler === 'turbo' && steps !== null && steps > 10) {
            rawIssues.push({
                title: 'Turbo scheduler is using too many steps',
                description: 'Turbo is meant for a short-step workflow. Pushing the step count higher usually wastes time and can overcook the output.',
                recommended: 'Keep Turbo near its short-step range unless the model documentation says otherwise.',
                overrides: { steps: 10 }
            });
        }

        if (sampler && qcIsRectifiedFamily(modelContext) && qcIsRandomizingSampler(sampler)) {
            const suggestedSampler = qcSuggestNonRandomizingSampler(sampler);
            if (suggestedSampler && suggestedSampler !== sampler) {
                rawIssues.push({
                    title: 'Randomizing sampler selected on a rectified-flow family',
                    description: 'Ancestral and SDE samplers are a poor fit for rectified-flow families and often introduce avoidable instability.',
                    recommended: `Rectified-flow family detected: ${modelContext.compatClass || 'current model'}.`,
                    overrides: { sampler: suggestedSampler }
                });
            }
        }

        if (width && height && modelContext.standardWidth && modelContext.standardHeight) {
            const nativeArea = modelContext.standardWidth * modelContext.standardHeight;
            const currentArea = width * height;
            const areaRatio = currentArea / Math.max(1, nativeArea);
            const nativeAspect = modelContext.standardWidth / Math.max(1, modelContext.standardHeight);
            const currentAspect = width / Math.max(1, height);
            const aspectDelta = Math.abs(currentAspect - nativeAspect) / Math.max(0.01, nativeAspect);
            const areaMin = Math.max(0.55, 1 - settings.resolutionDriftTolerance);
            const areaMax = 1 + (settings.resolutionDriftTolerance * 1.8);
            if (areaRatio < areaMin || areaRatio > areaMax || aspectDelta > settings.resolutionDriftTolerance) {
                rawIssues.push({
                    title: 'Resolution is far from the model native size',
                    description: 'Running too far from the trained resolution or aspect ratio can soften detail, distort composition, or amplify artifacting.',
                    recommended: `Native size for the selected model is ${modelContext.standardWidth}x${modelContext.standardHeight}.`,
                    overrides: {
                        width: modelContext.standardWidth,
                        height: modelContext.standardHeight
                    }
                });
            }
        }

        if (hasInitImage && steps !== null && initCreativity !== null && initCreativity > 0 && initCreativity < 1 && scheduler !== 'turbo') {
            const effectiveSteps = steps * initCreativity;
            if (effectiveSteps < settings.effectiveStepsTarget) {
                const suggestedSteps = Math.min(MAX_EFFECTIVE_STEPS_FIX, Math.max(steps, Math.ceil(settings.effectiveStepsTarget / initCreativity)));
                if (suggestedSteps > steps) {
                    rawIssues.push({
                        title: 'Init Image Creativity is leaving too few effective steps',
                        description: `At the current settings, only about ${qcFormatNumber(effectiveSteps, 1)} effective steps will run after creativity is applied.`,
                        recommended: 'When effective steps get too low, img2img results often look thin, undercooked, or structurally confused.',
                        overrides: { steps: suggestedSteps }
                    });
                }
            }
        }

        if (conflictTerms.length > 0) {
            rawIssues.push({
                title: 'Prompt and negative prompt are fighting each other',
                description: `The same concepts appear in both places: ${conflictTerms.join(', ')}.`,
                recommended: 'When the prompt and negative prompt pull in opposite directions, the result often becomes muddy or inconsistent.'
            });
        }

        return { ...qcFinalizeIssues(input, rawIssues), modelContext };
    }

    function qcInterpretMetadata(metadata) {
        let readable = metadata || '';
        try {
            if (typeof interpretMetadata === 'function') {
                readable = interpretMetadata(metadata) || metadata || '';
            }
        }
        catch (error) {
            console.warn('Quality Coach failed to normalize image metadata:', error);
        }
        return readable || '';
    }

    function qcBuildReviewContext(rawContext = {}) {
        const metadataText = qcInterpretMetadata(rawContext.metadata);
        let parsedMetadata = {};
        try {
            parsedMetadata = metadataText ? JSON.parse(metadataText) : {};
        }
        catch (error) {
            console.warn('Quality Coach failed to parse review metadata:', error);
        }
        const params = parsedMetadata?.sui_image_params || {};
        const extra = parsedMetadata?.sui_extra_data || {};
        const prompt = params.prompt || extra.original_prompt || '';
        const negativeprompt = params.negativeprompt || extra.original_negativeprompt || '';
        const model = params.model || '';
        const width = qcToNumber(params.width);
        const height = qcToNumber(params.height);
        const steps = qcToNumber(params.steps);
        const cfgscale = qcToNumber(params.cfgscale);
        const sampler = params.sampler || '';
        const scheduler = params.scheduler || '';
        const initimagecreativity = qcToNumber(params.initimagecreativity ?? params.imageinitcreativity);
        const refinermodel = params.refinermodel || '';
        const refinercontrolpercentage = qcToNumber(params.refinercontrolpercentage);
        const hasInitImage = Boolean(params.initimage || extra.initimage || initimagecreativity);
        const input = {};
        if (prompt) {
            input.prompt = prompt;
        }
        if (negativeprompt) {
            input.negativeprompt = negativeprompt;
        }
        if (model) {
            input.model = model;
        }
        if (width) {
            input.width = width;
        }
        if (height) {
            input.height = height;
        }
        if (steps !== null) {
            input.steps = steps;
        }
        if (cfgscale !== null) {
            input.cfgscale = cfgscale;
        }
        if (sampler) {
            input.sampler = sampler;
        }
        if (scheduler) {
            input.scheduler = scheduler;
        }
        if (initimagecreativity !== null) {
            input.initimagecreativity = initimagecreativity;
        }
        if (hasInitImage) {
            input.initimage = true;
        }
        const reviewContext = {
            ...rawContext,
            src: rawContext.src || '',
            fullsrc: rawContext.fullsrc || (typeof getImageFullSrc === 'function' && rawContext.src ? getImageFullSrc(rawContext.src) : (rawContext.fullsrc || rawContext.src || '')),
            metadata: rawContext.metadata || '',
            metadataText,
            parsedMetadata,
            prompt,
            negativeprompt,
            model,
            width,
            height,
            steps,
            cfgscale,
            sampler,
            scheduler,
            initimagecreativity,
            refinermodel,
            refinercontrolpercentage,
            hasInitImage,
            hasMetadata: Boolean(metadataText),
            input,
            modelContext: qcGetModelContext(input)
        };
        reviewContext.fetchBlob = async () => {
            if (!reviewContext._blobPromise) {
                reviewContext._blobPromise = qcFetchBlob(reviewContext.src);
            }
            return reviewContext._blobPromise;
        };
        reviewContext.fetchImagePayload = async () => {
            if (!reviewContext._payloadPromise) {
                reviewContext._payloadPromise = reviewContext.fetchBlob().then(blob => qcImagePayloadFromBlob(blob));
            }
            return reviewContext._payloadPromise;
        };
        reviewContext.getPixelSignals = async () => {
            if (!reviewContext._pixelSignalsPromise) {
                reviewContext._pixelSignalsPromise = qcComputePixelSignals(reviewContext);
            }
            return reviewContext._pixelSignalsPromise;
        };
        return reviewContext;
    }

    async function qcFetchBlob(src) {
        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`Failed to load image (${response.status})`);
        }
        return response.blob();
    }

    function qcBlobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                if (typeof result !== 'string' || !result.includes(',')) {
                    reject(new Error('Failed to read image data'));
                    return;
                }
                resolve(result.split(',')[1]);
            };
            reader.onerror = () => reject(new Error('Failed to read image data'));
            reader.readAsDataURL(blob);
        });
    }

    async function qcImagePayloadFromBlob(blob) {
        return {
            base64Data: await qcBlobToBase64(blob),
            mediaType: blob.type || 'image/png'
        };
    }

    function qcLoadImageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const image = new Image();
            image.onload = () => {
                URL.revokeObjectURL(url);
                resolve(image);
            };
            image.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to decode image data'));
            };
            image.src = url;
        });
    }

    function qcHistogramPercentile(histogram, total, fraction) {
        const target = total * fraction;
        let running = 0;
        for (let i = 0; i < histogram.length; i++) {
            running += histogram[i];
            if (running >= target) {
                return i / 255;
            }
        }
        return 1;
    }

    async function qcComputePixelSignals(reviewContext) {
        const settings = qcGetSettings();
        if (!settings.enabled || !settings.enablePixelSignals) {
            return {
                available: false,
                disabled: true,
                reason: 'Pixel signal analysis is disabled in Quality Coach settings.'
            };
        }
        const blob = await reviewContext.fetchBlob();
        const image = await qcLoadImageFromBlob(blob);
        const scale = Math.min(1, MAX_PIXEL_SAMPLE_DIM / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(16, Math.round(image.naturalWidth * scale));
        const height = Math.max(16, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        const pixelCount = width * height;
        const grayscale = new Float32Array(pixelCount);
        const histogram = new Uint32Array(256);
        const borderX = Math.max(1, Math.round(width * 0.1));
        const borderY = Math.max(1, Math.round(height * 0.1));
        const sideClipCounts = { left: 0, right: 0, top: 0, bottom: 0 };
        const sidePixelCounts = { left: 0, right: 0, top: 0, bottom: 0 };
        let highlightCount = 0;
        let shadowCount = 0;
        let highSaturationCount = 0;
        let sumLuminance = 0;
        let sumSaturation = 0;
        for (let i = 0, index = 0; i < pixels.length; i += 4, index++) {
            const r = pixels[i] / 255;
            const g = pixels[i + 1] / 255;
            const b = pixels[i + 2] / 255;
            const lum = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const x = index % width;
            const y = Math.floor(index / width);
            const clippedHighlight = lum >= 0.985 || (r >= 0.98 && g >= 0.98 && b >= 0.98);
            const clippedShadow = lum <= 0.02;
            histogram[Math.min(255, Math.max(0, Math.round(lum * 255)))]++;
            grayscale[index] = lum;
            sumLuminance += lum;
            sumSaturation += saturation;
            if (clippedHighlight) {
                highlightCount++;
            }
            if (clippedShadow) {
                shadowCount++;
            }
            if (saturation >= settings.saturationWarningThreshold) {
                highSaturationCount++;
            }
            if (x < borderX) {
                sidePixelCounts.left++;
                if (clippedHighlight) {
                    sideClipCounts.left++;
                }
            }
            if (x >= width - borderX) {
                sidePixelCounts.right++;
                if (clippedHighlight) {
                    sideClipCounts.right++;
                }
            }
            if (y < borderY) {
                sidePixelCounts.top++;
                if (clippedHighlight) {
                    sideClipCounts.top++;
                }
            }
            if (y >= height - borderY) {
                sidePixelCounts.bottom++;
                if (clippedHighlight) {
                    sideClipCounts.bottom++;
                }
            }
        }
        let edgeStrength = 0;
        let edgeCount = 0;
        const sideEdgeTotals = { left: 0, right: 0, top: 0, bottom: 0 };
        const sideEdgeCounts = { left: 0, right: 0, top: 0, bottom: 0 };
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const index = (y * width) + x;
                const diffRight = Math.abs(grayscale[index] - grayscale[index + 1]);
                const diffDown = Math.abs(grayscale[index] - grayscale[index + width]);
                const diff = (diffRight + diffDown) * 0.5;
                edgeStrength += diff;
                edgeCount++;
                if (x < borderX) {
                    sideEdgeTotals.left += diff;
                    sideEdgeCounts.left++;
                }
                if (x >= width - borderX - 1) {
                    sideEdgeTotals.right += diff;
                    sideEdgeCounts.right++;
                }
                if (y < borderY) {
                    sideEdgeTotals.top += diff;
                    sideEdgeCounts.top++;
                }
                if (y >= height - borderY - 1) {
                    sideEdgeTotals.bottom += diff;
                    sideEdgeCounts.bottom++;
                }
            }
        }
        const sideEdgeAverages = Object.fromEntries(Object.entries(sideEdgeTotals).map(([key, value]) => {
            const count = Math.max(1, sideEdgeCounts[key]);
            return [key, value / count];
        }));
        const sideEntries = Object.entries(sideEdgeAverages);
        const dominantSide = sideEntries.sort((a, b) => b[1] - a[1])[0];
        const averageSideEdge = sideEntries.reduce((total, [, value]) => total + value, 0) / Math.max(1, sideEntries.length);
        const contrastRange = qcHistogramPercentile(histogram, pixelCount, 0.95) - qcHistogramPercentile(histogram, pixelCount, 0.05);
        return {
            available: true,
            sampleWidth: width,
            sampleHeight: height,
            actualWidth: image.naturalWidth,
            actualHeight: image.naturalHeight,
            highlightClipping: highlightCount / pixelCount,
            shadowClipping: shadowCount / pixelCount,
            highSaturationFraction: highSaturationCount / pixelCount,
            averageSaturation: sumSaturation / pixelCount,
            averageLuminance: sumLuminance / pixelCount,
            contrastRange,
            edgeStrength: edgeCount === 0 ? 0 : edgeStrength / edgeCount,
            dominantEdgeSide: dominantSide?.[0] || null,
            dominantEdgeRatio: averageSideEdge > 0 ? ((dominantSide?.[1] || 0) / averageSideEdge) : 0,
            borderHighlightFractions: Object.fromEntries(Object.entries(sideClipCounts).map(([key, value]) => {
                return [key, value / Math.max(1, sidePixelCounts[key])];
            }))
        };
    }

    function qcBuildPixelFindings(reviewContext, pixelSignals, settings) {
        if (!pixelSignals?.available) {
            return [];
        }
        const findings = [];
        if (pixelSignals.highlightClipping >= settings.clipWarningThreshold) {
            const pct = qcFormatNumber(pixelSignals.highlightClipping * 100, 1);
            findings.push(`Highlights look clipped in roughly ${pct}% of the sampled image, which usually reads as blown-out light or glossy overprocessing.`);
        }
        if (pixelSignals.shadowClipping >= settings.clipWarningThreshold) {
            const pct = qcFormatNumber(pixelSignals.shadowClipping * 100, 1);
            findings.push(`Shadows are crushing in roughly ${pct}% of the sampled image, so darker areas may be losing shape and separation.`);
        }
        if (pixelSignals.highSaturationFraction >= 0.12 || pixelSignals.averageSaturation >= settings.saturationWarningThreshold) {
            findings.push('Color intensity is running hot, which can make the image feel oversaturated or push skin and highlights into an artificial look.');
        }
        if (pixelSignals.contrastRange <= 0.28) {
            findings.push('Overall contrast looks compressed, so the image may read flatter or more washed out than intended.');
        }
        if (pixelSignals.edgeStrength <= settings.blurWarningThreshold) {
            findings.push('Edge detail is soft for the sampled size, suggesting blur, mushiness, or detail loss.');
        }
        if (pixelSignals.dominantEdgeSide && pixelSignals.dominantEdgeRatio >= 1.85) {
            findings.push(`A lot of visual weight is crowded toward the ${pixelSignals.dominantEdgeSide} edge, so the composition may feel cramped or unbalanced.`);
        }
        if (findings.length === 0) {
            findings.push('No strong clipping, saturation, blur, or contrast problems stood out in the local pixel scan.');
        }
        return findings;
    }

    function qcInferPromptAdherence(reviewContext, pixelSignals) {
        if (!reviewContext.prompt) {
            return {
                text: 'No prompt metadata was available, so fallback mode cannot judge adherence beyond generic quality signals.',
                confidence: 0.2
            };
        }
        const prompt = qcNormalize(reviewContext.prompt);
        const notes = [];
        let confidence = 0.45;
        const wantsSoftLook = ['soft', 'pastel', 'muted', 'dreamy', 'mist', 'fog', 'gentle'].some(term => prompt.includes(term));
        const wantsSharpLook = ['sharp', 'crisp', 'detailed', 'intricate', 'high detail', 'ultra detailed'].some(term => prompt.includes(term));
        const wantsLowKeyLook = ['dark', 'night', 'moody', 'low key'].some(term => prompt.includes(term));
        if (pixelSignals?.available) {
            confidence += 0.15;
            if (wantsSoftLook && (pixelSignals.highlightClipping > 0.02 || pixelSignals.highSaturationFraction > 0.12)) {
                notes.push('The prompt hints at a softer or more restrained look, but the render is coming through hotter and more intense than that.');
                confidence += 0.05;
            }
            if (wantsSharpLook && pixelSignals.edgeStrength <= qcGetSettings().blurWarningThreshold) {
                notes.push('The prompt leans toward crisp detail, yet the image reads softer than that target.');
                confidence += 0.05;
            }
            if (wantsLowKeyLook && pixelSignals.highlightClipping > qcGetSettings().clipWarningThreshold) {
                notes.push('The prompt suggests a darker mood, but clipped highlights are pulling the image away from that low-key direction.');
                confidence += 0.03;
            }
        }
        if (notes.length === 0) {
            notes.push('Heuristic only: the prompt metadata is present, but fallback mode cannot verify subject-level accuracy. Nothing in the local signals suggests an obvious style mismatch.');
        }
        return {
            text: notes.join(' '),
            confidence: qcClamp(confidence, 0.25, 0.8)
        };
    }

    async function qcBuildFallbackReview(reviewContext) {
        const settings = qcGetSettings();
        const metadataAnalysis = qcAnalyzeGenerationInput(reviewContext.input, { reviewContext, source: 'review' });
        let pixelSignals;
        try {
            pixelSignals = await reviewContext.getPixelSignals();
        }
        catch (error) {
            console.warn('Quality Coach pixel analysis failed:', error);
            pixelSignals = {
                available: false,
                reason: error?.message || `${error}`
            };
        }
        if ((!reviewContext.width || !reviewContext.height) && pixelSignals?.available) {
            if (!reviewContext.width) {
                reviewContext.width = pixelSignals.actualWidth;
            }
            if (!reviewContext.height) {
                reviewContext.height = pixelSignals.actualHeight;
            }
        }
        const suggestedOverrides = { ...metadataAnalysis.mergedOverrides };
        if (reviewContext.cfgscale !== null && !('cfgscale' in suggestedOverrides) && pixelSignals?.available && reviewContext.cfgscale > 5) {
            if (pixelSignals.highlightClipping >= settings.clipWarningThreshold || pixelSignals.highSaturationFraction >= 0.12) {
                suggestedOverrides.cfgscale = qcIsLowCfgFamily(reviewContext.modelContext)
                    ? 1
                    : qcRound(Math.max(4, reviewContext.cfgscale - 1), 1);
            }
        }
        if (reviewContext.steps !== null && !('steps' in suggestedOverrides) && pixelSignals?.available && reviewContext.steps > 28) {
            if (pixelSignals.highlightClipping >= settings.clipWarningThreshold) {
                suggestedOverrides.steps = Math.max(20, reviewContext.steps - 4);
            }
        }
        const overrideSummary = qcSummarizeOverrides(reviewContext.input, suggestedOverrides);
        const pixelFindings = qcBuildPixelFindings(reviewContext, pixelSignals, settings);
        const promptAdherence = qcInferPromptAdherence(reviewContext, pixelSignals);
        const visibleProblems = [];
        for (const finding of pixelFindings) {
            visibleProblems.push(finding);
        }
        for (const issue of metadataAnalysis.issues.slice(0, 4)) {
            const line = issue.description
                ? `${issue.title}. ${issue.description}`
                : issue.title;
            visibleProblems.push(line);
        }
        const hasMajorSignal = metadataAnalysis.issues.length > 0
            || pixelSignals?.highlightClipping >= settings.clipWarningThreshold
            || pixelSignals?.edgeStrength <= settings.blurWarningThreshold
            || pixelSignals?.highSaturationFraction >= 0.12;
        const overallAssessment = hasMajorSignal
            ? 'Fallback review suggests the image is carrying one or more technical stress signals, most likely from a hot settings combination or a resolution mismatch.'
            : 'Fallback review does not see a strong overbake signal from the metadata rules or the local pixel scan.';
        const nextSettingChanges = overrideSummary.length > 0
            ? overrideSummary.join('\n')
            : reviewContext.hasMetadata
                ? 'No safe automatic parameter override stood out from the available metadata. If the result still feels too hot, try a small CFG reduction or a few fewer steps on the next pass.'
                : 'No safe automatic parameter override is available because the source image metadata was incomplete.';
        const confidence = qcClamp(
            0.25
            + (reviewContext.hasMetadata ? 0.2 : 0)
            + (pixelSignals?.available ? 0.2 : 0)
            + ((metadataAnalysis.issues.length > 0 || pixelSignals?.available) ? 0.05 : 0),
            0.25,
            0.8
        );
        const notes = ['Fallback review uses local pixel signals and metadata heuristics only.'];
        if (!reviewContext.prompt) {
            notes.push('Prompt adherence is low-confidence because no prompt metadata was attached to this image.');
        }
        if (pixelSignals?.disabled) {
            notes.push(pixelSignals.reason);
        }
        return {
            providerId: 'fallback',
            providerLabel: 'Fallback',
            mode: 'fallback',
            sections: [
                { id: 'overall-assessment', title: 'Overall Assessment', content: overallAssessment },
                { id: 'visible-problems', title: 'Visible Problems', content: visibleProblems.join('\n') },
                { id: 'prompt-adherence', title: 'Prompt Adherence', content: promptAdherence.text },
                { id: 'next-setting-changes', title: 'Next Setting Changes', content: nextSettingChanges }
            ],
            suggestedOverrides,
            confidence: Math.max(confidence, promptAdherence.confidence),
            notes
        };
    }

    function qcDefaultSections() {
        return REVIEW_SECTION_TITLES.map(title => ({
            id: qcNormalize(title).replace(/\s+/g, '-'),
            title,
            content: ''
        }));
    }

    function qcParseReviewText(text) {
        const sections = qcDefaultSections();
        const map = Object.fromEntries(sections.map(section => [qcNormalize(section.title), section]));
        const lines = `${text || ''}`.replace(/\r/g, '').split('\n');
        let current = null;
        let foundAnyHeading = false;
        for (const line of lines) {
            const match = line.match(/^\s*(?:[#>*-]+\s*)?(?:\*\*)?(Overall Assessment|Visible Problems|Prompt Adherence|Next Setting Changes)(?:\*\*)?\s*:?\s*(.*)$/i);
            if (match) {
                foundAnyHeading = true;
                const key = qcNormalize(match[1]);
                current = map[key];
                if (current && match[2]) {
                    current.content = current.content ? `${current.content}\n${match[2].trim()}` : match[2].trim();
                }
                continue;
            }
            if (current) {
                current.content = current.content ? `${current.content}\n${line}` : line;
            }
        }
        if (!foundAnyHeading) {
            sections[0].content = `${text || ''}`.trim();
        }
        for (const section of sections) {
            section.content = (section.content || '').trim();
        }
        return sections;
    }

    function qcEnsureReviewSections(sections) {
        const normalized = qcDefaultSections();
        if (!Array.isArray(sections) || sections.length === 0) {
            return normalized;
        }
        const sourceMap = new Map();
        for (const section of sections) {
            if (!section) {
                continue;
            }
            const title = section.title || section.id || '';
            const key = qcNormalize(title);
            if (!key) {
                continue;
            }
            sourceMap.set(key, section);
        }
        return normalized.map(section => {
            const source = sourceMap.get(qcNormalize(section.title));
            if (!source) {
                return section;
            }
            return {
                id: source.id || section.id,
                title: section.title,
                content: `${source.content || source.text || ''}`.trim()
            };
        });
    }

    function qcNormalizeReviewResult(provider, result, reviewContext, extraNotes = []) {
        if (typeof result === 'string') {
            result = { sections: qcParseReviewText(result) };
        }
        const notes = [];
        if (Array.isArray(extraNotes)) {
            notes.push(...extraNotes.filter(note => note));
        }
        if (Array.isArray(result?.notes)) {
            notes.push(...result.notes.filter(note => note));
        }
        const normalized = {
            providerId: result?.providerId || provider?.id || 'unknown',
            providerLabel: result?.providerLabel || provider?.label || 'Unknown',
            mode: result?.mode || provider?.mode || 'fallback',
            sections: qcEnsureReviewSections(result?.sections),
            suggestedOverrides: result?.suggestedOverrides || {},
            confidence: qcClamp(qcToNumber(result?.confidence) ?? 0.4, 0, 1),
            notes
        };
        if (!normalized.sections[3].content && Object.keys(normalized.suggestedOverrides).length > 0) {
            normalized.sections[3].content = qcSummarizeOverrides(reviewContext.input, normalized.suggestedOverrides).join('\n');
        }
        return normalized;
    }

    function qcReviewResultToText(result) {
        const lines = [
            `Provider: ${result.providerLabel}`,
            `Mode: ${result.mode}`,
            `Confidence: ${Math.round((result.confidence || 0) * 100)}%`
        ];
        if (Array.isArray(result.notes) && result.notes.length > 0) {
            lines.push('Notes:');
            for (const note of result.notes) {
                lines.push(`- ${note}`);
            }
        }
        for (const section of result.sections || []) {
            lines.push('');
            lines.push(`${section.title}:`);
            lines.push((section.content || '').trim() || 'No additional notes.');
        }
        return lines.join('\n');
    }

    function qcRenderContextHtml(reviewContext) {
        const lines = [
            ['Prompt', reviewContext.prompt],
            ['Negative Prompt', reviewContext.negativeprompt],
            ['Model', reviewContext.model || currentModelHelper?.curModel || ''],
            ['Resolution', reviewContext.width && reviewContext.height ? `${reviewContext.width}x${reviewContext.height}` : ''],
            ['Steps', reviewContext.steps],
            ['CFG Scale', reviewContext.cfgscale],
            ['Sampler', reviewContext.sampler],
            ['Scheduler', reviewContext.scheduler],
            ['Init Image Creativity', reviewContext.initimagecreativity],
            ['Refiner Model', reviewContext.refinermodel]
        ].filter(([, value]) => value !== null && value !== undefined && value !== '');
        if (lines.length === 0) {
            return '';
        }
        return `
        <div class="swarm-quality-coach-review-context-title">Generation Context</div>
        ${lines.map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(qcFormatValue(value))}</div>`).join('')}`;
    }

    function qcEnsureReviewModal() {
        let modal = document.getElementById(REVIEW_MODAL_ID);
        if (modal) {
            return modal;
        }
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = REVIEW_MODAL_ID;
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Quality Coach Review</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body swarm-quality-coach-review-body">
                    <div class="swarm-quality-coach-review-status"></div>
                    <div class="swarm-quality-coach-review-context"></div>
                    <div class="swarm-quality-coach-review-notes"></div>
                    <div class="swarm-quality-coach-review-sections"></div>
                    <div class="swarm-quality-coach-review-overrides"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="basic-button swarm-quality-coach-review-apply">Apply Suggested Fixes</button>
                    <button type="button" class="basic-button swarm-quality-coach-review-copy">Copy Review</button>
                    <button type="button" class="basic-button" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modal);
        return modal;
    }

    async function qcCopyText(text) {
        if (typeof copyText === 'function') {
            copyText(text);
            return;
        }
        await navigator.clipboard.writeText(text);
    }

    function qcSetReviewModalState(modal, reviewContext, state) {
        const status = modal.querySelector('.swarm-quality-coach-review-status');
        const context = modal.querySelector('.swarm-quality-coach-review-context');
        const notes = modal.querySelector('.swarm-quality-coach-review-notes');
        const sections = modal.querySelector('.swarm-quality-coach-review-sections');
        const overrides = modal.querySelector('.swarm-quality-coach-review-overrides');
        const applyButton = modal.querySelector('.swarm-quality-coach-review-apply');
        const copyButton = modal.querySelector('.swarm-quality-coach-review-copy');
        status.innerHTML = state.statusHtml || '';
        context.innerHTML = state.contextHtml ?? qcRenderContextHtml(reviewContext);
        notes.innerHTML = state.notesHtml || '';
        sections.innerHTML = state.sectionsHtml || '';
        overrides.innerHTML = state.overridesHtml || '';
        applyButton.disabled = !state.applyHandler;
        applyButton.onclick = state.applyHandler || null;
        copyButton.disabled = !state.copyText;
        copyButton.onclick = state.copyText
            ? async () => {
                await qcCopyText(state.copyText);
                if (typeof doNoticePopover === 'function') {
                    doNoticePopover('Copied!', 'notice-pop-green');
                }
            }
            : null;
    }

    async function qcEvaluateProviderAvailability(provider, reviewContext) {
        if (!provider) {
            return { enabled: false, reason: '' };
        }
        try {
            const raw = typeof provider.canReview === 'function' ? await provider.canReview(reviewContext) : true;
            if (typeof raw === 'boolean') {
                return { enabled: raw, reason: '' };
            }
            if (typeof raw === 'string') {
                return { enabled: false, reason: raw };
            }
            if (!raw) {
                return { enabled: false, reason: '' };
            }
            return {
                enabled: raw.enabled !== false,
                reason: raw.reason || '',
                hidden: raw.hidden === true
            };
        }
        catch (error) {
            console.error('Quality Coach provider availability failed:', error);
            return { enabled: false, reason: error?.message || `${error}` };
        }
    }

    async function qcSelectReviewProvider(reviewContext) {
        qcEnsureArrays();
        const preferred = qcGetSettings().preferredReviewProvider;
        const evaluated = [];
        for (const provider of window.swarmImageReviewProviders) {
            if (!provider || !provider.id) {
                continue;
            }
            const availability = await qcEvaluateProviderAvailability(provider, reviewContext);
            if (availability.hidden) {
                continue;
            }
            evaluated.push({
                ...provider,
                priority: qcToNumber(provider.priority) ?? 0,
                availability
            });
        }
        const enabledProviders = evaluated
            .filter(provider => provider.availability.enabled)
            .sort((a, b) => b.priority - a.priority);
        if (preferred && preferred !== 'auto') {
            const preferredProvider = evaluated.find(provider => qcNormalize(provider.id) === preferred);
            if (preferredProvider?.availability.enabled) {
                return { provider: preferredProvider, notes: [] };
            }
            if (enabledProviders.length > 0) {
                const detail = preferredProvider?.availability.reason
                    ? `Preferred provider "${preferredProvider.label}" is unavailable: ${preferredProvider.availability.reason}`
                    : `Preferred provider "${preferred}" is unavailable.`;
                return {
                    provider: enabledProviders[0],
                    notes: [`${detail} Using ${enabledProviders[0].label} instead.`]
                };
            }
            return {
                provider: null,
                reason: preferredProvider?.availability.reason || `Preferred provider "${preferred}" is unavailable.`
            };
        }
        if (enabledProviders.length > 0) {
            return { provider: enabledProviders[0], notes: [] };
        }
        const fallbackReason = evaluated.find(provider => provider.availability.reason)?.availability.reason;
        return {
            provider: null,
            reason: fallbackReason || 'No image review provider is available.'
        };
    }

    function qcCanReviewImage(context) {
        const src = context?.src || '';
        if (!src) {
            return false;
        }
        if ((typeof isVideoExt === 'function' && isVideoExt(src)) || (typeof isAudioExt === 'function' && isAudioExt(src))) {
            return false;
        }
        return !src.endsWith('.html');
    }

    async function qcReviewImage(rawContext, options = {}) {
        if (!qcIsEnabled()) {
            showError('Quality Coach is disabled in your user settings.');
            return null;
        }
        if (!qcCanReviewImage(rawContext)) {
            return null;
        }
        const reviewContext = qcBuildReviewContext(rawContext);
        const modal = qcEnsureReviewModal();
        const instance = bootstrap.Modal.getOrCreateInstance(modal);
        qcSetReviewModalState(modal, reviewContext, {
            statusHtml: '<div class="spinner-border spinner-border-sm" role="status"></div><span>Reviewing image...</span>',
            contextHtml: qcRenderContextHtml(reviewContext)
        });
        instance.show();
        try {
            const selection = await qcSelectReviewProvider(reviewContext);
            if (!selection.provider) {
                throw new Error(selection.reason || 'No review provider is available.');
            }
            qcSetReviewModalState(modal, reviewContext, {
                statusHtml: `<div class="spinner-border spinner-border-sm" role="status"></div><span>Reviewing image with ${escapeHtml(selection.provider.label)}...</span>`,
                contextHtml: qcRenderContextHtml(reviewContext)
            });
            const rawResult = await selection.provider.review(reviewContext, options);
            const result = qcNormalizeReviewResult(selection.provider, rawResult, reviewContext, selection.notes);
            const overridesSummary = qcSummarizeOverrides(reviewContext.input, result.suggestedOverrides);
            const notesHtml = Array.isArray(result.notes) && result.notes.length > 0
                ? `<div class="swarm-quality-coach-review-note-list">${result.notes.map(note => `<div>${escapeHtml(note)}</div>`).join('')}</div>`
                : '';
            const sectionsHtml = result.sections.map(section => `
                <div class="swarm-quality-coach-review-section">
                    <div class="swarm-quality-coach-review-section-title">${escapeHtml(section.title)}</div>
                    <div class="swarm-quality-coach-review-section-body">${escapeHtml(section.content || 'No additional notes.')}</div>
                </div>`).join('');
            const overridesHtml = overridesSummary.length > 0
                ? `
                <div class="swarm-quality-coach-review-override-title">Suggested Fixes</div>
                ${overridesSummary.map(line => `<div>${escapeHtml(line)}</div>`).join('')}`
                : '<div class="swarm-quality-coach-review-override-title">Suggested Fixes</div><div>No automatic fixes are available for this review.</div>';
            qcSetReviewModalState(modal, reviewContext, {
                statusHtml: `<div><strong>Provider:</strong> ${escapeHtml(result.providerLabel)}</div><div><strong>Confidence:</strong> ${Math.round(result.confidence * 100)}%</div>`,
                contextHtml: qcRenderContextHtml(reviewContext),
                notesHtml,
                sectionsHtml,
                overridesHtml,
                copyText: qcReviewResultToText(result),
                applyHandler: Object.keys(result.suggestedOverrides || {}).length > 0
                    ? () => {
                        const applied = qcApplySuggestedOverrides(result.suggestedOverrides);
                        if (applied.length > 0 && typeof doNoticePopover === 'function') {
                            doNoticePopover('Applied suggested fixes.', 'notice-pop-green');
                        }
                    }
                    : null
            });
            return result;
        }
        catch (error) {
            qcSetReviewModalState(modal, reviewContext, {
                statusHtml: '<div><strong>Review failed.</strong></div>',
                contextHtml: qcRenderContextHtml(reviewContext),
                sectionsHtml: `<div class="swarm-quality-coach-review-section"><div class="swarm-quality-coach-review-section-title">Error</div><div class="swarm-quality-coach-review-section-body">${escapeHtml(error?.message || `${error}`)}</div></div>`
            });
            return null;
        }
    }

    function qcEnableParamGroup(param) {
        let group = param?.original_group || param?.group;
        const groups = [];
        while (group) {
            groups.unshift(group);
            group = group.parent;
        }
        for (const item of groups) {
            if (!item.toggles) {
                continue;
            }
            const toggler = document.getElementById(`input_group_content_${item.id}_toggle`);
            if (toggler && !toggler.checked) {
                toggler.checked = true;
                doToggleGroup(`input_group_content_${item.id}`);
            }
        }
    }

    function qcApplySuggestedOverrides(overrides) {
        const safeOverrides = {};
        for (const key of SAFE_OVERRIDE_KEYS) {
            if (key in (overrides || {})) {
                safeOverrides[key] = overrides[key];
            }
        }
        if (Object.keys(safeOverrides).length === 0) {
            return [];
        }
        if (('width' in safeOverrides || 'height' in safeOverrides) && typeof getParamById === 'function') {
            const aspectratio = getParamById('aspectratio');
            if (aspectratio) {
                const aspectElem = document.getElementById('input_aspectratio');
                if (aspectElem) {
                    setDirectParamValue(aspectratio, 'Custom', aspectElem, true);
                }
            }
        }
        const applied = [];
        for (const [key, value] of Object.entries(safeOverrides)) {
            if (typeof getParamById !== 'function') {
                continue;
            }
            const param = getParamById(key);
            if (!param) {
                continue;
            }
            qcEnableParamGroup(param);
            if (param.toggleable) {
                const toggler = document.getElementById(`input_${param.id}_toggle`);
                if (toggler && !toggler.checked) {
                    toggler.checked = true;
                    doToggleEnable(`input_${param.id}`);
                }
            }
            const paramElem = document.getElementById(`input_${param.id}`);
            if (!paramElem) {
                continue;
            }
            if (value === null && param.toggleable) {
                const toggler = document.getElementById(`input_${param.id}_toggle`);
                if (toggler && toggler.checked) {
                    toggler.checked = false;
                    doToggleEnable(`input_${param.id}`);
                    applied.push(key);
                }
                continue;
            }
            setDirectParamValue(param, value, paramElem, true);
            applied.push(key);
        }
        if (applied.length > 0 && typeof window.swarmQualityCoach?.refreshLiveSummary === 'function') {
            window.swarmQualityCoach.refreshLiveSummary();
        }
        return applied;
    }

    function qcGetPreflightProviders() {
        qcEnsureArrays();
        return window.swarmPreflightProviders;
    }

    async function qcCollectPreflight(input, context) {
        const settings = qcGetSettings();
        if (!settings.enabled) {
            return { issues: [], mergedOverrides: {} };
        }
        const builtIn = qcAnalyzeGenerationInput(input, context);
        const issues = [...builtIn.issues];
        const mergedOverrides = { ...builtIn.mergedOverrides };
        for (const provider of qcGetPreflightProviders()) {
            if (!provider || provider === window.swarmQualityCoachCorePreflightProvider || typeof provider !== 'function') {
                continue;
            }
            try {
                const result = await provider(input, context);
                if (!result) {
                    continue;
                }
                const providerIssues = Array.isArray(result) ? result : (Array.isArray(result.issues) ? result.issues : []);
                for (const rawIssue of providerIssues) {
                    const issue = qcNormalizeIssue(rawIssue, input);
                    if (!issue) {
                        continue;
                    }
                    issues.push(issue);
                    Object.assign(mergedOverrides, issue.overrides || {});
                }
                if (result.overrides) {
                    Object.assign(mergedOverrides, result.overrides);
                }
            }
            catch (error) {
                console.error('Quality Coach preflight provider failed:', error);
            }
        }
        return { issues, mergedOverrides };
    }

    function qcBuildGenerateSnapshotRows(input, modelContext) {
        const width = qcToNumber(input?.width);
        const height = qcToNumber(input?.height);
        const prompt = `${input?.prompt || ''}`.trim();
        const negativePrompt = `${input?.negativeprompt || ''}`.trim();
        const initCreativity = qcToNumber(input?.initimagecreativity);
        const hasInitImage = Boolean(input?.initimage);
        const rows = [
            { label: 'Model', value: input?.model || currentModelHelper?.curModel || modelContext?.modelName || 'Unset' },
            { label: 'Resolution', value: width && height ? `${width} x ${height}` : 'Unset' },
            { label: 'Steps', value: qcFormatValue(input?.steps) },
            { label: 'CFG', value: qcFormatValue(input?.cfgscale) },
            { label: 'Sampler', value: input?.sampler || 'Unset' },
            { label: 'Scheduler', value: input?.scheduler || 'Unset' },
            { label: 'Prompt', value: prompt ? `${prompt.length} chars` : 'Empty' },
            { label: 'Negative', value: negativePrompt ? `${negativePrompt.length} chars` : 'Empty' },
            { label: 'Img2Img', value: hasInitImage ? `On${initCreativity !== null ? ` (${qcFormatNumber(initCreativity, 2)} creativity)` : ''}` : 'Off' }
        ];
        if (input?.refinermodel) {
            rows.push({ label: 'Refiner', value: input.refinermodel });
        }
        return rows;
    }

    function qcGetCurrentGenerateState() {
        const settings = qcGetSettings();
        const state = {
            enabled: settings.enabled,
            checksEnabled: settings.enableMetadataRules,
            settings,
            ready: false,
            status: 'disabled',
            reason: 'Quality Coach is currently disabled in your user settings.',
            input: null,
            analysis: { issues: [], mergedOverrides: {}, modelContext: qcGetModelContext({}) },
            snapshotRows: []
        };
        if (!settings.enabled) {
            return state;
        }
        if (typeof getGenInput !== 'function' || !window.gen_param_types?.length) {
            state.status = 'loading';
            state.reason = 'Quality Coach is waiting for the generation controls to finish loading.';
            return state;
        }
        try {
            state.input = getGenInput();
            state.analysis = qcAnalyzeGenerationInput(state.input);
            state.snapshotRows = qcBuildGenerateSnapshotRows(state.input, state.analysis.modelContext);
            state.ready = true;
            if (!settings.enableMetadataRules) {
                state.status = 'paused';
                state.reason = 'Current-parameter rule checks are turned off in your Quality Coach settings.';
            }
            else if (state.analysis.issues.length > 0) {
                state.status = 'warning';
                state.reason = `Found ${state.analysis.issues.length} current-parameter suggestion${state.analysis.issues.length === 1 ? '' : 's'}.`;
            }
            else {
                state.status = 'healthy';
                state.reason = 'No high-confidence quality warnings were found for the current settings.';
            }
        }
        catch (error) {
            console.debug('Quality Coach generate-page check skipped:', error);
            state.status = 'loading';
            state.reason = 'Quality Coach could not inspect the current generation inputs yet.';
            state.error = error;
        }
        return state;
    }

    function qcEnsureGenerateCoachElements() {
        const wrapper = document.querySelector('.alt-prompt-buttons-wrapper');
        if (!wrapper) {
            return null;
        }
        let button = document.getElementById(GENERATE_COACH_BUTTON_ID);
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.id = GENERATE_COACH_BUTTON_ID;
            button.className = 'alt-prompt-buttons alt-prompt-coach-button basic-button';
            button.innerHTML = `
                <span class="swarm-quality-coach-trigger-label">Coach</span>
                <span class="swarm-quality-coach-trigger-count"></span>`;
            button.addEventListener('click', qcHandleGenerateCoachToggle);
            const interruptButton = document.getElementById('alt_interrupt_button');
            if (interruptButton && interruptButton.parentElement === wrapper) {
                wrapper.insertBefore(button, interruptButton);
            }
            else {
                wrapper.appendChild(button);
            }
        }
        let popover = document.getElementById(GENERATE_COACH_POPOVER_ID);
        if (!popover) {
            popover = createDiv(GENERATE_COACH_POPOVER_ID, 'sui-popover sui_popover_model swarm-quality-coach-popover');
            popover.dataset.visible = 'false';
            document.body.appendChild(popover);
        }
        return {
            button,
            count: button.querySelector('.swarm-quality-coach-trigger-count'),
            popover
        };
    }

    function qcEnsureLiveSummaryElement() {
        const region = document.getElementById('alt_prompt_region');
        if (!region) {
            return null;
        }
        let summary = document.getElementById(LIVE_SUMMARY_ID);
        if (!summary) {
            summary = createDiv(LIVE_SUMMARY_ID, 'swarm-quality-coach-live-summary');
            summary.style.display = 'none';
            region.appendChild(summary);
        }
        return summary;
    }

    function qcBuildGenerateCoachSummaryText(state) {
        if (!state.enabled) {
            return 'Quality Coach is disabled right now. Enable it in your user settings to get live parameter suggestions and reviews.';
        }
        if (!state.ready) {
            return state.reason;
        }
        if (!state.checksEnabled) {
            return 'Scanned the current generation input, but the rule-based parameter checks are paused in your settings.';
        }
        if (state.analysis.issues.length === 0) {
            return 'Scanned the current prompt, model, size, steps, CFG, sampler, scheduler, and img2img context. No high-confidence warnings right now.';
        }
        return `Scanned the current prompt, model, size, steps, CFG, sampler, scheduler, and img2img context. ${state.analysis.issues.length} suggestion${state.analysis.issues.length === 1 ? '' : 's'} ready.`;
    }

    function qcRenderGenerateCoachButton(state, elements) {
        if (!elements?.button) {
            return;
        }
        elements.button.style.display = '';
        elements.button.dataset.state = state.status;
        elements.button.title = state.ready
            ? (state.analysis.issues.length > 0
                ? `Quality Coach found ${state.analysis.issues.length} suggestion${state.analysis.issues.length === 1 ? '' : 's'}. Click to inspect the current settings.`
                : qcBuildGenerateCoachSummaryText(state))
            : state.reason;
        const count = elements.count;
        if (!count) {
            return;
        }
        if (state.ready && state.checksEnabled && state.analysis.issues.length > 0) {
            count.textContent = state.analysis.issues.length > 9 ? '9+' : `${state.analysis.issues.length}`;
            count.style.display = 'inline-flex';
        }
        else {
            count.textContent = '';
            count.style.display = 'none';
        }
    }

    function qcRenderGenerateCoachPopover(state, elements) {
        const popover = elements?.popover;
        if (!popover) {
            return;
        }
        const summaryText = qcBuildGenerateCoachSummaryText(state);
        const snapshotHtml = state.ready
            ? `
                <div class="swarm-quality-coach-popover-section">
                    <div class="swarm-quality-coach-popover-section-title">Current Snapshot</div>
                    <div class="swarm-quality-coach-popover-grid">
                        ${state.snapshotRows.map(row => `
                            <div class="swarm-quality-coach-popover-row">
                                <span class="swarm-quality-coach-popover-row-label">${escapeHtml(row.label)}</span>
                                <span class="swarm-quality-coach-popover-row-value">${escapeHtml(row.value)}</span>
                            </div>`).join('')}
                    </div>
                </div>`
            : '';
        let suggestionsHtml = '';
        if (!state.ready) {
            suggestionsHtml = `<div class="swarm-quality-coach-popover-empty">${escapeHtml(state.reason)}</div>`;
        }
        else if (!state.checksEnabled) {
            suggestionsHtml = '<div class="swarm-quality-coach-popover-empty">Rule-based parameter suggestions are paused, but the snapshot above still reflects the current generation input.</div>';
        }
        else if (state.analysis.issues.length === 0) {
            suggestionsHtml = '<div class="swarm-quality-coach-popover-empty">Current setup looks balanced. Generate will still run the full preflight check when you click Generate.</div>';
        }
        else {
            const visibleIssues = state.analysis.issues.slice(0, 4);
            const extraCount = state.analysis.issues.length - visibleIssues.length;
            suggestionsHtml = visibleIssues.map(issue => {
                const fixes = Array.isArray(issue.overrideSummary) && issue.overrideSummary.length > 0
                    ? `<div class="swarm-quality-coach-popover-issue-fixes">${issue.overrideSummary.map(line => `<div>${escapeHtml(line)}</div>`).join('')}</div>`
                    : '';
                const recommendation = issue.recommended
                    ? `<div class="swarm-quality-coach-popover-issue-recommend">${escapeHtml(issue.recommended)}</div>`
                    : '';
                return `
                    <div class="swarm-quality-coach-popover-issue">
                        <div class="swarm-quality-coach-popover-issue-title">${escapeHtml(issue.title)}</div>
                        <div class="swarm-quality-coach-popover-issue-body">${escapeHtml(issue.description || 'No extra detail available.')}</div>
                        ${recommendation}
                        ${fixes}
                    </div>`;
            }).join('');
            if (extraCount > 0) {
                suggestionsHtml += `<div class="swarm-quality-coach-popover-more">+${extraCount} more suggestion${extraCount === 1 ? '' : 's'} will also be checked during generation.</div>`;
            }
        }
        const hasOverrides = state.ready && Object.keys(state.analysis.mergedOverrides || {}).length > 0;
        popover.innerHTML = `
            <div class="swarm-quality-coach-popover-header">
                <div class="swarm-quality-coach-popover-title">Quality Coach</div>
                <div class="swarm-quality-coach-popover-summary">${escapeHtml(summaryText)}</div>
            </div>
            ${snapshotHtml}
            <div class="swarm-quality-coach-popover-section">
                <div class="swarm-quality-coach-popover-section-title">Suggestions</div>
                ${suggestionsHtml}
            </div>
            <div class="swarm-quality-coach-popover-actions">
                <button type="button" class="basic-button swarm-quality-coach-popover-apply"${hasOverrides ? '' : ' disabled="disabled"'}>Apply Suggested Fixes</button>
                <div class="swarm-quality-coach-popover-hint">This panel updates as you change parameters.</div>
            </div>`;
        const applyButton = popover.querySelector('.swarm-quality-coach-popover-apply');
        if (applyButton && hasOverrides) {
            applyButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                const applied = qcApplySuggestedOverrides(state.analysis.mergedOverrides);
                if (applied.length > 0 && typeof doNoticePopover === 'function') {
                    const rect = applyButton.getBoundingClientRect();
                    doNoticePopover('Applied suggested fixes.', 'notice-pop-green', rect.left, rect.bottom + 8);
                }
                qcRefreshGeneratePageCoach();
            });
        }
    }

    function qcToggleGenerateCoachFromElement(target, sourceEvent) {
        const elements = qcEnsureGenerateCoachElements();
        if (!elements) {
            return;
        }
        const state = qcGetCurrentGenerateState();
        qcRenderGenerateCoachButton(state, elements);
        qcRenderGenerateCoachPopover(state, elements);
        if (typeof doPopover === 'function') {
            const proxyEvent = {
                target: target || elements.button,
                preventDefault: () => sourceEvent?.preventDefault?.(),
                stopImmediatePropagation: () => sourceEvent?.stopImmediatePropagation?.()
            };
            doPopover(GENERATE_COACH_POPOVER_KEY, proxyEvent);
        }
    }

    function qcHandleGenerateCoachToggle(event) {
        qcToggleGenerateCoachFromElement(event?.currentTarget || event?.target, event);
    }

    function qcRefreshGeneratePageCoach() {
        const state = qcGetCurrentGenerateState();
        const elements = qcEnsureGenerateCoachElements();
        if (elements) {
            qcRenderGenerateCoachButton(state, elements);
            qcRenderGenerateCoachPopover(state, elements);
        }
        const summary = qcEnsureLiveSummaryElement();
        if (!summary) {
            return state.ready;
        }
        if (!state.enabled || !state.settings.showLiveSummary || !state.ready || !state.checksEnabled || state.analysis.issues.length === 0) {
            summary.style.display = 'none';
            summary.innerHTML = '';
            summary.title = '';
            return state.ready;
        }
        const titles = state.analysis.issues.slice(0, 2).map(issue => issue.title);
        const extraCount = state.analysis.issues.length - titles.length;
        summary.innerHTML = `
            <div class="swarm-quality-coach-live-summary-main">
                <span class="swarm-quality-coach-live-summary-text">Quality Coach sees ${state.analysis.issues.length} suggestion${state.analysis.issues.length === 1 ? '' : 's'}: ${escapeHtml(titles.join(' | '))}${extraCount > 0 ? ` <span class="swarm-quality-coach-live-summary-extra">+${extraCount} more</span>` : ''}</span>
                <button type="button" class="basic-button swarm-quality-coach-live-summary-action">Inspect</button>
            </div>`;
        summary.title = state.analysis.issues.map(issue => `${issue.title}: ${issue.description}`).join('\n');
        summary.style.display = 'block';
        const inspectButton = summary.querySelector('.swarm-quality-coach-live-summary-action');
        if (inspectButton) {
            inspectButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                qcToggleGenerateCoachFromElement(inspectButton, event);
            });
        }
        return true;
    }

    function qcRefreshLiveSummary() {
        return qcRefreshGeneratePageCoach();
    }

    function qcDebounce(fn, wait) {
        let timeout = null;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(), wait);
        };
    }

    function qcInitLiveSummary(attempt = 0) {
        const summary = qcEnsureLiveSummaryElement();
        const elements = qcEnsureGenerateCoachElements();
        if (summary || elements) {
            qcRefreshGeneratePageCoach();
            if (!window.swarmQualityCoachLiveSummaryBound) {
                const refresh = qcDebounce(qcRefreshGeneratePageCoach, 200);
                document.addEventListener('input', refresh, true);
                document.addEventListener('change', refresh, true);
                window.swarmQualityCoachLiveSummaryBound = true;
            }
            return;
        }
        if (attempt < 40) {
            setTimeout(() => qcInitLiveSummary(attempt + 1), 250);
        }
    }

    function qcCreateReviewAction(context) {
        if (!qcIsEnabled() || !qcCanReviewImage(context)) {
            return [];
        }
        return [{
            label: 'Review Image',
            title: 'Review this image with Quality Coach.',
            onclick: () => qcReviewImage(context)
        }];
    }

    function qcRegisterProviders() {
        qcEnsureArrays();
        if (!window.swarmQualityCoachCorePreflightProvider) {
            window.swarmQualityCoachCorePreflightProvider = input => qcAnalyzeGenerationInput(input);
            window.swarmPreflightProviders.push(window.swarmQualityCoachCorePreflightProvider);
        }
        if (!window.swarmQualityCoachImageActionProvider) {
            window.swarmQualityCoachImageActionProvider = context => qcCreateReviewAction(context);
            window.swarmImageActionProviders.push(window.swarmQualityCoachImageActionProvider);
        }
        if (!window.swarmQualityCoachFallbackReviewProvider) {
            window.swarmQualityCoachFallbackReviewProvider = {
                id: 'fallback',
                label: 'Fallback',
                priority: 0,
                mode: 'fallback',
                canReview: context => ({ enabled: qcCanReviewImage(context), reason: qcCanReviewImage(context) ? '' : 'Quality Coach only reviews still images.' }),
                review: context => qcBuildFallbackReview(context)
            };
            window.swarmImageReviewProviders.push(window.swarmQualityCoachFallbackReviewProvider);
        }
    }

    function qcBootstrap() {
        qcRegisterProviders();
        qcInitLiveSummary();
    }

    window.swarmQualityCoach = {
        analyzeInput: qcAnalyzeGenerationInput,
        collectPreflight: qcCollectPreflight,
        reviewImage: qcReviewImage,
        applySuggestedOverrides: qcApplySuggestedOverrides,
        buildReviewContext: qcBuildReviewContext,
        parseReviewText: qcParseReviewText,
        normalizeReviewResult: qcNormalizeReviewResult,
        formatOverrideSummary: qcSummarizeOverrides,
        reviewResultToText: qcReviewResultToText,
        fetchImagePayload: async (source) => {
            if (source?.fetchImagePayload) {
                return source.fetchImagePayload();
            }
            if (source?.src) {
                return qcBuildReviewContext(source).fetchImagePayload();
            }
            return qcImagePayloadFromBlob(await qcFetchBlob(source));
        },
        isEnabled: qcIsEnabled,
        shouldBlockOnWarnings: qcShouldBlockOnWarnings,
        refreshLiveSummary: qcRefreshLiveSummary,
        refreshGeneratePageCoach: qcRefreshGeneratePageCoach,
        openGenerateCoach: qcToggleGenerateCoachFromElement
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', qcBootstrap);
    }
    else {
        qcBootstrap();
    }
})();
