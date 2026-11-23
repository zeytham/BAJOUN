import 'package:flutter/material.dart';

import '../lang.dart';
import '../money.dart';
import '../shop_db.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class WingsPage extends StatefulWidget {
  const WingsPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<WingsPage> createState() => _WingsPageState();
}

class _WingsPageState extends State<WingsPage> {
  final _find = TextEditingController();
  String _which = 'out';

  @override
  void initState() {
    super.initState();
    _find.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _find.dispose();
    super.dispose();
  }

  bool _wingHit(Map<String, Object?> wing, String query) {
    if (query.isEmpty) return true;
    if ('${wing['person_name']}'.toLowerCase().contains(query)) return true;
    if ('${wing['person_phone']}'.contains(query)) return true;
    return widget.store.wingItems.where((row) => row['wing_id'] == wing['id']).any((row) => '${row['name']}'.toLowerCase().contains(query));
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        final query = _find.text.trim().toLowerCase();
        final open = widget.store.wings.where((row) => row['status'] == 'OUT' && _wingHit(row, query)).toList();
        final back = widget.store.wings.where((row) => row['status'] == 'BACK' && _wingHit(row, query)).toList();
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: Text(tx('Mawinga', 'Out'), style: const TextStyle(fontWeight: FontWeight.w600))),
          floatingActionButton: FloatingActionButton.extended(
            backgroundColor: skyDeep,
            foregroundColor: Colors.white,
            onPressed: () => _take(context),
            icon: const Icon(Icons.outbound),
            label: Text(t('Mtu amechukua')),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              const SizedBox(height: 12),
              SoftField(controller: _find, label: t('Tafuta mtu au bidhaa')),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _wingChip('out', t('Hawajarudi'), Icons.outbound),
                  _wingChip('back', t('Zilizorudi'), Icons.assignment_return),
                  _wingChip('all', t('Zote'), Icons.list_alt),
                ],
              ),
              const SizedBox(height: 12),
              if ((_which == 'back' ? back : _which == 'all' ? [...open, ...back] : open).isEmpty)
                EmptyHint(text: query.isNotEmpty ? t('Hakuna mawinga yenye neno hilo.') : (_which == 'back' ? t('Hakuna kilichorudi.') : t('Hakuna bidhaa iliyo nje kwa sasa.'))),
              for (final wing in (_which == 'back' ? back : _which == 'all' ? [...open, ...back] : open))
                _card(context, wing, open: wing['status'] == 'OUT'),
            ],
          ),
        );
      },
    );
  }

  Widget _wingChip(String key, String label, IconData icon) {
    final on = _which == key;
    return ChoiceChip(
      avatar: Icon(icon, size: 16, color: on ? Colors.white : skyDeep),
      label: Text(label),
      selected: on,
      showCheckmark: false,
      selectedColor: skyDeep,
      backgroundColor: Colors.white,
      labelStyle: TextStyle(color: on ? Colors.white : ink, fontWeight: FontWeight.w700),
      side: BorderSide(color: on ? skyDeep : const Color(0xFFD7E8D4)),
      onSelected: (_) => setState(() => _which = key),
    );
  }

  Widget _card(BuildContext context, Map<String, Object?> wing, {required bool open}) {
    final items = widget.store.wingItems.where((row) => row['wing_id'] == wing['id']).toList();
    final holding = _holding(items);
    final taken = DateTime.tryParse('${wing['taken_at']}')?.toLocal();
    final returned = DateTime.tryParse('${wing['returned_at']}')?.toLocal();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: vaultCard(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Text('${wing['person_name']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: ink))),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: open ? const Color(0xFFFFF8EF) : skyPage,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    open ? (holding == 0 ? t('Analipa') : t('Nje')) : t('Amerudi'),
                    style: TextStyle(fontWeight: FontWeight.w700, color: open ? const Color(0xFFB45309) : skyDeep),
                  ),
                ),
              ],
            ),
            if ('${wing['person_phone']}'.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(showPhone('${wing['person_phone']}'), style: captionStyle),
            ],
            const SizedBox(height: 10),
            Text(tf('Alichukua {0}', [taken == null ? '' : formatWhen(taken.toIso8601String())]), style: const TextStyle(color: ink)),
            if (!open && returned != null) ...[
              const SizedBox(height: 4),
              Text(tf('Alirudisha {0}', [formatWhen(returned.toIso8601String())]), style: const TextStyle(color: ink)),
            ],
            const SizedBox(height: 4),
            Text(tf('Aliyeandika {0}', ["${wing['staff_name']}"]), style: captionStyle),
            if ('${wing['note']}'.trim().isNotEmpty) Text('${wing['note']}', style: captionStyle),
            const SizedBox(height: 8),
            for (final item in items) _itemLine(item, open: open),
            if (open) ...[
              const SizedBox(height: 8),
              if (_holding(items) > 0)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => _back(context, wing, items),
                    child: Text(t('Rudisha')),
                  ),
                ),
              if (_holding(items) > 0) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => _sell(context, wing, items),
                    child: Text(t('Ameuza')),
                  ),
                ),
              ],
              for (final debt in _debts(items)) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => _pay(context, debt),
                    child: Text(tf('Lipa baki {0}', [tsh(asDouble(debt['balance']))])),
                  ),
                ),
              ],
            ] else ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => _drop(context, wing),
                  child: Text(t('Ondoa mawinga')),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _take(BuildContext context) async {
    final error = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _TakeSheet(store: widget.store),
    );
    if (error != null && context.mounted) toast(context, error);
  }

  Widget _itemLine(Map<String, Object?> item, {required bool open}) {
    final taken = asInt(item['qty']);
    final back = asInt(item['returned_qty']);
    final sold = asInt(item['sold_qty']);
    final left = taken - back - sold;
    final count = open ? (left > 0 ? left : taken) : taken;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('${item['name']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink))),
              const SizedBox(width: 12),
              Text('$count', style: const TextStyle(fontWeight: FontWeight.w700, color: skyDeep, fontSize: 16)),
            ],
          ),
          if (open && (back > 0 || sold > 0))
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  if (back > 0) Text('${t('Amerudi')}  $back', style: captionStyle),
                  if (sold > 0) Text('${t('Ameuza')}  $sold', style: captionStyle),
                ],
              ),
            ),
        ],
      ),
    );
  }

  int _holding(List<Map<String, Object?>> items) {
    return items.fold<int>(0, (sum, item) => sum + asInt(item['qty']) - asInt(item['returned_qty']) - asInt(item['sold_qty']));
  }

  List<Map<String, Object?>> _debts(List<Map<String, Object?>> items) {
    final sales = items.map((item) => '${item['sale_id'] ?? ''}').where((id) => id.isNotEmpty).toSet();
    return widget.store.debts.where((row) => row['status'] == 'OPEN' && sales.contains('${row['sale_id']}')).toList();
  }

  Future<void> _drop(BuildContext context, Map<String, Object?> wing) async {
    final ok = await confirm(context, t('Ondoa mawinga'), t('Mawinga haya yameondoka. Stoo haibadiliki.'));
    if (!ok || !context.mounted) {
      if (context.mounted && !ok) toast(context, t('Imesitishwa.'));
      return;
    }
    final error = await widget.store.dropReturnedWing('${wing['id']}');
    if (context.mounted) toast(context, error ?? 'Mawinga yameondolewa.');
  }

  Future<void> _back(BuildContext context, Map<String, Object?> wing, List<Map<String, Object?>> items) async {
    final qty = await Navigator.push<Map<String, int>>(
      context,
      MaterialPageRoute(builder: (_) => _BackSheet(person: '${wing['person_name']}', items: items)),
    );
    if (qty == null || !context.mounted) return;
    final error = await widget.store.receiveWing('${wing['id']}', qty);
    if (!context.mounted) return;
    final still = items.where((item) {
      final left = asInt(item['qty']) - asInt(item['returned_qty']) - asInt(item['sold_qty']) - (qty['${item['id']}'] ?? 0);
      return left > 0;
    }).isNotEmpty;
    toast(context, error ?? (still ? t('Sehemu imerudi stoo. Iliyobaki bado iko nje.') : t('Bidhaa zote zimerudi stoo.')));
  }

  Future<void> _sell(BuildContext context, Map<String, Object?> wing, List<Map<String, Object?>> items) async {
    final saved = await Navigator.push<String?>(
      context,
      MaterialPageRoute(builder: (_) => _SellSheet(store: widget.store, wing: wing, items: items)),
    );
    if (saved != null && context.mounted) toast(context, saved);
  }

  Future<void> _pay(BuildContext context, Map<String, Object?> debt) async {
    final saved = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _WingPaySheet(store: widget.store, debt: debt),
    );
    if (saved != null && context.mounted) toast(context, saved);
  }
}

