import 'dart:io';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../date_span.dart';
import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import '../lang.dart';

class ProfitPage extends StatefulWidget {
  const ProfitPage({super.key, required this.store});
  final ShopStore store;

  @override
  State<ProfitPage> createState() => _ProfitPageState();
}

class _ProfitPageState extends State<ProfitPage> {
  String _span = 'today';
  int _year = DateTime.now().year;
  DaySpan? _picked;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        final store = widget.store;
        if (!store.isOwner) {
          return Scaffold(backgroundColor: skyPage, body: LockedNote(title: t('Faida')));
        }
        final range = _range();
        final bucket = _collect(store, range.$1, range.$2);
        final book = store.ledgerBetween(range.$1, range.$2);
        final profit = book.shopProfit;
        final gain = profit > 0 ? profit : 0.0;
        final loss = profit < 0 ? -profit : 0.0;
        final years = _years(store);
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(
            title: Text(t('Faida')),
            actions: [
              IconButton(
                tooltip: t('Pakua'),
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
                  _chip(t('Leo'), 'today'),
                  _chip(t('Jana'), 'yesterday'),
                  _chip(t('Wiki'), 'week'),
                  _chip(t('Mwezi'), 'month'),
                  _chip(t('Mwaka'), 'year'),
                  ActionChip(
                    avatar: Icon(Icons.calendar_today, size: 16, color: _picked == null ? skyDeep : Colors.white),
                    label: Text(_picked == null ? t('Tarehe') : _picked!.label),
                    backgroundColor: _picked == null ? null : skyDeep,
                    labelStyle: TextStyle(color: _picked == null ? ink : Colors.white, fontWeight: FontWeight.w700),
                    onPressed: _pickRange,
                  ),
                ],
              ),
              if (_picked == null && _span == 'year') ...[
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
              const SizedBox(height: 6),
              Text(
                t('Simu na vifaa vinahesabiwa kando. Bidhaa zilizoharibika zina gharama yake. Mwisho namba tatu zinaunganishwa kuwa faida ya duka.'),
                style: captionStyle,
              ),
              const SizedBox(height: 8),
              _stat(profit >= 0 ? t('Faida ya duka') : t('Hasara ya duka'), tsh(profit.abs()), emphasize: true, warn: profit < 0),
              const SizedBox(height: 8),
              _sideCard(
                t('Simu'),
                t('Mauzo, gharama na faida ya simu peke yake.'),
                book.phones,
                store.phoneCapital,
              ),
              const SizedBox(height: 8),
              _sideCard(
                t('Vifaa vingine'),
                t('Mauzo, gharama na faida ya vifaa peke yake.'),
                book.goods,
                store.goodsCapital,
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('Bidhaa zilizoharibika'), style: sectionStyle),
                    const SizedBox(height: 4),
                    Text(t('Gharama hii inapunguza faida. Sio mauzo.'), style: captionStyle),
                    const SizedBox(height: 8),
                    _legend(skyDeep, t('Mauzo ya matatizo'), tsh(book.faultSales)),
                    _legend(const Color(0xFFB45309), t('Gharama ya simu'), tsh(book.phoneFaults)),
                    _legend(const Color(0xFFB45309), t('Gharama ya vifaa'), tsh(book.goodsFaults)),
                    _legend(const Color(0xFFB45309), t('Faida ya matatizo'), tsh(book.faultProfit)),
                    _legend(skyDeep, t('Mtaji wa matatizo uliopo'), tsh(store.faultCapital)),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('Hesabu ya pamoja'), style: sectionStyle),
                    const SizedBox(height: 4),
                    Text(t('Faida ya simu + faida ya vifaa + faida ya matatizo.'), style: captionStyle),
                    const SizedBox(height: 8),
                    _legend(skyDeep, t('Faida ya simu'), tsh(book.phoneProfit)),
                    _legend(skyDeep, t('Faida ya vifaa'), tsh(book.goodsProfit)),
                    _legend(const Color(0xFFB45309), t('Faida ya matatizo'), tsh(book.faultProfit)),
                    _legend(profit >= 0 ? skyDeep : const Color(0xFFB45309), t('Faida ya duka'), tsh(profit)),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                decoration: vaultCard(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('Faida na gharama'), style: sectionStyle),
                    const SizedBox(height: 8),
                    if (book.sales <= 0 && book.cost <= 0 && book.faults <= 0)
                      Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Text(t('Hakuna mauzo kipindi hiki.'), style: captionStyle))
                    else
                      SizedBox(
                        height: 180,
                        child: PieChart(
                          PieChartData(
                            sectionsSpace: 2,
                            centerSpaceRadius: 42,
                            sections: [
                              if (book.cost > 0)
                                PieChartSectionData(value: book.cost, color: const Color(0xFFB7D7A8), title: '', radius: 48),
                              if (gain > 0) PieChartSectionData(value: gain, color: skyDeep, title: '', radius: 54),
                              if (loss > 0) PieChartSectionData(value: loss, color: const Color(0xFFB45309), title: '', radius: 54),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                    _legend(const Color(0xFFB7D7A8), t('Gharama ya simu na vifaa'), tsh(book.cost)),
                    _legend(skyDeep, t('Faida'), tsh(gain)),
                    if (loss > 0) _legend(const Color(0xFFB45309), t('Hasara'), tsh(loss)),
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
                    Text(_span == 'year' ? t('Kwa mwezi') : t('Kwa siku'), style: sectionStyle),
                    const SizedBox(height: 10),
                    if (bucket.rows.isEmpty)
                      Text(t('Hakuna mauzo.'), style: captionStyle)
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
      selected: _picked == null && _span == span,
      selectedColor: sky,
      onSelected: (_) => setState(() {
        _picked = null;
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

  Widget _sideCard(String title, String note, SideTake side, double capital) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: vaultCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: sectionStyle),
          const SizedBox(height: 4),
          Text(note, style: captionStyle),
          const SizedBox(height: 8),
          _legend(skyDeep, t('Mauzo'), tsh(side.sales)),
          _legend(const Color(0xFFB7D7A8), t('Gharama ya zilizouzwa'), tsh(side.cost)),
          _legend(const Color(0xFFB45309), t('Marejesho'), tsh(side.returned)),
          _legend(side.profit >= 0 ? skyDeep : const Color(0xFFB45309), t('Faida'), tsh(side.profit)),
          _legend(skyDeep, t('Mtaji uliopo sasa'), tsh(capital)),
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
    if (_picked != null) {
      return (_picked!.start, _picked!.end.add(const Duration(days: 1)), _picked!.label);
    }
    switch (_span) {
      case 'yesterday':
        final start = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 1));
        return (start, start.add(const Duration(days: 1)), t('Jana'));
      case 'week':
        final end = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
        return (end.subtract(const Duration(days: 7)), end, t('Siku 7'));
      case 'month':
        final start = DateTime(now.year, now.month, 1);
        return (start, DateTime(now.year, now.month + 1, 1), t('Mwezi huu'));
      case 'year':
        return (DateTime(_year, 1, 1), DateTime(_year + 1, 1, 1), '$_year');
      default:
        final start = DateTime(now.year, now.month, now.day);
        return (start, start.add(const Duration(days: 1)), t('Leo'));
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
      final faultSale = asInt(item['faulty']) == 1;
      sales += lineSales;
      if (!faultSale) cost += lineCost;
      final key = _span == 'year' ? _monthsOf(when.month) : formatDay(when);
      groups[key] = (groups[key] ?? 0) + (faultSale ? lineSales : lineSales - lineCost);
    }
    for (final item in store.returnItems) {
      final parent = store.returns.cast<Map<String, Object?>?>().firstWhere((row) => row?['id'] == item['return_id'], orElse: () => null);
      if (parent == null) continue;
      if (!allowed.contains(parent['sale_id'])) continue;
      final when = DateTime.tryParse('${parent['created_at']}')?.toLocal();
      if (when == null || when.isBefore(start) || !when.isBefore(end)) continue;
      final origin = store.saleItems.cast<Map<String, Object?>?>().firstWhere((row) => row?['id'] == item['sale_item_id'], orElse: () => null);
      final faultSale = origin != null && asInt(origin['faulty']) == 1;
      final margin = faultSale ? asDouble(item['price']) * asInt(item['qty']) : (asDouble(item['price']) - asDouble(item['cost'])) * asInt(item['qty']);
      final key = _span == 'year' ? _monthsOf(when.month) : formatDay(when);
      groups[key] = (groups[key] ?? 0) - margin;
    }
    for (final fault in store.faults) {
      final when = DateTime.tryParse('${fault['created_at']}')?.toLocal();
      if (when == null || when.isBefore(start) || !when.isBefore(end)) continue;
      final key = _span == 'year' ? _monthsOf(when.month) : formatDay(when);
      groups[key] = (groups[key] ?? 0) - asDouble(fault['cost']) * asInt(fault['qty']);
    }
    return _Bucket(sales, cost, [for (final entry in groups.entries) _Row(entry.key, entry.value)]);
  }

  String _monthsOf(int month) => const ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'][month - 1];

  Future<void> _pickRange() async {
    final picked = await pickDaySpan(context, current: _picked);
    if (picked != null && mounted) setState(() => _picked = picked);
  }

  Future<void> _share(String csv) async {
    if (csv.trim().startsWith('haipatikani')) {
      toast(context, t('Ripoti hii haipo kwa akaunti hii.'));
      return;
    }
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/phonevault-faida.csv');
    await file.writeAsString(csv);
    await Share.shareXFiles([XFile(file.path, mimeType: 'text/csv', name: 'faida.csv')], subject: t('Faida'));
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
