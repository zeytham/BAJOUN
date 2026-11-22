import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../lang.dart';
import '../money.dart';
import '../receipt_pdf.dart';
import '../shop_db.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../whatsapp.dart';
import '../widgets/ui.dart';
import 'scan_page.dart';

class SellPage extends StatefulWidget {
  const SellPage({super.key, required this.store, this.onFilter, this.onBack});
  final ShopStore store;
  final ValueChanged<bool>? onFilter;
  final VoidCallback? onBack;

  @override
  State<SellPage> createState() => SellPageState();
}

class SellPageState extends State<SellPage> {
  final _search = TextEditingController();
  String? _category;
  bool _binHot = false;
  String _query = '';

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
        final phones = _phones(store);
        final goods = _goods(store);
        return Scaffold(
          backgroundColor: skyPage,
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
                child: Row(
                  children: [
                    if (widget.onBack != null)
                      IconButton(tooltip: t('Rudi'), onPressed: widget.onBack, icon: const Icon(Icons.arrow_back, color: ink)),
                    Expanded(child: Text(tx('Uza', 'Sell'), style: titleStyle)),
                    IconButton(tooltip: t('Msimbo'), onPressed: _scan, icon: const Icon(Icons.qr_code_scanner, color: skyDeep)),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: TextField(
                  controller: _search,
                  maxLength: 40,
                  inputFormatters: [LengthLimitingTextInputFormatter(40)],
                  onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                  decoration: InputDecoration(
                    hintText: t('Tafuta jina, IMEI au barcode'),
                    prefixIcon: Icon(Icons.search),
                    counterText: '',
                  ),
                ),
              ),
              if (_selected(store) != null)
                _focusedBar(store)
              else
                ChoiceRow(
                  children: [
                    _chip(t('Zote'), null),
                    for (final category in store.categories) _chip(t('${category['name']}'), '${category['id']}'),
                  ],
                ),
              Expanded(
                child: phones.isEmpty && goods.isEmpty && _piles(store).isEmpty
                    ? EmptyHint(text: t('Hakuna bidhaa kwenye kundi hili. Ongeza kwenye Stoo.'))
                    : GridView.count(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.72,
                        children: [
                          for (final pile in _piles(store)) _pileCard(pile),
                          for (final phone in phones) _phoneCard(phone),
                          for (final product in goods) _productCard(product),
                        ],
                      ),
              ),
              _cartPanel(),
            ],
          ),
        );
      },
    );
  }

  String? _selected(ShopStore store) {
    if (_category == null) return null;
    final known = store.categories.any((row) => '${row['id']}' == _category);
    return known ? _category : null;
  }

  void clearFilter() => _choose(null);

  void _choose(String? id) {
    setState(() => _category = id);
    widget.onFilter?.call(id != null);
  }

  Widget _focusedBar(ShopStore store) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
      child: Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: Row(
          children: [
            IconButton(tooltip: t('Rudi'), onPressed: clearFilter, icon: const Icon(Icons.arrow_back, color: skyDeep)),
            Expanded(
              child: Text(_categoryName(store), maxLines: 1, overflow: TextOverflow.ellipsis, style: sectionStyle),
            ),
            TextButton(onPressed: clearFilter, child: Text(t('Ondoa'))),
          ],
        ),
      ),
    );
  }

  String _categoryName(ShopStore store) {
    for (final row in store.categories) {
      if ('${row['id']}' == _category) return t('${row['name']}');
    }
    return t('Kundi');
  }

  Widget _chip(String label, String? id) {
    final selected = _selected(widget.store) == id;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      selectedColor: skyDeep,
      backgroundColor: Colors.white,
      labelStyle: TextStyle(color: selected ? Colors.white : ink, fontWeight: FontWeight.w600, fontSize: 14),
      side: BorderSide(color: selected ? skyDeep : const Color(0xFFD7E8D4)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      onSelected: (_) => _choose(id),
    );
  }

  bool _phoneGroup(ShopStore store, String? id) {
    if (id == null) return false;
    if (id == 'phones') return true;
    for (final row in store.categories) {
      if (row['id'] == id) return row['kind'] == 'phone';
    }
    return false;
  }

  List<Map<String, Object?>> _phones(ShopStore store) {
    final selected = _selected(store);
    if (selected != null && !_phoneGroup(store, selected)) return [];
    return store.phones.where((phone) {
      if (phone['status'] != 'IN_STOCK') return false;
      if (selected != null && selected != 'phones' && phone['category_id'] != selected) return false;
      final blob = '${phone['product_name']} ${phone['imei']} ${phone['storage']} ${phone['ram']} ${phone['screen']} ${phone['color']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
  }

  List<Map<String, Object?>> _goods(ShopStore store) {
    final selected = _selected(store);
    if (selected != null && _phoneGroup(store, selected)) return [];
    return store.products.where((product) {
      if (asInt(product['active']) == 0 || asInt(product['stock']) <= 0 || '${product['type']}' == 'PHONE') return false;
      if (selected != null && product['category_id'] != selected) return false;
      final blob = '${product['name']} ${product['brand']} ${product['barcode']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
  }

  List<Map<String, Object?>> _piles(ShopStore store) {
    final selected = _selected(store);
    if (selected != null && !_phoneGroup(store, selected)) return [];
    return store.products.where((product) {
      if ('${product['type']}' != 'PHONE' || asInt(product['active']) == 0 || asInt(product['stock']) <= 0) return false;
      if (selected != null && selected != 'phones' && product['category_id'] != selected) return false;
      final blob = '${product['name']} ${product['storage']} ${product['ram']} ${product['screen']} ${product['color']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
  }

  Widget _pileCard(Map<String, Object?> product) {
    return _tile(
      icon: Icons.smartphone,
      title: '${product['name']}',
      subtitle: unitSpec(product),
      price: asDouble(product['price']),
      foot: tf('Stoo {0}', ['${product['stock']}']),
      onTap: () => _takeGroup(product),
    );
  }

  Widget _phoneCard(Map<String, Object?> phone) {
    return _tile(
      icon: Icons.smartphone,
      title: '${phone['product_name']}',
      subtitle: unitSpec(phone),
      price: asDouble(phone['price']),
      foot: maskImei('${phone['imei']}'),
      onTap: () => _take(phone, phoneItem: true),
    );
  }

  IconData _iconFor(String category) {
    switch (category) {
      case 'chargers':
        return Icons.bolt;
      case 'audio':
        return Icons.headphones;
      case 'power':
        return Icons.battery_charging_full;
      case 'covers':
        return Icons.phone_android;
      case 'glass':
        return Icons.smartphone;
      case 'cables':
        return Icons.cable;
      case 'stands':
        return Icons.camera_alt_outlined;
      case 'holders':
        return Icons.stay_current_portrait;
      case 'tripods':
        return Icons.trip_origin;
      case 'memory':
        return Icons.sd_card_outlined;
      case 'speakers':
        return Icons.speaker_outlined;
      default:
        return Icons.inventory_2_outlined;
    }
  }

  Widget _productCard(Map<String, Object?> product) {
    final low = asInt(product['stock']) <= asInt(product['reorder_level']);
    return _tile(
      icon: _iconFor('${product['category_id']}'),
      title: '${product['name']}',
      subtitle: [
        '${product['brand'] ?? ''}'.trim(),
        '${product['color'] ?? ''}'.trim(),
        '${product['size'] ?? ''}'.trim(),
      ].where((part) => part.isNotEmpty).join(' · '),
      price: asDouble(product['price']),
      priceLabel: 'Jumla',
      foot: low ? tf('Nayo {0}', ['${product['stock']}']) : tf('Stoo {0}', ['${product['stock']}']),
      footColor: low ? const Color(0xFFB45309) : muted,
      onTap: () => _take(product, phoneItem: false),
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    required double price,
    required String foot,
    required VoidCallback onTap,
    String priceLabel = 'Jumla',
    Color footColor = muted,
  }) {
    return TapScale(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      radius: 20,
      child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(backgroundColor: sky.withValues(alpha: 0.7), child: Icon(icon, color: skyDeep)),
              const Spacer(),
              Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
              Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: muted, fontSize: 12)),
              const SizedBox(height: 6),
              Text('${t(priceLabel)} ${tsh(price)}', style: const TextStyle(color: skyDeep, fontWeight: FontWeight.w600, fontSize: 15)),
              Text(foot, style: TextStyle(color: footColor, fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
      ),
    );
  }

  Widget _cartPanel() {
    final store = widget.store;
    return AnimatedSize(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      alignment: Alignment.topCenter,
      child: Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      padding: const EdgeInsets.all(12),
      decoration: vaultCard(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Text(t('Kikapu'), style: sectionStyle),
              const SizedBox(width: 8),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                transitionBuilder: (child, animation) => ScaleTransition(scale: animation, child: child),
                child: CircleAvatar(
                  key: ValueKey(store.cart.length),
                  radius: 12,
                  backgroundColor: sky,
                  child: Text('${store.cart.length}', style: const TextStyle(fontSize: 12, color: ink, fontWeight: FontWeight.w600)),
                ),
              ),
              const Spacer(),
              AnimatedScale(
                scale: _binHot ? 1.3 : 1,
                duration: const Duration(milliseconds: 180),
                child: Icon(_binHot ? Icons.delete : Icons.delete_outline, color: _binHot ? const Color(0xFFDC2626) : muted),
              ),
              const SizedBox(width: 8),
              Text(tsh(store.cartTotal), style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
            ],
          ),
          if (store.cart.isNotEmpty)
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 180),
              child: ListView(
                shrinkWrap: true,
                children: [
                  for (final line in store.cart)
                    _ThrowTile(
                      key: ValueKey(line.uid),
                      line: line,
                      onStart: () => setState(() => _binHot = true),
                      onThrow: () {
                        store.removeLine(line);
                        if (mounted) setState(() => _binHot = false);
                      },
                      onQty: (delta) => store.changeQty(line, delta),
                      onPrice: () => _editPrice(line),
                    ),
                ],
              ),
            ),
          if (store.cart.isNotEmpty)
          Row(
            children: [
              TextButton(
                onPressed: () async {
                  setState(() => _binHot = true);
                  await Future<void>.delayed(const Duration(milliseconds: 220));
                  store.clearCart();
                  if (mounted) setState(() => _binHot = false);
                },
                child: Text(t('Futa vyote')),
              ),
              const Spacer(),
              FilledButton(
                onPressed: store.cart.isEmpty ? null : _pay,
                style: FilledButton.styleFrom(minimumSize: const Size(140, 46)),
                child: Text(t('Lipa')),
              ),
            ],
          ),
        ],
      ),
    ),
    );
  }

  Future<void> _takeGroup(Map<String, Object?> product, {bool faulty = false}) async {
    final name = '${product['name']}';
    final price = await askSalePrice(context, name: name, wholesale: asDouble(product['price']));
    if (price == null || !mounted) return;
    final imei = await askImei(context, widget.store, name: name);
    if (imei == null || !mounted) return;
    final held = await widget.store.db.imeiHeld(imei);
    if (!mounted) return;
    if (held) {
      toast(context, t('IMEI hii tayari ipo.'));
      return;
    }
    final error = widget.store.addPhoneGroup(product, salePrice: price, imei: imei, faulty: faulty);
    if (error != null) toast(context, error);
  }

  Future<void> _take(Map<String, Object?> item, {required bool phoneItem}) async {
    final id = item['id'];
    final already = phoneItem
        ? widget.store.cart.any((line) => line.phoneId == id)
        : widget.store.cart.any((line) => line.productId == id);
    if (already) {
      if (phoneItem) {
        widget.store.addPhone(item);
      } else {
        widget.store.addProduct(item);
      }
      return;
    }
    final name = phoneItem ? '${item['product_name']}' : '${item['name']}';
    final price = await askSalePrice(context, name: name, wholesale: asDouble(item['price']));
    if (price == null || !mounted) return;
    if (phoneItem) {
      widget.store.addPhone(item, salePrice: price);
    } else {
      widget.store.addProduct(item, salePrice: price);
    }
  }

  Future<void> _editPrice(CartLine line) async {
    final price = await askSalePrice(context, name: line.name, wholesale: line.price, editing: true);
    if (price == null) return;
    widget.store.setLinePrice(line, price);
  }

  Future<void> _scan() async {
    widget.store.holdLock = true;
    String? code;
    try {
      code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const ScanPage()));
    } finally {
      widget.store.holdLock = false;
    }
    if (code == null || code.trim().isEmpty || !mounted) return;
    final found = await widget.store.findCode(code);
    if (!mounted) return;
    if (found.error != null || found.item == null) {
      toast(context, found.error ?? t('Hakuna bidhaa yenye msimbo huo.'));
      return;
    }
    await _take(found.item!, phoneItem: found.item!['kind'] == 'phone');
  }

  void openPay() {
    if (!mounted || widget.store.cart.isEmpty) return;
    _pay();
  }

  Future<void> _pay() async {
    final result = await showModalBottomSheet<CheckoutResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.94,
          child: _PaySheet(store: widget.store),
        ),
      ),
    );
    if (result == null || !result.success || !mounted) return;
  }
}

