'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/' },
    { name: 'VDOT', href: '/vdot' },
    { name: 'Weather', href: '/weather-adjust' },
    { name: 'Zones', href: '/zones' },
    { name: 'Plan', href: '/training-plan' },
    { name: 'Ledger', href: '/pbs' },
    { name: 'Geek Mode', href: '/geek-mode' },
    { name: 'AI Coach', href: '/ai-coach' },
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-lg shadow-inner group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                RunPaceLogic
              </span>
              <span className="block text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
                Science Engine v0.9
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Athlete Profile</span>
              <span className="text-[10px] text-emerald-400 font-medium">VDOT 52.4 • Active</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shadow-inner">
              CM
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
