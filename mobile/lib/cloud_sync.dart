import 'dart:convert';
import 'dart:io';

import 'money.dart';

class CloudSync {
  static Future<String?> send({
    required String base,
    required String token,
    required String deviceId,
    required Map<String, Object?> sale,
    required List<Map<String, Object?>> items,
  }) async {
    final root = base.trim().replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.tryParse('$root/api/sync/ingest');
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
      return 'Anwani ya cloud ianze na https://';
    }
    final client = HttpClient();
    try {
      client.connectionTimeout = const Duration(seconds: 8);
      final request = await client.postUrl(uri).timeout(const Duration(seconds: 12));
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      if (token.isNotEmpty) request.headers.set('X-Sync-Token', token);
      request.headers.set('X-Device-Id', deviceId);
      request.write(jsonEncode({'sale': _payload(sale, items, deviceId)}));
      final response = await request.close().timeout(const Duration(seconds: 20));
      if (response.statusCode == 401) return 'Token ya cloud si sahihi.';
      if (response.statusCode < 200 || response.statusCode >= 300) return 'Cloud imejibu ${response.statusCode}.';
      await response.drain<void>();
      return null;
    } on SocketException {
      return 'Mtandao haupo. Risiti imebaki kwenye simu.';
    } catch (_) {
      return 'Cloud haijafikiwa. Risiti imebaki kwenye simu.';
    } finally {
      client.close(force: true);
    }
  }

  static Map<String, Object?> _payload(Map<String, Object?> sale, List<Map<String, Object?>> items, String deviceId) {
    final phone = '${sale['customer_phone'] ?? ''}';
    final paid = asDouble(sale['paid']);
    return {
      'clientSaleId': sale['id'],
      'invoiceNumber': sale['invoice'],
      'deviceId': deviceId,
      'currency': 'TSH',
      'subtotal': asDouble(sale['total']),
      'discountTotal': 0,
      'taxAmount': 0,
      'grandTotal': asDouble(sale['total']),
      'amountPaid': paid,
      'changeDue': asDouble(sale['change_due']),
      'status': 'COMPLETED',
      if (phone.isNotEmpty) 'customer': {'name': sale['customer_name'], 'phone': phone},
      'items': [
        for (final item in items)
          {
            'productId': '${item['product_id'] ?? item['phone_id'] ?? item['id']}',
            'unitPrice': asDouble(item['price']),
            'quantity': asInt(item['qty']),
            'lineTotal': asDouble(item['price']) * asInt(item['qty']),
            'productNameSnapshot': item['name'],
            'imeiSnapshot': item['imei'],
          },
      ],
      'payments': [
        {
          'method': sale['method'] == 'LIPA' ? 'LIPA' : 'CASH',
          'amount': paid,
          'referenceCode': sale['lipa_ref'],
        },
      ],
    };
  }
}
