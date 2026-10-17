import React, { useState, useEffect, useRef } from 'react';
import {
  Repeat, ShieldCheck, AlertCircle, CheckCircle2, XCircle, FileText, Smartphone,
  DollarSign, Sparkles, Printer, User, Lock, Award, ArrowRight, RefreshCw, X,
  TrendingUp, Search, Filter, Check, ExternalLink, PackageCheck, Layers, ChevronRight, ShoppingCart
} from 'lucide-react';

export default function UpgradeProgram({ products = [], phoneUnits = [], onTransferToPos }) {
  const [activeSubTab, setActiveSubTab] = useState('wizard'); // 'wizard' | 'contract' | 'b2b-queue' | 'analytics'

  // Diagnostic Evaluation Form State
  const [customerName, setCustomerName] = useState('Juma Hamisi');
  const [customerPhone, setCustomerPhone] = useState('0712345678');
  const [nidaNumber, setNidaNumber] = useState('19940812-10291-00001-82');
  const [oldBrandName, setOldBrandName] = useState('Apple');
  const [oldModelName, setOldModelName] = useState('iPhone 13');
  const [oldImei1, setOldImei1] = useState('359102910291029');
  const [oldImei2, setOldImei2] = useState('');
  const [oldColor, setOldColor] = useState('Midnight Black');
  const [oldStorage, setOldStorage] = useState('128GB');
  const [batteryHealth, setBatteryHealth] = useState(88);

  // Target New Phone Selection from Module 1 Inventory
  const [selectedTargetPhoneId, setSelectedTargetPhoneId] = useState('');

  // Strict Diagnostic Toggles
  const [hasCrackedScreen, setHasCrackedScreen] = useState(false);
  const [isFaceIdWorking, setIsFaceIdWorking] = useState(true);
  const [isIcloudSignedOut, setIsIcloudSignedOut] = useState(true);

  // Evaluation Result & History Data
  const [evalResult, setEvalResult] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState('ALL');
  const [queueSearch, setQueueSearch] = useState('');

  // Digital Signature Canvas Ref
  const canvasRef = useRef(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Fetch Evaluations & Analytics
  const fetchUpgradeData = async () => {
    setLoading(true);
    try {
      const [resEval, resAnal] = await Promise.all([
        fetch('/api/upgrades').then(r => r.json()),
        fetch('/api/upgrades/analytics').then(r => r.json()),
      ]);

      if (resEval.success) setEvaluations(resEval.data);
      if (resAnal.success) setAnalytics(resAnal.data);
    } catch (e) {
      console.error('Error fetching upgrade data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpgradeData();
  }, []);

  // Filter in-stock Brand New Phones for target upgrade selection
  const targetPhoneOptions = phoneUnits.filter(u => u.status === 'IN_STOCK');
  const selectedTargetPhoneUnit = targetPhoneOptions.find(u => u.id === selectedTargetPhoneId);

  // Live estimated allowance pre-calculation
  const calculateLiveAllowanceEstimate = () => {
    if (hasCrackedScreen || !isFaceIdWorking || !isIcloudSignedOut || parseInt(batteryHealth) < 80) {
      return 0;
    }
    let base = 900000;
    const modelUpper = (oldModelName || '').toUpperCase();
    if (modelUpper.includes('11')) base = 750000;
    if (modelUpper.includes('12')) base = 950000;
    if (modelUpper.includes('13')) base = 1300000;
    if (modelUpper.includes('14')) base = 1700000;
    if (modelUpper.includes('15')) base = 2200000;
    if (modelUpper.includes('S22')) base = 1100000;
    if (modelUpper.includes('S23')) base = 1600000;
    if (modelUpper.includes('S24')) base = 2300000;

    const storageUpper = (oldStorage || '').toUpperCase();
    if (storageUpper.includes('256GB')) base += 150000;
    if (storageUpper.includes('512GB')) base += 300000;
    if (storageUpper.includes('1TB')) base += 500000;

    let mult = 1.0;
    const bHealth = parseInt(batteryHealth);
    if (bHealth >= 90) mult = 1.05;
    if (bHealth >= 80 && bHealth <= 84) mult = 0.95;

    return Math.round(base * mult);
  };

  const estimatedAllowance = calculateLiveAllowanceEstimate();
  const estimatedUpgradeGap = selectedTargetPhoneUnit
    ? Math.max(0, selectedTargetPhoneUnit.retailPrice - estimatedAllowance)
    : 0;

  // Submit Diagnostic Evaluation
  const handleEvaluate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEvalResult(null);

    try {
      const res = await fetch('/api/upgrades/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          nidaNumber,
          oldBrandName,
          oldModelName,
          oldImei1,
          oldImei2,
          oldColor,
          oldStorage,
          batteryHealth: parseInt(batteryHealth),
          hasCrackedScreen,
          isFaceIdWorking,
          isIcloudSignedOut,
          targetPhoneUnitId: selectedTargetPhoneId || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEvalResult(json.data);
        fetchUpgradeData();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Status Change Handler for B2B Queue
  const handleUpdateStatus = async (id, status, clearedToWholesale = false, createRefurbished = false) => {
    let targetProduct = products[0]?.id;
    try {
      const res = await fetch(`/api/upgrades/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          clearedToWholesale,
          createRefurbishedStock: createRefurbished,
          productId: targetProduct,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(createRefurbished ? 'Phone re-stocked as Refurbished in Module 1 Inventory!' : 'Status updated!');
        fetchUpgradeData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Canvas Digital Signature Pad Handlers (Touch & Mouse Support)
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsSigning(true);
  };

  const draw = (e) => {
    if (!isSigning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0284c7';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsSigning(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureSaved(false);
  };

  // Selected Evaluation for Legal Contract tab
  const [selectedEvalId, setSelectedEvalId] = useState('');

  const activeContractEval = evalResult || evaluations.find(e => e.id === selectedEvalId) || evaluations[0] || null;

  const saveSignature = async () => {
    const targetEval = activeContractEval;
    if (!targetEval) {
      alert('Tafadhali fanya kagua au chagua mteja kwenye orodha ya tathmini kuunda mkataba!');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();

    try {
      const res = await fetch('/api/upgrades/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetEval.id, signatureUrl: dataUrl }),
      });
      const json = await res.json();
      if (json.success) {
        setSignatureSaved(true);
        alert('🎉 Saini ya Kidijitali (Digital Signature) imehifadhiwa kwenye Mkataba wa NIDA!');
      }
    } catch (e) {
      console.error(e);
    }
  };


  // Filter B2B Queue Table
  const filteredEvaluations = evaluations.filter(ev => {
    const matchesSearch =
      ev.customerName?.toLowerCase().includes(queueSearch.toLowerCase()) ||
      ev.nidaNumber?.toLowerCase().includes(queueSearch.toLowerCase()) ||
      ev.oldImei1?.toLowerCase().includes(queueSearch.toLowerCase()) ||
      ev.oldModelName?.toLowerCase().includes(queueSearch.toLowerCase()) ||
      ev.voucherCode?.toLowerCase().includes(queueSearch.toLowerCase());

    if (queueFilter === 'ALL') return matchesSearch;
    return matchesSearch && ev.status === queueFilter;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-full overflow-hidden">
      {/* Top Banner - Responsive Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#80ddff]/30 text-sky-950 border border-sky-300 text-xs font-extrabold">
            <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
            Kubadilishana
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
            Kubadilisha simu
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            100% Sealed Floor
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
            <Award className="w-4 h-4 text-sky-600" />
            NIDA Verified
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher (Touch Responsive Scrollable Bar) */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-sky-200 space-x-1.5 shadow-sm overflow-x-auto min-w-full">
        <button
          onClick={() => setActiveSubTab('wizard')}
          className={`shrink-0 min-w-[150px] sm:min-w-[180px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'wizard'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50 hover:text-slate-950'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Diagnostic Inspector</span>
        </button>

        <button
          onClick={() => setActiveSubTab('contract')}
          className={`shrink-0 min-w-[150px] sm:min-w-[180px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'contract'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50 hover:text-slate-950'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Legal Transfer Agreement</span>
        </button>

        <button
          onClick={() => setActiveSubTab('b2b-queue')}
          className={`shrink-0 min-w-[170px] sm:min-w-[200px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'b2b-queue'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50 hover:text-slate-950'
          }`}
        >
          <PackageCheck className="w-4 h-4 shrink-0" />
          <span>B2B Queue ({evaluations.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`shrink-0 min-w-[140px] sm:min-w-[160px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'analytics'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50 hover:text-slate-950'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Upgrade Analytics</span>
        </button>
      </div>

      {/* SUB-TAB 1: DIAGNOSTIC INSPECTOR & UPGRADE CALCULATOR */}
      {activeSubTab === 'wizard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Form Wizard (7 Cols) */}
          <form onSubmit={handleEvaluate} className="lg:col-span-7 bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4.5 h-4.5 text-[#0284c7] shrink-0" />
                Step 1: Diagnostic Checklist & Mandatory NIDA Audit
              </h3>
              <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                Instant Valuation
              </span>
            </div>

            {/* Section A: Customer Details & NIDA Verification */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">Customer Information & NIDA Verification:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-slate-600 font-bold mb-1">Mandatory NIDA ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="19940812-10291-..."
                    value={nidaNumber}
                    onChange={(e) => setNidaNumber(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Traded Phone Specifications */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">Traded Device Hardware Details:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Brand</label>
                  <select
                    value={oldBrandName}
                    onChange={(e) => setOldBrandName(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-sky-500"
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Google Pixel">Google Pixel</option>
                    <option value="Tecno">Tecno</option>
                    <option value="Xiaomi">Xiaomi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    value={oldModelName}
                    onChange={(e) => setOldModelName(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Storage Capacity</label>
                  <select
                    value={oldStorage}
                    onChange={(e) => setOldStorage(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-sky-500"
                  >
                    <option value="64GB">64GB</option>
                    <option value="128GB">128GB</option>
                    <option value="256GB">256GB (+150k)</option>
                    <option value="512GB">512GB (+300k)</option>
                    <option value="1TB">1TB (+500k)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Battery Health %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batteryHealth}
                    onChange={(e) => setBatteryHealth(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Primary IMEI 1 Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="359102910291029"
                    value={oldImei1}
                    onChange={(e) => setOldImei1(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Device Color & Condition</label>
                  <input
                    type="text"
                    value={oldColor}
                    onChange={(e) => setOldColor(e.target.value)}
                    className="w-full bg-sky-50/70 border border-sky-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Target Brand New Phone Selection (Module 1 Integration) */}
            <div className="p-3.5 bg-sky-50/80 rounded-xl border border-sky-200 space-y-2">
              <label className="text-xs font-extrabold text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>🎯 Select Target Brand New Sealed Phone to Upgrade To:</span>
                <span className="text-[10px] text-sky-700 font-bold">Module 1 Stock Bridge</span>
              </label>
              <select
                value={selectedTargetPhoneId}
                onChange={(e) => setSelectedTargetPhoneId(e.target.value)}
                className="w-full bg-white border border-sky-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-sky-500 shadow-sm"
              >
                <option value="">-- Optional: Select Target New Phone for Upgrade Gap Calculation --</option>
                {targetPhoneOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.product?.name} ({unit.color}, {unit.storage}) - Price: TSH {unit.retailPrice?.toLocaleString()} (IMEI: {unit.imei1})
                  </option>
                ))}
              </select>
            </div>

            {/* Section D: Strict Diagnostic Gatekeeper Toggles */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Diagnostic Eligibility Toggles:
                </span>
                <span className="text-[10px] font-bold text-slate-400">Strict Quality Floor</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Cracked Screen Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800 p-2.5 rounded-lg border border-slate-700 gap-2">
                  <span className="font-bold text-slate-200">Is Screen Clean & Uncracked?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHasCrackedScreen(false)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${
                        !hasCrackedScreen ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Clean Screen
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasCrackedScreen(true)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${
                        hasCrackedScreen ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Cracked (Reject)
                    </button>
                  </div>
                </div>

                {/* FaceID Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800 p-2.5 rounded-lg border border-slate-700 gap-2">
                  <span className="font-bold text-slate-200">Is FaceID / TouchID Operational?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFaceIdWorking(true)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${
                        isFaceIdWorking ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Working
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFaceIdWorking(false)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${
                        !isFaceIdWorking ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Defective (Reject)
                    </button>
                  </div>
                </div>

                {/* iCloud / Google Lock Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800 p-2.5 rounded-lg border border-slate-700 gap-2">
                  <span className="font-bold text-slate-200">Is Account Signed Out?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsIcloudSignedOut(true)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${
                        isIcloudSignedOut ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Signed Out
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsIcloudSignedOut(false)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${
                        !isIcloudSignedOut ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      Locked (Reject)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="sky-btn-main w-full py-3.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? 'Evaluating Eligibility...' : 'Run Trade-Up Allowance & Voucher Calculation'}</span>
            </button>
          </form>

          {/* Right Results & Live Preview Box (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            {/* Real-time Diagnostic Preview Box */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Estimated Valuation Gauge:</span>
                <span className="text-xs font-extrabold text-[#0284c7]">Live Preview</span>
              </div>

              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold">Estimated Allowance:</span>
                  <span className="text-lg font-black text-emerald-700">TSH {estimatedAllowance.toLocaleString()}</span>
                </div>

                {selectedTargetPhoneUnit && (
                  <div className="space-y-1.5 pt-2 border-t border-sky-200/80 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Target Phone Price:</span>
                      <span className="font-extrabold text-slate-900">TSH {selectedTargetPhoneUnit.retailPrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-sky-200">
                      <span>Net Cash Balance to Pay:</span>
                      <span className="text-[#0284c7]">TSH {estimatedUpgradeGap.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Official Evaluation Outcome Card */}
            {evalResult ? (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-sky-400 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Evaluation Result:</span>
                  <span className="text-xs font-mono font-bold text-sky-800">{evalResult.upgradeNumber}</span>
                </div>

                {evalResult.status === 'APPROVED_ELIGIBLE' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1">
                      <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-600 mx-auto" />
                      <h4 className="text-sm sm:text-base font-extrabold text-emerald-900">Trade-Up Allowance Approved!</h4>
                      <p className="text-xs text-emerald-700">Certified eligible for discount towards a Brand New Sealed Phone.</p>
                    </div>

                    <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 text-center space-y-1">
                      <div className="text-xs text-slate-600 font-bold">Trade-Up Voucher Code:</div>
                      <div className="text-xl sm:text-2xl font-black text-[#0284c7] font-mono tracking-wider">{evalResult.voucherCode}</div>
                      <div className="text-lg sm:text-xl font-black text-slate-900 pt-1">
                        TSH {evalResult.tradeUpAllowance?.toLocaleString()}
                      </div>
                    </div>

                    {evalResult.targetPhone && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                        <div className="font-extrabold text-emerald-900">Target Phone: {evalResult.targetPhone.product?.name}</div>
                        <div className="flex justify-between font-extrabold text-slate-900 pt-1 border-t border-emerald-200">
                          <span>Net Payable Balance:</span>
                          <span className="text-[#0284c7]">TSH {evalResult.upgradeGap?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Integrated Action Buttons */}
                    <div className="space-y-2 pt-2">
                      {onTransferToPos && (
                        <button
                          type="button"
                          onClick={() =>
                            onTransferToPos({
                              voucherCode: evalResult.voucherCode,
                              voucherValue: evalResult.tradeUpAllowance,
                              customer: {
                                customerName,
                                customerPhone,
                                nidaNumber,
                              },
                              targetPhoneUnit: evalResult.targetPhone || selectedTargetPhoneUnit,
                            })
                          }
                          className="sky-btn-main w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Apply & Transfer to Module 2 POS Desk</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveSubTab('contract')}
                        className="sky-btn-accent w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Proceed to Legal Transfer Contract</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-center space-y-2">
                    <XCircle className="w-8 h-8 text-rose-600 mx-auto" />
                    <h4 className="text-sm sm:text-base font-extrabold text-rose-900">Device Ineligible for Upgrade</h4>
                    <p className="text-xs text-rose-700 font-semibold">{evalResult.rejectionReason}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-sky-200 text-center text-slate-500 text-xs space-y-2">
                <Sparkles className="w-7 h-7 text-sky-400 mx-auto animate-bounce" />
                <p className="font-bold text-slate-800">Diagnostic Calculator Ready</p>
                <p>Fill out customer device form on the left to calculate trade allowance.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: LEGAL TRANSFER CONTRACT & DIGITAL SIGNATURE */}
      {activeSubTab === 'contract' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-sky-100 pb-4 gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Legal Ownership Transfer Certificate & HTML5 Signature Pad</h3>
              <p className="text-xs text-slate-500">Customer ID verification & legal property ownership release contract.</p>
            </div>
            {signatureSaved && (
              <span className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full border border-emerald-300 flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Signature Verified & Saved
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Box: Responsive HTML5 Canvas Signature Pad */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-900 flex items-center justify-between">
                <span>Customer Signature Pad (Touch or Mouse):</span>
                <span className="text-[10px] text-sky-700 font-bold">Touch Enabled</span>
              </label>

              <div className="border-2 border-sky-300 rounded-2xl bg-sky-50 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={220}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 sm:h-52 cursor-crosshair touch-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300"
                >
                  Clear Pad
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  className="sky-btn-main px-5 py-2.5 rounded-xl text-xs font-extrabold flex-1 shadow-md"
                >
                  Save & Attach Signature to Contract
                </button>
              </div>
            </div>

            {/* Right Box: Printable Contract Preview */}
            <div id="legal-contract-document" className="p-4 sm:p-6 bg-sky-50/80 rounded-2xl border border-sky-200 font-sans text-xs text-slate-900 space-y-4 shadow-sm">
              
              {/* Select Evaluation Record Dropdown */}
              {evaluations.length > 0 && (
                <div className="bg-white p-2.5 rounded-xl border border-sky-300">
                  <label className="text-[10px] font-extrabold text-sky-800 uppercase tracking-wider block mb-1">
                    Chagua Mteja / Evaluation (Select Customer Evaluation):
                  </label>
                  <select
                    value={selectedEvalId || activeContractEval?.id || ''}
                    onChange={(e) => setSelectedEvalId(e.target.value)}
                    className="w-full bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {evaluations.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.customerName} ({ev.oldBrandName} {ev.oldModelName} - IMEI: {ev.oldImei1}) - TSH {ev.tradeUpAllowance?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-center border-b border-slate-300 pb-3 space-y-1">
                <div className="text-sm font-black uppercase tracking-wide">LEGAL OWNERSHIP TRANSFER AGREEMENT</div>
                <div className="text-[11px] font-bold text-sky-800">PhoneVault Pro Enterprise • Security Audit</div>
                <div className="text-[10px] text-slate-500">Document ID: {activeContractEval?.upgradeNumber || 'UPGRADE-2026-REF'}</div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="font-bold text-slate-600">Customer Name:</span> <span className="font-extrabold text-slate-900">{activeContractEval?.customerName || customerName}</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">NIDA Number:</span> <span className="font-mono font-bold text-slate-900">{activeContractEval?.nidaNumber || nidaNumber}</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">Phone Number:</span> <span className="font-semibold text-slate-900">{activeContractEval?.customerPhone || customerPhone}</span></div>
                <div className="flex justify-between border-t border-sky-200 pt-2"><span className="font-bold text-slate-600">Traded Phone:</span> <span className="font-extrabold text-slate-900">{activeContractEval?.oldBrandName || oldBrandName} {activeContractEval?.oldModelName || oldModelName} ({activeContractEval?.oldStorage || oldStorage})</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">IMEI 1 Code:</span> <span className="font-mono text-sky-800 font-bold">{activeContractEval?.oldImei1 || oldImei1}</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">Allowance Value:</span> <span className="font-black text-emerald-700">TSH {(activeContractEval?.tradeUpAllowance || estimatedAllowance || 900000).toLocaleString()}</span></div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-sky-200 text-[10px] text-slate-600 leading-relaxed">
                I hereby declare that the smartphone listed above is my sole legal personal property, free of encumbrances or stolen claims. I transfer full ownership to PhoneVault Pro in exchange for Trade-Up Allowance towards a Brand New Sealed device.
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-slate-300">
                <span className="text-[10px] text-slate-500 font-bold">Official Store Verification Stamp</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="sky-btn-accent w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print Signed Contract PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 3: B2B WHOLESALE & REFURBISHED STOCK QUEUE */}
      {activeSubTab === 'b2b-queue' && (
        <div className="bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-sm space-y-4 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">B2B Wholesale Clearance & Refurbished Stock Queue</h3>
              <p className="text-xs text-slate-500">Traded devices logged for B2B export or restocked as Refurbished (Keeping floor 100% Brand New Sealed).</p>
            </div>

            {/* Queue Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer, NIDA, IMEI..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="w-full sm:w-auto bg-sky-50 border border-sky-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value)}
                className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
              >
                <option value="ALL">All Statuses ({evaluations.length})</option>
                <option value="APPROVED_ELIGIBLE">Approved Eligible</option>
                <option value="REJECTED_CONDITION">Rejected</option>
                <option value="DISPATCHED_B2B">Dispatched B2B</option>
              </select>
            </div>
          </div>

          {/* Mobile Card Grid (Visible on Mobile Screens) */}
          <div className="block md:hidden space-y-3">
            {filteredEvaluations.map((ev) => (
              <div key={ev.id} className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-extrabold text-sky-800">{ev.upgradeNumber}</span>
                    <h4 className="font-extrabold text-slate-900 text-xs">{ev.customerName}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">NIDA: {ev.nidaNumber}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                    ev.status === 'APPROVED_ELIGIBLE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : ev.status === 'DISPATCHED_B2B'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {ev.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-sky-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-900">{ev.oldBrandName} {ev.oldModelName} ({ev.oldStorage})</div>
                  <div className="font-mono text-[10px] text-slate-600">IMEI: {ev.oldImei1}</div>
                  <div className="flex justify-between font-black text-slate-900 pt-1">
                    <span>Allowance:</span>
                    <span className="text-emerald-700">TSH {ev.tradeUpAllowance?.toLocaleString()}</span>
                  </div>
                </div>

                {ev.status === 'APPROVED_ELIGIBLE' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-200">
                    <button
                      onClick={() => handleUpdateStatus(ev.id, 'DISPATCHED_B2B', true, false)}
                      className="w-full py-2 bg-sky-100 hover:bg-sky-200 text-sky-900 font-extrabold rounded-lg text-[10px] border border-sky-300"
                    >
                      Export B2B
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(ev.id, 'APPROVED_ELIGIBLE', false, true)}
                      className="w-full py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold rounded-lg text-[10px] border border-emerald-300"
                    >
                      Restock Refurbished
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View (Visible on Medium+ Screens) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50 text-slate-700 font-extrabold border-b border-sky-200">
                <tr>
                  <th className="p-3.5">Upgrade #</th>
                  <th className="p-3.5">Customer & NIDA ID</th>
                  <th className="p-3.5">Traded Device & IMEI</th>
                  <th className="p-3.5">Allowance Value</th>
                  <th className="p-3.5">Voucher Code</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Wholesale / Restock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {filteredEvaluations.map((ev) => (
                  <tr key={ev.id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-sky-800">{ev.upgradeNumber}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{ev.customerName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">NIDA: {ev.nidaNumber}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{ev.oldBrandName} {ev.oldModelName} ({ev.oldStorage})</div>
                      <div className="text-[10px] font-mono text-slate-500">IMEI: {ev.oldImei1}</div>
                    </td>
                    <td className="p-3.5 font-black text-slate-900">TSH {ev.tradeUpAllowance?.toLocaleString()}</td>
                    <td className="p-3.5 font-mono font-bold text-sky-700">{ev.voucherCode}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        ev.status === 'APPROVED_ELIGIBLE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : ev.status === 'DISPATCHED_B2B'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      {ev.status === 'APPROVED_ELIGIBLE' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(ev.id, 'DISPATCHED_B2B', true, false)}
                            className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 font-extrabold rounded-lg text-[10px] border border-sky-300"
                          >
                            Export to B2B Partner
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(ev.id, 'APPROVED_ELIGIBLE', false, true)}
                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold rounded-lg text-[10px] border border-emerald-300"
                          >
                            Re-stock as Refurbished
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: EXECUTIVE UPGRADE ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnostic Runs</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.totalEvaluations || 0}</div>
              <div className="text-[10px] text-sky-700 font-semibold">Customer Trade Inspections</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Allowances Issued</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700">TSH {(analytics?.totalAllowanceGranted || 0).toLocaleString()}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">Trade-Up Voucher Capital</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approval Conversion</div>
              <div className="text-2xl sm:text-3xl font-black text-[#0284c7]">{analytics?.conversionRate || 0}%</div>
              <div className="text-[10px] text-sky-700 font-semibold">{analytics?.approvedCount || 0} Approved</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Allowance</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">TSH {(analytics?.avgAllowance || 0).toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 font-semibold">Per Approved Device</div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-600 shrink-0" />
              Bidhaa zilizobadilishwa
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-slate-700 block">Top Traded Brands:</span>
                {analytics?.brandCounts && Object.keys(analytics.brandCounts).length > 0 ? (
                  Object.entries(analytics.brandCounts).map(([brand, count]) => (
                    <div key={brand} className="flex items-center justify-between p-3 bg-sky-50/80 rounded-xl border border-sky-200 text-xs">
                      <span className="font-bold text-slate-900">{brand}</span>
                      <span className="px-3 py-1 bg-white text-sky-900 font-black rounded-lg border border-sky-200">{count} Devices</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400">No brand data available yet.</div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
