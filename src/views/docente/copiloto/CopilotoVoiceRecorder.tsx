import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Square, Send, Sparkles, Volume2, X } from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';

interface CopilotoVoiceRecorderProps {
  isRecording: boolean;
  onStopRecording: (transcript: string) => void;
  onCancelRecording: () => void;
}

export const CopilotoVoiceRecorder: React.FC<CopilotoVoiceRecorderProps> = ({
  isRecording,
  onStopRecording,
  onCancelRecording,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    let interval: any = null;

    if (isRecording) {
      setSeconds(0);
      setLiveTranscript('');
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);

      // Check if Web Speech API is supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'es-ES';

          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript;
            }
            setLiveTranscript(current);
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition error:', event.error);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Could not start speech recognition:', e);
        }
      } else {
        // Fallback simulation: realistic educational prompt typing
        const simulatedWords = [
          'Foxy,',
          'ayúdame',
          'a',
          'planificar',
          'una',
          'actividad',
          'sobre',
          'vanguardias',
          'literarias',
          'con',
          'adaptación',
          'para',
          'Sofía',
          'que',
          'tiene',
          'dislexia.'
        ];
        let wordIndex = 0;
        const simInterval = setInterval(() => {
          if (wordIndex < simulatedWords.length) {
            setLiveTranscript(prev => (prev ? prev + ' ' : '') + simulatedWords[wordIndex]);
            wordIndex++;
          }
        }, 350);

        return () => {
          clearInterval(interval);
          clearInterval(simInterval);
        };
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isRecording]);

  if (!isRecording) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    const finalTranscript = liveTranscript.trim() || 'Genera una rúbrica analítica y secuencia didáctica adaptada a las necesidades del curso.';
    onStopRecording(finalTranscript);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 w-full my-2"
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse shrink-0 shadow-sm">
          <Mic size={18} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-rose-700 uppercase tracking-wider">
              Grabando Audio
            </span>
            <span className="font-mono text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">
              {formatTime(seconds)}
            </span>
          </div>

          <p className="text-xs text-rose-900 truncate max-w-sm sm:max-w-md font-medium mt-0.5">
            {liveTranscript ? `"${liveTranscript}"` : 'Escuchando tu voz... Habla claro sobre tu consulta pedagógica'}
          </p>
        </div>
      </div>

      {/* Animated Waveform Bars */}
      <div className="hidden md:flex items-center gap-1 h-6 px-2">
        {[40, 70, 90, 60, 100, 50, 80, 65, 45, 95, 30].map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: [`${Math.max(20, h * 0.3)}%`, `${h}%`, `${Math.max(15, h * 0.4)}%`] }}
            transition={{ repeat: Infinity, duration: 0.8 + (i % 3) * 0.2, ease: 'easeInOut' }}
            className="w-1 bg-rose-500 rounded-full"
          />
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onCancelRecording}
          className="p-2 rounded-xl text-rose-700 hover:bg-rose-100 transition-colors text-xs font-bold flex items-center gap-1"
          title="Cancelar grabación"
        >
          <X size={16} />
          <span>Cancelar</span>
        </button>

        <button
          type="button"
          onClick={handleFinish}
          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Square size={13} className="fill-white" />
          <span>Usar Audio</span>
        </button>
      </div>
    </motion.div>
  );
};
