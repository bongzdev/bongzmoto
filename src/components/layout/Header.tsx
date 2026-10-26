'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wrench, WifiOff, UserCheck, ChevronDown, Check } from 'lucide-react';

interface HeaderProps {
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
  workshopName?: string;
  workshopLogo?: string | null;
}

export function Header({ currentUser, workshopName = 'Bongz Auto', workshopLogo }: HeaderProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSwitchUser = async (userId: string) => {
    setSwitching(true);
    try {
      await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch user:', err);
    } finally {
      setSwitching(false);
      setRoleMenuOpen(false);
    }
  };

  const isOwner = currentUser?.role === 'owner';

  return (
    <header className="sticky top-0 z-40 bg-zinc-900 text-white shadow-md border-b border-zinc-800">
      {/* Offline notification banner */}
      {isOffline && (
        <div className="bg-amber-500 text-zinc-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You are offline. Form drafts are preserved. Retries will be offered when reconnected.</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none">
          {workshopLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={workshopLogo}
              alt={workshopName}
              className="h-9 w-9 rounded-lg object-contain bg-zinc-800 p-0.5 border border-zinc-700 shadow-inner"
            />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-black shadow-inner">
              <Wrench className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">BongzMoto</span>
              <span className="text-[10px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[170px] leading-tight">
              {workshopName}
            </p>
          </div>
        </Link>

        {/* User Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500"
            title="Switch User Role"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isOwner ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span className="text-zinc-200 truncate max-w-[110px]">
              {currentUser?.name ? currentUser.name.split(' ')[0] : 'Bongani'}
            </span>
            <span className="text-[10px] text-zinc-400 uppercase">
              ({currentUser?.role || 'owner'})
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 ml-0.5" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-2 border-b border-zinc-700">
                <p className="font-semibold text-zinc-200">Switch Role (Test Permissions)</p>
                <p className="text-[11px] text-zinc-400">
                  Switch between Owner and Mechanic to verify permissions and views.
                </p>
              </div>

              <button
                onClick={() => handleSwitchUser('usr-bongani-owner')}
                disabled={switching}
                className="w-full text-left px-3 py-2.5 hover:bg-zinc-700/60 flex items-center justify-between text-zinc-200 transition"
              >
                <div>
                  <div className="font-medium flex items-center gap-1.5">
                    <span>Bongani Khumalo</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      OWNER
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Full access: settings, finance, staff</p>
                </div>
                {isOwner && <Check className="h-4 w-4 text-amber-400" />}
              </button>

              <button
                onClick={() => handleSwitchUser('usr-sipho-mechanic')}
                disabled={switching}
                className="w-full text-left px-3 py-2.5 hover:bg-zinc-700/60 flex items-center justify-between text-zinc-200 transition"
              >
                <div>
                  <div className="font-medium flex items-center gap-1.5">
                    <span>Sipho Ndlovu</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      MECHANIC
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Assigned jobs, diagnosis, media only</p>
                </div>
                {!isOwner && <Check className="h-4 w-4 text-emerald-400" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
