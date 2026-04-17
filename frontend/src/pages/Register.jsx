import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return toast.error('Passwords do not match');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-editor-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-green-400 font-mono tracking-tight">
            Code<span className="text-sky-400">Sync</span>
          </span>
          <p className="text-editor-muted text-sm mt-2">Start collaborating in seconds</p>
        </div>

        <div
          className="rounded-xl border p-8"
          style={{ background: '#161b22', borderColor: '#30363d' }}
        >
          <h1 className="text-lg font-semibold text-editor-text mb-6">Create account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'name', label: 'Full name', type: 'text', placeholder: 'Arjun Sharma' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
              { name: 'confirm', label: 'Confirm password', type: 'password', placeholder: '••••••••' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-xs text-editor-muted mb-1.5">{field.label}</label>
                <input
                  name={field.name}
                  type={field.type}
                  required
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 rounded-lg text-sm text-editor-text outline-none focus:ring-1 focus:ring-green-400"
                  style={{ background: '#0d1117', border: '1px solid #30363d' }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-sky-400 text-black hover:bg-sky-300 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-editor-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-green-400 hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
