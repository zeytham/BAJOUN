import 'package:flutter/foundation.dart';

import 'lexicon.dart';

class Lang extends ChangeNotifier {
  Lang._();
  static final Lang i = Lang._();

  String code = 'sw';
  bool get english => code == 'en';
  bool get arabic => code == 'ar';

  void apply(String next) {
    final value = next == 'en' || next == 'ar' ? next : 'sw';
    if (value == code) return;
    code = value;
    notifyListeners();
  }
}

String tx(String sw, String en) {
  if (Lang.i.english) return en;
  if (Lang.i.arabic) return lexicon[sw]?.ar ?? en;
  return sw;
}

final _fold = <String, Phrase>{};
void _fillFold() {
  for (final entry in lexicon.entries) {
    _fold.putIfAbsent(entry.key.toLowerCase(), () => entry.value);
  }
}

String t(String sw) {
  if (_fold.isEmpty) _fillFold();
  final row = lexicon[sw] ?? _fold[sw.toLowerCase()];
  if (row == null || Lang.i.code == 'sw') return sw;
  return Lang.i.arabic ? row.ar : row.en;
}

String tf(String sw, List<Object?> args) {
  var text = t(sw);
  for (var i = 0; i < args.length; i++) {
    text = text.replaceAll('{$i}', '${args[i]}');
  }
  if (!Lang.i.arabic) return text;
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  final buffer = StringBuffer();
  for (final unit in text.codeUnits) {
    if (unit >= 48 && unit <= 57) {
      buffer.write(arabic[unit - 48]);
    } else {
      buffer.writeCharCode(unit);
    }
  }
  return buffer.toString();
}

String sourceOf(String message) {
  if (lexicon.containsKey(message)) return message;
  for (final entry in lexicon.entries) {
    if (entry.value.en == message || entry.value.ar == message) return entry.key;
  }
  return message;
}

String speak(String message) {
  if (Lang.i.code == 'sw') return message;
  final row = lexicon[message];
  if (row != null) return Lang.i.arabic ? row.ar : row.en;
  if (Lang.i.english) {
    final exact = _exact[message];
    if (exact != null) return exact;
  }
  return _fit(message) ?? message;
}

bool isProblem(String message) {
  final text = message.toLowerCase();
  const ok = [
    'imehifadhiwa',
    'yamehifadhiwa',
    'risiti imefutwa',
    'limehifadhiwa',
    'zimehifadhiwa',
    'imebadilika',
    'imeongezwa',
    'imeondolewa',
    'imenakiliwa',
    'imefunguka',
    'iko juu ya risiti',
    'iko kwenye dashibodi',
    'zimerudi',
    'anaweza kuingia',
    'kundi hili lipo',
    'sehemu imerudi',
    'bidhaa zote zimerudi',
    'imesitishwa',
    'historia imefichwa',
    'imefichwa',
    'yameondolewa',
    'limeondolewa',
    'historia imeonekana',
    'nakala iko tayari',
    'nakala imerudi',
  ];
  for (final piece in ok) {
    if (text.contains(piece)) return false;
  }
  return true;
}

String _pick(String en, String ar) => Lang.i.arabic ? ar : en;

