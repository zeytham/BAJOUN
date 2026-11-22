"""PhoneVault pitch. Seven slides. Real app screens. No invented market figures."""

import os

from PIL import Image, ImageDraw, ImageFilter
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Inches, Pt

ROOT = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system"
SHOTS = os.path.join(ROOT, "tools", "docshots")
FRAMES = os.path.join(ROOT, "posters", "frames")
OUT = os.path.join(ROOT, "PhoneVault-Pitch-Soko.pptx")

PAPER = RGBColor(0xF6, 0xF3, 0xEC)
INK = RGBColor(0x1C, 0x19, 0x17)
MUTED = RGBColor(0x5C, 0x56, 0x4E)
DEEP = RGBColor(0x1F, 0x5C, 0x28)
MID = RGBColor(0x3E, 0x8F, 0x45)
WASH = RGBColor(0xE7, 0xF3, 0xE4)
LINE = RGBColor(0xE3, 0xDC, 0xD0)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

os.makedirs(FRAMES, exist_ok=True)


def handset(name, scale=2.4):
    """White phone, real screenshot, soft shadow. Bottom system buttons cropped off."""
    src = Image.open(os.path.join(SHOTS, name + ".png")).convert("RGB")
    w, h = src.size
    src = src.crop((0, 70, w, h - 150))
    outer_w = int(430 * scale)
    pad = int(14 * scale)
    radius = int(36 * scale)
    inner_w = outer_w - pad * 2
    inner_h = int(src.height * inner_w / src.width)
    screen = src.resize((inner_w, inner_h), Image.Resampling.LANCZOS)
    outer_h = inner_h + pad * 2
    shadow = int(28 * scale)
    canvas = Image.new("RGBA", (outer_w + shadow, outer_h + shadow), (0, 0, 0, 0))
    shade = Image.new("RGBA", (outer_w, outer_h), (0, 0, 0, 0))
    ImageDraw.Draw(shade).rounded_rectangle(
        (0, 0, outer_w - 1, outer_h - 1), radius=radius, fill=(28, 25, 23, 70)
    )
    shade = shade.filter(ImageFilter.GaussianBlur(int(10 * scale)))
    canvas.paste(shade, (shadow // 2, shadow // 2), shade)
    body = Image.new("RGBA", (outer_w, outer_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(body)
    draw.rounded_rectangle((0, 0, outer_w - 1, outer_h - 1), radius=radius, fill=(255, 255, 255, 255))
    mask = Image.new("L", (inner_w, inner_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, inner_w - 1, inner_h - 1), radius=int(22 * scale), fill=255
    )
    body.paste(screen, (pad, pad), mask)
    canvas.paste(body, (0, 0), body)
    path = os.path.join(FRAMES, name + ".png")
    canvas.save(path)
    return path


PHONE_STOO = handset("stoo")
PHONE_ZAIDI = handset("zaidi")
PHONE_RIPOTI = handset("ripoti")

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
prs.core_properties.title = "PhoneVault"
prs.core_properties.author = "Zeyhaan Tech Solution"
prs.core_properties.subject = "PhoneVault pitch"


def blank():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    rect(slide, 0, 0, prs.slide_width, prs.slide_height, PAPER)
    rect(slide, 0, 0, Inches(0.08), prs.slide_height, DEEP)
    return slide


def rect(slide, x, y, w, h, fill):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.fill.background()
    return shape


def text(slide, value, x, y, w, h, size, color, bold=False, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(x, y, w, h)
    frame = box.text_frame
    frame.word_wrap = True
    frame.auto_size = None
    p = frame.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = value
    run.font.name = "Calibri"
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return box


def lines(slide, rows, x, y, w, h, size, color, bold=False, gap=6):
    box = slide.shapes.add_textbox(x, y, w, h)
    frame = box.text_frame
    frame.word_wrap = True
    for i, row in enumerate(rows):
        p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.space_after = Pt(gap)
        run = p.add_run()
        run.text = row
        run.font.name = "Calibri"
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = color
    return box


def note(slide, value):
    slide.notes_slide.notes_text_frame.text = value


def footer(slide, n):
    rect(slide, Inches(0.55), Inches(7.05), Inches(12.2), Emu(6350), LINE)
    text(slide, "Zeyhaan Tech Solution", Inches(0.55), Inches(7.1), Inches(6), Inches(0.32), 12, MUTED)
    text(slide, f"{n}  /  7", Inches(10.4), Inches(7.1), Inches(2.35), Inches(0.32), 12, DEEP, True, PP_ALIGN.RIGHT)


def kicker(slide, value, y=0.38):
    text(slide, value, Inches(0.62), Inches(y), Inches(8), Inches(0.32), 13, MID, True)


# 1. The story, with the real stock screen.
s = blank()
kicker(s, "THE STORY", 1.15)
lines(
    s,
    [
        "The seller had to sell.",
        "The owner was not in the shop.",
        "The debt was on paper.",
        "The network could drop.",
    ],
    Inches(0.62),
    Inches(1.55),
    Inches(7.4),
    Inches(3.6),
    32,
    INK,
    True,
    10,
)
text(
    s,
    "The sale still had to be written down.",
    Inches(0.62),
    Inches(5.35),
    Inches(7.2),
    Inches(0.45),
    20,
    MUTED,
)
s.shapes.add_picture(PHONE_STOO, Inches(9.55), Inches(0.42), Inches(3.15))
footer(s, 1)
note(
    s,
    "Sema taratibu. Simu upande wa kulia ni Stoo halisi ya PhoneVault. "
    "Usisome orodha. Mwisho: mauzo yalipaswa kuandikwa hata hivyo.",
)

# 2. Three gaps.
s = blank()
kicker(s, "THREE GAPS.  ONE SHOP.")
text(s, "The book could not be in two places.", Inches(0.62), Inches(0.78), Inches(11), Inches(0.6), 32, INK, True)
gaps = [
    ("01", "The book", "Stock, sales, and debt lived on paper. Paper stays with one person."),
    ("02", "Two people", "The seller is in the shop. The owner is somewhere else. Both need the same book."),
    ("03", "The network", "The sale does not wait for a signal. If the line drops, the shop still has to sell."),
]
for i, (num, title, body) in enumerate(gaps):
    y = 1.85 + i * 1.55
    rect(s, Inches(0.62), Inches(y), Inches(0.08), Inches(1.15), MID)
    text(s, num, Inches(0.95), Inches(y - 0.06), Inches(1.1), Inches(0.45), 22, MID, True)
    text(s, title, Inches(2.15), Inches(y - 0.06), Inches(9.5), Inches(0.45), 24, INK, True)
    text(s, body, Inches(2.15), Inches(y + 0.42), Inches(9.8), Inches(0.6), 18, MUTED)
footer(s, 2)
note(
    s,
    "Mapengo matatu tu. Daftari. Watu wawili. Mtandao. "
    "Usiongeze mfano mrefu. Duka moja linatosha.",
)

# 3. The till.
s = blank()
kicker(s, "THE TILL")
text(s, "PhoneVault is that book, on the phone.", Inches(0.62), Inches(0.78), Inches(12), Inches(0.6), 32, INK, True)
parts = [
    ("01", "Sell", "A phone is a group in stock. The IMEI is written when it is sold."),
    ("02", "Pay", "Cash, Lipa, or debt. The customer pays the shop. The app does not take the money."),
    ("03", "Keep", "Stock, debt, and history stay on the phone. The receipt goes out on WhatsApp."),
]
for i, (num, title, body) in enumerate(parts):
    y = 1.85 + i * 1.5
    rect(s, Inches(0.62), Inches(y), Inches(11.9), Inches(1.28), WHITE)
    text(s, num, Inches(0.9), Inches(y + 0.34), Inches(1.0), Inches(0.5), 22, MID, True)
    text(s, title, Inches(2.1), Inches(y + 0.18), Inches(3), Inches(0.45), 24, INK, True)
    text(s, body, Inches(5.2), Inches(y + 0.28), Inches(6.9), Inches(0.75), 18, MUTED)
footer(s, 3)
note(
    s,
    "Uza. Lipa. Hifadhi. IMEI inaandikwa wakati wa mauzo, si wakati wa kuingiza stoo. "
    "Lipa ni namba ya duka. Programu haichukui pesa.",
)

# 4. Three real phones.
s = blank()
kicker(s, "ONE SHOP.  TWO PHONES.")
text(s, "She sells. He reads the same book.", Inches(0.62), Inches(0.72), Inches(10), Inches(0.5), 30, INK, True)
phones = [
    (PHONE_STOO, "1", "Stock is on the phone."),
    (PHONE_ZAIDI, "2", "The whole shop, one tap."),
    (PHONE_RIPOTI, "3", "The owner reads it."),
]
for i, (path, num, caption) in enumerate(phones):
    x = 0.95 + i * 4.15
    s.shapes.add_picture(path, Inches(x), Inches(1.32), Inches(2.35))
    text(s, num + "   " + caption, Inches(x - 0.35), Inches(5.95), Inches(3.15), Inches(0.4), 15, INK, True, PP_ALIGN.CENTER)
text(
    s,
    "Works with no network      ·      Cash or Lipa      ·      Owner and seller, two phones",
    Inches(0.6),
    Inches(6.42),
    Inches(12.1),
    Inches(0.35),
    14,
    MUTED,
    False,
    PP_ALIGN.CENTER,
)
footer(s, 4)
note(
    s,
    "Fungua simu, usisome maelezo. Stoo, Zaidi, Ripoti. "
    "Sema: muuzaji na mmiliki wako kwenye simu tofauti. Duka linaendelea bila mtandao.",
)

# 5. Who pays.
s = blank()
kicker(s, "WHO PAYS")
text(s, "We win only when the shop wins.", Inches(0.62), Inches(0.78), Inches(12), Inches(0.6), 32, INK, True)
rect(s, Inches(0.62), Inches(1.8), Inches(5.85), Inches(2.55), WHITE)
rect(s, Inches(6.85), Inches(1.8), Inches(5.85), Inches(2.55), DEEP)
text(s, "ONCE", Inches(0.9), Inches(2.0), Inches(5.2), Inches(0.35), 13, MID, True)
text(s, "TSH 400,000", Inches(0.9), Inches(2.4), Inches(5.2), Inches(0.7), 36, INK, True)
text(s, "The shop starts.", Inches(0.9), Inches(3.25), Inches(5.2), Inches(0.4), 18, MUTED)
text(s, "EACH MONTH", Inches(7.15), Inches(2.0), Inches(5.2), Inches(0.35), 13, WASH, True)
text(s, "TSH 20,000", Inches(7.15), Inches(2.4), Inches(5.2), Inches(0.7), 36, WHITE, True)
text(s, "The shop stays on.", Inches(7.15), Inches(3.25), Inches(5.2), Inches(0.4), 18, WASH)
lines(
    s,
    [
        "The sale stays in the shop. Change is not a sale. Debt is paid in parts.",
        "The shop pays Zeyhaan. The customer pays the shop.",
    ],
    Inches(0.62),
    Inches(4.7),
    Inches(12),
    Inches(1.3),
    20,
    INK,
    False,
    8,
)
footer(s, 5)
note(
    s,
    "Elfu mia nne mara moja. Elfu ishirini kila mwezi. "
    "Pesa ya mauzo inabaki dukani. Chenji si mauzo. Deni linalipwa kwa awamu. "
    "Usisome namba ya benki.",
)

# 6. The market, stated with the three customers they actually have.
s = blank()
kicker(s, "THE MARKET")
text(s, "A phone shop. Two people. One book.", Inches(0.62), Inches(0.78), Inches(12), Inches(0.55), 30, INK, True)
text(
    s,
    "Dar es Salaam. Phones and accessories. Cash or Lipa. Debt written down. The seller in the shop. The owner away.",
    Inches(0.62),
    Inches(1.5),
    Inches(12),
    Inches(0.7),
    18,
    MUTED,
)
counts = [
    ("3", "customers", "on PhoneVault today", WHITE, INK, MID),
    ("2", "online", "the phone also keeps a link to the shop", WASH, INK, DEEP),
    ("1", "offline", "the sale is written with no network", DEEP, WHITE, WASH),
]
for i, (num, label, body, fill, ink, sub) in enumerate(counts):
    x = 0.62 + i * 4.15
    rect(s, Inches(x), Inches(2.5), Inches(3.9), Inches(2.85), fill)
    text(s, num, Inches(x + 0.28), Inches(2.65), Inches(3.3), Inches(1.15), 60, ink, True)
    text(s, label, Inches(x + 0.3), Inches(3.85), Inches(3.3), Inches(0.4), 20, ink, True)
    text(s, body, Inches(x + 0.3), Inches(4.35), Inches(3.3), Inches(0.75), 14, sub)
footer(s, 6)
note(
    s,
    "Soko ni duka la simu na vifaa, Dar es Salaam. "
    "Leo: wateja watatu. Wawili online, mmoja offline. "
    "Online ni kiungo cha duka. Offline ni mauzo bila mtandao. "
    "Usitaje jina la duka. Usitungie idadi ya soko zima.",
)

# 7. The ask. No invented raise.
s = blank()
kicker(s, "THE ASK", 1.35)
lines(
    s,
    [
        "See the phone.",
        "Stay with the three shops.",
        "Walk into the next one.",
    ],
    Inches(0.62),
    Inches(1.9),
    Inches(11),
    Inches(3.2),
    40,
    INK,
    True,
    12,
)
text(
    s,
    "PhoneVault  ·  Zeyhaan Tech Solution",
    Inches(0.62),
    Inches(5.5),
    Inches(10),
    Inches(0.4),
    18,
    MUTED,
)
footer(s, 7)
note(
    s,
    "Mwisho. Onyesha simu. Wateja watatu tayari wako. "
    "Hatua inayofuata ni duka linalofuata Dar es Salaam. "
    "Kama kuna kiasi cha uwekezaji mliyokubaliana, kiseme kwa mdomo. Kisiandikwe hapa.",
)

prs.save(OUT)
print(OUT)
