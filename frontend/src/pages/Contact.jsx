import { Link } from 'react-router-dom';
import { MessageCircle, Send, Phone, Camera, ExternalLink, ClipboardList } from 'lucide-react';
import { CONTACT, displayChannels } from '../lib/contact';

const ICONS = {
  telegram: Send,
  whatsapp: Phone,
  instagram: Camera,
  bale: MessageCircle,
};

export default function Contact() {
  const channels = displayChannels();

  return (
    <div className="public-page" dir="rtl">
      <header className="public-page-hero public-page-hero--dark">
        <p className="public-page-kicker">ارتباط با ما</p>
        <h1 className="public-page-title public-page-title--white">تماس با {CONTACT.brand}</h1>
        <p className="public-page-lead">{CONTACT.note}</p>
        <p className="public-page-meta">
          {CONTACT.hours}
          {CONTACT.city ? ` · ${CONTACT.city}` : ''}
        </p>
      </header>

      <div className="contact-grid">
        {channels.map((ch) => {
          const Icon = ICONS[ch.id] || MessageCircle;
          const isPlaceholder = ch.href.includes('YOUR_') || ch.href.includes('XXXX');
          return (
            <a
              key={ch.id}
              href={isPlaceholder ? undefined : ch.href}
              target={isPlaceholder ? undefined : '_blank'}
              rel={isPlaceholder ? undefined : 'noopener noreferrer'}
              className={`contact-card${isPlaceholder ? ' contact-card--soon' : ''}`}
              style={{ '--ch-color': ch.color }}
              aria-disabled={isPlaceholder || undefined}
              onClick={isPlaceholder ? (e) => e.preventDefault() : undefined}
            >
              <div className="contact-card-icon" aria-hidden="true">
                <Icon size={22} />
              </div>
              <div className="contact-card-body min-w-0">
                <div className="contact-card-label">{ch.label}</div>
                <div className="contact-card-handle truncate" dir="ltr">
                  {ch.handle}
                </div>
                <p className="contact-card-hint">{ch.hint}</p>
                {isPlaceholder ? (
                  <span className="contact-card-cta">به‌زودی — لینک را در تنظیمات پر کنید</span>
                ) : (
                  <span className="contact-card-cta">
                    باز کردن
                    <ExternalLink size={12} />
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>

      <div className="public-page-actions">
        <Link to="/how-to-order" className="public-btn public-btn-primary">
          <ClipboardList size={16} />
          نحوه سفارش
        </Link>
        <Link to="/" className="public-btn public-btn-ghost">
          بازگشت به کاتالوگ
        </Link>
      </div>
    </div>
  );
}
