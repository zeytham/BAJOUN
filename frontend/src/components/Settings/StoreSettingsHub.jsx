import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Lock,
  DollarSign,
  Database,
  Save,
  ShieldCheck,
  Download,
  Users,
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  Printer,
  Calculator,
} from 'lucide-react';

export default function StoreSettingsHub({ settings, onRefreshSettings }) {
  const [activeTab, setActiveTab] = useState('branding');

  // Form states for branding & tax
  const [shopName, setShopName] = useState(settings?.shopName || 'PhoneVault Pro Enterprise');
  const [shopPhone, setShopPhone] = useState(settings?.shopPhone || '+255 700 112 233');
  const [shopEmail, setShopEmail] = useState(settings?.shopEmail || 'info@phonevault.tz');
  const [shopAddress, setShopAddress] = useState(settings?.shopAddress || 'Kariakoo Commercial Complex, Dar es Salaam');
  const [tinNumber, setTinNumber] = useState(settings?.tinNumber || '123-456-789');
  const [vrnNumber, setVrnNumber] = useState(settings?.vrnNumber || '40-012345-X');
  const [receiptHeader, setReceiptHeader] = useState(settings?.receiptHeader || 'Karibu PhoneVault Pro - Quality Guaranteed!');
  const [receiptFooter, setReceiptFooter] = useState(settings?.receiptFooter || 'Asante kwa kununua nasi! Warranty Certificate Included.');

  const [currency, setCurrency] = useState(settings?.currency || 'TSH');
  const [exchangeRate, setExchangeRate] = useState(settings?.exchangeRate || 2650);
  const [taxRate, setTaxRate] = useState(settings?.taxRate || 18);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');

  // Interactive PIN Tester state
  const [testPinInput, setTestPinInput] = useState('');
  const [pinTestResult, setPinTestResult] = useState(null);

  // User/Staff management states
  const [staffUsers, setStaffUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('CASHIER');
  const [newUserPin, setNewUserPin] = useState('1234');

  // System Health Metrics state
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setShopName(settings.shopName || '');
      setShopPhone(settings.shopPhone || '');
      setShopEmail(settings.shopEmail || '');
      setShopAddress(settings.shopAddress || '');
      setTinNumber(settings.tinNumber || '');
      setVrnNumber(settings.vrnNumber || '');
      setReceiptHeader(settings.receiptHeader || '');
      setReceiptFooter(settings.receiptFooter || '');
      setCurrency(settings.currency || 'TSH');
      setExchangeRate(settings.exchangeRate || 2650);
      setTaxRate(settings.taxRate || 18);
    }
  }, [settings]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchStaffUsers();
    } else if (activeTab === 'backup') {
      fetchSystemMetrics();
    }
  }, [activeTab]);

  const fetchStaffUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/settings/users');
      const data = await res.json();
      if (data.success) {
        setStaffUsers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSystemMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch('/api/settings/metrics');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleSaveBrandingAndTax = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          shopPhone,
          shopEmail,
          shopAddress,
          tinNumber,
          vrnNumber,
          currency,
          exchangeRate,
          taxRate,
          receiptHeader,
          receiptFooter,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Mipangilio ya duka imehifadhiwa.');
        if (onRefreshSettings) onRefreshSettings();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newPin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Password na Manager PIN zimebadilishwa.');
        setCurrentPassword('');
        setNewPassword('');
        setNewPin('');
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/unlock-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: testPinInput.trim(),
          email: JSON.parse(localStorage.getItem('phonevault_user') || '{}').email,
          userId: JSON.parse(localStorage.getItem('phonevault_user') || '{}').id,
        }),
      });
      const data = await res.json();
      setPinTestResult(data.success
        ? { valid: true, msg: 'Manager Override PIN iko sahihi.' }
        : { valid: false, msg: 'PIN sio sahihi.' });
    } catch {
      setPinTestResult({ valid: false, msg: 'PIN haijathibitishwa.' });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          pin: newUserPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Mfanyakazi ${newUserName} amesajiliwa.`);
        setShowAddUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserPin('1234');
        fetchStaffUsers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStaffUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Futa akaunti ya ${name}?`)) return;
    try {
      const res = await fetch(`/api/settings/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Akaunti ya ${name} imefutwa.`);
        fetchStaffUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportBackup = () => {
    window.open('/api/settings/export-backup', '_blank');
  };

  // Sample tax calculation metrics for TSH 1,000,000 transaction
  const sampleAmount = 1000000;
  const computedVat = Math.round(sampleAmount * (taxRate / 100));
  const totalWithVat = sampleAmount + computedVat;
  const amountInUsd = (totalWithVat / (exchangeRate || 2650)).toFixed(2);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-full overflow-hidden font-sans">
      {/* Top Banner - Clean System Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Store Settings & Controls
          </h2>
          <div className="text-xs text-slate-500 font-medium">
            System configuration, staff management, tax & security
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 space-x-1 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'branding'
              ? 'bg-[#0284c7] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Branding & Receipts</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-[#0284c7] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Staff & Access</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-[#0284c7] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Password & PIN</span>
        </button>

        <button
          onClick={() => setActiveTab('tax')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tax'
              ? 'bg-[#0284c7] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-4 h-4 shrink-0" />
          <span>Currency & Tax</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'backup'
              ? 'bg-[#0284c7] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4 shrink-0" />
          <span>Data Backup</span>
        </button>
      </div>

      {/* Notification Alert */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-950 font-bold">
            ×
          </button>
        </div>
      )}

      {/* SUB-TAB 1: STORE BRANDING & RECEIPT PREVIEW */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form Side */}
          <form
            onSubmit={handleSaveBrandingAndTax}
            className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5 text-slate-800"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Store Profile & Receipt Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Store Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Store Phone</label>
                <input
                  type="text"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">TRA TIN Number</label>
                <input
                  type="text"
                  value={tinNumber}
                  onChange={(e) => setTinNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">TRA VRN Number</label>
                <input
                  type="text"
                  value={vrnNumber}
                  onChange={(e) => setVrnNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Receipt Customization</h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Header Announcement</label>
                <input
                  type="text"
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Footer Terms</label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0284c7] hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? 'Inahifadhi...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {/* Live Receipt Preview Side */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Printer className="w-4 h-4 text-slate-700" /> Thermal Receipt Preview
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">80mm</span>
            </div>

            {/* Thermal Receipt Clean Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm font-mono text-[11px] text-slate-900 space-y-3 leading-tight select-none">
              <div className="text-center space-y-1">
                <div className="font-bold text-xs uppercase text-slate-950">{shopName || 'PHONEVAULT PRO ENTERPRISE'}</div>
                <div className="text-[10px] text-slate-600">{shopAddress || 'Kariakoo, DSM'}</div>
                <div className="text-[10px] text-slate-600">TEL: {shopPhone || '+255 700 112 233'}</div>
                <div className="text-[10px] text-slate-600">TIN: {tinNumber} | VRN: {vrnNumber}</div>
                <div className="text-[10px] font-semibold text-slate-800 py-1 bg-slate-50 rounded border border-slate-200 mt-1">
                  {receiptHeader}
                </div>
              </div>

              <div className="border-b border-slate-200 my-2" />

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>ITEM</span>
                  <span>TOTAL ({currency})</span>
                </div>
                <div className="flex justify-between">
                  <span>iPhone 15 Pro Max 256GB</span>
                  <span>3,500,000</span>
                </div>
                <div className="text-[9px] text-slate-500 font-sans">IMEI: 359182901234567</div>
                <div className="flex justify-between">
                  <span>Anker 20W GaN Fast Charger</span>
                  <span>45,000</span>
                </div>
              </div>

              <div className="border-b border-slate-200 my-2" />

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>3,545,000</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>TRA EFD VAT ({taxRate}%):</span>
                  <span>{((3545000 * taxRate) / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                  <span>GRAND TOTAL:</span>
                  <span>{(3545000 + (3545000 * taxRate) / 100).toLocaleString()} TSH</span>
                </div>
              </div>

              <div className="border-b border-slate-200 my-2" />

              <div className="text-center text-[9px] text-slate-600 font-sans space-y-1">
                <div className="font-semibold">{receiptFooter}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STAFF & ACCESS CONTROL */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" /> Staff & Access Control
              </h3>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 rounded-lg bg-[#0284c7] hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" /> Sajili Mfanyakazi Mpya
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200">
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-center">Manager PIN</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Inapakia...
                    </td>
                  </tr>
                ) : staffUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500 font-bold">
                      Hakuna mfanyakazi aliyesajiliwa.
                    </td>
                  </tr>
                ) : (
                  staffUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{u.name}</td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-900'
                              : u.role === 'MANAGER'
                              ? 'bg-sky-100 text-sky-900'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-900">{u.pin || '1234'}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            u.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.active ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                          {u.active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
                          title="Futa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards View */}
          <div className="block md:hidden space-y-3">
            {loadingUsers ? (
              <div className="p-6 text-center text-xs text-slate-400">Inapakia...</div>
            ) : (
              staffUsers.map((u) => (
                <div key={u.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-900' : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-600 font-medium">PIN: <code className="text-slate-900 font-bold">{u.pin}</code></span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.active ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                      <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-rose-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SECURITY & MANAGER PIN */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <form
            onSubmit={handleSaveSecurity}
            className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5 text-slate-800"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Security Password & Manager PIN
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 mb-1">Nenosiri la sasa</label>
                <input
                  type="password"
                  required
                  placeholder="Nenosiri unalotumia sasa"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="Password mpya..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Manager 4-Digit Override PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="PIN mpya"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 bg-white text-center text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0284c7] hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> {saving ? 'Inahifadhi...' : 'Save Password & PIN'}
              </button>
            </div>
          </form>

          {/* Interactive PIN Validation Box */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Key className="w-4 h-4 text-slate-700" /> Manager PIN Verification
              </div>
            </div>

            <form onSubmit={handleTestPin} className="space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="****"
                  value={testPinInput}
                  onChange={(e) => setTestPinInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-center font-mono font-bold text-xs text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0284c7] text-white font-bold rounded-lg text-xs hover:bg-sky-700 shrink-0"
                >
                  Verify
                </button>
              </div>

              {pinTestResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs font-semibold ${
                    pinTestResult.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {pinTestResult.msg}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CURRENCY & TRA TAX */}
      {activeTab === 'tax' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <form
            onSubmit={handleSaveBrandingAndTax}
            className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5 text-slate-800"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Currency & TRA EFD Tax Rates
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Default Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                >
                  <option value="TSH">Tanzanian Shilling (TSH)</option>
                  <option value="USD">US Dollar ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Exchange Rate (1 USD)</label>
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 bg-white text-right focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">TRA EFD VAT Rate (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 bg-white text-right focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0284c7] hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? 'Inahifadhi...' : 'Save Currency & Tax'}
              </button>
            </div>
          </form>

          {/* Live TRA Tax Calculator Widget */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Calculator className="w-4 h-4 text-slate-700" /> Tax Breakdown Calculator
              </div>
            </div>

            <div className="space-y-2 text-xs font-medium text-slate-700">
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
                <span>Base Item Amount:</span>
                <span className="font-mono font-bold text-slate-900">1,000,000 TSH</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
                <span>TRA VAT ({taxRate}%):</span>
                <span className="font-mono font-bold text-slate-900">{computedVat.toLocaleString()} TSH</span>
              </div>

              <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 flex justify-between items-center font-bold">
                <span>Total Charge:</span>
                <span className="font-mono text-slate-950">{totalWithVat.toLocaleString()} TSH (${amountInUsd})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: SYSTEM DATA BACKUP */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Products Catalog</div>
              <div className="text-xl font-bold text-slate-900">
                {loadingMetrics ? '...' : metrics?.productsCount || 0}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Serialized Phones</div>
              <div className="text-xl font-bold text-slate-900">
                {loadingMetrics ? '...' : metrics?.phoneUnitsCount || 0}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Sales Transactions</div>
              <div className="text-xl font-bold text-slate-900">
                {loadingMetrics ? '...' : metrics?.salesCount || 0}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">Staff Accounts</div>
              <div className="text-xl font-bold text-slate-900">
                {loadingMetrics ? '...' : metrics?.usersCount || 0}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-slate-800">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-700" /> Database Backup & Export
              </h3>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900">1-Click JSON Database Export</div>
                <div className="text-xs text-slate-600">
                  Pakua faili kamili la JSON lenye bidhaa, IMEI, mauzo, na taarifa za duka.
                </div>
              </div>

              <button
                onClick={handleExportBackup}
                className="px-5 py-2.5 rounded-lg bg-[#0284c7] hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" /> Download JSON Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STAFF USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase">Sajili Mfanyakazi Mpya</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Jina la Mfanyakazi *</label>
                <input
                  type="text"
                  required
                  placeholder="Mfano: Hassan Cashier"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="hassan@phonevault.tz"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Weka password..."
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="CASHIER">CASHIER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Manager PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono text-center bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 font-semibold hover:bg-slate-100"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#0284c7] hover:bg-sky-700 text-white font-bold shadow-sm"
                >
                  {saving ? 'Inahifadhi...' : 'Sajili Mfanyakazi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
