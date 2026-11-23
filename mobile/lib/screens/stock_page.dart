import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'scan_page.dart';

import '../date_span.dart';
import '../lang.dart';
import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class StockPage extends StatefulWidget {
  const StockPage({super.key, required this.store, this.onBack});
  final ShopStore store;
  final VoidCallback? onBack;

  @override
  State<StockPage> createState() => _StockPageState();
}

class _StockPageState extends State<StockPage> {
  final _search = TextEditingController();
  String _query = '';
  bool _phones = false;
  bool _sold = false;
  String _soldScope = 'all';
  DaySpan? _soldRange;
  String? _wait;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        if (!store.seeStock) {
          return Scaffold(backgroundColor: skyPage, body: LockedNote(title: t('Stoo')));
        }
        return Scaffold(
          backgroundColor: skyPage,
          floatingActionButton: store.editStock
              ? FloatingActionButton.extended(
                  backgroundColor: skyDeep,
                  foregroundColor: Colors.white,
                  onPressed: () => _phones ? _groupForm() : _productForm(),
                  icon: const Icon(Icons.add),
                  label: Text(_phones ? t('Ongeza simu') : t('Ongeza kifaa')),
                )
              : null,
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              if (_wait != null) ...[
                LiveStrip(text: _wait!),
                const SizedBox(height: 12),
              ],
              Row(
                children: [
                  if (widget.onBack != null)
                    IconButton(tooltip: t('Rudi'), onPressed: widget.onBack, icon: const Icon(Icons.arrow_back, color: ink)),
                  Expanded(child: Text(tx('Stoo', 'Stock'), style: titleStyle)),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _search,
                maxLength: 40,
                inputFormatters: [LengthLimitingTextInputFormatter(40)],
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                decoration: InputDecoration(hintText: t('Tafuta stoo'), prefixIcon: Icon(Icons.search), counterText: ''),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: SegmentedButton<bool>(
                      segments: [
                        ButtonSegment(value: false, label: Text(t('Vifaa')), icon: Icon(Icons.headphones)),
                        ButtonSegment(value: true, label: Text(t('Simu')), icon: Icon(Icons.smartphone)),
                      ],
                      selected: {_phones},
                      onSelectionChanged: (value) => setState(() => _phones = value.first),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  FilterChip(
                    avatar: Icon(Icons.sell_outlined, size: 16, color: _sold ? Colors.white : skyDeep),
                    label: Text(t('Zilizouzwa')),
                    selected: _sold,
                    showCheckmark: false,
                    selectedColor: skyDeep,
                    labelStyle: TextStyle(color: _sold ? Colors.white : ink, fontWeight: FontWeight.w700),
                    onSelected: (value) => setState(() => _sold = value),
                  ),
                  const Spacer(),
                  if (store.editStock && !_sold)
                    IconButton(tooltip: t('Kundi'), onPressed: _addCategory, icon: const Icon(Icons.create_new_folder_outlined, color: skyDeep)),
                ],
              ),
              if (_sold) _soldFilters(),
              if (_phones) ...[
                const SizedBox(height: 8),
                ..._phoneCards(store),
              ] else if (_sold)
                ..._soldGoods(store)
              else
                ..._sections(store),
            ],
          ),
        );
      },
    );
  }

  Widget _soldFilters() {
    Widget chip(String key, String label) {
      final on = _soldRange == null && _soldScope == key;
      return ChoiceChip(
        label: Text(label),
        selected: on,
        showCheckmark: false,
        selectedColor: skyDeep,
        backgroundColor: Colors.white,
        labelStyle: TextStyle(color: on ? Colors.white : ink, fontWeight: FontWeight.w700),
        side: BorderSide(color: on ? skyDeep : const Color(0xFFD7E8D4)),
        onSelected: (_) => setState(() {
          _soldRange = null;
          _soldScope = key;
        }),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          chip('today', t('Leo')),
          chip('week', t('Wiki')),
          chip('month', t('Mwezi')),
          chip('year', t('Mwaka')),
          chip('all', t('Zote')),
          ActionChip(
            avatar: Icon(Icons.calendar_today, size: 16, color: _soldRange == null ? skyDeep : Colors.white),
            label: Text(_soldRange == null ? t('Tarehe') : _soldRange!.label),
            backgroundColor: _soldRange == null ? Colors.white : skyDeep,
            labelStyle: TextStyle(color: _soldRange == null ? ink : Colors.white, fontWeight: FontWeight.w700),
            side: BorderSide(color: _soldRange == null ? const Color(0xFFD7E8D4) : skyDeep),
            onPressed: () async {
              final picked = await pickDaySpan(context, current: _soldRange);
              if (picked != null) setState(() => _soldRange = picked);
            },
          ),
        ],
      ),
    );
  }

  bool _inWhen(DateTime? when) {
    if (_soldRange != null) return when != null && _soldRange!.contains(when);
    if (_soldScope == 'all') return true;
    if (when == null) return false;
    final now = DateTime.now();
    if (_soldScope == 'today') return sameDay(when, now);
    if (_soldScope == 'week') return !when.isAfter(now) && now.difference(when).inDays < 7;
    if (_soldScope == 'year') return when.year == now.year;
    return when.year == now.year && when.month == now.month;
  }

  DateTime? _phoneSoldAt(ShopStore store, String phoneId) {
    final item = store.saleItems.cast<Map<String, Object?>?>().where((row) => row?['phone_id'] == phoneId).lastOrNull;
    if (item == null) return null;
    final sale = store.sales.cast<Map<String, Object?>?>().where((row) => row?['id'] == item['sale_id']).firstOrNull;
    return DateTime.tryParse('${sale?['created_at']}')?.toLocal();
  }

  List<Widget> _soldGoods(ShopStore store) {
    final bySale = {for (final sale in store.sales) '${sale['id']}': sale};
    final rows = store.saleItems.where((item) {
      if ('${item['phone_id'] ?? ''}'.trim().isNotEmpty) return false;
      final sale = bySale['${item['sale_id']}'];
      if (sale == null || asInt(sale['voided']) == 1) return false;
      final when = DateTime.tryParse('${sale['created_at']}')?.toLocal();
      if (!_inWhen(when)) return false;
      final blob = '${item['name']} ${sale['invoice']} ${sale['customer_name']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
    if (rows.isEmpty) return [EmptyHint(text: t('Hakuna vifaa vilivyouzwa.'))];
    return [
      for (final item in rows)
        _card(
          title: '${item['name']}',
          meta: '${bySale['${item['sale_id']}']?['customer_name'] ?? ''}',
          price: tsh(asDouble(item['price']) * asInt(item['qty'])),
          badge: '${item['qty']}  ·  ${formatWhen('${bySale['${item['sale_id']}']?['created_at']}')}',
          warn: false,
        ),
    ];
  }

  List<Widget> _sections(ShopStore store) {
    final widgets = <Widget>[];
    final categories = store.categories.where((row) => row['id'] != 'phones' && row['kind'] != 'phone');
    for (final category in categories) {
      final items = store.products.where((product) {
        if (product['category_id'] != category['id'] || asInt(product['active']) == 0) return false;
        final blob = '${product['name']} ${product['brand']} ${product['barcode']} ${product['color']} ${product['size']}'.toLowerCase();
        return _query.isEmpty || blob.contains(_query);
      }).toList();
      final name = '${category['name']}';
      if (items.isEmpty && _query.isNotEmpty && !name.toLowerCase().contains(_query)) continue;
      widgets.add(Padding(
        padding: const EdgeInsets.only(top: 16, bottom: 4),
        child: Row(
          children: [
            Expanded(child: Text(t(name), style: sectionStyle)),
            if (store.editStock && '${category['id']}' != 'phones')
              TextButton(
                onPressed: () => _removeCategory(category),
                child: Text(t('Futa'), style: TextStyle(color: Color(0xFFDC2626))),
              ),
          ],
        ),
      ));
      if (items.isEmpty) {
        widgets.add(Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(t('Bado hakuna bidhaa.'), style: captionStyle),
        ));
      }
      widgets.addAll(items.map(_productCard));
    }
    if (widgets.isEmpty) widgets.add(EmptyHint(text: t('Hakuna vifaa. Mmiliki anaweza kuongeza bidhaa mpya.')));
    return widgets;
  }

  List<Widget> _phoneCards(ShopStore store) {
    final piles = _sold
        ? <Map<String, Object?>>[]
        : store.products.where((product) {
            if ('${product['type']}' != 'PHONE' || asInt(product['active']) == 0) return false;
            final blob = '${product['name']} ${product['storage']} ${product['ram']} ${product['screen']} ${product['color']}'.toLowerCase();
            return _query.isEmpty || blob.contains(_query);
          }).toList();
    final items = store.phones.where((phone) {
      final status = '${phone['status']}';
      final sold = status == 'SOLD';
      if (_sold != sold) return false;
      if (_sold && !_inWhen(_phoneSoldAt(store, '${phone['id']}'))) return false;
      final blob = '${phone['product_name']} ${phone['imei']} ${phone['color']} ${phone['storage']} ${phone['ram']} ${phone['screen']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
    final groups = store.categories.where((row) => row['kind'] == 'phone' && row['id'] != 'phones').toList();
    final pileCards = piles.map(_pileCard).toList();
    if (groups.isEmpty) {
      final cards = [...pileCards, ...items.map(_phoneCard)];
      if (cards.isEmpty) return [EmptyHint(text: t('Hakuna simu kwenye orodha hii.'))];
      return cards;
    }
    final widgets = <Widget>[...pileCards];
    for (final group in groups) {
      final rows = items.where((phone) => phone['category_id'] == group['id']).toList();
      if (rows.isEmpty && _query.isNotEmpty && !'${group['name']}'.toLowerCase().contains(_query)) continue;
      widgets.add(_groupTitle(store, group));
      widgets.addAll(rows.map(_phoneCard));
    }
    final loose = items.where((phone) => groups.every((group) => phone['category_id'] != group['id'])).toList();
    if (loose.isNotEmpty) {
      widgets.add(Padding(
        padding: const EdgeInsets.only(top: 16, bottom: 4),
        child: Text(t('Simu'), style: sectionStyle),
      ));
      widgets.addAll(loose.map(_phoneCard));
    }
    if (widgets.isEmpty) widgets.add(EmptyHint(text: t('Hakuna simu kwenye orodha hii.')));
    return widgets;
  }

  Widget _groupTitle(ShopStore store, Map<String, Object?> group) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 4),
      child: Row(
        children: [
          Expanded(child: Text(t('${group['name']}'), style: sectionStyle)),
          if (store.editStock)
            TextButton(
              onPressed: () => _removeCategory(group),
              child: Text(t('Futa'), style: TextStyle(color: Color(0xFFDC2626))),
            ),
        ],
      ),
    );
  }

  Widget _productCard(Map<String, Object?> product) {
    final low = asInt(product['stock']) <= asInt(product['reorder_level']);
    final brand = '${product['brand'] ?? ''}'.trim();
    final color = '${product['color'] ?? ''}'.trim();
    final size = '${product['size'] ?? ''}'.trim();
    final cost = widget.store.seeCost ? tf('Gharama {0}', [tsh(asDouble(product['cost']))]) : '';
    return _card(
      title: '${product['name']}',
      meta: [brand, if (color.isNotEmpty) color, if (size.isNotEmpty) size, cost].where((line) => line.isNotEmpty).join(' · '),
      price: tf('Jumla {0}', [tsh(asDouble(product['price']))]),
      badge: [
        low ? tf('Chini · {0}', ['${product['stock']}']) : tf('Stoo {0}', ['${product['stock']}']),
        if (asInt(product['fault_qty']) > 0) tf('Matatizo {0}', ['${product['fault_qty']}']),
      ].join(' · '),
      warn: low,
      onTap: widget.store.editStock ? () => _productForm(product) : null,
      extra: widget.store.editStock
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton.icon(
                  onPressed: () => _addStock(product),
                  icon: const Icon(Icons.add, size: 18),
                  label: Text(t('Ongeza mzigo')),
                ),
                TextButton(
                  onPressed: () => _retireProduct(product),
                  child: Text(t('Ondoa'), style: TextStyle(color: Color(0xFFDC2626))),
                ),
              ],
            )
          : null,
    );
  }

  String _phoneBadge(String status) {
    switch (status) {
      case 'IN_STOCK':
        return t('Dukani');
      case 'FAULTY':
        return t('Matatizo');
      case 'WING':
        return t('Imeazimwa');
      default:
        return t('Imeuzwa');
    }
  }

  Widget _pileCard(Map<String, Object?> product) {
    final low = asInt(product['stock']) <= asInt(product['reorder_level']);
    final cost = widget.store.seeCost ? tf('Gharama {0}', [tsh(asDouble(product['cost']))]) : '';
    return _card(
      title: '${product['name']}',
      meta: [unitSpec(product), cost].where((line) => line.isNotEmpty).join(' · '),
      price: tf('Jumla {0}', [tsh(asDouble(product['price']))]),
      badge: [
        low ? tf('Chini · {0}', ['${product['stock']}']) : tf('Stoo {0}', ['${product['stock']}']),
        if (asInt(product['fault_qty']) > 0) tf('Matatizo {0}', ['${product['fault_qty']}']),
      ].join(' · '),
      warn: low,
      onTap: widget.store.editStock ? () => _groupForm(product) : null,
      extra: widget.store.editStock
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton.icon(
                  onPressed: () => _addStock(product),
                  icon: const Icon(Icons.add, size: 18),
                  label: Text(t('Ongeza mzigo')),
                ),
                TextButton(
                  onPressed: () => _retireProduct(product),
                  child: Text(t('Ondoa'), style: const TextStyle(color: Color(0xFFDC2626))),
                ),
              ],
            )
          : null,
    );
  }

  Widget _phoneCard(Map<String, Object?> phone) {
    return _card(
      title: '${phone['product_name']}',
      meta: [unitSpec(phone), widget.store.isOwner && widget.store.revealSensitive ? '${phone['imei']}' : maskImei('${phone['imei']}')].where((part) => part.isNotEmpty).join(' · '),
      price: tf('Jumla {0}', [tsh(asDouble(phone['price']))]),
      badge: _phoneBadge('${phone['status']}'),
      warn: phone['status'] == 'FAULTY',
      onTap: widget.store.editStock && phone['status'] != 'SOLD' && phone['status'] != 'WING' ? () => _phoneForm(phone) : null,
      extra: widget.store.editStock && phone['status'] == 'IN_STOCK'
          ? TextButton(
              onPressed: () => _retirePhone(phone),
              child: Text(t('Ondoa'), style: TextStyle(color: Color(0xFFDC2626))),
            )
          : null,
    );
  }

  Widget _card({
    required String title,
    required String meta,
    required String price,
    required String badge,
    required bool warn,
    VoidCallback? onTap,
    Widget? extra,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        decoration: vaultCard(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TapScale(
              onTap: onTap,
              radius: 22,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: ink)),
                    if (meta.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(meta, style: captionStyle),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: Text(price, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: skyDeep))),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: warn ? const Color(0xFFFFF8EF) : skyPage,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(badge, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: warn ? const Color(0xFFB45309) : skyDeep)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            if (extra != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 6),
                child: Align(alignment: Alignment.centerRight, child: extra),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _addStock(Map<String, Object?> product) async {
    final current = asInt(product['stock']);
    final extra = await showDialog<int>(
      context: context,
      builder: (context) => _AddStockDialog(name: '${product['name']}', current: current),
    );
    if (extra == null || !mounted) return;
    setState(() => _wait = t('Inaongeza idadi...'));
    final error = await widget.store.addStock('${product['id']}', extra);
    if (!mounted) return;
    setState(() => _wait = null);
    toast(context, error ?? 'Idadi imeongezwa. Sasa ni ${current + extra}.');
  }

  Future<void> _retireProduct(Map<String, Object?> product) async {
    final ok = await confirm(
      context,
      tf('Ondoa {0}', ["${product['name']}"]),
      t('Itaondoka kwenye Uza na Stoo. Mauzo, ripoti, na historia ya nyuma vinabaki.'),
    );
    if (!ok || !mounted) return;
    setState(() => _wait = t('Inaondoa bidhaa...'));
    final error = await widget.store.retireProduct('${product['id']}');
    if (!mounted) return;
    setState(() => _wait = null);
    toast(context, error ?? t('Imeondolewa. Historia inabaki.'));
  }

  Future<void> _retirePhone(Map<String, Object?> phone) async {
    final ok = await confirm(
      context,
      tf('Ondoa {0}', ["${phone['product_name']}"]),
      t('Itaondoka kwenye stoo. Risiti na ripoti za simu zilizouzwa zinabaki.'),
    );
    if (!ok || !mounted) return;
    setState(() => _wait = t('Inaondoa simu...'));
    final error = await widget.store.deletePhone('${phone['id']}');
    if (!mounted) return;
    setState(() => _wait = null);
    toast(context, error ?? t('Imeondolewa. Historia inabaki.'));
  }

  Future<void> _addCategory() async {
    final name = await showDialog<String>(
      context: context,
      builder: (context) => _NameDialog(title: t('Kundi jipya'), label: t('Jina la kundi'), action: t('Hifadhi')),
    );
    if (name == null || name.isEmpty || !mounted) return;
    setState(() => _wait = t('Inaongeza kundi...'));
    final saved = await widget.store.saveCategory(name, kind: _phones ? 'phone' : 'goods');
    if (!mounted) return;
    setState(() => _wait = null);
    if (saved.error != null) {
      toast(context, saved.error!);
      return;
    }
    toast(context, saved.existed ? t('Kundi hili lipo tayari.') : t('Kundi limeongezwa.'));
  }

  Future<void> _removeCategory(Map<String, Object?> category) async {
    final name = '${category['name']}';
    final ok = await confirm(
      context,
      tf('Futa {0}', [name]),
      t('Bidhaa za kundi hili zitaingia Nyingine. Mauzo ya zamani yanabaki kwenye ripoti.'),
    );
    if (!ok || !mounted) return;
    setState(() => _wait = t('Inafuta kundi...'));
    final error = await widget.store.deleteCategory('${category['id']}');
    if (!mounted) return;
    setState(() => _wait = null);
    toast(context, error ?? t('Kundi limefutwa.'));
  }

  Future<void> _productForm([Map<String, Object?>? existing]) async {
    final error = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _ProductForm(store: widget.store, existing: existing),
    );
    if (error != null && mounted) toast(context, error);
  }

  Future<void> _groupForm([Map<String, Object?>? existing]) async {
    final error = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _PhoneGroupForm(store: widget.store, existing: existing),
    );
    if (error != null && mounted) toast(context, error);
  }

  Future<void> _phoneForm([Map<String, Object?>? existing]) async {
    final error = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _PhoneForm(store: widget.store, existing: existing),
    );
    if (error != null && mounted) toast(context, error);
  }
}

