const fs = require('fs');
const path = require('path');

const presetsPath = path.join(__dirname, 'swarmui-react', 'src', 'data', 'promptPresets.json');
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));

// Re-categorize some existing ones if necessary:
const mappings = {
    'nsfw-large-breasts': 'nsfw_anatomy',
    'nsfw-medium-breasts': 'nsfw_anatomy',
    'nsfw-small-breasts': 'nsfw_anatomy',
    'nsfw-huge-breasts': 'nsfw_anatomy',
    'nsfw-nipples': 'nsfw_anatomy',
    'nsfw-pussy': 'nsfw_anatomy',
    'nsfw-ass': 'nsfw_anatomy',
    'nsfw-penis': 'nsfw_anatomy',
    'nsfw-cum': 'nsfw_act', // or anatomy/liquid
    'nsfw-sex': 'nsfw_act',
    'nsfw-oral': 'nsfw_act',
    'nsfw-anal': 'nsfw_act',
    'nsfw-paizuri': 'nsfw_act',
    'nsfw-missionary': 'nsfw_pose',
    'nsfw-doggystyle': 'nsfw_pose',
    'nsfw-cowgirl': 'nsfw_pose',
    'nsfw-latex': 'nsfw_clothing',
    'nsfw-leather': 'nsfw_clothing',
    'nsfw-bondage': 'nsfw_pose', // or nsfw_clothing (gear)
    'nsfw-maid': 'nsfw_clothing',
    'nsfw-school-uniform': 'nsfw_clothing',
    'nsfw-stockings': 'nsfw_clothing',
    'nsfw-public': 'nsfw_act',
    'nsfw-bed': 'nsfw_pose',
    'nsfw-shower': 'nsfw_pose',
    'nsfw-lingerie': 'nsfw_clothing',
    'nsfw-bikini': 'nsfw_clothing',
    'nsfw-undressed': 'nsfw_act', // or nsfw_clothing (state)
};

presets.forEach(p => {
    if (mappings[p.id]) {
        p.category = mappings[p.id];
    }
});

// Now generate a ton of new presets!
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

// === Anatomy ===
add('nsfw-thighs', 'Thighs', 'nsfw_anatomy', 'thick thighs, soft thighs, prominent thighs');
add('nsfw-abs', 'Abs', 'nsfw_anatomy', 'muscular abs, toned abs, defined stomach');
add('nsfw-collarbone', 'Collarbone', 'nsfw_anatomy', 'defined collarbone, clavicle');
add('nsfw-hips', 'Hips', 'nsfw_anatomy', 'wide hips, hourglass figure, curvy hips');
add('nsfw-cameltoe', 'Cameltoe', 'nsfw_anatomy', 'cameltoe, visible labia through clothes');
add('nsfw-ahegao', 'Ahegao', 'nsfw_anatomy', 'ahegao face, rolled back eyes, tongue out, drooling');
add('nsfw-blush', 'Heavy Blush', 'nsfw_anatomy', 'heavy blush, flushed face, blushing deeply');
add('nsfw-sweat', 'Sweat', 'nsfw_anatomy', 'sweat drops, sweaty body, glistening skin, wet skin');
add('nsfw-areola', 'Areola', 'nsfw_anatomy', 'large areola, puffy nipples, protruding nipples');
add('nsfw-tanlines', 'Tanlines', 'nsfw_anatomy', 'swimsuit tanlines, bikini tanlines, visible tan body');
add('nsfw-pubic-hair', 'Pubic Hair', 'nsfw_anatomy', 'pubic hair, untrimmed, hairy, landing strip');
add('nsfw-shaved', 'Shaved', 'nsfw_anatomy', 'hairless, completely shaved, smooth skin, bald pussy');

// === Poses ===
add('nsfw-presenting', 'Presenting', 'nsfw_pose', 'presenting rear, bent over, looking back');
add('nsfw-spread-eagle', 'Spread Eagle', 'nsfw_pose', 'spread eagle, lying on back, fully spread legs');
add('nsfw-legs-up', 'Legs Up', 'nsfw_pose', 'legs up, pulling legs up, holding legs');
add('nsfw-mating-press', 'Mating Press', 'nsfw_pose', 'mating press position, legs squeezed, deep penetration');
add('nsfw-spitroast', 'Spitroast', 'nsfw_pose', 'spitroast position, sandwiched, double penetration pose');
add('nsfw-reverse-cowgirl', 'Reverse Cowgirl', 'nsfw_pose', 'reverse cowgirl, riding, facing away');
add('nsfw-lotus', 'Lotus Position', 'nsfw_pose', 'lotus position sex, sitting sex, facing each other');
add('nsfw-standing-sex', 'Standing Sex', 'nsfw_pose', 'standing sex, pinned against wall, holding up');
add('nsfw-all-fours', 'All Fours', 'nsfw_pose', 'all fours, crawling posture, hands and knees, doggy position');
add('nsfw-kneeling', 'Kneeling', 'nsfw_pose', 'kneeling, on knees, looking up, submissive posture');
add('nsfw-squatting', 'Squatting', 'nsfw_pose', 'squatting, crouched, resting on heels');
add('nsfw-stretching', 'Stretching', 'nsfw_pose', 'stretching arms, arching back, thrusting chest out');
add('nsfw-bound', 'Bound Pose', 'nsfw_pose', 'arms tied behind back, hogtie, suspended, restrained');
add('nsfw-pov', 'POV', 'nsfw_pose', 'point of view, first person view, POV looking down');

