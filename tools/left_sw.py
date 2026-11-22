# -*- coding: utf-8 -*-
import re
from pathlib import Path

root = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\mobile\lib")
lex = (root / "lexicon.dart").read_text(encoding="utf-8")
keys = set()
for match in re.finditer(r"^  '((?:\\'|[^'])*)': Phrase", lex, re.M):
    keys.add(match.group(1).replace("\\'", "'"))
lit = re.compile(r"'((?:\\'|[^'])*)'")
sw = re.compile(r"[aeiou]{0,2}(ya|na |kwa |wa |za |ni |hakuna|weka|bado|ime|iliyo|duka|stoo|deni|mauzo|bidhaa|risiti|kundi|simu|faida|gharama)", re.I)
skip = {"t", "tx", "tf", "speak"}
for path in sorted((root / "screens").glob("*.dart")):
    text = path.read_text(encoding="utf-8")
    for i, line in enumerate(text.splitlines(), 1):
        if line.strip().startswith("//") or "import " in line:
            continue
        for match in lit.finditer(line):
            val = match.group(1)
            if " " not in val and val not in keys:
                continue
            if not sw.search(val) and val not in keys:
                continue
            start = match.start()
            name = ""
            if start > 0 and line[start - 1] == "(":
                j = start - 2
                while j >= 0 and (line[j].isalnum() or line[j] == "_"):
                    j -= 1
                name = line[j + 1:start - 1]
            if name in skip:
                continue
            if val in keys or sw.search(val):
                print(f"{path.name}:{i}: {val}")
