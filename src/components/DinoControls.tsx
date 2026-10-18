import React from 'react';
import { Dinosaur, DinoViewMode } from '../types/dinosaur';
import { audioService } from '../services/audio';
import { Volume2, Sparkles } from 'lucide-react';

interface DinoControlsProps {
  dino: Dinosaur;
  viewMode: DinoViewMode;
  onViewModeChange: (mode: DinoViewMode) => void;
}

export const DinoControls: React.FC<DinoControlsProps> = ({
  dino,
  viewMode,
  onViewModeChange,
}) => {
  const handleModeChange = (mode: DinoViewMode) => {
    audioService.playTapSound();
    onViewModeChange(mode);
  };

  const handleRoar = () => {
    audioService.playDinoSound(dino.soundType);
  };

  const handlePronounce = () => {
    audioService.playTapSound();
    audioService.speakDinoName(dino.name);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. Living Reptilian Skin vs Museum Fossil Skeleton Switcher */}
      <div className="bg-white p-2 sm:p-2.5 rounded-3xl border-3 border-safari-300 shadow-playful flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-xs sm:text-sm font-bold text-safari-800 px-2 flex items-center gap-1.5 self-start sm:self-center">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span id="anatomy-mode-label">Skin or skeleton:</span>
        </div>

        <div
          className="grid grid-cols-2 gap-2 w-full sm:w-auto"
          role="group"
          aria-labelledby="anatomy-mode-label"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              handleModeChange(viewMode === 'exterior' ? 'skeleton' : 'exterior');
            }
          }}
        >
          <button
            type="button"
            onClick={() => handleModeChange('exterior')}
            aria-pressed={viewMode === 'exterior'}
            aria-label="Show living skin"
            className={`btn-chunky flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-extrabold border-2 ${
              viewMode === 'exterior'
                ? 'bg-jungle-600 text-white border-jungle-800 shadow-playful-sm scale-[1.02]'
                : 'bg-safari-100 text-safari-800 border-safari-300 hover:bg-safari-200'
            }`}
          >
            <span className="text-base sm:text-lg" aria-hidden="true">🦖</span>
            <span>Living Skin</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('skeleton')}
            aria-pressed={viewMode === 'skeleton'}
            aria-label="Show fossil skeleton"
            className={`btn-chunky flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-extrabold border-2 ${
              viewMode === 'skeleton'
                ? 'bg-amber-500 text-white border-amber-700 shadow-playful-sm scale-[1.02]'
                : 'bg-bone-100 text-amber-900 border-bone-300 hover:bg-bone-200'
            }`}
          >
            <span className="text-base sm:text-lg" aria-hidden="true">🦴</span>
            <span>Fossil Skeleton</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Sound & Speech Action Buttons */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Roar Button */}
        <button
          onClick={handleRoar}
          className="btn-chunky flex items-center justify-center gap-2 py-3 px-4 rounded-2xl sm:rounded-3xl bg-terracotta-500 hover:bg-terracotta-600 text-white border-3 border-terracotta-700 shadow-playful text-sm sm:text-base font-extrabold"
        >
          <span className="text-2xl animate-bounce">📢</span>
          <div className="flex flex-col text-left">
            <span className="leading-tight">Hear My Roar!</span>
            <span className="text-[11px] font-medium opacity-90">Sound Effect</span>
          </div>
        </button>

        {/* Pronounce Name Button */}
        <button
          onClick={handlePronounce}
          className="btn-chunky flex items-center justify-center gap-2 py-3 px-4 rounded-2xl sm:rounded-3xl bg-amber-400 hover:bg-amber-500 text-safari-900 border-3 border-amber-600 shadow-playful text-sm sm:text-base font-extrabold"
        >
          <Volume2 className="w-6 h-6 text-safari-900" />
          <div className="flex flex-col text-left">
            <span className="leading-tight">Say Name!</span>
            <span className="text-[11px] font-medium opacity-80">Listen & Learn</span>
          </div>
        </button>
      </div>
    </div>
  );
};
