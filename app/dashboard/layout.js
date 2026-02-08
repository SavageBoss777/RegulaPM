'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Shield, Plus, Search, FileText, LogOut, ChevronRight, Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [authChecked, setAuthChecked] = useState(false);

  const fetchBriefs = useCallback(async () => {
    try {
      const res = await fetch('/api/briefs');
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        setUser(data.user);
        setAuthChecked(true);
        fetchBriefs();
      } catch { router.push('/login'); }
    }
    checkAuth();
  }, [router, fetchBriefs]);

  useEffect(() => {
    if (authChecked) fetchBriefs();
  }, [pathname, authChecked, fetchBriefs]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function handleSeed() {
    await fetch('/api/seed', { method: 'POST' });
    fetchBriefs();
  }

  const filteredBriefs = briefs.filter(b => {
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all' && b.status !== filter) return false;
    return true;
  });

  const statusColors = {
    draft: 'bg-[#E5E7EB] text-[#111827]/60',
    generating: 'bg-blue-50 text-blue-700',
    complete: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-700',
  };

  const industryColors = {
    'Fintech': 'text-blue-600',
    'Healthcare': 'text-green-600',
    'Insurance': 'text-amber-600',
    'Enterprise SaaS': 'text-purple-600',
    'Gov adjacent': 'text-slate-600',
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B4F6B]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E5E7EB] flex flex-col">
        <div className="p-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-8 h-8 rounded-lg bg-[#3B4F6B] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#111827]">RegulaPM Nexus</span>
          </div>
          <button onClick={() => router.push('/dashboard/new')} className="pill-button w-full bg-[#3B4F6B] text-white text-sm hover:bg-[#2d3d52] flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> New Decision Brief
          </button>
        </div>

        <div className="p-3">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#111827]/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search briefs..." className="w-full pl-9 pr-3 py-2 text-sm rounded-full border border-[#E5E7EB] focus:border-[#3B4F6B] focus:ring-1 focus:ring-[#3B4F6B]/15 outline-none text-[#111827]" />
          </div>
          <div className="flex gap-1 mb-2">
            {['all', 'draft', 'complete', 'generating'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${filter === f ? 'bg-[#3B4F6B] text-white' : 'text-[#111827]/40 hover:bg-[#E5E7EB]/50'}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-2">
          {filteredBriefs.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="w-8 h-8 text-[#E5E7EB] mx-auto mb-2" />
              <p className="text-sm text-[#111827]/30 mb-3">No briefs yet</p>
              <button onClick={handleSeed} className="text-xs text-[#3B4F6B] hover:underline">Seed demo briefs</button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredBriefs.map(b => (
                <button key={b.id} onClick={() => router.push(`/dashboard/briefs/${b.id}`)} className={`w-full text-left px-3 py-2.5 rounded-[12px] text-sm transition-colors group ${pathname.includes(b.id) ? 'bg-[#3B4F6B]/[0.06] text-[#3B4F6B]' : 'hover:bg-[#E5E7EB]/30 text-[#111827]/70'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate flex-1">{b.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#111827]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[b.status] || 'bg-[#E5E7EB] text-[#111827]/50'}`}>{b.status}</span>
                    <span className="text-[10px] text-[#111827]/30">{b.industry_context}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#3B4F6B]/[0.08] flex items-center justify-center text-xs font-medium text-[#3B4F6B]">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
              <div>
                <p className="text-xs font-medium text-[#111827]">{user?.name}</p>
                <p className="text-[10px] text-[#111827]/30">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-[#E5E7EB]/30 text-[#111827]/30 hover:text-[#111827]/60">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
