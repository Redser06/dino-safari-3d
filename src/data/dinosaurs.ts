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
      description: 'Can bite with over 12,000 pounds of force — enough to easily crunch right through solid bone!',
      emoji: '💥'
    },
    soundType: 'deep-roar',
    colorTheme: {
      accent: '#E07A5F',
      skinTone: 'Lizard Forest Green & Earth Clay',
      modelSkinColor: 0x475e3e,
      modelUnderbellyColor: 0xd4ba88,
      modelPatternColor: 0x2b3824
    },
    sizeComparison: {
      kidHeightMultiplier: 4,
      busLengthPercent: 125
    }
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
      accent: '#2E7D32',
      skinTone: 'Deep Canopy Olive & Slate Grey',
      modelSkinColor: 0x586950,
      modelUnderbellyColor: 0xdfd7c2,
      modelPatternColor: 0x3d4b38
    },
    sizeComparison: {
      kidHeightMultiplier: 12,
      busLengthPercent: 220
    }
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
      'Supersonic Tail: Its 14-meter-long whip tail had 80 vertebrae and could crack louder than a cannon!',
      'Pencil Teeth: It had comb-like teeth at the front of its mouth to rake leaves right off branches.',
      'Super Long: Stretched longer than two full city buses parked nose to tail.',
      'Gentle Giant: Traveled in peaceful family herds across Jurassic floodplains.'
    ],
    superpower: {
      title: 'Sonic Boom Tail Whip',
      description: 'Can flick the tip of its whip-like tail faster than the speed of sound to frighten away hungry predators!',
      emoji: '⚡'
    },
    soundType: 'sauropod-call',
    colorTheme: {
      accent: '#0D9488',
      skinTone: 'Moss Bronze & River Clay',
      modelSkinColor: 0x5a6351,
      modelUnderbellyColor: 0xd9ceb5,
      modelPatternColor: 0x3d4734
    },
    sizeComparison: {
      kidHeightMultiplier: 4.5,
      busLengthPercent: 260
    }
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
      accent: '#D97706',
      skinTone: 'Terracotta Ochre & Armored Brown',
      modelSkinColor: 0x825a38,
      modelUnderbellyColor: 0xe6cead,
      modelPatternColor: 0x52361e
    },
    sizeComparison: {
      kidHeightMultiplier: 3,
      busLengthPercent: 90
    }
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
      'Thagomizer Tail: Had four 60cm deadly tail spikes called a "thagomizer" to swing at attackers.',
      'Tiny Brain: Its brain was only about the size of a walnut or a lime, but it survived for millions of years!',
      'Blushing Plates: Blood vessels inside its back plates could flush bright colors to warn rivals.'
    ],
    superpower: {
      title: 'Spike Thagomizer Tail Swing',
      description: 'Swings its flexible 4-spiked tail club sideways like a spiked mace to defend against hungry Allosaurus!',
      emoji: '🗡️'
    },
    soundType: 'growl',
    colorTheme: {
      accent: '#EA580C',
      skinTone: 'Amber Earth & Crimson Plated Spines',
      modelSkinColor: 0x6e5b44,
      modelUnderbellyColor: 0xd9c5a3,
      modelPatternColor: 0x9e3820
    },
    sizeComparison: {
      kidHeightMultiplier: 4,
      busLengthPercent: 90
    }
  },
  {
    id: 'velociraptor',
    name: 'Velociraptor',
    shortName: 'Raptor',
    pronunciation: 'veh-LOSS-ih-RAP-tor',
    meaning: 'Swift Seizer / Speedy Thief',
    period: 'Late Cretaceous (75 – 71 Million Years Ago)',
    diet: 'carnivore',
    dietLabel: 'Agile Hunter 🍖',
    lengthMeters: 2.0,
    heightMeters: 0.8,
    weightTons: 0.02, // 20 kg
    speedKmh: 45,
    funFacts: [
      'Sickle Claw: Held a giant 9cm curved claw high off the ground so it stayed razor sharp for jumping!',
      'Balance Tail: Had stiff rod-like tendons along its tail to make lightning-quick turns while running.',
      'Super Fast: Could sprint at 45 km/h across sandy dunes, tracking fast lizards and small dinosaurs.',
      'Pack Smarts: Highly coordinated hunter with sharp night-vision eyes and keen hearing.'
    ],
    superpower: {
      title: 'Acrobatic Sickle-Claw Leap',
      description: 'Leaps high through the air with pinpoint balance, striking with its curved switchblade foot claw!',
      emoji: '🐾'
    },
    soundType: 'screech',
    colorTheme: {
      accent: '#059669',
      skinTone: 'Desert Sand & Striped Reptilian Hunter',
      modelSkinColor: 0x6e7d4d,
      modelUnderbellyColor: 0xe6dab8,
      modelPatternColor: 0x47392b
    },
    sizeComparison: {
      kidHeightMultiplier: 0.8,
      busLengthPercent: 20
    }
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
      title: 'Heavy Anvil Tail Club Smash',
      description: 'Can whip its massive 60kg bone club into an attacker’s legs, shattering bone with one strike!',
      emoji: '🔨'
    },
    soundType: 'bellow',
    colorTheme: {
      accent: '#78716C',
      skinTone: 'Bronze Stone & Spiked Carapace',
      modelSkinColor: 0x5e564d,
      modelUnderbellyColor: 0xd4c2a5,
      modelPatternColor: 0x3d352e
    },
    sizeComparison: {
      kidHeightMultiplier: 1.7,
      busLengthPercent: 80
    }
  },
  {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    shortName: 'Spino',
    pronunciation: 'SPY-noh-SORE-us',
    meaning: 'Spine Lizard (Giant back sail)',
    period: 'Late Cretaceous (99 – 93 Million Years Ago)',
    diet: 'piscivore',
    dietLabel: 'Giant Fish & Meat Hunter 🐟',
    lengthMeters: 15.0,
    heightMeters: 5.0,
    weightTons: 7.5,
    speedKmh: 20,
    funFacts: [
      'Giant Sail: Had a dramatic 2-meter tall sail along its spine, supported by huge bone neural spines.',
      'Croc Snout: Long narrow snout with cone-shaped interlocking teeth made especially for catching giant fish.',
      'River Monster: Was the first known dinosaur adapted to swim in prehistoric rivers and swamps.',
      'Longer than T-Rex: At 15 meters long, it was longer than Tyrannosaurus Rex!'
    ],
    superpower: {
      title: 'Aquatic River Ambush & Giant Sail',
      description: 'Glides silently through prehistoric waterways and strikes fish with lightning crocodile reflexes!',
      emoji: '🌊'
    },
    soundType: 'deep-roar',
    colorTheme: {
      accent: '#0284C7',
      skinTone: 'River Teal & Striped Sail Scales',
      modelSkinColor: 0x416866,
      modelUnderbellyColor: 0xd9e5d9,
      modelPatternColor: 0x223d3c
    },
    sizeComparison: {
      kidHeightMultiplier: 5,
      busLengthPercent: 150
    }
  }
];
