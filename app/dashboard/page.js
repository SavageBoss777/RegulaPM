'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Zap, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchBriefs();
  }, []);

  async function fetchBriefs() {
    try {
      const res = await fetch('/api/briefs');
      const data = await res.json();
      setBriefs(data.briefs || []);
    } catch {} finally { setLoading(false); }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await fetch('/api/seed', { method: 'POST' });
      await fetchBriefs();
    } catch {} finally { setSeeding(false); }
  }

  const statusColors = {
    draft: 'bg-[#E5E7EB] text-[#111827]/60',
    generating: 'bg-blue-50 text-blue-700',
    complete: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-700',
  };

  const industryColors = {
    'Fintech': 'bg-blue-50 text-blue-700',
    'Healthcare': 'bg-green-50 text-green-700',
    'Insurance': 'bg-amber-50 text-amber-700',
    'Enterprise SaaS': 'bg-purple-50 text-purple-700',
    'Gov adjacent': 'bg-slate-100 text-slate-700',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-[#3B4F6B]" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Decision Briefs</h1>
          <p className="text-gray-500 text-sm mt-1">{briefs.length} brief{briefs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          {briefs.length === 0 && (
            <button onClick={handleSeed} disabled={seeding} className="pill-button border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Seed Demo Briefs
            </button>
          )}
          <button onClick={() => router.push('/dashboard/new')} className="pill-button bg-[#3B4F6B] text-white text-sm hover:bg-[#2d3d52] flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Brief
          </button>
        </div>
      </div>

      {briefs.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-[#E5E7EB]/30 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#111827]/20" />
          </div>
          <h2 className="text-lg font-semibold text-[#111827] mb-2">No decision briefs yet</h2>
          <p className="text-[#111827]/40 text-sm mb-6 max-w-sm mx-auto">Create your first brief or seed demo data to get started.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => router.push('/dashboard/new')} className="pill-button bg-[#3B4F6B] text-white text-sm hover:bg-[#2d3d52] flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Brief
            </button>
            <button onClick={handleSeed} disabled={seeding} className="pill-button border border-[#E5E7EB] text-[#111827]/60 text-sm hover:bg-[#E5E7EB]/30 flex items-center gap-2">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Seed Demos
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {briefs.map(b => (
            <button key={b.id} onClick={() => router.push(`/dashboard/briefs/${b.id}`)} className="bg-white rounded-[18px] border border-[#E5E7EB] p-5 text-left hover:shadow-[0_4px_20px_rgba(17,24,39,0.04)] transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#111827]">{b.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[b.status] || 'bg-[#E5E7EB] text-[#111827]/50'}`}>{b.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#111827]/30 font-mono-ui">
                    <span>{b.industry_context}</span>
                    <span>{b.geography}</span>
                    <span>{b.launch_type}</span>
                    <span>{new Date(b.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#111827]/20 group-hover:text-[#3B4F6B] transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
