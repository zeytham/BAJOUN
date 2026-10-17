import 'package:flutter/material.dart';

import '../money.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class AlertsPage extends StatelessWidget {
  const AlertsPage({super.key, required this.store});
  final ShopStore store;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(
            title: const Text('Taarifa', style: TextStyle(fontWeight: FontWeight.w600)),
            actions: [
              if (store.unread > 0)
                TextButton(onPressed: store.markAllRead, child: const Text('Soma zote')),
            ],
          ),
          body: store.visibleNotes.isEmpty
              ? const EmptyHint(text: 'Hakuna taarifa.')
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    for (final note in store.visibleNotes)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(18),
                            onTap: () => _open(context, store, note),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(_icon('${note['kind']}'), color: skyDeep),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${note['title']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                                        Text('${note['body']}', style: const TextStyle(color: muted)),
                                        Text(formatWhen('${note['created_at']}'), style: const TextStyle(color: muted, fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                  if (asInt(note['read']) == 0)
                                    const Padding(
                                      padding: EdgeInsets.only(top: 6),
                                      child: CircleAvatar(radius: 5, backgroundColor: skyDeep),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
        );
      },
    );
  }

  Future<void> _open(BuildContext context, ShopStore store, Map<String, Object?> note) async {
    await store.markRead('${note['id']}');
    if (!context.mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${note['title']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(formatWhen('${note['created_at']}'), style: captionStyle),
            const SizedBox(height: 12),
            Text('${note['body']}', style: bodyStyle),
          ],
        ),
        actions: [
          FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Sawa')),
        ],
      ),
    );
  }

  IconData _icon(String kind) {
    if (kind.startsWith('LOW')) return Icons.inventory_2_outlined;
    if (kind.startsWith('DEBT') || kind.startsWith('PAY')) return Icons.account_balance_wallet_outlined;
    if (kind.startsWith('STAFF')) return Icons.badge_outlined;
    if (kind.startsWith('VOID')) return Icons.undo;
    return Icons.receipt_long;
  }
}
