import type { BuilderStep, PromptTag } from './types';

interface TagTaxonomy {
  step?: BuilderStep;
  text?: string;
  subcategory: string;
  majorGroup: string;
  minorGroup: string;
  groupOrder: number;
  minorOrder: number;
}

const EXACT_TAXONOMY: Record<string, TagTaxonomy> = {
  'acoustic guitar': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Instruments & Audio Gear', groupOrder: 30, minorOrder: 30 },
  'electric guitar': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Instruments & Audio Gear', groupOrder: 30, minorOrder: 30 },
  'guitar': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Instruments & Audio Gear', groupOrder: 30, minorOrder: 30 },
  'musical instrument': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Instruments & Audio Gear', groupOrder: 30, minorOrder: 30 },
  'microphone': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Instruments & Audio Gear', groupOrder: 30, minorOrder: 30 },
  'headphones': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Devices & Tech', groupOrder: 30, minorOrder: 20 },
  'camera': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Devices & Tech', groupOrder: 30, minorOrder: 20 },
  'vintage camera': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Devices & Tech', groupOrder: 30, minorOrder: 20 },
  'smartphone': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Devices & Tech', groupOrder: 30, minorOrder: 20 },
  'mobile phone': { subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Devices & Tech', groupOrder: 30, minorOrder: 20 },
  'holding phone': { step: 'action', subcategory: 'Gesture', majorGroup: 'Interaction & Expression', minorGroup: 'Prop Interaction', groupOrder: 40, minorOrder: 20 },
  'holding books': { step: 'action', subcategory: 'Gesture', majorGroup: 'Interaction & Expression', minorGroup: 'Prop Interaction', groupOrder: 40, minorOrder: 20 },
  'smoking cigarette': { step: 'action', subcategory: 'Gesture', majorGroup: 'Interaction & Expression', minorGroup: 'Prop Interaction', groupOrder: 40, minorOrder: 20 },
  'close embrace': { step: 'action', subcategory: 'Explicit', majorGroup: 'Explicit Actions', minorGroup: 'Intimate Contact', groupOrder: 50, minorOrder: 20 },
  'intimate eye contact': { step: 'action', subcategory: 'Explicit', majorGroup: 'Explicit Actions', minorGroup: 'Intimate Contact', groupOrder: 50, minorOrder: 20 },
  'aftercare': { step: 'atmosphere', subcategory: 'Explicit', majorGroup: 'Intimacy & Explicit Tone', minorGroup: 'Aftercare & Recovery', groupOrder: 50, minorOrder: 20 },
  'seductive charm': { step: 'atmosphere', subcategory: 'Explicit', majorGroup: 'Intimacy & Explicit Tone', minorGroup: 'Seductive & Boudoir', groupOrder: 50, minorOrder: 10 },
  'intimate glow': { step: 'atmosphere', subcategory: 'Explicit', majorGroup: 'Intimacy & Explicit Tone', minorGroup: 'Seductive & Boudoir', groupOrder: 50, minorOrder: 10 },
  'intimate post-romance atmosphere': { step: 'atmosphere', subcategory: 'Explicit', majorGroup: 'Intimacy & Explicit Tone', minorGroup: 'Aftercare & Recovery', groupOrder: 50, minorOrder: 20 },
  'intimate glamour photography': { step: 'subject', subcategory: 'Explicit', majorGroup: 'Explicit Content', minorGroup: 'Boudoir & Glamour', groupOrder: 50, minorOrder: 20 },
  'polished boudoir styling': { step: 'subject', subcategory: 'Explicit', majorGroup: 'Explicit Content', minorGroup: 'Boudoir & Glamour', groupOrder: 50, minorOrder: 20 },
  'upscale intimate setting': { step: 'atmosphere', subcategory: 'Explicit', majorGroup: 'Intimacy & Explicit Tone', minorGroup: 'Private & Romantic', groupOrder: 50, minorOrder: 30 },
  'towering bookshelves': { step: 'setting', subcategory: 'Indoor', majorGroup: 'Architecture & Urban', minorGroup: 'Learning & Culture', groupOrder: 20, minorOrder: 20 },
  'eiffel tower': { step: 'setting', subcategory: 'Urban', majorGroup: 'Architecture & Urban', minorGroup: 'Landmarks & Travel', groupOrder: 20, minorOrder: 20 },
  'tilted camera': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Angles & Perspective', groupOrder: 10, minorOrder: 10 },
  'ots': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'POV & Focus', groupOrder: 10, minorOrder: 30 },
  'over the shoulder shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'POV & Focus', groupOrder: 10, minorOrder: 30 },
  'macro photography': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'extreme close up': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'extreme wide shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'eye level shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Angles & Perspective', groupOrder: 10, minorOrder: 10 },
  'ground level shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Angles & Perspective', groupOrder: 10, minorOrder: 10 },
  'wide shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'medium shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'establishing shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'cowboy shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'face close-up': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'drone shot': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Angles & Perspective', groupOrder: 10, minorOrder: 10 },
  'comic book style': { step: 'style', subcategory: 'Graphic', majorGroup: 'Aesthetic & Genre', minorGroup: 'Comic & Pop', groupOrder: 20, minorOrder: 10 },
  'dark pact': { step: 'subject', subcategory: 'Theme', majorGroup: 'Scenes & Themes', minorGroup: 'Narrative & Concepts', groupOrder: 40, minorOrder: 40 },
  performace: { text: 'performance', step: 'subject', subcategory: 'Character', majorGroup: 'People & Roles', minorGroup: 'Professions & Roles', groupOrder: 10, minorOrder: 20 },
  archery: { step: 'action', subcategory: 'Gesture', majorGroup: 'Interaction & Expression', minorGroup: 'Prop Interaction', groupOrder: 40, minorOrder: 20 },
  cape: { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Outerwear & Layers', groupOrder: 30, minorOrder: 30 },
  chainmail: { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Fantasy & Armor', groupOrder: 30, minorOrder: 20 },
  cool: { step: 'atmosphere', subcategory: 'Mood', majorGroup: 'Mood & Emotion', minorGroup: 'Calm & Serene', groupOrder: 20, minorOrder: 20 },
  'cybernetic implants': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'elegant accessory': { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Wearable Details', groupOrder: 40, minorOrder: 40 },
  'full helm': { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Headwear', groupOrder: 40, minorOrder: 20 },
  'head protection': { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Headwear', groupOrder: 40, minorOrder: 20 },
  heavy: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  'heavy protection': { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Fantasy & Armor', groupOrder: 30, minorOrder: 20 },
  heraldry: { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Fantasy & Armor', groupOrder: 30, minorOrder: 20 },
  hood: { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Headwear', groupOrder: 40, minorOrder: 20 },
  jewels: { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Jewelry & Chains', groupOrder: 40, minorOrder: 10 },
  leatherbound: { step: 'subject', subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Books & Tools', groupOrder: 30, minorOrder: 40 },
  'leather bound': { step: 'subject', subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Books & Tools', groupOrder: 30, minorOrder: 40 },
  'metal suit': { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Fantasy & Armor', groupOrder: 30, minorOrder: 20 },
  photographer: { step: 'subject', subcategory: 'Character', majorGroup: 'People & Roles', minorGroup: 'Professions & Roles', groupOrder: 10, minorOrder: 20 },
  'relaxed intimacy': { step: 'atmosphere', subcategory: 'Explicit', majorGroup: 'Intimacy & Explicit Tone', minorGroup: 'Private & Romantic', groupOrder: 50, minorOrder: 30 },
  'rain protection': { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Wearable Details', groupOrder: 40, minorOrder: 40 },
  royal: { step: 'subject', subcategory: 'Theme', majorGroup: 'Scenes & Themes', minorGroup: 'Narrative & Concepts', groupOrder: 40, minorOrder: 40 },
  shades: { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Facewear & Vision', groupOrder: 40, minorOrder: 30 },
  sharp: { step: 'quality', subcategory: 'Positive Quality', majorGroup: 'Positive Quality', minorGroup: 'Detail & Fidelity', groupOrder: 10, minorOrder: 20 },
  'shiny steel': { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Fantasy & Armor', groupOrder: 30, minorOrder: 20 },
  'sleek design': { step: 'style', subcategory: 'Finish', majorGroup: 'Surface & Finish', minorGroup: 'Abstract & Decorative', groupOrder: 40, minorOrder: 30 },
  spectacles: { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Facewear & Vision', groupOrder: 40, minorOrder: 30 },
  'studded leather': { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Fantasy & Armor', groupOrder: 30, minorOrder: 20 },
  'two-handed': { step: 'subject', subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Weapons & Armor', groupOrder: 30, minorOrder: 10 },
  'attached leash': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'ball gag': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  bikini: { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Everyday & Formal Wear', groupOrder: 30, minorOrder: 40 },
  blindfold: { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Facewear & Vision', groupOrder: 40, minorOrder: 30 },
  blindfolded: { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Facewear & Vision', groupOrder: 40, minorOrder: 30 },
  choker: { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Jewelry & Chains', groupOrder: 40, minorOrder: 10 },
  'demon tail': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'dressing room': { step: 'setting', subcategory: 'Indoor', majorGroup: 'Architecture & Urban', minorGroup: 'Domestic & Lifestyle', groupOrder: 20, minorOrder: 10 },
  'exposed cheeks': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'extremely revealing': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'holding skirt up': { step: 'action', subcategory: 'Explicit', majorGroup: 'Explicit Actions', minorGroup: 'Erotic Touch', groupOrder: 50, minorOrder: 40 },
  'holding up stockings': { step: 'action', subcategory: 'Gesture', majorGroup: 'Interaction & Expression', minorGroup: 'Prop Interaction', groupOrder: 40, minorOrder: 20 },
  kinbaku: { step: 'action', subcategory: 'Explicit', majorGroup: 'Explicit Actions', minorGroup: 'Sex Acts', groupOrder: 50, minorOrder: 10 },
  leash: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'modern audio gear': { step: 'subject', subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Instruments & Audio Gear', groupOrder: 30, minorOrder: 30 },
  'open shirt': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'pet play': { step: 'subject', subcategory: 'Explicit', majorGroup: 'Explicit Content', minorGroup: 'Erotic Themes', groupOrder: 50, minorOrder: 30 },
  'see-through clothing': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'sheer fabric': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  sideboob: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  succubus: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Mythic & Supernatural', groupOrder: 20, minorOrder: 10 },
  tears: { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Intense Reactions', groupOrder: 40, minorOrder: 30 },
  'wrapped in blankets': { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Outerwear & Layers', groupOrder: 30, minorOrder: 30 },
  adorable: { step: 'atmosphere', subcategory: 'Mood', majorGroup: 'Mood & Emotion', minorGroup: 'Expressive Mood', groupOrder: 20, minorOrder: 40 },
  alien: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Cosmic & Undead Beings', groupOrder: 20, minorOrder: 15 },
  'angry expression': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Intense Reactions', groupOrder: 40, minorOrder: 30 },
  'animal ears': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  anthropomorphic: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Hybrids & Monsters', groupOrder: 20, minorOrder: 20 },
  anthro: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Hybrids & Monsters', groupOrder: 20, minorOrder: 20 },
  avian: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Animals & Companions', groupOrder: 20, minorOrder: 30 },
  bald: { step: 'appearance', subcategory: 'Hair', majorGroup: 'Face & Hair', minorGroup: 'Style & Length', groupOrder: 10, minorOrder: 10 },
  beak: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  bedhead: { step: 'appearance', subcategory: 'Hair', majorGroup: 'Face & Hair', minorGroup: 'Style & Length', groupOrder: 10, minorOrder: 10 },
  'belly piercing': { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Jewelry & Chains', groupOrder: 40, minorOrder: 10 },
  'bioluminescent markings': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Skin & Surface', groupOrder: 20, minorOrder: 50 },
  'body art': { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Wearable Details', groupOrder: 40, minorOrder: 40 },
  'body tattoos': { step: 'appearance', subcategory: 'Accessories', majorGroup: 'Accessories & Finish', minorGroup: 'Wearable Details', groupOrder: 40, minorOrder: 40 },
  canine: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Animals & Companions', groupOrder: 20, minorOrder: 30 },
  'cat ears': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'cherry blossom petals': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Particles & Sparkles', groupOrder: 40, minorOrder: 20 },
  chrome: { step: 'style', subcategory: 'Finish', majorGroup: 'Surface & Finish', minorGroup: 'Abstract & Decorative', groupOrder: 40, minorOrder: 30 },
  'circuit patterns on skin': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Skin & Surface', groupOrder: 20, minorOrder: 50 },
  crying: { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Intense Reactions', groupOrder: 40, minorOrder: 30 },
  cyberware: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'data cables': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'data lines': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Skin & Surface', groupOrder: 20, minorOrder: 50 },
  drooling: { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Intense Reactions', groupOrder: 40, minorOrder: 30 },
  ears: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  facialscar: { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Facial Details', groupOrder: 10, minorOrder: 10 },
  'facial scar': { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Facial Details', groupOrder: 10, minorOrder: 10 },
  feathers: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  feline: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Animals & Companions', groupOrder: 20, minorOrder: 30 },
  fins: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'floating bubbles': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Particles & Sparkles', groupOrder: 40, minorOrder: 20 },
  'floating particles': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Particles & Sparkles', groupOrder: 40, minorOrder: 20 },
  'floating petals': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Particles & Sparkles', groupOrder: 40, minorOrder: 20 },
  'floating runes': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Glow & Atmospherics', groupOrder: 40, minorOrder: 30 },
  'fox ears': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'glitch effect': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Glow & Atmospherics', groupOrder: 40, minorOrder: 30 },
  'glowing circuitry': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Skin & Surface', groupOrder: 20, minorOrder: 50 },
  'glowing embers': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Particles & Sparkles', groupOrder: 40, minorOrder: 20 },
  'glowing energy': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Glow & Atmospherics', groupOrder: 40, minorOrder: 30 },
  'glowing particles': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Particles & Sparkles', groupOrder: 40, minorOrder: 20 },
  'glowing symbols': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Glow & Atmospherics', groupOrder: 40, minorOrder: 30 },
  goblin: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Hybrids & Monsters', groupOrder: 20, minorOrder: 20 },
  'holographic display': { step: 'subject', subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Devices & Tech', groupOrder: 30, minorOrder: 20 },
  'holographic projection': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Glow & Atmospherics', groupOrder: 40, minorOrder: 30 },
  'hood up': { step: 'appearance', subcategory: 'Clothing', majorGroup: 'Clothing & Uniforms', minorGroup: 'Outerwear & Layers', groupOrder: 30, minorOrder: 30 },
  hud: { step: 'subject', subcategory: 'Object', majorGroup: 'Objects & Props', minorGroup: 'Devices & Tech', groupOrder: 30, minorOrder: 20 },
  'joints': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'lens flare': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Glow & Atmospherics', groupOrder: 40, minorOrder: 30 },
  lightning: { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Glow & Atmospherics', groupOrder: 40, minorOrder: 30 },
  'magic aura': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Glow & Atmospherics', groupOrder: 40, minorOrder: 30 },
  'magical glyphs': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Skin & Surface', groupOrder: 20, minorOrder: 50 },
  'mid-thigh up': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'pink petals falling': { step: 'atmosphere', subcategory: 'Effects', majorGroup: 'Scene Effects', minorGroup: 'Particles & Sparkles', groupOrder: 40, minorOrder: 20 },
  'private glamour setting': { step: 'atmosphere', subcategory: 'Explicit', majorGroup: 'Intimacy & Explicit Tone', minorGroup: 'Seductive & Boudoir', groupOrder: 50, minorOrder: 10 },
  'reading lamps': { step: 'setting', subcategory: 'Indoor', majorGroup: 'Architecture & Urban', minorGroup: 'Learning & Culture', groupOrder: 20, minorOrder: 20 },
  'scene layout clarity': { step: 'quality', subcategory: 'Positive Quality', majorGroup: 'Positive Quality', minorGroup: 'Refinement & Control', groupOrder: 10, minorOrder: 30 },
  'skyline backdrop': { step: 'setting', subcategory: 'Urban', majorGroup: 'Architecture & Urban', minorGroup: 'City & Nightlife', groupOrder: 20, minorOrder: 10 },
  'small subject': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'space station interior': { step: 'setting', subcategory: 'Sci-Fi', majorGroup: 'Fantasy & Specialty', minorGroup: 'Labs & Facilities', groupOrder: 40, minorOrder: 20 },
  spacecraft: { step: 'setting', subcategory: 'Sci-Fi', majorGroup: 'Fantasy & Specialty', minorGroup: 'Futuristic Worlds', groupOrder: 40, minorOrder: 30 },
  'spaceship interior': { step: 'setting', subcategory: 'Sci-Fi', majorGroup: 'Fantasy & Specialty', minorGroup: 'Labs & Facilities', groupOrder: 40, minorOrder: 20 },
  'spooky mansion': { step: 'setting', subcategory: 'Fantasy', majorGroup: 'Fantasy & Specialty', minorGroup: 'Haunted & Mythic', groupOrder: 40, minorOrder: 30 },
  'stained glass': { step: 'setting', subcategory: 'Fantasy', majorGroup: 'Fantasy & Specialty', minorGroup: 'Sacred & Ceremonial', groupOrder: 40, minorOrder: 20 },
  'test tubes': { step: 'setting', subcategory: 'Sci-Fi', majorGroup: 'Fantasy & Specialty', minorGroup: 'Labs & Facilities', groupOrder: 40, minorOrder: 20 },
  'towering subject': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
  'vanity mirror lights': { step: 'setting', subcategory: 'Indoor', majorGroup: 'Architecture & Urban', minorGroup: 'Leisure & Luxury', groupOrder: 20, minorOrder: 30 },
  'vast landscape': { step: 'setting', subcategory: 'Outdoor', majorGroup: 'Nature & Outdoor', minorGroup: 'Mountains & Desert', groupOrder: 30, minorOrder: 30 },
  'velvet seating': { step: 'setting', subcategory: 'Indoor', majorGroup: 'Architecture & Urban', minorGroup: 'Leisure & Luxury', groupOrder: 20, minorOrder: 30 },
  female: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  woman: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  girl: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  lady: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  male: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  man: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  boy: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  gentleman: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  androgynous: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'gender neutral': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'non-binary': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  femboy: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'feminine male': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  trap: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'cute boy': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  tomboy: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'masculine girl': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  young: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  youth: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'youthful appearance': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  teenager: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  teen: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  adolescent: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  adult: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  mature: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'grown up': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  elderly: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  old: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  senior: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'wrinkled skin': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'mature female': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'older woman': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Identity & Demographics', groupOrder: 20, minorOrder: 5 },
  'cute face': { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Facial Details', groupOrder: 10, minorOrder: 10 },
  embarrassed: { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'fluffy tail': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  freckles: { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Facial Details', groupOrder: 10, minorOrder: 10 },
  'furrowed brows': { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Facial Details', groupOrder: 10, minorOrder: 10 },
  'happy expression': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'handsome face': { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Facial Details', groupOrder: 10, minorOrder: 10 },
  lingerie: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'lace lingerie': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'lace underwear': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  laughing: { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'large breasts': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Chest & Curves', groupOrder: 20, minorOrder: 20 },
  lipstick: { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Makeup & Finish', groupOrder: 10, minorOrder: 20 },
  'lovely face': { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Facial Details', groupOrder: 10, minorOrder: 10 },
  makeup: { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Makeup & Finish', groupOrder: 10, minorOrder: 20 },
  'medium breasts': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Chest & Curves', groupOrder: 20, minorOrder: 20 },
  nipples: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  areola: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  'detailed nipples': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  'large areola': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  'puffy nipples': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  'protruding nipples': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  pussy: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  vagina: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  penis: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  dick: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  cock: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  erection: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  cameltoe: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  'pubic hair': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Grooming & Exposure', groupOrder: 50, minorOrder: 40 },
  hairy: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Grooming & Exposure', groupOrder: 50, minorOrder: 40 },
  hairless: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Grooming & Exposure', groupOrder: 50, minorOrder: 40 },
  'completely shaved': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Grooming & Exposure', groupOrder: 50, minorOrder: 40 },
  'bald pussy': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Grooming & Exposure', groupOrder: 50, minorOrder: 40 },
  'partially covered breasts': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'profile breasts': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  'breast physics': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  'bouncing breasts': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  'latex catsuit': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'shiny latex': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  rubber: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'leather harness': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'bdsm gear': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  stockings: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  thighhighs: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'garter belt': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'micro bikini': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'slingshot bikini': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  thong: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'crotchless panties': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'garter set': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'lingerie straps': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'nipple pasties': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'star pasties': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'heart pasties': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'body harness': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'strappy lingerie': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'naked apron': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'body stocking': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'full body fishnet': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'fishnet bodysuit': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'fishnet tights': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'fishnet stockings': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'sheer catsuit': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Intimate Apparel', groupOrder: 50, minorOrder: 20 },
  'flashing panties': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'exposed pussy': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'nipple piercings': { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Erotic Anatomy', groupOrder: 50, minorOrder: 30 },
  nude: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  naked: { step: 'appearance', subcategory: 'Explicit', majorGroup: 'Explicit Appearance', minorGroup: 'Nudity & Exposure', groupOrder: 50, minorOrder: 10 },
  'open mouth laugh': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'one sided smile': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'rabbit ears': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'red cheeks': { step: 'appearance', subcategory: 'Face', majorGroup: 'Face & Hair', minorGroup: 'Makeup & Finish', groupOrder: 10, minorOrder: 20 },
  'sad expression': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'shaved head': { step: 'appearance', subcategory: 'Hair', majorGroup: 'Face & Hair', minorGroup: 'Style & Length', groupOrder: 10, minorOrder: 10 },
  shy: { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'short hair': { step: 'appearance', subcategory: 'Hair', majorGroup: 'Face & Hair', minorGroup: 'Style & Length', groupOrder: 10, minorOrder: 10 },
  'small breasts': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Chest & Curves', groupOrder: 20, minorOrder: 20 },
  smiling: { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  sleeping: { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'serious expression': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  'surprised expression': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Intense Reactions', groupOrder: 40, minorOrder: 30 },
  'tired expression': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  toned: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  abs: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  biceps: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  curvy: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  voluptuous: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  'hourglass figure': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  slim: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  slender: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  thin: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  petite: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  thicc: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  gigantic: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Shape & Build', groupOrder: 20, minorOrder: 10 },
  'pixie cut': { step: 'appearance', subcategory: 'Hair', majorGroup: 'Face & Hair', minorGroup: 'Style & Length', groupOrder: 10, minorOrder: 10 },
  'bunny ears': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  usagimimi: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  nekomimi: { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'demon horns': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'dragon horns': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Mythic & Nonhuman Traits', groupOrder: 20, minorOrder: 40 },
  'huge breasts': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Chest & Curves', groupOrder: 20, minorOrder: 20 },
  'massive tits': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Chest & Curves', groupOrder: 20, minorOrder: 20 },
  'flat chest': { step: 'appearance', subcategory: 'Body', majorGroup: 'Body & Silhouette', minorGroup: 'Chest & Curves', groupOrder: 20, minorOrder: 20 },
  'warm smile': { step: 'action', subcategory: 'Expression', majorGroup: 'Interaction & Expression', minorGroup: 'Emotion & Presence', groupOrder: 40, minorOrder: 10 },
  zombie: { step: 'subject', subcategory: 'Creature', majorGroup: 'Creatures & Beings', minorGroup: 'Cosmic & Undead Beings', groupOrder: 20, minorOrder: 15 },
  'waist up': { step: 'setting', subcategory: 'Camera', majorGroup: 'Composition & Camera', minorGroup: 'Shot Scale', groupOrder: 10, minorOrder: 20 },
};

const EXPLICIT_THEME_KEYWORDS = ['nsfw', 'r-18', 'adult content', 'explicit content', 'erotic', 'porn', 'sex scene', 'boudoir', 'pin-up', 'romantic intimacy'];
const EXPLICIT_APPEARANCE_KEYWORDS = ['nude', 'naked', 'unclothed', 'nipple', 'underboob', 'cleavage', 'thong', 'crotchless', 'panties', 'panty', 'lingerie', 'pasties', 'intimates', 'intimate apparel', 'exposing cleavage', 'garter', 'translucent clothing'];
const EXPLICIT_ACTION_KEYWORDS = ['sex', 'cum', 'cumshot', 'bondage', 'orgasm', 'penetration', 'oral sex', 'forced oral', 'mutual oral sex', 'anal sex', 'anal penetration', 'breast smother', 'vibrator', 'sex toy', 'cumming', 'swallowing cum', 'kissing ass'];
const INTIMATE_ACTION_KEYWORDS = ['embrace', 'kiss', 'kissing', 'bedroom eyes', 'intimate eye contact', 'touching own breasts', 'pressing breasts together', 'squeezing breasts', 'breasts resting on object', 'heavy breasts supported'];
const EXPLICIT_ATMOSPHERE_KEYWORDS = ['seductive', 'boudoir', 'aftercare', 'post-romance', 'private bedroom mood', 'intimate', 'playful allure', 'tender closeness', 'gentle vulnerability'];
const SUBJECT_OBJECT_KEYWORDS = ['weapon', 'gun', 'handgun', 'pistol', 'rifle', 'sword', 'shield', 'blade', 'axe', 'spear', 'polearm', 'scythe', 'bow', 'quiver', 'staff', 'book', 'tome', 'grimoire', 'spellbook', 'orb', 'crystal ball', 'lantern', 'lamp', 'camera', 'phone', 'smartphone', 'microphone', 'headphone', 'headset', 'instrument', 'guitar', 'lute', 'umbrella', 'flower', 'bouquet', 'box', 'chest', 'vial', 'potion', 'artifact', 'holy symbol', 'backpack', 'badge', 'dagger', 'helmet', 'monitor', 'lockpick', 'net', 'trident', 'patrol car', 'tools', 'stethoscope', 'jetpack', 'katana'];
const SUBJECT_ACTION_KEYWORDS = ['holding ', 'smoking ', 'reading ', 'casting ', 'walking ', 'running ', 'kneeling', 'reclining', 'lounging', 'prayer', 'pose', 'stance', 'battle ready', 'combat', 'cuddle', 'embrace', 'kiss', 'hug', 'body language', 'posture', 'twist', 'over shoulder look', 'fire breathing', 'transformation'];
const SUBJECT_SETTING_KEYWORDS = ['background', 'room', 'bedroom', 'cockpit', 'campus', 'street', 'city', 'forest', 'nature', 'nightlife', 'setting', 'bubble bath', 'changing area', 'hotel suite', 'lounge', 'bedding', 'mirror', 'seating', 'vip', 'night', 'shadows', 'clouds', 'wilderness', 'vines', 'full moon'];
const SUBJECT_ATMOSPHERE_KEYWORDS = ['mood', 'glow', 'charm', 'allure', 'confidence', 'vulnerability', 'warm water', 'tender', 'intimate', 'seductive', 'atmosphere', 'energy', 'light', 'steam', 'warmth', 'chemistry', 'affection', 'comfort', 'vibe', 'presence', 'sensual', 'rage'];
const CREATURE_KEYWORDS = ['dragon', 'demon', 'angel', 'elf', 'mermaid', 'succubus', 'werewolf', 'wolfman', 'monster', 'beast', 'fox', 'bird', 'cat', 'dog', 'creature', 'griffon', 'fairy', 'centaur', 'parrot', 'animal companion', 'vampire', 'zombie', 'undead', 'half human', 'alien', 'extraterrestrial'];
const CAMERA_KEYWORDS = ['shot', 'angle', 'view', 'perspective', 'pov', 'focus', 'lens', 'close-up', 'close up', 'framing', 'diorama', 'camera', 'ots', 'macro photography', 'macro', 'over the shoulder'];

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function applyTaxonomy(tag: PromptTag, taxonomy: TagTaxonomy): PromptTag {
  return {
    ...tag,
    text: taxonomy.text ?? tag.text,
    step: taxonomy.step ?? tag.step,
    subcategory: taxonomy.subcategory,
    majorGroup: taxonomy.majorGroup,
    minorGroup: taxonomy.minorGroup,
    groupOrder: taxonomy.groupOrder,
    minorOrder: taxonomy.minorOrder,
  };
}

function findExactTaxonomy(text: string): TagTaxonomy | undefined {
  return EXACT_TAXONOMY[text];
}

function isExplicitTheme(text: string): boolean {
  return includesAny(text, EXPLICIT_THEME_KEYWORDS);
}

function isExplicitAppearance(text: string): boolean {
  return includesAny(text, EXPLICIT_APPEARANCE_KEYWORDS);
}

function isExplicitAction(text: string): boolean {
  return includesAny(text, EXPLICIT_ACTION_KEYWORDS);
}

function isIntimateAction(text: string): boolean {
  return includesAny(text, INTIMATE_ACTION_KEYWORDS);
}

function isExplicitAtmosphere(text: string): boolean {
  return includesAny(text, EXPLICIT_ATMOSPHERE_KEYWORDS);
}

function rerouteSubjectGeneral(tag: PromptTag, text: string): PromptTag {
  if (tag.step !== 'subject') {
    return tag;
  }

  if (isExplicitTheme(text)) {
    return { ...tag, step: 'subject', subcategory: 'Explicit' };
  }
  if (isExplicitAppearance(text)) {
    return { ...tag, step: 'appearance', subcategory: 'Explicit' };
  }
  if (isExplicitAction(text) || isIntimateAction(text)) {
    return { ...tag, step: 'action', subcategory: 'Explicit' };
  }
  if (isExplicitAtmosphere(text)) {
    return { ...tag, step: 'atmosphere', subcategory: 'Explicit' };
  }
  if (includesAny(text, ['hair', 'bang', 'ponytail', 'braid', 'eye', 'iris', 'pupil', 'face', 'lip', 'makeup', 'blush', 'war paint'])) {
    return { ...tag, step: 'appearance', subcategory: includesAny(text, ['hair', 'bang', 'ponytail', 'braid']) ? 'Hair' : includesAny(text, ['eye', 'iris', 'pupil']) ? 'Eyes' : 'Face' };
  }
  if (includesAny(text, ['dress', 'shirt', 'skirt', 'jacket', 'uniform', 'outfit', 'armor', 'swimsuit', 'bikini', 'corset', 'robe', 'coat', 'leotard', 'kimono', 'cloak', 'hoodie', 'gown', 'apron', 'attire', 'fabric', 'loungewear', 'clothes', 'fashion', 'gear', 'top', 'plugsuit', 'costume', 'blankets', 'suit and tie', 'camouflage', 'hooded', 'seams'])) {
    return { ...tag, step: 'appearance', subcategory: 'Clothing' };
  }
  if (includesAny(text, ['shoe', 'heels', 'boots', 'sandals', 'footwear', 'stilettos'])) {
    return { ...tag, step: 'appearance', subcategory: 'Footwear' };
  }
  if (includesAny(text, ['jewelry', 'necklace', 'earring', 'bracelet', 'body chain', 'crown', 'hat', 'glasses', 'mask', 'headband', 'tiara', 'visor', 'eyewear', 'face covering', 'halo', 'fedora'])) {
    return { ...tag, step: 'appearance', subcategory: 'Accessories' };
  }
  if (includesAny(text, ['waist', 'hips', 'curves', 'silhouette', 'figure', 'build', 'petite', 'tall', 'legs', 'thigh', 'feet', 'breast', 'chest', 'bust', 'skin', 'muscular', 'tail', 'wings', 'horns', 'fangs', 'scales', 'gills', 'claws', 'fur', 'pointed ears', 'antlers', 'eagle head', 'lion body', 'body sheen', 'satin sheen', 'mechanical joints', 'mechanical limbs', 'tiny', 'rugged'])) {
    return { ...tag, step: 'appearance', subcategory: 'Body' };
  }
  if (includesAny(text, ['film noir'])) {
    return { ...tag, step: 'style', subcategory: 'Cinematic' };
  }
  if (includesAny(text, ['stealth', 'stealthy', 'sneaky', 'lethal', 'tracker', 'tease'])) {
    return { ...tag, step: 'action', subcategory: includesAny(text, ['tease']) ? 'Expression' : 'Pose' };
  }
  if (includesAny(text, SUBJECT_ACTION_KEYWORDS)) {
    return { ...tag, step: 'action', subcategory: includesAny(text, ['holding ', 'reading ', 'smoking ', 'prayer', 'casting ']) ? 'Gesture' : 'Pose' };
  }
  if (includesAny(text, ['magic', 'dust', 'heavenly', 'hellfire', 'neon code', 'soot'])) {
    return { ...tag, step: 'atmosphere', subcategory: includesAny(text, ['heavenly', 'hellfire']) ? 'Mood' : 'Effects' };
  }
  if (includesAny(text, ['expression', 'gaze', 'eye contact', 'smile', 'glance', 'charming', 'charismatic'])) {
    return { ...tag, step: 'action', subcategory: 'Expression' };
  }
  if (includesAny(text, SUBJECT_SETTING_KEYWORDS)) {
    return {
      ...tag,
      step: 'setting',
      subcategory: includesAny(text, CAMERA_KEYWORDS)
        ? 'Camera'
        : includesAny(text, ['city', 'street', 'nightlife'])
          ? 'Urban'
          : includesAny(text, ['forest', 'nature'])
            ? 'Outdoor'
            : 'Indoor',
    };
  }
  if (includesAny(text, SUBJECT_ATMOSPHERE_KEYWORDS)) {
    return { ...tag, step: 'atmosphere', subcategory: isExplicitAtmosphere(text) ? 'Explicit' : 'Mood' };
  }
  if (includesAny(text, SUBJECT_OBJECT_KEYWORDS)) {
    return { ...tag, step: 'subject', subcategory: 'Object' };
  }
  return tag;
}

function classifySubject(tag: PromptTag, text: string): PromptTag {
  if (tag.subcategory === 'Explicit' || isExplicitTheme(text)) {
    const minorGroup = includesAny(text, ['nsfw', 'r-18', 'adult content', 'explicit content'])
      ? 'Rating & Content Flags'
      : includesAny(text, ['boudoir', 'pin-up', 'glamour'])
        ? 'Boudoir & Glamour'
        : 'Erotic Themes';
    const minorOrder = minorGroup === 'Rating & Content Flags' ? 10 : minorGroup === 'Boudoir & Glamour' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory: 'Explicit',
      majorGroup: 'Explicit Content',
      minorGroup,
      groupOrder: 50,
      minorOrder,
    });
  }

  if (includesAny(text, CREATURE_KEYWORDS)) {
    const minorGroup = includesAny(text, ['dragon', 'angel', 'demon', 'succubus', 'mermaid', 'elf', 'fairy'])
      ? 'Mythic & Supernatural'
      : includesAny(text, ['werewolf', 'wolfman', 'half human', 'monster', 'beast', 'centaur'])
        ? 'Hybrids & Monsters'
        : 'Animals & Companions';
    const minorOrder = minorGroup === 'Mythic & Supernatural' ? 10 : minorGroup === 'Hybrids & Monsters' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory: 'Creature',
      majorGroup: 'Creatures & Beings',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  if (tag.subcategory === 'Object' || includesAny(text, SUBJECT_OBJECT_KEYWORDS)) {
    const minorGroup = includesAny(text, ['weapon', 'gun', 'handgun', 'pistol', 'rifle', 'sword', 'shield', 'blade', 'axe', 'spear', 'polearm', 'scythe', 'bow'])
      ? 'Weapons & Armor'
      : includesAny(text, ['phone', 'smartphone', 'camera', 'headphone', 'headset', 'tech', 'monitor'])
        ? 'Devices & Tech'
        : includesAny(text, ['instrument', 'guitar', 'lute', 'microphone', 'audio'])
          ? 'Instruments & Audio Gear'
          : includesAny(text, ['book', 'books', 'tome', 'grimoire', 'spellbook', 'tools', 'vial', 'potion'])
            ? 'Books & Tools'
            : includesAny(text, ['car', 'vehicle', 'machine', 'mech', 'jetpack'])
              ? 'Vehicles & Machines'
              : 'Artifacts & Props';
    const minorOrder = minorGroup === 'Weapons & Armor' ? 10 : minorGroup === 'Devices & Tech' ? 20 : minorGroup === 'Instruments & Audio Gear' ? 30 : minorGroup === 'Books & Tools' ? 40 : minorGroup === 'Vehicles & Machines' ? 50 : 60;
    return applyTaxonomy(tag, {
      subcategory: 'Object',
      majorGroup: 'Objects & Props',
      minorGroup,
      groupOrder: 30,
      minorOrder,
    });
  }

  if (includesAny(text, ['arena', 'battlefield', 'cityscape', 'landscape', 'scene', 'nightlife', 'setting', 'background'])) {
    const minorGroup = includesAny(text, ['battlefield', 'arena'])
      ? 'Conflict & Adventure Scenes'
      : includesAny(text, ['cityscape', 'nightlife', 'background'])
        ? 'Backdrop Concepts'
        : 'Scene Concepts';
    const minorOrder = minorGroup === 'Scene Concepts' ? 10 : minorGroup === 'Backdrop Concepts' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory: 'Scene',
      majorGroup: 'Scenes & Themes',
      minorGroup,
      groupOrder: 40,
      minorOrder,
    });
  }

  if (includesAny(text, ['theme', 'concept', 'romance', 'divine', 'mythological', 'sci-fi'])) {
    return applyTaxonomy(tag, {
      subcategory: 'Theme',
      majorGroup: 'Scenes & Themes',
      minorGroup: 'Narrative & Concepts',
      groupOrder: 40,
      minorOrder: 40,
    });
  }

  const minorGroup = includesAny(text, ['princess', 'queen', 'king', 'knight', 'holy knight', 'noble', 'warrior', 'paladin', 'prince', 'valkyrie'])
    ? 'Heroes & Nobility'
    : includesAny(text, ['business', 'person', 'maid', 'nurse', 'alchemist', 'scholar', 'archer', 'assassin', 'doctor', 'performer', 'musician', 'photographer', 'police officer', 'student', 'firefighter', 'bard', 'bounty hunter', 'geisha', 'gladiator', 'healer', 'idol singer', 'corporate'])
      ? 'Professions & Roles'
      : includesAny(text, ['necromancer', 'barbarian', 'roman armor', 'mandalorian', 'orc', 'witch', 'wizard', 'warlock', 'samurai', 'rogue', 'ranger', 'cleric', 'druid', 'mage', 'spellcaster', 'pirate', 'thief'])
        ? 'Fantasy Archetypes'
        : includesAny(text, ['android', 'cyborg', 'robot', 'hacker', 'mecha pilot', 'sci-fi pilot', 'modern soldier', 'cyberpunk', 'artificial intelligence', 'space marine'])
          ? 'Tech & Sci-Fi Personas'
          : 'General Characters';
  const minorOrder = minorGroup === 'Heroes & Nobility' ? 10 : minorGroup === 'Professions & Roles' ? 20 : minorGroup === 'Fantasy Archetypes' ? 30 : minorGroup === 'Tech & Sci-Fi Personas' ? 40 : 50;
  return applyTaxonomy(tag, {
    subcategory: 'Character',
    majorGroup: 'People & Roles',
    minorGroup,
    groupOrder: 10,
    minorOrder,
  });
}

function classifyAppearance(tag: PromptTag, text: string): PromptTag {
  if (tag.subcategory === 'Explicit' || isExplicitAppearance(text) || includesAny(text, ['sexy', 'seductive'])) {
    const minorGroup = includesAny(text, ['nude', 'naked', 'unclothed'])
      ? 'Nudity & Exposure'
      : includesAny(text, ['lingerie', 'thong', 'panties', 'pasties', 'intimates', 'crotchless', 'intimate apparel'])
        ? 'Intimate Apparel'
        : 'Erotic Anatomy';
    const minorOrder = minorGroup === 'Nudity & Exposure' ? 10 : minorGroup === 'Intimate Apparel' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory: 'Explicit',
      majorGroup: 'Explicit Appearance',
      minorGroup,
      groupOrder: 50,
      minorOrder,
    });
  }

  const subcategory = includesAny(text, ['shoe', 'heels', 'boots', 'sandals', 'footwear', 'stilettos'])
    ? 'Footwear'
    : includesAny(text, ['hair', 'bang', 'ponytail', 'braid', 'curl', 'bob cut', 'long hair', 'short hair'])
      ? 'Hair'
      : includesAny(text, ['eye', 'eyelash', 'iris', 'pupil'])
        ? 'Eyes'
        : includesAny(text, ['face', 'lip', 'makeup', 'smile', 'gaze', 'freckles', 'blush'])
          ? 'Face'
          : includesAny(text, ['dress', 'shirt', 'skirt', 'jacket', 'uniform', 'outfit', 'armor', 'swimsuit', 'bikini', 'corset', 'robe', 'coat', 'leotard', 'kimono', 'cloak', 'hoodie', 'gown', 'apron', 'attire', 'fabric', 'loungewear', 'clothes', 'fashion', 'gear', 'top', 'plugsuit', 'costume', 'blankets'])
            ? 'Clothing'
            : includesAny(text, ['jewelry', 'necklace', 'earring', 'bracelet', 'body chain', 'crown', 'hat', 'glasses', 'mask', 'headband', 'tiara', 'visor', 'eyewear', 'face covering', 'halo'])
              ? 'Accessories'
              : tag.subcategory ?? 'Body';

  if (subcategory === 'Hair' || subcategory === 'Eyes' || subcategory === 'Face') {
    const minorGroup = subcategory === 'Hair'
      ? includesAny(text, ['long', 'short', 'bob', 'ponytail', 'braid', 'bun'])
        ? 'Style & Length'
        : 'Color & Finish'
      : subcategory === 'Eyes'
        ? 'Eye Shape & Color'
        : includesAny(text, ['makeup', 'lip', 'blush'])
          ? 'Makeup & Finish'
          : 'Facial Details';
    const minorOrder = minorGroup === 'Style & Length' || minorGroup === 'Eye Shape & Color' || minorGroup === 'Facial Details' ? 10 : 20;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Face & Hair',
      minorGroup,
      groupOrder: 10,
      minorOrder,
    });
  }

  if (subcategory === 'Body') {
    const minorGroup = includesAny(text, ['waist', 'hips', 'curves', 'silhouette', 'figure', 'build', 'petite', 'tall'])
      ? 'Shape & Build'
      : includesAny(text, ['legs', 'thigh', 'feet'])
        ? 'Legs & Lower Body'
        : includesAny(text, ['tail', 'wings', 'horns', 'fangs', 'scales', 'gills', 'claws', 'fur', 'pointed ears'])
          ? 'Mythic & Nonhuman Traits'
        : includesAny(text, ['breast', 'chest', 'bust'])
          ? 'Chest & Curves'
          : 'Skin & Surface';
    const minorOrder = minorGroup === 'Shape & Build' ? 10 : minorGroup === 'Chest & Curves' ? 20 : minorGroup === 'Legs & Lower Body' ? 30 : minorGroup === 'Mythic & Nonhuman Traits' ? 40 : 50;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Body & Silhouette',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  if (subcategory === 'Clothing') {
    const minorGroup = includesAny(text, ['uniform', 'maid', 'nurse', 'school', 'cheerleader'])
      ? 'Uniforms & Roleplay'
      : includesAny(text, ['armor', 'plate', 'chainmail', 'mail armor', 'cloak', 'robe', 'habit', 'nun', 'fantasy', 'kimono'])
        ? 'Fantasy & Armor'
        : includesAny(text, ['coat', 'jacket', 'hoodie', 'cape', 'trench coat'])
          ? 'Outerwear & Layers'
          : 'Everyday & Formal Wear';
    const minorOrder = minorGroup === 'Uniforms & Roleplay' ? 10 : minorGroup === 'Fantasy & Armor' ? 20 : minorGroup === 'Outerwear & Layers' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Clothing & Uniforms',
      minorGroup,
      groupOrder: 30,
      minorOrder,
    });
  }

  if (subcategory === 'Footwear') {
    const minorGroup = includesAny(text, ['heels', 'stilettos']) ? 'Heels & Dress Shoes' : includesAny(text, ['boots']) ? 'Boots & Combat' : 'Casual & Sandals';
    const minorOrder = minorGroup === 'Heels & Dress Shoes' ? 10 : minorGroup === 'Boots & Combat' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Accessories & Finish',
      minorGroup,
      groupOrder: 40,
      minorOrder,
    });
  }

  const minorGroup = includesAny(text, ['jewelry', 'necklace', 'earring', 'bracelet', 'body chain'])
    ? 'Jewelry & Chains'
    : includesAny(text, ['hat', 'crown', 'headband', 'tiara'])
      ? 'Headwear'
      : includesAny(text, ['glasses', 'mask', 'visor', 'eyewear', 'face covering'])
        ? 'Facewear & Vision'
        : 'Wearable Details';
  const minorOrder = minorGroup === 'Jewelry & Chains' ? 10 : minorGroup === 'Headwear' ? 20 : minorGroup === 'Facewear & Vision' ? 30 : 40;
  return applyTaxonomy(tag, {
    subcategory: 'Accessories',
    majorGroup: 'Accessories & Finish',
    minorGroup,
    groupOrder: 40,
    minorOrder,
  });
}

function classifyAction(tag: PromptTag, text: string): PromptTag {
  if (tag.subcategory === 'Explicit' || isExplicitAction(text) || isIntimateAction(text)) {
    const minorGroup = includesAny(text, ['cum', 'cumshot', 'cumming'])
      ? 'Fluids & Aftermath'
      : includesAny(text, ['sex', 'oral', 'anal', 'bondage', 'penetration', 'vibrator', 'sex toy'])
        ? 'Sex Acts'
        : includesAny(text, ['kiss', 'kissing', 'embrace', 'eye contact'])
          ? 'Intimate Contact'
          : 'Erotic Touch';
    const minorOrder = minorGroup === 'Sex Acts' ? 10 : minorGroup === 'Intimate Contact' ? 20 : minorGroup === 'Fluids & Aftermath' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory: 'Explicit',
      majorGroup: 'Explicit Actions',
      minorGroup,
      groupOrder: 50,
      minorOrder,
    });
  }

  const subcategory = includesAny(text, ['portrait', 'headshot', 'close-up', 'close up', 'full body', 'upper body', 'profile view', 'back view', 'pov', 'shot', 'view', 'angle', 'focus'])
    ? 'Framing'
    : includesAny(text, ['smile', 'cry', 'laugh', 'angry', 'blush', 'teasing', 'blank eyes', 'gaze', 'expression', 'rage'])
      ? 'Expression'
      : includesAny(text, ['hand', 'touching', 'pointing', 'holding', 'crossed', 'gesture', 'grabbing', 'hands on', 'reading', 'smoking', 'prayer', 'casting'])
        ? 'Gesture'
        : includesAny(text, ['walking', 'running', 'jumping', 'motion', 'movement', 'sprinting', 'airborne', 'dynamic', 'flying'])
          ? 'Motion'
          : 'Pose';

  if (subcategory === 'Framing') {
    const minorGroup = includesAny(text, ['portrait', 'headshot', 'close-up', 'close up', 'upper body', 'full body'])
      ? 'Framing & Crop'
      : includesAny(text, ['angle', 'profile view', 'back view'])
        ? 'View Direction'
        : 'POV & Camera';
    const minorOrder = minorGroup === 'Framing & Crop' ? 10 : minorGroup === 'View Direction' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Framing & View',
      minorGroup,
      groupOrder: 10,
      minorOrder,
    });
  }

  if (subcategory === 'Pose') {
    const minorGroup = includesAny(text, ['standing', 'hand on hip', 'arms crossed', 'stance'])
      ? 'Standing & Power'
      : includesAny(text, ['sitting', 'seated', 'reclining', 'lying', 'lounging'])
        ? 'Seated & Reclining'
        : includesAny(text, ['kneeling', 'on knees'])
          ? 'Grounded Poses'
          : includesAny(text, ['fighting', 'combat'])
            ? 'Combat Poses'
            : includesAny(text, ['presenting', 'over shoulder', 'battle ready'])
              ? 'Display & Presentation'
              : 'Relaxed & Neutral';
    const minorOrder = minorGroup === 'Standing & Power' ? 10 : minorGroup === 'Seated & Reclining' ? 20 : minorGroup === 'Grounded Poses' ? 30 : minorGroup === 'Combat Poses' ? 40 : minorGroup === 'Display & Presentation' ? 50 : 60;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Pose & Stance',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  if (subcategory === 'Motion') {
    const minorGroup = includesAny(text, ['walking', 'running', 'sprinting']) ? 'Travel & Locomotion' : includesAny(text, ['jumping', 'airborne', 'flying']) ? 'Air & Lift' : 'Action Energy';
    const minorOrder = minorGroup === 'Travel & Locomotion' ? 10 : minorGroup === 'Air & Lift' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Motion & Energy',
      minorGroup,
      groupOrder: 30,
      minorOrder,
    });
  }

  if (subcategory === 'Gesture') {
    const minorGroup = includesAny(text, ['hand', 'hands', 'arms', 'crossed'])
      ? 'Hands & Arms'
      : includesAny(text, ['holding', 'reading', 'smoking'])
        ? 'Prop Interaction'
        : includesAny(text, ['touching', 'grabbing'])
          ? 'Touch & Contact'
          : 'Ritual & Spellwork';
    const minorOrder = minorGroup === 'Hands & Arms' ? 10 : minorGroup === 'Prop Interaction' ? 20 : minorGroup === 'Touch & Contact' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Interaction & Expression',
      minorGroup,
      groupOrder: 40,
      minorOrder,
    });
  }

  const minorGroup = includesAny(text, ['smile', 'teasing', 'flirty']) ? 'Playful & Confident' : includesAny(text, ['blank eyes', 'angry', 'cry', 'rage']) ? 'Intense Reactions' : includesAny(text, ['gaze', 'soft', 'tender']) ? 'Soft & Romantic' : 'Stoic & Serious';
  const minorOrder = minorGroup === 'Playful & Confident' ? 10 : minorGroup === 'Soft & Romantic' ? 20 : minorGroup === 'Intense Reactions' ? 30 : 40;
  return applyTaxonomy(tag, {
    subcategory: 'Expression',
    majorGroup: 'Interaction & Expression',
    minorGroup,
    groupOrder: 40,
    minorOrder,
  });
}

function classifySetting(tag: PromptTag, text: string): PromptTag {
  const subcategory = includesAny(text, CAMERA_KEYWORDS)
    ? 'Camera'
    : includesAny(text, ['city', 'metropolitan', 'shibuya', 'manhattan', 'paris', 'metro', 'underground', 'architecture', 'eiffel tower'])
      ? 'Urban'
      : includesAny(text, ['trees', 'woodland', 'nature', 'foliage', 'sand', 'waves', 'tropical', 'coastal', 'peaks', 'alpine', 'dunes', 'oasis', 'underwater', 'coral', 'flowers', 'plants', 'wildflowers', 'grass', 'spring', 'winter landscape', 'ice peaks', 'blizzard', 'forest', 'garden'])
        ? 'Outdoor'
      : includesAny(text, ['medieval', 'torii', 'sacred', 'mythical', 'atlantis', 'haunted', 'graveyard', 'palace', 'cathedral', 'holy', 'colosseum'])
        ? 'Fantasy'
          : includesAny(text, ['science fiction', 'futuristic technology', 'high tech equipment', 'sterile', 'medical facility', 'white halls', 'viewport looking at earth', 'galaxy', 'stars', 'nebula', 'cosmic', 'astronomical', 'lab'])
            ? 'Sci-Fi'
            : tag.subcategory ?? 'Indoor';

  if (subcategory === 'Camera') {
    const minorGroup = includesAny(text, ['angle', 'perspective', 'top down', 'ground level', 'low perspective', 'aerial', 'drone', 'tilted', 'eye level']) ? 'Angles & Perspective' : includesAny(text, ['wide shot', 'extreme wide shot', 'close up', 'close-up', 'medium shot', 'cowboy shot', 'establishing shot', 'macro']) ? 'Shot Scale' : 'POV & Focus';
    const minorOrder = minorGroup === 'Angles & Perspective' ? 10 : minorGroup === 'Shot Scale' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Composition & Camera',
      minorGroup,
      groupOrder: 10,
      minorOrder,
    });
  }

  if (subcategory === 'Indoor') {
    const minorGroup = includesAny(text, ['reading room', 'scholarly', 'chalkboard', 'educational', 'library', 'bookshelves']) ? 'Learning & Culture' : includesAny(text, ['room', 'bedroom', 'tables', 'books', 'desks']) ? 'Domestic & Lifestyle' : includesAny(text, ['hotel', 'lounge', 'cozy', 'warm lighting', 'vip']) ? 'Leisure & Luxury' : 'Institutional & Interior';
    const minorOrder = minorGroup === 'Domestic & Lifestyle' ? 10 : minorGroup === 'Learning & Culture' ? 20 : minorGroup === 'Leisure & Luxury' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Architecture & Urban',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  if (subcategory === 'Urban') {
    const minorGroup = includesAny(text, ['shibuya', 'manhattan', 'paris', 'eiffel tower']) ? 'Landmarks & Travel' : includesAny(text, ['metro', 'underground']) ? 'Transit & Infrastructure' : 'City & Nightlife';
    const minorOrder = minorGroup === 'City & Nightlife' ? 10 : minorGroup === 'Landmarks & Travel' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Architecture & Urban',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  if (subcategory === 'Outdoor') {
    const minorGroup = includesAny(text, ['forest', 'woodland', 'flowers', 'garden', 'botanical']) ? 'Forest & Garden' : includesAny(text, ['coastal', 'waves', 'underwater', 'coral', 'oasis']) ? 'Coast & Water' : includesAny(text, ['mountain', 'peaks', 'dunes', 'desert', 'grass']) ? 'Mountains & Desert' : 'Weather & Seasons';
    const minorOrder = minorGroup === 'Forest & Garden' ? 10 : minorGroup === 'Coast & Water' ? 20 : minorGroup === 'Mountains & Desert' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Nature & Outdoor',
      minorGroup,
      groupOrder: 30,
      minorOrder,
    });
  }

  if (subcategory === 'Fantasy') {
    const minorGroup = includesAny(text, ['medieval', 'village', 'fortress', 'palace', 'colosseum']) ? 'Medieval & Royal' : includesAny(text, ['cathedral', 'torii', 'sacred', 'holy']) ? 'Sacred & Ceremonial' : 'Haunted & Mythic';
    const minorOrder = minorGroup === 'Medieval & Royal' ? 10 : minorGroup === 'Sacred & Ceremonial' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Fantasy & Specialty',
      minorGroup,
      groupOrder: 40,
      minorOrder,
    });
  }

  const minorGroup = includesAny(text, ['galaxy', 'stars', 'nebula', 'cosmic', 'viewport looking at earth']) ? 'Space & Cosmic' : includesAny(text, ['medical facility', 'sterile', 'high tech equipment', 'lab']) ? 'Labs & Facilities' : 'Futuristic Worlds';
  const minorOrder = minorGroup === 'Space & Cosmic' ? 10 : minorGroup === 'Labs & Facilities' ? 20 : 30;
  return applyTaxonomy(tag, {
    subcategory: 'Sci-Fi',
    majorGroup: 'Fantasy & Specialty',
    minorGroup,
    groupOrder: 40,
    minorOrder,
  });
}

function classifyStyle(tag: PromptTag, text: string): PromptTag {
  const subcategory = tag.subcategory
    ?? (includesAny(text, ['manga', 'anime']) ? 'Anime'
      : includesAny(text, ['style', 'studio', 'madhouse', 'tite kubo', 'kishimoto', 'akira toriyama', 'warhol', 'monet']) ? 'Reference'
        : includesAny(text, ['vector art', 'flat design', 'line art', 'clean linework', 'graphic', 'halftone', 'screentones', 'pop art', 'comic book']) ? 'Graphic'
        : includesAny(text, ['old camera', 'sepia', '1920s', 'victorian', 'art deco', 'retro', 'gothic']) ? 'Retro'
          : includesAny(text, ['dramatic', 'serene', 'fantasy', 'ninja', 'shinobi', 'martial arts', 'cute', 'stylized', 'ominous grandeur', 'gothic atmosphere']) ? 'Cinematic'
            : 'Finish');

  if (subcategory === 'Anime' || subcategory === 'Reference') {
    const minorGroup = includesAny(text, ['demon slayer', 'attack on titan', 'jujutsu', 'chainsaw man', 'dragon ball', 'naruto', 'bleach']) ? 'Series References' : includesAny(text, ['studio', 'madhouse', 'ufotable', 'gainax', 'mappa', 'toei']) ? 'Studios & Creators' : 'Anime Style Cues';
    const minorOrder = minorGroup === 'Series References' ? 10 : minorGroup === 'Studios & Creators' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Artists & References',
      minorGroup,
      groupOrder: 30,
      minorOrder,
    });
  }

  if (subcategory === 'Painting') {
    const minorGroup = includesAny(text, ['oil', 'canvas']) ? 'Oil & Canvas' : includesAny(text, ['watercolor', 'soft colors', 'fluid']) ? 'Watercolor & Soft Paint' : 'Traditional Illustration';
    const minorOrder = minorGroup === 'Oil & Canvas' ? 10 : minorGroup === 'Watercolor & Soft Paint' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Medium & Rendering',
      minorGroup,
      groupOrder: 10,
      minorOrder,
    });
  }

  if (subcategory === 'Digital' || subcategory === 'Realistic') {
    const minorGroup = includesAny(text, ['3d', 'cgi', 'octane', 'unreal']) ? '3D & Rendered' : includesAny(text, ['pixel', '8-bit', 'retro']) ? 'Pixel & Game Art' : includesAny(text, ['photorealistic', 'hyperrealistic', 'realistic']) ? 'Photo & Realism' : 'Digital Illustration';
    const minorOrder = minorGroup === 'Photo & Realism' ? 10 : minorGroup === '3D & Rendered' ? 20 : minorGroup === 'Digital Illustration' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Medium & Rendering',
      minorGroup,
      groupOrder: 10,
      minorOrder,
    });
  }

  if (subcategory === 'Graphic' || subcategory === 'Retro') {
    const minorGroup = includesAny(text, ['comic', 'halftone', 'screentones', 'pop art']) ? 'Comic & Pop' : includesAny(text, ['vector', 'flat design', 'line art', 'monochrome']) ? 'Graphic & Flat' : 'Vintage & Period';
    const minorOrder = minorGroup === 'Comic & Pop' ? 10 : minorGroup === 'Graphic & Flat' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Aesthetic & Genre',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  if (subcategory === 'Cinematic') {
    const minorGroup = includesAny(text, ['dramatic', 'cinematic', 'movie still', 'film grain']) ? 'Filmic & Dramatic' : includesAny(text, ['fantasy', 'ninja', 'martial arts']) ? 'Epic & Genre' : 'Dark & Gothic';
    const minorOrder = minorGroup === 'Filmic & Dramatic' ? 10 : minorGroup === 'Epic & Genre' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Aesthetic & Genre',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  const minorGroup = includesAny(text, ['grain', 'clean lines', 'bold edge highlights']) ? 'Detail & Finish' : includesAny(text, ['pink and blue', 'gold accents']) ? 'Color Finish' : 'Abstract & Decorative';
  const minorOrder = minorGroup === 'Detail & Finish' ? 10 : minorGroup === 'Color Finish' ? 20 : 30;
  return applyTaxonomy(tag, {
    subcategory: 'Finish',
    majorGroup: 'Surface & Finish',
    minorGroup,
    groupOrder: 40,
    minorOrder,
  });
}

function classifyAtmosphere(tag: PromptTag, text: string): PromptTag {
  if (tag.subcategory === 'Explicit' || isExplicitAtmosphere(text)) {
    const minorGroup = includesAny(text, ['seductive', 'boudoir', 'allure', 'glamour']) ? 'Seductive & Boudoir' : includesAny(text, ['aftercare', 'post-romance', 'recovery']) ? 'Aftercare & Recovery' : 'Private & Romantic';
    const minorOrder = minorGroup === 'Seductive & Boudoir' ? 10 : minorGroup === 'Aftercare & Recovery' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory: 'Explicit',
      majorGroup: 'Intimacy & Explicit Tone',
      minorGroup,
      groupOrder: 50,
      minorOrder,
    });
  }

  const subcategory = includesAny(text, ['color', 'palette', 'pink and blue', 'sepia', 'monochrome', 'gold accents'])
    ? 'Color Palette'
    : includesAny(text, ['fog', 'smoke', 'steam', 'sparkle', 'glow', 'particles'])
      ? 'Effects'
      : tag.subcategory ?? 'Mood';

  if (subcategory === 'Lighting') {
    const minorGroup = includesAny(text, ['warm', 'candle', 'golden', 'sunlit']) ? 'Warm & Intimate Light' : includesAny(text, ['moonlit', 'blue', 'cool']) ? 'Cool & Night Light' : 'Contrast & Drama';
    const minorOrder = minorGroup === 'Warm & Intimate Light' ? 10 : minorGroup === 'Cool & Night Light' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Lighting',
      minorGroup,
      groupOrder: 10,
      minorOrder,
    });
  }

  if (subcategory === 'Mood') {
    const minorGroup = includesAny(text, ['romantic', 'tender', 'affection', 'cozy']) ? 'Romantic & Tender' : includesAny(text, ['serene', 'calm', 'peaceful']) ? 'Calm & Serene' : includesAny(text, ['dramatic', 'gloomy', 'mysterious', 'ominous']) ? 'Dark & Intense' : 'Expressive Mood';
    const minorOrder = minorGroup === 'Romantic & Tender' ? 10 : minorGroup === 'Calm & Serene' ? 20 : minorGroup === 'Dark & Intense' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Mood & Emotion',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  if (subcategory === 'Color Palette') {
    const minorGroup = includesAny(text, ['gold', 'sunset', 'warm']) ? 'Warm Palette' : includesAny(text, ['blue', 'cool']) ? 'Cool Palette' : includesAny(text, ['monochrome', 'muted', 'sepia']) ? 'Muted & Monochrome' : 'Bold & Stylized';
    const minorOrder = minorGroup === 'Warm Palette' ? 10 : minorGroup === 'Cool Palette' ? 20 : minorGroup === 'Muted & Monochrome' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Color & Palette',
      minorGroup,
      groupOrder: 30,
      minorOrder,
    });
  }

  const minorGroup = includesAny(text, ['fog', 'smoke', 'steam']) ? 'Fog, Smoke & Steam' : includesAny(text, ['sparkle', 'particles', 'bubbles']) ? 'Particles & Sparkles' : 'Glow & Atmospherics';
  const minorOrder = minorGroup === 'Fog, Smoke & Steam' ? 10 : minorGroup === 'Particles & Sparkles' ? 20 : 30;
  return applyTaxonomy(tag, {
    subcategory: 'Effects',
    majorGroup: 'Scene Effects',
    minorGroup,
    groupOrder: 40,
    minorOrder,
  });
}

function classifyQuality(tag: PromptTag, text: string): PromptTag {
  if (tag.negativeText?.trim() || includesAny(text, ['bad', 'worst', 'lowres', 'blurry', 'deformed', 'extra'])) {
    const minorGroup = includesAny(text, ['deformed', 'extra', 'bad anatomy']) ? 'Anatomy & Structure' : includesAny(text, ['blurry', 'lowres']) ? 'Sharpness & Resolution' : 'Artifact Cleanup';
    const minorOrder = minorGroup === 'Anatomy & Structure' ? 10 : minorGroup === 'Sharpness & Resolution' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory: 'Negative Quality',
      majorGroup: 'Cleanup & Negative',
      minorGroup,
      groupOrder: 20,
      minorOrder,
    });
  }

  const minorGroup = includesAny(text, ['masterpiece', 'best quality']) ? 'Top-Level Quality' : includesAny(text, ['detailed', 'intricate', 'sharp']) ? 'Detail & Fidelity' : 'Refinement & Control';
  const minorOrder = minorGroup === 'Top-Level Quality' ? 10 : minorGroup === 'Detail & Fidelity' ? 20 : 30;
  return applyTaxonomy(tag, {
    subcategory: 'Positive Quality',
    majorGroup: 'Positive Quality',
    minorGroup,
    groupOrder: 10,
    minorOrder,
  });
}

function classifyByStep(tag: PromptTag, text: string): PromptTag {
  if (tag.step === 'subject') {
    return classifySubject(tag, text);
  }
  if (tag.step === 'appearance') {
    return classifyAppearance(tag, text);
  }
  if (tag.step === 'action') {
    return classifyAction(tag, text);
  }
  if (tag.step === 'setting') {
    return classifySetting(tag, text);
  }
  if (tag.step === 'style') {
    return classifyStyle(tag, text);
  }
  if (tag.step === 'atmosphere') {
    return classifyAtmosphere(tag, text);
  }
  return classifyQuality(tag, text);
}

function normalizeTag(tag: PromptTag): PromptTag {
  const text = normalizeText(tag.text);
  const exactTaxonomy = findExactTaxonomy(text);
  if (exactTaxonomy) {
    return applyTaxonomy(tag, exactTaxonomy);
  }
  const rerouted = rerouteSubjectGeneral(tag, text);
  return classifyByStep(rerouted, text);
}

export function normalizePromptTags(tags: PromptTag[]): PromptTag[] {
  return tags.map((tag) => normalizeTag(tag));
}
