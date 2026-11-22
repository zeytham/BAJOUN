# -*- coding: utf-8 -*-
import re
from pathlib import Path

root = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\mobile\lib")
lex = (root / "lexicon.dart").read_text(encoding="utf-8")
keys = set(re.findall(r"^  '((?:\\'|[^'])*)': Phrase", lex, re.M))
keys = {k.replace("\\'", "'") for k in keys}
lit = re.compile(r"'((?:\\'|[^'])*)'")

files = [root / "main.dart", root / "widgets" / "ui.dart", root / "receipt_pdf.dart"]
files += sorted((root / "screens").glob("*.dart"))

def wrap_text(text):
    def sub(match):
        raw = match.group(1).replace("\\'", "'")
        if raw not in keys:
            return match.group(0)
        start = match.start()
        prev = text[max(0, start - 3):start]
        if prev.endswith("t(") or prev.endswith("x("):
            return match.group(0)
        line_start = text.rfind("\n", 0, start) + 1
        line = text[line_start:text.find("\n", start)]
        if "toast(" in line or "this.action" in line:
            return match.group(0)
        return "t('" + match.group(1) + "')"
    return lit.sub(sub, text)

def strip_const(text):
    lines = text.splitlines()
    for i, line in enumerate(lines):
        window = "\n".join(lines[i:i + 14])
        if "t(" not in window and "tf(" not in window:
            continue
        if "const Text(" in line and "t(" in line:
            line = line.replace("const Text(", "Text(")
        if "const EmptyHint(" in line:
            line = line.replace("const EmptyHint(", "EmptyHint(")
        if "const LockedNote(" in line:
            line = line.replace("const LockedNote(", "LockedNote(")
        if "const InputDecoration(" in line and "t(" in window:
            line = line.replace("const InputDecoration(", "InputDecoration(")
        if "const FieldDialog(" in line and "t(" in window:
            line = line.replace("const FieldDialog(", "FieldDialog(")
        if "const Scaffold(" in line and ("t(" in window or "tf(" in window):
            line = line.replace("const Scaffold(", "Scaffold(")
        if "const [" in line and "t(" in window:
            line = line.replace("const [", "[", 1)
        lines[i] = line
    return "\n".join(lines) + ("\n" if text.endswith("\n") else "")

def ensure_import(path, text):
    if "t(" not in text and "tf(" not in text:
        return text
    if "lang.dart" in text:
        return text
    use = "import 'lang.dart';\n" if path.name in {"main.dart", "receipt_pdf.dart"} else "import '../lang.dart';\n"
    lines = text.splitlines(keepends=True)
    last = 0
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last = i + 1
    lines.insert(last, use)
    return "".join(lines)

