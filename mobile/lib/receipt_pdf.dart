import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import 'money.dart';

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
  const PaperLine({required this.name, required this.qty, required this.price});
  final String name;
  final int qty;
  final double price;
  double get total => price * qty;
}

final _ink = PdfColor.fromInt(0xFF0F172A);
final _muted = PdfColor.fromInt(0xFF64748B);
final _sky = PdfColor.fromInt(0xFF0284C7);
final _wash = PdfColor.fromInt(0xFFE6F7FF);

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
  return _paper(
    shop: shop,
    kicker: 'RISITI',
    title: invoice,
    when: when,
    blocks: [
      _people(customer, phone, cashier),
      _lines(lines),
      _money([
        _pair('Jumla', tsh(total)),
        _pair('Alichotoa', tsh(paid + change)),
        if (change > 0) _pair('Alichorudishiwa', tsh(change)),
        if (balance > 0) _pair('Deni', tsh(balance)),
        _pair('Malipo', method),
      ]),
    ],
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
  return _paper(
    shop: shop,
    kicker: 'RISITI YA KURUDISHA',
    title: invoice,
    when: when,
    blocks: [
      _people(customer, phone, cashier),
      pw.Text('Risiti ya mauzo $saleInvoice', style: pw.TextStyle(fontSize: 10, color: _muted)),
      pw.SizedBox(height: 8),
      _lines(lines),
      _money([
        _pair('Thamani iliyorudi', tsh(total)),
        if (refund > 0) _pair('Pesa ya kumrudishia', tsh(refund)),
        if (debtLeft > 0) _pair('Deni lililobaki', tsh(debtLeft)),
      ]),
      pw.SizedBox(height: 8),
      pw.Text('Sababu', style: pw.TextStyle(fontSize: 9, color: _muted, fontWeight: pw.FontWeight.bold)),
      pw.Text(reason, style: pw.TextStyle(fontSize: 11, color: _ink)),
    ],
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
  return _paper(
    shop: shop,
    kicker: 'UKUMBUSHO WA DENI',
    title: customer,
    when: DateTime.now(),
    blocks: [
      pw.Text(showPhone(phone).isEmpty ? 'Mteja wetu' : showPhone(phone), style: pw.TextStyle(fontSize: 11, color: _muted)),
      pw.SizedBox(height: 12),
      pw.Container(
        width: double.infinity,
        padding: const pw.EdgeInsets.all(12),
        decoration: pw.BoxDecoration(color: _wash, borderRadius: pw.BorderRadius.circular(8)),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text('Salamu $customer,', style: pw.TextStyle(fontSize: 12, color: _ink)),
            pw.SizedBox(height: 6),
            pw.Text(
              'Tunakukumbusha deni la ${tsh(balance)} kwenye risiti $invoice. Limekaa siku $days. Karibu dukani, au lipa kwenye namba ya duka, ili tuifunge hesabu yako vizuri.',
              style: pw.TextStyle(fontSize: 11, color: _ink, lineSpacing: 2),
            ),
          ],
        ),
      ),
      pw.SizedBox(height: 12),
      _money([
        _pair('Deni', tsh(balance)),
        _pair('Risiti', invoice),
        _pair('Tangu', formatWhen(opened.toIso8601String())),
        _pair('Siku', '$days'),
      ]),
    ],
  );
}

