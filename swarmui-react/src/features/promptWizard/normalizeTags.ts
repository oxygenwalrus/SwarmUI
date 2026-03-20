import type { BuilderStep, PromptTag } from './types';

interface TagTaxonomy {
  step?: BuilderStep;
  subcategory: string;
  majorGroup: string;
  minorGroup: string;
  groupOrder: number;
  minorOrder: number;
}

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function applyTaxonomy(tag: PromptTag, taxonomy: TagTaxonomy): PromptTag {
  return {
    ...tag,
    step: taxonomy.step ?? tag.step,
    subcategory: taxonomy.subcategory,
    majorGroup: taxonomy.majorGroup,
    minorGroup: taxonomy.minorGroup,
    groupOrder: taxonomy.groupOrder,
    minorOrder: taxonomy.minorOrder,
  };
}

function rerouteSubjectGeneral(tag: PromptTag, text: string): PromptTag {
  if (tag.step !== 'subject') {
    return tag;
  }

  if (includesAny(text, ['nsfw', 'r-18', 'adult content'])) {
    return { ...tag, step: 'subject', subcategory: 'Theme' };
  }
  if (includesAny(text, ['nude', 'naked', 'unclothed', 'flushed skin', 'oiled skin', 'glossy highlights', 'body sheen', 'curves', 'silhouette'])) {
    return { ...tag, step: 'appearance', subcategory: 'Body' };
  }
  if (includesAny(text, ['lingerie', 'apparel', 'fabric', 'clothing', 'robe', 'loungewear', 'attire', 'garter', 'shirt', 'fashion', 'intimates'])) {
    return { ...tag, step: 'appearance', subcategory: 'Clothing' };
  }
  if (includesAny(text, ['heels', 'stilettos', 'footwear'])) {
    return { ...tag, step: 'appearance', subcategory: 'Footwear' };
  }
  if (includesAny(text, ['body chain', 'jewelry', 'adornment'])) {
    return { ...tag, step: 'appearance', subcategory: 'Accessories' };
  }
  if (includesAny(text, ['expression', 'gaze', 'eye contact', 'smile', 'eyes', 'glance'])) {
    return { ...tag, step: 'action', subcategory: 'Expression' };
  }
  if (includesAny(text, ['pose', 'posture', 'stance', 'body language', 'kneeling', 'reclining', 'lounging', 'twist'])) {
    return { ...tag, step: 'action', subcategory: 'Pose' };
  }
  if (includesAny(text, ['dressing room', 'vanity', 'changing area', 'hotel suite', 'bedding', 'city lights', 'vip lounge', 'velvet seating', 'bubble bath', 'spa'])) {
    return { ...tag, step: 'setting', subcategory: includesAny(text, ['city lights', 'vip lounge']) ? 'Urban' : 'Indoor' };
  }
  if (includesAny(text, ['lighting', 'light', 'glow', 'steam'])) {
    return { ...tag, step: 'atmosphere', subcategory: 'Lighting' };
  }
  if (includesAny(text, ['romantic', 'sensual', 'chemistry', 'warmth', 'dominant vibe', 'commanding presence', 'energy', 'submissive vibe', 'comfort', 'affection', 'recovery'])) {
    return { ...tag, step: 'atmosphere', subcategory: 'Mood' };
  }
  return { ...tag, subcategory: 'Theme' };
}

