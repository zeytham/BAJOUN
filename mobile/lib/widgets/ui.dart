import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../lang.dart';
import '../money.dart';
import '../theme.dart';
import 'contacts_pick.dart';

class Notices extends ChangeNotifier {
  Notices._();
  static final Notices i = Notices._();

  String? raw;
  bool bad = false;
  Timer? _hide;

  void show(String message, {required bool bad}) {
    raw = message;
    this.bad = bad;
    _hide?.cancel();
    if (!bad) _hide = Timer(const Duration(milliseconds: 2600), clear);
    notifyListeners();
  }

  void clear() {
    _hide?.cancel();
    if (raw == null) return;
    raw = null;
    notifyListeners();
  }

  void release(String message) {
    if (!bad || raw == null) return;
    if (raw == message || speak(raw!) == speak(message)) clear();
  }
}

class ChoiceRow extends StatelessWidget {
  const ChoiceRow({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
      child: Align(
        alignment: AlignmentDirectional.centerStart,
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: children,
        ),
      ),
    );
  }
}

class NoticeBar extends StatelessWidget {
  const NoticeBar({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([Notices.i, Lang.i]),
      builder: (context, _) {
        final raw = Notices.i.raw;
        if (raw == null) return const SizedBox.shrink();
        final bad = Notices.i.bad;
        final top = MediaQuery.paddingOf(context).top;
        return Material(
          color: bad ? const Color(0xFFDC2626) : skyDeep,
          child: Padding(
            padding: EdgeInsets.fromLTRB(14, top + 8, 4, 10),
            child: Row(
              children: [
                Icon(bad ? Icons.error_outline : Icons.check_circle_outline, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    speak(raw),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.25, fontWeight: FontWeight.w700),
                  ),
                ),
                IconButton(
                  onPressed: Notices.i.clear,
                  icon: const Icon(Icons.close, color: Colors.white, size: 20),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class LiveStrip extends StatelessWidget {
  const LiveStrip({super.key, required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: sky,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2.4, color: skyDeep),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(speak(text), style: const TextStyle(color: ink, fontWeight: FontWeight.w600))),
          ],
        ),
      ),
    );
  }
}

class BusyButton extends StatelessWidget {
  const BusyButton({super.key, required this.label, required this.onPressed, this.busy = false});
  final String label;
  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onPressed,
      child: busy
          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
          : Text(label),
    );
  }
}

class FaceBubble extends StatelessWidget {
  const FaceBubble({
    super.key,
    required this.name,
    this.bytes,
    this.radius = 24,
    this.color = skyDeep,
    this.letterColor = Colors.white,
  });

  final String name;
  final Uint8List? bytes;
  final double radius;
  final Color color;
  final Color letterColor;

  @override
  Widget build(BuildContext context) {
    final clean = name.trim();
    final letter = clean.isEmpty ? '?' : clean.substring(0, 1).toUpperCase();
    return CircleAvatar(
      radius: radius,
      backgroundColor: color,
      child: bytes == null
          ? Text(letter, style: TextStyle(color: letterColor, fontWeight: FontWeight.w700, fontSize: radius * 0.72))
          : ClipOval(
              child: Image.memory(
                bytes!,
                width: radius * 2,
                height: radius * 2,
                fit: BoxFit.cover,
                gaplessPlayback: true,
                frameBuilder: (context, child, frame, sync) {
                  if (sync || frame != null) return child;
                  return Center(
                    child: SizedBox(
                      width: radius,
                      height: radius,
                      child: CircularProgressIndicator(strokeWidth: 2, color: letterColor),
                    ),
                  );
                },
              ),
            ),
    );
  }
}

class TapScale extends StatefulWidget {
  const TapScale({super.key, required this.child, this.onTap, this.radius = 18, this.color = Colors.white});

  final Widget child;
  final VoidCallback? onTap;
  final double radius;
  final Color color;

  @override
  State<TapScale> createState() => _TapScaleState();
}

class _TapScaleState extends State<TapScale> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: _down ? 0.96 : 1,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      child: Material(
        color: widget.color,
        borderRadius: BorderRadius.circular(widget.radius),
        child: InkWell(
          onTap: widget.onTap,
          onHighlightChanged: (value) => setState(() => _down = value),
          borderRadius: BorderRadius.circular(widget.radius),
          child: widget.child,
        ),
      ),
    );
  }
}

class QuickCircle extends StatelessWidget {
  const QuickCircle({super.key, required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return TapScale(
      onTap: onTap,
      radius: 20,
      color: Colors.transparent,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: const BoxDecoration(color: sky, shape: BoxShape.circle),
            child: Icon(icon, color: ink, size: 24),
          ),
          const SizedBox(height: 6),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ink)),
        ],
      ),
    );
  }
}

