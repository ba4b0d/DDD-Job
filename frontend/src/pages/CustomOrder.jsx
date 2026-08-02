import { Link } from 'react-router-dom';
import {
  Image,
  MessageCircle,
  BadgeCheck,
  Wallet,
  PenTool,
  PackageCheck,
} from 'lucide-react';
import { useSEO, buildWebSiteJsonLd } from '../lib/seo';

const STEPS = [
  {
    n: 1,
    icon: Image,
    title: 'پیدا کردن عکس طرح مورد نظر',
    body: 'نزدیک ترین تصویر از طرحی که در ذهنتان دارید را پیدا کنید.',
  },
  {
    n: 2,
    icon: MessageCircle,
    title: 'ارسال پیام',
    body: 'برای استعلام قیمت، اطلاعات زیر را از طریق تلگرام، واتس اپ، اینستاگرام و یا بله برای ما ارسال کنید:\n• توصیف طرح ذهنی\n• ارائه توضیحات (برای مثال اگر طرح دلخواهتان مربوط به شخصیت یک فیلم است، نام شخصیت و فیلم را برایمان بفرستید)\n• تصویر/ تصاویر مشابه\n• ابعاد حدودی',
  },
  {
    n: 3,
    icon: BadgeCheck,
    title: 'استعلام قیمت',
    body: 'پس از بررسی تا حداکثر ۴۸ ساعت، موارد زیر برایتان ارسال میشود:\n• رنگ‌بندی موجود\n• قیمت نهایی\n• زمان تقریبی طراحی\n• زمان تقریبی پرینت محصول پس از نهایی شدن طرح',
  },
  {
    n: 4,
    icon: Wallet,
    title: 'ثبت سفارش',
    body: 'پس از تایید جزئیات سفارش، راهنمای پرداخت برایتان ارسال خواهد شد. سفارش با تایید واریز، ثبت میشود.',
  },
  {
    n: 5,
    icon: PenTool,
    title: 'طراحی',
    body: 'برای نهایی کردن طرح با شما در تماس خواهیم بود. پس از قطعی شدن طرح، سفارش در صف پرینت قرار میگیرد.',
  },
  {
    n: 6,
    icon: PackageCheck,
    title: 'تحویل',
    body: 'پس از آماده شدن سفارش، برای هماهنگی تحویل سفارش به صورت حضوری و یا ارسال آن، با شما تماس میگیریم.',
  },
];

export default function CustomOrder() {
  useSEO({
    title: 'سفارش قطعه و طرح دلخواه | پرینت سه بعدی سفارشی',
    description: 'راهنمای سفارش چاپ سه‌بعدی سفارشی، ارسال فایل STL یا عکس قطعه شکسته و استعلام قیمت پرینت 3 بعدی در اسپاگتی پرینت',
    jsonLd: buildWebSiteJsonLd(),
  });

  return (
    <div className="public-page" dir="rtl">
      <header className="public-page-hero public-page-hero--dark">
        <p className="public-page-kicker">راهنما</p>
        <h1 className="public-page-title public-page-title--white">نحوه سفارش</h1>
        <p className="public-page-lead">
          سفارش طرح دلخواه از طریق پیام رسانها انجام میشود.
        </p>
      </header>

      <ol className="order-steps">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.n} className="order-step">
              <div className="order-step-badge" aria-hidden="true">
                <span className="order-step-num">{s.n}</span>
                <Icon size={18} className="order-step-icon" />
              </div>
              <div className="order-step-body">
                <h2 className="order-step-title">{s.title}</h2>
                <p className="order-step-text" style={{ whiteSpace: 'pre-line' }}>{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="public-page-actions">
        <Link to="/contact" className="public-btn public-btn-primary">
          تماس با ما
        </Link>
      </div>
    </div>
  );
}
