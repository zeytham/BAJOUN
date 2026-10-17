import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  RefreshCw,
  Smartphone,
  Package,
  ShieldCheck,
  User,
  X,
  AlertTriangle,
  ChevronDown,
  MessageSquare,
  Lock,
  Settings,
  Download,
  LogOut,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import SmsNotificationModal from './Header/SmsNotificationModal';
import GlobalSearchModal from './Header/GlobalSearchModal';

export default function Header({
  activeTab,
  alerts = [],
  products = [],
  phoneUnits = [],
  onOpenMobileNav,
  onOpenAddPhone,
  onOpenAddAccessory,
  onRefresh,
  loading,
  currentUser,
  storeSettings,
  onLockScreen,
  onOpenSettings,
  onLogout,
  onSelectTab,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'pos':
        return 'Smart POS Terminal Desk';
      case 'upgrade':
        return 'Phone Upgrade Program';
      case 'warranties':
        return 'Digital Warranty & Supplier RMA';
      case 'phones':
        return 'Serialized Phones (IMEI Tracking)';
      case 'accessories':
        return 'Accessories & Gadgets Catalog';
      case 'compatibility':
        return 'Vifaa vinavyolingana';
      case 'financials':
        return 'Owner Financials & Store Audit';
      case 'forecasting':
        return 'Restock & Supplier Hub';
      case 'continuity':
        return 'Offline Sales & Backups';
      case 'settings':
        return 'Store Settings & Security Controls';
      case 'customers':
        return 'Customer Directory CRM & SMS Communication Hub';
      default:
        return storeSettings?.shopName || 'PhoneVault Pro Management';
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/settings/export-backup');
      if (!res.ok) throw new Error('Failed to export backup');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PhoneVault_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Imeshindikana kupakua Database Backup: ' + e.message);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-200/80 px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-sm relative">
        {/* Left Section: Mobile Navigation Menu Trigger & Breadcrumb Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
          <button
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 rounded-xl bg-sky-50 border border-sky-200 text-slate-700 hover:text-slate-950 shrink-0"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 text-sky-800" />
          </button>

          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate flex items-center gap-1.5">
              <span>{getBreadcrumbTitle()}</span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold hidden sm:block truncate">
              {storeSettings?.shopName || 'PhoneVault Pro Enterprise'} • Enterprise v1.0
            </p>
          </div>
        </div>

        {/* Middle Section: Integrated Search Input Field */}
        <div className="hidden md:flex flex-1 max-w-xs mx-4">
          <button
            onClick={() => setShowSearchModal(true)}
            className="w-full px-3.5 py-2 rounded-xl bg-sky-50/80 hover:bg-sky-100/80 border border-sky-200/80 text-left text-xs font-semibold text-slate-500 flex items-center justify-between transition-all shadow-inner"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="truncate">Search IMEI, Model, Cover...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white text-slate-400 rounded border border-slate-200 shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Section: Action Buttons, SMS Gateway, Reorder Alerts & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="md:hidden p-2 rounded-xl bg-sky-50 border border-sky-200 text-slate-700 shrink-0 hover:bg-sky-100"
            title="Search IMEI/Products"
          >
            <Search className="w-4 h-4 text-sky-700" />
          </button>

          {/* SMS Notification Gateway Button */}
          <button
            onClick={() => setShowSmsModal(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 transition-all flex items-center gap-1.5 text-xs font-black shrink-0 active:scale-95"
            title="SMS Gateway & Logs"
          >
            <MessageSquare className="w-4 h-4 text-sky-700 shrink-0" />
            <span className="hidden xl:inline">SMS Center</span>
          </button>

          {/* Sync / Refresh Data Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 sm:p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-slate-700 border border-sky-200 transition-all flex items-center gap-1 text-xs font-bold shrink-0 active:scale-95"
            title="Sync System Data"
          >
            <RefreshCw className={`w-4 h-4 text-sky-600 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">Sync</span>
          </button>

          {/* Quick Add Phone Button */}
          <button
            onClick={onOpenAddPhone}
            className="hidden sm:flex sky-btn-main px-3 py-2 rounded-xl text-xs font-extrabold items-center gap-1 shadow-sm shrink-0 hover:brightness-105 transition-all"
            title="Add New Phone (IMEI)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Phone</span>
          </button>

          {/* Quick Add Accessory Button */}
          <button
            onClick={onOpenAddAccessory}
            className="hidden sm:flex sky-btn-accent px-3 py-2 rounded-xl font-extrabold text-xs shadow-sm items-center gap-1 shrink-0 hover:brightness-105 transition-all"
            title="Add New Accessory"
          >
            <Plus className="w-3.5 h-3.5 text-slate-950" />
            <span>+ Accessory</span>
          </button>

          {/* Reorder Alerts Notification Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="p-2 sm:p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-slate-700 border border-sky-200 transition-all flex items-center gap-1 text-xs font-semibold relative shrink-0 active:scale-95"
              title="Reorder Alerts"
            >
              <Bell className="w-4 h-4 text-amber-600 shrink-0" />
              {alerts.length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full leading-none animate-pulse">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-sky-200 rounded-2xl shadow-2xl p-4 z-50 space-y-3 max-h-[85vh] overflow-y-auto animate-fadeIn">
                <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <h4 className="text-xs font-bold text-slate-900">Reorder & Low Stock Alerts ({alerts.length})</h4>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-sky-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {alerts.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4 font-medium">
                      ✨ All inventory stock levels are optimal!
                    </div>
                  ) : (
                    alerts.map((al) => (
                      <div key={al.id} className="p-3 bg-sky-50 rounded-xl border border-sky-100 space-y-2 text-left">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>{al.productName}</span>
                          <span className="text-rose-600 font-extrabold">{al.currentStock} left</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{al.message}</p>
                        <button
                          onClick={() => {
                            onSelectTab('forecasting');
                            setShowNotifications(false);
                          }}
                          className="w-full py-1 bg-[#0284c7] hover:bg-sky-700 text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1 shadow-sm"
                        >
                          <ShoppingBag className="w-3 h-3" /> Reorder Now (Module 6)
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Dropdown Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-sky-50 transition-all border border-sky-200 shrink-0 active:scale-95"
            >
              <div className="h-8 w-8 rounded-lg bg-[#80ddff]/40 border border-sky-300 flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
                <User className="w-4 h-4 text-slate-950" />
              </div>
              <div className="hidden xl:block text-left pr-1">
                <div className="text-xs font-black text-slate-900 leading-tight">{currentUser?.name || 'Store Owner'}</div>
                <div className="text-[10px] text-emerald-600 font-bold">Owner Logged In</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-sky-200 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-slate-800 animate-fadeIn">
                <div className="px-3 py-2 bg-sky-50 rounded-xl mb-1 border border-sky-100">
                  <div className="text-xs font-black text-slate-900">{currentUser?.name || 'Store Owner'}</div>
                  <div className="text-[10px] text-slate-500">{currentUser?.email || 'admin@phonevault.tz'}</div>
                </div>

                <button
                  onClick={() => {
                    onLockScreen();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-sky-50 flex items-center gap-2 transition-all"
                >
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Lock Screen (PIN)</span>
                </button>
                <button
                  onClick={() => {
                    onOpenSettings();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-sky-50 flex items-center gap-2 transition-all"
                >
                  <Settings className="w-4 h-4 text-sky-600" />
                  <span>Store Settings</span>
                </button>
                <button
                  onClick={() => {
                    setShowSmsModal(true);
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-sky-50 flex items-center gap-2 transition-all"
                >
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span>SMS Center Logs</span>
                </button>
                <button
                  onClick={() => {
                    handleExportBackup();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-sky-50 flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Export DB Backup</span>
                </button>
                <div className="border-t border-sky-100 my-1" />
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SMS Gateway Modal Popup */}
      {showSmsModal && <SmsNotificationModal onClose={() => setShowSmsModal(false)} />}

      {/* Global Search Modal Popup */}
      {showSearchModal && (
        <GlobalSearchModal
          products={products}
          phoneUnits={phoneUnits}
          onClose={() => setShowSearchModal(false)}
          onSelectTab={onSelectTab}
        />
      )}
    </>
  );
}
