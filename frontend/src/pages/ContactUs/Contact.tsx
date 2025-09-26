import React from 'react';
import './Contact.css';

const Contact: React.FC = () => {
  return (
    <div className="contact-page container">
      <div className="contact-hero">
        <h1>Get in touch</h1>
        <p className="lead">For commissions, purchases or collaborations — reach out using the details below.</p>
      </div>

      <div className="contact-grid">
        <div className="contact-card info">
          <h3>Contact Details</h3>
          <p>Email: <a href="mailto:artwithsucha@gmail.com">artwithsucha@gmail.com</a></p>
          <p>Mobile: <a href="tel:+919322901824">9322901824</a>, <a href="tel:+913384683667">3384683667</a></p>
          <p>Instagram: <a href="https://instagram.com" target="_blank" rel="noreferrer">@artwithsucha</a></p>
          <p>Facebook: <a href="https://facebook.com" target="_blank" rel="noreferrer">/artwithsucha</a></p>

          <p className="note instruction">Take SS of what you like and send DM on Instagram for purchasing.</p>
        </div>
      </div>
    </div>
  );
};

export default Contact;

