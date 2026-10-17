import 'package:flutter/material.dart';

import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'alerts_page.dart';
import 'analysis_page.dart';
import 'customers_page.dart';
import 'history_page.dart';
import 'reports_page.dart';
import 'settings_page.dart';
import 'warranty_page.dart';

class MorePage extends StatelessWidget {
  const MorePage({super.key, required this.store, required this.onLock});
  final ShopStore store;
  final VoidCallback onLock;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final items = <(IconData, String, Widget)>[
          (Icons.receipt_long, 'Historia', HistoryPage(store: store)),
          if (store.seeAnalysis) (Icons.insights, 'Uchambuzi', AnalysisPage(store: store)),
          if (store.seeReports) (Icons.bar_chart, 'Ripoti', ReportsPage(store: store)),
          if (store.seeCustomers) (Icons.people_alt_outlined, 'Wateja', CustomersPage(store: store)),
          (Icons.notifications_none, 'Taarifa', AlertsPage(store: store)),
          (Icons.verified_outlined, 'Warranty', WarrantyPage(store: store)),
          (Icons.settings_outlined, 'Mipangilio', SettingsPage(store: store, onLock: onLock)),
        ];
        return Scaffold(
          backgroundColor: skyPage,
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              const Text('Zaidi', style: titleStyle),
              const SizedBox(height: 12),
              for (final item in items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: TapScale(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => item.$3)),
                    radius: 16,
                    child: ListTile(
                      leading: Icon(item.$1, color: skyDeep, size: 22),
                      title: Text(item.$2, style: sectionStyle),
                      trailing: item.$2 == 'Taarifa' && store.unread > 0
                          ? CircleAvatar(radius: 12, backgroundColor: skyDeep, child: Text('${store.unread}', style: const TextStyle(color: Colors.white, fontSize: 11)))
                          : const Icon(Icons.chevron_right, color: muted),
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              FilledButton.tonal(onPressed: onLock, child: const Text('Funga na toka')),
            ],
          ),
        );
      },
    );
  }
}
