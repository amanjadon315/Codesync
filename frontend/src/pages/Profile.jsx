import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const COLORS = ['#4ade80','#38bdf8','#f472b6','#fb923c','#a78bfa','#34d399','#fbbf24','#f87171'];

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedColor, setSelectedColor] = useState(user?.color || '#4ade80');

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0d1117' }}>
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/dashboard')} style={{ color: '#8b949e', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, marginBottom: 20 }}>
          ← Dashboard
        </button>
        <div className="rounded-xl p-8" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <div className="flex flex-col items-center mb-8">
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: selectedColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#000', marginBottom: 12 }}>
              {initials}
            </div>
            <h2 style={{ color: '#e6edf3', fontSize: 18, fontWeight: 600, margin: 0 }}>{user?.name}</h2>
            <p style={{ color: '#8b949e', fontSize: 13, margin: '4px 0 0' }}>{user?.email}</p>
          </div>

          <div style={{ marginBottom: 24 }}>
            {[{ label: 'Name', value: user?.name }, { label: 'Email', value: user?.email }, { label: 'Member since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' }].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #21262d' }}>
                <span style={{ fontSize: 12, color: '#8b949e' }}>{item.label}</span>
                <span style={{ fontSize: 13, color: '#e6edf3', fontFamily: 'inherit' }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 10 }}>Cursor color</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => { setSelectedColor(c); toast.success('Color updated!'); }} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: selectedColor === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer', outline: 'none' }} />
              ))}
            </div>
          </div>

          <button onClick={() => { logout(); navigate('/login'); }} style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#21262d', border: '1px solid #30363d', color: '#f85149', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
