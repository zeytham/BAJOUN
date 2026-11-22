import 'package:flutter/material.dart';

import 'lang.dart';
import 'money.dart';

Future<DaySpan?> pickDaySpan(BuildContext context, {DaySpan? current}) async {
  final now = DateTime.now();
  final first = DateTime(2016);
  final last = DateTime(now.year + 1, 12, 31);
  final from = await showDatePicker(
    context: context,
    initialDate: current?.start ?? now,
    firstDate: first,
    lastDate: last,
    helpText: t('Kuanzia'),
    cancelText: t('Ghairi'),
    confirmText: t('Weka'),
  );
  if (from == null || !context.mounted) return null;
  final to = await showDatePicker(
    context: context,
    initialDate: current?.end ?? from,
    firstDate: first,
    lastDate: last,
    helpText: t('Mpaka'),
    cancelText: t('Ghairi'),
    confirmText: t('Weka'),
  );
  if (to == null) return null;
  final start = DateTime(from.year, from.month, from.day);
  final end = DateTime(to.year, to.month, to.day);
  if (end.isBefore(start)) return DaySpan(end, start);
  return DaySpan(start, end);
}
