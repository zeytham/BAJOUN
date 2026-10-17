import React, { useEffect, useState } from 'react';
import { Smartphone, Lock, Mail, ArrowRight } from 'lucide-react';
import { hasOwnerPin, setOwnerPin, verifyOwnerPin } from '../../offline/engine.js';

export default function LoginPortal({ onLoginSuccess, storeSettings }) {
  const [mode, setMode] = useState('server');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerExists, setOwnerExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    hasOwnerPin().then(setOwnerExists).catch(() => setOwnerExists(false));
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('phonevault_token', data.token);
        localStorage.setItem('phonevault_user', JSON.stringify(data.user));
        localStorage.removeItem('phonevault_offline_session');
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.message || 'Kuingia kumedumaa. Angalia email au password.');
      }
    } catch {
      setErrorMsg('Seva haipatikani. Tumia PIN ya duka ili kuuza bila mtandao.');
      setMode('till');
    } finally {
      setLoading(false);
    }
  };

  const handleTillSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      if (!ownerExists) {
        await setOwnerPin(ownerName, pin);
        const user = await verifyOwnerPin(pin);
        localStorage.setItem('phonevault_user', JSON.stringify(user));
        localStorage.setItem('phonevault_offline_session', '1');
        onLoginSuccess(user);
        return;
      }
      const user = await verifyOwnerPin(pin);
      if (!user) {
        setErrorMsg('PIN sio sahihi.');
        return;
      }
      localStorage.setItem('phonevault_user', JSON.stringify(user));
      localStorage.setItem('phonevault_offline_session', '1');
      onLoginSuccess(user);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 text-slate-900 font-sans antialiased overflow-y-auto">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 mx-auto rounded-xl bg-[#0284c7] flex items-center justify-center text-white shadow-md">
            <Smartphone className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {storeSettings?.shopName || 'PhoneVault POS'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Duka la simu. Mauzo yanaendelea hata mtandao ukikatika.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button type="button" onClick={() => setMode('server')} className={`py-2 rounded-lg text-xs font-bold ${mode === 'server' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Seva</button>
          <button type="button" onClick={() => setMode('till')} className={`py-2 rounded-lg text-xs font-bold ${mode === 'till' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>PIN ya duka</button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {mode === 'server' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@phonevault.tz"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-[#0284c7] text-white font-bold text-xs flex items-center justify-center gap-2">
              <span>{loading ? 'Inahakiki...' : 'Ingia'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleTillSubmit} className="space-y-4">
            {!ownerExists && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jina la mmiliki</label>
                <input
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ownerExists ? 'PIN ya tarakimu 4' : 'Weka PIN mpya ya tarakimu 4'}
              </label>
              <input
                required
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-center tracking-[0.4em] font-mono text-lg"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              PIN hii inaishi kwenye SQLite ya till. Hairudi kwenye seva, na inakuwezesha kuuza mtandao ukikatika.
            </p>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs">
              {loading ? 'Inahifadhi...' : ownerExists ? 'Fungua duka' : 'Anzisha duka'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