Future<double?> askSalePrice(BuildContext context, {required String name, required double wholesale, bool editing = false}) {
  final field = TextEditingController(text: wholesale > 0 ? wholesale.round().toString() : '');
  return showDialog<double>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(editing ? t('Badilisha bei') : t('Bei ya kuuza')),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(name, style: const TextStyle(fontWeight: FontWeight.w700, color: ink)),
          const SizedBox(height: 6),
          Text(
            editing ? t('Bei hii ndiyo itahesabiwa kwenye mauzo, deni, na faida.') : t('Bei ya jumla ni mwongozo. Andika bei unayomuuzia mteja huyu.'),
            style: const TextStyle(color: muted, fontSize: 13),
          ),
          const SizedBox(height: 12),
          SoftField(controller: field, label: t('Anachotakiwa kulipa'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(t('Ghairi'))),
        FilledButton(
          onPressed: () {
            final price = int.tryParse(field.text.trim())?.toDouble() ?? 0;
            if (price <= 0 || price > 100000000) {
              toast(context, t('Andika bei ya kuuza.'));
              return;
            }
            Navigator.pop(context, price);
          },
          child: Text(t('Weka')),
        ),
      ],
    ),
  ).whenComplete(field.dispose);
}

Future<String?> askImei(BuildContext context, ShopStore store, {required String name}) {
  final field = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(t('IMEI')),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(name, style: const TextStyle(fontWeight: FontWeight.w700, color: ink)),
          const SizedBox(height: 12),
          SoftField(
            controller: field,
            label: t('IMEI'),
            keyboard: TextInputType.number,
            digitsOnly: true,
            maxLength: 20,
            minDigits: 8,
            rule: t('IMEI iwe tarakimu 8 hadi 20.'),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () async {
                store.holdLock = true;
                String? code;
                try {
                  code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const ScanPage(action: 'Weka IMEI')));
                } finally {
                  store.holdLock = false;
                }
                if (code == null) return;
                final digits = code.replaceAll(RegExp(r'\D'), '');
                field.text = digits.length >= 8 ? digits : code.trim();
              },
              icon: const Icon(Icons.qr_code_scanner),
              label: Text(t('Skani IMEI')),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(t('Ghairi'))),
        FilledButton(
          onPressed: () {
            final digits = field.text.replaceAll(RegExp(r'\D'), '');
            if (!RegExp(r'^\d{8,20}$').hasMatch(digits)) {
              toast(context, t('IMEI iwe tarakimu 8 hadi 20.'));
              return;
            }
            Navigator.pop(context, digits);
          },
          child: Text(t('Weka')),
        ),
      ],
    ),
  ).whenComplete(field.dispose);
}

