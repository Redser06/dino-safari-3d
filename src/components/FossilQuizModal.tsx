import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { DINOSAURS } from '../data/dinosaurs';
import { audioService } from '../services/audio';
import { X, Sparkles, Award, ArrowRight, RotateCcw } from 'lucide-react';

interface FossilQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDinoFromQuiz: (dinoId: string) => void;
}

interface QuizQuestion {
  id: number;
  question: string;
  clue: string;
  emoji: string;
  correctDinoId: string;
  options: { dinoId: string; label: string; icon: string }[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Who had a massive armored bone shield and THREE sharp horns?',
    clue: 'Look for the knight with a shield on its head! 🛡️',
    emoji: '🦏',
    correctDinoId: 'triceratops',
    options: [
      { dinoId: 'triceratops', label: 'Triceratops', icon: '🦏' },
      { dinoId: 't-rex', label: 'T-Rex', icon: '🦖' },
      { dinoId: 'brachiosaurus', label: 'Brachiosaurus', icon: '🦕' },
    ],
  },
  {
    id: 2,
    question: 'Who had teeth as big as bananas and the strongest chomp on Earth?',
    clue: 'The famous King of the Dinosaurs! 👑',
    emoji: '💥',
    correctDinoId: 't-rex',
    options: [
      { dinoId: 'velociraptor', label: 'Velociraptor', icon: '🐊' },
      { dinoId: 't-rex', label: 'Tyrannosaurus Rex', icon: '🦖' },
      { dinoId: 'diplodocus', label: 'Diplodocus', icon: '🦕' },
    ],
  },
  {
    id: 3,
    question: 'Who had a neck as tall as a 4-story building to eat tree-top leaves?',
    clue: 'Its front legs were taller than its back legs! 🦒',
    emoji: '🌿',
    correctDinoId: 'brachiosaurus',
    options: [
      { dinoId: 'stegosaurus', label: 'Stegosaurus', icon: '🦎' },
      { dinoId: 'ankylosaurus', label: 'Ankylosaurus', icon: '🛡️' },
      { dinoId: 'brachiosaurus', label: 'Brachiosaurus', icon: '🦕' },
    ],
  },
  {
    id: 4,
    question: 'Who was a walking tank with a heavy iron-hard tail club?',
    clue: 'Covered in spikes and armored knobs from nose to tail! 🔨',
    emoji: '🛡️',
    correctDinoId: 'ankylosaurus',
    options: [
      { dinoId: 'ankylosaurus', label: 'Ankylosaurus', icon: '🛡️' },
      { dinoId: 'triceratops', label: 'Triceratops', icon: '🦏' },
      { dinoId: 'spinosaurus', label: 'Spinosaurus', icon: '🐊' },
    ],
  },
  {
    id: 5,
    question: 'Who had 17 diamond back plates and four sharp spikes on its tail?',
    clue: 'The plates look like rooftop tiles! 🗡️',
    emoji: '🦎',
    correctDinoId: 'stegosaurus',
    options: [
      { dinoId: 'stegosaurus', label: 'Stegosaurus', icon: '🦎' },
      { dinoId: 't-rex', label: 'T-Rex', icon: '🦖' },
      { dinoId: 'velociraptor', label: 'Velociraptor', icon: '🐊' },
    ],
  },
];

