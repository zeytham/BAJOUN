from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor, Emu
from PIL import Image

LOGO = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\tools\zeyhaan-mark.png"
ICON = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\mobile\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
OUT = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\PhoneVaultKitabu.docx"

DEEP = "2B6C31"
MID = "509541"
WASH = "EAF6E8"
INK = RGBColor(0x1C, 0x2B, 0x1E)
MUTED = RGBColor(0x3E, 0x5C, 0x42)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREEN = RGBColor(0x2B, 0x6C, 0x31)
LEAF = RGBColor(0x50, 0x95, 0x41)


def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), color)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def margins(cell, top=80, bottom=80, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for name, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{name}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


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
            tcW = OxmlElement("w:tcW")
            tcW.set(qn("w:w"), str(int(cm * 567)))
            tcW.set(qn("w:type"), "dxa")
            cell._tc.get_or_add_tcPr().append(tcW)


def run(paragraph, text, size=11, bold=False, color=INK, font="Calibri"):
    r = paragraph.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    r.font.color.rgb = color
    r.font.name = font
    r._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    return r


def para(doc, text, size=11, bold=False, color=INK, before=0, after=8, align="justify"):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.15
    p.alignment = {
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
    }[align]
    run(p, text, size, bold, color)
    return p


def rule(paragraph, color=MID):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "12")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def heading(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run(p, title, 14, True, GREEN)
    rule(p, MID)
    return p


def page_border(section):
    pgBorders = OxmlElement("w:pgBorders")
    pgBorders.set(qn("w:offsetFrom"), "page")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "18")
        el.set(qn("w:space"), "14")
        el.set(qn("w:color"), DEEP)
        pgBorders.append(el)
    section._sectPr.append(pgBorders)


def banner(doc):
    table = doc.add_table(rows=1, cols=2)
    no_border(table)
    col_widths(table, [3.4, 14.2])
    logo_cell, name_cell = table.rows[0].cells
    shade(logo_cell, DEEP)
    shade(name_cell, DEEP)
    margins(logo_cell, 120, 120, 120, 40)
    margins(name_cell, 140, 120, 80, 140)
    logo_cell.text = ""
    lp = logo_cell.paragraphs[0]
    lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    lp.add_run().add_picture(LOGO, width=Cm(2.3))
    name_cell.text = ""
    p1 = name_cell.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run(p1, "PHONEVAULT", 22, True, WHITE)
    p2 = name_cell.add_paragraph()
    p2.paragraph_format.space_before = Pt(2)
    p2.paragraph_format.space_after = Pt(0)
    run(p2, "Daftari la duka la simu", 12, False, RGBColor(0xE7, 0xF6, 0xE4))
    p3 = name_cell.add_paragraph()
    p3.paragraph_format.space_before = Pt(6)
    run(p3, "Zeyhaan Tech Solution", 11, True, WHITE)


SHOTS = r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\tools\docshots"


def module(doc, name, work, benefit, shot):
    table = doc.add_table(rows=1, cols=2)
    no_border(table)
    col_widths(table, [0.45, 17.15])
    row = table.rows[0]
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))
    bar, body = row.cells
    shade(bar, MID)
    shade(body, WASH)
    margins(bar, 60, 60, 40, 40)
    margins(body, 80, 80, 140, 140)
    bar.text = ""
    body.text = ""
    title = body.paragraphs[0]
    title.paragraph_format.space_after = Pt(2)
    run(title, name, 12, True, GREEN)
    one = body.add_paragraph()
    one.paragraph_format.space_before = Pt(2)
    one.paragraph_format.space_after = Pt(2)
    one.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run(one, work, 11, False, INK)
    two = body.add_paragraph()
    two.paragraph_format.space_before = Pt(1)
    two.paragraph_format.space_after = Pt(0)
    two.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run(two, "Faida. ", 11, True, GREEN)
    run(two, benefit, 11, False, INK)
    if not shot:
        return
    pic = doc.add_paragraph()
    pic.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pic.paragraph_format.space_before = Pt(6)
    pic.paragraph_format.space_after = Pt(8)
    pic.add_run().add_picture(f"{SHOTS}\\{shot}.png", width=Cm(7.2))


