import 'package:flutter/material.dart';

import 'lang.dart';
import 'money.dart';

Future<DaySpan?> pickDaySpan(BuildContext context, {DaySpan? current}) async {
  final now = DateTime.now();
  final first = DateTime(2016);
  final last = DateTime(now.year + 1, 12, 31);
  final from = await _pickDay(context, current?.start ?? now, first, last, t('Kuanzia'));
  if (from == null || !context.mounted) return null;
  final to = await _pickDay(context, current?.end ?? from, first, last, t('Mpaka'));
  if (to == null) return null;
  final start = DateTime(from.year, from.month, from.day);
  final end = DateTime(to.year, to.month, to.day);
  if (end.isBefore(start)) return DaySpan(end, start);
  return DaySpan(start, end);
}

Future<DateTime?> _pickDay(BuildContext context, DateTime initial, DateTime first, DateTime last, String help) {
  final arabic = Lang.i.code == 'ar';
  return showDatePicker(
    context: context,
    initialDate: initial,
    firstDate: first,
    lastDate: last,
    helpText: help,
    cancelText: t('Ghairi'),
    confirmText: t('Weka'),
    locale: arabic ? const Locale('ar') : null,
    builder: (context, child) => Directionality(
      textDirection: arabic ? TextDirection.rtl : TextDirection.ltr,
      child: child ?? const SizedBox.shrink(),
    ),
  );
}
