import 'package:flutter/material.dart';

const sky = Color(0xFF80DDFF);
const skyDeep = Color(0xFF0284C7);
const skyPage = Color(0xFFE6F7FF);
const ink = Color(0xFF0F172A);
const muted = Color(0xFF64748B);
const warn = Color(0xFFB45309);

const titleStyle = TextStyle(fontSize: 22, height: 1.15, fontWeight: FontWeight.w700, color: ink, letterSpacing: -0.3);
const sectionStyle = TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: ink);
const bodyStyle = TextStyle(fontSize: 15, height: 1.35, color: ink);
const captionStyle = TextStyle(fontSize: 13, height: 1.35, color: muted);

ThemeData phoneTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: skyPage,
    colorScheme: ColorScheme.fromSeed(seedColor: skyDeep, primary: skyDeep, surface: Colors.white),
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: skyPage,
      elevation: 0,
      foregroundColor: ink,
      centerTitle: false,
      titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: ink),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      floatingLabelBehavior: FloatingLabelBehavior.always,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: const TextStyle(color: muted, fontSize: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF7DD3F0))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF7DD3F0), width: 1.2)),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: skyDeep, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDC2626))),
      focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDC2626), width: 1.4)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: skyDeep,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: sky,
      height: 72,
      labelTextStyle: WidgetStatePropertyAll(TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: ink,
      contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      titleTextStyle: titleStyle,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      showDragHandle: true,
    ),
    chipTheme: base.chipTheme.copyWith(
      selectedColor: sky,
      labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: ink),
      side: BorderSide.none,
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: skyDeep,
      foregroundColor: Colors.white,
      extendedTextStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
    ),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: _FadeSlideTransitionsBuilder(),
        TargetPlatform.iOS: _FadeSlideTransitionsBuilder(),
        TargetPlatform.windows: _FadeSlideTransitionsBuilder(),
      },
    ),
    textTheme: base.textTheme.apply(bodyColor: ink, displayColor: ink),
  );
}

class _FadeSlideTransitionsBuilder extends PageTransitionsBuilder {
  const _FadeSlideTransitionsBuilder();

  @override
  Widget buildTransitions<T>(PageRoute<T> route, BuildContext context, Animation<double> animation, Animation<double> secondaryAnimation, Widget child) {
    final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.03), end: Offset.zero).animate(curved),
        child: child,
      ),
    );
  }
}

BoxDecoration vaultCard() => BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      boxShadow: const [BoxShadow(color: Color(0x140284C7), blurRadius: 18, offset: Offset(0, 8))],
    );
