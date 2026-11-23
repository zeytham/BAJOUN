import 'dart:async';

import 'package:flutter/material.dart';

import '../lang.dart';
import '../money.dart';
import '../screen_guard.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'alerts_page.dart';
import 'faults_page.dart';
import 'history_page.dart';
import 'wings_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({
    super.key,
    required this.store,
    required this.goTab,
  });

  final ShopStore store;
  final void Function(int tab) goTab;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final out = store.wings.where((row) => row['status'] == 'OUT').toList();
        return Scaffold(
          backgroundColor: skyPage,
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              const _LiveDate(),
              const SizedBox(height: 14),
              Row(
                children: [
                  FaceBubble(name: store.session?.name ?? '', bytes: store.myPhoto, radius: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(store.shopName, maxLines: 1, overflow: TextOverflow.ellipsis, style: titleStyle),
                        Text('${store.session?.name ?? ''} · ${roleLabel(store.session?.role)}', style: captionStyle),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: tx('Taarifa', 'Alerts'),
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => AlertsPage(store: store))),
                    icon: Badge(
                      isLabelVisible: store.unread > 0,
                      label: Text('${store.unread}'),
                      child: const Icon(Icons.notifications_none, color: ink),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (store.phones.any((row) => row['status'] == 'IN_STOCK' && _satLong(row)))
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: const Color(0xFFFFF8EF), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFF3D7B0))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t('Simu zimekaa'), style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFB45309))),
                        const SizedBox(height: 6),
                        for (final phone in store.phones.where((row) => row['status'] == 'IN_STOCK' && _satLong(row)))
                          Text('${phone['product_name']} · ${tf('siku {0}', ['${_satDays(phone)}'])}', style: const TextStyle(color: ink)),
                      ],
                    ),
                  ),
                ),
              LayoutBuilder(
                builder: (context, constraints) {
                  final actions = <(IconData, String, VoidCallback)>[
                    (Icons.point_of_sale, tx('Uza', 'Sell'), () => goTab(1)),
                    if (store.seeStock) (Icons.inventory_2_outlined, tx('Stoo', 'Stock'), () => goTab(2)),
                    if (store.seeDebts) (Icons.account_balance_wallet_outlined, tx('Deni', 'Debt'), () => goTab(3)),
                    (Icons.outbound, tx('Mawinga', 'Out'), () => _open(context, WingsPage(store: store))),
                    (Icons.report_gmailerrorred_outlined, tx('Matatizo', 'Faults'), () => _open(context, FaultsPage(store: store))),
                    (Icons.receipt_long, tx('Historia', 'History'), () => _open(context, HistoryPage(store: store))),
                  ];
                  final width = (constraints.maxWidth - 10) / 2;
                  return Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      for (final action in actions)
                        SizedBox(
                          width: width,
                          child: TapScale(
                            onTap: action.$3,
                            radius: 18,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                              child: Row(
                                children: [
                                  Icon(action.$1, color: skyDeep, size: 22),
                                  const SizedBox(width: 10),
                                  Text(action.$2, style: sectionStyle),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
              if (out.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(tx('Mawinga bado nje', 'Items still out'), style: sectionStyle),
                      const SizedBox(height: 4),
                      Text('${out.length} ${out.length == 1 ? tx('mtu haja rudisha bidhaa.', 'person has not brought items back.') : tx('watu hawajarudisha bidhaa.', 'people have not brought items back.')}', style: captionStyle),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(onPressed: () => _open(context, WingsPage(store: store)), child: Text(tx('Fungua', 'Open'))),
                      ),
                    ],
                  ),
                ),
              ],
              if (store.isOwner) ...[
                const SizedBox(height: 8),
                _SensitiveCard(store: store),
              ],
            ],
          ),
        );
      },
    );
  }

  void _open(BuildContext context, Widget page) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  }
}

class _LiveDate extends StatefulWidget {
  const _LiveDate();

  @override
  State<_LiveDate> createState() => _LiveDateState();
}

class _LiveDateState extends State<_LiveDate> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: vaultCard(),
      child: Row(
        children: [
          const Icon(Icons.calendar_today, color: skyDeep, size: 18),
          const SizedBox(width: 10),
          Expanded(child: Text(formatLive(now), style: sectionStyle)),
        ],
      ),
    );
  }
}

class _SensitiveCard extends StatelessWidget {
  const _SensitiveCard({required this.store});
  final ShopStore store;

