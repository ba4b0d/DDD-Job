import urllib.request
import json
import http.cookiejar
import sqlite3
import os

zwnj = '\u200c'

# =========================================================================
# ARTICLE 2: What is PLA Filament Guide
# =========================================================================
title_2 = f'فیلامنت PLA چیست؟ مزایا، مقاومت و کاربرد آن در چاپ س{zwnj}بعدی'
slug_2 = 'what-is-pla-filament-guide'
summary_2 = f'فیلامنت PLA چیست و چرا محبوب{zwnj}ترین متریال پرینت س{zwnj}بعدی در جهان است؟ در این راهنما با ویژگی{zwnj}ها، دوام، زیست{zwnj}سازگاری و تفاوت PLA با سایر پلاستیک{zwnj}ها آشنا شوید.'

content_2 = f'''# فیلامنت PLA چیست؟ مزایا، مقاومت و کاربرد آن در چاپ س{zwnj}بعدی

اگر تا به حال قصد سفارش یک قطعه یا مجسمه با تکنولوژی **پرینت س{zwnj}بعدی FDM** را داشته{zwnj}اید، احتمالاً بارها نام **فیلامنت PLA** را شنیده{zwnj}اید. اما این متریال چیست، از چه موادی ساخته می{zwnj}شود و چرا بیش از ۷۰ درصد از کل محصولات چاپ س{zwnj}بعدی در سراسر جهان با آن تولید می{zwnj}شوند؟

در این مقاله از **اسپاگتی پرینت**، ویژگی{zwnj}های شگفت{zwnj}انگیز PLA، استحکام، ماندگاری رنگ و مقایسه آن با سایر فیلامنت{zwnj}ها مانند ABS و PETG را بررسی می{zwnj}کنیم.

---

## ۱. فیلامنت PLA از چه ساخته می{zwnj}شود؟

نام علمی PLA مخفف **پلی{zwnj}لاکتیک اسید (Polylactic Acid)** است. برخلاف پلاستیک{zwnj}های سنتی نفتی (مانند ABS یا نایلون)، PLA یک **ترموپلاستیک زیست{zwnj}تخریب{zwnj}پذیر و سازگار با محیط زیست** است که از منابع تجدیدپذیر مانند نشاسته ذرت، نیشکر و چغندر قند به{zwnj}دست می{zwnj}آید.

این ویژگی باعث شده که PLA دارای مزایای منحصر{zwnj}به{zwnj}فرد زیر باشد:
- **کاملاً بدون بو و غیرسمی:** در زمان چاپ و پس از ساخت، هیچ گاز سمی یا بوی نامطبوعی متصاعد نمی{zwnj}کند.
- **ایمن برای محیط خانه و کودکان:** برای ساخت انواع اسباب{zwnj}بازی{zwnj}ها، جاکلیدی و دکوری{zwnj}های اتاق خواب کاملاً ایمن است.
- **زیست{zwnj}سازگار:** در مقایسه با پلاستیک{zwnj}های نفتی، ردپای کربنی بسیار کمتری دارد.

---

## ۲. چرا PLA بهترین انتخاب برای محصولات دکوراتیو و فانتزی است؟

### الف) دقت خیره{zwnj}کننده در جزئیات ظریف
PLA ضریب انقباض بسیار ناچیزی هنگام سرد شدن دارد؛ به این معنی که گوشه{zwnj}ها و لبه{zwnj}های مدل دچار پیچش (Warping) نمی{zwnj}شوند. این ویژگی امکان چاپ ظریف{zwnj}ترین بافت{zwnj}ها (مانند بافت کاموایی در [کالکشن حیوانات بافتنی](/collection/%DA%A9%D8%A7%D9%84%DA%A9%D8%B4%D9%86-%D8%AD%DB%8C%D9%88%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%81%D8%AA%D9%86%DB%8C)) را با وضوح میکرونی فراهم می{zwnj}کند.

### ب) تنوع رنگی بی{zwnj}نظیر و ماندگاری بالا
رنگ در فیلامنت PLA درون بافت پلیمر تزریق شده است و لایه رنگی سطحی نیست؛ بنابراین:
- در برابر سایش روزمره (مانند کلیدها در جیب) رنگ آن پوسته{zwnj}پوسته نمی{zwnj}شود.
- رنگ{zwnj}های مات، ابریشمی (Silk)، درخشان و حتی شب{zwnj}تاب با PLA قابل دستیابی هستند.

### ج) استحکام کششی بالا و سبکی
قطعات PLA در عین سبکی، مقاومت کششی بسیار بالایی دارند و برای قطعات رومیزی، استندهای گوشی، قاب{zwnj}ها و نگهدارنده{zwnj}ها فوق{zwnj}العاده با دوام هستند.

---

## ۳. جدول مقایسه PLA با سایر فیلامنت{zwnj}ها

| ویژگی | فیلامنت PLA | فیلامنت PETG | فیلامنت ABS |
| ---: | ---: | ---: | ---: |
| **منشأ ماده** | گیاهی و نشاسته ذرت | پایه پلی{zwnj}استر نفتی | پلاستیک نفتی |
| **دقت در جزئیات** | ⭐⭐⭐⭐⭐ (عالی) | ⭐⭐⭐⭐ (خوب) | ⭐⭐⭐ (متوسط) |
| **تنوع رنگ و زیبایی** | ⭐⭐⭐⭐⭐ (بسیار بالا) | ⭐⭐⭐⭐ (براق و شفاف) | ⭐⭐⭐ (مات) |
| **مقاومت دمایی** | تا ۵۵ الی ۶۰ درجه | تا ۷۵ الی ۸۰ درجه | تا ۹۵ الی ۱۰۰ درجه |
| **بوی چاپ و ایمنی** | کاملاً بدون بو و ایمن | بوی بسیار کم | بوی تند و نیازمند تهویه |
| **بهترین کاربرد** | دکوری، فیگور، جاکلیدی | قطعات بیرون خانه | قطعات خودرو و صنعتی |

---

## ۴. نحوه نگهداری از قطعات پرینت س{zwnj}بعدی PLA

برای این{zwnj}که قطعات پرینت س{zwnj}بعدی شما سال{zwnj}ها مثل روز اول زیبا و سالم بمانند، رعایت دو نکته کافی است:
1. **دوری از حرارت شدید مستقیم:** از قرار دادن قطعه در پشت شیشه خودرو زیر آفتاب داغ تابستان یا کنار بخاری خودداری کنید (حرارت بالای ۶۰ درجه باعث نرم شدن جزئی آن می{zwnj}شود).
2. **تمیزکاری آسان:** برای شستشو و غبارروبی، استفاده از یک دستمال نمدار یا آب ولرم با صابون ملایم کاملاً کافی است.

---

## پرسش{zwnj}های متداول (FAQ)

### آیا محصولات PLA در آب حل می{zwnj}شوند؟
خیر؛ PLA در شرایط معمول به هیچ وجه در آب حل نمی{zwnj}شود و رطوبت معمولی به آن آسیبی نمی{zwnj}زند. تجزیه بیولوژیکی PLA تنها در کمپوست{zwnj}های صنعتی با دمای بالای ۶۰ درجه رخ می{zwnj}دهد.

### آیا قطعات PLA شکننده هستند؟
خیر؛ قطعات چاپ{zwnj}شده با تراکم استاندارد (۱۰ الی ۲۰ درصد) انعطاف مکانیکی لازم را دارند و در اثر افتادن از ارتفاع میز نمی{zwnj}شکنند.

---

## سفارش محصولات با کیفیت درجه یک در اسپاگتی پرینت

ما در **اسپاگتی پرینت** از بهترین برندهای فیلامنت PLA با کالیبراسیون دقیق دمایی استفاده می{zwnj}کنیم تا محصول نهایی با سطحی یکدست و بدون پلیسه تحویل شما گردد.

👉 **[مشاهده کاتالوگ محصولات با متریال PLA](/)**  
👉 **[ثبت سفارش چاپ قطعه دلخواه با رنگ اختصاصی](/custom-order)**'''