MODULES = [
    (
        "Nyumbani",
        "Ukurasa wa kwanza unaonyesha leo. Mmiliki anaona fedha na faida. Muuzaji anaona kazi ya kuuza bila kuona faida wala gharama. Vitufe vya Uza na Stoo na Deni na Mawinga na Matatizo na Historia vipo papo hapo.",
        "Mtu anaanza kazi bila kupotea. Siri ya faida inabaki kwa mmiliki.",
        "nyumbani",
    ),
    (
        "Uza",
        "Muuzaji anachagua bidhaa na anaweka bei ya mauzo. Malipo ni Cash au Lipa Namba. Anaweza kuuza kwa deni na kupokea sehemu ya pesa. Chenji inaandikwa kando na si mauzo. Risiti inatengenezwa kwenye simu na inaweza kutumwa WhatsApp.",
        "Mauzo yanaendelea hata mtandao ukikatika. Pesa ya mteja inaingia kwa duka si kwa programu.",
        "uza",
    ),
    (
        "Stoo",
        "Simu zinaingizwa moja moja kwa IMEI. Vifaa vinaingizwa kwa idadi. Idadi yote inajumuisha vipande vyenye matatizo na vipande vinavyouzwa vinabaki kando. Mzigo mpya unaongezwa bila kufuta historia.",
        "Duka linajua kilicho dukani na kisichopaswa kuuzwa kama kipya.",
        "stoo",
    ),
    (
        "Deni",
        "Deni lina mteja na simu na kiasi na baki. Malipo ya sehemu yanaingia Cash au Lipa Namba. Baki inafuata malipo. Siku nyingine pesa iliyopokelewa inaingia kwenye Cash au Lipa ya siku hiyo.",
        "Mmiliki anaona anayedaiwa na pesa iliyoingia siku ambayo mteja amelipa.",
        "deni",
    ),
    (
        "Mawinga",
        "Bidhaa zinapotoka na mtu nje ya duka zinaandikwa. Zinarudi sehemu au zote. Duka linaona nani hajarudisha.",
        "Bidhaa za nje hazipotei kimya kimya.",
        "mawinga",
    ),
    (
        "Matatizo",
        "Simu yenye hitilafu na kifaa chenye hitilafu vinatoka kwenye stoo ya kuuza. Gharama yake inaingia kwenye hesabu ya hasara mara moja. Ukiuza bidhaa yenye matatizo bei yake inaingia kwenye mauzo ya matatizo. Ukifuta risiti ya bidhaa yenye matatizo inarudi kwenye Matatizo.",
        "Hasara haichanganyiki na faida ya bidhaa nzuri.",
        "matatizo",
    ),
    (
        "Historia",
        "Kila risiti inabaki na namba yake na mteja na muuzaji na malipo. Marejesho yanaandikwa. Risiti inaweza kutumwa tena. Mmiliki anaweza kufuta risiti ikiwa deni halijaanza kulipwa.",
        "Duka lina kumbukumbu ya kila mauzo na linaweza kurudia risiti.",
        "historia",
    ),
    (
        "Uchambuzi",
        "Grafu inaonyesha siku zilizopita. Cash na Lipa Namba ni pesa iliyoingia siku hiyo pamoja na malipo ya deni ya siku hiyo. Mauzo ya risiti yanabaki kwenye siku ya risiti.",
        "Mmiliki anaona mtiririko wa pesa na si hesabu iliyochanganyika.",
        "uchambuzi",
    ),
    (
        "Ripoti",
        "Mmiliki anapakua faida na mauzo na stoo na madeni. Muuzaji haoni ripoti za faida ikiwa ruhusa haijawashwa.",
        "Hesabu inaweza kutolewa nje ya programu bila kumpa muuzaji siri.",
        "ripoti",
    ),
    (
        "Wateja",
        "Jina na simu na manunuzi yanawekwa kutoka mauzo. Mteja anaweza kukumbushwa deni kwa WhatsApp.",
        "Duka linamfahamu mteja na deni lake bila daftari la karatasi.",
        "wateja",
    ),
    (
        "Warranty",
        "Mtu anaandika IMEI au anaskani kwa kamera. Programu inaonyesha kama simu bado iko ndani ya muda au muda umeisha au simu bado iko dukani.",
        "Malalamiko ya mteja yanajibiwa kwa simu ileile iliyouzwa.",
        "warranty",
    ),
    (
        "Mipangilio",
        "Mmiliki anaweka jina la duka na mahali na simu ya duka na ujumbe wa chini ya risiti na Lipa Namba na logo ya duka. Taarifa zinahifadhiwa zenyewe. Ukifunga programu zinabaki na zinaingia kwenye risiti. Anwani ya kuunganisha simu na neno la kuunganisha vinahifadhiwa hapa. Neno la kurejesha PIN linawekwa na mmiliki akiwa ameingia.",
        "Risiti inakuwa ya duka hilo. Mabadiliko hayarudi kwenye maandishi ya zamani.",
        "mipangilio",
    ),
    (
        "Kuingia na PIN",
        "Kila mtu ana PIN ya tarakimu nne. Mmiliki akiwa amesahau anaweka neno la kurejesha na anaweka PIN mpya. Muuzaji akisahau mmiliki anamwekewa PIN mpya ndani ya programu. Mgeni haingii kwa kitufe cha kusahau.",
        "Duka linafunguka kwa watu wake tu.",
        None,
    ),
    (
        "Taarifa",
        "Programu inaandika taarifa za stoo ndogo na deni na mawinga na kuingia kwa muuzaji. Mmiliki anaziona. Muuzaji haoni taarifa za siri.",
        "Kumbukumbu ya duka inabaki ndani ya programu.",
        "taarifa",
    ),
]


