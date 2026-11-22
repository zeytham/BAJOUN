import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'money.dart';
import 'lang.dart';

class PaperShop {
  const PaperShop({
    required this.name,
    required this.location,
    required this.phone,
    required this.lipa,
    required this.footer,
    this.logo,
  });

  final String name;
  final String location;
  final String phone;
  final String lipa;
  final String footer;
  final Uint8List? logo;
}

class PaperLine {
  const PaperLine({required this.name, required this.qty, required this.price, this.imei = ''});
  final String name;
  final int qty;
  final double price;
  final String imei;
  double get total => price * qty;
}

class PaperLines extends StatelessWidget {
  const PaperLines({super.key, required this.lines});
  final List<PaperLine> lines;

  @override
  Widget build(BuildContext context) {
    final pieces = lines.fold<int>(0, (sum, line) => sum + line.qty);
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Column(
        children: [
          for (final line in lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${line.qty}', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF2B6C31))),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(line.name, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                        if (line.imei.trim().isNotEmpty)
                          Text(line.imei.trim(), style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(tsh(line.total), style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          if (lines.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  Expanded(child: Text(t('Idadi ya vitu alivyochukua'), style: const TextStyle(color: Color(0xFF64748B)))),
                  const SizedBox(width: 8),
                  Text('$pieces', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF2B6C31))),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

const _ink = Color(0xFF0F172A);
const _muted = Color(0xFF64748B);
const _sky = Color(0xFF509541);
const _line = Color(0xFFE2E8F0);

Future<Uint8List> buildSaleReceipt({
  required PaperShop shop,
  required String invoice,
  required DateTime when,
  required String customer,
  required String phone,
  required String cashier,
  required String method,
  required double total,
  required double paid,
  required double change,
  required double balance,
  required List<PaperLine> lines,
}) {
  final lipa = method.toLowerCase().contains('lipa') && shop.lipa.trim().isNotEmpty;
  return _paint(
    shop: shop,
    title: balance > 0 ? t('Imeuzwa kwa deni') : t('Imeuzwa'),
    rows: [
      (t('Risiti'), invoice),
      (t('Mteja'), customer.trim().isEmpty ? t('Walk-in') : customer.trim()),
      (t('Simu'), showPhone(phone).isEmpty ? '—' : showPhone(phone)),
      (t('Malipo'), method),
      if (lipa) (t('Lipa'), shop.lipa.trim()),
      (t('Jumla'), tsh(total)),
      (t('Alichotoa'), tsh(paid + change)),
      if (change > 0) (t('Alichorudishiwa'), tsh(change)),
      if (balance > 0) (t('Deni'), tsh(balance)),
      (t('Muuzaji'), cashier.trim().isEmpty ? '—' : cashier.trim()),
    ],
    lines: lines,
    note: '',
  );
}

Future<Uint8List> buildReturnReceipt({
  required PaperShop shop,
  required String invoice,
  required String saleInvoice,
  required DateTime when,
  required String customer,
  required String phone,
  required String cashier,
  required String reason,
  required double total,
  required double refund,
  required double debtLeft,
  required List<PaperLine> lines,
}) {
  return _paint(
    shop: shop,
    title: t('Imerudishwa'),
    rows: [
      (t('Risiti'), invoice),
      (t('Mauzo'), saleInvoice),
      (t('Mteja'), customer.trim().isEmpty ? t('Walk-in') : customer.trim()),
      (t('Simu'), showPhone(phone).isEmpty ? '—' : showPhone(phone)),
      (t('Muuzaji'), cashier.trim().isEmpty ? '—' : cashier.trim()),
      ('Thamani', tsh(total)),
      if (refund > 0) (t('Amerudishiwa'), tsh(refund)),
      if (debtLeft > 0) (t('Deni'), tsh(debtLeft)),
    ],
    lines: lines,
    note: reason.trim().isEmpty ? '' : tf('Sababu: {0}', [reason.trim()]),
  );
}

Future<Uint8List> buildDebtNotice({
  required PaperShop shop,
  required String customer,
  required String phone,
  required String invoice,
  required DateTime opened,
  required int days,
  required double balance,
}) {
  return _paint(
    shop: shop,
    title: t('Ukumbusho wa deni'),
    rows: [
      (t('Mteja'), customer.trim().isEmpty ? '—' : customer.trim()),
      (t('Simu'), showPhone(phone).isEmpty ? '—' : showPhone(phone)),
      (t('Risiti'), invoice),
      (t('Tangu'), formatWhen(opened.toIso8601String())),
      (t('Siku'), '$days'),
      (t('Deni'), tsh(balance)),
    ],
    lines: [],
    note: t('Karibu dukani, au lipa kwenye namba ya duka, ili tuifunge hesabu yako.'),
  );
}

Future<Uint8List> _paint({
  required PaperShop shop,
  required String title,
  required List<(String, String)> rows,
  required List<PaperLine> lines,
  required String note,
}) async {
  ui.Image? mark;
  final logo = shop.logo;
  if (logo != null && logo.isNotEmpty) {
    try {
      mark = await decodeImageFromList(logo);
    } catch (_) {
      mark = null;
    }
  }

  const width = 720.0;
  const pad = 36.0;
  const contentW = width - pad * 2;
  const labelW = 168.0;
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  canvas.drawRect(const Rect.fromLTWH(0, 0, width, 4000), Paint()..color = Colors.white);

  final facts = <(String, String)>[
    if (shop.location.trim().isNotEmpty) (t('Mahali'), shop.location.trim()),
    if (showPhone(shop.phone).isNotEmpty) (t('Simu ya duka'), showPhone(shop.phone)),
    ...rows,
  ];

  var y = 28.0;
  y += _write(canvas, title, pad, y, 44, _ink, FontWeight.w700, contentW) + 22;

  final nameW = contentW - (mark == null ? 0 : 132);
  final nameH = _measure(shop.name, 32, FontWeight.w700, nameW);
  final bannerH = (mark == null ? nameH : 104.0) + 28;
  canvas.drawRRect(
    RRect.fromRectAndRadius(Rect.fromLTWH(pad, y, contentW, bannerH), const Radius.circular(22)),
    Paint()..color = _sky,
  );
  var textX = pad + 18;
  if (mark != null) {
    final box = Rect.fromLTWH(pad + 16, y + (bannerH - 92) / 2, 92, 92);
    canvas.drawRRect(RRect.fromRectAndRadius(box, const Radius.circular(14)), Paint()..color = Colors.white);
    canvas.save();
    canvas.clipRRect(RRect.fromRectAndRadius(box.deflate(8), const Radius.circular(10)));
    paintImage(canvas: canvas, rect: box.deflate(8), image: mark, fit: BoxFit.contain);
    canvas.restore();
    textX = box.right + 16;
  }
  final nameTop = y + (bannerH - nameH) / 2;
  _write(canvas, shop.name, textX, nameTop, 32, Colors.white, FontWeight.w700, width - pad - 18 - textX, maxLines: 2);
  y += bannerH + 22;

  _check(canvas, pad, y, 64);
  y += 64 + 22;

  for (final row in facts) {
    final labelH = _measure(row.$1, 26, FontWeight.w400, labelW);
    final valueH = _measure(row.$2, 30, FontWeight.w400, contentW - labelW);
    _write(canvas, row.$1, pad, y, 26, _muted, FontWeight.w400, labelW);
    _write(canvas, row.$2, pad + labelW, y, 30, _ink, FontWeight.w400, contentW - labelW, maxLines: 3);
    y += (labelH > valueH ? labelH : valueH) + 14;
  }

  if (lines.isNotEmpty) {
    y += 6;
    canvas.drawRect(Rect.fromLTWH(pad, y, contentW, 1.5), Paint()..color = _line);
    y += 18;
    for (final line in lines) {
      final amount = tsh(line.total);
      final amountW = _measureWidth(amount, 30, FontWeight.w600);
      final leftW = contentW - amountW - 16;
      final title = line.imei.trim().isEmpty ? '${line.qty}  ${line.name}' : '${line.qty}  ${line.name}\n${line.imei.trim()}';
      final leftH = _measure(title, 28, FontWeight.w400, leftW);
      _write(canvas, title, pad, y, 28, _ink, FontWeight.w400, leftW, maxLines: 3);
      _write(canvas, amount, width - pad - amountW, y, 30, _ink, FontWeight.w600, amountW + 4);
      y += leftH + 12;
    }
    final pieces = lines.fold<int>(0, (sum, line) => sum + line.qty);
    y += 4;
    final pieceText = '$pieces';
    final pieceW = _measureWidth(pieceText, 30, FontWeight.w700);
    _write(canvas, t('Idadi ya vitu alivyochukua'), pad, y, 26, _muted, FontWeight.w400, contentW - pieceW - 12);
    _write(canvas, pieceText, width - pad - pieceW, y, 30, const Color(0xFF2B6C31), FontWeight.w700, pieceW + 4);
    y += 40;
  }

  final tails = <String>[
    if (note.trim().isNotEmpty) note.trim(),
    if (shop.footer.trim().isNotEmpty) shop.footer.trim(),
  ];
  var footH = 0.0;
  if (tails.isNotEmpty) {
    y += 10;
    for (final tail in tails) {
      footH += _write(canvas, tail, pad, y + footH, 26, _muted, FontWeight.w400, contentW, maxLines: 6);
      footH += 8;
    }
  }
  final imageH = (y + footH + 20).ceil();

  final picture = recorder.endRecording();
  final image = await picture.toImage(width.toInt(), imageH);
  final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
  mark?.dispose();
  image.dispose();
  return bytes!.buffer.asUint8List();
}

void _check(Canvas canvas, double x, double y, double size) {
  canvas.drawCircle(Offset(x + size / 2, y + size / 2), size / 2, Paint()..color = _sky);
  final tick = Paint()
    ..color = Colors.white
    ..style = PaintingStyle.stroke
    ..strokeWidth = size * 0.1
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round;
  canvas.drawPath(
    Path()
      ..moveTo(x + size * 0.28, y + size * 0.52)
      ..lineTo(x + size * 0.44, y + size * 0.68)
      ..lineTo(x + size * 0.74, y + size * 0.34),
    tick,
  );
}

double _write(
  Canvas canvas,
  String value,
  double x,
  double y,
  double size,
  Color color,
  FontWeight weight,
  double maxWidth, {
  int maxLines = 4,
}) {
  final painter = TextPainter(
    text: TextSpan(text: value, style: TextStyle(color: color, fontSize: size, fontWeight: weight, height: 1.2)),
    textDirection: Lang.i.arabic ? TextDirection.rtl : TextDirection.ltr,
    maxLines: maxLines,
    ellipsis: '…',
  )..layout(maxWidth: maxWidth);
  painter.paint(canvas, Offset(x, y));
  return painter.height;
}

double _measure(String value, double size, FontWeight weight, double maxWidth) {
  final painter = TextPainter(
    text: TextSpan(text: value, style: TextStyle(fontSize: size, fontWeight: weight, height: 1.2)),
    textDirection: Lang.i.arabic ? TextDirection.rtl : TextDirection.ltr,
    maxLines: 4,
  )..layout(maxWidth: maxWidth);
  return painter.height;
}

double _measureWidth(String value, double size, FontWeight weight) {
  final painter = TextPainter(
    text: TextSpan(text: value, style: TextStyle(fontSize: size, fontWeight: weight)),
    textDirection: Lang.i.arabic ? TextDirection.rtl : TextDirection.ltr,
  )..layout();
  return painter.width;
}
