import 'dart:async';
import 'dart:convert';
import 'dart:isolate';
import 'dart:math';

import 'package:flutter/foundation.dart';

import 'cloud_sync.dart';
import 'vault_sync.dart';
import 'lang.dart';
import 'money.dart';
import 'pictures.dart';
import 'receipt_pdf.dart';
import 'shop_db.dart';
import 'whatsapp.dart';

class StaffSession {
  StaffSession({
    required this.id,
    required this.name,
    required this.role,
    this.seeStock = false,
    this.seeCost = false,
    this.seeAllSales = false,
    this.seeDebts = false,
    this.seeCustomers = false,
    this.seeReports = false,
    this.editStock = false,
    this.seeAnalysis = false,
  });

  factory StaffSession.fromRow(Map<String, Object?> row) {
    final owner = row['role'] == 'OWNER';
    bool on(String key, {bool whenMissing = false}) {
      if (owner) return true;
      if (row[key] == null) return whenMissing;
      return asInt(row[key]) == 1;
    }

    return StaffSession(
      id: row['id'] as String,
      name: row['name'] as String,
      role: row['role'] as String,
      seeStock: on('perm_stock', whenMissing: true),
      seeCost: on('perm_cost'),
      seeAllSales: on('perm_history'),
      seeDebts: on('perm_debts', whenMissing: true),
      seeCustomers: on('perm_customers', whenMissing: true),
      seeReports: on('perm_reports'),
      editStock: on('perm_edit'),
      seeAnalysis: on('perm_analysis'),
    );
  }

  final String id;
  final String name;
  final String role;
  final bool seeStock;
  final bool seeCost;
  final bool seeAllSales;
  final bool seeDebts;
  final bool seeCustomers;
  final bool seeReports;
  final bool editStock;
  final bool seeAnalysis;
  bool get isOwner => role == 'OWNER';
}

class CheckoutResult {
  CheckoutResult.ok({
    required this.invoice,
    required this.total,
    required this.paid,
    required this.change,
    required this.balance,
    required this.method,
    required this.customer,
    required this.cashier,
    required this.lines,
  })  : success = true,
        message = '';

  CheckoutResult.error(this.message)
      : success = false,
        invoice = '',
        total = 0,
        paid = 0,
        change = 0,
        balance = 0,
        method = '',
        customer = '',
        cashier = '',
        lines = const [];

  final bool success;
  final String message;
  final String invoice;
  final double total;
  final double paid;
  final double change;
  final double balance;
  final String method;
  final String customer;
  final String cashier;
  final List<CartLine> lines;
}

class Trend {
  Trend(this.days, this.totals, this.profit);
  final List<DateTime> days;
  final List<double> totals;
  final List<double> profit;
}

class TopItem {
  TopItem(this.name);
  final String name;
  int qty = 0;
  double total = 0;
}

class HourBar {
  HourBar(this.hour, this.total);
  final int hour;
  final double total;
}

class ShopPeriod {
  ShopPeriod(this.start, this.end, this.label);
  final DateTime start;
  final DateTime end;
  final String label;

  static ShopPeriod lastDays(int count) {
    final today = DateTime.now();
    final end = DateTime(today.year, today.month, today.day).add(const Duration(days: 1));
    return ShopPeriod(end.subtract(Duration(days: count)), end, 'Siku $count');
  }

  static ShopPeriod lastWeek() {
    final today = DateTime.now();
    final day = DateTime(today.year, today.month, today.day);
    final monday = day.subtract(Duration(days: day.weekday - 1));
    return ShopPeriod(monday.subtract(const Duration(days: 7)), monday, 'Wiki iliyopita');
  }

  static ShopPeriod thisMonth() {
    final now = DateTime.now();
    return ShopPeriod(DateTime(now.year, now.month, 1), DateTime(now.year, now.month + 1, 1), 'Mwezi huu');
  }

  static ShopPeriod lastMonth() {
    final now = DateTime.now();
    return ShopPeriod(DateTime(now.year, now.month - 1, 1), DateTime(now.year, now.month, 1), 'Mwezi uliopita');
  }

  static ShopPeriod thisYear() {
    final now = DateTime.now();
    return ShopPeriod(DateTime(now.year, 1, 1), DateTime(now.year + 1, 1, 1), 'Mwaka huu');
  }

  static ShopPeriod lastYear() {
    final now = DateTime.now();
    return ShopPeriod(DateTime(now.year - 1, 1, 1), DateTime(now.year, 1, 1), 'Mwaka uliopita');
  }

  static ShopPeriod between(DateTime from, DateTime to) {
    final a = DateTime(from.year, from.month, from.day);
    final b = DateTime(to.year, to.month, to.day);
    final start = a.isBefore(b) ? a : b;
    final last = a.isBefore(b) ? b : a;
    return ShopPeriod(start, last.add(const Duration(days: 1)), '${formatDay(start)} – ${formatDay(last)}');
  }
}

class GoodsLine {
  GoodsLine(this.name, {this.phone = false});
  final String name;
  final bool phone;
  int qty = 0;
  double revenue = 0;
  double cost = 0;
  double get profit => revenue - cost;
}

class SideTake {
  double sales = 0;
  double cost = 0;
  double returned = 0;
  double get profit => sales - cost - returned;
}

class ShopLedger {
  ShopLedger({
    required this.phones,
    required this.goods,
    required this.phoneFaults,
    required this.goodsFaults,
    required this.faultSales,
  });

  final SideTake phones;
  final SideTake goods;
  final double phoneFaults;
  final double goodsFaults;
  final double faultSales;

  double get faults => phoneFaults + goodsFaults;
  double get sales => phones.sales + goods.sales;
  double get cost => phones.cost + goods.cost;
  double get returned => phones.returned + goods.returned;
  double get phoneProfit => phones.profit;
  double get goodsProfit => goods.profit;
  double get faultProfit => faultSales - faults;
  double get shopProfit => phoneProfit + goodsProfit + faultProfit;
}

class PeriodBooks {
  PeriodBooks({
    required this.sales,
    required this.returnsTotal,
    required this.cost,
    required this.receipts,
    required this.returnCount,
    required this.days,
    required this.dayTotals,
    required this.lines,
    required this.cash,
    required this.lipa,
  });

  final double sales;
  final double returnsTotal;
  final double cost;
  final int receipts;
  final int returnCount;
  final List<DateTime> days;
  final List<double> dayTotals;
  final List<GoodsLine> lines;
  final double cash;
  final double lipa;
  double get net => sales - returnsTotal;
  double get profit => net - cost;
}

class ShopStore extends ChangeNotifier {
  ShopStore(this.db);
  final ShopDb db;

  StaffSession? session;
  bool revealSensitive = false;
  bool holdLock = false;
  DateTime lastTouch = DateTime.now();
  VoidCallback? showTill;
  String shopName = 'PhoneVault';
  String lipaNumber = '';
  String shopLocation = '';
  String shopPhone = '';
  String receiptFooter = '';
  Uint8List? shopLogo;
  bool remindersOffered = false;
  String cloudUrl = '';
  String syncToken = '';
  String? syncDetail;
  bool syncing = false;
  bool liveSync = false;
  String liveSyncText = '';
  String lang = 'sw';
  bool _listening = false;
  List<Map<String, Object?>> categories = [];
  List<Map<String, Object?>> products = [];
  List<Map<String, Object?>> phones = [];
  List<Map<String, Object?>> customers = [];
  List<Map<String, Object?>> sales = [];
  List<Map<String, Object?>> saleItems = [];
  List<Map<String, Object?>> debts = [];
  List<Map<String, Object?>> payments = [];
  List<Map<String, Object?>> returns = [];
  List<Map<String, Object?>> returnItems = [];
  List<Map<String, Object?>> notes = [];
  List<Map<String, Object?>> staff = [];
  List<Map<String, Object?>> faults = [];
  List<Map<String, Object?>> wings = [];
  List<Map<String, Object?>> wingItems = [];
  final List<CartLine> cart = [];
  Map<String, Map<String, Object?>> _saleById = {};
  Map<String, Map<String, Object?>> _returnById = {};
  Map<String, Map<String, Object?>> _itemById = {};
  Map<String, List<Map<String, Object?>>> _itemsBySale = {};
  Map<String, double> _laterBySale = {};
  Map<String, String> _saleOfDebt = {};
  Map<String, int> _returnedQty = {};
  Map<String, double> _profitOfSale = {};

  bool get isOwner => session?.isOwner == true;
  bool get seeStock => isOwner || session?.seeStock == true;
  bool get seeCost => isOwner || session?.seeCost == true;
  bool get seeAllSales => isOwner || session?.seeAllSales == true;
  bool get seeDebts => isOwner || session?.seeDebts == true;
  bool get seeCustomers => isOwner || session?.seeCustomers == true;
  bool get seeReports => isOwner || session?.seeReports == true;
  bool get editStock => isOwner || session?.editStock == true;
  bool get seeAnalysis => isOwner || session?.seeAnalysis == true;
  int get unread => visibleNotes.where((row) => asInt(row['read']) == 0).length;

  List<Map<String, Object?>> get visibleNotes {
    if (isOwner) return notes;
    final mine = session?.name ?? '';
    return [
      for (final note in notes)
        if (_noteVisible(note, mine)) note,
    ];
  }

  bool _noteVisible(Map<String, Object?> note, String mine) {
    final kind = '${note['kind']}';
    if (kind.startsWith('STAFF') || kind.startsWith('VOID')) return false;
    if (kind.startsWith('LOW')) return seeStock;
    if (kind.startsWith('DEBT') || kind.startsWith('PAY')) return seeDebts;
    if (kind.startsWith('SALE') || kind.startsWith('RETURN')) {
      if (seeAllSales) return true;
      return mine.isNotEmpty && '${note['body']}'.contains(mine);
    }
    if (kind.startsWith('WING')) return true;
    return false;
  }
  double get cartTotal => cart.fold(0, (sum, line) => sum + line.lineTotal);

  List<Map<String, Object?>> get liveSales => sales.where((row) => asInt(row['voided']) == 0).toList();

  List<Map<String, Object?>> get visibleSales {
    if (seeAllSales) return liveSales;
    final id = session?.id;
    return liveSales.where((row) => row['cashier_id'] == id).toList();
  }

