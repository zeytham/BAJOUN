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
              children: [
                Expanded(child: Text('${wing['person_name']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: ink))),
                Text(open ? t('Nje') : t('Amerudi'), style: TextStyle(fontWeight: FontWeight.w600, color: open ? const Color(0xFFB45309) : skyDeep)),
              ],
            ),
            if ('${wing['person_phone']}'.isNotEmpty)
              Text(showPhone('${wing['person_phone']}'), style: captionStyle),
            const SizedBox(height: 6),
            Text(tf('Alichukua {0}', [taken == null ? '' : formatWhen(taken.toIso8601String())]), style: const TextStyle(color: ink)),
            if (!open && returned != null) Text(tf('Alirudisha {0}', [formatWhen(returned.toIso8601String())]), style: const TextStyle(color: ink)),
            Text(tf('Aliyeandika {0}', ["${wing['staff_name']}"]), style: captionStyle),
            if ('${wing['note']}'.trim().isNotEmpty) Text('${wing['note']}', style: captionStyle),
            const SizedBox(height: 8),
            for (final item in items) _itemLine(item, open: open),
            if (open) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => _back(context, wing, items),
                  child: Text(t('Rudisha')),
                ),
              ),
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
    final left = taken - back;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Expanded(child: Text('${item['name']}', style: const TextStyle(fontWeight: FontWeight.w600))),
          if (open && back > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Text(tf('Amerudi x{0}', ['$back']), style: captionStyle),
            ),
          Text(open ? (left > 0 ? tf('Nje x{0}', ['$left']) : t('Imerudi')) : 'x$taken', style: const TextStyle(color: skyDeep, fontWeight: FontWeight.w700)),
        ],
      ),
    );
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
    final qty = await showModalBottomSheet<Map<String, int>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _BackSheet(person: '${wing['person_name']}', items: items),
    );
    if (qty == null || !context.mounted) return;
    final error = await widget.store.receiveWing('${wing['id']}', qty);
    if (!context.mounted) return;
    final still = items.where((item) {
      final left = asInt(item['qty']) - asInt(item['returned_qty']) - (qty['${item['id']}'] ?? 0);
      return left > 0;
    }).isNotEmpty;
    toast(context, error ?? (still ? t('Sehemu imerudi stoo. Iliyobaki bado iko nje.') : t('Bidhaa zote zimerudi stoo.')));
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

  int _left(Map<String, Object?> item) => asInt(item['qty']) - asInt(item['returned_qty']);

  @override
  Widget build(BuildContext context) {
    final open = widget.items.where((item) => _left(item) > 0).toList();
    final chosen = _qty.values.fold<int>(0, (sum, qty) => sum + qty);
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: ListView(
        children: [
          Text(widget.person, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(t('Chagua idadi anayorudisha sasa. Akirudisha kimoja, vilivyobaki vinabaki nje, na muda unaandikwa.'), style: captionStyle),
          const SizedBox(height: 12),
          for (final item in open)
            Padding(
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
                          Text(tf('Nje x{0}', ['${_left(item)}']), style: captionStyle),
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
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => setState(() {
                for (final item in open) {
                  _qty['${item['id']}'] = _left(item);
                }
              }),
              child: Text(t('Rudisha zote')),
            ),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: chosen <= 0 ? null : () => Navigator.pop(context, Map<String, int>.from(_qty)),
            child: Text(t('Hifadhi kurudi')),
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
