// SwarmUI API Types

export interface SessionResponse {
  session_id: string;
  user_id: string;
  output_append_user: boolean;
  version: string;
  server_id: string;
  permissions: string[];
}

export interface APIError {
  error?: string;
  error_id?: string;
}

export interface GenerateParams {
  // Core parameters
  // NOTE: SwarmUI parameter names are lowercase letters only (no underscores/spaces)
  // The backend converts "CFG Scale" -> "cfgscale", "CLIP Stop At Layer" -> "clipstopatlayer"
  prompt: string;
  negativeprompt?: string;
  images?: number;
  steps?: number;
  cfgscale?: number;  // NOT cfg_scale - SwarmUI uses no underscores
  seed?: number;
  width?: number;
  height?: number;
  model?: string;
  sampler?: string;
  scheduler?: string;

  // Init Image / Img2Img
  initimage?: string;
  initimagecreativity?: number;
  initimageresettonorm?: number;
  initimagenoise?: number;
  maskimage?: string;
  resizemode?: string;
  maskblur?: number;
  invertmask?: boolean;
  seamlesstileable?: string;  // '', 'both', 'horizontal', 'vertical'

  // Model Addons
  vae?: string;
  loras?: string;
  loraweights?: string;

  // Variation Seed
  variationseed?: number;
  variationseedstrength?: number;

  // Refiner
  refinermodel?: string;
  refinercontrol?: number;         // Legacy alias; backend expects refinercontrolpercentage
  refinercontrolpercentage?: number;
  refinerupscale?: number;
  refinermethod?: string;
  refinervae?: string;
  refinersteps?: number;           // Toggleable: Override step count for refiner stage
  refinercfgscale?: number;        // Toggleable: Override CFG scale for refiner stage
  refinerdotiling?: boolean;       // Enable tiling in refiner stage
  refinerupscalemethod?: string;   // pixel-*, model-*, or latent-* upscale method

  // Advanced Sampling
  clipstopatlayer?: number;  // NOT clipskip - SwarmUI calls it "CLIP Stop At Layer" -> "clipstopatlayer"

  // Additional Options
  batchsize?: number;
  removebackground?: boolean;
  donotsave?: boolean;
  dontsaveintermediates?: boolean;
  nopreviews?: boolean;

  // FreeU
  freeublockone?: number;  // SwarmUI: "FreeU Block 1" -> "freeublockone" (not freeu_enabled)
  freeublocktwo?: number;
  freeuskipone?: number;
  freeuskiptwo?: number;

  // Color Adjustment
  coloradjust?: string;

  // Video Generation
  videomodel?: string;
  videoframes?: number;
  videosteps?: number;
  videocfg?: number;
  videofps?: number;
  videoformat?: string;
  videoboomerang?: boolean;

  // Text2Video
  text2videoframes?: number;
  text2videofps?: number;
  text2videoformat?: string;

  // ControlNet
  controlnetimageinput?: string;
  controlnetmodel?: string;
  controlnetstrength?: number;
  controlnetstart?: number;
  controlnetend?: number;
  controlnettwoimageinput?: string;
  controlnettwomodel?: string;
  controlnettwostrength?: number;
  controlnettwostart?: number;
  controlnettwoend?: number;
  controlnetthreeimageinput?: string;
  controlnetthreemodel?: string;
  controlnetthreestrength?: number;
  controlnetthreestart?: number;
  controlnetthreeend?: number;
  controlnetpreprocessor?: string;
  controlnettwopreprocessor?: string;
  controlnetthreepreprocessor?: string;

  // Allow any additional parameters
  [key: string]: unknown;
}

export interface GenerationStatus {
  waiting_gens?: number;
  loading_models?: number;
  waiting_backends?: number;
  live_gens?: number;
}

