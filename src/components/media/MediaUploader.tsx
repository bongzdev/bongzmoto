'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image, FileText, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { AttachmentCategory } from '@/lib/types';

interface MediaUploaderProps {
  jobId: string;
  onUploaded?: () => void;
}

export function MediaUploader({ jobId, onUploaded }: MediaUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<AttachmentCategory>('intake');
  const [caption, setCaption] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('job_id', jobId);
      formData.append('category', category);
      formData.append('caption', caption.trim());

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload attachment.');
      }

      setUploadStatus('success');
      setFile(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

      if (onUploaded) {
        onUploaded();
      }
    } catch (err: any) {
      console.error('Attachment upload error:', err);
      setUploadStatus('error');
      setErrorMessage(err.message || 'Upload failed. Please check file format and size, then retry.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
          <Camera className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-900">Upload Photo or Document</h3>
          <p className="text-xs text-zinc-500">Camera snaps, parts receipts, PDFs, WhatsApp files</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {!file && uploadStatus !== 'success' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 active:scale-98 transition text-zinc-700"
          >
            <Camera className="h-6 w-6 text-amber-600 mb-1" />
            <span className="text-xs font-bold text-zinc-900">Take Photo</span>
            <span className="text-[10px] text-zinc-500">Open phone camera</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 active:scale-98 transition text-zinc-700"
          >
            <Image className="h-6 w-6 text-zinc-600 mb-1" />
            <span className="text-xs font-bold text-zinc-900">Choose File</span>
            <span className="text-[10px] text-zinc-500">Gallery, PDF, Audio</span>
          </button>
        </div>
      )}

      {file && uploadStatus !== 'success' && (
        <div className="space-y-3">
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <FileText className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-bold text-zinc-800 truncate">{file.name}</p>
                <p className="text-[10px] text-zinc-500">{(file.size / 1024).toFixed(0)} KB • {file.type || 'file'}</p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-xs text-red-600 font-semibold hover:underline shrink-0 ml-2"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-zinc-600 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AttachmentCategory)}
                className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="intake">Intake Evidence</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="customer_approval">Customer Approval</option>
                <option value="parts_receipt">Parts Receipt</option>
                <option value="work_in_progress">Work in Progress</option>
                <option value="completed_work">Completed Work</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-600 font-medium mb-1">Caption / Note</label>
              <input
                type="text"
                placeholder="e.g. Scratched bumper on intake"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploadStatus === 'uploading'}
            className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white text-xs font-bold rounded-xl shadow flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {uploadStatus === 'uploading' ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading & Verifying...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 text-amber-400" />
                Confirm & Upload File
              </>
            )}
          </button>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="py-3 text-center">
          <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1.5">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-zinc-900">Attachment Saved Successfully</p>
          <button
            onClick={() => setUploadStatus('idle')}
            className="mt-2 text-xs text-amber-700 font-semibold hover:underline"
          >
            Upload another file
          </button>
        </div>
      )}
    </div>
  );
}
