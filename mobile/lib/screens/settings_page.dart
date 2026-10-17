import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../money.dart';
import '../pictures.dart';
import '../shop_store.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key, required this.store, required this.onLock});
  final ShopStore store;
  final VoidCallback onLock;

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late final TextEditingController _shop;
  late final TextEditingController _lipa;
  late final TextEditingController _computer;
  late final TextEditingController _location;
  late final TextEditingController _shopPhone;
  late final TextEditingController _footer;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _shop = TextEditingController(text: widget.store.shopName);
    _lipa = TextEditingController(text: widget.store.lipaNumber);
    _computer = TextEditingController(text: _computerLabel(widget.store.cloudUrl));
    _location = TextEditingController(text: widget.store.shopLocation);
    _shopPhone = TextEditingController(text: showPhone(widget.store.shopPhone));
    _footer = TextEditingController(text: widget.store.receiptFooter);
  }

  @override
  void dispose() {
    _shop.dispose();
    _lipa.dispose();
    _computer.dispose();
    _location.dispose();
    _shopPhone.dispose();
    _footer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: const Text('Mipangilio', style: TextStyle(fontWeight: FontWeight.w600))),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              _card([
                const Text('Duka', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                const SizedBox(height: 10),
                _logoPlate(store),
                if (store.isOwner) ...[
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: _busy ? null : _pickLogo,
                    child: Text(store.shopLogo == null ? 'Weka logo' : 'Badilisha logo'),
                  ),
                  if (store.shopLogo != null)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(onPressed: _busy ? null : _clearLogo, child: const Text('Ondoa logo')),
                    ),
                ],
                const SizedBox(height: 8),
                SoftField(controller: _shop, label: 'Jina la duka', readOnly: !store.isOwner, maxLength: 40),
                const SizedBox(height: 8),
                SoftField(controller: _location, label: 'Mahali / mtaa', readOnly: !store.isOwner, maxLength: 80),
                const SizedBox(height: 8),
                SoftField(controller: _shopPhone, label: 'Simu ya duka', readOnly: !store.isOwner, phone: true, keyboard: TextInputType.phone),
                const SizedBox(height: 8),
                SoftField(controller: _footer, label: 'Ujumbe wa chini ya risiti', readOnly: !store.isOwner, maxLength: 160),
                const SizedBox(height: 8),
                SoftField(
                  controller: _lipa,
                  label: 'Lipa Namba',
                  keyboard: TextInputType.number,
                  readOnly: !store.isOwner,
                  digitsOnly: true,
                  maxLength: 15,
                  minDigits: 5,
                  rule: 'Lipa Namba iwe tarakimu 5 hadi 15.',
                ),
                if (store.isOwner) ...[
                  const SizedBox(height: 8),
                  SoftField(controller: _computer, label: 'Kompyuta ya duka', maxLength: 80),
                ],
                if (store.isOwner) ...[
                  const SizedBox(height: 8),
                  FilledButton(onPressed: _busy ? null : _saveShop, child: const Text('Hifadhi')),
                ],
              ]),
              const SizedBox(height: 12),
              _card([
                const Text('Akaunti', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    FaceBubble(name: store.session?.name ?? '', bytes: store.myPhoto, radius: 30),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${store.session?.name}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: ink)),
                          Text(roleLabel(store.session?.role), style: captionStyle),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _busy ? null : _pickPhoto,
                  child: Text(store.myPhoto == null ? 'Weka picha yangu' : 'Badilisha picha yangu'),
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(
                    spacing: 4,
                    children: [
                      if (store.myPhoto != null) TextButton(onPressed: _busy ? null : _clearPhoto, child: const Text('Ondoa picha')),
                      TextButton(onPressed: _changePin, child: const Text('Badilisha PIN')),
                    ],
                  ),
                ),
              ]),
              if (store.isOwner) ...[
                const SizedBox(height: 12),
                _card([
                  Row(
                    children: [
                      const Expanded(child: Text('Wafanyakazi', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
                      TextButton(onPressed: _addEmployee, child: const Text('Ongeza')),
                    ],
                  ),
                  for (final person in store.staff)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FCFF),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          FaceBubble(
                            name: '${person['name']}',
                            bytes: photoBytes(person['photo']),
                            radius: 18,
                            color: sky,
                            letterColor: skyDeep,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${person['name']}', style: const TextStyle(fontWeight: FontWeight.w600, color: ink)),
                                Text(roleLabel('${person['role']}'), style: captionStyle),
                              ],
                            ),
                          ),
                          if (person['role'] != 'OWNER') ...[
                            Switch(
                              value: asInt(person['active']) == 1,
                              onChanged: (value) async {
                                if (!await _ownerGate()) return;
                                final error = await store.setEmployeeActive('${person['id']}', value);
                                if (error != null && context.mounted) toast(context, error);
                              },
                            ),
                            IconButton(
                              tooltip: 'Ruhusa',
                              onPressed: () => _access(person),
                              icon: const Icon(Icons.tune, color: skyDeep),
                            ),
                          ],
                        ],
                      ),
                    ),
                ]),
              ],
              const SizedBox(height: 16),
              FilledButton.tonal(
                onPressed: widget.onLock,
                child: const Text('Funga duka'),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _logoPlate(ShopStore store) {
    final logo = store.shopLogo;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(color: skyDeep, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Container(
            width: 68,
            height: 68,
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child: logo == null
                ? const Icon(Icons.add_photo_alternate_outlined, color: skyDeep)
                : Image.memory(logo, fit: BoxFit.contain, filterQuality: FilterQuality.high, gaplessPlayback: true),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(store.shopName, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 2),
                const Text('Inakaa juu ya risiti', style: TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<Uint8List?> _pickImage() async {
    widget.store.holdLock = true;
    try {
      final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 2000, imageQuality: 95);
      if (file == null) return null;
      return await file.readAsBytes();
    } catch (_) {
      if (mounted) toast(context, 'Picha haikufunguka.');
      return null;
    } finally {
      widget.store.holdLock = false;
    }
  }

  Future<void> _pickLogo() async {
    final bytes = await _pickImage();
    if (bytes == null || !mounted) return;
    setState(() => _busy = true);
    final error = await widget.store.saveShopLogo(bytes);
    if (!mounted) return;
    setState(() => _busy = false);
    toast(context, error ?? 'Logo iko juu ya risiti.');
  }

  Future<void> _clearLogo() async {
    setState(() => _busy = true);
    final error = await widget.store.saveShopLogo(null);
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) toast(context, error);
  }

  Future<void> _pickPhoto() async {
    final bytes = await _pickImage();
    if (bytes == null || !mounted) return;
    setState(() => _busy = true);
    final error = await widget.store.saveMyPhoto(bytes);
    if (!mounted) return;
    setState(() => _busy = false);
    toast(context, error ?? 'Picha yako iko kwenye dashibodi.');
  }

  Future<void> _clearPhoto() async {
    setState(() => _busy = true);
    final error = await widget.store.saveMyPhoto(null);
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) toast(context, error);
  }

  Widget _card(List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: vaultCard(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
    );
  }

  Future<bool> _ownerGate() async {
    final pin = await showDialog<String>(
      context: context,
      builder: (context) => const FieldDialog(
        title: 'Thibitisha PIN',
        confirm: 'Endelea',
        fields: [DialogField('PIN ya mmiliki', number: true, obscure: true, maxLength: 4)],
      ),
    );
    if (pin == null || !mounted) return false;
    final error = await widget.store.confirmOwnerPin(pin);
    if (!mounted) return false;
    if (error != null) {
      toast(context, error);
      if (error.startsWith('Majaribio')) widget.onLock();
      return false;
    }
    return true;
  }

  String _computerLabel(String url) {
    final uri = Uri.tryParse(url.trim());
    if (uri == null || uri.host.isEmpty) return '';
    final port = uri.hasPort ? ':${uri.port}' : '';
    return '${uri.host}$port';
  }

  Future<void> _saveShop() async {
    if (!await _ownerGate()) return;
    setState(() => _busy = true);
    final error = await widget.store.saveShop(
      _shop.text,
      _lipa.text,
      location: _location.text,
      shopPhone: _shopPhone.text,
      footer: _footer.text,
    );
    final computerError = error == null ? await widget.store.saveShopComputer(_computer.text) : null;
    if (!mounted) return;
    setState(() => _busy = false);
    toast(context, error ?? computerError ?? 'Duka limehifadhiwa');
  }

  Future<void> _changePin() async {
    final values = await showDialog<List<String>>(
      context: context,
      builder: (context) => const FieldDialog(
        title: 'PIN mpya',
        confirm: 'Hifadhi',
        fields: [
          DialogField('PIN ya sasa', number: true, obscure: true, maxLength: 4),
          DialogField('PIN mpya', number: true, obscure: true, maxLength: 4),
          DialogField('Rudia PIN', number: true, obscure: true, maxLength: 4),
        ],
      ),
    );
    if (values == null || !mounted) return;
    if (values[1] != values[2]) {
      toast(context, 'PIN hazifanani.');
      return;
    }
    final error = await widget.store.changeOwnPin(values[0], values[1]);
    if (!mounted) return;
    toast(context, error ?? 'PIN imebadilika');
    if (error != null && error.startsWith('Majaribio')) widget.onLock();
  }

  Future<void> _addEmployee() async {
    if (!await _ownerGate() || !mounted) return;
    final values = await showDialog<List<String>>(
      context: context,
      builder: (context) => const FieldDialog(
        title: 'Muuzaji mpya',
        confirm: 'Ongeza',
        fields: [
          DialogField('Jina', maxLength: 40),
          DialogField('PIN ya tarakimu 4', number: true, obscure: true, maxLength: 4),
        ],
      ),
    );
    if (values == null || !mounted) return;
    final error = await widget.store.addEmployee(values[0], values[1]);
    if (mounted) toast(context, error ?? '${values[0].trim()} anaweza kuingia sasa');
  }

  Future<void> _access(Map<String, Object?> person) async {
    if (!await _ownerGate() || !mounted) return;
    var stock = asInt(person['perm_stock']) != 0;
    var cost = asInt(person['perm_cost']) == 1;
    var history = asInt(person['perm_history']) == 1;
    var debts = asInt(person['perm_debts']) != 0;
    var customers = asInt(person['perm_customers']) != 0;
    var reports = asInt(person['perm_reports']) == 1;
    var edit = asInt(person['perm_edit']) == 1;
    var analysis = asInt(person['perm_analysis']) == 1;
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheet) {
          SwitchListTile tile(String title, bool value, ValueChanged<bool> onChanged) {
            return SwitchListTile(title: Text(title), value: value, onChanged: (next) => setSheet(() => onChanged(next)));
          }

          return SafeArea(
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(8, 12, 8, 16),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                  child: Text('${person['name']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                ),
                tile('Stoo', stock, (value) => stock = value),
                tile('Gharama na faida', cost, (value) => cost = value),
                tile('Historia yote', history, (value) => history = value),
                tile('Madeni', debts, (value) => debts = value),
                tile('Wateja', customers, (value) => customers = value),
                tile('Ripoti', reports, (value) => reports = value),
                tile('Hariri stoo', edit, (value) => edit = value),
                tile('Uchambuzi', analysis, (value) => analysis = value),
                ListTile(
                  leading: const Icon(Icons.pin_outlined),
                  title: const Text('Badilisha PIN'),
                  onTap: () {
                    Navigator.pop(context, false);
                    _resetPin(person);
                  },
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hifadhi sehemu')),
                ),
              ],
            ),
          );
        },
      ),
    );
    if (saved != true || !mounted) return;
    final error = await widget.store.saveAccess('${person['id']}', {
      'perm_stock': stock ? 1 : 0,
      'perm_cost': cost ? 1 : 0,
      'perm_history': history ? 1 : 0,
      'perm_debts': debts ? 1 : 0,
      'perm_customers': customers ? 1 : 0,
      'perm_reports': reports ? 1 : 0,
      'perm_edit': edit ? 1 : 0,
      'perm_analysis': analysis ? 1 : 0,
    });
    if (mounted) toast(context, error ?? 'Sehemu zimehifadhiwa');
  }

  Future<void> _resetPin(Map<String, Object?> person) async {
    if (!await _ownerGate() || !mounted) return;
    final pin = await showDialog<String>(
      context: context,
      builder: (context) => FieldDialog(
        title: 'PIN ya ${person['name']}',
        confirm: 'Hifadhi',
        fields: const [DialogField('PIN mpya', number: true, obscure: true, maxLength: 4)],
      ),
    );
    if (pin == null || !mounted) return;
    final error = await widget.store.resetEmployeePin('${person['id']}', pin);
    if (mounted) toast(context, error ?? 'PIN imebadilika');
  }
}
