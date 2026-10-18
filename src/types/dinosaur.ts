export type DietType = 'carnivore' | 'herbivore' | 'piscivore';

export type DinoViewMode = 'exterior' | 'skeleton';

export interface DinoSuperpower {
  title: string;
  description: string;
  emoji: string;
}

export interface Dinosaur {
  id: string;
  name: string;
  shortName: string;
  pronunciation: string;
  meaning: string;
  period: string;
  diet: DietType;
  dietLabel: string;
  lengthMeters: number;
  heightMeters: number;
  weightTons: number;
  speedKmh: number;
  funFacts: string[];
  superpower: DinoSuperpower;
  soundType: 'deep-roar' | 'sauropod-call' | 'screech' | 'bellow' | 'growl';
  colorTheme: {
    accent: string;
    skinTone: string;
    modelSkinColor: number;
    modelUnderbellyColor: number;
    modelPatternColor: number;
  };
  sizeComparison: {
    kidHeightMultiplier: number; // e.g. 5 means 5 kids stacked high
    busLengthPercent: number; // e.g. 120 means 1.2 school buses long
  };
  /** Short, careful note about scales or feathers for this species. */
  skinNote: string;
}
