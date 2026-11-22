import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import 'money.dart';

class ShopDb {
  ShopDb._(this.db);
  Database db;

  static Future<String> filePath() async => p.join(await getDatabasesPath(), 'phonevault.db');

  static Future<ShopDb> open() async => ShopDb._(await _openFile(await filePath()));

  static Future<Database> _openFile(String file) {
    return openDatabase(
      file,
      version: 14,
      onCreate: (db, version) async {
        await _create(db);
        await _seed(db);
      },
      onOpen: (db) async {
        await _speedIndexes(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) await _upgrade(db);
        if (oldVersion < 3) await _upgradeSecurity(db);
        if (oldVersion < 4) await _upgradeShop(db);
        if (oldVersion < 5) await _upgradeSync(db);
        if (oldVersion < 6) await _upgradeVariant(db);
        if (oldVersion < 7) await _upgradeReturns(db);
        if (oldVersion < 8) await _upgradeFaces(db);
        if (oldVersion < 9) await _upgradeKinds(db);
        if (oldVersion < 10) await _upgradeBooks(db);
        if (oldVersion < 11) await _addColumn(db, 'sale_items', 'faulty', 'INTEGER NOT NULL DEFAULT 0');
        if (oldVersion < 12) await _addColumn(db, 'wing_items', 'returned_qty', 'INTEGER NOT NULL DEFAULT 0');
        if (oldVersion < 13) {
          await _addColumn(db, 'phone_units', 'ram', "TEXT NOT NULL DEFAULT ''");
          await _addColumn(db, 'phone_units', 'screen', "TEXT NOT NULL DEFAULT ''");
        }
        if (oldVersion < 14) {
          await _addColumn(db, 'products', 'storage', "TEXT NOT NULL DEFAULT ''");
          await _addColumn(db, 'products', 'ram', "TEXT NOT NULL DEFAULT ''");
          await _addColumn(db, 'products', 'screen', "TEXT NOT NULL DEFAULT ''");
          await _addColumn(db, 'products', 'condition', "TEXT NOT NULL DEFAULT ''");
        }
      },
    );
  }

  Future<String> exportCopy() async {
    final dir = await getTemporaryDirectory();
    final stamp = DateTime.now().toIso8601String().replaceAll(':', '-');
    final dest = p.join(dir.path, 'phonevault-$stamp.db');
    final file = File(dest);
    if (await file.exists()) await file.delete();
    final sqlPath = dest.replaceAll('\\', '/').replaceAll("'", "''");
    try {
      await db.execute("VACUUM INTO '$sqlPath'");
      if (await file.exists() && await file.length() > 0) return dest;
    } catch (_) {}
    await db.rawQuery('PRAGMA wal_checkpoint(FULL)');
    await File(await filePath()).copy(dest);
    return dest;
  }

  Future<String?> restoreCopy(String sourcePath) async {
    final source = File(sourcePath);
    if (!await source.exists() || await source.length() < 16) return 'Faili hii haikusomeka.';
    final dir = await getTemporaryDirectory();
    final probePath = p.join(dir.path, 'phonevault-probe.db');
    final probeFile = File(probePath);
    if (await probeFile.exists()) await probeFile.delete();
    await source.copy(probePath);
    Database? probe;
    try {
      probe = await openDatabase(probePath, readOnly: true, singleInstance: false);
      final tables = await probe.rawQuery("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sales'");
      if (tables.isEmpty) return 'Faili hii si nakala ya PhoneVault.';
      final version = await probe.getVersion();
      if (version > 14) return 'Nakala hii inatoka kwenye toleo jipya. Sasisha app kwanza.';
    } catch (_) {
      return 'Faili hii si nakala ya PhoneVault.';
    } finally {
      await probe?.close();
      for (final extra in [probePath, '$probePath-wal', '$probePath-shm']) {
        final file = File(extra);
        if (await file.exists()) await file.delete();
      }
    }

    final target = await filePath();
    final safety = File('$target.safe');
    await db.close();
    await File(target).copy(safety.path);
    for (final extra in ['$target-wal', '$target-shm']) {
      final file = File(extra);
      if (await file.exists()) await file.delete();
    }
    try {
      await File(sourcePath).copy(target);
      db = await _openFile(target);
      if (await safety.exists()) await safety.delete();
      return null;
    } catch (_) {
      if (await safety.exists()) await safety.copy(target);
      db = await _openFile(target);
      return 'Nakala haikurejeshwa. Duka la awali limebaki.';
    }
  }

  static String legacyPinHash(String pin) => sha256.convert(utf8.encode('phonevault:$pin')).toString();