function classifySubject(tag: PromptTag, text: string): PromptTag {
  if (includesAny(text, ['nsfw', 'r-18', 'adult content', 'boudoir', 'pin-up', 'romantic intimacy'])) {
    return applyTaxonomy(tag, {
      subcategory: 'Theme',
      majorGroup: 'Scenes & Themes',
      minorGroup: 'Content & Themes',
      groupOrder: 40,
      minorOrder: 10,
    });
  }

  if (includesAny(text, ['dragon', 'demon', 'angel', 'elf', 'mermaid', 'succubus', 'werewolf', 'wolfman', 'monster', 'beast', 'fox', 'bird', 'cat', 'dog', 'creature'])) {
    const minorGroup = includesAny(text, ['dragon', 'angel', 'demon', 'succubus', 'mermaid', 'elf'])
      ? 'Mythic & Supernatural'
      : includesAny(text, ['werewolf', 'wolfman', 'half human', 'monster', 'beast'])
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

  if (includesAny(text, ['weapon', 'sword', 'shield', 'rifle', 'axe', 'book', 'books', 'tools', 'badge', 'backpack', 'car', 'vehicle', 'machine', 'artifact'])) {
    const minorGroup = includesAny(text, ['weapon', 'sword', 'shield', 'rifle', 'axe'])
      ? 'Weapons & Armor'
      : includesAny(text, ['car', 'vehicle', 'machine'])
        ? 'Vehicles & Machines'
        : includesAny(text, ['book', 'books', 'tools'])
          ? 'Books & Tools'
          : 'Artifacts & Props';
    const minorOrder = minorGroup === 'Weapons & Armor' ? 10 : minorGroup === 'Vehicles & Machines' ? 20 : minorGroup === 'Books & Tools' ? 30 : 40;
    return applyTaxonomy(tag, {
      subcategory: 'Object',
      majorGroup: 'Objects & Props',
      minorGroup,
      groupOrder: 30,
      minorOrder,
    });
  }

  if (includesAny(text, ['arena', 'battlefield', 'cityscape', 'landscape', 'scene', 'nightlife', 'setting'])) {
    return applyTaxonomy(tag, {
      subcategory: 'Scene',
      majorGroup: 'Scenes & Themes',
      minorGroup: 'Scene Concepts',
      groupOrder: 40,
      minorOrder: 20,
    });
  }

  const minorGroup = includesAny(text, ['princess', 'queen', 'king', 'knight', 'holy knight', 'noble', 'warrior'])
    ? 'Heroes & Nobility'
    : includesAny(text, ['business', 'person', 'maid', 'nurse', 'alchemist', 'scholar', 'archer', 'assassin'])
      ? 'Professions & Roles'
      : includesAny(text, ['necromancer', 'barbarian', 'roman armor', 'mandalorian', 'orc'])
        ? 'Fantasy Archetypes'
        : 'General Characters';
  const minorOrder = minorGroup === 'Heroes & Nobility' ? 10 : minorGroup === 'Professions & Roles' ? 20 : minorGroup === 'Fantasy Archetypes' ? 30 : 40;
  return applyTaxonomy(tag, {
    subcategory: 'Character',
    majorGroup: 'People & Roles',
    minorGroup,
    groupOrder: 10,
    minorOrder,
  });
}

function classifyAppearance(tag: PromptTag, text: string): PromptTag {
  const subcategory = includesAny(text, ['shoe', 'heels', 'boots', 'sandals', 'footwear', 'stilettos'])
    ? 'Footwear'
    : includesAny(text, ['hair', 'bang', 'ponytail', 'braid', 'curl', 'bob cut', 'long hair', 'short hair'])
      ? 'Hair'
      : includesAny(text, ['eye', 'eyelash', 'iris', 'pupil'])
        ? 'Eyes'
        : includesAny(text, ['face', 'lip', 'makeup', 'smile', 'gaze', 'freckles', 'blush'])
          ? 'Face'
          : includesAny(text, ['dress', 'shirt', 'skirt', 'jacket', 'uniform', 'outfit', 'armor', 'swimsuit', 'bikini', 'corset', 'robe', 'coat', 'leotard'])
            ? 'Clothing'
            : includesAny(text, ['jewelry', 'necklace', 'earring', 'bracelet', 'body chain', 'crown', 'hat', 'glasses', 'mask'])
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
        : includesAny(text, ['breast', 'chest', 'bust'])
          ? 'Chest & Curves'
          : 'Skin & Surface';
    const minorOrder = minorGroup === 'Shape & Build' ? 10 : minorGroup === 'Chest & Curves' ? 20 : minorGroup === 'Legs & Lower Body' ? 30 : 40;
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
      : includesAny(text, ['bikini', 'lingerie', 'corset', 'garter', 'intimates', 'swimsuit'])
        ? 'Intimate & Revealing'
        : includesAny(text, ['armor', 'robe', 'habit', 'nun', 'fantasy'])
          ? 'Fantasy & Costume'
          : 'Everyday & Formal Wear';
    const minorOrder = minorGroup === 'Uniforms & Roleplay' ? 10 : minorGroup === 'Intimate & Revealing' ? 20 : minorGroup === 'Fantasy & Costume' ? 30 : 40;
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

  const minorGroup = includesAny(text, ['jewelry', 'necklace', 'earring', 'bracelet', 'body chain']) ? 'Jewelry & Chains' : includesAny(text, ['hat', 'crown', 'headband']) ? 'Headwear' : 'Wearable Details';
  const minorOrder = minorGroup === 'Jewelry & Chains' ? 10 : minorGroup === 'Headwear' ? 20 : 30;
  return applyTaxonomy(tag, {
    subcategory: 'Accessories',
    majorGroup: 'Accessories & Finish',
    minorGroup,
    groupOrder: 40,
    minorOrder,
  });
}

function classifyAction(tag: PromptTag, text: string): PromptTag {
  const subcategory = includesAny(text, ['portrait', 'headshot', 'close-up', 'full body', 'upper body', 'profile view', 'back view', 'pov', 'shot', 'view', 'angle', 'focus'])
    ? 'Framing'
    : includesAny(text, ['smile', 'cry', 'laugh', 'angry', 'blush', 'teasing', 'orgasm face', 'blank eyes', 'gaze', 'expression'])
      ? 'Expression'
      : includesAny(text, ['hand', 'touching', 'pointing', 'holding', 'crossed', 'gesture', 'grabbing', 'hands on'])
        ? 'Gesture'
        : includesAny(text, ['walking', 'running', 'jumping', 'motion', 'movement', 'sprinting', 'airborne', 'dynamic', 'flying'])
          ? 'Motion'
          : 'Pose';

  if (subcategory === 'Framing') {
    const minorGroup = includesAny(text, ['portrait', 'headshot', 'close-up', 'upper body', 'full body'])
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
            : 'Presenting & Intimate';
    const minorOrder = minorGroup === 'Standing & Power' ? 10 : minorGroup === 'Seated & Reclining' ? 20 : minorGroup === 'Grounded Poses' ? 30 : minorGroup === 'Combat Poses' ? 40 : 50;
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
    const minorGroup = includesAny(text, ['hand', 'hands', 'arms', 'crossed']) ? 'Hands & Arms' : includesAny(text, ['holding', 'touching', 'grabbing']) ? 'Touch & Contact' : 'Object Interaction';
    const minorOrder = minorGroup === 'Hands & Arms' ? 10 : minorGroup === 'Touch & Contact' ? 20 : 30;
    return applyTaxonomy(tag, {
      subcategory,
      majorGroup: 'Interaction & Expression',
      minorGroup,
      groupOrder: 40,
      minorOrder,
    });
  }

  const minorGroup = includesAny(text, ['smile', 'teasing', 'flirty']) ? 'Playful & Confident' : includesAny(text, ['blank eyes', 'angry', 'cry', 'orgasm']) ? 'Intense Reactions' : 'Soft & Romantic';
  const minorOrder = minorGroup === 'Playful & Confident' ? 10 : minorGroup === 'Soft & Romantic' ? 20 : 30;
  return applyTaxonomy(tag, {
    subcategory: 'Expression',
    majorGroup: 'Interaction & Expression',
    minorGroup,
    groupOrder: 40,
    minorOrder,
  });
}

function classifySetting(tag: PromptTag, text: string): PromptTag {
  const subcategory = includesAny(text, ['shot', 'angle', 'view', 'perspective', 'pov', 'focus', 'lens', 'close-up', 'framing', 'diorama'])
    ? 'Camera'
    : includesAny(text, ['city', 'metropolitan', 'shibuya', 'manhattan', 'paris', 'metro', 'underground', 'architecture'])
      ? 'Urban'
      : includesAny(text, ['trees', 'woodland', 'nature', 'foliage', 'sand', 'waves', 'tropical', 'coastal', 'peaks', 'alpine', 'dunes', 'oasis', 'underwater', 'coral', 'flowers', 'plants', 'wildflowers', 'grass', 'spring', 'winter landscape', 'ice peaks', 'blizzard'])
        ? 'Outdoor'
        : includesAny(text, ['medieval', 'torii', 'sacred', 'mythical', 'atlantis', 'haunted', 'graveyard', 'palace', 'cathedral', 'holy', 'colosseum'])
          ? 'Fantasy'
          : includesAny(text, ['science fiction', 'futuristic technology', 'high tech equipment', 'sterile', 'medical facility', 'white halls', 'viewport looking at earth', 'galaxy', 'stars', 'nebula', 'cosmic', 'astronomical'])
            ? 'Sci-Fi'
            : tag.subcategory ?? 'Indoor';

  if (subcategory === 'Camera') {
    const minorGroup = includesAny(text, ['angle', 'perspective', 'top down', 'ground level', 'low perspective', 'aerial']) ? 'Angles & Perspective' : includesAny(text, ['wide shot', 'extreme wide shot', 'close up', 'medium shot', 'cowboy shot']) ? 'Shot Scale' : 'POV & Focus';
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
    const minorGroup = includesAny(text, ['room', 'bedroom', 'tables', 'bookshelves', 'books', 'desks']) ? 'Domestic & Lifestyle' : includesAny(text, ['reading room', 'scholarly', 'chalkboard', 'educational']) ? 'Learning & Culture' : includesAny(text, ['hotel', 'lounge', 'cozy', 'warm lighting']) ? 'Leisure & Luxury' : 'Institutional & Interior';
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
    const minorGroup = includesAny(text, ['shibuya', 'manhattan', 'paris']) ? 'Landmarks & Travel' : includesAny(text, ['metro', 'underground']) ? 'Transit & Infrastructure' : 'City & Nightlife';
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
    ?? (includesAny(text, ['style', 'studio', 'madhouse', 'tite kubo', 'kishimoto', 'akira toriyama', 'warhol', 'monet']) ? 'Reference'
      : includesAny(text, ['vector art', 'flat design', 'line art', 'clean linework', 'graphic', 'halftone', 'screentones', 'pop art']) ? 'Graphic'
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
  const rerouted = rerouteSubjectGeneral(tag, text);
  return classifyByStep(rerouted, text);
}

export function normalizePromptTags(tags: PromptTag[]): PromptTag[] {
  return tags.map((tag) => normalizeTag(tag));
}