export interface GenerationProgress {
  batch_index: string;
  overall_percent: number;
  current_percent: number;
  preview?: string;
  request_id?: string;
  stage_id?: string;
  stage_label?: string;
  stage_detail?: string;
  stage_index?: number;
  stage_count?: number;
  stages_remaining?: number;
  stage_task_index?: number;
  stage_task_count?: number;
  stage_tasks_remaining?: number;
  stage_current_step?: number;
  stage_total_steps?: number;
}

export interface GeneratedImage {
  image: string;
  batch_index: string;
  metadata: string;
  request_id?: string;
}

export interface WebSocketMessage {
  status?: GenerationStatus;
  gen_progress?: GenerationProgress;
  image?: string;
  batch_index?: string;
  metadata?: string;
  request_id?: string;
  socket_intention?: 'close';
  success?: boolean;  // Model load completion indicator
  error?: string;
  error_id?: string;
  load_progress?: number;
  // Model download progress fields
  overall_percent?: number;
  current_percent?: number;
  per_second?: number;
}

export interface ImageListItem {
  src: string;
  metadata: string | Record<string, unknown> | null;
  starred: boolean;
  canonical_src?: string;
  preview_src?: string | null;
  media_type?: HistoryMediaType;
  created_at?: number;
  prompt_preview?: string | null;
  model?: string | null;
  width?: number | null;
  height?: number | null;
  seed?: number | null;
}

export interface ImageFolderResponse {
  folders: string[];
  files: ImageListItem[];
}

export type HistoryMediaType = 'all' | 'image' | 'video' | 'audio' | 'html';
export type HistorySortBy = 'Date' | 'Name';

export interface HistoryImageItem extends ImageListItem {
  canonical_src: string;
  preview_src: string | null;
  media_type: HistoryMediaType;
  created_at: number;
  prompt_preview: string | null;
  model: string | null;
  width: number | null;
  height: number | null;
  seed: number | null;
}

export interface ListImagesV2Params {
  path?: string;
  recursive?: boolean;
  depth?: number | null;
  query?: string | null;
  sortBy?: HistorySortBy;
  sortReverse?: boolean;
  starredOnly?: boolean;
  mediaType?: HistoryMediaType;
  cursor?: string | null;
  limit?: number;
}

export interface HistoryFolderResponseV2 {
  folders: string[];
  files: HistoryImageItem[];
  next_cursor: string | null;
  has_more: boolean;
  truncated: boolean;
  total_count: number;
}

export interface ExportHistoryZipParams extends Omit<ListImagesV2Params, 'cursor' | 'limit'> {
  paths?: string[];
}

export interface ExportHistoryZipResponse {
  success?: boolean;
  filename?: string;
  url?: string;
  count?: number;
  error?: string;
}

export interface Model {
  name: string;
  title?: string;
  architecture?: string;
  class?: string;
  description?: string;
  hash?: string;
  loaded?: boolean;
  preview_image?: string;
  preview?: string;
  [key: string]: unknown;
}

export interface VAEModel {
  name: string;
  title?: string;
  description?: string;
  path: string;
  preview_image?: string;
  preview?: string;
  [key: string]: unknown;
}

export interface BackendStatus {
  id: string;
  status: string;
  type: string;
  modcount: number;
  class: string;
  [key: string]: unknown;
}

export interface LoRA {
  name: string;
  title?: string;
  preview?: string;
  description?: string;
  path: string;
  metadata?: Record<string, unknown>;
  activationText?: string;
  tags?: string[];
  trainedWords?: string[];
  baseModel?: string;
  folder?: string;
  [key: string]: unknown;
}

export interface LoRASelection {
  lora: string;
  weight: number;
}

export interface Embedding {
  name: string;
  title?: string;
  description?: string;
  path: string;
  [key: string]: unknown;
}

export interface UpscaleParams {
  image: string;
  scale: number;
  model?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  data: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
    }>;
    connections: Array<{
      from: string;
      to: string;
    }>;
  };
  preview?: string;
  createdAt: number;
  updatedAt: number;
}

// ComfyUI Workflow Types

