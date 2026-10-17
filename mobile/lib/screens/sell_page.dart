import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../money.dart';
import '../receipt_pdf.dart';
import '../shop_db.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../whatsapp.dart';
import '../widgets/ui.dart';
import 'scan_page.dart';

class SellPage extends StatefulWidget {
  const SellPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<SellPage> createState() => _SellPageState();
}

class _SellPageState extends State<SellPage> {
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
                    const Expanded(child: Text('Uza', style: titleStyle)),
                    IconButton(tooltip: 'Msimbo', onPressed: _scan, icon: const Icon(Icons.qr_code_scanner, color: skyDeep)),
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
                  decoration: const InputDecoration(
                    hintText: 'Tafuta jina, IMEI au barcode',
                    prefixIcon: Icon(Icons.search),
                    counterText: '',
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _chip('Zote', null),
                      for (final category in store.categories) _chip('${category['name']}', '${category['id']}'),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: phones.isEmpty && goods.isEmpty
                    ? const EmptyHint(text: 'Hakuna bidhaa kwenye kundi hili. Ongeza kwenye Stoo.')
                    : GridView.count(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.72,
                        children: [
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

  Widget _chip(String label, String? id) {
    final selected = _selected(widget.store) == id;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      selectedColor: sky,
      visualDensity: VisualDensity.compact,
      onSelected: (_) => setState(() => _category = id),
    );
  }

  List<Map<String, Object?>> _phones(ShopStore store) {
    final selected = _selected(store);
    if (selected != null && selected != 'phones') return [];
    return store.phones.where((phone) {
      if (phone['status'] != 'IN_STOCK') return false;
      final blob = '${phone['product_name']} ${phone['imei']} ${phone['storage']} ${phone['color']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
  }

  List<Map<String, Object?>> _goods(ShopStore store) {
    final selected = _selected(store);
    if (selected == 'phones') return [];
    return store.products.where((product) {
      if (asInt(product['active']) == 0 || asInt(product['stock']) <= 0) return false;
      if (selected != null && product['category_id'] != selected) return false;
      final blob = '${product['name']} ${product['brand']} ${product['barcode']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
  }

  Widget _phoneCard(Map<String, Object?> phone) {
    return _tile(
      icon: Icons.smartphone,
      title: '${phone['product_name']}',
      subtitle: '${phone['storage'] ?? ''} · ${phone['color'] ?? ''}',
      price: asDouble(phone['price']),
      foot: maskImei('${phone['imei']}'),
      onTap: () => widget.store.addPhone(phone),
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
      foot: low ? 'Nayo ${product['stock']}' : 'Stoo ${product['stock']}',
      footColor: low ? const Color(0xFFB45309) : muted,
      onTap: () => widget.store.addProduct(product),
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    required double price,
    required String foot,
    required VoidCallback onTap,
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
              Text(tsh(price), style: const TextStyle(color: skyDeep, fontWeight: FontWeight.w600, fontSize: 15)),
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
              const Text('Kikapu', style: sectionStyle),
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
          if (store.cart.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Text('Gusa bidhaa. Kuondoa, itapita kwenye pipa.', style: TextStyle(color: muted, fontSize: 12)),
            )
          else
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
                child: const Text('Futa vyote'),
              ),
              const Spacer(),
              FilledButton(
                onPressed: store.cart.isEmpty ? null : _pay,
                style: FilledButton.styleFrom(minimumSize: const Size(140, 46)),
                child: const Text('Lipa'),
              ),
            ],
          ),
        ],
      ),
    ),
    );
  }

  Future<void> _scan() async {
    final code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const ScanPage()));
    if (code == null || code.trim().isEmpty || !mounted) return;
    final error = await widget.store.scan(code);
    if (error != null && mounted) toast(context, error);
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

