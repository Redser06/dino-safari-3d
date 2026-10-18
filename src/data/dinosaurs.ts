import { Dinosaur } from '../types/dinosaur';

export const DINOSAURS: Dinosaur[] = [
  {
    id: 't-rex',
    name: 'Tyrannosaurus Rex',
    shortName: 'T-Rex',
    pronunciation: 'ty-RAN-oh-SORE-us REKS',
    meaning: 'King of the Tyrant Lizards',
    period: 'Late Cretaceous (68 – 66 Million Years Ago)',
    diet: 'carnivore',
    dietLabel: 'Meat Eater 🍖',
    lengthMeters: 12.3,
    heightMeters: 4.0,
    weightTons: 8.5,
    speedKmh: 27,
    funFacts: [
      'Banana Teeth: Its teeth were up to 30 cm long — as big and sharp as giant bananas!',
      'Super Chomp: Had the strongest bite of any land animal that ever walked the Earth.',
      'Tiny Arms: Its little arms were only 1 meter long, but surprisingly strong with 2 sharp claws.',
      'Super Smeller: It had giant scent lobes to sniff out food miles away through prehistoric forests!'
    ],
    superpower: {
      title: 'Mega Bone-Crusher Chomp',
      description: 'A very strong bite — strong enough to crunch bone.',
      emoji: '💥'
    },
    soundType: 'deep-roar',
    colorTheme: {
      accent: '#C86446',
      skinTone: 'Weathered Olive-Bronze & Charcoal Hide',
      modelSkinColor: 0x52593e,
      modelUnderbellyColor: 0xcdc0a2,
      modelPatternColor: 0x2a2f20
    },
    sizeComparison: {
      kidHeightMultiplier: 4,
      busLengthPercent: 125
    },
    skinNote: 'No feather coat. The T. rex skin fossils scientists have found are scales, not feathers.'
  },
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    shortName: 'Brachio',
    pronunciation: 'BRACK-ee-oh-SORE-us',
    meaning: 'Arm Lizard (Front legs longer than back)',
    period: 'Late Jurassic (154 – 150 Million Years Ago)',
    diet: 'herbivore',
    dietLabel: 'Tree-Top Leaf Eater 🌿',
    lengthMeters: 22.0,
    heightMeters: 13.0,
    weightTons: 40.0,
    speedKmh: 15,
    funFacts: [
      'Sky High Neck: As tall as a 4-story building! It could reach the highest leaves on ancient pine trees.',
      'Giant Heart: Its heart weighed over 200 kg (as heavy as 6 grown-ups!) to pump blood all the way up its neck.',
      'Warm Giant: Ate over 400 kilograms of leaves and ferns every single day without chewing!',
      'Gizzard Stones: Swallowed smooth rocks (gastroliths) to help grind up tough branches in its tummy.'
    ],
    superpower: {
      title: 'Sky-Canopy High Browser',
      description: 'Its immense vertical neck lets it feast on lush tree canopies that no other dinosaur could reach!',
      emoji: '🦒'
    },
    soundType: 'sauropod-call',
    colorTheme: {
      accent: '#3D6B48',
      skinTone: 'Elephantine Canopy Olive & Lichen Slate',
      modelSkinColor: 0x5b634f,
      modelUnderbellyColor: 0xd4c9b0,
      modelPatternColor: 0x353b2c
    },
    sizeComparison: {
      kidHeightMultiplier: 12,
      busLengthPercent: 220
    },
    skinNote: 'No feathers. Tall plant-eaters like Brachiosaurus had scaly skin.'
  },
  {
    id: 'diplodocus',
    name: 'Diplodocus',
    shortName: 'Diplo',
    pronunciation: 'dih-PLOD-uh-kus',
    meaning: 'Double Beam (Special backbone bones)',
    period: 'Late Jurassic (154 – 152 Million Years Ago)',
    diet: 'herbivore',
    dietLabel: 'Fern Grazer 🌿',
    lengthMeters: 26.0,
    heightMeters: 4.5,
    weightTons: 15.0,
    speedKmh: 18,
    funFacts: [
      'Long Tail: Its tail was about as long as the rest of its body and could swish to say "please give me room."',
      'Pencil Teeth: It had comb-like teeth at the front of its mouth to rake leaves right off branches.',
      'Super Long: Stretched longer than two full city buses parked nose to tail.',
      'Gentle Giant: Traveled in peaceful family herds across Jurassic floodplains.'
    ],
    superpower: {
      title: 'Long Swishy Tail',
      description: 'A very long tail helped it balance and could swish if another animal came too close.',
      emoji: '⚡'
    },
    soundType: 'sauropod-call',
    colorTheme: {
      accent: '#4D6B53',
      skinTone: 'Riverbed Bronze-Umber & Moss Taupe',
      modelSkinColor: 0x645a47,
      modelUnderbellyColor: 0xd4c5a8,
      modelPatternColor: 0x383225
    },
    sizeComparison: {
      kidHeightMultiplier: 4.5,
      busLengthPercent: 260
    },
    skinNote: 'No feathers. Diplodocus skin fossils are small pebble-like scales.'
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    shortName: 'Trike',
    pronunciation: 'try-SER-uh-tops',
    meaning: 'Three-Horned Face',
    period: 'Late Cretaceous (68 – 66 Million Years Ago)',
    diet: 'herbivore',
    dietLabel: 'Tough Shrub Eater 🌿',
    lengthMeters: 9.0,
    heightMeters: 3.0,
    weightTons: 9.0,
    speedKmh: 30,
    funFacts: [
      'Three Solid Horns: Two huge 1-meter brow horns above its eyes and one nasal horn over its snout.',
      'Giant Shield: Its solid bone neck frill protected its neck like a knight’s shield against T-Rex teeth.',
      'Parrot Beak: Had a powerful beak that could snap through thick palms, cycads, and prehistoric bushes.',
      'Heavyweight Defender: A herd of Triceratops would form a protective ring around their young babies!'
    ],
    superpower: {
      title: 'Titan Horn Charge & Armor Shield',
      description: 'Points its sharp horns forward and locks its heavy armored bone shield to deflect predator attacks!',
      emoji: '🛡️'
    },
    soundType: 'bellow',
    colorTheme: {
      accent: '#B46535',
      skinTone: 'Earthy Sienna-Ochre & Weathered Umber',
      modelSkinColor: 0x6f553e,
      modelUnderbellyColor: 0xd6c3a5,
      modelPatternColor: 0x3d2a1b
    },
    sizeComparison: {
      kidHeightMultiplier: 3,
      busLengthPercent: 90
    },
    skinNote: 'No feathers. Triceratops skin fossils are bumpy scales.'
  },
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    shortName: 'Stego',
    pronunciation: 'STEG-oh-SORE-us',
    meaning: 'Roofed or Plated Lizard',
    period: 'Late Jurassic (155 – 150 Million Years Ago)',
    diet: 'herbivore',
    dietLabel: 'Low Bush Eater 🌿',
    lengthMeters: 9.0,
    heightMeters: 4.2,
    weightTons: 5.0,
    speedKmh: 12,
    funFacts: [
      'Back Plates: 17 diamond-shaped bone plates lined its back, acting like solar panels and shields!',
      'Thagomizer Tail: Four long spikes sat at the end of its tail. It could swing them if a meat-eater came too close.',
      'Tiny Brain: Its brain was only about the size of a walnut or a lime, but it survived for millions of years!',
      'Blushing Plates: Blood vessels inside its back plates could flush bright colors to warn rivals.'
    ],
    superpower: {
      title: 'Spike Thagomizer Tail Swing',
      description: 'Four tail spikes could swing sideways if another dinosaur got too close.',
      emoji: '🗡️'
    },
    soundType: 'growl',
    colorTheme: {
      accent: '#B85435',
      skinTone: 'Walnut Earth & Keratinous Terracotta Plates',
      modelSkinColor: 0x665640,
      modelUnderbellyColor: 0xd2c0a0,
      modelPatternColor: 0x733824
    },
    sizeComparison: {
      kidHeightMultiplier: 4,
      busLengthPercent: 90
    },
    skinNote: 'No feathers. Stegosaurus had scaly skin and bony plates.'
  },
  {
    id: 'iguanodon',
    name: 'Iguanodon',
    shortName: 'Iggy',
    pronunciation: 'ig-WAN-oh-don',
    meaning: 'Iguana Tooth',
    period: 'Early Cretaceous (about 126 – 122 Million Years Ago)',
    diet: 'herbivore',
    dietLabel: 'Gentle Plant Eater 🌿',
    lengthMeters: 10,
    heightMeters: 3,
    weightTons: 4.5,
    speedKmh: 20,
    funFacts: [
      'Thumb Spike: Each hand had a pointy thumb spike. It may have helped pull plants closer, or asked other animals for a little space.',
      'Two Ways to Walk: Iguanodon could stroll on four legs, and it could rise up on two legs to reach leaves.',
      'Plant Beak: A beak at the front of its mouth snipped leaves, and flat teeth mashed them up.',
      'Calm Herds: Lots of Iguanodon bones are found together, so they may have traveled in peaceful groups.'
    ],
    superpower: {
      title: 'Helpful Thumb Spike',
      description: 'A sturdy spike on each thumb helped it handle tough plants and keep a little room around itself.',
      emoji: '👍'
    },
    soundType: 'bellow',
    colorTheme: {
      accent: '#6B8F71',
      skinTone: 'Soft Fern Green & Cream Belly',
      modelSkinColor: 0x6d7a52,
      modelUnderbellyColor: 0xe4d5b8,
      modelPatternColor: 0x3e4a32
    },
    sizeComparison: {
      kidHeightMultiplier: 3,
      busLengthPercent: 85
    },
    skinNote: 'No feathers. Iguanodon did not have feathers. It had scaly skin, like other big plant-eaters in its family.'
  },
  {
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    shortName: 'Anky',
    pronunciation: 'an-KY-loh-SORE-us',
    meaning: 'Fused or Stiff Lizard',
    period: 'Late Cretaceous (68 – 66 Million Years Ago)',
    diet: 'herbivore',
    dietLabel: 'Fern & Shrub Grazer 🌿',
    lengthMeters: 8.0,
    heightMeters: 1.7,
    weightTons: 6.0,
    speedKmh: 10,
    funFacts: [
      'Walking Tank: Covered from nose to tail in thick bony armor plates (osteoderms) and side spikes.',
      'Wrecking Ball Tail: Its tail ended in a heavy fused bone club as solid as an iron anvil!',
      'Armored Eyelids: Even its eyelids had protective bone plates so it could blink safely in a battle.',
      'Low to the Ground: When attacked, it crouched flat against the ground so predators could not flip it over.'
    ],
    superpower: {
      title: 'Heavy Tail Club',
      description: 'A heavy bone club on its tail could swing if another animal got too close.',
      emoji: '🔨'
    },
    soundType: 'bellow',
    colorTheme: {
      accent: '#78716C',
      skinTone: 'Bronze Stone & Spiked Carapace',
      modelSkinColor: 0x5d554b,
      modelUnderbellyColor: 0xd2c2a8,
      modelPatternColor: 0x38322b
    },
    sizeComparison: {
      kidHeightMultiplier: 1.7,
      busLengthPercent: 80
    },
    skinNote: 'No feathers. Ankylosaurus was covered in bony armor and scales.'
  },
  {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    shortName: 'Spino',
    pronunciation: 'SPY-noh-SORE-us',
    meaning: 'Spine Lizard (Giant back sail)',
    period: 'Late Cretaceous (99 – 93 Million Years Ago)',
    diet: 'piscivore',
    dietLabel: 'Mostly Fish 🐟',
    lengthMeters: 15.0,
    heightMeters: 5.0,
    weightTons: 7.5,
    speedKmh: 20,
    funFacts: [
      'Giant Sail: Had a dramatic 2-meter tall sail along its spine, supported by huge bone neural spines.',
      'Croc Snout: Long narrow snout with cone-shaped interlocking teeth made especially for catching giant fish.',
      'Swimming Debate: Spinosaurus lived beside rivers and ate fish. Scientists still debate how well it could swim. Some think it swam. Others think it mostly waded.',
      'Longer than T-Rex: At 15 meters long, it was longer than Tyrannosaurus Rex!'
    ],
    superpower: {
      title: 'River Fish Catcher',
      description: 'Its long snout was good for catching fish. Scientists agree it lived by water, and they are still studying how much it swam.',
      emoji: '🐟'
    },
    soundType: 'deep-roar',
    colorTheme: {
      accent: '#4F6D5A',
      skinTone: 'Nile-Crocodile Olive & River-Slate Sail',
      modelSkinColor: 0x525b44,
      modelUnderbellyColor: 0xd1c5a8,
      modelPatternColor: 0x2e3524
    },
    sizeComparison: {
      kidHeightMultiplier: 5,
      busLengthPercent: 150
    },
    skinNote: 'No feathers have been found on Spinosaurus. Scientists think its skin was scaly. How well it swam is still debated.'
  }
];
