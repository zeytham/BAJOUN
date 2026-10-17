import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function OfflineStatusBar({ online, pending = 0, onOpen }) {
  const waiting = !online || pending > 0;
  if (!waiting) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-left px-4 py-2 text-[11px] font-bold flex items-center justify-between gap-3 ${
        online ? 'bg-sky-100 text-sky-950' : 'bg-amber-100 text-amber-950'
      }`}
    >
      <span className="flex items-center gap-2">
        {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        {online
          ? `${pending} mauzo yanasubiri kusawazishwa na seva ya duka.`
          : 'Mtandao umekatika. Mauzo yanaendelea kwenye SQLite ya till hii.'}
      </span>
      <span className="underline shrink-0">Angalia</span>
    </button>
  );
}
