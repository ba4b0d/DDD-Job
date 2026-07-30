import { Link } from 'react-router-dom';
import {
  Search,
  Hash,
  MessageCircle,
  Palette,
  BadgeCheck,
  PackageCheck,
} from 'lucide-react';
import { useSEO, buildWebSiteJsonLd } from '../lib/seo';

const STEPS = [
  {
    n: 1,
    icon: Search,
    title: 'انتخاب محصول',
    body: 'محصول مورد نظر را در کاتالوگ پیشنهادی پیدا کنید.',
  },
  {
    n: 2,
    icon: Hash,
    title: 'کد محصول',
    body: 'کد محصول را یادداشت نمایید.',
  },
  {
    n: 3,
    icon: MessageCircle,
    title: 'ارسال پیام',
    body: 'برای انتخاب رنگ و سفارش هر محصول، کد آن را از طریق تلگرام، واتس اپ و یا بله برای ما ارسال کنید.',
  },
  {
    n: 4,
    icon: Palette,
    title: 'انتخاب رنگ',
    body: 'رنگ‌بندی موجود و زمان تقریبی تحویل سفارش برایتان ارسال خواهد شد.',
  },
  {
    n: 5,
    icon: BadgeCheck,
    title: 'ثبت سفارش',
    body: 'پس از تایید رنگ‌، راهنمای پرداخت برایتان ارسال خواهد شد. سفارش با تایید واریز، ثبت میشود.',
  },
  {
    n: 6,
    icon: PackageCheck,
    title: 'تحویل',
    body: 'پس از آماده شدن سفارش، برای هماهنگی تحویل سفارش به صورت حضوری و یا ارسال آن، با شما تماس میگیریم.',
  },
];

export default function HowToOrder() {
  useSEO({
    title: 'سفارش از کاتالوگ',
    description: 'راهنمای سفارش محصولات چاپ سه‌بعدی از کاتالوگ اسپاگتی پرینت',
    jsonLd: buildWebSiteJsonLd(),
  });

  return (
    <div className="public-page" dir="rtl">
      <header className="public-page-hero public-page-hero--dark">
        <p className="public-page-kicker">راهنما</p>
        <h1 className="public-page-title public-page-title--white">سفارش از کاتالوگ</h1>
        <p className="public-page-lead">
          در چند قدم ساده محصول مورد نظر خود را سفارش دهید.
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
                <p className="order-step-text">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="public-page-actions">
        <Link to="/" className="public-btn public-btn-primary">
          مشاهده کاتالوگ
        </Link>
      </div>
    </div>
  );
}
