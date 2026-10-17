import React from 'react';
import {
  Smartphone,
  Package,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  ShoppingCart,
  Repeat,
  Award,
  DollarSign,
  TrendingUp,
  Settings,
  Database,
  Users,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  alertCount = 0,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  linkOnline = true,
  pendingSales = 0,
}) {
  const navSections = [
    {
      title: 'Sales & Operations',
      items: [
        {
          id: 'pos',
          label: 'Smart POS Terminal',
          icon: ShoppingCart,
          badge: 'LIVE',
        },
      ],
    },
    {
      title: 'Inventory',
      items: [
        {
          id: 'phones',
          label: 'Serialized Phones',
          icon: Smartphone,
        },
        {
          id: 'accessories',
          label: 'Accessories & Gadgets',
          icon: Package,
        },
        {
          id: 'compatibility',
          label: 'Compatibility Matcher',
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: 'Services & Customers',
      items: [
        {
          id: 'upgrade',
          label: 'Phone Upgrade Program',
          icon: Repeat,
        },
        {
          id: 'warranties',
          label: 'Digital Warranty & RMA',
          icon: Award,
        },
        {
          id: 'customers',
          label: 'Customer Directory & SMS',
          icon: Users,
        },
      ],
    },
    {
      title: 'Financials & Supply',
      items: [
        {
          id: 'financials',
          label: 'Financials & Expenses',
          icon: DollarSign,
        },
        {
          id: 'forecasting',
          label: 'Restock & Suppliers',
          icon: TrendingUp,
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          id: 'settings',
          label: 'Store Settings',
          icon: Settings,
        },
        {
          id: 'continuity',
          label: 'Offline & Backups',
          icon: Database,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200 transition-all duration-300 flex flex-col justify-between shadow-xl ${
          isMobileOpen ? 'translate-x-0 w-72 max-w-[85vw]' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="flex flex-col min-h-0 flex-1">
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-[#0284c7] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="truncate">
                  <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">PhoneVault Pro</h1>
                  <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Enterprise ERP</p>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-all border border-slate-200 shrink-0"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Toggle */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0"
              title="Close Navigation Drawer"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Navigation Links Scrollable Area */}
          <div className="p-3 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
            {navSections.map((section, idx) => (
              <div key={section.title || idx} className="space-y-1">
                {(!isCollapsed || isMobileOpen) ? (
                  <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {section.title}
                  </div>
                ) : (
                  idx > 0 && <div className="border-t border-slate-100 my-2" />
                )}

                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-[#0284c7] text-white font-bold shadow-sm'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-semibold'
                      }`}
                      title={item.label}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                      {(!isCollapsed || isMobileOpen) && (
                        <div className="truncate flex-1 min-w-0 flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold leading-tight truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                                isActive ? 'bg-white text-[#0284c7]' : 'bg-sky-100 text-sky-900'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Status Widget */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          {!isCollapsed || isMobileOpen ? (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-700 font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Alerts:
                </span>
                <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-200 rounded text-[10px]">
                  {alertCount}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Till:</span>
                <span className={`font-bold flex items-center gap-1 ${linkOnline ? 'text-emerald-600' : 'text-amber-700'}`}>
                  <CheckCircle className="w-3 h-3" />
                  {linkOnline ? (pendingSales > 0 ? `${pendingSales} queued` : 'SQLite') : 'Offline'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
