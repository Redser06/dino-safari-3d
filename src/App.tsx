import React, { useState } from 'react';
import { DINOSAURS } from './data/dinosaurs';
import { Dinosaur, DinoViewMode } from './types/dinosaur';
import { ThreeDinoViewer } from './components/ThreeDinoViewer';
import { DinoCard } from './components/DinoCard';
import { DinoControls } from './components/DinoControls';
import { DinoFacts } from './components/DinoFacts';
import { FossilQuizModal } from './components/FossilQuizModal';
import { audioService } from './services/audio';
import { Volume2, VolumeX, Sparkles, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedDino, setSelectedDino] = useState<Dinosaur>(DINOSAURS[0]);
  const [viewMode, setViewMode] = useState<DinoViewMode>('exterior');
  const [isMuted, setIsMuted] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const handleSelectDino = (dino: Dinosaur) => {
    setSelectedDino(dino);
  };

  const handleToggleMute = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      audioService.playTapSound();
    }
  };

  const handlePrevDino = () => {
    audioService.playTapSound();
    const curIdx = DINOSAURS.findIndex((d) => d.id === selectedDino.id);
    const prevIdx = (curIdx - 1 + DINOSAURS.length) % DINOSAURS.length;
    setSelectedDino(DINOSAURS[prevIdx]);
  };

  const handleNextDino = () => {
    audioService.playTapSound();
    const curIdx = DINOSAURS.findIndex((d) => d.id === selectedDino.id);
    const nextIdx = (curIdx + 1) % DINOSAURS.length;
    setSelectedDino(DINOSAURS[nextIdx]);
  };

  const handleSelectFromQuiz = (dinoId: string) => {
    const found = DINOSAURS.find((d) => d.id === dinoId);
    if (found) {
      setSelectedDino(found);
    }
  };

  return (
    <div className="min-h-screen bg-safari-100 flex flex-col">
      {/* 1. Header Bar */}
      <header className="bg-white border-b-3 border-safari-300 px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-playful-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-400 border-2 border-amber-600 flex items-center justify-center text-2xl sm:text-3xl shadow-playful-sm">
              🦖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl sm:text-2xl text-safari-900 tracking-tight font-bubble">
                  Dino Safari 3D
                </span>
                <span className="hidden sm:inline-block text-[11px] font-black uppercase tracking-wider bg-jungle-100 text-jungle-800 px-2 py-0.5 rounded-full border border-jungle-300">
                  Kids Explorer 🌿
                </span>
              </div>
              <p className="text-xs text-safari-800 font-bold hidden sm:block">
                Touch, rotate & explore living dinosaurs and fossil bones!
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quiz Game Button */}
            <button
              onClick={() => {
                audioService.playTapSound();
                setIsQuizOpen(true);
              }}
              className="btn-chunky flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-500 text-safari-900 border-2 border-amber-600 font-extrabold text-xs sm:text-sm shadow-playful-sm"
            >
              <Sparkles className="w-4 h-4 text-safari-900" />
              <span>Dino Quiz! 🔍</span>
            </button>

            {/* Mute Button */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="btn-chunky p-2 sm:p-2.5 rounded-2xl bg-safari-100 hover:bg-safari-200 text-safari-800 border-2 border-safari-300 shadow-playful-sm flex items-center justify-center"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-terracotta-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-safari-800" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Dinosaur Carousel Bar */}
      <section className="bg-safari-50 border-b-2 border-safari-300 py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          {/* Previous Arrow */}
          <button
            onClick={handlePrevDino}
            title="Previous Dinosaur"
            className="btn-chunky p-2.5 rounded-2xl bg-white hover:bg-safari-100 text-safari-900 border-2 border-safari-300 shadow-playful-sm flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Carousel Cards */}
          <div className="flex items-center gap-3 overflow-x-auto py-1 scroll-smooth no-scrollbar flex-1">
            {DINOSAURS.map((dino) => (
              <DinoCard
                key={dino.id}
                dino={dino}
                isSelected={dino.id === selectedDino.id}
                onSelect={handleSelectDino}
              />
            ))}
          </div>

          {/* Next Arrow */}
          <button
            onClick={handleNextDino}
            title="Next Dinosaur"
            className="btn-chunky p-2.5 rounded-2xl bg-white hover:bg-safari-100 text-safari-900 border-2 border-safari-300 shadow-playful-sm flex-shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* 3. Main Interactive Explorer Stage */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 3D Stage & Controls (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="w-full h-[460px] sm:h-[540px] md:h-[580px]">
              <ThreeDinoViewer
                dinosaur={selectedDino}
                viewMode={viewMode}
              />
            </div>

            {/* View Mode & Sound Controls */}
            <DinoControls
              dino={selectedDino}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>

          {/* Right Column: Dinosaur Information & Fun Facts (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <DinoFacts dino={selectedDino} />
          </div>
        </div>
      </main>

      {/* 4. Child-Friendly Footer */}
      <footer className="bg-safari-200 border-t-2 border-safari-300 py-4 px-4 text-center mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-safari-800">
          <div className="flex items-center gap-2">
            <span>🦕 Dino Safari 3D</span>
            <span>•</span>
            <span>Built for Young Explorers (Ages 4-6)</span>
          </div>
          <div className="text-safari-700">
            Classic Reptilian Anatomy • 3D Interactive Skeletons & Exterior
          </div>
        </div>
      </footer>

      {/* Fossil Detective Quiz Modal */}
      <FossilQuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onSelectDinoFromQuiz={handleSelectFromQuiz}
      />
    </div>
  );
};
