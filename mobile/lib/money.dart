import 'lang.dart';

bool isTzPhone(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  return digits.length == 10 && digits.startsWith('0');
}

String showPhone(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (!isTzPhone(digits)) return raw.trim().isEmpty ? '' : raw.trim();
  return marks('${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}');
}

String? whatsappDigits(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (!isTzPhone(digits)) return null;
  return '255${digits.substring(1)}';
}

const _arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

String marks(Object? value) {
  final text = '${value ?? ''}';
  if (!Lang.i.arabic) return text;
  final buffer = StringBuffer();
  for (final unit in text.codeUnits) {
    if (unit >= 48 && unit <= 57) {
      buffer.write(_arabicDigits[unit - 48]);
    } else {
      buffer.writeCharCode(unit);
    }
  }
  return buffer.toString();
}

String tsh(num value) {
  final digits = value.round().abs().toString();
  final buffer = StringBuffer(value < 0 ? '-' : '');
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  return marks('TSH $buffer');
}

String maskImei(String imei) {
  if (imei.length < 8) return '••••';
  return '${imei.substring(0, 4)} •••• ${imei.substring(imei.length - 4)}';
}

double asDouble(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? 0;
}

int asInt(Object? value) {
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

const _monthsSw = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
const _monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const _weekSw = ['Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili'];
const _weekEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const _weekAr = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

List<String> get _months => Lang.i.arabic ? _monthsAr : (Lang.i.english ? _monthsEn : _monthsSw);
List<String> get _weekdays => Lang.i.arabic ? _weekAr : (Lang.i.english ? _weekEn : _weekSw);

String formatLive(DateTime date) {
  final local = date.toLocal();
  final hh = local.hour.toString().padLeft(2, '0');
  final mm = local.minute.toString().padLeft(2, '0');
  return marks('${_weekdays[local.weekday - 1]}, ${local.day} ${_months[local.month - 1]} ${local.year} · $hh:$mm');
}

String formatWhen(String? iso) {
  final date = DateTime.tryParse(iso ?? '')?.toLocal();
  if (date == null) return '—';
  final hh = date.hour.toString().padLeft(2, '0');
  final mm = date.minute.toString().padLeft(2, '0');
  return marks('${date.day} ${_months[date.month - 1]} ${date.year}, $hh:$mm');
}

String formatDay(DateTime date) => marks('${date.day} ${_months[date.month - 1]} ${date.year}');

String methodLabel(String? method) {
  switch (method) {
    case 'CASH':
      return t('Cash');
    case 'LIPA':
    case 'MPESA':
      return t('Lipa Namba');
    case 'DENI':
      return tx('Deni', 'Debt');
    default:
      return method ?? '';
  }
}

String roleLabel(String? role) => role == 'OWNER' ? tx('Mmiliki', 'Owner') : tx('Muuzaji', 'Seller');

int warrantySpan(Map<String, Object?> row) {
  final days = asInt(row['warranty_days']);
  if (days > 0) return days;
  return asInt(row['warranty_months']) * 30;
}

String warrantyWords(int days) {
  if (days <= 0) return t('Hakuna warranty');
  final weeks = days ~/ 7;
  final rest = days % 7;
  if (weeks <= 0) return tf('siku {0}', ['$rest']);
  if (rest <= 0) return weeks == 1 ? t('wiki 1') : tf('wiki {0}', ['$weeks']);
  return tf('wiki {0} na siku {1}', ['$weeks', '$rest']);
}

String debtTermWords(int days, String unit) {
  if (days <= 0) return '';
  if (unit == 'WIKI') {
    final weeks = days ~/ 7;
    return weeks == 1 ? t('wiki 1') : tf('wiki {0}', ['$weeks']);
  }
  if (unit == 'MWEZI') {
    final months = days ~/ 30;
    return months == 1 ? t('mwezi 1') : tf('miezi {0}', ['$months']);
  }
  return tf('siku {0}', ['$days']);
}

int debtLateDays(Map<String, Object?> debt) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final due = DateTime.tryParse('${debt['due_at']}')?.toLocal();
  if (due != null) {
    final days = today.difference(DateTime(due.year, due.month, due.day)).inDays;
    return days < 0 ? 0 : days;
  }
  final opened = DateTime.tryParse('${debt['opened_at']}')?.toLocal();
  if (opened == null) return 0;
  return today.difference(DateTime(opened.year, opened.month, opened.day)).inDays;
}

String debtState(String? raw) {
  switch (raw) {
    case 'OPEN':
      return t('OPEN');
    case 'PAID':
      return t('PAID');
    case 'VOID':
      return t('VOID');
    default:
      return raw ?? '';
  }
}

bool sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

class DaySpan {
  const DaySpan(this.start, this.end);
  final DateTime start;
  final DateTime end;

  bool contains(DateTime when) {
    final day = DateTime(when.year, when.month, when.day);
    return !day.isBefore(start) && !day.isAfter(end);
  }

  String get label => sameDay(start, end) ? formatDay(start) : '${formatDay(start)} – ${formatDay(end)}';
}

String unitSpec(Map<String, Object?> row) {
  return [
    '${row['storage'] ?? ''}'.trim(),
    '${row['ram'] ?? ''}'.trim(),
    '${row['screen'] ?? ''}'.trim(),
    '${row['color'] ?? ''}'.trim(),
  ].where((part) => part.isNotEmpty).join(' · ');
}
