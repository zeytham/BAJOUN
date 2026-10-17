import React, { useEffect, useState } from 'react';
import { Cloud, Database, Download, HardDrive, RefreshCw, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import {
  continuityStatus,
  downloadText,
  exportLocalSalesCsv,
  flushOutbox,
  setOfflineManagerPin,
} from '../../offline/engine.js';

function Badge({ ok, label }) {
  return (
    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
      {label}
    </span>
  );
}

export default function ContinuityDesk({ onSync }) {
  const [local, setLocal] = useState(null);
  const [health, setHealth] = useState(null);
  const [backups, setBackups] = useState([]);
  const [apiBase, setApiBase] = useState(localStorage.getItem('phonevault_api_base') || '');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const reload = async () => {
    const status = await continuityStatus();
    setLocal(status);
    setApiBase(status.apiBase || '');
    try {
      const healthRes = await fetch('/api/health');
      const healthJson = await healthRes.json();
      setHealth(healthJson);
      const backupRes = await fetch('/api/backups');
      const backupJson = await backupRes.json();
      setBackups(backupJson.success ? backupJson.data : []);
    } catch {
      setHealth(null);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const run = async (label, action) => {
    setBusy(label);
    setNotice('');
    try {
      await action();
      setNotice(label);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy('');
      await reload();
      if (onSync) onSync();
    }
  };

  const downloadServerFile = async (path, filename) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Server export needs an owner or manager login.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const continuity = health?.continuity;
  const online = local?.online && health?.status === 'ok';

  return (
    <div className="space-y-5">
      <div className="bg-white border border-sky-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {online ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Duka linaendelea bila mtandao</h2>
            <p className="text-xs text-slate-600 max-w-xl">
              Database ya duka ni SQLite kwenye kompyuta hii. Keshia anaweza kuuza hata mtandao ukikatika.
              Risiti inatoka mara moja, kisha mauzo yanasubiri kusafirishwa cloud anwani utakapoiweka.
            </p>
          </div>
        </div>
        <button
          onClick={() => run('Mauzo yaliyosubiri yamesawazishwa.', () => flushOutbox())}
          disabled={Boolean(busy)}
          className="sky-btn-main px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
          Sawazisha sasa
        </button>
      </div>

      {notice && (
        <div className="bg-sky-50 border border-sky-200 text-sky-950 text-xs font-semibold rounded-xl px-4 py-3">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Database} label="Database" value="SQLite" detail="Faili ya duka, si seva nyingine" />
        <Stat icon={HardDrive} label="Mauzo yanayosubiri" value={local?.pending ?? '—'} detail={`${local?.localSales ?? 0} risiti kwenye till hii`} />
        <Stat icon={Cloud} label="Cloud" value={continuity?.cloudConfigured ? 'Imeunganishwa' : 'Bado'} detail={continuity?.pendingCloudSales ? `${continuity.pendingCloudSales} hazijafika cloud` : 'Zitasafiri API ikishawekwa'} />
        <Stat icon={ShieldCheck} label="Mgongano" value={local?.conflicts ?? 0} detail="IMEI iliyouzwa mara mbili offline" />
      </div>

      <section className="bg-white border border-sky-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Backups za tabaka tatu</h3>
            <p className="text-[11px] text-slate-500">Nakala ya kila siku inajaribiwa kufunguka. Nakala ambayo haijajaribiwa haionekani hapa kama iliyopitishwa.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => run('Backup ya leo imehifadhiwa na kujaribiwa.', () => fetch('/api/backups/run', { method: 'POST' }).then(assertOk))} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold">Hifadhi sasa</button>
            <button onClick={() => run('Jaribio la kurejesha limekamilika.', () => fetch('/api/backups/drill', { method: 'POST' }).then(assertOk))} className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-slate-800 text-[11px] font-bold">Jaribu kurejesha</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Tier title="1. Server ya duka" text="Nakala ya SQLite kila siku saa 2:15 usiku, Dar es Salaam. Huhifadhiwa siku 30." />
          <Tier title="2. Nje ya server" text="Nakala iliyosimbwa (AES-256) kwenda S3 au Backblaze B2. Inasubiri funguo zako." />
          <Tier title="3. Faili ya mmiliki" text="Pakua mauzo mwenyewe kama Excel au CSV. Hii haitegemei cloud." />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => run('CSV ya till hii imepakuliwa.', async () => {
              const csv = await exportLocalSalesCsv();
              downloadText(`mauzo-till-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            })}
            className="px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold text-slate-800 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> CSV ya till hii
          </button>
          <button
            onClick={() => run('Excel ya seva imepakuliwa.', () => downloadServerFile('/api/exports/sales.xlsx', `mauzo-${new Date().toISOString().slice(0, 10)}.xlsx`))}
            className="px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold text-slate-800 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Excel ya duka
          </button>
          <button
            onClick={() => run('CSV ya seva imepakuliwa.', () => downloadServerFile('/api/exports/sales.csv', `mauzo-${new Date().toISOString().slice(0, 10)}.csv`))}
            className="px-3 py-2 rounded-xl border border-sky-200 text-xs font-bold text-slate-800 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> CSV ya duka
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-bold">Wakati</th>
                <th className="py-2 pr-3 font-bold">Tabaka</th>
                <th className="py-2 pr-3 font-bold">Faili</th>
                <th className="py-2 pr-3 font-bold">Hali</th>
                <th className="py-2 font-bold">Jaribio la kurejesha</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">Bado hakuna nakala, au unahitaji kuingia kama mmiliki ili kuziona.</td>
                </tr>
              )}
              {backups.slice(0, 8).map((row) => (
                <tr key={row.id} className="border-t border-sky-100">
                  <td className="py-2 pr-3 font-mono">{String(row.createdAt).slice(0, 16).replace('T', ' ')}</td>
                  <td className="py-2 pr-3">{row.tier === 'DAILY_SERVER' ? 'Server' : 'Nje'}</td>
                  <td className="py-2 pr-3 font-mono">{row.fileName}</td>
                  <td className="py-2 pr-3"><Badge ok={row.status === 'OK'} label={row.status} /></td>
                  <td className="py-2"><Badge ok={row.restoreStatus === 'PASS'} label={row.restoreStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-sky-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-900">Anwani ya seva</h3>
          <p className="text-[11px] text-slate-500">
            Weka anwani hii till iko kwenye simu. Mfano <span className="font-mono">http://192.168.1.20:5000</span>.
            Cloud halisi utaiongeza baadaye kwenye seva, si hapa.
          </p>
          <input
            value={apiBase}
            onChange={(event) => setApiBase(event.target.value)}
            placeholder="http://192.168.1.20:5000"
            className="w-full border border-sky-200 rounded-xl px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={() => {
              localStorage.setItem('phonevault_api_base', apiBase.trim().replace(/\/$/, ''));
              setNotice('Anwani ya seva imehifadhiwa kwenye till hii.');
              reload();
            }}
            className="px-3 py-2 rounded-xl bg-[#0284c7] text-white text-xs font-bold"
          >
            Hifadhi anwani
          </button>
        </div>

        <div className="bg-white border border-sky-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-900">PIN ya meneja nje ya mtandao</h3>
          <p className="text-[11px] text-slate-500">
            Inatumika tu bei ikishuka chini ya sakafu na seva haipatikani. Inahifadhiwa kama hash kwenye SQLite ya till, si namba wazi.
          </p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className="w-28 border border-sky-200 rounded-xl px-3 py-2 text-center font-mono tracking-widest"
          />
          <button
            onClick={() => run('PIN ya offline imehifadhiwa.', async () => {
              await setOfflineManagerPin(pin);
              setPin('');
            })}
            className="ml-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            Weka PIN
          </button>
          <p className="text-[10px] text-slate-400 font-mono">Till {local?.deviceId || '…'}</p>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail }) {
  return (
    <div className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sky-800">
        <Icon className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xl font-black text-slate-900 mt-2">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{detail}</div>
    </div>
  );
}

function Tier({ title, text }) {
  return (
    <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
      <div className="text-xs font-black text-slate-900">{title}</div>
      <p className="text-[11px] text-slate-600 mt-1">{text}</p>
    </div>
  );
}

async function assertOk(response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) throw new Error(json.message || 'Kitendo kimeshindwa');
  return json;
}
