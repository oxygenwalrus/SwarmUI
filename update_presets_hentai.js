const fs = require('fs');
const path = require('path');

const presetsPath = path.join(__dirname, 'swarmui-react', 'src', 'data', 'promptPresets.json');
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));

const newPresets = [];

function add(id, name, cat, promptText) {
    if (!presets.find(p => p.id === id)) {
        newPresets.push({
            id,
            name,
            category: cat,
            promptText,
            isDefault: true
        });
    }
}

// === Hentai Specific Perspectives & Angles ===
add('nsfw-pov-crotch', 'POV Crotch', 'nsfw_pose', 'pov crotch, view from between legs, looking up from crotch');
add('nsfw-pov-feet', 'POV Feet', 'nsfw_pose', 'pov feet, looking up from feet, stepping on viewer');
add('nsfw-pov-penis', 'POV Penis', 'nsfw_pose', 'pov looking down at penis, first person sex, pov penetration');
add('nsfw-from-below', 'From Below (Panty Shot)', 'nsfw_pose', 'from below, low angle, looking up skirt, panty shot');
add('nsfw-x-ray', 'X-Ray / Cross Section', 'nsfw_pose', 'x-ray, cross-section, internal view, showing penetration inside');
add('nsfw-close-up-pussy', 'Close Up Pussy', 'nsfw_pose', 'extreme close up pussy, macro focus genitalia');
add('nsfw-wormhole', 'Wormhole View', 'nsfw_pose', 'looking out from inside vagina, pov from inside');

// === Explicit Hentai Poses ===
add('nsfw-m-legs', 'M-Legs', 'nsfw_pose', 'm-legs, legs spread wide in M shape, showing crotch');
add('nsfw-v-legs', 'V-Legs', 'nsfw_pose', 'v-legs, legs raised in V shape, presenting');
add('nsfw-frogtie', 'Frogtie', 'nsfw_pose', 'frogtie, legs tied back, exposed crotch');
add('nsfw-split', 'Doing a Split', 'nsfw_pose', 'doing a split, legs apart, extreme flexibility');
add('nsfw-prone-bone', 'Prone Bone', 'nsfw_pose', 'prone bone, flat on stomach, rear entry, face down ass up');
add('nsfw-amazon', 'Amazon Position', 'nsfw_pose', 'amazon position, woman on top pinning man, dominant riding');
add('nsfw-suspended-congress', 'Suspended Congress', 'nsfw_pose', 'suspended congress, held in air, carried while mating');
add('nsfw-piledriver', 'Piledriver', 'nsfw_pose', 'piledriver position, upside down penetration, extreme pose');
add('nsfw-legs-over-shoulders', 'Legs Over Shoulders', 'nsfw_pose', 'legs over shoulders, deep penetration pose, missionary variants');
add('nsfw-breast-smother', 'Breast Smother', 'nsfw_pose', 'breast smother, face buried in breasts, smothered');
add('nsfw-facesitting', 'Facesitting', 'nsfw_pose', 'facesitting, sitting on face, smothering, oral');
add('nsfw-trampling', 'Trampling', 'nsfw_pose', 'trampling, stepping on face, stepping on chest, dominant');

// === More Hentai Acts / Tags ===
add('nsfw-mind-control', 'Mind Control', 'nsfw_act', 'mind control, blank eyes, hypno, corrupted');
add('nsfw-tentacles', 'Tentacles', 'nsfw_act', 'tentacles, tentacle sex, slime, bound by tentacles');
add('nsfw-machine', 'Machine Sex', 'nsfw_act', 'fucking machine, sybian, sex toy machine');
add('nsfw-dildo', 'Dildo Insertion', 'nsfw_act', 'using a dildo, double dildo, vibrator');
add('nsfw-gloryhole', 'Gloryhole', 'nsfw_act', 'gloryhole, penis through wall, anonymous sex');
add('nsfw-bukakke-pool', 'Bukkake Pool', 'nsfw_act', 'bukkake, completely covered in cum, swimming in cum');
add('nsfw-stomach-bulge', 'Stomach Bulge', 'nsfw_act', 'stomach bulge, deep penetration, visible outline in stomach');
add('nsfw-cervix', 'Cervix Penetration', 'nsfw_act', 'hitting cervix, womb opening, extremely deep');
add('nsfw-impregnation', 'Impregnation', 'nsfw_act', 'impregnation, cum inside womb, internal cumshot');
add('nsfw-nakadashi', 'Nakadashi', 'nsfw_act', 'nakadashi, cumming inside, overflowing sperm');
add('nsfw-milk-spray', 'Milk Spray', 'nsfw_act', 'breast milk spraying, excessive lactation');
add('nsfw-gokkun', 'Gokkun', 'nsfw_act', 'gokkun, swallowing cum, drinking semen');
add('nsfw-uro', 'Watersports', 'nsfw_act', 'watersports, urination, peeing');
add('nsfw-spit-roast', 'Spit Roast', 'nsfw_act', 'spit roast, double penetration, oral and vaginal simultaneously');
add('nsfw-gangbang-2', 'Gangbang (Extreme)', 'nsfw_act', 'gangbang, surrounded by men, multiple penises, overwhelming');

presets.push(...newPresets);

fs.writeFileSync(presetsPath, JSON.stringify(presets, null, 2), 'utf8');
console.log('Successfully updated JSON. Added', newPresets.length, 'MORE hentai specific presets.');
