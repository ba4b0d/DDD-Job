import { Link } from 'react-router-dom';
import {
  Search,
  MessageCircle,
  BadgeCheck,
  Wallet,
  Printer,
  PackageCheck,
  Phone,
} from 'lucide-react';

const STEPS = [
  {
    n: 1,
    icon: Search,
    title: 'محصول را در کاتالوگ پیدا کنید',
    body: 'جستجو کنید، دسته را فیلتر کنید و کد یا نام محصول را یادداشت کنید. اگر فایل STL/3MF سفارشی دارید، مرحله بعد کافی است.',
  },
  {
    n: 2,
    icon: MessageCircle,
    title: 'از طریق تلگرام، واتساپ، اینستاگرام یا بله پیام بدهید',
    body: 'کد محصول، تعداد، رنگ/مادهٔ مورد نظر و هر نکتهٔ تحویل را بنویسید. برای کار سفارشی، فایل را هم بفرستید.',
  },
  {
    n: 3,
    icon: BadgeCheck,
    title: 'قیمت و زمان تأیید می‌شود',
    body: 'پس از بررسی، قیمت نهایی و زمان تقریبی چاپ/تحویل را اعلام می‌کنیم. تا قبل از تأیید، سفارشی ثبت نشده است.',
  },
  {
    n: 4,
    icon: Wallet,
    title: 'پیش‌پرداخت',
    body: 'پس از توافق، راهنمای پرداخت ارسال می‌شود. با تأیید واریز، نوبت چاپ قطعی می‌شود.',
  },
  {
    n: 5,
    icon: Printer,
    title: 'چاپ و آماده‌سازی',
    body: 'چاپ، جداسازی ساپورت و در صورت نیاز رنگ‌کاری/پرداخت انجام می‌شود. وضعیت را در همان کانال پیام‌رسان پیگیری کنید.',
  },
  {
    n: 6,
    icon: PackageCheck,
    title: 'تحویل',
    body: 'تحویل حضوری یا ارسال — جزئیات را هنگام تأیید سفارش هماهنگ می‌کنیم.',
  },
];

const TIPS = [
  'کد محصول از کاتالوگ را در پیام اول بنویسید تا سریع‌تر پاسخ بگیرید.',
  'برای سفارشی: فایل STL یا 3MF، ابعاد تقریبی، ماده (PLA/PETG و …) و رنگ را بفرستید.',
  'زمان تحویل به صف چاپ و پیچیدگی مدل بستگی دارد؛ تاریخ قطعی بعد از تأیید اعلام می‌شود.',
  'تغییر رنگ/ماده بعد از شروع چاپ ممکن است هزینه یا زمان را عوض کند.',
];

export default function HowToOrder() {
  return (
    <div className="public-page" dir="rtl">
      <header className="public-page-hero public-page-hero--dark">
        <p className="public-page-kicker">راهنما</p>
        <h1 className="public-page-title public-page-title--white">نحوه سفارش</h1>
        <p className="public-page-lead">
          سفارش از کاتالوگ یا کار سفارشی — در چند قدم ساده. فعلاً ثبت سفارش از طریق پیام‌رسان‌ها انجام می‌شود.
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

      <section className="public-tips" aria-labelledby="order-tips-title">
        <h2 id="order-tips-title" className="public-tips-title">
          نکات مهم
        </h2>
        <ul className="public-tips-list">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <div className="public-page-actions">
        <Link to="/contact" className="public-btn public-btn-primary">
          <Phone size={16} />
          تماس با ما
        </Link>
        <Link to="/" className="public-btn public-btn-ghost">
          مشاهده کاتالوگ
        </Link>
      </div>
    </div>
  );
}