/** Basic workflow info returned from list endpoint */
export interface ComfyWorkflowInfo {
  name: string;
  image: string;
  description?: string;
  enable_in_simple: boolean;
}

/** Full workflow data returned from read endpoint */
export interface ComfyWorkflowData {
  workflow: unknown;
  prompt: unknown;
  custom_params?: unknown;
  image?: string;
  description?: string;
  enable_in_simple?: boolean;
}

// === T2I Parameter Types (from ListT2IParams API) ===

export interface T2IParam {
  name: string;
  id: string;
  description: string;
  type: string;
  subtype?: string | null;
  default: string | number | boolean;
  min?: number;
  max?: number;
  view_max?: number;
  step?: number;
  values?: string[] | null;
  value_names?: string[] | null;
  examples?: string[] | null;
  visible: boolean;
  advanced: boolean;
  feature_flag?: string | null;
  toggleable: boolean;
  priority: number;
  group?: string | null;
  always_retain: boolean;
  do_not_save: boolean;
  do_not_preview: boolean;
  view_type?: string;
  extra_hidden: boolean;
}

export interface T2IParamGroup {
  name: string;
  id: string;
  toggles: boolean;
  open: boolean;
  priority: number;
  description: string;
  advanced: boolean;
  can_shrink: boolean;
  parent?: string | null;
}

export interface T2IParamsResponse {
  list: T2IParam[];
  groups: T2IParamGroup[];
  models: Record<string, [string, string | null][]>;
  wildcards: string[];
  param_edits?: Record<string, unknown> | null;
}

// === Backend Preset Types ===

export interface BackendPreset {
  author: string;
  title: string;
  description: string;
  param_map: Record<string, string>;
  preview_image: string;
  is_starred: boolean;
}

export interface UserDataResponse {
  user_name: string;
  presets: BackendPreset[];
  language: string;
  permissions: string[];
  starred_models: Record<string, string[]>;
  autocompletions: string[] | null;
}

// === Model Description Types ===

export interface ModelDescription {
  name: string;
  title: string;
  author: string;
  description: string;
  preview_image: string;
  hash?: string;
  loaded: boolean;
  architecture: string;
  class: string;
  compat_class: string;
  standard_width: number;
  standard_height: number;
  license: string;
  date: string;
  usage_hint: string;
  trigger_phrase: string;
  merged_from: string;
  tags: string[];
  is_supported_model_format: boolean;
  is_negative_embedding: boolean;
  local: boolean;
  source_type?: string;
  source_model_id?: string;
  source_version_id?: string;
  source_repo?: string;
  source_url?: string;
  source_locked?: boolean;
  last_metadata_sync_at?: number;
  last_metadata_sync_source?: string;
  last_metadata_sync_status?: string;
  last_metadata_sync_message?: string;
}

// === Backend Management Types ===

export interface BackendSettingDef {
  name: string;
  type: string;
  description: string;
  placeholder?: string;
  values?: string[];
  value_names?: string[];
}

export interface BackendType {
  id: string;
  name: string;
  description: string;
  settings: BackendSettingDef[];
  is_standard: boolean;
}

export interface BackendDetail {
  id: number | string;
  type: string;
  status: string;
  settings: Record<string, unknown>;
  modcount: number;
  features: string[];
  enabled: boolean;
  title: string;
  can_load_models: boolean;
  max_usages: number;
}

// === Log Types ===

export interface LogType {
  name: string;
  color: string;
  identifier: string;
}

export interface LogMessage {
  sequence_id: number;
  time: string;
  message: string;
}

// === Server Resource Types ===

export interface ServerResourceInfo {
  cpu: { usage: number; cores: number };
  system_ram: { total: number; used: number; free: number };
  gpus: Record<string, {
    id: number;
    name: string;
    temperature: number;
    utilization_gpu: number;
    utilization_memory: number;
    total_memory: number;
    free_memory: number;
    used_memory: number;
  }>;
}

