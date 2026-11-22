# -*- coding: utf-8 -*-
"""Write mobile/lib/lexicon.dart from phrase rows: swahili, english, arabic."""
from pathlib import Path

ROWS = r"""
Akaunti haipo.	Account is missing.	الحساب غير موجود.
Weka jina la mmiliki.	Enter the owner name.	أدخل اسم المالك.
PIN iwe tarakimu 4.	PIN must be 4 digits.	يجب أن يكون PIN من 4 أرقام.
Hiki ni kwa mmiliki tu.	Owner only.	للمالك فقط.
Hakuna bidhaa yenye msimbo huo.	No item with that code.	لا توجد سلعة بهذا الرمز.
Huna ruhusa.	Not allowed.	غير مسموح.
Huna ruhusa ya wateja.	Customers are not allowed.	العملاء غير مسموح لهم.
Weka jina la mteja.	Enter the customer name.	أدخل اسم العميل.
Namba ianze na 0 na iwe tarakimu 10.	Number must start with 0 and have 10 digits.	الرقم يبدأ بـ 0 ويكون 10 أرقام.
Huna ruhusa ya madeni.	Debts are not allowed.	الديون غير مسموحة.
Ingia kwanza.	Sign in first.	ادخل أولاً.
Weka jina la duka.	Enter the shop name.	أدخل اسم الدكان.
Lipa Namba iwe tarakimu 5 hadi 15.	Lipa number must be 5 to 15 digits.	رقم Lipa من 5 إلى 15 رقماً.
Simu ya duka ianze na 0 na iwe tarakimu 10.	Shop phone must start with 0 and have 10 digits.	هاتف الدكان يبدأ بـ 0 ويكون 10 أرقام.
Picha haikusomeka. Chagua JPG au PNG.	Picture could not be read. Choose JPG or PNG.	تعذرت قراءة الصورة. اختر JPG أو PNG.
Weka anwani ya kompyuta.	Enter the shop address.	أدخل عنوان الدكان.
Anwani imehifadhiwa kwenye simu hii. Seva haijapokea duka. Angalia mtandao na uhifadhi tena.	Address saved on this phone. The server did not receive the shop. Check the network and save again.	حُفظ العنوان في هذا الهاتف. الخادم لم يستلم الدكان. افحص الشبكة واحفظ مرة أخرى.
Weka anwani na neno la kuunganisha.	Enter the address and the connecting word.	أدخل العنوان وكلمة الربط.
Anwani ianze na https://	Address must start with https://	العنوان يبدأ بـ https://
Neno au mtandao umekataa. Angalia neno na ujaribu tena.	The word or the network refused. Check the word and try again.	الكلمة أو الشبكة رفضت. افحص الكلمة وحاول مرة أخرى.
Duka bado halijatumwa. Fungua simu ya mmiliki yenye mauzo, weka anwani na neno, kisha hifadhi.	The shop has not been sent yet. Open the owner phone, enter the address and the word, then save.	لم يُرسل الدكان بعد. افتح هاتف المالك الذي فيه المبيعات، أدخل العنوان والكلمة، ثم احفظ.
Weka jina la muuzaji.	Enter the seller name.	أدخل اسم البائع.
Jina hili tayari lipo.	That name already exists.	هذا الاسم موجود.
Huwezi kufunga akaunti ya mmiliki.	The owner account stays open.	حساب المالك يبقى مفتوحاً.
Badilisha PIN yako kwenye sehemu ya PIN yangu.	Change your PIN under My PIN.	غيّر PIN من قسم PIN الخاص بي.
Maneno hayafanani.	The words do not match.	الكلمتان غير متطابقتين.
Neno liwe herufi 8 hadi 40.	The word must be 8 to 40 letters.	الكلمة من 8 إلى 40 حرفاً.
Neno liwe na herufi, si tarakimu peke yake.	The word needs a letter.	الكلمة تحتاج حرفاً.
Usiandike neno la kuunganisha.	Do not type the connecting word here.	لا تكتب كلمة الربط هنا.
PIN hazifanani.	The PINs do not match.	رقما PIN غير متطابقين.
PIN hazifanani. Anza tena.	The PINs do not match. Start again.	رقما PIN غير متطابقين. ابدأ من جديد.
Bado hakuna neno la kurejesha.	No recovery word yet.	لا توجد كلمة استرجاع بعد.
Neno si sahihi.	Wrong word.	كلمة خاطئة.
Akaunti ya mmiliki haipo.	Owner account is missing.	حساب المالك غير موجود.
PIN mpya iwe tarakimu 4.	New PIN must be 4 digits.	PIN الجديد 4 أرقام.
Chagua PIN tofauti.	Choose a different PIN.	اختر PIN مختلفاً.
Mmiliki ana sehemu zote.	The owner already has every part.	المالك يملك كل الأقسام.
PIN si sahihi.	Wrong PIN.	PIN خاطئ.
PIN ya zamani si sahihi.	The old PIN is wrong.	PIN القديم خاطئ.
Huna ruhusa ya kubadilisha stoo.	You cannot change stock.	لا يمكنك تغيير المخزون.
Faili hii si nakala ya PhoneVault.	This file is not a PhoneVault copy.	هذا الملف ليس نسخة PhoneVault.
Nakala hii inatoka kwenye toleo jipya. Sasisha app kwanza.	This copy is from a newer app. Update the app first.	هذه النسخة من تطبيق أحدث. حدّث التطبيق أولاً.
Nakala haikurejeshwa. Duka la awali limebaki.	The copy was not restored. The shop stayed as it was.	لم تُسترجع النسخة. بقي الدكان كما كان.
Kundi la simu halifutiki.	The phone group cannot be deleted.	لا يمكن حذف مجموعة الهواتف.
Kundi halipo.	Group is missing.	المجموعة غير موجودة.
Kundi la Nyingine linabaki kwa bidhaa zisizo na kundi.	The Other group stays for items with no group.	مجموعة أخرى تبقى للسلع بلا مجموعة.
Mteja haipo.	Customer is missing.	العميل غير موجود.
Ana deni wazi. Pokea malipo kwanza.	This customer still has a debt. Receive the payment first.	لهذا العميل دين مفتوح. استلم الدفع أولاً.
Weka idadi unayoongeza.	Enter the quantity to add.	أدخل الكمية التي تضيفها.
Bidhaa haipo.	Item is missing.	السلعة غير موجودة.
Idadi si sahihi.	Quantity is not valid.	الكمية غير صحيحة.
Kiwango cha onyo si sahihi.	The warning level is not valid.	حد التنبيه غير صحيح.
Warranty iwe siku 0 hadi 730, kwa wiki na siku.	Warranty must be 0 to 730 days.	الضمان من 0 إلى 730 يوماً.
Idadi yenye matatizo si sahihi.	Faulty quantity is not valid.	كمية الأعطال غير صحيحة.
Barcode si sahihi.	Barcode is not valid.	الباركود غير صحيح.
Barcode hii tayari ipo.	That barcode already exists.	هذا الباركود موجود.
Weka jina la bidhaa.	Enter the item name.	أدخل اسم السلعة.
Weka jina la simu.	Enter the phone name.	أدخل اسم الهاتف.
IMEI iwe tarakimu 8 hadi 20.	IMEI must be 8 to 20 digits.	IMEI من 8 إلى 20 رقماً.
Bei ya chini si sahihi.	Minimum price is not valid.	أقل سعر غير صحيح.
Hali ya simu si sahihi.	Phone condition is not valid.	حالة الهاتف غير صحيحة.
IMEI hii tayari ipo.	That IMEI already exists.	هذا IMEI موجود.
Simu haipo.	Phone is missing.	الهاتف غير موجود.
Simu iliyouzwa haiwezi kufutwa.	A sold phone cannot be deleted.	لا يمكن حذف هاتف مباع.
Deni halipo.	Debt is missing.	الدين غير موجود.
Deni hili tayari limefungwa.	This debt is already closed.	هذا الدين مغلق.
Weka kiasi.	Enter the amount.	أدخل المبلغ.
Kiasi kinazidi deni lililobaki.	The amount is more than the balance.	المبلغ أكبر من المتبقي.
Risiti haipo.	Receipt is missing.	الإيصال غير موجود.
Risiti tayari imefutwa.	Receipt is already void.	الإيصال ملغى.
Risiti hii ina marejesho. Rudisha kilichobaki, usifute risiti.	This receipt has a return. Return what is left. Do not void it.	هذا الإيصال فيه مرتجع. أرجع المتبقي ولا تلغِ الإيصال.
Deni lina malipo. Huwezi kufuta risiti hii.	The debt has a payment. This receipt cannot be voided.	الدين فيه دفعة. لا يمكن إلغاء هذا الإيصال.
Weka jina la mtu aliyechukua.	Enter the name of the person who took it.	أدخل اسم من أخذ البضاعة.
Chagua bidhaa aliyochukua.	Choose the item they took.	اختر السلعة التي أخذها.
Rekodi haipo.	Record is missing.	السجل غير موجود.
Bidhaa hizi zimesharudishwa.	These items are already back.	هذه السلع رجعت.
Chagua idadi anayorudisha.	Choose the quantity coming back.	اختر الكمية الراجعة.
Bei si sahihi.	Price is not valid.	السعر غير صحيح.
Gharama si sahihi.	Cost is not valid.	التكلفة غير صحيحة.
Bidhaa haipo kwenye risiti.	Item is not on the receipt.	السلعة ليست في الإيصال.
Picha haikufunguka.	The picture did not open.	لم تُفتح الصورة.
Andika bei ya kuuza.	Enter the selling price.	أدخل سعر البيع.
Namba imenakiliwa	Number copied.	تم نسخ الرقم.
Duka limehifadhiwa	Shop saved.	تم حفظ الدكان.
Logo iko juu ya risiti.	Logo is on the receipt.	الشعار على الإيصال.
Picha yako iko kwenye dashibodi.	Your photo is on the home screen.	صورتك على الشاشة الرئيسية.
PIN imebadilika	PIN changed.	تم تغيير PIN.
Neno la kurejesha limehifadhiwa. Usipeane kwa muuzaji.	Recovery word saved. Do not give it to the seller.	حُفظت كلمة الاسترجاع. لا تعطها للبائع.
Sehemu zimehifadhiwa	Parts saved.	تم حفظ الأقسام.
Imeondolewa. Historia inabaki.	Removed. The history stays.	تمت الإزالة. السجل يبقى.
Kundi hili lipo tayari.	That group already exists.	هذه المجموعة موجودة.
Kundi limeongezwa.	Group added.	تمت إضافة المجموعة.
Kundi limefutwa.	Group deleted.	تم حذف المجموعة.
Sehemu imerudi stoo. Iliyobaki bado iko nje.	Part is back in stock. The rest is still out.	جزء رجع للمخزون. الباقي ما زال خارجاً.
Bidhaa zote zimerudi stoo.	All items are back in stock.	كل السلع رجعت للمخزون.
WhatsApp imefunguka. Bonyeza Tuma kumkumbusha mteja.	WhatsApp is open. Press Send to remind the customer.	واتساب مفتوح. اضغط إرسال لتذكير العميل.
WhatsApp imefunguka kwa namba hii. Bonyeza Tuma.	WhatsApp is open for this number. Press Send.	واتساب مفتوح لهذا الرقم. اضغط إرسال.
WhatsApp haikufunguka kwenye simu hii.	WhatsApp did not open on this phone.	لم يُفتح واتساب على هذا الهاتف.
Inatuma mabadiliko...	Sending changes...	جارٍ إرسال التغييرات...
Inaleta mabadiliko...	Bringing changes...	جارٍ جلب التغييرات...
Inaweka logo...	Setting the logo...	جارٍ وضع الشعار...
Inaondoa logo...	Removing the logo...	جارٍ إزالة الشعار...
Inaweka picha...	Setting the photo...	جارٍ وضع الصورة...
Inaondoa picha...	Removing the photo...	جارٍ إزالة الصورة...
PIN ya mmiliki imebadilika. Chagua mmiliki, kisha ingia na PIN mpya.	Owner PIN changed. Choose the owner, then sign in with the new PIN.	تغير PIN المالك. اختر المالك ثم ادخل بـ PIN الجديد.
Duka halikufunguka. Fungua tena.	The shop did not open. Open the app again.	لم يُفتح الدكان. افتح التطبيق مرة أخرى.
Token ya cloud si sahihi.	The cloud word is wrong.	كلمة السحابة خاطئة.
Mtandao haupo. Risiti imebaki kwenye simu.	No network. The receipt stayed on this phone.	لا توجد شبكة. بقي الإيصال في الهاتف.
Cloud haijafikiwa. Risiti imebaki kwenye simu.	Cloud was not reached. The receipt stayed on this phone.	لم تُبلغ السحابة. بقي الإيصال في الهاتف.
Namba haiko sahihi.	The number is not valid.	الرقم غير صحيح.
Habari Zeyhaan, nahitaji msaada kuhusu PhoneVault.	Hello Zeyhaan, I need help with PhoneVault.	مرحبا زيهان، أحتاج مساعدة بخصوص PhoneVault.
Huna ruhusa ya kurudisha mauzo haya.	You cannot return this sale.	لا يمكنك إرجاع هذا البيع.
Kikapu kiko tupu.	The cart is empty.	السلة فارغة.
Chagua aina ya malipo.	Choose a payment.	اختر طريقة الدفع.
Kiasi si sahihi.	The amount is not valid.	المبلغ غير صحيح.
Weka Lipa Namba kwenye mipangilio kwanza.	Add the Lipa number in settings first.	أضف رقم Lipa في الإعدادات أولاً.
Deni linahitaji jina na namba ya simu ya mteja.	A debt needs the customer name and phone.	الدين يحتاج اسم العميل ورقم هاتفه.
Weka muda anaokopa. Siku, wiki, au mwezi.	Enter the term. Days, weeks, or months.	أدخل المدة. أيام أو أسابيع أو أشهر.
Weka kiasi kilicholipwa, au chagua Deni zima.	Enter the amount paid, or choose full debt.	أدخل المبلغ المدفوع، أو اختر الدين كاملاً.
Kundi halijahifadhiwa.	The group was not saved.	لم تُحفظ المجموعة.
Weka jina la kundi.	Enter the group name.	أدخل اسم المجموعة.
Andika sababu ya kurudisha.	Enter the reason for the return.	أدخل سبب الإرجاع.
Chagua bidhaa ya kurudisha.	Choose an item to return.	اختر سلعة للإرجاع.
Risiti hii imefutwa.	This receipt is void.	هذا الإيصال ملغى.
Imerudi kuuzwa	It is for sale again.	عادت للبيع.
Muuzaji ameingia	Seller signed in.	دخل البائع.
Inafungua duka...	Opening the shop...	جارٍ فتح الدكان...
Inaunganisha duka...	Joining the shop...	جارٍ الانضمام للدكان...
Inakagua neno...	Checking the word...	جارٍ فحص الكلمة...
Inahifadhi duka...	Saving the shop...	جارٍ حفظ الدكان...
Inaongeza idadi...	Adding quantity...	جارٍ إضافة الكمية...
Inaondoa bidhaa...	Removing the item...	جارٍ إزالة السلعة...
Inaondoa simu...	Removing the phone...	جارٍ إزالة الهاتف...
Inaongeza kundi...	Adding the group...	جارٍ إضافة المجموعة...
Inafuta kundi...	Deleting the group...	جارٍ حذف المجموعة...
Inaandaa...	Preparing...	جارٍ التجهيز...
Rudi nyuma	Back	رجوع
Mimi ni muuzaji	I am the seller	أنا البائع
Mimi ni mmiliki	I am the owner	أنا المالك
Jina la mmiliki	Owner name	اسم المالك
Ingia kwenye duka la mmiliki	Join the owner shop	ادخل دكان المالك
Nimesahau PIN	Forgot PIN	نسيت PIN
Chagua simu	Choose this phone	اختر هذا الهاتف
Fungua duka	Open the shop	افتح الدكان
Rudia PIN	Repeat the PIN	أعد PIN
Karibu	Welcome	أهلاً
Muuzaji anaingia kwa PIN aliyopewa na mmiliki.	The seller signs in with the PIN from the owner.	البائع يدخل بـ PIN الذي أعطاه المالك.
PIN ya tarakimu 4. Inabaki kwenye simu hii.	A 4 digit PIN. It stays on this phone.	PIN من 4 أرقام. يبقى في هذا الهاتف.
weka PIN	enter PIN	أدخل PIN
Unganisha na duka	Join the shop	اربط الدكان
Anwani ya duka	Shop address	عنوان الدكان
Neno la kuunganisha	Connecting word	كلمة الربط
Funga	Close	إغلاق
Unganisha	Join	اربط
Mmiliki aweke neno la kurejesha kwenye Mipangilio akiwa ameingia. Muuzaji akisahau, mmiliki anamwekewa PIN mpya humo humo.	The owner sets a recovery word in Settings after signing in. If a seller forgets, the owner sets a new PIN there.	المالك يضع كلمة استرجاع في الإعدادات بعد الدخول. إذا نسي البائع، المالك يضع له PIN جديداً هناك.
Weka PIN mpya	Set a new PIN	ضع PIN جديداً
Neno la kurejesha	Recovery word	كلمة الاسترجاع
PIN mpya ya mmiliki	New owner PIN	PIN الجديد للمالك
Rudia PIN	Repeat the PIN	أعد PIN
Sawa	OK	حسناً
Nyumbani	Home	الرئيسية
Uza	Sell	بيع
Stoo	Stock	المخزون
Deni	Debt	دين
Zaidi	More	المزيد
Lugha	Language	اللغة
Duka	Shop	الدكان
Weka logo	Add logo	أضف شعاراً
Badilisha logo	Change logo	غيّر الشعار
Ondoa logo	Remove logo	أزل الشعار
Jina la duka	Shop name	اسم الدكان
Mahali / mtaa	Place	المكان
Simu ya duka	Shop phone	هاتف الدكان
Ujumbe wa chini ya risiti	Receipt footer	نص أسفل الإيصال
Kompyuta ya duka	Shop address	عنوان الدكان
Neno la kuunganisha simu	Connecting word	كلمة ربط الهاتف
Hifadhi	Save	حفظ
Akaunti	Account	الحساب
Weka picha yangu	Add my photo	أضف صورتي
Badilisha picha yangu	Change my photo	غيّر صورتي
Ondoa picha	Remove photo	أزل الصورة
Badilisha PIN	Change PIN	غيّر PIN
Funga duka	Lock	أقفل
Inakaa juu ya risiti	Shown on the receipt	يظهر على الإيصال
Thibitisha PIN	Confirm PIN	أكّد PIN
PIN ya mmiliki	Owner PIN	PIN المالك
PIN mpya	New PIN	PIN جديد
PIN ya sasa	Current PIN	PIN الحالي
Neno jipya	New word	كلمة جديدة
Rudia neno	Repeat the word	أعد الكلمة
Muuzaji mpya	New seller	بائع جديد
PIN ya tarakimu 4	4 digit PIN	PIN من 4 أرقام
Gharama na faida	Cost and profit	التكلفة والربح
Historia yote	All history	كل السجل
Hariri stoo	Edit stock	تعديل المخزون
Hifadhi sehemu	Save parts	حفظ الأقسام
Wafanyakazi	Staff	الموظفون
Ongeza	Add	أضف
Sehemu hii haijawashwa kwa akaunti yako. Mmiliki anaichagua kwenye wafanyakazi.	This part is off for your account. The owner turns it on under staff.	هذا القسم مغلق لحسابك. المالك يفتحه من الموظفين.
Ghairi	Cancel	إلغاء
Endelea	Continue	متابعة
Mmiliki	Owner	المالك
Muuzaji	Seller	البائع
Cash	Cash	نقداً
Lipa Namba	Lipa Namba	Lipa Namba
Historia ya mauzo	Sales history	سجل المبيعات
Mauzo yangu	My sales	مبيعاتي
Tafuta risiti, mteja, bidhaa	Search receipt, customer, item	ابحث عن إيصال أو عميل أو سلعة
Leo	Today	اليوم
Wiki	Week	أسبوع
Mwezi	Month	شهر
Zote	All	الكل
Siku	Day	يوم
Ondoa	Clear	مسح
Hakuna mauzo kwenye chaguo hili.	No sales for this choice.	لا مبيعات لهذا الاختيار.
Imerudishwa {0}	Returned {0}	مُرجَع {0}
Deni {0}	Debt {0}	دين {0}
Tuma risiti	Send receipt	أرسل الإيصال
Rudisha bidhaa	Return items	إرجاع سلع
Futa risiti	Void receipt	إلغاء الإيصال
Stoo itarudi. Huwezi kufuta kama deni tayari lina malipo.	Stock comes back. You cannot void it if the debt already has a payment.	المخزون يرجع. لا يمكن الإلغاء إذا كان الدين فيه دفعة.
Risiti imefutwa	Receipt voided.	تم إلغاء الإيصال.
Bidhaa imerudi	Item is back	رجعت السلعة
Thamani {0}	Value {0}	القيمة {0}
Rudisha pesa {0}	Give back {0}	أرجع {0}
Deni lililobaki {0}	Balance left {0}	المتبقي من الدين {0}
Maliza	Done	تم
Rudisha {0}	Return {0}	إرجاع {0}
Chagua idadi na sababu. Stoo, deni, faida na ripoti zinajisasisha.	Choose the quantity and the reason. Stock, debt, profit and reports update.	اختر الكمية والسبب. المخزون والدين والربح والتقارير تتحدث.
Sababu ya kurudisha	Reason for the return	سبب الإرجاع
Vina matatizo	Faulty	بها عطل
Vitaingia stoo kama vifaa vyenye matatizo, na gharama yake itaingia kwenye faida.	They enter stock as faulty items, and their cost enters profit.	تدخل المخزون كسلع بها عطل، وتكلفتها تدخل الربح.
Thibitisha marejesho	Confirm the return	أكّد الإرجاع
Iliyobaki {0}	Left {0}	المتبقي {0}
Imefutwa	Void	ملغى
Msimbo	Code	رمز
Tafuta jina, IMEI au barcode	Search name, IMEI or barcode	ابحث بالاسم أو IMEI أو الباركود
Rudi	Back	رجوع
Kundi	Group	مجموعة
Hakuna bidhaa kwenye kundi hili. Ongeza kwenye Stoo.	No items in this group. Add them in Stock.	لا سلع في هذه المجموعة. أضفها في المخزون.
Kikapu	Cart	السلة
Futa vyote	Clear all	امسح الكل
Lipa	Pay	ادفع
Badilisha bei	Change price	غيّر السعر
Bei ya kuuza	Selling price	سعر البيع
Bei hii ndiyo itahesabiwa kwenye mauzo, deni, na faida.	This price is what the sale, the debt and the profit use.	هذا السعر هو ما يُحسب في البيع والدين والربح.
Bei ya jumla ni mwongozo. Andika bei unayomuuzia mteja huyu.	The list price is a guide. Enter the price for this customer.	سعر القائمة دليل. اكتب السعر لهذا العميل.
Anachotakiwa kulipa	Amount due	المطلوب دفعه
Weka	Set	ضع
Matatizo	Faults	الأعطال
Bei {0} · {1}	Price {0} · {1}	السعر {0} · {1}
Malipo	Payment	الدفع
Jina la mteja	Customer name	اسم العميل
Simu ya mteja	Customer phone	هاتف العميل
Anakopa kwa muda gani?	How long is the debt?	كم مدة الدين؟
Chini ya mwezi, ukumbusho siku 1 kabla. Mwezi au zaidi, siku 3 kabla.	Under a month, a reminder 1 day before. A month or more, 3 days before.	أقل من شهر، تذكير قبل يوم. شهر أو أكثر، قبل 3 أيام.
Muda	Term	المدة
Kumbukumbu namba (si lazima)	Reference number (optional)	رقم المرجع (اختياري)
Deni litabaki	Debt left	الدين المتبقي
Alichotoa	Handed	ما دفعه
Alichorudishiwa	Change	الباقي له
Andika alichotoa mteja. Sahihi ikiwa amelipa kiasi chote.	Enter what the customer handed. Exact if they paid the full amount.	اكتب ما دفعه العميل. المبلغ كاملاً إذا دفع الكل.
Sahihi	Exact	كامل
Mteja alipe namba hii, nje ya simu hii	The customer pays this number, outside this phone	العميل يدفع هذا الرقم، خارج هذا الهاتف
Weka Lipa Namba kwenye mipangilio	Add the Lipa number in settings	أضف رقم Lipa في الإعدادات
Deni nusu	Part debt	دين جزئي
Deni zima	Full debt	دين كامل
Siku	Days	أيام
Wiki	Weeks	أسابيع
Mwezi	Months	أشهر
Thibitisha · rudisha {0}	Confirm · change {0}	أكّد · الباقي {0}
Thibitisha · deni {0}	Confirm · debt {0}	أكّد · دين {0}
Thibitisha mauzo	Confirm the sale	أكّد البيع
Jumla	Total	المجموع
Nayo {0}	Left {0}	المتبقي {0}
Stoo {0}	Stock {0}	المخزون {0}
Imeuzwa kwa deni	Sold on debt	بيع بدين
Imeuzwa	Sold	مُباع
Walk-in	Walk-in	بدون اسم
Risiti	Receipt	إيصال
Mteja	Customer	العميل
Simu	Phone	هاتف
Mauzo	Sales	المبيعات
Amerudishiwa	Refunded	مُرجَع له
Imerudishwa	Returned	مُرجَع
Ukumbusho wa deni	Debt reminder	تذكير بالدين
Tangu	Since	منذ
Karibu dukani, au lipa kwenye namba ya duka, ili tuifunge hesabu yako.	Come to the shop, or pay the shop number, so we can close your balance.	تعال إلى الدكان، أو ادفع على رقم الدكان، لنغلق حسابك.
Mahali	Place	المكان
Sababu: {0}	Reason: {0}	السبب: {0}
Tafuta jina, IMEI au barcode	Search name, IMEI or barcode	ابحث بالاسم أو IMEI أو الباركود
Hakuna yenye matatizo kwenye kundi hili.	Nothing faulty in this group.	لا أعطال في هذه المجموعة.
Gharama {0}	Cost {0}	التكلفة {0}
Matatizo {0}	Faults {0}	أعطال {0}
Jumla {0}	Total {0}	المجموع {0}
Mauzo	Sales	المبيعات
Gharama	Cost	التكلفة
Faida	Profit	الربح
Hasara	Loss	خسارة
Uchambuzi	Analysis	التحليل
Siku 7	7 days	7 أيام
Wiki iliyopita	Last week	الأسبوع الماضي
Mwezi huu	This month	هذا الشهر
Mwezi uliopita	Last month	الشهر الماضي
Mwaka huu	This year	هذه السنة
Mwaka uliopita	Last year	السنة الماضية
Tarehe	Date	التاريخ
Mauzo halisi	Net sales	صافي المبيعات
Hakuna siku kipindi hiki.	No days in this period.	لا أيام في هذه الفترة.
Simu na vifaa kando	Phones and accessories apart	الهواتف والإكسسوارات منفصلة
Bado hakuna mauzo kipindi hiki.	No sales in this period yet.	لا مبيعات في هذه الفترة بعد.
Vifaa vingine	Other accessories	إكسسوارات أخرى
Cash na Lipa Namba	Cash and Lipa Namba	نقداً و Lipa Namba
Pesa iliyoingia siku hiyo, pamoja na malipo ya deni.	Money received that day, including debt payments.	المال الذي دخل ذلك اليوم، مع دفعات الدين.
Gharama ya simu	Phone cost	تكلفة الهواتف
Gharama ya vifaa	Accessory cost	تكلفة الإكسسوارات
Faida ya simu	Phone profit	ربح الهواتف
Faida ya vifaa	Accessory profit	ربح الإكسسوارات
Faida ya matatizo	Fault profit	ربح الأعطال
Faida ya duka	Shop profit	ربح الدكان
Hakuna mauzo, marejesho, wala matatizo kipindi hiki.	No sales, returns, or faults in this period.	لا مبيعات ولا مرتجعات ولا أعطال في هذه الفترة.
Mauzo halisi {0}. Risiti {1}. Marejesho {2}.	Net sales {0}. Receipts {1}. Returns {2}.	صافي المبيعات {0}. الإيصالات {1}. المرتجعات {2}.
Faida ya simu {0}. Faida ya vifaa {1}. Faida ya matatizo {2}. Zikiunganishwa, faida ya duka ni {3}.	Phone profit {0}. Accessory profit {1}. Fault profit {2}. Together, shop profit is {3}.	ربح الهواتف {0}. ربح الإكسسوارات {1}. ربح الأعطال {2}. معاً، ربح الدكان {3}.
Warranty	Warranty	الضمان
Skani	Scan	مسح
Angalia	Check	افحص
IMEI hii haipo kwenye duka.	This IMEI is not in the shop.	هذا IMEI غير موجود في الدكان.
Angalia warranty	Check warranty	افحص الضمان
{0} bado iko dukani. Haijauzwa.	{0} is still in the shop. It is not sold.	{0} ما زال في الدكان. لم يُبع.
Warranty bado hai · siku {0}	Warranty still open · {0} days	الضمان ما زال سارياً · {0} يوماً
Warranty imeisha	Warranty ended	انتهى الضمان
Iliuzwa {0}	Sold {0}	بيع {0}
Inaisha {0} · {1}	Ends {0} · {1}	ينتهي {0} · {1}
Hakuna warranty	No warranty	لا ضمان
siku {0}	{0} days	{0} أيام
wiki 1	1 week	أسبوع واحد
wiki {0}	{0} weeks	{0} أسابيع
wiki {0} na siku {1}	{0} weeks and {1} days	{0} أسابيع و{1} أيام
mwezi 1	1 month	شهر واحد
miezi {0}	{0} months	{0} أشهر
Wateja	Customers	العملاء
Tafuta jina au simu	Search name or phone	ابحث بالاسم أو الهاتف
Hakuna mteja.	No customer.	لا عميل.
Hakuna simu	No phone	لا هاتف
Mteja mpya	New customer	عميل جديد
Manunuzi {0}	Purchases {0}	المشتريات {0}
Hana deni.	No open debt.	لا دين مفتوح.
Futa mteja	Delete customer	احذف العميل
Futa {0}	Delete {0}	احذف {0}
Jina litaondoka kwenye orodha. Risiti, madeni na ripoti za zamani zinabaki.	The name leaves the list. Old receipts, debts and reports stay.	الاسم يخرج من القائمة. الإيصالات والديون والتقارير القديمة تبقى.
Mteja amefutwa.	Customer deleted.	تم حذف العميل.
Wazi	Open	مفتوح
Imelipwa	Paid	مدفوع
Madeni	Debts	الديون
Jumla inayosubiri	Waiting total	المجموع المنتظر
{0} wateja	{0} customers	{0} عملاء
Hakuna deni lililo wazi.	No open debt.	لا دين مفتوح.
Yaliyolipwa	Paid	المدفوع
Siku 30 bila malipo	30 days with no payment	30 يوماً بلا دفع
Siku 30 bila malipo.	30 days with no payment.	30 يوماً بلا دفع.
Alikopa {0}	Borrowed {0}	استدان {0}
Pokea malipo	Receive payment	استلم الدفعة
Tuma ukumbusho	Send reminder	أرسل تذكيراً
Kilichokopwa {0}	Borrowed {0}	المستدان {0}
Baki {0}	Balance {0}	المتبقي {0}
Malipo yaliyopita	Earlier payments	دفعات سابقة
Bado hajalipa chochote.	No payment yet.	لم يدفع شيئاً بعد.
Analipa sasa	Paying now	يدفع الآن
Analipa baki yote {0}	Paying the full balance {0}	يدفع المتبقي كله {0}
Sasisha deni	Update the debt	حدّث الدين
Malipo yamehifadhiwa	Payment saved.	حُفظت الدفعة.
Mawinga	Out	الخارج
Mtu amechukua	Someone took items	شخص أخذ بضاعة
Tafuta mtu au bidhaa	Search a person or an item	ابحث عن شخص أو سلعة
Hakuna bidhaa iliyo nje kwa sasa.	Nothing is out right now.	لا شيء خارج الآن.
Hakuna mawinga yenye neno hilo.	No match for that word.	لا نتيجة لهذه الكلمة.
Zilizorudi	Back	التي رجعت
Alichukua {0}	Took {0}	أخذ {0}
Alirudisha {0}	Brought back {0}	أرجع {0}
Aliyeandika {0}	Written by {0}	كتبه {0}
Rudisha	Return	إرجاع
Amerudi x{0}	Back x{0}	رجع x{0}
Nje x{0}	Out x{0}	خارج x{0}
Chagua idadi anayorudisha sasa. Akirudisha kimoja, vilivyobaki vinabaki nje, na muda unaandikwa.	Choose how many come back now. If one comes back, the rest stay out, and the time is saved.	اختر الكمية الراجعة الآن. إذا رجع واحد، الباقي يبقى خارجاً، والوقت يُحفظ.
Rudisha zote	Return all	أرجع الكل
Hifadhi kurudi	Save the return	احفظ الرجوع
Andika jina, kisha tafuta bidhaa aliyochukua. Muda unaandikwa peke yake.	Enter the name, then search the item they took. The time is saved on its own.	اكتب الاسم، ثم ابحث عن السلعة التي أخذها. الوقت يُحفظ وحده.
Jina la mtu	Person name	اسم الشخص
Simu (si lazima)	Phone (optional)	الهاتف (اختياري)
Maelezo (si lazima)	Note (optional)	ملاحظة (اختياري)
Tafuta jina au IMEI	Search name or IMEI	ابحث بالاسم أو IMEI
Umechagua {0}	Chosen {0}	المختار {0}
Hakuna bidhaa dukani ya kuazimisha.	No item in the shop to take out.	لا سلعة في الدكان للإخراج.
Hakuna bidhaa yenye neno hilo.	No item with that word.	لا سلعة بهذه الكلمة.
Simu · {0}	Phone · {0}	هاتف · {0}
Ongeza simu	Add phone	أضف هاتفاً
Ongeza kifaa	Add item	أضف سلعة
Tafuta stoo	Search stock	ابحث في المخزون
Vifaa	Accessories	إكسسوارات
Zilizouzwa	Sold	المباعة
Bado hakuna bidhaa.	No items yet.	لا سلع بعد.
Hakuna vifaa. Mmiliki anaweza kuongeza bidhaa mpya.	No accessories. The owner can add an item.	لا إكسسوارات. المالك يمكنه إضافة سلعة.
Hakuna simu kwenye orodha hii.	No phones on this list.	لا هواتف في هذه القائمة.
Futa	Delete	حذف
Chini · {0}	Low · {0}	منخفض · {0}
Ongeza mzigo	Add stock	أضف كمية
Ondoa {0}	Remove {0}	أزل {0}
Itaondoka kwenye Uza na Stoo. Mauzo, ripoti, na historia ya nyuma vinabaki.	It leaves Sell and Stock. Sales, reports and past history stay.	تخرج من البيع والمخزون. المبيعات والتقارير والسجل تبقى.
Itaondoka kwenye stoo. Risiti na ripoti za simu zilizouzwa zinabaki.	It leaves stock. Receipts and reports of sold phones stay.	تخرج من المخزون. إيصالات وتقارير الهواتف المباعة تبقى.
Kundi jipya	New group	مجموعة جديدة
Jina la kundi	Group name	اسم المجموعة
Futa {0}	Delete {0}	احذف {0}
Bidhaa za kundi hili zitaingia Nyingine. Mauzo ya zamani yanabaki kwenye ripoti.	Items in this group move to Other. Old sales stay in reports.	سلع هذه المجموعة تنتقل إلى أخرى. المبيعات القديمة تبقى في التقارير.
Bidhaa mpya	New item	سلعة جديدة
Hariri bidhaa	Edit item	تعديل السلعة
Ongeza kundi	Add group	أضف مجموعة
Bei ya jumla	List price	سعر القائمة
Bei ya kuuza inaandikwa ukiuza, kwa kila mteja.	The selling price is entered at the sale, for each customer.	سعر البيع يُكتب عند البيع، لكل عميل.
Idadi yote	Full quantity	الكمية كلها
Onyo stoo ikifika	Warn when stock reaches	نبّه عندما يصل المخزون
Kati ya hizi, zenye matatizo	Of these, the faulty ones	من هذه، التي بها عطل
Idadi yenye matatizo haiwezi kuzidi idadi yote.	Faulty quantity cannot pass the full quantity.	كمية الأعطال لا تتجاوز الكمية كلها.
Zinauzwa {0}. Matatizo {1} zimetolewa kwenye idadi hii hapa hapa. Mfano 20, matatizo 1, zinauzwa 19.	{0} can be sold. {1} faulty are taken out of this quantity here. Example 20, faults 1, 19 can be sold.	{0} تُباع. {1} عطل تُخصم من هذه الكمية هنا. مثال 20، عطل 1، تُباع 19.
Ondoa bidhaa	Remove item	أزل السلعة
Chagua kundi.	Choose a group.	اختر مجموعة.
Simu mpya	New phone	هاتف جديد
Hariri simu	Edit phone	تعديل الهاتف
Skani IMEI	Scan IMEI	امسح IMEI
Kundi la simu	Phone group	مجموعة الهواتف
Storage, mfano 256GB	Storage, example 256GB	السعة، مثال 256GB
Mpya	New	جديد
Kama mpya	Like new	كالجديد
Imetumika	Used	مستعمل
Bei ya kuuza inaandikwa ukiuza simu hii.	The selling price is entered when this phone is sold.	سعر البيع يُكتب عند بيع هذا الهاتف.
Simu ina matatizo	Phone is faulty	الهاتف به عطل
Itaingia stoo, haitokei kwenye kuuza, na gharama yake inaingia kwenye faida.	It enters stock, it does not show for sale, and its cost enters profit.	يدخل المخزون، لا يظهر للبيع، وتكلفته تدخل الربح.
Futa simu	Delete phone	احذف الهاتف
Weka IMEI	Enter the IMEI	أدخل IMEI
Ondoa simu	Remove phone	أزل الهاتف
Idadi sasa: {0}	Quantity now: {0}	الكمية الآن: {0}
Idadi unayoongeza	Quantity to add	الكمية المضافة
Itakuwa {0}	It will be {0}	ستصبح {0}
Jina	Name	الاسم
Brand	Brand	الماركة
Rangi	Color	اللون
Ukubwa	Size	المقاس
Barcode	Barcode	باركود
IMEI	IMEI	IMEI
Storage	Storage	السعة
Chaja	Charger	شاحن
Sauti	Audio	صوت
Power bank	Power bank	باور بانك
Cover	Cover	كفر
Kinga	Protector	حماية
Kebo	Cable	كيبل
Stand za camera	Camera stand	حامل كاميرا
Holder	Holder	حامل
Tripod	Tripod	حامل ثلاثي
Kadi	Card	بطاقة
Spika	Speaker	سماعة
Nyingine	Other	أخرى
Historia	History	السجل
Ripoti	Reports	التقارير
Taarifa	Alerts	التنبيهات
Mipangilio	Settings	الإعدادات
Funga na toka	Lock and leave	أقفل واخرج
Fungua	Open	افتح
Mauzo ya siku 7	Sales, 7 days	مبيعات 7 أيام
Mauzo yangu, siku 7	My sales, 7 days	مبيعاتي، 7 أيام
risiti	receipts	إيصالات
Taarifa nyeti	Private figures	أرقام خاصة
Thamani ya stoo	Stock value	قيمة المخزون
Faida ya leo	Profit today	ربح اليوم
Mtaji wa simu	Phone capital	رأس مال الهواتف
Mtaji wa vifaa	Accessory capital	رأس مال الإكسسوارات
Simu zilizopo	Phones in stock	الهواتف الموجودة
mtu haja rudisha bidhaa.	person has not brought items back.	شخص لم يُرجع البضاعة.
watu hawajarudisha bidhaa.	people have not brought items back.	أشخاص لم يُرجعوا البضاعة.
Mawinga bado nje	Items still out	بضاعة ما زالت خارجة
Send reminder	Send reminder	أرسل تذكيراً
Soma zote	Read all	اقرأ الكل
Hakuna taarifa.	No alerts.	لا تنبيهات.
Stoo ndogo	Low stock	مخزون منخفض
Deni jipya	New debt	دين جديد
Mauzo mapya	New sale	بيع جديد
Deni limelipwa	Debt paid	الدين دُفع
Malipo ya deni	Debt payment	دفعة دين
Mawinga yamerudi	Items came back	البضاعة رجعت
Mauzo yamerudishwa	Sale returned	البيع أُرجع
Faida na gharama	Profit and cost	الربح والتكلفة
Hakuna mauzo kipindi hiki.	No sales in this period.	لا مبيعات في هذه الفترة.
Gharama ya simu na vifaa	Phone and accessory cost	تكلفة الهواتف والإكسسوارات
Kwa mwezi	By month	حسب الشهر
Kwa siku	By day	حسب اليوم
Hakuna mauzo.	No sales.	لا مبيعات.
Gharama ya zilizouzwa	Cost of what was sold	تكلفة المباع
Mtaji uliopo sasa	Capital in stock now	رأس المال الموجود الآن
Simu na vifaa vinahesabiwa kando. Bidhaa zilizoharibika zina gharama yake. Mwisho namba tatu zinaunganishwa kuwa faida ya duka.	Phones and accessories are counted apart. Faulty items have their own cost. The three figures join into shop profit.	الهواتف والإكسسوارات تُحسب منفصلة. السلع المعطلة لها تكلفتها. الأرقام الثلاثة تجتمع في ربح الدكان.
Hasara ya duka	Shop loss	خسارة الدكان
Mauzo, gharama na faida ya simu peke yake.	Sales, cost and profit of phones alone.	مبيعات وتكلفة وربح الهواتف وحدها.
Mauzo, gharama na faida ya vifaa peke yake.	Sales, cost and profit of accessories alone.	مبيعات وتكلفة وربح الإكسسوارات وحدها.
Bidhaa zilizoharibika	Faulty items	سلع معطلة
Gharama hii inapunguza faida. Sio mauzo.	This cost lowers profit. It is not a sale.	هذه التكلفة تنقص الربح. ليست بيعاً.
Mauzo ya matatizo	Fault sales	مبيعات الأعطال
Mtaji wa matatizo uliopo	Fault capital in stock	رأس مال الأعطال الموجود
Hesabu ya pamoja	Combined figures	الحساب المجتمع
Faida ya simu + faida ya vifaa + faida ya matatizo.	Phone profit + accessory profit + fault profit.	ربح الهواتف + ربح الإكسسوارات + ربح الأعطال.
Ripoti hii haipo kwa akaunti hii.	This report is not on this account.	هذا التقرير ليس لهذا الحساب.
Imenakiliwa. Bandika kwenye daftari.	Copied. Paste it into a notebook.	تم النسخ. الصقه في الدفتر.
Hakuna kumbukumbu.	No records.	لا سجلات.
Pakua	Share	مشاركة
Wauzaji	Sellers	البائعون
Vikundi	Groups	المجموعات
Mwendo wa stoo	Stock movement	حركة المخزون
Ongeza kwenye kikapu	Add to the cart	أضف إلى السلة
Skani msimbo	Scan a code	امسح رمزاً
Ruhusu kamera ili skana iwashe. Bonyeza Ruhusu, kisha kubali kamera kwenye simu.	Allow the camera so the scanner can start. Press Allow, then accept the camera on the phone.	اسمح للكاميرا ليعمل الماسح. اضغط سماح، ثم اقبل الكاميرا في الهاتف.
Kamera haijawaka. Andika IMEI hapa chini, au jaribu tena.	The camera is off. Type the IMEI below, or try again.	الكاميرا مطفأة. اكتب IMEI في الأسفل، أو حاول مرة أخرى.
Ruhusu kamera	Allow camera	اسمح للكاميرا
Jaribu tena	Try again	حاول مرة أخرى
Au andika msimbo	Or type the code	أو اكتب الرمز
IMEI au barcode	IMEI or barcode	IMEI أو باركود
Idadi {0}	Qty {0}	الكمية {0}
PIN ya {0}	PIN for {0}	PIN لـ {0}
risiti	receipt	إيصال
tarehe	date	التاريخ
mteja	customer	العميل
simu	phone	هاتف
jumla	total	المجموع
ymelipwa	paid	المدفوع
deni	debt	دين
njia	method	الطريقة
kumbukumbu	reference	المرجع
muuzaji	seller	البائع
bidhaa	item	السلعة
hali	status	الحالة
siku ya deni	debt date	تاريخ الدين
kilichokopwa	borrowed	المستدان
baki	balance	المتبقي
aina	kind	النوع
jina	name	الاسم
bei	price	السعر
gharama	cost	التكلفة
stoo	stock	المخزون
msimbo	code	الرمز
manunuzi	purchases	المشتريات
tangu	since	منذ
idadi	quantity	الكمية
kiwango	level	الحد
mabadiliko	change	التغيير
sababu	reason	السبب
aliyefanya	done by	الذي فعل
kundi	group	مجموعة
kifaa	accessory	إكسسوار
imefutwa	void	ملغى
hai	open	مفتوح
simu-tatizo	phone fault	عطل هاتف
kifaa-tatizo	accessory fault	عطل إكسسوار
OPEN	Open	مفتوح
PAID	Paid	مدفوع
VOID	Void	ملغى
""".strip().splitlines()

def dart(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'").replace("$", "\\$") + "'"

seen = {}
dupes = []
for line in ROWS:
    if not line.strip():
        continue
    parts = line.split("\t")
    if len(parts) != 3:
        raise SystemExit(f"bad row: {line}")
    sw, en, ar = parts
    if sw in seen:
        dupes.append(sw)
        continue
    seen[sw] = (en, ar)
if dupes:
    print("kept first:", " | ".join(dupes))

out = ["class Phrase {", "  const Phrase(this.en, this.ar);", "  final String en;", "  final String ar;", "}", "", "const lexicon = <String, Phrase>{"]
for sw, (en, ar) in seen.items():
    out.append(f"  {dart(sw)}: Phrase({dart(en)}, {dart(ar)}),")
out.append("};")
out.append("")
path = Path(r"C:\Users\USER\.gemini\antigravity-ide\scratch\phone-shop-system\mobile\lib\lexicon.dart")
path.write_text("\n".join(out), encoding="utf-8")
print(len(seen))
