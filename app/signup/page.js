'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      let data;
      const text = await res.text();
      try { data = JSON.parse(text); } catch { throw new Error('Server returned an invalid response. Please try again.'); }
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-xl bg-[#3B4F6B] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-[#111827]">RegulaPM Nexus</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] mb-2">Create your account</h1>
          <p className="text-gray-500 text-sm">Start making governed product decisions</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <div>
              <label className="text-sm font-medium text-[#111827] block mb-1.5">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="pill-input w-full" placeholder="Your name" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#111827] block mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pill-input w-full" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="text-sm font-medium text-[#111827] block mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pill-input w-full" placeholder="Min 6 characters" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="pill-button w-full bg-[#3B4F6B] text-white hover:bg-[#2d3d52] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <button onClick={() => router.push('/login')} className="text-[#3B4F6B] font-medium hover:underline">Sign in</button></p>
        </div>
      </div>
    </div>
  );
}
