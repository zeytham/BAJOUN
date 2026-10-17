import 'dart:convert';
import 'dart:typed_data';

import 'package:image/image.dart' as img;

Uint8List? photoBytes(Object? raw) {
  final text = raw is String ? raw.trim() : '';
  if (text.isEmpty) return null;
  try {
    final bytes = base64Decode(text);
    return bytes.isEmpty ? null : bytes;
  } catch (_) {
    return null;
  }
}

Uint8List? preparePicture(Uint8List bytes, {required int maxSide, required bool square}) {
  if (bytes.isEmpty || bytes.length > 12 * 1024 * 1024) return null;
  final decoded = img.decodeImage(bytes);
  if (decoded == null) return null;
  final img.Image framed;
  if (square) {
    final side = decoded.width < decoded.height ? decoded.width : decoded.height;
    final crop = img.copyCrop(
      decoded,
      x: (decoded.width - side) ~/ 2,
      y: (decoded.height - side) ~/ 2,
      width: side,
      height: side,
    );
    final target = side < maxSide ? side : maxSide;
    framed = target == side
        ? crop
        : img.copyResize(crop, width: target, height: target, interpolation: img.Interpolation.cubic);
  } else {
    final long = decoded.width > decoded.height ? decoded.width : decoded.height;
    if (long <= maxSide) {
      framed = decoded;
    } else {
      final scale = maxSide / long;
      framed = img.copyResize(
        decoded,
        width: (decoded.width * scale).round(),
        height: (decoded.height * scale).round(),
        interpolation: img.Interpolation.cubic,
      );
    }
  }
  return Uint8List.fromList(img.encodeJpg(framed, quality: 92));
}
