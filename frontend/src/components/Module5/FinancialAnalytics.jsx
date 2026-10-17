import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Receipt, PieChart, Plus, Trash2, Printer, Search,
  Filter, Calendar, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, X, Layers, FileText
} from 'lucide-react';

export default function FinancialAnalytics() {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'expenses' | 'audit'

  // Data States
  const [financials, setFinancials] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [auditReport, setAuditReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [offset, setOffset] = useState(0);

  // Modal States
  const [showLogExpenseModal, setShowLogExpenseModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState('RENT');
  const [expAmount, setExpAmount] = useState('');
  const [expMode, setExpMode] = useState('CASH');
  const [expNotes, setExpNotes] = useState('');

  // Print Preview Statement Modal
  const [showPrintStatement, setShowPrintStatement] = useState(false);

  // Fetch All Financial Data
  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [resOver, resExp, resAudit] = await Promise.all([
        fetch(`/api/financials/overview?startDate=${startDate}&endDate=${endDate}&limit=20&offset=${offset}`).then(r => r.json()),
        fetch('/api/financials/expenses').then(r => r.json()),
        fetch('/api/financials/audit-report').then(r => r.json()),
      ]);

      if (resOver.success) setFinancials(resOver.data);
      if (resExp.success) setExpenses(resExp.data);
      if (resAudit.success) setAuditReport(resAudit.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [startDate, endDate, offset]);

  // Submit New Store Expense
  const handleLogExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/financials/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expTitle,
          category: expCategory,
          amount: expAmount,
          paymentMode: expMode,
          notes: expNotes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Store Operating Expense logged!');
        setShowLogExpenseModal(false);
        setExpTitle('');
        setExpAmount('');
        setExpNotes('');
        fetchFinancialData();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      const res = await fetch(`/api/financials/expenses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchFinancialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-full overflow-hidden">
      {/* Top Banner - Module 5 Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#80ddff]/30 text-sky-950 border border-sky-300 text-xs font-extrabold">
            <DollarSign className="w-4 h-4 text-sky-700 shrink-0" />
            Hesabu
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
            Faida na matumizi
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowLogExpenseModal(true)}
            className="sky-btn-main w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" /> Log Store Expense
          </button>
        </div>
      </div>

      {/* Touch-Scrollable Sub-Tab Switcher */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-sky-200 space-x-1.5 shadow-sm overflow-x-auto min-w-full">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`shrink-0 min-w-[170px] sm:min-w-[200px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'overview'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Profitability & COGS</span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`shrink-0 min-w-[180px] sm:min-w-[220px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'expenses'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>Store Expenses ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`shrink-0 min-w-[160px] sm:min-w-[190px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'audit'
              ? 'bg-[#0284c7] text-white shadow-md shadow-sky-600/30'
              : 'text-slate-700 hover:bg-sky-50'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Store Closing Audit</span>
        </button>
      </div>

      {/* SUB-TAB 1: FINANCIAL PROFITABILITY & COGS DASHBOARD */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Revenue */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales Revenue</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">
                TSH {(financials?.totalRevenue || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-sky-700 font-semibold">Gross Sales Volume</div>
            </div>

            {/* COGS */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cost of Goods (COGS)</div>
              <div className="text-xl sm:text-2xl font-black text-amber-700">
                TSH {(financials?.totalCogs || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-800 font-semibold">Total Product Buying Cost</div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Profit (Margin)</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700">
                TSH {(financials?.grossProfit || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold">Overall Margin: {financials?.overallMargin || 0}%</div>
            </div>

            {/* Net Operating Profit */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Operating Profit</div>
              <div className="text-xl sm:text-2xl font-black text-[#0284c7]">
                TSH {(financials?.netProfit || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-sky-700 font-semibold">After Expenses: TSH {(financials?.totalExpenses || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-200 flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold text-slate-600">
              Kuanzia
              <input type="date" value={startDate} onChange={(e) => { setOffset(0); setStartDate(e.target.value); }} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-slate-900" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Hadi
              <input type="date" value={endDate} onChange={(e) => { setOffset(0); setEndDate(e.target.value); }} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-slate-900" />
            </label>
            <button type="button" onClick={() => setOffset((value) => Math.max(0, value - 20))} className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold">Nyuma</button>
            <button type="button" onClick={() => setOffset((value) => value + 20)} className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold">Mbele</button>
            <span className="text-xs text-slate-500">Mauzo {financials?.range?.total || 0} · ukurasa {Math.floor(offset / 20) + 1}</span>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Madeni yaliyo wazi</h3>
              <span className="text-sm font-black text-amber-700">TSH {(financials?.openDebtTotal || 0).toLocaleString()}</span>
            </div>
            {(financials?.debts || []).length === 0 ? (
              <p className="text-sm text-slate-500">Hakuna deni wazi.</p>
            ) : (
              <div className="space-y-2">
                {financials.debts.map((debt) => (
                  <div key={debt.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <div>
                      <div className="font-bold text-slate-900">{debt.customerName}</div>
                      <div className="text-xs text-slate-500">{debt.customerPhone} · {debt.invoiceNumber || 'Risiti'}</div>
                    </div>
                    <div className="font-black text-slate-900">TSH {Number(debt.balance || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Margin Breakdown Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-sky-600 shrink-0" />
              Category Gross Profitability & Margin Breakdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
              {/* Phones Category */}
              <div className="p-4 bg-sky-50/80 rounded-xl border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">📱 Serialized Smartphones:</span>
                  <span className="px-2.5 py-0.5 bg-sky-100 text-sky-900 rounded-full font-black text-xs border border-sky-300">
                    {financials?.categoryBreakdown?.phones?.margin || 0}% Margin
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Revenue Generated:</span>
                    <span className="font-bold text-slate-900">TSH {(financials?.categoryBreakdown?.phones?.revenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Stock COGS Cost:</span>
                    <span className="font-bold text-amber-700">TSH {(financials?.categoryBreakdown?.phones?.cogs || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-sky-200 text-sm">
                    <span>Gross Profit:</span>
                    <span className="text-emerald-700">TSH {(financials?.categoryBreakdown?.phones?.profit || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Accessories Category */}
              <div className="p-4 bg-purple-50/80 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">🔌 Accessories & Gadgets:</span>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 rounded-full font-black text-xs border border-purple-300">
                    {financials?.categoryBreakdown?.accessories?.margin || 0}% Margin
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Revenue Generated:</span>
                    <span className="font-bold text-slate-900">TSH {(financials?.categoryBreakdown?.accessories?.revenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Stock COGS Cost:</span>
                    <span className="font-bold text-amber-700">TSH {(financials?.categoryBreakdown?.accessories?.cogs || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-purple-200 text-sm">
                    <span>Gross Profit:</span>
                    <span className="text-purple-800">TSH {(financials?.categoryBreakdown?.accessories?.profit || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STORE OPERATING EXPENSES TRACKER */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-sm space-y-4 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Store Operating Expenses Tracker</h3>
              <p className="text-xs text-slate-500">Log monthly rent, LUKU electricity, WiFi internet, marketing, and operational overheads.</p>
            </div>

            <button
              onClick={() => setShowLogExpenseModal(true)}
              className="sky-btn-main w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" /> Log Store Expense
            </button>
          </div>

          {/* Mobile Card Grid (Visible on Small Screens) */}
          <div className="block md:hidden space-y-3">
            {expenses.map((exp) => (
              <div key={exp.id} className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">{exp.title}</h4>
                    <span className="text-[10px] text-sky-800 font-extrabold uppercase bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                      {exp.category}
                    </span>
                  </div>
                  <span className="font-black text-rose-600 text-sm">TSH {exp.amount?.toLocaleString()}</span>
                </div>

                <div className="pt-2 border-t border-sky-200 text-xs flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">{new Date(exp.expenseDate).toLocaleDateString()} • {exp.paymentMode}</span>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
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
                  <th className="p-3.5">Expense Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Amount (TSH)</th>
                  <th className="p-3.5">Payment Mode</th>
                  <th className="p-3.5">Date Logged</th>
                  <th className="p-3.5 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="p-3.5 font-extrabold text-slate-900">{exp.title}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold bg-sky-100 text-sky-900 rounded-full border border-sky-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-black text-rose-600">TSH {exp.amount?.toLocaleString()}</td>
                    <td className="p-3.5 font-bold text-slate-700">{exp.paymentMode}</td>
                    <td className="p-3.5 text-slate-500">{new Date(exp.expenseDate).toLocaleDateString()}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TRA TAX & END-OF-DAY STORE CLOSING AUDIT CENTER */}
      {activeSubTab === 'audit' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-sky-100 pb-4 gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">End-of-Day Store Closing Settlement Statement</h3>
              <p className="text-xs text-slate-500">Consolidated financial audit report for daily revenue, M-Pesa, cash, and voucher settlements.</p>
            </div>

            <button
              onClick={() => setShowPrintStatement(true)}
              className="sky-btn-accent w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print Closing Audit Statement
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
              <div className="text-xs font-bold text-emerald-800">💵 Cash Collections:</div>
              <div className="text-xl font-black text-emerald-900">TSH {(auditReport?.settlementBreakdown?.cash || 0).toLocaleString()}</div>
            </div>

            <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-1">
              <div className="text-xs font-bold text-sky-800">📱 M-Pesa Mobile Payments:</div>
              <div className="text-xl font-black text-sky-900">TSH {(auditReport?.settlementBreakdown?.mpesa || 0).toLocaleString()}</div>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-1">
              <div className="text-xs font-bold text-purple-800">💳 Card & Bank Transfers:</div>
              <div className="text-xl font-black text-purple-900">TSH {(auditReport?.settlementBreakdown?.card || 0).toLocaleString()}</div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
              <div className="text-xs font-bold text-amber-800">🎟️ Trade-In Vouchers Redeemed:</div>
              <div className="text-xl font-black text-amber-900">TSH {(auditReport?.settlementBreakdown?.vouchers || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: LOG STORE OPERATING EXPENSE */}
      {showLogExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleLogExpenseSubmit} className="bg-white border border-sky-200 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-600 shrink-0" /> Log Store Operating Expense
              </h3>
              <button type="button" onClick={() => setShowLogExpenseModal(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Store Monthly Rent, LUKU Tokens"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Expense Category *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                >
                  <option value="RENT">Store Rent</option>
                  <option value="UTILITIES">Utilities (LUKU, WiFi)</option>
                  <option value="MARKETING">Marketing & Social Ads</option>
                  <option value="TRANSPORT">Transport & Freight</option>
                  <option value="SUPPLIES">Office Supplies & Stationery</option>
                  <option value="OTHER">Other Expense</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Amount (TSH) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500000"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Payment Mode</label>
                <select
                  value={expMode}
                  onChange={(e) => setExpMode(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-600 font-bold mb-1">Notes / Description</label>
              <input
                type="text"
                placeholder="Optional details..."
                value={expNotes}
                onChange={(e) => setExpNotes(e.target.value)}
                className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowLogExpenseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="sky-btn-main px-5 py-2 rounded-xl text-xs font-extrabold">
                Save Expense Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: PRINTABLE FINANCIAL CLOSING STATEMENT */}
      {showPrintStatement && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">End-of-Day Financial Statement Print Preview</h3>
              <button onClick={() => setShowPrintStatement(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="financial-closing-statement" className="bg-white p-4 sm:p-6 rounded-xl border-2 border-slate-300 font-sans text-xs text-slate-900 space-y-4">
              <div className="text-center border-b border-slate-300 pb-3 space-y-1">
                <div className="text-base font-black uppercase tracking-wider text-sky-900">PHONEVAULT PRO ENTERPRISE</div>
                <div className="text-[10px] text-slate-600">Dar es Salaam, Tanzania • Store Closing Settlement Audit</div>
                <div className="text-[11px] font-bold text-sky-800 mt-1">DATE: {new Date().toLocaleDateString()}</div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="font-bold text-slate-600">Gross Sales Revenue:</span> <span className="font-extrabold text-slate-900">TSH {(financials?.totalRevenue || 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">Product Buying COGS:</span> <span className="font-bold text-amber-700">TSH {(financials?.totalCogs || 0).toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-slate-600">Gross Profit:</span> <span className="font-black text-emerald-700">TSH {(financials?.grossProfit || 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="font-bold text-slate-600">Operating Expenses:</span> <span className="font-bold text-rose-600">TSH {(financials?.totalExpenses || 0).toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-slate-300 pt-2 text-sm"><span className="font-black text-slate-900">NET OPERATING PROFIT:</span> <span className="font-black text-[#0284c7]">TSH {(financials?.netProfit || 0).toLocaleString()}</span></div>
              </div>

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-[10px] text-slate-600 leading-relaxed">
                Official single-owner financial settlement statement. Verified against completed POS sales and logged operating overheads.
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-slate-300">
                <span className="text-[10px] font-bold text-slate-500">Owner Verification Stamp</span>
                <button onClick={() => window.print()} className="w-full sm:w-auto sky-btn-main px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5">
                  <Printer className="w-4 h-4" /> Print Statement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
