import 'dart:async';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../money.dart';
import '../screen_guard.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'alerts_page.dart';
import 'history_page.dart';

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
        final series = store.trend(7);
        return Scaffold(
          backgroundColor: skyPage,
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              const _LiveDate(),
              if (store.seeDebts && store.dueReminders().isNotEmpty) ...[
                const SizedBox(height: 12),
                for (final debt in store.dueReminders())
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${debt['customer_name']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                          const SizedBox(height: 4),
                          Text('Deni ${tsh(asDouble(debt['balance']))} limekaa siku 30 bila malipo.', style: captionStyle),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(
                              onPressed: () async {
                                final error = await store.sendDebtReminder(debt);
                                if (!context.mounted) return;
                                toast(context, error ?? 'WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.');
                              },
                              child: const Text('Tuma ukumbusho'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
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
                    tooltip: 'Taarifa',
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
              LayoutBuilder(
                builder: (context, constraints) {
                  final actions = <(IconData, String, VoidCallback)>[
                    (Icons.point_of_sale, 'Uza', () => goTab(1)),
                    if (store.seeStock) (Icons.inventory_2_outlined, 'Stoo', () => goTab(2)),
                    if (store.seeDebts) (Icons.account_balance_wallet_outlined, 'Deni', () => goTab(3)),
                    (Icons.receipt_long, 'Historia', () => _open(context, HistoryPage(store: store))),
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
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(store.seeAllSales ? 'Mauzo ya siku 7' : 'Mauzo yangu, siku 7', style: sectionStyle),
                    const SizedBox(height: 4),
                    Text('Leo ${tsh(store.todayTotal)} · risiti ${store.todayCount}', style: captionStyle),
                    SizedBox(
                      height: 140,
                      child: LineChart(
                        LineChartData(
                          minY: 0,
                          maxY: series.totals.every((value) => value == 0) ? 1 : null,
                          gridData: const FlGridData(show: false),
                          borderData: FlBorderData(show: false),
                          titlesData: const FlTitlesData(show: false),
                          lineTouchData: LineTouchData(
                            touchTooltipData: LineTouchTooltipData(
                              getTooltipItems: (spots) => [
                                for (final spot in spots) LineTooltipItem(tsh(spot.y), const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                              ],
                            ),
                          ),
                          lineBarsData: [
                            LineChartBarData(
                              spots: [for (var i = 0; i < series.totals.length; i++) FlSpot(i.toDouble(), series.totals[i])],
                              isCurved: true,
                              color: skyDeep,
                              barWidth: 3,
                              dotData: const FlDotData(show: false),
                              belowBarData: BarAreaData(show: true, color: sky.withValues(alpha: 0.45)),
                            ),
                          ],
                        ),
                        duration: const Duration(milliseconds: 450),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              _SensitiveCard(store: store),
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
    String hidden(String value) => open ? value : '••••••';
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
              const Expanded(child: Text('Taarifa nyeti', style: sectionStyle)),
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
          Text('Thamani ya stoo', style: captionStyle),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(hidden(tsh(store.retailValue)), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 22, color: ink)),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _cell('Faida ya leo', hidden(store.isOwner ? tsh(store.todayProfit) : '—'))),
              const SizedBox(width: 12),
              Expanded(child: _cell('Gharama ya stoo', hidden(store.isOwner ? tsh(store.costValue) : '—'))),
            ],
          ),
          const SizedBox(height: 10),
          _cell('Simu zilizopo', hidden('${store.phonesInStock}')),
        ],
      ),
    );
  }

  Widget _cell(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: captionStyle),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: ink)),
        ),
      ],
    );
  }
}
