import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
    _boot();
  }

  Future<void> _boot() async {
    try {
      final opened = await ShopDb.open();
      final next = ShopStore(opened);
      await next.load();
      await next.syncShop();
      if (!mounted) return;
      setState(() => store = next);
    } catch (err) {
      if (!mounted) return;
      setState(() => error = err.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PhoneVault',
      debugShowCheckedModeBanner: false,
      theme: phoneTheme(),
      builder: (context, child) {
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: const SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
            systemNavigationBarColor: Colors.white,
            systemNavigationBarIconBrightness: Brightness.dark,
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: error != null
          ? Scaffold(body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(error!, textAlign: TextAlign.center))))
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
    return const Scaffold(
      backgroundColor: skyDeep,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock, color: Colors.white, size: 48),
            SizedBox(height: 12),
            Text('PhoneVault', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w600)),
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
  bool _ready = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    setScreenSecure(true);
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

  @override
  void dispose() {
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
    return AnnotatedRegion<SystemUiOverlayStyle>(
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
                  if (_creating && !_confirming) ...[
                    const SizedBox(height: 16),
                    TextField(
                      controller: _name,
                      maxLength: 40,
                      inputFormatters: [LengthLimitingTextInputFormatter(40)],
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Jina la mmiliki',
                        counterText: '',
                        hintStyle: const TextStyle(color: Colors.white60),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.12),
                      ),
                    ),
                  ],
                  if (!_creating && _people.length > 1) ...[
                    const SizedBox(height: 16),
                    SizedBox(height: 86, child: _staffRow()),
                  ],
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
                  if (_message != null) ...[
                    const SizedBox(height: 10),
                    Text(_message!, style: const TextStyle(color: Colors.white)),
                  ],
                  const Spacer(),
                  SlideTransition(
                    position: Tween<Offset>(begin: const Offset(0, 0.25), end: Offset.zero).animate(padSlide),
                    child: FadeTransition(opacity: padSlide, child: _pad()),
                  ),
                  const SizedBox(height: 12),
                ],
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
                              'Karibu, ${_creating ? _name.text.trim() : _selected?['name'] ?? ''}',
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
    );
  }

  String get _title {
    if (!_ready) return 'PhoneVault';
    if (_creating && !_confirming) return 'Fungua duka';
    if (_creating && _confirming) return 'Rudia PIN';
    return 'Karibu';
  }

  String get _subtitle {
    if (_creating) return 'PIN ya tarakimu 4. Inabaki kwenye simu hii.';
    return '${_selected?['name'] ?? ''} · weka PIN';
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

  Future<void> _press(String key) async {
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
        _fail('Weka jina la mmiliki.');
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
      _fail('PIN hazifanani. Anza tena.');
      setState(() => _confirming = false);
      return;
    }
    final error = await widget.store.createOwner(_name.text, _pin);
    if (!mounted) return;
    if (error != null) {
      _fail(error);
      setState(() => _confirming = false);
      return;
    }
    await _done();
  }

  Future<void> _login() async {
    final selected = _selected;
    if (selected == null) return;
    final error = await widget.store.unlock(selected['id'] as String, _pin);
    if (!mounted) return;
    if (error != null) {
      _fail(error);
      return;
    }
    await _done();
  }

  Future<void> _done() async {
    HapticFeedback.mediumImpact();
    await _success.forward();
    await Future<void>.delayed(const Duration(milliseconds: 450));
    if (mounted) widget.onUnlocked();
  }

  void _fail(String message) {
    HapticFeedback.heavyImpact();
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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _armIdle();
  }

  @override
  void dispose() {
    _idle?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _armIdle() {
    _idle?.cancel();
    _idle = Timer(const Duration(minutes: 3), () {
      if (mounted && !widget.store.holdLock) widget.onLock();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused && mounted && !widget.store.holdLock) widget.onLock();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _armIdle(),
      child: ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        final pages = [
          HomePage(store: widget.store, goTab: (tab) => setState(() => _tab = tab)),
          SellPage(store: widget.store),
          StockPage(store: widget.store),
          DebtsPage(store: widget.store),
          MorePage(store: widget.store, onLock: widget.onLock),
        ];
        return Scaffold(
          body: SafeArea(
            child: IndexedStack(
              index: _tab,
              children: [
                for (var i = 0; i < pages.length; i++)
                  _Pane(active: _tab == i, child: pages[i]),
              ],
            ),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: (index) => setState(() => _tab = index),
            destinations: [
              const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Nyumbani'),
              const NavigationDestination(icon: Icon(Icons.point_of_sale_outlined), selectedIcon: Icon(Icons.point_of_sale), label: 'Uza'),
              const NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Stoo'),
              const NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), selectedIcon: Icon(Icons.account_balance_wallet), label: 'Deni'),
              NavigationDestination(
                icon: Badge(
                  isLabelVisible: widget.store.unread > 0,
                  label: Text('${widget.store.unread}'),
                  child: const Icon(Icons.grid_view_outlined),
                ),
                selectedIcon: const Icon(Icons.grid_view),
                label: 'Zaidi',
              ),
            ],
          ),
        );
      },
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
