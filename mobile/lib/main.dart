import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'lang.dart';
import 'money.dart';
import 'pictures.dart';
import 'screens/debts_page.dart';
import 'screens/home_page.dart';
import 'screens/more_page.dart';
import 'screens/sell_page.dart';
import 'screens/stock_page.dart';
import 'screen_guard.dart';
import 'shop_db.dart';
import 'shop_store.dart';
import 'theme.dart';
import 'whatsapp.dart';
import 'widgets/ui.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PhoneVaultApp());
}

class PhoneVaultApp extends StatefulWidget {
  const PhoneVaultApp({super.key});

  @override
  State<PhoneVaultApp> createState() => _PhoneVaultAppState();
}

class _PhoneVaultAppState extends State<PhoneVaultApp> {
  ShopStore? store;
  String? error;
  bool locked = true;

  @override
  void initState() {
    super.initState();
    Lang.i.addListener(_onLang);
    _boot();
  }

  void _onLang() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    Lang.i.removeListener(_onLang);
    super.dispose();
  }

  Future<void> _boot() async {
    try {
      final opened = await ShopDb.open();
      final next = ShopStore(opened);
      await next.load();
      if (!mounted) return;
      setState(() => store = next);
      next.syncShop();
    } catch (_) {
      if (!mounted) return;
      setState(() => error = t('Duka halikufunguka. Fungua tena.'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final code = Lang.i.code;
    return MaterialApp(
      title: 'PhoneVault',
      debugShowCheckedModeBanner: false,
      theme: phoneTheme(),
      locale: Locale(code),
      supportedLocales: const [Locale('sw'), Locale('en'), Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) {
        return Directionality(
          textDirection: code == 'ar' ? TextDirection.rtl : TextDirection.ltr,
          child: ListenableBuilder(
          listenable: Notices.i,
          builder: (context, _) {
            final up = Notices.i.raw != null;
            return AnnotatedRegion<SystemUiOverlayStyle>(
              value: SystemUiOverlayStyle(
                statusBarColor: Colors.transparent,
                statusBarIconBrightness: up ? Brightness.light : Brightness.dark,
                systemNavigationBarColor: Colors.white,
                systemNavigationBarIconBrightness: Brightness.dark,
              ),
              child: Column(
                children: [
                  const NoticeBar(),
                  Expanded(
                    child: Listener(
                      behavior: HitTestBehavior.translucent,
                      onPointerDown: (_) => store?.lastTouch = DateTime.now(),
                      child: child ?? const SizedBox.shrink(),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
        );
      },
      home: error != null
          ? Scaffold(
              backgroundColor: skyPage,
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 42),
                      const SizedBox(height: 12),
                      Text(tx(error!, 'The shop did not open. Open the app again.'), textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w700, fontSize: 16)),
                    ],
                  ),
                ),
              ),
            )
          : store == null
              ? const _Splash()
              : locked
                  ? PinGate(store: store!, onUnlocked: () => setState(() => locked = false))
                  : ShopShell(
                      store: store!,
                      onLock: () {
                        store!.lock();
                        setState(() => locked = true);
                      },
                    ),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: skyDeep,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock, color: Colors.white, size: 48),
            SizedBox(height: 12),
            Text('PhoneVault', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w600)),
            SizedBox(height: 22),
            SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2.6, color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

class PinGate extends StatefulWidget {
  const PinGate({super.key, required this.store, required this.onUnlocked});
  final ShopStore store;
  final VoidCallback onUnlocked;

  @override
  State<PinGate> createState() => _PinGateState();
}

class _PinGateState extends State<PinGate> with TickerProviderStateMixin {
  late final AnimationController _enter = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));
  late final AnimationController _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 420));
  late final AnimationController _success = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
  final _name = TextEditingController();
  List<Map<String, Object?>> _people = [];
  Map<String, Object?>? _selected;
  String _pin = '';
  String _firstPin = '';
  bool _confirming = false;
  bool _creating = false;
  bool _ownerForm = false;
  bool _ready = false;
  bool _working = false;
  String _wait = '';
  String? _message;

  @override
  void initState() {
    super.initState();
    setScreenSecure(true);
    widget.store.addListener(_onStore);
    _enter.forward();
    _load();
  }

  Future<void> _load() async {
    final people = await widget.store.db.staff(activeOnly: true);
    if (!mounted) return;
    setState(() {
      _people = people;
      _creating = people.isEmpty;
      _selected = people.isEmpty ? null : people.first;
      _ready = true;
    });
  }

  void _onStore() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.store.removeListener(_onStore);
    setScreenSecure(false);
    _enter.dispose();
    _shake.dispose();
    _success.dispose();
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lockScale = CurvedAnimation(parent: _enter, curve: const Interval(0, 0.55, curve: Curves.elasticOut));
    final titleFade = CurvedAnimation(parent: _enter, curve: const Interval(0.2, 0.65, curve: Curves.easeOut));
    final padSlide = CurvedAnimation(parent: _enter, curve: const Interval(0.35, 1, curve: Curves.easeOutCubic));
    return PopScope(
      canPop: !(_creating && _ownerForm),
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _stepBack();
      },
      child: AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
      backgroundColor: skyDeep,
      body: Stack(
        children: [
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: LangDots(
                      current: widget.store.lang,
                      onPick: widget.store.setLanguage,
                      light: true,
                    ),
                  ),
                  if (_creating && _ownerForm)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: _working ? null : _stepBack,
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        label: Text(tx('Rudi nyuma', 'Back'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  const Spacer(),
                  ScaleTransition(
                    scale: lockScale,
                    child: const CircleAvatar(
                      radius: 36,
                      backgroundColor: sky,
                      child: Icon(Icons.lock_outline, color: ink, size: 34),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FadeTransition(
                    opacity: titleFade,
                    child: Column(
                      children: [
                        Text(_title, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Text(_subtitle, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
                      ],
                    ),
                  ),
                  if (_creating && !_ownerForm) ...[
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: ink),
                        onPressed: _joinShop,
                        child: Text(tx('Mimi ni muuzaji', 'I am the seller')),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white)),
                        onPressed: () => setState(() => _ownerForm = true),
                        child: Text(tx('Mimi ni mmiliki', 'I am the owner')),
                      ),
                    ),
                  ],
                  if (_creating && _ownerForm && !_confirming) ...[
                    const SizedBox(height: 8),
                    TextField(
                      controller: _name,
                      maxLength: 40,
                      inputFormatters: [LengthLimitingTextInputFormatter(40)],
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: tx('Jina la mmiliki', 'Owner name'),
                        counterText: '',
                        hintStyle: const TextStyle(color: Colors.white60),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.12),
                      ),
                    ),
                  ],
                  if (!_creating && _people.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    SizedBox(height: 108, child: _staffRow()),
                    TextButton(
                      onPressed: _joinShop,
                      child: Text(tx('Ingia kwenye duka la mmiliki', 'Join the owner shop'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    ),
                  ],
                  if (_message != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      speak(_message!),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: isProblem(_message!) ? const Color(0xFFFFB4B4) : Colors.white, fontWeight: FontWeight.w700),
                    ),
                  ],
                  if (!_creating || _ownerForm) ...[
                  const SizedBox(height: 18),
                  AnimatedBuilder(
                    animation: _shake,
                    builder: (context, child) {
                      final offset = TweenSequence<double>([
                        TweenSequenceItem(tween: Tween(begin: 0, end: -14), weight: 1),
                        TweenSequenceItem(tween: Tween(begin: -14, end: 14), weight: 2),
                        TweenSequenceItem(tween: Tween(begin: 14, end: -8), weight: 2),
                        TweenSequenceItem(tween: Tween(begin: -8, end: 0), weight: 1),
                      ]).animate(_shake);
                      return Transform.translate(offset: Offset(offset.value, 0), child: child);
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var i = 0; i < 4; i++)
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 160),
                            margin: const EdgeInsets.symmetric(horizontal: 6),
                            width: _pin.length > i ? 16 : 10,
                            height: _pin.length > i ? 16 : 10,
                            decoration: BoxDecoration(
                              color: _pin.length > i ? Colors.white : Colors.white24,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  if (!_creating || _ownerForm) SlideTransition(
                    position: Tween<Offset>(begin: const Offset(0, 0.25), end: Offset.zero).animate(padSlide),
                    child: FadeTransition(opacity: padSlide, child: Directionality(textDirection: TextDirection.ltr, child: _pad())),
                  ),
                  if (!_creating)
                    TextButton(
                      onPressed: _working ? null : _forgot,
                      child: Text(tx('Nimesahau PIN', 'Forgot PIN'), style: const TextStyle(color: Colors.white70)),
                    ),
                  const SizedBox(height: 12),
                  ],
                ],
              ),
            ),
          ),
          if (_working)
            Positioned.fill(
              child: ColoredBox(
              color: skyDeep.withValues(alpha: 0.88),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(width: 42, height: 42, child: CircularProgressIndicator(strokeWidth: 3, color: Colors.white)),
                    const SizedBox(height: 16),
                    Text(_wait, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
            ),
          AnimatedBuilder(
            animation: _success,
            builder: (context, _) {
              return IgnorePointer(
                ignoring: _success.value == 0,
                child: Opacity(
                  opacity: _success.value,
                  child: ColoredBox(
                    color: skyDeep,
                    child: Center(
                      child: Transform.scale(
                        scale: 0.6 + (_success.value * 0.4),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.check_circle, color: Colors.white, size: 96),
                            const SizedBox(height: 12),
                            Text(
                              '${t('Karibu')}, ${_creating ? _name.text.trim() : _selected?['name'] ?? ''}',
                              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    ),
    ),
    );
  }

  void _stepBack() {
    if (_working) return;
    setState(() {
      _pin = '';
      _message = null;
      if (_confirming) {
        _confirming = false;
        _firstPin = '';
        return;
      }
      _ownerForm = false;
      _name.clear();
    });
  }

  String get _title {
    if (!_ready) return 'PhoneVault';
    if (_creating && !_ownerForm) return tx('Chagua simu', 'Choose this phone');
    if (_creating && !_confirming) return tx('Fungua duka', 'Open the shop');
    if (_creating && _confirming) return tx('Rudia PIN', 'Repeat the PIN');
    return tx('Karibu', 'Welcome');
  }

  String get _subtitle {
    if (_creating && !_ownerForm) return tx('Muuzaji anaingia kwa PIN aliyopewa na mmiliki.', 'The seller signs in with the PIN from the owner.');
    if (_creating) return tx('PIN ya tarakimu 4. Inabaki kwenye simu hii.', 'A 4 digit PIN. It stays on this phone.');
    return '${_selected?['name'] ?? ''} · ${roleLabel('${_selected?['role']}')} · ${tx('weka PIN', 'enter PIN')}';
  }

  Widget _staffRow() {
    return ListView(
      scrollDirection: Axis.horizontal,
      children: [
        for (final person in _people)
          GestureDetector(
            onTap: () => setState(() {
              _selected = person;
              _pin = '';
              _message = null;
            }),
            child: Container(
              width: 76,
              margin: const EdgeInsets.only(right: 8),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _selected?['id'] == person['id'] ? Colors.white : Colors.transparent,
                        width: 2,
                      ),
                    ),
                    child: FaceBubble(
                      name: '${person['name']}',
                      bytes: photoBytes(person['photo']),
                      radius: 26,
                      color: Colors.white,
                      letterColor: skyDeep,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('${person['name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 12)),
                  Text(roleLabel('${person['role']}'), style: const TextStyle(color: Colors.white70, fontSize: 11)),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _pad() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 3,
      childAspectRatio: 1.7,
      children: [
        for (final key in keys)
          Padding(
            padding: const EdgeInsets.all(6),
            child: key.isEmpty
                ? const SizedBox.shrink()
                : Material(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(18),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () => _press(key),
                      child: Center(
                        child: Text(key, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
          ),
      ],
    );
  }

  Future<void> _joinShop() async {
    final address = TextEditingController();
    final word = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t('Unganisha na duka')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: address, decoration: InputDecoration(labelText: t('Anwani ya duka'))),
            const SizedBox(height: 8),
            TextField(controller: word, decoration: InputDecoration(labelText: t('Neno la kuunganisha'))),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(t('Funga'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(t('Unganisha'))),
        ],
      ),
    );
    if (ok != true || !mounted) {
      address.dispose();
      word.dispose();
      return;
    }
    setState(() {
      _working = true;
      _wait = tx('Inaunganisha duka...', 'Joining the shop...');
    });
    final error = await widget.store.joinShop(address.text, word.text);
    address.dispose();
    word.dispose();
    if (!mounted) return;
    if (error != null) {
      _fail(error);
      setState(() => _working = false);
      return;
    }
    final people = await widget.store.db.staff(activeOnly: true);
    if (!mounted) return;
    setState(() {
      _people = people;
      _creating = people.isEmpty;
      _ownerForm = false;
      _working = false;
      _selected = people.isEmpty ? null : people.firstWhere((row) => row['role'] != 'OWNER', orElse: () => people.first);
      _pin = '';
      _message = null;
    });
  }

  Future<void> _press(String key) async {
    if (_working) return;
    HapticFeedback.selectionClick();
    if (key == '⌫') {
      if (_pin.isEmpty) return;
      setState(() => _pin = _pin.substring(0, _pin.length - 1));
      return;
    }
    if (_pin.length >= 4) return;
    setState(() => _pin += key);
    if (_pin.length < 4) return;
    if (_creating) {
      await _create();
      return;
    }
    await _login();
  }

  Future<void> _create() async {
    if (!_confirming) {
      if (_name.text.trim().isEmpty) {
        _fail(t('Weka jina la mmiliki.'));
        return;
      }
      setState(() {
        _firstPin = _pin;
        _pin = '';
        _confirming = true;
        _message = null;
      });
      return;
    }
    if (_pin != _firstPin) {
      _fail(t('PIN hazifanani. Anza tena.'));
      setState(() => _confirming = false);
      return;
    }
    setState(() {
      _working = true;
      _wait = t('Inafungua duka...');
    });
    final error = await widget.store.createOwner(_name.text, _pin);
    if (!mounted) return;
    if (error != null) {
      _fail(error);
      setState(() {
        _working = false;
        _confirming = false;
      });
      return;
    }
    await _done();
  }

  Future<void> _forgot() async {
    final ready = await widget.store.recoveryReady();
    if (!mounted) return;
    if (!ready) {
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(t('Nimesahau PIN')),
          content: Text(t('Mmiliki aweke neno la kurejesha kwenye Mipangilio akiwa ameingia. Muuzaji akisahau, mmiliki anamwekewa PIN mpya humo humo.')),
          actions: [FilledButton(onPressed: () => Navigator.pop(context), child: Text(t('Sawa')))],
        ),
      );
      return;
    }
    final values = await showDialog<List<String>>(
      context: context,
      builder: (context) => FieldDialog(
        title: t('Nimesahau PIN'),
        confirm: t('Weka PIN mpya'),
        fields: [
          DialogField(t('Neno la kurejesha'), obscure: true, maxLength: 40),
          DialogField(t('PIN mpya ya mmiliki'), number: true, obscure: true, maxLength: 4),
          DialogField(t('Rudia PIN'), number: true, obscure: true, maxLength: 4),
        ],
      ),
    );
    if (values == null || values.length < 3 || !mounted) return;
    setState(() {
      _working = true;
      _wait = tx('Inakagua neno...', 'Checking the word...');
    });
    final error = await widget.store.recoverOwnerPin(values[0], values[1], values[2]);
    if (!mounted) return;
    setState(() => _working = false);
    if (error != null) {
      _fail(error);
      return;
    }
    setState(() => _message = t('PIN ya mmiliki imebadilika. Chagua mmiliki, kisha ingia na PIN mpya.'));
    if (mounted) toast(context, _message!);
  }

  Future<void> _login() async {
    final selected = _selected;
    if (selected == null) return;
    setState(() {
      _working = true;
      _wait = t('Inaingia...');
    });
    final error = await widget.store.unlock(selected['id'] as String, _pin);
    if (!mounted) return;
    if (error != null) {
      _fail(error);
      setState(() => _working = false);
      return;
    }
    await _done();
  }

  Future<void> _done() async {
    Notices.i.clear();
    HapticFeedback.mediumImpact();
    await _success.forward();
    await Future<void>.delayed(const Duration(milliseconds: 450));
    if (mounted) widget.onUnlocked();
  }

  void _fail(String message) {
    HapticFeedback.heavyImpact();
    Notices.i.show(message, bad: true);
    setState(() {
      _pin = '';
      _message = message;
    });
    _shake.forward(from: 0);
  }
}

class ShopShell extends StatefulWidget {
  const ShopShell({super.key, required this.store, required this.onLock});
  final ShopStore store;
  final VoidCallback onLock;

  @override
  State<ShopShell> createState() => _ShopShellState();
}

class _ShopShellState extends State<ShopShell> with WidgetsBindingObserver {
  int _tab = 0;
  Timer? _idle;
  Timer? _wings;
  DateTime? _awayAt;
  final _sellKey = GlobalKey<SellPageState>();
  bool _sellFiltered = false;
  bool _reminding = false;
  DateTime? _remindedAt;
  static const _idleLimit = Duration(minutes: 3);
  static const _awayLimit = Duration(minutes: 10);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.store.showTill = _showTill;
    widget.store.lastTouch = DateTime.now();
    _armIdle();
    _wings = Timer.periodic(const Duration(hours: 1), (_) => widget.store.remindOpenWings());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _autoRemind();
      widget.store.remindOpenWings();
    });
  }

  @override
  void dispose() {
    if (widget.store.showTill == _showTill) widget.store.showTill = null;
    _idle?.cancel();
    _wings?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _showTill() {
    if (!mounted) return;
    setState(() => _tab = 1);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _sellKey.currentState?.openPay();
    });
  }

  void _armIdle() {
    _idle?.cancel();
    final left = _idleLimit - DateTime.now().difference(widget.store.lastTouch);
    _idle = Timer(left < const Duration(seconds: 1) ? const Duration(seconds: 1) : left, _lockIfIdle);
  }

  void _lockIfIdle() {
    if (!mounted || widget.store.holdLock) return;
    if (MediaQuery.viewInsetsOf(context).bottom > 0) {
      widget.store.lastTouch = DateTime.now();
      _idle = Timer(const Duration(seconds: 15), _lockIfIdle);
      return;
    }
    if (DateTime.now().difference(widget.store.lastTouch) >= _idleLimit) {
      widget.onLock();
      return;
    }
    _armIdle();
  }

  @override
  void didChangeMetrics() {
    if (!mounted) return;
    if (MediaQuery.viewInsetsOf(context).bottom > 0) {
      widget.store.lastTouch = DateTime.now();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _awayAt = DateTime.now();
      _idle?.cancel();
      return;
    }
    if (state == AppLifecycleState.resumed) {
      final away = _awayAt == null ? Duration.zero : DateTime.now().difference(_awayAt!);
      _awayAt = null;
      if (mounted && !widget.store.holdLock && away >= _awayLimit) {
        widget.onLock();
        return;
      }
      widget.store.lastTouch = DateTime.now();
      _armIdle();
      _autoRemind();
      widget.store.remindOpenWings();
    }
  }

  Future<void> _autoRemind() async {
    if (_reminding || !mounted || widget.store.session == null || !widget.store.seeDebts) return;
    if (_remindedAt != null && DateTime.now().difference(_remindedAt!) < const Duration(minutes: 10)) return;
    final due = widget.store.dueReminders();
    if (due.isEmpty) return;
    _reminding = true;
    _remindedAt = DateTime.now();
    widget.store.holdLock = true;
    final error = await widget.store.sendDebtReminder(due.first);
    widget.store.holdLock = false;
    _reminding = false;
    if (!mounted) return;
    toast(context, error ?? t('WhatsApp imefunguka. Bonyeza Tuma kumkumbusha mteja.'));
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        final pages = [
          HomePage(store: widget.store, goTab: (tab) => setState(() => _tab = tab)),
          SellPage(
            key: _sellKey,
            store: widget.store,
            onBack: () => setState(() => _tab = 0),
            onFilter: (on) {
              if (_sellFiltered == on || !mounted) return;
              setState(() => _sellFiltered = on);
            },
          ),
          StockPage(store: widget.store, onBack: () => setState(() => _tab = 0)),
          DebtsPage(store: widget.store, onBack: () => setState(() => _tab = 0)),
          MorePage(store: widget.store, onLock: widget.onLock, onBack: () => setState(() => _tab = 0)),
        ];
        return PopScope(
          canPop: !(_tab == 1 && _sellFiltered),
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _sellKey.currentState?.clearFilter();
          },
          child: Scaffold(
          body: SafeArea(
            child: Stack(
              children: [
                Column(
                  children: [
                    if (widget.store.liveSync) LiveStrip(text: widget.store.liveSyncText),
                    Expanded(
                      child: IndexedStack(
                        index: _tab,
                        children: [
                          for (var i = 0; i < pages.length; i++)
                            _Pane(active: _tab == i, child: pages[i]),
                        ],
                      ),
                    ),
                  ],
                ),
                Positioned(
                  right: 12,
                  bottom: 110,
                  child: _ZeyhaanChat(store: widget.store),
                ),
              ],
            ),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: (index) => setState(() => _tab = index),
            destinations: [
              NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home), label: tx('Nyumbani', 'Home')),
              NavigationDestination(icon: const Icon(Icons.point_of_sale_outlined), selectedIcon: const Icon(Icons.point_of_sale), label: tx('Uza', 'Sell')),
              NavigationDestination(icon: const Icon(Icons.inventory_2_outlined), selectedIcon: const Icon(Icons.inventory_2), label: tx('Stoo', 'Stock')),
              NavigationDestination(icon: const Icon(Icons.account_balance_wallet_outlined), selectedIcon: const Icon(Icons.account_balance_wallet), label: tx('Deni', 'Debt')),
              NavigationDestination(
                icon: Badge(
                  isLabelVisible: widget.store.unread > 0,
                  label: Text('${widget.store.unread}'),
                  child: const Icon(Icons.grid_view_outlined),
                ),
                selectedIcon: const Icon(Icons.grid_view),
                label: tx('Zaidi', 'More'),
              ),
            ],
          ),
        ),
        );
      },
    );
  }
}