class _ProductForm extends StatefulWidget {
  const _ProductForm({required this.store, this.existing});
  final ShopStore store;
  final Map<String, Object?>? existing;

  @override
  State<_ProductForm> createState() => _ProductFormState();
}

class _ProductFormState extends State<_ProductForm> {
  late final TextEditingController _name;
  late final TextEditingController _brand;
  late final TextEditingController _price;
  late final TextEditingController _cost;
  late final TextEditingController _stock;
  late final TextEditingController _barcode;
  late final TextEditingController _reorder;
  late final TextEditingController _weeks;
  late final TextEditingController _days;
  late final TextEditingController _fault;
  late final TextEditingController _color;
  late final TextEditingController _size;
  String? _category;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final row = widget.existing;
    _name = TextEditingController(text: '${row?['name'] ?? ''}');
    _brand = TextEditingController(text: '${row?['brand'] ?? ''}');
    _price = TextEditingController(text: row == null ? '' : '${asInt(row['price'])}');
    _cost = TextEditingController(text: row == null ? '' : '${asInt(row['cost'])}');
    final pile = row == null ? 0 : asInt(row['stock']) + asInt(row['fault_qty']);
    _stock = TextEditingController(text: row == null ? '' : '$pile');
    _barcode = TextEditingController(text: '${row?['barcode'] ?? ''}');
    _reorder = TextEditingController(text: row == null ? '3' : '${asInt(row['reorder_level'])}');
    final span = row == null ? 0 : warrantySpan(row);
    _weeks = TextEditingController(text: '${span ~/ 7}');
    _days = TextEditingController(text: '${span % 7}');
    _fault = TextEditingController(text: row == null ? '0' : '${asInt(row['fault_qty'])}');
    _color = TextEditingController(text: '${row?['color'] ?? ''}');
    _size = TextEditingController(text: '${row?['size'] ?? ''}');
    _category = row?['category_id'] as String?;
    _stock.addListener(_paint);
    _fault.addListener(_paint);
  }

  void _paint() {
    if (mounted) setState(() {});
  }

  int get _pile => int.tryParse(_stock.text.trim()) ?? 0;

  int get _bad => int.tryParse(_fault.text.trim()) ?? 0;

  @override
  void dispose() {
    _stock.removeListener(_paint);
    _fault.removeListener(_paint);
    for (final controller in [_name, _brand, _price, _cost, _stock, _barcode, _reorder, _weeks, _days, _fault, _color, _size]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = widget.store.categories.where((row) => row['id'] != 'phones').toList();
    _category ??= categories.isEmpty ? null : categories.first['id'] as String;
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom + (MediaQuery.viewPaddingOf(context).bottom > 0 ? MediaQuery.viewPaddingOf(context).bottom : 40)),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(tooltip: t('Rudi'), onPressed: _busy ? null : _leave, icon: const Icon(Icons.arrow_back, color: ink)),
                Expanded(child: Text(widget.existing == null ? t('Bidhaa mpya') : t('Hariri bidhaa'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600))),
              ],
            ),
            const SizedBox(height: 12),
            SoftField(controller: _name, label: t('Jina'), maxLength: 60),
            const SizedBox(height: 8),
            SoftField(controller: _brand, label: t('Brand'), maxLength: 30),
            const SizedBox(height: 8),
            SoftField(controller: _color, label: t('Rangi'), maxLength: 30),
            const SizedBox(height: 8),
            SoftField(controller: _size, label: t('Ukubwa'), maxLength: 30),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: ValueKey(_category),
              initialValue: categories.any((row) => '${row['id']}' == _category) ? _category : null,
              decoration: InputDecoration(labelText: t('Kundi')),
              items: [for (final category in categories) DropdownMenuItem(value: '${category['id']}', child: Text(t('${category['name']}')))],
              onChanged: (value) => setState(() => _category = value),
            ),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: OutlinedButton.icon(onPressed: _newCategory, icon: const Icon(Icons.add), label: Text(t('Ongeza kundi'))),
            ),
            SoftField(controller: _price, label: t('Bei ya jumla'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4),
              child: Text(t('Bei ya kuuza inaandikwa ukiuza, kwa kila mteja.'), style: captionStyle),
            ),
            if (widget.store.seeCost) ...[
              const SizedBox(height: 8),
              SoftField(controller: _cost, label: t('Gharama'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            ],
            const SizedBox(height: 8),
            SoftField(
              controller: _stock,
              label: t('Idadi yote'),
              keyboard: TextInputType.number,
              digitsOnly: true,
              maxLength: 6,
            ),
            const SizedBox(height: 8),
            SoftField(controller: _reorder, label: t('Onyo stoo ikifika'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 5),
            const SizedBox(height: 8),
            SoftField(controller: _barcode, label: t('Barcode'), maxLength: 32),
            const SizedBox(height: 8),
            Text(t('Warranty'), style: TextStyle(fontWeight: FontWeight.w600, color: ink)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: SoftField(controller: _weeks, label: t('Wiki'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 3)),
                const SizedBox(width: 8),
                Expanded(child: SoftField(controller: _days, label: t('Siku'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 2)),
              ],
            ),
            const SizedBox(height: 8),
            SoftField(controller: _fault, label: t('Kati ya hizi, zenye matatizo'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 6),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4),
              child: Text(
                _bad > _pile
                    ? t('Idadi yenye matatizo haiwezi kuzidi idadi yote.')
                    : tf('Zinauzwa {0}. Matatizo {1} zimetolewa kwenye idadi hii hapa hapa. Mfano 20, matatizo 1, zinauzwa 19.', ['${_pile - _bad}', '$_bad']),
                style: captionStyle,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(tooltip: t('Ghairi'), onPressed: _busy ? null : _leave, icon: const Icon(Icons.close, color: muted)),
                const SizedBox(width: 8),
                Expanded(child: BusyButton(busy: _busy, onPressed: _save, label: t('Hifadhi'))),
              ],
            ),
            if (widget.existing != null)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: IconButton(tooltip: t('Ondoa'), onPressed: _busy ? null : _retire, icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626))),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _newCategory() async {
    final name = await showDialog<String>(
      context: context,
      builder: (context) => _NameDialog(title: t('Kundi jipya'), label: t('Jina'), action: t('Ongeza')),
    );
    if (name == null || !mounted) return;
    setState(() => _busy = true);
    final saved = await widget.store.saveCategory(name);
    if (!mounted) return;
    setState(() => _busy = false);
    if (!mounted) return;
    if (saved.error != null) {
      toast(context, saved.error!);
      return;
    }
    setState(() => _category = saved.id);
    toast(context, saved.existed ? t('Kundi hili lipo tayari.') : t('Kundi limeongezwa.'));
  }

  void _leave() {
    toast(context, t('Imesitishwa.'));
    Navigator.pop(context);
  }

  Future<void> _save() async {
    if (_category == null) {
      toast(context, t('Chagua kundi.'));
      return;
    }
    final total = _pile;
    final bad = _bad;
    if (bad > total) {
      toast(context, t('Idadi yenye matatizo haiwezi kuzidi idadi yote.'));
      return;
    }
    setState(() => _busy = true);
    final error = await widget.store.saveAccessory(
      id: widget.existing?['id'] as String?,
      name: _name.text,
      categoryId: _category!,
      brand: _brand.text,
      price: (int.tryParse(_price.text.trim()) ?? 0).toDouble(),
      cost: widget.store.seeCost ? (int.tryParse(_cost.text.trim()) ?? 0).toDouble() : asDouble(widget.existing?['cost']),
      stock: total - bad,
      barcode: _barcode.text,
      reorder: int.tryParse(_reorder.text.trim()) ?? 3,
      warranty: (int.tryParse(_weeks.text.trim()) ?? 0) * 7 + (int.tryParse(_days.text.trim()) ?? 0),
      faultQty: bad,
      color: _color.text,
      size: _size.text,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      toast(context, error);
      return;
    }
    Navigator.pop(context);
  }

  Future<void> _retire() async {
    final ok = await confirm(context, t('Ondoa bidhaa'), t('Itaondoka kwenye Uza na Stoo. Mauzo, ripoti, na historia ya nyuma vinabaki.'));
    if (!ok || !mounted) return;
    final error = await widget.store.retireProduct(widget.existing!['id'] as String);
    if (!mounted) return;
    Navigator.pop(context, error);
  }
}

