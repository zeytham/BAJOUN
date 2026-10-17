import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class CustomersPage extends StatefulWidget {
  const CustomersPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<CustomersPage> createState() => _CustomersPageState();
}

class _CustomersPageState extends State<CustomersPage> {
  final _search = TextEditingController();
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
        if (!store.seeCustomers) {
          return const Scaffold(backgroundColor: skyPage, body: LockedNote(title: 'Wateja'));
        }
        final people = store.customers.where((row) {
          final blob = '${row['name']} ${row['phone']}'.toLowerCase();
          return _query.isEmpty || blob.contains(_query);
        }).toList();
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: const Text('Wateja', style: TextStyle(fontWeight: FontWeight.w600))),
          floatingActionButton: FloatingActionButton.extended(
            backgroundColor: skyDeep,
            foregroundColor: Colors.white,
            onPressed: _add,
            icon: const Icon(Icons.person_add_alt),
            label: const Text('Mteja'),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              TextField(
                controller: _search,
                maxLength: 40,
                inputFormatters: [LengthLimitingTextInputFormatter(40)],
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(hintText: 'Tafuta jina au simu', prefixIcon: Icon(Icons.search), counterText: ''),
              ),
              const SizedBox(height: 12),
              if (people.isEmpty) const EmptyHint(text: 'Hakuna mteja bado. Wanaandikwa pia ukiuza kwa jina na simu.'),
              for (final person in people)
                Card(
                  elevation: 0,
                  color: Colors.white,
                  child: ListTile(
                    title: Text('${person['name']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(showPhone('${person['phone'] ?? ''}').isEmpty ? 'Hakuna simu' : showPhone('${person['phone']}')),
                    trailing: Text(tsh(asDouble(person['spent'])), style: const TextStyle(fontWeight: FontWeight.w600, color: skyDeep)),
                    onTap: () => _detail(person),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _add() async {
    final values = await showDialog<List<String>>(
      context: context,
      builder: (context) => const FieldDialog(
        title: 'Mteja mpya',
        confirm: 'Hifadhi',
        fields: [
          DialogField('Jina', maxLength: 40),
          DialogField('Simu', phone: true),
        ],
      ),
    );
    if (values == null || !mounted) return;
    final error = await widget.store.addCustomer(values[0], values[1]);
    if (error != null && mounted) toast(context, error);
  }

  void _detail(Map<String, Object?> person) {
    final name = '${person['name']}';
    final phone = '${person['phone']}';
    final debts = widget.store.debts.where((row) => row['customer_phone'] == phone || row['customer_name'] == name);
    final sales = widget.store.sales.where((row) => row['customer_phone'] == phone || row['customer_name'] == name);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
            Text(showPhone(phone).isEmpty ? 'Hakuna simu' : showPhone(phone), style: const TextStyle(color: muted)),
            const SizedBox(height: 8),
            Text('Manunuzi ${tsh(asDouble(person['spent']))}', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            const Text('Madeni', style: TextStyle(fontWeight: FontWeight.w600)),
            if (debts.isEmpty) const Text('Hana deni.', style: TextStyle(color: muted)),
            for (final debt in debts)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(tsh(asDouble(debt['balance']))),
                subtitle: Text('${debt['status']} · ${formatWhen('${debt['opened_at']}')}'),
              ),
            const Text('Risiti', style: TextStyle(fontWeight: FontWeight.w600)),
            for (final sale in sales.take(8))
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('${sale['invoice']}'),
                subtitle: Text(formatWhen('${sale['created_at']}')),
                trailing: Text(tsh(asDouble(sale['total']))),
              ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  _remove(person);
                },
                child: const Text('Futa mteja', style: TextStyle(color: Color(0xFFDC2626))),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _remove(Map<String, Object?> person) async {
    final ok = await confirm(
      context,
      'Futa ${person['name']}',
      'Jina litaondoka kwenye orodha. Risiti, madeni na ripoti za zamani zinabaki.',
    );
    if (!ok || !mounted) return;
    final error = await widget.store.deleteCustomer('${person['id']}');
    if (!mounted) return;
    toast(context, error ?? 'Mteja amefutwa.');
  }
}
