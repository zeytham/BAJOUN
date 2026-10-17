import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class StockPage extends StatefulWidget {
  const StockPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<StockPage> createState() => _StockPageState();
}

class _StockPageState extends State<StockPage> {
  final _search = TextEditingController();
  String _query = '';
  bool _phones = false;
  bool _sold = false;

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
          return const Scaffold(backgroundColor: skyPage, body: LockedNote(title: 'Stoo'));
        }
        return Scaffold(
          backgroundColor: skyPage,
          floatingActionButton: store.editStock
              ? FloatingActionButton.extended(
                  backgroundColor: skyDeep,
                  foregroundColor: Colors.white,
                  onPressed: () => _phones ? _phoneForm() : _productForm(),
                  icon: const Icon(Icons.add),
                  label: Text(_phones ? 'Ongeza simu' : 'Ongeza kifaa'),
                )
              : null,
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              const Text('Stoo', style: titleStyle),
              const SizedBox(height: 4),
              Text(
                store.editStock ? 'Gusa bidhaa kuibadilisha bei, idadi, au kuiondoa.' : 'Unaona bei na idadi. Kubadilisha stoo kunawashwa na mmiliki.',
                style: captionStyle,
              ),
              const SizedBox(height: 12),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: false, label: Text('Vifaa'), icon: Icon(Icons.headphones)),
                  ButtonSegment(value: true, label: Text('Simu'), icon: Icon(Icons.smartphone)),
                ],
                selected: {_phones},
                onSelectionChanged: (value) => setState(() => _phones = value.first),
              ),
              const SizedBox(height: 10),
              if (store.editStock)
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    onPressed: _addCategory,
                    icon: const Icon(Icons.category_outlined),
                    label: const Text('Ongeza kundi'),
                  ),
                ),
              TextField(
                controller: _search,
                maxLength: 40,
                inputFormatters: [LengthLimitingTextInputFormatter(40)],
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(hintText: 'Tafuta stoo', prefixIcon: Icon(Icons.search), counterText: ''),
              ),
              if (_phones) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilterChip(
                    label: const Text('Zilizouzwa'),
                    selected: _sold,
                    onSelected: (value) => setState(() => _sold = value),
                  ),
                ),
                const SizedBox(height: 8),
                ..._phoneCards(store),
              ] else
                ..._sections(store),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _sections(ShopStore store) {
    final widgets = <Widget>[];
    final categories = store.categories.where((row) => row['id'] != 'phones');
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
            Expanded(child: Text(name, style: sectionStyle)),
            if (store.editStock && '${category['id']}' != 'phones')
              TextButton(
                onPressed: () => _removeCategory(category),
                child: const Text('Futa', style: TextStyle(color: Color(0xFFDC2626))),
              ),
          ],
        ),
      ));
      if (items.isEmpty) {
        widgets.add(const Padding(
          padding: EdgeInsets.only(bottom: 8),
          child: Text('Bado hakuna bidhaa.', style: captionStyle),
        ));
      }
      widgets.addAll(items.map(_productCard));
    }
    if (widgets.isEmpty) widgets.add(const EmptyHint(text: 'Hakuna vifaa. Mmiliki anaweza kuongeza bidhaa mpya.'));
    return widgets;
  }

  List<Widget> _phoneCards(ShopStore store) {
    final items = store.phones.where((phone) {
      final sold = phone['status'] != 'IN_STOCK';
      if (_sold != sold) return false;
      final blob = '${phone['product_name']} ${phone['imei']} ${phone['color']} ${phone['storage']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
    if (items.isEmpty) return [const EmptyHint(text: 'Hakuna simu kwenye orodha hii.')];
    return items.map(_phoneCard).toList();
  }

  Widget _productCard(Map<String, Object?> product) {
    final low = asInt(product['stock']) <= asInt(product['reorder_level']);
    final brand = '${product['brand'] ?? ''}'.trim();
    final color = '${product['color'] ?? ''}'.trim();
    final size = '${product['size'] ?? ''}'.trim();
    final cost = widget.store.seeCost ? 'Gharama ${tsh(asDouble(product['cost']))}' : '';
    return _card(
      title: '${product['name']}',
      meta: [brand, if (color.isNotEmpty) color, if (size.isNotEmpty) size, cost].where((line) => line.isNotEmpty).join(' · '),
      price: tsh(asDouble(product['price'])),
      badge: low ? 'Chini · ${product['stock']}' : 'Stoo ${product['stock']}',
      warn: low,
      onTap: widget.store.editStock ? () => _productForm(product) : null,
      extra: widget.store.editStock
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton.icon(
                  onPressed: () => _addStock(product),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Ongeza mzigo'),
                ),
                TextButton(
                  onPressed: () => _retireProduct(product),
                  child: const Text('Ondoa', style: TextStyle(color: Color(0xFFDC2626))),
                ),
              ],
            )
          : null,
    );
  }

  Widget _phoneCard(Map<String, Object?> phone) {
    return _card(
      title: '${phone['product_name']}',
      meta: '${phone['storage'] ?? ''} · ${phone['color'] ?? ''} · ${widget.store.isOwner && widget.store.revealSensitive ? phone['imei'] : maskImei('${phone['imei']}')}',
      price: tsh(asDouble(phone['price'])),
      badge: phone['status'] == 'IN_STOCK' ? 'Dukani' : 'Imeuzwa',
      warn: false,
      onTap: widget.store.editStock && phone['status'] == 'IN_STOCK' ? () => _phoneForm(phone) : null,
      extra: widget.store.editStock && phone['status'] == 'IN_STOCK'
          ? TextButton(
              onPressed: () => _retirePhone(phone),
              child: const Text('Ondoa', style: TextStyle(color: Color(0xFFDC2626))),
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
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TapScale(
            onTap: onTap,
            radius: 16,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: ink)),
                        const SizedBox(height: 2),
                        Text(meta, maxLines: 1, overflow: TextOverflow.ellipsis, style: captionStyle),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(price, style: const TextStyle(fontWeight: FontWeight.w600, color: skyDeep)),
                      const SizedBox(height: 4),
                      Text(badge, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: warn ? const Color(0xFFB45309) : muted)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (extra != null) Align(alignment: Alignment.centerRight, child: extra),
        ],
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
    final error = await widget.store.addStock('${product['id']}', extra);
    if (!mounted) return;
    toast(context, error ?? 'Idadi imeongezwa. Sasa ni ${current + extra}.');
  }

  Future<void> _retireProduct(Map<String, Object?> product) async {
    final ok = await confirm(
      context,
      'Ondoa ${product['name']}',
      'Itaondoka kwenye Uza na Stoo. Mauzo, ripoti, na historia ya nyuma vinabaki.',
    );
    if (!ok || !mounted) return;
    final error = await widget.store.retireProduct('${product['id']}');
    if (!mounted) return;
    toast(context, error ?? 'Imeondolewa. Historia inabaki.');
  }

  Future<void> _retirePhone(Map<String, Object?> phone) async {
    final ok = await confirm(
      context,
      'Ondoa ${phone['product_name']}',
      'Itaondoka kwenye stoo. Risiti na ripoti za simu zilizouzwa zinabaki.',
    );
    if (!ok || !mounted) return;
    final error = await widget.store.deletePhone('${phone['id']}');
    if (!mounted) return;
    toast(context, error ?? 'Imeondolewa. Historia inabaki.');
  }

  Future<void> _addCategory() async {
    final name = await showDialog<String>(
      context: context,
      builder: (context) => const _NameDialog(title: 'Kundi jipya', label: 'Jina la kundi', action: 'Hifadhi'),
    );
    if (name == null || name.isEmpty || !mounted) return;
    final saved = await widget.store.saveCategory(name);
    if (!mounted) return;
    if (saved.error != null) {
      toast(context, saved.error!);
      return;
    }
    toast(context, saved.existed ? 'Kundi hili lipo tayari.' : 'Kundi limeongezwa.');
  }

  Future<void> _removeCategory(Map<String, Object?> category) async {
    final name = '${category['name']}';
    final ok = await confirm(
      context,
      'Futa $name',
      'Bidhaa za kundi hili zitaingia Nyingine. Mauzo ya zamani yanabaki kwenye ripoti.',
    );
    if (!ok || !mounted) return;
    final error = await widget.store.deleteCategory('${category['id']}');
    if (!mounted) return;
    toast(context, error ?? 'Kundi limefutwa.');
  }

  Future<void> _productForm([Map<String, Object?>? existing]) async {
    final error = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _ProductForm(store: widget.store, existing: existing),
    );
    if (error != null && mounted) toast(context, error);
  }

  Future<void> _phoneForm([Map<String, Object?>? existing]) async {
    final error = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
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
  late final TextEditingController _warranty;
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
    _stock = TextEditingController(text: row == null ? '' : '${asInt(row['stock'])}');
    _barcode = TextEditingController(text: '${row?['barcode'] ?? ''}');
    _reorder = TextEditingController(text: row == null ? '3' : '${asInt(row['reorder_level'])}');
    _warranty = TextEditingController(text: row == null ? '0' : '${asInt(row['warranty_months'])}');
    _color = TextEditingController(text: '${row?['color'] ?? ''}');
    _size = TextEditingController(text: '${row?['size'] ?? ''}');
    _category = row?['category_id'] as String?;
  }

  @override
  void dispose() {
    for (final controller in [_name, _brand, _price, _cost, _stock, _barcode, _reorder, _warranty, _color, _size]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = widget.store.categories.where((row) => row['id'] != 'phones').toList();
    _category ??= categories.isEmpty ? null : categories.first['id'] as String;
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.existing == null ? 'Bidhaa mpya' : 'Hariri bidhaa', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            SoftField(controller: _name, label: 'Jina', maxLength: 60),
            const SizedBox(height: 8),
            SoftField(controller: _brand, label: 'Brand', maxLength: 30),
            const SizedBox(height: 8),
            SoftField(controller: _color, label: 'Rangi', maxLength: 30),
            const SizedBox(height: 8),
            SoftField(controller: _size, label: 'Size', maxLength: 30),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: ValueKey(_category),
              initialValue: categories.any((row) => '${row['id']}' == _category) ? _category : null,
              decoration: const InputDecoration(labelText: 'Kundi'),
              items: [for (final category in categories) DropdownMenuItem(value: '${category['id']}', child: Text('${category['name']}'))],
              onChanged: (value) => setState(() => _category = value),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(onPressed: _newCategory, icon: const Icon(Icons.add), label: const Text('Ongeza kundi')),
            ),
            SoftField(controller: _price, label: 'Bei ya kuuza', keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            if (widget.store.seeCost) ...[
              const SizedBox(height: 8),
              SoftField(controller: _cost, label: 'Gharama (mmiliki)', keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            ],
            const SizedBox(height: 8),
            SoftField(
              controller: _stock,
              label: widget.existing == null ? 'Idadi dukani' : 'Idadi yote iliyopo',
              keyboard: TextInputType.number,
              digitsOnly: true,
              maxLength: 6,
            ),
            const SizedBox(height: 8),
            SoftField(controller: _reorder, label: 'Onyo stoo ikifika', keyboard: TextInputType.number, digitsOnly: true, maxLength: 5),
            const SizedBox(height: 8),
            SoftField(controller: _barcode, label: 'Barcode', maxLength: 32),
            const SizedBox(height: 8),
            SoftField(controller: _warranty, label: 'Warranty (miezi)', keyboard: TextInputType.number, digitsOnly: true, maxLength: 2),
            const SizedBox(height: 12),
            FilledButton(onPressed: _busy ? null : _save, child: const Text('Hifadhi')),
            if (widget.existing != null)
              TextButton(
                onPressed: _busy ? null : _retire,
                child: const Text('Ondoa bidhaa', style: TextStyle(color: Color(0xFFDC2626))),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _newCategory() async {
    final name = await showDialog<String>(
      context: context,
      builder: (context) => const _NameDialog(title: 'Kundi jipya', label: 'Jina', action: 'Ongeza'),
    );
    if (name == null || !mounted) return;
    final saved = await widget.store.saveCategory(name);
    if (!mounted) return;
    if (saved.error != null) {
      toast(context, saved.error!);
      return;
    }
    setState(() => _category = saved.id);
    toast(context, saved.existed ? 'Kundi hili lipo tayari.' : 'Kundi limeongezwa.');
  }

  Future<void> _save() async {
    if (_category == null) {
      toast(context, 'Chagua kundi.');
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
      stock: int.tryParse(_stock.text.trim()) ?? 0,
      barcode: _barcode.text,
      reorder: int.tryParse(_reorder.text.trim()) ?? 3,
      warranty: int.tryParse(_warranty.text.trim()) ?? 0,
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
    final ok = await confirm(context, 'Ondoa bidhaa', 'Itaondoka kwenye Uza na Stoo. Mauzo, ripoti, na historia ya nyuma vinabaki.');
    if (!ok || !mounted) return;
    final error = await widget.store.retireProduct(widget.existing!['id'] as String);
    if (!mounted) return;
    Navigator.pop(context, error);
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
  late final TextEditingController _price;
  late final TextEditingController _cost;
  late final TextEditingController _floor;
  late final TextEditingController _warranty;
  String _condition = 'NEW';
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final row = widget.existing;
    _name = TextEditingController(text: '${row?['product_name'] ?? ''}');
    _imei = TextEditingController(text: '${row?['imei'] ?? ''}');
    _color = TextEditingController(text: '${row?['color'] ?? ''}');
    _storage = TextEditingController(text: '${row?['storage'] ?? ''}');
    _price = TextEditingController(text: row == null ? '' : '${asInt(row['price'])}');
    _cost = TextEditingController(text: row == null ? '' : '${asInt(row['cost'])}');
    _floor = TextEditingController(text: row == null ? '' : '${asInt(row['floor_price'])}');
    _warranty = TextEditingController(text: row == null ? '12' : '${asInt(row['warranty_months'])}');
    _condition = '${row?['condition'] ?? 'NEW'}';
  }

  @override
  void dispose() {
    for (final controller in [_name, _imei, _color, _storage, _price, _cost, _floor, _warranty]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.existing == null ? 'Simu mpya' : 'Hariri simu', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            SoftField(controller: _name, label: 'Jina', maxLength: 60),
            const SizedBox(height: 8),
            SoftField(
              controller: _imei,
              label: 'IMEI',
              keyboard: TextInputType.number,
              digitsOnly: true,
              maxLength: 20,
              minDigits: 8,
              rule: 'IMEI iwe tarakimu 8 hadi 20.',
            ),
            const SizedBox(height: 8),
            SoftField(controller: _storage, label: 'Storage, mfano 256GB', maxLength: 20),
            const SizedBox(height: 8),
            SoftField(controller: _color, label: 'Rangi', maxLength: 20),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _condition,
              decoration: const InputDecoration(labelText: 'Hali'),
              items: const [
                DropdownMenuItem(value: 'NEW', child: Text('Mpya')),
                DropdownMenuItem(value: 'LIKE NEW', child: Text('Kama mpya')),
                DropdownMenuItem(value: 'USED', child: Text('Imetumika')),
              ],
              onChanged: (value) => setState(() => _condition = value ?? 'NEW'),
            ),
            const SizedBox(height: 8),
            SoftField(controller: _price, label: 'Bei ya kuuza', keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            if (widget.store.seeCost) ...[
              const SizedBox(height: 8),
              SoftField(controller: _cost, label: 'Gharama', keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
              const SizedBox(height: 8),
              SoftField(controller: _floor, label: 'Bei ya chini', keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
            ],
            const SizedBox(height: 8),
            SoftField(controller: _warranty, label: 'Warranty (miezi)', keyboard: TextInputType.number, digitsOnly: true, maxLength: 2),
            const SizedBox(height: 12),
            FilledButton(onPressed: _busy ? null : _save, child: const Text('Hifadhi')),
            if (widget.existing != null)
              TextButton(onPressed: _busy ? null : _delete, child: const Text('Futa simu', style: TextStyle(color: Color(0xFFDC2626)))),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    final error = await widget.store.savePhone(
      id: widget.existing?['id'] as String?,
      name: _name.text,
      imei: _imei.text,
      color: _color.text,
      storage: _storage.text,
      condition: _condition,
      price: (int.tryParse(_price.text.trim()) ?? 0).toDouble(),
      cost: widget.store.seeCost ? (int.tryParse(_cost.text.trim()) ?? 0).toDouble() : asDouble(widget.existing?['cost']),
      floor: widget.store.seeCost ? (int.tryParse(_floor.text.trim()) ?? 0).toDouble() : asDouble(widget.existing?['floor_price']),
      warranty: int.tryParse(_warranty.text.trim()) ?? 0,
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
    final ok = await confirm(context, 'Ondoa simu', 'Itaondoka kwenye stoo. Risiti na ripoti za simu zilizouzwa zinabaki.');
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
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Ghairi')),
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
      title: const Text('Ongeza mzigo'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.name, style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('Idadi sasa: ${widget.current}', style: captionStyle),
          const SizedBox(height: 12),
          TextField(
            controller: _extra,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Idadi unayoongeza', counterText: ''),
          ),
          if (adding > 0) Text('Itakuwa ${widget.current + adding}', style: captionStyle),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Ghairi')),
        FilledButton(
          onPressed: adding <= 0 ? null : () => Navigator.pop(context, adding),
          child: const Text('Ongeza'),
        ),
      ],
    );
  }
}
