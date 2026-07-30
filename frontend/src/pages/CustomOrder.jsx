import { Link } from 'react-router-dom';
import {
  Image,
  MessageCircle,
  BadgeCheck,
  Wallet,
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
    body: 'برای استعلام قیمت، اطلاعات زیر را از طریق تلگرام، واتس اپ و یا بله برای ما ارسال کنید:\n• توصیف طرح ذهنی\n• ارائه توضیحات (برای مثال اگر طرح دلخواهتان مربوط به شخصیت یک فیلم است، نام شخصیت و فیلم را برایمان بفرستید)\n• ابعاد حدودی مورد نظر',
  },
  {
    n: 3,
    icon: BadgeCheck,
    title: 'اعلام قیمت',
    body: 'پس از بررسی، رنگ‌بندی موجود، قیمت نهایی و زمان تقریبی تحویل برایتان ارسال خواهد شد.',
  },
  {
    n: 4,
    icon: Wallet,
    title: 'ثبت سفارش',
    body: 'پس از تایید جزئیات سفارش، راهنمای پرداخت برایتان ارسال خواهد شد. سفارش با تایید واریز، ثبت میشود.',
  },
  {
    n: 5,
    icon: PackageCheck,
    title: 'تحویل',
    body: 'پس از آماده شدن سفارش، برای هماهنگی تحویل سفارش به صورت حضوری و یا ارسال آن، با شما تماس میگیریم.',
  },
];

export default function CustomOrder() {
  useSEO({
    title: 'سفارش طرح دلخواه',
    description: 'راهنمای سفارش طرح دلخواه و سفارشی از اسپاگتی پرینت',
    jsonLd: buildWebSiteJsonLd(),
  });

  return (
    <div className="public-page" dir="rtl">
      <header className="public-page-hero public-page-hero--dark">
        <p className="public-page-kicker">راهنما</p>
        <h1 className="public-page-title public-page-title--white">سفارش طرح دلخواه</h1>
        <p className="public-page-lead">
          طرح مورد نظرتان را برایمان بفرستید تا آن را برایتان چاپ کنیم.
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
        <Link to="/" className="public-btn public-btn-primary">
          مشاهده کاتالوگ
        </Link>
      </div>
    </div>
  );
}
