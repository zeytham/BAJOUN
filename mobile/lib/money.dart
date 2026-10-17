bool isTzPhone(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  return digits.length == 10 && digits.startsWith('0');
}

String showPhone(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (!isTzPhone(digits)) return raw.trim().isEmpty ? '' : raw.trim();
  return '${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}';
}

String? whatsappDigits(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (!isTzPhone(digits)) return null;
  return '255${digits.substring(1)}';
}

String tsh(num value) {
  final digits = value.round().abs().toString();
  final buffer = StringBuffer(value < 0 ? '-' : '');
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  return 'TSH $buffer';
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

const _months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
const _weekdays = ['Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili'];

String formatLive(DateTime date) {
  final local = date.toLocal();
  final hh = local.hour.toString().padLeft(2, '0');
  final mm = local.minute.toString().padLeft(2, '0');
  return '${_weekdays[local.weekday - 1]}, ${local.day} ${_months[local.month - 1]} ${local.year} · $hh:$mm';
}

String formatWhen(String? iso) {
  final date = DateTime.tryParse(iso ?? '')?.toLocal();
  if (date == null) return '—';
  final hh = date.hour.toString().padLeft(2, '0');
  final mm = date.minute.toString().padLeft(2, '0');
  return '${date.day} ${_months[date.month - 1]} ${date.year}, $hh:$mm';
}

String formatDay(DateTime date) => '${date.day} ${_months[date.month - 1]} ${date.year}';

String methodLabel(String? method) {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'LIPA':
    case 'MPESA':
      return 'Lipa Namba';
    case 'DENI':
      return 'Deni';
    default:
      return method ?? '';
  }
}

String roleLabel(String? role) => role == 'OWNER' ? 'Mmiliki' : 'Muuzaji';

bool sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;
