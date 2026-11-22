# -*- coding: utf-8 -*-
import re
from pathlib import Path

root = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\LaptopShop\mobile\lib")

def span_end(text, start):
    pairs = {"(": ")", "[": "]", "{": "}"}
    stack = []
    p = start
    while p < len(text):
        c = text[p]
        if c in pairs:
            stack.append(pairs[c])
        elif stack and c == stack[-1]:
            stack.pop()
            if not stack:
                return p
        p += 1
    return len(text) - 1

def strip_const(text):
    out = []
    i = 0
    while True:
        j = text.find("const ", i)
        if j < 0:
            out.append(text[i:])
            break
        k = j + 6
        q = k
        while q < len(text) and text[q] not in "([":
            if text[q] == "\n":
                break
            q += 1
        if q >= len(text) or text[q] not in "([":
            out.append(text[i:k])
            i = k
            continue
        end = span_end(text, q)
        chunk = text[q:end + 1]
        if "t(" in chunk:
            out.append(text[i:j])
            i = k
        else:
            out.append(text[i:k])
            i = k
    return "".join(out)

for path in root.rglob("*.dart"):
    original = path.read_text(encoding="utf-8")
    text = original
    text = text.replace("this.action = t('Ongeza kwenye kikapu')", "this.action = 'Ongeza kwenye kikapu'")
    text = text.replace("String priceLabel = t('Jumla')", "String priceLabel = 'Jumla'")
    text = text.replace("Text('$priceLabel ${tsh(price)}'", "Text('${t(priceLabel)} ${tsh(price)}'")
    text = re.sub(r"toast\(([^,\n]+), t\('((?:\\'|[^'])*)'\)\)", r"toast(\1, '\2')", text)
    text = re.sub(r"\?\? t\('((?:\\'|[^'])*)'\)", r"?? '\1'", text)
    text = text.replace(
        "const money = [t('jumla'), t('bei'), t('gharama'), 'faida', t('manunuzi'), t('baki'), t('deni'), 'kilicholipwa'];",
        "const money = ['jumla', 'bei', 'gharama', 'faida', 'manunuzi', 'baki', 'deni', 'kilicholipwa'];",
    )
    text = text.replace("String _label(String raw) => raw.replaceAll('_', ' ');", "String _label(String raw) => t(raw.replaceAll('_', ' '));")
    text = text.replace("  return value;\n}", "  return t(value);\n}")
    text = strip_const(text)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print("repaired", path.name)
