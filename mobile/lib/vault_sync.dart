import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

class VaultSync {
  static const shopServer = 'http://10.0.2.2:5000';

  static Future<Map<String, dynamic>?> pull(String base, String token) async {
    final uri = _uri(base, '/api/sync/vault');
    if (uri == null) return null;
    final client = HttpClient();
    try {
      client.connectionTimeout = const Duration(seconds: 3);
      final request = await client.getUrl(uri).timeout(const Duration(seconds: 4));
      _headers(request, token);
      final response = await request.close().timeout(const Duration(seconds: 8));
      if (response.statusCode < 200 || response.statusCode >= 300) return null;
      final body = await response.transform(utf8.decoder).join();
      final parsed = jsonDecode(body);
      final data = parsed is Map ? parsed['data'] : null;
      if (data is Map<String, dynamic>) return data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return null;
    } catch (_) {
      return null;
    } finally {
      client.close(force: true);
    }
  }

  static Future<Map<String, dynamic>?> push(String base, String token, Map<String, Object?> snapshot) async {
    final uri = _uri(base, '/api/sync/vault');
    if (uri == null) return null;
    final client = HttpClient();
    try {
      client.connectionTimeout = const Duration(seconds: 3);
      final request = await client.putUrl(uri).timeout(const Duration(seconds: 4));
      _headers(request, token);
      final payload = utf8.encode(jsonEncode({'snapshot': snapshot}));
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json; charset=utf-8');
      request.contentLength = payload.length;
      request.add(payload);
      final response = await request.close().timeout(const Duration(seconds: 20));
      final body = await response.transform(utf8.decoder).join();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        debugPrint('vault sync: ${response.statusCode}');
        return null;
      }
      final parsed = jsonDecode(body);
      final data = parsed is Map ? parsed['data'] : null;
      if (data is Map<String, dynamic>) return data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return null;
    } catch (error) {
      debugPrint('vault sync: $error');
      return null;
    } finally {
      client.close(force: true);
    }
  }

  static Uri? _uri(String base, String path) {
    final root = base.trim().replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.tryParse('$root$path');
    if (uri == null || (uri.scheme != 'https' && uri.scheme != 'http') || uri.host.isEmpty) return null;
    if (uri.scheme == 'http' && !shopHost(uri.host)) return null;
    return uri;
  }

  static bool shopHost(String host) {
    final name = host.toLowerCase();
    if (name == 'localhost' || name == '10.0.2.2') return true;
    final parts = name.split('.');
    if (parts.length != 4) return false;
    final nums = [for (final part in parts) int.tryParse(part)];
    if (nums.any((n) => n == null || n < 0 || n > 255)) return false;
    final a = nums[0]!;
    final b = nums[1]!;
    if (a == 10 || a == 127) return true;
    if (a == 192 && b == 168) return true;
    return a == 172 && b >= 16 && b <= 31;
  }

  static void _headers(HttpClientRequest request, String token) {
    if (token.isNotEmpty) request.headers.set('X-Sync-Token', token);
  }
}
