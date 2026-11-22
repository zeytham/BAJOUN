import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { phrase } from './i18n.js';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  LayoutDashboard, ShoppingCart, History as HistoryIcon, Package, CreditCard,
  Users, AlertTriangle, BarChart2, PieChart as PieIcon, FileText,
  Settings as SettingsIcon, UserCheck, Store, LogOut, Bell, Download, ChevronRight,
  TrendingUp, ArrowUpRight, Search, Plus, Filter, RefreshCw,
  Shield, Eye, EyeOff, Trash2, Edit, ChevronDown, CheckCircle2,
  Smartphone, Tag, Layers, Activity, Globe, Lock, Upload, Printer,
  X, Menu, Zap, Star, AlertCircle, Hash, Phone, MapPin,
  Calendar, Clock, DollarSign, Package2, Truck, RotateCcw, Moon,
} from 'lucide-react';

/* ─────────────────────────── NAV CONFIG ─────────────────────────── */
const NAV_ICONS = {
  nyumbani: LayoutDashboard,
  uza: ShoppingCart,
  historia: HistoryIcon,
  stoo: Package,
  deni: CreditCard,
  mawinga: Truck,
  matatizo: AlertTriangle,
  wateja: Users,
  warranty: Shield,
  ripoti: BarChart2,
  uchambuzi: PieIcon,
  taarifa: Bell,
  watu: UserCheck,
  mipangilio: SettingsIcon,
};

const GROUPS = [
  ['Duka', [['nyumbani', 'Nyumbani'], ['uza', 'Uza'], ['historia', 'Historia'], ['stoo', 'Stoo'], ['deni', 'Deni']]],
  ['Kazi', [['mawinga', 'Mawinga'], ['matatizo', 'Matatizo'], ['wateja', 'Wateja'], ['warranty', 'Warranty']]],
  ['Hesabu', [['ripoti', 'Ripoti'], ['uchambuzi', 'Uchambuzi'], ['taarifa', 'Taarifa']]],
  ['Ofisi', [['watu', 'Watu'], ['mipangilio', 'Mipangilio']]],
];
const PAGES = GROUPS.flatMap((g) => g[1]);
const LangCtx = createContext((t) => t);
function useT() { return useContext(LangCtx); }
function fill(text, ...parts) {
  return parts.reduce((line, part, index) => line.replaceAll(`{${index}}`, String(part)), String(text ?? ''));
}
const FULL_PERMS = { stock:true, cost:true, history:true, debts:true, customers:true, reports:true, edit:true, analysis:true };
const WhoCtx = createContext({ role:'OWNER', name:'', id:'', perms: FULL_PERMS });
function useWho() { return useContext(WhoCtx); }
function roleWord(role) { return role === 'OWNER' ? 'Mmiliki' : 'Muuzaji'; }

/* ─────────────────────────── HELPERS ─────────────────────────── */
function tsh(value) {
  return `TSH ${Math.round(Number(value) || 0).toLocaleString('en-US')}`;
}
function when(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('sw-TZ', { dateStyle: 'medium', timeStyle: 'short' });
}
function shopHeaders() {
  const raw = sessionStorage.getItem('pv_shop');
  if (!raw) return {};
  const shop = JSON.parse(raw);
  if (shop.mode !== 'remote') return { 'x-shop-mode': 'local' };
  return { 'x-shop-mode': 'remote', 'x-shop-base': shop.base, 'x-shop-token': shop.token };
}
let vaultRevision = '';
function rememberRevision(v) { vaultRevision = v ? String(v) : ''; }
function staffToken() {
  try { return JSON.parse(sessionStorage.getItem('pv_staff') || 'null')?.token || ''; } catch { return ''; }
}

async function api(path, body, method = 'PATCH') {
  const token = localStorage.getItem('phonevault_token');
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(vaultRevision ? { 'x-vault-revision': vaultRevision } : {}),
      ...(staffToken() ? { 'x-staff-token': staffToken() } : {}),
      ...shopHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.error) throw new Error(payload.message || 'Imeshindwa.');
  return payload;
}

async function downloadExcel(kind, start, end) {
  const token = localStorage.getItem('phonevault_token');
  const res = await fetch(`/api/admin/export/${kind}.xlsx?start=${start}&end=${end}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...shopHeaders() },
  });
  if (!res.ok) throw new Error('Excel imeshindwa.');
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `phonevault-${kind}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function dayInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* ══════════════════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [lang, setLang] = useState(localStorage.getItem('pv_lang') || 'sw');
  const [shopPick, setShopPick] = useState(() => sessionStorage.getItem('pv_shop'));
  const t = (text) => phrase(lang, text);
  const leaveShop = () => { sessionStorage.removeItem('pv_shop'); sessionStorage.removeItem('pv_staff'); setShopPick(null); };
  const chooseLang = (next) => { localStorage.setItem('pv_lang', next); setLang(next); };
  const screen = !shopPick
    ? <ShopDoor lang={lang} onLang={chooseLang} onPick={(v) => { sessionStorage.setItem('pv_shop', JSON.stringify(v)); setShopPick(JSON.stringify(v)); }} />
    : (
      <Desk
        user={{ name: 'Duka', role: 'ADMIN', email: '' }}
        lang={lang}
        onLang={setLang}
        onOut={leaveShop}
        onSwitch={leaveShop}
      />
    );
  return <LangCtx.Provider value={t}>{screen}</LangCtx.Provider>;
}

function BrandSeal() {
  return (
    <div className="pv-seal" aria-hidden="true">
      <img src="/zeyhaan-logo.png" alt="" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOGIN / GATE
══════════════════════════════════════════════════════════════════ */
function Gate({ onIn }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.message || 'Kuingia kumedumaa.');
      localStorage.setItem('phonevault_token', body.token);
      localStorage.setItem('phonevault_user', JSON.stringify(body.user));
      onIn(body.user);
    } catch (err) {
      setError(err.message || 'Seva haipatikani.');
    } finally { setBusy(false); }
  }

  return (
    <main className="pv-stage">
      <section className="pv-stage-card">
        <aside className="pv-stage-side">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <BrandSeal />
            <div>
              <b style={{ fontSize:18 }}>{t('PhoneVault')}</b>
              <p style={{ marginTop:2 }}>{t('Deski ya duka')}</p>
            </div>
          </div>
          <div>
            <span className="pv-stage-kicker"><Zap size={13} />{t('Mfumo wa kisasa')}</span>
            <h2 style={{ marginTop:16 }}>{t('Duka lako')}</h2>
            <p style={{ marginTop:10 }}>{t('Mauzo, stoo, deni, na hesabu za simu, sehemu moja.')}</p>
          </div>
          <div className="pv-stage-points">
            <span><BarChart2 size={16} />{t('Ripoti')}</span>
            <span><Lock size={16} />{t('PIN na ruhusa')}</span>
            <span><Smartphone size={16} />{t('Simu na deski')}</span>
          </div>
        </aside>
        <form className="pv-stage-form" onSubmit={submit}>
          <div>
            <h1>{t('Karibu tena')}</h1>
            <p style={{ color:'#64748b', marginTop:6 }}>{t('Ingia kwenye deski ya PhoneVault')}</p>
          </div>
          <label className="pv-field">
            <span>{t('Barua pepe')}</span>
            <div className="pv-field-box">
              <Globe size={16} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('admin@example.com')} required />
            </div>
          </label>
          <label className="pv-field">
            <span>{t('Nenosiri')}</span>
            <div className="pv-field-box">
              <Lock size={16} />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('••••••••')} required />
              <button type="button" className="pv-eye" onClick={() => setShowPw((v) => !v)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </label>
          {error && <Warn>{t(error)}</Warn>}
          <button className="pv-go" disabled={busy}>
            {busy ? t('Inaingia...') : t('Ingia')}
          </button>
        </form>
      </section>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SHOP DOOR
══════════════════════════════════════════════════════════════════ */
function ShopDoor({ onPick, lang, onLang }) {
  const t = useT();
  const [base, setBase] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  function remote(e) {
    e.preventDefault();
    const clean = base.trim().replace(/\/$/, '');
    if (!clean.startsWith('https://') && !clean.startsWith('http://localhost') && !clean.startsWith('http://127.0.0.1')) {
      setError('Anwani ianze na https.'); return;
    }
    if (token.trim().length < 4) { setError('Weka neno la siri la duka.'); return; }
    onPick({ mode: 'remote', base: clean, token: token.trim() });
  }

  return (
    <main className="pv-stage">
      <section className="pv-stage-card">
        <aside className="pv-stage-side">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <BrandSeal />
            <div>
              <b style={{ fontSize:18 }}>{t('PhoneVault')}</b>
              <p style={{ marginTop:2 }}>{t('Deski ya duka')}</p>
            </div>
          </div>
          <div>
            <h2 className="pv-stage-line">{t('Daftari la duka liko hapa.')}</h2>
          </div>
        </aside>
        <form className="pv-stage-form" onSubmit={remote}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <h1 className="pv-hello">{t('Karibu')} <em>{t('tena')}</em></h1>
            <LangMarks lang={lang} onPick={onLang} />
          </div>
          <label className="pv-field">
            <span>{t('Anwani ya duka')}</span>
            <div className="pv-field-box">
              <Globe size={16} />
              <input value={base} onChange={(e) => setBase(e.target.value)} placeholder={t('https://duka.example.com')} />
            </div>
          </label>
          <label className="pv-field">
            <span>{t('Neno la siri')}</span>
            <div className="pv-field-box">
              <Lock size={16} />
              <input type={showSecret ? 'text' : 'password'} value={token} onChange={(e) => setToken(e.target.value)} placeholder={t('Neno la siri')} />
              <button type="button" className="pv-eye" onClick={() => setShowSecret((v) => !v)}>{showSecret ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </label>
          {error && <Warn>{t(error)}</Warn>}
          <button className="pv-go">{t('Ingia')}</button>
        </form>
      </section>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN DESK
══════════════════════════════════════════════════════════════════ */
function PinGate({ faces, error, lang, onLang, onIn, onSwitch, onOut }) {
  const t = useT();
  const people = faces?.staff || [];
  const [picked, setPicked] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selected = people.find((person) => person.id === picked) || null;

  useEffect(() => {
    const list = faces?.staff || [];
    if (!picked && list.length) {
      const owner = list.find((person) => person.role === 'OWNER');
      setPicked((owner || list[0]).id);
    }
  }, [faces, picked]);

  async function submit(next) {
    if (!selected || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const token = localStorage.getItem('phonevault_token');
      const res = await fetch('/api/admin/staff/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...shopHeaders() },
        body: JSON.stringify({ id: selected.id, pin: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.error || !body.success) throw new Error(body.message || 'PIN si sahihi.');
      onIn(body.data);
    } catch (err) {
      setPin('');
      setMessage(err.message || 'PIN si sahihi.');
    } finally { setBusy(false); }
  }

  useEffect(() => {
    function onKey(event) {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.key >= '0' && event.key <= '9') { event.preventDefault(); press(event.key); }
      else if (event.key === 'Backspace') { event.preventDefault(); press('⌫'); }
      else if (event.key === 'Enter' && pin.length === 4) { event.preventDefault(); submit(pin); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pin, picked, busy, selected]);

  function press(key) {
    if (busy) return;
    if (key === '⌫') { setPin((v) => v.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    const next = `${pin}${key}`;
    setPin(next);
    if (next.length === 4) submit(next);
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return (
    <main className="pv-stage">
      <section className="pv-stage-card narrow">
        <aside className="pv-stage-side">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <BrandSeal />
              <div>
                <b style={{ fontSize:18 }}>{faces?.name || 'PhoneVault'}</b>
                <p style={{ marginTop:2 }}>{t('Chagua akaunti, kisha weka PIN.')}</p>
              </div>
            </div>
          </div>
          <div className="pv-faces">
            {people.map((person) => (
              <button key={person.id} type="button" className={person.id === picked ? 'pv-face on' : 'pv-face'} onClick={() => { setPicked(person.id); setPin(''); setMessage(''); }}>
                <i>{person.photo ? <img alt="" src={`data:image/jpeg;base64,${person.photo}`} /> : String(person.name || '?').slice(0, 1)}</i>
                <span><b>{person.name}</b><small>{t(roleWord(person.role))}</small></span>
              </button>
            ))}
            {!people.length && <p>{error ? t(error) : t('Inapakia duka...')}</p>}
          </div>
        </aside>
        <div className="pv-stage-form">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <div>
              <h1>{selected?.name || t('PIN')}</h1>
              <p style={{ color:'#64748b', marginTop:6 }}>{selected ? t(roleWord(selected.role)) : t('PIN ya tarakimu 4')}</p>
            </div>
            <LangMarks lang={lang} onPick={onLang} />
          </div>
          <div className="pv-dots" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <span key={i} className={pin.length > i ? 'on' : ''} />)}
          </div>
          {(message || (error && people.length)) && <Warn>{t(message || error)}</Warn>}
          <div className="pv-pad">
            {keys.map((key) => (
              <button key={key || 'gap'} type="button" className="pv-key" disabled={!key || busy} onClick={() => press(key)}>{key}</button>
            ))}
          </div>
          <div className="pv-stage-links">
            <button type="button" onClick={onSwitch}>{t('Badilisha Duka')}</button>
            <button type="button" onClick={onOut}>{t('Toka')}</button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Desk({ user, lang, onLang, onOut, onSwitch }) {
  const today = dayInput(new Date());
  const [page, setPage] = useState('nyumbani');
  const [start, setStart] = useState('2000-01-01');
  const [end, setEnd] = useState(today);
  const [query, setQuery] = useState('');
  const [shop, setShop] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');
  const [tick, setTick] = useState(0);
  const [carry, setCarry] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [who, setWho] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pv_staff') || 'null'); } catch { return null; }
  });
  const [faces, setFaces] = useState(null);
  const [faceError, setFaceError] = useState('');
  const noticeTimer = useRef(null);
  const shopRef = useRef(null);
  const heldRange = useRef('');
  const forceReload = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  function periodBounds(key) {
    const now = new Date();
    const endDay = dayInput(now);
    if (key === 'Leo') return [endDay, endDay];
    if (key === 'Jana') {
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      const yesterday = dayInput(day);
      return [yesterday, yesterday];
    }
    if (key === 'Wiki hii') {
      const day = new Date(now);
      day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
      return [dayInput(day), endDay];
    }
    if (key === 'Mwezi huu') return [dayInput(new Date(now.getFullYear(), now.getMonth(), 1)), endDay];
    if (key === 'Zote') return ['2000-01-01', endDay];
    return [`${now.getFullYear()}-01-01`, endDay];
  }

  function choosePeriod(key) {
    const [from, to] = periodBounds(key);
    setStart(from);
    setEnd(to);
  }

  function setBound(which, value) {
    if (!value) return;
    if (which === 'start') {
      if (end && value > end) { setStart(end); setEnd(value); return; }
      setStart(value);
      return;
    }
    if (start && value < start) { setEnd(start); setStart(value); return; }
    setEnd(value);
  }

  function reloadShop() {
    forceReload.current = true;
    setRefreshing(true);
    setTick((v) => v + 1);
  }

  const saved = (text) => {
    setNotice(text);
    setTick((v) => v + 1);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4000);
  };

  async function pickLang(next) {
    localStorage.setItem('pv_lang', next);
    onLang(next);
    try { await api('/api/admin/shop/lang', { lang: next }, 'PUT'); } catch { /* ignore */ }
  }

  function lockStaff() {
    sessionStorage.removeItem('pv_staff');
    rememberRevision('');
    heldRange.current = '';
    shopRef.current = null;
    setShop(null);
    setWho(null);
    setPage('nyumbani');
  }

  useEffect(() => {
    if (who) return undefined;
    const ctrl = new AbortController();
    const token = localStorage.getItem('phonevault_token');
    fetch('/api/admin/faces', {
      signal: ctrl.signal,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...shopHeaders() },
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.message || 'Akaunti hazikufunguka.');
        setFaces(body.data);
        setFaceError('');
      })
      .catch((err) => { if (err.name !== 'AbortError') setFaceError(err.message); });
    return () => ctrl.abort();
  }, [who]);

  useEffect(() => {
    if (!who) return undefined;
    const ctrl = new AbortController();
    let live = true;
    if (!shopRef.current) setLoading(true);
    else setRefreshing(true);
    const ask = `${start}|${end}`;
    const reuse = !forceReload.current && heldRange.current === ask && vaultRevision;
    forceReload.current = false;
    const token = localStorage.getItem('phonevault_token');
    fetch(`/api/admin/shop?start=${start}&end=${end}`, {
      signal: ctrl.signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...shopHeaders(),
        ...(staffToken() ? { 'x-staff-token': staffToken() } : {}),
        ...(reuse ? { 'x-vault-revision': vaultRevision, 'x-shop-start': start, 'x-shop-end': end } : {}),
      },
    })
      .then(async (res) => {
        const body = await res.json();
        if (res.status === 401) throw new Error('Ingia tena.');
        if (!body.success) throw new Error(body.message || 'Duka halikufunguka.');
        if (!live || body.unchanged) return;
        shopRef.current = body.data;
        heldRange.current = ask;
        rememberRevision(body.data?.revision);
        setShop(body.data);
      })
      .catch((err) => { if (live && err.name !== 'AbortError' && !shopRef.current) setError(err.message); })
      .finally(() => { if (live) { setLoading(false); setRefreshing(false); } });
    return () => { live = false; ctrl.abort(); };
  }, [start, end, tick, who]);

  useEffect(() => {
    if (!who) return;
    const allowed = who.role === 'OWNER' || ['nyumbani', 'uza', 'historia', 'mawinga', 'matatizo', 'warranty', 'taarifa', 'mipangilio'].includes(page)
      || (page === 'stoo' && who.perms?.stock)
      || (page === 'deni' && who.perms?.debts)
      || (page === 'wateja' && who.perms?.customers)
      || (page === 'ripoti' && who.perms?.reports)
      || (page === 'uchambuzi' && who.perms?.analysis);
    if (!allowed) setPage('nyumbani');
  }, [who, page]);

  const needle = query.trim().toLowerCase();
  const sales = useMemo(() => filterSales(shop?.sales || [], needle), [shop, needle]);
  const title = PAGES.find((p) => p[0] === page)?.[1] || '';
  const t = (text) => phrase(lang, text);
  const PageIcon = NAV_ICONS[page] || LayoutDashboard;
  const allow = {
    nyumbani: true, uza: true, historia: true,
    stoo: !!who?.perms?.stock, deni: !!who?.perms?.debts,
    mawinga: true, matatizo: true, wateja: !!who?.perms?.customers, warranty: true,
    ripoti: !!who?.perms?.reports, uchambuzi: !!who?.perms?.analysis, taarifa: true,
    watu: who?.role === 'OWNER', mipangilio: true,
  };

  if (!who) {
    return (
      <LangCtx.Provider value={t}>
        <PinGate faces={faces} error={faceError} lang={lang} onLang={pickLang} onSwitch={onSwitch} onOut={onOut}
          onIn={(person) => { sessionStorage.setItem('pv_staff', JSON.stringify(person)); setWho(person); }} />
      </LangCtx.Provider>
    );
  }

  return (
    <LangCtx.Provider value={t}>
    <WhoCtx.Provider value={who}>
      <div className="pv-app" style={{ display:'flex', minHeight:'100vh', position:'relative' }}>

        {/* Mobile overlay */}
        {sideOpen && (
          <div
            onClick={() => setSideOpen(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:19, backdropFilter:'blur(4px)' }}
          />
        )}

        {/* SIDEBAR */}
        <aside className={`pv-side${sideOpen ? ' open' : ''}`}>
          {/* Logo area */}
          <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:10 }}>
            {shop?.shop?.logo
              ? <img src={`data:image/jpeg;base64,${shop.shop.logo}`} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'contain', background:'rgba(255,255,255,0.1)' }} />
              : <div className="pv-mark">{t('PV')}</div>
            }
            <div style={{ minWidth:0 }}>
              <p style={{ fontWeight:800, fontSize:14, color:'#f4fbf6', letterSpacing:'-0.01em', lineHeight:1 }}>{t('PhoneVault')}</p>
              <p style={{ fontSize:11, color:'#c5e6b8', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:150 }}>
                {shop?.shop?.name || 'Duka'}
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:'8px 8px 0', overflowY:'auto' }}>
            {GROUPS.map(([group, items]) => (
              <div key={group} style={{ marginBottom:4 }}>
                <p className="pv-kicker">{t(group)}</p>
                {items.filter(([id]) => allow[id]).map(([id, label]) => {
                  const Icon = NAV_ICONS[id] || LayoutDashboard;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setPage(id); setOpenId(null); setQuery(''); setSideOpen(false); }}
                      className={`pv-link ${page === id ? 'pv-link-on' : ''}`}
                      style={{ width:'100%' }}
                    >
                      <Icon size={15} style={{ flexShrink:0 }} />
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{t(label)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom actions */}
          <div style={{ padding:'12px 10px 16px', borderTop:'1px solid rgba(255,255,255,0.1)', display:'flex', flexDirection:'column', gap:6 }}>
            <button type="button" onClick={onSwitch} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#e7f6df', fontWeight:600, fontSize:13, width:'100%', cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background='#509541'; e.currentTarget.style.color='#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#e7f6df'; }}
            >
              <Store size={14} />{t('Badilisha Duka')}
            </button>
            <button type="button" onClick={lockStaff} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#e7f6df', fontWeight:600, fontSize:13, width:'100%', cursor:'pointer' }}>
              <Lock size={14} />{t('Funga')}
            </button>
            <button type="button" onClick={onOut} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, background:'rgba(248,81,73,0.06)', border:'1px solid rgba(248,81,73,0.15)', color:'var(--danger)', fontWeight:600, fontSize:13, width:'100%', cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background='rgba(248,81,73,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background='rgba(248,81,73,0.06)'; }}
            >
              <LogOut size={14} />{t('Toka')}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="pv-main">
            <header className="pv-top no-print">
              <div className="pv-top-id">
                <button type="button" onClick={() => setSideOpen((v) => !v)} className="pv-menu" style={{ width:40, height:40, borderRadius:12, background:'#fff', border:'1px solid #d7e8d4', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#509541' }}>
                  <Menu size={18} />
                </button>
                <div className="pv-top-mark"><PageIcon size={18} /></div>
                <div style={{ minWidth:0 }}>
                  <h1>{t(title)}</h1>
                  <p className="pv-top-sub">{who.name} · {t(roleWord(who.role))} · {shop?.shop?.name || t('Duka')}</p>
                </div>
              </div>
              <div className="pv-tools no-print">
                <LangMarks lang={lang} onPick={pickLang} />
                <div className="pv-seg">
                  {['Leo', 'Jana', 'Wiki hii', 'Mwezi huu', 'Mwaka huu', 'Zote'].map((key) => {
                    const [from, to] = periodBounds(key);
                    return (
                      <button type="button" key={key} className={start === from && end === to ? 'on' : ''} onClick={() => choosePeriod(key)}>{t(key)}</button>
                    );
                  })}
                </div>
                <div className="pv-range">
                  <label className="pv-date"><span>{t('Mwanzo')}</span><input type="date" value={start} max={end || undefined} onChange={(e) => setBound('start', e.target.value)} /></label>
                  <span style={{ color:'#7e9778', fontWeight:800 }}>–</span>
                  <label className="pv-date"><span>{t('Mwisho')}</span><input type="date" value={end} min={start || undefined} onChange={(e) => setBound('end', e.target.value)} /></label>
                </div>
                <button type="button" className={refreshing ? 'pv-refresh spin' : 'pv-refresh'} onClick={reloadShop} title={t('Onyesha upya')}><RefreshCw size={16} /></button>
                <button type="button" onClick={onSwitch} className="lg:hidden" style={{ padding:'8px 12px', borderRadius:999, border:'1px solid #d7e8d4', background:'#fff', fontWeight:800, fontSize:12, cursor:'pointer' }}>{t('Duka')}</button>
                <button type="button" onClick={onOut} className="lg:hidden" style={{ padding:'8px 12px', borderRadius:999, background:'#fff5f5', border:'1px solid #f3d0d0', color:'#dc2626', fontSize:12, fontWeight:800, cursor:'pointer' }}>{t('Toka')}</button>
              </div>
            </header>
          <div className="pv-body">

            {/* Notice */}
            {notice && (
              <div className="pv-notice no-print">
                <CheckCircle2 size={15} />
                <span>{notice}</span>
              </div>
            )}

            {/* Content */}
            <div className="pv-rise" style={{ marginTop:24 }}>
              {loading && !shop && (
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'40px 0', color:'var(--text-secondary)' }}>
                  <div className="pv-loading" />
                  <span style={{ fontSize:14 }}>{t('Inapakia duka...')}</span>
                </div>
              )}
              {error && !shop && (
                <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(248,81,73,0.1)', border:'1px solid rgba(248,81,73,0.25)', borderRadius:12, padding:'14px 18px' }}>
                  <AlertCircle size={16} color="var(--danger)" />
                  <span style={{ fontSize:14, color:'var(--danger)', fontWeight:600 }}>{error}</span>
                </div>
              )}
              {!loading && shop && !shop.linked && <Empty />}
              {shop?.linked && (
                <>
                  {page === 'nyumbani'  && <Home shop={shop} onOpen={setPage} />}
                  {page === 'uza'       && <Till shop={shop} carry={carry} onCarry={() => setCarry(null)} onSaved={saved} />}
                  {page === 'historia'  && <History sales={sales} total={shop.saleCount} hidden={shop.hidden || []} hiddenUntil={shop.hiddenUntil} query={query} setQuery={setQuery} openId={openId} setOpenId={setOpenId} returns={shop.returns} start={start} end={end} onSaved={saved} />}
                  {page === 'stoo'      && <Stock shop={shop} query={query} setQuery={setQuery} onSaved={saved} start={start} end={end} />}
                  {page === 'deni'      && <Debts shop={shop} query={query} setQuery={setQuery} onSaved={saved} />}
                  {page === 'mawinga'   && <Wings rows={shop.wings} shop={shop} onSaved={saved} />}
                  {page === 'matatizo'  && <Till shop={shop} faulty onSaved={saved} />}
                  {page === 'wateja'    && <Customers rows={shop.customers} sales={shop.sales} debts={shop.debts} returns={shop.returns} query={query} setQuery={setQuery} onSaved={saved} start={start} end={end} />}
                  {page === 'ripoti'    && <Report shop={shop} start={start} end={end} />}
                  {page === 'uchambuzi' && <Analysis shop={shop} />}
                  {page === 'warranty'  && <Warranty rows={shop.warranty} />}
                  {page === 'taarifa'   && <Notes rows={shop.notes} onSaved={saved} />}
                  {page === 'watu'      && <Staff rows={shop.staff} onSaved={saved} />}
                  {page === 'mipangilio' && <Settings shop={shop} lang={lang} onLang={pickLang} onSaved={saved} />}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </WhoCtx.Provider>
    </LangCtx.Provider>
  );
}

/* ─── Small reusable UI ─── */
function BtnDate({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ padding:'7px 12px', borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border-default)', color:'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor='var(--border-default)'; e.currentTarget.style.color='var(--text-secondary)'; }}
    >{label}</button>
  );
}

function DateField({ label, value, onChange }) {
  const t = useT();
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{t(label)}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:8, color:'var(--text-primary)', padding:'5px 10px', fontSize:12, outline:'none', height:34 }}
      />
    </label>
  );
}

