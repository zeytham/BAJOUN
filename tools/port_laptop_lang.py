# -*- coding: utf-8 -*-
"""Port PhoneVault dictionary wiring into LaptopVault. One-shot."""
import re
import shutil
from pathlib import Path

phone = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\mobile\lib")
laptop = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\LaptopShop\mobile\lib")

shutil.copyfile(phone / "lexicon.dart", laptop / "lexicon.dart")
shutil.copyfile(phone / "lang.dart", laptop / "lang.dart")

extra = r'''
  'Faili hii si nakala ya LaptopVault.': Phrase('This file is not a LaptopVault copy.', 'هذا الملف ليس نسخة LaptopVault.'),
  'Kundi la laptop halifutiki.': Phrase('The laptop group cannot be deleted.', 'مجموعة اللابتوب لا تُحذف.'),
  'Weka jina la laptop au desktop.': Phrase('Enter the laptop or desktop name.', 'أدخل اسم اللابتوب أو الكمبيوتر.'),
  'Serial iwe herufi na tarakimu, 4 hadi 30.': Phrase('Serial must be letters and digits, 4 to 30.', 'الرقم التسلسلي حروف وأرقام، من 4 إلى 30.'),
  'Hali ya laptop si sahihi.': Phrase('Laptop condition is not valid.', 'حالة اللابتوب غير صحيحة.'),
  'Serial hii tayari ipo.': Phrase('That serial already exists.', 'هذا الرقم التسلسلي موجود.'),
  'Laptop haipo.': Phrase('Laptop is missing.', 'اللابتوب غير موجود.'),
  'Laptop iliyouzwa haiwezi kufutwa.': Phrase('A sold laptop cannot be deleted.', 'لا يمكن حذف لابتوب مباع.'),
  'Habari Zeyhaan, nahitaji msaada kuhusu LaptopVault.': Phrase('Hello Zeyhaan, I need help with LaptopVault.', 'مرحبا زيهان، أحتاج مساعدة بخصوص LaptopVault.'),
  'Weka serial': Phrase('Enter the serial', 'أدخل الرقم التسلسلي'),
  'Serial': Phrase('Serial', 'الرقم التسلسلي'),
  'Laptop': Phrase('Laptop', 'لابتوب'),
  'Desktop': Phrase('Desktop', 'كمبيوتر'),
  'laptop': Phrase('laptop', 'لابتوب'),
  'desktop': Phrase('desktop', 'كمبيوتر'),
  'serial': Phrase('serial', 'تسلسلي'),
  'Tafuta jina, serial au barcode': Phrase('Search name, serial or barcode', 'ابحث بالاسم أو الرقم التسلسلي أو الباركود'),
  'Tafuta jina au serial': Phrase('Search name or serial', 'ابحث بالاسم أو الرقم التسلسلي'),
  'Skani serial': Phrase('Scan serial', 'امسح الرقم التسلسلي'),
  'Serial hii haipo kwenye duka.': Phrase('This serial is not in the shop.', 'هذا الرقم التسلسلي غير موجود في الدكان.'),
  'Kamera haijawaka. Andika serial hapa chini, au jaribu tena.': Phrase('The camera is off. Type the serial below, or try again.', 'الكاميرا مطفأة. اكتب الرقم التسلسلي في الأسفل، أو حاول مرة أخرى.'),
  'Serial au barcode': Phrase('Serial or barcode', 'الرقم التسلسلي أو باركود'),
  'laptop-tatizo': Phrase('laptop fault', 'عطل لابتوب'),
'''

lex_path = laptop / "lexicon.dart"
lex = lex_path.read_text(encoding="utf-8")
if "LaptopVault." not in lex:
    lex = lex.rstrip()
    if lex.endswith("};"):
        lex = lex[:-2].rstrip() + "\n" + extra + "};\n"
        lex_path.write_text(lex, encoding="utf-8")

# Merge laptop-only English fallbacks into _exact.
old = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\LaptopShop\mobile\lib\lang.dart")
# lang was overwritten; recover extras from the phone copy we just wrote plus a saved snapshot
# The snapshot is the previous laptop lang, kept below as a constant list of lines we still want.
# Read current (phone) lang and append missing keys if absent.
lang = (laptop / "lang.dart").read_text(encoding="utf-8")
fallbacks = {
    "Faili hii si nakala ya LaptopVault.": "This file is not a LaptopVault copy.",
    "Kundi la laptop halifutiki.": "The laptop group cannot be deleted.",
    "Weka jina la laptop au desktop.": "Enter the laptop or desktop name.",
    "Serial iwe herufi na tarakimu, 4 hadi 30.": "Serial must be letters and digits, 4 to 30.",
    "Hali ya laptop si sahihi.": "Laptop condition is not valid.",
    "Serial hii tayari ipo.": "That serial already exists.",
    "Laptop haipo.": "Laptop is missing.",
    "Laptop iliyouzwa haiwezi kufutwa.": "A sold laptop cannot be deleted.",
}
missing = []
for sw, en in fallbacks.items():
    if sw not in lang:
        missing.append(f"  '{sw}': '{en}',")
if missing and "const _exact = <String, String>{" in lang:
    lang = lang.replace("const _exact = <String, String>{\n", "const _exact = <String, String>{\n" + "\n".join(missing) + "\n", 1)
    (laptop / "lang.dart").write_text(lang, encoding="utf-8")

keys = set()
lex = lex_path.read_text(encoding="utf-8")
for match in re.finditer(r"^  '((?:\\'|[^'])*)': Phrase", lex, re.M):
    keys.add(match.group(1).replace("\\'", "'").replace("\\$", "$").replace("\\\\", "\\"))

lit = re.compile(r"'((?:\\'|[^'])*)'")
skip_names = {"t", "tx", "tf", "speak"}

def wrap(text):
    parts = []
    last = 0
    for match in lit.finditer(text):
        raw = match.group(1).replace("\\'", "'").replace("\\$", "$").replace("\\\\", "\\")
        if raw not in keys:
            continue
        start = match.start()
        if start > 0 and text[start - 1] == "(":
            j = start - 2
            while j >= 0 and (text[j].isalnum() or text[j] == "_"):
                j -= 1
            if text[j + 1:start - 1] in skip_names:
                continue
        parts.append(text[last:start])
        parts.append("t('" + match.group(1) + "')")
        last = match.end()
    parts.append(text[last:])
    return "".join(parts)

files = [laptop / "main.dart", laptop / "widgets" / "ui.dart", laptop / "receipt_pdf.dart", laptop / "money.dart", laptop / "whatsapp.dart"]
files += sorted((laptop / "screens").glob("*.dart"))
for path in files:
    original = path.read_text(encoding="utf-8")
    text = wrap(original)
    text = text.replace("Text('${group['name']}')", "Text(t('${group['name']}'))")
    text = text.replace("Text('${category['name']}')", "Text(t('${category['name']}'))")
    if "import 'lang.dart';" not in text and "import '../lang.dart';" not in text and path.name in {"whatsapp.dart", "receipt_pdf.dart"}:
        text = "import 'lang.dart';\n" + text
    if text != original:
        path.write_text(text, encoding="utf-8")
        print("wrapped", path.name)

print("keys", len(keys))