  bool _returnVisible(Map<String, Object?> row) {
    if (seeAllSales) return true;
    final saleIds = visibleSales.map((sale) => sale['id']).toSet();
    return saleIds.contains(row['sale_id']);
  }

  PaperShop get paperShop => PaperShop(
        name: shopName,
        location: shopLocation,
        phone: shopPhone,
        lipa: lipaNumber,
        footer: receiptFooter,
        logo: shopLogo,
      );

  Uint8List? photoOf(Object? id) {
    for (final person in staff) {
      if (person['id'] == id) return photoBytes(person['photo']);
    }
    return null;
  }

  Uint8List? get myPhoto => photoOf(session?.id);

  List<Map<String, Object?>> dueReminders() {
    final now = DateTime.now();
    return openDebts.where((debt) {
      if (!isTzPhone('${debt['customer_phone']}')) return false;
      final due = DateTime.tryParse('${debt['due_at']}')?.toLocal();
      final term = asInt(debt['term_days']);
      late final DateTime windowStart;
      if (due != null && term > 0) {
        final lead = term >= 30 ? 3 : 1;
        final day = DateTime(due.year, due.month, due.day);
        windowStart = day.subtract(Duration(days: lead));
        if (now.isBefore(windowStart)) return false;
      } else {
        final opened = DateTime.tryParse('${debt['opened_at']}')?.toLocal();
        if (opened == null || now.difference(opened).inDays < 30) return false;
        windowStart = DateTime(opened.year, opened.month, opened.day).add(const Duration(days: 30));
      }
      final last = DateTime.tryParse('${debt['last_reminded']}')?.toLocal();
      if (last != null && !last.isBefore(windowStart)) return false;
      return true;
    }).toList();
  }

  bool _phoneRow(Map<String, Object?> row) => '${row['phone_id'] ?? ''}'.trim().isNotEmpty;

  GoodsLine _goodsLine(Map<String, GoodsLine> goods, Map<String, Object?> item) {
    final phone = _phoneRow(item);
    final name = '${item['name']}';
    return goods.putIfAbsent('$phone|$name', () => GoodsLine(name, phone: phone));
  }

  bool _inside(DateTime? when, DateTime start, DateTime end) => when != null && !when.isBefore(start) && when.isBefore(end);

  void _bind() {
    _saleById = {for (final row in sales) '${row['id']}': row};
    _returnById = {for (final row in returns) '${row['id']}': row};
    _itemById = {for (final row in saleItems) '${row['id']}': row};
    _itemsBySale = {};
    _profitOfSale = {};
    for (final row in saleItems) {
      final saleId = '${row['sale_id']}';
      (_itemsBySale[saleId] ??= []).add(row);
      final qty = asInt(row['qty']);
      _profitOfSale[saleId] = (_profitOfSale[saleId] ?? 0) + (asDouble(row['price']) - asDouble(row['cost'])) * qty;
    }
    _saleOfDebt = {for (final debt in debts) '${debt['id']}': '${debt['sale_id'] ?? ''}'};
    _laterBySale = {};
    for (final pay in payments) {
      final saleId = _saleOfDebt['${pay['debt_id']}'];
      if (saleId == null || saleId.isEmpty) continue;
      _laterBySale[saleId] = (_laterBySale[saleId] ?? 0) + asDouble(pay['amount']);
    }
    _returnedQty = {};
    for (final row in returnItems) {
      final id = '${row['sale_item_id']}';
      _returnedQty[id] = (_returnedQty[id] ?? 0) + asInt(row['qty']);
    }
  }

  Map<String, Object?>? _saleOf(Object? id) => id == null ? null : _saleById['$id'];

  Map<String, Object?>? _returnOf(Object? id) => id == null ? null : _returnById['$id'];

  Map<String, Object?>? _itemOf(Object? id) => id == null ? null : _itemById['$id'];

  double faultCostBetween(DateTime start, DateTime end) => ledgerBetween(start, end).faults;

  ShopLedger ledgerBetween(DateTime start, DateTime end) {
    final phones = SideTake();
    final goods = SideTake();
    var faultSales = 0.0;
    final allowed = visibleSales.map((sale) => sale['id']).toSet();
    for (final item in saleItems) {
      if (!allowed.contains(item['sale_id'])) continue;
      final sale = _saleOf(item['sale_id']);
      if (sale == null || asInt(sale['voided']) == 1) continue;
      if (!_inside(_when(sale), start, end)) continue;
      final qty = asInt(item['qty']);
      if (asInt(item['faulty']) == 1) {
        faultSales += asDouble(item['price']) * qty;
        continue;
      }
      final side = _phoneRow(item) ? phones : goods;
      side.sales += asDouble(item['price']) * qty;
      side.cost += asDouble(item['cost']) * qty;
    }
    for (final item in returnItems) {
      final parent = _returnOf(item['return_id']);
      if (parent == null || !_returnVisible(parent)) continue;
      if (!_inside(_when(parent), start, end)) continue;
      final qty = asInt(item['qty']);
      final origin = _itemOf(item['sale_item_id']);
      if (origin != null && asInt(origin['faulty']) == 1) {
        faultSales -= asDouble(item['price']) * qty;
        continue;
      }
      final side = _phoneRow(item) ? phones : goods;
      side.returned += (asDouble(item['price']) - asDouble(item['cost'])) * qty;
    }
    var phoneFaults = 0.0;
    var goodsFaults = 0.0;
    for (final row in faults) {
      if (!_inside(_when(row), start, end)) continue;
      final cost = asDouble(row['cost']) * asInt(row['qty']);
      if (_phoneRow(row)) {
        phoneFaults += cost;
      } else {
        goodsFaults += cost;
      }
    }
    return ShopLedger(phones: phones, goods: goods, phoneFaults: phoneFaults, goodsFaults: goodsFaults, faultSales: faultSales);
  }

  double returnMarginBetween(DateTime start, DateTime end) {
    var total = 0.0;
    for (final item in returnItems) {
      final parent = _returnOf(item['return_id']);
      if (parent == null) continue;
      final when = _when(parent);
      if (when == null || when.isBefore(start) || !when.isBefore(end)) continue;
      total += (asDouble(item['price']) - asDouble(item['cost'])) * asInt(item['qty']);
    }
    return total;
  }

  int returnedQty(String saleItemId) => _returnedQty[saleItemId] ?? 0;

  Future<ReturnOutcome> returnSale({
    required String saleId,
    required String reason,
    required List<ReturnPick> picks,
  }) async {
    if (session == null) return ReturnOutcome.error('Ingia kwanza.');
    final sale = _saleOf(saleId);
    if (sale == null) return ReturnOutcome.error('Risiti haipo.');
    if (!seeAllSales && sale['cashier_id'] != session?.id) return ReturnOutcome.error('Huna ruhusa ya kurudisha mauzo haya.');
    final outcome = await db.returnGoods(saleId: saleId, reason: reason, actor: session!.name, picks: picks);
    if (outcome.error != null) return outcome;
    await load();
    syncShop();
    return outcome;
  }

  Future<String?> sendDebtReminder(Map<String, Object?> debt) async {
    if (!isTzPhone('${debt['customer_phone']}')) return 'Namba ianze na 0 na iwe tarakimu 10.';
    final opened = DateTime.tryParse('${debt['opened_at']}')?.toLocal() ?? DateTime.now();
    final sale = _saleOf(debt['sale_id']);
    final bytes = await buildDebtNotice(
      shop: paperShop,
      customer: '${debt['customer_name']}',
      phone: '${debt['customer_phone']}',
      invoice: '${sale?['invoice'] ?? 'Deni'}',
      opened: opened,
      days: DateTime.now().difference(opened).inDays,
      balance: asDouble(debt['balance']),
    );
    final error = await sendWhatsappPdf(phone: '${debt['customer_phone']}', bytes: bytes, filename: 'ukumbusho-${debt['id']}.png');
    if (error != null) return error;
    await db.markReminded('${debt['id']}');
    await load();
    syncShop();
    return null;
  }

  Future<String?> markReminded(String debtId) async {
    await db.markReminded(debtId);
    await load();
    syncShop();
    return null;
  }

  double _takenAtSale(Map<String, Object?> sale) {
    return max(0.0, asDouble(sale['paid']) - (_laterBySale['${sale['id']}'] ?? 0));
  }

  List<Map<String, Object?>> _collectionsIn(bool Function(DateTime when) inside) {
    final visible = visibleSales.map((sale) => '${sale['id']}').toSet();
    final rows = <Map<String, Object?>>[];
    for (final pay in payments) {
      final saleId = _saleOfDebt['${pay['debt_id']}'];
      if (saleId == null || !visible.contains(saleId)) continue;
      final when = _when(pay);
      if (when == null || !inside(when)) continue;
      rows.add(pay);
    }
    return rows;
  }