class _PhoneGroupForm extends StatefulWidget {
  const _PhoneGroupForm({required this.store, this.existing});
  final ShopStore store;
  final Map<String, Object?>? existing;

  @override
  State<_PhoneGroupForm> createState() => _PhoneGroupFormState();
}

class _PhoneGroupFormState extends State<_PhoneGroupForm> {
  late final TextEditingController _name;
  late final TextEditingController _storage;
  late final TextEditingController _ram;
  late final TextEditingController _screen;
  late final TextEditingController _color;
  late final TextEditingController _price;
  late final TextEditingController _cost;
  late final TextEditingController _stock;
  late final TextEditingController _reorder;
  late final TextEditingController _weeks;
  late final TextEditingController _days;
  late final TextEditingController _fault;
  String _condition = 'NEW';
  String? _category;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final row = widget.existing;
    _name = TextEditingController(text: '${row?['name'] ?? ''}');
    _storage = TextEditingController(text: '${row?['storage'] ?? ''}');
    _ram = TextEditingController(text: '${row?['ram'] ?? ''}');
    _screen = TextEditingController(text: '${row?['screen'] ?? ''}');
    _color = TextEditingController(text: '${row?['color'] ?? ''}');
    _price = TextEditingController(text: row == null ? '' : '${asInt(row['price'])}');
    _cost = TextEditingController(text: row == null ? '' : '${asInt(row['cost'])}');
    final pile = row == null ? 0 : asInt(row['stock']) + asInt(row['fault_qty']);
    _stock = TextEditingController(text: row == null ? '' : '$pile');
    _reorder = TextEditingController(text: row == null ? '3' : '${asInt(row['reorder_level'])}');
    final span = row == null ? 0 : warrantySpan(row);
    _weeks = TextEditingController(text: '${span ~/ 7}');
    _days = TextEditingController(text: '${span % 7}');
    _fault = TextEditingController(text: row == null ? '0' : '${asInt(row['fault_qty'])}');
    _condition = '${row?['condition'] ?? 'NEW'}';
    if (_condition.isEmpty) _condition = 'NEW';
    _category = row?['category_id'] as String?;
    if (_category != null && _category!.isEmpty) _category = null;
  }

  @override
  void dispose() {
    for (final controller in [_name, _storage, _ram, _screen, _color, _price, _cost, _stock, _reorder, _weeks, _days, _fault]) {
      controller.dispose();
    }
    super.dispose();
  }

  int get _pile => int.tryParse(_stock.text.trim()) ?? 0;
  int get _bad => int.tryParse(_fault.text.trim()) ?? 0;

  List<Map<String, Object?>> get _groups {
    return widget.store.categories.where((row) => row['kind'] == 'phone' && row['id'] != 'phones').toList();
  }

  void _leave() {
    toast(context, t('Imesitishwa.'));
    Navigator.pop(context);
  }

  Future<void> _save() async {
    final total = _pile;
    final bad = _bad;
    if (bad > total) {
      toast(context, t('Idadi yenye matatizo haiwezi kuzidi idadi yote.'));
      return;
    }
    setState(() => _busy = true);
    final error = await widget.store.savePhoneGroup(
      id: widget.existing?['id'] as String?,
      name: _name.text,
      categoryId: _category ?? 'phones',
      color: _color.text,
      storage: _storage.text,
      ram: _ram.text,
      screen: _screen.text,
      condition: _condition,
      price: (int.tryParse(_price.text.trim()) ?? 0).toDouble(),
      cost: widget.store.seeCost ? (int.tryParse(_cost.text.trim()) ?? 0).toDouble() : asDouble(widget.existing?['cost']),
      stock: total - bad,
      reorder: int.tryParse(_reorder.text.trim()) ?? 3,
      warranty: (int.tryParse(_weeks.text.trim()) ?? 0) * 7 + (int.tryParse(_days.text.trim()) ?? 0),
      faultQty: bad,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      toast(context, error);
      return;
    }
    Navigator.pop(context);
  }

  Future<void> _retire() async {
    final ok = await confirm(context, t('Ondoa simu'), t('Itaondoka kwenye Uza na Stoo. Mauzo, ripoti, na historia ya nyuma vinabaki.'));
    if (!ok || !mounted) return;
    final error = await widget.store.retireProduct(widget.existing!['id'] as String);
    if (!mounted) return;
    Navigator.pop(context, error);
  }

  @override
  Widget build(BuildContext context) {
    final groups = _groups;
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom + (MediaQuery.viewPaddingOf(context).bottom > 0 ? MediaQuery.viewPaddingOf(context).bottom : 40)),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(tooltip: t('Rudi'), onPressed: _busy ? null : _leave, icon: const Icon(Icons.arrow_back, color: ink)),
                Expanded(child: Text(widget.existing == null ? t('Simu mpya') : t('Hariri simu'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600))),
              ],
            ),
            const SizedBox(height: 12),
            SoftField(controller: _name, label: t('Jina'), maxLength: 60),
            const SizedBox(height: 8),
            SoftField(controller: _storage, label: t('Storage, mfano 256GB'), maxLength: 20),
            const SizedBox(height: 8),
            SoftField(controller: _ram, label: t('RAM, si lazima'), maxLength: 20),
            const SizedBox(height: 8),
            SoftField(controller: _screen, label: t('Ukubwa wa kioo, si lazima'), maxLength: 20),
            const SizedBox(height: 8),
            SoftField(controller: _color, label: t('Rangi'), maxLength: 20),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _condition,
              decoration: InputDecoration(labelText: t('Hali')),
              items: [
                DropdownMenuItem(value: 'NEW', child: Text(t('Mpya'))),
                DropdownMenuItem(value: 'LIKE NEW', child: Text(t('Kama mpya'))),
                DropdownMenuItem(value: 'USED', child: Text(t('Imetumika'))),
              ],
              onChanged: (value) => setState(() => _condition = value ?? 'NEW'),
            ),
            if (groups.isNotEmpty) ...[
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                key: ValueKey(_category),
                initialValue: groups.any((row) => '${row['id']}' == _category) ? _category : null,
                decoration: InputDecoration(labelText: t('Kundi la simu')),
                items: [for (final group in groups) DropdownMenuItem(value: '${group['id']}', child: Text(t('${group['name']}')))],
                onChanged: (value) => setState(() => _category = value),
              ),
            ],
            const SizedBox(height: 8),
            SoftField(controller: _price, label: t('Bei ya jumla'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            if (widget.store.seeCost) ...[
              const SizedBox(height: 8),
              SoftField(controller: _cost, label: t('Gharama'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            ],
            const SizedBox(height: 8),
            SoftField(controller: _stock, label: t('Idadi yote'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 6),
            const SizedBox(height: 8),
            SoftField(controller: _fault, label: t('Kati ya hizi, zenye matatizo'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 6),
            const SizedBox(height: 8),
            SoftField(controller: _reorder, label: t('Onyo stoo ikifika'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 5),
            const SizedBox(height: 8),
            Text(t('Warranty'), style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: SoftField(controller: _weeks, label: t('Wiki'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 3)),
                const SizedBox(width: 8),
                Expanded(child: SoftField(controller: _days, label: t('Siku'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 2)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(tooltip: t('Ghairi'), onPressed: _busy ? null : _leave, icon: const Icon(Icons.close, color: muted)),
                const SizedBox(width: 8),
                Expanded(child: BusyButton(busy: _busy, onPressed: _save, label: t('Hifadhi'))),
              ],
            ),
            if (widget.existing != null)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: IconButton(tooltip: t('Ondoa'), onPressed: _busy ? null : _retire, icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626))),
              ),
          ],
        ),
      ),
    );
  }
}

