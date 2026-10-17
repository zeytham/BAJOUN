import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Barcode, Search, Plus, Minus, Trash2, CheckCircle2, AlertTriangle,
  Lock, Key, Smartphone, Package, ShieldCheck, Printer, ArrowRight, DollarSign,
  CreditCard, SmartphoneNfc, FileText, UserPlus, Pause, Play, Sparkles, RefreshCw, X
} from 'lucide-react';
import { commitSale, continuityStatus, verifyOfflineManagerPin } from '../../offline/engine.js';

export default function POSTerminal({
  products,
  phoneUnits,
  categories = [],
  onRefresh,
  onPendingChange,
  initialVoucherCode = '',
  initialVoucherValue = 0,
  initialCustomer = null,
  initialPhoneUnit = null,
}) {
  // Cart State
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState({ name: 'Walk-in Customer', phone: '', tinNumber: '' });
  const [discountTotal, setDiscountTotal] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [currency, setCurrency] = useState('TSH'); // TSH or USD
  const exchangeRate = 2650; // 1 USD = 2,650 TSH

  // Payment Methods State (Split Payments)
  const [paymentSplit, setPaymentSplit] = useState({
    CASH: 0,
    MPESA: 0,
    CARD: 0,
    BANK_TRANSFER: 0,
    TRADEIN_VOUCHER: 0,
  });
  const [mpesaRef, setMpesaRef] = useState('');
  const [voucherCode, setVoucherCode] = useState(initialVoucherCode);
  const [voucherVerified, setVoucherVerified] = useState(null);

  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomer((prev) => ({
        ...prev,
        name: initialCustomer.customerName || initialCustomer.name || prev.name,
        phone: initialCustomer.customerPhone || initialCustomer.phone || prev.phone,
        tinNumber: initialCustomer.nidaNumber || prev.tinNumber,
      }));
    }
    if (initialVoucherCode) {
      setVoucherCode(initialVoucherCode);
      if (initialVoucherValue > 0) {
        setPaymentSplit((prev) => ({
          ...prev,
          TRADEIN_VOUCHER: initialVoucherValue,
        }));
      }
    }
    if (initialPhoneUnit) {
      addToCart(initialPhoneUnit, 'PHONE');
    }
  }, [initialVoucherCode, initialVoucherValue, initialCustomer, initialPhoneUnit]);


  // Modals & Popups
  const [bundlePopupItem, setBundlePopupItem] = useState(null); // Recommended accessories popup
  const [showManagerPinModal, setShowManagerPinModal] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState('');
  const [managerPinAuthorized, setManagerPinAuthorized] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(null); // Receipt payload
  const [parkedOrders, setParkedOrders] = useState([]);
  const [scanInput, setScanInput] = useState('');

  // Left Side Catalog Filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('ALL');
  const [checkingOut, setCheckingOut] = useState(false);

  // Add Item to Cart (Handles IMEI Phones & Accessories)
  const addToCart = (item, type, selectedVariant = null) => {
    if (type === 'PHONE') {
      // Check if already in cart
      if (cart.some((c) => c.phoneUnitId === item.id)) return;

      const newCartItem = {
        cartId: `phone-${item.id}`,
        type: 'PHONE',
        productId: item.productId,
        productName: item.product?.name,
        color: item.color,
        storage: item.storage,
        condition: item.condition,
        phoneUnitId: item.id,
        imei1: item.imei1,
        unitPrice: item.retailPrice,
        minSellingPrice: item.minSellingPrice,
        warrantyMonths: item.warrantyMonths,
        quantity: 1,
        discount: 0,
      };

      setCart((prev) => [...prev, newCartItem]);

      // Update cash payment amount automatically if cart had 1 item
      if (cart.length === 0) {
        setPaymentSplit((prev) => ({ ...prev, CASH: item.retailPrice }));
      }

      // Pop up Smart Accessories Combo Bundle suggestion for this phone!
      setBundlePopupItem(item);
    } else if (type === 'ACCESSORY') {
      let targetVariant = selectedVariant;
      if (!targetVariant && item.hasVariants && item.variants?.length > 0) {
        targetVariant = item.variants.find((v) => v.stockQuantity > 0) || item.variants[0];
      }

      const targetId = targetVariant ? `var-${targetVariant.id}` : `prod-${item.id}`;
      const price = targetVariant ? targetVariant.price : item.basePrice || 0;

      const existingIdx = cart.findIndex((c) => c.cartId === targetId);

      if (existingIdx > -1) {
        const updated = [...cart];
        updated[existingIdx].quantity += 1;
        setCart(updated);
      } else {
        const newCartItem = {
          cartId: targetId,
          type: 'ACCESSORY',
          productId: item.id,
          productName: item.name,
          variantId: targetVariant ? targetVariant.id : null,
          color: targetVariant?.color || null,
          size: targetVariant?.size || null,
          unitPrice: price,
          minSellingPrice: 0,
          quantity: 1,
          discount: 0,
        };
        setCart((prev) => [...prev, newCartItem]);
      }
    }
  };

  // Fast Barcode/IMEI Scanner Input Handler
  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const term = scanInput.trim().toLowerCase();

    // 1. Search in IMEI Phone Units
    const foundPhone = phoneUnits.find(
      (u) => u.imei1?.toLowerCase() === term || u.serialNumber?.toLowerCase() === term
    );
    if (foundPhone && foundPhone.status === 'IN_STOCK') {
      addToCart(foundPhone, 'PHONE');
      setScanInput('');
      return;
    }

    // 2. Search in Accessories/Variants Barcode
    for (const p of products) {
      if (p.type !== 'PHONE') {
        if (p.hasVariants) {
          const foundVar = p.variants?.find((v) => v.barcode?.toLowerCase() === term || v.sku?.toLowerCase() === term);
          if (foundVar) {
            addToCart(p, 'ACCESSORY', foundVar);
            setScanInput('');
            return;
          }
        } else {
          if (p.barcode?.toLowerCase() === term || p.sku?.toLowerCase() === term) {
            addToCart(p, 'ACCESSORY');
            setScanInput('');
            return;
          }
        }
      }
    }

    alert(`No matching in-stock IMEI or Barcode found for: ${scanInput}`);
    setScanInput('');
  };

  const removeFromCart = (cartId) => {
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
  };

  const updateQuantity = (cartId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId && item.type !== 'PHONE') {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.unitPrice - item.discount) * item.quantity, 0);
  const grandTotal = Math.max(0, subtotal - discountTotal);

  // Auto-sync CASH payment if cash is default
  useEffect(() => {
    if (grandTotal > 0 && paymentSplit.MPESA === 0 && paymentSplit.CARD === 0 && paymentSplit.BANK_TRANSFER === 0) {
      setPaymentSplit((prev) => ({ ...prev, CASH: grandTotal }));
    }
  }, [grandTotal]);

  const totalPaid = Object.values(paymentSplit).reduce((acc, val) => acc + parseFloat(val || 0), 0);
  const changeDue = Math.max(0, totalPaid - grandTotal);

  // Check if any phone item is being sold below its min floor price
  const isBelowFloorPrice = cart.some(
    (item) => item.type === 'PHONE' && item.unitPrice - item.discount < item.minSellingPrice
  );

  // Park / Hold Cart
  const parkCurrentCart = () => {
    if (cart.length === 0) return;
    const order = {
      id: `PARK-${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      customerName: selectedCustomer.name,
      cart,
      subtotal,
    };
    setParkedOrders([...parkedOrders, order]);
    setCart([]);
  };

  const restoreParkedCart = (order) => {
    setCart(order.cart);
    setSelectedCustomer({ name: order.customerName, phone: '', tinNumber: '' });
    setParkedOrders(parkedOrders.filter((p) => p.id !== order.id));
  };

  // Manager PIN Verification
  const verifyManagerPin = async () => {
    try {
      const res = await fetch('/api/pos/manager-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: managerPinInput }),
      });
      const json = await res.json();
      if (json.success) {
        setManagerPinAuthorized(true);
        setShowManagerPinModal(false);
        return;
      }
      alert(json.message || 'PIN sio sahihi');
    } catch {
      const ok = await verifyOfflineManagerPin(managerPinInput);
      if (ok) {
        setManagerPinAuthorized(true);
        setShowManagerPinModal(false);
        return;
      }
      alert('Seva haipatikani. Weka PIN ya meneja kwenye Duka Offline, au unganisha mtandao.');
    }
  };

  // Complete Order Checkout
  const handleCheckout = async (isProforma = false) => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (isBelowFloorPrice && !managerPinAuthorized) {
      setShowManagerPinModal(true);
      return;
    }

    if (!isProforma && totalPaid < grandTotal) {
      alert(`Amount paid (TSH ${totalPaid.toLocaleString()}) is less than total due (TSH ${grandTotal.toLocaleString()})!`);
      return;
    }

    const payloadPayments = Object.entries(paymentSplit)
      .filter(([_, amt]) => parseFloat(amt) > 0)
      .map(([method, amt]) => ({
        method,
        amount: parseFloat(amt),
        referenceCode: method === 'MPESA' ? mpesaRef : method === 'TRADEIN_VOUCHER' ? voucherCode : null,
      }));

    if (checkingOut) return;
    setCheckingOut(true);
    try {
      const result = await commitSale({
        grandTotal,
        amountPaid: totalPaid,
        changeDue,
        cart,
        body: {
          customerData: selectedCustomer,
          isProforma,
          currency,
          exchangeRate,
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            phoneUnitId: c.phoneUnitId,
            unitPrice: c.unitPrice,
            quantity: c.quantity,
            discount: c.discount,
          })),
          discountTotal,
          discountReason,
          payments: payloadPayments,
          managerPin: managerPinAuthorized ? managerPinInput : undefined,
        },
      });

      if (result.success) {
        setShowReceiptModal(result.data);
        setCart([]);
        setDiscountTotal(0);
        setPaymentSplit({ CASH: 0, MPESA: 0, CARD: 0, BANK_TRANSFER: 0, TRADEIN_VOUCHER: 0 });
        const status = await continuityStatus();
        if (onPendingChange) onPendingChange(status.pending);
        if (result.catalog) onRefresh();
      }
    } catch (e) {
      alert(e.message || 'Mauzo hayajahifadhiwa');
    } finally {
      setCheckingOut(false);
    }
  };

  const query = catalogSearch.toLowerCase();
  const showPhones = catalogCategory === 'ALL' || catalogCategory === 'PHONES';
  const availablePhones = showPhones
    ? phoneUnits.filter(
        (u) =>
          u.status === 'IN_STOCK' &&
          (u.product?.name?.toLowerCase().includes(query) ||
            u.imei1?.toLowerCase().includes(query) ||
            u.color?.toLowerCase().includes(query) ||
            u.product?.brand?.name?.toLowerCase().includes(query))
      )
    : [];

  const availableAccessories = products.filter((p) => {
    if (p.type === 'PHONE') return false;
    const matchesSearch =
      !query ||
      p.name?.toLowerCase().includes(query) ||
      p.category?.name?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase() === query ||
      p.sku?.toLowerCase() === query;
    if (!matchesSearch) return false;
    if (catalogCategory === 'ALL' || catalogCategory === 'ACCESSORIES') return true;
    if (catalogCategory === 'PHONES') return false;
    return p.categoryId === catalogCategory || p.category?.id === catalogCategory;
  });

  const departments = [
    { id: 'ALL', label: 'All' },
    { id: 'PHONES', label: 'Phones' },
    ...categories
      .filter((category) => category.slug !== 'smartphones')
      .map((category) => ({ id: category.id, label: category.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Bar for POS Desk */}
      <div className="bg-white p-5 rounded-2xl border border-sky-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#80ddff] flex items-center justify-center text-slate-950 font-black shadow-md border border-sky-300">
            <ShoppingCart className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Smart POS Cashier Terminal Desk</h2>
            <p className="text-xs text-slate-600">
              Rapid barcode scanning, IMEI floor price validation, split payments & thermal receipt generation.
            </p>
          </div>
        </div>

        {/* Currency & Park Order Controls */}
        <div className="flex items-center gap-3">
          {parkedOrders.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <Pause className="w-3.5 h-3.5" /> Parked ({parkedOrders.length}):
              </span>
              {parkedOrders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => restoreParkedCart(p)}
                  className="px-2 py-1 text-[10px] font-black bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  Restore ({p.customerName})
                </button>
              ))}
            </div>
          )}

          <button
            onClick={parkCurrentCart}
            disabled={cart.length === 0}
            className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-slate-800 border border-sky-200 text-xs font-bold flex items-center gap-1.5"
          >
            <Pause className="w-4 h-4 text-sky-600" />
            <span>Park Cart</span>
          </button>
        </div>
      </div>

      {/* POS Split View Layout (Left Side: Catalog & Scanner | Right Side: Active Cart & Checkout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Hardware Scanner & Catalog Items (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Rapid Scanner Input Bar */}
          <form onSubmit={handleScanSubmit} className="bg-white p-3 rounded-2xl border-2 border-sky-300 shadow-sm flex items-center gap-2">
            <Barcode className="w-5 h-5 text-sky-600 ml-1 shrink-0 animate-pulse" />
            <input
              type="text"
              placeholder="Scan Barcode sticker or 15-digit Phone IMEI number here..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="flex-1 bg-transparent text-slate-900 font-mono text-xs font-extrabold placeholder-slate-400 focus:outline-none"
            />
            <button type="submit" className="sky-btn-main px-4 py-2 rounded-xl text-xs font-bold">
              Add to Cart
            </button>
          </form>

          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search model, brand, cover, charger, barcode..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full bg-white border border-sky-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-sm"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {departments.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => setCatalogCategory(department.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                    catalogCategory === department.id
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-white text-slate-700 border-sky-200'
                  }`}
                >
                  {department.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {/* Phones List */}
            {(catalogCategory === 'ALL' || catalogCategory === 'PHONES') && (
              <div className="space-y-2">
                <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  <Smartphone className="w-4 h-4 text-sky-600" /> In-Stock Smartphones ({availablePhones.length}):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availablePhones.map((phone) => (
                    <div
                      key={phone.id}
                      className="bg-white p-3.5 rounded-xl border border-sky-200 hover:border-sky-400 transition-all flex flex-col justify-between space-y-2 shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-extrabold text-slate-900">{phone.product?.name}</span>
                          <span className="px-2 py-0.5 text-[9px] font-black bg-[#80ddff]/30 text-sky-900 rounded-full">
                            {phone.condition}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-sky-700 font-bold">IMEI: {phone.imei1}</div>
                        <div className="text-[11px] text-slate-500">{phone.color} • {phone.storage}</div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-sky-100">
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">TSH {phone.retailPrice?.toLocaleString()}</div>
                          <div className="text-[10px] text-amber-700">Floor: TSH {phone.minSellingPrice?.toLocaleString()}</div>
                        </div>

                        <button
                          onClick={() => addToCart(phone, 'PHONE')}
                          className="sky-btn-accent px-3 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accessories List */}
            {(catalogCategory !== 'PHONES') && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  <Package className="w-4 h-4 text-purple-600" /> Accessories & Gadgets ({availableAccessories.length}):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableAccessories.map((acc) => (
                    <div
                      key={acc.id}
                      className="bg-white p-3.5 rounded-xl border border-sky-200 hover:border-sky-400 transition-all flex flex-col justify-between space-y-2 shadow-sm"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{acc.name}</div>
                        <div className="text-[10px] text-slate-500">{acc.category?.name}</div>
                      </div>

                      {acc.hasVariants ? (
                        <div className="space-y-1.5">
                          {acc.variants?.map((v) => (
                            <div key={v.id} className="flex items-center justify-between text-[11px] bg-sky-50 p-1.5 rounded-lg border border-sky-100">
                              <span>{v.color || v.style || 'Variant'}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">TSH {v.price?.toLocaleString()}</span>
                                <button
                                  onClick={() => addToCart(acc, 'ACCESSORY', v)}
                                  className="px-2 py-0.5 bg-[#0284c7] text-white rounded font-bold text-[10px]"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-sky-100">
                          <div className="text-sm font-extrabold text-slate-900">TSH {acc.basePrice?.toLocaleString()}</div>
                          <button
                            onClick={() => addToCart(acc, 'ACCESSORY')}
                            className="sky-btn-accent px-3 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Cart, Customer Info & Split Payment Checkout (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-sky-200 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Customer Picker */}
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">Customer Details:</span>
                <span className="text-[10px] text-sky-700 font-bold">Walk-in / Reg</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={selectedCustomer.name}
                  onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value })}
                  className="bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Phone (07...)"
                  value={selectedCustomer.phone}
                  onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })}
                  className="bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div>
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 mb-2">
                <span>Active Cart Items ({cart.length}):</span>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-[10px] text-rose-600 font-bold hover:underline">
                    Clear Cart
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-sky-200 rounded-xl text-slate-400 text-xs">
                  Cart is empty. Scan barcode or click "+ Add" to add items.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.cartId} className="p-3 bg-sky-50/80 rounded-xl border border-sky-200 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">{item.productName}</div>
                          {item.type === 'PHONE' ? (
                            <div className="text-[10px] font-mono text-sky-800 font-bold">IMEI: {item.imei1}</div>
                          ) : (
                            <div className="text-[10px] text-slate-500">
                              {item.color} {item.size}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.cartId)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          {item.type !== 'PHONE' && (
                            <>
                              <button
                                onClick={() => updateQuantity(item.cartId, -1)}
                                className="h-6 w-6 rounded bg-white border border-sky-200 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="font-extrabold text-slate-900 px-1">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.cartId, 1)}
                                className="h-6 w-6 rounded bg-white border border-sky-200 flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </>
                          )}
                        </div>

                        <div className="text-right font-extrabold text-slate-900">
                          TSH {((item.unitPrice - item.discount) * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Split Payments Breakdown */}
            <div className="p-3 bg-white border border-sky-200 rounded-xl space-y-2">
              <div className="text-xs font-extrabold text-slate-900">Split Payment Methods:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block">💵 Cash (TSH):</label>
                  <input
                    type="number"
                    value={paymentSplit.CASH || ''}
                    onChange={(e) => setPaymentSplit({ ...paymentSplit, CASH: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-sky-50 border border-sky-200 rounded px-2 py-1 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block">📱 M-Pesa (TSH):</label>
                  <input
                    type="number"
                    value={paymentSplit.MPESA || ''}
                    onChange={(e) => setPaymentSplit({ ...paymentSplit, MPESA: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-sky-50 border border-sky-200 rounded px-2 py-1 text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Trade-In Voucher Payment Row */}
              <div className="pt-1 border-t border-sky-100 space-y-1">
                <label className="text-[10px] text-sky-800 font-extrabold flex items-center justify-between">
                  <span>Kubadilishana (TSH)</span>
                  {voucherCode && <span className="font-mono text-[9px] bg-sky-100 text-sky-900 px-1.5 rounded">{voucherCode}</span>}
                </label>
                <div className="grid grid-cols-12 gap-1 text-xs">
                  <input
                    type="number"
                    placeholder="Voucher Value Amount"
                    value={paymentSplit.TRADEIN_VOUCHER || ''}
                    onChange={(e) => setPaymentSplit({ ...paymentSplit, TRADEIN_VOUCHER: parseFloat(e.target.value) || 0 })}
                    className="col-span-6 bg-emerald-50 border border-emerald-300 rounded px-2 py-1 text-emerald-900 font-black"
                  />
                  <input
                    type="text"
                    placeholder="Voucher Code (UPGRADE-...)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="col-span-6 bg-sky-50 border border-sky-200 rounded px-2 py-1 text-slate-900 font-mono text-[11px]"
                  />
                </div>
              </div>

              {paymentSplit.MPESA > 0 && (
                <input
                  type="text"
                  placeholder="M-Pesa Ref Code (e.g. QX89211029)"
                  value={mpesaRef}
                  onChange={(e) => setMpesaRef(e.target.value)}
                  className="w-full bg-sky-50 border border-sky-200 rounded px-2 py-1 text-xs text-slate-900 font-mono"
                />
              )}
            </div>
          </div>

          {/* Checkout Totals & Buttons */}
          <div className="border-t border-sky-200 pt-4 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">TSH {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount Total:</span>
                <span className="font-bold text-amber-700">- TSH {discountTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-sky-100">
                <span>GRAND TOTAL DUE:</span>
                <span className="text-[#0284c7]">TSH {grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-700">
                <span>Paid / Change Due:</span>
                <span>
                  Paid: TSH {totalPaid.toLocaleString()} | Change: TSH {changeDue.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleCheckout(true)}
                className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs border border-slate-300"
              >
                Proforma Quote PDF
              </button>

              <button
                onClick={() => handleCheckout(false)}
                disabled={checkingOut}
                className="sky-btn-main px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                <span>{checkingOut ? 'Inahifadhi...' : 'Complete & Print'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Accessory Combo Bundle Recommendation Popup Modal */}
      {bundlePopupItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-sky-400 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-sky-800">
              <Sparkles className="w-5 h-5 text-sky-600" />
              <h3 className="text-base font-black">Smart Accessory Combo Bundle Deal!</h3>
            </div>
            <p className="text-xs text-slate-600">
              Customer selected <span className="font-extrabold text-slate-900">{bundlePopupItem.product?.name}</span>. Suggest adding these high-margin accessories:
            </p>

            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>• Privacy Glass Protector</span>
                <span>TSH 15,000</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>• MagSafe Silicone Case (Black)</span>
                <span>TSH 25,000</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>• Anker 20W Fast Charger</span>
                <span>TSH 45,000</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBundlePopupItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Skip Combo
              </button>
              <button
                onClick={() => {
                  // Add first available accessory with variants
                  if (products[1]) addToCart(products[1], 'ACCESSORY');
                  setBundlePopupItem(null);
                }}
                className="sky-btn-main px-4 py-2 rounded-xl text-xs font-bold"
              >
                Add Combo Bundle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager PIN Override Modal */}
      {showManagerPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-400 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Manager Discount PIN Override</h3>
            <p className="text-xs text-slate-600">
              Item selling price is below cashier floor limit. Enter Manager 4-digit PIN to authorize:
            </p>

            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={managerPinInput}
              onChange={(e) => setManagerPinInput(e.target.value)}
              className="w-32 bg-sky-50 border-2 border-sky-300 rounded-xl px-4 py-2 text-center text-lg font-mono font-extrabold focus:outline-none"
            />

            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setShowManagerPinModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button onClick={verifyManagerPin} className="sky-btn-main px-4 py-2 rounded-xl text-xs font-bold">
                Authorize Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Thermal Receipt & Invoice Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Thermal Receipt Print Preview</h3>
              <button onClick={() => setShowReceiptModal(null)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Graphic Box */}
            <div id="thermal-receipt" className="bg-white p-5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 space-y-3">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="text-base font-black uppercase">PHONEVAULT PRO SHOP</div>
                <div className="text-[10px] text-slate-600">Dar es Salaam, Tanzania • Tel: +255 700 000 000</div>
                <div className="text-[10px] font-bold text-slate-700 mt-1">TIN: 104-992-102 • VRN: 40019281</div>
                <div className="text-[11px] font-extrabold text-sky-800 mt-1">INVOICE #: {showReceiptModal.invoiceNumber}</div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                {showReceiptModal.items?.map((item) => (
                  <div key={item.id} className="text-[11px]">
                    <div className="font-bold flex justify-between">
                      <span>{item.product?.name}</span>
                      <span>TSH {item.lineTotal?.toLocaleString()}</span>
                    </div>
                    {item.phoneUnit && (
                      <div className="text-[10px] text-slate-600">IMEI: {item.phoneUnit.imei1} ({item.phoneUnit.warrantyMonths}m Warranty)</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between font-extrabold">
                  <span>TOTAL DUE:</span>
                  <span>TSH {showReceiptModal.grandTotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>PAID AMOUNT:</span>
                  <span>TSH {showReceiptModal.amountPaid?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>CHANGE GIVEN:</span>
                  <span>TSH {showReceiptModal.changeDue?.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-500 pt-2">
                *** THANK YOU FOR SHOPPING WITH US! ***
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowReceiptModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                Close
              </button>
              <button onClick={() => window.print()} className="sky-btn-main px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print Thermal Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
