'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Plus, Users, Settings } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      href: '/jobs',
      label: 'Jobs',
      icon: ClipboardList,
      active: pathname.startsWith('/jobs') && pathname !== '/jobs/new',
    },
    {
      href: '/jobs/new',
      label: 'New Job',
      icon: Plus,
      isPrimary: true,
      active: pathname === '/jobs/new',
    },
    {
      href: '/customers',
      label: 'Vehicles',
      icon: Users,
      active: pathname.startsWith('/customers') || pathname.startsWith('/vehicles'),
    },
    {
      href: '/settings',
      label: 'Workshop',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800 text-zinc-400 no-print safe-area-pb">
      <div className="max-w-4xl mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group focus:outline-none"
              >
                <div className="h-13 w-13 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-lg transition active:scale-95 border-3 border-zinc-900">
                  <Plus className="h-7 w-7 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-semibold text-zinc-200 mt-1">
                  New Job
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] h-full py-1 transition focus:outline-none ${
                item.active ? 'text-amber-400 font-semibold' : 'hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${item.active ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