class _PhoneForm extends StatefulWidget {
  const _PhoneForm({required this.store, this.existing});
  final ShopStore store;
  final Map<String, Object?>? existing;

  @override
  State<_PhoneForm> createState() => _PhoneFormState();
}

class _PhoneFormState extends State<_PhoneForm> {
  late final TextEditingController _name;
  late final TextEditingController _imei;
  late final TextEditingController _color;
  late final TextEditingController _storage;
  late final TextEditingController _ram;
  late final TextEditingController _screen;
  late final TextEditingController _price;
  late final TextEditingController _cost;
  late final TextEditingController _weeks;
  late final TextEditingController _days;
  String _condition = 'NEW';
  bool _faulty = false;
  String? _category;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final row = widget.existing;
    _name = TextEditingController(text: '${row?['product_name'] ?? ''}');
    _imei = TextEditingController(text: '${row?['imei'] ?? ''}');
    _color = TextEditingController(text: '${row?['color'] ?? ''}');
    _storage = TextEditingController(text: '${row?['storage'] ?? ''}');
    _ram = TextEditingController(text: '${row?['ram'] ?? ''}');
    _screen = TextEditingController(text: '${row?['screen'] ?? ''}');
    _price = TextEditingController(text: row == null ? '' : '${asInt(row['price'])}');
    _cost = TextEditingController(text: row == null ? '' : '${asInt(row['cost'])}');
    final span = row == null ? 0 : warrantySpan(row);
    _weeks = TextEditingController(text: '${span ~/ 7}');
    _days = TextEditingController(text: '${span % 7}');
    _condition = '${row?['condition'] ?? 'NEW'}';
    _faulty = row?['status'] == 'FAULTY';
    _category = '${row?['category_id'] ?? ''}';
    if (_category!.isEmpty) _category = null;
  }

  @override
  void dispose() {
    for (final controller in [_name, _imei, _color, _storage, _ram, _screen, _price, _cost, _weeks, _days]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom + (MediaQuery.viewPaddingOf(context).bottom > 0 ? MediaQuery.viewPaddingOf(context).bottom : 40)),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(tooltip: t('Rudi'), onPressed: _busy ? null : _leavePhone, icon: const Icon(Icons.arrow_back, color: ink)),
                Expanded(child: Text(widget.existing == null ? t('Simu mpya') : t('Hariri simu'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600))),
              ],
            ),
            const SizedBox(height: 12),
            SoftField(controller: _name, label: t('Jina'), maxLength: 60),
            const SizedBox(height: 8),
            SoftField(
              controller: _imei,
              label: t('IMEI'),
              keyboard: TextInputType.number,
              digitsOnly: true,
              maxLength: 20,
              minDigits: 8,
              rule: t('IMEI iwe tarakimu 8 hadi 20.'),
            ),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                onPressed: _scanImei,
                icon: const Icon(Icons.qr_code_scanner),
                label: Text(t('Skani IMEI')),
              ),
            ),
            if (_phoneGroups().isNotEmpty)
              DropdownButtonFormField<String>(
                key: ValueKey(_category),
                initialValue: _phoneGroups().any((row) => '${row['id']}' == _category) ? _category : null,
                decoration: InputDecoration(labelText: t('Kundi la simu')),
                items: [for (final group in _phoneGroups()) DropdownMenuItem(value: '${group['id']}', child: Text(t('${group['name']}')))],
                onChanged: (value) => setState(() => _category = value),
              ),
            const SizedBox(height: 8),
            SoftField(controller: _storage, label: t('Storage, mfano 256GB'), maxLength: 20),
            const SizedBox(height: 8),
            SoftField(controller: _ram, label: t('RAM, si lazima'), maxLength: 20),
            const SizedBox(height: 8),
            SoftField(controller: _screen, label: t('Ukubwa wa kioo, si lazima'), maxLength: 20),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4),
              child: Text(t('Jaza RAM na kioo ikiwa unayahitaji. Ukiiacha wazi, hakuna tatizo.'), style: captionStyle),
            ),
            const SizedBox(height: 8),
            SoftField(controller: _color, label: t('Rangi'), maxLength: 20),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _condition,
              decoration: InputDecoration(labelText: 'Hali'),
              items: [
                DropdownMenuItem(value: 'NEW', child: Text(t('Mpya'))),
                DropdownMenuItem(value: 'LIKE NEW', child: Text(t('Kama mpya'))),
                DropdownMenuItem(value: 'USED', child: Text(t('Imetumika'))),
              ],
              onChanged: (value) => setState(() => _condition = value ?? 'NEW'),
            ),
            const SizedBox(height: 8),
            SoftField(controller: _price, label: t('Bei ya jumla'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4),
              child: Text(t('Bei ya kuuza inaandikwa ukiuza simu hii.'), style: captionStyle),
            ),
            if (widget.store.seeCost) ...[
              const SizedBox(height: 8),
              SoftField(controller: _cost, label: t('Gharama'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            ],
            const SizedBox(height: 8),
            Text(t('Warranty'), style: TextStyle(fontWeight: FontWeight.w600, color: ink)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: SoftField(controller: _weeks, label: t('Wiki'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 3)),
                const SizedBox(width: 8),
                Expanded(child: SoftField(controller: _days, label: t('Siku'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 2)),
              ],
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(t('Simu ina matatizo')),
              subtitle: Text(t('Itaingia stoo, haitokei kwenye kuuza, na gharama yake inaingia kwenye faida.')),
              value: _faulty,
              activeThumbColor: skyDeep,
              onChanged: (value) => setState(() => _faulty = value),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(tooltip: t('Ghairi'), onPressed: _busy ? null : _leavePhone, icon: const Icon(Icons.close, color: muted)),
                const SizedBox(width: 8),
                Expanded(child: BusyButton(busy: _busy, onPressed: _save, label: t('Hifadhi'))),
              ],
            ),
            if (widget.existing != null)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: IconButton(tooltip: t('Futa'), onPressed: _busy ? null : _delete, icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626))),
              ),
          ],
        ),
      ),
    );
  }

  List<Map<String, Object?>> _phoneGroups() {
    return widget.store.categories.where((row) => row['kind'] == 'phone' && row['id'] != 'phones').toList();
  }

  Future<void> _scanImei() async {
    widget.store.holdLock = true;
    String? code;
    try {
      code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const ScanPage(action: 'Weka IMEI')));
    } finally {
      widget.store.holdLock = false;
    }
    if (code == null || !mounted) return;
    final raw = code.trim();
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    setState(() => _imei.text = digits.length >= 8 ? digits : raw);
  }

  void _leavePhone() {
    toast(context, t('Imesitishwa.'));
    Navigator.pop(context);
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    final error = await widget.store.savePhone(
      id: widget.existing?['id'] as String?,
      name: _name.text,
      imei: _imei.text,
      color: _color.text,
      storage: _storage.text,
      ram: _ram.text,
      screen: _screen.text,
      condition: _condition,
      price: (int.tryParse(_price.text.trim()) ?? 0).toDouble(),
      cost: widget.store.seeCost ? (int.tryParse(_cost.text.trim()) ?? 0).toDouble() : asDouble(widget.existing?['cost']),
      floor: 0,
      warranty: (int.tryParse(_weeks.text.trim()) ?? 0) * 7 + (int.tryParse(_days.text.trim()) ?? 0),
      faulty: _faulty,
      categoryId: _category ?? '',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      toast(context, error);
      return;
    }
    Navigator.pop(context);
  }

  Future<void> _delete() async {
    final ok = await confirm(context, t('Ondoa simu'), t('Itaondoka kwenye stoo. Risiti na ripoti za simu zilizouzwa zinabaki.'));
    if (!ok || !mounted) return;
    final error = await widget.store.deletePhone(widget.existing!['id'] as String);
    if (!mounted) return;
    Navigator.pop(context, error);
  }
}