class _ThrowTile extends StatefulWidget {
  const _ThrowTile({super.key, required this.line, required this.onStart, required this.onThrow, required this.onQty, required this.onPrice});
  final CartLine line;
  final VoidCallback onStart;
  final VoidCallback onThrow;
  final void Function(int delta) onQty;
  final VoidCallback onPrice;

  @override
  State<_ThrowTile> createState() => _ThrowTileState();
}

class _ThrowTileState extends State<_ThrowTile> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 420));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _away() async {
    widget.onStart();
    await _controller.forward();
    if (!mounted) return;
    widget.onThrow();
  }

  @override
  Widget build(BuildContext context) {
    final line = widget.line;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = Curves.easeInCubic.transform(_controller.value);
        return Opacity(
          opacity: 1 - t,
          child: Transform.translate(
            offset: Offset(90 * t, -28 * t),
            child: Transform.scale(scale: 1 - (0.8 * t), alignment: Alignment.topRight, child: child),
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(line.faulty ? '${line.name} · ${t('Matatizo')}' : line.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, color: ink)),
                  Text(line.imei == null ? tf('Bei {0} · {1}', [tsh(line.price), tsh(line.lineTotal)]) : '${maskImei(line.imei!)} · ${tsh(line.price)}', style: const TextStyle(color: muted, fontSize: 12)),
                ],
              ),
            ),
            if (line.phoneId == null && (line.imei ?? '').isEmpty) ...[
              IconButton(onPressed: () => line.qty == 1 ? _away() : widget.onQty(-1), icon: const Icon(Icons.remove_circle_outline, color: skyDeep)),
              Text('${line.qty}', style: const TextStyle(fontWeight: FontWeight.w600)),
              IconButton(onPressed: () => widget.onQty(1), icon: const Icon(Icons.add_circle_outline, color: skyDeep)),
            ],
            IconButton(onPressed: widget.onPrice, icon: const Icon(Icons.edit_outlined, color: skyDeep)),
            IconButton(onPressed: _away, icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626))),
          ],
        ),
      ),
    );
  }
}

