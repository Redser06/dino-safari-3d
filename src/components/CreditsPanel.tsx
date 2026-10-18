import React, { useEffect, useRef } from 'react';
import assetManifest from '../data/asset-manifest.json';

interface CreditsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const CreditsPanel: React.FC<CreditsPanelProps> = ({ open, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-safari-900/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-title"
        className="bg-white rounded-3xl border-4 border-amber-500 shadow-playful max-w-lg w-full p-6 relative flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
      >
        <h2 id="credits-title" className="text-xl sm:text-2xl font-black text-safari-900 font-bubble pr-10">
          Model credits
        </h2>
        <p className="text-sm font-semibold text-safari-800 leading-relaxed">
          The Triceratops you can spin uses two free models. Anyone may use them.
          The other dinosaurs are drawn inside this app.
        </p>

        <ul className="flex flex-col gap-3">
          {assetManifest.assets.map((asset) => (
            <li key={asset.id} className="bg-safari-50 rounded-2xl border border-safari-300 p-3.5">
              <p className="font-extrabold text-safari-900">{asset.id === 'triceratops-skin' ? 'Living skin' : 'Fossil skeleton'}</p>
              <p className="text-sm font-semibold text-safari-800 mt-1">{asset.author}</p>
              <p className="text-xs font-bold text-safari-700 mt-1">Licence: {asset.licence}</p>
              <p className="text-xs text-safari-700 mt-1 leading-relaxed">{asset.note}</p>
              <a
                className="inline-block mt-2 text-sm font-extrabold text-jungle-800 underline"
                href={asset.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Source page
              </a>
            </li>
          ))}
        </ul>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="btn-chunky self-end px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-safari-900 border-2 border-amber-600 font-extrabold text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
};