swaps = [
    ("'Imerudishwa ${tsh(returned)}'", "tf('Imerudishwa {0}', [tsh(returned)])"),
    ("'Deni ${tsh(balance)}'", "tf('Deni {0}', [tsh(balance)])"),
    ("'Thamani ${tsh(outcome.total)}'", "tf('Thamani {0}', [tsh(outcome.total)])"),
    ("'Rudisha pesa ${tsh(outcome.refund)}'", "tf('Rudisha pesa {0}', [tsh(outcome.refund)])"),
    ("'Deni lililobaki ${tsh(outcome.debtLeft)}'", "tf('Deni lililobaki {0}', [tsh(outcome.debtLeft)])"),
    ("'Rudisha ${widget.sale['invoice']}'", "tf('Rudisha {0}', [\"${widget.sale['invoice']}\"])"),
    ("'Iliyobaki $left'", "tf('Iliyobaki {0}', ['$left'])"),
    ("label: Text(item.$1)", "label: Text(t(item.$1))"),
    ("label: Text(item.$2)", "label: Text(t(item.$2))"),
    ("label: Text(unit.$2)", "label: Text(t(unit.$2))"),
    ("'Thibitisha · rudisha ${tsh(change)}'", "tf('Thibitisha · rudisha {0}', [tsh(change)])"),
    ("'Thibitisha · deni ${tsh(debt)}'", "tf('Thibitisha · deni {0}', [tsh(debt)])"),
    ("'Nayo ${product['stock']}'", "tf('Nayo {0}', ['${product['stock']}'])"),
    ("'Stoo ${product['stock']}'", "tf('Stoo {0}', ['${product['stock']}'])"),
    ("\"${line.name} · Matatizo\"", "\"${line.name} · ${t('Matatizo')}\""),
    ("'${line.name} · Matatizo'", "'${line.name} · ${t('Matatizo')}'"),
    ("'Bei ${tsh(line.price)} · ${tsh(line.lineTotal)}'", "tf('Bei {0} · {1}', [tsh(line.price), tsh(line.lineTotal)])"),
    ("'${open.length} wateja'", "tf('{0} wateja', ['${open.length}'])"),
    ("'Alikopa ${tsh(principal)}'", "tf('Alikopa {0}', [tsh(principal)])"),
    ("'Kilichokopwa ${tsh(asDouble(debt['principal']))}'", "tf('Kilichokopwa {0}', [tsh(asDouble(debt['principal']))])"),
    ("'Baki ${tsh(asDouble(debt['balance']))}'", "tf('Baki {0}', [tsh(asDouble(debt['balance']))])"),
    ("'Analipa baki yote ${tsh(asDouble(debt['balance']))}'", "tf('Analipa baki yote {0}', [tsh(asDouble(debt['balance']))])"),
    ("'Manunuzi ${tsh(asDouble(person['spent']))}'", "tf('Manunuzi {0}', [tsh(asDouble(person['spent']))])"),
    ("'Jumla ${tsh(price)}'", "tf('Jumla {0}', [tsh(price)])"),
    ("'Gharama ${tsh(asDouble(phone['cost']))}'", "tf('Gharama {0}', [tsh(asDouble(phone['cost']))])"),
    ("'Gharama ${tsh(asDouble(product['cost']))}'", "tf('Gharama {0}', [tsh(asDouble(product['cost']))])"),
    ("_chip('${category['name']}'", "_chip(t('${category['name']}')"),
    ("Text('${category['name']}')", "Text(t('${category['name']}'))"),
    ("Text('${group['name']}')", "Text(t('${group['name']}'))"),
    ("return '${row['name']}';", "return t('${row['name']}');"),
    ("Text('${note['title']}'", "Text(speak('${note['title']}')"),
    ("Text('${note['body']}'", "Text(speak('${note['body']}')"),
    ("'${debt['status']}'", "debtState('${debt['status']}')"),
    ("'Sababu: ${reason.trim()}'", "tf('Sababu: {0}', [reason.trim()])"),
    ("title: 'PIN ya ${person['name']}'", "title: tf('PIN ya {0}', [\"${person['name']}\"])"),
    ("'Futa ${person['name']}'", "tf('Futa {0}', [\"${person['name']}\"])"),
    ("'Umechagua $chosen'", "tf('Umechagua {0}', ['$chosen'])"),
    ("'Amerudi x$back'", "tf('Amerudi x{0}', ['$back'])"),
    ("'Nje x$left'", "tf('Nje x{0}', ['$left'])"),
    ("'Nje x${_left(item)}'", "tf('Nje x{0}', ['${_left(item)}'])"),
    ("'Aliyeandika ${wing['staff_name']}'", "tf('Aliyeandika {0}', [\"${wing['staff_name']}\"])"),
    ("'Idadi sasa: ${widget.current}'", "tf('Idadi sasa: {0}', ['${widget.current}'])"),
    ("'Itakuwa ${widget.current + adding}'", "tf('Itakuwa {0}', ['${widget.current + adding}'])"),
    ("String _label(String raw) => raw.replaceAll('_', ' ');", "String _label(String raw) => t(raw.replaceAll('_', ' '));"),
]

for path in files:
    text = path.read_text(encoding="utf-8")
    text = wrap_text(text)
    for old, new in swaps:
        text = text.replace(old, new)
    text = strip_const(text)
    text = ensure_import(path, text)
    path.write_text(text, encoding="utf-8")
    print(path.name)
