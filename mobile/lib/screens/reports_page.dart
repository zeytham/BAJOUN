import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'profit_page.dart';

class ReportsPage extends StatelessWidget {
  const ReportsPage({super.key, required this.store});
  final ShopStore store;

  @override
  Widget build(BuildContext context) {
    if (!store.seeReports) {
      return const Scaffold(backgroundColor: skyPage, body: LockedNote(title: 'Ripoti'));
    }
    final reports = <_Report>[
      _Report('Mauzo', () async => store.csvSales()),
      if (store.seeDebts) _Report('Madeni', () async => store.csvDebts()),
      if (store.seeStock) _Report('Stoo', () async => store.csvStock()),
      if (store.seeCustomers) _Report('Wateja', () async => store.csvCustomers()),
      if (store.isOwner) _Report('Wauzaji', store.csvByCashier),
      _Report('Vikundi', () async => store.csvByCategory()),
      if (store.seeStock) _Report('Stoo ndogo', () async => store.csvLowStock()),
      if (store.isOwner) _Report('Mwendo wa stoo', store.csvMoves),
    ];
    return Scaffold(
      backgroundColor: skyPage,
      appBar: AppBar(title: const Text('Ripoti', style: TextStyle(fontWeight: FontWeight.w600))),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: reports.length + (store.isOwner ? 1 : 0),
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          if (index == 0 && store.isOwner) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                child: ListTile(
                  title: const Text('Faida', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: ink)),
                  trailing: const Icon(Icons.chevron_right, color: muted),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfitPage(store: store))),
                ),
              ),
            );
          }
          final report = reports[store.isOwner ? index - 1 : index];
          return Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            child: ListTile(
              title: Text(report.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: ink)),
              trailing: const Icon(Icons.chevron_right, color: muted),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _ReportView(report: report))),
            ),
          );
        },
      ),
    );
  }
}

class _ReportView extends StatefulWidget {
  const _ReportView({required this.report});
  final _Report report;

  @override
  State<_ReportView> createState() => _ReportViewState();
}

class _ReportViewState extends State<_ReportView> {
  List<List<String>> _rows = [];
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final csv = await widget.report.build();
    if (!mounted) return;
    setState(() {
      _rows = _parseCsv(csv);
      _ready = true;
    });
  }

  Future<void> _download() async {
    final csv = await widget.report.build();
    if (!mounted) return;
    if (csv.trim().startsWith('haipatikani')) {
      toast(context, 'Ripoti hii haipo kwa akaunti hii.');
      return;
    }
    try {
      final dir = await getTemporaryDirectory();
      final safe = widget.report.title.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-');
      final file = File('${dir.path}/phonevault-$safe.csv');
      await file.writeAsString(csv);
      await Share.shareXFiles([
        XFile(file.path, mimeType: 'text/csv', name: 'phonevault-$safe.csv'),
      ], subject: widget.report.title);
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: csv));
      if (mounted) toast(context, 'Imenakiliwa. Bandika kwenye daftari.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final header = _rows.isEmpty ? const <String>[] : _rows.first;
    final body = _rows.length < 2 ? const <List<String>>[] : _rows.sublist(1);
    return Scaffold(
      backgroundColor: skyPage,
      appBar: AppBar(
        title: Text(widget.report.title, style: const TextStyle(fontWeight: FontWeight.w600)),
        actions: [
          IconButton(tooltip: 'Pakua', onPressed: _ready ? _download : null, icon: const Icon(Icons.ios_share)),
        ],
      ),
      body: !_ready
          ? const Center(child: CircularProgressIndicator(color: skyDeep))
          : body.isEmpty
              ? const EmptyHint(text: 'Hakuna kumbukumbu.')
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final wide = constraints.maxWidth >= 720;
                    final cards = [
                      for (final row in body) _ReportCard(header: header, row: row, wide: wide),
                    ];
                    return Scrollbar(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                        child: wide
                            ? Wrap(
                                spacing: 12,
                                runSpacing: 12,
                                children: [
                                  for (final card in cards)
                                    SizedBox(width: (constraints.maxWidth - 44) / 2, child: card),
                                ],
                              )
                            : Column(children: cards),
                      ),
                    );
                  },
                ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({required this.header, required this.row, required this.wide});
  final List<String> header;
  final List<String> row;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final title = row.isEmpty ? '' : row.first;
    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(bottom: wide ? 0 : 10),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: vaultCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: ink)),
          const SizedBox(height: 10),
          for (var i = 1; i < header.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Text(_label(header[i]), style: captionStyle),
                  const Spacer(),
                  Text(
                    _show(header[i], i < row.length ? row[i] : ''),
                    style: const TextStyle(fontWeight: FontWeight.w600, color: ink),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Report {
  _Report(this.title, this.build);
  final String title;
  final Future<String> Function() build;
}

String _label(String raw) => raw.replaceAll('_', ' ');

String _show(String header, String value) {
  final key = header.toLowerCase();
  const money = ['jumla', 'bei', 'gharama', 'faida', 'manunuzi', 'baki', 'deni', 'kilicholipwa'];
  if (money.any(key.contains)) {
    final amount = double.tryParse(value);
    if (amount != null) return tsh(amount);
  }
  return value;
}

List<List<String>> _parseCsv(String csv) {
  final text = csv.replaceFirst('\uFEFF', '').trim();
  if (text.isEmpty) return [];
  final rows = <List<String>>[];
  final row = <String>[];
  final cell = StringBuffer();
  var quoted = false;
  for (var i = 0; i < text.length; i++) {
    final char = text[i];
    if (quoted) {
      if (char == '"') {
        if (i + 1 < text.length && text[i + 1] == '"') {
          cell.write('"');
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell.write(char);
      }
      continue;
    }
    if (char == '"') {
      quoted = true;
    } else if (char == ',') {
      row.add(cell.toString());
      cell.clear();
    } else if (char == '\n') {
      row.add(cell.toString());
      cell.clear();
      rows.add(List<String>.from(row));
      row.clear();
    } else if (char != '\r') {
      cell.write(char);
    }
  }
  if (cell.isNotEmpty || row.isNotEmpty) {
    row.add(cell.toString());
    rows.add(row);
  }
  return rows.where((line) => line.any((value) => value.isNotEmpty)).toList();
}