export const FossilQuizModal: React.FC<FossilQuizModalProps> = ({
  isOpen,
  onClose,
  onSelectDinoFromQuiz,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);

  if (!isOpen) return null;

  const currentQ = QUIZ_QUESTIONS[currentIdx];

  const handleSelectOption = (dinoId: string) => {
    if (selectedOption) return; // already answered
    setSelectedOption(dinoId);

    if (dinoId === currentQ.correctDinoId) {
      setIsCorrect(true);
      setScore((s) => s + 1);
      audioService.playCelebrationSound();

      // Trigger colorful kid confetti
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#E07A5F', '#38BDF8'],
      });
    } else {
      setIsCorrect(false);
      audioService.playTapSound();
    }
  };

  const handleNext = () => {
    audioService.playTapSound();
    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx((idx) => idx + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      // Finished
      setCurrentIdx(0);
      setSelectedOption(null);
      setIsCorrect(null);
      setScore(0);
      onClose();
    }
  };

  const handleInspectDino = () => {
    audioService.playTapSound();
    onSelectDinoFromQuiz(currentQ.correctDinoId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-safari-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border-4 border-amber-500 shadow-playful max-w-lg w-full p-6 relative overflow-hidden flex flex-col gap-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn-chunky absolute top-4 right-4 p-2 rounded-full bg-safari-100 hover:bg-safari-200 text-safari-800 border border-safari-300"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 text-2xl">
            🔍
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-safari-900 font-bubble">
              Dino Fossil Detective!
            </h2>
            <span className="text-xs font-bold text-safari-700">
              Question {currentIdx + 1} of {QUIZ_QUESTIONS.length} • Score: {score} ⭐
            </span>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-safari-50 rounded-2xl p-4 sm:p-5 border-2 border-safari-300">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Mystery Dinosaur Clue</span>
          </div>
          <p className="text-base sm:text-lg font-extrabold text-safari-900 leading-snug">
            {currentQ.question}
          </p>
          <div className="mt-2 text-xs font-semibold text-safari-700 bg-white/80 p-2.5 rounded-xl border border-safari-200">
            💡 {currentQ.clue}
          </div>
        </div>

        {/* Option Cards */}
        <div className="grid grid-cols-1 gap-2.5">
          {currentQ.options.map((opt) => {
            const isThisSelected = selectedOption === opt.dinoId;
            const isThisCorrect = opt.dinoId === currentQ.correctDinoId;

            let buttonStyle = 'bg-white hover:bg-safari-50 border-safari-300 text-safari-900';
            if (selectedOption) {
              if (isThisCorrect) {
                buttonStyle = 'bg-jungle-100 border-jungle-600 text-jungle-900 scale-[1.02] shadow-playful-sm';
              } else if (isThisSelected) {
                buttonStyle = 'bg-terracotta-100 border-terracotta-400 text-terracotta-900';
              } else {
                buttonStyle = 'bg-gray-50 border-gray-200 opacity-60';
              }
            }

            return (
              <button
                key={opt.dinoId}
                onClick={() => handleSelectOption(opt.dinoId)}
                disabled={!!selectedOption}
                className={`btn-chunky flex items-center justify-between p-3.5 rounded-2xl border-3 text-left transition-all ${buttonStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{opt.icon}</span>
                  <span className="font-extrabold text-base sm:text-lg font-bubble">
                    {opt.label}
                  </span>
                </div>
                {selectedOption && isThisCorrect && (
                  <span className="text-xl">✅</span>
                )}
                {selectedOption && isThisSelected && !isThisCorrect && (
                  <span className="text-xl">❌</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Banner */}
        {selectedOption && (
          <div className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
            isCorrect
              ? 'bg-jungle-100 border-jungle-500 text-jungle-900'
              : 'bg-amber-100 border-amber-500 text-amber-900'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isCorrect ? '🌟' : '🤔'}</span>
              <span className="text-sm font-extrabold">
                {isCorrect ? 'Super Detective! You got it right!' : 'Good try! Tap below to see the 3D model!'}
              </span>
            </div>

            <button
              onClick={handleInspectDino}
              className="btn-chunky text-xs font-black px-3 py-1.5 rounded-xl bg-white border border-black/10 shadow-sm"
            >
              See in 3D 🦖
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-safari-200">
          {selectedOption ? (
            <button
              onClick={handleNext}
              className="btn-chunky flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-safari-900 border-2 border-amber-600 font-extrabold text-sm shadow-playful-sm"
            >
              <span>{currentIdx < QUIZ_QUESTIONS.length - 1 ? 'Next Question' : 'Finish Quiz 🎉'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs font-bold text-safari-600">
              Tap the dinosaur you think is right!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
