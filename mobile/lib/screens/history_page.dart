import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../money.dart';
import '../receipt_pdf.dart';
import '../shop_db.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../whatsapp.dart';
import '../widgets/ui.dart';

class HistoryPage extends StatefulWidget {
  const HistoryPage({super.key, required this.store, this.initialScope = 'all'});
  final ShopStore store;
  final String initialScope;

  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  final _search = TextEditingController();
  String _query = '';
  String _scope = 'all';
  DateTime? _day;

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
        final rows = widget.store.filteredSales(query: _query, day: _day, scope: _scope);
        final groups = <String, List<Map<String, Object?>>>{};
        for (final sale in rows) {
          final when = DateTime.tryParse('${sale['created_at']}')?.toLocal();
          final key = when == null ? '—' : formatDay(when);
          groups.putIfAbsent(key, () => []).add(sale);
        }
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: Text(widget.store.seeAllSales ? 'Historia ya mauzo' : 'Mauzo yangu', style: const TextStyle(fontWeight: FontWeight.w600))),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              TextField(
                controller: _search,
                maxLength: 40,
                inputFormatters: [LengthLimitingTextInputFormatter(40)],
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(hintText: 'Tafuta risiti, mteja, bidhaa', prefixIcon: Icon(Icons.search), counterText: ''),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                children: [
                  for (final item in const [('Leo', 'today'), ('Wiki', 'week'), ('Mwezi', 'month'), ('Zote', 'all')])
                    ChoiceChip(
                      label: Text(item.$1),
                      selected: _day == null && _scope == item.$2,
                      selectedColor: sky,
                      onSelected: (_) => setState(() {
                        _day = null;
                        _scope = item.$2;
                      }),
                    ),
                  ActionChip(
                    avatar: const Icon(Icons.calendar_today, size: 16),
                    label: Text(_day == null ? 'Siku fulani' : formatDay(_day!)),
                    onPressed: _pickDay,
                  ),
                  if (_day != null) ActionChip(label: const Text('Ondoa siku'), onPressed: () => setState(() => _day = null)),
                ],
              ),
              const SizedBox(height: 8),
              Text('${rows.length} risiti', style: captionStyle),
              if (rows.isEmpty) const EmptyHint(text: 'Hakuna mauzo kwenye chaguo hili.'),
              for (final entry in groups.entries) ...[
                Padding(
                  padding: const EdgeInsets.only(top: 14, bottom: 6),
                  child: Text(entry.key, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                ),
                for (final sale in entry.value) _saleTile(sale),
              ],
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

  Future<void> _pickDay() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _day ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) setState(() => _day = picked);
  }

  Widget _saleTile(Map<String, Object?> sale) {
    final voided = asInt(sale['voided']) == 1;
    final balance = asDouble(sale['balance']);
    final returned = asDouble(sale['returned']);
    final status = voided
        ? 'Imefutwa'
        : returned > 0.5
            ? 'Imerudishwa ${tsh(returned)}'
            : (balance > 0 ? 'Deni ${tsh(balance)}' : methodLabel('${sale['method']}'));
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _detail(sale),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${sale['invoice']}',
                        style: TextStyle(fontWeight: FontWeight.w600, color: ink, decoration: voided ? TextDecoration.lineThrough : null),
                      ),
                    ),
                    Text(tsh(asDouble(sale['total'])), style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                  ],
                ),
                const SizedBox(height: 6),
                Text('${sale['customer_name']}', style: bodyStyle),
                const SizedBox(height: 2),
                Text('${sale['summary']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: captionStyle),
                const SizedBox(height: 8),
                Text('${formatWhen('${sale['created_at']}')}  ·  ${sale['cashier_name']}', style: captionStyle),
                const SizedBox(height: 2),
                Text(status, style: TextStyle(color: balance > 0 || voided ? const Color(0xFFB45309) : skyDeep, fontWeight: FontWeight.w600)),
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
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: ListView(
          children: [
            Text('${sale['invoice']}', style: titleStyle),
            const SizedBox(height: 4),
            Text(formatWhen('${sale['created_at']}'), style: captionStyle),
            const SizedBox(height: 14),
            _line('Mteja', '${sale['customer_name']}'),
            _line('Simu', showPhone('${sale['customer_phone']}').isEmpty ? '—' : showPhone('${sale['customer_phone']}')),
            _line('Muuzaji', '${sale['cashier_name']}'),
            _line('Malipo', '${methodLabel('${sale['method']}')} ${sale['lipa_ref']}'.trim()),
            _line('Jumla', tsh(asDouble(sale['total']))),
            _line('Alichotoa', tsh(asDouble(sale['paid']) + asDouble(sale['change_due']))),
            if (asDouble(sale['returned']) > 0) _line('Imerudishwa', tsh(asDouble(sale['returned']))),
            if (asDouble(sale['balance']) > 0) _line('Deni', tsh(asDouble(sale['balance']))),
            if (asDouble(sale['change_due']) > 0) _line('Alichorudishiwa', tsh(asDouble(sale['change_due']))),
            const SizedBox(height: 8),
            const Divider(),
            for (final item in items)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${item['name']}', style: bodyStyle),
                          Text(
                            item['imei'] == null
                                ? 'Idadi ${item['qty']}${widget.store.returnedQty('${item['id']}') > 0 ? ' · imerudi ${widget.store.returnedQty('${item['id']}')}' : ''}'
                                : maskImei('${item['imei']}'),
                            style: captionStyle,
                          ),
                        ],
                      ),
                    ),
                    Text(tsh(asDouble(item['price']) * asInt(item['qty'])), style: const TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            if (asInt(sale['voided']) == 0 && isTzPhone('${sale['customer_phone']}'))
              TextButton(
                onPressed: () => _sendSale(context, sale, items),
                child: const Text('Tuma risiti'),
              ),
            if (asInt(sale['voided']) == 0 && items.any((item) => asInt(item['qty']) > widget.store.returnedQty('${item['id']}')))
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  _return(sale, items);
                },
                child: const Text('Rudisha bidhaa'),
              ),
            if (widget.store.isOwner && asInt(sale['voided']) == 0 && asDouble(sale['returned']) <= 0.5)
              TextButton(
                onPressed: () async {
                  final ok = await confirm(context, 'Futa risiti', 'Stoo itarudi. Huwezi kufuta kama deni tayari lina malipo.');
                  if (!ok || !context.mounted) return;
                  final error = await widget.store.voidSale(sale['id'] as String);
                  if (!context.mounted) return;
                  Navigator.pop(context);
                  toast(context, error ?? 'Risiti imefutwa');
                },
                child: const Text('Futa risiti', style: TextStyle(color: Color(0xFFDC2626))),
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
    final error = await sendWhatsappPdf(phone: '${sale['customer_phone']}', bytes: bytes, filename: '${sale['invoice']}.pdf');
    if (!context.mounted) return;
    toast(context, error ?? 'WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.');
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
        title: const Text('Bidhaa imerudi'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(outcome.invoice, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text('Thamani ${tsh(outcome.total)}'),
            if (outcome.refund > 0) Text('Rudisha pesa ${tsh(outcome.refund)}'),
            if (outcome.debtLeft > 0) Text('Deni lililobaki ${tsh(outcome.debtLeft)}'),
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
                final error = await sendWhatsappPdf(phone: outcome.phone, bytes: bytes, filename: '${outcome.invoice}.pdf');
                if (!context.mounted) return;
                toast(context, error ?? 'WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.');
              },
              child: const Text('Tuma risiti'),
            ),
          FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Maliza')),
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
          Text('Rudisha ${widget.sale['invoice']}', style: titleStyle),
          const SizedBox(height: 6),
          const Text('Chagua idadi na sababu. Stoo, deni, faida na ripoti zinajisasisha.', style: captionStyle),
          const SizedBox(height: 12),
          for (final item in widget.items)
            _row(item),
          const SizedBox(height: 8),
          SoftField(controller: _reason, label: 'Sababu ya kurudisha', maxLength: 120),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Inahifadhi...' : 'Thibitisha marejesho'),
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
                  Text('Iliyobaki $left', style: captionStyle),
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
      picks: [for (final entry in _qty.entries) ReturnPick(entry.key, entry.value)],
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