class _PaySheet extends StatefulWidget {
  const _PaySheet({required this.store});
  final ShopStore store;

  @override
  State<_PaySheet> createState() => _PaySheetState();
}

class _PaySheetState extends State<_PaySheet> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _amount = TextEditingController();
  final _ref = TextEditingController();
  final _term = TextEditingController();
  String _kind = 'CASH';
  String _partMethod = 'CASH';
  String _termUnit = 'SIKU';
  bool _busy = false;
  bool _fresh = true;

  @override
  void initState() {
    super.initState();
    _amount.text = '0';
    _amount.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _amount.dispose();
    _ref.dispose();
    _term.dispose();
    super.dispose();
  }

  int get _termDays {
    final count = int.tryParse(_term.text.trim()) ?? 0;
    if (_termUnit == 'WIKI') return count * 7;
    if (_termUnit == 'MWEZI') return count * 30;
    return count;
  }

  bool get _cash => _kind == 'CASH' || (_kind == 'PART' && _partMethod == 'CASH');

  double get _raw => int.tryParse(_amount.text.trim())?.toDouble() ?? 0;

  @override
  Widget build(BuildContext context) {
    final total = widget.store.cartTotal;
    final raw = _kind == 'ALL' ? 0.0 : _raw;
    final handed = _cash || raw <= total ? raw : total;
    final change = _cash ? (raw - total).clamp(0, double.infinity).toDouble() : 0.0;
    final debt = (total - (_cash ? raw : handed)).clamp(0, double.infinity).toDouble();
    final canDebt = widget.store.seeDebts;
    final confirm = change > 0
        ? tf('Thibitisha · rudisha {0}', [tsh(change)])
        : debt > 0.5
            ? tf('Thibitisha · deni {0}', [tsh(debt)])
            : t('Thibitisha mauzo');
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            children: [
              Text(t('Malipo'), style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: ink)),
              const SizedBox(height: 12),
              SoftField(controller: _name, label: t('Jina la mteja'), maxLength: 40),
              const SizedBox(height: 8),
              SoftField(
                controller: _phone,
                label: t('Simu ya mteja'),
                keyboard: TextInputType.phone,
                phone: true,
                contacts: true,
                nameWith: _name,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _payChip('CASH', t('Cash')),
                  _payChip('LIPA', t('Lipa Namba')),
                  if (canDebt) _payChip('PART', t('Deni nusu')),
                  if (canDebt) _payChip('ALL', t('Deni zima')),
                ],
              ),
              if (_kind == 'PART') ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _partChip('CASH', t('Cash')),
                    _partChip('LIPA', t('Lipa Namba')),
                  ],
                ),
              ],
              if (debt > 0.5 && canDebt) ...[
                const SizedBox(height: 12),
                Text(t('Anakopa kwa muda gani?'), style: TextStyle(fontWeight: FontWeight.w600, color: ink)),
                const SizedBox(height: 4),
                Text(t('Chini ya mwezi, ukumbusho siku 1 kabla. Mwezi au zaidi, siku 3 kabla.'), style: captionStyle),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final unit in [('SIKU', t('Siku')), ('WIKI', t('Wiki')), ('MWEZI', t('Mwezi'))])
                      ChoiceChip(
                        label: Text(t(unit.$2)),
                        selected: _termUnit == unit.$1,
                        selectedColor: sky,
                        onSelected: (_) => setState(() => _termUnit = unit.$1),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                SoftField(controller: _term, label: t('Muda'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 4),
              ],
              if (_kind == 'LIPA' || (_kind == 'PART' && _partMethod == 'LIPA')) ...[
                const SizedBox(height: 12),
                _lipaCard(context),
                const SizedBox(height: 8),
                SoftField(controller: _ref, label: t('Kumbukumbu ya Lipa'), maxLength: 40),
              ],
              if (_kind == 'ALL') ...[
                const SizedBox(height: 12),
                _tally(total: total, handed: 0, change: 0, debt: total),
              ] else ...[
                const SizedBox(height: 12),
                _tally(total: total, handed: _cash ? raw : handed, change: change, debt: debt),
                const SizedBox(height: 10),
                Directionality(textDirection: TextDirection.ltr, child: _pad(total)),
              ],
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _busy ? null : () => _submit(cash: _cash),
                child: _busy
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                    : Text(confirm),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _tally({required double total, required double handed, required double change, required double debt}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: skyPage, borderRadius: BorderRadius.circular(18)),
      child: Column(
        children: [
          _figure(t('Anachotakiwa kulipa'), tsh(total), ink, strong: false),
          const SizedBox(height: 8),
          _figure(t('Alichotoa'), tsh(handed), ink, strong: true),
          const SizedBox(height: 8),
          if (debt > 0.5)
            _figure(t('Deni litabaki'), tsh(debt), const Color(0xFFB45309), strong: true)
          else
            _figure(t('Alichorudishiwa'), tsh(change), skyDeep, strong: true),
        ],
      ),
    );
  }

  Widget _figure(String label, String value, Color color, {required bool strong}) {
    return Row(
      children: [
        Expanded(child: Text(label, style: TextStyle(color: strong ? color : muted, fontWeight: FontWeight.w600))),
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: strong ? 20 : 16)),
      ],
    );
  }

  Widget _pad(double total) {
    const notes = [1000, 2000, 5000, 10000, 20000, 50000];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(t('Andika alichotoa mteja. Sahihi ikiwa amelipa kiasi chote.'), style: TextStyle(color: muted, fontSize: 12)),
        const SizedBox(height: 8),
        if (_cash) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ActionChip(
                label: Text(t('Sahihi')),
                onPressed: () => _setAmount(total.round(), fresh: true),
              ),
              for (final note in notes)
                ActionChip(
                  label: Text(tsh(note)),
                  onPressed: () => _addNote(note),
                ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 2.1,
          children: [
            for (final key in ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'])
              Material(
                color: key == 'C' ? const Color(0xFFFFF7ED) : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: Color(0xFFD7EED0)),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => _tapKey(key, total),
                  child: Center(
                    child: Text(key, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: ink)),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  void _setAmount(int value, {required bool fresh}) {
    final safe = value.clamp(0, 999999999);
    _fresh = fresh;
    _amount.text = '$safe';
  }

  void _addNote(int note) {
    final current = _fresh ? 0 : (int.tryParse(_amount.text) ?? 0);
    _setAmount(current + note, fresh: false);
  }

  void _tapKey(String key, double total) {
    if (key == 'C') {
      _setAmount(0, fresh: false);
      return;
    }
    if (key == '⌫') {
      final text = _amount.text;
      _setAmount(text.length <= 1 ? 0 : int.parse(text.substring(0, text.length - 1)), fresh: false);
      return;
    }
    final text = _fresh || _amount.text == '0' ? '' : _amount.text;
    if (text.length >= 9) return;
    var next = int.parse('$text$key');
    if (!_cash) {
      final cap = total.round();
      if (next > cap) next = cap;
    }
    _setAmount(next, fresh: false);
  }

  Widget _lipaCard(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: skyPage, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t('Mteja alipe namba hii, nje ya simu hii'), style: TextStyle(color: muted, fontSize: 12)),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  widget.store.lipaNumber.isEmpty ? t('Weka Lipa Namba kwenye mipangilio') : widget.store.lipaNumber,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: ink),
                ),
              ),
              if (widget.store.lipaNumber.isNotEmpty)
                IconButton(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: widget.store.lipaNumber));
                    if (context.mounted) toast(context, t('Namba imenakiliwa'));
                  },
                  icon: const Icon(Icons.copy, color: skyDeep),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _payChip(String kind, String label) {
    return ChoiceChip(
      label: Text(label),
      selected: _kind == kind,
      selectedColor: sky,
      onSelected: (_) => _pick(kind),
    );
  }

  Widget _partChip(String method, String label) {
    return ChoiceChip(
      label: Text(label),
      selected: _partMethod == method,
      selectedColor: sky,
      onSelected: (_) => setState(() => _partMethod = method),
    );
  }

  void _pick(String kind) {
    setState(() {
      _kind = kind;
      final exact = widget.store.cartTotal.round();
      if (kind == 'CASH' || kind == 'LIPA') {
        _fresh = true;
        _amount.text = '0';
      } else if (kind == 'ALL') {
        _fresh = true;
        _amount.text = '0';
      } else if (_amount.text == '$exact' || _amount.text == '0') {
        _fresh = true;
        _amount.text = '0';
      }
    });
  }

  Future<void> _submit({required bool cash}) async {
    setState(() => _busy = true);
    final total = widget.store.cartTotal;
    final raw = int.tryParse(_amount.text.trim())?.toDouble() ?? 0;
    final amount = _kind == 'ALL' ? 0.0 : (cash ? raw : (raw > total ? total : raw));
    final result = await widget.store.checkout(
      customerName: _name.text,
      customerPhone: _phone.text,
      method: _kind == 'ALL' ? 'DENI' : (_kind == 'PART' ? _partMethod : _kind),
      amount: amount,
      lipaRef: _ref.text,
      termDays: _termDays,
      termUnit: _termUnit,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (!result.success) {
      toast(context, result.message);
      return;
    }
    final phone = _phone.text;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ReceiptDialog(result: result, store: widget.store, phone: phone),
    );
    if (mounted) Navigator.pop(context, result);
  }
}

