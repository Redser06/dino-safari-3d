import React from 'react';
import { Dinosaur } from '../types/dinosaur';
import { Sparkles, Compass, ShieldAlert, Award, Ruler, Gauge, Weight } from 'lucide-react';

interface DinoFactsProps {
  dino: Dinosaur;
}

export const DinoFacts: React.FC<DinoFactsProps> = ({ dino }) => {
  // Fun weight analogy for 4-6 year olds
  const getWeightAnalogy = (tons: number) => {
    if (tons < 0.1) return 'About as heavy as a friendly dog!';
    if (tons <= 6) return `As heavy as ${Math.round(tons * 2)} big family cars!`;
    if (tons <= 15) return `As heavy as ${Math.round(tons / 3)} adult elephants!`;
    return `As heavy as 7 giant African elephants!`;
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-3 border-safari-300 shadow-playful flex flex-col gap-5">
      {/* 1. Header & Pronunciation */}
      <div className="border-b-2 border-safari-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-safari-200 text-safari-900 border border-safari-300">
              {dino.period.split('(')[0].trim()}
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              {dino.dietLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-safari-800">
            <Compass className="w-4 h-4 text-safari-500" />
            <span>Classic Reptilian Build</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-safari-900 tracking-tight font-bubble">
          {dino.name}
        </h1>

        {/* Phonetic Pronunciation Guide for 4-6 year olds */}
        <div className="flex items-center gap-2 mt-1.5 bg-safari-100 px-3.5 py-1.5 rounded-xl border border-safari-300 w-fit">
          <span className="text-xs font-bold text-safari-500">SOUNDS LIKE:</span>
          <span className="text-sm font-extrabold text-amber-600 tracking-wide">
            "{dino.pronunciation}"
          </span>
        </div>

        <p className="text-xs sm:text-sm text-safari-800/80 font-bold mt-2 italic">
          Name Meaning: &ldquo;{dino.meaning}&rdquo;
        </p>
      </div>

      {/* 2. Special Superpower Banner */}
      <div
        className="rounded-2xl p-4 border-2 flex items-start gap-3.5 relative overflow-hidden"
        style={{
          backgroundColor: dino.colorTheme.accent + '15',
          borderColor: dino.colorTheme.accent + '50',
        }}
      >
        <div className="text-3xl sm:text-4xl p-2 rounded-2xl bg-white shadow-playful-sm border border-black/5 flex-shrink-0">
          {dino.superpower.emoji}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-safari-900">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Dino Superpower</span>
          </div>
          <span className="text-base sm:text-lg font-extrabold text-safari-900 mt-0.5">
            {dino.superpower.title}
          </span>
          <p className="text-xs sm:text-sm text-safari-800 font-semibold mt-1 leading-relaxed">
            {dino.superpower.description}
          </p>
        </div>
      </div>

      {/* 3. "How Big Was It?" Visual Comparison Bar */}
      <div className="bg-safari-50 rounded-2xl p-4 border border-safari-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-safari-900">
              How Big Was It?
            </h3>
          </div>
          <span className="text-xs font-bold text-safari-600 bg-white px-2 py-0.5 rounded-full border border-safari-200">
            Kid vs Dino Scale
          </span>
        </div>

        {/* Interactive Comparison Meters */}
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-white p-2.5 rounded-xl border border-safari-200 shadow-sm">
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-safari-500 mb-0.5">
              <Ruler className="w-3.5 h-3.5" />
              <span>Length</span>
            </div>
            <div className="text-lg font-extrabold text-safari-900">
              {dino.lengthMeters} m
            </div>
            <div className="text-[11px] text-safari-700 font-semibold">
              {dino.sizeComparison.busLengthPercent}% of a school bus
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-safari-200 shadow-sm">
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-safari-500 mb-0.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>Height</span>
            </div>
            <div className="text-lg font-extrabold text-safari-900">
              {dino.heightMeters} m
            </div>
            <div className="text-[11px] text-safari-700 font-semibold">
              {dino.sizeComparison.kidHeightMultiplier} kids tall! 🧒
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-safari-200 shadow-sm">
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-safari-500 mb-0.5">
              <Weight className="w-3.5 h-3.5" />
              <span>Weight</span>
            </div>
            <div className="text-lg font-extrabold text-safari-900">
              {dino.weightTons} T
            </div>
            <div className="text-[11px] text-safari-700 font-semibold">
              {dino.weightTons >= 1 ? `${dino.weightTons * 1000} kg` : '20 kg'}
            </div>
          </div>
        </div>

        {/* Fun scale analogy */}
        <div className="text-xs text-safari-800 font-bold bg-white/80 p-2.5 rounded-xl border border-safari-200 flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <span>{getWeightAnalogy(dino.weightTons)}</span>
        </div>
      </div>

      {/* 4. Bite-Sized Fun Facts for 4-6 Year Olds */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-extrabold text-sm sm:text-base text-safari-900">
            Fun Dino Facts for Young Explorers
          </h3>
        </div>

        <div className="flex flex-col gap-2">
          {dino.funFacts.map((fact, idx) => {
            const [boldPart, rest] = fact.includes(':')
              ? fact.split(':')
              : ['', fact];
            return (
              <div
                key={idx}
                className="bg-safari-50 hover:bg-safari-100 p-3 rounded-2xl border border-safari-200 text-xs sm:text-sm text-safari-900 flex items-start gap-2.5 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-amber-400 text-safari-900 font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  {idx + 1}
                </div>
                <div className="font-medium leading-relaxed">
                  {boldPart && <strong className="font-extrabold text-safari-950 mr-1">{boldPart}:</strong>}
                  <span>{rest || fact}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