class LangDots extends StatelessWidget {
  const LangDots({super.key, required this.current, required this.onPick, this.light = false});
  final String current;
  final ValueChanged<String> onPick;
  final bool light;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _mark('sw', 'SW'),
        _mark('en', 'EN'),
        _mark('ar', 'ع'),
      ],
    );
  }

  Widget _mark(String code, String mark) {
    final on = current == code;
    final inkOn = light ? Colors.white : (on ? Colors.white : skyDeep);
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Tooltip(
        message: code == 'sw' ? 'Kiswahili' : code == 'en' ? 'English' : 'العربية',
        child: InkWell(
          onTap: () => onPick(code),
          customBorder: const CircleBorder(),
          child: Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: on ? (light ? Colors.white24 : skyDeep) : (light ? Colors.transparent : Colors.white),
              shape: BoxShape.circle,
              border: Border.all(color: light ? Colors.white70 : (on ? skyDeep : const Color(0xFFD7E8D4))),
            ),
            child: Text(mark, style: TextStyle(color: inkOn, fontWeight: FontWeight.w800, fontSize: code == 'ar' ? 18 : 12)),
          ),
        ),
      ),
    );
  }
}

class LockedNote extends StatelessWidget {
  const LockedNote({super.key, required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 48, 16, 24),
      child: Column(
        children: [
          const Icon(Icons.lock_outline, size: 42, color: skyDeep),
          const SizedBox(height: 12),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: ink)),
          const SizedBox(height: 8),
          Text(
            tx('Sehemu hii haijawashwa kwa akaunti yako. Mmiliki anaichagua kwenye wafanyakazi.', 'This part is off for your account. The owner turns it on under staff.'),
            textAlign: TextAlign.center,
            style: const TextStyle(color: muted, height: 1.4),
          ),
        ],
      ),
    );
  }
}

class EmptyHint extends StatelessWidget {
  const EmptyHint({super.key, required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 12),
      child: Center(child: Text(text, textAlign: TextAlign.center, style: const TextStyle(color: muted, height: 1.4))),
    );
  }
}

Future<bool> confirm(BuildContext context, String title, String body) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(tx('Ghairi', 'Cancel'))),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(tx('Endelea', 'Continue'))),
      ],
    ),
  );
  return result == true;
}

void toast(BuildContext context, String message) {
  final raw = sourceOf(message);
  Notices.i.show(raw, bad: isProblem(raw));
}

class HoldPhoto extends StatelessWidget {
  const HoldPhoto({super.key, required this.bytes, this.fit = BoxFit.contain, this.empty});

  final Uint8List? bytes;
  final BoxFit fit;
  final Widget? empty;

  @override
  Widget build(BuildContext context) {
    if (bytes == null) return empty ?? const SizedBox.shrink();
    return Image.memory(
      bytes!,
      fit: fit,
      gaplessPlayback: true,
      filterQuality: FilterQuality.high,
      frameBuilder: (context, child, frame, sync) {
        if (sync || frame != null) return child;
        return const Center(
          child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: skyDeep)),
        );
      },
    );
  }
}

class SoftField extends StatefulWidget {
  const SoftField({
    super.key,
    required this.controller,
    required this.label,
    this.keyboard = TextInputType.text,
    this.obscure = false,
    this.readOnly = false,
    this.maxLength,
    this.digitsOnly = false,
    this.phone = false,
    this.contacts = false,
    this.nameWith,
    this.minDigits,
    this.rule,
  });

  final TextEditingController controller;
  final String label;
  final TextInputType keyboard;
  final bool obscure;
  final bool readOnly;
  final int? maxLength;
  final bool digitsOnly;
  final bool phone;
  final bool contacts;
  final TextEditingController? nameWith;
  final int? minDigits;
  final String? rule;

  @override
  State<SoftField> createState() => _SoftFieldState();
}

class _SoftFieldState extends State<SoftField> {
  late final FocusNode _focus;
  bool _checked = false;

  @override
  void initState() {
    super.initState();
    _focus = FocusNode()..addListener(_focusChanged);
    widget.controller.addListener(_changed);
  }

