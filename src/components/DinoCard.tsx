import React from 'react';
import { Dinosaur } from '../types/dinosaur';
import { audioService } from '../services/audio';

interface DinoCardProps {
  dino: Dinosaur;
  isSelected: boolean;
  onSelect: (dino: Dinosaur) => void;
}

export const DinoCard: React.FC<DinoCardProps> = ({ dino, isSelected, onSelect }) => {
  const handleClick = () => {
    audioService.playTapSound();
    onSelect(dino);
  };

  const getDietIcon = (diet: string) => {
    if (diet === 'herbivore') return '🌿';
    if (diet === 'piscivore') return '🐟';
    return '🍖';
  };

  return (
    <button
      onClick={handleClick}
      className={`btn-chunky flex-shrink-0 flex items-center gap-3 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-3 text-left transition-all ${
        isSelected
          ? 'bg-amber-400 border-amber-600 shadow-playful scale-[1.03] text-safari-900'
          : 'bg-white hover:bg-safari-50 border-safari-300 shadow-playful-sm text-safari-800'
      }`}
    >
      {/* Icon Avatar */}
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner border border-black/10"
        style={{ backgroundColor: dino.colorTheme.accent + '25' }}
      >
        {dino.id === 't-rex' && '🦖'}
        {dino.id === 'brachiosaurus' && '🦕'}
        {dino.id === 'diplodocus' && '🦕'}
        {dino.id === 'triceratops' && '🦏'}
        {dino.id === 'stegosaurus' && '🦎'}
        {dino.id === 'velociraptor' && '🐊'}
        {dino.id === 'ankylosaurus' && '🛡️'}
        {dino.id === 'spinosaurus' && '🐊'}
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-[130px]">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-base sm:text-lg leading-tight tracking-wide font-bubble">
            {dino.shortName}
          </span>
          <span className="text-xs">{getDietIcon(dino.diet)}</span>
        </div>
        <span className="text-xs text-safari-800/70 font-semibold truncate max-w-[140px]">
          {dino.meaning.split('(')[0].trim()}
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/70 border border-safari-300">
            {dino.lengthMeters}m Long
          </span>
        </div>
      </div>
    </button>
  );
};
