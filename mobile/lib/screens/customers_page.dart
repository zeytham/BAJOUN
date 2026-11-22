import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../lang.dart';
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
          return Scaffold(backgroundColor: skyPage, body: LockedNote(title: t('Wateja')));
        }
        final people = store.customers.where((row) {
          final blob = '${row['name']} ${row['phone']}'.toLowerCase();
          return _query.isEmpty || blob.contains(_query);
        }).toList();
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: Text(tx('Wateja', 'Customers'), style: const TextStyle(fontWeight: FontWeight.w600))),
          floatingActionButton: FloatingActionButton.extended(
            backgroundColor: skyDeep,
            foregroundColor: Colors.white,
            onPressed: _add,
            icon: const Icon(Icons.person_add_alt),
            label: Text(t('Mteja')),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              TextField(
                controller: _search,
                maxLength: 40,
                inputFormatters: [LengthLimitingTextInputFormatter(40)],
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                decoration: InputDecoration(hintText: t('Tafuta jina au simu'), prefixIcon: Icon(Icons.search), counterText: ''),
              ),
              const SizedBox(height: 12),
              if (people.isEmpty) EmptyHint(text: t('Hakuna mteja.')),
              for (final person in people)
                Card(
                  elevation: 0,
                  color: Colors.white,
                  child: ListTile(
                    title: Text('${person['name']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      '${showPhone('${person['phone'] ?? ''}').isEmpty ? t('Hakuna simu') : showPhone('${person['phone']}')}\n${tsh(asDouble(person['spent']))}',
                      style: const TextStyle(height: 1.35),
                    ),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(tooltip: t('Angalia'), onPressed: () => _open(person), icon: const Icon(Icons.person_outline, color: skyDeep)),
                        IconButton(tooltip: t('Futa'), onPressed: () => _remove(person), icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626))),
                      ],
                    ),
                    onTap: () => _open(person),
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
      builder: (context) => FieldDialog(
        title: t('Mteja mpya'),
        confirm: t('Hifadhi'),
        fields: [
          DialogField(t('Jina'), maxLength: 40),
          DialogField(t('Simu'), phone: true),
        ],
      ),
    );
    if (!mounted) return;
    if (values == null) {
      toast(context, t('Imesitishwa.'));
      return;
    }
    final error = await widget.store.addCustomer(values[0], values[1]);
    if (error != null && mounted) toast(context, error);
  }

  void _open(Map<String, Object?> person) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => _CustomerFile(store: widget.store, person: person)));
  }

  Future<void> _remove(Map<String, Object?> person) async {
    final ok = await confirm(
      context,
      tf('Futa {0}', ["${person['name']}"]),
      t('Jina litaondoka kwenye orodha. Risiti, madeni na ripoti za zamani zinabaki.'),
    );
    if (!ok || !mounted) return;
    final error = await widget.store.deleteCustomer('${person['id']}');
    if (!mounted) return;
    toast(context, error ?? t('Mteja amefutwa.'));
  }
}

class _CustomerFile extends StatelessWidget {
  const _CustomerFile({required this.store, required this.person});
  final ShopStore store;
  final Map<String, Object?> person;

  @override
  Widget build(BuildContext context) {
    final name = '${person['name']}';
    final phone = '${person['phone']}';
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final debts = store.debts.where((row) => '${row['customer_phone']}' == phone || '${row['customer_name']}' == name).toList();
        final sales = store.sales.where((row) => '${row['customer_phone']}' == phone || '${row['customer_name']}' == name).toList();
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600))),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(showPhone(phone).isEmpty ? t('Hakuna simu') : showPhone(phone), style: const TextStyle(color: muted)),
                    const SizedBox(height: 8),
                    Text(tf('Manunuzi {0}', [tsh(asDouble(person['spent']))]), style: const TextStyle(fontWeight: FontWeight.w800, color: skyDeep, fontSize: 20)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(t('Madeni'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 8),
              if (debts.isEmpty) EmptyHint(text: t('Hana deni.')),
              for (final debt in debts)
                Card(
                  elevation: 0,
                  color: Colors.white,
                  child: ListTile(
                    title: Text(tsh(asDouble(debt['balance'])), style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text('${debtState('${debt['status']}')} · ${formatWhen('${debt['opened_at']}')}'),
                  ),
                ),
              const SizedBox(height: 12),
              Text(t('Risiti'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 8),
              if (sales.isEmpty) EmptyHint(text: t('Hakuna kumbukumbu.')),
              for (final sale in sales)
                Card(
                  elevation: 0,
                  color: Colors.white,
                  child: ListTile(
                    title: Text('${sale['invoice']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text('${formatWhen('${sale['created_at']}')} · ${methodLabel('${sale['method']}')}'),
                    trailing: Text(tsh(asDouble(sale['total'])), style: const TextStyle(fontWeight: FontWeight.w700, color: skyDeep)),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
