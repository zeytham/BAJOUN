import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../date_span.dart';
import '../lang.dart';
import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class AnalysisPage extends StatefulWidget {
  const AnalysisPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<AnalysisPage> createState() => _AnalysisPageState();
}

class _AnalysisPageState extends State<AnalysisPage> {
  String _key = '7';
  DateTime? _from;
  DateTime? _to;

  ShopPeriod get _period {
    switch (_key) {
      case 'week':
        return ShopPeriod.lastWeek();
      case 'month':
        return ShopPeriod.thisMonth();
      case 'prevMonth':
        return ShopPeriod.lastMonth();
      case 'year':
        return ShopPeriod.thisYear();
      case 'prevYear':
        return ShopPeriod.lastYear();
      case 'range':
        final now = DateTime.now();
        return ShopPeriod.between(_from ?? now, _to ?? _from ?? now);
      default:
        return ShopPeriod.lastDays(7);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        final store = widget.store;
        if (!store.seeAnalysis) {
          return Scaffold(backgroundColor: skyPage, body: LockedNote(title: t('Uchambuzi')));
        }
        final period = _period;
        final books = store.booksFor(period);
        final book = store.ledgerBetween(period.start, period.end);
        final maxY = books.dayTotals.fold<double>(0, (a, b) => a > b ? a : b);
        final mixTotal = books.cash + books.lipa;
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: Text(tx('Uchambuzi', 'Analysis'), style: const TextStyle(fontWeight: FontWeight.w600))),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: vaultCard(),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final item in [
                      ('7', t('Siku 7')),
                      ('week', t('Wiki iliyopita')),
                      ('month', t('Mwezi huu')),
                      ('prevMonth', t('Mwezi uliopita')),
                      ('year', t('Mwaka huu')),
                      ('prevYear', t('Mwaka uliopita')),
                    ])
                      ChoiceChip(
                        label: Text(t(item.$2)),
                        selected: _key == item.$1,
                        selectedColor: sky,
                        onSelected: (_) => setState(() => _key = item.$1),
                      ),
                    ChoiceChip(
                      label: Text(_key == 'range' ? period.label : t('Tarehe')),
                      selected: _key == 'range',
                      selectedColor: sky,
                      onSelected: (_) => _pickRange(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _kpis(store, books, book),
              const SizedBox(height: 12),
              _panel(
                t('Mauzo halisi'),
                SizedBox(
                  height: 180,
                  child: books.days.isEmpty
                      ? EmptyHint(text: t('Hakuna siku kipindi hiki.'))
                      : LineChart(
                          LineChartData(
                            minY: 0,
                            maxY: maxY <= 0 ? 1 : null,
                            gridData: const FlGridData(show: false),
                            borderData: FlBorderData(show: false),
                            titlesData: FlTitlesData(
                              leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              bottomTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  reservedSize: 28,
                                  interval: books.days.length <= 8 ? 1 : (books.days.length / 6).ceilToDouble(),
                                  getTitlesWidget: (value, meta) {
                                    final index = value.toInt();
                                    if (index < 0 || index >= books.days.length) return const SizedBox.shrink();
                                    final day = books.days[index];
                                    final label = books.days.length > 62 ? '${day.month}' : '${day.day}';
                                    return Text(label, style: const TextStyle(fontSize: 10, color: muted));
                                  },
                                ),
                              ),
                            ),
                            lineBarsData: [
                              LineChartBarData(
                                spots: [for (var i = 0; i < books.dayTotals.length; i++) FlSpot(i.toDouble(), books.dayTotals[i] < 0 ? 0 : books.dayTotals[i])],
                                isCurved: books.days.length > 2,
                                color: skyDeep,
                                barWidth: 3,
                                dotData: const FlDotData(show: false),
                                belowBarData: BarAreaData(show: true, color: sky.withValues(alpha: 0.35)),
                              ),
                            ],
                          ),
                          duration: const Duration(milliseconds: 450),
                        ),
                ),
              ),
              const SizedBox(height: 12),
              _panel(
                t('Simu na vifaa kando'),
                books.lines.isEmpty
                    ? Text(t('Bado hakuna mauzo kipindi hiki.'), style: TextStyle(color: muted))
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (final group in [true, false])
                            if (books.lines.any((item) => item.phone == group)) ...[
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Text(group ? t('Simu') : t('Vifaa vingine'), style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                              ),
                              for (final item in books.lines.where((row) => row.phone == group)) _goods(store, item),
                            ],
                        ],
                      ),
              ),
              const SizedBox(height: 12),
              if (mixTotal > 0)
                _panel(
                  t('Malipo'),
                  Column(
                    children: [
                      SizedBox(
                        height: 180,
                        child: PieChart(
                          PieChartData(
                            sectionsSpace: 2,
                            centerSpaceRadius: 42,
                            sections: [
                              if (books.cash > 0) PieChartSectionData(value: books.cash, color: skyDeep, title: '', radius: 52),
                              if (books.lipa > 0) PieChartSectionData(value: books.lipa, color: const Color(0xFF1F5C28), title: '', radius: 46),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      _stat(t('Cash'), tsh(books.cash)),
                      _stat(t('Lipa Namba'), tsh(books.lipa)),
                    ],
                  ),
                ),
              if (mixTotal > 0) const SizedBox(height: 12),
              _panel(
                t('Cash na Lipa Namba'),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('Pesa iliyoingia siku hiyo, pamoja na malipo ya deni.'), style: captionStyle),
                    const SizedBox(height: 8),
                    _mix(t('Cash'), books.cash, mixTotal),
                    const SizedBox(height: 8),
                    _mix(t('Lipa Namba'), books.lipa, mixTotal),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (store.seeCost) _profitBars(book),
              if (store.seeCost) const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: skyDeep, borderRadius: BorderRadius.circular(22)),
                child: Text(_insight(store, books, book), style: const TextStyle(color: Colors.white, height: 1.4, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickRange() async {
    final current = _from == null ? null : DaySpan(_from!, _to ?? _from!);
    final picked = await pickDaySpan(context, current: current);
    if (picked == null || !mounted) return;
    setState(() {
      _from = picked.start;
      _to = picked.end;
      _key = 'range';
    });
  }

  Widget _kpis(ShopStore store, PeriodBooks books, ShopLedger book) {
    final cards = <(String, String)>[
      (t('Mauzo halisi'), tsh(books.net)),
      (t('Risiti'), '${books.receipts}'),
      (t('Marejesho'), tsh(books.returnsTotal)),
      if (store.seeCost) (t('Gharama ya simu'), tsh(book.phones.cost)),
      if (store.seeCost) (t('Gharama ya vifaa'), tsh(book.goods.cost)),
      if (store.seeCost) (t('Faida ya simu'), tsh(book.phoneProfit)),
      if (store.seeCost) (t('Faida ya vifaa'), tsh(book.goodsProfit)),
      if (store.seeCost) (t('Faida ya matatizo'), tsh(book.faultProfit)),
      if (store.seeCost) (t('Faida ya duka'), tsh(book.shopProfit)),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 2.1,
      children: [
        for (final card in cards)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(card.$1, style: captionStyle),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(card.$2, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 18, color: ink)),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _profitBars(ShopLedger book) {
    final values = [book.phoneProfit, book.goodsProfit, book.faultProfit];
    final peak = values.fold<double>(0, (top, value) => value.abs() > top ? value.abs() : top);
    final labels = [t('Simu'), t('Vifaa'), t('Matatizo')];
    return _panel(
      t('Faida kwa aina'),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 180,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                minY: peak == 0 ? 0 : -peak * 1.2,
                maxY: peak == 0 ? 1 : peak * 1.2,
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 28,
                      getTitlesWidget: (value, meta) {
                        final index = value.toInt();
                        if (index < 0 || index >= labels.length) return const SizedBox.shrink();
                        return Text(labels[index], style: const TextStyle(fontSize: 11, color: muted));
                      },
                    ),
                  ),
                ),
                barGroups: [
                  for (var i = 0; i < values.length; i++)
                    BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: values[i],
                          width: 22,
                          borderRadius: BorderRadius.circular(8),
                          color: values[i] < 0 ? const Color(0xFFB45309) : skyDeep,
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          _stat(t('Faida ya simu'), tsh(book.phoneProfit)),
          _stat(t('Faida ya vifaa'), tsh(book.goodsProfit)),
          _stat(t('Faida ya matatizo'), tsh(book.faultProfit)),
          _stat(t('Faida ya duka'), tsh(book.shopProfit)),
        ],
      ),
    );
  }

  Widget _goods(ShopStore store, GoodsLine item) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFFF4FBF1), borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
          const SizedBox(height: 6),
          _stat('Idadi', '${item.qty}'),
          _stat(t('Mauzo'), tsh(item.revenue)),
          if (store.seeCost) _stat(t('Gharama'), tsh(item.cost)),
          if (store.seeCost) _stat(t('Faida'), tsh(item.profit)),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        children: [
          Text(label, style: captionStyle),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
        ],
      ),
    );
  }

  Widget _panel(String title, Widget child) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _mix(String label, double amount, double total) {
    final share = total <= 0 ? 0.0 : (amount / total).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(label)),
            Text(tsh(amount), style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(value: share, minHeight: 8, backgroundColor: skyPage, color: skyDeep),
        ),
      ],
    );
  }

  String _insight(ShopStore store, PeriodBooks books, ShopLedger book) {
    if (books.receipts == 0 && books.returnCount == 0 && book.faults <= 0) return t('Hakuna mauzo, marejesho, wala matatizo kipindi hiki.');
    if (!store.seeCost) {
      return tf('Mauzo halisi {0}. Risiti {1}. Marejesho {2}.', [tsh(books.net), books.receipts, tsh(books.returnsTotal)]);
    }
    return tf('Faida ya simu {0}. Faida ya vifaa {1}. Faida ya matatizo {2}. Zikiunganishwa, faida ya duka ni {3}.', [tsh(book.phoneProfit), tsh(book.goodsProfit), tsh(book.faultProfit), tsh(book.shopProfit)]);
  }
}