  static String freshSalt() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return base64Url.encode(bytes);
  }

  static Future<String> pinHash(String pin, String salt) {
    return Isolate.run(() => _stretchPin(pin, salt));
  }

  static bool sameHash(String left, String right) {
    if (left.length != right.length) return false;
    var diff = 0;
    for (var i = 0; i < left.length; i++) {
      diff |= left.codeUnitAt(i) ^ right.codeUnitAt(i);
    }
    return diff == 0;
  }

  Future<String?> meta(String key) async {
    final rows = await db.query('meta', where: 'key = ?', whereArgs: [key]);
    if (rows.isEmpty) return null;
    return rows.first['value'] as String?;
  }

  Future<void> setMeta(String key, String value) async {
    await db.insert('meta', {'key': key, 'value': value}, conflictAlgorithm: ConflictAlgorithm.replace);
    const stamped = {'shop_name', 'shop_location', 'shop_phone', 'receipt_footer', 'lipa_namba', 'shop_logo', 'ui_lang', 'pin_recovery_hash', 'pin_recovery_salt', 'pin_recovery_fails', 'pin_recovery_until', 'gone_categories', 'gone_customers', 'debts_hidden'};
    if (!stamped.contains(key)) return;
    await db.insert(
      'meta',
      {'key': '${key}__at', 'value': DateTime.now().toUtc().toIso8601String()},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String> deviceId() async {
    final existing = await meta('device_id');
    if (existing != null && existing.isNotEmpty) return existing;
    final id = _id();
    await setMeta('device_id', id);
    return id;
  }

  Future<void> markSaleSync(String id, {required bool ok, String error = ''}) {
    return db.update('sales', {
      'sync_status': ok ? 'SYNCED' : 'LOCAL',
      'sync_error': error,
    }, where: 'id = ?', whereArgs: [id]);
  }

  static const replicaTables = [
    'categories',
    'products',
    'phone_units',
    'customers',
    'sales',
    'sale_items',
    'debts',
    'debt_payments',
    'returns',
    'return_items',
    'stock_moves',
    'staff',
    'notifications',
    'faults',
    'wings',
    'wing_items',
  ];

  Future<int> revision() async => int.tryParse(await meta('vault_revision') ?? '') ?? 0;

  Future<void> bumpRevision() async {
    await setMeta('vault_revision', '${await revision() + 1}');
  }

  Future<Map<String, Object?>> shopSnapshot() async {
    final data = <String, Object?>{'revision': await revision()};
    for (final table in replicaTables) {
      data[table] = await db.query(table);
    }
    final metas = await db.query('meta');
    data['meta'] = metas.where((row) {
      final key = '${row['key']}';
      return key != 'cloud_url' && key != 'sync_token' && key != 'cloud_url__at' && key != 'sync_token__at';
    }).toList();
    return data;
  }

  Future<Set<String>> _newerShopKeys(Map<String, dynamic> snapshot) async {
    const keys = ['shop_name', 'shop_location', 'shop_phone', 'receipt_footer', 'lipa_namba', 'shop_logo'];
    final metas = snapshot['meta'];
    final skip = <String>{};
    if (metas is! List) return skip;
    for (final key in keys) {
      final local = DateTime.tryParse(await meta('${key}__at') ?? '');
      if (local == null) continue;
      DateTime? incoming;
      for (final row in metas) {
        if (row is Map && '${row['key']}' == '${key}__at') incoming = DateTime.tryParse('${row['value']}');
      }
      if (incoming == null || local.isAfter(incoming)) {
        skip.add(key);
        skip.add('${key}__at');
      }
    }
    return skip;
  }

  Future<void> applySnapshot(Map<String, dynamic> snapshot) async {
    final keepLocal = await _newerShopKeys(snapshot);
    await db.transaction((txn) async {
      for (final table in replicaTables.reversed) {
        final rows = snapshot[table];
        if (rows is! List) continue;
        await txn.delete(table);
        for (final row in rows) {
          if (row is! Map) continue;
          final values = _row(row);
          if (table == 'staff' && values['photo'] == null) values['photo'] = '';
          if (table == 'categories' && '${values['kind'] ?? ''}'.isEmpty) {
            values['kind'] = values['id'] == 'phones' ? 'phone' : 'goods';
          }
          if (table == 'phone_units' && values['category_id'] == null) values['category_id'] = '';
          if (table == 'products') {
            values['warranty_days'] ??= 0;
            values['fault_qty'] ??= 0;
          }
          if (table == 'phone_units' || table == 'sale_items') values['warranty_days'] ??= 0;
          if (table == 'sale_items') values['faulty'] ??= 0;
          if (table == 'debts') {
            values['due_at'] ??= '';
            values['term_days'] ??= 0;
            values['term_unit'] ??= '';
          }
          if (table == 'return_items') values['faulty'] ??= 0;
          if (table == 'wings') values['returned_at'] ??= '';
          if (table == 'wing_items') values['returned_qty'] ??= 0;
          await txn.insert(table, values);
        }
      }
      final metas = snapshot['meta'];
      if (metas is List) {
        for (final row in metas) {
          if (row is Map && _keepMeta('${row['key']}') && !keepLocal.contains('${row['key']}')) {
            await txn.insert('meta', _row(row), conflictAlgorithm: ConflictAlgorithm.replace);
          }
        }
      }
      await txn.insert(
        'meta',
        {'key': 'vault_revision', 'value': '${snapshot['revision'] ?? 0}'},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    });
  }

  Future<List<Map<String, Object?>>> categories() => db.query('categories', orderBy: 'name');

  Future<List<Map<String, Object?>>> products() => db.query('products', orderBy: 'name');

  Future<List<Map<String, Object?>>> phones() => db.query('phone_units', orderBy: 'product_name');

  Future<List<Map<String, Object?>>> customers() => db.query('customers', orderBy: 'name');

  Future<List<Map<String, Object?>>> sales() => db.query('sales', orderBy: 'created_at DESC');

  Future<List<Map<String, Object?>>> saleItems() => db.query('sale_items');

  Future<List<Map<String, Object?>>> debts() {
    return db.rawQuery("SELECT * FROM debts ORDER BY CASE status WHEN 'OPEN' THEN 0 ELSE 1 END, opened_at DESC");
  }

  Future<List<Map<String, Object?>>> debtPayments(String debtId) {
    return db.query('debt_payments', where: 'debt_id = ?', whereArgs: [debtId], orderBy: 'created_at DESC');
  }

  Future<List<Map<String, Object?>>> allDebtPayments() => db.query('debt_payments');

  Future<List<Map<String, Object?>>> notes() => db.query('notifications', orderBy: 'created_at DESC');

  Future<List<Map<String, Object?>>> staff({bool activeOnly = false}) {
    if (activeOnly) {
      return db.query('staff', where: 'active = 1', orderBy: 'role DESC, name');
    }
    return db.query('staff', orderBy: 'role DESC, name');
  }

  Future<Map<String, Object?>?> staffById(String id) async {
    final rows = await db.query('staff', where: 'id = ?', whereArgs: [id]);
    if (rows.isEmpty) return null;
    return rows.first;
  }

  Future<String> insertStaff({required String name, required String role, required String pin}) async {
    final id = _id();
    final salt = freshSalt();
    await db.insert('staff', {
      'id': id,
      'name': _plain(name, 40),
      'role': role,
      'pin_hash': await pinHash(pin, salt),
      'pin_salt': salt,
      'pin_fails': 0,
      'pin_locked_until': '',
      'perm_stock': 1,
      'perm_cost': 0,
      'perm_history': 0,
      'perm_debts': 1,
      'perm_customers': 1,
      'perm_reports': 0,
      'perm_edit': 0,
      'perm_analysis': 0,
      'active': 1,
      'created_at': DateTime.now().toIso8601String(),
    });
    await bumpRevision();
    return id;
  }

  Future<void> setPin(String id, String pin) async {
    final salt = freshSalt();
    await updateStaff(id, {
      'pin_hash': await pinHash(pin, salt),
      'pin_salt': salt,
      'pin_fails': 0,
      'pin_locked_until': '',
    });
  }

  Future<void> updateStaff(String id, Map<String, Object?> values) async {
    await db.update('staff', values, where: 'id = ?', whereArgs: [id]);
    const lockOnly = {'pin_fails', 'pin_locked_until'};
    if (values.keys.any((key) => !lockOnly.contains(key))) await bumpRevision();
  }

  Future<void> markNote(String id) => db.update('notifications', {'read': 1}, where: 'id = ?', whereArgs: [id]);

  Future<void> markAllNotes() => db.update('notifications', {'read': 1});

  Future<void> addNote({
    required String title,
    required String body,
    required String kind,
    bool uniqueUnread = false,
  }) {
    return _note(db, title: title, body: body, kind: kind, uniqueUnread: uniqueUnread);
  }

  Future<Map<String, Object?>?> findByCode(String code) async {
    final term = code.trim();
    final units = await db.query('phone_units', where: 'imei = ? AND status = ?', whereArgs: [term, 'IN_STOCK']);
    if (units.isNotEmpty) return {'kind': 'phone', ...units.first};
    final goods = await db.query('products', where: 'barcode = ? AND active = 1', whereArgs: [term]);
    if (goods.isNotEmpty) return {'kind': 'product', ...goods.first};
    return null;
  }

  Future<({String? id, String? error, bool existed})> saveCategory(String name, {String kind = 'goods'}) async {
    final clean = name.trim();
    final group = kind == 'phone' ? 'phone' : 'goods';
    if (clean.isEmpty) return (id: null, error: 'Weka jina la kundi.', existed: false);
    final id = _slug(clean);
    final existing = await db.query('categories', where: 'id = ?', whereArgs: [id]);
    if (existing.isNotEmpty) return (id: id, error: null, existed: true);
    await _forgetGone('gone_categories', id);
    await db.insert('categories', {'id': id, 'name': clean, 'slug': id, 'kind': group});
    await bumpRevision();
    return (id: id, error: null, existed: false);
  }

  Future<String?> deleteCategory(String id) async {
    if (id == 'phones') return 'Kundi la simu halifutiki.';
    final existing = await db.query('categories', where: 'id = ?', whereArgs: [id]);
    if (existing.isEmpty) return 'Kundi halipo.';
    final goods = await db.query('products', where: 'category_id = ?', whereArgs: [id]);
    if (id == 'nyingine' && goods.isNotEmpty) return 'Kundi la Nyingine linabaki kwa bidhaa zisizo na kundi.';
    if (goods.isNotEmpty) {
      final fallback = await db.query('categories', where: 'id = ?', whereArgs: ['nyingine']);
      if (fallback.isEmpty) {
        await db.insert('categories', {'id': 'nyingine', 'name': 'Nyingine', 'slug': 'nyingine'});
      }
      await db.update('products', {'category_id': 'nyingine'}, where: 'category_id = ?', whereArgs: [id]);
    }
    if (goods.isNotEmpty) await _forgetGone('gone_categories', 'nyingine');
    await _rememberGone('gone_categories', id);
    await db.delete('categories', where: 'id = ?', whereArgs: [id]);
    await bumpRevision();
    return null;
  }

  Future<String?> deleteCustomer(String id) async {
    final rows = await db.query('customers', where: 'id = ?', whereArgs: [id]);
    if (rows.isEmpty) return 'Mteja haipo.';
    final phone = '${rows.first['phone'] ?? ''}';
    final name = '${rows.first['name'] ?? ''}';
    final open = await db.query(
      'debts',
      where: "status = 'OPEN' AND (customer_phone = ? OR customer_name = ?)",
      whereArgs: [phone, name],
    );
    if (open.isNotEmpty) return 'Ana deni wazi. Pokea malipo kwanza.';
    await _rememberGone('gone_customers', id);
    await db.delete('customers', where: 'id = ?', whereArgs: [id]);
    await bumpRevision();
    return null;
  }

  Future<void> _rememberGone(String key, String id) async {
    final current = await meta(key) ?? '';
    final ids = current.split(',').map((part) => part.trim()).where((part) => part.isNotEmpty).toSet();
    ids.add(id);
    await setMeta(key, ids.join(','));
  }

  Future<void> _forgetGone(String key, String id) async {
    final current = await meta(key) ?? '';
    final ids = current.split(',').map((part) => part.trim()).where((part) => part.isNotEmpty && part != id).toSet();
    await setMeta(key, ids.join(','));
  }

  Future<String?> addStock(String id, int extra, {String actor = ''}) async {
    if (extra <= 0 || extra > 100000) return 'Weka idadi unayoongeza.';
    final existing = await db.query('products', where: 'id = ?', whereArgs: [id]);
    if (existing.isEmpty) return 'Bidhaa haipo.';
    final previous = (existing.first['stock'] as num).toInt();
    final next = previous + extra;
    if (next > 100000) return 'Idadi si sahihi.';
    await db.update('products', {'stock': next}, where: 'id = ?', whereArgs: [id]);
    await recordMove(name: '${existing.first['name']}', delta: extra, reason: 'MZIGO', staff: actor);
    await bumpRevision();
    return null;
  }

  Future<String?> saveAccessory({
    String? id,
    required String name,
    required String categoryId,
    required String brand,
    required double price,
    required double cost,
    required int stock,
    required String barcode,
    required int reorder,
    required int warranty,
    int faultQty = 0,
    String color = '',
    String size = '',
    String actor = '',
  }) async {
    final clean = _plain(name, 80);
    if (clean.isEmpty) return 'Weka jina la bidhaa.';
    final moneyError = _moneyOk(price, cost);
    if (moneyError != null) return moneyError;
    if (stock < 0 || stock > 100000) return 'Idadi si sahihi.';
    if (reorder < 0 || reorder > 100000) return 'Kiwango cha onyo si sahihi.';
    if (warranty < 0 || warranty > 730) return 'Warranty iwe siku 0 hadi 730, kwa wiki na siku.';
    if (faultQty < 0 || faultQty > 100000) return 'Idadi yenye matatizo si sahihi.';
    final code = barcode.trim();
    if (code.isNotEmpty && !RegExp(r'^[A-Za-z0-9-]{3,32}$').hasMatch(code)) return 'Barcode si sahihi.';
    if (code.isNotEmpty) {
      final clash = await db.query('products', where: 'barcode = ? AND id != ?', whereArgs: [code, id ?? '']);
      if (clash.isNotEmpty) return 'Barcode hii tayari ipo.';
    }
    final values = {
      'name': clean,
      'type': 'ACCESSORY',
      'category_id': categoryId,
      'brand': brand.trim(),
      'price': price,
      'cost': cost,
      'stock': stock,
      'barcode': code,
      'reorder_level': reorder,
      'warranty_months': 0,
      'warranty_days': warranty,
      'fault_qty': faultQty,
      'active': 1,
      'color': _plain(color, 30),
      'size': _plain(size, 30),
    };
    var previous = 0;
    var previousFault = 0;
    if (id != null) {
      final existing = await db.query('products', where: 'id = ?', whereArgs: [id]);
      if (existing.isNotEmpty) {
        previous = (existing.first['stock'] as num).toInt();
        previousFault = asInt(existing.first['fault_qty']);
      }
    }
    final productId = id ?? _id();
    if (id == null) {
      await db.insert('products', {'id': productId, ...values});
    } else {
      await db.update('products', values, where: 'id = ?', whereArgs: [id]);
    }
    final delta = id == null ? stock : stock - previous;
    if (delta != 0) {
      await recordMove(name: clean, delta: delta, reason: id == null ? 'MZIGO' : 'MAREKEBISHO', staff: actor);
    }
    final freshFault = id == null ? faultQty : faultQty - previousFault;
    if (freshFault != 0) {
      await _fault(
        db,
        name: clean,
        qty: freshFault,
        cost: cost,
        source: 'MPYA',
        productId: productId,
        staff: actor,
        note: freshFault < 0 ? 'Imerudi kuuzwa' : '',
      );
    }
    await bumpRevision();
    return null;
  }

  Future<String?> savePhoneGroup({
    String? id,
    required String name,
    required String categoryId,
    required String color,
    required String storage,
    required String ram,
    required String screen,
    required String condition,
    required double price,
    required double cost,
    required int stock,
    required int reorder,
    required int warranty,
    int faultQty = 0,
    String actor = '',
  }) async {
    final clean = _plain(name, 80);
    if (clean.isEmpty) return 'Weka jina la bidhaa.';
    final moneyError = _moneyOk(price, cost);
    if (moneyError != null) return moneyError;
    if (stock < 0 || stock > 100000) return 'Idadi si sahihi.';
    if (reorder < 0 || reorder > 100000) return 'Kiwango cha onyo si sahihi.';
    if (warranty < 0 || warranty > 730) return 'Warranty iwe siku 0 hadi 730, kwa wiki na siku.';
    if (faultQty < 0 || faultQty > 100000) return 'Idadi yenye matatizo si sahihi.';
    if (faultQty > stock) return 'Idadi yenye matatizo haiwezi kuzidi idadi yote.';
    final values = {
      'name': clean,
      'type': 'PHONE',
      'category_id': categoryId,
      'brand': '',
      'price': price,
      'cost': cost,
      'stock': stock,
      'barcode': '',
      'reorder_level': reorder,
      'warranty_months': 0,
      'warranty_days': warranty,
      'fault_qty': faultQty,
      'active': 1,
      'color': _plain(color, 30),
      'size': '',
      'storage': _plain(storage, 20),
      'ram': _plain(ram, 20),
      'screen': _plain(screen, 20),
      'condition': _plain(condition, 20),
    };
    var previous = 0;
    var previousFault = 0;
    if (id != null) {
      final existing = await db.query('products', where: 'id = ?', whereArgs: [id]);
      if (existing.isEmpty) return 'Bidhaa haipo.';
      if ('${existing.first['type']}' != 'PHONE') return 'Bidhaa haipo.';
      previous = asInt(existing.first['stock']);
      previousFault = asInt(existing.first['fault_qty']);
    }
    final productId = id ?? _id();
    if (id == null) {
      await db.insert('products', {'id': productId, ...values});
    } else {
      await db.update('products', values, where: 'id = ?', whereArgs: [id]);
    }
    final delta = id == null ? stock : stock - previous;
    if (delta != 0) {
      await recordMove(name: clean, delta: delta, reason: id == null ? 'MZIGO' : 'MAREKEBISHO', staff: actor);
    }
    final freshFault = id == null ? faultQty : faultQty - previousFault;
    if (freshFault != 0) {
      await _fault(
        db,
        name: clean,
        qty: freshFault,
        cost: cost,
        source: 'MPYA',
        productId: productId,
        staff: actor,
        note: freshFault < 0 ? 'Imerudi kuuzwa' : '',
      );
    }
    await bumpRevision();
    return null;
  }

  Future<bool> imeiHeld(String imei) => _imeiHeld(db, imei.trim());

  Future<bool> _imeiHeld(DatabaseExecutor exec, String imei) async {
    if (imei.isEmpty) return false;
    final units = await exec.query('phone_units', where: 'imei = ?', whereArgs: [imei]);
    if (units.isNotEmpty) return true;
    final rows = await exec.rawQuery('''
      SELECT si.qty,
        (SELECT COALESCE(SUM(ri.qty), 0) FROM return_items ri WHERE ri.sale_item_id = si.id) AS back
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.imei = ? AND s.voided = 0
    ''', [imei]);
    for (final row in rows) {
      if (asInt(row['qty']) > asInt(row['back'])) return true;
    }
    return false;
  }

  Future<String?> savePhone({
    String? id,
    required String name,
    required String imei,
    required String color,
    required String storage,
    String ram = '',
    String screen = '',
    required String condition,
    required double price,
    required double cost,
    required double floor,
    required int warranty,
    bool faulty = false,
    String categoryId = '',
    String actor = '',
  }) async {
    final clean = _plain(name, 80);
    final code = imei.trim();
    if (clean.isEmpty) return 'Weka jina la simu.';
    if (!RegExp(r'^\d{8,20}$').hasMatch(code)) return 'IMEI iwe tarakimu 8 hadi 20.';
    final moneyError = _moneyOk(price, cost);
    if (moneyError != null) return moneyError;
    if (floor < 0 || floor > 100000000) return 'Bei ya chini si sahihi.';
    if (warranty < 0 || warranty > 730) return 'Warranty iwe siku 0 hadi 730, kwa wiki na siku.';
    if (condition != 'NEW' && condition != 'LIKE NEW' && condition != 'USED') return 'Hali ya simu si sahihi.';
    final clash = await db.query('phone_units', where: 'imei = ? AND id != ?', whereArgs: [code, id ?? '']);
    if (clash.isNotEmpty) return 'IMEI hii tayari ipo.';
    final values = {
      'product_name': clean,
      'imei': code,
      'color': color.trim(),
      'storage': storage.trim(),
      'ram': _plain(ram, 20),
      'screen': _plain(screen, 20),
      'condition': condition,
      'price': price,
      'cost': cost,
      'floor_price': floor <= 0 ? price : floor,
      'warranty_months': 0,
      'warranty_days': warranty,
      'category_id': categoryId,
    };
    if (id == null) {
      final phoneId = _id();
      await db.insert('phone_units', {'id': phoneId, 'status': faulty ? 'FAULTY' : 'IN_STOCK', ...values});
      await recordMove(name: clean, delta: 1, reason: 'MZIGO', staff: actor);
      if (faulty) await _fault(db, name: clean, qty: 1, cost: cost, source: 'MPYA', phoneId: phoneId, staff: actor, note: '');
    } else {
      final existing = await db.query('phone_units', where: 'id = ?', whereArgs: [id]);
      final status = existing.isEmpty ? 'IN_STOCK' : '${existing.first['status']}';
      if (status != 'SOLD' && status != 'WING') {
        values['status'] = faulty ? 'FAULTY' : (status == 'FAULTY' ? 'IN_STOCK' : status);
      }
      await db.update('phone_units', values, where: 'id = ?', whereArgs: [id]);
      if (faulty && status != 'FAULTY' && status != 'SOLD' && status != 'WING') {
        await _fault(db, name: clean, qty: 1, cost: cost, source: 'MPYA', phoneId: id, staff: actor, note: '');
      }
    }
    await bumpRevision();
    return null;
  }

  Future<void> setProductActive(String id, bool active) async {
    await db.update('products', {'active': active ? 1 : 0}, where: 'id = ?', whereArgs: [id]);
    await bumpRevision();
  }

  Future<String?> deletePhone(String id, {String actor = ''}) async {
    final rows = await db.query('phone_units', where: 'id = ?', whereArgs: [id]);
    if (rows.isEmpty) return 'Simu haipo.';
    if (rows.first['status'] != 'IN_STOCK') return 'Simu iliyouzwa haiwezi kufutwa.';
    await db.delete('phone_units', where: 'id = ?', whereArgs: [id]);
    await recordMove(name: '${rows.first['product_name']}', delta: -1, reason: 'IMEFUTWA', staff: actor);
    await bumpRevision();
    return null;
  }

  Future<void> addCustomer(String name, String phone) async {
    await db.insert('customers', {
      'id': _id(),
      'name': _plain(name, 60),
      'phone': phone.replaceAll(RegExp(r'\D'), ''),
      'spent': 0,
      'created_at': DateTime.now().toIso8601String(),
    });
    await bumpRevision();
  }

  Future<String?> saveSale({
    required String id,
    required String invoice,
    required String customerName,
    required String customerPhone,
    required double total,
    required double paid,
    required double change,
    required String method,
    required String lipaRef,
    required String cashierId,
    required String cashierName,
    required List<CartLine> lines,
    int termDays = 0,
    String termUnit = '',
  }) async {
    try {
      await db.transaction((txn) async {
        for (final line in lines) {
          if (line.phoneId != null) {
            final rows = await txn.query('phone_units', where: 'id = ?', whereArgs: [line.phoneId]);
            final ready = line.faulty ? 'FAULTY' : 'IN_STOCK';
            if (rows.isEmpty || rows.first['status'] != ready) {
              throw StateError('${line.name} tayari imeuza.');
            }
          } else if (line.productId != null) {
            final rows = await txn.query('products', where: 'id = ?', whereArgs: [line.productId]);
            if (rows.isEmpty) throw StateError('Bidhaa haipo.');
            final stock = (rows.first[line.faulty ? 'fault_qty' : 'stock'] as num).toInt();
            if (stock < line.qty) throw StateError('Stoo ya ${line.name} haitoshi.');
            final imei = (line.imei ?? '').trim();
            if (imei.isNotEmpty && await _imeiHeld(txn, imei)) throw StateError('IMEI hii tayari ipo.');
          }
        }
        final balance = max(0, total - paid);
        final safeName = _plain(customerName, 60);
        final safePhone = customerPhone.replaceAll(RegExp(r'\D'), '');
        final safeRef = _plain(lipaRef, 40);
        final summary = lines.map((line) {
          final name = _plain(line.name, 80);
          final imei = (line.imei ?? '').trim();
          return imei.isEmpty ? '${line.qty} $name' : '${line.qty} $name $imei';
        }).join(', ');
        await txn.insert('sales', {
          'id': id,
          'invoice': invoice,
          'customer_name': safeName.isEmpty ? 'Walk-in' : safeName,
          'customer_phone': safePhone,
          'total': total,
          'paid': paid,
          'balance': balance,
          'change_due': max(0, change),
          'method': method,
          'lipa_ref': safeRef,
          'cashier_id': cashierId,
          'cashier_name': _plain(cashierName, 40),
          'summary': summary,
          'created_at': DateTime.now().toIso8601String(),
          'voided': 0,
          'sync_status': 'LOCAL',
        });
        for (final line in lines) {
          await txn.insert('sale_items', {
            'id': _id(),
            'sale_id': id,
            'name': line.name,
            'qty': line.qty,
            'price': line.price,
            'cost': line.cost,
            'imei': line.imei,
            'product_id': line.productId,
            'phone_id': line.phoneId,
            'warranty_months': 0,
            'warranty_days': line.warrantyDays > 0 ? line.warrantyDays : line.warrantyMonths * 30,
            'category_name': line.categoryName,
            'faulty': line.faulty ? 1 : 0,
          });
          if (!line.faulty) await _move(txn, name: line.name, delta: -line.qty, reason: 'MAUZO', staff: cashierName);
          if (line.phoneId != null) {
            await txn.update('phone_units', {'status': 'SOLD'}, where: 'id = ?', whereArgs: [line.phoneId]);
          } else if (line.productId != null && line.faulty) {
            await txn.rawUpdate('UPDATE products SET fault_qty = MAX(0, fault_qty - ?) WHERE id = ?', [line.qty, line.productId]);
          } else if (line.productId != null) {
            await txn.rawUpdate('UPDATE products SET stock = stock - ? WHERE id = ?', [line.qty, line.productId]);
            final rows = await txn.query('products', where: 'id = ?', whereArgs: [line.productId]);
            if (rows.isNotEmpty) {
              final stock = (rows.first['stock'] as num).toInt();
              final reorder = (rows.first['reorder_level'] as num?)?.toInt() ?? 3;
              if (stock <= reorder) {
                await _note(
                  txn,
                  title: 'Stoo ndogo',
                  body: '${line.name} zimebaki $stock.',
                  kind: 'LOW:${line.productId}',
                  uniqueUnread: true,
                );
              }
            }
          }
        }
        if (safeName != 'Walk-in') {
          await _touchCustomer(txn, safeName, safePhone, total);
        }
        if (balance > 0) {
          await txn.insert('debts', {
            'id': _id(),
            'sale_id': id,
            'customer_name': safeName,
            'customer_phone': safePhone,
            'principal': balance,
            'balance': balance,
            'opened_at': DateTime.now().toIso8601String(),
            'status': 'OPEN',
            'due_at': termDays > 0 ? DateTime.now().add(Duration(days: termDays)).toIso8601String() : '',
            'term_days': termDays,
            'term_unit': termUnit,
          });
          await _note(
            txn,
            title: 'Deni jipya',
            body: '$safeName anadaiwa TSH ${balance.round()} kwenye $invoice.',
            kind: 'DEBT:$id',
          );
        }
        await _note(
          txn,
          title: 'Mauzo mapya',
          body: '$invoice ${_plain(lines.first.name, 80)} · ${_plain(cashierName, 40)} · ${methodLabel(method)}.',
          kind: 'SALE:$id',
        );
      });
      await bumpRevision();
      return null;
    } on StateError catch (error) {
      return error.message.toString();
    }
  }

  Future<String?> payDebt({
    required String debtId,
    required double amount,
    required String method,
    required String note,
    required String cashierName,
  }) async {
    final rows = await db.query('debts', where: 'id = ?', whereArgs: [debtId]);
    if (rows.isEmpty) return 'Deni halipo.';
    final debt = rows.first;
    if (debt['status'] != 'OPEN') return 'Deni hili tayari limefungwa.';
    final balance = (debt['balance'] as num).toDouble();
    if (amount <= 0) return 'Weka kiasi.';
    if (amount > balance + 0.5) return 'Kiasi kinazidi deni lililobaki.';
    final next = max(0.0, balance - amount);
    await db.transaction((txn) async {
      await txn.insert('debt_payments', {
        'id': _id(),
        'debt_id': debtId,
        'amount': amount,
        'method': method,
        'note': _plain(note, 80),
        'cashier_name': cashierName,
        'created_at': DateTime.now().toIso8601String(),
      });
      await txn.update('debts', {
        'balance': next,
        'status': next <= 0.5 ? 'PAID' : 'OPEN',
      }, where: 'id = ?', whereArgs: [debtId]);
      final saleId = debt['sale_id'] as String?;
      if (saleId != null) {
        final sales = await txn.query('sales', where: 'id = ?', whereArgs: [saleId]);
        if (sales.isNotEmpty) {
          final paid = (sales.first['paid'] as num).toDouble() + amount;
          final total = (sales.first['total'] as num).toDouble();
          await txn.update('sales', {
            'paid': paid,
            'balance': max(0, total - paid),
          }, where: 'id = ?', whereArgs: [saleId]);
        }
      }
      await _note(
        txn,
        title: next <= 0.5 ? 'Deni limelipwa' : 'Malipo ya deni',
        body: '${debt['customer_name']} amelipa TSH ${amount.round()}. Baki TSH ${next.round()}.',
        kind: 'PAY:$debtId:${DateTime.now().millisecondsSinceEpoch}',
      );
    });
    await bumpRevision();
    return null;
  }

  Future<String?> voidSale(String saleId, {String actor = ''}) async {
    final sales = await db.query('sales', where: 'id = ?', whereArgs: [saleId]);
    if (sales.isEmpty) return 'Risiti haipo.';
    if ((sales.first['voided'] as num?)?.toInt() == 1) return 'Risiti tayari imefutwa.';
    if (asDouble(sales.first['returned']) > 0.5) return 'Risiti hii ina marejesho. Rudisha kilichobaki, usifute risiti.';
    final openDebts = await db.query('debts', where: 'sale_id = ?', whereArgs: [saleId]);
    for (final debt in openDebts) {
      final pays = await db.query('debt_payments', where: 'debt_id = ?', whereArgs: [debt['id']]);
      if (pays.isNotEmpty) return 'Deni lina malipo. Huwezi kufuta risiti hii.';
    }
    await db.transaction((txn) async {
      final items = await txn.query('sale_items', where: 'sale_id = ?', whereArgs: [saleId]);
      for (final item in items) {
        final phoneId = item['phone_id'] as String?;
        final productId = item['product_id'] as String?;
        final faulty = asInt(item['faulty']) == 1;
        final qty = asInt(item['qty']);
        if (phoneId != null && phoneId.isNotEmpty) {
          await txn.update('phone_units', {'status': faulty ? 'FAULTY' : 'IN_STOCK'}, where: 'id = ?', whereArgs: [phoneId]);
        } else if (productId != null && productId.isNotEmpty) {
          if (faulty) {
            await txn.rawUpdate('UPDATE products SET fault_qty = MIN(100000, fault_qty + ?), active = 1 WHERE id = ?', [qty, productId]);
          } else {
            await txn.rawUpdate('UPDATE products SET stock = MIN(100000, stock + ?), active = 1 WHERE id = ?', [qty, productId]);
          }
        }
        if (!faulty) await _move(txn, name: '${item['name']}', delta: qty, reason: 'RUDISHO', staff: actor);
      }
      await txn.update('sales', {'voided': 1, 'balance': 0}, where: 'id = ?', whereArgs: [saleId]);
      await txn.update('debts', {'status': 'VOID', 'balance': 0}, where: 'sale_id = ?', whereArgs: [saleId]);
      final name = sales.first['customer_name'] as String? ?? '';
      if (name.isNotEmpty && name != 'Walk-in') {
        await txn.rawUpdate('UPDATE customers SET spent = MAX(0, spent - ?) WHERE name = ?', [sales.first['total'], name]);
      }
    });
    await addNote(
      title: 'Risiti imefutwa',
      body: '${sales.first['invoice']} imefutwa. Bidhaa zimerudi kwenye stoo au matatizo.',
      kind: 'VOID:$saleId',
    );
    await bumpRevision();
    return null;
  }

  Future<Map<String, Object?>?> lookupImei(String imei) async {
    final term = imei.trim();
    final exact = await _lookupImei(term);
    if (exact != null) return exact;
    final digits = term.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty || digits == term) return null;
    return _lookupImei(digits);
  }

  Future<Map<String, Object?>?> _lookupImei(String term) async {
    if (term.isEmpty) return null;
    final sold = await db.rawQuery('''
      SELECT si.name, si.imei, si.warranty_months, si.warranty_days, s.created_at, s.customer_name, s.invoice
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.imei = ? AND s.voided = 0
      ORDER BY s.created_at DESC
      LIMIT 1
    ''', [term]);
    if (sold.isNotEmpty) return {'state': 'SOLD', ...sold.first};
    final stock = await db.query('phone_units', where: 'imei = ?', whereArgs: [term]);
    if (stock.isNotEmpty) return {'state': 'STOCK', ...stock.first};
    return null;
  }

  Future<void> recordMove({required String name, required int delta, required String reason, required String staff}) {
    return _move(db, name: name, delta: delta, reason: reason, staff: staff);
  }

  Future<List<Map<String, Object?>>> moves() => db.query('stock_moves', orderBy: 'created_at DESC');

  Future<List<Map<String, Object?>>> returns() => db.query('returns', orderBy: 'created_at DESC');

  Future<List<Map<String, Object?>>> returnItems() => db.query('return_items');

  Future<List<Map<String, Object?>>> faults() => db.query('faults', orderBy: 'created_at DESC');

  Future<List<Map<String, Object?>>> wings() => db.query('wings', orderBy: 'taken_at DESC');

  Future<List<Map<String, Object?>>> wingItems() => db.query('wing_items');

  Future<bool> hasNote(String kind) async {
    final rows = await db.query('notifications', columns: ['id'], where: 'kind = ?', whereArgs: [kind], limit: 1);
    return rows.isNotEmpty;
  }

  Future<String?> takeWing({
    required String person,
    required String phone,
    required String note,
    required String staff,
    required List<WingPick> picks,
  }) async {
    final name = _plain(person, 60);
    if (name.length < 2) return 'Weka jina la mtu aliyechukua.';
    final safePhone = phone.replaceAll(RegExp(r'\D'), '');
    if (safePhone.isNotEmpty && !isTzPhone(safePhone)) return 'Namba ianze na 0 na iwe tarakimu 10.';
    final chosen = picks.where((pick) => pick.qty > 0).toList();
    if (chosen.isEmpty) return 'Chagua bidhaa aliyochukua.';
    try {
      await db.transaction((txn) async {
        for (final pick in chosen) {
          if (pick.phoneId != null) {
            final rows = await txn.query('phone_units', where: 'id = ?', whereArgs: [pick.phoneId]);
            if (rows.isEmpty || rows.first['status'] != 'IN_STOCK') throw StateError('${pick.name} haiko dukani.');
          } else if (pick.productId != null) {
            final rows = await txn.query('products', where: 'id = ?', whereArgs: [pick.productId]);
            if (rows.isEmpty || asInt(rows.first['stock']) < pick.qty) throw StateError('Stoo ya ${pick.name} haitoshi.');
          } else {
            throw StateError('Bidhaa haipo.');
          }
        }
        final id = _id();
        final when = DateTime.now().toIso8601String();
        await txn.insert('wings', {
          'id': id,
          'person_name': name,
          'person_phone': safePhone,
          'note': _plain(note, 80),
          'status': 'OUT',
          'taken_at': when,
          'returned_at': '',
          'staff_name': _plain(staff, 40),
        });
        for (final pick in chosen) {
          await txn.insert('wing_items', {
            'id': _id(),
            'wing_id': id,
            'name': _plain(pick.name, 80),
            'qty': pick.qty,
            'product_id': pick.productId,
            'phone_id': pick.phoneId,
          });
          if (pick.phoneId != null) {
            await txn.update('phone_units', {'status': 'WING'}, where: 'id = ?', whereArgs: [pick.phoneId]);
          } else if (pick.productId != null) {
            await txn.rawUpdate('UPDATE products SET stock = stock - ? WHERE id = ?', [pick.qty, pick.productId]);
            await _move(txn, name: pick.name, delta: -pick.qty, reason: 'MAWINGA', staff: staff);
          }
        }
        await _note(txn, title: 'Mawinga', body: '$name amechukua bidhaa. ${_plain(staff, 40)}.', kind: 'WING:$id');
      });
      await bumpRevision();
      return null;
    } on StateError catch (error) {
      return error.message;
    }
  }

  Future<String?> returnWing(String wingId, {required String staff, required Map<String, int> qtyByItem}) async {
    final rows = await db.query('wings', where: 'id = ?', whereArgs: [wingId]);
    if (rows.isEmpty) return 'Rekodi haipo.';
    if (rows.first['status'] != 'OUT') return 'Bidhaa hizi zimesharudishwa.';
    final items = await db.query('wing_items', where: 'wing_id = ?', whereArgs: [wingId]);
    final chosen = <Map<String, Object?>>[];
    for (final item in items) {
      final want = qtyByItem['${item['id']}'] ?? 0;
      if (want <= 0) continue;
      final left = asInt(item['qty']) - asInt(item['returned_qty']);
      if (want > left) return '${item['name']} imezidi idadi iliyo nje.';
      chosen.add({...item, 'back': want});
    }
    if (chosen.isEmpty) return 'Chagua idadi anayorudisha.';
    final when = DateTime.now().toIso8601String();
    await db.transaction((txn) async {
      for (final item in chosen) {
        final want = item['back'] as int;
        final phoneId = '${item['phone_id'] ?? ''}';
        final productId = '${item['product_id'] ?? ''}';
        if (phoneId.isNotEmpty) {
          final units = await txn.query('phone_units', where: 'id = ?', whereArgs: [phoneId]);
          if (units.isNotEmpty && units.first['status'] != 'SOLD') {
            await txn.update('phone_units', {'status': 'IN_STOCK'}, where: 'id = ?', whereArgs: [phoneId]);
          }
        } else if (productId.isNotEmpty) {
          final products = await txn.query('products', where: 'id = ?', whereArgs: [productId]);
          final moveName = products.isEmpty ? '${item['name']}' : '${products.first['name']}';
          await txn.rawUpdate('UPDATE products SET stock = MIN(100000, stock + ?), active = 1 WHERE id = ?', [want, productId]);
          await _move(txn, name: moveName, delta: want, reason: 'MAWINGA', staff: staff);
        }
        await txn.rawUpdate('UPDATE wing_items SET returned_qty = returned_qty + ? WHERE id = ?', [want, item['id']]);
      }
      final fresh = await txn.query('wing_items', where: 'wing_id = ?', whereArgs: [wingId]);
      final still = fresh.where((row) => asInt(row['qty']) > asInt(row['returned_qty'])).toList();
      if (still.isEmpty) {
        await txn.update('wings', {'status': 'BACK', 'returned_at': when}, where: 'id = ?', whereArgs: [wingId]);
      }
      final came = chosen.map((item) => '${item['name']} x${item['back']}').join(', ');
      final leftNames = still.map((row) => '${row['name']} x${asInt(row['qty']) - asInt(row['returned_qty'])}').join(', ');
      final who = '${rows.first['person_name']}';
      final body = still.isEmpty
          ? '$who amerudisha $came. ${_plain(staff, 40)}.'
          : '$who amerudisha $came. Bado nje: $leftNames. ${_plain(staff, 40)}.';
      await _note(txn, title: 'Mawinga yamerudi', body: body, kind: 'WINGBACK:$wingId:$when');
    });
    await bumpRevision();
    return null;
  }

  Future<String?> dropReturnedWing(String wingId) async {
    final rows = await db.query('wings', where: 'id = ?', whereArgs: [wingId]);
    if (rows.isEmpty) return 'Rekodi haipo.';
    if (rows.first['status'] != 'BACK') return 'Rudisha kwanza, kisha uondoe.';
    await db.transaction((txn) async {
      await txn.delete('wing_items', where: 'wing_id = ?', whereArgs: [wingId]);
      await txn.delete('wings', where: 'id = ?', whereArgs: [wingId]);
    });
    await bumpRevision();
    return null;
  }

  Future<void> markReminded(String debtId) async {
    await db.update('debts', {'last_reminded': DateTime.now().toIso8601String()}, where: 'id = ?', whereArgs: [debtId]);
    await bumpRevision();
  }

  Future<ReturnOutcome> returnGoods({
    required String saleId,
    required String reason,
    required String actor,
    required List<ReturnPick> picks,
  }) async {
    final cleanReason = _plain(reason, 120);
    if (cleanReason.length < 3) return ReturnOutcome.error('Andika sababu ya kurudisha.');
    final chosen = picks.where((pick) => pick.qty > 0).toList();
    if (chosen.isEmpty) return ReturnOutcome.error('Chagua bidhaa ya kurudisha.');
    final sales = await db.query('sales', where: 'id = ?', whereArgs: [saleId]);
    if (sales.isEmpty) return ReturnOutcome.error('Risiti haipo.');
    final sale = sales.first;
    if (asInt(sale['voided']) == 1) return ReturnOutcome.error('Risiti hii imefutwa.');
    try {
      final outcome = await db.transaction((txn) async {
        final items = await txn.query('sale_items', where: 'sale_id = ?', whereArgs: [saleId]);
        final prior = await txn.rawQuery(
          'SELECT * FROM return_items WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id = ?)',
          [saleId],
        );
        final already = <String, int>{};
        final itemIds = items.map((row) => row['id']).toSet();
        for (final row in prior) {
          if (!itemIds.contains(row['sale_item_id'])) continue;
          final id = '${row['sale_item_id']}';
          already[id] = (already[id] ?? 0) + asInt(row['qty']);
        }
        final lines = <PaperPick>[];
        var total = 0.0;
        for (final pick in chosen) {
          final item = items.cast<Map<String, Object?>?>().firstWhere((row) => row?['id'] == pick.itemId, orElse: () => null);
          if (item == null) throw StateError('Bidhaa haipo kwenye risiti.');
          final left = asInt(item['qty']) - (already[pick.itemId] ?? 0);
          if (pick.qty > left) throw StateError('${item['name']} imezidi idadi iliyouzwa.');
          final phoneId = item['phone_id'] as String?;
          if (phoneId != null && phoneId.isNotEmpty) {
            final units = await txn.query('phone_units', where: 'id = ?', whereArgs: [phoneId]);
            if (units.isEmpty || units.first['status'] != 'SOLD') {
              throw StateError('${item['name']} haiwezi kurudi. Tayari haiko kama iliyouzwa.');
            }
          }
          final price = asDouble(item['price']);
          final cost = asDouble(item['cost']);
          total += price * pick.qty;
          lines.add(PaperPick(
            itemId: pick.itemId,
            name: '${item['name']}',
            qty: pick.qty,
            price: price,
            cost: cost,
            phoneId: phoneId,
            productId: item['product_id'] as String?,
            faultSale: asInt(item['faulty']) == 1,
          ));
        }
        final returnedBefore = asDouble(sale['returned']);
        final saleTotal = asDouble(sale['total']);
        final paid = asDouble(sale['paid']);
        final netGoods = max(0.0, saleTotal - returnedBefore - total);
        final owed = max(0.0, netGoods - paid);
        final refund = max(0.0, paid - netGoods);
        final countRows = await txn.rawQuery('SELECT COUNT(*) AS n FROM returns');
        final number = ((countRows.first['n'] as num?)?.toInt() ?? 0) + 1;
        final invoice = 'RTN-${DateTime.now().year}-${number.toString().padLeft(4, '0')}';
        final returnId = _id();
        final when = DateTime.now().toIso8601String();
        await txn.insert('returns', {
          'id': returnId,
          'sale_id': saleId,
          'invoice': invoice,
          'sale_invoice': sale['invoice'],
          'reason': cleanReason,
          'cashier_name': _plain(actor, 40),
          'total': total,
          'refund': refund,
          'created_at': when,
        });
        for (final line in lines) {
          await txn.insert('return_items', {
            'id': _id(),
            'return_id': returnId,
            'sale_item_id': line.itemId,
            'name': line.name,
            'qty': line.qty,
            'price': line.price,
            'cost': line.cost,
            'phone_id': line.phoneId,
            'faulty': chosen.any((pick) => pick.itemId == line.itemId && pick.faulty) ? 1 : 0,
          });
          final faulty = chosen.any((pick) => pick.itemId == line.itemId && pick.faulty);
          if (line.phoneId != null && line.phoneId!.isNotEmpty) {
            await txn.update('phone_units', {'status': faulty ? 'FAULTY' : 'IN_STOCK'}, where: 'id = ?', whereArgs: [line.phoneId]);
          } else if (line.productId != null && line.productId!.isNotEmpty) {
            if (faulty) {
              await txn.rawUpdate('UPDATE products SET fault_qty = MIN(100000, fault_qty + ?), active = 1 WHERE id = ?', [line.qty, line.productId]);
            } else {
              await txn.rawUpdate('UPDATE products SET stock = MIN(100000, stock + ?), active = 1 WHERE id = ?', [line.qty, line.productId]);
            }
          }
          if (faulty && !line.faultSale) {
            await _fault(
              txn,
              name: line.name,
              qty: line.qty,
              cost: line.cost,
              source: 'RUDI',
              productId: line.productId,
              phoneId: line.phoneId,
              staff: actor,
              note: cleanReason,
            );
          } else {
            await _move(txn, name: line.name, delta: line.qty, reason: 'RUDISHO', staff: actor);
          }
        }
        await txn.update('sales', {
          'returned': returnedBefore + total,
          'balance': owed,
        }, where: 'id = ?', whereArgs: [saleId]);
        final debts = await txn.query('debts', where: 'sale_id = ? AND status != ?', whereArgs: [saleId, 'VOID']);
        if (debts.isNotEmpty) {
          final full = returnedBefore + total >= saleTotal - 0.5;
          final status = owed <= 0.5 ? (full && paid <= 0.5 ? 'VOID' : 'PAID') : 'OPEN';
          await txn.update('debts', {'balance': owed, 'status': status}, where: 'id = ?', whereArgs: [debts.first['id']]);
        }
        final customer = '${sale['customer_name']}';
        final phone = '${sale['customer_phone']}';
        if (customer.isNotEmpty && customer != 'Walk-in') {
          if (phone.length >= 9) {
            await txn.rawUpdate('UPDATE customers SET spent = MAX(0, spent - ?) WHERE phone = ?', [total, phone]);
          } else {
            await txn.rawUpdate('UPDATE customers SET spent = MAX(0, spent - ?) WHERE name = ?', [total, customer]);
          }
        }
        await _note(
          txn,
          title: 'Mauzo yamerudishwa',
          body: '${sale['invoice']} · $cleanReason · TSH ${total.round()} · ${_plain(actor, 40)}.',
          kind: 'RETURN:$returnId',
        );
        return ReturnOutcome(
          invoice: invoice,
          saleInvoice: '${sale['invoice']}',
          total: total,
          refund: refund,
          debtLeft: owed,
          customer: customer,
          phone: phone,
          reason: cleanReason,
          lines: lines,
        );
      });
      await bumpRevision();
      return outcome;
    } on StateError catch (error) {
      return ReturnOutcome.error(error.message);
    }
  }

  Future<int> nextInvoiceNumber() async {
    final rows = await db.rawQuery('SELECT COUNT(*) AS n FROM sales');
    return ((rows.first['n'] as num?)?.toInt() ?? 0) + 1;
  }
}

class ReturnPick {
  const ReturnPick(this.itemId, this.qty, {this.faulty = false});
  final String itemId;
  final int qty;
  final bool faulty;
}

class WingPick {
  const WingPick({required this.name, required this.qty, this.productId, this.phoneId});
  final String name;
  final int qty;
  final String? productId;
  final String? phoneId;
}

class PaperPick {
  const PaperPick({
    required this.itemId,
    required this.name,
    required this.qty,
    required this.price,
    required this.cost,
    this.phoneId,
    this.productId,
    this.faultSale = false,
  });

  final String itemId;
  final String name;
  final int qty;
  final double price;
  final double cost;
  final String? phoneId;
  final String? productId;
  final bool faultSale;
}

class ReturnOutcome {
  ReturnOutcome({
    this.error,
    this.invoice = '',
    this.saleInvoice = '',
    this.total = 0,
    this.refund = 0,
    this.debtLeft = 0,
    this.customer = '',
    this.phone = '',
    this.reason = '',
    this.lines = const [],
  });

  ReturnOutcome.error(String message) : this(error: message);

  final String? error;
  final String invoice;
  final String saleInvoice;
  final double total;
  final double refund;
  final double debtLeft;
  final String customer;
  final String phone;
  final String reason;
  final List<PaperPick> lines;
}

class CartLine {
  CartLine({
    required this.name,
    required this.price,
    required this.cost,
    required this.qty,
    this.imei,
    this.phoneId,
    this.productId,
    this.warrantyMonths = 0,
    this.warrantyDays = 0,
    this.categoryName = '',
    this.faulty = false,
  }) : uid = _id();

  final String uid;
  final String name;
  double price;
  final double cost;
  int qty;
  final String? imei;
  final String? phoneId;
  final String? productId;
  final int warrantyMonths;
  final int warrantyDays;
  final String categoryName;
  final bool faulty;

  double get lineTotal => price * qty;
}

String _id() => '${DateTime.now().microsecondsSinceEpoch}${Random().nextInt(9999)}';

Map<String, Object?> _row(Map raw) {
  return raw.map((key, value) => MapEntry('$key', value as Object?));
}

String _slug(String name) {
  final slug = name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-|-$'), '');
  return slug.isEmpty ? _id() : slug;
}

Future<void> _touchCustomer(DatabaseExecutor txn, String name, String phone, double total) async {
  List<Map<String, Object?>> existing = [];
  if (phone.length >= 9) {
    existing = await txn.query('customers', where: 'phone = ?', whereArgs: [phone]);
  }
  if (existing.isEmpty) {
    existing = await txn.query('customers', where: 'name = ?', whereArgs: [name]);
  }
  if (existing.isEmpty) {
    await txn.insert('customers', {
      'id': _id(),
      'name': name,
      'phone': phone,
      'spent': total,
      'created_at': DateTime.now().toIso8601String(),
    });
    return;
  }
  final row = existing.first;
  final nextPhone = ((row['phone'] as String?) ?? '').isEmpty ? phone : row['phone'];
  await txn.update('customers', {
    'spent': (row['spent'] as num) + total,
    'phone': nextPhone,
    'name': name,
  }, where: 'id = ?', whereArgs: [row['id']]);
}

Future<void> _note(
  DatabaseExecutor exec, {
  required String title,
  required String body,
  required String kind,
  bool uniqueUnread = false,
}) async {
  if (uniqueUnread) {
    final existing = await exec.query('notifications', where: 'kind = ? AND read = 0', whereArgs: [kind]);
    if (existing.isNotEmpty) return;
  }
  await exec.insert('notifications', {
    'id': _id(),
    'title': title,
    'body': body,
    'kind': kind,
    'read': 0,
    'created_at': DateTime.now().toIso8601String(),
  });
}

Future<void> _create(Database db) async {
  await db.execute('CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT)');
  await db.execute('''
    CREATE TABLE categories(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'goods'
    )
  ''');
  await db.execute('''
    CREATE TABLE products(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      brand TEXT,
      price REAL NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL,
      barcode TEXT,
      reorder_level INTEGER NOT NULL DEFAULT 3,
      warranty_months INTEGER NOT NULL DEFAULT 0,
      warranty_days INTEGER NOT NULL DEFAULT 0,
      fault_qty INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      color TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      storage TEXT NOT NULL DEFAULT '',
      ram TEXT NOT NULL DEFAULT '',
      screen TEXT NOT NULL DEFAULT '',
      condition TEXT NOT NULL DEFAULT ''
    )
  ''');
  await db.execute('''
    CREATE TABLE phone_units(
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      imei TEXT NOT NULL UNIQUE,
      color TEXT,
      storage TEXT,
      ram TEXT NOT NULL DEFAULT '',
      screen TEXT NOT NULL DEFAULT '',
      condition TEXT,
      price REAL NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      floor_price REAL NOT NULL,
      status TEXT NOT NULL,
      warranty_months INTEGER NOT NULL,
      warranty_days INTEGER NOT NULL DEFAULT 0,
      category_id TEXT NOT NULL DEFAULT ''
    )
  ''');
  await db.execute('''
    CREATE TABLE customers(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      spent REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT ''
    )
  ''');
  await db.execute('''
    CREATE TABLE sales(
      id TEXT PRIMARY KEY,
      invoice TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL DEFAULT '',
      total REAL NOT NULL,
      paid REAL NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      change_due REAL NOT NULL,
      method TEXT NOT NULL,
      lipa_ref TEXT NOT NULL DEFAULT '',
      cashier_id TEXT NOT NULL DEFAULT '',
      cashier_name TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      voided INTEGER NOT NULL DEFAULT 0,
      returned REAL NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL,
      sync_error TEXT NOT NULL DEFAULT ''
    )
  ''');
  await db.execute('''
    CREATE TABLE sale_items(
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      imei TEXT,
      product_id TEXT,
      phone_id TEXT,
      warranty_months INTEGER NOT NULL DEFAULT 0,
      warranty_days INTEGER NOT NULL DEFAULT 0,
      category_name TEXT NOT NULL DEFAULT '',
      faulty INTEGER NOT NULL DEFAULT 0
    )
  ''');
  await db.execute('''
    CREATE TABLE staff(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      pin_salt TEXT NOT NULL DEFAULT '',
      pin_fails INTEGER NOT NULL DEFAULT 0,
      pin_locked_until TEXT NOT NULL DEFAULT '',
      perm_stock INTEGER NOT NULL DEFAULT 1,
      perm_cost INTEGER NOT NULL DEFAULT 0,
      perm_history INTEGER NOT NULL DEFAULT 0,
      perm_debts INTEGER NOT NULL DEFAULT 1,
      perm_customers INTEGER NOT NULL DEFAULT 1,
      perm_reports INTEGER NOT NULL DEFAULT 0,
      perm_edit INTEGER NOT NULL DEFAULT 0,
      perm_analysis INTEGER NOT NULL DEFAULT 0,
      photo TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE stock_moves(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      staff_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE debts(
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      principal REAL NOT NULL,
      balance REAL NOT NULL,
      opened_at TEXT NOT NULL,
      status TEXT NOT NULL,
      last_reminded TEXT NOT NULL DEFAULT '',
      due_at TEXT NOT NULL DEFAULT '',
      term_days INTEGER NOT NULL DEFAULT 0,
      term_unit TEXT NOT NULL DEFAULT ''
    )
  ''');
  await db.execute('''
    CREATE TABLE debt_payments(
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      note TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE returns(
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      invoice TEXT NOT NULL,
      sale_invoice TEXT NOT NULL,
      reason TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      total REAL NOT NULL,
      refund REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE return_items(
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      sale_item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      phone_id TEXT,
      faulty INTEGER NOT NULL DEFAULT 0
    )
  ''');
  await db.execute('''
    CREATE TABLE faults(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      source TEXT NOT NULL,
      product_id TEXT,
      phone_id TEXT,
      note TEXT NOT NULL DEFAULT '',
      staff_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE wings(
      id TEXT PRIMARY KEY,
      person_name TEXT NOT NULL,
      person_phone TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      returned_at TEXT NOT NULL DEFAULT '',
      staff_name TEXT NOT NULL DEFAULT ''
    )
  ''');
  await db.execute('''
    CREATE TABLE wing_items(
      id TEXT PRIMARY KEY,
      wing_id TEXT NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      returned_qty INTEGER NOT NULL DEFAULT 0,
      product_id TEXT,
      phone_id TEXT
    )
  ''');
  await db.execute('''
    CREATE TABLE notifications(
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      kind TEXT NOT NULL,
      read INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  ''');
}

Future<void> _upgrade(Database db) async {
  await _addColumn(db, 'products', 'cost', 'REAL NOT NULL DEFAULT 0');
  await _addColumn(db, 'products', 'reorder_level', 'INTEGER NOT NULL DEFAULT 3');
  await _addColumn(db, 'products', 'warranty_months', 'INTEGER NOT NULL DEFAULT 0');
  await _addColumn(db, 'products', 'active', 'INTEGER NOT NULL DEFAULT 1');
  await _addColumn(db, 'phone_units', 'cost', 'REAL NOT NULL DEFAULT 0');
  await _addColumn(db, 'customers', 'created_at', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'sales', 'customer_phone', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'sales', 'balance', 'REAL NOT NULL DEFAULT 0');
  await _addColumn(db, 'sales', 'lipa_ref', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'sales', 'cashier_id', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'sales', 'cashier_name', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'sales', 'summary', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'sales', 'voided', 'INTEGER NOT NULL DEFAULT 0');
  await _addColumn(db, 'sale_items', 'cost', 'REAL NOT NULL DEFAULT 0');
  await _addColumn(db, 'sale_items', 'product_id', 'TEXT');
  await _addColumn(db, 'sale_items', 'phone_id', 'TEXT');
  await _addColumn(db, 'sale_items', 'warranty_months', 'INTEGER NOT NULL DEFAULT 0');
  await db.execute('''
    CREATE TABLE IF NOT EXISTS staff(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      pin_salt TEXT NOT NULL DEFAULT '',
      pin_fails INTEGER NOT NULL DEFAULT 0,
      pin_locked_until TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE IF NOT EXISTS debts(
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      principal REAL NOT NULL,
      balance REAL NOT NULL,
      opened_at TEXT NOT NULL,
      status TEXT NOT NULL,
      last_reminded TEXT NOT NULL DEFAULT ''
    )
  ''');
  await db.execute('''
    CREATE TABLE IF NOT EXISTS debt_payments(
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      note TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE IF NOT EXISTS notifications(
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      kind TEXT NOT NULL,
      read INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  ''');
  final people = await db.rawQuery('SELECT COUNT(*) AS n FROM staff');
  if (((people.first['n'] as num?)?.toInt() ?? 0) == 0) {
    final pin = await db.query('meta', where: 'key = ?', whereArgs: ['owner_pin']);
    final name = await db.query('meta', where: 'key = ?', whereArgs: ['owner_name']);
    if (pin.isNotEmpty) {
      await db.insert('staff', {
        'id': 'owner',
        'name': name.isEmpty ? 'Mmiliki' : name.first['value'],
        'role': 'OWNER',
        'pin_hash': pin.first['value'],
        'active': 1,
        'created_at': DateTime.now().toIso8601String(),
      });
    }
  }
  final shop = await db.query('meta', where: 'key = ?', whereArgs: ['shop_name']);
  if (shop.isEmpty) await db.insert('meta', {'key': 'shop_name', 'value': 'PhoneVault'});
  await db.rawUpdate(
    "UPDATE products SET cost = ROUND(price * 0.7) WHERE id IN ('chg','air','bank','case','glass','cable') AND cost = 0",
  );
  await db.rawUpdate('UPDATE phone_units SET cost = floor_price WHERE cost = 0');
  const names = {
    'phones': 'Simu',
    'chargers': 'Chaja',
    'audio': 'Sauti',
    'power': 'Power bank',
    'covers': 'Cover',
    'glass': 'Kinga',
    'cables': 'Kebo',
  };
  for (final entry in names.entries) {
    await db.update('categories', {'name': entry.value}, where: 'id = ?', whereArgs: [entry.key]);
  }
}

Future<void> _fault(
  DatabaseExecutor db, {
  required String name,
  required int qty,
  required double cost,
  required String source,
  String? productId,
  String? phoneId,
  required String staff,
  required String note,
}) async {
  if (qty == 0) return;
  await db.insert('faults', {
    'id': _id(),
    'name': _plain(name, 80),
    'qty': qty,
    'cost': cost,
    'source': source,
    'product_id': productId,
    'phone_id': phoneId,
    'note': _plain(note, 120),
    'staff_name': _plain(staff, 40),
    'created_at': DateTime.now().toIso8601String(),
  });
}

Future<void> _upgradeBooks(Database db) async {
  await _addColumn(db, 'products', 'warranty_days', 'INTEGER NOT NULL DEFAULT 0');
  await _addColumn(db, 'products', 'fault_qty', 'INTEGER NOT NULL DEFAULT 0');
  await _addColumn(db, 'phone_units', 'warranty_days', 'INTEGER NOT NULL DEFAULT 0');
  await _addColumn(db, 'sale_items', 'warranty_days', 'INTEGER NOT NULL DEFAULT 0');
  await _addColumn(db, 'debts', 'due_at', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'debts', 'term_days', 'INTEGER NOT NULL DEFAULT 0');
  await _addColumn(db, 'debts', 'term_unit', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'return_items', 'faulty', 'INTEGER NOT NULL DEFAULT 0');
  await db.execute('''
    CREATE TABLE IF NOT EXISTS faults(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      source TEXT NOT NULL,
      product_id TEXT,
      phone_id TEXT,
      note TEXT NOT NULL DEFAULT '',
      staff_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE IF NOT EXISTS wings(
      id TEXT PRIMARY KEY,
      person_name TEXT NOT NULL,
      person_phone TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      returned_at TEXT NOT NULL DEFAULT '',
      staff_name TEXT NOT NULL DEFAULT ''
    )
  ''');
  await db.execute('''
    CREATE TABLE IF NOT EXISTS wing_items(
      id TEXT PRIMARY KEY,
      wing_id TEXT NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      returned_qty INTEGER NOT NULL DEFAULT 0,
      product_id TEXT,
      phone_id TEXT
    )
  ''');
  await db.rawUpdate('UPDATE products SET warranty_days = warranty_months * 30 WHERE warranty_days = 0 AND warranty_months > 0');
  await db.rawUpdate('UPDATE phone_units SET warranty_days = warranty_months * 30 WHERE warranty_days = 0 AND warranty_months > 0');
  await db.rawUpdate('UPDATE sale_items SET warranty_days = warranty_months * 30 WHERE warranty_days = 0 AND warranty_months > 0');
}

Future<void> _move(DatabaseExecutor db, {required String name, required int delta, required String reason, required String staff}) async {
  if (delta == 0) return;
  await db.insert('stock_moves', {
    'id': _id(),
    'name': name,
    'delta': delta,
    'reason': reason,
    'note': '',
    'staff_name': staff,
    'created_at': DateTime.now().toIso8601String(),
  });
}

Future<void> _upgradeShop(Database db) async {
  await _addColumn(db, 'sale_items', 'category_name', "TEXT NOT NULL DEFAULT ''");
  const perms = {
    'perm_stock': 'INTEGER NOT NULL DEFAULT 1',
    'perm_cost': 'INTEGER NOT NULL DEFAULT 0',
    'perm_history': 'INTEGER NOT NULL DEFAULT 0',
    'perm_debts': 'INTEGER NOT NULL DEFAULT 1',
    'perm_customers': 'INTEGER NOT NULL DEFAULT 1',
    'perm_reports': 'INTEGER NOT NULL DEFAULT 0',
    'perm_edit': 'INTEGER NOT NULL DEFAULT 0',
    'perm_analysis': 'INTEGER NOT NULL DEFAULT 0',
  };
  for (final entry in perms.entries) {
    await _addColumn(db, 'staff', entry.key, entry.value);
  }
  await db.execute('''
    CREATE TABLE IF NOT EXISTS stock_moves(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      staff_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  ''');
  const extra = [
    ['stands', 'Stand za camera'],
    ['holders', 'Holder'],
    ['tripods', 'Tripod'],
    ['memory', 'Kadi'],
    ['speakers', 'Spika'],
  ];
  for (final row in extra) {
    final existing = await db.query('categories', where: 'id = ?', whereArgs: [row[0]]);
    if (existing.isEmpty) await db.insert('categories', {'id': row[0], 'name': row[1], 'slug': row[0]});
  }
}

Future<void> _upgradeSync(Database db) async {
  await _addColumn(db, 'sales', 'sync_error', "TEXT NOT NULL DEFAULT ''");
}

Future<void> _upgradeVariant(Database db) async {
  await _addColumn(db, 'products', 'color', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'products', 'size', "TEXT NOT NULL DEFAULT ''");
}

Future<void> _upgradeFaces(Database db) async {
  await _addColumn(db, 'staff', 'photo', "TEXT NOT NULL DEFAULT ''");
}

Future<void> _upgradeKinds(Database db) async {
  await _addColumn(db, 'categories', 'kind', "TEXT NOT NULL DEFAULT 'goods'");
  await db.update('categories', {'kind': 'phone'}, where: 'id = ?', whereArgs: ['phones']);
  await _addColumn(db, 'phone_units', 'category_id', "TEXT NOT NULL DEFAULT ''");
  final now = DateTime.now().toUtc().toIso8601String();
  for (final key in ['shop_name', 'shop_location', 'shop_phone', 'receipt_footer', 'lipa_namba', 'shop_logo']) {
    final rows = await db.query('meta', where: 'key = ?', whereArgs: [key]);
    if (rows.isEmpty) continue;
    await db.insert('meta', {'key': '${key}__at', 'value': now}, conflictAlgorithm: ConflictAlgorithm.replace);
  }
}

bool _keepMeta(String key) {
  return key != 'device_id' && key != 'cloud_url' && key != 'sync_token' && key != 'cloud_url__at' && key != 'sync_token__at';
}

Future<void> _upgradeReturns(Database db) async {
  await _addColumn(db, 'sales', 'returned', 'REAL NOT NULL DEFAULT 0');
  await _addColumn(db, 'debts', 'last_reminded', "TEXT NOT NULL DEFAULT ''");
  await db.execute('''
    CREATE TABLE IF NOT EXISTS returns(
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      invoice TEXT NOT NULL,
      sale_invoice TEXT NOT NULL,
      reason TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      total REAL NOT NULL,
      refund REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  ''');
  await db.execute('''
    CREATE TABLE IF NOT EXISTS return_items(
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      sale_item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      phone_id TEXT
    )
  ''');
}

Future<void> _upgradeSecurity(Database db) async {
  await _addColumn(db, 'staff', 'pin_salt', "TEXT NOT NULL DEFAULT ''");
  await _addColumn(db, 'staff', 'pin_fails', 'INTEGER NOT NULL DEFAULT 0');
  await _addColumn(db, 'staff', 'pin_locked_until', "TEXT NOT NULL DEFAULT ''");
  await db.delete('meta', where: 'key = ?', whereArgs: ['owner_pin']);
}

String _stretchPin(String pin, String salt) {
  var digest = sha256.convert(utf8.encode('$salt:$pin'));
  for (var i = 1; i < 12000; i++) {
    digest = sha256.convert(digest.bytes);
  }
  return digest.toString();
}

String _plain(String value, int max) {
  final clean = value.replaceAll(RegExp(r'[\u0000-\u001F]'), ' ').trim();
  if (clean.length <= max) return clean;
  return clean.substring(0, max);
}

String? _moneyOk(double price, double cost) {
  if (price <= 0 || price > 100000000) return 'Bei si sahihi.';
  if (cost < 0 || cost > 100000000) return 'Gharama si sahihi.';
  return null;
}

Future<void> _speedIndexes(Database db) async {
  const lines = [
    'CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_sale_items_imei ON sale_items(imei)',
    'CREATE INDEX IF NOT EXISTS idx_debts_sale ON debts(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status)',
    'CREATE INDEX IF NOT EXISTS idx_payments_debt ON debt_payments(debt_id)',
    'CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_return_items_item ON return_items(sale_item_id)',
    'CREATE INDEX IF NOT EXISTS idx_phones_imei ON phone_units(imei)',
    'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
    'CREATE INDEX IF NOT EXISTS idx_moves_created ON stock_moves(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_wings_status ON wings(status)',
  ];
  for (final line in lines) {
    try {
      await db.execute(line);
    } catch (_) {}
  }
}

Future<void> _addColumn(Database db, String table, String column, String definition) async {
  final info = await db.rawQuery('PRAGMA table_info($table)');
  if (info.any((row) => row['name'] == column)) return;
  await db.execute('ALTER TABLE $table ADD COLUMN $column $definition');
}

Future<void> _seed(Database db) async {
  const categories = [
    ['phones', 'Simu', 'phones'],
    ['chargers', 'Chaja', 'chargers'],
    ['audio', 'Sauti', 'audio'],
    ['power', 'Power bank', 'power-banks'],
    ['covers', 'Cover', 'covers'],
    ['glass', 'Kinga', 'glass'],
    ['cables', 'Kebo', 'cables'],
    ['stands', 'Stand za camera', 'stands'],
    ['holders', 'Holder', 'holders'],
    ['tripods', 'Tripod', 'tripods'],
    ['memory', 'Kadi', 'memory'],
    ['speakers', 'Spika', 'speakers'],
  ];
  for (final row in categories) {
    await db.insert('categories', {'id': row[0], 'name': row[1], 'slug': row[2], 'kind': row[0] == 'phones' ? 'phone' : 'goods'});
  }

  await db.insert('meta', {'key': 'shop_name', 'value': 'PhoneVault'});
}
