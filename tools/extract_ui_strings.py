import re
import pathlib

root = pathlib.Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\mobile\lib")
pat = re.compile(r"'((?:\\'|[^'])*)'|\"((?:\\\"|[^\"])*)\"")
out = pathlib.Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\tools\ui_strings.txt")
seen = set()
lines = []
sql = re.compile(r"\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|CREATE|TABLE|JOIN)\b", re.I)
for path in sorted(root.rglob("*.dart")):
    text = path.read_text(encoding="utf-8")
    for i, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("//"):
            continue
        for match in pat.finditer(line):
            val = match.group(1) if match.group(1) is not None else match.group(2)
            if not val or " " not in val.strip():
                continue
            if sql.search(val):
                continue
            if val.startswith("package:") or "http" in val and "://" in val and " " not in val:
                continue
            key = val.strip()
            if key in seen:
                continue
            seen.add(key)
            lines.append(f"{path.name}:{i}: {key}")
out.write_text("\n".join(lines), encoding="utf-8")
print(len(lines))
