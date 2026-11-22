from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont

LOGO = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\tools\zeyhaan-mark.png"
ICON = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\mobile\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
SHOTS = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\tools\docshots"
CHARTS = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\tools\docshots"
SW = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\PhoneVaultUboraKiswahili.docx"
EN = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\PhoneVaultUboraEnglish.docx"

DEEP = "2B6C31"
MID = "509541"
WASH = "EAF6E8"
INK = RGBColor(0x1C, 0x2B, 0x1E)
MUTED = RGBColor(0x3E, 0x5C, 0x42)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREEN = RGBColor(0x2B, 0x6C, 0x31)

# weight, score, sw name, en name, sw meaning, en meaning
PARTS = [
    (18, 88, "Mauzo na stoo", "Sales and stock", "Uza na stoo na IMEI na risiti vinafanya kazi kwenye simu.", "Sell and stock and IMEI and the receipt work on the phone."),
    (14, 86, "Deni na mawinga", "Debt and items out", "Deni la sehemu na chenji na matatizo na bidhaa za nje vinahesabiwa kando.", "Part payments and change and faults and items taken out stay in their own counts."),
    (16, 76, "Usalama", "Security", "PIN imefichwa na skrini ya siri inazuia picha. Mkaguzi wa nje bado hajatoa cheti.", "The PIN is hidden and the secret screen blocks photos. An outside tester has not issued a certificate."),
    (10, 86, "Muonekano", "Look", "Kichwa kinakaa chini ya saa. Vikundi vinazunguka kwenye mistari. Rangi ya kijani na kadi zinafanana kwenye kurasa.", "The title sits under the clock. Groups wrap onto fitting lines. The green and the cards match across the pages."),
    (8, 90, "Lugha", "Language", "Kiswahili na English na Kiarabu vinabadilika kwenye kurasa. Jina la bidhaa na jina la mteja vinabaki kama vilivyoandikwa.", "Swahili and English and Arabic change across the pages. A product name and a customer name stay as written."),
    (12, 92, "Bila mtandao", "Work without a network", "Mauzo na stoo na deni vinaendelea mtandao ukikatika.", "Sales and stock and debt continue when the network stops."),
    (12, 70, "Simu zinazofaa", "Phones that fit", "Android 7 na kuendelea. Samsung na Tecno na Infinix na Itel na Xiaomi na Oppo. iPhone bado haipo.", "Android 7 and above. Samsung and Tecno and Infinix and Itel and Xiaomi and Oppo. iPhone is still absent."),
    (5, 74, "Kupakia", "Loading", "Programu inafunguka kutoka daftari la simu. Faili inayotumwa ni megabaiti 73 kwa sababu imebeba injini tatu.", "The app opens from the phone book. The file sent is 73 megabytes because it carries three engines."),
    (5, 90, "Ujumbe wa tatizo", "Problem notice", "Tatizo linaonekana kwa utepe mwekundu juu na utepe unaondoka tatizo likisharekebishwa. Mzunguko unaonekana picha au kazi inaposubiri.", "A problem shows on a red band at the top and the band leaves when the problem is fixed. A spinner shows while a picture or a task waits."),
]


def total_of(rows):
    return round(sum(weight * score for weight, score, *_ in rows) / 100)


TOTAL = total_of(PARTS)
assert TOTAL == 83, TOTAL


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(rf"C:\Windows\Fonts\{name}", size)


def draw_bars(path, title, rows):
    width, height = 1600, 980
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, width, 16), fill="#2B6C31")
    draw.text((48, 40), title, font=font(40, True), fill="#1C2B1E")
    top = 120
    for name, score in rows:
        draw.text((48, top + 8), name, font=font(28), fill="#1C2B1E")
        draw.rounded_rectangle((430, top + 14, 1420, top + 48), radius=8, fill="#EAF6E8")
        fill_to = 430 + int(990 * score / 100)
        draw.rounded_rectangle((430, top + 14, fill_to, top + 48), radius=8, fill="#509541")
        draw.text((1440, top + 8), str(score), font=font(28, True), fill="#2B6C31")
        top += 88
    image.save(path)


def draw_totals(path, left_label, left, right_label, right, foot):
    width, height = 1600, 520
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, width, 16), fill="#2B6C31")
    boxes = [(80, left_label, left, "#2B6C31"), (840, right_label, right, "#80C050")]
    for x, label, score, color in boxes:
        draw.rounded_rectangle((x, 70, x + 680, 430), radius=28, fill="#EAF6E8")
        draw.ellipse((x + 230, 110, x + 450, 330), fill=color)
        draw.text((x + 268, 175), str(score), font=font(64, True), fill="white")
        draw.text((x + 40, 360), label, font=font(28, True), fill="#1C2B1E")
    draw.text((80, 460), foot, font=font(22), fill="#3E5C42")
    image.save(path)


