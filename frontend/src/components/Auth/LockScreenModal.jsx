import React, { useState } from 'react';
import { Lock, Key, ShieldCheck, LogOut, X } from 'lucide-react';

export default function LockScreenModal({ currentUser, storeSettings, onUnlock, onLogout }) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pin) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/unlock-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, email: currentUser?.email, userId: currentUser?.id }),
      });

      const data = await res.json();
      if (data.success) {
        onUnlock();
      } else {
        setErrorMsg('PIN sio sahihi.');
        setPin('');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Hitilafu ya uhakiki wa PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md text-white font-sans antialiased animate-fadeIn">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-black shadow-lg">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-lg font-black text-white">{storeSettings?.shopName || 'PhoneVault Pro'}</h2>
          <p className="text-xs text-slate-400 font-medium">Screen Locked • {currentUser?.name || 'Store Owner'}</p>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Ingiza PIN ya Tarakimu 4 (Enter 4-Digit PIN)
            </label>
            <input
              type="password"
              maxLength={4}
              autoFocus
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-40 mx-auto bg-slate-800 border-2 border-sky-400/50 rounded-2xl px-4 py-3 text-center text-xl font-mono font-black text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs transition-all shadow-md shadow-sky-600/30"
          >
            {loading ? 'Inahakiki...' : 'Fungua Screen (Unlock)'}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
          <span>PIN ya Majaribio: <strong className="text-amber-300 font-mono">1234</strong></span>
          <button
            onClick={onLogout}
            className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 hover:underline"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
