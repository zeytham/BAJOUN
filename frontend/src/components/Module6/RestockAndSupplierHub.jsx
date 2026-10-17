import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PackageCheck,
  AlertCircle,
  Truck,
  Building2,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Layers,
  ArrowRight,
  PieChart,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import CreatePOModal from './CreatePOModal';
import CreateSupplierModal from './CreateSupplierModal';

export default function RestockAndSupplierHub({ products = [], onRefresh }) {
  const [activeTab, setActiveTab] = useState('velocity'); // velocity, pos, suppliers, abc

  // Data states
  const [velocityData, setVelocityData] = useState([]);
  const [abcData, setAbcData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Print
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);
  const [printPo, setPrintPo] = useState(null);

  const fetchModuleData = async () => {
    setLoading(true);
    try {
      const [resVel, resAbc, resSup, resPo] = await Promise.all([
        fetch('/api/forecasting/velocity?days=30').then((r) => r.json()),
        fetch('/api/forecasting/abc-matrix').then((r) => r.json()),
        fetch('/api/forecasting/suppliers').then((r) => r.json()),
        fetch('/api/forecasting/purchase-orders').then((r) => r.json()),
      ]);

      if (resVel.success) setVelocityData(resVel.data);
      if (resAbc.success) setAbcData(resAbc);
      if (resSup.success) setSuppliers(resSup.data);
      if (resPo.success) setPurchaseOrders(resPo.data);
    } catch (err) {
      console.error('Error loading forecasting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModuleData();
  }, []);

  const handleReceiveRestock = async (poId) => {
    try {
      const res = await fetch(`/api/forecasting/purchase-orders/${poId}/receive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPhoneUnits: [],
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('🎉 Mzigo Umepokelewa na kuingizwa Kwenye Inventory Moja Kwa Moja!');
        fetchModuleData();
        if (onRefresh) onRefresh();
      } else {
        alert('Hitilafu: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Imefeli kupokea mzigo');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-full overflow-hidden">
      {/* Top Banner Header - Clean System Style */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#80ddff]/30 text-sky-950 border border-sky-300 text-xs font-extrabold">
            <TrendingUp className="w-4 h-4 text-sky-700 shrink-0" />
            Wasambazaji
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
            Stoo na oda
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCreateSupplierOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4 text-purple-700" /> + Add Supplier
          </button>
          <button
            onClick={() => setIsCreatePoOpen(true)}
            className="sky-btn-main px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" /> Tengeneza PO Mpya
          </button>
        </div>
      </div>

      {/* Touch-Scrollable Sub-Tab Switcher */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-sky-200 space-x-1.5 shadow-sm overflow-x-auto min-w-full">
        <button
          onClick={() => setActiveTab('velocity')}
          className={`shrink-0 min-w-[170px] sm:min-w-[200px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'velocity'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Restock planner</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`shrink-0 min-w-[180px] sm:min-w-[220px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pos'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span>Supplier PO Tracker ({purchaseOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`shrink-0 min-w-[160px] sm:min-w-[190px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'suppliers'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Suppliers ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('abc')}
          className={`shrink-0 min-w-[170px] sm:min-w-[200px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'abc'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <PieChart className="w-4 h-4 shrink-0" />
          <span>ABC Dead-Stock Matrix</span>
        </button>
      </div>

      {/* Restock */}
      {activeTab === 'velocity' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-sm p-4 sm:p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">Loading sales velocity...</div>
            ) : velocityData.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">No restock predictions generated.</div>
            ) : (
              <>
                {/* Mobile Responsive Cards (Visible on Small Screens) */}
                <div className="block md:hidden space-y-3">
                  {velocityData.map((item) => (
                    <div key={item.id} className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{item.name}</h4>
                          <p className="text-[11px] text-sky-700 font-bold">{item.brand} • {item.category}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                          item.status === 'CRITICAL_STOCKOUT_RISK'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.status === 'REORDER_NEEDED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {item.status === 'CRITICAL_STOCKOUT_RISK' ? 'Chini' : item.status === 'REORDER_NEEDED' ? 'Agiza' : 'Sawa'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-sky-200/80 text-xs grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">Current Stock</span>
                          <span className="font-extrabold text-slate-900">{item.currentStock} units</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">Siku zilizobaki</span>
                          <span className="font-extrabold text-sky-900">{item.daysRemaining} days</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-sky-200/80 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-semibold">Agiza: <strong>{item.recommendedReorder}</strong></span>
                        <button
                          onClick={() => setIsCreatePoOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-[11px] hover:bg-sky-700"
                        >
                          + Agiza PO
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Data Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sky-50 text-slate-700 font-extrabold border-b border-sky-200">
                      <tr>
                        <th className="p-4">Item Name</th>
                        <th className="p-4">Brand & Category</th>
                        <th className="p-4">Current Stock</th>
                        <th className="p-4">Kwa siku</th>
                        <th className="p-4">Siku zilizobaki</th>
                        <th className="p-4">Stock Status</th>
                        <th className="p-4 text-right">Agiza</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {velocityData.map((item) => (
                        <tr key={item.id} className="hover:bg-sky-50/60 transition-all">
                          <td className="p-4 font-extrabold text-slate-900">{item.name}</td>
                          <td className="p-4 text-sky-800 font-bold">{item.brand} ({item.category})</td>
                          <td className="p-4 font-bold">{item.currentStock} units</td>
                          <td className="p-4 font-semibold">{item.dailyVelocityRate} / day</td>
                          <td className="p-4 font-extrabold text-sky-900">{item.daysRemaining} days</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                              item.status === 'CRITICAL_STOCKOUT_RISK'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : item.status === 'REORDER_NEEDED'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              {item.status === 'CRITICAL_STOCKOUT_RISK' ? 'Chini' : item.status === 'REORDER_NEEDED' ? 'Agiza' : 'Sawa'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setIsCreatePoOpen(true)}
                              className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 text-[11px] font-bold"
                            >
                              + Reorder {item.recommendedReorder} units
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIER PO TRACKER */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-sm p-4 sm:p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">Loading purchase orders...</div>
            ) : purchaseOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">No purchase orders logged yet.</div>
            ) : (
              <>
                {/* Mobile Cards for Purchase Orders */}
                <div className="block md:hidden space-y-3">
                  {purchaseOrders.map((po) => (
                    <div key={po.id} className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm font-mono">{po.poNumber}</h4>
                          <p className="text-[11px] text-sky-700 font-bold">{po.supplier?.name}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                          po.status === 'DELIVERED_AND_RESTOCKED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {po.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-sky-200/80 text-xs flex justify-between">
                        <span className="text-slate-600">Total Amount:</span>
                        <span className="font-black text-slate-900">TSH {po.totalAmount?.toLocaleString()}</span>
                      </div>

                      <div className="pt-2 border-t border-sky-200/80 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setPrintPo(po)}
                          className="px-3 py-1.5 rounded-xl bg-white text-slate-800 border border-slate-300 font-bold text-[11px]"
                        >
                          Print PO PDF
                        </button>
                        {po.status !== 'DELIVERED_AND_RESTOCKED' && (
                          <button
                            onClick={() => handleReceiveRestock(po.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
                          >
                            Receive & Restock
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table for POs */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sky-50 text-slate-700 font-extrabold border-b border-sky-200">
                      <tr>
                        <th className="p-4">PO Number</th>
                        <th className="p-4">Supplier</th>
                        <th className="p-4">Items Count</th>
                        <th className="p-4">Total Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-sky-50/60 transition-all">
                          <td className="p-4 font-mono font-extrabold text-sky-900">{po.poNumber}</td>
                          <td className="p-4 font-bold text-slate-900">{po.supplier?.name}</td>
                          <td className="p-4 font-semibold">{po.items?.length || 0} items</td>
                          <td className="p-4 font-black text-slate-900">TSH {po.totalAmount?.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                              po.status === 'DELIVERED_AND_RESTOCKED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => setPrintPo(po)}
                              className="px-3 py-1.5 rounded-xl bg-sky-50 text-slate-800 border border-sky-200 text-[11px] font-bold"
                            >
                              Print PO
                            </button>
                            {po.status !== 'DELIVERED_AND_RESTOCKED' && (
                              <button
                                onClick={() => handleReceiveRestock(po.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-[11px] hover:bg-emerald-700"
                              >
                                Receive & Auto-Restock
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <div key={sup.id} className="bg-white p-5 rounded-2xl border border-sky-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{sup.name}</h3>
                    <p className="text-xs text-sky-700 font-bold">Brand: {sup.brandSupplied || 'Multi-Brand'}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200">
                    Lead: {sup.leadTimeDays} Days
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600 pt-2 border-t border-sky-100">
                  <div>Contact: <strong>{sup.contactPerson || 'Sales Desk'}</strong></div>
                  <div>Phone: <strong className="font-mono text-slate-900">{sup.phone}</strong></div>
                  <div>Payment Terms: <span className="font-bold text-amber-700">{sup.paymentTerms}</span></div>
                </div>

                <button
                  onClick={() => setIsCreatePoOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs transition shadow-sm"
                >
                  + Order Mzigo (Create PO)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ABC MATRIX & DEAD-STOCK DETECTOR */}
      {activeTab === 'abc' && abcData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-500">Fast Moving (Class A)</span>
              <h3 className="text-2xl font-black text-emerald-700">{abcData.summary?.classACount} Items</h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-500">Moderate (Class B)</span>
              <h3 className="text-2xl font-black text-sky-700">{abcData.summary?.classBCount} Items</h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-500">Dead Stock (&gt;45 Days)</span>
              <h3 className="text-2xl font-black text-rose-700">{abcData.summary?.deadStockCount} Items</h3>
              <p className="text-[10px] text-rose-600 font-bold mt-1">
                Tied Capital: TSH {abcData.summary?.deadStockCapitalTiedUp?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isCreatePoOpen && (
        <CreatePOModal
          suppliers={suppliers}
          products={products}
          onClose={() => setIsCreatePoOpen(false)}
          onSuccess={fetchModuleData}
        />
      )}

      {isCreateSupplierOpen && (
        <CreateSupplierModal
          onClose={() => setIsCreateSupplierOpen(false)}
          onSuccess={fetchModuleData}
        />
      )}
    </div>
  );
}
