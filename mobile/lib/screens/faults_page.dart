import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'sell_page.dart';
import '../lang.dart';

class FaultsPage extends StatefulWidget {
  const FaultsPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<FaultsPage> createState() => _FaultsPageState();
}

class _FaultsPageState extends State<FaultsPage> {
  final _search = TextEditingController();
  String? _category;
  String _query = '';
  bool _leave = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return PopScope(
      canPop: _leave || _category == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _category != null) setState(() => _category = null);
      },
      child: ListenableBuilder(
        listenable: store,
        builder: (context, _) {
          final phones = _phones(store);
          final goods = _goods(store);
          return Scaffold(
            backgroundColor: skyPage,
            appBar: AppBar(
              toolbarHeight: 64,
              titleSpacing: 4,
              backgroundColor: skyPage,
              surfaceTintColor: Colors.transparent,
              elevation: 0,
              leading: IconButton(
                tooltip: t('Rudi'),
                onPressed: () {
                  if (_category != null) {
                    setState(() => _category = null);
                  } else {
                    Navigator.pop(context);
                  }
                },
                icon: const Icon(Icons.arrow_back, color: ink),
              ),
              title: Text(t('Matatizo'), style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: ink)),
            ),
            body: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
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
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                  child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _chip(t('Zote'), null),
                        for (final category in store.categories) _chip(t('${category['name']}'), '${category['id']}'),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: phones.isEmpty && goods.isEmpty && _piles(store).isEmpty
                      ? EmptyHint(text: t('Hakuna yenye matatizo kwenye kundi hili.'))
                      : GridView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 0.72,
                          ),
                          itemCount: _piles(store).length + phones.length + goods.length,
                          itemBuilder: (context, index) {
                            final piles = _piles(store);
                            if (index < piles.length) return _pileCard(piles[index]);
                            if (index < piles.length + phones.length) return _phoneCard(phones[index - piles.length]);
                            return _productCard(goods[index - piles.length - phones.length]);
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String? _selected(ShopStore store) {
    if (_category == null) return null;
    final known = store.categories.any((row) => '${row['id']}' == _category);
    return known ? _category : null;
  }

  void _choose(String? id) => setState(() => _category = id);

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
      if (phone['status'] != 'FAULTY') return false;
      if (selected != null && selected != 'phones' && '${phone['category_id']}' != selected) return false;
      final blob = '${phone['product_name']} ${phone['imei']} ${phone['storage']} ${phone['ram']} ${phone['screen']} ${phone['color']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
  }

  List<Map<String, Object?>> _goods(ShopStore store) {
    final selected = _selected(store);
    if (selected != null && _phoneGroup(store, selected)) return [];
    return store.products.where((product) {
      if (asInt(product['active']) == 0 || asInt(product['fault_qty']) <= 0 || '${product['type']}' == 'PHONE') return false;
      if (selected != null && '${product['category_id']}' != selected) return false;
      final blob = '${product['name']} ${product['brand']} ${product['barcode']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
  }

  List<Map<String, Object?>> _piles(ShopStore store) {
    final selected = _selected(store);
    if (selected != null && !_phoneGroup(store, selected)) return [];
    return store.products.where((product) {
      if ('${product['type']}' != 'PHONE' || asInt(product['active']) == 0 || asInt(product['fault_qty']) <= 0) return false;
      if (selected != null && selected != 'phones' && '${product['category_id']}' != selected) return false;
      final blob = '${product['name']} ${product['storage']} ${product['color']}'.toLowerCase();
      return _query.isEmpty || blob.contains(_query);
    }).toList();
  }

  Widget _pileCard(Map<String, Object?> product) {
    final cost = widget.store.isOwner ? tf('Gharama {0}', [tsh(asDouble(product['cost']))]) : '';
    return _tile(
      icon: Icons.smartphone,
      title: '${product['name']}',
      subtitle: [unitSpec(product), cost].where((part) => part.isNotEmpty).join(' · '),
      price: asDouble(product['price']),
      foot: tf('Matatizo {0}', ['${product['fault_qty']}']),
      onTap: () => _sellPile(product),
    );
  }

  Future<void> _sellPile(Map<String, Object?> product) async {
    final name = '${product['name']}';
    final price = await askSalePrice(context, name: name, wholesale: asDouble(product['price']));
    if (price == null || !mounted) return;
    final imei = await askImei(context, widget.store, name: name);
    if (imei == null || !mounted) return;
    if (await widget.store.db.imeiHeld(imei)) {
      if (mounted) toast(context, t('IMEI hii tayari ipo.'));
      return;
    }
    final error = widget.store.addPhoneGroup(product, salePrice: price, imei: imei, faulty: true);
    if (error != null && mounted) toast(context, error);
  }

  Widget _phoneCard(Map<String, Object?> phone) {
    final cost = widget.store.isOwner ? tf('Gharama {0}', [tsh(asDouble(phone['cost']))]) : '';
    return _tile(
      icon: Icons.smartphone,
      title: '${phone['product_name']}',
      subtitle: [unitSpec(phone), cost].where((part) => part.isNotEmpty).join(' · '),
      price: asDouble(phone['price']),
      foot: maskImei('${phone['imei']}'),
      onTap: () => _sellPhone(phone),
    );
  }

  Widget _productCard(Map<String, Object?> product) {
    final cost = widget.store.isOwner ? tf('Gharama {0}', [tsh(asDouble(product['cost']))]) : '';
    return _tile(
      icon: _iconFor('${product['category_id']}'),
      title: '${product['name']}',
      subtitle: ['${product['brand'] ?? ''}'.trim(), '${product['color'] ?? ''}'.trim(), '${product['size'] ?? ''}'.trim(), cost].where((part) => part.isNotEmpty).join(' · '),
      price: asDouble(product['price']),
      foot: tf('Matatizo {0}', ["${product['fault_qty']}"]),
      onTap: () => _sellGoods(product),
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    required double price,
    required String foot,
    required VoidCallback onTap,
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
            Text(tf('Jumla {0}', [tsh(price)]), style: const TextStyle(color: skyDeep, fontWeight: FontWeight.w600, fontSize: 15)),
            Text(foot, style: const TextStyle(color: muted, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
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
      default:
        return Icons.inventory_2_outlined;
    }
  }

  Future<void> _sellPhone(Map<String, Object?> phone) async {
    final price = await askSalePrice(context, name: '${phone['product_name']}', wholesale: asDouble(phone['price']));
    if (price == null || !mounted) return;
    widget.store.addFaultPhone(phone, salePrice: price);
    _openTill();
  }

  Future<void> _sellGoods(Map<String, Object?> product) async {
    final price = await askSalePrice(context, name: '${product['name']}', wholesale: asDouble(product['price']));
    if (price == null || !mounted) return;
    widget.store.addFaultProduct(product, salePrice: price);
    _openTill();
  }

  void _openTill() {
    setState(() {
      _category = null;
      _leave = true;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pop();
      widget.store.showTill?.call();
    });
  }
}
