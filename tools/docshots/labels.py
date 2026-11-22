import re
import sys
text = open(sys.argv[1], encoding="utf-8").read()
for desc, bounds in re.findall(r'content-desc="([^"]*)"[^>]*bounds="(\[[^"]+\])"', text):
    if desc:
        print(desc.replace("&#10;", " / "), bounds)