def shade(cell, color):
    tc = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), color)
    shd.set(qn("w:val"), "clear")
    tc.append(shd)


def margins(cell, top=80, bottom=80, left=140, right=140):
    tc = cell._tc.get_or_add_tcPr()
    mar = OxmlElement("w:tcMar")
    for name, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{name}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        mar.append(node)
    tc.append(mar)


def no_border(table):
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        node = OxmlElement(f"w:{edge}")
        node.set(qn("w:val"), "nil")
        borders.append(node)
    table._tbl.tblPr.append(borders)


def col_widths(table, widths):
    table.autofit = False
    table.allow_autofit = False
    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for cm in widths:
        gc = OxmlElement("w:gridCol")
        gc.set(qn("w:w"), str(int(cm * 567)))
        grid.append(gc)
    for row in table.rows:
        for cell, cm in zip(row.cells, widths):
            tcw = OxmlElement("w:tcW")
            tcw.set(qn("w:w"), str(int(cm * 567)))
            tcw.set(qn("w:type"), "dxa")
            cell._tc.get_or_add_tcPr().append(tcw)


def run(paragraph, text, size=11, bold=False, color=INK, font_name="Calibri"):
    r = paragraph.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    r.font.color.rgb = color
    r.font.name = font_name
    r._element.rPr.rFonts.set(qn("w:eastAsia"), font_name)


def para(doc, text, size=11, bold=False, color=INK, before=0, after=8, align="justify"):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.15
    p.alignment = {"justify": WD_ALIGN_PARAGRAPH.JUSTIFY, "left": WD_ALIGN_PARAGRAPH.LEFT, "center": WD_ALIGN_PARAGRAPH.CENTER}[align]
    run(p, text, size, bold, color)
    return p


def rule(paragraph):
    ppr = paragraph._p.get_or_add_pPr()
    border = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "12")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), MID)
    border.append(bottom)
    ppr.append(border)


def heading(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run(p, title, 14, True, GREEN)
    rule(p)


def page_border(section):
    borders = OxmlElement("w:pgBorders")
    borders.set(qn("w:offsetFrom"), "page")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "18")
        el.set(qn("w:space"), "14")
        el.set(qn("w:color"), DEEP)
        borders.append(el)
    section._sectPr.append(borders)


def banner(doc, line):
    table = doc.add_table(rows=1, cols=2)
    no_border(table)
    col_widths(table, [3.4, 14.2])
    logo, name = table.rows[0].cells
    shade(logo, DEEP)
    shade(name, DEEP)
    margins(logo, 120, 120, 120, 40)
    margins(name, 140, 120, 80, 140)
    logo.text = ""
    lp = logo.paragraphs[0]
    lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    lp.add_run().add_picture(LOGO, width=Cm(2.3))
    name.text = ""
    p1 = name.paragraphs[0]
    run(p1, "PHONEVAULT", 22, True, WHITE)
    p2 = name.add_paragraph()
    p2.paragraph_format.space_before = Pt(2)
    run(p2, line, 12, False, RGBColor(0xE7, 0xF6, 0xE4))
    p3 = name.add_paragraph()
    p3.paragraph_format.space_before = Pt(6)
    run(p3, "Zeyhaan Tech Solution", 11, True, WHITE)


def picture(doc, path, width=16.2):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    p.add_run().add_picture(path, width=Cm(width))


def score_row(doc, name, weight_label, score, meaning):
    table = doc.add_table(rows=1, cols=2)
    no_border(table)
    col_widths(table, [14.3, 3.3])
    body, mark = table.rows[0].cells
    shade(body, WASH)
    shade(mark, DEEP)
    margins(body, 80, 80, 140, 120)
    margins(mark, 80, 80, 60, 60)
    body.text = ""
    title = body.paragraphs[0]
    run(title, name, 12, True, GREEN)
    one = body.add_paragraph()
    one.paragraph_format.space_before = Pt(2)
    run(one, weight_label, 10, False, MUTED)
    two = body.add_paragraph()
    two.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    two.paragraph_format.space_before = Pt(2)
    run(two, meaning, 11, False, INK)
    mark.text = ""
    num = mark.paragraphs[0]
    num.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(num, str(score), 22, True, WHITE)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def new_doc(footer):
    doc = Document()
    core = doc.core_properties
    core.author = "Zeyana Thabit Juma"
    core.title = "PhoneVault"
    core.category = "Zeyhaan Tech Solution"
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.font.color.rgb = INK
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.45)
    section.bottom_margin = Cm(1.4)
    section.left_margin = Cm(1.6)
    section.right_margin = Cm(1.6)
    page_border(section)
    foot = section.footer.paragraphs[0]
    foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(foot, footer, 9, False, MUTED)
    return doc


