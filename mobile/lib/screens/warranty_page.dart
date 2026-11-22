import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../lang.dart';
import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'scan_page.dart';

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
      appBar: AppBar(title: Text(t('Warranty'), style: TextStyle(fontWeight: FontWeight.w600))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _imei,
            keyboardType: TextInputType.number,
            maxLength: 20,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(20)],
            decoration: InputDecoration(labelText: t('IMEI'), prefixIcon: Icon(Icons.pin), counterText: ''),
            onSubmitted: (_) => _search(),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _scan,
                  icon: const Icon(Icons.qr_code_scanner),
                  label: Text(tx('Skani', 'Scan')),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(child: FilledButton(onPressed: _search, child: Text(t('Angalia')))),
            ],
          ),
          const SizedBox(height: 16),
          if (_searched && _result == null) EmptyHint(text: t('IMEI hii haipo kwenye duka.')),
          if (_result != null) _card(_result!),
        ],
      ),
    );
  }

  Future<void> _scan() async {
    widget.store.holdLock = true;
    String? code;
    try {
      code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const ScanPage(action: 'Angalia warranty')));
    } finally {
      widget.store.holdLock = false;
    }
    if (code == null || !mounted) return;
    final raw = code.trim();
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    setState(() => _imei.text = digits.length >= 8 ? digits : raw);
    await _search();
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
        child: Text(tf('{0} bado iko dukani. Haijauzwa.', ["${row['product_name']}"]), style: const TextStyle(fontWeight: FontWeight.w700)),
      );
    }
    final start = DateTime.tryParse('${row['created_at']}')?.toLocal();
    final days = warrantySpan(row);
    final end = start?.add(Duration(days: days));
    final left = end?.difference(DateTime.now()).inDays ?? 0;
    final active = left >= 0 && days > 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: vaultCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${row['name']}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 18)),
          Text('${row['invoice']} · ${row['customer_name']}', style: const TextStyle(color: muted)),
          const SizedBox(height: 8),
          Text(active ? tf('Warranty bado hai · siku {0}', ['$left']) : t('Warranty imeisha'), style: TextStyle(fontWeight: FontWeight.w600, color: active ? skyDeep : const Color(0xFFB45309))),
          if (start != null) Text(tf('Iliuzwa {0}', [formatWhen(start.toIso8601String())])),
          if (end != null) Text(tf('Inaisha {0} · {1}', [formatDay(end), warrantyWords(days)])),
        ],
      ),
    );
  }
}