  @override
  Widget build(BuildContext context) {
    final open = store.isOwner && store.revealSensitive;
    final drawer = store.dayDrawer();
    final now = DateTime.now();
    final start = DateTime(now.year, now.month, now.day);
    final book = store.ledgerBetween(start, start.add(const Duration(days: 1)));
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: skyDeep.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(tx('Taarifa nyeti', 'Private figures'), style: sectionStyle)),
              if (store.isOwner)
                IconButton(
                  onPressed: () {
                    store.toggleSensitive();
                    setScreenSecure(store.revealSensitive);
                  },
                  icon: Icon(open ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: skyDeep),
                ),
            ],
          ),
          if (open) ...[
            _hero(t('Pesa iliyoingia leo'), tsh(drawer.total)),
            const SizedBox(height: 8),
            _line(t('Cash mauzo'), tsh(drawer.cashSales)),
            _line(t('Cash madeni'), tsh(drawer.cashDebts)),
            _line(t('Lipa Namba'), tsh(drawer.lipa)),
            _line(t('Pesa zilizorudishwa'), tsh(drawer.refunds)),
            const SizedBox(height: 16),
            _hero(tx('Thamani ya stoo', 'Stock value'), tsh(store.retailValue)),
            const SizedBox(height: 8),
            _line(tx('Faida ya leo', 'Profit today'), tsh(book.shopProfit)),
            _line(tx('Faida ya simu', 'Phone profit'), tsh(book.phoneProfit)),
            _line(tx('Faida ya vifaa', 'Accessory profit'), tsh(book.goodsProfit)),
            _line(tx('Faida ya matatizo', 'Fault profit'), tsh(book.faultProfit)),
            _line(tx('Mtaji wa simu', 'Phone capital'), tsh(store.phoneCapital)),
            _line(tx('Mtaji wa vifaa', 'Accessory capital'), tsh(store.goodsCapital)),
            _line(tx('Simu zilizopo', 'Phones in stock'), '${store.phonesInStock}'),
          ] else ...[
            Text(t('Pesa iliyoingia leo'), style: captionStyle),
            _dots(22),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _mask(t('Cash mauzo'))),
                const SizedBox(width: 12),
                Expanded(child: _mask(t('Cash madeni'))),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _mask(t('Lipa Namba'))),
                const SizedBox(width: 12),
                Expanded(child: _mask(t('Pesa zilizorudishwa'))),
              ],
            ),
            const SizedBox(height: 14),
            Text(tx('Thamani ya stoo', 'Stock value'), style: captionStyle),
            _dots(22),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _mask(tx('Faida ya leo', 'Profit today'))),
                const SizedBox(width: 12),
                Expanded(child: _mask(tx('Faida ya simu', 'Phone profit'))),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _mask(tx('Faida ya vifaa', 'Accessory profit'))),
                const SizedBox(width: 12),
                Expanded(child: _mask(tx('Faida ya matatizo', 'Fault profit'))),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _mask(tx('Mtaji wa simu', 'Phone capital'))),
                const SizedBox(width: 12),
                Expanded(child: _mask(tx('Mtaji wa vifaa', 'Accessory capital'))),
              ],
            ),
            const SizedBox(height: 10),
            _mask(tx('Simu zilizopo', 'Phones in stock')),
          ],
        ],
      ),
    );
  }

  Widget _mask(String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, maxLines: 2, overflow: TextOverflow.ellipsis, style: captionStyle),
        const SizedBox(height: 4),
        _dots(16),
      ],
    );
  }

  Widget _dots(double size) {
    final dot = size * 0.34;
    return SizedBox(
      height: size * 1.25,
      child: Row(
        children: [
          for (var i = 0; i < 6; i++) ...[
            Container(
              width: dot,
              height: dot,
              decoration: const BoxDecoration(color: Color(0xFF7E9778), shape: BoxShape.circle),
            ),
            if (i < 5) SizedBox(width: dot * 0.7),
          ],
        ],
      ),
    );
  }

  Widget _hero(String label, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(color: skyPage, borderRadius: BorderRadius.circular(18)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, height: 1.2, fontWeight: FontWeight.w600, color: muted)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 28, height: 1.15, fontWeight: FontWeight.w800, color: skyDeep, letterSpacing: -0.3)),
        ],
      ),
    );
  }

  Widget _line(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 15, height: 1.25, fontWeight: FontWeight.w600, color: ink))),
          const SizedBox(width: 16),
          Text(value, textAlign: TextAlign.right, style: const TextStyle(fontSize: 16, height: 1.2, fontWeight: FontWeight.w700, color: ink)),
        ],
      ),
    );
  }
}

int _satDays(Map<String, Object?> phone) {
  final at = DateTime.tryParse('${phone['arrived_at']}');
  if (at == null) return 0;
  return DateTime.now().difference(at).inDays;
}

bool _satLong(Map<String, Object?> phone) => _satDays(phone) >= 60;
