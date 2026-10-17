import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../money.dart';
import '../theme.dart';

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
      backgroundImage: bytes == null ? null : MemoryImage(bytes!),
      child: bytes == null
          ? Text(letter, style: TextStyle(color: letterColor, fontWeight: FontWeight.w700, fontSize: radius * 0.72))
          : null,
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
          const Text(
            'Sehemu hii haijawashwa kwa akaunti yako. Mmiliki anaichagua kwenye wafanyakazi.',
            textAlign: TextAlign.center,
            style: TextStyle(color: muted, height: 1.4),
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
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Ghairi')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Endelea')),
      ],
    ),
  );
  return result == true;
}

void toast(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
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
    if (mounted) setState(() {});
  }

  void _focusChanged() {
    if (!_focus.hasFocus && mounted) setState(() => _checked = true);
  }

  String? get _error {
    final digits = widget.controller.text.replaceAll(RegExp(r'\D'), '');
    if (widget.phone) {
      if (!_checked || digits.isEmpty) return null;
      if (!isTzPhone(digits)) return 'Namba ianze na 0 na iwe tarakimu 10.';
      return null;
    }
    if (!_checked || widget.rule == null || widget.minDigits == null) return null;
    if (digits.isEmpty) return null;
    final maxDigits = widget.maxLength ?? 15;
    if (digits.length < widget.minDigits! || digits.length > maxDigits) return widget.rule;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      focusNode: _focus,
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
        errorText: _error,
        errorMaxLines: 2,
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
              maxLength: widget.fields[i].maxLength,
            ),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Ghairi')),
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