# =========================================================================
# ARTICLE 3: Best 3D Printed Gift Ideas & Desk Setup
# =========================================================================
title_3 = f'۱۰ ایده جذاب هدیه س{zwnj}بعدی و اکسسوری فانتزی برای میز کار و اتاق گیمینگ'
slug_3 = 'best-3d-printed-gift-ideas-desk-setup'
summary_3 = f'به دنبال هدیه{zwnj}ای خاص، خلاقانه و ماندگار هستید؟ با ۱۰ ایده جذاب پرینت س{zwnj}بعدی از جاکلیدی{zwnj}های بافتنی تا تابلوهای دکوراتیو و استندهای گیمینگ در اسپاگتی پرینت آشنا شوید.'

content_3 = f'''# ۱۰ ایده جذاب هدیه س{zwnj}بعدی و اکسسوری فانتزی برای میز کار و اتاق گیمینگ

پیدا کردن یک هدیه خاص، خلاقانه و در عین حال اقتصادی که تکراری نباشد، همیشه یک چالش لذت{zwnj}بخش است. با پیشرفت تکنولوژی **چاپ س{zwnj}بعدی**، امروزه می{zwnj}توان محصولاتی تولید کرد که با هیچ روش سنتی دیگری قابل ساخت نیستند؛ از بافت{zwnj}های برجسته کاموایی گرفته تا هندسه{zwnj}های چندلایه و شخصی{zwnj}سازی با اسم دلخواه.

اگر برای تولد، سالگرد، هدیه به همکار، چیدمان میز کار یا تزیین اتاق گیمینگ به دنبال ایده{zwnj}های ترند و ماندگار هستید، این لیست ۱۰تایی از محبوب{zwnj}ترین محصولات **اسپاگتی پرینت** را از دست ندهید!

---

## ۱. جاکلیدی و آویزهای حیوانات بافتنی (Cute Knitted Animals)
یکی از ترندترین محصولات دکوری و فانتزی، آویزهای طرح کاموایی هستند که با وجود جنس سخت و مقاوم PLA، ظاهر کاملاً نرم و بافتنی به خود گرفته{zwnj}اند.
* **محبوب{zwnj}ترین مدل{zwnj}ها:** [خرس پاندا بافتنی](/catalog/ke074)، [پنگوئن بامزه](/catalog/ke054) و روباه فانتزی.
* **ایده هدیه:** هدیه تولد دوستانه و آویز کوله{zwnj}پشتی.
* 👉 **[مشاهده کالکشن حیوانات بافتنی (۶۰ مدل)](/collection/%DA%A9%D8%A7%D9%84%DA%A9%D8%B4%D9%86-%D8%AD%DB%8C%D9%88%D8%A7%D9%86%D8%A7%D8%AA-%D8%A8%D8%A7%D9%81%D8%AA%D9%86%DB%8C)**

---

## ۲. تابلوهای دکوراتیو ۳ بعدی ابرقهرمانان (Marvel & DC Wall Art)
تابلوهای دیواری چندلایه با برجستگی خیره{zwnj}کننده که به دیوار اتاق گیمینگ یا دفتر کار جلوه{zwnj}ای مدرن و پرانرژی می{zwnj}بخشند.
* **شخصیت{zwnj}های پرطرفدار:** [اسپایدرمن](/catalog/wa001)، [آیرون من](/catalog/wa004) و [هالک](/catalog/wa003).
* 👉 **[مشاهده کالکشن تابلوهای سه بعدی](/collection/%DA%A9%D8%A7%D9%84%DA%A9%D8%B4%D9%86-%D8%AA%D8%A7%D8%A8%D9%84%D9%88-%D8%B3%D9%87-%D8%A8%D8%B9%D8%AF%DB%8C-%D8%A7%D8%A8%D8%B1%D9%82%D9%87%D8%B1%D9%85%D8%A7%D9%86%D8%A7%D9%86)**

---

## ۳. غشگیر و نگهدارنده کتاب هری پاتر و فانتزی (Bookends)
برای عاشقان کتاب و رمان، هیچ چیز زیباتر از یک نگهدارنده کتاب طرح قلعه هاگوارتز یا دروازه موریا نیست که کتاب{zwnj}ها را روی شلف به زیبایی مرتب نگه دارد.
* **ویژگی:** وزن مناسب، لایه{zwnj}های دقیق و استحکام عالی.

---

## ۴. استند و نظم{zwnj}دهنده جواهرات و بدلیجات (Jewelry Organizer)
یک هدیه کاربردی و شیک برای خانم{zwnj}ها و تزیین میز آرایش؛ طراحی شده برای نگهداری مرتب گردنبند، گوشواره و انگشتر بدون گره خوردن.
* **نمونه پرطرفدار:** [نظم{zwnj}دهنده گردنبند و اکسسوری](/catalog/jo006).

---

## ۵. فیگورهای مفصلی و متحرک فلکسی (Flexi Articulated Toys)
فیگورهایی با مفاصل یکپارچه که بدون هیچ پیچی حرکت می{zwnj}کنند و یک ضد استرس (Fidget) فوق{zwnj}العاده برای میز کار به{zwnj}شمار می{zwnj}روند.
* **مدل{zwnj}های محبوب:** اژدهای مفصلی، مارمولک فلکسی و دلفین متحرک.
* 👉 **[مشاهده کالکشن فلکسی](/collection/%DA%A9%D8%A7%D9%84%DA%A9%D8%B4%D9%86-%D9%81%D9%84%DA%A9%D8%B3%DB%8C)**

---

## ۶. جا قلمی و نظم{zwnj}دهنده رومیزی طرح پنجه گربه (Desk Organizers)
میز کاری مرتب با اکسسوری{zwnj}های کیوت انرژی کار را دوچندان می{zwnj}کند. جا قلمی طرح پنجه گربه و قلعه یکی از پرفروش{zwnj}ترین اکسسوری{zwnj}های رومیزی است.
* **نمونه:** [جامدادی پنجه گربه](/catalog/ph006).

---

## ۷. بوک{zwnj}مارک{zwnj}های ظریف سه بعدی (Bookmarks)
نشانه{zwnj}های کتاب با طرح{zwnj}های هندسی، برگ، شخصیتهای فانتزی و نقل قول{zwnj}های جذاب با ضخامت میلی{zwnj}متری که به کتاب آسیبی نمی{zwnj}رسانند.
* 👉 **[مشاهده کالکشن بوک{zwnj}مارک](/collection/%DA%A9%D8%A7%D9%84%DA%A9%D8%B4%D9%86-%D8%A8%D9%88%DA%A9-%D9%85%D8%A7%D8%B1%DA%A9)**

---

## ۸. فیگور دناتلو و لاکپشت{zwnj}های نینجا (TMNT Figures)
نوستالژی همیشه هدیه{zwnj}ای فراموش{zwnj}نشدنی است. فیگور دناتلو با سلاح بو استاف و جزئیات دقیق برای کلکسیونرهای انیمیشن و فیلم.
* **نمونه:** [فیگور دناتلو](/catalog/fg014).

---

## ۹. پایه و نگهدارنده دسته کنسول و گوشی موبایل (Gaming Stand)
نگهدارنده دسته PS5، Xbox یا گوشی با طراحی ارگونومیک برای مرتب کردن ستاپ گیمینگ و میز مانیتور.
* **ویژگی:** جلوگیری از خط و خش روی دسته و استقرار محکم.

---

## ۱۰. کاور کلید و پریز فانتزی باب اسفنجی (Cute Switch Covers)
یک تغییر کوچک و بسیار بامزه برای دکوراسیون اتاق کودک یا فضای کارمانی؛ کاور دکوراتیو که روی کلید برق استاندارد قرار می{zwnj}گیرد.
* **نمونه:** [کاور کلید باب اسفنجی](/catalog/wa001).

---

## امکان شخصی{zwnj}سازی و حک اسم دلخواه روی تمام هدایا!

یکی از بزرگ{zwnj}ترین مزیتهای سفارش از **اسپاگتی پرینت** این است که می{zwnj}توانید رنگ دلخواهتان را از بین ده{zwnj}ها رنگ انتخاب کنید یا درخواست حک اسم و پیام اختصاصی برای گیرنده هدیه را ثبت نمایید.

👉 **[ورود به کاتالوگ و مشاهده همه محصولات](/)**  
👉 **[سفارش ساخت طرح دلخواه با فایل یا عکس اختصاصی](/custom-order)**'''


