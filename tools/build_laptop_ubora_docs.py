import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_ubora_docs as base

from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor

LOGO = base.LOGO
ICON = r"C:\Users\USER\.gemini\antigravity-ide\scratch\LaptopShop\mobile\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
CHARTS = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\LaptopShop\docshots")
SW = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\LaptopShop\LaptopVaultUboraKiswahili.docx")
EN = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\LaptopShop\LaptopVaultUboraEnglish.docx")
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
PALE = RGBColor(0xE7, 0xF6, 0xE4)

PARTS = [
    (18, 88, "Mauzo na stoo", "Sales and stock", "Uza na stoo na serial na risiti vinafanya kazi kwenye simu.", "Sell and stock and the serial and the receipt work on the phone."),
    (14, 86, "Deni na mawinga", "Debt and items out", "Deni la sehemu na chenji na matatizo na bidhaa za nje vinahesabiwa kando.", "Part payments and change and faults and items taken out stay in their own counts."),
    (16, 76, "Usalama", "Security", "PIN imefichwa na skrini ya siri inazuia picha. Mkaguzi wa nje bado hajatoa cheti.", "The PIN is hidden and the secret screen blocks photos. An outside tester has not issued a certificate."),
    (10, 86, "Muonekano", "Look", "Kichwa kinakaa chini ya saa. Vikundi vinazunguka kwenye mistari. Rangi ya kijani na kadi zinafanana kwenye kurasa.", "The title sits under the clock. Groups wrap onto fitting lines. The green and the cards match across the pages."),
    (8, 90, "Lugha", "Language", "Kiswahili na English na Kiarabu vinabadilika kwenye kurasa. Jina la bidhaa na jina la mteja vinabaki kama vilivyoandikwa.", "Swahili and English and Arabic change across the pages. A product name and a customer name stay as written."),
    (12, 92, "Bila mtandao", "Work without a network", "Mauzo na stoo na deni vinaendelea mtandao ukikatika.", "Sales and stock and debt continue when the network stops."),
    (12, 70, "Simu zinazofaa", "Phones that fit", "Android 7 na kuendelea. Samsung na Tecno na Infinix na Itel na Xiaomi na Oppo. iPhone bado haipo.", "Android 7 and above. Samsung and Tecno and Infinix and Itel and Xiaomi and Oppo. iPhone is still absent."),
    (5, 74, "Kupakia", "Loading", "Programu inafunguka kutoka daftari la simu. Faili inayotumwa ni megabaiti 73 kwa sababu imebeba injini tatu.", "The app opens from the phone book. The file sent is 73 megabytes because it carries three engines."),
    (5, 90, "Ujumbe wa tatizo", "Problem notice", "Tatizo linaonekana kwa utepe mwekundu juu na utepe unaondoka tatizo likisharekebishwa. Mzunguko unaonekana picha au kazi inaposubiri.", "A problem shows on a red band at the top and the band leaves when the problem is fixed. A spinner shows while a picture or a task waits."),
]

TOTAL = base.total_of(PARTS)
assert TOTAL == 83, TOTAL

