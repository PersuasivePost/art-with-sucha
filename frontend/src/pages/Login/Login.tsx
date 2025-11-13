import { useState } from 'react';
import './Login.css'

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://art-with-sucha.onrender.com';
            const backendClean = backendUrl.replace(/\/+$/g, '');
            // Decide endpoint based on current path: admin login moved to /adminlogin
            const isAdminPath = window.location.pathname === '/adminlogin';
            const endpoint = isAdminPath ? '/adminlogin' : '/login';

            const response = await fetch(`${backendClean}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                if (isAdminPath) {
                    // Admin/artist login
                    localStorage.setItem('artistToken', data.token);
                    localStorage.setItem('artistEmail', data.artist?.email || formData.email);
                } else {
                    // Public user login
                    localStorage.setItem('userToken', data.token);
                    localStorage.setItem('userName', data.user?.name || data.user?.email || formData.email);
                    localStorage.setItem('userEmail', data.user?.email || formData.email);
                }
                // Redirect to home page
                window.location.href = '/';
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Connection failed');
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="background-image">
                {/* Use picture to serve a mobile-specific image when viewport is narrow */}
                <picture>
                    <source media="(max-width: 600px)" srcSet="/image.png" />
                    <img src="/bg8t.png" alt="Background" />
                </picture>
            </div>
            <div className="login-content">
                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="Email"
                        className="form-input"
                    />

                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="Password"
                        className="form-input"
                    />

                    {error && <div className="error-message">{error}</div>}

                    <button 
                        type="submit" 
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? '...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}