def run():
    # 1. Update local database
    conn = sqlite3.connect('backend/data/3djat.db')
    cur = conn.cursor()

    cur.execute('SELECT id FROM blog_posts WHERE slug = ?', (slug_2,))
    if cur.fetchone():
        cur.execute('UPDATE blog_posts SET title = ?, summary = ?, content = ?, cover_image = ?, is_published = 1 WHERE slug = ?',
                    (title_2, summary_2, content_2, '/uploads/blog/what-is-pla-filament-guide.webp', slug_2))
    else:
        cur.execute('INSERT INTO blog_posts (title, slug, summary, content, cover_image, is_published, views) VALUES (?, ?, ?, ?, ?, 1, 0)',
                    (title_2, slug_2, summary_2, content_2, '/uploads/blog/what-is-pla-filament-guide.webp'))

    cur.execute('SELECT id FROM blog_posts WHERE slug = ?', (slug_3,))
    if cur.fetchone():
        cur.execute('UPDATE blog_posts SET title = ?, summary = ?, content = ?, cover_image = ?, is_published = 1 WHERE slug = ?',
                    (title_3, summary_3, content_3, '/uploads/blog/best-3d-printed-gift-ideas.webp', slug_3))
    else:
        cur.execute('INSERT INTO blog_posts (title, slug, summary, content, cover_image, is_published, views) VALUES (?, ?, ?, ?, ?, 1, 0)',
                    (title_3, slug_3, summary_3, content_3, '/uploads/blog/best-3d-printed-gift-ideas.webp'))

    conn.commit()
    conn.close()
    print('Inserted Post 2 and Post 3 into local database.')

    # 2. Publish to Live Site via API
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    login_url = 'https://spaghettiprints.ir/api/v1/auth/login'
    login_data = json.dumps({'username': 'admin', 'password': 'Adadep@1625'}).encode('utf-8')
    req_login = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})

    with opener.open(req_login) as resp:
        print('Logged in to live API.')

    def publish_live(post_title, post_slug, post_summary, post_content, local_webp_path):
        upload_url = 'https://spaghettiprints.ir/api/v1/admin/posts/upload-cover'
        boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        with open(local_webp_path, 'rb') as f:
            img_bytes = f.read()

        body = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name=\"file\"; filename=\"{os.path.basename(local_webp_path)}\"\r\n'
            f'Content-Type: image/webp\r\n\r\n'
        ).encode('utf-8') + img_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')

        req_upload = urllib.request.Request(
            upload_url,
            data=body,
            headers={'Content-Type': f'multipart/form-data; boundary={boundary}', 'User-Agent': 'Mozilla/5.0'}
        )
        with opener.open(req_upload) as r:
            upload_data = json.loads(r.read().decode('utf-8'))
            cover_url = upload_data.get('url')

        post_url = 'https://spaghettiprints.ir/api/v1/admin/posts'
        payload = {
            'title': post_title,
            'slug': post_slug,
            'summary': post_summary,
            'content': post_content,
            'cover_image': cover_url,
            'is_published': True
        }
        req_post = urllib.request.Request(
            post_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        with opener.open(req_post) as r:
            res = json.loads(r.read().decode('utf-8'))
            res_id = res.get('id')
        res_slug = res.get('slug')
        print(f'Published on live site: \"{post_title}\" (ID: {res_id}, Slug: {res_slug})')

    publish_live(title_2, slug_2, summary_2, content_2, 'backend/uploads/blog/what-is-pla-filament-guide.webp')
    publish_live(title_3, slug_3, summary_3, content_3, 'backend/uploads/blog/best-3d-printed-gift-ideas.webp')


if __name__ == '__main__':
    run()
