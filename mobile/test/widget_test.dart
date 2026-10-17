import 'package:flutter_test/flutter_test.dart';
import 'package:phonevault/main.dart';

void main() {
  testWidgets('PhoneVault boots', (tester) async {
    await tester.pumpWidget(const PhoneVaultApp());
    expect(find.text('PhoneVault'), findsOneWidget);
  });
}
