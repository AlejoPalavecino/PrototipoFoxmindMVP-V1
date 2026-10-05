import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { MessageAttachment } from '../../types';

interface VoiceNotePlayerProps {
  attachment: MessageAttachment;
  isMyMessage: boolean;
}

export function VoiceNotePlayer({ attachment, isMyMessage }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 5;
        });
      }, 150);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (progress >= 100) setProgress(0);
      setIsPlaying(true);
    }
  };

  // Mock visual waveform bars
  const waveHeights = [40, 65, 30, 85, 95, 60, 45, 80, 100, 75, 50, 90, 65, 35, 70, 85, 40, 60, 90, 75, 45, 65, 30];

  return (
    <div className={`mt-2 p-3 rounded-2xl flex items-center gap-3 border transition-all ${
      isMyMessage 
        ? 'bg-black/10 border-white/20 text-white' 
        : 'bg-fox-bg/80 border-fox-border text-fox-text-main'
    }`}>
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
          isMyMessage
            ? 'bg-white text-fox-orange hover:bg-white/90'
            : 'bg-fox-orange text-white hover:bg-fox-orange/90'
        }`}
        aria-label={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 opacity-90">
          <span className="flex items-center gap-1">
            <Volume2 size={13} /> {attachment.name || 'Nota de voz'}
          </span>
          <span>{attachment.duration || '0:30'}</span>
        </div>

        {/* Waveform Visualization */}
        <div className="flex items-center gap-[3px] h-6 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const newPct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
          setProgress(newPct);
        }}>
          {waveHeights.map((h, idx) => {
            const barPct = (idx / waveHeights.length) * 100;
            const isFilled = barPct <= progress;
            return (
              <div
                key={idx}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-colors ${
                  isFilled
                    ? isMyMessage ? 'bg-white' : 'bg-fox-orange'
                    : isMyMessage ? 'bg-white/30' : 'bg-fox-border'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
