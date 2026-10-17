'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, Upload, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { AttachmentCategory } from '@/lib/types';

interface VoiceRecorderProps {
  jobId: string;
  onUploaded?: () => void;
}

export function VoiceRecorder({ jobId, onUploaded }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<AttachmentCategory>('diagnosis');
  const [caption, setCaption] = useState('');
  const [requestTranscription, setRequestTranscription] = useState(true);

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMessage(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadStatus('idle');
    setNoteMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support in-app audio recording. Please use file upload instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage(err.message || 'Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setUploadStatus('idle');
    setErrorMessage(null);
    setNoteMessage(null);
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    setUploadStatus('uploading');
    setErrorMessage(null);
    setNoteMessage(null);

    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const filename = `voice-note-${Date.now()}.${ext}`;

      formData.append('file', audioBlob, filename);
      formData.append('job_id', jobId);
      formData.append('category', category);
      formData.append('caption', caption.trim() || 'Voice note diagnosis');
      formData.append('request_transcription', requestTranscription ? 'true' : 'false');

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus('success');
      if (data.transcriptionNote) {
        setNoteMessage(data.transcriptionNote);
      }

      if (onUploaded) {
        onUploaded();
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadStatus('error');
      setErrorMessage(err.message || 'Failed to save recording to server. Please retry.');
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Record Voice Note</h3>
            <p className="text-xs text-zinc-500">Record diagnosis or customer audio on-site</p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {noteMessage && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>{noteMessage}</span>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="flex flex-col items-center justify-center py-6 bg-red-50/50 rounded-xl border border-red-100 mb-3">
          <div className="relative mb-3">
            <div className="h-16 w-16 rounded-full bg-red-500 flex items-center justify-center text-white animate-pulse shadow-md">
              <Mic className="h-8 w-8" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
            </span>
          </div>
          <span className="text-2xl font-mono font-bold text-zinc-900 mb-1">
            {formatSeconds(recordingTime)}
          </span>
          <span className="text-xs text-red-600 font-medium">Listening to audio...</span>

          <button
            onClick={stopRecording}
            className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm rounded-xl shadow flex items-center gap-2 transition"
          >
            <Square className="h-4 w-4 fill-white" />
            Stop Recording
          </button>
        </div>
      )}

      {/* Not recording, no audio ready */}
      {!isRecording && !audioBlob && uploadStatus !== 'success' && (
        <div className="flex flex-col items-center justify-center py-5 border-2 border-dashed border-zinc-200 rounded-xl">
          <button
            onClick={startRecording}
            className="h-14 w-14 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-zinc-950 flex items-center justify-center shadow-md transition focus:outline-none focus:ring-4 focus:ring-amber-200"
          >
            <Mic className="h-7 w-7" />
          </button>
          <span className="text-xs font-semibold text-zinc-700 mt-2">Tap to Start Recording</span>
          <span className="text-[11px] text-zinc-400">Speak in English, isiZulu, Sesotho, etc.</span>
        </div>
      )}

      {/* Recorded Audio Ready for review & upload */}
      {!isRecording && audioBlob && uploadStatus !== 'success' && (
        <div className="space-y-3">
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-700">
                <Play className="h-5 w-5 ml-0.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-800">Preview Voice Note</p>
                <p className="text-[11px] text-zinc-500 font-mono">{formatSeconds(recordingTime)} recorded</p>
              </div>
            </div>
            {audioUrl && (
              <audio controls src={audioUrl} className="h-8 max-w-[170px]" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-zinc-600 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AttachmentCategory)}
                className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="diagnosis">Diagnosis</option>
                <option value="intake">Intake</option>
                <option value="customer_approval">Customer Approval</option>
                <option value="work_in_progress">Work in Progress</option>
                <option value="completed_work">Completed Work</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-600 font-medium mb-1">Caption (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Gearbox noise test"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={requestTranscription}
              onChange={(e) => setRequestTranscription(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Generate draft AI transcription (if configured)</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={discardRecording}
              disabled={uploadStatus === 'uploading'}
              className="flex-1 py-2.5 px-3 border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </button>
            <button
              onClick={handleUpload}
              disabled={uploadStatus === 'uploading'}
              className="flex-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 text-xs font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  Saving to Server...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Save Voice Note
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadStatus === 'success' && (
        <div className="py-4 text-center">
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold text-zinc-900">Voice Note Confirmed & Saved</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Stored securely on workshop server.</p>
          <button
            onClick={discardRecording}
            className="mt-3 px-3 py-1.5 text-xs text-amber-700 font-semibold hover:underline"
          >
            Record another note
          </button>
        </div>
      )}
    </div>
  );
}
