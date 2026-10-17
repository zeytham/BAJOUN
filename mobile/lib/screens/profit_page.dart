import 'dart:io';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class ProfitPage extends StatefulWidget {
  const ProfitPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<ProfitPage> createState() => _ProfitPageState();
}

class _ProfitPageState extends State<ProfitPage> {
  String _span = 'today';
  int _year = DateTime.now().year;
  DateTime? _day;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        final store = widget.store;
        if (!store.isOwner) {
          return const Scaffold(backgroundColor: skyPage, body: LockedNote(title: 'Faida'));
        }
        final range = _range();
        final bucket = _collect(store, range.$1, range.$2);
        final profit = bucket.sales - bucket.cost;
        final gain = profit > 0 ? profit : 0.0;
        final loss = profit < 0 ? -profit : 0.0;
        final years = _years(store);
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(
            title: const Text('Faida'),
            actions: [
              IconButton(
                tooltip: 'Pakua',
                onPressed: () => _share(store.csvProfit()),
                icon: const Icon(Icons.ios_share),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _chip('Leo', 'today'),
                  _chip('Jana', 'yesterday'),
                  _chip('Wiki', 'week'),
                  _chip('Mwezi', 'month'),
                  _chip('Mwaka', 'year'),
                  ActionChip(
                    avatar: const Icon(Icons.calendar_today, size: 16, color: skyDeep),
                    label: Text(_day == null ? 'Siku' : formatDay(_day!)),
                    onPressed: _pickDay,
                  ),
                ],
              ),
              if (_span == 'year') ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final year in years)
                      ChoiceChip(
                        label: Text('$year'),
                        selected: _year == year,
                        selectedColor: sky,
                        onSelected: (_) => setState(() => _year = year),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              Text(range.$3, style: captionStyle),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _stat('Mauzo', tsh(bucket.sales))),
                  const SizedBox(width: 8),
                  Expanded(child: _stat('Gharama', tsh(bucket.cost))),
                ],
              ),
              const SizedBox(height: 8),
              _stat(profit >= 0 ? 'Faida' : 'Hasara', tsh(profit.abs()), emphasize: true, warn: profit < 0),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Faida na gharama', style: sectionStyle),
                    const SizedBox(height: 8),
                    if (bucket.sales <= 0 && bucket.cost <= 0)
                      const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Text('Hakuna mauzo kipindi hiki.', style: captionStyle))
                    else
                      SizedBox(
                        height: 180,
                        child: PieChart(
                          PieChartData(
                            sectionsSpace: 2,
                            centerSpaceRadius: 42,
                            sections: [
                              if (bucket.cost > 0)
                                PieChartSectionData(value: bucket.cost, color: const Color(0xFF7DD3F0), title: '', radius: 48),
                              if (gain > 0) PieChartSectionData(value: gain, color: skyDeep, title: '', radius: 54),
                              if (loss > 0) PieChartSectionData(value: loss, color: const Color(0xFFB45309), title: '', radius: 54),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                    _legend(const Color(0xFF7DD3F0), 'Gharama', tsh(bucket.cost)),
                    _legend(skyDeep, 'Faida', tsh(gain)),
                    if (loss > 0) _legend(const Color(0xFFB45309), 'Hasara', tsh(loss)),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_span == 'year' ? 'Kwa mwezi' : 'Kwa siku', style: sectionStyle),
                    const SizedBox(height: 10),
                    if (bucket.rows.isEmpty)
                      const Text('Hakuna mauzo.', style: captionStyle)
                    else
                      for (final row in bucket.rows)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Row(
                            children: [
                              Expanded(child: Text(row.label, style: bodyStyle)),
                              Text(
                                row.profit >= 0 ? tsh(row.profit) : '-${tsh(row.profit.abs())}',
                                style: TextStyle(fontWeight: FontWeight.w600, color: row.profit >= 0 ? ink : const Color(0xFFB45309)),
                              ),
                            ],
                          ),
                        ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _chip(String label, String span) {
    return ChoiceChip(
      label: Text(label),
      selected: _day == null && _span == span,
      selectedColor: sky,
      onSelected: (_) => setState(() {
        _day = null;
        _span = span;
      }),
    );
  }

  Widget _stat(String label, String value, {bool emphasize = false, bool warn = false}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: vaultCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: captionStyle),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value, style: TextStyle(fontSize: emphasize ? 26 : 18, fontWeight: FontWeight.w600, color: warn ? const Color(0xFFB45309) : ink)),
          ),
        ],
      ),
    );
  }

  Widget _legend(Color color, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Expanded(child: Text(label, style: bodyStyle)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
        ],
      ),
    );
  }

  (DateTime, DateTime, String) _range() {
    final now = DateTime.now();
    if (_day != null) {
      final start = DateTime(_day!.year, _day!.month, _day!.day);
      return (start, start.add(const Duration(days: 1)), formatDay(start));
    }
    switch (_span) {
      case 'yesterday':
        final start = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 1));
        return (start, start.add(const Duration(days: 1)), 'Jana');
      case 'week':
        final end = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
        return (end.subtract(const Duration(days: 7)), end, 'Siku 7');
      case 'month':
        final start = DateTime(now.year, now.month, 1);
        return (start, DateTime(now.year, now.month + 1, 1), 'Mwezi huu');
      case 'year':
        return (DateTime(_year, 1, 1), DateTime(_year + 1, 1, 1), '$_year');
      default:
        final start = DateTime(now.year, now.month, now.day);
        return (start, start.add(const Duration(days: 1)), 'Leo');
    }
  }

  List<int> _years(ShopStore store) {
    final found = <int>{DateTime.now().year};
    for (final sale in store.liveSales) {
      final when = DateTime.tryParse('${sale['created_at']}')?.toLocal();
      if (when != null) found.add(when.year);
    }
    final years = found.toList()..sort();
    return years;
  }

  _Bucket _collect(ShopStore store, DateTime start, DateTime end) {
    final allowed = {for (final sale in store.liveSales) sale['id'] as String};
    final bySale = {for (final sale in store.sales) sale['id']: sale};
    final groups = <String, double>{};
    var sales = 0.0;
    var cost = 0.0;
    for (final item in store.saleItems) {
      final saleId = item['sale_id'];
      if (!allowed.contains(saleId)) continue;
      final sale = bySale[saleId];
      final when = DateTime.tryParse('${sale?['created_at']}')?.toLocal();
      if (when == null || when.isBefore(start) || !when.isBefore(end)) continue;
      final qty = asInt(item['qty']);
      final lineSales = asDouble(item['price']) * qty;
      final lineCost = asDouble(item['cost']) * qty;
      sales += lineSales;
      cost += lineCost;
      final key = _span == 'year' ? _monthsOf(when.month) : formatDay(when);
      groups[key] = (groups[key] ?? 0) + (lineSales - lineCost);
    }
    return _Bucket(sales, cost, [for (final entry in groups.entries) _Row(entry.key, entry.value)]);
  }

  String _monthsOf(int month) => const ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'][month - 1];

  Future<void> _pickDay() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _day ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _day = picked);
  }

  Future<void> _share(String csv) async {
    if (csv.trim().startsWith('haipatikani')) {
      toast(context, 'Ripoti hii haipo kwa akaunti hii.');
      return;
    }
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/phonevault-faida.csv');
    await file.writeAsString(csv);
    await Share.shareXFiles([XFile(file.path, mimeType: 'text/csv', name: 'faida.csv')], subject: 'Faida');
  }
}

class _Bucket {
  _Bucket(this.sales, this.cost, this.rows);
  final double sales;
  final double cost;
  final List<_Row> rows;
}

class _Row {
  _Row(this.label, this.profit);
  final String label;
  final double profit;
}