  @override
  void didUpdateWidget(SoftField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_changed);
      widget.controller.addListener(_changed);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_changed);
    _focus.removeListener(_focusChanged);
    _focus.dispose();
    super.dispose();
  }

  void _changed() {
    _releaseNotice();
    if (mounted) setState(() {});
  }

  void _releaseNotice() {
    final raw = Notices.i.raw;
    if (raw == null || !Notices.i.bad || _problem() != null) return;
    if (widget.rule != null) Notices.i.release(widget.rule!);
    if (widget.phone) {
      Notices.i.release(t('Namba ianze na 0 na iwe tarakimu 10.'));
      Notices.i.release('Number must start with 0 and have 10 digits.');
    }
    final current = Notices.i.raw;
    if (_focus.hasFocus && current != null && current.startsWith('Weka ') && widget.controller.text.trim().isNotEmpty) {
      Notices.i.clear();
    }
  }

  String? _problem() {
    final digits = widget.controller.text.replaceAll(RegExp(r'\D'), '');
    if (widget.phone) {
      if (digits.isEmpty) return null;
      if (!isTzPhone(digits)) return tx('Namba ianze na 0 na iwe tarakimu 10.', 'Number must start with 0 and have 10 digits.');
      return null;
    }
    if (widget.rule == null || widget.minDigits == null) return null;
    if (digits.isEmpty) return null;
    final maxDigits = widget.maxLength ?? 15;
    if (digits.length < widget.minDigits! || digits.length > maxDigits) return widget.rule;
    return null;
  }

  void _focusChanged() {
    if (!_focus.hasFocus && mounted) setState(() => _checked = true);
  }

  String? get _error => _checked ? _problem() : null;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      focusNode: _focus,
      textDirection: widget.phone || widget.digitsOnly ? TextDirection.ltr : null,
      keyboardType: widget.keyboard,
      obscureText: widget.obscure,
      readOnly: widget.readOnly,
      maxLength: widget.phone ? null : widget.maxLength,
      inputFormatters: [
        if (widget.phone) const _TzPhoneFormatter(),
        if (!widget.phone && widget.digitsOnly) FilteringTextInputFormatter.digitsOnly,
        if (!widget.phone && widget.maxLength != null) LengthLimitingTextInputFormatter(widget.maxLength),
      ],
      decoration: InputDecoration(
        labelText: widget.label,
        counterText: '',
        errorText: _error == null ? null : speak(_error!),
        errorMaxLines: 2,
        suffixIcon: widget.contacts
            ? IconButton(
                tooltip: t('Chagua contact'),
                onPressed: widget.readOnly
                    ? null
                    : () async {
                        final error = await fillFromContacts(context, widget.controller, name: widget.nameWith);
                        if (error != null && context.mounted) toast(context, error);
                      },
                icon: const Icon(Icons.contacts_outlined, color: skyDeep),
              )
            : null,
      ),
    );
  }
}

class _TzPhoneFormatter extends TextInputFormatter {
  const _TzPhoneFormatter();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final clipped = digits.length > 10 ? digits.substring(0, 10) : digits;
    final shown = clipped.isEmpty ? '' : _partial(clipped);
    return TextEditingValue(text: shown, selection: TextSelection.collapsed(offset: shown.length));
  }

  String _partial(String digits) {
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return '${digits.substring(0, 4)} ${digits.substring(4)}';
    return '${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}';
  }
}

class DialogField {
  const DialogField(this.label, {this.number = false, this.obscure = false, this.phone = false, this.maxLength});
  final String label;
  final bool number;
  final bool obscure;
  final bool phone;
  final int? maxLength;
}

class FieldDialog extends StatefulWidget {
  const FieldDialog({super.key, required this.title, required this.confirm, required this.fields});
  final String title;
  final String confirm;
  final List<DialogField> fields;

  @override
  State<FieldDialog> createState() => _FieldDialogState();
}

class _FieldDialogState extends State<FieldDialog> {
  late final List<TextEditingController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = [for (final _ in widget.fields) TextEditingController()];
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < widget.fields.length; i++) ...[
            if (i > 0) const SizedBox(height: 8),
            SoftField(
              controller: _controllers[i],
              label: widget.fields[i].label,
              keyboard: widget.fields[i].phone
                  ? TextInputType.phone
                  : (widget.fields[i].number ? TextInputType.number : TextInputType.text),
              obscure: widget.fields[i].obscure,
              digitsOnly: widget.fields[i].number,
              phone: widget.fields[i].phone,
              contacts: widget.fields[i].phone,
              nameWith: i > 0 && !widget.fields[i - 1].phone ? _controllers[i - 1] : null,
              maxLength: widget.fields[i].maxLength,
            ),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(tx('Ghairi', 'Cancel'))),
        FilledButton(
          onPressed: () {
            final values = [for (final controller in _controllers) controller.text];
            Navigator.pop(context, widget.fields.length == 1 ? values.first : values);
          },
          child: Text(widget.confirm),
        ),
      ],
    );
  }
}