Future<Uint8List> _paper({
  required PaperShop shop,
  required String kicker,
  required String title,
  required DateTime when,
  required List<pw.Widget> blocks,
}) async {
  pw.ImageProvider? mark;
  final logo = shop.logo;
  if (logo != null && logo.isNotEmpty) {
    try {
      mark = pw.MemoryImage(logo);
    } catch (_) {
      mark = null;
    }
  }
  final doc = pw.Document();
  doc.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a5,
      margin: const pw.EdgeInsets.all(24),
      build: (context) {
        return pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Container(
              width: double.infinity,
              padding: const pw.EdgeInsets.fromLTRB(14, 14, 14, 12),
              decoration: pw.BoxDecoration(color: _sky, borderRadius: pw.BorderRadius.circular(10)),
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.center,
                children: [
                  if (mark != null) ...[
                    pw.Container(
                      width: 62,
                      height: 62,
                      padding: const pw.EdgeInsets.all(4),
                      decoration: pw.BoxDecoration(color: PdfColors.white, borderRadius: pw.BorderRadius.circular(8)),
                      child: pw.Image(mark, fit: pw.BoxFit.contain),
                    ),
                    pw.SizedBox(width: 10),
                  ],
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(shop.name, style: pw.TextStyle(color: PdfColors.white, fontSize: 18, fontWeight: pw.FontWeight.bold)),
                        if (shop.location.trim().isNotEmpty)
                          pw.Text(shop.location.trim(), style: pw.TextStyle(color: PdfColors.white, fontSize: 10)),
                        if (shop.phone.trim().isNotEmpty)
                          pw.Text('Simu ${showPhone(shop.phone)}', style: pw.TextStyle(color: PdfColors.white, fontSize: 10)),
                        if (shop.lipa.trim().isNotEmpty)
                          pw.Text('Lipa ${shop.lipa.trim()}', style: pw.TextStyle(color: PdfColors.white, fontSize: 10)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 14),
            pw.Text(kicker, style: pw.TextStyle(fontSize: 9, color: _sky, fontWeight: pw.FontWeight.bold, letterSpacing: 1)),
            pw.SizedBox(height: 2),
            pw.Text(title, style: pw.TextStyle(fontSize: 16, color: _ink, fontWeight: pw.FontWeight.bold)),
            pw.Text(formatWhen(when.toIso8601String()), style: pw.TextStyle(fontSize: 10, color: _muted)),
            pw.SizedBox(height: 12),
            ...blocks,
            pw.SizedBox(height: 18),
            pw.Divider(color: PdfColor.fromInt(0xFFD7EEF8)),
            pw.Text(
              shop.footer.trim().isEmpty ? 'Asante kwa kununua. Karibu tena.' : shop.footer.trim(),
              style: pw.TextStyle(fontSize: 10, color: _muted, lineSpacing: 2),
            ),
          ],
        );
      },
    ),
  );
  return doc.save();
}

pw.Widget _people(String customer, String phone, String cashier) {
  return pw.Column(
    crossAxisAlignment: pw.CrossAxisAlignment.start,
    children: [
      _pair('Mteja', customer.trim().isEmpty ? 'Walk-in' : customer.trim()),
      _pair('Simu', showPhone(phone).isEmpty ? '-' : showPhone(phone)),
      _pair('Muuzaji', cashier.trim().isEmpty ? '-' : cashier.trim()),
      pw.SizedBox(height: 8),
    ],
  );
}

pw.Widget _lines(List<PaperLine> lines) {
  return pw.Column(
    children: [
      for (final line in lines)
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(vertical: 4),
          decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColor.fromInt(0xFFE6F7FF), width: 0.6))),
          child: pw.Row(
            children: [
              pw.Expanded(child: pw.Text('${line.name}  x${line.qty}', style: pw.TextStyle(fontSize: 11, color: _ink))),
              pw.Text(tsh(line.total), style: pw.TextStyle(fontSize: 11, color: _ink, fontWeight: pw.FontWeight.bold)),
            ],
          ),
        ),
      pw.SizedBox(height: 8),
    ],
  );
}

pw.Widget _money(List<pw.Widget> rows) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(10),
    decoration: pw.BoxDecoration(color: _wash, borderRadius: pw.BorderRadius.circular(8)),
    child: pw.Column(children: rows),
  );
}

pw.Widget _pair(String label, String value) {
  return pw.Padding(
    padding: const pw.EdgeInsets.only(bottom: 3),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.SizedBox(width: 110, child: pw.Text(label, style: pw.TextStyle(fontSize: 10, color: _muted))),
        pw.Expanded(child: pw.Text(value, style: pw.TextStyle(fontSize: 11, color: _ink, fontWeight: pw.FontWeight.bold))),
      ],
    ),
  );
}