class _ReceiptDialog extends StatefulWidget {
  const _ReceiptDialog({required this.result, required this.store, required this.phone});
  final CheckoutResult result;
  final ShopStore store;
  final String phone;

  @override
  State<_ReceiptDialog> createState() => _ReceiptDialogState();
}

class _ReceiptDialogState extends State<_ReceiptDialog> {
  bool _sending = false;

  Future<void> _send() async {
    setState(() => _sending = true);
    final result = widget.result;
    final bytes = await buildSaleReceipt(
      shop: widget.store.paperShop,
      invoice: result.invoice,
      when: DateTime.now(),
      customer: result.customer,
      phone: widget.phone,
      cashier: result.cashier,
      method: methodLabel(result.method),
      total: result.total,
      paid: result.paid,
      change: result.change,
      balance: result.balance,
      lines: [for (final line in result.lines) PaperLine(name: line.name, qty: line.qty, price: line.price, imei: line.imei ?? '')],
    );
    final error = await sendWhatsappPdf(phone: widget.phone, bytes: bytes, filename: '${result.invoice}.png');
    if (!mounted) return;
    setState(() => _sending = false);
    toast(context, error ?? t('WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.'));
  }

  @override
  Widget build(BuildContext context) {
    final result = widget.result;
    Widget row(String label, String value) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 118, child: Text(label, style: captionStyle)),
            Expanded(child: Text(value, style: bodyStyle)),
          ],
        ),
      );
    }

    return AlertDialog(
      title: Text(result.balance > 0 ? t('Imeuzwa kwa deni') : t('Imeuzwa')),
      content: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.5),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.store.shopLogo != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: skyDeep, borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                        child: HoldPhoto(bytes: widget.store.shopLogo, fit: BoxFit.contain),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(widget.store.shopName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              const Icon(Icons.check_circle, color: skyDeep, size: 36),
              const SizedBox(height: 12),
              if (widget.store.shopLocation.trim().isNotEmpty) row(t('Mahali'), widget.store.shopLocation.trim()),
              if (showPhone(widget.store.shopPhone).isNotEmpty) row(t('Simu ya duka'), showPhone(widget.store.shopPhone)),
              row(t('Risiti'), result.invoice),
              row(t('Mteja'), result.customer),
              row(t('Simu'), showPhone(widget.phone).isEmpty ? '—' : showPhone(widget.phone)),
              row(t('Malipo'), methodLabel(result.method)),
              if (result.method == 'LIPA' && widget.store.lipaNumber.isNotEmpty) row(t('Lipa'), widget.store.lipaNumber),
              row(t('Jumla'), tsh(result.total)),
              row(t('Alichotoa'), tsh(result.paid + result.change)),
              if (result.change > 0) row(t('Alichorudishiwa'), tsh(result.change)),
              if (result.balance > 0) row(t('Deni'), tsh(result.balance)),
              row(t('Muuzaji'), result.cashier),
              const Divider(),
              PaperLines(lines: [for (final line in result.lines) PaperLine(name: line.name, qty: line.qty, price: line.price, imei: line.imei ?? '')]),
              if (widget.store.receiptFooter.trim().isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(widget.store.receiptFooter.trim(), style: captionStyle),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: _sending ? null : _send, child: Text(_sending ? t('Inaandaa...') : t('Tuma risiti'))),
        FilledButton(onPressed: () => Navigator.pop(context), child: Text(t('Maliza'))),
      ],
    );
  }
}
