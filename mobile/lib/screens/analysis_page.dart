import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

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
          return const Scaffold(backgroundColor: skyPage, body: LockedNote(title: 'Uchambuzi'));
        }
        final period = _period;
        final books = store.booksFor(period);
        final maxY = books.dayTotals.fold<double>(0, (a, b) => a > b ? a : b);
        final mixTotal = books.cash + books.lipa;
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: const Text('Uchambuzi', style: TextStyle(fontWeight: FontWeight.w600))),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final item in const [
                      ('7', 'Siku 7'),
                      ('week', 'Wiki iliyopita'),
                      ('month', 'Mwezi huu'),
                      ('prevMonth', 'Mwezi uliopita'),
                      ('year', 'Mwaka huu'),
                      ('prevYear', 'Mwaka uliopita'),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(item.$2),
                          selected: _key == item.$1,
                          selectedColor: sky,
                          onSelected: (_) => setState(() => _key = item.$1),
                        ),
                      ),
                    ChoiceChip(
                      label: Text(_key == 'range' ? period.label : 'Tarehe'),
                      selected: _key == 'range',
                      selectedColor: sky,
                      onSelected: (_) => _pickRange(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(period.label, style: captionStyle),
              const SizedBox(height: 12),
              _kpis(store, books),
              const SizedBox(height: 12),
              _panel(
                'Mauzo halisi',
                SizedBox(
                  height: 180,
                  child: books.days.isEmpty
                      ? const EmptyHint(text: 'Hakuna siku kipindi hiki.')
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
                'Gharama na faida kwa bidhaa',
                books.lines.isEmpty
                    ? const Text('Bado hakuna mauzo kipindi hiki.', style: TextStyle(color: muted))
                    : Column(
                        children: [
                          for (final item in books.lines) _goods(store, item),
                        ],
                      ),
              ),
              const SizedBox(height: 12),
              _panel(
                'Cash na Lipa Namba',
                Column(
                  children: [
                    _mix('Cash', books.cash, mixTotal),
                    const SizedBox(height: 8),
                    _mix('Lipa Namba', books.lipa, mixTotal),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: skyDeep, borderRadius: BorderRadius.circular(22)),
                child: Text(_insight(store, books), style: const TextStyle(color: Colors.white, height: 1.4, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final from = await showDatePicker(
      context: context,
      initialDate: _from ?? now,
      firstDate: DateTime(2020),
      lastDate: DateTime(now.year + 1, 12, 31),
      helpText: 'Kuanzia',
    );
    if (from == null || !mounted) return;
    final to = await showDatePicker(
      context: context,
      initialDate: _to ?? from,
      firstDate: DateTime(2020),
      lastDate: DateTime(now.year + 1, 12, 31),
      helpText: 'Mpaka',
    );
    if (to == null || !mounted) return;
    setState(() {
      _from = from;
      _to = to;
      _key = 'range';
    });
  }

  Widget _kpis(ShopStore store, PeriodBooks books) {
    final cards = <(String, String)>[
      ('Mauzo halisi', tsh(books.net)),
      ('Risiti', '${books.receipts}'),
      ('Marejesho', tsh(books.returnsTotal)),
      if (store.seeCost) ('Gharama', tsh(books.cost)),
      if (store.seeCost) ('Faida', tsh(books.profit)),
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
                  alignment: Alignment.centerLeft,
                  child: Text(card.$2, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 18, color: ink)),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _goods(ShopStore store, GoodsLine item) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFFF8FCFF), borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
          const SizedBox(height: 6),
          _stat('Idadi', '${item.qty}'),
          _stat('Mauzo', tsh(item.revenue)),
          if (store.seeCost) _stat('Gharama', tsh(item.cost)),
          if (store.seeCost) _stat('Faida', tsh(item.profit)),
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

  String _insight(ShopStore store, PeriodBooks books) {
    if (books.receipts == 0 && books.returnCount == 0) return 'Hakuna mauzo wala marejesho kipindi hiki.';
    if (!store.seeCost) {
      return 'Mauzo halisi ${tsh(books.net)}. Risiti ${books.receipts}. Marejesho ${tsh(books.returnsTotal)}.';
    }
    return 'Mauzo halisi ${tsh(books.net)}. Gharama ya bidhaa ${tsh(books.cost)}. Faida ${tsh(books.profit)}. Marejesho ${books.returnCount}.';
  }
}