// === Acts ===
add('nsfw-masturbation', 'Masturbation', 'nsfw_act', 'masturbation, playing with self, fingering, rubbing');
add('nsfw-creampie', 'Creampie', 'nsfw_act', 'creampie, cum inside, overflowing cum, dripping cum');
add('nsfw-facial', 'Facial', 'nsfw_act', 'cum on face, facial, bukkake, cum covered');
add('nsfw-deepthroat', 'Deepthroat', 'nsfw_act', 'deepthroat, choking, teary eyes, forced oral');
add('nsfw-handjob', 'Handjob', 'nsfw_act', 'handjob, stroking, gripping shaft');
add('nsfw-footjob', 'Footjob', 'nsfw_act', 'footjob, rubbing with feet, stockings teasing');
add('nsfw-fingering', 'Fingering', 'nsfw_act', 'fingering, insertion, playing with pussy');
add('nsfw-kissing', 'Deep Kissing', 'nsfw_act', 'french kiss, deep kissing, saliva trail, tongue kissing');
add('nsfw-grinding', 'Grinding', 'nsfw_act', 'grinding, dry humping, rubbing against');
add('nsfw-titfuck', 'Titfuck', 'nsfw_act', 'titfuck, paizuri, pressing breasts together, cock between boobs');
add('nsfw-double-penetration', 'Double Penetration (DP)', 'nsfw_act', 'double penetration, DP, two cocks, stretched');
add('nsfw-threesome', 'Threesome', 'nsfw_act', 'threesome, group sex, multiple partners');
add('nsfw-groping', 'Groping', 'nsfw_act', 'groping, squeezing breasts, grabbing ass, touching');
add('nsfw-spanking', 'Spanking', 'nsfw_act', 'spanking, red marks on skin, slapping');

// === Clothing ===
add('nsfw-micro-bikini', 'Micro Bikini', 'nsfw_clothing', 'micro bikini, slingshot bikini, extremely revealing, string top');
add('nsfw-crotchless', 'Crotchless Panties', 'nsfw_clothing', 'crotchless panties, exposed pussy, open crotch');
add('nsfw-pasties', 'Pasties', 'nsfw_clothing', 'nipple pasties, star pasties, heart pasties, tape');
add('nsfw-fishnets', 'Fishnets', 'nsfw_clothing', 'fishnet tights, fishnet stockings, fishnet bodysuit');
add('nsfw-collar', 'Collar & Leash', 'nsfw_clothing', 'leather collar, choker, attached leash, pet play');
add('nsfw-gag', 'Gag', 'nsfw_clothing', 'ball gag, ring gag, bit gag, mouth stuffed');
add('nsfw-blindfold', 'Blindfold', 'nsfw_clothing', 'blindfold, blindfolded, covered eyes');
add('nsfw-shibari', 'Shibari', 'nsfw_clothing', 'shibari, intricate rope binding, kinbaku, decorative ropes');
add('nsfw-see-through', 'See-through', 'nsfw_clothing', 'see-through clothing, wet shirt, translucent dress, sheer fabric');
add('nsfw-thong', 'Thong', 'nsfw_clothing', 'thong, g-string, t-back, exposed cheeks');
add('nsfw-harness', 'Harness', 'nsfw_clothing', 'leather harness, body harness, strappy lingerie');
add('nsfw-skirt-lift', 'Skirt Lift', 'nsfw_clothing', 'lifting skirt, holding skirt up, flashing panties');
add('nsfw-unbuttoning', 'Unbuttoning', 'nsfw_clothing', 'unbuttoning shirt, half-open jacket, exposing cleavage');
add('nsfw-apron', 'Naked Apron', 'nsfw_clothing', 'naked apron, wearing only an apron, bare back, sideboob');

presets.push(...newPresets);

fs.writeFileSync(presetsPath, JSON.stringify(presets, null, 2), 'utf8');
console.log('Successfully updated JSON. Added', newPresets.length, 'new presets.');