MODULES = [
    ("Nyumbani", "Home", "Ukurasa wa kwanza unaonyesha leo. Mmiliki anaona fedha. Muuzaji haoni faida.", "The first page shows today. The owner sees the money. The seller does not see profit."),
    ("Uza", "Sell", "Malipo ni Cash au Lipa Namba. Deni na chenji vinaandikwa. Risiti inaenda WhatsApp. Vikundi vinazunguka kwenye mistari.", "Payment is Cash or Lipa number. Debt and change are recorded. The receipt goes to WhatsApp. Groups wrap onto fitting lines."),
    ("Stoo", "Stock", "Laptop au desktop inaingia kwa serial. RAM na ukubwa wa kioo vinajazwa ikiwa vinahitajika. Skana inalenga msimbo mmoja. Vifaa vinaingia kwa idadi. Utafutaji uko juu. Vipande vyenye matatizo vinabaki kando.", "A laptop or a desktop enters by serial. RAM and screen size are filled when they are needed. The scanner aims at one code. Accessories enter by quantity. Search sits at the top. Faulty pieces stay apart."),
    ("Deni", "Debt", "Malipo ya sehemu yanaingia Cash au Lipa Namba. Pesa inahesabiwa siku iliyopokelewa.", "A part payment enters as Cash or Lipa number. The money counts on the day it was received."),
    ("Mawinga", "Items out", "Bidhaa inayotoka na mtu inaandikwa na inarudi sehemu au yote. Utafutaji uko juu.", "An item taken out by a person is recorded and comes back in part or in full. Search sits at the top."),
    ("Matatizo", "Faults", "Laptop yenye hitilafu inatoka kwenye stoo ya kuuza na gharama yake inaingia hasara. Kichwa kinakaa chini ya saa na vikundi vinazunguka.", "A faulty laptop leaves the sellable stock and its cost enters the loss. The title sits under the clock and the groups wrap."),
    ("Historia", "History", "Historia inafunguka kwa leo. Duka linaweza kuchagua leo au wiki au mwezi au siku zote au siku moja. Kila risiti inabaki na namba yake.", "History opens on today. The shop can choose today or the week or the month or all days or one day. Each receipt stays with its number."),
    ("Uchambuzi", "Analysis", "Vipindi vinakaa kwenye mistari. Cash na Lipa Namba ni pesa iliyoingia siku hiyo pamoja na malipo ya deni.", "The periods sit on wrapped lines. Cash and Lipa number are the money received that day including a debt payment."),
    ("Ripoti", "Reports", "Mmiliki anatoa faida na mauzo na stoo. Muuzaji haoni faida.", "The owner exports profit and sales and stock. The seller does not see profit."),
    ("Wateja", "Customers", "Jina na simu vinatoka kwenye mauzo. Deni linaweza kukumbushwa WhatsApp.", "The name and phone come from a sale. A debt can be reminded on WhatsApp."),
    ("Warranty", "Warranty", "Serial inaandikwa au inaskanwa kwa kamera ili kuona muda. Kamera inasoma msimbo mmoja ulio ndani ya boksi.", "The serial is typed or scanned with the camera to see the period. The camera reads the one code inside the frame."),
    ("Mipangilio", "Settings", "Jina na mahali na Lipa Namba na logo vinahifadhiwa. Lugha tatu zinachaguliwa hapa.", "The name and place and Lipa number and logo are saved. Three languages are chosen here."),
    ("Taarifa", "Alerts", "Stoo ndogo na deni na mawinga vinaandikwa kwa mmiliki.", "Low stock and debt and items out are written for the owner."),
]


def banner(doc, line):
    table = doc.add_table(rows=1, cols=2)
    base.no_border(table)
    base.col_widths(table, [3.4, 14.2])
    logo, name = table.rows[0].cells
    base.shade(logo, base.DEEP)
    base.shade(name, base.DEEP)
    base.margins(logo, 120, 120, 120, 40)
    base.margins(name, 140, 120, 80, 140)
    logo.text = ""
    lp = logo.paragraphs[0]
    lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    lp.add_run().add_picture(LOGO, width=Cm(2.3))
    name.text = ""
    p1 = name.paragraphs[0]
    base.run(p1, "LAPTOPVAULT", 22, True, WHITE)
    p2 = name.add_paragraph()
    p2.paragraph_format.space_before = Pt(2)
    base.run(p2, line, 12, False, PALE)
    p3 = name.add_paragraph()
    p3.paragraph_format.space_before = Pt(6)
    base.run(p3, "Zeyhaan Tech Solution", 11, True, WHITE)