class _ZeyhaanChat extends StatefulWidget {
  const _ZeyhaanChat({required this.store});
  final ShopStore store;

  @override
  State<_ZeyhaanChat> createState() => _ZeyhaanChatState();
}

class _ZeyhaanChatState extends State<_ZeyhaanChat> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat(reverse: true);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        final glow = 8 + (_pulse.value * 10);
        return Transform.scale(
          scale: 1 + (_pulse.value * 0.06),
          child: DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: const Color(0xFF25D366).withValues(alpha: 0.45), blurRadius: glow, spreadRadius: 1)],
            ),
            child: child,
          ),
        );
      },
      child: Material(
        color: const Color(0xFF25D366),
        shape: const CircleBorder(),
        elevation: 4,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () async {
            widget.store.holdLock = true;
            final error = await openZeyhaanWhatsapp();
            widget.store.holdLock = false;
            if (!context.mounted || error == null) return;
            toast(context, error);
          },
          child: const SizedBox(
            width: 58,
            height: 58,
            child: Icon(Icons.chat_rounded, color: Colors.white, size: 30),
          ),
        ),
      ),
    );
  }
}

class _Pane extends StatelessWidget {
  const _Pane({required this.active, required this.child});
  final bool active;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: active ? 1 : 0,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      child: AnimatedSlide(
        offset: active ? Offset.zero : const Offset(0.04, 0),
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        child: child,
      ),
    );
  }
}
