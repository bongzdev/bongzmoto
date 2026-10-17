'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Mic } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  fileName: string;
  caption?: string | null;
  uploadedByName?: string;
  createdAt?: string;
}

export function AudioPlayer({ src, fileName, caption, uploadedByName, createdAt }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => console.error('Audio play error:', err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-3 bg-zinc-900 text-white rounded-xl shadow-sm border border-zinc-800">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 truncate">
          <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Mic className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {caption || fileName}
          </span>
        </div>
        {uploadedByName && (
          <span className="text-[10px] text-zinc-400 shrink-0 ml-2">
            by {uploadedByName.split(' ')[0]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="h-9 w-9 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shrink-0 shadow transition active:scale-95"
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-zinc-950" /> : <Play className="h-4 w-4 fill-zinc-950 ml-0.5" />}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