def build(lang):
    sw = lang == "sw"
    CHARTS.mkdir(parents=True, exist_ok=True)
    bars = str(CHARTS / ("chati-sehemu-sw.png" if sw else "chati-sehemu-en.png"))
    totals = str(CHARTS / ("chati-jumla-sw.png" if sw else "chati-jumla-en.png"))
    base.draw_bars(bars, "Ubora kwa asilimia" if sw else "Quality in percent", [(p[2] if sw else p[3], p[1]) for p in PARTS])
    base.draw_totals(
        totals,
        "Duka la Android" if sw else "An Android shop",
        TOTAL,
        "Simu zote duniani" if sw else "Every phone in the world",
        50,
        "Asilimia 83 ni kazi iliyokusudiwa. Asilimia 50 inahesabu iPhone." if sw else "83 percent is the intended job. 50 percent counts iPhone.",
    )
    doc = base.new_doc("Zeyhaan Tech Solution    LaptopVault    zeyhaan.com    0624945919")
    doc.core_properties.title = "LaptopVault"
    banner(doc, "Daftari la duka la laptop" if sw else "The book of a laptop shop")
    if sw:
        base.para(doc, "Imeandaliwa na Zeyana Thabit Juma mwanzilishi wa Zeyhaan Tech Solution. Tathmini imeandikwa tarehe 4 Novemba 2026 baada ya kusoma programu yenyewe.", 11, False, base.MUTED, before=10, align="left")
        base.para(doc, "LaptopVault ni programu ya duka moja la laptop na desktop na vifaa. Jina chini ya ikoni ni LaptopVault. Ikoni ni alama ya Zeyhaan. Mmiliki na muuzaji wako kwenye simu tofauti. Mauzo yanaendelea mtandao ukikatika. Mteja analipa Cash au Lipa Namba ya duka nje ya programu.")
        base.para(doc, "Programu inazungumza Kiswahili na English na Kiarabu. Tatizo linaonekana kwa utepe mwekundu juu ya skrini kwa maneno mafupi na utepe unaondoka tatizo likisharekebishwa. Picha au kazi inayosubiri inaonyesha mzunguko.")
        base.heading(doc, "Kwa nini duka lichague LaptopVault")
        base.para(doc, "Duka la laptop linahitaji serial na deni la sehemu na bidhaa zenye matatizo na simu mbili na kazi bila mtandao. LaptopVault imejengwa kwa kazi hiyo. Lugha inaweza kuwa Kiswahili au English au Kiarabu. Muuzaji haoni faida. Chenji si mauzo. Lipa Namba ni namba ya duka na programu haichukui pesa.")
        base.heading(doc, "Ubora kwa asilimia")
        base.para(doc, "Kila kipengele kina uzito. Uzito unaeleza sehemu yake kwenye jumla. Jumla ya kazi iliyokusudiwa ni asilimia 83. Hii ni duka moja la laptop kwenye simu mbili za Android.")
        base.para(doc, "Kwa simu zote duniani pamoja na iPhone tathmini ni asilimia 50. Faili ya Apple bado haipo kwa hiyo duka linalotumia iPhone peke yake haliwezi kuingia.")
        base.picture(doc, totals, 16.2)
        base.picture(doc, bars, 16.2)
        for weight, score, name, _en, meaning, _emean in PARTS:
            base.score_row(doc, name, f"Uzito {weight} kati ya 100", score, meaning)
        base.para(doc, "Jumla: asilimia 83 kwa kazi iliyokusudiwa. Asilimia 50 kwa simu zote duniani pamoja na iPhone.", 12, True, base.GREEN, before=8)
        base.heading(doc, "Ushahidi wa usalama")
        base.para(doc, "Hakuna cheti cha kampuni ya nje ya usalama. Tathmini hii inasoma programu yenyewe.")
        base.para(doc, "PIN ina chumvi na inapita mizunguko 12000 kabla ya kuhifadhiwa. Majaribio mengi yanasubirishwa. Skrini ya PIN na namba za siri zinazuia picha. Nakala ya simu imezimwa. Muuzaji haoni faida wala gharama. Anwani ya duka inayohifadhiwa inahitaji https.")
        base.para(doc, "Kikomo: programu bado inaruhusu mtandao wa karibu usio na https. Hii inashusha usalama hadi asilimia 76.")
        base.heading(doc, "Mipaka")
        base.para(doc, "iPhone haipo. Android 6 haifai. Programu haichukui kadi. Haichapi mashine ya joto. Haina ankara ya TRA. Haina SMS ya kiotomatiki. Ni duka moja na simu mbili. Kila duka linahitaji anwani yake na neno lake. Maduka yanayoshiriki anwani moja yanaandika kwenye daftari moja.")
        base.para(doc, "Bei ni TSH 400000 mara moja. Kisha TSH 20000 kila mwezi kwa programu na simu mbili za duka moja. Pesa ya mauzo ya duka si ya Zeyhaan Tech Solution.")
        base.heading(doc, "Moduli")
        base.para(doc, "Picha za skrini za LaptopVault hazijawekwa hapa. Maelezo yafuatayo yamesomwa kwenye programu yenyewe.")
        for name, _en, work, _ew in MODULES:
            base.heading(doc, name)
            base.para(doc, work)
    else:
        base.para(doc, "Prepared by Zeyana Thabit Juma founder of Zeyhaan Tech Solution. The review was written on 4 November 2026 after reading the app itself.", 11, False, base.MUTED, before=10, align="left")
        base.para(doc, "LaptopVault is the app of one shop for laptops and desktops and accessories. The name under the icon is LaptopVault. The icon is the Zeyhaan mark. The owner and the seller use separate phones. Sales continue when the network stops. The customer pays Cash or the shop Lipa number outside the app.")
        base.para(doc, "The app speaks Swahili and English and Arabic. A problem appears on a red band at the top of the screen in short words and the band leaves when the problem is fixed. A picture or a task that is waiting shows a spinner.")
        base.heading(doc, "Why a shop should choose LaptopVault")
        base.para(doc, "A laptop shop needs a serial and part payments and faulty goods and two phones and work without a network. LaptopVault is built for that job. The language can be Swahili or English or Arabic. The seller does not see profit. Change is not a sale. The Lipa number belongs to the shop and the app does not take the money.")
        base.heading(doc, "Quality in percent")
        base.para(doc, "Each part has a weight. The weight is its share of the total. The total for the intended job is 83 percent. That job is one laptop shop on two Android phones.")
        base.para(doc, "For every phone in the world including iPhone the review is 50 percent. The Apple file is still absent so a shop that uses only iPhone cannot enter.")
        base.picture(doc, totals, 16.2)
        base.picture(doc, bars, 16.2)
        for weight, score, _sw, name, _smean, meaning in PARTS:
            base.score_row(doc, name, f"Weight {weight} out of 100", score, meaning)
        base.para(doc, "Total: 83 percent for the intended job. 50 percent for every phone in the world including iPhone.", 12, True, base.GREEN, before=8)
        base.heading(doc, "Security evidence")
        base.para(doc, "There is no certificate from an outside security firm. This review reads the app itself.")
        base.para(doc, "The PIN has a salt and passes 12000 rounds before it is stored. Too many tries must wait. The PIN screen and the secret figures block photos. Phone backup is off. The seller does not see profit or cost. A saved shop address must start with https.")
        base.para(doc, "Limit: the app still allows a nearby network without https. This holds security at 76 percent.")
        base.heading(doc, "Limits")
        base.para(doc, "iPhone is absent. Android 6 does not fit. The app does not take a card. It does not print on a heat machine. It has no TRA invoice. It has no automatic SMS. It is one shop and two phones. Each shop needs its own address and its own word. Shops that share one address write into one book.")
        base.para(doc, "The price is TSH 400000 once. Then TSH 20000 every month for the app and the two phones of one shop. The shop sales money is not money of Zeyhaan Tech Solution.")
        base.heading(doc, "Modules")
        base.para(doc, "Screen pictures of LaptopVault are not placed here. The notes below were read from the app itself.")
        for _sw, name, _work, work in MODULES:
            base.heading(doc, name)
            base.para(doc, work)
    icon = doc.add_paragraph()
    icon.alignment = WD_ALIGN_PARAGRAPH.CENTER
    icon.add_run().add_picture(ICON, width=Cm(2.0))
    base.para(doc, "Zeyhaan Tech Solution    zeyhaan.com    0624945919", 11, True, base.GREEN, before=6, align="center")
    doc.save(str(SW if sw else EN))


if __name__ == "__main__":
    build("sw")
    build("en")
    base.check(str(SW))
    base.check(str(EN))
