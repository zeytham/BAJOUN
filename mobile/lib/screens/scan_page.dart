import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../theme.dart';
import '../widgets/ui.dart';

class ScanPage extends StatefulWidget {
  const ScanPage({super.key});

  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  final _manual = TextEditingController();
  final _camera = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates);
  bool _done = false;

  @override
  void dispose() {
    _manual.dispose();
    _camera.dispose();
    super.dispose();
  }

  void _finish(String code) {
    final clean = code.trim();
    if (_done || clean.isEmpty) return;
    _done = true;
    Navigator.pop(context, clean);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ink,
      appBar: AppBar(
        backgroundColor: ink,
        foregroundColor: Colors.white,
        title: const Text('Skani msimbo', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
              child: MobileScanner(
                controller: _camera,
                onDetect: (capture) {
                  final code = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
                  if (code != null) _finish(code);
                },
                errorBuilder: (context, error, child) => const ColoredBox(
                  color: ink,
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'Kamera haipatikani kwenye kifaa hiki. Andika IMEI au barcode hapa chini.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white, height: 1.4),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Container(
            width: double.infinity,
            color: skyPage,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Au andika msimbo', style: sectionStyle),
                const SizedBox(height: 8),
                SoftField(controller: _manual, label: 'IMEI au barcode', maxLength: 32),
                const SizedBox(height: 10),
                FilledButton(onPressed: () => _finish(_manual.text), child: const Text('Ongeza kwenye kikapu')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
