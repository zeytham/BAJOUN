import 'package:flutter/material.dart';

import '../lang.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import 'alerts_page.dart';
import 'analysis_page.dart';
import 'customers_page.dart';
import 'faults_page.dart';
import 'history_page.dart';
import 'reports_page.dart';
import 'settings_page.dart';
import 'warranty_page.dart';
import 'wings_page.dart';

class MorePage extends StatelessWidget {
  const MorePage({super.key, required this.store, required this.onLock, this.onBack});
  final ShopStore store;
  final VoidCallback onLock;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final items = <(IconData, String, Widget)>[
          (Icons.receipt_long, tx('Historia', 'History'), HistoryPage(store: store)),
          (Icons.outbound, tx('Mawinga', 'Out'), WingsPage(store: store)),
          (Icons.report_gmailerrorred_outlined, tx('Matatizo', 'Faults'), FaultsPage(store: store)),
          if (store.seeAnalysis) (Icons.insights, tx('Uchambuzi', 'Analysis'), AnalysisPage(store: store)),
          if (store.seeReports) (Icons.bar_chart, tx('Ripoti', 'Reports'), ReportsPage(store: store)),
          if (store.seeCustomers) (Icons.people_alt_outlined, tx('Wateja', 'Customers'), CustomersPage(store: store)),
          (Icons.notifications_none, tx('Taarifa', 'Alerts'), AlertsPage(store: store)),
          (Icons.verified_outlined, t('Warranty'), WarrantyPage(store: store)),
          (Icons.settings_outlined, tx('Mipangilio', 'Settings'), SettingsPage(store: store, onLock: onLock)),
        ];
        return Scaffold(
          backgroundColor: skyPage,
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Row(
                children: [
                  if (onBack != null) IconButton(tooltip: t('Rudi'), onPressed: onBack, icon: const Icon(Icons.arrow_back, color: ink)),
                  Expanded(child: Text(tx('Zaidi', 'More'), style: titleStyle)),
                ],
              ),
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
                          trailing: item.$2 == tx('Taarifa', 'Alerts') && store.unread > 0
                          ? CircleAvatar(radius: 12, backgroundColor: skyDeep, child: Text('${store.unread}', style: const TextStyle(color: Colors.white, fontSize: 11)))
                          : const Icon(Icons.chevron_right, color: muted),
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              FilledButton.tonal(onPressed: onLock, child: Text(tx('Funga na toka', 'Lock and leave'))),
            ],
          ),
        );
      },
    );
  }
}
