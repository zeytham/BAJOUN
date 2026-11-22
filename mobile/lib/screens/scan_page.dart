import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../lang.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class ScanPage extends StatefulWidget {
  const ScanPage({super.key, this.action = 'Ongeza kwenye kikapu', this.imei = true});
  final String action;
  final bool imei;

  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  final _manual = TextEditingController();
  final _camera = MobileScannerController(detectionSpeed: DetectionSpeed.normal);
  final List<Barcode> _seen = [];
  Timer? _settle;
  List<String> _choices = [];
  bool _done = false;

  @override
  void dispose() {
    _settle?.cancel();
    _manual.dispose();
    _camera.dispose();
    super.dispose();
  }

  void _finish(String code) {
    final clean = code.trim();
    if (_done || clean.isEmpty) return;
    _done = true;
    _settle?.cancel();
    Navigator.pop(context, clean);
  }

  void _onDetect(BarcodeCapture capture) {
    if (_done || _choices.isNotEmpty) return;
    _seen.addAll(capture.barcodes);
    _settle?.cancel();
    _settle = Timer(const Duration(milliseconds: 450), _decide);
  }

  void _decide() {
    if (_done || !mounted || _choices.isNotEmpty) return;
    final codes = _seen.toList();
    _seen.clear();
    final imeis = _imeiChoices(codes);
    final labeled = _labeledImei1(codes);
    if (widget.imei && labeled != null) {
      _finish(labeled);
      return;
    }
    if (widget.imei && imeis.length == 1) {
      _finish(imeis.first);
      return;
    }
    if (widget.imei && imeis.length > 1) {
      setState(() => _choices = imeis);
      return;
    }
    final plain = _plainCodes(codes);
    if (plain.length == 1) {
      _finish(plain.first);
      return;
    }
    if (plain.length > 1) {
      setState(() => _choices = plain);
    }
  }

  @override
  Widget build(BuildContext context) {
    final prompt = widget.imei ? t('Lenga IMEI 1 ndani ya boksi.') : t('Lenga msimbo mmoja ndani ya boksi.');
    final many = widget.imei ? t('Boksi lina IMEI zaidi ya moja. Chagua IMEI 1.') : t('Boksi lina misimbo mingi. Chagua ile unayotaka.');
    return Scaffold(
      backgroundColor: ink,
      appBar: AppBar(
        backgroundColor: ink,
        foregroundColor: Colors.white,
        title: Text(t('Skani msimbo'), style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final size = constraints.biggest;
                  final window = Rect.fromCenter(
                    center: size.center(Offset.zero),
                    width: size.width * 0.88,
                    height: (size.height * 0.16).clamp(76.0, 120.0),
                  );
                  return Stack(
                    fit: StackFit.expand,
                    children: [
                      MobileScanner(
                        controller: _camera,
                        scanWindow: window,
                        onDetect: _onDetect,
                        errorBuilder: (context, error, child) {
                          final denied = error.errorCode == MobileScannerErrorCode.permissionDenied;
                          return ColoredBox(
                            color: ink,
                            child: Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      denied
                                          ? t('Ruhusu kamera ili skana iwashe. Bonyeza Ruhusu, kisha kubali kamera kwenye simu.')
                                          : t('Kamera haijawaka. Andika IMEI hapa chini, au jaribu tena.'),
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(color: Colors.white, height: 1.4),
                                    ),
                                    const SizedBox(height: 12),
                                    FilledButton(
                                      onPressed: () => _camera.start(),
                                      child: Text(denied ? t('Ruhusu kamera') : t('Jaribu tena')),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      IgnorePointer(child: CustomPaint(painter: _SlotPainter(window))),
                      Positioned(
                        left: 20,
                        right: 20,
                        top: window.bottom + 14,
                        child: Text(prompt, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, height: 1.35)),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
          Container(
            width: double.infinity,
            color: skyPage,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_choices.isNotEmpty) ...[
                  Text(many, style: sectionStyle),
                  const SizedBox(height: 8),
                  for (var i = 0; i < _choices.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => _finish(_choices[i]),
                          child: Text(i == 0 && widget.imei ? '${t('IMEI 1')}  ${_choices[i]}' : _choices[i]),
                        ),
                      ),
                    ),
                  TextButton(
                    onPressed: () => setState(() => _choices = []),
                    child: Text(t('Skani tena')),
                  ),
                ] else ...[
                  Text(t('Au andika msimbo'), style: sectionStyle),
                  const SizedBox(height: 8),
                  SoftField(controller: _manual, label: t(widget.imei ? 'IMEI au barcode' : 'Serial au barcode'), maxLength: 32),
                  const SizedBox(height: 10),
                  FilledButton(onPressed: () => _finish(_manual.text), child: Text(t(widget.action))),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SlotPainter extends CustomPainter {
  _SlotPainter(this.hole);
  final Rect hole;

  @override
  void paint(Canvas canvas, Size size) {
    final shade = Path()
      ..addRect(Offset.zero & size)
      ..addRRect(RRect.fromRectAndRadius(hole, const Radius.circular(14)))
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(shade, Paint()..color = const Color(0xB30F172A));
    canvas.drawRRect(
      RRect.fromRectAndRadius(hole, const Radius.circular(14)),
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.4,
    );
  }

  @override
  bool shouldRepaint(covariant _SlotPainter oldDelegate) => oldDelegate.hole != hole;
}

String? _labeledImei1(List<Barcode> codes) {
  for (final code in codes) {
    final raw = _text(code);
    final match = RegExp(r'IMEI\s*1\D{0,8}(\d{15})', caseSensitive: false).firstMatch(raw);
    if (match != null) return match.group(1);
  }
  return null;
}

List<String> _imeiChoices(List<Barcode> codes) {
  final ranked = <String, int>{};
  final order = <String, double>{};
  for (final code in codes) {
    final raw = _text(code);
    final top = _top(code);
    final one = RegExp(r'IMEI\s*1\D{0,8}(\d{15})', caseSensitive: false).firstMatch(raw);
    final two = RegExp(r'IMEI\s*2\D{0,8}(\d{15})', caseSensitive: false).firstMatch(raw);
    if (one != null) _keep(ranked, order, one.group(1)!, 300, top);
    if (two != null) _keep(ranked, order, two.group(1)!, 40, top);
    for (final match in RegExp(r'(?<!\d)(\d{15})(?!\d)').allMatches(raw)) {
      final digits = match.group(1)!;
      if (digits == one?.group(1) || digits == two?.group(1)) continue;
      _keep(ranked, order, digits, _imeiOk(digits) ? 200 : 80, top);
    }
  }
  final values = ranked.keys.toList()
    ..sort((a, b) {
      final byRank = ranked[b]!.compareTo(ranked[a]!);
      if (byRank != 0) return byRank;
      return order[a]!.compareTo(order[b]!);
    });
  return values;
}

List<String> _plainCodes(List<Barcode> codes) {
  final seen = <String, double>{};
  for (final code in codes) {
    final raw = (code.rawValue ?? '').trim();
    if (raw.isEmpty) continue;
    final top = _top(code);
    final previous = seen[raw];
    if (previous == null || top < previous) seen[raw] = top;
  }
  final values = seen.keys.toList()..sort((a, b) => seen[a]!.compareTo(seen[b]!));
  return values;
}

void _keep(Map<String, int> ranked, Map<String, double> order, String digits, int rank, double top) {
  final current = ranked[digits];
  if (current == null || rank > current) ranked[digits] = rank;
  final previous = order[digits];
  if (previous == null || top < previous) order[digits] = top;
}

String _text(Barcode code) => '${code.rawValue ?? ''} ${code.displayValue ?? ''}'.trim();

double _top(Barcode code) {
  if (code.corners.isEmpty) return 1e9;
  return code.corners.map((point) => point.dy).reduce((a, b) => a < b ? a : b);
}

bool _imeiOk(String digits) {
  if (!RegExp(r'^\d{15}$').hasMatch(digits)) return false;
  var sum = 0;
  for (var i = 0; i < 15; i++) {
    var n = digits.codeUnitAt(14 - i) - 48;
    if (i.isOdd) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 == 0;
}