MODULES = [
    ("nyumbani", "Nyumbani", "Home", "Ukurasa wa kwanza unaonyesha leo. Mmiliki anaona fedha. Muuzaji haoni faida.", "The first page shows today. The owner sees the money. The seller does not see profit."),
    ("uza", "Uza", "Sell", "Malipo ni Cash au Lipa Namba. Deni na chenji vinaandikwa. Risiti inaenda WhatsApp. Vikundi vinazunguka kwenye mistari.", "Payment is Cash or Lipa number. Debt and change are recorded. The receipt goes to WhatsApp. Groups wrap onto fitting lines."),
    ("stoo", "Stoo", "Stock", "Simu inaingia kwa IMEI. RAM na ukubwa wa kioo vinajazwa ikiwa vinahitajika. Skana inalenga msimbo mmoja na inapendelea IMEI 1 boksi linapokuwa na misimbo mingi. Vifaa vinaingia kwa idadi. Utafutaji uko juu. Vipande vyenye matatizo vinabaki kando.", "A phone enters by IMEI. RAM and screen size are filled when they are needed. The scanner aims at one code and prefers IMEI 1 when a box has many codes. Accessories enter by quantity. Search sits at the top. Faulty pieces stay apart."),
    ("deni", "Deni", "Debt", "Malipo ya sehemu yanaingia Cash au Lipa Namba. Pesa inahesabiwa siku iliyopokelewa.", "A part payment enters as Cash or Lipa number. The money counts on the day it was received."),
    ("mawinga", "Mawinga", "Items out", "Bidhaa inayotoka na mtu inaandikwa na inarudi sehemu au yote. Utafutaji uko juu.", "An item taken out by a person is recorded and comes back in part or in full. Search sits at the top."),
    ("matatizo", "Matatizo", "Faults", "Bidhaa yenye hitilafu inatoka kwenye stoo ya kuuza na gharama yake inaingia hasara. Kichwa kinakaa chini ya saa na vikundi vinazunguka.", "A faulty item leaves the sellable stock and its cost enters the loss. The title sits under the clock and the groups wrap."),
    ("historia", "Historia", "History", "Historia inafunguka kwa leo. Duka linaweza kuchagua leo au wiki au mwezi au siku zote au siku moja. Kila risiti inabaki na namba yake.", "History opens on today. The shop can choose today or the week or the month or all days or one day. Each receipt stays with its number."),
    ("uchambuzi", "Uchambuzi", "Analysis", "Vipindi vinakaa kwenye mistari. Cash na Lipa Namba ni pesa iliyoingia siku hiyo pamoja na malipo ya deni.", "The periods sit on wrapped lines. Cash and Lipa number are the money received that day including a debt payment."),
    ("ripoti", "Ripoti", "Reports", "Mmiliki anatoa faida na mauzo na stoo. Muuzaji haoni faida.", "The owner exports profit and sales and stock. The seller does not see profit."),
    ("wateja", "Wateja", "Customers", "Jina na simu vinatoka kwenye mauzo. Deni linaweza kukumbushwa WhatsApp.", "The name and phone come from a sale. A debt can be reminded on WhatsApp."),
    ("warranty", "Warranty", "Warranty", "IMEI inaandikwa au inaskanwa kwa kamera ili kuona muda. Kamera inasoma msimbo ulio ndani ya boksi na inapendelea IMEI 1.", "The IMEI is typed or scanned with the camera to see the period. The camera reads the code inside the frame and prefers IMEI 1."),
    ("mipangilio", "Mipangilio", "Settings", "Jina na mahali na Lipa Namba na logo vinahifadhiwa. Lugha tatu zinachaguliwa hapa.", "The name and place and Lipa number and logo are saved. Three languages are chosen here."),
    ("taarifa", "Taarifa", "Alerts", "Stoo ndogo na deni na mawinga vinaandikwa kwa mmiliki.", "Low stock and debt and items out are written for the owner."),
]