String? _fit(String message) {
  final wait = RegExp(r'^Subiri sekunde (\d+)\.$').firstMatch(message);
  if (wait != null) return _pick('Wait ${wait.group(1)} seconds.', 'انتظر ${wait.group(1)} ثانية.');
  final many = RegExp(r'^Majaribio mengi\. Subiri sekunde (\d+)\.$').firstMatch(message);
  if (many != null) return _pick('Too many tries. Wait ${many.group(1)} seconds.', 'محاولات كثيرة. انتظر ${many.group(1)} ثانية.');
  final stock = RegExp(r'^Stoo ya (.+) haitoshi\.$').firstMatch(message);
  if (stock != null) return _pick('Not enough ${stock.group(1)} in stock.', 'كمية ${stock.group(1)} لا تكفي.');
  final sold = RegExp(r'^(.+) tayari imeuza\.$').firstMatch(message);
  if (sold != null) return _pick('${sold.group(1)} is already sold.', '${sold.group(1)} مباع بالفعل.');
  final over = RegExp(r'^(.+) imezidi idadi iliyouzwa\.$').firstMatch(message);
  if (over != null) return _pick('${over.group(1)} is more than the quantity sold.', '${over.group(1)} أكثر من الكمية المباعة.');
  final back = RegExp(r'^(.+) haiwezi kurudi\. Tayari haiko kama iliyouzwa\.$').firstMatch(message);
  if (back != null) return _pick('${back.group(1)} cannot come back. It is no longer sold.', '${back.group(1)} لا يمكن إرجاعه. لم يعد مباعاً.');
  final wing = RegExp(r'^(.+) imezidi idadi iliyo nje\.$').firstMatch(message);
  if (wing != null) return _pick('${wing.group(1)} is more than the quantity still out.', '${wing.group(1)} أكثر من الكمية الخارجة.');
  final added = RegExp(r'^Idadi imeongezwa\. Sasa ni (\d+)\.$').firstMatch(message);
  if (added != null) return _pick('Quantity added. It is now ${added.group(1)}.', 'تمت إضافة الكمية. أصبحت ${added.group(1)}.');
  final staff = RegExp(r'^(.+) anaweza kuingia sasa$').firstMatch(message);
  if (staff != null) return _pick('${staff.group(1)} can sign in now.', '${staff.group(1)} يمكنه الدخول الآن.');
  final sellStaff = RegExp(r'^(.+) anaweza kuuza kwa PIN yake\.$').firstMatch(message);
  if (sellStaff != null) return _pick('${sellStaff.group(1)} can sell with this PIN.', '${sellStaff.group(1)} يمكنه البيع برقم PIN هذا.');
  final days = RegExp(r'^Bado hakuna mauzo katika siku (\d+) zilizopita\. Uza bidhaa ya kwanza ili grafu ianze\.$').firstMatch(message);
  if (days != null) return _pick('No sales in the last ${days.group(1)} days. Sell one item and the chart starts.', 'لا مبيعات في آخر ${days.group(1)} يوماً. بع قطعة واحدة ليبدأ الرسم.');
  final low = RegExp(r'^(.+) zimebaki (\d+)\.$').firstMatch(message);
  if (low != null) return _pick('${low.group(1)} left: ${low.group(2)}.', 'المتبقي من ${low.group(1)}: ${low.group(2)}.');
  final owed = RegExp(r'^(.+) anadaiwa TSH (\d+) kwenye (.+)\.$').firstMatch(message);
  if (owed != null) return _pick('${owed.group(1)} owes TSH ${owed.group(2)} on ${owed.group(3)}.', '${owed.group(1)} عليه TSH ${owed.group(2)} في ${owed.group(3)}.');
  final paid = RegExp(r'^(.+) amelipa TSH (\d+)\. Baki TSH (\d+)\.$').firstMatch(message);
  if (paid != null) return _pick('${paid.group(1)} paid TSH ${paid.group(2)}. Balance TSH ${paid.group(3)}.', '${paid.group(1)} دفع TSH ${paid.group(2)}. المتبقي TSH ${paid.group(3)}.');
  final took = RegExp(r'^(.+) amechukua bidhaa\. (.+)\.$').firstMatch(message);
  if (took != null) return _pick('${took.group(1)} took items. ${took.group(2)}.', '${took.group(1)} أخذ بضاعة. ${took.group(2)}.');
  final cloud = RegExp(r'^Cloud imejibu (\d+)\.$').firstMatch(message);
  if (cloud != null) return _pick('Cloud replied ${cloud.group(1)}.', 'السحابة ردت ${cloud.group(1)}.');
  final missing = RegExp(r'^(.+) haiko dukani\.$').firstMatch(message);
  if (missing != null) return _pick('${missing.group(1)} is not in the shop.', '${missing.group(1)} غير موجود في الدكان.');
  final voided = RegExp(r'^(.+) imefutwa\. Bidhaa zimerudi kwenye stoo au matatizo\.$').firstMatch(message);
  if (voided != null) return _pick('${voided.group(1)} was voided. Items went back to stock or faults.', 'أُلغي ${voided.group(1)}. السلع رجعت للمخزون أو الأعطال.');
  return null;
}

