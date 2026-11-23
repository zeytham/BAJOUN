import 'package:flutter/material.dart';

import '../lang.dart';
import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

String debtDueLine(Map<String, Object?> debt) {
  final due = DateTime.tryParse('${debt['due_at']}')?.toLocal();
  final term = debtTermWords(asInt(debt['term_days']), '${debt['term_unit']}');
  final when = due == null ? '' : formatDay(due);
  final late = due != null && due.isBefore(DateTime.now());
  final line = late ? tf('Muda umeisha · {0}', [when]) : tf('Analipa {0}', [when]);
  return term.isEmpty ? line : '$line · $term';
}

class DebtsPage extends StatefulWidget {
  const DebtsPage({super.key, required this.store, this.onBack});
  final ShopStore store;
  final VoidCallback? onBack;

  @override
  State<DebtsPage> createState() => _DebtsPageState();
}

class _DebtsPageState extends State<DebtsPage> {
  String _which = 'open';
  String _age = 'all';
  ShopStore get store => widget.store;

  bool _inAge(Map<String, Object?> debt) {
    if (_which != 'open' || _age == 'all') return true;
    final days = debtLateDays(debt);
    if (_age == '0') return days <= 7;
    if (_age == '8') return days >= 8 && days <= 30;
    if (_age == '31') return days >= 31 && days <= 60;
    return days > 60;
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        if (!store.seeDebts) {
          return Scaffold(backgroundColor: skyPage, body: LockedNote(title: t('Madeni')));
        }
        final open = store.debts.where((row) => row['status'] == 'OPEN').toList();
        final closed = store.debts.where((row) => row['status'] == 'PAID' && !store.hiddenDebts.contains('${row['id']}')).toList();
        final shown = (_which == 'paid' ? closed : _which == 'all' ? [...open, ...closed] : open).where(_inAge).toList();
        return Scaffold(
          backgroundColor: skyPage,
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Row(
                children: [
                  if (widget.onBack != null)
                    IconButton(tooltip: t('Rudi'), onPressed: widget.onBack, icon: const Icon(Icons.arrow_back, color: ink)),
                  Expanded(child: Text(tx('Madeni', 'Debts'), style: titleStyle)),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('Jumla inayosubiri'), style: captionStyle),
                    const SizedBox(height: 6),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: AlignmentDirectional.centerStart,
                      child: Text(tsh(store.debtTotal), style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
                    ),
                    const SizedBox(height: 4),
                    Text(tf('{0} wateja', ['${open.length}']), style: captionStyle),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _filter('open', t('Hayajalipwa'), open.length),
                  _filter('paid', t('Yaliyolipwa'), closed.length),
                  _filter('all', t('Zote'), open.length + closed.length),
                ],
              ),
              if (_which == 'open') ...[
                const SizedBox(height: 12),
                SizedBox(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _ageChip('all', t('Zote'), open.length),
                      const SizedBox(width: 8),
                      _ageChip('0', t('Siku 0–7'), open.where((row) => debtLateDays(row) <= 7).length),
                      const SizedBox(width: 8),
                      _ageChip('8', t('Siku 8–30'), open.where((row) => debtLateDays(row) >= 8 && debtLateDays(row) <= 30).length),
                      const SizedBox(width: 8),
                      _ageChip('31', t('Siku 31–60'), open.where((row) => debtLateDays(row) >= 31 && debtLateDays(row) <= 60).length),
                      const SizedBox(width: 8),
                      _ageChip('60', t('Zaidi ya siku 60'), open.where((row) => debtLateDays(row) > 60).length),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              if (_which == 'paid' && (closed.isNotEmpty || store.hiddenDebts.isNotEmpty))
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      if (closed.isNotEmpty)
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => _hideAll(context),
                            child: Text(t('Ondoa yaliyolipwa')),
                          ),
                        ),
                      if (store.hiddenDebts.isNotEmpty) ...[
                        if (closed.isNotEmpty) const SizedBox(width: 8),
                        TextButton(onPressed: () => store.showDebts(), child: Text(t('Onyesha'))),
                      ],
                    ],
                  ),
                ),
              if (shown.isEmpty) EmptyHint(text: _which == 'paid' ? t('Hakuna deni lililolipwa.') : t('Hakuna deni lililo wazi.')),
              for (final debt in shown) _tile(context, debt, open: debt['status'] == 'OPEN'),
            ],
          ),
        );
      },
    );
  }

  Widget _ageChip(String key, String label, int count) {
    final on = _age == key;
    return ChoiceChip(
      label: Text('$label  $count'),
      selected: on,
      showCheckmark: false,
      selectedColor: const Color(0xFFB45309),
      backgroundColor: Colors.white,
      labelStyle: TextStyle(color: on ? Colors.white : ink, fontWeight: FontWeight.w700),
      onSelected: (_) => setState(() => _age = key),
    );
  }

  Widget _filter(String key, String label, int count) {
    final on = _which == key;
    return ChoiceChip(
      label: Text('$label  $count'),
      selected: on,
      showCheckmark: false,
      selectedColor: skyDeep,
      backgroundColor: Colors.white,
      labelStyle: TextStyle(color: on ? Colors.white : ink, fontWeight: FontWeight.w700),
      side: BorderSide(color: on ? skyDeep : const Color(0xFFD7E8D4)),
      onSelected: (_) => setState(() => _which = key),
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
          onTap: open ? () => _openPay(context, debt) : null,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('${debt['customer_name']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: ink))),
                    const SizedBox(width: 12),
                    Text(open ? tsh(balance) : t('Imelipwa'), style: TextStyle(fontWeight: FontWeight.w700, color: open ? const Color(0xFFB45309) : skyDeep)),
                  ],
                ),
                if (showPhone('${debt['customer_phone']}').isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(showPhone('${debt['customer_phone']}'), style: captionStyle),
                ],
                const SizedBox(height: 4),
                Text(formatWhen('${debt['opened_at']}'), style: captionStyle),
                if (open) ...[
                  const SizedBox(height: 4),
                  Text('${t('Umri wa deni')}  ${tf('siku {0}', ['${debtLateDays(debt)}'])}', style: captionStyle),
                ],
                if (open && '${debt['due_at']}'.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(debtDueLine(debt), style: const TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600, fontSize: 12)),
                  ),
                if (open && '${debt['due_at']}'.isEmpty && _overdue(debt))
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(t('Siku 30 bila malipo'), style: const TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600, fontSize: 12)),
                  ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(value: paid, minHeight: 6, backgroundColor: skyPage, color: skyDeep),
                ),
                if (open) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton(
                          onPressed: () => _openPay(context, debt),
                          child: Text(t('Pokea malipo')),
                        ),
                      ),
                      if (_overdue(debt) || store.dueReminders().any((row) => row['id'] == debt['id'])) ...[
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () => _remind(context, store, debt),
                          child: Text(t('Ukumbusho')),
                        ),
                      ],
                    ],
                  ),
                ] else ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => _hideOne(context, debt),
                      child: Text(t('Ondoa deni')),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openPay(BuildContext context, Map<String, Object?> debt) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _DebtSheet(store: store, debt: debt),
    );
  }

  bool _overdue(Map<String, Object?> debt) {
    final opened = DateTime.tryParse('${debt['opened_at']}')?.toLocal();
    if (opened == null) return false;
    return DateTime.now().difference(opened).inDays >= 30 && isTzPhone('${debt['customer_phone']}');
  }

  Future<void> _hideOne(BuildContext context, Map<String, Object?> debt) async {
    final ok = await confirm(context, t('Ondoa deni'), t('Deni hili litaondoka kwenye ukurasa. Mauzo na malipo yanabaki.'));
    if (!ok || !context.mounted) return;
    await store.hideDebt('${debt['id']}');
    if (context.mounted) toast(context, 'Deni limeondolewa.');
  }

  Future<void> _hideAll(BuildContext context) async {
    final ok = await confirm(context, t('Ondoa yaliyolipwa'), t('Madeni yaliyolipwa yataondoka kwenye ukurasa. Mauzo na malipo yanabaki.'));
    if (!ok || !context.mounted) return;
    await store.hidePaidDebts();
    if (context.mounted) toast(context, 'Madeni yameondolewa.');
  }

  Future<void> _remind(BuildContext context, ShopStore store, Map<String, Object?> debt) async {
    final error = await store.sendDebtReminder(debt);
    if (!context.mounted) return;
    toast(context, error ?? t('WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.'));
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
  String? _note;
  bool _noteBad = false;

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
    final balance = asDouble(debt['balance']);
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.78,
        child: Column(
          children: [
            Row(
              children: [
                IconButton(
                  tooltip: t('Rudi'),
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back, color: ink),
                ),
                Expanded(
                  child: Text('${debt['customer_name']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: vaultCard(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t('Baki'), style: captionStyle),
                        const SizedBox(height: 4),
                        Text(tsh(balance), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
                        const SizedBox(height: 4),
                        Text(showPhone('${debt['customer_phone']}'), style: captionStyle),
                        Text(tf('Kilichokopwa {0}', [tsh(asDouble(debt['principal']))]), style: captionStyle),
                      ],
                    ),
                  ),
                  if (_payments.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(t('Malipo yaliyopita'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    for (final pay in _payments)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text(tsh(asDouble(pay['amount'])), style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text('${methodLabel('${pay['method']}')} · ${formatWhen('${pay['created_at']}')}'),
                      ),
                  ],
                  if (open) ...[
                    const SizedBox(height: 16),
                    Text(t('Pokea malipo'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: [
                        ButtonSegment(value: 'PART', label: Text(t('Deni nusu'))),
                        ButtonSegment(value: 'ALL', label: Text(t('Deni zima'))),
                      ],
                      selected: {_cover},
                      onSelectionChanged: (value) => setState(() => _cover = value.first),
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: [
                        ButtonSegment(value: 'CASH', label: Text(t('Cash'))),
                        ButtonSegment(value: 'LIPA', label: Text(t('Lipa Namba'))),
                      ],
                      selected: {_method},
                      onSelectionChanged: (value) => setState(() => _method = value.first),
                    ),
                    if (_cover == 'PART') ...[
                      const SizedBox(height: 12),
                      SoftField(controller: _amount, label: t('Analipa sasa'), keyboard: TextInputType.number, digitsOnly: true, maxLength: 9),
                    ],
                    if (_cover == 'ALL') ...[
                      const SizedBox(height: 12),
                      Text(tf('Analipa baki yote {0}', [tsh(balance)]), style: const TextStyle(color: skyDeep, fontWeight: FontWeight.w700)),
                    ],
                  ],
                  if (_note != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _noteBad ? const Color(0xFFFEE2E2) : skyPage,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(speak(_note!), style: TextStyle(color: _noteBad ? const Color(0xFFB91C1C) : skyDeep, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ],
              ),
            ),
            if (open)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _busy ? null : _pay,
                    child: Text(_busy ? t('Inahifadhi...') : t('Hifadhi')),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _pay() async {
    final current = widget.store.debts.cast<Map<String, Object?>?>().firstWhere(
          (row) => row?['id'] == widget.debt['id'],
          orElse: () => widget.debt,
        );
    final balance = asDouble(current?['balance']);
    final amount = _cover == 'ALL' ? balance : (int.tryParse(_amount.text.trim()) ?? 0).toDouble();
    setState(() {
      _busy = true;
      _note = null;
    });
    final error = await widget.store.payDebt(
      debtId: widget.debt['id'] as String,
      amount: amount,
      method: _method,
      note: '',
    );
    if (!mounted) return;
    if (error != null) {
      setState(() {
        _busy = false;
        _note = error;
        _noteBad = true;
      });
      toast(context, error);
      return;
    }
    _amount.clear();
    await _load();
    if (!mounted) return;
    setState(() {
      _busy = false;
      _note = 'Malipo yamehifadhiwa';
      _noteBad = false;
    });
    toast(context, 'Malipo yamehifadhiwa');
    if (amount >= balance - 0.5) Navigator.pop(context);
  }
}
