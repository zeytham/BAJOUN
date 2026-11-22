import 'package:flutter/material.dart';
import 'package:flutter_contacts/flutter_contacts.dart';

import '../lang.dart';
import '../money.dart';
import '../theme.dart';

String? tzFromContact(String raw) {
  var digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('255') && digits.length >= 12) {
    digits = '0${digits.substring(3, 12)}';
  } else if (digits.length == 9 && (digits.startsWith('6') || digits.startsWith('7'))) {
    digits = '0$digits';
  } else if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.substring(0, 10);
  }
  return isTzPhone(digits) ? digits : null;
}

Future<String?> fillFromContacts(BuildContext context, TextEditingController phone, {TextEditingController? name}) async {
  final granted = await FlutterContacts.requestPermission(readonly: true);
  if (!context.mounted) return null;
  if (!granted) return 'Ruhusa ya contacts haijatolewa.';
  final picked = await showModalBottomSheet<({String name, String phone})>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => const _ContactSheet(),
  );
  if (picked == null || !context.mounted) return null;
  final number = tzFromContact(picked.phone);
  if (number == null) return 'Namba haiko sahihi.';
  phone.text = number;
  if (name != null && name.text.trim().isEmpty && picked.name.trim().isNotEmpty) {
    name.text = picked.name.trim();
  }
  return null;
}

class _ContactSheet extends StatefulWidget {
  const _ContactSheet();

  @override
  State<_ContactSheet> createState() => _ContactSheetState();
}

class _ContactSheetState extends State<_ContactSheet> {
  final _search = TextEditingController();
  List<Contact> _rows = [];
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _load();
    _search.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final rows = await FlutterContacts.getContacts(withProperties: true);
    if (!mounted) return;
    rows.sort((a, b) => a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase()));
    setState(() {
      _rows = rows;
      _ready = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text.trim().toLowerCase();
    final shown = <({String name, String phone})>[];
    for (final contact in _rows) {
      final name = contact.displayName.trim();
      for (final item in contact.phones) {
        final blob = '$name ${item.number}'.toLowerCase();
        if (query.isNotEmpty && !blob.contains(query)) continue;
        shown.add((name: name, phone: item.number));
      }
    }
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 12, bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.72,
        child: Column(
          children: [
            Text(t('Chagua contact'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: ink)),
            const SizedBox(height: 10),
            TextField(
              controller: _search,
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: t('Tafuta jina au namba'), counterText: ''),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: !_ready
                  ? const Center(child: CircularProgressIndicator(color: skyDeep))
                  : shown.isEmpty
                      ? Center(child: Text(t('Hakuna contact.'), style: captionStyle))
                      : ListView.builder(
                          itemCount: shown.length,
                          itemBuilder: (context, index) {
                            final row = shown[index];
                            return ListTile(
                              leading: const Icon(Icons.person_outline, color: skyDeep),
                              title: Text(row.name.isEmpty ? row.phone : row.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                              subtitle: Text(row.phone, maxLines: 1, overflow: TextOverflow.ellipsis),
                              onTap: () => Navigator.pop(context, row),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
