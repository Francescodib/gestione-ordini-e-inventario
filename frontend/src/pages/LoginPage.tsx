import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import {Warehouse } from 'lucide-react';
import Button from '../components/Button';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        setTimeout(() => setError(''), 300); // Clear error after fade out
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowError(false);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error details:', err);
      
      // Extract error message with fallback
      let errorMessage = 'Errore durante il login';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Scroll to top to ensure error is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center flex-col items-center">
          <Warehouse className="w-25 h-25 text-blue-800" />
          <h1 className="text-2xl font-bold text-blue-800">QuickStock</h1>
        </div>
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Accedi al tuo account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            O{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              registrati per un nuovo account
            </Link>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                  Indirizzo email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                  placeholder="Inserisci la tua email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                  placeholder="Inserisci la tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className={`transition-all duration-300 ${showError ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'}`}>
                <ErrorMessage
                  message={error}
                  onDismiss={() => {
                    setShowError(false);
                    setTimeout(() => setError(''), 300);
                  }}
                />
              </div>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={loading}
              >
                Accedi
              </Button>
            </div>
            <div className="flex justify-center flex-col bg-gray-50 rounded-md p-2 shadow-md">
              <p className="text-xs text-center text-gray-500 mb-2">Admin demo: <span className="font-mono">demo@demo.com</span></p>
              <p className="text-xs text-center text-gray-500">Password: <span className="font-mono">Demo123!</span></p>
            </div>
            <div className="flex justify-center flex-col bg-gray-50 rounded-md p-2 shadow-md">
              <p className="text-xs text-center text-gray-500 mb-2">Cliente demo: <span className="font-mono">cliente@demo.it</span></p>
              <p className="text-xs text-center text-gray-500">Password: <span className="font-mono">Cliente123!</span></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