def main():
    doc = Document()
    core = doc.core_properties
    core.title = "PhoneVault"
    core.author = "Zeyana Thabit Juma"
    core.subject = "Zeyhaan Tech Solution"
    core.category = "Kitabu cha bidhaa"
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.font.color.rgb = INK
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.45)
    section.bottom_margin = Cm(1.4)
    section.left_margin = Cm(1.6)
    section.right_margin = Cm(1.6)
    page_border(section)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(footer, "Zeyhaan Tech Solution    PhoneVault    zeyhaan.com    0624945919", 9, False, MUTED)

    banner(doc)
    para(doc, "Imeandaliwa na Zeyana Thabit Juma mwanzilishi wa Zeyhaan Tech Solution.", 11, False, MUTED, before=10, after=8, align="left")
    para(
        doc,
        "PhoneVault ni programu ya duka moja la simu na vifaa. Jina chini ya ikoni ni PhoneVault. Ikoni ni alama ya Zeyhaan. Jina la duka ni la mteja na linawekwa kwenye mipangilio. Rangi ya programu ni kijani cha alama ya Zeyhaan.",
    )
    para(
        doc,
        "Programu hii inashikilia mauzo na stoo na IMEI na matatizo na deni na chenji kwenye simu. Mmiliki na muuzaji wako kwenye simu tofauti. Programu haichukui pesa ya mteja. Mteja analipa Cash au analipa Lipa Namba ya duka nje ya programu.",
    )

    heading(doc, "Kwa nini duka lichague PhoneVault")
    para(doc, "Duka la simu linahitaji kumbukumbu inayobaki hata mtandao wa simu ukikatika. PhoneVault inaendelea kuuza. Mtandao ukirudi simu ya mmiliki na simu ya muuzaji zinakutana na risiti zote zinabaki.")
    para(doc, "Lugha ya kazi ni Kiswahili. Kila simu ina IMEI. Warranty inatafuta simu ileile. Bidhaa yenye matatizo haichanganyiki na stoo inayouzwa. Deni linapokea malipo ya sehemu. Chenji si mauzo. Muuzaji haoni faida wala gharama.")
    para(doc, "Mifumo mingine ya duniani ipo. PhoneVault haichukui nafasi ya mashine ya benki wala ya mtandao wa maduka mengi. Inashinda kwenye duka moja linalouza simu kwa IMEI na lina deni na lina bidhaa zenye matatizo na linatumia simu mbili.")

    heading(doc, "Ubora")
    para(doc, "Kwa kazi ya duka moja la simu kwenye simu mbili za Android ubora uko imara. Mauzo na stoo na deni na matatizo na mawinga na risiti na PIN vimekaguliwa na vinafanya kazi.")
    para(doc, "Programu inafunguka kuanzia Android 7. Samsung na Tecno na Infinix na Itel na Xiaomi na Oppo za miaka ya karibuni zinaingia. Simu za Android 6 ni chache sana na ni simu za mwaka 2015 na 2016. iPhone bado haijaingia kwa sababu faili iliyopo ni ya Android.")
    para(doc, "Faili inayotumwa ni kubwa kwa sababu imebeba injini za simu za aina tofauti. Simu ya kisasa inatumia injini moja. Kurasa baada ya kufungua zinasomeka kutoka daftari la simu. Hazisubiri intaneti.")
    para(doc, "Programu inafunguka mara moja. Inafunga ikiwa haijaguswa kwa dakika 3 ukiwa ndani. Ukitoka nje kwa zaidi ya dakika 10 inafunga. Mtu anayeandika au anayetuma risiti haondolewi katikati ya kazi.")

    heading(doc, "Jinsi inavyofanya kazi")
    para(doc, "Mmiliki anasakinisha programu juu ya ile iliyopo ikiwa tayari ipo. Daftari la simu linabaki. Anaingia kwa PIN yake. Anaweka anwani ya duka na neno la kuunganisha na anahifadhi. Kisha anaweka jina la duka na mahali na simu ya duka na Lipa Namba na ujumbe wa risiti.")
    para(doc, "Muuzaji anasakinisha programu kwenye simu yake. Anachagua kuwa muuzaji na anaweka anwani ileile na neno lilelile. Anaingia kwa PIN yake. Anauza na anapokea deni na anaona stoo. Haoni faida.")
    para(doc, "Ukiuza bila mtandao risiti inabaki kwenye simu. Mtandao ukirudi simu zinatumana daftari. Duka lingine halioni hesabu hii ikiwa lina anwani yake na neno lake. Maduka yanayoshiriki anwani moja na neno moja yanaandika kwenye daftari moja. Kwa hiyo kila duka lipate anwani yake.")

    heading(doc, "Moduli na faida ya kila moja")
    para(doc, "Kila moduli hapa chini ipo ndani ya programu. Picha ni ya programu yenyewe. Maandishi yanaeleza kazi na faida.", before=2, after=8)
    icon_p = doc.add_paragraph()
    icon_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    icon_p.paragraph_format.space_after = Pt(8)
    icon_p.add_run().add_picture(ICON, width=Cm(2.2))
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(8)
    run(cap, "Ikoni ya PhoneVault", 10, False, MUTED)
    for name, work, benefit, shot in MODULES:
        module(doc, name, work, benefit, shot)

    heading(doc, "Intaneti na kupakia")
    para(doc, "Uza na stoo na deni na risiti vinafanya kazi bila mtandao. Intaneti inahitajika simu mbili zinapokutana na WhatsApp inapotuma risiti. Kufungua programu kumewekwa kusoma daftari la simu kwanza. Muunganiko unaendelea nyuma na hauzuii mtu kuingia.")

    heading(doc, "Malipo ya programu")
    para(doc, "Bei ya PhoneVault ni TSH 400000 mara moja. Kisha TSH 20000 kila mwezi. Malipo haya ni ya programu na ya simu mbili za duka moja na ya kuonyeshwa namna ya kuitumia. Pesa ya mauzo ya duka si ya Zeyhaan Tech Solution. Mteja analipa Cash au Lipa Namba ya duka lake.")

    heading(doc, "Nje ya programu hii")
    para(doc, "PhoneVault haichukui kadi. Haichapi risiti ya mashine ya joto. Haina ankara ya TRA. Haina ujumbe wa SMS wa kiotomatiki. Haifanyi kazi kwenye iPhone hadi toleo la Apple lijengwe. Ni duka moja na simu mbili. Si mtandao wa maduka mengi kwenye seva moja.")

    para(doc, "Zeyhaan Tech Solution    zeyhaan.com    0624945919", 11, True, GREEN, before=8, after=0, align="center")
    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