class _NameDialog extends StatefulWidget {
  const _NameDialog({required this.title, required this.label, required this.action});
  final String title;
  final String label;
  final String action;

  @override
  State<_NameDialog> createState() => _NameDialogState();
}

class _NameDialogState extends State<_NameDialog> {
  final _name = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: TextField(
        controller: _name,
        autofocus: true,
        maxLength: 30,
        inputFormatters: [LengthLimitingTextInputFormatter(30)],
        decoration: InputDecoration(labelText: widget.label, counterText: ''),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(t('Ghairi'))),
        FilledButton(onPressed: () => Navigator.pop(context, _name.text.trim()), child: Text(widget.action)),
      ],
    );
  }
}

class _AddStockDialog extends StatefulWidget {
  const _AddStockDialog({required this.name, required this.current});
  final String name;
  final int current;

  @override
  State<_AddStockDialog> createState() => _AddStockDialogState();
}

class _AddStockDialogState extends State<_AddStockDialog> {
  final _extra = TextEditingController();

  @override
  void dispose() {
    _extra.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final adding = int.tryParse(_extra.text.trim()) ?? 0;
    return AlertDialog(
      title: Text(t('Ongeza mzigo')),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.name, style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(tf('Idadi sasa: {0}', ['${widget.current}']), style: captionStyle),
          const SizedBox(height: 12),
          TextField(
            controller: _extra,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: t('Idadi unayoongeza'), counterText: ''),
          ),
          if (adding > 0) Text(tf('Itakuwa {0}', ['${widget.current + adding}']), style: captionStyle),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(t('Ghairi'))),
        FilledButton(
          onPressed: adding <= 0 ? null : () => Navigator.pop(context, adding),
          child: Text(t('Ongeza')),
        ),
      ],
    );
  }
}
