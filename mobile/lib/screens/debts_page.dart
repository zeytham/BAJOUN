import 'package:flutter/material.dart';

import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class DebtsPage extends StatelessWidget {
  const DebtsPage({super.key, required this.store});
  final ShopStore store;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        if (!store.seeDebts) {
          return const Scaffold(backgroundColor: skyPage, body: LockedNote(title: 'Madeni'));
        }
        final open = store.debts.where((row) => row['status'] == 'OPEN').toList();
        final closed = store.debts.where((row) => row['status'] == 'PAID').toList();
        return Scaffold(
          backgroundColor: skyPage,
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              const Text('Madeni', style: titleStyle),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Jumla inayosubiri', style: TextStyle(color: muted)),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(tsh(store.debtTotal), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w600, color: ink)),
                    ),
                    Text('${open.length} wateja', style: const TextStyle(color: muted)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (open.isEmpty) const EmptyHint(text: 'Hakuna deni lililo wazi. Ukiuza chini ya bei, deni linaandikwa hapa.'),
              for (final debt in open) _tile(context, debt, open: true),
              if (closed.isNotEmpty) ...[
                const SizedBox(height: 8),
                const Text('Yaliyolipwa', style: TextStyle(fontWeight: FontWeight.w600, color: ink)),
                const SizedBox(height: 8),
                for (final debt in closed) _tile(context, debt, open: false),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _tile(BuildContext context, Map<String, Object?> debt, {required bool open}) {
    final principal = asDouble(debt['principal']);
    final balance = asDouble(debt['balance']);
    final paid = principal <= 0 ? 1.0 : (1 - (balance / principal)).clamp(0, 1).toDouble();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.white,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            builder: (_) => _DebtSheet(store: store, debt: debt),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('${debt['customer_name']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink))),
                    Text(open ? tsh(balance) : 'Imelipwa', style: TextStyle(fontWeight: FontWeight.w600, color: open ? const Color(0xFFB45309) : skyDeep)),
                  ],
                ),
                Text('${showPhone('${debt['customer_phone']}')} · ${formatWhen('${debt['opened_at']}')}', style: const TextStyle(color: muted, fontSize: 12)),
                if (open && _overdue(debt))
                  const Padding(
                    padding: EdgeInsets.only(top: 6),
                    child: Text('Siku 30 bila malipo', style: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600, fontSize: 12)),
                  ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(value: paid, minHeight: 8, backgroundColor: skyPage, color: skyDeep),
                ),
                const SizedBox(height: 4),
                Text('Alikopa ${tsh(principal)}', style: const TextStyle(color: muted, fontSize: 12)),
                if (open) ...[
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => showModalBottomSheet<void>(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.white,
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
                        builder: (_) => _DebtSheet(store: store, debt: debt),
                      ),
                      child: const Text('Pokea malipo'),
                    ),
                  ),
                  if (_overdue(debt)) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => _remind(context, store, debt),
                        child: const Text('Tuma ukumbusho'),
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  bool _overdue(Map<String, Object?> debt) {
    final opened = DateTime.tryParse('${debt['opened_at']}')?.toLocal();
    if (opened == null) return false;
    return DateTime.now().difference(opened).inDays >= 30 && isTzPhone('${debt['customer_phone']}');
  }

  Future<void> _remind(BuildContext context, ShopStore store, Map<String, Object?> debt) async {
    final error = await store.sendDebtReminder(debt);
    if (!context.mounted) return;
    toast(context, error ?? 'WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.');
  }
}

class _DebtSheet extends StatefulWidget {
  const _DebtSheet({required this.store, required this.debt});
  final ShopStore store;
  final Map<String, Object?> debt;

  @override
  State<_DebtSheet> createState() => _DebtSheetState();
}

class _DebtSheetState extends State<_DebtSheet> {
  final _amount = TextEditingController();
  String _method = 'CASH';
  String _cover = 'PART';
  List<Map<String, Object?>> _payments = [];
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await widget.store.db.debtPayments(widget.debt['id'] as String);
    if (mounted) setState(() => _payments = rows);
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final debt = widget.store.debts.cast<Map<String, Object?>?>().firstWhere(
          (row) => row?['id'] == widget.debt['id'],
          orElse: () => widget.debt,
        )!;
    final open = debt['status'] == 'OPEN';
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${debt['customer_name']}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
            Text('${debt['customer_phone']}', style: const TextStyle(color: muted)),
            const SizedBox(height: 8),
            Text('Alikopa ${formatWhen('${debt['opened_at']}')}', style: const TextStyle(color: ink)),
            Text('Kilichokopwa ${tsh(asDouble(debt['principal']))}', style: const TextStyle(color: ink)),
            Text('Baki ${tsh(asDouble(debt['balance']))}', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFB45309))),
            const SizedBox(height: 12),
            const Text('Malipo yaliyopita', style: TextStyle(fontWeight: FontWeight.w600)),
            if (_payments.isEmpty) const Text('Bado hajalipa chochote.', style: TextStyle(color: muted)),
            for (final pay in _payments)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(tsh(asDouble(pay['amount']))),
                subtitle: Text('${formatWhen('${pay['created_at']}')} · ${methodLabel('${pay['method']}')} · ${pay['cashier_name']}'),
              ),
            if (open) ...[
              const Divider(),
              const Text('Pokea malipo', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ChoiceChip(label: const Text('Deni nusu'), selected: _cover == 'PART', selectedColor: sky, onSelected: (_) => setState(() => _cover = 'PART')),
                  ChoiceChip(label: const Text('Deni zima'), selected: _cover == 'ALL', selectedColor: sky, onSelected: (_) => setState(() => _cover = 'ALL')),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ChoiceChip(label: const Text('Cash'), selected: _method == 'CASH', selectedColor: sky, onSelected: (_) => setState(() => _method = 'CASH')),
                  ChoiceChip(label: const Text('Lipa Namba'), selected: _method == 'LIPA', selectedColor: sky, onSelected: (_) => setState(() => _method = 'LIPA')),
                ],
              ),
              if (_cover == 'PART') ...[
                const SizedBox(height: 8),
                SoftField(controller: _amount, label: 'Analipa sasa', keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
              ],
              if (_cover == 'ALL') ...[
                const SizedBox(height: 8),
                Text('Analipa baki yote ${tsh(asDouble(debt['balance']))}', style: const TextStyle(color: skyDeep, fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 12),
              FilledButton(onPressed: _busy ? null : _pay, child: const Text('Sasisha deni')),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _pay() async {
    setState(() => _busy = true);
    final current = widget.store.debts.cast<Map<String, Object?>?>().firstWhere(
          (row) => row?['id'] == widget.debt['id'],
          orElse: () => widget.debt,
        );
    final balance = asDouble(current?['balance']);
    final error = await widget.store.payDebt(
      debtId: widget.debt['id'] as String,
      amount: _cover == 'ALL' ? balance : (int.tryParse(_amount.text.trim()) ?? 0).toDouble(),
      method: _method,
      note: '',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      toast(context, error);
      return;
    }
    _amount.clear();
    await _load();
    if (mounted) toast(context, 'Malipo yamehifadhiwa');
  }
}
