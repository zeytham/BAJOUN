import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class WarrantyPage extends StatefulWidget {
  const WarrantyPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<WarrantyPage> createState() => _WarrantyPageState();
}

class _WarrantyPageState extends State<WarrantyPage> {
  final _imei = TextEditingController();
  Map<String, Object?>? _result;
  bool _searched = false;

  @override
  void dispose() {
    _imei.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: skyPage,
      appBar: AppBar(title: const Text('Warranty', style: TextStyle(fontWeight: FontWeight.w600))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Andika IMEI kuona kama simu bado iko ndani ya muda.', style: TextStyle(color: muted)),
          const SizedBox(height: 12),
          TextField(
            controller: _imei,
            keyboardType: TextInputType.number,
            maxLength: 20,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(20)],
            decoration: const InputDecoration(labelText: 'IMEI', prefixIcon: Icon(Icons.qr_code_scanner), counterText: ''),
            onSubmitted: (_) => _search(),
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: _search, child: const Text('Angalia')),
          const SizedBox(height: 16),
          if (_searched && _result == null) const EmptyHint(text: 'IMEI hii haipo kwenye duka.'),
          if (_result != null) _card(_result!),
        ],
      ),
    );
  }

  Future<void> _search() async {
    final found = await widget.store.lookupImei(_imei.text);
    if (!mounted) return;
    setState(() {
      _result = found;
      _searched = true;
    });
  }

  Widget _card(Map<String, Object?> row) {
    if (row['state'] == 'STOCK') {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: vaultCard(),
        child: Text('${row['product_name']} bado iko dukani. Haijauzwa.', style: const TextStyle(fontWeight: FontWeight.w700)),
      );
    }
    final start = DateTime.tryParse('${row['created_at']}')?.toLocal();
    final months = asInt(row['warranty_months']);
    final end = start == null ? null : DateTime(start.year, start.month + months, start.day);
    final left = end == null ? 0 : end.difference(DateTime.now()).inDays;
    final active = left >= 0 && months > 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: vaultCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${row['name']}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 18)),
          Text('${row['invoice']} · ${row['customer_name']}', style: const TextStyle(color: muted)),
          const SizedBox(height: 8),
          Text(active ? 'Warranty bado hai · siku $left' : 'Warranty imeisha', style: TextStyle(fontWeight: FontWeight.w600, color: active ? skyDeep : const Color(0xFFB45309))),
          if (start != null) Text('Iliuzwa ${formatWhen(start.toIso8601String())}'),
          if (end != null) Text('Inaisha ${formatDay(end)} · miezi $months'),
        ],
      ),
    );
  }
}
