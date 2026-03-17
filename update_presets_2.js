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

// === More Anatomy & Body Types ===
add('nsfw-navel', 'Navel', 'nsfw_anatomy', 'navel, stomach, bare midriff');
add('nsfw-underboob', 'Underboob', 'nsfw_anatomy', 'underboob, partially covered breasts');
add('nsfw-sideboob', 'Sideboob', 'nsfw_anatomy', 'sideboob, profile breasts');
add('nsfw-jiggle', 'Jiggle', 'nsfw_anatomy', 'breast physics, bouncing breasts, soft skin');
add('nsfw-pregnant', 'Pregnant', 'nsfw_anatomy', 'pregnant, large belly, swollen belly');
add('nsfw-milf', 'MILF', 'nsfw_anatomy', 'milf, mature female, older woman');
add('nsfw-petite', 'Petite', 'nsfw_anatomy', 'petite, small body, flat chest, slim');
add('nsfw-chubby', 'Chubby', 'nsfw_anatomy', 'chubby, soft belly, thick figure');
add('nsfw-muscular-female', 'Muscle Girl', 'nsfw_anatomy', 'muscular female, tomboy, amazon, defined muscles');
add('nsfw-glossy-skin', 'Glossy Skin', 'nsfw_anatomy', 'glossy skin, oiled body, shiny skin');
add('nsfw-tattoos', 'Tattoos', 'nsfw_anatomy', 'body tattoos, lower back tattoo, tramp stamp');
add('nsfw-piercings', 'Piercings', 'nsfw_anatomy', 'nipple piercings, belly piercing, genital piercing');

// === More Poses ===
add('nsfw-jack-o-pose', 'Jack-O Pose', 'nsfw_pose', 'jack-o pose, arching back, touching ground');
add('nsfw-straddling', 'Straddling', 'nsfw_pose', 'straddling, sitting on lap, facing partner');
add('nsfw-face-down-ass-up', 'Face Down Ass Up', 'nsfw_pose', 'face down ass up, lifted waist, presenting rear');
add('nsfw-w-sitting', 'W-Sitting', 'nsfw_pose', 'w-sitting, legs bent outwards, submissive sitting');
add('nsfw-breast-resting', 'Resting Breasts', 'nsfw_pose', 'breasts resting on object, heavy breasts supported');
add('nsfw-presenting-pussy', 'Presenting Pussy', 'nsfw_pose', 'spreading legs, showing pussy, presenting lower body');
add('nsfw-groping-self', 'Groping Self', 'nsfw_pose', 'touching own breasts, hands on chest, squeezing own boobs');
add('nsfw-lifting-shirt', 'Lifting Shirt', 'nsfw_pose', 'lifting shirt, exposing torso, teasing');

// === More Acts ===
add('nsfw-69', '69 Position', 'nsfw_act', '69 position, mutual oral sex');
add('nsfw-licking', 'Licking', 'nsfw_act', 'licking, tongue out, long tongue');
add('nsfw-rimming', 'Rimming', 'nsfw_act', 'rimming, kissing ass, eating ass');
add('nsfw-tribadism', 'Scissoring / Trib', 'nsfw_act', 'tribadism, scissoring, lesbian sex, rubbing crotches together');
add('nsfw-squirt', 'Squirting', 'nsfw_act', 'squirting, female ejaculation, wet fluids');
add('nsfw-bukkake', 'Bukkake', 'nsfw_act', 'bukkake, multiple cumshots, covered in semen');
add('nsfw-gangbang', 'Gangbang', 'nsfw_act', 'gangbang, multiple males, surrounded by men');
add('nsfw-breast-feeding', 'Lactation', 'nsfw_act', 'lactation, breast feeding, squirting milk');
add('nsfw-fisting', 'Fisting', 'nsfw_act', 'fisting, extreme insertion, stretching');
add('nsfw-orgasm', 'Orgasm', 'nsfw_act', 'orgasm face, climax, extreme pleasure, shaking');
add('nsfw-choking', 'Choking', 'nsfw_act', 'choking, hand around neck, breathplay');
add('nsfw-pegging', 'Pegging', 'nsfw_act', 'pegging, wearing strap-on, dominant female');

// === More Clothing / Outfits / Fetish ===
add('nsfw-nun', 'Nun', 'nsfw_clothing', 'nun outfit, habit, religious clothing, slutty nun');
add('nsfw-nurse', 'Nurse', 'nsfw_clothing', 'nurse uniform, sexy nurse, hospital uniform');
add('nsfw-cheerleader', 'Cheerleader', 'nsfw_clothing', 'cheerleader outfit, pom-poms, mini skirt');
add('nsfw-gym-uniform', 'Gym Uniform', 'nsfw_clothing', 'gym uniform, buruma, bloomers');
add('nsfw-sukumizu', 'School Swimsuit', 'nsfw_clothing', 'sukumizu, japanese school swimsuit, one-piece swimsuit');
add('nsfw-bunny-girl', 'Bunny Girl', 'nsfw_clothing', 'bunny girl, playboy bunny, bunny ears, fishnet tights, leotard');
add('nsfw-catgirl', 'Catgirl', 'nsfw_clothing', 'catgirl, nekomimi, cat ears, tail, playful');
add('nsfw-succubus', 'Succubus', 'nsfw_clothing', 'succubus, bat wings, demon tail, horns, seductive');
add('nsfw-corset', 'Corset', 'nsfw_clothing', 'corset, tight lacing, cinched waist, waist training');
add('nsfw-garter-belt', 'Garter Belt', 'nsfw_clothing', 'garter belt, suspenders, holding up stockings');
add('nsfw-body-stockings', 'Body Stocking', 'nsfw_clothing', 'body stocking, full body fishnet, sheer catsuit');
add('nsfw-wet-clothes', 'Wet Clothes', 'nsfw_clothing', 'wet clothes, transparent clothes, clinging to body');
add('nsfw-leash', 'Leash', 'nsfw_clothing', 'leash, being led, submissive pet');

presets.push(...newPresets);

fs.writeFileSync(presetsPath, JSON.stringify(presets, null, 2), 'utf8');
console.log('Successfully updated JSON. Added', newPresets.length, 'MORE presets.');