class _BackSheet extends StatefulWidget {
  const _BackSheet({required this.person, required this.items});
  final String person;
  final List<Map<String, Object?>> items;

  @override
  State<_BackSheet> createState() => _BackSheetState();
}

class _BackSheetState extends State<_BackSheet> {
  final Map<String, int> _qty = {};

  int _left(Map<String, Object?> item) => asInt(item['qty']) - asInt(item['returned_qty']) - asInt(item['sold_qty']);

  @override
  Widget build(BuildContext context) {
    final open = widget.items.where((item) => _left(item) > 0).toList();
    final chosen = _qty.values.fold<int>(0, (sum, qty) => sum + qty);
    return Scaffold(
      backgroundColor: skyPage,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: IconButton(
          tooltip: t('Rudi'),
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back),
        ),
        title: Text(widget.person, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              children: [
                for (final item in open)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
                      decoration: vaultCard(),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${item['name']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                                const SizedBox(height: 4),
                                Text('${t('Idadi')}  ${_left(item)}', style: captionStyle),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: (_qty['${item['id']}'] ?? 0) <= 0 ? null : () => setState(() => _qty['${item['id']}'] = (_qty['${item['id']}'] ?? 0) - 1),
                            icon: const Icon(Icons.remove_circle_outline),
                          ),
                          Text('${_qty['${item['id']}'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.w700)),
                          IconButton(
                            onPressed: (_qty['${item['id']}'] ?? 0) >= _left(item) ? null : () => setState(() => _qty['${item['id']}'] = (_qty['${item['id']}'] ?? 0) + 1),
                            icon: const Icon(Icons.add_circle_outline, color: skyDeep),
                          ),
                        ],
                      ),
                    ),
                  ),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: TextButton(
                    onPressed: () => setState(() {
                      for (final item in open) {
                        _qty['${item['id']}'] = _left(item);
                      }
                    }),
                    child: Text(t('Rudisha zote')),
                  ),
                ),
              ],
            ),
          ),
          Material(
            color: Colors.white,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text(t('Ghairi')),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: FilledButton(
                        onPressed: chosen <= 0 ? null : () => Navigator.pop(context, Map<String, int>.from(_qty)),
                        child: Text(t('Hifadhi kurudi'), textAlign: TextAlign.center),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TakeSheet extends StatefulWidget {
  const _TakeSheet({required this.store});
  final ShopStore store;

  @override
  State<_TakeSheet> createState() => _TakeSheetState();
}

class _TakeSheetState extends State<_TakeSheet> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _note = TextEditingController();
  final _find = TextEditingController();
  final Map<String, int> _qty = {};
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _find.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _note.dispose();
    _find.dispose();
    super.dispose();
  }

  bool _hit(String name, String extra) {
    final query = _find.text.trim().toLowerCase();
    if (query.isEmpty) return true;
    return name.toLowerCase().contains(query) || extra.toLowerCase().contains(query);
  }

  @override
  Widget build(BuildContext context) {
    final phones = widget.store.phones.where((row) => row['status'] == 'IN_STOCK').toList();
    final goods = widget.store.products.where((row) => asInt(row['active']) == 1 && asInt(row['stock']) > 0).toList();
    final rows = <({int rank, Widget child})>[];
    for (final phone in phones) {
      final key = 'phone:${phone['id']}';
      final chosen = (_qty[key] ?? 0) > 0;
      if (!chosen && !_hit('${phone['product_name']}', '${phone['imei']}')) continue;
      rows.add((rank: chosen ? 0 : 1, child: _line(key, '${phone['product_name']}', tf('Simu · {0}', [maskImei('${phone['imei']}')]), 1)));
    }
    for (final product in goods) {
      final key = 'product:${product['id']}';
      final chosen = (_qty[key] ?? 0) > 0;
      if (!chosen && !_hit('${product['name']}', '')) continue;
      rows.add((rank: chosen ? 0 : 1, child: _line(key, '${product['name']}', tf('Stoo {0}', ['${product['stock']}']), asInt(product['stock']))));
    }
    rows.sort((a, b) => a.rank.compareTo(b.rank));
    final chosen = _qty.entries.where((entry) => entry.value > 0).length;
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: ListView(
        children: [
          Text(t('Mtu amechukua'), style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(t('Andika jina, kisha tafuta bidhaa aliyochukua. Muda unaandikwa peke yake.'), style: captionStyle),
          const SizedBox(height: 12),
          SoftField(controller: _name, label: t('Jina la mtu'), maxLength: 60),
          const SizedBox(height: 8),
          SoftField(controller: _phone, label: t('Simu (si lazima)'), keyboard: TextInputType.phone, phone: true, contacts: true, nameWith: _name),
          const SizedBox(height: 8),
          SoftField(controller: _note, label: t('Maelezo (si lazima)'), maxLength: 80),
          const SizedBox(height: 12),
          SoftField(controller: _find, label: t('Tafuta jina au IMEI')),
          if (chosen > 0) ...[
            const SizedBox(height: 8),
            Text(tf('Umechagua {0}', ['$chosen']), style: const TextStyle(fontWeight: FontWeight.w600, color: skyDeep)),
          ],
          const SizedBox(height: 12),
          if (phones.isEmpty && goods.isEmpty) EmptyHint(text: t('Hakuna bidhaa dukani ya kuazimisha.')),
          if ((phones.isNotEmpty || goods.isNotEmpty) && rows.isEmpty) EmptyHint(text: t('Hakuna bidhaa yenye neno hilo.')),
          for (final row in rows) row.child,
          const SizedBox(height: 12),
          BusyButton(busy: _busy, onPressed: phones.isEmpty && goods.isEmpty ? null : _save, label: t('Hifadhi')),
        ],
      ),
    );
  }

  Widget _line(String key, String title, String meta, int maxQty) {
    final qty = _qty[key] ?? 0;
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
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                  Text(meta, style: captionStyle),
                ],
              ),
            ),
            IconButton(onPressed: qty <= 0 ? null : () => setState(() => _qty[key] = qty - 1), icon: const Icon(Icons.remove_circle_outline)),
            Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700)),
            IconButton(
              onPressed: qty >= maxQty ? null : () => setState(() => _qty[key] = qty + 1),
              icon: const Icon(Icons.add_circle_outline, color: skyDeep),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    final picks = <WingPick>[];
    for (final entry in _qty.entries) {
      if (entry.value <= 0) continue;
      if (entry.key.startsWith('phone:')) {
        final id = entry.key.substring(6);
        final phone = widget.store.phones.cast<Map<String, Object?>?>().firstWhere((row) => row?['id'] == id, orElse: () => null);
        if (phone == null) continue;
        picks.add(WingPick(name: '${phone['product_name']}', qty: 1, phoneId: id));
      } else {
        final id = entry.key.substring(8);
        final product = widget.store.products.cast<Map<String, Object?>?>().firstWhere((row) => row?['id'] == id, orElse: () => null);
        if (product == null) continue;
        picks.add(WingPick(name: '${product['name']}', qty: entry.value, productId: id));
      }
    }
    setState(() => _busy = true);
    final error = await widget.store.lendStock(person: _name.text, phone: _phone.text, note: _note.text, picks: picks);
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      toast(context, error);
      return;
    }
    Navigator.pop(context);
  }
}

