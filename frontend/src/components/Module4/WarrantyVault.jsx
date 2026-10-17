import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Award, AlertCircle, CheckCircle2, Clock, Search, RefreshCw,
  FileText, Smartphone, Truck, PackageCheck, Printer, ArrowRight, X, TrendingUp, Filter
} from 'lucide-react';

export default function WarrantyVault() {
  const [activeSubTab, setActiveSubTab] = useState('vault'); // 'vault' | 'rma' | 'analytics'

  // Data States
  const [certificates, setCertificates] = useState([]);
  const [rmaClaims, setRmaClaims] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Verify Single IMEI Modal / Result
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  // Issue New Certificate Form Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [imei, setImei] = useState('');
  const [model, setModel] = useState('');
  const [months, setMonths] = useState(12);

  // Print Preview Certificate Modal
  const [printCert, setPrintCert] = useState(null);

  // Log New Supplier RMA Claim Modal State
  const [showRmaModal, setShowRmaModal] = useState(false);
  const [rmaWarrantyCode, setRmaWarrantyCode] = useState('');
  const [rmaCustName, setRmaCustName] = useState('');
  const [rmaCustPhone, setRmaCustPhone] = useState('');
  const [rmaDefectiveImei, setRmaDefectiveImei] = useState('');
  const [rmaSupplierName, setRmaSupplierName] = useState('Apple Authorized Distributor');
  const [rmaFault, setRmaFault] = useState('');

  // Resolve RMA Swap Modal State
  const [resolveRmaItem, setResolveRmaItem] = useState(null);
  const [replacementImeiInput, setReplacementImeiInput] = useState('');

  // Fetch All Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCert, resRma, resAnal] = await Promise.all([
        fetch('/api/warranties').then(r => r.json()),
        fetch('/api/warranties/rma').then(r => r.json()),
        fetch('/api/warranties/analytics').then(r => r.json()),
      ]);

      if (resCert.success) setCertificates(resCert.data);
      if (resRma.success) setRmaClaims(resRma.data);
      if (resAnal.success) setAnalytics(resAnal.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Instant Verification Lookup
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/warranties/verify/${encodeURIComponent(verifyInput.trim())}`);
      const json = await res.json();
      if (json.success) {
        setVerifyResult(json.data);
      } else {
        alert(json.message);
        setVerifyResult(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Issue Certificate
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/warranties/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: custName,
          customerPhone: custPhone,
          imei1: imei,
          modelName: model,
          warrantyMonths: months,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Digital Warranty Certificate issued!');
        setShowIssueModal(false);
        setCustName('');
        setCustPhone('');
        setImei('');
        setModel('');
        fetchData();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Supplier RMA Claim
  const handleRmaSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/warranties/rma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warrantyCode: rmaWarrantyCode,
          customerName: rmaCustName,
          customerPhone: rmaCustPhone,
          defectiveImei: rmaDefectiveImei,
          supplierName: rmaSupplierName,
          faultDescription: rmaFault,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Supplier RMA Claim logged! Unit ready for supplier dispatch.');
        setShowRmaModal(false);
        setRmaDefectiveImei('');
        setRmaFault('');
        fetchData();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve Supplier RMA with Brand New Sealed Swap
  const handleResolveSwapSubmit = async (e) => {
    e.preventDefault();
    if (!resolveRmaItem) return;
    try {
      const res = await fetch(`/api/warranties/rma/${resolveRmaItem.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replacementImei: replacementImeiInput,
          replacementModel: resolveRmaItem.defectiveModel || 'Brand New Replacement Unit',
          status: 'NEW_UNIT_DELIVERED',
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Supplier RMA Resolved! Brand New Sealed replacement unit recorded.');
        setResolveRmaItem(null);
        setReplacementImeiInput('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Certificates
  const filteredCerts = certificates.filter(c => {
    const matchesSearch =
      c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.imei1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.certificateCode?.toLowerCase().includes(searchTerm.toLowerCase());

    const isExp = new Date(c.endDate) <= new Date();
    if (statusFilter === 'ACTIVE') return matchesSearch && !isExp;
    if (statusFilter === 'EXPIRED') return matchesSearch && isExp;
    return matchesSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-full overflow-hidden">
      {/* Top Banner - Responsive Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#80ddff]/30 text-sky-950 border border-sky-300 text-xs font-extrabold">
            <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
            Dhamana
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
            Dhamana na mabadiliko ya kiwanda
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowIssueModal(true)}
            className="sky-btn-main w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md"
          >
            <ShieldCheck className="w-4 h-4" /> Issue Warranty Certificate
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar (Touch Scrollable on Small Screens) */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-sky-200 space-x-1.5 shadow-sm overflow-x-auto min-w-full">
        <button
          onClick={() => setActiveSubTab('vault')}
          className={`shrink-0 min-w-[170px] sm:min-w-[200px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'vault'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span>Warranty Vault ({certificates.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rma')}
          className={`shrink-0 min-w-[180px] sm:min-w-[220px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'rma'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span>Supplier RMA Swaps ({rmaClaims.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`shrink-0 min-w-[150px] sm:min-w-[180px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'analytics'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Warranty Risk Analytics</span>
        </button>
      </div>

      {/* SUB-TAB 1: DIGITAL WARRANTY VAULT */}
      {activeSubTab === 'vault' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Instant IMEI Warranty Verification Input Box */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-sky-300 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#0284c7] shrink-0" /> Live Warranty Authenticity Checker:
              </span>
              <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                Instant Lookup
              </span>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="Enter 15-digit Phone IMEI number or Warranty Code (WARR-...)"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                className="w-full bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-500"
              />
              <button type="submit" disabled={loading} className="w-full sm:w-auto sky-btn-main px-5 py-2.5 rounded-xl text-xs font-extrabold shrink-0">
                {loading ? 'Verifying...' : 'Verify Coverage'}
              </button>
            </form>

            {/* Verification Result Drawer */}
            {verifyResult && (
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{verifyResult.modelName}</span>
                    <span className="font-mono text-xs text-sky-800 font-bold">({verifyResult.certificateCode})</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Customer: <span className="font-bold text-slate-900">{verifyResult.customerName}</span> ({verifyResult.customerPhone}) • IMEI: <span className="font-mono font-bold text-slate-900">{verifyResult.imei1}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-slate-900">
                      {verifyResult.remainingDays} Days Remaining
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Valid through: {new Date(verifyResult.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
                    !verifyResult.isExpired ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {!verifyResult.isExpired ? 'VALID ACTIVE' : 'EXPIRED'}
                  </span>

                  <button
                    onClick={() => setPrintCert(verifyResult)}
                    className="sky-btn-accent px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" /> Certificate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Master Warranty Certificates Table / Mobile Card Grid */}
          <div className="bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-sm space-y-4 p-4 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Active Field Warranty Certificates</h3>
                <p className="text-xs text-slate-500">Dhamana zilizotoka kwenye mauzo.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, phone, IMEI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto bg-sky-50 border border-sky-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
                >
                  <option value="ALL">All Statuses ({certificates.length})</option>
                  <option value="ACTIVE">Active Coverage</option>
                  <option value="EXPIRED">Expired Coverage</option>
                </select>
              </div>
            </div>

            {/* Mobile Card Grid (Visible on Small Mobile Screens) */}
            <div className="block md:hidden space-y-3">
              {filteredCerts.map((cert) => {
                const isExp = new Date(cert.endDate) <= new Date();
                return (
                  <div key={cert.id} className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs font-extrabold text-sky-800">{cert.certificateCode}</span>
                        <h4 className="font-extrabold text-slate-900 text-xs">{cert.customerName}</h4>
                        <p className="text-[10px] text-slate-500">{cert.customerPhone}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[9px] font-extrabold rounded-full ${
                        !isExp ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {!isExp ? 'ACTIVE' : 'EXPIRED'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-sky-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-900">{cert.modelName}</div>
                      <div className="font-mono text-[10px] text-slate-600">IMEI: {cert.imei1}</div>
                      <div className="text-[10px] text-slate-500">
                        {cert.warrantyMonths}m Coverage • Ends {new Date(cert.endDate).toLocaleDateString()}
                      </div>
                    </div>

                    <button
                      onClick={() => setPrintCert(cert)}
                      className="w-full py-2 bg-sky-100 hover:bg-sky-200 text-sky-900 font-extrabold rounded-lg text-[11px] border border-sky-300 flex items-center justify-center gap-1 mt-2"
                    >
                      <Printer className="w-3.5 h-3.5" /> Certificate PDF
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Visible on Medium+ Screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sky-50 text-slate-700 font-extrabold border-b border-sky-200">
                  <tr>
                    <th className="p-3.5">Cert Code</th>
                    <th className="p-3.5">Customer Details</th>
                    <th className="p-3.5">Model & IMEI</th>
                    <th className="p-3.5">Coverage Period</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Certificate PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100">
                  {filteredCerts.map((cert) => {
                    const isExp = new Date(cert.endDate) <= new Date();
                    return (
                      <tr key={cert.id} className="hover:bg-sky-50/50 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-sky-800">{cert.certificateCode}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{cert.customerName}</div>
                          <div className="text-[10px] text-slate-500">{cert.customerPhone}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{cert.modelName}</div>
                          <div className="text-[10px] font-mono text-slate-500">IMEI: {cert.imei1}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{cert.warrantyMonths} Months</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(cert.startDate).toLocaleDateString()} ➔ {new Date(cert.endDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                            !isExp ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {!isExp ? 'ACTIVE' : 'EXPIRED'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setPrintCert(cert)}
                            className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 font-extrabold rounded-lg text-[11px] border border-sky-300 inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> Certificate PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SUPPLIER RMA BRAND NEW UNIT REPLACEMENT ENGINE */}
      {activeSubTab === 'rma' && (
        <div className="bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-sm space-y-4 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Mabadiliko ya kiwanda</h3>
              <p className="text-xs text-slate-500">Rekodi iliyorudi kiwandani na kifaa kipya kilichoingia.</p>
            </div>

            <button
              onClick={() => setShowRmaModal(true)}
              className="sky-btn-main w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shrink-0"
            >
              <Truck className="w-4 h-4" /> Log Supplier RMA Claim
            </button>
          </div>

          {/* Mobile Card Grid (Visible on Mobile Devices) */}
          <div className="block md:hidden space-y-3">
            {rmaClaims.map((rma) => (
              <div key={rma.id} className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-extrabold text-sky-800">{rma.rmaNumber}</span>
                    <h4 className="font-extrabold text-slate-900 text-xs">{rma.customerName}</h4>
                    <p className="text-[10px] font-mono text-slate-500">Cert: {rma.warrantyCode}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                    rma.status === 'NEW_UNIT_DELIVERED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {rma.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-sky-200 text-xs space-y-1">
                  <div className="font-mono font-bold text-rose-700">Defective IMEI: {rma.defectiveImei}</div>
                  <div className="text-[11px] font-semibold text-slate-800">Supplier: {rma.supplierName}</div>
                  <div className="text-[10px] text-slate-600">{rma.faultDescription}</div>
                </div>

                {rma.replacementImei ? (
                  <div className="pt-2 border-t border-sky-200 font-mono text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5 shrink-0" /> Replacement: {rma.replacementImei}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-sky-200">
                    <button
                      onClick={() => {
                        setResolveRmaItem(rma);
                        setReplacementImeiInput('');
                      }}
                      className="w-full py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold rounded-lg text-[10px] border border-emerald-300"
                    >
                      Record Replacement Sealed Swap
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
                  <th className="p-3.5">RMA Ticket #</th>
                  <th className="p-3.5">Customer & Warranty</th>
                  <th className="p-3.5">Defective IMEI & Fault</th>
                  <th className="p-3.5">Brand Supplier</th>
                  <th className="p-3.5">RMA Status</th>
                  <th className="p-3.5">Replacement Sealed IMEI</th>
                  <th className="p-3.5 text-right">Supplier Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {rmaClaims.map((rma) => (
                  <tr key={rma.id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-sky-800">{rma.rmaNumber}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{rma.customerName}</div>
                      <div className="text-[10px] font-mono text-slate-500">Cert: {rma.warrantyCode}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-rose-700">IMEI: {rma.defectiveImei}</div>
                      <div className="text-[10px] text-slate-600">{rma.faultDescription}</div>
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-800">{rma.supplierName}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        rma.status === 'NEW_UNIT_DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {rma.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {rma.replacementImei ? (
                        <div className="font-mono font-extrabold text-emerald-700 flex items-center gap-1">
                          <PackageCheck className="w-3.5 h-3.5" /> {rma.replacementImei}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Awaiting Supplier Swap</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {rma.status !== 'NEW_UNIT_DELIVERED' && (
                        <button
                          onClick={() => {
                            setResolveRmaItem(rma);
                            setReplacementImeiInput('');
                          }}
                          className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold rounded-lg text-[10px] border border-emerald-300"
                        >
                          Record Replacement Swap
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: EXECUTIVE WARRANTY RISK ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Field Warranties</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.totalCertificates || 0}</div>
              <div className="text-[10px] text-sky-700 font-semibold">Issued Digital Certificates</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Field Coverage</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">{analytics?.activeWarranties || 0}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">Currently Held by Customers</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier RMA Swaps</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-700">{analytics?.totalRmaClaims || 0}</div>
              <div className="text-[10px] text-amber-800 font-semibold">Factory Defective Units Returned</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved Sealed Swaps</div>
              <div className="text-2xl sm:text-3xl font-black text-[#0284c7]">{analytics?.resolvedSwaps || 0}</div>
              <div className="text-[10px] text-sky-700 font-semibold">Brand New Replacements Delivered</div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-600 shrink-0" />
              Supplier Defect Rate & Return Analytics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-slate-700 block">RMA Claims by Brand Supplier:</span>
                {analytics?.supplierCounts && Object.keys(analytics.supplierCounts).length > 0 ? (
                  Object.entries(analytics.supplierCounts).map(([sup, count]) => (
                    <div key={sup} className="flex items-center justify-between p-3 bg-sky-50/80 rounded-xl border border-sky-200 text-xs">
                      <span className="font-bold text-slate-900">{sup}</span>
                      <span className="px-3 py-1 bg-white text-sky-900 font-black rounded-lg border border-sky-200">{count} RMA Claims</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400">No supplier claim data available yet.</div>
                )}
              </div>

              <div className="p-4 bg-sky-50/80 rounded-xl border border-sky-200 text-xs space-y-2">
                <span className="font-extrabold text-slate-900 block">Strict Store Quality Policy:</span>
                <p className="text-slate-600 leading-relaxed">
                  Store policy dictates 100% Brand New Sealed inventory sales. In case of factory defects within warranty, devices are returned to authorized suppliers for brand-new replacement swaps with zero in-store repair tampering.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ISSUE DIGITAL WARRANTY CERTIFICATE */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleIssueSubmit} className="bg-white border border-sky-200 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" /> Issue Digital Warranty Certificate
              </h3>
              <button type="button" onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Customer Phone Number *</label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Phone Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 15 Pro Max 256GB"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Warranty Period (Months)</label>
                <select
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                >
                  <option value={6}>6 Months Guarantee</option>
                  <option value={12}>12 Months Official Warranty</option>
                  <option value={24}>24 Months Extended Warranty</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-600 font-bold mb-1">Primary 15-digit Phone IMEI Code *</label>
              <input
                type="text"
                required
                placeholder="359102910291029"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="sky-btn-main px-5 py-2 rounded-xl text-xs font-extrabold">
                Generate & Issue Certificate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: LOG SUPPLIER RMA CLAIM */}
      {showRmaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleRmaSubmit} className="bg-white border border-sky-200 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600 shrink-0" /> Log Supplier RMA Replacement Claim
              </h3>
              <button type="button" onClick={() => setShowRmaModal(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Defective Device IMEI *</label>
                <input
                  type="text"
                  required
                  placeholder="359102910291029"
                  value={rmaDefectiveImei}
                  onChange={(e) => setRmaDefectiveImei(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Official Brand Supplier *</label>
                <select
                  value={rmaSupplierName}
                  onChange={(e) => setRmaSupplierName(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                >
                  <option value="Apple Authorized Distributor">Apple Authorized Distributor</option>
                  <option value="Samsung Tanzania Official">Samsung Tanzania Official</option>
                  <option value="Google Pixel Importer">Google Pixel Importer</option>
                  <option value="Tecno Authorized Agent">Tecno Authorized Agent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Warranty Cert Code (Optional)</label>
                <input
                  type="text"
                  placeholder="WARR-2026-..."
                  value={rmaWarrantyCode}
                  onChange={(e) => setRmaWarrantyCode(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Customer Name</label>
                <input
                  type="text"
                  value={rmaCustName}
                  onChange={(e) => setRmaCustName(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-600 font-bold mb-1">Factory Fault / Defect Description *</label>
              <textarea
                required
                rows={2}
                placeholder="Describe factory defect (e.g. Display backlight failure, microphone non-responsive)..."
                value={rmaFault}
                onChange={(e) => setRmaFault(e.target.value)}
                className="w-full bg-sky-50 border border-sky-200 rounded-xl p-3 text-slate-900 font-semibold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowRmaModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="sky-btn-main px-5 py-2 rounded-xl text-xs font-extrabold">
                Log RMA & Dispatch to Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: RESOLVE RMA WITH BRAND NEW SEALED REPLACEMENT UNIT */}
      {resolveRmaItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleResolveSwapSubmit} className="bg-white border-2 border-emerald-400 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600 shrink-0" /> Record Brand New Sealed Unit
              </h3>
              <button type="button" onClick={() => setResolveRmaItem(null)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Supplier <span className="font-extrabold text-slate-900">{resolveRmaItem.supplierName}</span> approved factory swap for defective IMEI <span className="font-mono font-bold text-rose-700">{resolveRmaItem.defectiveImei}</span>. Enter incoming brand-new sealed unit IMEI:
            </p>

            <div className="text-xs space-y-1">
              <label className="block text-slate-700 font-extrabold">New Replacement Unit IMEI Number *</label>
              <input
                type="text"
                required
                placeholder="359109988221029"
                value={replacementImeiInput}
                onChange={(e) => setReplacementImeiInput(e.target.value)}
                className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-black focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolveRmaItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="sky-btn-main px-5 py-2 rounded-xl text-xs font-extrabold">
                Complete Replacement Swap
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: PRINTABLE DIGITAL WARRANTY CERTIFICATE */}
      {printCert && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Digital Warranty Certificate Print Preview</h3>
              <button onClick={() => setPrintCert(null)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Print Box */}
            <div id="warranty-certificate-document" className="bg-white p-4 sm:p-6 rounded-xl border-2 border-slate-300 font-sans text-xs text-slate-900 space-y-4">
              <div className="text-center border-b border-slate-300 pb-3 space-y-1">
                <div className="text-base font-black uppercase tracking-wider text-sky-900">PHONEVAULT PRO ENTERPRISE</div>
                <div className="text-[10px] text-slate-600">Dar es Salaam, Tanzania • Official Brand Store Guarantee</div>
                <div className="text-[12px] font-mono font-bold text-sky-800 mt-1">CERTIFICATE #: {printCert.certificateCode}</div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="font-bold text-slate-600">Customer Name:</span> <span className="font-extrabold text-slate-900">{printCert.customerName}</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">Phone Number:</span> <span className="font-semibold text-slate-900">{printCert.customerPhone}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-slate-600">Phone Model:</span> <span className="font-extrabold text-slate-900">{printCert.modelName}</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">IMEI 1 Code:</span> <span className="font-mono text-sky-800 font-bold">{printCert.imei1}</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">Warranty Coverage:</span> <span className="font-bold text-emerald-700">{printCert.warrantyMonths} Months Store Guarantee</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">Coverage Expiry:</span> <span className="font-bold text-slate-900">{new Date(printCert.endDate).toLocaleDateString()}</span></div>
              </div>

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-[9px] text-slate-600 leading-relaxed">
                This official certificate guarantees factory defect replacement support for the registered IMEI phone unit. Store strictly provides 100% Brand New Sealed supplier replacement swaps for factory defects within valid coverage. Physical or liquid damage voids coverage.
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-slate-300">
                <span className="text-[10px] font-bold text-slate-500">Official Store Verification Stamp</span>
                <button onClick={() => window.print()} className="w-full sm:w-auto sky-btn-main px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5">
                  <Printer className="w-4 h-4" /> Print Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