class _ThrowTile extends StatefulWidget {
  const _ThrowTile({super.key, required this.line, required this.onStart, required this.onThrow, required this.onQty});
  final CartLine line;
  final VoidCallback onStart;
  final VoidCallback onThrow;
  final void Function(int delta) onQty;

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
                  Text(line.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, color: ink)),
                  Text(line.imei == null ? tsh(line.lineTotal) : maskImei(line.imei!), style: const TextStyle(color: muted, fontSize: 12)),
                ],
              ),
            ),
            if (line.phoneId == null) ...[
              IconButton(onPressed: () => line.qty == 1 ? _away() : widget.onQty(-1), icon: const Icon(Icons.remove_circle_outline, color: skyDeep)),
              Text('${line.qty}', style: const TextStyle(fontWeight: FontWeight.w600)),
              IconButton(onPressed: () => widget.onQty(1), icon: const Icon(Icons.add_circle_outline, color: skyDeep)),
            ],
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
  String _kind = 'CASH';
  String _partMethod = 'CASH';
  bool _busy = false;
  bool _fresh = true;

  @override
  void initState() {
    super.initState();
    _amount.text = widget.store.cartTotal.round().toString();
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
    super.dispose();
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
        ? 'Thibitisha · rudisha ${tsh(change)}'
        : debt > 0.5
            ? 'Thibitisha · deni ${tsh(debt)}'
            : 'Thibitisha mauzo';
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            children: [
              const Text('Malipo', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: ink)),
              const SizedBox(height: 12),
              SoftField(controller: _name, label: 'Jina la mteja', maxLength: 40),
              const SizedBox(height: 8),
              SoftField(
                controller: _phone,
                label: 'Simu ya mteja',
                keyboard: TextInputType.phone,
                phone: true,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _payChip('CASH', 'Cash'),
                  _payChip('LIPA', 'Lipa Namba'),
                  if (canDebt) _payChip('PART', 'Deni nusu'),
                  if (canDebt) _payChip('ALL', 'Deni zima'),
                ],
              ),
              if (_kind == 'PART') ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _partChip('CASH', 'Cash'),
                    _partChip('LIPA', 'Lipa Namba'),
                  ],
                ),
              ],
              if (_kind == 'LIPA' || (_kind == 'PART' && _partMethod == 'LIPA')) ...[
                const SizedBox(height: 12),
                _lipaCard(context),
                const SizedBox(height: 8),
                SoftField(controller: _ref, label: 'Kumbukumbu namba (si lazima)', maxLength: 40),
              ],
              if (_kind == 'ALL') ...[
                const SizedBox(height: 12),
                _tally(total: total, handed: 0, change: 0, debt: total),
              ] else ...[
                const SizedBox(height: 12),
                _tally(total: total, handed: _cash ? raw : handed, change: change, debt: debt),
                const SizedBox(height: 10),
                _pad(total),
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
                child: Text(_busy ? 'Inahifadhi...' : confirm),
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
          _figure('Jumla', tsh(total), ink, strong: false),
          const SizedBox(height: 8),
          _figure('Alichotoa', tsh(handed), ink, strong: true),
          const SizedBox(height: 8),
          if (debt > 0.5)
            _figure('Deni litabaki', tsh(debt), const Color(0xFFB45309), strong: true)
          else
            _figure('Alichorudishiwa', tsh(change), skyDeep, strong: true),
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
        if (_cash) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ActionChip(
                label: const Text('Sahihi'),
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
                  side: const BorderSide(color: Color(0xFFD7F3FF)),
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
          const Text('Mteja alipe namba hii, nje ya simu hii', style: TextStyle(color: muted, fontSize: 12)),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  widget.store.lipaNumber.isEmpty ? 'Weka Lipa Namba kwenye mipangilio' : widget.store.lipaNumber,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: ink),
                ),
              ),
              if (widget.store.lipaNumber.isNotEmpty)
                IconButton(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: widget.store.lipaNumber));
                    if (context.mounted) toast(context, 'Namba imenakiliwa');
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
        _amount.text = '$exact';
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
      lines: [for (final line in result.lines) PaperLine(name: line.name, qty: line.qty, price: line.price)],
    );
    final error = await sendWhatsappPdf(phone: widget.phone, bytes: bytes, filename: '${result.invoice}.pdf');
    if (!mounted) return;
    setState(() => _sending = false);
    toast(context, error ?? 'WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.');
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
            SizedBox(width: 88, child: Text(label, style: captionStyle)),
            Expanded(child: Text(value, style: bodyStyle)),
          ],
        ),
      );
    }

    return AlertDialog(
      title: Text(result.balance > 0 ? 'Imeuzwa kwa deni' : 'Imeuzwa'),
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
                        child: Image.memory(widget.store.shopLogo!, fit: BoxFit.contain, filterQuality: FilterQuality.high),
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
              row('Risiti', result.invoice),
              row('Mteja', result.customer),
              row('Simu', showPhone(widget.phone).isEmpty ? '—' : showPhone(widget.phone)),
              row('Malipo', methodLabel(result.method)),
              if (result.method == 'LIPA' && widget.store.lipaNumber.isNotEmpty) row('Lipa', widget.store.lipaNumber),
              row('Jumla', tsh(result.total)),
              row('Alichotoa', tsh(result.paid + result.change)),
              if (result.change > 0) row('Alichorudishiwa', tsh(result.change)),
              if (result.balance > 0) row('Deni', tsh(result.balance)),
              row('Muuzaji', result.cashier),
              const Divider(),
              for (final line in result.lines)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Expanded(child: Text('${line.name}  x${line.qty}', style: bodyStyle)),
                      Text(tsh(line.lineTotal), style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: _sending ? null : _send, child: Text(_sending ? 'Inaandaa...' : 'Tuma risiti')),
        FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Maliza')),
      ],
    );
  }
}
