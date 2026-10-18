import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DINOSAURS } from '../data/dinosaurs';

describe('dinosaur facts', () => {
  it('replaces Velociraptor with a gentle Iguanodon and drops the night-vision claim', () => {
    const ids = DINOSAURS.map((dino) => dino.id);
    expect(ids).not.toContain('velociraptor');
    expect(ids).toContain('iguanodon');

    const source = [
      readFileSync('src/data/dinosaurs.ts', 'utf8'),
      readFileSync('src/components/DinoCard.tsx', 'utf8'),
      readFileSync('src/components/FossilQuizModal.tsx', 'utf8'),
      readFileSync('src/components/ThreeDinoViewer.tsx', 'utf8'),
      readFileSync('src/components/dino3d/dinoModels.ts', 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/velociraptor/i);
    expect(source).not.toMatch(/night[ -]?vision/i);

    const iguanodon = DINOSAURS.find((dino) => dino.id === 'iguanodon');
    expect(iguanodon?.diet).toBe('herbivore');
    expect(iguanodon?.funFacts.join(' ').toLowerCase()).toMatch(/thumb spike/);
    expect(iguanodon?.skinNote.toLowerCase()).toMatch(/no feathers/);
  });

  it('marks Spinosaurus swimming as debated and corrects feather claims', () => {
    const spino = DINOSAURS.find((dino) => dino.id === 'spinosaurus');
    const copy = `${spino?.funFacts.join(' ')} ${spino?.superpower.description} ${spino?.skinNote}`;
    expect(copy.toLowerCase()).toMatch(/debat/);
    expect(copy.toLowerCase()).not.toMatch(/adapted to swim|first known dinosaur/);

    const noFeatherIds = [
      'brachiosaurus',
      'diplodocus',
      'triceratops',
      'stegosaurus',
      'ankylosaurus',
      'iguanodon',
    ];
    for (const id of noFeatherIds) {
      const dino = DINOSAURS.find((entry) => entry.id === id);
      expect(dino?.skinNote.toLowerCase(), id).toMatch(/no feathers|did not have feathers/);
    }

    const trex = DINOSAURS.find((dino) => dino.id === 't-rex');
    expect(trex?.skinNote.toLowerCase()).toMatch(/scales/);
    expect(trex?.skinNote.toLowerCase()).toMatch(/feather/);
  });
});
