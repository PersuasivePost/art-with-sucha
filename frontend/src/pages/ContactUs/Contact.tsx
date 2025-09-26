import React from 'react';
import './Contact.css';

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" />
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19h13A2.5 2.5 0 0 0 21 16.5v-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 7.5l-9 6-9-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.12.9.37 1.76.73 2.56a2 2 0 0 1-.45 2.11L8.91 9.09a14.05 14.05 0 0 0 6 6l1.7-1.7a2 2 0 0 1 2.11-.45c.8.36 1.66.61 2.56.73A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Contact: React.FC = () => {
  return (
    <div className="contact-page container">
      <header className="contact-hero">
        <h1>Get in touch</h1>
        <p className="lead">For commissions, purchases or collaborations — reach out using the details below.</p>
      </header>

      <section className="contact-grid">
        <aside className="contact-card info">
          <h3>Contact Details</h3>

          <div className="contact-row">
            <span className="icon"><MailIcon /></span>
            <div>
              <div className="label">Email</div>
              <a className="value" href="mailto:artwithsucha@gmail.com">artwithsucha@gmail.com</a>
            </div>
          </div>

          <div className="contact-row">
            <span className="icon"><PhoneIcon /></span>
            <div>
              <div className="label">Mobile</div>
              <div className="value">
                <a href="tel:+919322901824">9322901824</a>
                <span className="sep">•</span>
                <a href="tel:+919004881733">9004881733</a>
              </div>
            </div>
          </div>

          <div className="contact-row">
            <span className="icon"><InstagramIcon /></span>
            <div>
              <div className="label">Instagram</div>
              <a className="value" href="https://instagram.com/artwithsucha" target="_blank" rel="noreferrer">@artwithsucha</a>
            </div>
          </div>

          <div className="contact-row">
            <span className="icon">📘</span>
            <div>
              <div className="label">Facebook</div>
              <a className="value" href="https://www.facebook.com/share/19cPWKZhSD/?mibextid=wwXIfr" target="_blank" rel="noreferrer">/artwithsucha</a>
            </div>
          </div>

          <p className="note instruction large">Take a screenshot of what you like and send a DM on Instagram to purchase.</p>

          <a className="btn-cta" href="https://instagram.com/artwithsucha" target="_blank" rel="noreferrer">
            <InstagramIcon /> Message on Instagram
          </a>
        </aside>

        <div className="contact-card gallery">
          <div className="gallery-grid">
            <img src="/maa.png" alt="art sample 1" />
            <img src="/image.png" alt="art sample 2" />
            <img src="/image2.png" alt="art sample 3" />
            <img src="/image3.png" alt="art sample 4" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;

