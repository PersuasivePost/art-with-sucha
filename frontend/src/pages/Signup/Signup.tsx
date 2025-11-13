import { useState } from 'react';
import './Signup.css'

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobno: '',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as any;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://art-with-sucha.onrender.com';
      const backendClean = backendUrl.replace(/\/+$/g, '');
      const response = await fetch(`${backendClean}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userName', data.user?.name || data.user?.email || formData.email);
        localStorage.setItem('userEmail', data.user?.email || formData.email);
        window.location.href = '/';
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup error', err);
      setError('Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-content">
        <form onSubmit={handleSubmit} className="signup-form">
          <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Full name" className="form-input" />
          <input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Email" className="form-input" required />
          <input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="Password" className="form-input" required />
          <input name="mobno" value={formData.mobno} onChange={handleInputChange} placeholder="Mobile number" className="form-input" />
          <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="Address" className="form-input textarea" />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="signup-button" disabled={isLoading}>{isLoading ? '...' : 'Create account'}</button>
        </form>
      </div>
    </div>
  );
}
