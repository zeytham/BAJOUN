# -*- coding: utf-8 -*-
import re
from pathlib import Path

root = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\mobile\lib")
lex = (root / "lexicon.dart").read_text(encoding="utf-8")
keys = set()
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

files = [root / "main.dart", root / "widgets" / "ui.dart", root / "receipt_pdf.dart", root / "money.dart"]
files += sorted((root / "screens").glob("*.dart"))
for path in files:
    original = path.read_text(encoding="utf-8")
    text = wrap(original)
    text = text.replace("Text('${group['name']}')", "Text(t('${group['name']}'))")
    text = text.replace("Text('${category['name']}')", "Text(t('${category['name']}'))")
    if text != original:
        path.write_text(text, encoding="utf-8")
        print("updated", path.name)
    else:
        print("same", path.name)