class _SellSheet extends StatefulWidget {
  const _SellSheet({required this.store, required this.wing, required this.items});
  final ShopStore store;
  final Map<String, Object?> wing;
  final List<Map<String, Object?>> items;

  @override
  State<_SellSheet> createState() => _SellSheetState();
}

class _SellSheetState extends State<_SellSheet> {
  final Map<String, int> _qty = {};
  final Map<String, TextEditingController> _price = {};
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _term = TextEditingController(text: '7');
  final _amount = TextEditingController();
  final _lipa = TextEditingController();
  String _kind = 'CASH';
  String _part = 'CASH';
  String _termUnit = 'SIKU';
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _name.text = '${widget.wing['person_name'] ?? ''}';
    _phone.text = '${widget.wing['person_phone'] ?? ''}';
    _amount.addListener(() {
      if (mounted) setState(() {});
    });
    for (final item in widget.items) {
      if (_left(item) <= 0) continue;
      final phoneId = '${item['phone_id'] ?? ''}';
      final productId = '${item['product_id'] ?? ''}';
      var price = 0.0;
      if (phoneId.isNotEmpty) {
        for (final row in widget.store.phones) {
          if (row['id'] == phoneId) price = asDouble(row['price']);
        }
      } else {
        for (final row in widget.store.products) {
          if (row['id'] == productId) price = asDouble(row['price']);
        }
      }
      _price['${item['id']}'] = TextEditingController(text: price > 0 ? '${price.round()}' : '');
    }
  }

  @override
  void dispose() {
    for (final field in _price.values) {
      field.dispose();
    }
    _name.dispose();
    _phone.dispose();
    _term.dispose();
    _amount.dispose();
    _lipa.dispose();
    super.dispose();
  }

  int _left(Map<String, Object?> item) => asInt(item['qty']) - asInt(item['returned_qty']) - asInt(item['sold_qty']);

  int get _termDays {
    final count = int.tryParse(_term.text.trim()) ?? 0;
    if (_termUnit == 'WIKI') return count * 7;
    if (_termUnit == 'MWEZI') return count * 30;
    return count;
  }

  String _floorLine(Map<String, Object?> item) {
    final phoneId = '${item['phone_id'] ?? ''}';
    if (phoneId.isEmpty) return '';
    for (final row in widget.store.phones) {
      if (row['id'] != phoneId) continue;
      final floor = asDouble(row['floor_price']);
      final base = floor > 0 ? floor : asDouble(row['price']);
      return tf('Bei ya chini {0}', [tsh(base)]);
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final open = widget.items.where((item) => _left(item) > 0).toList();
    var total = 0.0;
    for (final item in open) {
      final count = _qty['${item['id']}'] ?? 0;
      final price = int.tryParse(_price['${item['id']}']?.text.trim() ?? '') ?? 0;
      total += price * count;
    }
    final raw = _kind == 'ALL' ? 0.0 : (int.tryParse(_amount.text.trim()) ?? 0).toDouble();
    final cash = _kind == 'CASH' || (_kind == 'PART' && _part == 'CASH');
    final handed = cash || raw <= total ? raw : total;
    final change = cash ? (raw - total).clamp(0, double.infinity).toDouble() : 0.0;
    final debt = (total - (cash ? raw : handed)).clamp(0, double.infinity).toDouble();
    final canDebt = widget.store.seeDebts;
    final confirm = change > 0
        ? tf('Thibitisha · rudisha {0}', [tsh(change)])
        : debt > 0.5
            ? tf('Thibitisha · deni {0}', [tsh(debt)])
            : t('Thibitisha mauzo');
    return Scaffold(
      backgroundColor: skyPage,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: IconButton(
          tooltip: t('Rudi'),
          onPressed: _busy ? null : () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back),
        ),
        title: Text(t('Ameuza')),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              children: [
          SoftField(controller: _name, label: t('Jina la mteja'), maxLength: 60),
          const SizedBox(height: 8),
          SoftField(controller: _phone, label: t('Simu ya mteja'), keyboard: TextInputType.phone, phone: true, contacts: true, nameWith: _name),
          const SizedBox(height: 12),
          for (final item in open)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.fromLTRB(14, 8, 8, 10),
                decoration: vaultCard(),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${item['name']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                              if (_floorLine(item).isNotEmpty) Text(_floorLine(item), style: captionStyle),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: (_qty['${item['id']}'] ?? 0) <= 0 ? null : () => setState(() => _qty['${item['id']}'] = (_qty['${item['id']}'] ?? 0) - 1),
                          icon: const Icon(Icons.remove_circle_outline),
                        ),
                        Text('${_qty['${item['id']}'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        IconButton(
                          onPressed: (_qty['${item['id']}'] ?? 0) >= _left(item) ? null : () => setState(() => _qty['${item['id']}'] = (_qty['${item['id']}'] ?? 0) + 1),
                          icon: const Icon(Icons.add_circle_outline, color: skyDeep),
                        ),
                      ],
                    ),
                    SoftField(controller: _price['${item['id']}']!, label: t('Bei'), keyboard: TextInputType.number, digitsOnly: true),
                  ],
                ),
              ),
            ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(label: Text(t('Cash')), selected: _kind == 'CASH', selectedColor: sky, onSelected: (_) => setState(() => _kind = 'CASH')),
              ChoiceChip(label: Text(t('Lipa Namba')), selected: _kind == 'LIPA', selectedColor: sky, onSelected: (_) => setState(() => _kind = 'LIPA')),
              if (canDebt) ChoiceChip(label: Text(t('Deni nusu')), selected: _kind == 'PART', selectedColor: sky, onSelected: (_) => setState(() => _kind = 'PART')),
              if (canDebt) ChoiceChip(label: Text(t('Deni zima')), selected: _kind == 'ALL', selectedColor: sky, onSelected: (_) => setState(() => _kind = 'ALL')),
            ],
          ),
          if (_kind == 'PART') ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(label: Text(t('Cash')), selected: _part == 'CASH', selectedColor: sky, onSelected: (_) => setState(() => _part = 'CASH')),
                ChoiceChip(label: Text(t('Lipa Namba')), selected: _part == 'LIPA', selectedColor: sky, onSelected: (_) => setState(() => _part = 'LIPA')),
              ],
            ),
          ],
          if (_kind != 'ALL') ...[
            const SizedBox(height: 8),
            SoftField(controller: _amount, label: t('Alichotoa'), keyboard: TextInputType.number, digitsOnly: true),
          ],
          if (_kind == 'LIPA' || (_kind == 'PART' && _part == 'LIPA')) ...[
            const SizedBox(height: 8),
            SoftField(controller: _lipa, label: t('Kumbukumbu ya Lipa'), maxLength: 40),
          ],
          if (debt > 0.5 && canDebt) ...[
            const SizedBox(height: 12),
            Text(t('Anakopa kwa muda gani?'), style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final unit in [('SIKU', t('Siku')), ('WIKI', t('Wiki')), ('MWEZI', t('Mwezi'))])
                  ChoiceChip(
                    label: Text(unit.$2),
                    selected: _termUnit == unit.$1,
                    selectedColor: sky,
                    onSelected: (_) => setState(() => _termUnit = unit.$1),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            SoftField(controller: _term, label: t('Muda'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 4),
          ],
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: vaultCard(),
            child: Column(
              children: [
                _money(t('Anachotakiwa kulipa'), tsh(total), ink),
                const SizedBox(height: 8),
                _money(t('Alichotoa'), tsh(_kind == 'ALL' ? 0 : handed), ink),
                const SizedBox(height: 8),
                debt > 0.5
                    ? _money(t('Deni litabaki'), tsh(debt), const Color(0xFFB45309))
                    : _money(t('Alichorudishiwa'), tsh(change), skyDeep),
              ],
            ),
          ),
              ],
            ),
          ),
          Material(
            color: Colors.white,
            child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : () => Navigator.pop(context),
                      child: Text(t('Ghairi')),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: _busy || total <= 0 ? null : _save,
                      child: _busy
                          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                          : Text(confirm, textAlign: TextAlign.center),
                    ),
                  ),
                ],
              ),
            ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _money(String label, String value, Color color) {
    return Row(
      children: [
        Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 18)),
      ],
    );
  }

  Future<void> _save() async {
    final qty = <String, int>{};
    final price = <String, double>{};
    for (final item in widget.items) {
      final count = _qty['${item['id']}'] ?? 0;
      if (count <= 0) continue;
      qty['${item['id']}'] = count;
      price['${item['id']}'] = (int.tryParse(_price['${item['id']}']?.text.trim() ?? '') ?? 0).toDouble();
    }
    final method = _kind == 'ALL' ? 'DENI' : (_kind == 'PART' ? _part : _kind);
    setState(() => _busy = true);
    final error = await widget.store.sellWing(
      wingId: '${widget.wing['id']}',
      qtyByItem: qty,
      priceByItem: price,
      method: method,
      paidNow: _kind == 'ALL' ? 0 : (int.tryParse(_amount.text.trim()) ?? 0).toDouble(),
      lipaRef: _lipa.text,
      termDays: _termDays,
      termUnit: _termUnit,
      person: _name.text,
      phone: _phone.text,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      toast(context, error);
      return;
    }
    Navigator.pop(context, t('Mauzo yamehifadhiwa. Mtu hubaki wazi mpaka alipe au arudishe.'));
  }
}

