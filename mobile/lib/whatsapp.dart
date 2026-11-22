import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

import 'lang.dart';
import 'money.dart';

const _channel = MethodChannel('tz.phonevault/screen');
const zeyhaanWhatsapp = '0624945919';

Future<String?> openZeyhaanWhatsapp() async {
  final digits = whatsappDigits(zeyhaanWhatsapp);
  if (digits == null) return 'Namba haiko sahihi.';
  final opened = await _channel.invokeMethod<bool>('chat', {
    'phone': digits,
    'text': t('Habari Zeyhaan, nahitaji msaada kuhusu PhoneVault.'),
  });
  if (opened != true) return 'WhatsApp haikufunguka kwenye simu hii.';
  return null;
}

Future<String?> sendWhatsappPdf({
  required String phone,
  required Uint8List bytes,
  required String filename,
}) async {
  final digits = whatsappDigits(phone);
  if (digits == null) return 'Namba ianze na 0 na iwe tarakimu 10.';
  final safe = filename.replaceAll(RegExp(r'[^A-Za-z0-9._-]+'), '-');
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/$safe');
  await file.writeAsBytes(bytes, flush: true);
  final opened = await _channel.invokeMethod<bool>('whatsapp', {
    'phone': digits,
    'path': file.path,
  });
  if (opened != true) return 'WhatsApp haikufunguka kwenye simu hii.';
  return null;
}
