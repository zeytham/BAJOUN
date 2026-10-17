import 'package:flutter/services.dart';

const _channel = MethodChannel('tz.phonevault/screen');

Future<void> setScreenSecure(bool on) async {
  try {
    await _channel.invokeMethod('secure', {'on': on});
  } catch (_) {}
}
