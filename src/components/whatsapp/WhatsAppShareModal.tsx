'use client';

import React, { useState, useEffect } from 'react';
import {
  WhatsAppMessageType,
  buildWhatsAppMessage,
  generateWhatsAppLink,
  WhatsAppMessageContext,
} from '@/lib/whatsapp/sharing';
import { MessageSquare, ExternalLink, X, AlertCircle, Copy, Check } from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: WhatsAppMessageContext;
  currentQuoteId?: string;
  jobId: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  context,
  currentQuoteId,
  jobId,
}: WhatsAppShareModalProps) {
  const [selectedType, setSelectedType] = useState<WhatsAppMessageType>('quotation');
  const [publicQuoteUrl, setPublicQuoteUrl] = useState<string | undefined>(context.publicQuoteUrl);
  const [loadingLink, setLoadingLink] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  // When type or quote URL changes, update message
  useEffect(() => {
    const updatedCtx = {
      ...context,
      publicQuoteUrl: publicQuoteUrl || context.publicQuoteUrl,
    };
    const text = buildWhatsAppMessage(selectedType, updatedCtx);
    setMessageText(text);
  }, [selectedType, publicQuoteUrl, context]);

  // If quotation selected and no public URL, generate token
  useEffect(() => {
    if ((selectedType === 'quotation' || selectedType === 'approval_request') && currentQuoteId && !publicQuoteUrl) {
      setLoadingLink(true);
      fetch(`/api/jobs/${jobId}/quotes/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: currentQuoteId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.publicUrl) {
            setPublicQuoteUrl(data.publicUrl);
          }
        })
        .catch((err) => console.error('Failed to generate quote token:', err))
        .finally(() => setLoadingLink(false));
    }
  }, [selectedType, currentQuoteId, jobId, publicQuoteUrl]);

  if (!isOpen) return null;

  const handleOpenWhatsApp = () => {
    const normPhone = context.customerPhone.replace(/\D/g, '');
    const encoded = encodeURIComponent(messageText);
    const url = `https://wa.me/${normPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Share on WhatsApp</h3>
              <p className="text-[11px] text-emerald-100">Send direct update to {context.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Action types */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wide">
              Select Message Template
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedType('quotation')}
                className={`p-2 rounded-xl text-left border transition font-medium ${
                  selectedType === 'quotation'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                📋 Quotation
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('approval_request')}
                className={`p-2 rounded-xl text-left border transition font-medium ${
                  selectedType === 'approval_request'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                ❓ Approval Request
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('progress_update')}
                className={`p-2 rounded-xl text-left border transition font-medium ${
                  selectedType === 'progress_update'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                🔧 Progress Update
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('ready_for_collection')}
                className={`p-2 rounded-xl text-left border transition font-medium ${
                  selectedType === 'ready_for_collection'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                🚗 Ready for Collection
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('payment_reminder')}
                className={`col-span-2 p-2 rounded-xl text-left border transition font-medium ${
                  selectedType === 'payment_reminder'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                💳 Payment Reminder
              </button>
            </div>
          </div>

          {/* Recipient info */}
          <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-500 font-medium">Customer: </span>
              <span className="font-bold text-zinc-800">{context.customerName}</span>
            </div>
            <div className="font-mono text-zinc-700 font-semibold">
              {context.customerPhone}
            </div>
          </div>

          {/* Editable message preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
                Message Preview
              </label>
              <button
                onClick={handleCopyText}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-zinc-300 rounded-xl font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 leading-relaxed"
            />
            {loadingLink && (
              <p className="text-[10px] text-amber-600 mt-1 animate-pulse">
                Generating expiring customer link...
              </p>
            )}
          </div>

          {/* Important disclaimer */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <p className="leading-snug">
              WhatsApp will open on your phone with this text pre-filled. You must tap Send in WhatsApp. Opening the chat does not mark messages delivered or read.
            </p>
          </div>

          {/* Open WhatsApp Button */}
          <button
            onClick={handleOpenWhatsApp}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
          >
            <ExternalLink className="h-4 w-4" />
            Open WhatsApp to Send
          </button>
        </div>
      </div>
    </div>
  );
}