/* Legacy alias */
function Field({ label, value, onChange }) { return <DateField label={label} value={value} onChange={onChange} />; }

function Empty() {
  const t = useT();
  return (
    <article style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:20, padding:40, maxWidth:480 }}>
      <div style={{ width:48, height:48, borderRadius:12, background:'rgba(128,192,80,0.1)', display:'grid', placeItems:'center', marginBottom:20 }}>
        <Smartphone size={24} color="var(--accent)" />
      </div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:10 }}>{t('Simu haijaunganishwa bado.')}</h2>
      <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7 }}>
        Deski hii inasoma daftari la PhoneVault. Weka kiungo cha duka kwenye mipangilio ya simu. Mauzo, stoo, deni, mawinga, na matatizo yataonekana hapa.
      </p>
    </article>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HOME DASHBOARD
══════════════════════════════════════════════════════════════════ */
const CHART_TIP = { background:'#fff', border:'1px solid #d7e8d4', borderRadius:10, fontSize:12, color:'#0f172a' };
const PIE_COLORS = ['#509541', '#1f5c28', '#3d7a32', '#b45309', '#7e9778', '#6aaf3e'];

function Home({ shop, onOpen }) {
  const t = useT();
  const who = useWho();
  const money = shop.money;
  const profit = shop.profit || {};
  const kpis = [
    { label: t('Pesa iliyoingia'), value: tsh(money.drawer), icon: TrendingUp, page: 'ripoti' },
    { label: t('Mauzo'), value: tsh(money.billed), icon: ShoppingCart, note: `${money.receipts} ${t('Risiti')}`, page: 'historia' },
    { label: t('Faida'), value: tsh(profit.shopProfit ?? money.profit), icon: Activity, page: 'uchambuzi' },
    { label: t('Deni wazi'), value: tsh(money.openDebt), icon: CreditCard, page: 'deni', warn: true },
  ];
  const slices = [
    { name: 'Cash', value: money.cashSales + money.cashDebts, color: '#509541' },
    { name: 'Lipa', value: money.lipaSales + money.lipaDebts, color: '#1f5c28' },
    { name: 'Deni', value: money.openDebt, color: '#b45309' },
  ];
  const drawn = slices.filter((s) => s.value > 0);
  const days = shop.days || [];
  const profitBars = [
    { name: 'Simu', value: Math.round(profit.phones?.profit || 0) },
    { name: 'Vifaa', value: Math.round(profit.goods?.profit || 0) },
    { name: 'Matatizo', value: Math.round(profit.faultProfit || 0) },
  ];
  const groups = (shop.groups || []).map((row, i) => ({ name: row.name, value: row.total, color: PIE_COLORS[i % PIE_COLORS.length] }));
  const jumps = [
    { id:'historia', label:'Historia', count: money.receipts, icon: HistoryIcon },
    { id:'stoo', label:'Stoo', count: shop.stock.length, icon: Package },
    { id:'deni', label:'Deni', count: money.openDebtCount, icon: CreditCard },
    { id:'mawinga', label:'Mawinga', count: (shop.wings||[]).filter((r) => r.status !== 'BACK').length, icon: Truck },
    { id:'matatizo', label:'Matatizo', count: (shop.faults||[]).length, icon: AlertTriangle },
    { id:'wateja', label:'Wateja', count: (shop.customers||[]).length, icon: Users },
  ];
  const latest = (shop.sales || []).slice(0, 6);
  if (who.role !== 'OWNER') {
    const actions = [
      ['uza', 'Uza'],
      who.perms.stock && ['stoo', 'Stoo'],
      who.perms.debts && ['deni', 'Deni'],
      ['mawinga', 'Mawinga'],
      ['matatizo', 'Matatizo'],
      ['historia', who.perms.history ? 'Historia' : 'Mauzo yangu'],
      who.perms.customers && ['wateja', 'Wateja'],
      ['warranty', 'Warranty'],
      who.perms.reports && ['ripoti', 'Ripoti'],
      who.perms.analysis && ['uchambuzi', 'Uchambuzi'],
      ['taarifa', 'Taarifa'],
    ].filter(Boolean);
    return (
      <div className="pv-home-kpis">
        {actions.map(([id, label]) => (
          <button key={id} type="button" className="pv-panel" onClick={() => onOpen(id)} style={{ textAlign:'left', cursor:'pointer', fontWeight:800 }}>
            {t(label)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="pv-home-kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button key={kpi.label} type="button" onClick={() => onOpen(kpi.page)} style={{ textAlign:'left', cursor:'pointer', background:'none', border:'none', padding:0 }}>
              <article className="pv-kpi" style={kpi.warn ? { borderColor:'rgba(180,83,9,0.25)', background:'#fff8ef' } : { background:'#fff' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color: kpi.warn ? 'var(--warning)' : 'var(--text-secondary)' }}>{kpi.label}</p>
                  <div style={{ width:30, height:30, borderRadius:8, background: kpi.warn ? 'rgba(180,83,9,0.1)' : 'rgba(128,192,80,0.16)', display:'grid', placeItems:'center' }}>
                    <Icon size={14} color={kpi.warn ? 'var(--warning)' : 'var(--accent)'} />
                  </div>
                </div>
                <p style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color: kpi.warn ? 'var(--warning)' : 'var(--text-primary)' }}>{kpi.value}</p>
                {kpi.note && <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:6 }}>{kpi.note}</p>}
              </article>
            </button>
          );
        })}
      </div>

      <article className="pv-panel">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
          <p style={{ fontWeight:800 }}>{t('Mauzo kwa siku')}</p>
          <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{days.length} siku</p>
        </div>
        <div className="pv-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days.length ? days : [{ day:'—', total:0 }]}>
              <defs>
                <linearGradient id="saleFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#509541" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#509541" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e3f0df" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize:11, fill:'#64748b' }} />
              <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={64} />
              <Tooltip formatter={(v) => tsh(v)} contentStyle={CHART_TIP} />
              <Area type="monotone" dataKey="total" name="Mauzo" stroke="#509541" fill="url(#saleFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="pv-home-three">
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:4 }}>{t('Malipo')}</p>
          <div className="pv-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={drawn.length ? drawn : [{ name:'Bado', value:1, color:'#e3f0df' }]} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                  {(drawn.length ? drawn : [{ name:'Bado', color:'#e3f0df' }]).map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [name === 'Bado' ? tsh(0) : tsh(v), name]} contentStyle={CHART_TIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {slices.map((s) => (
            <p key={s.name} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginTop:4 }}>
              <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:99, background:s.color, marginRight:8 }} />{t(s.name)}</span>
              <b>{tsh(s.value)}</b>
            </p>
          ))}
        </article>
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:4 }}>{t('Faida')}</p>
          <div className="pv-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitBars}>
                <CartesianGrid stroke="#e3f0df" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:12, fill:'#64748b' }} />
                <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={64} />
                <Tooltip formatter={(v) => tsh(v)} contentStyle={CHART_TIP} />
                <Bar dataKey="value" radius={[8,8,0,0]}>
                  {profitBars.map((row) => <Cell key={row.name} fill={row.value < 0 ? '#b45309' : '#509541'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:4 }}>{t('Vikundi')}</p>
          <div className="pv-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={groups.length ? groups : [{ name:'Bado', value:1, color:'#e3f0df' }]} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={2}>
                  {(groups.length ? groups : [{ name:'Bado', color:'#e3f0df' }]).map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(v) => tsh(v)} contentStyle={CHART_TIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {groups.slice(0, 4).map((s) => (
            <p key={s.name} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginTop:4 }}>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t(s.name)}</span>
              <b>{tsh(s.value)}</b>
            </p>
          ))}
        </article>
      </div>

      <div className="pv-home-split">
        <article className="pv-panel" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontWeight:800 }}>{t('Risiti za hivi karibuni')}</p>
            <button type="button" onClick={() => onOpen('historia')} style={{ color:'var(--accent)', fontWeight:700, fontSize:13 }}>{t('Historia')}</button>
          </div>
          <div className="pv-sheet" style={{ border:'none', borderRadius:0, animation:'none' }}>
            <table>
              <thead><tr><th>{t('Risiti')}</th><th>{t('Mteja')}</th><th>{t('Malipo')}</th><th>{t('Kiasi')}</th></tr></thead>
              <tbody>
                {latest.map((sale) => (
                  <tr key={sale.id} onClick={() => onOpen('historia')} style={{ cursor:'pointer' }}>
                    <td>{sale.invoice}</td>
                    <td>{sale.customer}</td>
                    <td>{sale.method}</td>
                    <td>{tsh(sale.total)}</td>
                  </tr>
                ))}
                {latest.length === 0 && <tr><td colSpan={4}>{t('Hakuna risiti katika kipindi hiki.')}</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:10 }}>{t('Fungua')}</p>
          <div className="pv-jumps">
            {jumps.map(({ id, label, count, icon: Icon }) => (
              <button key={id} type="button" onClick={() => onOpen(id)} className="pv-panel" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 12px', cursor:'pointer', textAlign:'left' }}>
                <span style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700 }}><Icon size={15} color="#509541" />{t(label)}</span>
                <b style={{ color:'#509541' }}>{count}</b>
              </button>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

/* ─── Legacy Card for other pages ─── */
function Card({ label, value, note, dark }) {
  return (
    <article className={`pv-kpi${dark?' pv-kpi-dark':''}`}>
      <p>{label}</p>
      <p>{value}</p>
      {note && <p style={{ marginTop:6, fontSize:12, fontWeight:500 }}>{note}</p>}
    </article>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HELPER: filter sales
══════════════════════════════════════════════════════════════════ */
function filterSales(sales, needle) {
  if (!needle) return sales;
  return sales.filter((sale) =>
    [sale.invoice, sale.customer, sale.phone, sale.method, ...(sale.items || []).map((it) => `${it.name} ${it.imei}`)].join(' ').toLowerCase().includes(needle)
  );
}

/* ══════════════════════════════════════════════════════════════════
   TILL (UUZAJI)
══════════════════════════════════════════════════════════════════ */
function Till({ shop, carry, onCarry, onSaved, faulty = false }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState('CASH');
  const [part, setPart] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [lipaRef, setLipaRef] = useState('');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [term, setTerm] = useState('30');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [cat, setCat] = useState('');

  const needle = q.trim().toLowerCase();
  const phoneCats = (shop.categories || []).filter((row) => row.kind === 'phone' || row.id === 'phones');
  const goodsCats = (shop.categories || []).filter((row) => row.kind !== 'phone' && row.id !== 'phones');
  const phonePick = cat === 'phones' || phoneCats.some((row) => row.id === cat);
  const goods = shop.stock.filter((it) => {
    if (faulty ? !(it.fault > 0) : it.stock <= 0) return false;
    if (!`${it.name} ${it.barcode}`.toLowerCase().includes(needle)) return false;
    if (!cat) return true;
    if (phonePick) return it.type === 'PHONE' && (cat === 'phones' || it.categoryId === cat);
    return it.type !== 'PHONE' && it.categoryId === cat;
  }).slice(0, 24);
  const units = shop.units.filter((it) => (faulty ? it.status === 'FAULTY' : it.status === 'IN_STOCK') && `${it.name} ${it.imei}`.toLowerCase().includes(needle) && (!cat || (phonePick && (cat === 'phones' || it.categoryId === cat)))).slice(0, 24);
  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const payMethod = method === 'PART' ? part : method;
  const handed = payMethod === 'DENI' ? 0 : Number(amount || 0);
  const paying = payMethod === 'LIPA' ? Math.min(handed, total) : handed;
  const change = payMethod === 'CASH' ? Math.max(0, handed - total) : 0;
  const debt = Math.max(0, total - Math.min(paying, total));
  const taken = useRef(null);

  useEffect(() => {
    if (!carry || taken.current === carry) return;
    taken.current = carry; add(carry); onCarry();
  }, [carry]);

  function add(line) {
    const next = faulty ? { ...line, faulty: true } : line;
    setReceipt(null);
    setCart((rows) => {
      if (next.phoneId) return rows.some((r) => r.phoneId === next.phoneId) ? rows : [...rows, next];
      const hit = rows.find((r) => r.productId === next.productId && !r.phoneId);
      if (!hit) return [...rows, next];
      return rows.map((r) => r === hit ? { ...r, qty: r.qty + 1 } : r);
    });
  }

  function takeTyped(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const code = q.trim().toLowerCase();
    const unit = units.find((it) => String(it.imei).toLowerCase() === code) || (units.length === 1 && !goods.length ? units[0] : null);
    const item = goods.find((it) => String(it.barcode || '').toLowerCase() === code) || (!unit && goods.length === 1 && !units.length ? goods[0] : null);
    if (unit) add({ name: unit.name, price: unit.price, qty: 1, phoneId: unit.id, productId: '', floor: unit.floor });
    else if (item) add({ name: item.name, price: item.price, qty: 1, productId: item.id, phoneId: '' });
    else return;
    setQ('');
  }

  async function sell(e) {
    e.preventDefault(); setError('');
    try {
      await api('/api/admin/sales', {
        method: payMethod, amount: handed, lipaRef, customer, phone,
        termDays: debt > 0 ? Number(term) : 0,
        lines: cart.map((l) => ({ productId: l.productId, phoneId: l.phoneId, qty: l.qty, price: l.price, faulty: !!l.faulty, imei: l.imei || '' })),
      }, 'POST');
      setReceipt({ invoice:'Risiti', lines:cart, total, paid:Math.min(paying, total), change, debt, method:payMethod, customer:customer||'Walk-in', lipaRef });
      setCart([]); onSaved('Mauzo yamehifadhiwa.');
    } catch (err) { setError(err.message); }
  }

  const who = useWho();
  const payMethods = [
    { id:'CASH', label:'Cash' },
    { id:'LIPA', label:'Lipa' },
    ...(who.perms.debts ? [{ id:'DENI', label:'Deni' }, { id:'PART', label:'Sehemu' }] : []),
  ];

  return (
    <div className="pv-pos">
      <section className="pv-panel">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <p style={{ fontWeight:800 }}>{t(faulty ? 'Matatizo ya kuuza' : 'Stoo ya kuuza')}</p>
          <span style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:700 }}>{fill(t('{0} vinapatikana'), units.length + goods.length)}</span>
        </div>
        <div style={{ position:'relative', marginBottom:12 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={takeTyped}
            style={{ width:'100%', paddingLeft:38, background:'#fff', border:'1px solid var(--border-default)', borderRadius:10, color:'var(--text-primary)', height:42, outline:'none', fontSize:14 }}
          />
        </div>
        <div className="pv-chips" style={{ marginBottom:12 }}>
          <KindTab active={cat===''} onClick={() => setCat('')}>{t('Zote')}</KindTab>
          <KindTab active={cat==='phones'} onClick={() => setCat('phones')}>{t('Simu')}</KindTab>
          {phoneCats.filter((row) => row.id !== 'phones').map((row) => (
            <KindTab key={row.id} active={cat===row.id} secondary onClick={() => setCat(row.id)}>{row.name}</KindTab>
          ))}
          {goodsCats.map((row) => (
            <KindTab key={row.id} active={cat===row.id} secondary onClick={() => setCat(row.id)}>{row.name}</KindTab>
          ))}
        </div>
        <div className="pv-pos-list">
          {units.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => add({ name:it.name, price:it.price, qty:1, phoneId:it.id, productId:'', floor:it.floor })}
              className="pv-hit"
            >
              <div>
                <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{it.name}</p>
                <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{it.imei} · {fill(t('Sakafu {0}'), tsh(it.floor || it.price))}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ background:'rgba(128,192,80,0.1)', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700, color:'var(--accent)' }}>{t('IMEI')}</span>
                <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{tsh(it.price)}</span>
              </div>
            </button>
          ))}
          {goods.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => add({ name:it.name, price:it.price, qty:1, productId:it.id, phoneId:'' })}
              className="pv-hit"
            >
              <div>
                <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{it.name}</p>
                <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{it.barcode || t('Bila msimbo')} · {fill(t('Stoo {0}'), it.stock)}</p>
              </div>
              <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{tsh(it.price)}</span>
            </button>
          ))}
          {!units.length && !goods.length && (
            <p style={{ textAlign:'center', padding:'24px 0', color:'var(--text-secondary)', fontSize:14 }}>{t('Hakuna bidhaa katika kundi hili.')}</p>
          )}
        </div>
      </section>

      {/* Cart & checkout */}
      <form onSubmit={sell} className="pv-panel" style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:84 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <p style={{ fontWeight:700, fontSize:15 }}>{t('Kasha la Uuzaji')}</p>
          {cart.length > 0 && <span style={{ background:'rgba(128,192,80,0.12)', color:'var(--accent)', borderRadius:999, padding:'2px 10px', fontSize:12, fontWeight:700 }}>{cart.length}</span>}
        </div>

        {/* Cart items */}
        {cart.length === 0 && (
          <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-muted)' }}>
            <ShoppingCart size={28} style={{ margin:'0 auto 8px', opacity:.4 }} />
            <p style={{ fontSize:13 }}>{t('Bonyeza bidhaa ili iingie hapa')}</p>
          </div>
        )}
        {cart.map((line, idx) => (
          <div key={`${line.phoneId}${line.productId}${idx}`} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'10px 14px', background:'var(--bg-elevated)', borderRadius:10, fontSize:13 }}>
            <span style={{ fontWeight:600, color:'var(--text-primary)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {line.name}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              {!line.phoneId && (
                <>
                  <button type="button" onClick={() => setCart(cart.map((r,i) => i===idx ? {...r,qty:Math.max(1,r.qty-1)}:r))} style={{ width:26, height:26, borderRadius:6, background:'#fff', border:'1px solid var(--border-default)', color:'var(--text-primary)', fontWeight:700, cursor:'pointer' }}>−</button>
                  <span style={{ minWidth:16, textAlign:'center', fontWeight:800 }}>{line.qty}</span>
                  <button type="button" onClick={() => setCart(cart.map((r,i) => i===idx ? {...r,qty:r.qty+1}:r))} style={{ width:26, height:26, borderRadius:6, background:'rgba(128,192,80,0.12)', border:'none', color:'var(--accent)', fontWeight:700, cursor:'pointer', fontSize:14, display:'grid', placeItems:'center' }}>+</button>
                </>
              )}
              <span style={{ fontWeight:700, color:'var(--text-primary)' }}>{tsh(line.price * line.qty)}</span>
              <button type="button" onClick={() => setCart(cart.filter((_,i) => i!==idx))} style={{ width:24, height:24, borderRadius:6, background:'rgba(248,81,73,0.1)', border:'none', color:'var(--danger)', cursor:'pointer', display:'grid', placeItems:'center' }}>
                <X size={12} />
              </button>
            </div>
          </div>
        ))}

        {/* Payment method */}
        <div>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{t('Aina ya Malipo')}</p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {payMethods.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                style={{ padding:'7px 14px', borderRadius:8, background: method===id?'var(--accent)':'var(--bg-elevated)', color: method===id?'#fff':'var(--text-secondary)', border:`1px solid ${method===id?'transparent':'var(--border-default)'}`, fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .15s' }}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>
        {method === 'PART' && (
          <div style={{ display:'flex', gap:6 }}>
            {['CASH','LIPA'].map((it) => (
              <button key={it} type="button" onClick={() => setPart(it)} style={{ padding:'6px 14px', borderRadius:8, background: part===it?'var(--accent-dim)':'var(--bg-elevated)', color: part===it?'var(--accent)':'var(--text-secondary)', border:`1px solid ${part===it?'rgba(128,192,80,0.3)':'var(--border-default)'}`, fontWeight:700, fontSize:13, cursor:'pointer' }}>{it}</button>
            ))}
          </div>
        )}

        {/* Inputs */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {payMethod !== 'DENI' && <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.form?.requestSubmit(); }} placeholder={t('Kiasi')} style={{ width:'100%', padding:'9px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:9, color:'var(--text-primary)', fontSize:14, outline:'none' }} />}
          {payMethod === 'LIPA' && <input value={lipaRef} onChange={(e) => setLipaRef(e.target.value)} placeholder={t('Kumbukumbu ya Lipa')} style={{ width:'100%', padding:'9px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:9, color:'var(--text-primary)', fontSize:14, outline:'none' }} />}
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder={t('Jina la Mteja')} style={{ width:'100%', padding:'9px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:9, color:'var(--text-primary)', fontSize:14, outline:'none' }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('Namba ya Simu')} style={{ width:'100%', padding:'9px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:9, color:'var(--text-primary)', fontSize:14, outline:'none' }} />
          {debt > 0 && <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('Siku za deni')} style={{ width:'100%', padding:'9px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:9, color:'var(--text-primary)', fontSize:14, outline:'none' }} />}
        </div>

        {/* Summary */}
        <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 0' }}>
          {[['Jumla', tsh(total)], ['Chenji', tsh(change)], ['Deni', tsh(debt)], ['Lipa', shop.shop.lipa || '—']].map(([k, v]) => (
            <div key={k} style={{ display:'flex', flexDirection:'column' }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{t(k)}</span>
              <span style={{ fontWeight:700, fontSize:14, color: k==='Deni'&&debt>0?'var(--warning)':'var(--text-primary)', marginTop:2 }}>{v}</span>
            </div>
          ))}
        </div>

        {error && <Warn>{error}</Warn>}

        <button
          type="submit"
          disabled={!cart.length}
          style={{ background: cart.length?'var(--accent)':'rgba(128,192,80,0.2)', color: cart.length?'#fff':'rgba(128,192,80,0.4)', border:'none', borderRadius:10, padding:'13px', fontWeight:800, fontSize:15, cursor: cart.length?'pointer':'default', boxShadow: cart.length?'0 0 20px rgba(128,192,80,0.25)':'none', transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
        >
          <CheckCircle2 size={17} />{t('Thibitisha Muamala')}
        </button>

        {/* Receipt */}
        {receipt && (
          <article style={{ background:'rgba(128,192,80,0.06)', border:'1px solid rgba(128,192,80,0.2)', borderRadius:12, padding:16, fontSize:13 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <p style={{ fontWeight:700, color:'var(--accent)' }}>{receipt.customer} · {receipt.method}</p>
              <button type="button" onClick={() => window.print()} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(128,192,80,0.1)', border:'1px solid rgba(128,192,80,0.25)', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:700, color:'var(--accent)', cursor:'pointer' }}>
                <Printer size={12} />Chapisha
              </button>
            </div>
            {receipt.lines.map((l) => <p key={l.name} style={{ color:'var(--text-secondary)', marginBottom:3 }}>{l.qty} {l.name} · {tsh(l.price*l.qty)}</p>)}
            <p style={{ marginTop:8, fontWeight:600, color:'var(--text-primary)' }}>
              Jumla {tsh(receipt.total)} · amelipa {tsh(receipt.paid)}{receipt.change>0?` · chenji ${tsh(receipt.change)}`:''}{receipt.debt>0?` · deni ${tsh(receipt.debt)}`:''}
            </p>
            {receipt.method === 'LIPA' && <p style={{ color:'var(--text-secondary)', fontSize:12, marginTop:4 }}>Lipa {shop.shop.lipa} · {receipt.lipaRef}</p>}
          </article>
        )}
      </form>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HISTORY (HISTORIA)
══════════════════════════════════════════════════════════════════ */
function History({ sales, total, hidden, hiddenUntil, query, setQuery, openId, setOpenId, returns, start, end, onSaved }) {
  const t = useT();
  const [showHidden, setShowHidden] = useState(false);
  const [form, setForm] = useState(null);
  const [ask, setAsk] = useState(null);
  const [paper, setPaper] = useState(null);
  const [back, setBack] = useState(null);
  const [error, setError] = useState('');
  const [pay, setPay] = useState('');
  const hiddenSet = new Set(hidden);
  const visible = sales.filter((s) => (showHidden || !hiddenSet.has(s.id)) && (!pay || s.method === pay));
  const billed = visible.reduce((s, row) => s + Number(row.total || 0), 0);
  const paid = visible.reduce((s, row) => s + Number(row.paid || 0), 0);
  const owing = visible.reduce((s, row) => s + Number(row.balance || 0), 0);

  async function saveCustomer(e) {
    e.preventDefault(); setError('');
    try { await api(`/api/admin/sales/${form.id}`, { customer:form.customer, phone:form.phone }); setForm(null); onSaved('Risiti imehifadhiwa.'); }
    catch (err) { setError(err.message); }
  }
  async function act(path, done, body) {
    setError('');
    try { await api(path, body||{}, 'POST'); setAsk(null); setBack(null); onSaved(done); }
    catch (err) { setError(err.message); }
  }
  async function sendReturn(e) {
    e.preventDefault();
    const picks = (back.items||[]).filter((it) => Number(it.qty)>0).map((it) => ({ itemId:it.id, qty:Number(it.qty), faulty:it.faulty }));
    await act(`/api/admin/sales/${back.id}/return`, 'Bidhaa imerudi. Stoo imesasishwa.', { reason:back.reason, picks });
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="pv-stats">
        {[['Risiti', `${visible.length} / ${total}`], ['Jumla', tsh(billed)], ['Yamelipwa', tsh(paid)], ['Deni', tsh(owing)]].map(([k, v]) => (
          <article key={k} className="pv-panel" style={{ padding:'12px 14px' }}>
            <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-secondary)' }}>{t(k)}</p>
            <p style={{ fontSize:18, fontWeight:800, marginTop:4 }}>{v}</p>
          </article>
        ))}
      </div>
      <div className="pv-chips">
        {[['', 'Zote'], ['CASH', 'Cash'], ['LIPA', 'Lipa'], ['DENI', 'Deni']].map(([id, label]) => (
          <KindTab key={label} active={pay === id} onClick={() => setPay(id)}>{t(label)}</KindTab>
        ))}
        {returns?.length > 0 && <span style={{ background:'rgba(180,83,9,0.1)', color:'var(--warning)', borderRadius:999, padding:'6px 12px', fontSize:12, fontWeight:700, alignSelf:'center' }}>
          Marejesho {returns.length} · {tsh(returns.reduce((s, r) => s + r.refund, 0))}
        </span>}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          <SearchBox value={query} onChange={setQuery} placeholder={t('Tafuta risiti, mteja, au IMEI')} />
          <BtnSecondary onClick={() => setShowHidden((v) => !v)} icon={showHidden ? EyeOff : Eye}>
            {showHidden ? 'Ficha zilizofichwa' : 'Zilizofichwa'}
          </BtnSecondary>
          <BtnSecondary onClick={() => act('/api/admin/history/hide-period','Historia ya sasa imefichwa.')} icon={EyeOff}>
            Ficha kipindi
          </BtnSecondary>
          {hiddenUntil && <BtnSecondary onClick={() => act('/api/admin/history/show','Historia imeonekana.')} icon={Eye}>{t('Onyesha zote')}</BtnSecondary>}
          <Pakua kind="mauzo" start={start} end={end} />
      </div>

      {error && <Warn>{error}</Warn>}

      {/* Paper receipt */}
      {paper && (
        <article style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14, padding:18, fontSize:13 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontWeight:700, fontSize:15 }}>{paper.invoice}</span>
            <button type="button" onClick={() => window.print()} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(128,192,80,0.1)', border:'1px solid rgba(128,192,80,0.2)', borderRadius:6, padding:'5px 12px', color:'var(--accent)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              <Printer size={12} />Chapisha
            </button>
          </div>
          <p style={{ color:'var(--text-secondary)', marginBottom:8 }}>{paper.customer||'Kaunta'} · {paper.phone} · {paper.method}{paper.lipaRef?` · ${paper.lipaRef}`:''}</p>
          {(paper.items||[]).map((it) => <p key={it.id} style={{ marginBottom:4, color:'var(--text-primary)' }}>{it.qty} {it.name}{it.imei?` ${it.imei}`:''} · {tsh(it.total)}</p>)}
          <p style={{ marginTop:10, fontWeight:600 }}>Jumla {tsh(paper.total)} · amelipa {tsh(paper.paid)}{paper.change>0?` · chenji ${tsh(paper.change)}`:''}{paper.balance>0?` · deni ${tsh(paper.balance)}`:''}</p>
        </article>
      )}

      {/* Edit form */}
      {form && (
        <form onSubmit={saveCustomer} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14, padding:18, display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10 }}>
          <input value={form.customer} onChange={(e) => setForm({...form,customer:e.target.value})} placeholder={t('Jina la mteja')} style={inputSx} />
          <input value={form.phone} onChange={(e) => setForm({...form,phone:e.target.value})} placeholder={t('Simu')} style={inputSx} />
          <BtnPrimary type="submit">{t('Hifadhi')}</BtnPrimary>
        </form>
      )}

      {/* Delete confirm */}
      {ask && (
        <div style={{ background:'rgba(248,81,73,0.06)', border:'1px solid rgba(248,81,73,0.2)', borderRadius:14, padding:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <AlertCircle size={18} color="var(--danger)" />
            <p style={{ fontWeight:700, color:'var(--danger)' }}>Futa risiti {ask.invoice}?</p>
          </div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:14 }}>{t('Stoo itarudi. Risiti yenye marejesho au deni lililolipwa haifutiki.')}</p>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={() => act(`/api/admin/sales/${ask.id}/void`,'Risiti imefutwa. Stoo imerudi.')} style={{ background:'var(--danger)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer' }}>{t('Futa')}</button>
            <button type="button" onClick={() => setAsk(null)} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-default)', color:'var(--text-secondary)', borderRadius:8, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer' }}>{t('Acha')}</button>
          </div>
        </div>
      )}

      {/* Return form */}
      {back && (
        <form onSubmit={sendReturn} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14, padding:18, display:'flex', flexDirection:'column', gap:12 }}>
          <p style={{ fontWeight:700, fontSize:15 }}>Rudisha bidhaa · {back.invoice}</p>
          {back.items.map((it, idx) => (
            <div key={it.id} style={{ display:'grid', gridTemplateColumns:'1fr 5rem auto', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{it.name} · baki {it.left}</span>
              <input value={it.qty} onChange={(e) => { const items=back.items.slice(); items[idx]={...it,qty:e.target.value}; setBack({...back,items}); }} style={inputSx} />
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                <input type="checkbox" checked={it.faulty} onChange={(e) => { const items=back.items.slice(); items[idx]={...it,faulty:e.target.checked}; setBack({...back,items}); }} />
                tatizo
              </label>
            </div>
          ))}
          <input value={back.reason} onChange={(e) => setBack({...back,reason:e.target.value})} placeholder={t('Sababu')} style={inputSx} />
          <BtnPrimary type="submit" icon={RotateCcw}>{t('Hifadhi marejesho')}</BtnPrimary>
        </form>
      )}

      {/* Table */}
      <Table
        heads={['Risiti', 'Mteja', 'Malipo', 'Kiasi']}
        rows={visible.map((sale) => ({
          id: sale.id,
          cells: [
            sale.invoice,
            sale.customer || 'Kaunta',
            <span key="method" style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(15,23,42,0.05)', borderRadius:6, padding:'2px 8px', fontSize:12, fontWeight:700, color:'var(--text-secondary)' }}>{sale.method}</span>,
            <span key="total" style={{ fontWeight:700, color:'var(--text-primary)' }}>{tsh(sale.total)}</span>,
          ],
          open: openId === sale.id,
          detail: (sale.items||[]).map((it) => `${it.qty} ${it.name}${it.imei?` · ${it.imei}`:''} · ${tsh(it.total)}${it.back?` · imerudi ${it.back}`:''}`).concat([
            `Amelipa ${tsh(sale.paid)}${sale.change>0?` · chenji ${tsh(sale.change)}`:''}${sale.balance>0?` · deni ${tsh(sale.balance)}`:''}`,
            when(sale.at),
          ]),
          tools: (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12, padding:'4px 0' }}>
              <BtnGhost onClick={() => setPaper(sale)} icon={Printer}>{t('Risiti')}</BtnGhost>
              <BtnGhost onClick={() => setForm({id:sale.id,customer:sale.customer||'',phone:sale.phone||''})} icon={Edit}>{t('Hariri mteja')}</BtnGhost>
              <BtnGhost onClick={() => setBack({id:sale.id,invoice:sale.invoice,reason:'',items:(sale.items||[]).filter((it)=>it.qty-it.back>0).map((it)=>({id:it.id,name:it.name,left:it.qty-it.back,qty:'',faulty:false}))})} icon={RotateCcw}>{t('Rudisha')}</BtnGhost>
              <BtnSecondary onClick={() => act(`/api/admin/sales/${sale.id}/hide`, hiddenSet.has(sale.id)?'Risiti imeonekana.':'Risiti imefichwa.')} icon={hiddenSet.has(sale.id)?Eye:EyeOff}>
                {hiddenSet.has(sale.id) ? 'Onyesha' : 'Ficha'}
              </BtnSecondary>
              <BtnDanger onClick={() => { setError(''); setAsk({id:sale.id,invoice:sale.invoice}); }} icon={Trash2}>{t('Futa')}</BtnDanger>
            </div>
          ),
        }))}
        onOpen={setOpenId}
        empty="Hakuna risiti katika kipindi hiki."
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STOCK (STOO)
══════════════════════════════════════════════════════════════════ */
function blankProduct() {
  return { name:'', brand:'', price:'', cost:'', stock:'1', fault:'0', storage:'', ram:'', screen:'', color:'', size:'', barcode:'', weeks:'0', days:'0', condition:'NEW', reorder:'3', categoryId:'', imei:'', faulty:false, floor:'' };
}
function splitWarranty(days) {
  const total = Number(days)||0;
  return { weeks:String(Math.floor(total/7)), days:String(total%7) };
}

function Stock({ shop, query, setQuery, onSaved, start, end }) {
  const t = useT();
  const canEdit = useWho().perms.edit;
  const seeCost = useWho().perms.cost;
  const remote = shop.mode === 'remote';
  const [kind, setKind] = useState('goods');
  const [group, setGroup] = useState('');
  const [picked, setPicked] = useState(null);
  const [edit, setEdit] = useState(null);
  const [adding, setAdding] = useState('');
  const [groupName, setGroupName] = useState('');
  const [cargo, setCargo] = useState('1');
  const [lowOnly, setLowOnly] = useState(false);
  const [error, setError] = useState('');

  const needle = query.trim().toLowerCase();
  const rows = shop.stock.filter((it) => {
    const phone = it.type === 'PHONE';
    if (kind === 'phones' ? !phone : phone) return false;
    if (group && it.categoryId !== group) return false;
    if (lowOnly && it.stock > it.reorder) return false;
    return `${it.name} ${it.barcode} ${it.storage} ${it.ram}`.toLowerCase().includes(needle);
  });
  const groups = (shop.categories||[]).filter((r) => (kind==='phones' ? r.kind==='phone'||r.id==='phones' : r.kind!=='phone'&&r.id!=='phones'));
  const worth = rows.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.stock || 0), 0);
  const lowCount = rows.filter((it) => it.stock <= it.reorder).length;
  const field = (key, placeholder) => (
    <input
      value={edit[key]}
      onChange={(e) => setEdit({...edit,[key]:e.target.value})}
      placeholder={placeholder}
      style={inputSx}
    />
  );

  async function save(e) {
    e.preventDefault(); setError('');
    try {
      const total = Number(edit.stock||0); const bad = Number(edit.fault||0);
      if (bad>total) throw new Error(t('Idadi yenye matatizo haiwezi kuzidi idadi yote.'));
      const body = { ...edit, price:Number(edit.price), cost:Number(edit.cost), stock:Math.max(0,total-bad), fault:bad, reorder:Number(edit.reorder||0), warrantyDays:Number(edit.weeks||0)*7+Number(edit.days||0), categoryId:edit.categoryId||group, floor:Number(edit.floor||edit.price) };
      if (adding==='phone') await api('/api/admin/phones', body, 'POST');
      else if (adding==='unit') await api(`/api/admin/phones/${edit.id}`, {...body,floor:Number(edit.floor||edit.price)});
      else if (adding) await api('/api/admin/products', {...body,type:kind==='phones'?'PHONE':'ACCESSORY'}, 'POST');
      else await api(`/api/admin/products/${edit.id}`, body);
      setEdit(null); setAdding(''); onSaved(adding==='unit'?'Simu imehifadhiwa.':adding?'Imeongezwa.':'Stoo imehifadhiwa.');
    } catch (err) { setError(err.message); }
  }

  async function saveGroup(e) {
    e.preventDefault(); setError('');
    try {
      if (group) await api(`/api/admin/categories/${group}`, { name:groupName });
      else await api('/api/admin/categories', { name:groupName, kind:kind==='phones'?'phone':'goods' }, 'POST');
      setGroupName(''); onSaved('Kundi limehifadhiwa.');
    } catch (err) { setError(err.message); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {remote && <Info variant="info">{t('Duka limeunganishwa. Bei na taarifa zinabadilika hapa. Idadi inabadilika kwenye simu.')}</Info>}
      <div className="pv-stats">
        {[['Bidhaa', String(rows.length)], ['Thamani', tsh(worth)], ['Chini ya kiwango', String(lowCount)], ['Aina', kind === 'phones' ? 'Simu' : 'Vifaa']].map(([k, v]) => (
          <article key={k} className="pv-panel" style={{ padding:'12px 14px' }}>
            <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-secondary)' }}>{t(k)}</p>
            <p style={{ fontSize:18, fontWeight:800, marginTop:4 }}>{v}</p>
          </article>
        ))}
      </div>

      {/* Kind tabs */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {[['phones','Simu'],['goods','Vifaa']].map(([k,l]) => (
          <KindTab key={k} active={kind===k} onClick={() => { setKind(k); setGroup(''); setPicked(null); setEdit(null); setAdding(''); }}>
            {t(l)}
          </KindTab>
        ))}
        {groups.map((r) => (
          <KindTab key={r.id} active={group===r.id} secondary onClick={() => { setGroup(group===r.id?'':r.id); setGroupName(r.name); }}>
            {r.name}
          </KindTab>
        ))}
      </div>

      {canEdit && <form onSubmit={saveGroup} style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative' }}>
          <Tag size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={group?t('Jina jipya la kundi'):t('Kundi jipya')} style={{ ...inputSx, paddingLeft:34, minWidth:200 }} />
        </div>
        <BtnGhost type="submit" icon={group ? Edit : Plus}>{group ? t('Badili jina') : t('Ongeza kundi')}</BtnGhost>
        {group && (
          <BtnDanger type="button" onClick={async () => { try { await api(`/api/admin/categories/${group}`,null,'DELETE'); setGroup(''); onSaved('Kundi limeondolewa.'); } catch(err){setError(err.message);} }} icon={Trash2}>
            Futa kundi
          </BtnDanger>
        )}
      </form>}

      {/* Toolbar */}
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', gap:8 }}>
          <SearchBox value={query} onChange={setQuery} placeholder={t('Tafuta bidhaa...')} />
          <button type="button" onClick={() => setLowOnly((v) => !v)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, background: lowOnly?'rgba(180,83,9,0.12)':'var(--bg-elevated)', border:`1px solid ${lowOnly?'rgba(180,83,9,0.3)':'var(--border-default)'}`, color: lowOnly?'var(--warning)':'var(--text-secondary)', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .15s' }}>
            <AlertTriangle size={13} />{t('Chini ya kiwango')}
          </button>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {canEdit && kind === 'phones' && <BtnPrimary onClick={() => { setAdding('phone'); setPicked(null); setEdit(blankProduct()); }} icon={Plus}>{t('Ongeza simu')}</BtnPrimary>}
          {canEdit && <BtnGhost onClick={() => { setAdding('group'); setPicked(null); setEdit({...blankProduct(),categoryId:group}); }} icon={Plus}>
            {kind==='phones'?t('Ongeza kundi'):t('Ongeza kifaa')}
          </BtnGhost>}
          <Pakua kind="stoo" start={start} end={end} />
        </div>
      </div>

      {/* Edit form */}
      {edit && canEdit && (
        <form onSubmit={save} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14, padding:20, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
          {field('name', t('Jina'))}
          {adding==='phone' && field('imei','IMEI')}
          {kind==='goods'&&adding!=='phone' && field('brand','Brand')}
          {field('color',t('Rangi'))}
          {kind==='goods'&&adding!=='phone' && field('size',t('Ukubwa'))}
          {(kind==='phones'||adding==='phone') && field('storage','Storage')}
          {(kind==='phones'||adding==='phone') && field('ram','RAM')}
          {(kind==='phones'||adding==='phone') && field('screen',t('Ukubwa wa kioo'))}
          {kind==='goods'&&adding!=='phone' && field('barcode','Barcode')}
          <select value={edit.categoryId||''} onChange={(e) => setEdit({...edit,categoryId:e.target.value})} style={selectSx}>
            <option value="">{t('Kundi')}</option>
            {groups.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {(adding==='phone'||adding==='unit'||(kind==='phones'&&!adding)) && (
            <select value={edit.condition||'NEW'} onChange={(e) => setEdit({...edit,condition:e.target.value})} style={selectSx}>
              <option value="NEW">{t('Mpya')}</option>
              <option value="LIKE NEW">{t('Kama mpya')}</option>
              <option value="USED">{t('Imetumika')}</option>
            </select>
          )}
          {field('price',t('Bei ya jumla'))}
          {seeCost && field('cost',t('Gharama'))}
          {adding==='unit' && field('floor',t('Bei ya chini'))}
          {field('weeks',t('Wiki'))}
          {field('days',t('Siku'))}
          {!remote&&adding!=='phone'&&adding!=='unit' && field('stock',t('Idadi yote'))}
          {!remote&&adding!=='phone'&&adding!=='unit' && field('fault',t('Kati ya hizi, zenye matatizo'))}
          {!remote&&adding!=='phone'&&adding!=='unit' && field('reorder',t('Onyo stoo ikifika'))}
          {(adding==='phone'||adding==='unit') && (
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--text-primary)' }}>
              <input type="checkbox" checked={!!edit.faulty} onChange={(e) => setEdit({...edit,faulty:e.target.checked})} />
              {t('Simu ina matatizo')}
            </label>
          )}
          {error && <Warn style={{ gridColumn:'1/-1' }}>{error}</Warn>}
          <div style={{ gridColumn:'1/-1', display:'flex', gap:8 }}>
            <BtnPrimary type="submit" icon={CheckCircle2}>{t('Hifadhi')}</BtnPrimary>
            <BtnSecondary type="button" onClick={() => { setEdit(null); setAdding(''); }}>{t('Ghairi')}</BtnSecondary>
          </div>
        </form>
      )}

      {/* Detail panel */}
      {picked && (
        <article style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <p style={{ fontWeight:800, fontSize:18 }}>{picked.name}</p>
            <span style={{ background:'rgba(128,192,80,0.1)', color:'var(--accent)', borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:700 }}>{picked.type}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'10px 20px' }}>
            {[['Bei',tsh(picked.price)], seeCost && ['Gharama',tsh(picked.cost)],['Idadi',picked.stock],['Storage',picked.storage||'—'],['RAM',picked.ram||'—'],['Skrini',picked.screen||'—'],['Hali',picked.condition||'—'],['Warranty',`${picked.warrantyDays||0} siku`],['Barcode',picked.barcode||'—'],['Matatizo',picked.fault||0]].filter(Boolean).map(([k,v]) => (
              <div key={k}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{t(k)}</p>
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:20, paddingTop:16, borderTop:'1px solid var(--border-subtle)' }}>
            {!remote && (
              <form style={{ display:'flex', gap:8 }} onSubmit={async (e) => { e.preventDefault(); setError(''); try { await api(`/api/admin/products/${picked.id}/add`,{qty:Number(cargo)},'POST'); onSaved('Mzigo umeongezwa.'); } catch(err){setError(err.message);} }}>
                <input value={cargo} onChange={(e) => setCargo(e.target.value)} style={{ ...inputSx, width:80 }} />
                <BtnPrimary type="submit" icon={Plus}>{t('Ongeza mzigo')}</BtnPrimary>
              </form>
            )}
            <BtnDanger type="button" onClick={async () => { try { await api(`/api/admin/products/${picked.id}/retire`,{},'POST'); setPicked(null); onSaved('Bidhaa imestaafu.'); } catch(err){setError(err.message);} }} icon={X}>
              Staafu
            </BtnDanger>
          </div>
          {error && <Warn style={{ marginTop:10 }}>{error}</Warn>}
        </article>
      )}

      {/* Stock list */}
      {kind === 'phones' ? (
        <div className="pv-phone-grid">
          {rows.map((it) => (
            <button key={it.id} type="button" className="pv-phone-card" onClick={() => { setPicked(it); setAdding(''); setEdit({ ...blankProduct(), ...it, stock:String((it.stock||0)+(it.fault||0)), fault:String(it.fault||0), price:String(it.price), cost:String(it.cost), reorder:String(it.reorder), ...splitWarranty(it.warrantyDays) }); }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ width:34, height:34, borderRadius:10, background:'#fff', border:'1px solid #d7e8d4', display:'grid', placeItems:'center' }}><Smartphone size={16} color="#509541" /></span>
                <span style={{ fontSize:11, fontWeight:800, color:'#509541' }}>{it.condition || 'SIMU'}</span>
              </div>
              <p style={{ fontWeight:800, fontSize:16 }}>{it.name}</p>
              <div className="pv-spec">
                {[it.storage, it.ram, it.color, it.screen].filter(Boolean).map((bit) => <span key={bit}>{bit}</span>)}
              </div>
              <div style={{ marginTop:'auto', display:'flex', justifyContent:'space-between', alignItems:'end' }}>
                <b>{tsh(it.price)}</b>
                <span style={{ fontSize:12, fontWeight:800, color: it.stock <= it.reorder ? 'var(--warning)' : '#1f5c28' }}>{it.stock} stoo{it.fault ? ` · ${it.fault} tatizo` : ''}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
      <div className="pv-stock-grid">
        {rows.map((it) => (
          <button key={it.id} type="button" className="pv-stock-card" onClick={() => { setPicked(it); setAdding(''); setEdit({ ...blankProduct(), ...it, stock:String((it.stock||0)+(it.fault||0)), fault:String(it.fault||0), price:String(it.price), cost:String(it.cost), reorder:String(it.reorder), ...splitWarranty(it.warrantyDays) }); }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
              <p style={{ fontWeight:800 }}>{it.name}</p>
              {it.stock <= it.reorder && <span style={{ color:'var(--warning)', fontSize:11, fontWeight:800 }}>{t('Chini')}</span>}
            </div>
            <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{[it.storage, it.ram, it.color, it.barcode].filter(Boolean).join(' · ') || it.type}</p>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              <b>{tsh(it.price)}</b>
              <span style={{ fontWeight:800, color:'#509541' }}>{it.stock} stoo</span>
            </div>
          </button>
        ))}
      </div>
      )}
      {rows.length === 0 && <p style={{ color:'var(--text-secondary)' }}>{t('Hakuna bidhaa.')}</p>}

      {/* Phone units */}
      {kind==='phones' && shop.units.length>0 && (
        <div>
          <SectionHeader title="Simu za IMEI" icon={Smartphone} />
          <div className="pv-phone-grid">
            {shop.units.map((ph) => (
              <button key={ph.id} type="button" className="pv-phone-card" onClick={() => { setAdding('unit'); setEdit({ ...blankProduct(), ...ph, price:String(ph.price), cost:String(ph.cost), floor:String(ph.floor||ph.price), faulty:ph.status==='FAULTY', ...splitWarranty(ph.warrantyDays) }); }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', color:'#64748b' }}>{t('IMEI')}</span>
                  <span style={{ fontSize:11, fontWeight:800, color: ph.status==='FAULTY' ? 'var(--danger)' : '#509541' }}>{ph.status==='FAULTY' ? 'Tatizo' : 'Stoo'}</span>
                </div>
                <p style={{ fontWeight:800, fontSize:16 }}>{ph.name}</p>
                <p style={{ fontFamily:'ui-monospace, monospace', fontSize:13, letterSpacing:'0.04em' }}>{ph.imei}</p>
                <div className="pv-spec">
                  {[ph.storage, ph.ram, ph.color, ph.condition].filter(Boolean).map((bit) => <span key={bit}>{bit}</span>)}
                </div>
                <div style={{ marginTop:'auto', display:'flex', justifyContent:'space-between' }}>
                  <b>{tsh(ph.price)}</b>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{ph.warrantyDays || 0} siku</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete IMEI */}
      {adding==='unit'&&edit && (
        <BtnDanger type="button" onClick={async () => { try { await api(`/api/admin/phones/${edit.id}`,null,'DELETE'); setEdit(null); setAdding(''); onSaved('IMEI imefutwa.'); } catch(err){setError(err.message);} }} icon={Trash2}>
          Futa IMEI
        </BtnDanger>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DEBTS (DENI)
══════════════════════════════════════════════════════════════════ */
function Debts({ shop, query, setQuery, onSaved }) {
  const t = useT();
  const [pay, setPay] = useState(null);
  const [tab, setTab] = useState('OPEN');
  const [error, setError] = useState('');
  const needle = query.trim().toLowerCase();
  const [order, setOrder] = useState('big');
  const visibleDebt = (d) => d.status !== 'PAID' || !d.hidden;
  const rows = shop.debts
    .filter((d) => visibleDebt(d) && (d.status||'OPEN')===tab && `${d.customer} ${d.phone}`.toLowerCase().includes(needle))
    .slice()
    .sort((a, b) => order === 'big' ? b.balance - a.balance : a.balance - b.balance);
  const openRows = shop.debts.filter((d) => (d.status || 'OPEN') === 'OPEN');
  const paidRows = shop.debts.filter((d) => d.status === 'PAID' && !d.hidden);
  const hiddenPaid = shop.debts.some((d) => d.status === 'PAID' && d.hidden);
  function remindDue(debt) {
    const phone = String(debt.phone || '').replace(/\D/g, '');
    if (!/^0\d{9}$/.test(phone)) return false;
    const now = new Date();
    const due = debt.due ? new Date(debt.due) : null;
    const term = Number(debt.termDays) || 0;
    let windowStart;
    if (due && !Number.isNaN(due.getTime()) && term > 0) {
      const lead = term >= 30 ? 3 : 1;
      windowStart = new Date(due.getFullYear(), due.getMonth(), due.getDate() - lead);
      if (now < windowStart) return false;
    } else {
      const opened = debt.at ? new Date(debt.at) : null;
      if (!opened || Number.isNaN(opened.getTime()) || (now - opened) / 86400000 < 30) return false;
      windowStart = new Date(opened.getFullYear(), opened.getMonth(), opened.getDate() + 30);
    }
    if (debt.reminded) {
      const last = new Date(debt.reminded);
      if (!Number.isNaN(last.getTime()) && last >= windowStart) return false;
    }
    return true;
  }
  function remind(debt) {
    const phone = `255${String(debt.phone).replace(/\D/g, '').slice(1)}`;
    const text = [
      t('Ukumbusho wa deni'),
      `${t('Mteja')}: ${debt.customer}`,
      `${t('Simu')}: ${debt.phone}`,
      `${t('Risiti')}: ${debt.invoice || t('Deni')}`,
      `${t('Deni')}: ${tsh(debt.balance)}`,
      t('Karibu dukani, au lipa kwenye namba ya duka, ili tuifunge hesabu yako.'),
    ].join('\n');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    api(`/api/admin/debts/${debt.id}/remind`, {}, 'POST').then(() => onSaved(t('WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.'))).catch((err) => setError(err.message));
  }

  async function save(e) {
    e.preventDefault(); setError('');
    try { await api(`/api/admin/debts/${pay.id}/pay`,{amount:Number(pay.amount),method:pay.method,note:pay.note},'POST'); setPay(null); onSaved('Malipo yamepokelewa.'); }
    catch (err) { setError(err.message); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Summary KPI */}
      <div className="pv-stats">
        {[['Deni wazi', tsh(shop.money.openDebt)], ['Wateja', String(openRows.length)], ['Yamelipwa', String(paidRows.length)], ['Wastani', tsh(openRows.length ? shop.money.openDebt / openRows.length : 0)]].map(([k, v]) => (
          <article key={k} className="pv-panel" style={{ padding:'12px 14px' }}>
            <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-secondary)' }}>{t(k)}</p>
            <p style={{ fontSize:18, fontWeight:800, marginTop:4, color: k==='Deni wazi' ? 'var(--warning)' : 'var(--text-primary)' }}>{v}</p>
          </article>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:10 }}>
        <SearchBox value={query} onChange={setQuery} placeholder={t('Tafuta mteja')} />
        <div style={{ display:'flex', gap:6 }}>
          {[['OPEN','Wazi'],['PAID','Yamelipwa']].map(([id,label]) => (
            <KindTab key={id} active={tab===id} onClick={() => setTab(id)}>{t(label)}</KindTab>
          ))}
          <KindTab active={order==='big'} secondary onClick={() => setOrder(order==='big' ? 'small' : 'big')}>{order==='big' ? t('Baki kubwa') : t('Baki ndogo')}</KindTab>
          {tab==='PAID' && paidRows.length > 0 && <BtnSecondary onClick={() => api('/api/admin/debts/hide', { mode:'paid' }, 'POST').then(() => onSaved('Madeni yameondolewa.')).catch((err) => setError(err.message))}>{t('Ondoa yaliyolipwa')}</BtnSecondary>}
          {hiddenPaid && <BtnSecondary onClick={() => api('/api/admin/debts/hide', { mode:'show' }, 'POST').then(() => onSaved('Madeni yameonekana.')).catch((err) => setError(err.message))}>{t('Onyesha')}</BtnSecondary>}
          <Pakua kind="madeni" start="2016-01-01" end="2099-01-01" />
        </div>
      </div>

      {/* Pay form */}
      {pay && (
        <form onSubmit={save} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CreditCard size={16} color="var(--accent)" />
            <p style={{ fontWeight:700, fontSize:15 }}>{pay.customer} · baki {tsh(pay.balance)}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <input value={pay.amount} onChange={(e) => setPay({...pay,amount:e.target.value})} placeholder={t('Kiasi')} style={inputSx} />
            <select value={pay.method} onChange={(e) => setPay({...pay,method:e.target.value})} style={selectSx}>
              <option value="CASH">{t('Cash')}</option>
              <option value="LIPA">{t('Lipa')}</option>
            </select>
            <input value={pay.note} onChange={(e) => setPay({...pay,note:e.target.value})} placeholder={t('Kumbukumbu ya Lipa')} style={inputSx} />
          </div>
          {error && <Warn>{error}</Warn>}
          <BtnPrimary type="submit" icon={CheckCircle2}>{t('Pokea Malipo')}</BtnPrimary>
        </form>
      )}

      {/* Debts list */}
      <div className="pv-phone-grid">
        {rows.map((debt) => {
          const done = debt.principal > 0 ? Math.min(1, (debt.principal - debt.balance) / debt.principal) : 0;
          return (
            <article key={debt.id} className="pv-debt-card">
              <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <p style={{ fontWeight:800 }}>{debt.customer}</p>
                <span style={{ fontSize:11, fontWeight:800, color: debt.status==='PAID' ? '#509541' : 'var(--warning)' }}>{debt.status==='PAID' ? 'Imelipwa' : 'Wazi'}</span>
              </div>
              <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{debt.phone || 'Bila namba'}</p>
              <p style={{ fontSize:22, fontWeight:800, color: debt.status==='PAID' ? '#0f172a' : 'var(--warning)' }}>{tsh(debt.balance)}</p>
              <div className="pv-bar"><i style={{ width:`${Math.round(done * 100)}%` }} /></div>
              <p style={{ fontSize:12, color:'var(--text-secondary)' }}>Chanzo {tsh(debt.principal)} · malipo {debt.payments.length}</p>
              {debt.status !== 'PAID' ? (
                <div style={{ display:'flex', gap:8 }}>
                  <BtnPrimary onClick={() => setPay({ id:debt.id, customer:debt.customer, balance:debt.balance, amount:'', method:'CASH', note:'' })}>{t('Pokea')}</BtnPrimary>
                  {remindDue(debt) && <BtnSecondary onClick={() => remind(debt)}>{t('Ukumbusho')}</BtnSecondary>}
                </div>
              ) : (
                <BtnSecondary onClick={() => api('/api/admin/debts/hide', { mode:'one', id:debt.id }, 'POST').then(() => onSaved('Deni limeondolewa.')).catch((err) => setError(err.message))}>{t('Ondoa deni')}</BtnSecondary>
              )}
            </article>
          );
        })}
      </div>
      {rows.length === 0 && <p style={{ color:'var(--text-secondary)' }}>{t('Hakuna deni katika kichujio hiki.')}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WINGS (MAWINGA)
══════════════════════════════════════════════════════════════════ */
function Qty({ value, max, onChange }) {
  return (
    <div className="pv-qty">
      <button type="button" className="pv-step" disabled={value <= 0} onClick={() => onChange(value - 1)}>−</button>
      <b>{value}</b>
      <button type="button" className="pv-step pv-step-add" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function Wings({ rows, shop, onSaved }) {
  const t = useT();
  const [back, setBack] = useState(null);
  const [make, setMake] = useState(false);
  const [person, setPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [find, setFind] = useState('');
  const [kind, setKind] = useState('');
  const [qty, setQty] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState('out');
  const [q, setQ] = useState('');
  const needle = find.trim().toLowerCase();
  const cats = shop?.categories || [];
  const phones = (shop?.units || []).filter((row) => row.status === 'IN_STOCK');
  const goods = (shop?.stock || []).filter((row) => Number(row.stock) > 0);
  const open = rows.filter((r) => r.status !== 'BACK');
  const backRows = rows.filter((r) => r.status === 'BACK');
  const shown = rows.filter((r) => {
    if (scope === 'out' && r.status === 'BACK') return false;
    if (scope === 'back' && r.status !== 'BACK') return false;
    const blob = `${r.person} ${r.phone} ${(r.items || []).map((it) => it.name).join(' ')}`.toLowerCase();
    return blob.includes(q.trim().toLowerCase());
  });
  const chosen = Object.values(qty).filter((n) => Number(n) > 0).length;

  function allow(row, phoneRow) {
    if (!kind) return true;
    if (kind === 'phones') return phoneRow || row.type === 'PHONE';
    if (kind === 'goods') return !phoneRow && row.type !== 'PHONE';
    const cat = cats.find((item) => item.id === kind);
    if (!cat) return true;
    const phoneCat = cat.kind === 'phone' || cat.id === 'phones';
    if (phoneRow !== phoneCat) return false;
    return kind === 'phones' || row.categoryId === kind;
  }
  function hit(name, extra, key) {
    if ((qty[key] || 0) > 0) return true;
    if (!needle) return true;
    return `${name} ${extra}`.toLowerCase().includes(needle);
  }
  const phoneRows = phones.filter((row) => allow(row, true) && hit(row.name, row.imei, `phone:${row.id}`));
  const goodRows = goods.filter((row) => allow(row, false) && hit(row.name, row.barcode, `product:${row.id}`));
  const lines = [
    ...phoneRows.map((row) => ({ key:`phone:${row.id}`, kind:t('Simu'), title:row.name, meta:fill(t('Simu · {0}'), row.imei), max:1, rank:(qty[`phone:${row.id}`] || 0) > 0 ? 0 : 1 })),
    ...goodRows.map((row) => ({ key:`product:${row.id}`, kind:t('Vifaa'), title:row.name, meta:fill(t('Stoo {0}'), row.stock), max:Number(row.stock), rank:(qty[`product:${row.id}`] || 0) > 0 ? 0 : 1 })),
  ].sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
  const basket = lines.filter((line) => (qty[line.key] || 0) > 0);

  function setCount(key, next, max) {
    const n = Math.max(0, Math.min(max, next));
    setQty((prev) => ({ ...prev, [key]: n }));
  }
  function openTake() {
    setMake(true); setBack(null); setError('');
    setPerson(''); setPhone(''); setNote(''); setFind(''); setKind(''); setQty({});
  }
  async function saveTake(e) {
    e.preventDefault();
    if (busy) return;
    const picks = Object.entries(qty).filter(([, n]) => Number(n) > 0).map(([key, n]) => (
      key.startsWith('phone:') ? { phoneId: key.slice(6), qty: 1 } : { productId: key.slice(8), qty: Number(n) }
    ));
    if (person.trim().length < 2) { setError('Weka jina la mtu aliyechukua.'); return; }
    if (!picks.length) { setError('Chagua bidhaa aliyochukua.'); return; }
    setBusy(true); setError('');
    try {
      await api('/api/admin/wings', { person, phone, note, picks }, 'POST');
      setMake(false);
      onSaved(t('Mtu amechukua'));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function send(e) {
    e.preventDefault();
    if (busy) return;
    const picks = back.items.filter((it) => Number(it.give) > 0).map((it) => ({ id: it.id, qty: Number(it.give) }));
    if (!picks.length) { setError('Chagua idadi anayorudisha.'); return; }
    const still = back.items.some((it) => it.qty - it.back - Number(it.give || 0) > 0);
    setBusy(true); setError('');
    try {
      await api(`/api/admin/wings/${back.id}/return`, { picks }, 'POST');
      setBack(null);
      onSaved(still ? t('Sehemu imerudi stoo. Iliyobaki bado iko nje.') : t('Bidhaa zote zimerudi stoo.'));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function drop(id) {
    if (busy) return;
    setBusy(true); setError('');
    try { await api(`/api/admin/wings/${id}`, null, 'DELETE'); onSaved(t('Mawinga yameondolewa.')); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function give(id, next, max) {
    setBack((row) => ({ ...row, items: row.items.map((it) => it.id === id ? { ...it, give: Math.max(0, Math.min(max, next)) } : it) }));
  }
  const empty = q.trim()
    ? t('Hakuna mawinga yenye neno hilo.')
    : (scope === 'back' ? t('Hakuna kilichorudi.') : t('Hakuna bidhaa iliyo nje kwa sasa.'));

  return (
    <div className="pv-wing">
      <div className="pv-wing-head">
        <article className="pv-wing-stat warn">
          <p>{t('Hawajarudi')}</p>
          <strong>{open.length}</strong>
        </article>
        <article className="pv-wing-stat">
          <p>{t('Zilizorudi')}</p>
          <strong>{backRows.length}</strong>
        </article>
        <BtnPrimary onClick={openTake} icon={Plus}>{t('Mtu amechukua')}</BtnPrimary>
      </div>
      <div className="pv-wing-tools">
        <div className="pv-chips">
          <KindTab active={scope==='out'} onClick={() => setScope('out')}>{t('Hawajarudi')}</KindTab>
          <KindTab active={scope==='back'} onClick={() => setScope('back')}>{t('Zilizorudi')}</KindTab>
          <KindTab active={scope==='all'} onClick={() => setScope('all')}>{t('Zote')}</KindTab>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder={t('Tafuta mtu au bidhaa')} />
      </div>
      {error && <Warn>{t(error)}</Warn>}

      {make && (
        <form className="pv-wing-board" onSubmit={saveTake}>
          <section className="pv-panel pv-wing-catalog">
            <div className="pv-wing-catalog-top">
              <div>
                <p className="pv-wing-kicker">{t('Tafuta jina au IMEI')}</p>
                <p className="pv-wing-count">{fill(t('{0} vinapatikana'), lines.length)}</p>
              </div>
              <SearchBox value={find} onChange={setFind} placeholder={t('Tafuta jina au IMEI')} />
            </div>
            <div className="pv-chips">
              <KindTab active={kind===''} onClick={() => setKind('')}>{t('Zote')}</KindTab>
              <KindTab active={kind==='phones'} onClick={() => setKind('phones')}>{t('Simu')}</KindTab>
              <KindTab active={kind==='goods'} onClick={() => setKind('goods')}>{t('Vifaa')}</KindTab>
              {cats.filter((row) => row.id !== 'phones').map((row) => (
                <KindTab key={row.id} active={kind===row.id} secondary onClick={() => setKind(row.id)}>{row.name}</KindTab>
              ))}
            </div>
            <div className="pv-catalog">
              {!phones.length && !goods.length && <p className="pv-wing-empty">{t('Hakuna bidhaa dukani ya kuazimisha.')}</p>}
              {(phones.length > 0 || goods.length > 0) && !lines.length && <p className="pv-wing-empty">{t('Hakuna bidhaa yenye neno hilo.')}</p>}
              {lines.map((line) => (
                <article key={line.key} className={`pv-goods${(qty[line.key] || 0) > 0 ? ' on' : ''}`}>
                  <span>{line.kind}</span>
                  <p>{line.title}</p>
                  <small>{line.meta}</small>
                  <Qty value={qty[line.key] || 0} max={line.max} onChange={(n) => setCount(line.key, n, line.max)} />
                </article>
              ))}
            </div>
          </section>
          <aside className="pv-panel pv-wing-sheet">
            <p className="pv-wing-title">{t('Mtu amechukua')}</p>
            <p className="pv-wing-note">{t('Andika jina, kisha tafuta bidhaa aliyochukua. Muda unaandikwa peke yake.')}</p>
            <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder={t('Jina la mtu')} maxLength={60} style={inputSx} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('Simu (si lazima)')} inputMode="tel" style={inputSx} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Maelezo (si lazima)')} maxLength={80} style={inputSx} />
            <div className="pv-wing-basket">
              <p>{chosen > 0 ? fill(t('Umechagua {0}'), chosen) : t('Chagua bidhaa aliyochukua.')}</p>
              {basket.map((line) => (
                <div key={line.key}>
                  <span>{line.title}</span>
                  <b>x{qty[line.key]}</b>
                </div>
              ))}
            </div>
            <div className="pv-wing-actions">
              <BtnPrimary type="submit" icon={CheckCircle2} disabled={busy || (!phones.length && !goods.length)}>{t('Hifadhi')}</BtnPrimary>
              <BtnSecondary type="button" onClick={() => setMake(false)}>{t('Ghairi')}</BtnSecondary>
            </div>
          </aside>
        </form>
      )}

      {back && (
        <form onSubmit={send} className="pv-panel pv-wing-back">
          <div>
            <p className="pv-wing-title">{back.person}</p>
            <p className="pv-wing-note">{t('Chagua idadi anayorudisha sasa. Akirudisha kimoja, vilivyobaki vinabaki nje, na muda unaandikwa.')}</p>
          </div>
          <div className="pv-catalog">
            {back.items.filter((it) => it.qty - it.back > 0).map((it) => {
              const left = it.qty - it.back;
              return (
                <article key={it.id} className="pv-goods on">
                  <span>{t('Nje')}</span>
                  <p>{it.name}</p>
                  <small>{fill(t('Nje x{0}'), left)}</small>
                  <Qty value={Number(it.give) || 0} max={left} onChange={(n) => give(it.id, n, left)} />
                </article>
              );
            })}
          </div>
          <div className="pv-wing-actions">
            <BtnSecondary type="button" onClick={() => setBack((row) => ({ ...row, items: row.items.map((it) => ({ ...it, give: Math.max(0, it.qty - it.back) })) }))}>{t('Rudisha zote')}</BtnSecondary>
            <BtnPrimary type="submit" icon={RotateCcw} disabled={busy}>{t('Hifadhi kurudi')}</BtnPrimary>
            <BtnSecondary type="button" onClick={() => setBack(null)}>{t('Ghairi')}</BtnSecondary>
          </div>
        </form>
      )}

      {shown.length === 0 && <div className="pv-wing-empty">{empty}</div>}
      <div className="pv-wing-grid">
        {shown.map((r) => {
          const away = r.status !== 'BACK';
          const pieces = (r.items || []).reduce((sum, it) => sum + Math.max(0, it.qty - it.back), 0);
          return (
            <article key={r.id} className={`pv-loan${away ? ' out' : ''}`}>
              <header>
                <span className="pv-avatar">{String(r.person || 'M').slice(0, 1).toUpperCase()}</span>
                <div>
                  <p>{r.person}</p>
                  <small>{r.phone || t('Bila namba')}</small>
                </div>
                <b className={away ? 'out' : ''}>{away ? t('Nje') : t('Amerudi')}</b>
              </header>
              <div className="pv-loan-meta">
                <span>{fill(t('Alichukua {0}'), when(r.at))}</span>
                {!away && r.returnedAt && <span>{fill(t('Alirudisha {0}'), when(r.returnedAt))}</span>}
                {r.staff && <span>{fill(t('Aliyeandika {0}'), r.staff)}</span>}
                {away && <span>{fill(t('Nje x{0}'), pieces)}</span>}
              </div>
              {r.note && <p className="pv-loan-note">{r.note}</p>}
              <div className="pv-loan-items">
                {(r.items || []).map((it) => {
                  const left = it.qty - it.back;
                  const done = it.qty > 0 ? Math.min(100, Math.round((it.back / it.qty) * 100)) : 0;
                  return (
                    <div key={it.id}>
                      <div>
                        <span>{it.name}</span>
                        <b>{away ? (left > 0 ? fill(t('Nje x{0}'), left) : t('Imerudi')) : `x${it.qty}`}</b>
                      </div>
                      {away && it.back > 0 && <small>{fill(t('Amerudi x{0}'), it.back)}</small>}
                      <i style={{ width:`${away ? 100 - done : 100}%` }} />
                    </div>
                  );
                })}
              </div>
              {away
                ? <BtnPrimary onClick={() => { setMake(false); setBack({ id:r.id, person:r.person, items:r.items.map((it) => ({ ...it, give:0 })) }); }} icon={RotateCcw}>{t('Rudisha')}</BtnPrimary>
                : <BtnSecondary onClick={() => drop(r.id)}>{t('Ondoa mawinga')}</BtnSecondary>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FAULTS (MATATIZO)
══════════════════════════════════════════════════════════════════ */
function Faults({ shop, onSell }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [ask, setAsk] = useState(null);
  const needle = query.trim().toLowerCase();

  const phoneGroup = (id) => {
    if (!id) return false;
    if (id==='phones') return true;
    return (shop.categories||[]).some((r)=>r.id===id&&r.kind==='phone');
  };
  const hit = (blob) => !needle || blob.toLowerCase().includes(needle);
  const allow = (itemCat, kind) => {
    if (!category) return true;
    const isPhone = phoneGroup(category);
    if (kind==='phone') return isPhone && (category==='phones'||itemCat===category);
    return !isPhone && itemCat===category;
  };
  const phones = (shop.units||[]).filter((ph)=>ph.status==='FAULTY'&&allow(ph.categoryId,'phone')&&hit(`${ph.name} ${ph.imei} ${ph.storage} ${ph.ram} ${ph.color}`));
  const piles  = (shop.stock||[]).filter((it)=>it.type==='PHONE'&&it.fault>0&&allow(it.categoryId,'phone')&&hit(`${it.name} ${it.storage} ${it.color}`));
  const goods  = (shop.stock||[]).filter((it)=>it.type!=='PHONE'&&it.fault>0&&allow(it.categoryId,'goods')&&hit(`${it.name} ${it.brand} ${it.barcode}`));
  const cards = [
    ...piles.map((it)=>({id:`p-${it.id}`,title:it.name,meta:[it.storage,it.color].filter(Boolean).join(' · '),price:it.price,foot:`${t('Matatizo')} ${it.fault}`,ask:{...it,pile:true}})),
    ...phones.map((it)=>({id:it.id,title:it.name,meta:[it.storage,it.imei].filter(Boolean).join(' · '),price:it.price,foot:it.imei,ask:{...it,unit:true}})),
    ...goods.map((it)=>({id:it.id,title:it.name,meta:[it.brand,it.color,it.size].filter(Boolean).join(' · '),price:it.price,foot:`${t('Matatizo')} ${it.fault}`,ask:it})),
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="pv-stats">
        {[['Simu', phones.length], ['Mifululizo', piles.length], ['Vifaa', goods.length], ['Jumla', cards.length]].map(([k, v]) => (
          <article key={k} className="pv-panel" style={{ padding:'12px 14px' }}>
            <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-secondary)' }}>{t(k)}</p>
            <p style={{ fontSize:22, fontWeight:800 }}>{v}</p>
          </article>
        ))}
      </div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <SearchBox value={query} onChange={setQuery} placeholder={t('Tafuta jina, IMEI au barcode')} />
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        <KindTab active={category===''} onClick={() => setCategory('')}>{t('Zote')}</KindTab>
        {(shop.categories||[]).map((r) => (
          <KindTab key={r.id} active={category===r.id} secondary onClick={() => setCategory(r.id)}>{t(r.name)}</KindTab>
        ))}
      </div>

      {ask && (
        <form style={{ background:'var(--bg-card)', border:'1px solid rgba(248,81,73,0.2)', borderRadius:14, padding:20, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}
          onSubmit={(e) => { e.preventDefault(); const price=Number(ask.sale); if(price<=0)return; if(ask.pile&&!/^\d{8,20}$/.test(String(ask.imei||'')))return; onSell({name:ask.name,price,qty:1,productId:ask.unit?'':ask.id,phoneId:ask.unit?ask.id:'',faulty:true,imei:ask.imei||''}); }}
        >
          <p style={{ fontWeight:700, fontSize:15, gridColumn:'1/-1' }}>{ask.name}</p>
          <input value={ask.sale} onChange={(e) => setAsk({...ask,sale:e.target.value})} placeholder={t('Bei ya kuuza')} style={inputSx} />
          {ask.pile && <input value={ask.imei||''} onChange={(e) => setAsk({...ask,imei:e.target.value})} placeholder={t('IMEI')} style={inputSx} />}
          <BtnPrimary type="submit" icon={ShoppingCart}>{t('Weka kwenye Uza')}</BtnPrimary>
          <BtnSecondary type="button" onClick={() => setAsk(null)}>{t('Ghairi')}</BtnSecondary>
        </form>
      )}

      {cards.length === 0 && <p style={{ color:'var(--text-secondary)', fontSize:14, padding:'24px 0' }}>{t('Hakuna yenye matatizo kwenye kundi hili.')}</p>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:14 }}>
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setAsk({...card.ask,sale:String(card.price),imei:''})}
            style={{ background:'var(--bg-card)', border:'1px solid rgba(248,81,73,0.15)', borderRadius:14, padding:16, textAlign:'left', cursor:'pointer', transition:'all .2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor='rgba(248,81,73,0.4)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(248,81,73,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor='rgba(248,81,73,0.15)'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
          >
            <div style={{ width:32, height:32, borderRadius:8, background:'var(--danger-dim)', display:'grid', placeItems:'center', marginBottom:12 }}>
              <AlertTriangle size={15} color="var(--danger)" />
            </div>
            <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:4 }}>{card.title}</p>
            <p style={{ fontSize:12, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:12 }}>{card.meta}</p>
            <p style={{ fontWeight:800, fontSize:15, color:'var(--accent)', marginBottom:2 }}>{tsh(card.price)}</p>
            <p style={{ fontSize:11, color:'var(--danger)', fontWeight:700 }}>{card.foot}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CUSTOMERS (WATEJA)
══════════════════════════════════════════════════════════════════ */
function Customers({ rows, sales, debts, returns, query, setQuery, onSaved, start, end }) {
  const t = useT();
  const [edit, setEdit] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [scope, setScope] = useState('all');
  const [order, setOrder] = useState('name');
  const needle = query.trim().toLowerCase();
  const owing = (person) => (debts||[]).filter((d) => {
    const ph = String(person.phone||'');
    return Number(d.balance) > 0 && ((ph.length>=9 && ph===d.phone) || d.customer===person.name);
  }).reduce((sum, d) => sum + Number(d.balance||0), 0);
  const shown = rows
    .filter((r) => `${r.name} ${r.phone}`.toLowerCase().includes(needle))
    .filter((r) => scope==='owe' ? owing(r)>0 : scope==='clear' ? owing(r)===0 : true)
    .slice()
    .sort((a, b) => order==='spent' ? b.spent-a.spent : String(a.name).localeCompare(String(b.name)));
  const openDebt = rows.filter((r) => owing(r)>0).length;
  const spent = rows.reduce((sum, r) => sum + Number(r.spent||0), 0);
  const mine = (r) => {
    const ph = String(r.phone||'');
    return (ph.length>=9&&ph===open.phone)||r.name===open.name||r.customer===open.name;
  };

  async function save(e) {
    e.preventDefault(); setError('');
    try { await api(`/api/admin/customers/${edit.id}`,{name:edit.name,phone:edit.phone}); setEdit(null); onSaved('Mteja amehifadhiwa.'); }
    catch (err) { setError(err.message); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="pv-stats">
        <article className="pv-kpi"><p>{t('Wateja')}</p><p>{rows.length}</p></article>
        <article className="pv-kpi"><p>{t('Matumizi')}</p><p>{tsh(spent)}</p></article>
        <article className="pv-kpi pv-kpi-warn"><p>{t('Wenye deni')}</p><p>{openDebt}</p></article>
        <article className="pv-kpi"><p>{t('Wastani')}</p><p>{tsh(rows.length ? Math.round(spent/rows.length) : 0)}</p></article>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:10 }}>
        <SearchBox value={query} onChange={setQuery} placeholder={t('Tafuta mteja')} />
        <div style={{ display:'flex', gap:8 }}>
          <BtnPrimary onClick={() => setFresh({name:'',phone:''})} icon={Plus}>{t('Ongeza mteja')}</BtnPrimary>
          <Pakua kind="wateja" start={start} end={end} />
        </div>
      </div>
      <div className="pv-chips">
        <KindTab active={scope==='all'} onClick={() => setScope('all')}>{t('Wote')}</KindTab>
        <KindTab active={scope==='owe'} onClick={() => setScope('owe')}>{t('Wenye deni')}</KindTab>
        <KindTab active={scope==='clear'} onClick={() => setScope('clear')}>{t('Bila deni')}</KindTab>
        <KindTab active={order==='name'} onClick={() => setOrder('name')}>A–Z</KindTab>
        <KindTab active={order==='spent'} onClick={() => setOrder('spent')}>{t('Matumizi makubwa')}</KindTab>
      </div>
      <p style={{ fontSize:13, color:'var(--text-secondary)', fontWeight:650 }}>{order==='spent' ? t('Imeorodheshwa kwa matumizi, walioonunua zaidi juu.') : t('Imeorodheshwa kwa jina.')}</p>

      {fresh && (
        <form className="pv-panel" style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10 }}
          onSubmit={async (e) => { e.preventDefault(); try { await api('/api/admin/customers',fresh,'POST'); setFresh(null); onSaved('Mteja ameongezwa.'); } catch(err){setError(err.message);} }}
        >
          <input value={fresh.name} onChange={(e) => setFresh({...fresh,name:e.target.value})} placeholder={t('Jina')} style={inputSx} />
          <input value={fresh.phone} onChange={(e) => setFresh({...fresh,phone:e.target.value})} placeholder={t('07xxxxxxxx')} style={inputSx} />
          <BtnPrimary type="submit" icon={Plus}>{t('Hifadhi')}</BtnPrimary>
        </form>
      )}
      {edit && (
        <form onSubmit={save} className="pv-panel" style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10 }}>
          <input value={edit.name} onChange={(e) => setEdit({...edit,name:e.target.value})} style={inputSx} />
          <input value={edit.phone} onChange={(e) => setEdit({...edit,phone:e.target.value})} style={inputSx} />
          {error && <Warn style={{ gridColumn:'1/-1' }}>{error}</Warn>}
          <BtnPrimary type="submit">{t('Hifadhi')}</BtnPrimary>
        </form>
      )}
      {error && !edit && <Warn>{error}</Warn>}

      {open && (
        <div className="pv-panel" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span className="pv-avatar">{String(open.name||'M').slice(0,1).toUpperCase()}</span>
              <div>
                <p style={{ fontWeight:800 }}>{open.name}</p>
                <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{open.phone||'Bila namba'}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <BtnGhost onClick={() => setEdit({id:open.id,name:open.name,phone:open.phone})} icon={Edit}>{t('Hariri')}</BtnGhost>
              <BtnGhost onClick={() => setOpen(null)}>{t('Funga')}</BtnGhost>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14 }}>
            <Block title="Risiti" icon={HistoryIcon} rows={(sales||[]).filter(mine).map((s)=>({id:s.id,title:s.invoice,meta:when(s.at),aside:tsh(s.total),detail:s.method}))} />
            <Block title="Deni" icon={CreditCard} rows={(debts||[]).filter(mine).map((d)=>({id:d.id,title:d.customer,meta:d.phone,aside:tsh(d.balance),detail:`Chanzo ${tsh(d.principal)}`}))} />
            <Block title="Marejesho" icon={RotateCcw} rows={(returns||[]).filter(mine).map((r)=>({id:r.id,title:r.invoice,meta:r.saleInvoice,aside:tsh(r.refund),detail:r.reason}))} />
          </div>
        </div>
      )}

      <div className="pv-person-grid">
        {shown.map((r) => {
          const due = owing(r);
          return (
            <article key={r.id} className={`pv-person-card${open?.id===r.id?' on':''}`}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span className="pv-avatar">{String(r.name||'M').slice(0,1).toUpperCase()}</span>
                <div style={{ minWidth:0, flex:1 }}>
                  <p style={{ fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</p>
                  <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{r.phone||'Bila namba'}</p>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{t('Matumizi')}</span>
                <strong>{tsh(r.spent)}</strong>
              </div>
              {due>0 && <p style={{ fontSize:12, fontWeight:700, color:'#b45309' }}>Deni {tsh(due)}</p>}
              <div style={{ display:'flex', gap:8 }}>
                <BtnPrimary onClick={() => setOpen(open?.id===r.id?null:r)}>{t('Angalia')}</BtnPrimary>
                <BtnSecondary onClick={() => api(`/api/admin/customers/${r.id}`,null,'DELETE').then(()=>onSaved('Mteja ameondolewa.')).catch((err)=>setError(err.message))}>{t('Futa')}</BtnSecondary>
              </div>
            </article>
          );
        })}
      </div>
      {!shown.length && <p style={{ textAlign:'center', padding:'24px 0', color:'var(--text-secondary)' }}>{t('Hakuna mteja katika kichujio hiki.')}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REPORTS (RIPOTI)
══════════════════════════════════════════════════════════════════ */
const REPORTS = [
  ['faida','Faida'],['mauzo','Mauzo'],['madeni','Madeni'],['stoo','Stoo'],
  ['wateja','Wateja'],['wauzaji','Wauzaji'],['vikundi','Vikundi'],
  ['ndogo','Stoo ndogo'],['mwendo','Mwendo wa stoo'],
];
const REPORT_ICONS = { faida:TrendingUp, mauzo:ShoppingCart, madeni:CreditCard, stoo:Package, wateja:Users, wauzaji:UserCheck, vikundi:Layers, ndogo:AlertTriangle, mwendo:Activity };

function foldReport(rows, labelAt, valueOf, top = 8) {
  const map = new Map();
  for (const row of rows) {
    const name = String(row[labelAt] ?? '—').trim().slice(0, 18) || '—';
    const value = Number(valueOf(row)) || 0;
    map.set(name, (map.get(name) || 0) + value);
  }
  return [...map.entries()]
    .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, top);
}

function foldDays(rows, labelAt, valueOf) {
  const map = new Map();
  for (const row of rows) {
    const hit = String(row[labelAt] || '').match(/\d{4}-\d{2}-\d{2}/);
    const day = hit ? hit[0].slice(5) : String(row[labelAt] || '—').slice(0, 10);
    map.set(day, (map.get(day) || 0) + (Number(valueOf(row)) || 0));
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, total]) => ({ day, total }));
}

function reportView(kind, rows) {
  const sum = (i) => rows.reduce((s, r) => s + (Number(r[i]) || 0), 0);
  const money = (n) => tsh(n);
  if (kind === 'faida') return {
    kpis: [['Mistari', rows.length], ['Faida', money(sum(7))], ['Idadi', sum(4)], ['Bei', money(sum(5))]],
    pieTitle: 'Faida kwa aina', barTitle: 'Faida kwa bidhaa', areaTitle: 'Faida kwa siku',
    pie: foldReport(rows, 2, (r) => r[7]), bar: foldReport(rows, 3, (r) => r[7]), area: foldDays(rows, 0, (r) => r[7]), cash: true,
  };
  if (kind === 'mauzo') return {
    kpis: [['Risiti', rows.length], ['Jumla', money(sum(4))], ['Yamelipwa', money(sum(5))], ['Deni', money(sum(6))]],
    pieTitle: 'Malipo', barTitle: 'Wauzaji', areaTitle: 'Mauzo kwa siku',
    pie: foldReport(rows, 7, (r) => r[4]), bar: foldReport(rows, 8, (r) => r[4]), area: foldDays(rows, 1, (r) => r[4]), cash: true,
  };
  if (kind === 'madeni') return {
    kpis: [['Madeni', rows.length], ['Kilichokopwa', money(sum(3))], ['Baki', money(sum(4))], ['Wazi', rows.filter((r) => Number(r[4]) > 0).length]],
    pieTitle: 'Hali ya deni', barTitle: 'Baki kwa mteja',
    pie: foldReport(rows, 5, (r) => r[4]), bar: foldReport(rows, 0, (r) => r[4]), area: [], cash: true,
  };
  if (kind === 'stoo') return {
    kpis: [['Bidhaa', rows.length], ['Thamani', money(rows.reduce((s, r) => s + (Number(r[2])||0)*(Number(r[4])||0), 0))], ['Idadi', sum(4)], ['Aina', new Set(rows.map((r) => r[0])).size]],
    pieTitle: 'Thamani kwa aina', barTitle: 'Idadi kwa bidhaa',
    pie: foldReport(rows, 0, (r) => (Number(r[2])||0)*(Number(r[4])||0)), bar: foldReport(rows, 1, (r) => r[4], 10), area: [], cash: true, barCash: false,
  };
  if (kind === 'wateja') return {
    kpis: [['Wateja', rows.length], ['Manunuzi', money(sum(2))], ['Wastani', money(rows.length ? Math.round(sum(2)/rows.length) : 0)], ['Wenye namba', rows.filter((r) => String(r[1]||'').length>=9).length]],
    pieTitle: 'Manunuzi makubwa', barTitle: 'Wateja',
    pie: foldReport(rows, 0, (r) => r[2], 6), bar: foldReport(rows, 0, (r) => r[2], 10), area: [], cash: true,
  };
  if (kind === 'wauzaji') return {
    kpis: [['Wauzaji', rows.length], ['Risiti', sum(1)], ['Jumla', money(sum(2))], ['Wastani', money(rows.length ? Math.round(sum(2)/rows.length) : 0)]],
    pieTitle: 'Mauzo kwa muuzaji', barTitle: 'Risiti kwa muuzaji',
    pie: foldReport(rows, 0, (r) => r[2]), bar: foldReport(rows, 0, (r) => r[1]), area: [], cash: true, barCash: false,
  };
  if (kind === 'vikundi') return {
    kpis: [['Makundi', rows.length], ['Idadi', sum(1)], ['Jumla', money(sum(2))], ['Kubwa', rows.slice().sort((a,b)=>b[2]-a[2])[0]?.[0] || '—']],
    pieTitle: 'Mauzo kwa kundi', barTitle: 'Idadi kwa kundi',
    pie: foldReport(rows, 0, (r) => r[2]), bar: foldReport(rows, 0, (r) => r[1]), area: [], cash: true, barCash: false,
  };
  if (kind === 'ndogo') return {
    kpis: [['Bidhaa', rows.length], ['Baki', sum(1)], ['Kiwango', sum(2)], ['Upungufu', rows.reduce((s, r) => s + Math.max(0, (Number(r[2])||0)-(Number(r[1])||0)), 0)]],
    pieTitle: 'Upungufu', barTitle: 'Baki dhidi ya kiwango',
    pie: foldReport(rows, 0, (r) => Math.max(0, (Number(r[2])||0)-(Number(r[1])||0))), bar: rows.slice(0, 10).map((r) => ({ name: String(r[0]).slice(0, 14), Baki: Number(r[1])||0, Kiwango: Number(r[2])||0 })), area: [], cash: false, pair: true,
  };
  return {
    kpis: [['Miondoko', rows.length], ['Kuingia', rows.filter((r) => Number(r[2])>0).length], ['Kutoka', rows.filter((r) => Number(r[2])<0).length], ['Jumla', sum(2)]],
    pieTitle: 'Sababu', barTitle: 'Mabadiliko kwa bidhaa', areaTitle: 'Mwendo kwa siku',
    pie: foldReport(rows, 3, () => 1), bar: foldReport(rows, 1, (r) => r[2]), area: foldDays(rows, 0, (r) => r[2]), cash: false,
  };
}

const REPORT_MONEY = new Set(['Bei','Gharama','Faida','Jumla','Yamelipwa','Deni','Kilichokopwa','Manunuzi']);

function Report({ shop, start, end }) {
  const t = useT();
  const [kind, setKind] = useState('faida');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ i:-1, dir:1 });
  const table = shop.reports?.[kind]||{heads:[],rows:[]};
  const needle = query.trim().toLowerCase();
  const rows = table.rows.filter((r) => r.join(' ').toLowerCase().includes(needle));
  const shown = rows.slice().sort((a, b) => {
    if (sort.i < 0) return 0;
    const av = a[sort.i]; const bv = b[sort.i];
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av-bv : String(av??'').localeCompare(String(bv??''));
    return cmp * sort.dir;
  });
  const view = reportView(kind, rows);
  const pie = view.pie.filter((s) => s.value !== 0);
  const tip = (v) => view.cash ? tsh(v) : v;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="pv-chips">
        {REPORTS.map(([id,label]) => {
          const Icon = REPORT_ICONS[id] || BarChart2;
          return (
            <button key={id} type="button" onClick={() => { setKind(id); setQuery(''); setSort({ i:-1, dir:1 }); }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background: kind===id?'var(--sky-dark)':'#fff', color: kind===id?'#fff':'var(--text-secondary)', border:`1px solid ${kind===id?'transparent':'#d7e8d4'}`, fontWeight:700, fontSize:13, cursor:'pointer' }}
            >
              <Icon size={13} />{t(label)}
            </button>
          );
        })}
      </div>

      <div className="pv-stats">
        {view.kpis.map(([label, value]) => (
          <article key={label} className="pv-kpi"><p>{t(label)}</p><p>{value}</p></article>
        ))}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:10 }}>
        <SearchBox value={query} onChange={setQuery} placeholder={t('Chuja matokeo...')} />
        <div style={{ display:'flex', gap:8 }}>
          <Pakua kind={kind} start={start} end={end} />
        </div>
      </div>

      <div className="pv-home-split">
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:8 }}>{view.pieTitle}</p>
          <div className="pv-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie.length ? pie : [{ name:'Bado', value:1, color:'#e3f0df' }]} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>
                  {(pie.length ? pie : [{ name:'Bado', color:'#e3f0df' }]).map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [name==='Bado' ? 0 : tip(v), name]} contentStyle={CHART_TIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {pie.slice(0, 5).map((s) => (
            <p key={s.name} style={{ display:'flex', justifyContent:'space-between', gap:8, fontSize:13, marginTop:4 }}>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}><span style={{ display:'inline-block', width:8, height:8, borderRadius:99, background:s.color, marginRight:8 }} />{t(s.name)}</span>
              <b>{tip(s.value)}</b>
            </p>
          ))}
        </article>
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:8 }}>{view.barTitle}</p>
          <div className="pv-chart" style={{ height:280 }}>
            <ResponsiveContainer width="100%" height="100%">
              {view.pair ? (
                <BarChart data={view.bar.length ? view.bar : [{ name:'—', Baki:0, Kiwango:0 }]}>
                  <CartesianGrid stroke="#e3f0df" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} interval={0} angle={-18} height={48} />
                  <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={36} />
                  <Tooltip contentStyle={CHART_TIP} />
                  <Bar dataKey="Baki" fill="#509541" radius={[6,6,0,0]} />
                  <Bar dataKey="Kiwango" fill="#b45309" radius={[6,6,0,0]} />
                </BarChart>
              ) : (
                <BarChart data={view.bar.length ? view.bar : [{ name:'—', value:0 }]}>
                  <CartesianGrid stroke="#e3f0df" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} interval={0} angle={-18} height={48} />
                  <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={64} />
                  <Tooltip formatter={(v) => view.barCash===false ? v : tip(v)} contentStyle={CHART_TIP} />
                  <Bar dataKey="value" radius={[8,8,0,0]}>
                    {view.bar.map((row) => <Cell key={row.name} fill={row.value < 0 ? '#b45309' : '#509541'} />)}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      {!!view.area?.length && (
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:8 }}>{view.areaTitle}</p>
          <div className="pv-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={view.area}>
                <defs>
                  <linearGradient id="repFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#509541" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#509541" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e3f0df" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize:11, fill:'#64748b' }} />
                <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={64} />
                <Tooltip formatter={(v) => tip(v)} contentStyle={CHART_TIP} />
                <Area type="monotone" dataKey="total" name={view.areaTitle} stroke="#509541" fill="url(#repFill)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      )}

      <div className="pv-sheet">
        <table>
          <thead>
            <tr>
              {table.heads.map((h, i) => (
                <th key={h} style={{ cursor:'pointer' }} onClick={() => setSort({ i, dir: sort.i===i ? -sort.dir : -1 })}>
                  {h}{sort.i===i ? (sort.dir<0?' ↓':' ↑') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row,i) => (
              <tr key={i}>
                {row.map((cell,ci) => {
                  const head = table.heads[ci];
                  const moneyCell = typeof cell==='number' && (REPORT_MONEY.has(head) || (kind==='madeni' && head==='Baki'));
                  return <td key={ci}>{moneyCell ? tsh(cell) : cell}</td>;
                })}
              </tr>
            ))}
            {shown.length===0 && <tr><td style={{ textAlign:'left', color:'var(--text-secondary)' }} colSpan={table.heads.length||1}>{t('Hakuna kumbukumbu.')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ANALYSIS (UCHAMBUZI)
══════════════════════════════════════════════════════════════════ */
function paint(rows) {
  return rows.map((row, i) => ({ ...row, color: row.color || PIE_COLORS[i % PIE_COLORS.length] }));
}

function MiniPie({ title, slices, money = true }) {
  const t = useT();
  const drawn = slices.filter((s) => Number(s.value) > 0);
  const data = drawn.length ? drawn : [{ name:'Bado', value:1, color:'#e3f0df' }];
  return (
    <article className="pv-panel">
      <p style={{ fontWeight:800, marginBottom:4 }}>{t(title)}</p>
      <div className="pv-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={3}>
              {data.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip formatter={(v, name) => [name === 'Bado' ? 0 : (money ? tsh(v) : v), t(name)]} contentStyle={CHART_TIP} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {drawn.slice(0, 5).map((s) => (
        <p key={s.name} style={{ display:'flex', justifyContent:'space-between', gap:8, fontSize:13, marginTop:4 }}>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}><span style={{ display:'inline-block', width:8, height:8, borderRadius:99, background:s.color, marginRight:8 }} />{t(s.name)}</span>
          <b>{money ? tsh(s.value) : s.value}</b>
        </p>
      ))}
    </article>
  );
}

function xmlCell(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  const text = String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<Cell><Data ss:Type="String">${text}</Data></Cell>`;
}

function excelBook(sheets) {
  const body = sheets.map(([name, rows]) => (
    `<Worksheet ss:Name="${name}"><Table>${rows.map((row) => `<Row>${row.map(xmlCell).join('')}</Row>`).join('')}</Table></Worksheet>`
  )).join('');
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${body}</Workbook>`;
}

function Analysis({ shop }) {
  const t = useT();
  const money = shop.money || {};
  const profit = shop.profit || {};
  const phones = profit.phones || { sales:0, cost:0, returned:0, profit:0 };
  const goods = profit.goods || { sales:0, cost:0, returned:0, profit:0 };
  const billed = Number(money.billed) || 0;
  const rate = billed ? Math.round((Number(profit.shopProfit) || 0) / billed * 1000) / 10 : 0;
  const days = shop.days || [];
  const best = days.slice().sort((a, b) => b.total - a.total)[0];
  const groups = paint((shop.groups || []).map((row) => ({ name: row.name, value: row.total, qty: row.qty }))).sort((a, b) => b.value - a.value);
  const topGroup = groups[0];
  const cashiers = (shop.cashiers || []).slice().sort((a, b) => b.total - a.total);
  const people = (shop.customers || []).slice().sort((a, b) => b.spent - a.spent);
  const pay = paint([
    { name:'Cash', value: (money.cashSales||0) + (money.cashDebts||0), color:'#509541' },
    { name:'Lipa', value: (money.lipaSales||0) + (money.lipaDebts||0), color:'#1f5c28' },
    { name:'Deni', value: money.openDebt||0, color:'#b45309' },
  ]);
  const profitBars = [
    { name:'Simu', value: Math.round(phones.profit || 0) },
    { name:'Vifaa', value: Math.round(goods.profit || 0) },
    { name:'Matatizo', value: Math.round(profit.faultProfit || 0) },
  ];
  const debtSlices = paint([
    { name:'Wazi', value: (shop.debts||[]).reduce((s, d) => s + Number(d.balance||0), 0), color:'#b45309' },
    { name:'Yamelipwa', value: (shop.debts||[]).reduce((s, d) => s + Math.max(0, Number(d.principal||0)-Number(d.balance||0)), 0), color:'#509541' },
  ]);
  const stockRows = (shop.stock||[]).map((row) => ({ ...row, worth: (Number(row.price)||0) * (Number(row.stock)||0) }));
  const stockSlices = paint([
    { name:'Simu', value: stockRows.filter((r) => r.type==='PHONE').reduce((s, r) => s + r.worth, 0) + (shop.units||[]).reduce((s, r) => s + (Number(r.price)||0), 0) },
    { name:'Vifaa', value: stockRows.filter((r) => r.type!=='PHONE').reduce((s, r) => s + r.worth, 0) },
  ]);
  const wings = shop.wings || [];
  const wingSlices = paint([
    { name:'Nje', value: wings.filter((r) => r.status!=='BACK').length },
    { name:'Yamerudi', value: wings.filter((r) => r.status==='BACK').length },
  ]);
  const cover = shop.warranty || [];
  const coverSlices = paint([
    { name:'Haijaisha', value: cover.filter((r) => r.left>=0).length },
    { name:'Imeisha', value: cover.filter((r) => r.left < 0).length },
  ]);
  const book = [
    ['Simu', phones.sales, phones.cost, phones.returned, phones.profit],
    ['Vifaa', goods.sales, goods.cost, goods.returned, goods.profit],
    ['Matatizo', profit.faultSales||0, (profit.phoneFaults||0)+(profit.goodsFaults||0), 0, profit.faultProfit||0],
  ];
  const moneyLines = [
    ['Cash ya mauzo', money.cashSales||0],
    ['Cash ya deni', money.cashDebts||0],
    ['Lipa ya mauzo', money.lipaSales||0],
    ['Lipa ya deni', money.lipaDebts||0],
    ['Marejesho', money.refunds||0],
    ['Chenji', money.changeOut||0],
    ['Pesa iliyoingia', money.drawer||0],
    ['Deni wazi', money.openDebt||0],
  ];

  function pull() {
    const file = excelBook([
      ['Muhtasari', [
        ['Kipengele','Kiasi'],
        ['Risiti', money.receipts||0],
        ['Mauzo', billed],
        ['Yamelipwa', (money.cashSales||0)+(money.cashDebts||0)+(money.lipaSales||0)+(money.lipaDebts||0)],
        ['Faida', Math.round(profit.shopProfit||0)],
        ['Kiwango cha faida', rate],
        ['Deni wazi', money.openDebt||0],
        ['Marejesho', money.refunds||0],
        ['Thamani ya stoo', shop.stockValue||0],
        ['Chini ya kiwango', shop.low||0],
      ]],
      ['Faida', [['Aina','Mauzo','Gharama','Marejesho','Faida'], ...book]],
      ['Malipo', [['Kipengele','Kiasi'], ...moneyLines]],
      ['Siku', [['Siku','Jumla'], ...days.map((d) => [d.day, d.total])]],
      ['Vikundi', [['Kundi','Idadi','Jumla'], ...(shop.groups||[]).map((r) => [r.name, r.qty, r.total])]],
      ['Wauzaji', [['Muuzaji','Risiti','Jumla'], ...cashiers.map((r) => [r.name, r.receipts, r.total])]],
      ['Wateja', [['Jina','Simu','Manunuzi'], ...people.map((r) => [r.name, r.phone, r.spent])]],
      ['Stoo', [['Jina','Aina','Bei','Idadi','Thamani'], ...stockRows.map((r) => [r.name, r.type, r.price, r.stock, r.worth])]],
      ['Madeni', [['Mteja','Simu','Chanzo','Baki','Hali'], ...(shop.debts||[]).map((r) => [r.customer, r.phone, r.principal, r.balance, r.status])]],
      ['Mawinga', [['Mtu','Simu','Hali','Bidhaa'], ...wings.map((r) => [r.person, r.phone, r.status, (r.items||[]).reduce((s, i) => s + Number(i.qty||0), 0)])]],
      ['Matatizo', [['Jina','Aina','Idadi','Gharama'], ...(shop.faults||[]).map((r) => [r.name, r.kind, r.qty, r.cost])]],
    ]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([file], { type:'application/vnd.ms-excel' }));
    link.download = 'phonevault-uchambuzi.xls';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <BtnPrimary onClick={pull} icon={Download}>{t('Excel')}</BtnPrimary>
      </div>
      <div className="pv-stats">
        <article className="pv-kpi"><p>{t('Pesa iliyoingia')}</p><p>{tsh(money.drawer)}</p></article>
        <article className="pv-kpi"><p>{t('Mauzo')}</p><p>{tsh(billed)}</p></article>
        <article className="pv-kpi pv-kpi-green"><p>{t('Faida')}</p><p>{tsh(profit.shopProfit)}</p></article>
        <article className="pv-kpi pv-kpi-warn"><p>{t('Deni wazi')}</p><p>{tsh(money.openDebt)}</p></article>
      </div>
      <div className="pv-stats">
        <article className="pv-kpi"><p>{t('Risiti')}</p><p>{money.receipts||0}</p></article>
        <article className="pv-kpi"><p>{t('Wastani')}</p><p>{tsh(money.receipts ? Math.round(billed/money.receipts) : 0)}</p></article>
        <article className="pv-kpi"><p>{t('Kiwango cha faida')}</p><p>{rate}%</p></article>
        <article className="pv-kpi"><p>{t('Siku kubwa')}</p><p>{best ? best.day : '—'}</p></article>
      </div>

      <div className="pv-home-three">
        <MiniPie title="Malipo" slices={pay} />
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:8 }}>{t('Faida kwa aina')}</p>
          <div className="pv-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitBars}>
                <CartesianGrid stroke="#e3f0df" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:12, fill:'#64748b' }} />
                <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={64} />
                <Tooltip formatter={(v) => tsh(v)} contentStyle={CHART_TIP} />
                <Bar dataKey="value" radius={[8,8,0,0]}>
                  {profitBars.map((row) => <Cell key={row.name} fill={row.value<0?'#b45309':'#509541'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <MiniPie title={topGroup ? `Vikundi · kubwa ${topGroup.name}` : 'Vikundi'} slices={groups} />
      </div>

      <article className="pv-panel">
        <p style={{ fontWeight:800, marginBottom:8 }}>{t('Mauzo kwa siku')}</p>
        <div className="pv-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days.length ? days : [{ day:'—', total:0 }]}>
              <CartesianGrid stroke="#e3f0df" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize:11, fill:'#64748b' }} />
              <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={64} />
              <Tooltip formatter={(v) => tsh(v)} contentStyle={CHART_TIP} />
              <Area type="monotone" dataKey="total" name="Mauzo" stroke="#509541" fill="#50954133" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="pv-home-split">
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:8 }}>{t('Wauzaji')}</p>
          <div className="pv-chart" style={{ height:260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashiers.length ? cashiers.map((r) => ({ name:String(r.name).slice(0,14), value:r.total })) : [{ name:'—', value:0 }]}>
                <CartesianGrid stroke="#e3f0df" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} />
                <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={64} />
                <Tooltip formatter={(v) => tsh(v)} contentStyle={CHART_TIP} />
                <Bar dataKey="value" fill="#509541" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="pv-panel">
          <p style={{ fontWeight:800, marginBottom:8 }}>{t('Wateja kwa matumizi')}</p>
          <div className="pv-chart" style={{ height:260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={people.slice(0, 8).map((r) => ({ name:String(r.name).slice(0,12), value:r.spent }))}>
                <CartesianGrid stroke="#e3f0df" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} interval={0} angle={-18} height={48} />
                <YAxis tick={{ fontSize:11, fill:'#64748b' }} width={64} />
                <Tooltip formatter={(v) => tsh(v)} contentStyle={CHART_TIP} />
                <Bar dataKey="value" fill="#509541" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="pv-home-three">
        <MiniPie title="Madeni" slices={debtSlices} />
        <MiniPie title="Thamani ya stoo" slices={stockSlices} />
        <MiniPie title="Mawinga" slices={wingSlices} money={false} />
      </div>

      <div className="pv-home-split">
        <article className="pv-panel" style={{ padding:0, overflow:'hidden' }}>
          <p style={{ fontWeight:800, padding:'14px 16px 0' }}>{t('Kitabu cha faida')}</p>
          <div className="pv-sheet" style={{ border:'none' }}>
            <table>
              <thead><tr>{['Aina','Mauzo','Gharama','Marejesho','Faida'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {book.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{i ? tsh(cell) : cell}</td>)}</tr>)}
                <tr><td>{t('Duka')}</td><td /><td /><td /><td>{tsh(profit.shopProfit)}</td></tr>
              </tbody>
            </table>
          </div>
        </article>
        <article className="pv-panel" style={{ padding:0, overflow:'hidden' }}>
          <p style={{ fontWeight:800, padding:'14px 16px 0' }}>{t('Pesa kwa njia')}</p>
          <div className="pv-sheet" style={{ border:'none' }}>
            <table>
              <thead><tr><th>{t('Kipengele')}</th><th>{t('Kiasi')}</th></tr></thead>
              <tbody>{moneyLines.map((row) => <tr key={row[0]}><td>{t(row[0])}</td><td>{tsh(row[1])}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </div>

      <div className="pv-home-three">
        <MiniPie title="Warranty" slices={coverSlices} money={false} />
        <article className="pv-panel">
          <p style={{ fontWeight:800 }}>{t('Stoo')}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:8 }}>Thamani {tsh(shop.stockValue)}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>Chini ya kiwango {shop.low||0}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>Bidhaa {(shop.stock||[]).length}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>Simu za IMEI {(shop.units||[]).length}</p>
        </article>
        <article className="pv-panel">
          <p style={{ fontWeight:800 }}>{t('Matatizo')}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:8 }}>Kumbukumbu {(shop.faults||[]).length}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>Mauzo {tsh(profit.faultSales)}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>Gharama {tsh((profit.phoneFaults||0)+(profit.goodsFaults||0))}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>Faida {tsh(profit.faultProfit)}</p>
        </article>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WARRANTY
══════════════════════════════════════════════════════════════════ */
function Warranty({ rows }) {
  const t = useT();
  const [tab, setTab] = useState('hai');
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const live = rows.filter((r) => r.left>=0);
  const soon = live.filter((r) => r.left <= 14);
  const dead = rows.filter((r) => r.left < 0);
  const shown = rows
    .filter((r) => tab==='zime' ? r.left<0 : tab==='karibu' ? r.left>=0 && r.left<=14 : r.left>=0)
    .filter((r) => `${r.name} ${r.customer} ${r.imei||''} ${r.invoice||''}`.toLowerCase().includes(needle))
    .slice()
    .sort((a, b) => a.left-b.left);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="pv-stats">
        <article className="pv-kpi pv-kpi-green"><p>{t('Haijaisha')}</p><p>{live.length}</p></article>
        <article className="pv-kpi pv-kpi-warn"><p>{t('Karibu kuisha')}</p><p>{soon.length}</p></article>
        <article className="pv-kpi"><p>{t('Imeisha')}</p><p>{dead.length}</p></article>
        <article className="pv-kpi"><p>{t('Jumla')}</p><p>{rows.length}</p></article>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:10 }}>
        <div className="pv-chips">
          <KindTab active={tab==='hai'} onClick={() => setTab('hai')}>{t('Haijaisha')}</KindTab>
          <KindTab active={tab==='karibu'} onClick={() => setTab('karibu')}>{t('Karibu kuisha')}</KindTab>
          <KindTab active={tab==='zime'} onClick={() => setTab('zime')}>{t('Imeisha')}</KindTab>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder={t('Tafuta bidhaa, mteja, au IMEI')} />
      </div>
      <div className="pv-person-grid">
        {shown.map((r) => {
          const gone = r.left<0;
          const near = !gone && r.left<=14;
          const fill = gone || !r.days ? 0 : Math.max(4, Math.min(100, Math.round((r.left/r.days)*100)));
          return (
            <article key={r.id} className={`pv-cover${gone?' out':near?' warn':''}`}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'flex-start' }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontWeight:800 }}>{r.name}</p>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{r.customer||'Mteja'} · {r.invoice||''}</p>
                </div>
                <span className="pv-pill" style={{ color: gone?'#dc2626':near?'#b45309':'#1f5c28' }}>{gone?'Imeisha':`${r.left} siku`}</span>
              </div>
              {r.imei && <p style={{ fontFamily:'ui-monospace,monospace', fontSize:12 }}>{r.imei}</p>}
              <div className="pv-bar"><i style={{ width:`${fill}%`, background: gone?'#dc2626':near?'#b45309':'#509541' }} /></div>
              <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{when(r.at)} · muda {r.days} siku</p>
            </article>
          );
        })}
      </div>
      {!shown.length && <p style={{ textAlign:'center', padding:'24px 0', color:'var(--text-secondary)' }}>{t('Hakuna warranty katika kichujio hiki.')}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NOTES (TAARIFA)
══════════════════════════════════════════════════════════════════ */
function noteGroup(kind) {
  const head = String(kind || '').split(':')[0];
  return { SALE:'Mauzo', DEBT:'Deni', PAY:'Malipo', RETURN:'Marejesho', LOW:'Stoo', STAFF:'Watu', WING:'Mawinga', FAULT:'Matatizo' }[head] || head || 'Taarifa';
}

function Notes({ rows, onSaved }) {
  const t = useT();
  const [tab, setTab] = useState('new');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [open, setOpen] = useState(null);
  const needle = q.trim().toLowerCase();
  const kinds = [...new Set(rows.map((r) => noteGroup(r.kind)))];
  const fresh = rows.filter((r) => !r.read).length;
  const shown = rows
    .filter((r) => tab==='all' || r.id===open || (tab==='read' ? r.read : !r.read))
    .filter((r) => !kind || noteGroup(r.kind)===kind)
    .filter((r) => `${r.title} ${r.body} ${r.kind}`.toLowerCase().includes(needle));
  const reading = rows.find((r) => r.id === open) || null;

  function openNote(note) {
    setOpen(open === note.id ? null : note.id);
    if (!note.read) api(`/api/admin/notes/${note.id}/read`, {}, 'POST').then(() => onSaved('Imesomwa.'));
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="pv-stats">
        <article className="pv-kpi"><p>{t('Taarifa')}</p><p>{rows.length}</p></article>
        <article className="pv-kpi pv-kpi-warn"><p>{t('Hazijasomwa')}</p><p>{fresh}</p></article>
        <article className="pv-kpi"><p>{t('Zimesomwa')}</p><p>{rows.length-fresh}</p></article>
        <article className="pv-kpi"><p>{t('Aina')}</p><p>{kinds.length}</p></article>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:10 }}>
        <div className="pv-chips">
          <KindTab active={tab==='new'} onClick={() => setTab('new')}>{t('Hazijasomwa')}</KindTab>
          <KindTab active={tab==='read'} onClick={() => setTab('read')}>{t('Zimesomwa')}</KindTab>
          <KindTab active={tab==='all'} onClick={() => setTab('all')}>{t('Zote')}</KindTab>
          {kinds.map((item) => <KindTab key={item} active={kind===item} onClick={() => setKind(kind===item?'':item)}>{t(item)}</KindTab>)}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <SearchBox value={q} onChange={setQ} placeholder={t('Tafuta taarifa')} />
          <BtnSecondary onClick={() => api('/api/admin/notes/read-all',{},'POST').then(()=>onSaved('Zimesomwa.'))} icon={CheckCircle2}>{t('Soma zote')}</BtnSecondary>
          <BtnDanger onClick={() => api('/api/admin/notes/clear-read',{},'POST').then(()=>onSaved('Zilizosomwa zimefutwa.'))} icon={Trash2}>{t('Futa zilizosomwa')}</BtnDanger>
        </div>
      </div>
      {reading && (
        <article className="pv-panel" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start' }}>
            <div>
              <p style={{ fontSize:12, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#509541' }}>{t(noteGroup(reading.kind))}</p>
              <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', marginTop:4 }}>{reading.title}</h2>
              <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>{when(reading.at)}</p>
            </div>
            <BtnGhost onClick={() => setOpen(null)}>{t('Funga')}</BtnGhost>
          </div>
          <p style={{ whiteSpace:'pre-wrap', lineHeight:1.7, fontSize:15 }}>{reading.body || t('Hakuna maelezo.')}</p>
        </article>
      )}
      <div style={{ display:'grid', gap:10 }}>
        {shown.map((r) => (
          <button key={r.id} type="button" onClick={() => openNote(r)} className="pv-note" style={{ textAlign:'left', borderColor: open===r.id ? '#509541' : undefined }}>
            <div>
              <b>{r.title}</b>
              <p>{t(noteGroup(r.kind))} · {when(r.at)}</p>
            </div>
            <span>{r.read ? t('Imesomwa') : t('Mpya')}</span>
          </button>
        ))}
        {!shown.length && <p style={{ color:'var(--text-secondary)', padding:'12px 0' }}>{t('Hakuna taarifa katika kichujio hiki.')}</p>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STAFF (WATU)
══════════════════════════════════════════════════════════════════ */
const PERMS = [
  ['stock','Stoo'],['cost','Gharama na faida'],['history','Historia yote'],
  ['debts','Madeni'],['customers','Wateja'],['reports','Ripoti'],
  ['edit','Hariri stoo'],['analysis','Uchambuzi'],
];

function Staff({ rows, onSaved }) {
  const t = useT();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');
  const [open, setOpen] = useState(null);
  const [reset, setReset] = useState(null);
  const needle = q.trim().toLowerCase();
  const live = rows.filter((r) => r.active).length;
  const shown = rows
    .filter((r) => r.name.toLowerCase().includes(needle))
    .filter((r) => scope==='on' ? r.active : scope==='off' ? !r.active : true);

  async function toggle(person) {
    setError('');
    try { await api(`/api/admin/staff/${person.id}`,{active:!person.active}); onSaved(person.active?'Mfanyakazi amesimamishwa.':'Mfanyakazi amerudishwa.'); }
    catch (err) { setError(err.message); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="pv-stats">
        <article className="pv-kpi"><p>{t('Wafanyakazi')}</p><p>{rows.length}</p></article>
        <article className="pv-kpi pv-kpi-green"><p>{t('Hai')}</p><p>{live}</p></article>
        <article className="pv-kpi"><p>{t('Amesimama')}</p><p>{rows.length-live}</p></article>
        <article className="pv-kpi"><p>{t('Mmiliki')}</p><p>{rows.filter((r)=>r.role==='OWNER').length}</p></article>
      </div>
      {error && <Warn>{error}</Warn>}
      <form style={{ display:'grid', gridTemplateColumns:'1fr 8rem auto', gap:10 }}
        onSubmit={async (e) => { e.preventDefault(); try { await api('/api/admin/staff',{name,pin},'POST'); setName(''); setPin(''); onSaved('Muuzaji ameongezwa.'); } catch(err){setError(err.message);} }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Jina la muuzaji')} style={inputSx} />
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder={t('PIN ya tarakimu 4')} type="password" maxLength={4} style={inputSx} />
        <BtnPrimary type="submit" icon={Plus}>{t('Ongeza')}</BtnPrimary>
      </form>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:10 }}>
        <div className="pv-chips">
          <KindTab active={scope==='all'} onClick={() => setScope('all')}>{t('Wote')}</KindTab>
          <KindTab active={scope==='on'} onClick={() => setScope('on')}>{t('Hai')}</KindTab>
          <KindTab active={scope==='off'} onClick={() => setScope('off')}>{t('Amesimama')}</KindTab>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder={t('Tafuta mfanyakazi')} />
      </div>
      <div className="pv-sheet">
        <table>
          <thead><tr><th>{t('Jina')}</th><th>{t('Wadhifa')}</th><th>{t('Hali')}</th><th>{t('Ruhusa')}</th><th></th></tr></thead>
          <tbody>
            {shown.map((row) => {
              const granted = PERMS.filter(([key]) => row.perms?.[key]).length;
              return (
                <Fragment key={row.id}>
                  <tr>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span className="pv-avatar" style={{ width:32, height:32, borderRadius:10, fontSize:13 }}>
                          {row.photo ? <img src={`data:image/jpeg;base64,${row.photo}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:10 }} /> : String(row.name||'M').slice(0,1).toUpperCase()}
                        </span>
                        <b>{row.name}</b>
                      </div>
                    </td>
                    <td>{row.role==='OWNER'?t('Mmiliki'):t('Muuzaji')}</td>
                    <td>
                      {row.role==='OWNER' ? t('Hai') : (
                        <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontWeight:700, cursor:'pointer', color: row.active?'#1f5c28':'var(--text-secondary)' }}>
                          <input type="checkbox" checked={!!row.active} onChange={() => toggle(row)} />
                          {row.active?t('Hai'):t('Amesimama')}
                        </label>
                      )}
                    </td>
                    <td>{row.role==='OWNER' ? PERMS.length : `${granted}/${PERMS.length}`}</td>
                    <td>
                      {row.role!=='OWNER' && (
                        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                          <BtnSecondary onClick={() => { setReset(null); setOpen(open?.id===row.id?null:{...row,perms:{...row.perms}}); }} icon={Shield}>{t('Ruhusa')}</BtnSecondary>
                          <BtnSecondary onClick={() => { setOpen(null); setReset(reset?.id===row.id?null:{id:row.id,pin:''}); }} icon={Lock}>{t('PIN')}</BtnSecondary>
                        </div>
                      )}
                    </td>
                  </tr>
                  {open?.id===row.id && (
                    <tr className="pv-row-active">
                      <td colSpan={5}>
                        <form style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}
                          onSubmit={async (e) => { e.preventDefault(); try { await api(`/api/admin/staff/${open.id}/access`,{perms:open.perms},'PUT'); onSaved('Ruhusa zimehifadhiwa.'); } catch(err){setError(err.message);} }}
                        >
                          {PERMS.map(([key,label]) => (
                            <label key={key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600 }}>
                              <input type="checkbox" checked={!!open.perms?.[key]} onChange={(e) => setOpen({...open,perms:{...open.perms,[key]:e.target.checked}})} />
                              {t(label)}
                            </label>
                          ))}
                          <div><BtnPrimary type="submit">{t('Hifadhi ruhusa')}</BtnPrimary></div>
                        </form>
                      </td>
                    </tr>
                  )}
                  {reset?.id===row.id && (
                    <tr className="pv-row-active">
                      <td colSpan={5}>
                        <form style={{ display:'flex', gap:10, maxWidth:420 }}
                          onSubmit={async (e) => { e.preventDefault(); try { await api(`/api/admin/staff/${reset.id}/pin`,{pin:reset.pin},'PUT'); setReset(null); onSaved('PIN imebadilika.'); } catch(err){setError(err.message);} }}
                        >
                          <input value={reset.pin} onChange={(e) => setReset({...reset,pin:e.target.value})} placeholder={t('PIN mpya')} type="password" maxLength={4} style={inputSx} />
                          <BtnPrimary type="submit" icon={Lock}>{t('Hifadhi')}</BtnPrimary>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!shown.length && <tr><td colSpan={5}>{t('Hakuna mfanyakazi katika kichujio hiki.')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SETTINGS (MIPANGILIO)
══════════════════════════════════════════════════════════════════ */
function Settings({ shop, lang, onLang, onSaved }) {
  const t = useT();
  const ownerMode = useWho().role === 'OWNER';
  const me = useWho();
  const info = shop.shop;
  const owner = (shop.staff||[]).find((r)=>r.role==='OWNER');
  const [form, setForm] = useState({ name:info.name, location:info.location, phone:info.phone, lipa:info.lipa, footer:info.footer });
  const [error, setError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [wordOpen, setWordOpen] = useState(false);
  const [pin, setPin] = useState({oldPin:'',newPin:'',again:''});
  const [word, setWord] = useState({word:'',again:''});

  async function save(e) { e.preventDefault(); setError(''); try { await api('/api/admin/shop',form,'PUT'); onSaved('Duka limehifadhiwa.'); } catch(err){setError(err.message);} }

  async function sendPicture(path, file, maxSide) {
    setError('');
    try {
      const body = path.endsWith('logo') ? { logo:file?await fitPicture(file,maxSide):'' } : { photo:file?await fitPicture(file,maxSide):'' };
      await api(path,body,'PUT'); onSaved(file?'Picha imehifadhiwa.':'Picha imeondolewa.');
    } catch(err){setError(err.message);}
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="pv-home-split">
        <section className="pv-panel" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div>
            <p style={{ fontWeight:800 }}>{t('Lugha')}</p>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>{t('Kiswahili, English, عربي')}</p>
          </div>
          <LangMarks lang={lang} onPick={onLang} />
        </section>
        <section className="pv-panel" style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span className="pv-avatar" style={{ width:52, height:52, borderRadius:16, overflow:'hidden' }}>
            {(me.photo || owner?.photo) ? <img src={`data:image/jpeg;base64,${me.photo || owner?.photo}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (me.name||owner?.name||'M').slice(0,1)}
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:800 }}>{me.name||owner?.name||'Mmiliki'}</p>
            <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{t(roleWord(me.role))}</p>
          </div>
        </section>
      </div>

      <section className="pv-panel" style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, background:'linear-gradient(180deg,#f4fbf1,#fff)', border:'1px solid #d7e8d4', borderRadius:16, padding:16 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:'#fff', border:'1px solid #d7e8d4', display:'grid', placeItems:'center', overflow:'hidden', flexShrink:0 }}>
            {info.logo ? <img src={`data:image/jpeg;base64,${info.logo}`} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} /> : <Store size={22} color="#509541" />}
          </div>
          <div>
            <p style={{ fontWeight:800, fontSize:18 }}>{form.name||'Duka'}</p>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>{t('Inakaa juu ya risiti')}</p>
          </div>
        </div>
        {ownerMode && <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <label style={{ background:'#509541', color:'#fff', borderRadius:9, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
            <Upload size={14} />{info.logo?t('Badilisha logo'):t('Weka logo')}
            <input type="file" accept="image/jpeg,image/png" style={{ display:'none' }} onChange={(e) => { const f=e.target.files?.[0]; if(f) sendPicture('/api/admin/shop/logo',f,720); }} />
          </label>
          {info.logo && <BtnSecondary onClick={() => sendPicture('/api/admin/shop/logo',null,720)} icon={Trash2}>{t('Ondoa logo')}</BtnSecondary>}
        </div>}
        <form onSubmit={save} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[['Jina la duka','name'],['Mahali','location'],['Simu ya duka','phone'],['Lipa Namba','lipa']].map(([label,key]) => (
            <label key={key} style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)' }}>{t(label)}</span>
              <input value={form[key]||''} readOnly={!ownerMode} onChange={(e) => setForm({...form,[key]:e.target.value})} style={inputSx} />
            </label>
          ))}
          <label style={{ display:'flex', flexDirection:'column', gap:6, gridColumn:'1 / -1' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)' }}>{t('Ujumbe wa chini ya risiti')}</span>
            <input value={form.footer||''} readOnly={!ownerMode} onChange={(e) => setForm({...form,footer:e.target.value})} style={inputSx} />
          </label>
          {error && <Warn style={{ gridColumn:'1 / -1' }}>{error}</Warn>}
          {ownerMode && <div><BtnPrimary type="submit" icon={CheckCircle2}>{t('Hifadhi mabadiliko')}</BtnPrimary></div>}
        </form>
      </section>

      <section className="pv-panel" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <p style={{ fontWeight:800 }}>{t('Akaunti')}</p>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {ownerMode && (
            <label style={{ background:'#fff', border:'1px solid #d7e8d4', borderRadius:9, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
              <Upload size={14} />{owner?.photo ? t('Badilisha picha yangu') : t('Weka picha yangu')}
              <input type="file" accept="image/jpeg,image/png" style={{ display:'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) sendPicture('/api/admin/shop/photo', f, 512); }} />
            </label>
          )}
          {ownerMode && owner?.photo && <BtnSecondary onClick={() => sendPicture('/api/admin/shop/photo', null, 512)} icon={Trash2}>{t('Ondoa picha')}</BtnSecondary>}
          <BtnSecondary onClick={() => setPinOpen((v) => !v)} icon={Lock}>{t('Badilisha PIN')}</BtnSecondary>
          {ownerMode && <BtnSecondary onClick={() => setWordOpen((v) => !v)} icon={Shield}>{t('Neno la kurejesha')}</BtnSecondary>}
        </div>
        {pinOpen && (
          <form style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}
            onSubmit={async (e) => { e.preventDefault(); setError(''); try { await api('/api/admin/shop/pin',pin,'PUT'); setPin({oldPin:'',newPin:'',again:''}); setPinOpen(false); onSaved('PIN imebadilika.'); } catch(err){setError(err.message);} }}
          >
            <input value={pin.oldPin} onChange={(e) => setPin({...pin,oldPin:e.target.value})} placeholder={t('PIN ya sasa')} type="password" maxLength={4} style={inputSx} />
            <input value={pin.newPin} onChange={(e) => setPin({...pin,newPin:e.target.value})} placeholder={t('PIN mpya')} type="password" maxLength={4} style={inputSx} />
            <input value={pin.again} onChange={(e) => setPin({...pin,again:e.target.value})} placeholder={t('Rudia PIN')} type="password" maxLength={4} style={inputSx} />
            <BtnPrimary type="submit" icon={Lock}>{t('Hifadhi')}</BtnPrimary>
          </form>
        )}
        {wordOpen && (
          <form style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10 }}
            onSubmit={async (e) => { e.preventDefault(); setError(''); try { await api('/api/admin/shop/recovery',word,'PUT'); setWord({word:'',again:''}); setWordOpen(false); onSaved('Neno la kurejesha limehifadhiwa.'); } catch(err){setError(err.message);} }}
          >
            <input value={word.word} onChange={(e) => setWord({...word,word:e.target.value})} placeholder={t('Neno jipya')} type="password" style={inputSx} />
            <input value={word.again} onChange={(e) => setWord({...word,again:e.target.value})} placeholder={t('Rudia neno')} type="password" style={inputSx} />
            <BtnPrimary type="submit" icon={Shield}>{t('Hifadhi')}</BtnPrimary>
          </form>
        )}
      </section>

      {ownerMode && <Staff rows={shop.staff||[]} onSaved={onSaved} />}

      {ownerMode && <section className="pv-panel" style={{ display:'flex', justifyContent:'space-between', gap:16, flexWrap:'wrap', alignItems:'center' }}>
        <div>
          <p style={{ fontWeight:800 }}>{t('Nakala ya duka')}</p>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4, maxWidth:520 }}>
            {t('Faili hubeba duka zima: mauzo, madeni, stoo, wateja, na PIN.')} · {shop.revision}
          </p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <BtnPrimary onClick={async () => {
            const token=localStorage.getItem('phonevault_token');
            const res=await fetch('/api/admin/vault.json',{headers:{...(token?{Authorization:`Bearer ${token}`}:{}), ...shopHeaders()}});
            const blob=await res.blob(); const link=document.createElement('a');
            link.href=URL.createObjectURL(blob); link.download='phonevault-nakala.json'; link.click();
          }} icon={Download}>{t('Hifadhi nakala')}</BtnPrimary>
          <label style={{ background:'#fff', border:'1px solid #d7e8d4', borderRadius:9, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
            <Upload size={14} />{t('Rudisha nakala')}
            <input type="file" accept="application/json" style={{ display:'none' }} onChange={async (e) => {
              const file=e.target.files?.[0]; if(!file)return;
              const snapshot=JSON.parse(await file.text());
              const confirm=window.prompt('Andika RUDISHA'); if(confirm!=='RUDISHA')return;
              try { await api('/api/admin/vault',{confirm,snapshot},'POST'); onSaved('Daftari limerudi.'); }
              catch(err){setError(err.message);}
            }} />
          </label>
        </div>
      </section>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LANG MARKS
══════════════════════════════════════════════════════════════════ */
function LangMarks({ lang, onPick }) {
  const marks = [['sw','SW'],['en','EN'],['ar','ع']];
  return (
    <div className="pv-seg">
      {marks.map(([code,mark]) => (
        <button key={code} type="button" className={lang===code?'on':''} onClick={() => onPick(code)}>{mark}</button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   UTILITY COMPONENTS
══════════════════════════════════════════════════════════════════ */

// Shared input/select style objects
const inputSx = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: 9,
  color: 'var(--text-primary)',
  fontSize: 13.5,
  outline: 'none',
  minHeight: 38,
};
const selectSx = {
  ...inputSx,
  cursor: 'pointer',
};

function BtnPrimary({ children, onClick, type='button', icon: Icon, style: extraStyle, ...rest }) {
  return (
    <button type={type} onClick={onClick}
      style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--accent)', color:'#fff', border:'none', borderRadius:9, padding:'8px 16px', fontWeight:700, fontSize:13.5, cursor:'pointer', whiteSpace:'nowrap', transition:'all .2s', ...extraStyle }}
      onMouseEnter={(e) => { e.currentTarget.style.background='#3f7a32'; e.currentTarget.style.boxShadow='0 6px 16px rgba(80,149,65,0.22)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background='var(--accent)'; e.currentTarget.style.boxShadow='none'; }}
      {...rest}
    >
      {Icon && <Icon size={13} />}{children}
    </button>
  );
}

function BtnSecondary({ children, onClick, type='button', icon: Icon, ...rest }) {
  return (
    <button type={type} onClick={onClick}
      style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--bg-elevated)', color:'var(--text-secondary)', border:'1px solid var(--border-default)', borderRadius:9, padding:'8px 14px', fontWeight:600, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background='var(--bg-hover)'; e.currentTarget.style.color='var(--text-primary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background='var(--bg-elevated)'; e.currentTarget.style.color='var(--text-secondary)'; }}
      {...rest}
    >
      {Icon && <Icon size={13} />}{children}
    </button>
  );
}

function BtnGhost({ children, onClick, type='button', icon: Icon, ...rest }) {
  const t = useT();
  return (
    <button type={type} onClick={onClick}
      style={{ display:'inline-flex', alignItems:'center', gap:6, background:'transparent', color:'var(--accent)', border:'1px solid rgba(128,192,80,0.3)', borderRadius:9, padding:'6px 12px', fontWeight:700, fontSize:12.5, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background='var(--accent-glow)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; }}
      {...rest}
    >
      {Icon && <Icon size={12} />}{children}
    </button>
  );
}

function BtnDanger({ children, onClick, type='button', icon: Icon, ...rest }) {
  return (
    <button type={type} onClick={onClick}
      style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--danger-dim)', color:'var(--danger)', border:'1px solid rgba(248,81,73,0.25)', borderRadius:9, padding:'6px 12px', fontWeight:700, fontSize:12.5, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background='rgba(248,81,73,0.2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background='var(--danger-dim)'; }}
      {...rest}
    >
      {Icon && <Icon size={12} />}{children}
    </button>
  );
}

function KindTab({ children, active, onClick, secondary }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding:'7px 16px', borderRadius:9, background: active?(secondary?'rgba(128,192,80,0.12)':'var(--accent)'):'var(--bg-elevated)', color: active?(secondary?'var(--accent)':'#fff'):'var(--text-secondary)', border: active?(secondary?'1px solid rgba(128,192,80,0.3)':'none'):'1px solid var(--border-default)', fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}
    >
      {children}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{ position:'relative' }}>
      <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputSx, paddingLeft:34, minWidth:220 }}
      />
    </div>
  );
}

function Warn({ children, style: extraStyle }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(248,81,73,0.08)', border:'1px solid rgba(248,81,73,0.2)', borderRadius:9, padding:'10px 14px', ...extraStyle }}>
      <AlertCircle size={14} color="var(--danger)" style={{ flexShrink:0 }} />
      <span style={{ fontSize:13, color:'var(--danger)', fontWeight:600 }}>{children}</span>
    </div>
  );
}

function Info({ children, variant='info' }) {
  const colors = { info:['var(--info)','var(--info-dim)','rgba(80,149,65,0.2)'], warning:['var(--warning)','var(--warning-dim)','rgba(180,83,9,0.2)'] };
  const [color, bg, border] = colors[variant] || colors.info;
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:bg, border:`1px solid ${border}`, borderRadius:10, padding:'12px 16px' }}>
      <Info2 size={15} color={color} style={{ flexShrink:0, marginTop:1 }} />
      <span style={{ fontSize:13, color, fontWeight:500, lineHeight:1.5 }}>{children}</span>
    </div>
  );
}
// Avoid name clash with component Info above
const Info2 = AlertCircle;

function SectionHeader({ title, icon: Icon }) {
  const t = useT();
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
      {Icon && <div style={{ width:28, height:28, borderRadius:7, background:'rgba(128,192,80,0.1)', display:'grid', placeItems:'center' }}><Icon size={14} color="var(--accent)" /></div>}
      <p style={{ fontWeight:700, fontSize:15 }}>{t(title)}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TABLE
══════════════════════════════════════════════════════════════════ */
function Table({ heads, rows, onOpen, empty }) {
  const t = useT();
  if (!rows.length) return <p style={{ fontSize:14, color:'var(--text-secondary)', padding:'24px 0' }}>{t(empty)}</p>;
  return (
    <div className="pv-sheet">
      <table>
        <thead>
          <tr>{heads.map((h) => <th key={h}>{t(h)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <tr
                onClick={() => onOpen(row.open ? null : row.id)}
                className={row.open ? 'pv-row-open' : ''}
                style={{ cursor:'pointer' }}
              >
                {row.cells.map((cell, ci) => <td key={ci}>{cell}</td>)}
              </tr>
              {row.open && (
                <tr>
                  <td colSpan={heads.length} style={{ background:'rgba(128,192,80,0.03)', textAlign:'left', borderTop:'none' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:4, padding:'4px 0' }}>
                      {row.detail.map((line) => <div key={line} style={{ fontSize:13, color:'var(--text-secondary)' }}>{line}</div>)}
                    </div>
                    {row.tools}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LIST
══════════════════════════════════════════════════════════════════ */
function List({ rows, empty }) {
  const t = useT();
  if (!rows.length) return <p style={{ fontSize:14, color:'var(--text-secondary)', padding:'24px 0' }}>{empty}</p>;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14, overflow:'hidden' }}>
      {rows.map((row) => (
        <div key={row.id} className="pv-rowline">
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:row.meta||row.detail?4:0 }}>
              <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.title}</p>
              {row.badge && (
                <span style={{ flexShrink:0, background:row.badge.bg, color:row.badge.color, borderRadius:999, padding:'1px 8px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                  {row.badge.label}
                </span>
              )}
            </div>
            {row.meta && <p style={{ fontSize:12, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.meta}</p>}
            {row.detail && <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{row.detail}</p>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            {row.aside && <span className="pv-pill">{row.aside}</span>}
            {row.extra && <BtnSecondary onClick={row.extra}>{row.extraLabel||'Kumbusha'}</BtnSecondary>}
            {row.action && <BtnPrimary onClick={row.action}>{row.actionLabel||'Hariri'}</BtnPrimary>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BLOCK (Customer sub-panel)
══════════════════════════════════════════════════════════════════ */
function Block({ title, icon: Icon, rows }) {
  return (
    <section style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:14 }}>
      <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:8 }}>
        {Icon && <Icon size={13} color="var(--accent)" />}
        <p style={{ fontWeight:700, fontSize:14 }}>{title}</p>
      </div>
      <div style={{ padding:'4px 0' }}>
        <List empty="Hakuna kumbukumbu." rows={rows} />
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXCEL (Download buttons)
══════════════════════════════════════════════════════════════════ */
function Pakua({ kind, start, end }) {
  const t = useT();
  const [error, setError] = useState('');
  return (
    <span>
      <BtnPrimary onClick={() => downloadExcel(kind, start, end).catch((err) => setError(err.message))} icon={Download}>{t('Excel')}</BtnPrimary>
      {error && <span style={{ marginLeft:8, fontSize:12, color:'var(--warning)' }}>{error}</span>}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LINE (key-value row)
══════════════════════════════════════════════════════════════════ */
function Line({ label, value }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, paddingBottom:10, borderBottom:'1px solid var(--border-subtle)' }}>
      <p style={{ fontSize:13, color:'var(--text-secondary)' }}>{label}</p>
      <p style={{ fontSize:13, fontWeight:700, textAlign:'right', color:'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   IMAGE UTILITY
══════════════════════════════════════════════════════════════════ */
function fitPicture(file, maxSide) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Picha haikusomeka. Chagua JPG au PNG.')); };
    img.src = url;
  });
}
