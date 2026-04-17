import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-editor-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-green-400 font-mono tracking-tight">
            Code<span className="text-sky-400">Sync</span>
          </span>
          <p className="text-editor-muted text-sm mt-2">Real-time collaborative coding</p>
        </div>

        <div
          className="rounded-xl border p-8"
          style={{ background: '#161b22', borderColor: '#30363d' }}
        >
          <h1 className="text-lg font-semibold text-editor-text mb-6">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-editor-muted mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg text-sm text-editor-text outline-none focus:ring-1 focus:ring-green-400"
                style={{ background: '#0d1117', border: '1px solid #30363d' }}
              />
            </div>

            <div>
              <label className="block text-xs text-editor-muted mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg text-sm text-editor-text outline-none focus:ring-1 focus:ring-green-400"
                style={{ background: '#0d1117', border: '1px solid #30363d' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-400 text-black hover:bg-green-300 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-editor-muted mt-6">
            No account?{' '}
            <Link to="/register" className="text-sky-400 hover:underline">
              Create one →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