const _exact = <String, String>{
  'Akaunti haipo.': 'Account is missing.',
  'Weka jina la mmiliki.': 'Enter the owner name.',
  'PIN iwe tarakimu 4.': 'PIN must be 4 digits.',
  'Hiki ni kwa mmiliki tu.': 'Owner only.',
  'Hakuna bidhaa yenye msimbo huo.': 'No item with that code.',
  'Huna ruhusa.': 'Not allowed.',
  'Huna ruhusa ya wateja.': 'Customers are not allowed.',
  'Weka jina la mteja.': 'Enter the customer name.',
  'Namba ianze na 0 na iwe tarakimu 10.': 'Number must start with 0 and have 10 digits.',
  'Huna ruhusa ya madeni.': 'Debts are not allowed.',
  'Ingia kwanza.': 'Sign in first.',
  'Weka jina la duka.': 'Enter the shop name.',
  'Lipa Namba iwe tarakimu 5 hadi 15.': 'Lipa number must be 5 to 15 digits.',
  'Simu ya duka ianze na 0 na iwe tarakimu 10.': 'Shop phone must start with 0 and have 10 digits.',
  'Picha haikusomeka. Chagua JPG au PNG.': 'Picture could not be read. Choose JPG or PNG.',
  'Weka anwani ya kompyuta.': 'Enter the shop address.',
  'Anwani imehifadhiwa kwenye simu hii. Seva haijapokea duka. Angalia mtandao na uhifadhi tena.': 'Address saved on this phone. The server did not receive the shop. Check the network and save again.',
  'Weka anwani na neno la kuunganisha.': 'Enter the address and the connecting word.',
  'Anwani ianze na https://': 'Address must start with https://',
  'Neno au mtandao umekataa. Angalia neno na ujaribu tena.': 'The word or the network refused. Check the word and try again.',
  'Duka bado halijatumwa. Fungua simu ya mmiliki yenye mauzo, weka anwani na neno, kisha hifadhi.': 'The shop has not been sent yet. Open the owner phone, enter the address and the word, then save.',
  'Weka jina la muuzaji.': 'Enter the seller name.',
  'Jina hili tayari lipo.': 'That name already exists.',
  'Huwezi kufunga akaunti ya mmiliki.': 'The owner account stays open.',
  'Badilisha PIN yako kwenye sehemu ya PIN yangu.': 'Change your PIN under My PIN.',
  'Maneno hayafanani.': 'The words do not match.',
  'Neno liwe herufi 8 hadi 40.': 'The word must be 8 to 40 letters.',
  'Neno liwe na herufi, si tarakimu peke yake.': 'The word needs a letter.',
  'Usiandike neno la kuunganisha.': 'Do not type the connecting word here.',
  'PIN hazifanani.': 'The PINs do not match.',
  'Bado hakuna neno la kurejesha.': 'No recovery word yet.',
  'Neno si sahihi.': 'Wrong word.',
  'Akaunti ya mmiliki haipo.': 'Owner account is missing.',
  'PIN mpya iwe tarakimu 4.': 'New PIN must be 4 digits.',
  'Chagua PIN tofauti.': 'Choose a different PIN.',
  'Mmiliki ana sehemu zote.': 'The owner already has every part.',
  'PIN si sahihi.': 'Wrong PIN.',
  'Huna ruhusa ya kubadilisha stoo.': 'You cannot change stock.',
  'Faili hii si nakala ya PhoneVault.': 'This file is not a PhoneVault copy.',
  'Nakala hii inatoka kwenye toleo jipya. Sasisha app kwanza.': 'This copy is from a newer app. Update the app first.',
  'Nakala haikurejeshwa. Duka la awali limebaki.': 'The copy was not restored. The shop stayed as it was.',
  'Kundi la simu halifutiki.': 'The phone group cannot be deleted.',
  'Kundi halipo.': 'Group is missing.',
  'Kundi la Nyingine linabaki kwa bidhaa zisizo na kundi.': 'The Other group stays for items with no group.',
  'Mteja haipo.': 'Customer is missing.',
  'Ana deni wazi. Pokea malipo kwanza.': 'This customer still has a debt. Receive the payment first.',
  'Weka idadi unayoongeza.': 'Enter the quantity to add.',
  'Bidhaa haipo.': 'Item is missing.',
  'Idadi si sahihi.': 'Quantity is not valid.',
  'Kiwango cha onyo si sahihi.': 'The warning level is not valid.',
  'Warranty iwe siku 0 hadi 730, kwa wiki na siku.': 'Warranty must be 0 to 730 days.',
  'Idadi yenye matatizo si sahihi.': 'Faulty quantity is not valid.',
  'Barcode si sahihi.': 'Barcode is not valid.',
  'Barcode hii tayari ipo.': 'That barcode already exists.',
  'Weka jina la bidhaa.': 'Enter the item name.',
  'Weka jina la simu.': 'Enter the phone name.',
  'IMEI iwe tarakimu 8 hadi 20.': 'IMEI must be 8 to 20 digits.',
  'Bei ya chini si sahihi.': 'Minimum price is not valid.',
  'Hali ya simu si sahihi.': 'Phone condition is not valid.',
  'IMEI hii tayari ipo.': 'That IMEI already exists.',
  'Simu haipo.': 'Phone is missing.',
  'Simu iliyouzwa haiwezi kufutwa.': 'A sold phone cannot be deleted.',
  'Deni halipo.': 'Debt is missing.',
  'Deni hili tayari limefungwa.': 'This debt is already closed.',
  'Weka kiasi.': 'Enter the amount.',
  'Kiasi kinazidi deni lililobaki.': 'The amount is more than the balance.',
  'Risiti haipo.': 'Receipt is missing.',
  'Risiti tayari imefutwa.': 'Receipt is already void.',
  'Risiti hii ina marejesho. Rudisha kilichobaki, usifute risiti.': 'This receipt has a return. Return what is left. Do not void it.',
  'Deni lina malipo. Huwezi kufuta risiti hii.': 'The debt has a payment. This receipt cannot be voided.',
  'Weka jina la mtu aliyechukua.': 'Enter the name of the person who took it.',
  'Chagua bidhaa aliyochukua.': 'Choose the item they took.',
  'Rekodi haipo.': 'Record is missing.',
  'Bidhaa hizi zimesharudishwa.': 'These items are already back.',
  'Chagua idadi anayorudisha.': 'Choose the quantity coming back.',
  'Bei si sahihi.': 'Price is not valid.',
  'Gharama si sahihi.': 'Cost is not valid.',
  'Bidhaa haipo kwenye risiti.': 'Item is not on the receipt.',
  'Picha haikufunguka.': 'The picture did not open.',
  'Andika bei ya kuuza.': 'Enter the selling price.',
  'Namba imenakiliwa': 'Number copied.',
  'Duka limehifadhiwa': 'Shop saved.',
  'Logo iko juu ya risiti.': 'Logo is on the receipt.',
  'Picha yako iko kwenye dashibodi.': 'Your photo is on the home screen.',
  'PIN imebadilika': 'PIN changed.',
  'Neno la kurejesha limehifadhiwa. Usipeane kwa muuzaji.': 'Recovery word saved. Do not give it to the seller.',
  'Sehemu zimehifadhiwa': 'Parts saved.',
  'Imeondolewa. Historia inabaki.': 'Removed. The history stays.',
  'Kundi hili lipo tayari.': 'That group already exists.',
  'Kundi limeongezwa.': 'Group added.',
  'Sehemu imerudi stoo. Iliyobaki bado iko nje.': 'Part is back in stock. The rest is still out.',
  'Bidhaa zote zimerudi stoo.': 'All items are back in stock.',
  'WhatsApp imefunguka. Bonyeza Tuma kumkumbusha mteja.': 'WhatsApp is open. Press Send to remind the customer.',
  'WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.': 'WhatsApp is open for this number. Press Send.',
  'Inatuma mabadiliko...': 'Sending changes...',
  'Inaleta mabadiliko...': 'Bringing changes...',
  'Inaweka logo...': 'Setting the logo...',
  'Inaondoa logo...': 'Removing the logo...',
  'Inaweka picha...': 'Setting the photo...',
  'Inaondoa picha...': 'Removing the photo...',
  'PIN ya mmiliki imebadilika. Chagua mmiliki, kisha ingia na PIN mpya.': 'Owner PIN changed. Choose the owner, then sign in with the new PIN.',
  'Duka halikufunguka. Fungua tena.': 'The shop did not open. Open the app again.',
};