class _WingPaySheet extends StatefulWidget {
  const _WingPaySheet({required this.store, required this.debt});
  final ShopStore store;
  final Map<String, Object?> debt;

  @override
  State<_WingPaySheet> createState() => _WingPaySheetState();
}

class _WingPaySheetState extends State<_WingPaySheet> {
  final _amount = TextEditingController();
  final _lipa = TextEditingController();
  String _method = 'CASH';
  String _cover = 'PART';
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _lipa.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: ListView(
        children: [
          Text(tf('Baki {0}', [tsh(asDouble(widget.debt['balance']))]), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(t('Malipo haya yanafunga mtu pale deni na bidhaa zote zinapoisha.'), style: captionStyle),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'PART', label: Text(t('Deni nusu'))),
              ButtonSegment(value: 'ALL', label: Text(t('Deni zima'))),
            ],
            selected: {_cover},
            onSelectionChanged: (value) => setState(() => _cover = value.first),
          ),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'CASH', label: Text(t('Cash'))),
              ButtonSegment(value: 'LIPA', label: Text(t('Lipa Namba'))),
            ],
            selected: {_method},
            onSelectionChanged: (value) => setState(() => _method = value.first),
          ),
          if (_cover == 'PART') ...[
            const SizedBox(height: 8),
            SoftField(controller: _amount, label: t('Analipa sasa'), keyboard: TextInputType.number, digitsOnly: true),
          ],
          if (_cover == 'ALL') ...[
            const SizedBox(height: 8),
            Text(tf('Analipa baki yote {0}', [tsh(asDouble(widget.debt['balance']))]), style: const TextStyle(color: skyDeep, fontWeight: FontWeight.w700)),
          ],
          if (_method == 'LIPA') ...[
            const SizedBox(height: 8),
            SoftField(controller: _lipa, label: t('Kumbukumbu ya Lipa')),
          ],
          const SizedBox(height: 12),
          BusyButton(busy: _busy, onPressed: _save, label: t('Hifadhi')),
        ],
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    if (_method == 'LIPA' && _lipa.text.trim().length < 3) {
      setState(() => _busy = false);
      toast(context, t('Weka kumbukumbu ya Lipa.'));
      return;
    }
    final error = await widget.store.payDebt(
      debtId: '${widget.debt['id']}',
      amount: _cover == 'ALL' ? asDouble(widget.debt['balance']) : (int.tryParse(_amount.text.trim()) ?? 0).toDouble(),
      method: _method,
      note: _lipa.text,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      toast(context, error);
      return;
    }
    Navigator.pop(context, t('Malipo yamehifadhiwa'));
  }
}
