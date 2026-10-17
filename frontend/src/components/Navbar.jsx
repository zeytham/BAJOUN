import React from 'react';
import { Smartphone, Bell, ShieldAlert, Sparkles, Plus, Search, RefreshCw } from 'lucide-react';

export default function Navbar({ alertCount, onOpenAddPhone, onOpenAddAccessory, onRefresh, loading }) {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight">BAJOUN</h1>
          </div>
          <p className="text-xs text-slate-400">Stoo</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700/50 flex items-center gap-2 text-xs font-medium"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Low Stock Alerts Badge */}
        <div className="relative">
          <button className="p-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700/50 flex items-center gap-2 text-xs font-medium">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Alerts</span>
            {alertCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full animate-pulse">
                {alertCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Add Product Dropdown Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddPhone}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Phone (IMEI)</span>
          </button>

          <button
            onClick={onOpenAddAccessory}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Accessory/Gadget</span>
          </button>
        </div>
      </div>
    </header>
  );
}