  PeriodBooks booksFor(ShopPeriod period) {
    final visibleIds = visibleSales.map((sale) => sale['id']).toSet();
    final goods = <String, GoodsLine>{};
    var salesTotal = 0.0;
    var receipts = 0;
    var cash = 0.0;
    var lipa = 0.0;
    for (final sale in visibleSales) {
      final when = _when(sale);
      if (when == null || when.isBefore(period.start) || !when.isBefore(period.end)) continue;
      salesTotal += asDouble(sale['total']);
      receipts += 1;
      final method = '${sale['method']}';
      final taken = _takenAtSale(sale);
      if (method == 'CASH') cash += taken;
      if (method == 'LIPA') lipa += taken;
    }
    for (final pay in _collectionsIn((when) => !when.isBefore(period.start) && when.isBefore(period.end))) {
      final method = '${pay['method']}';
      if (method == 'CASH') cash += asDouble(pay['amount']);
      if (method == 'LIPA') lipa += asDouble(pay['amount']);
    }
    for (final item in saleItems) {
      if (!visibleIds.contains(item['sale_id'])) continue;
      final sale = _saleOf(item['sale_id']);
      if (sale == null) continue;
      final when = _when(sale);
      if (when == null || when.isBefore(period.start) || !when.isBefore(period.end)) continue;
      if (asInt(sale['voided']) == 1 || asInt(item['faulty']) == 1) continue;
      final row = _goodsLine(goods, item);
      final qty = asInt(item['qty']);
      row.qty += qty;
      row.revenue += asDouble(item['price']) * qty;
      row.cost += asDouble(item['cost']) * qty;
    }
    var returnsTotal = 0.0;
    var returnCount = 0;
    for (final row in returns) {
      if (!_returnVisible(row)) continue;
      final when = _when(row);
      if (when == null || when.isBefore(period.start) || !when.isBefore(period.end)) continue;
      returnsTotal += asDouble(row['total']);
      returnCount += 1;
      final sale = _saleOf(row['sale_id']);
      final refund = asDouble(row['refund']);
      if (sale != null && refund > 0) {
        final method = '${sale['method']}';
        if (method == 'CASH') cash -= refund;
        if (method == 'LIPA') lipa -= refund;
      }
    }
    for (final item in returnItems) {
      final parent = _returnOf(item['return_id']);
      if (parent == null || !_returnVisible(parent)) continue;
      final when = _when(parent);
      if (when == null || when.isBefore(period.start) || !when.isBefore(period.end)) continue;
      final origin = _itemOf(item['sale_item_id']);
      if (origin != null && asInt(origin['faulty']) == 1) continue;
      final row = _goodsLine(goods, item);
      final qty = asInt(item['qty']);
      row.qty -= qty;
      row.revenue -= asDouble(item['price']) * qty;
      row.cost -= asDouble(item['cost']) * qty;
    }
    final span = period.end.difference(period.start).inDays;
    final days = <DateTime>[];
    final totals = <double>[];
    if (span <= 62) {
      for (var i = 0; i < span; i++) {
        days.add(period.start.add(Duration(days: i)));
        totals.add(0);
      }
    } else {
      var cursor = DateTime(period.start.year, period.start.month, 1);
      while (cursor.isBefore(period.end)) {
        days.add(cursor);
        totals.add(0);
        cursor = DateTime(cursor.year, cursor.month + 1, 1);
      }
    }
    void addDay(DateTime when, double amount) {
      if (days.isEmpty) return;
      if (span <= 62) {
        final index = DateTime(when.year, when.month, when.day).difference(period.start).inDays;
        if (index >= 0 && index < totals.length) totals[index] += amount;
      } else {
        final index = days.indexWhere((day) => day.year == when.year && day.month == when.month);
        if (index >= 0) totals[index] += amount;
      }
    }
    for (final sale in visibleSales) {
      final when = _when(sale);
      if (when == null || when.isBefore(period.start) || !when.isBefore(period.end)) continue;
      addDay(when, asDouble(sale['total']));
    }
    for (final row in returns) {
      if (!_returnVisible(row)) continue;
      final when = _when(row);
      if (when == null || when.isBefore(period.start) || !when.isBefore(period.end)) continue;
      addDay(when, -asDouble(row['total']));
    }
    final lines = goods.values.where((row) => row.qty != 0 || row.revenue != 0).toList()
      ..sort((a, b) => b.revenue.compareTo(a.revenue));
    return PeriodBooks(
      sales: salesTotal,
      returnsTotal: returnsTotal,
      cost: lines.fold<double>(0, (sum, row) => sum + row.cost),
      receipts: receipts,
      returnCount: returnCount,
      days: days,
      dayTotals: totals,
      lines: lines,
      cash: cash,
      lipa: lipa,
    );
  }

  List<Map<String, Object?>> get openDebts => debts.where((row) => row['status'] == 'OPEN').toList();

  double get debtTotal => openDebts.fold(0, (sum, row) => sum + asDouble(row['balance']));

  int get phonesInStock => phones.where((row) => row['status'] == 'IN_STOCK').length;

  int get lowStockCount => products.where((row) {
        return asInt(row['active']) == 1 && asInt(row['stock']) <= asInt(row['reorder_level']);
      }).length;

  double get retailValue {
    var total = 0.0;
    for (final product in products) {
      if (asInt(product['active']) == 0) continue;
      total += asDouble(product['price']) * asInt(product['stock']);
    }
    for (final phone in phones) {
      if (phone['status'] == 'IN_STOCK') total += asDouble(phone['price']);
    }
    return total;
  }

  double get phoneCapital {
    var total = 0.0;
    for (final phone in phones) {
      final status = '${phone['status']}';
      if (status == 'IN_STOCK' || status == 'WING') total += asDouble(phone['cost']);
    }
    return total;
  }

  double get goodsCapital {
    var total = 0.0;
    for (final product in products) {
      if (asInt(product['active']) == 0) continue;
      total += asDouble(product['cost']) * asInt(product['stock']);
    }
    return total;
  }

  double get faultCapital {
    var total = 0.0;
    for (final phone in phones) {
      if (phone['status'] == 'FAULTY') total += asDouble(phone['cost']);
    }
    for (final product in products) {
      if (asInt(product['active']) == 0) continue;
      total += asDouble(product['cost']) * asInt(product['fault_qty']);
    }
    return total;
  }

  double get costValue => phoneCapital + goodsCapital;

  double get todayTotal {
    final gross = _sumOn(DateTime.now(), (sale) => asDouble(sale['total']));
    final today = DateTime.now();
    final back = returns.where((row) {
      final when = _when(row);
      return when != null && sameDay(when, today) && _returnVisible(row);
    }).fold<double>(0, (sum, row) => sum + asDouble(row['total']));
    return gross - back;
  }

