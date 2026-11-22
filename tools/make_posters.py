import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system"
SHOTS = ROOT + r"\tools\docshots"
MARK = ROOT + r"\tools\zeyhaan-mark.png"
OUT = ROOT + r"\posters"
W, H = 1080, 1350

GREEN = (46, 140, 62)
GREEN_DEEP = (30, 110, 48)
INK = (18, 42, 28)
WHITE = (255, 255, 255)
WASH = (244, 250, 244)

black = ImageFont.truetype(r"C:\Windows\Fonts\ariblk.ttf", 46)
title = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 40)
mid = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 26)
body = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 24)
small = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 20)
price = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 34)


def logo(size):
    im = Image.open(MARK).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if r < 28 and g < 28 and b < 28:
                px[x, y] = (r, g, b, 0)
    return im.resize((size, size), Image.Resampling.LANCZOS)


def screen(path, width, height, top=0):
    src = Image.open(path).convert("RGB")
    src = src.crop((0, top, src.width, src.height - 70))
    scale = width / src.width
    pic = src.resize((width, int(src.height * scale)), Image.Resampling.LANCZOS)
    if pic.height < height:
        canvas = Image.new("RGB", (width, height), (234, 246, 232))
        canvas.paste(pic, (0, 0))
        pic = canvas
    else:
        pic = pic.crop((0, 0, width, height))
    mask = Image.new("L", pic.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width, height), 28, fill=255)
    out = pic.convert("RGBA")
    out.putalpha(mask)
    return out


def handset(path, width, height, top=0):
    face = screen(path, width - 18, height - 18, top)
    shell = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(shell)
    d.rounded_rectangle((0, 0, width - 1, height - 1), 36, fill=(12, 18, 16, 255))
    d.rounded_rectangle((6, 6, width - 7, height - 7), 32, fill=(255, 255, 255, 255))
    shell.paste(face, (9, 9), face)
    return shell


def shadow(base, item, xy):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    plate = Image.new("RGBA", item.size, (20, 40, 24, 80))
    layer.paste(plate, (xy[0], xy[1] + 10), item)
    layer = layer.filter(ImageFilter.GaussianBlur(16))
    base.alpha_composite(layer)
    base.paste(item, xy, item)


def checks(draw, x, y, lines):
    for line in lines:
        draw.ellipse((x, y + 2, x + 30, y + 32), fill=WHITE)
        draw.line((x + 7, y + 16, x + 13, y + 23), fill=GREEN_DEEP, width=3)
        draw.line((x + 12, y + 23, x + 23, y + 9), fill=GREEN_DEEP, width=3)
        draw.multiline_text((x + 44, y), line, font=small, fill=WHITE, spacing=2)
        y += 64
    return y


def phone_poster():
    img = Image.new("RGB", (W, H), WASH)
    canvas = img.convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    mark = logo(78)
    canvas.paste(mark, (36, 28), mark)
    draw.text((128, 30), "Zeyhaan", font=title, fill=GREEN_DEEP)
    draw.text((128, 74), "Tech Solution", font=mid, fill=GREEN)

    draw.rounded_rectangle((640, 24, 1140, 700), 90, fill=GREEN)
    draw.ellipse((520, 90, 820, 560), fill=GREEN)
    draw.text((668, 70), "PhoneVault", font=title, fill=WHITE)
    draw.text((620, 122), "Mfumo kamili wa usimamizi", font=small, fill=(230, 245, 228))
    draw.text((620, 148), "kwa maduka ya simu.", font=small, fill=(230, 245, 228))
    checks(draw, 620, 210, [
        "Inafanya kazi kwenye simu",
        "Mauzo yanaendelea hata\nmtandao ukikatika",
        "Risiti inatumwa WhatsApp",
        "IMEI inaandikwa wakati\nwa mauzo",
    ])

    draw.text((36, 150), "JE UNAMILIKI", font=black, fill=GREEN)
    draw.text((36, 214), "DUKA LA SIMU", font=black, fill=GREEN_DEEP)
    draw.text((36, 278), "NA VIFAA?", font=black, fill=GREEN_DEEP)
    sub = "Acha daftari. Simamia mauzo,\nstoo na deni kupitia simu yako."
    draw.multiline_text((36, 370), sub, font=body, fill=INK, spacing=6)

    phones = [
        (SHOTS + r"\nyumbani.png", 28, 560, 620),
        (SHOTS + r"\zaidi.png", 370, 530, 0),
        (SHOTS + r"\ripoti.png", 712, 560, 0),
    ]
    for path, x, y, top in phones:
        item = handset(path, 300, 620, top)
        shadow(canvas, item, (x, y))

    bar = Image.new("RGBA", (W, 150), (*GREEN_DEEP, 255))
    canvas.paste(bar, (0, H - 150))
    d = ImageDraw.Draw(canvas)
    d.ellipse((36, H - 122, 116, H - 42), fill=WHITE)
    d.text((58, H - 104), "Pv", font=mid, fill=GREEN_DEEP)
    d.text((140, H - 118), "Pata PhoneVault leo", font=mid, fill=WHITE)
    d.text((140, H - 78), "kwa TSH 400,000", font=price, fill=WHITE)
    d.text((700, H - 112), "WhatsApp", font=small, fill=(220, 240, 214))
    d.text((700, H - 84), "0624 945 919", font=title, fill=WHITE)
    d.text((700, H - 42), "zeyhaan.com", font=mid, fill=WHITE)
    os.makedirs(OUT, exist_ok=True)
    canvas.convert("RGB").save(OUT + r"\PhoneVault-bango.png", quality=95)


if __name__ == "__main__":
    phone_poster()
    print("ok")
