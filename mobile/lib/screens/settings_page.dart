import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../lang.dart';
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

class _SettingsPageState extends State<SettingsPage> with WidgetsBindingObserver {
  late final TextEditingController _shop;
  late final TextEditingController _lipa;
  late final TextEditingController _computer;
  late final TextEditingController _linkWord;
  late final TextEditingController _location;
  late final TextEditingController _shopPhone;
  late final TextEditingController _footer;
  late final List<TextEditingController> _shopFields;
  Timer? _shopTimer;
  String _shopSaved = '';
  String? _shopNotice;
  bool _busy = false;
  bool _savingShop = false;
  String _wait = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _shop = TextEditingController(text: widget.store.shopName);
    _lipa = TextEditingController(text: widget.store.lipaNumber);
    _computer = TextEditingController(text: widget.store.cloudUrl);
    _linkWord = TextEditingController(text: widget.store.syncToken);
    _location = TextEditingController(text: widget.store.shopLocation);
    _shopPhone = TextEditingController(text: showPhone(widget.store.shopPhone));
    _footer = TextEditingController(text: widget.store.receiptFooter);
    _shopFields = [_shop, _location, _shopPhone, _footer, _lipa];
    _shopSaved = _shopSignature();
    for (final field in _shopFields) {
      field.addListener(_onShopEdited);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _shopTimer?.cancel();
    for (final field in _shopFields) {
      field.removeListener(_onShopEdited);
    }
    if (widget.store.isOwner && _shopSignature() != _shopSaved) {
      widget.store.saveShop(
        _shop.text,
        _lipa.text,
        location: _location.text,
        shopPhone: _shopPhone.text,
        footer: _footer.text,
      );
    }
    _shop.dispose();
    _lipa.dispose();
    _computer.dispose();
    _linkWord.dispose();
    _location.dispose();
    _shopPhone.dispose();
    _footer.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) _flushShop();
  }

  String _shopSignature() => [_shop.text, _location.text, _shopPhone.text, _footer.text, _lipa.text].join('\u0001');

  void _onShopEdited() {
    if (!widget.store.isOwner) return;
    _shopTimer?.cancel();
    _shopTimer = Timer(const Duration(milliseconds: 700), _flushShop);
  }

  Future<void> _flushShop() async {
    if (!widget.store.isOwner || _savingShop) return;
    final signature = _shopSignature();
    if (signature == _shopSaved) return;
    _savingShop = true;
    final error = await widget.store.saveShop(
      _shop.text,
      _lipa.text,
      location: _location.text,
      shopPhone: _shopPhone.text,
      footer: _footer.text,
    );
    _savingShop = false;
    if (!mounted) return;
    if (error == null && _shopSignature() == signature) {
      _shopSaved = signature;
      if (_shopNotice != null) Notices.i.release(_shopNotice!);
      _shopNotice = null;
      return;
    }
    if (error != null && _shopSignature() == signature && mounted) {
      _shopNotice = error;
      toast(context, error);
      return;
    }
    if (_shopSignature() != signature) _onShopEdited();
  }

  void _fillFromStore() {
    for (final field in _shopFields) {
      field.removeListener(_onShopEdited);
    }
    _shop.text = widget.store.shopName;
    _location.text = widget.store.shopLocation;
    _shopPhone.text = showPhone(widget.store.shopPhone);
    _footer.text = widget.store.receiptFooter;
    _lipa.text = widget.store.lipaNumber;
    _computer.text = widget.store.cloudUrl;
    _linkWord.text = widget.store.syncToken;
    _shopSaved = _shopSignature();
    for (final field in _shopFields) {
      field.addListener(_onShopEdited);
    }
  }

  Future<void> _saveCopy() async {
    setState(() {
      _busy = true;
      _wait = t('Inatengeneza nakala...');
    });
    final result = await widget.store.exportBackup();
    if (!mounted) return;
    if (result == null || !result.toLowerCase().endsWith('.db')) {
      setState(() => _busy = false);
      toast(context, result ?? 'Hiki ni kwa mmiliki tu.');
      return;
    }
    final name = result.split(RegExp(r'[\\/]')).last;
    var failed = false;
    String? saved;
    try {
      saved = await FilePicker.platform.saveFile(
        dialogTitle: t('Hifadhi nakala'),
        fileName: name,
        bytes: await File(result).readAsBytes(),
      );
    } catch (_) {
      failed = true;
    }
    if (!mounted) return;
    if (failed) {
      try {
        await Share.shareXFiles([XFile(result, mimeType: 'application/octet-stream', name: name)]);
      } catch (_) {
        if (!mounted) return;
        setState(() => _busy = false);
        toast(context, 'Nakala haikufunguka.');
        return;
      }
      if (!mounted) return;
      setState(() => _busy = false);
      toast(context, 'Nakala iko tayari. Itunze kabla ya kubadilisha simu.');
      return;
    }
    setState(() => _busy = false);
    toast(context, saved == null ? 'Imesitishwa.' : 'Nakala imehifadhiwa. Itunze. Simu mpya inairudisha kutoka Mipangilio.');
  }

  Future<String?> _chosenCopy() async {
    final picked = await FilePicker.platform.pickFiles(withData: true);
    final file = picked?.files.single;
    if (file == null) return null;
    final given = file.path;
    if (given != null && given.isNotEmpty) return given;
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) return '';
    final dir = await getTemporaryDirectory();
    final path = p.join(dir.path, 'phonevault-in.db');
    await File(path).writeAsBytes(bytes, flush: true);
    return path;
  }

  Future<void> _restoreCopy() async {
    _shopTimer?.cancel();
    while (_savingShop) {
      await Future<void>.delayed(const Duration(milliseconds: 40));
    }
    final path = await _chosenCopy();
    if (!mounted) return;
    if (path == null) {
      toast(context, 'Imesitishwa.');
      return;
    }
    if (path.isEmpty) {
      toast(context, 'Faili hii haikusomeka.');
      return;
    }
    final ok = await confirm(
      context,
      t('Rudisha nakala'),
      t('Duka lililo kwenye simu hii litaondoka. Duka la nakala litarudi pamoja na PIN ya simu ya awali.'),
    );
    if (!ok || !mounted) {
      if (mounted && !ok) toast(context, 'Imesitishwa.');
      return;
    }
    setState(() {
      _busy = true;
      _wait = t('Inarudisha nakala...');
    });
    final error = await widget.store.restoreBackup(path);
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      toast(context, error);
      return;
    }
    _fillFromStore();
    toast(context, 'Nakala imerudi. Ingia kwa PIN ya simu ya awali.');
    widget.onLock();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: skyPage,
          appBar: AppBar(title: Text(tx('Mipangilio', 'Settings'), style: const TextStyle(fontWeight: FontWeight.w600))),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              if (_busy) ...[
                LiveStrip(text: _wait),
                const SizedBox(height: 12),
              ],
              _card([
                Row(
                  children: [
                    Expanded(child: Text(tx('Lugha', 'Language'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
                    LangDots(current: store.lang, onPick: store.setLanguage),
                  ],
                ),
              ]),
              const SizedBox(height: 12),
              _card([
                Text(tx('Duka', 'Shop'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                const SizedBox(height: 10),
                _logoPlate(store),
                if (store.isOwner) ...[
                  const SizedBox(height: 10),
                  BusyButton(
                    busy: _busy,
                    onPressed: _pickLogo,
                    label: store.shopLogo == null ? tx('Weka logo', 'Add logo') : tx('Badilisha logo', 'Change logo'),
                  ),
                  if (store.shopLogo != null)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(onPressed: _busy ? null : _clearLogo, child: Text(tx('Ondoa logo', 'Remove logo'))),
                    ),
                ],
                const SizedBox(height: 8),
                SoftField(controller: _shop, label: tx('Jina la duka', 'Shop name'), readOnly: !store.isOwner, maxLength: 40),
                const SizedBox(height: 8),
                SoftField(controller: _location, label: tx('Mahali / mtaa', 'Place'), readOnly: !store.isOwner, maxLength: 80),
                const SizedBox(height: 8),
                SoftField(controller: _shopPhone, label: tx('Simu ya duka', 'Shop phone'), readOnly: !store.isOwner, phone: true, keyboard: TextInputType.phone),
                const SizedBox(height: 8),
                SoftField(controller: _footer, label: tx('Ujumbe wa chini ya risiti', 'Receipt footer'), readOnly: !store.isOwner, maxLength: 160),
                const SizedBox(height: 8),
                SoftField(
                  controller: _lipa,
                  label: t('Lipa Namba'),
                  keyboard: TextInputType.number,
                  readOnly: !store.isOwner,
                  digitsOnly: true,
                  maxLength: 15,
                  minDigits: 5,
                  rule: t('Lipa Namba iwe tarakimu 5 hadi 15.'),
                ),
                if (store.isOwner) ...[
                  const SizedBox(height: 8),
                  SoftField(controller: _computer, label: tx('Kompyuta ya duka', 'Shop address'), maxLength: 120),
                  const SizedBox(height: 8),
                  SoftField(controller: _linkWord, label: tx('Neno la kuunganisha simu', 'Connecting word'), maxLength: 40),
                ],
                if (store.isOwner) ...[
                  const SizedBox(height: 8),
                  BusyButton(busy: _busy, onPressed: _saveShop, label: tx('Hifadhi', 'Save')),
                ],
              ]),
              const SizedBox(height: 12),
              _card([
                Text(tx('Akaunti', 'Account'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
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
                BusyButton(
                  busy: _busy,
                  onPressed: _pickPhoto,
                  label: store.myPhoto == null ? tx('Weka picha yangu', 'Add my photo') : tx('Badilisha picha yangu', 'Change my photo'),
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(
                    spacing: 4,
                    children: [
                      if (store.myPhoto != null) TextButton(onPressed: _busy ? null : _clearPhoto, child: Text(tx('Ondoa picha', 'Remove photo'))),
                      TextButton(onPressed: _changePin, child: Text(t('Badilisha PIN'))),
                      if (store.isOwner) TextButton(onPressed: _busy ? null : _recoveryWord, child: Text(tx('Neno la kurejesha', 'Recovery word'))),
                    ],
                  ),
                ),
              ]),
              if (store.isOwner) ...[
                const SizedBox(height: 12),
                _card([
                  Row(
                    children: [
                      Expanded(child: Text(t('Wafanyakazi'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
                      TextButton(onPressed: _addEmployee, child: Text(t('Ongeza'))),
                    ],
                  ),
                  for (final person in store.staff)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF4FBF1),
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
              if (store.isOwner) ...[
                const SizedBox(height: 16),
                _card([
                  Text(t('Nakala ya duka'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 6),
                  Text(t('Faili hii hubeba duka zima: mauzo, madeni, stoo, wateja, na PIN. Simu mpya: jiandikishe kama mmiliki, ingia, kisha rudisha faili hii. PIN inakuwa ile ya simu ya awali.'), style: captionStyle),
                  const SizedBox(height: 12),
                  SizedBox(width: double.infinity, child: FilledButton(onPressed: _busy ? null : _saveCopy, child: Text(t('Hifadhi nakala')))),
                  const SizedBox(height: 8),
                  SizedBox(width: double.infinity, child: OutlinedButton(onPressed: _busy ? null : _restoreCopy, child: Text(t('Rudisha nakala')))),
                ]),
              ],
              const SizedBox(height: 16),
              FilledButton.tonal(
                onPressed: widget.onLock,
                child: Text(tx('Funga duka', 'Lock')),
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
            child: _busy
                ? const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: skyDeep)))
                : logo == null
                    ? const Icon(Icons.add_photo_alternate_outlined, color: skyDeep)
                    : HoldPhoto(bytes: logo),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(store.shopName, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 2),
                Text(tx('Inakaa juu ya risiti', 'Shown on the receipt'), style: const TextStyle(color: Colors.white70, fontSize: 12)),
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
      if (mounted) toast(context, t('Picha haikufunguka.'));
      return null;
    } finally {
      widget.store.holdLock = false;
    }
  }

  Future<void> _pickLogo() async {
    final bytes = await _pickImage();
    if (bytes == null || !mounted) return;
    setState(() {
      _busy = true;
      _wait = t('Inaweka logo...');
    });
    final error = await widget.store.saveShopLogo(bytes);
    if (!mounted) return;
    setState(() => _busy = false);
    toast(context, error ?? t('Logo iko juu ya risiti.'));
  }

  Future<void> _clearLogo() async {
    setState(() {
      _busy = true;
      _wait = t('Inaondoa logo...');
    });
    final error = await widget.store.saveShopLogo(null);
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) toast(context, error);
  }

  Future<void> _pickPhoto() async {
    final bytes = await _pickImage();
    if (bytes == null || !mounted) return;
    setState(() {
      _busy = true;
      _wait = t('Inaweka picha...');
    });
    final error = await widget.store.saveMyPhoto(bytes);
    if (!mounted) return;
    setState(() => _busy = false);
    toast(context, error ?? t('Picha yako iko kwenye dashibodi.'));
  }

  Future<void> _clearPhoto() async {
    setState(() {
      _busy = true;
      _wait = t('Inaondoa picha...');
    });
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
      builder: (context) => FieldDialog(
        title: t('Thibitisha PIN'),
        confirm: t('Endelea'),
        fields: [DialogField(t('PIN ya mmiliki'), number: true, obscure: true, maxLength: 4)],
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

  Future<void> _saveShop() async {
    _shopTimer?.cancel();
    setState(() {
      _busy = true;
      _wait = t('Inahifadhi duka...');
    });
    _savingShop = true;
    final error = await widget.store.saveShop(
      _shop.text,
      _lipa.text,
      location: _location.text,
      shopPhone: _shopPhone.text,
      footer: _footer.text,
    );
    final computerError = error == null ? await widget.store.saveShopComputer(_computer.text, token: _linkWord.text) : null;
    _savingShop = false;
    if (!mounted) return;
    if (error == null) _shopSaved = _shopSignature();
    setState(() => _busy = false);
    toast(context, error ?? computerError ?? t('Duka limehifadhiwa'));
  }

  Future<void> _changePin() async {
    final values = await showDialog<List<String>>(
      context: context,
      builder: (context) => FieldDialog(
        title: t('PIN mpya'),
        confirm: t('Hifadhi'),
        fields: [
          DialogField(t('PIN ya sasa'), number: true, obscure: true, maxLength: 4),
          DialogField(t('PIN mpya'), number: true, obscure: true, maxLength: 4),
          DialogField(t('Rudia PIN'), number: true, obscure: true, maxLength: 4),
        ],
      ),
    );
    if (values == null || !mounted) return;
    if (values[1] != values[2]) {
      toast(context, t('PIN hazifanani.'));
      return;
    }
    final error = await widget.store.changeOwnPin(values[0], values[1]);
    if (!mounted) return;
    toast(context, error ?? t('PIN imebadilika'));
    if (error != null && error.startsWith('Majaribio')) widget.onLock();
  }

  Future<void> _recoveryWord() async {
    if (!await _ownerGate() || !mounted) return;
    final values = await showDialog<List<String>>(
      context: context,
      builder: (context) => FieldDialog(
        title: tx('Neno la kurejesha', 'Recovery word'),
        confirm: tx('Hifadhi', 'Save'),
        fields: [
          DialogField(t('Neno jipya'), obscure: true, maxLength: 40),
          DialogField(t('Rudia neno'), obscure: true, maxLength: 40),
        ],
      ),
    );
    if (values == null || !mounted) return;
    setState(() => _busy = true);
    final error = await widget.store.saveRecoveryWord(values[0], values[1]);
    if (!mounted) return;
    setState(() => _busy = false);
    toast(context, error ?? t('Neno la kurejesha limehifadhiwa. Usipeane kwa muuzaji.'));
  }

  Future<void> _addEmployee() async {
    if (!await _ownerGate() || !mounted) return;
    final values = await showDialog<List<String>>(
      context: context,
      builder: (context) => FieldDialog(
        title: t('Muuzaji mpya'),
        confirm: t('Ongeza'),
        fields: [
          DialogField(t('Jina'), maxLength: 40),
          DialogField(t('PIN ya tarakimu 4'), number: true, obscure: true, maxLength: 4),
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
                tile(t('Stoo'), stock, (value) => stock = value),
                tile(t('Gharama na faida'), cost, (value) => cost = value),
                tile(t('Historia yote'), history, (value) => history = value),
                tile(t('Madeni'), debts, (value) => debts = value),
                tile(t('Wateja'), customers, (value) => customers = value),
                tile(t('Ripoti'), reports, (value) => reports = value),
                tile(t('Hariri stoo'), edit, (value) => edit = value),
                tile(t('Uchambuzi'), analysis, (value) => analysis = value),
                ListTile(
                  leading: const Icon(Icons.pin_outlined),
                  title: Text(t('Badilisha PIN')),
                  onTap: () {
                    Navigator.pop(context, false);
                    _resetPin(person);
                  },
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(t('Hifadhi sehemu'))),
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
    if (mounted) toast(context, error ?? t('Sehemu zimehifadhiwa'));
  }

  Future<void> _resetPin(Map<String, Object?> person) async {
    if (!await _ownerGate() || !mounted) return;
    final pin = await showDialog<String>(
      context: context,
      builder: (context) => FieldDialog(
        title: tf('PIN ya {0}', ["${person['name']}"]),
        confirm: t('Hifadhi'),
        fields: [DialogField(t('PIN mpya'), number: true, obscure: true, maxLength: 4)],
      ),
    );
    if (pin == null || !mounted) return;
    final error = await widget.store.resetEmployeePin('${person['id']}', pin);
    if (mounted) toast(context, error ?? t('PIN imebadilika'));
  }
}