  double get todayProfit {
    if (!seeCost) return 0;
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day);
    return ledgerBetween(start, start.add(const Duration(days: 1))).shopProfit;
  }

  int get pendingSync => sales.where((row) => asInt(row['voided']) == 0 && row['sync_status'] != 'SYNCED').length;

  String get syncLine {
    if (cloudUrl.isEmpty) return 'Mauzo yanaendelea bila mtandao. Cloud itasubiri anwani.';
    if (syncing) return 'Inasawazisha risiti $pendingSync...';
    if (pendingSync == 0) return 'Cloud imepokea risiti zote.';
    return 'Risiti $pendingSync ziko kwenye simu. Zitaenda cloud mtandao ukirudi.';
  }

  int get todayCount {
    final today = DateTime.now();
    return visibleSales.where((sale) {
      final when = _when(sale);
      return when != null && sameDay(when, today);
    }).length;
  }

  DateTime? historyHiddenUntil;
  Set<String> hiddenSales = {};
  Set<String> hiddenDebts = {};

  Future<void> hideHistory() async {
    final now = DateTime.now();
    historyHiddenUntil = now;
    await db.setMeta('history_hidden_until', now.toIso8601String());
    notifyListeners();
  }

  Future<void> hideSale(String id) async {
    hiddenSales = {...hiddenSales, id};
    await db.setMeta('history_hidden_sales', hiddenSales.join(','));
    notifyListeners();
  }

  Future<void> showHistory() async {
    historyHiddenUntil = null;
    hiddenSales = {};
    await db.setMeta('history_hidden_until', '');
    await db.setMeta('history_hidden_sales', '');
    notifyListeners();
  }

  Future<void> _saveHiddenDebts() async {
    await db.setMeta('debts_hidden', hiddenDebts.join(','));
    await db.bumpRevision();
    await load();
    syncShop();
  }

  Future<void> hideDebt(String id) async {
    hiddenDebts = {...hiddenDebts, id};
    await _saveHiddenDebts();
  }

  Future<void> hidePaidDebts() async {
    hiddenDebts = {...hiddenDebts, ...debts.where((row) => row['status'] == 'PAID').map((row) => '${row['id']}')};
    await _saveHiddenDebts();
  }

  Future<void> showDebts() async {
    hiddenDebts = {};
    await _saveHiddenDebts();
  }

  Future<String?> dropReturnedWing(String id) async {
    final error = await db.dropReturnedWing(id);
    if (error != null) return error;
    await load();
    return null;
  }

  Future<void> setLanguage(String code) async {
    lang = code == 'en' || code == 'ar' ? code : 'sw';
    Lang.i.apply(lang);
    await db.setMeta('ui_lang', lang);
    await db.bumpRevision();
    notifyListeners();
    syncShop();
  }

  Future<void> load() async {
    shopName = await db.meta('shop_name') ?? 'PhoneVault';
    lipaNumber = await db.meta('lipa_namba') ?? '';
    shopLocation = await db.meta('shop_location') ?? '';
    shopPhone = await db.meta('shop_phone') ?? '';
    receiptFooter = await db.meta('receipt_footer') ?? '';
    shopLogo = photoBytes(await db.meta('shop_logo'));
    cloudUrl = await db.meta('cloud_url') ?? '';
    syncToken = await db.meta('sync_token') ?? '';
    lang = await db.meta('ui_lang') ?? 'sw';
    historyHiddenUntil = DateTime.tryParse(await db.meta('history_hidden_until') ?? '');
    hiddenSales = (await db.meta('history_hidden_sales') ?? '').split(',').where((id) => id.isNotEmpty).toSet();
    hiddenDebts = (await db.meta('debts_hidden') ?? '').split(',').where((id) => id.isNotEmpty).toSet();
    Lang.i.apply(lang);
    _ensureListen();
    categories = await db.categories();
    products = await db.products();
    phones = await db.phones();
    customers = await db.customers();
    sales = await db.sales();
    saleItems = await db.saleItems();
    debts = await db.debts();
    payments = await db.allDebtPayments();
    returns = await db.returns();
    returnItems = await db.returnItems();
    faults = await db.faults();
    wings = await db.wings();
    wingItems = await db.wingItems();
    staff = await db.staff();
    await _syncLowNotes();
    await _queueDueNotes();
    notes = await db.notes();
    _bind();
    notifyListeners();
  }

  void lock() {
    cart.clear();
    session = null;
    revealSensitive = false;
    remindersOffered = false;
    notifyListeners();
  }

  void toggleSensitive() {
    if (!isOwner) return;
    revealSensitive = !revealSensitive;
    notifyListeners();
  }

  Future<String?> unlock(String staffId, String pin) async {
    final error = await _verifyPin(staffId, pin);
    if (error != null) return error;
    final person = await db.staffById(staffId);
    if (person == null) return 'Akaunti haipo.';
    session = StaffSession.fromRow(person);
    if (!session!.isOwner) {
      await db.addNote(
        title: 'Muuzaji ameingia',
        body: '${session!.name} amefungua duka.',
        kind: 'STAFF:${session!.id}:${DateTime.now().millisecondsSinceEpoch}',
      );
    }
    await load();
    return null;
  }

  Future<String?> createOwner(String name, String pin) async {
    final clean = name.trim();
    if (clean.isEmpty) return 'Weka jina la mmiliki.';
    if (!_fourDigits(pin)) return 'PIN iwe tarakimu 4.';
    final id = await db.insertStaff(name: clean, role: 'OWNER', pin: pin);
    await db.setMeta('owner_name', clean);
    await db.setMeta('shop_name', shopName);
    return unlock(id, pin);
  }

  Future<String?> confirmOwnerPin(String pin) async {
    if (!isOwner || session == null) return 'Hiki ni kwa mmiliki tu.';
    return _verifyPin(session!.id, pin);
  }

  void addPhone(Map<String, Object?> phone, {double? salePrice}) {
    if (phone['status'] != 'IN_STOCK') return;
    if (cart.any((line) => line.phoneId == phone['id'])) return;
    final price = salePrice ?? asDouble(phone['price']);
    if (price <= 0) return;
    cart.add(CartLine(
      name: '${phone['product_name']} ${phone['storage'] ?? ''}'.trim(),
      price: price,
      cost: asDouble(phone['cost']),
      qty: 1,
      imei: phone['imei'] as String?,
      phoneId: phone['id'] as String,
      warrantyMonths: asInt(phone['warranty_months']),
      warrantyDays: warrantySpan(phone),
      categoryName: 'Simu',
    ));
    notifyListeners();
  }

  String? addPhoneGroup(Map<String, Object?> product, {required double salePrice, required String imei, bool faulty = false}) {
    if (asInt(product['active']) == 0 || salePrice <= 0) return 'Andika bei ya kuuza.';
    final code = imei.trim();
    if (!RegExp(r'^\d{8,20}$').hasMatch(code)) return 'IMEI iwe tarakimu 8 hadi 20.';
    if (cart.any((line) => (line.imei ?? '') == code)) return 'IMEI hii tayari ipo.';
    final id = product['id'] as String;
    final stock = asInt(faulty ? product['fault_qty'] : product['stock']);
    final used = cart.where((line) => line.productId == id && line.faulty == faulty).fold<int>(0, (sum, line) => sum + line.qty);
    if (used >= stock) return 'Stoo ya ${product['name']} haitoshi.';
    cart.add(CartLine(
      name: '${product['name']} ${product['storage'] ?? ''}'.trim(),
      price: salePrice,
      cost: asDouble(product['cost']),
      qty: 1,
      imei: code,
      productId: id,
      warrantyMonths: asInt(product['warranty_months']),
      warrantyDays: warrantySpan(product),
      categoryName: faulty ? 'Matatizo' : 'Simu',
      faulty: faulty,
    ));
    notifyListeners();
    return null;
  }

  void addFaultPhone(Map<String, Object?> phone, {required double salePrice}) {
    if (phone['status'] != 'FAULTY' || salePrice <= 0) return;
    if (cart.any((line) => line.phoneId == phone['id'])) return;
    cart.add(CartLine(
      name: '${phone['product_name']} ${phone['storage'] ?? ''}'.trim(),
      price: salePrice,
      cost: asDouble(phone['cost']),
      qty: 1,
      imei: phone['imei'] as String?,
      phoneId: phone['id'] as String,
      warrantyDays: warrantySpan(phone),
      categoryName: 'Matatizo',
      faulty: true,
    ));
    notifyListeners();
  }

  void addFaultProduct(Map<String, Object?> product, {required double salePrice}) {
    if (asInt(product['active']) == 0 || salePrice <= 0) return;
    final id = product['id'] as String;
    final stock = asInt(product['fault_qty']);
    final existing = cart.where((line) => line.productId == id && line.faulty);
    final used = existing.fold<int>(0, (sum, line) => sum + line.qty);
    if (used >= stock) return;
    if (existing.isNotEmpty) {
      existing.first.qty += 1;
    } else {
      cart.add(CartLine(
        name: product['name'] as String,
        price: salePrice,
        cost: asDouble(product['cost']),
        qty: 1,
        productId: id,
        warrantyDays: warrantySpan(product),
        categoryName: 'Matatizo',
        faulty: true,
      ));
    }
    notifyListeners();
  }

  Future<void> remindOpenWings() async {
    if (session == null) return;
    final now = DateTime.now();
    final stamp = '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}${now.hour.toString().padLeft(2, '0')}';
    var added = false;
    for (final wing in wings.where((row) => row['status'] == 'OUT')) {
      final kind = 'WINGHOUR:${wing['id']}:$stamp';
      if (await db.hasNote(kind)) continue;
      final names = wingItems.where((row) => row['wing_id'] == wing['id'] && asInt(row['qty']) > asInt(row['returned_qty'])).map((row) => '${row['name']} x${asInt(row['qty']) - asInt(row['returned_qty'])}').join(', ');
      await db.addNote(
        title: 'Mawinga bado nje',
        body: '${wing['person_name']} haja rudisha${names.isEmpty ? '' : ': $names'}.',
        kind: kind,
      );
      added = true;
    }
    if (added) await load();
  }

  void addProduct(Map<String, Object?> product, {double? salePrice}) {
    if (asInt(product['active']) == 0) return;
    final id = product['id'] as String;
    final stock = asInt(product['stock']);
    final existing = cart.where((line) => line.productId == id);
    final used = existing.fold<int>(0, (sum, line) => sum + line.qty);
    if (used >= stock) return;
    if (existing.isNotEmpty) {
      existing.first.qty += 1;
    } else {
      final price = salePrice ?? asDouble(product['price']);
      if (price <= 0) return;
      cart.add(CartLine(
        name: product['name'] as String,
        price: price,
        cost: asDouble(product['cost']),
        qty: 1,
        productId: id,
        warrantyMonths: asInt(product['warranty_months']),
        warrantyDays: warrantySpan(product),
        categoryName: categoryOf(product),
      ));
    }
    notifyListeners();
  }

  void changeQty(CartLine line, int delta) {
    final next = line.qty + delta;
    if (next <= 0 || line.phoneId != null || (line.imei ?? '').isNotEmpty) return;
    if (line.productId != null) {
      final product = products.cast<Map<String, Object?>?>().firstWhere(
            (row) => row?['id'] == line.productId,
            orElse: () => null,
          );
      final cap = product == null ? 0 : asInt(line.faulty ? product['fault_qty'] : product['stock']);
      if (product == null || next > cap) return;
    }
    line.qty = next;
    notifyListeners();
  }

  void setLinePrice(CartLine line, double price) {
    if (price <= 0 || price > 100000000) return;
    line.price = price;
    notifyListeners();
  }

  Future<({Map<String, Object?>? item, String? error})> findCode(String code) async {
    final found = await db.findByCode(code);
    if (found == null) return (item: null, error: 'Hakuna bidhaa yenye msimbo huo.');
    return (item: found, error: null);
  }

  void removeLine(CartLine line) {
    cart.removeWhere((row) => row.uid == line.uid);
    notifyListeners();
  }

  void clearCart() {
    cart.clear();
    notifyListeners();
  }

  Future<String?> scan(String code) async {
    final found = await db.findByCode(code);
    if (found == null) return 'Hakuna bidhaa yenye msimbo huo.';
    if (found['kind'] == 'phone') {
      addPhone(found);
    } else {
      addProduct(found);
    }
    return null;
  }

  Future<CheckoutResult> checkout({
    required String customerName,
    required String customerPhone,
    required String method,
    required double amount,
    required String lipaRef,
    int termDays = 0,
    String termUnit = '',
  }) async {
    if (session == null) return CheckoutResult.error('Ingia kwanza.');
    if (cart.isEmpty) return CheckoutResult.error('Kikapu kiko tupu.');
    if (method != 'CASH' && method != 'LIPA' && method != 'DENI') return CheckoutResult.error('Chagua aina ya malipo.');
    final total = cartTotal;
    final handed = method == 'DENI' ? 0.0 : amount;
    if (handed < 0 || handed > 100000000) return CheckoutResult.error('Kiasi si sahihi.');
    final paying = method == 'LIPA' ? min(handed, total) : handed;
    final change = method == 'CASH' ? max(0.0, handed - total) : 0.0;
    if (method == 'LIPA' && paying > 0 && lipaNumber.trim().isEmpty) {
      return CheckoutResult.error('Weka Lipa Namba kwenye mipangilio kwanza.');
    }
    if (method == 'LIPA' && paying > 0 && lipaRef.trim().length < 3) {
      return CheckoutResult.error('Weka kumbukumbu ya Lipa.');
    }
    for (final line in cart) {
      if (line.phoneId == null) continue;
      Map<String, Object?>? unit;
      for (final row in phones) {
        if (row['id'] == line.phoneId) unit = row;
      }
      if (unit == null) continue;
      final floor = asDouble(unit['floor_price']);
      final base = floor > 0 ? floor : asDouble(unit['price']);
      if (line.price + 0.001 < base) return CheckoutResult.error('Bei ya ${line.name} iko chini ya sakafu.');
    }
    var name = customerName.trim();
    final phone = customerPhone.replaceAll(RegExp(r'\D'), '');
    if (name.isEmpty) name = phone.isEmpty ? 'Walk-in' : phone;
    final balance = max(0.0, total - paying);
    if (balance > 0.5 && !seeDebts) return CheckoutResult.error('Huna ruhusa ya madeni.');
    if (phone.isNotEmpty && !isTzPhone(phone)) {
      return CheckoutResult.error('Namba ianze na 0 na iwe tarakimu 10.');
    }
    if (balance > 0.5 && (!isTzPhone(phone) || name == 'Walk-in')) {
      return CheckoutResult.error('Deni linahitaji jina na namba ya simu ya mteja.');
    }
    if (balance > 0.5 && (termDays < 1 || termDays > 3600)) {
      return CheckoutResult.error('Weka muda anaokopa. Siku, wiki, au mwezi.');
    }
    if (method != 'DENI' && paying <= 0) return CheckoutResult.error('Weka kiasi kilicholipwa, au chagua Deni zima.');
    final lines = cart.map((line) => CartLine(
          name: line.name,
          price: line.price,
          cost: line.cost,
          qty: line.qty,
          imei: line.imei,
          phoneId: line.phoneId,
          productId: line.productId,
          warrantyMonths: line.warrantyMonths,
          warrantyDays: line.warrantyDays,
          categoryName: line.categoryName,
          faulty: line.faulty,
        )).toList();
    final number = await db.nextInvoiceNumber();
    final invoice = 'INV-${DateTime.now().year}-${number.toString().padLeft(4, '0')}';
    final id = DateTime.now().microsecondsSinceEpoch.toString();
    final error = await db.saveSale(
      id: id,
      invoice: invoice,
      customerName: name,
      customerPhone: phone,
      total: total,
      paid: min(paying, total),
      change: change,
      method: method,
      lipaRef: lipaRef.trim(),
      cashierId: session!.id,
      cashierName: session!.name,
      lines: lines,
      termDays: balance > 0.5 ? termDays : 0,
      termUnit: balance > 0.5 ? termUnit : '',
    );
    if (error != null) return CheckoutResult.error(error);
    cart.clear();
    await load();
    syncShop();
    pushPending();
    return CheckoutResult.ok(
      invoice: invoice,
      total: total,
      paid: min(paying, total),
      change: change,
      balance: balance,
      method: method,
      customer: name,
      cashier: session!.name,
      lines: lines,
    );
  }

  Future<({String? id, String? error, bool existed})> saveCategory(String name, {String kind = 'goods'}) async {
    final denied = _canEdit();
    if (denied != null) return (id: null, error: denied, existed: false);
    try {
      final saved = await db.saveCategory(name, kind: kind);
      if (saved.error != null) return saved;
      await load();
      syncShop();
      return saved;
    } catch (_) {
      return (id: null, error: 'Kundi halijahifadhiwa.', existed: false);
    }
  }

  Future<String?> deleteCategory(String id) async {
    final denied = _canEdit();
    if (denied != null) return denied;
    final error = await db.deleteCategory(id);
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> deleteCustomer(String id) async {
    if (!seeCustomers) return 'Huna ruhusa.';
    final error = await db.deleteCustomer(id);
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> addStock(String id, int extra) async {
    final denied = _canEdit();
    if (denied != null) return denied;
    final error = await db.addStock(id, extra, actor: session?.name ?? '');
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> saveAccessory({
    String? id,
    required String name,
    required String categoryId,
    required String brand,
    required double price,
    required double cost,
    required int stock,
    required String barcode,
    required int reorder,
    required int warranty,
    int faultQty = 0,
    String color = '',
    String size = '',
  }) async {
    final denied = _canEdit();
    if (denied != null) return denied;
    final error = await db.saveAccessory(
      id: id,
      name: name,
      categoryId: categoryId,
      brand: brand,
      price: price,
      cost: cost,
      stock: stock,
      barcode: barcode,
      reorder: reorder,
      warranty: warranty,
      faultQty: faultQty,
      color: color,
      size: size,
      actor: session?.name ?? '',
    );
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> savePhone({
    String? id,
    required String name,
    required String imei,
    required String color,
    required String storage,
    String ram = '',
    String screen = '',
    required String condition,
    required double price,
    required double cost,
    required double floor,
    required int warranty,
    bool faulty = false,
    String categoryId = '',
  }) async {
    final denied = _canEdit();
    if (denied != null) return denied;
    final error = await db.savePhone(
      id: id,
      name: name,
      imei: imei,
      color: color,
      storage: storage,
      ram: ram,
      screen: screen,
      condition: condition,
      price: price,
      cost: cost,
      floor: floor,
      warranty: warranty,
      faulty: faulty,
      categoryId: categoryId,
      actor: session?.name ?? '',
    );
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> savePhoneGroup({
    String? id,
    required String name,
    required String categoryId,
    required String color,
    required String storage,
    required String ram,
    required String screen,
    required String condition,
    required double price,
    required double cost,
    required int stock,
    required int reorder,
    required int warranty,
    int faultQty = 0,
  }) async {
    final denied = _canEdit();
    if (denied != null) return denied;
    final error = await db.savePhoneGroup(
      id: id,
      name: name,
      categoryId: categoryId,
      color: color,
      storage: storage,
      ram: ram,
      screen: screen,
      condition: condition,
      price: price,
      cost: cost,
      stock: stock,
      reorder: reorder,
      warranty: warranty,
      faultQty: faultQty,
      actor: session?.name ?? '',
    );
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> retireProduct(String id) async {
    final denied = _canEdit();
    if (denied != null) return denied;
    await db.setProductActive(id, false);
    await load();
    syncShop();
    return null;
  }

  Future<String?> deletePhone(String id) async {
    final denied = _canEdit();
    if (denied != null) return denied;
    final error = await db.deletePhone(id, actor: session?.name ?? '');
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> addCustomer(String name, String phone) async {
    if (!seeCustomers) return 'Huna ruhusa ya wateja.';
    if (name.trim().isEmpty) return 'Weka jina la mteja.';
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (!isTzPhone(digits)) return 'Namba ianze na 0 na iwe tarakimu 10.';
    await db.addCustomer(name, phone);
    await load();
    syncShop();
    return null;
  }

  Future<String?> payDebt({
    required String debtId,
    required double amount,
    required String method,
    required String note,
  }) async {
    if (!seeDebts) return 'Huna ruhusa ya madeni.';
    if (session == null) return 'Ingia kwanza.';
    final error = await db.payDebt(
      debtId: debtId,
      amount: amount,
      method: method,
      note: note.trim(),
      cashierName: session!.name,
    );
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> voidSale(String saleId) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    final error = await db.voidSale(saleId, actor: session?.name ?? '');
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> saveShop(
    String name,
    String lipa, {
    String location = '',
    String shopPhone = '',
    String footer = '',
  }) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    final cleanName = name.trim();
    final cleanLipa = lipa.replaceAll(RegExp(r'\s+'), '');
    final phoneDigits = shopPhone.replaceAll(RegExp(r'\D'), '');
    if (cleanName.isEmpty) return 'Weka jina la duka.';
    if (cleanLipa.isNotEmpty && !RegExp(r'^\d{5,15}$').hasMatch(cleanLipa)) {
      return 'Lipa Namba iwe tarakimu 5 hadi 15.';
    }
    if (phoneDigits.isNotEmpty && !isTzPhone(phoneDigits)) return 'Simu ya duka ianze na 0 na iwe tarakimu 10.';
    await db.setMeta('shop_name', cleanName);
    await db.setMeta('lipa_namba', cleanLipa);
    await db.setMeta('shop_location', location.trim());
    await db.setMeta('shop_phone', phoneDigits);
    await db.setMeta('receipt_footer', footer.trim());
    await db.bumpRevision();
    await load();
    syncShop();
    return null;
  }

  Future<String?> saveShopLogo(Uint8List? bytes) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    if (bytes == null) {
      await db.setMeta('shop_logo', '');
    } else {
      final jpg = await Isolate.run(() => preparePicture(bytes, maxSide: 720, square: false));
      if (jpg == null) return 'Picha haikusomeka. Chagua JPG au PNG.';
      await db.setMeta('shop_logo', base64Encode(jpg));
    }
    await db.bumpRevision();
    await load();
    syncShop();
    return null;
  }

  Future<String?> saveMyPhoto(Uint8List? bytes) async {
    if (session == null) return 'Ingia kwanza.';
    var value = '';
    if (bytes != null) {
      final jpg = await Isolate.run(() => preparePicture(bytes, maxSide: 512, square: true));
      if (jpg == null) return 'Picha haikusomeka. Chagua JPG au PNG.';
      value = base64Encode(jpg);
    }
    await db.updateStaff(session!.id, {'photo': value});
    await load();
    syncShop();
    return null;
  }

  Future<String?> saveShopComputer(String raw, {String token = ''}) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    var clean = raw.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.isEmpty) {
      await db.setMeta('cloud_url', '');
      await db.setMeta('sync_token', token.trim());
      await load();
      syncShop();
      return null;
    }
    final base = _httpsBase(clean);
    if (base == null) return 'Weka anwani ya kompyuta.';
    await db.setMeta('cloud_url', base);
    await db.setMeta('sync_token', token.trim());
    await db.bumpRevision();
    await load();
    final arrived = await uploadShop();
    if (!arrived) return 'Anwani imehifadhiwa kwenye simu hii. Seva haijapokea duka. Angalia mtandao na uhifadhi tena.';
    return null;
  }

  String? _httpsBase(String raw) {
    var clean = raw.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.isEmpty) return null;
    if (!clean.contains('://')) clean = 'https://$clean';
    final uri = Uri.tryParse(clean);
    if (uri == null || uri.host.isEmpty || (uri.scheme != 'http' && uri.scheme != 'https')) return null;
    final scheme = uri.scheme == 'http' && !VaultSync.shopHost(uri.host) ? 'https' : uri.scheme;
    final port = uri.hasPort ? ':${uri.port}' : '';
    return '$scheme://${uri.host}$port';
  }

  Future<bool> uploadShop() async {
    while (_syncingShop) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
    }
    _syncingShop = true;
    _setLive('Inatuma mabadiliko...');
    try {
      await _pushShop();
    } finally {
      _finishSync();
    }
    final check = await VaultSync.pull(_syncBase, syncToken);
    final people = check?['staff'];
    return people is List && people.isNotEmpty;
  }

  Future<String?> joinShop(String raw, String token) async {
    var clean = raw.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.isEmpty || token.trim().isEmpty) return 'Weka anwani na neno la kuunganisha.';
    final base = _httpsBase(clean);
    if (base == null) return 'Anwani ianze na https://';
    final snapshot = await VaultSync.pull(base, token.trim());
    final people = snapshot?['staff'];
    if (people is List && people.isNotEmpty && snapshot != null) {
      await db.applySnapshot(snapshot);
      await db.setMeta('cloud_url', base);
      await db.setMeta('sync_token', token.trim());
      await load();
      return null;
    }
    final localPeople = await db.staff();
    if (localPeople.isNotEmpty) {
      await db.setMeta('cloud_url', base);
      await db.setMeta('sync_token', token.trim());
      await load();
      final arrived = await uploadShop();
      if (arrived) return null;
      return 'Neno au mtandao umekataa. Angalia neno na ujaribu tena.';
    }
    return 'Duka bado halijatumwa. Fungua simu ya mmiliki yenye mauzo, weka anwani na neno, kisha hifadhi.';
  }

  Future<String?> saveCloud(String url, String token) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.isNotEmpty) {
      final uri = Uri.tryParse(clean);
      if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) return 'Anwani ianze na https://';
    }
    await db.setMeta('cloud_url', clean);
    await db.setMeta('sync_token', token.trim());
    await load();
    pushPending();
    return null;
  }

  bool _syncingShop = false;
  bool _syncQueued = false;

  void _ensureListen() {
    if (_listening) return;
    _listening = true;
    _listen();
  }

  Future<void> _listen() async {
    while (_listening) {
      if (cloudUrl.trim().isEmpty || syncToken.trim().isEmpty) {
        await Future<void>.delayed(const Duration(seconds: 2));
        continue;
      }
      final local = await db.revision();
      final remote = await VaultSync.waitRevision(_syncBase, syncToken, local);
      if (remote == null) {
        await Future<void>.delayed(const Duration(seconds: 1));
        continue;
      }
      if (remote == local) continue;
      if (_syncingShop) {
        await Future<void>.delayed(const Duration(milliseconds: 200));
        continue;
      }
      await pullShop();
    }
  }

  String get _syncBase => cloudUrl.trim().isEmpty ? VaultSync.shopServer : cloudUrl.trim();

  void _setLive(String text) {
    if (liveSync && liveSyncText == text) return;
    liveSync = true;
    liveSyncText = text;
    notifyListeners();
  }

  void _clearLive() {
    if (!liveSync) return;
    liveSync = false;
    liveSyncText = '';
    notifyListeners();
  }

  void _finishSync() {
    _syncingShop = false;
    _clearLive();
    if (_syncQueued) {
      _syncQueued = false;
      syncShop();
    }
  }

  int _rev(Map<String, dynamic> snapshot) {
    final value = snapshot['revision'];
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }

  Future<void> syncShop() async {
    if (cloudUrl.trim().isEmpty || syncToken.trim().isEmpty) return;
    if (_syncingShop) {
      _syncQueued = true;
      return;
    }
    _syncingShop = true;
    _setLive('Inatuma mabadiliko...');
    try {
      await _pushShop();
    } finally {
      _finishSync();
    }
  }

  Future<void> pullShop() async {
    if (cloudUrl.trim().isEmpty || syncToken.trim().isEmpty) return;
    if (_syncingShop) return;
    _syncingShop = true;
    try {
      final before = await db.revision();
      final snapshot = await VaultSync.pull(_syncBase, syncToken);
      if (snapshot == null) return;
      final after = await db.revision();
      final remoteRev = _rev(snapshot);
      if (snapshot['products'] is! List) {
        if (after > 0) {
          _setLive('Inatuma mabadiliko...');
          await _pushShop();
        }
        return;
      }
      if (after != before || after > remoteRev) {
        _setLive('Inatuma mabadiliko...');
        await _pushShop();
        return;
      }
      if (remoteRev == after) return;
      _setLive('Inaleta mabadiliko...');
      await db.applySnapshot(snapshot);
      await load();
    } finally {
      _finishSync();
    }
  }

  Future<void> _pushShop() async {
    final localSnap = await db.shopSnapshot();
    final merged = await VaultSync.push(_syncBase, syncToken, localSnap);
    if (merged == null || merged['products'] is! List) {
      debugPrint('vault sync: shop computer not reached');
      return;
    }
    final remoteRev = _rev(merged);
    final localRev = await db.revision();
    final remoteSales = merged['sales'] is List ? (merged['sales'] as List).length : 0;
    debugPrint('vault sync local=$localRev remote=$remoteRev sales=$remoteSales');
    if (remoteRev != localRev || remoteSales != sales.length) {
      await db.applySnapshot(merged);
      await load();
    }
  }

  Future<void> pushPending() async {
    if (syncing || cloudUrl.isEmpty) return;
    final waiting = sales.where((row) => asInt(row['voided']) == 0 && row['sync_status'] != 'SYNCED').toList();
    if (waiting.isEmpty) {
      if (syncDetail != null) {
        syncDetail = null;
        notifyListeners();
      }
      return;
    }
    syncing = true;
    notifyListeners();
    try {
      final device = await db.deviceId();
      String? detail;
      for (final sale in waiting.take(20)) {
        final items = saleItems.where((row) => row['sale_id'] == sale['id']).toList();
        final error = await CloudSync.send(
          base: cloudUrl,
          token: syncToken,
          deviceId: device,
          sale: sale,
          items: items,
        );
        final id = '${sale['id']}';
        if (error == null) {
          await db.markSaleSync(id, ok: true);
        } else {
          await db.markSaleSync(id, ok: false, error: error);
          detail = error;
          break;
        }
      }
      syncDetail = detail;
      await load();
    } finally {
      syncing = false;
      notifyListeners();
    }
  }

  ({double cashSales, double cashDebts, double lipa, double refunds, double total}) dayDrawer() {
    final today = DateTime.now();
    var cashSales = 0.0;
    var cashDebts = 0.0;
    var lipa = 0.0;
    var refunds = 0.0;
    for (final sale in visibleSales) {
      final when = _when(sale);
      if (when == null || !sameDay(when, today)) continue;
      final taken = _takenAtSale(sale);
      if (sale['method'] == 'CASH') cashSales += taken;
      if (sale['method'] == 'LIPA') lipa += taken;
    }
    for (final pay in _collectionsIn((when) => sameDay(when, today))) {
      if (pay['method'] == 'CASH') cashDebts += asDouble(pay['amount']);
      if (pay['method'] == 'LIPA') lipa += asDouble(pay['amount']);
    }
    for (final row in returns) {
      if (!_returnVisible(row)) continue;
      final when = _when(row);
      if (when == null || !sameDay(when, today)) continue;
      final refund = asDouble(row['refund']);
      if (refund <= 0) continue;
      final sale = _saleOf(row['sale_id']);
      final method = '${sale?['method']}';
      if (method == 'CASH' || method == 'LIPA') refunds += refund;
    }
    final total = cashSales + cashDebts + lipa - refunds;
    return (cashSales: cashSales, cashDebts: cashDebts, lipa: lipa, refunds: refunds, total: total);
  }

  String dayBrief() {
    final today = DateTime.now();
    final rows = visibleSales.where((sale) {
      final when = _when(sale);
      return when != null && sameDay(when, today);
    }).toList();
    final drawer = dayDrawer();
    final lines = [
      shopName,
      formatDay(today),
      tf('Risiti {0}', [rows.length]),
      tf('Cash mauzo {0}', [tsh(drawer.cashSales)]),
      tf('Cash madeni {0}', [tsh(drawer.cashDebts)]),
      tf('Lipa Namba {0}', [tsh(drawer.lipa)]),
      tf('Pesa zilizorudishwa {0}', [tsh(drawer.refunds)]),
      tf('Jumla {0}', [tsh(drawer.total)]),
      if (seeDebts) tf('Deni lililobaki {0}', [tsh(debtTotal)]),
      if (seeCost) tf('Faida ya leo {0}', [tsh(todayProfit)]),
      tf('Aliyeingia {0}', [session?.name ?? '']),
    ];
    return lines.join('\n');
  }

  Future<String?> exportBackup() async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    return db.exportCopy();
  }

  Future<String?> restoreBackup(String path) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    final error = await db.restoreCopy(path);
    await load();
    return error;
  }

  Future<String?> addEmployee(String name, String pin) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    final clean = name.trim();
    if (clean.isEmpty) return 'Weka jina la muuzaji.';
    if (!_fourDigits(pin)) return 'PIN iwe tarakimu 4.';
    final clash = staff.any((row) => (row['name'] as String).toLowerCase() == clean.toLowerCase());
    if (clash) return 'Jina hili tayari lipo.';
    await db.insertStaff(name: clean, role: 'EMPLOYEE', pin: pin);
    await db.addNote(title: 'Muuzaji mpya', body: '$clean anaweza kuuza kwa PIN yake.', kind: 'STAFF:NEW:${DateTime.now().millisecondsSinceEpoch}');
    await load();
    syncShop();
    return null;
  }

  Future<String?> setEmployeeActive(String id, bool active) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    final person = staff.cast<Map<String, Object?>?>().firstWhere((row) => row?['id'] == id, orElse: () => null);
    if (person == null) return 'Akaunti haipo.';
    if (person['role'] == 'OWNER') return 'Huwezi kufunga akaunti ya mmiliki.';
    await db.updateStaff(id, {'active': active ? 1 : 0});
    await load();
    syncShop();
    return null;
  }

  Future<String?> resetEmployeePin(String id, String pin) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    if (!_fourDigits(pin)) return 'PIN iwe tarakimu 4.';
    final person = await db.staffById(id);
    if (person == null) return 'Akaunti haipo.';
    if (person['role'] == 'OWNER') return 'Badilisha PIN yako kwenye sehemu ya PIN yangu.';
    await db.setPin(id, pin);
    await load();
    syncShop();
    return null;
  }

  Future<bool> recoveryReady() async {
    final hash = await db.meta('pin_recovery_hash') ?? '';
    return hash.length >= 32;
  }

  Future<String?> saveRecoveryWord(String word, String again) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    final clean = word.trim();
    if (clean != again.trim()) return 'Maneno hayafanani.';
    if (clean.length < 8 || clean.length > 40) return 'Neno liwe herufi 8 hadi 40.';
    if (!RegExp(r'[A-Za-z]').hasMatch(clean)) return 'Neno liwe na herufi, si tarakimu peke yake.';
    if (clean.replaceAll(RegExp(r'\s+'), '') == syncToken.trim() && syncToken.trim().isNotEmpty) {
      return 'Usiandike neno la kuunganisha.';
    }
    final salt = ShopDb.freshSalt();
    await db.setMeta('pin_recovery_salt', salt);
    await db.setMeta('pin_recovery_hash', await ShopDb.pinHash(clean, salt));
    await db.setMeta('pin_recovery_fails', '0');
    await db.setMeta('pin_recovery_until', '');
    await db.bumpRevision();
    syncShop();
    return null;
  }

  Future<String?> recoverOwnerPin(String word, String pin, String again) async {
    if (pin != again) return 'PIN hazifanani.';
    if (!_fourDigits(pin)) return 'PIN iwe tarakimu 4.';
    final until = DateTime.tryParse(await db.meta('pin_recovery_until') ?? '');
    if (until != null && DateTime.now().isBefore(until)) {
      final left = until.difference(DateTime.now()).inSeconds.clamp(1, 86400);
      return 'Subiri sekunde $left.';
    }
    final hash = await db.meta('pin_recovery_hash') ?? '';
    final salt = await db.meta('pin_recovery_salt') ?? '';
    if (hash.isEmpty || salt.isEmpty) return 'Bado hakuna neno la kurejesha.';
    final matches = ShopDb.sameHash(hash, await ShopDb.pinHash(word.trim(), salt));
    if (!matches) {
      final fails = int.tryParse(await db.meta('pin_recovery_fails') ?? '') ?? 0;
      final next = fails + 1;
      final wait = next >= 10 ? 1800 : next >= 5 ? 300 : 0;
      await db.setMeta('pin_recovery_fails', '$next');
      await db.setMeta('pin_recovery_until', wait == 0 ? '' : DateTime.now().add(Duration(seconds: wait)).toIso8601String());
      if (wait > 0) return 'Majaribio mengi. Subiri sekunde $wait.';
      return 'Neno si sahihi.';
    }
    final owners = (await db.staff(activeOnly: true)).where((row) => row['role'] == 'OWNER').toList();
    if (owners.isEmpty) return 'Akaunti ya mmiliki haipo.';
    await db.setPin('${owners.first['id']}', pin);
    await db.setMeta('pin_recovery_fails', '0');
    await db.setMeta('pin_recovery_until', '');
    await load();
    syncShop();
    return null;
  }

  Future<String?> changeOwnPin(String oldPin, String newPin) async {
    if (session == null) return 'Ingia kwanza.';
    final error = await _verifyPin(session!.id, oldPin);
    if (error != null) return error == 'PIN si sahihi.' ? 'PIN ya zamani si sahihi.' : error;
    if (!_fourDigits(newPin)) return 'PIN mpya iwe tarakimu 4.';
    if (oldPin == newPin) return 'Chagua PIN tofauti.';
    await db.setPin(session!.id, newPin);
    syncShop();
    return null;
  }

  Future<void> markRead(String id) async {
    await db.markNote(id);
    await load();
  }

  Future<void> markAllRead() async {
    for (final note in visibleNotes) {
      if (asInt(note['read']) == 0) await db.markNote('${note['id']}');
    }
    await load();
  }

  Future<Map<String, Object?>?> lookupImei(String imei) => db.lookupImei(imei);

  List<Map<String, Object?>> filteredSales({String query = '', DateTime? day, DaySpan? range, String scope = 'all'}) {
    final needle = query.trim().toLowerCase();
    final now = DateTime.now();
    final mine = seeAllSales ? sales : sales.where((sale) => sale['cashier_id'] == session?.id);
    return mine.where((sale) {
      final when = _when(sale);
      if (when == null) return false;
      if (range != null) {
        if (!range.contains(when)) return false;
      } else if (day != null && !sameDay(when, day)) {
        return false;
      } else {
      if (day == null && scope == 'today' && !sameDay(when, now)) return false;
      if (day == null && scope == 'week') {
        final monday = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
        if (when.isBefore(monday)) return false;
      }
      if (day == null && scope == 'month' && (when.year != now.year || when.month != now.month)) return false;
      if (day == null && scope == 'year' && when.year != now.year) return false;
      }
      if (needle.isEmpty) return true;
      final items = itemsFor('${sale['id']}').map((row) => '${row['name']} ${row['imei'] ?? ''}').join(' ');
      final blob = '${sale['invoice']} ${sale['customer_name']} ${sale['customer_phone']} ${sale['cashier_name']} ${sale['summary']} $items'.toLowerCase();
      return blob.contains(needle);
    }).toList();
  }

  List<Map<String, Object?>> itemsFor(String saleId) => _itemsBySale[saleId] ?? const [];

  Trend trend(int count) {
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day).subtract(Duration(days: count - 1));
    final days = [for (var i = 0; i < count; i++) start.add(Duration(days: i))];
    final totals = List<double>.filled(count, 0);
    final profit = List<double>.filled(count, 0);
    final profits = _profitBySale();
    for (final sale in visibleSales) {
      final when = _when(sale);
      if (when == null) continue;
      final day = DateTime(when.year, when.month, when.day);
      final index = day.difference(start).inDays;
      if (index < 0 || index >= count) continue;
      totals[index] += asDouble(sale['total']);
      profit[index] += profits[sale['id']] ?? 0;
    }
    return Trend(days, totals, profit);
  }

  List<HourBar> hoursToday() {
    final buckets = {for (var hour = 8; hour <= 20; hour++) hour: 0.0};
    final today = DateTime.now();
    for (final sale in visibleSales) {
      final when = _when(sale);
      if (when == null || !sameDay(when, today)) continue;
      if (!buckets.containsKey(when.hour)) continue;
      buckets[when.hour] = buckets[when.hour]! + asDouble(sale['total']);
    }
    return [for (final entry in buckets.entries) HourBar(entry.key, entry.value)];
  }

  List<TopItem> topProducts(int days, {int limit = 5}) {
    final start = DateTime.now().subtract(Duration(days: days));
    final ids = visibleSales.where((sale) {
      final when = _when(sale);
      return when != null && when.isAfter(start);
    }).map((sale) => sale['id']).toSet();
    final map = <String, TopItem>{};
    for (final item in saleItems) {
      if (!ids.contains(item['sale_id'])) continue;
      final name = item['name'] as String? ?? 'Bidhaa';
      final row = map.putIfAbsent(name, () => TopItem(name));
      row.qty += asInt(item['qty']);
      row.total += asDouble(item['price']) * asInt(item['qty']);
    }
    final list = map.values.toList()..sort((a, b) => b.total.compareTo(a.total));
    return list.take(limit).toList();
  }

  Map<String, double> payMix(int days) {
    final start = DateTime.now().subtract(Duration(days: days));
    final mix = {'CASH': 0.0, 'LIPA': 0.0};
    for (final sale in visibleSales) {
      final when = _when(sale);
      if (when == null || !when.isAfter(start)) continue;
      final method = sale['method'] == 'LIPA' ? 'LIPA' : (sale['method'] == 'CASH' ? 'CASH' : '');
      if (method.isEmpty) continue;
      mix[method] = mix[method]! + _takenAtSale(sale);
    }
    for (final pay in _collectionsIn((when) => when.isAfter(start))) {
      final method = pay['method'] == 'LIPA' ? 'LIPA' : (pay['method'] == 'CASH' ? 'CASH' : '');
      if (method.isEmpty) continue;
      mix[method] = mix[method]! + asDouble(pay['amount']);
    }
    return mix;
  }

  String insight(int days) {
    final series = trend(days);
    final sum = series.totals.fold<double>(0, (a, b) => a + b);
    final profit = series.profit.fold<double>(0, (a, b) => a + b);
    final count = filteredSales(scope: days <= 1 ? 'today' : 'all').where((sale) {
      final when = _when(sale);
      if (when == null || asInt(sale['voided']) == 1) return false;
      final start = DateTime.now().subtract(Duration(days: days));
      return when.isAfter(start);
    }).length;
    if (sum <= 0 && count == 0) {
      return 'Bado hakuna mauzo katika siku $days zilizopita. Uza bidhaa ya kwanza ili grafu ianze.';
    }
    final buffer = StringBuffer('Katika siku $days umeuza ${tsh(sum)} kwenye risiti $count.');
    if (seeCost) buffer.write(' Faida ${tsh(profit)}.');
    if (series.totals.length >= 2) {
      final last = series.totals.last;
      final previous = series.totals[series.totals.length - 2];
      if (last > previous) {
        buffer.write(' Leo iko juu ya jana.');
      } else if (last < previous) {
        buffer.write(' Leo iko chini ya jana.');
      } else {
        buffer.write(' Leo ni sawa na jana.');
      }
    }
    if (lowStockCount > 0) buffer.write(' Bidhaa $lowStockCount ziko chini ya kiwango.');
    if (debtTotal > 0) buffer.write(' Unaowadai ${tsh(debtTotal)}.');
    final leaders = topProducts(days, limit: 1);
    if (leaders.isNotEmpty) buffer.write(' Inaongoza: ${leaders.first.name}.');
    return buffer.toString();
  }

  String csvSales() {
    if (!seeReports) return _csv(['haipatikani'], []);
    final mine = seeAllSales ? sales : sales.where((sale) => sale['cashier_id'] == session?.id);
    return _csv(
      ['risiti', 'tarehe', 'mteja', 'simu', 'jumla', 'ymelipwa', 'deni', 'njia', 'kumbukumbu', 'muuzaji', 'bidhaa', 'hali'],
      [
        for (final sale in mine)
          [
            sale['invoice'],
            sale['created_at'],
            sale['customer_name'],
            sale['customer_phone'],
            sale['total'],
            sale['paid'],
            sale['balance'],
            methodLabel(sale['method'] as String?),
            sale['lipa_ref'],
            sale['cashier_name'],
            sale['summary'],
            asInt(sale['voided']) == 1 ? 'imefutwa' : 'hai',
          ],
      ],
    );
  }

  String csvDebts() {
    if (!seeDebts) return _csv(['haipatikani'], []);
    return _csv(
      ['mteja', 'simu', 'siku_ya_deni', 'kilichokopwa', 'baki', 'hali'],
      [
        for (final debt in debts)
          [debt['customer_name'], debt['customer_phone'], debt['opened_at'], debt['principal'], debt['balance'], debt['status']],
      ],
    );
  }

  String csvStock() {
    if (!seeStock) return _csv(['haipatikani'], []);
    final headers = seeCost
        ? ['aina', 'jina', 'bei', 'gharama', 'stoo', 'msimbo', 'ram', 'kioo']
        : ['aina', 'jina', 'bei', 'stoo', 'msimbo', 'ram', 'kioo'];
    final rows = <List<Object?>>[];
    for (final product in products.where((row) => asInt(row['active']) == 1)) {
      rows.add(seeCost
          ? ['kifaa', product['name'], product['price'], product['cost'], product['stock'], product['barcode'], '', '']
          : ['kifaa', product['name'], product['price'], product['stock'], product['barcode'], '', '']);
    }
    for (final phone in phones) {
      rows.add(seeCost
          ? ['simu', phone['product_name'], phone['price'], phone['cost'], phone['status'], phone['imei'], phone['ram'], phone['screen']]
          : ['simu', phone['product_name'], phone['price'], phone['status'], maskImei('${phone['imei']}'), phone['ram'], phone['screen']]);
    }
    return _csv(headers, rows);
  }

  String csvCustomers() {
    if (!seeCustomers) return _csv(['haipatikani'], []);
    return _csv(
      ['jina', 'simu', 'manunuzi', 'tangu'],
      [
        for (final customer in customers) [customer['name'], customer['phone'], customer['spent'], customer['created_at']],
      ],
    );
  }

  String csvProfit() {
    if (!isOwner) return _csv(['haipatikani'], []);
    final saleById = {for (final sale in sales) sale['id']: sale};
    final rows = <List<Object?>>[];
    for (final item in saleItems) {
      final sale = saleById[item['sale_id']];
      if (sale == null || asInt(sale['voided']) == 1) continue;
      final qty = asInt(item['qty']);
      final faultSale = asInt(item['faulty']) == 1;
      final profit = faultSale ? asDouble(item['price']) * qty : (asDouble(item['price']) - asDouble(item['cost'])) * qty;
      final kind = faultSale ? (_phoneRow(item) ? 'simu-tatizo' : 'kifaa-tatizo') : (_phoneRow(item) ? 'simu' : 'kifaa');
      rows.add([
        sale['created_at'],
        sale['invoice'],
        kind,
        item['name'],
        qty,
        item['price'],
        item['cost'],
        profit,
      ]);
    }
    for (final fault in faults) {
      final qty = asInt(fault['qty']);
      final cost = asDouble(fault['cost']) * qty;
      rows.add([
        fault['created_at'],
        fault['source'] == 'RUDI' ? 'RUDI' : 'MPYA',
        _phoneRow(fault) ? 'simu-tatizo' : 'kifaa-tatizo',
        fault['name'],
        qty,
        0,
        fault['cost'],
        -cost,
      ]);
    }
    return _csv(['tarehe', 'risiti', 'aina', 'bidhaa', 'idadi', 'bei', 'gharama', 'faida'], rows);
  }

  String categoryOf(Map<String, Object?> product) {
    final row = categories.cast<Map<String, Object?>?>().firstWhere(
      (item) => item?['id'] == product['category_id'],
      orElse: () => null,
    );
    return '${row?['name'] ?? 'Nyingine'}';
  }

  Future<String> csvByCashier() async {
    if (!isOwner) return _csv(['haipatikani'], []);
    final rows = <String, List<Object>>{};
    for (final sale in liveSales) {
      final name = '${sale['cashier_name'] ?? 'Muuzaji'}';
      final row = rows.putIfAbsent(name, () => [name, 0, 0.0]);
      row[1] = (row[1] as int) + 1;
      row[2] = (row[2] as double) + asDouble(sale['total']);
    }
    return _csv(['muuzaji', 'risiti', 'jumla'], rows.values.toList());
  }

  String csvByCategory() {
    if (!seeReports) return _csv(['haipatikani'], []);
    final allowed = seeAllSales ? null : visibleSales.map((sale) => sale['id']).toSet();
    final rows = <String, List<Object>>{};
    for (final item in saleItems) {
      if (allowed != null && !allowed.contains(item['sale_id'])) continue;
      final sale = _saleOf(item['sale_id']);
      if (sale == null || asInt(sale['voided']) == 1) continue;
      final name = '${item['category_name'] ?? ''}'.trim().isEmpty ? 'Nyingine' : '${item['category_name']}';
      final row = rows.putIfAbsent(name, () => [name, 0, 0.0]);
      row[1] = (row[1] as int) + asInt(item['qty']);
      row[2] = (row[2] as double) + asDouble(item['price']) * asInt(item['qty']);
    }
    return _csv(['kundi', 'idadi', 'jumla'], rows.values.toList());
  }

  String csvLowStock() {
    if (!seeStock) return _csv(['haipatikani'], []);
    return _csv(
      ['jina', 'baki', 'kiwango'],
      [
        for (final product in products)
          if (asInt(product['active']) == 1 && asInt(product['stock']) <= asInt(product['reorder_level']))
            [product['name'], product['stock'], product['reorder_level']],
      ],
    );
  }

  Future<String> csvMoves() async {
    if (!isOwner) return _csv(['haipatikani'], []);
    final rows = await db.moves();
    return _csv(
      ['tarehe', 'bidhaa', 'mabadiliko', 'sababu', 'aliyefanya'],
      [
        for (final row in rows) [row['created_at'], row['name'], row['delta'], row['reason'], row['staff_name']],
      ],
    );
  }

  Future<String?> saveAccess(String id, Map<String, int> flags) async {
    final denied = _ownerOnly();
    if (denied != null) return denied;
    final person = await db.staffById(id);
    if (person == null) return 'Akaunti haipo.';
    if (person['role'] == 'OWNER') return 'Mmiliki ana sehemu zote.';
    const allowed = {
      'perm_stock',
      'perm_cost',
      'perm_history',
      'perm_debts',
      'perm_customers',
      'perm_reports',
      'perm_edit',
      'perm_analysis',
    };
    final clean = {for (final entry in flags.entries) if (allowed.contains(entry.key)) entry.key: entry.value == 1 ? 1 : 0};
    await db.updateStaff(id, clean);
    await load();
    syncShop();
    return null;
  }

  String? _canEdit() => editStock ? null : 'Huna ruhusa ya kubadilisha stoo.';

  String? _ownerOnly() => isOwner ? null : 'Hiki ni kwa mmiliki tu.';

  bool _fourDigits(String pin) => RegExp(r'^\d{4}$').hasMatch(pin);

  Future<String?> _verifyPin(String staffId, String pin) async {
    if (!_fourDigits(pin)) return 'PIN si sahihi.';
    final person = await db.staffById(staffId);
    if (person == null || asInt(person['active']) != 1) return 'Akaunti haipo.';
    final lockedUntil = DateTime.tryParse('${person['pin_locked_until'] ?? ''}');
    if (lockedUntil != null && DateTime.now().isBefore(lockedUntil)) {
      final left = lockedUntil.difference(DateTime.now()).inSeconds.clamp(1, 86400);
      return 'Subiri sekunde $left.';
    }
    final salt = '${person['pin_salt'] ?? ''}';
    final stored = '${person['pin_hash'] ?? ''}';
    final matches = salt.isEmpty
        ? ShopDb.sameHash(stored, ShopDb.legacyPinHash(pin))
        : ShopDb.sameHash(stored, await ShopDb.pinHash(pin, salt));
    if (!matches) {
      final fails = asInt(person['pin_fails']) + 1;
      final wait = fails >= 15 ? 1800 : fails >= 10 ? 300 : fails >= 5 ? 60 : 0;
      await db.updateStaff(staffId, {
        'pin_fails': fails,
        'pin_locked_until': wait == 0 ? '' : DateTime.now().add(Duration(seconds: wait)).toIso8601String(),
      });
      if (wait > 0) return 'Majaribio mengi. Subiri sekunde $wait.';
      return 'PIN si sahihi.';
    }
    if (salt.isEmpty) {
      await db.setPin(staffId, pin);
    } else {
      await db.updateStaff(staffId, {'pin_fails': 0, 'pin_locked_until': ''});
    }
    return null;
  }

  DateTime? _when(Map<String, Object?> row) => DateTime.tryParse('${row['created_at']}')?.toLocal();

  double _sumOn(DateTime day, double Function(Map<String, Object?> sale) pick) {
    var total = 0.0;
    for (final sale in visibleSales) {
      final when = _when(sale);
      if (when != null && sameDay(when, day)) total += pick(sale);
    }
    return total;
  }

  Map<Object?, double> _profitBySale() => _profitOfSale;

  Future<String?> lendStock({
    required String person,
    required String phone,
    required String note,
    required List<WingPick> picks,
  }) async {
    if (session == null) return 'Ingia kwanza.';
    final error = await db.takeWing(person: person, phone: phone, note: note, staff: session!.name, picks: picks);
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<String?> receiveWing(String wingId, Map<String, int> qtyByItem) async {
    if (session == null) return 'Ingia kwanza.';
    final error = await db.returnWing(wingId, staff: session!.name, qtyByItem: qtyByItem);
    if (error != null) return error;
    await load();
    syncShop();
    return null;
  }

  Future<void> _queueDueNotes() async {
    if (session == null || !seeDebts) return;
    final now = DateTime.now();
    final stamp = '${now.year}${now.month}${now.day}';
    var added = false;
    for (final debt in dueReminders()) {
      final kind = 'DEBTDUE:${debt['id']}:$stamp';
      if (await db.hasNote(kind)) continue;
      final due = DateTime.tryParse('${debt['due_at']}')?.toLocal();
      final when = due == null ? 'siku 30 zimepita bila malipo' : 'linakamilika ${formatDay(due)}';
      await db.addNote(
        title: 'Ukumbusho wa deni',
        body: '${debt['customer_name']} $when. Baki ${tsh(asDouble(debt['balance']))}.',
        kind: kind,
      );
      added = true;
    }
    if (added) await db.bumpRevision();
  }

  Future<void> _syncLowNotes() async {
    for (final product in products) {
      if (asInt(product['active']) != 1) continue;
      if (asInt(product['stock']) > asInt(product['reorder_level'])) continue;
      await db.addNote(
        title: 'Stoo ndogo',
        body: '${product['name']} zimebaki ${product['stock']}.',
        kind: 'LOW:${product['id']}',
        uniqueUnread: true,
      );
    }
  }
}

String _csv(List<String> headers, List<List<Object?>> rows) {
  String cell(Object? value) {
    var text = '${value ?? ''}'.replaceAll('\r', ' ').replaceAll('\n', ' ');
    if (text.startsWith('=') || text.startsWith('+') || text.startsWith('-') || text.startsWith('@')) {
      text = "'$text";
    }
    final escaped = text.replaceAll('"', '""');
    if (escaped.contains(',') || escaped.contains('"')) return '"$escaped"';
    return escaped;
  }

  final lines = <String>[headers.join(',')];
  for (final row in rows) {
    lines.add(row.map(cell).join(','));
  }
  return '\uFEFF${lines.join('\n')}';
}
