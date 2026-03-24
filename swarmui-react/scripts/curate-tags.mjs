#!/usr/bin/env node
/**
 * curate-tags.mjs — Phase 1 of Prompt Wizard redesign
 *
 * 1. Deduplicates near-identical tags (canonical keeps aliases)
 * 2. Assigns majorGroup / minorGroup to every tag
 * 3. Overwrites promptTags.json with curated data
 *
 * Run:  node scripts/curate-tags.mjs
 * Reset first:  git checkout -- src/data/promptTags.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT  = resolve(__dirname, '../src/data/promptTags.json');
const OUTPUT = resolve(__dirname, '../src/data/promptTags.json');
const REPORT = resolve(__dirname, '../scripts/curation-report.txt');

const tags = JSON.parse(readFileSync(INPUT, 'utf-8'));

// ═══════════════════════════════════════════════════════════════════
// DEDUP RULES  — { canonical: "kept", merged: ["removed", ...] }
// ═══════════════════════════════════════════════════════════════════
const DEDUP_RULES = [
  // ── appearance | Body ──
  { canonical: 'large breasts', merged: ['big tits'] },
  { canonical: 'huge breasts', merged: ['massive tits'] },
  { canonical: 'ass', merged: ['butt', 'booty'] },
  { canonical: 'penis', merged: ['dick', 'cock'] },
  { canonical: 'pussy', merged: ['vagina'] },
  { canonical: 'female', merged: ['woman', 'girl', 'lady'] },
  { canonical: 'male', merged: ['man', 'boy', 'gentleman'] },
  { canonical: 'blushing', merged: ['blush', 'blushing deeply', 'red cheeks', 'heavy blush'] },
  { canonical: 'curvy', merged: ['curvy hips', 'hourglass figure'] },
  { canonical: 'muscular abs', merged: ['abs', 'toned abs'] },
  { canonical: 'toned', merged: ['defined muscles'] },
  { canonical: 'chubby', merged: ['soft belly'] },
  { canonical: 'slender', merged: ['slim', 'thin'] },
  { canonical: 'cat ears', merged: ['nekomimi'] },
  { canonical: 'rabbit ears', merged: ['usagimimi'] },
  { canonical: 'fox ears', merged: ['vulpine'] },
  { canonical: 'wolf ears', merged: ['lupine'] },
  { canonical: 'dog ears', merged: ['canine'] },
  { canonical: 'furry', merged: ['floofy', 'fluffy', 'fluff'] },
  { canonical: 'sweaty body', merged: ['sweat drops'] },
  { canonical: 'wet skin', merged: ['wet'] },
  { canonical: 'glowing particles', merged: ['floating particles', 'sparkling debris'] },
  { canonical: 'floating petals', merged: ['cherry blossom petals', 'rose petals falling', 'pink petals falling'] },
  { canonical: 'embarrassed', merged: ['shy'] },
  { canonical: 'adolescent', merged: ['teen', 'teenager'] },
  { canonical: 'elderly', merged: ['old', 'senior'] },
  { canonical: 'mature', merged: ['grown up', 'adult'] },
  { canonical: 'young', merged: ['youth', 'youthful appearance'] },
  { canonical: 'androgynous', merged: ['gender neutral', 'non-binary'] },
  { canonical: 'femboy', merged: ['feminine male', 'trap', 'cute boy'] },
  { canonical: 'tomboy', merged: ['masculine girl'] },
  { canonical: 'dark skin', merged: ['ebony skin', 'brown skin'] },
  { canonical: 'fair skin', merged: ['porcelain skin', 'white skin'] },
  { canonical: 'tanned skin', merged: ['sun kissed skin'] },
  { canonical: 'olive skin', merged: ['bronze skin'] },
  { canonical: 'glowing circuitry', merged: ['circuit patterns on skin', 'data lines', 'glowing symbols'] },
  { canonical: 'cybernetic furry', merged: ['robot furry', 'protogen'] },
  { canonical: 'dragon scales', merged: ['shiny scales', 'reptile skin'] },
  { canonical: 'smiling', merged: ['warm smile', 'confident grin', 'happy expression'] },
  { canonical: 'sad expression', merged: ['crying', 'upset', 'sorrowful'] },
  { canonical: 'angry expression', merged: ['scowling', 'furrowed brows'] },
  { canonical: 'surprised expression', merged: ['shocked', 'wide eyes'] },
  { canonical: 'sleeping', merged: ['sleepy', 'yawning'] },
  { canonical: 'glossy skin', merged: ['shiny skin', 'oiled body'] },
  { canonical: 'freckles', merged: ['dusted skin'] },
  { canonical: 'tattoos', merged: ['body tattoos', 'body art'] },
  { canonical: 'makeup', merged: ['lipstick', 'eyeshadow'] },

  // ── appearance | Hair ──
  { canonical: 'blonde hair', merged: ['golden hair'] },
  { canonical: 'red hair', merged: ['redhead', 'ginger hair'] },
  { canonical: 'brown hair', merged: ['brunette'] },
  { canonical: 'black hair', merged: ['raven hair'] },
  { canonical: 'purple hair', merged: ['violet hair'] },
  { canonical: 'green hair', merged: ['emerald hair'] },
  { canonical: 'blue hair', merged: ['azure hair'] },
  { canonical: 'pink hair', merged: ['rose hair'] },
  { canonical: 'braided hair', merged: ['plaited hair'] },

  // ── appearance | Clothing ──
  { canonical: 'blindfold', merged: ['blindfolded', 'covered eyes'] },
  { canonical: 'fishnet stockings', merged: ['fishnet tights', 'fishnet bodysuit', 'full body fishnet'] },
  { canonical: 'lingerie', merged: ['lace underwear', 'intimate apparel'] },
  { canonical: 'latex catsuit', merged: ['sheer catsuit', 'shiny latex'] },
  { canonical: 'see-through clothing', merged: ['transparent clothes', 'translucent dress'] },
  { canonical: 'stockings', merged: ['nylons', 'thighhighs'] },

  // ── action | Pose ──
  { canonical: 'lying down', merged: ['lying on back', 'flat on stomach'] },
  { canonical: 'sitting', merged: ['seated'] },
  { canonical: 'standing', merged: ['grounded posture'] },
  { canonical: 'kneeling', merged: ['kneeling pose', 'on knees'] },
  { canonical: 'cowgirl position', merged: ['woman on top pinning man', 'dominant riding'] },
  { canonical: 'missionary position', merged: ['missionary variants'] },
  { canonical: 'doggystyle', merged: ['doggy position', 'rear entry'] },
  { canonical: 'reverse cowgirl', merged: ['facing away'] },
  { canonical: 'spread eagle', merged: ['fully spread legs', 'legs spread wide in M shape'] },
  { canonical: 'extreme close-up', merged: ['extreme close up', 'extreme face detail'] },
  { canonical: 'full body', merged: ['full figure'] },
  { canonical: 'dynamic pose', merged: ['dynamic motion', 'action pose'] },
  { canonical: 'relaxed pose', merged: ['relaxed', 'resting', 'casual pose'] },
  { canonical: 'from behind', merged: ['back view', 'rear view'] },
  { canonical: 'from below', merged: ['low angle'] },
  { canonical: 'looking back', merged: ['turning head'] },
  { canonical: 'pov penetration', merged: ['first person sex', 'pov from inside'] },
  { canonical: 'arms raised', merged: ['reaching up', 'stretching arms'] },
  { canonical: 'presenting', merged: ['presenting lower body', 'presenting rear'] },
  { canonical: 'legs up', merged: ['legs raised in V shape'] },
  { canonical: 'suspended', merged: ['held in air', 'lifted waist'] },
  { canonical: 'running', merged: ['sprinting'] },
  { canonical: 'walking', merged: ['strolling'] },

  // ── action | Gesture ──
  { canonical: 'cum', merged: ['semen', 'cum covered', 'covered in semen'] },
  { canonical: 'cumshot', merged: ['ejaculation', 'multiple cumshots'] },
  { canonical: 'creampie', merged: ['cum inside', 'cumming inside', 'internal cumshot', 'nakadashi', 'cum inside womb'] },
  { canonical: 'oral sex', merged: ['blowjob', 'fellatio'] },
  { canonical: 'anal sex', merged: ['anal penetration', 'sodomy'] },
  { canonical: 'sex', merged: ['fucking', 'intercourse'] },
  { canonical: 'double penetration', merged: ['DP'] },
  { canonical: 'deepthroat', merged: ['forced oral', 'extremely deep'] },
  { canonical: 'handjob', merged: ['gripping shaft', 'stroking'] },
  { canonical: 'titfuck', merged: ['paizuri', 'breast sex', 'cock between boobs'] },
  { canonical: 'cunnilingus', merged: ['eating ass', 'licking'] },
  { canonical: 'masturbation', merged: ['playing with self', 'playing with pussy', 'fingering'] },
  { canonical: 'vibrator', merged: ['sex toy machine', 'sybian', 'using a dildo'] },
  { canonical: 'rubbing', merged: ['rubbing against', 'grinding', 'dry humping', 'rubbing crotches together'] },
  { canonical: 'tentacle sex', merged: ['tentacles', 'bound by tentacles'] },
  { canonical: 'gangbang', merged: ['surrounded by men', 'multiple males', 'multiple partners'] },
  { canonical: 'bukkake', merged: ['completely covered in cum', 'cum on face', 'facial', 'swimming in cum', 'gokkun'] },
  { canonical: 'lactation', merged: ['breast milk spraying', 'excessive lactation', 'squirting milk', 'breast feeding'] },
  { canonical: 'orgasm face', merged: ['extreme pleasure', 'overwhelming', 'climax'] },
  { canonical: 'squirting', merged: ['female ejaculation'] },
  { canonical: 'spanking', merged: ['slapping', 'red marks on skin'] },
  { canonical: 'pegging', merged: ['wearing strap-on'] },

  // ── setting ──
  { canonical: 'wide shot', merged: ['extreme wide shot', 'establishing shot'] },
  { canonical: 'close-up shot', merged: ['extreme close up'] },
  { canonical: 'pov', merged: ['point of view', 'first person view'] },
  { canonical: 'hero low angle', merged: ['low perspective'] },
  { canonical: 'over the shoulder shot', merged: ['ots'] },
  { canonical: 'dutch angle', merged: ['canted angle', 'tilted camera'] },
  { canonical: 'isometric view', merged: ['isometric perspective'] },
  { canonical: 'fog', merged: ['foggy'] },
  { canonical: 'mysterious', merged: ['mythical'] },
  { canonical: 'nature', merged: ['foliage', 'plants'] },
  { canonical: 'trees', merged: ['woodland'] },
  { canonical: 'urban', merged: ['urban city', 'urban america'] },
  { canonical: 'cityscape', merged: ['urban skyline'] },

  // ── style ──
  { canonical: 'cel shading', merged: ['cel shaded'] },
  { canonical: 'digital art', merged: ['digital painting'] },
  { canonical: 'concept art', merged: ['trending on artstation', 'artstation'] },
  { canonical: 'hyperrealistic', merged: ['photorealistic'] },
  { canonical: 'vibrant colors', merged: ['vibrant', 'bold colors'] },
  { canonical: 'neon', merged: ['neon grid'] },

  // ── atmosphere ──
  { canonical: 'natural lighting', merged: ['natural interior lighting', 'daylight', 'diffused daylight'] },
  { canonical: 'soft lighting', merged: ['soft even light', 'diffused light', 'gentle highlights'] },
  { canonical: 'dramatic lighting', merged: ['dramatic shadows', 'strong contrast'] },
  { canonical: 'neon lighting', merged: ['neon rim light', 'cyberpunk lighting'] },
  { canonical: 'rim lighting', merged: ['glowing edges', 'luminous outline', 'colored edge lighting'] },
  { canonical: 'moonlight', merged: ['pale blue light'] },
  { canonical: 'warm glow', merged: ['warm orange glow', 'warm sunlight', 'warm'] },
  { canonical: 'god rays', merged: ['light beams', 'light rays'] },
  { canonical: 'aurora borealis', merged: ['northern lights'] },
  { canonical: 'dreamy', merged: ['dreamlike'] },
  { canonical: 'ethereal', merged: ['otherworldly'] },
  { canonical: 'energetic', merged: ['dynamic', 'lively'] },
  { canonical: 'calm', merged: ['tranquil', 'zen', 'stillness'] },
  { canonical: 'sad', merged: ['melancholic', 'sorrowful', 'gloomy'] },
  { canonical: 'scary', merged: ['creepy', 'horror', 'unsettling'] },
  { canonical: 'romantic', merged: ['intimate', 'warm feeling'] },
  { canonical: 'epic', merged: ['grand', 'majestic', 'awe-inspiring'] },
  { canonical: 'mysterious', merged: ['enigmatic', 'shadowy'] },
  { canonical: 'lonely', merged: ['isolated', 'solitude', 'empty'] },
  { canonical: 'cheerful', merged: ['joyful', 'happy'] },

  // ── subject | General (boudoir/nsfw) ──
  { canonical: 'nude', merged: ['naked', 'unclothed'] },
  { canonical: 'nsfw', merged: ['adult content', 'r-18'] },
  { canonical: 'seductive charm', merged: ['seductive', 'alluring posture'] },
  { canonical: 'bedroom eyes', merged: ['heavy-lidded expression', 'sultry gaze'] },
  { canonical: 'intimate glow', merged: ['intimate glamour photography', 'intimate post-romance atmosphere'] },
  { canonical: 'boudoir', merged: ['polished boudoir styling', 'private bedroom mood'] },
  { canonical: 'lace lingerie', merged: ['fitted intimates', 'lingerie straps', 'intimate apparel'] },
  { canonical: 'oiled skin', merged: ['radiant body sheen', 'glossy highlights', 'glistening skin'] },
  { canonical: 'reclining pose', merged: ['lounging on bed or sofa', 'relaxed sensual posture'] },
  { canonical: 'sheer fabric', merged: ['translucent clothing', 'delicate lace fabric'] },
  { canonical: 'silk robe', merged: ['luxurious loungewear', 'elegant bedroom attire'] },
  { canonical: 'flirty smile', merged: ['flirtatious glamour pose', 'playful allure', 'playful confidence', 'teasing expression', 'teasing glance back'] },
  { canonical: 'dominant vibe', merged: ['commanding presence', 'assertive body language', 'assertive glamour stance'] },
  { canonical: 'submissive vibe', merged: ['gentle vulnerability', 'shy sensuality'] },
  { canonical: 'sensual styling', merged: ['soft sensual styling', 'relaxed sensual styling', 'polished sensual look', 'retro sensual fashion', 'luxurious sensual styling', 'composed sensual body language', 'sensual warmth'] },
  { canonical: 'intimate eye contact', merged: ['confident sensual energy'] },
  { canonical: 'romantic atmosphere', merged: ['romantic intimacy'] },

  // ── subject | Character ──
  { canonical: 'glowing eyes', merged: ['glowing eye'] },
  { canonical: 'sci-fi soldier', merged: ['modern soldier', 'space marine'] },
  { canonical: 'robot', merged: ['android', 'artificial intelligence'] },
  { canonical: 'mage', merged: ['sorcerer', 'spellcaster', 'wizard'] },
  { canonical: 'rogue', merged: ['thief', 'burglar outfit', 'sneaky'] },
  { canonical: 'knight', merged: ['holy knight', 'noble warrior'] },
  { canonical: 'undead', merged: ['zombie', 'decaying skin'] },

  // ── subject | Object ──
  { canonical: 'sword', merged: ['longsword', 'steel blade', 'sharp blade'] },
  { canonical: 'greatsword', merged: ['massive blade', 'two-handed'] },
  { canonical: 'dagger', merged: ['short blade', 'knife'] },
  { canonical: 'gun', merged: ['firearm', 'handgun', 'pistol', 'modern weapon'] },
  { canonical: 'shield', merged: ['metal shield', 'wooden shield', 'heavy shield'] },
  { canonical: 'full plate armor', merged: ['heavy protection'] },
  { canonical: 'glasses', merged: ['spectacles', 'eyewear', 'shades'] },
  { canonical: 'headphones', merged: ['over-ear headset', 'modern audio gear'] },
  { canonical: 'smartphone', merged: ['mobile phone', 'holding phone'] },
  { canonical: 'camera', merged: ['vintage camera', 'photographer'] },
  { canonical: 'guitar', merged: ['acoustic guitar', 'electric guitar'] },
  { canonical: 'spellbook', merged: ['ancient tome', 'ancient grimoire', 'glowing pages'] },
  { canonical: 'crystal', merged: ['gemstone', 'mineral', 'glowing shard', 'glowing crystal tip'] },
  { canonical: 'chains', merged: ['metal chains', 'linked', 'metal rings'] },
  { canonical: 'cloak', merged: ['cape', 'flowing fabric'] },
  { canonical: 'crown', merged: ['gold crown', 'royal'] },
  { canonical: 'sunglasses', merged: ['visor'] },

  // ── quality ──
  { canonical: 'highly detailed', merged: ['extremely detailed', 'intricate details', 'crisp details', 'high detail'] },
  { canonical: '8k uhd', merged: ['4k resolution', 'ultra high resolution', 'high definition'] },
  { canonical: 'masterpiece', merged: ['best quality', 'award winning', 'highly rated', 'popular artwork'] },
  { canonical: 'well drawn hands', merged: ['correct fingers', 'anatomically correct hands'] },
  { canonical: 'well drawn feet', merged: ['correct toes', 'anatomically correct feet'] },
  { canonical: 'sharp focus', merged: ['crisp outlines', 'tidy edges'] },
];

// ═══════════════════════════════════════════════════════════════════
// TAXONOMY  — step|subcategory → [{ majorGroup, minorGroup, match }]
// ═══════════════════════════════════════════════════════════════════
const TAXONOMY = {

  // ╔══════════════════════════════════════╗
  // ║  APPEARANCE                          ║
  // ╚══════════════════════════════════════╝

  'appearance|Body': [
    { majorGroup: 'Chest & Bust', minorGroup: 'Size', match: ['large breasts', 'medium breasts', 'small breasts', 'flat chest', 'huge breasts', 'massive tits', 'big tits', 'gigantic', 'bouncing breasts', 'breast physics', 'heavy breasts supported', 'profile breasts'] },
    { majorGroup: 'Chest & Bust', minorGroup: 'Detail', match: ['nipples', 'areola', 'detailed nipples', 'puffy nipples', 'protruding nipples', 'large areola', 'nipple piercings', 'partially covered breasts', 'cleavage', 'underboob', 'cameltoe'] },

    // Buttocks merged into Hips & Thighs
    { majorGroup: 'Lower Body', minorGroup: 'Hips & Thighs', match: ['ass', 'butt', 'booty', 'thicc', 'thick thighs', 'soft thighs', 'prominent thighs', 'wide hips', 'thick figure', 'spread legs'] },
    { majorGroup: 'Lower Body', minorGroup: 'Genitalia (F)', match: ['pussy', 'vagina', 'bald pussy', 'completely shaved', 'landing strip', 'visible labia through clothes', 'pubic hair', 'untrimmed', 'genital piercing'] },
    { majorGroup: 'Lower Body', minorGroup: 'Genitalia (M)', match: ['penis', 'dick', 'cock', 'erection'] },

    { majorGroup: 'Build & Proportion', minorGroup: 'Frame', match: ['petite', 'slender', 'slim', 'thin', 'small body', 'small stature', 'chubby', 'voluptuous', 'curvy', 'hourglass figure', 'curvy hips', 'strong', 'muscular abs', 'toned', 'defined muscles', 'abs', 'toned abs', 'biceps', 'form fitting', 'tight fitting', 'amazon', 'muscular female'] },
    { majorGroup: 'Build & Proportion', minorGroup: 'Condition', match: ['pregnant', 'swollen belly', 'large belly', 'soft belly', 'midriff showing', 'bare midriff', 'stomach', 'belly piercing', 'defined stomach', 'navel', 'clavicle', 'defined collarbone', 'oiled body'] },

    { majorGroup: 'Skin & Complexion', minorGroup: 'Tone', match: ['dark skin', 'fair skin', 'olive skin', 'tanned skin', 'bronze skin', 'brown skin', 'ebony skin', 'porcelain skin', 'white skin', 'green skin', 'black skin', 'red skin'] },
    { majorGroup: 'Skin & Complexion', minorGroup: 'Texture', match: ['smooth skin', 'soft skin', 'glistening skin', 'glossy skin', 'sweaty body', 'wet skin', 'freckles', 'wrinkled skin', 'scars', 'facial scar', 'battle worn', 'translucent skin', 'reflective body'] },
    { majorGroup: 'Skin & Complexion', minorGroup: 'Markings', match: ['tattoos', 'body tattoos', 'body art', 'lower back tattoo', 'tramp stamp', 'tribal paint', 'war paint', 'bikini tanlines', 'swimsuit tanlines', 'visible tan body', 'makeup', 'lipstick', 'eyeshadow'] },

    // Ethnicity split by region
    { majorGroup: 'Identity', minorGroup: 'East Asian', match: ['asian', 'east asian', 'chinese', 'japanese', 'korean'] },
    { majorGroup: 'Identity', minorGroup: 'South & West Asian', match: ['south asian', 'indian', 'desi', 'arab', 'middle eastern'] },
    { majorGroup: 'Identity', minorGroup: 'Western', match: ['caucasian', 'european', 'hispanic', 'latino'] },
    { majorGroup: 'Identity', minorGroup: 'African & Indigenous', match: ['african', 'african american', 'native american', 'indigenous'] },
    { majorGroup: 'Identity', minorGroup: 'Gender', match: ['female', 'male', 'androgynous', 'gender neutral', 'non-binary', 'femboy', 'feminine male', 'trap', 'cute boy', 'tomboy', 'masculine girl', 'woman', 'girl', 'lady', 'man', 'boy', 'gentleman'] },
    { majorGroup: 'Identity', minorGroup: 'Age', match: ['young', 'youth', 'youthful appearance', 'adolescent', 'teen', 'teenager', 'adult', 'mature', 'grown up', 'milf', 'mature female', 'older woman', 'elderly', 'old', 'senior'] },

    { majorGroup: 'Expression', minorGroup: 'Positive', match: ['smiling', 'warm smile', 'confident grin', 'happy expression', 'laughing', 'open mouth laugh', 'joyful expression', 'cheerful', 'adorable', 'sweet', 'attractive', 'lovely face', 'graceful features', 'handsome face', 'cute face', 'winking'] },
    { majorGroup: 'Expression', minorGroup: 'Negative', match: ['angry expression', 'scowling', 'furrowed brows', 'sad expression', 'crying', 'upset', 'pouting', 'sulking', 'determined look', 'serious expression', 'scared', 'surprised expression', 'shocked', 'embarrassed', 'shy'] },
    { majorGroup: 'Expression', minorGroup: 'Subtle & Involuntary', match: ['blushing', 'blush', 'blushing deeply', 'red cheeks', 'heavy blush', 'flushed face', 'ahegao face', 'rolled back eyes', 'tongue out', 'drooling', 'open mouth', 'one eye closed', 'one sided smile', 'smirking', 'cunning', 'puffed cheeks', 'closed eyes', 'sleeping', 'sleepy', 'yawning', 'tired expression', 'emotional', 'teary eyes'] },

    { majorGroup: 'Non-Human', minorGroup: 'Kemonomimi', match: ['animal ears', 'animal tail', 'cat ears', 'cat tail', 'fox ears', 'fox tail', 'dog ears', 'dog tail', 'wolf ears', 'wolf tail', 'rabbit ears', 'bunny ears', 'ears', 'nekomimi', 'usagimimi', 'kemonomimi'] },
    // Furry split: Species / Fur / Anatomy
    { majorGroup: 'Non-Human', minorGroup: 'Species Type', match: ['furry', 'anthro', 'anthropomorphic', 'human-like animal', 'feline', 'canine', 'vulpine', 'lupine', 'avian', 'floofy', 'fluffy', 'fluff'] },
    { majorGroup: 'Non-Human', minorGroup: 'Fur & Coat', match: ['black fur', 'brown fur', 'dark fur', 'grey fur', 'silver fur', 'tan fur', 'white fur', 'snowy fur', 'thick fur', 'soft fur', 'patterned fur'] },
    { majorGroup: 'Non-Human', minorGroup: 'Anthro Anatomy', match: ['whiskers', 'snout', 'beak', 'plumage', 'downy feathers', 'feathers', 'fins', 'bird legs', 'talons', 'webbed fingers', 'slit pupils'] },
    { majorGroup: 'Non-Human', minorGroup: 'Monster & Fantasy', match: ['draconic', 'dragon scales', 'dragonkin', 'goblin', 'orc', 'tusks', 'sharp teeth', 'monster boy', 'monster girl', 'reptile skin', 'shiny scales', 'lizard tail', 'aquatic species', 'goo', 'slime body'] },
    // Cybernetic split: Surface / Parts / Interface
    { majorGroup: 'Non-Human', minorGroup: 'Cyber Surface', match: ['cybernetic furry', 'robot furry', 'protogen', 'chrome', 'chrome skin', 'metal skin', 'synthetic skin seams'] },
    { majorGroup: 'Non-Human', minorGroup: 'Cyber Parts', match: ['cyberware', 'synthetic enhancements', 'visible implants', 'modified', 'artificial body', 'joints', 'panel lines', 'robotic parts', 'data cables', 'wires connecting to head', 'techno-organic features'] },
    { majorGroup: 'Non-Human', minorGroup: 'Cyber Interface', match: ['tech visor', 'visor face', 'glowing circuitry', 'circuit patterns on skin', 'data lines', 'glowing symbols', 'hud'] },

    // Elemental split: Fire / Electric / Weather
    { majorGroup: 'Body Effects', minorGroup: 'Fire & Heat', match: ['ablaze', 'burning', 'fire sparks', 'flames'] },
    { majorGroup: 'Body Effects', minorGroup: 'Electric & Storm', match: ['electric', 'electric sparks', 'lightning', 'thunderbolt', 'storm'] },
    { majorGroup: 'Body Effects', minorGroup: 'Weather & Mist', match: ['raining', 'raindrops', 'snow falling', 'snowflakes', 'winter', 'mist', 'vapor', 'hazy'] },
    { majorGroup: 'Body Effects', minorGroup: 'Magical', match: ['magic aura', 'magical glyphs', 'arcane script', 'glowing energy', 'glowing embers', 'glowing particles', 'floating particles', 'floating petals', 'floating runes', 'floating bubbles', 'cherry blossom petals', 'rose petals falling', 'bioluminescent markings', 'mystical power', 'spell effect', 'sparkling debris', 'sparks'] },
    { majorGroup: 'Body Effects', minorGroup: 'Tech & Light', match: ['holographic display', 'holographic projection', 'digital interference', 'glitch effect', 'lens flare', 'light streak', 'sun flare', 'sun spots', 'reflective fragments', 'glass shards', 'soap bubbles', 'underwater bubbles', 'ink'] },

    // Style catch-all split into meaningful groups
    { majorGroup: 'Descriptors', minorGroup: 'Hair & Head', match: ['short hair', 'bald', 'shaved head', 'pixie cut', 'bedhead', 'chiseled jawline'] },
    { majorGroup: 'Descriptors', minorGroup: 'Body Type', match: ['amazon', 'muscular female', 'heroic', 'savage', 'wild', 'rugged'] },
    { majorGroup: 'Descriptors', minorGroup: 'Clothing & Dress', match: ['casual', 'formal attire', 'streetwear', 'hood up', 'obi', 'traditional japanese clothing'] },
    { majorGroup: 'Descriptors', minorGroup: 'Surface & Pattern', match: ['spots', 'stripes', 'markings', 'hairless', 'hairy', 'sleek', 'flowing', 'wispy'] },
    { majorGroup: 'Descriptors', minorGroup: 'Fantasy Types', match: ['fantasy ancestry', 'fantasy creature', 'liquid body'] },
  ],

  'appearance|Hair': [
    { majorGroup: 'Color', minorGroup: 'Natural', match: ['black hair', 'raven hair', 'brown hair', 'brunette', 'blonde hair', 'golden hair', 'red hair', 'redhead', 'ginger hair', 'grey hair', 'white hair', 'silver hair'] },
    { majorGroup: 'Color', minorGroup: 'Vivid', match: ['blue hair', 'azure hair', 'pink hair', 'rose hair', 'purple hair', 'violet hair', 'green hair', 'emerald hair', 'rainbow hair', 'multicolored hair', 'streaked hair'] },
    { majorGroup: 'Style', minorGroup: 'Length', match: ['long hair', 'medium hair', 'shoulder length hair'] },
    { majorGroup: 'Style', minorGroup: 'Arrangement', match: ['ponytail', 'twintails', 'pigtails', 'braided hair', 'plaited hair', 'bob cut', 'double bun', 'complex hairstyle', 'hair tied back', 'messy hair', 'flowing hair', 'windblown hair', 'bunny ears'] },
  ],

  'appearance|Eyes': [
    { majorGroup: 'Color', minorGroup: 'Natural', match: ['blue eyes', 'green eyes', 'brown eyes', 'amber eyes', 'golden eyes', 'yellow eyes'] },
    { majorGroup: 'Color', minorGroup: 'Vivid', match: ['crimson eyes', 'ruby eyes', 'emerald eyes', 'sapphire eyes', 'ocean eyes'] },
    { majorGroup: 'Special', minorGroup: 'Special', match: ['heterochromia', 'different colored eyes', 'odd eyes', 'cybernetic eyes', 'bioluminescent eyes', 'closed eyes', 'wide eyes', 'smiling eyes'] },
  ],

  'appearance|Accessories': [
    { majorGroup: 'Accessories', minorGroup: 'Body', match: ['piercings', 'ear piercings', 'nose ring', 'tattoos', 'glowing tattoos', 'neon tattoos', 'tears'] },
    { majorGroup: 'Accessories', minorGroup: 'Non-Human', match: ['demon horns', 'dragon horns', 'rabbit ears', 'fluffy tail', 'shattered crystal', 'exposed wiring'] },
  ],

  'appearance|Clothing': [
    { majorGroup: 'Lingerie & Intimate', minorGroup: 'Underwear', match: ['lingerie', 'lace underwear', 'g-string', 'thong', 't-back', 'crotchless panties', 'garter belt', 'suspenders', 'body stocking'] },
    { majorGroup: 'Lingerie & Intimate', minorGroup: 'Swimwear', match: ['bikini', 'micro bikini', 'slingshot bikini', 'one-piece swimsuit', 'swimwear', 'japanese school swimsuit', 'sukumizu', 'string top'] },
    { majorGroup: 'Lingerie & Intimate', minorGroup: 'Provocative', match: ['see-through clothing', 'transparent clothes', 'translucent dress', 'wet clothes', 'wet shirt', 'naked apron', 'wearing only an apron', 'extremely revealing', 'sideboob', 'exposing cleavage', 'exposed cheeks', 'exposed pussy', 'open crotch', 'flashing panties', 'lifting skirt', 'holding skirt up', 'bare back'] },
    { majorGroup: 'Fetish & BDSM', minorGroup: 'Restraints', match: ['BDSM gear', 'ball gag', 'bit gag', 'ring gag', 'mouth stuffed', 'blindfold', 'blindfolded', 'covered eyes', 'leather collar', 'choker', 'attached leash', 'leash', 'being led', 'tape'] },
    { majorGroup: 'Fetish & BDSM', minorGroup: 'Bondage', match: ['body harness', 'leather harness', 'rope', 'decorative ropes', 'intricate rope binding', 'kinbaku', 'shibari', 'tight lacing', 'waist training', 'cinched waist'] },
    { majorGroup: 'Fetish & BDSM', minorGroup: 'Material', match: ['latex catsuit', 'sheer catsuit', 'shiny latex', 'rubber', 'leather outfit', 'fishnet stockings', 'fishnet tights', 'fishnet bodysuit', 'full body fishnet', 'stockings', 'nylons', 'thighhighs', 'holding up stockings'] },
    { majorGroup: 'Fetish & BDSM', minorGroup: 'Roleplay', match: ['pet play', 'submissive pet', 'seductive', 'sexy', 'playboy bunny', 'bunny girl', 'succubus', 'slutty nun'] },
    { majorGroup: 'Costume & Uniform', minorGroup: 'Japanese', match: ['seifuku', 'sailor uniform', 'kimono', 'maid uniform', 'french maid'] },
    { majorGroup: 'Costume & Uniform', minorGroup: 'Service', match: ['nurse uniform', 'sexy nurse', 'hospital uniform', 'cheerleader outfit', 'gym uniform', 'school uniform', 'military uniform', 'police uniform'] },
    { majorGroup: 'Costume & Uniform', minorGroup: 'Fantasy', match: ['nun outfit', 'habit', 'religious clothing', 'catgirl', 'demon tail', 'bat wings', 'flowing cape'] },
    { majorGroup: 'Everyday & Fashion', minorGroup: 'Tops', match: ['crop top', 'half-open jacket', 'unbuttoning shirt', 'partly unbuttoned top', 'open shirt', 'hoodie', 'jacket', 'denim jacket', 'leather jacket', 'long coat'] },
    { majorGroup: 'Everyday & Fashion', minorGroup: 'Bottoms', match: ['mini skirt', 'pleated skirt', 'buruma', 'bloomers'] },
    { majorGroup: 'Everyday & Fashion', minorGroup: 'Full Outfits', match: ['dress', 'elegant gown', 'bodysuit', 'leotard', 'business suit', 'tie', 'corset', 'frills', 'clinging to body'] },
    { majorGroup: 'Everyday & Fashion', minorGroup: 'Accessories', match: ['heart pasties', 'nipple pasties', 'star pasties', 'pom-poms', 'strappy lingerie'] },
  ],

  // ╔══════════════════════════════════════╗
  // ║  ACTION                              ║
  // ╚══════════════════════════════════════╝

  'action|Pose': [
    { majorGroup: 'Camera & Framing', minorGroup: 'Distance', match: ['close-up shot', 'extreme close-up', 'extreme close up', 'extreme face detail', 'face detail', 'face focus', 'headshot', 'portrait', 'upper body', 'full body', 'full figure', 'three-quarter view', '3/4 angle'] },
    { majorGroup: 'Camera & Framing', minorGroup: 'Angle', match: ['from behind', 'from below', 'from the side', 'back view', 'rear view', 'side view', 'profile view', 'low angle', 'POV looking down', 'over shoulder pose'] },

    { majorGroup: 'Standing & Walking', minorGroup: 'Static', match: ['standing', 'grounded posture', 'hand on hip', 'confident pose', 'sassy pose', 'poised balance', 'thrusting chest out', 'turned torso'] },
    { majorGroup: 'Standing & Walking', minorGroup: 'Movement', match: ['walking', 'strolling', 'running', 'sprinting', 'jumping', 'airborne', 'mid-air', 'floating in air', 'levitating', 'weightless'] },

    { majorGroup: 'Seated & Reclining', minorGroup: 'Sitting', match: ['sitting', 'seated', 'w-sitting', 'lotus position', 'zen pose', 'meditating'] },
    { majorGroup: 'Seated & Reclining', minorGroup: 'Lying', match: ['lying down', 'lying on back', 'flat on stomach', 'reclining', 'in bed', 'messy sheets'] },
    // Kneeling merged into Crouching
    { majorGroup: 'Seated & Reclining', minorGroup: 'Kneeling & Crouching', match: ['kneeling', 'kneeling pose', 'on knees', 'resting on heels', 'crouched', 'crouching', 'squatting', 'crawling posture', 'all fours', 'hands and knees'] },

    { majorGroup: 'Dynamic & Action', minorGroup: 'Combat', match: ['action pose', 'combat pose', 'fighting stance', 'ready to fight', 'low stance', 'dynamic pose', 'dynamic motion', 'extreme pose'] },
    // Expressive split: Dance & Grace / Hand Gestures
    { majorGroup: 'Dynamic & Action', minorGroup: 'Dance & Grace', match: ['dancing', 'ballet pose', 'graceful movement', 'stretching'] },
    { majorGroup: 'Dynamic & Action', minorGroup: 'Hand Gestures', match: ['arms raised', 'arms crossed', 'hands clasped', 'waving hand', 'pointing finger', 'greeting', 'friendly gesture', 'reaching up', 'stretching arms', 'hands on chest', 'touching ground'] },
    { majorGroup: 'Dynamic & Action', minorGroup: 'Relaxed', match: ['relaxed pose', 'relaxed', 'casual pose', 'resting', 'embrace', 'hugging', 'leaning against wall', 'holding book', 'reading a book'] },

    { majorGroup: 'Presenting & Teasing', minorGroup: 'Presenting', match: ['presenting', 'presenting lower body', 'presenting rear', 'showing crotch', 'showing pussy', 'exposing torso', 'lifting shirt', 'looking back', 'turning head', 'teasing', 'panty shot', 'looking up skirt', 'exposed crotch'] },
    { majorGroup: 'Presenting & Teasing', minorGroup: 'Legs', match: ['spread eagle', 'fully spread legs', 'spreading legs', 'legs apart', 'legs up', 'legs raised in V shape', 'm-legs', 'v-legs', 'bent legs', 'legs bent outwards', 'legs squeezed', 'doing a split', 'extreme flexibility'] },
    { majorGroup: 'Presenting & Teasing', minorGroup: 'Chest', match: ['squeezing own boobs', 'touching own breasts', 'face buried in breasts', 'breast smother', 'breasts resting on object', 'pressing breasts together', 'heavy breasts supported'] },

    { majorGroup: 'Bondage & Restraint', minorGroup: 'Tied', match: ['tied up', 'arms tied behind back', 'legs tied back', 'hogtie', 'frogtie', 'rope', 'shibari', 'restrained', 'bondage'] },
    // Suspended merged into Tied (was only 2)
    { majorGroup: 'Bondage & Restraint', minorGroup: 'Pinned & Suspended', match: ['suspended', 'held in air', 'lifted waist', 'pinned against wall'] },
    { majorGroup: 'Bondage & Restraint', minorGroup: 'Submissive', match: ['submissive posture', 'submissive sitting', 'face down ass up', 'jack-o pose', 'prone bone', 'bent over'] },

    // Sex Positions — merged From Behind (1 tag) into On Top
    { majorGroup: 'Sex Positions', minorGroup: 'Partner Facing', match: ['missionary position', 'missionary variants', 'lotus position sex', 'suspended congress', 'facing each other', 'facing partner', 'arms wrapped around'] },
    { majorGroup: 'Sex Positions', minorGroup: 'From Behind & On Top', match: ['doggystyle', 'doggy position', 'rear entry', 'cowgirl position', 'reverse cowgirl', 'riding', 'on top', 'sitting on lap', 'sitting sex', 'woman on top pinning man', 'dominant riding', 'straddling'] },
    { majorGroup: 'Sex Positions', minorGroup: 'Advanced', match: ['amazon position', 'piledriver position', 'mating press position', 'standing sex', 'carried while mating', 'deep penetration', 'deep penetration pose', 'spitroast position', 'sandwiched', 'double penetration pose'] },
    { majorGroup: 'Sex Positions', minorGroup: 'Oral', match: ['facesitting', 'sitting on face', 'oral', 'smothered', 'smothering'] },

    { majorGroup: 'POV & Extreme', minorGroup: 'POV', match: ['pov penetration', 'first person sex', 'pov from inside', 'pov crotch', 'pov feet', 'pov looking down at penis', 'looking up from crotch', 'looking up from feet', 'looking out from inside vagina', 'view from between legs'] },
    { majorGroup: 'POV & Extreme', minorGroup: 'Detail', match: ['cross-section', 'internal view', 'x-ray', 'showing penetration inside', 'macro focus genitalia', 'extreme close up pussy', 'upside down penetration', 'visible outline in stomach', 'stomach bulge'] },

    // Context catch-all split into Dominance / Body Mechanics / Environment / Focus
    { majorGroup: 'Context', minorGroup: 'Dominance', match: ['dominant', 'stepping on chest', 'stepping on face', 'stepping on viewer', 'trampling'] },
    { majorGroup: 'Context', minorGroup: 'Body Mechanics', match: ['arching back', 'holding legs', 'holding up', 'pulling legs up', 'legs over shoulders'] },
    { majorGroup: 'Context', minorGroup: 'Environment', match: ['bedroom', 'shower', 'steam', 'wet body', 'wet hair', 'motion blur', 'movement'] },
    { majorGroup: 'Context', minorGroup: 'Focus & Intent', match: ['confident glance', 'devotional pose', 'directing attention', 'praying', 'focused', 'eyes closed', 'looking up'] },
  ],

  'action|Gesture': [
    { majorGroup: 'Oral Acts', minorGroup: 'Fellatio', match: ['oral sex', 'blowjob', 'fellatio', 'deepthroat', 'forced oral', 'extremely deep', 'penis through wall', 'gloryhole'] },
    { majorGroup: 'Oral Acts', minorGroup: 'Cunnilingus', match: ['cunnilingus', 'licking', 'eating ass', 'rimming', 'mutual oral sex', 'kissing ass'] },
    { majorGroup: 'Oral Acts', minorGroup: 'Kissing', match: ['deep kissing', 'french kiss', 'tongue kissing', 'saliva trail', 'long tongue'] },

    { majorGroup: 'Penetration', minorGroup: 'Vaginal & Anal', match: ['sex', 'fucking', 'intercourse', 'penetration', 'insertion', 'extreme insertion', 'hitting cervix', 'womb opening', 'anal sex', 'anal penetration', 'sodomy'] },
    { majorGroup: 'Penetration', minorGroup: 'Multi', match: ['double penetration', 'DP', '69 position', 'oral and vaginal simultaneously', 'spit roast', 'multiple penises', 'two cocks'] },

    { majorGroup: 'Manual & Body', minorGroup: 'Hands', match: ['handjob', 'gripping shaft', 'stroking', 'fingering', 'fisting', 'masturbation', 'playing with self', 'playing with pussy', 'groping', 'touching', 'grabbing ass', 'squeezing breasts', 'pressing breasts together', 'hand around neck'] },
    { majorGroup: 'Manual & Body', minorGroup: 'Feet & Body', match: ['footjob', 'rubbing with feet', 'titfuck', 'paizuri', 'breast sex', 'cock between boobs', 'breast feeding'] },
    { majorGroup: 'Manual & Body', minorGroup: 'Grinding', match: ['rubbing', 'rubbing against', 'grinding', 'dry humping', 'rubbing crotches together', 'scissoring', 'tribadism'] },

    // Merged Lactation(1), Squirting(1), Water(3) into Fluids; kept Cum, Creampie, Facial, Orgasm
    { majorGroup: 'Climax & Fluids', minorGroup: 'Orgasm', match: ['orgasm face', 'extreme pleasure', 'overwhelming', 'climax', 'shaking', 'teary eyes'] },
    { majorGroup: 'Climax & Fluids', minorGroup: 'Cum', match: ['cum', 'cumshot', 'ejaculation', 'multiple cumshots', 'cum covered', 'covered in semen', 'semen', 'dripping cum', 'overflowing cum', 'overflowing sperm', 'messy', 'wet fluids', 'slime'] },
    { majorGroup: 'Climax & Fluids', minorGroup: 'Creampie', match: ['creampie', 'cum inside', 'cumming inside', 'internal cumshot', 'nakadashi', 'cum inside womb', 'impregnation'] },
    { majorGroup: 'Climax & Fluids', minorGroup: 'Facial & Bukkake', match: ['bukkake', 'facial', 'cum on face', 'completely covered in cum', 'swimming in cum', 'gokkun', 'swallowing cum', 'drinking semen'] },
    { majorGroup: 'Climax & Fluids', minorGroup: 'Other Fluids', match: ['lactation', 'breast milk spraying', 'excessive lactation', 'squirting milk', 'squirting', 'female ejaculation', 'peeing', 'urination', 'watersports'] },

    // Merged Group & Lesbian into one
    { majorGroup: 'Group & Multi', minorGroup: 'Group', match: ['gangbang', 'surrounded by men', 'multiple males', 'multiple partners', 'group sex', 'threesome', 'anonymous sex', 'double dildo', 'lesbian sex'] },

    // Merged Toys(2) into Kink
    { majorGroup: 'Fetish & Kink', minorGroup: 'BDSM', match: ['breathplay', 'choking', 'spanking', 'slapping', 'red marks on skin', 'dominant female', 'pegging', 'wearing strap-on', 'stockings teasing'] },
    { majorGroup: 'Fetish & Kink', minorGroup: 'Tentacles & Toys', match: ['tentacle sex', 'tentacles', 'bound by tentacles', 'vibrator', 'using a dildo', 'sex toy machine', 'sybian', 'fucking machine'] },
    { majorGroup: 'Fetish & Kink', minorGroup: 'Mind', match: ['hypno', 'mind control', 'corrupted', 'blank eyes'] },
    { majorGroup: 'Fetish & Kink', minorGroup: 'Exposure', match: ['exposure', 'partial nudity', 'removing clothes', 'undressed', 'outdoors', 'public sex'] },
    { majorGroup: 'Fetish & Kink', minorGroup: 'Insertion', match: ['stomach bulge', 'stretched', 'visible outline in stomach'] },
  ],

  // ╔══════════════════════════════════════╗
  // ║  SUBJECT                             ║
  // ╚══════════════════════════════════════╝

  'subject|Character': [
    { majorGroup: 'Fantasy Classes', minorGroup: 'Martial', match: ['knight', 'holy knight', 'noble warrior', 'paladin', 'samurai', 'gladiator', 'barbarian', 'ranger', 'archer', 'assassin', 'rogue', 'thief', 'burglar outfit', 'sneaky', 'arena fighter', 'norse warrior'] },
    { majorGroup: 'Fantasy Classes', minorGroup: 'Magic', match: ['mage', 'sorcerer', 'wizard', 'spellcaster', 'warlock', 'necromancer', 'cleric', 'healer', 'druid', 'alchemist', 'bard', 'arcane scholar', 'witch', 'potion maker', 'alchemical tools'] },
    { majorGroup: 'Fantasy Classes', minorGroup: 'Noble', match: ['prince', 'princess', 'noble', 'valkyrie'] },

    { majorGroup: 'Mythical Beings', minorGroup: 'Divine', match: ['angel', 'divine', 'divine light', 'divine robes', 'halo', 'heavenly', 'holy symbol', 'prayer'] },
    // Merged Demonic(3) + Undead(5) → Dark & Undead
    { majorGroup: 'Mythical Beings', minorGroup: 'Dark & Undead', match: ['demon', 'hellfire', 'dark pact', 'succubus', 'undead', 'zombie', 'vampire', 'werewolf', 'wolfman', 'decaying skin', 'undead minions'] },
    { majorGroup: 'Mythical Beings', minorGroup: 'Creature', match: ['dragon', 'fire breathing', 'griffon', 'mermaid', 'fairy', 'centaur', 'half human half horse', 'mythical creature', 'mythological', 'majestic beast', 'elf'] },

    { majorGroup: 'Sci-Fi & Modern', minorGroup: 'Cyber', match: ['cyborg', 'robot', 'android', 'artificial intelligence', 'hacker', 'neon code', 'neon jacket', 'neural interface', 'cybernetic implants', 'cyberpunk hoodie', 'cyberpunk runner', 'multiple monitors', 'vr headset', 'half human half machine'] },
    { majorGroup: 'Sci-Fi & Modern', minorGroup: 'Military', match: ['sci-fi soldier', 'modern soldier', 'space marine', 'sci-fi pilot', 'mecha pilot', 'bounty hunter', 'mandalorian style armor', 'power armor', 'plugsuit', 'jetpack', 'flight suit'] },
    { majorGroup: 'Sci-Fi & Modern', minorGroup: 'Professional', match: ['doctor', 'stethoscope', 'white coat', 'police officer', 'law enforcement', 'patrol car', 'firefighter', 'turnout gear', 'business person', 'corporate', 'suit and tie', 'student', 'school uniform'] },

    // Merged Pirate(3) into Entertainment
    { majorGroup: 'Performers & Social', minorGroup: 'Entertainment', match: ['musician', 'performer', 'performace', 'idol singer', 'microphone', 'stage costume', 'lute', 'geisha', 'pirate', 'sea captain coat', 'tricorn hat'] },

    // Visual(31) split → Wings & Horns / Glowing & Aura / Face & Details
    { majorGroup: 'Character Traits', minorGroup: 'Wings & Horns', match: ['wings', 'white wings', 'small wings', 'winged helmet', 'horns', 'antlers', 'tail', 'scales', 'fur', 'claws', 'fangs'] },
    { majorGroup: 'Character Traits', minorGroup: 'Glowing & Aura', match: ['glowing', 'glowing eyes', 'glowing runes', 'glowing shield', 'red eyes', 'purple energy', 'shadows', 'vines'] },
    { majorGroup: 'Character Traits', minorGroup: 'Face & Details', match: ['pointed ears', 'large eyes', 'eye patch', 'mask', 'pale skin', 'exotic skin', 'metallic skin', 'red skin', 'white makeup', 'smoking cigarette', 'soot', 'tiny'] },
    // Equipment(23) split → Weapons / Armor / Gear
    { majorGroup: 'Character Traits', minorGroup: 'Weapons', match: ['sword and shield', 'katana', 'heavy weapon', 'axe', 'great axe', 'spear', 'daggers', 'hidden blades', 'bow and arrow', 'assault rifle', 'trident', 'weapons', 'war paint'] },
    { majorGroup: 'Character Traits', minorGroup: 'Armor', match: ['heavy plate armor', 'medieval armor', 'roman armor', 'traditional japanese armor', 'leather armor', 'fur armor'] },
    { majorGroup: 'Character Traits', minorGroup: 'Gear & Pack', match: ['tactical gear', 'tactical outfit', 'rugged gear', 'backpack'] },
    // Magic Props(17) split → Spellcasting / Magic Items
    { majorGroup: 'Character Traits', minorGroup: 'Spellcasting', match: ['casting spell', 'innate magic', 'eldritch magic', 'green magic', 'healing magic', 'nature magic'] },
    { majorGroup: 'Character Traits', minorGroup: 'Magic Items', match: ['magic staff', 'skull staff', 'magical dust', 'magical potions', 'dark robes', 'robes', 'hooded', 'hooded cloak', 'pointy hat', 'tome', 'holding books'] },
    { majorGroup: 'Character Traits', minorGroup: 'Mood', match: ['charismatic', 'charming', 'rugged', 'lethal', 'stealthy', 'stealth', 'battle ready', 'combat', 'rage', 'transformation', 'chaotic energy', 'muscular'] },

    // Background(15) split → Natural / Built
    { majorGroup: 'Setting Props', minorGroup: 'Natural Background', match: ['night', 'full moon', 'clouds', 'fire background', 'forest background', 'forest setting', 'nature background', 'rainy street', 'wilderness'] },
    { majorGroup: 'Setting Props', minorGroup: 'Built Background', match: ['futuristic city background', 'futuristic interface', 'office setting', 'hospital setting', 'campus', 'cockpit'] },
    // Clothing Style(22) split → Outfits / Props & Companions
    { majorGroup: 'Setting Props', minorGroup: 'Outfits', match: ['black outfit', 'colorful clothes', 'elegant clothes', 'gothic clothes', 'trench coat', 'royal attire', 'royal gown', 'tiara', 'uniform', 'camouflage', 'fedora', 'film noir', 'helmet', 'hood', 'torn  clothes', 'traditional kimono'] },
    { majorGroup: 'Setting Props', minorGroup: 'Props & Companions', match: ['animal companion', 'parrot', 'broomstick', 'lockpick', 'net', 'badge', 'seasoned tracker'] },

    { majorGroup: 'Creature Types', minorGroup: 'Beast', match: ['alien', 'extraterrestrial', 'lion body', 'eagle head', 'fish tail', 'gills', 'mechanical joints', 'mechanical limbs', 'seams', 'synthetic skin', 'sci-fi'] },
  ],

  'subject|Object': [
    { majorGroup: 'Weapons', minorGroup: 'Blades', match: ['sword', 'longsword', 'steel blade', 'sharp blade', 'greatsword', 'massive blade', 'two-handed', 'dagger', 'short blade', 'knife', 'curved blade', 'samurai sword', 'ornate hilt'] },
    { majorGroup: 'Weapons', minorGroup: 'Polearms', match: ['spear', 'polearm', 'lance', 'trident', 'scythe', 'reaper scythe', 'war axe', 'battle axe'] },
    { majorGroup: 'Weapons', minorGroup: 'Ranged', match: ['gun', 'firearm', 'handgun', 'pistol', 'modern weapon', 'tactical weapon', 'scope', 'longbow', 'archery', 'quiver'] },
    { majorGroup: 'Weapons', minorGroup: 'Other', match: ['whip', 'leather whip', 'chains', 'metal chains', 'linked', 'metal rings', 'death weapon', 'sharp', 'pointed weapon', 'rogue weapon', 'rogue gear', 'wizard weapon'] },
    // Merged Sleek(1) into Light armor
    { majorGroup: 'Armor & Protection', minorGroup: 'Heavy', match: ['armor', 'knight armor', 'full plate armor', 'heavy protection', 'heavy', 'full helm', 'head protection', 'shield', 'metal shield', 'wooden shield', 'heavy shield', 'chainmail', 'mail armor', 'shiny steel', 'heraldry', 'studded leather', 'metal suit', 'mech suit', 'sci-fi armor'] },
    { majorGroup: 'Armor & Protection', minorGroup: 'Light', match: ['cloak', 'cape', 'flowing fabric', 'hood', 'face covering', 'gas mask', 'oni mask', 'sleek design'] },
    { majorGroup: 'Magical Items', minorGroup: 'Books & Orbs', match: ['spellbook', 'ancient tome', 'ancient grimoire', 'glowing pages', 'book', 'leather bound', 'embossed cover', 'magic orb', 'crystal ball', 'glowing sphere', 'crystal', 'gemstone', 'mineral', 'glowing shard', 'glowing crystal tip', 'glowing light'] },
    { majorGroup: 'Magical Items', minorGroup: 'Potions & Light', match: ['potion bottle', 'magical elixir', 'glass vial', 'glowing liquid', 'lantern', 'magical lantern', 'oil lamp', 'wooden staff'] },
    // Merged Eyewear(2) + Music(2) + Restraints(3) into Tech / Adornment
    // Adornment(16) split → Flowers / Valuables / Handheld
    { majorGroup: 'Accessories', minorGroup: 'Eyewear & Tech', match: ['glasses', 'spectacles', 'eyewear', 'shades', 'sunglasses', 'visor', 'headphones', 'over-ear headset', 'modern audio gear', 'smartphone', 'mobile phone', 'holding phone', 'camera', 'vintage camera', 'photographer'] },
    { majorGroup: 'Accessories', minorGroup: 'Music', match: ['guitar', 'acoustic guitar', 'electric guitar', 'musical instrument'] },
    { majorGroup: 'Accessories', minorGroup: 'Flowers & Nature', match: ['bouquet', 'flower', 'floral', 'rose'] },
    { majorGroup: 'Accessories', minorGroup: 'Valuables', match: ['crown', 'gold crown', 'royal', 'gold', 'jewels', 'elegant accessory', 'treasure chest', 'loot', 'wooden box'] },
    { majorGroup: 'Accessories', minorGroup: 'Handheld', match: ['folding fan', 'sensu', 'parasol', 'umbrella', 'rain protection'] },
    { majorGroup: 'Accessories', minorGroup: 'Restraints', match: ['bound', 'coiled', 'cool'] },
    { majorGroup: 'Wings & Fantasy', minorGroup: 'Wings', match: ['angel wings', 'dragon wings', 'feathered wings'] },
  ],

  'subject|General': [
    { majorGroup: 'Boudoir & Glamour', minorGroup: 'Pose & Body Language', match: ['accentuated curves', 'alluring posture', 'assertive body language', 'assertive glamour stance', 'composed sensual body language', 'confident sensual energy', 'dominant vibe', 'commanding presence', 'elongated silhouette', 'kneeling tease', 'poised kneeling pose', 'reclining pose', 'lounging on bed or sofa', 'relaxed sensual posture', 'suggestive posture', 'suggestive silhouette', 'submissive vibe', 'gentle vulnerability', 'playful allure', 'playful confidence', 'soft body language'] },
    { majorGroup: 'Boudoir & Glamour', minorGroup: 'Expression', match: ['bedroom eyes', 'heavy-lidded expression', 'sultry gaze', 'flirty smile', 'flirtatious glamour pose', 'seductive charm', 'teasing expression', 'teasing glance back', 'intimate eye contact', 'over shoulder look', 'shy sensuality'] },
    { majorGroup: 'Boudoir & Glamour', minorGroup: 'Attire', match: ['elegant bedroom attire', 'fitted intimates', 'garter set', 'high heels', 'stilettos', 'elegant footwear', 'elegant twist', 'lace lingerie', 'lingerie straps', 'intimate apparel', 'luxurious loungewear', 'silk robe', 'sheer fabric', 'translucent clothing', 'delicate lace fabric', 'body chain', 'jewelry accent', 'metallic adornment', 'glamour fashion accent'] },
    { majorGroup: 'Boudoir & Glamour', minorGroup: 'Skin & Body', match: ['flushed skin', 'oiled skin', 'radiant body sheen', 'glossy highlights', 'satin sheen'] },
    { majorGroup: 'Boudoir & Glamour', minorGroup: 'Styling', match: ['sensual styling', 'soft sensual styling', 'relaxed sensual styling', 'polished sensual look', 'retro sensual fashion', 'luxurious sensual styling', 'sensual warmth', 'polished boudoir styling', 'delicate drape', 'pin-up style'] },

    { majorGroup: 'Intimate Setting', minorGroup: 'Bedroom', match: ['boudoir', 'private bedroom mood', 'plush bedding', 'wrapped in blankets', 'soft comfort', 'private glamour setting', 'upscale intimate setting'] },
    { majorGroup: 'Intimate Setting', minorGroup: 'Bath & Spa', match: ['bubble bath', 'warm water', 'soft steam', 'spa-like sensual atmosphere'] },
    // Merged Mood & Light + Other into one
    { majorGroup: 'Intimate Setting', minorGroup: 'Ambiance', match: ['candlelit room', 'warm flickering light', 'intimate glow', 'intimate glamour photography', 'intimate post-romance atmosphere', 'moody club lighting', 'vanity mirror lights', 'city lights', 'upscale nightlife atmosphere', 'vip lounge', 'changing area', 'dressing room', 'luxury hotel suite', 'velvet seating'] },

    { majorGroup: 'Romance & Intimacy', minorGroup: 'Couples', match: ['close embrace', 'tender closeness', 'couples cuddle', 'affectionate chemistry', 'relaxed intimacy', 'romantic atmosphere', 'romantic intimacy', 'cozy affection'] },
    { majorGroup: 'Romance & Intimacy', minorGroup: 'Aftercare', match: ['aftercare', 'afterglow', 'affectionate recovery moment'] },

    { majorGroup: 'Content Markers', minorGroup: 'Rating', match: ['nude', 'naked', 'unclothed', 'nsfw', 'adult content', 'r-18', 'open shirt', 'partly unbuttoned top', 'casual tease'] },
  ],

  'subject|Scene': [],
  'subject|Theme': [],

  // ╔══════════════════════════════════════╗
  // ║  SETTING                             ║
  // ╚══════════════════════════════════════╝

  'setting|General': [
    { majorGroup: 'Camera Language', minorGroup: 'Distance', match: ['wide shot', 'extreme wide shot', 'establishing shot', 'medium shot', 'cowboy shot', 'waist up', 'mid-thigh up', 'close-up shot', 'face close-up', 'extreme close up', 'extreme face detail', 'eyes focus', 'macro photography'] },
    { majorGroup: 'Camera Language', minorGroup: 'Angle', match: ['eye level shot', 'high angle', 'high angle miniature feel', 'low angle', 'low perspective', 'hero low angle', 'dutch angle', 'canted angle', 'tilted camera', 'aerial view', 'drone shot', 'top down view', 'overhead diorama view', 'ground level shot', 'upward perspective', 'straight angle'] },
    { majorGroup: 'Camera Language', minorGroup: 'POV', match: ['pov', 'point of view', 'first person view', 'over the shoulder shot', 'ots', 'conversational framing', 'film framing'] },
    { majorGroup: 'Camera Language', minorGroup: 'Perspective', match: ['isometric view', 'isometric perspective', 'depth of field', 'fisheye lens', 'wide angle', 'distorted view'] },
    { majorGroup: 'Camera Language', minorGroup: 'Composition', match: ['focus on subject', 'environment focus', 'scene layout clarity', 'dramatic scale', 'small subject', 'towering subject', 'tiny details'] },

    { majorGroup: 'Landscape & Terrain', minorGroup: 'Green', match: ['nature', 'foliage', 'plants', 'trees', 'woodland', 'grass', 'flowers', 'wildflowers', 'green stalks', 'lush vegetation', 'overgrown', 'botanical', 'spring'] },
    { majorGroup: 'Landscape & Terrain', minorGroup: 'Mountain & Desert', match: ['alpine', 'peaks', 'ice peaks', 'sand', 'sand dunes', 'dry landscape', 'arid', 'oasis', 'vast landscape', 'winter landscape'] },
    { majorGroup: 'Landscape & Terrain', minorGroup: 'Water', match: ['coastal', 'waves', 'coral reef', 'coral structures', 'marine life', 'underwater', 'surface view', 'bubbles', 'palm trees', 'tropical'] },
    { majorGroup: 'Landscape & Terrain', minorGroup: 'Subterranean', match: ['cave interior', 'underground', 'underground cavern', 'stalactites', 'lava', 'molten rock'] },

    // Merged European(2) into Grand
    { majorGroup: 'Architecture', minorGroup: 'Grand', match: ['cathedral interior', 'gothic', 'gothic arches', 'gothic architecture', 'stained glass', 'domes', 'colosseum', 'grand hall', 'ornate interior', 'royal palace', 'french architecture', 'paris'] },
    { majorGroup: 'Architecture', minorGroup: 'Japanese', match: ['japan', 'japanese architecture', 'traditional japan', 'torii gate', 'pink petals falling', 'landscaped'] },
    { majorGroup: 'Architecture', minorGroup: 'Dark', match: ['cemetery', 'graveyard', 'tombstones', 'haunted house', 'spooky mansion', 'cobwebs'] },

    { majorGroup: 'Atmosphere & Weather', minorGroup: 'Weather', match: ['blizzard', 'fire', 'fog', 'smoke'] },
    { majorGroup: 'Atmosphere & Weather', minorGroup: 'Mood', match: ['warm lighting', 'dark atmosphere', 'peaceful', 'cozy', 'mysterious', 'mythical', 'crowd'] },

    // Renamed from "Sci-Fi & Space > Fantasy" → "Historical & Sacred"
    { majorGroup: 'Historical & Sacred', minorGroup: 'Medieval', match: ['medieval fortress', 'medieval village', 'thatched roofs', 'stone walls', 'rustic'] },
    { majorGroup: 'Historical & Sacred', minorGroup: 'Sacred & Ancient', match: ['atlantis', 'historical', 'holy', 'sacred'] },
    { majorGroup: 'Sci-Fi & Space', minorGroup: 'Space', match: ['astronomical', 'cosmic', 'galaxy', 'nebula', 'stars', 'viewport looking at earth'] },
    { majorGroup: 'Sci-Fi & Space', minorGroup: 'Tech', match: ['dystopian', 'futuristic technology', 'high tech equipment', 'science fiction'] },

    // Merged Military(2) into Scholarly
    { majorGroup: 'Interior', minorGroup: 'Scholarly', match: ['books', 'bookshelves', 'chalkboard', 'desks', 'educational', 'reading lamps', 'reading room', 'scholarly', 'tables', 'archaeology', 'gladiator pit'] },
    { majorGroup: 'Interior', minorGroup: 'Medical', match: ['medical facility', 'sterile', 'test tubes', 'white halls'] },

    { majorGroup: 'Special', minorGroup: 'Landmarks', match: ['manhattan skyline', 'metro', 'metropolitan', 'shibuya', 'skyline backdrop'] },
  ],

  'setting|Indoor': [
    { majorGroup: 'Interior Spaces', minorGroup: 'Sacred', match: ['temple', 'japanese shrine', 'throne room'] },
    { majorGroup: 'Interior Spaces', minorGroup: 'Learning', match: ['classroom', 'library', 'grand library'] },
    // Merged Combat(1) + Medical(1) into General
    { majorGroup: 'Interior Spaces', minorGroup: 'General', match: ['arena', 'hospital'] },
    { majorGroup: 'Interior Spaces', minorGroup: 'Sci-Fi', match: ['outer space', 'science laboratory', 'space station interior', 'spacecraft', 'spaceship interior'] },
  ],

  'setting|Outdoor': [
    { majorGroup: 'Natural', minorGroup: 'Forest', match: ['bamboo forest', 'cherry blossom trees', 'forest', 'sakura'] },
    { majorGroup: 'Natural', minorGroup: 'Meadow & Garden', match: ['meadow', 'garden', 'japanese garden', 'peaceful countryside'] },
    { majorGroup: 'Natural', minorGroup: 'Mountain & Snow', match: ['mountains', 'snow-capped', 'snowy mountain', 'rocky terrain'] },
    { majorGroup: 'Natural', minorGroup: 'Water', match: ['beach', 'ocean', 'ocean floor', 'deep sea', 'crystal clear water'] },
    { majorGroup: 'Natural', minorGroup: 'Arid', match: ['desert', 'desert oasis', 'volcano'] },
    { majorGroup: 'Urban', minorGroup: 'Rooftop', match: ['rooftop', 'city rooftop', 'rooftop details'] },
  ],

  'setting|Urban': [
    { majorGroup: 'Cityscape', minorGroup: 'General', match: ['urban', 'urban city', 'cityscape', 'urban skyline', 'urban america', 'city view', 'buildings', 'streets', 'elevated urban setting'] },
    { majorGroup: 'Cityscape', minorGroup: 'Named', match: ['new york city', 'tokyo cityscape', 'times square'] },
    { majorGroup: 'Cityscape', minorGroup: 'Cyber', match: ['cyberpunk city', 'night city', 'neon lights', 'neon signs', 'underwater city'] },
    { majorGroup: 'Venues', minorGroup: 'Social', match: ['cafe interior', 'coffee shop', 'romantic city', 'cobblestone streets', 'school', 'subway station'] },
  ],

  'setting|Fantasy': [
    { majorGroup: 'Fantasy Locations', minorGroup: 'Grand', match: ['castle', 'fantasy kingdom', 'magical realm', 'towers', 'towering bookshelves'] },
    { majorGroup: 'Fantasy Locations', minorGroup: 'Mystical', match: ['ancient ruins', 'crystal clear water', 'eiffel tower', 'enchanted', 'fairytale'] },
  ],

  // ╔══════════════════════════════════════╗
  // ║  STYLE                               ║
  // ╚══════════════════════════════════════╝

  'style|Anime': [
    { majorGroup: 'Studio & Artist', minorGroup: 'Ghibli', match: ['ghibli', 'studio ghibli style', 'miyazaki'] },
    { majorGroup: 'Studio & Artist', minorGroup: 'MAPPA', match: ['mappa', 'mappa animation', 'jujutsu kaisen style'] },
    { majorGroup: 'Studio & Artist', minorGroup: 'Ufotable', match: ['ufotable', 'kimetsu no yaiba', 'water breathing'] },
    { majorGroup: 'Studio & Artist', minorGroup: 'Other Studios', match: ['bones studio', 'cloverworks', 'gainax', 'wit studio', 'neon genesis evangelion style'] },
    { majorGroup: 'Studio & Artist', minorGroup: 'Directors', match: ['anno hideaki', 'makoto shinkai style', 'weathering with you', 'your name'] },
    { majorGroup: 'Studio & Artist', minorGroup: 'Mangaka', match: ['eiichiro oda', 'one piece style', 'fujimoto tatsuki', 'hokusai'] },
    { majorGroup: 'Anime Aesthetic', minorGroup: 'General', match: ['anime art', 'anime style', 'manga style', 'comic art', 'comic book style', 'hand drawn', 'bold lines', 'cel shading', 'cel shaded', 'crisp anime shading', 'detailed'] },
    { majorGroup: 'Anime Aesthetic', minorGroup: 'Genre', match: ['dark', 'dark fantasy', 'dark romantic', 'dark shonen', 'adventure anime', 'psychological', 'superhero anime', 'mecha', 'cursed energy'] },
    { majorGroup: 'Anime Aesthetic', minorGroup: 'Mood', match: ['vibrant', 'vibrant colors', 'elegant', 'intense', 'gritty', 'scenic', 'whimsical'] },
    { majorGroup: 'Anime Aesthetic', minorGroup: 'Series', match: ['boku no hero', 'spy x family style', 'shingeki no kyojin'] },
    { majorGroup: 'Anime Aesthetic', minorGroup: 'Japanese Art', match: ['traditional japanese', 'ukiyo-e style', 'woodblock print', 'detailed fantasy art', 'detailed sky'] },
  ],

  'style|Digital': [
    { majorGroup: 'Render & 3D', minorGroup: '3D', match: ['3d render', 'cgi', 'octane render', 'unreal engine'] },
    { majorGroup: 'Render & 3D', minorGroup: 'Digital', match: ['digital art', 'digital painting', 'illustration', 'concept art', 'trending on artstation', 'artstation'] },
    { majorGroup: 'Retro & Pixel', minorGroup: 'Pixel', match: ['pixel art', 'pixelated', '8-bit'] },
    { majorGroup: 'Retro & Pixel', minorGroup: 'Retro', match: ['retro', '80s retro', 'synthwave', 'vaporwave aesthetic', 'outrun', 'neon', 'neon grid', 'sunset'] },
    { majorGroup: 'Genre', minorGroup: 'Cyberpunk', match: ['cyberpunk', 'cyberpunk edgerunners style', 'futuristic', 'high tech', 'low life'] },
    { majorGroup: 'Genre', minorGroup: 'Steampunk', match: ['steampunk', 'steam power', 'brass', 'gears', 'victorian technology'] },
  ],

  'style|Realistic': [
    // Merged Photo(2) + Vintage(1) + Cinematic(3) + Noir(5) → Photo & Film / Noir
    { majorGroup: 'Photo & Film', minorGroup: 'Photo & Cinematic', match: ['photorealistic', 'hyperrealistic', 'realistic', 'cinematic', 'movie still', 'film grain', 'vintage photo'] },
    { majorGroup: 'Photo & Film', minorGroup: 'Noir', match: ['noir style', 'black and white', 'high contrast', 'detective', 'mystery'] },
  ],

  'style|Painting': [
    { majorGroup: 'Traditional', minorGroup: 'Oil & Brush', match: ['oil painting', 'painted', 'brushstrokes', 'soft brushstrokes', 'canvas texture', 'soft colors'] },
    { majorGroup: 'Traditional', minorGroup: 'Watercolor', match: ['watercolor painting', 'fluid', 'delicate', 'elegant curves', 'floral styles'] },
    { majorGroup: 'Traditional', minorGroup: 'Sketch', match: ['pencil sketch', 'rough sketch', 'charcoal drawing', 'graphite'] },
    { majorGroup: 'Art Movements', minorGroup: 'Named', match: ['art nouveau', 'mucha', 'impressionist painting', 'surrealism', 'dali', 'magritte', 'melting objects', 'dreamlike', 'monet style'] },
  ],

  'style|General': [
    { majorGroup: 'Anime References', minorGroup: 'Shonen', match: ['akira toriyama', 'dragon ball style', 'kishimoto', 'naruto style', 'my hero academia style', 'attack on titan style', 'bleach style', 'tite kubo', 'chainsaw man style', 'demon slayer style', 'frieren style', 'sousou no frieren'] },
    { majorGroup: 'Anime References', minorGroup: 'Studios', match: ['madhouse', 'studio pierrot', 'toei animation', 'trigger studio'] },
    { majorGroup: 'Anime References', minorGroup: 'Chibi & SD', match: ['chibi style', 'super deformed', 'big head small body', 'cute'] },
    { majorGroup: 'Anime References', minorGroup: 'Shinigami', match: ['shinigami', 'soul reaper', 'ninja', 'shinobi', 'martial arts'] },
    { majorGroup: 'Graphic & Design', minorGroup: 'Flat', match: ['flat design', 'vector art', 'line art', 'clean lines', 'clean linework', 'minimal', 'stylized'] },
    { majorGroup: 'Graphic & Design', minorGroup: 'Pop', match: ['pop art', 'warhol style', 'bold colors', 'halftone dots', 'screentones'] },
    { majorGroup: 'Graphic & Design', minorGroup: 'Geometric', match: ['geometric patterns', 'geometric shapes', 'triangular', 'low poly 3d'] },
    { majorGroup: 'Graphic & Design', minorGroup: 'Decorative', match: ['art deco style', 'gold accents', 'ornate', 'colorful glass panels', 'stained glass style', 'light shining through'] },
    { majorGroup: 'Mood & Atmosphere', minorGroup: 'Dark', match: ['gothic atmosphere', 'gothic style', 'dramatic', 'dramatic lines', 'bold edge highlights', 'ominous grandeur', 'glitch', 'grain', 'old camera'] },
    // Soft split → Period / Tone / Mood
    { majorGroup: 'Mood & Atmosphere', minorGroup: 'Period & Historical', match: ['1920s', 'victorian', 'greek statues'] },
    { majorGroup: 'Mood & Atmosphere', minorGroup: 'Tone & Technique', match: ['monochrome drawing', 'sepia tone', 'no color', 'light study', 'monet style'] },
    { majorGroup: 'Mood & Atmosphere', minorGroup: 'Soft & Serene', match: ['serene', 'fantasy', 'pink and blue'] },
  ],

  // ╔══════════════════════════════════════╗
  // ║  ATMOSPHERE                          ║
  // ╚══════════════════════════════════════╝

  'atmosphere|Lighting': [
    { majorGroup: 'Natural Light', minorGroup: 'Daylight', match: ['natural lighting', 'natural interior lighting', 'daylight', 'diffused daylight', 'diffused light', 'cloudy day', 'overcast lighting', 'soft window light', 'outdoor lighting'] },
    { majorGroup: 'Natural Light', minorGroup: 'Golden Hour', match: ['golden hour', 'sunrise lighting', 'sunset lighting', 'warm sunlight', 'warm glow', 'warm orange glow', 'warm'] },
    { majorGroup: 'Natural Light', minorGroup: 'Night', match: ['moonlight', 'pale blue light', 'night scene', 'dark sky', 'aurora borealis', 'northern lights', 'eclipse lighting', 'green purple sky'] },
    { majorGroup: 'Studio Light', minorGroup: 'Key', match: ['studio lighting', 'professional lighting', 'softbox', 'spotlight', 'stage lighting', 'focused beam', 'hard light'] },
    { majorGroup: 'Studio Light', minorGroup: 'Fill & Rim', match: ['soft lighting', 'soft even light', 'gentle highlights', 'gentle shadows', 'rim lighting', 'glowing edges', 'luminous outline', 'colored edge lighting', 'backlit'] },
    { majorGroup: 'Studio Light', minorGroup: 'Low Key', match: ['low key', 'dramatic lighting', 'dramatic shadows', 'strong contrast', 'sharp shadows', 'long shadows', 'chiaroscuro', 'no shadows'] },
    { majorGroup: 'Atmospheric', minorGroup: 'Volumetric', match: ['volumetric lighting', 'god rays', 'light beams', 'light rays', 'corona', 'rainbow light', 'prismatic', 'spectrum', 'caustics'] },
    // Merged Underwater(1) + blue green tint + dawn into Ambient
    { majorGroup: 'Atmospheric', minorGroup: 'Ambient', match: ['atmospheric', 'moody lighting', 'cinematic lighting', 'movie lighting', 'eerie glow', 'magical glow', 'bioluminescent', 'glowing organic light', 'underwater lighting', 'blue green tint', 'dawn'] },
    { majorGroup: 'Atmospheric', minorGroup: 'Fire', match: ['candlelight', 'firelight', 'campfire glow', 'flickering light', 'flickering orange light'] },
    // Merged Neon into one group
    { majorGroup: 'Stylized', minorGroup: 'Neon & Club', match: ['neon lighting', 'neon rim light', 'cyberpunk lighting', 'colorful lights', 'colorful reflections', 'nightclub glow'] },
  ],

  'atmosphere|Mood': [
    // Merged bright colors(1) into Upbeat; scary(1) into Eerie
    { majorGroup: 'Positive', minorGroup: 'Upbeat', match: ['happy', 'cheerful', 'joyful', 'lively', 'celebration', 'playful', 'cheeky', 'energetic charm', 'comfortable', 'homey', 'bright colors'] },
    { majorGroup: 'Positive', minorGroup: 'Peaceful', match: ['calm', 'tranquil', 'zen', 'stillness', 'relaxing', 'quiet', 'soft', 'serene'] },
    { majorGroup: 'Positive', minorGroup: 'Wonder', match: ['magical', 'enchanting', 'ethereal', 'otherworldly', 'dreamy', 'wonder', 'surreal beauty', 'mystical', 'sparkles'] },
    { majorGroup: 'Intense', minorGroup: 'Power', match: ['epic', 'grand', 'majestic', 'awe-inspiring', 'powerful', 'triumphant', 'victorious', 'glory', 'bold'] },
    { majorGroup: 'Intense', minorGroup: 'Action', match: ['dynamic', 'energetic', 'action', 'motion', 'chaotic', 'mayhem', 'destruction', 'disorder'] },
    { majorGroup: 'Intense', minorGroup: 'Suspense', match: ['tense', 'suspenseful', 'thriller', 'anticipation', 'anxiety', 'ominous'] },
    // Merged Sad + Scary → Dark & Eerie
    { majorGroup: 'Dark', minorGroup: 'Sad & Melancholic', match: ['sad', 'melancholic', 'sorrowful', 'gloomy', 'lonely', 'isolated', 'solitude', 'empty', 'wistful', 'bittersweet', 'nostalgic', 'memories', 'quiet sadness', 'introspective'] },
    { majorGroup: 'Dark', minorGroup: 'Eerie & Horror', match: ['scary', 'creepy', 'horror', 'unsettling', 'shadowy', 'foggy'] },
    { majorGroup: 'Romantic', minorGroup: 'Warm', match: ['romantic', 'intimate', 'warm feeling', 'rain', 'cold'] },
    { majorGroup: 'Romantic', minorGroup: 'Enigmatic', match: ['artificial', 'cybernetic', 'robotic', 'mysterious', 'enigmatic'] },
  ],

  // ╔══════════════════════════════════════╗
  // ║  QUALITY                             ║
  // ╚══════════════════════════════════════╝

  'quality|Positive Quality': [
    { majorGroup: 'Resolution', minorGroup: 'Resolution', match: ['8k uhd', '4k resolution', 'ultra high resolution', 'high definition', 'absurdres', 'highres', 'hdr', 'high dynamic range'] },
    { majorGroup: 'Detail', minorGroup: 'General', match: ['masterpiece', 'best quality', 'highly detailed', 'extremely detailed', 'intricate details', 'crisp details', 'high detail', 'award winning', 'highly rated', 'popular artwork', 'professional', 'stunning'] },
    { majorGroup: 'Detail', minorGroup: 'Face & Eyes', match: ['beautiful detailed eyes', 'detailed eyes', 'expressive eyes', 'reflective eyes', 'detailed face', 'highly detailed face'] },
    { majorGroup: 'Detail', minorGroup: 'Body', match: ['anatomically correct hands', 'well drawn hands', 'correct fingers', 'anatomically correct feet', 'well drawn feet', 'correct toes', 'balanced anatomy', 'consistent body structure', 'proportionate limbs', 'natural posture', 'realistic skin texture', 'pore details'] },
    { majorGroup: 'Rendering', minorGroup: 'Engine', match: ['unreal engine 5', 'ray tracing', 'lumen', 'nanite', 'photorealistic render', 'polished rendering'] },
    { majorGroup: 'Rendering', minorGroup: 'Output', match: ['sharp focus', 'crisp outlines', 'tidy edges', 'clear image', 'anime'] },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// PROCESSING
// ═══════════════════════════════════════════════════════════════════
const report = [];
let deduped = 0, grouped = 0, ungrouped = 0;

const mergeMap = new Map();
for (const rule of DEDUP_RULES) {
  for (const m of rule.merged) mergeMap.set(m.toLowerCase(), rule.canonical.toLowerCase());
}

const canonicalTagMap = new Map();
const removedIds = new Set();

for (const tag of tags) {
  const textLower = tag.text.toLowerCase();
  if (mergeMap.has(textLower)) { removedIds.add(tag.id); deduped++; }
  else if (DEDUP_RULES.some(r => r.canonical.toLowerCase() === textLower)) { canonicalTagMap.set(textLower, tag); }
}

for (const rule of DEDUP_RULES) {
  const canonical = canonicalTagMap.get(rule.canonical.toLowerCase());
  if (canonical) {
    if (!canonical.aliases) canonical.aliases = [];
    for (const m of rule.merged) { if (!canonical.aliases.includes(m)) canonical.aliases.push(m); }
  } else if (rule.merged.length > 0) {
    report.push(`WARNING: Canonical tag "${rule.canonical}" not found in dataset`);
  }
}

let resultTags = tags.filter(t => !removedIds.has(t.id));

for (const tag of resultTags) {
  const key = `${tag.step}|${tag.subcategory || 'General'}`;
  const rules = TAXONOMY[key];
  if (!rules || rules.length === 0) { ungrouped++; continue; }

  const textLower = tag.text.toLowerCase();
  let matched = false;
  for (const rule of rules) {
    if (rule.match.some(m => m.toLowerCase() === textLower)) {
      tag.majorGroup = rule.majorGroup;
      tag.minorGroup = rule.minorGroup;
      const majorIdx = rules.findIndex(r => r.majorGroup === rule.majorGroup);
      const minorIdx = rules.filter(r => r.majorGroup === rule.majorGroup).findIndex(r => r.minorGroup === rule.minorGroup);
      tag.groupOrder = (majorIdx + 1) * 10;
      tag.minorOrder = (minorIdx + 1) * 10;
      matched = true; grouped++; break;
    }
  }
  if (!matched) ungrouped++;
}

writeFileSync(OUTPUT, JSON.stringify(resultTags, null, 2), 'utf-8');

report.push(`\n=== CURATION REPORT ===`);
report.push(`Original tags: ${tags.length}`);
report.push(`Deduplicated (removed): ${deduped}`);
report.push(`Result tags: ${resultTags.length}`);
report.push(`Tags with majorGroup assigned: ${grouped}`);
report.push(`Tags without majorGroup (fallback): ${ungrouped}`);
report.push(``);

const stepStats = {};
for (const tag of resultTags) {
  const key = `${tag.step}|${tag.subcategory || 'General'}`;
  if (!stepStats[key]) stepStats[key] = { total: 0, grouped: 0, ungrouped: 0 };
  stepStats[key].total++;
  if (tag.majorGroup) stepStats[key].grouped++; else stepStats[key].ungrouped++;
}
report.push(`--- Per subcategory ---`);
for (const [key, stats] of Object.entries(stepStats).sort((a, b) => b[1].total - a[1].total)) {
  const pct = stats.total > 0 ? Math.round(stats.grouped / stats.total * 100) : 0;
  report.push(`${key}: ${stats.total} total, ${stats.grouped} grouped (${pct}%), ${stats.ungrouped} ungrouped`);
}

report.push(`\n--- Ungrouped tags ---`);
const ungroupedTags = resultTags.filter(t => !t.majorGroup);
for (const tag of ungroupedTags.sort((a, b) => `${a.step}|${a.subcategory}`.localeCompare(`${b.step}|${b.subcategory}`) || a.text.localeCompare(b.text))) {
  report.push(`  [${tag.step}|${tag.subcategory || 'General'}] ${tag.text}`);
}

// Show max group size
const groupSizes = {};
for (const tag of resultTags.filter(t => t.majorGroup)) {
  const k = `${tag.step}|${tag.subcategory||'General'}|${tag.majorGroup}>${tag.minorGroup}`;
  groupSizes[k] = (groupSizes[k] || 0) + 1;
}
report.push(`\n--- Largest groups (top 15) ---`);
Object.entries(groupSizes).sort((a,b) => b[1]-a[1]).slice(0,15).forEach(([k,c]) => report.push(`  [${c}] ${k}`));

const reportText = report.join('\n');
writeFileSync(REPORT, reportText, 'utf-8');
console.log(reportText);