def build(lang):
    sw = lang == "sw"
    bars = f"{CHARTS}\\chati-sehemu-{'sw' if sw else 'en'}.png"
    totals = f"{CHARTS}\\chati-jumla-{'sw' if sw else 'en'}.png"
    draw_bars(
        bars,
        "Ubora kwa asilimia" if sw else "Quality in percent",
        [(p[2] if sw else p[3], p[1]) for p in PARTS],
    )
    draw_totals(
        totals,
        "Duka la Android" if sw else "An Android shop",
        TOTAL,
        "Simu zote duniani" if sw else "Every phone in the world",
        50,
        "Asilimia 83 ni kazi iliyokusudiwa. Asilimia 50 inahesabu iPhone." if sw else "83 percent is the intended job. 50 percent counts iPhone.",
    )
    doc = new_doc("Zeyhaan Tech Solution    PhoneVault    zeyhaan.com    0624945919")
    banner(doc, "Daftari la duka la simu" if sw else "The book of a phone shop")
    if sw:
        para(doc, "Imeandaliwa na Zeyana Thabit Juma mwanzilishi wa Zeyhaan Tech Solution. Tathmini imeandikwa tarehe 4 Novemba 2026 baada ya kusoma programu yenyewe.", 11, False, MUTED, before=10, align="left")
        para(doc, "PhoneVault ni programu ya duka moja la simu na vifaa. Jina chini ya ikoni ni PhoneVault. Ikoni ni alama ya Zeyhaan. Mmiliki na muuzaji wako kwenye simu tofauti. Mauzo yanaendelea mtandao ukikatika. Mteja analipa Cash au Lipa Namba ya duka nje ya programu.")
        para(doc, "Programu inazungumza Kiswahili na English na Kiarabu. Tatizo linaonekana kwa utepe mwekundu juu ya skrini kwa maneno mafupi na utepe unaondoka tatizo likisharekebishwa. Picha au kazi inayosubiri inaonyesha mzunguko.")
        heading(doc, "Kwa nini duka lichague PhoneVault")
        para(doc, "Duka la simu linahitaji IMEI na deni la sehemu na bidhaa zenye matatizo na simu mbili na kazi bila mtandao. PhoneVault imejengwa kwa kazi hiyo. Lugha inaweza kuwa Kiswahili au English au Kiarabu. Muuzaji haoni faida. Chenji si mauzo. Lipa Namba ni namba ya duka na programu haichukui pesa.")
        heading(doc, "Ubora kwa asilimia")
        para(doc, "Kila kipengele kina uzito. Uzito unaeleza sehemu yake kwenye jumla. Jumla ya kazi iliyokusudiwa ni asilimia 83. Hii ni duka moja la simu kwenye simu mbili za Android.")
        para(doc, "Kwa simu zote duniani pamoja na iPhone tathmini ni asilimia 50. Faili ya Apple bado haipo kwa hiyo duka linalotumia iPhone peke yake haliwezi kuingia.")
        picture(doc, totals, 16.2)
        picture(doc, bars, 16.2)
        for weight, score, name, _en, meaning, _emean in PARTS:
            score_row(doc, name, f"Uzito {weight} kati ya 100", score, meaning)
        para(doc, "Jumla: asilimia 83 kwa kazi iliyokusudiwa. Asilimia 50 kwa simu zote duniani pamoja na iPhone.", 12, True, GREEN, before=8)
        heading(doc, "Ushahidi wa usalama")
        para(doc, "Hakuna cheti cha kampuni ya nje ya usalama. Tathmini hii inasoma programu yenyewe.")
        para(doc, "PIN ina chumvi na inapita mizunguko 12000 kabla ya kuhifadhiwa. Majaribio mengi yanasubirishwa. Skrini ya PIN na namba za siri zinazuia picha. Nakala ya simu imezimwa. Muuzaji haoni faida wala gharama. Anwani ya duka inayohifadhiwa inahitaji https.")
        para(doc, "Kikomo: programu bado inaruhusu mtandao wa karibu usio na https. Hii inashusha usalama hadi asilimia 76.")
        heading(doc, "Mipaka")
        para(doc, "iPhone haipo. Android 6 haifai. Programu haichukui kadi. Haichapi mashine ya joto. Haina ankara ya TRA. Haina SMS ya kiotomatiki. Ni duka moja na simu mbili. Kila duka linahitaji anwani yake na neno lake. Maduka yanayoshiriki anwani moja yanaandika kwenye daftari moja.")
        para(doc, "Bei ni TSH 400000 mara moja. Kisha TSH 20000 kila mwezi kwa programu na simu mbili za duka moja. Pesa ya mauzo ya duka si ya Zeyhaan Tech Solution.")
        heading(doc, "Moduli")
        para(doc, "Picha ni za duka la mazoezi. Zinaonyesha programu yenyewe. Lugha tatu na RAM na kioo na skana ya msimbo mmoja vimo kwenye programu ya sasa.")
        for shot, name, _en, work, _ew in MODULES:
            heading(doc, name)
            para(doc, work)
            picture(doc, f"{SHOTS}\\{shot}.png", 7.2)
    else:
        para(doc, "Prepared by Zeyana Thabit Juma founder of Zeyhaan Tech Solution. The review was written on 4 November 2026 after reading the app itself.", 11, False, MUTED, before=10, align="left")
        para(doc, "PhoneVault is the app of one phone shop and its accessories. The name under the icon is PhoneVault. The icon is the Zeyhaan mark. The owner and the seller use separate phones. Sales continue when the network stops. The customer pays Cash or the shop Lipa number outside the app.")
        para(doc, "The app speaks Swahili and English and Arabic. A problem appears on a red band at the top of the screen in short words and the band leaves when the problem is fixed. A picture or a task that is waiting shows a spinner.")
        heading(doc, "Why a shop should choose PhoneVault")
        para(doc, "A phone shop needs IMEI and part payments and faulty goods and two phones and work without a network. PhoneVault is built for that job. The language can be Swahili or English or Arabic. The seller does not see profit. Change is not a sale. The Lipa number belongs to the shop and the app does not take the money.")
        heading(doc, "Quality in percent")
        para(doc, "Each part has a weight. The weight is its share of the total. The total for the intended job is 83 percent. That job is one phone shop on two Android phones.")
        para(doc, "For every phone in the world including iPhone the review is 50 percent. The Apple file is still absent so a shop that uses only iPhone cannot enter.")
        picture(doc, totals, 16.2)
        picture(doc, bars, 16.2)
        for weight, score, _sw, name, _smean, meaning in PARTS:
            score_row(doc, name, f"Weight {weight} out of 100", score, meaning)
        para(doc, "Total: 83 percent for the intended job. 50 percent for every phone in the world including iPhone.", 12, True, GREEN, before=8)
        heading(doc, "Security evidence")
        para(doc, "There is no certificate from an outside security firm. This review reads the app itself.")
        para(doc, "The PIN has a salt and passes 12000 rounds before it is stored. Too many tries must wait. The PIN screen and the secret figures block photos. Phone backup is off. The seller does not see profit or cost. A saved shop address must start with https.")
        para(doc, "Limit: the app still allows a nearby network without https. This holds security at 76 percent.")
        heading(doc, "Limits")
        para(doc, "iPhone is absent. Android 6 does not fit. The app does not take a card. It does not print on a heat machine. It has no TRA invoice. It has no automatic SMS. It is one shop and two phones. Each shop needs its own address and its own word. Shops that share one address write into one book.")
        para(doc, "The price is TSH 400000 once. Then TSH 20000 every month for the app and the two phones of one shop. The shop sales money is not money of Zeyhaan Tech Solution.")
        heading(doc, "Modules")
        para(doc, "The pictures are from the practice shop. They show the app itself. Three languages and RAM and screen size and the one code scanner are in the current app.")
        for shot, _sw, name, _work, work in MODULES:
            heading(doc, name)
            para(doc, work)
            picture(doc, f"{SHOTS}\\{shot}.png", 7.2)
    icon = doc.add_paragraph()
    icon.alignment = WD_ALIGN_PARAGRAPH.CENTER
    icon.add_run().add_picture(ICON, width=Cm(2.0))
    para(doc, "Zeyhaan Tech Solution    zeyhaan.com    0624945919", 11, True, GREEN, before=6, align="center")
    doc.save(SW if sw else EN)


def check(path):
    import zipfile
    from xml.etree import ElementTree as ET
    root = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    blob = "".join(t.text or "" for t in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"))
    bad = [ch for ch in [",", "-", "\u2013", "\u2014"] if ch in blob]
    if bad:
        for ch in bad:
            i = blob.find(ch)
            raise SystemExit(f"{path} has {ch!r} near {blob[max(0,i-40):i+40]!r}")
    print(path, "chars", len(blob))


if __name__ == "__main__":
    build("sw")
    build("en")
    check(SW)
    check(EN)
