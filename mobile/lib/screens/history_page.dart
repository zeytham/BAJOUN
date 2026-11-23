import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../date_span.dart';
import '../lang.dart';
import '../money.dart';
import '../receipt_pdf.dart';
import '../shop_db.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../whatsapp.dart';
import '../widgets/ui.dart';

class HistoryPage extends StatefulWidget {
  const HistoryPage({super.key, required this.store, this.initialScope = 'today'});
  final ShopStore store;
  final String initialScope;

  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  final _search = TextEditingController();
  String _query = '';
  String _scope = 'all';
  DaySpan? _range;

  @override
  void initState() {
    super.initState();
    _scope = widget.initialScope;
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        final cut = widget.store.historyHiddenUntil;
        final hidden = widget.store.hiddenSales;
        final rows = widget.store.filteredSales(query: _query, range: _range, scope: _scope).where((sale) {
          if (hidden.contains('${sale['id']}')) return false;
          if (cut == null) return true;
          final when = DateTime.tryParse('${sale['created_at']}');
          return when != null && when.isAfter(cut);
        }).toList();
        final groups = <String, List<Map<String, Object?>>>{};
        for (final sale in rows) {
          final when = DateTime.tryParse('${sale['created_at']}')?.toLocal();
          final key = when == null ? '—' : formatDay(when);
          groups.putIfAbsent(key, () => []).add(sale);
        }
        final flat = <Object>[];
        for (final entry in groups.entries) {
          flat.add(entry.key);
          flat.addAll(entry.value);
        }
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(
            leading: IconButton(
              tooltip: t('Rudi'),
              onPressed: () => Navigator.maybePop(context),
              icon: const Icon(Icons.arrow_back),
            ),
            title: Text(widget.store.seeAllSales ? tx('Historia ya mauzo', 'Sales history') : tx('Mauzo yangu', 'My sales'), style: const TextStyle(fontWeight: FontWeight.w600)),
            actions: [
              if (cut != null || widget.store.hiddenSales.isNotEmpty)
                IconButton(tooltip: t('Onyesha'), onPressed: _show, icon: const Icon(Icons.history)),
              IconButton(tooltip: t('Ficha historia'), onPressed: _hide, icon: const Icon(Icons.visibility_off_outlined)),
            ],
          ),
          body: Column(
            children: [
              if (cut != null || widget.store.hiddenSales.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
                    decoration: vaultCard(),
                    child: Row(
                      children: [
                        const Icon(Icons.history, color: skyDeep, size: 20),
                        const SizedBox(width: 8),
                        Expanded(child: Text(t(cut != null ? 'Historia ya nyuma imefichwa.' : 'Risiti zimefichwa.'), style: const TextStyle(fontWeight: FontWeight.w600))),
                        TextButton(onPressed: _show, child: Text(t('Onyesha'))),
                      ],
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: TextField(
                  controller: _search,
                  maxLength: 40,
                  inputFormatters: [LengthLimitingTextInputFormatter(40)],
                  onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                  decoration: InputDecoration(hintText: t('Tafuta risiti, mteja, bidhaa, IMEI'), prefixIcon: Icon(Icons.search), counterText: ''),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 42,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    for (final item in [('Leo', 'today'), ('Wiki', 'week'), ('Mwezi', 'month'), ('Mwaka', 'year'), ('Zote', 'all')])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(t(item.$1)),
                          selected: _range == null && _scope == item.$2,
                          showCheckmark: false,
                          selectedColor: skyDeep,
                          backgroundColor: Colors.white,
                          labelStyle: TextStyle(color: _range == null && _scope == item.$2 ? Colors.white : ink, fontWeight: FontWeight.w700),
                          side: BorderSide(color: _range == null && _scope == item.$2 ? skyDeep : const Color(0xFFD7E8D4)),
                          onSelected: (_) => setState(() {
                            _range = null;
                            _scope = item.$2;
                          }),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        avatar: Icon(Icons.calendar_today, size: 16, color: _range == null ? skyDeep : Colors.white),
                        label: Text(_range == null ? t('Tarehe') : _range!.label),
                        backgroundColor: _range == null ? Colors.white : skyDeep,
                        labelStyle: TextStyle(color: _range == null ? ink : Colors.white, fontWeight: FontWeight.w700),
                        side: BorderSide(color: _range == null ? const Color(0xFFD7E8D4) : skyDeep),
                        onPressed: _pickRange,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: rows.isEmpty
                    ? EmptyHint(text: t('Hakuna mauzo kwenye chaguo hili.'))
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        itemCount: flat.length,
                        itemBuilder: (context, index) {
                          final item = flat[index];
                          if (item is String) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 14, bottom: 6),
                              child: Text(item, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                            );
                          }
                          return _saleTile(item as Map<String, Object?>);
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _line(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 88, child: Text(label, style: captionStyle)),
          Expanded(child: Text(value, style: bodyStyle)),
        ],
      ),
    );
  }

  Future<void> _hide() async {
    final ok = await confirm(
      context,
      t('Ficha historia'),
      t('Historia itaondoka kwenye ukurasa huu. Mauzo, madeni na ripoti zinabaki.'),
    );
    if (!mounted) return;
    if (!ok) {
      toast(context, t('Imesitishwa.'));
      return;
    }
    await widget.store.hideHistory();
    if (mounted) toast(context, t('Historia imefichwa.'));
  }

  Future<void> _show() async {
    await widget.store.showHistory();
    if (mounted) toast(context, t('Historia imeonekana.'));
  }

  Future<void> _pickRange() async {
    final picked = await pickDaySpan(context, current: _range);
    if (picked != null && mounted) setState(() => _range = picked);
  }

  Widget _saleTile(Map<String, Object?> sale) {
    final voided = asInt(sale['voided']) == 1;
    final balance = asDouble(sale['balance']);
    final returned = asDouble(sale['returned']);
    final status = voided
        ? t('Imefutwa')
        : returned > 0.5
            ? tf('Imerudishwa {0}', [tsh(returned)])
            : (balance > 0 ? tf('Deni {0}', [tsh(balance)]) : methodLabel('${sale['method']}'));
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _detail(sale),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${sale['invoice']}',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: ink, decoration: voided ? TextDecoration.lineThrough : null),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(tsh(asDouble(sale['total'])), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: ink)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('${sale['customer_name']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                  if ('${sale['summary']}'.trim().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text('${sale['summary']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: captionStyle),
                  ],
                  const SizedBox(height: 10),
                  Text('${formatWhen('${sale['created_at']}')}    ${sale['cashier_name']}', style: captionStyle),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: balance > 0 || voided ? const Color(0xFFFFF8EF) : skyPage,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(status, style: TextStyle(color: balance > 0 || voided ? const Color(0xFFB45309) : skyDeep, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
        ),
      ),
    );
  }

  void _detail(Map<String, Object?> sale) {
    final items = widget.store.itemsFor(sale['id'] as String);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheetContext) => SizedBox(
        height: MediaQuery.sizeOf(sheetContext).height * 0.88,
        child: Column(
          children: [
            Row(
              children: [
                IconButton(tooltip: t('Rudi'), onPressed: () => Navigator.pop(sheetContext), icon: const Icon(Icons.arrow_back, color: ink)),
                Expanded(child: Text('${sale['invoice']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
              ],
            ),
            Expanded(
              child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            Text(formatWhen('${sale['created_at']}'), style: captionStyle),
            const SizedBox(height: 14),
            _line(t('Mteja'), '${sale['customer_name']}'),
            _line(t('Simu'), showPhone('${sale['customer_phone']}').isEmpty ? '—' : showPhone('${sale['customer_phone']}')),
            _line(t('Muuzaji'), '${sale['cashier_name']}'),
            _line(t('Malipo'), '${methodLabel('${sale['method']}')} ${sale['lipa_ref']}'.trim()),
            _line(t('Jumla'), tsh(asDouble(sale['total']))),
            _line(t('Alichotoa'), tsh(asDouble(sale['paid']) + asDouble(sale['change_due']))),
            if (asDouble(sale['returned']) > 0) _line(t('Imerudishwa'), tsh(asDouble(sale['returned']))),
            if (asDouble(sale['balance']) > 0) _line(t('Deni'), tsh(asDouble(sale['balance']))),
            if (asDouble(sale['change_due']) > 0) _line(t('Alichorudishiwa'), tsh(asDouble(sale['change_due']))),
            const SizedBox(height: 8),
            const Divider(),
            PaperLines(
              lines: [
                for (final item in items)
                  PaperLine(
                    name: widget.store.returnedQty('${item['id']}') > 0
                        ? '${item['name']} · ${t('imerudi')} ${widget.store.returnedQty('${item['id']}')}'
                        : '${item['name']}',
                    qty: asInt(item['qty']),
                    price: asDouble(item['price']),
                    imei: '${item['imei'] ?? ''}',
                  ),
              ],
            ),
            if (asInt(sale['voided']) == 0 && isTzPhone('${sale['customer_phone']}'))
              TextButton(
                onPressed: () => _sendSale(sheetContext, sale, items),
                child: Text(t('Tuma risiti')),
              ),
            if (asInt(sale['voided']) == 0 && items.any((item) => asInt(item['qty']) > widget.store.returnedQty('${item['id']}')))
              TextButton(
                onPressed: () {
                  Navigator.pop(sheetContext);
                  _return(sale, items);
                },
                child: Text(t('Rudisha bidhaa')),
              ),
            TextButton(
              onPressed: () async {
                final ok = await confirm(sheetContext, t('Ficha risiti'), t('Risiti hii itaondoka kwenye historia. Mauzo, deni na stoo vinabaki.'));
                if (!ok || !sheetContext.mounted) return;
                await widget.store.hideSale('${sale['id']}');
                if (!sheetContext.mounted) return;
                Navigator.pop(sheetContext);
                toast(sheetContext, 'Risiti imefichwa.');
              },
              child: Text(t('Ficha risiti')),
            ),
            if (widget.store.isOwner && asInt(sale['voided']) == 0 && asDouble(sale['returned']) <= 0.5)
              TextButton(
                onPressed: () async {
                  final ok = await confirm(sheetContext, t('Futa risiti'), t('Stoo itarudi. Huwezi kufuta kama deni tayari lina malipo.'));
                  if (!ok || !sheetContext.mounted) return;
                  final error = await widget.store.voidSale(sale['id'] as String);
                  if (!sheetContext.mounted) return;
                  Navigator.pop(sheetContext);
                  toast(sheetContext, error ?? 'Risiti imefutwa');
                },
                child: Text(t('Futa risiti'), style: const TextStyle(color: Color(0xFFDC2626))),
              ),
          ],
        ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendSale(BuildContext context, Map<String, Object?> sale, List<Map<String, Object?>> items) async {
    final bytes = await buildSaleReceipt(
      shop: widget.store.paperShop,
      invoice: '${sale['invoice']}',
      when: DateTime.tryParse('${sale['created_at']}')?.toLocal() ?? DateTime.now(),
      customer: '${sale['customer_name']}',
      phone: '${sale['customer_phone']}',
      cashier: '${sale['cashier_name']}',
      method: methodLabel('${sale['method']}'),
      total: asDouble(sale['total']),
      paid: asDouble(sale['paid']),
      change: asDouble(sale['change_due']),
      balance: asDouble(sale['balance']),
      lines: [
        for (final item in items) PaperLine(name: '${item['name']}', qty: asInt(item['qty']), price: asDouble(item['price'])),
      ],
    );
    if (!context.mounted) return;
    final error = await sendWhatsappPdf(phone: '${sale['customer_phone']}', bytes: bytes, filename: '${sale['invoice']}.png');
    if (!context.mounted) return;
    toast(context, error ?? t('WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.'));
  }

  Future<void> _return(Map<String, Object?> sale, List<Map<String, Object?>> items) async {
    final outcome = await showModalBottomSheet<ReturnOutcome>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _ReturnSheet(store: widget.store, sale: sale, items: items),
    );
    if (outcome == null || outcome.error != null || !mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t('Bidhaa imerudi')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(outcome.invoice, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(tf('Thamani {0}', [tsh(outcome.total)])),
            if (outcome.refund > 0) Text(tf('Rudisha pesa {0}', [tsh(outcome.refund)])),
            if (outcome.debtLeft > 0) Text(tf('Deni lililobaki {0}', [tsh(outcome.debtLeft)])),
            const SizedBox(height: 8),
            Text(outcome.reason, style: captionStyle),
          ],
        ),
        actions: [
          if (isTzPhone(outcome.phone))
            TextButton(
              onPressed: () async {
                final bytes = await buildReturnReceipt(
                  shop: widget.store.paperShop,
                  invoice: outcome.invoice,
                  saleInvoice: outcome.saleInvoice,
                  when: DateTime.now(),
                  customer: outcome.customer,
                  phone: outcome.phone,
                  cashier: widget.store.session?.name ?? '',
                  reason: outcome.reason,
                  total: outcome.total,
                  refund: outcome.refund,
                  debtLeft: outcome.debtLeft,
                  lines: [for (final line in outcome.lines) PaperLine(name: line.name, qty: line.qty, price: line.price)],
                );
                if (!context.mounted) return;
                final error = await sendWhatsappPdf(phone: outcome.phone, bytes: bytes, filename: '${outcome.invoice}.png');
                if (!context.mounted) return;
                toast(context, error ?? t('WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.'));
              },
              child: Text(t('Tuma risiti')),
            ),
          FilledButton(onPressed: () => Navigator.pop(context), child: Text(t('Maliza'))),
        ],
      ),
    );
  }
}

class _ReturnSheet extends StatefulWidget {
  const _ReturnSheet({required this.store, required this.sale, required this.items});
  final ShopStore store;
  final Map<String, Object?> sale;
  final List<Map<String, Object?>> items;

  @override
  State<_ReturnSheet> createState() => _ReturnSheetState();
}

class _ReturnSheetState extends State<_ReturnSheet> {
  final _reason = TextEditingController();
  late final Map<String, int> _qty;
  bool _faulty = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _qty = {
      for (final item in widget.items)
        '${item['id']}': 0,
    };
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: ListView(
        shrinkWrap: true,
        children: [
          Text(tf('Rudisha {0}', ["${widget.sale['invoice']}"]), style: titleStyle),
          const SizedBox(height: 6),
          Text(t('Chagua idadi na sababu. Stoo, deni, faida na ripoti zinajisasisha.'), style: captionStyle),
          const SizedBox(height: 12),
          for (final item in widget.items)
            _row(item),
          const SizedBox(height: 8),
          SoftField(controller: _reason, label: t('Sababu ya kurudisha'), maxLength: 120),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(t('Vina matatizo')),
            subtitle: Text(t('Vitaingia stoo kama vifaa vyenye matatizo, na gharama yake itaingia kwenye faida.')),
            value: _faulty,
            activeThumbColor: skyDeep,
            onChanged: (value) => setState(() => _faulty = value),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Inahifadhi...' : t('Thibitisha marejesho')),
          ),
        ],
      ),
    );
  }

  Widget _row(Map<String, Object?> item) {
    final id = '${item['id']}';
    final left = asInt(item['qty']) - widget.store.returnedQty(id);
    final qty = _qty[id] ?? 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: skyPage, borderRadius: BorderRadius.circular(14)),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${item['name']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                  Text(tf('Iliyobaki {0}', ['$left']), style: captionStyle),
                ],
              ),
            ),
            IconButton(
              onPressed: qty <= 0 ? null : () => setState(() => _qty[id] = qty - 1),
              icon: const Icon(Icons.remove_circle_outline),
            ),
            Text('$qty', style: const TextStyle(fontWeight: FontWeight.w600)),
            IconButton(
              onPressed: left <= 0 || qty >= left ? null : () => setState(() => _qty[id] = qty + 1),
              icon: const Icon(Icons.add_circle_outline, color: skyDeep),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    final outcome = await widget.store.returnSale(
      saleId: '${widget.sale['id']}',
      reason: _reason.text,
      picks: [for (final entry in _qty.entries) ReturnPick(entry.key, entry.value, faulty: _faulty)],
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (outcome.error != null) {
      toast(context, outcome.error!);
      return;
    }
    Navigator.pop(context, outcome);
  }
}
