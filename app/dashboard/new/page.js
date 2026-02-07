'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2, ArrowLeft } from 'lucide-react';

const INDUSTRIES = ['Fintech', 'Healthcare', 'Insurance', 'Enterprise SaaS', 'Gov adjacent'];
const SENSITIVITIES = ['PII', 'Financial transactions', 'Health data', 'Minors', 'Location'];
const GEOGRAPHIES = ['US', 'EU', 'Global'];
const LAUNCH_TYPES = ['internal', 'beta', 'GA'];
const RISK_LEVELS = ['low', 'medium', 'high'];

export default function NewBriefPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState('');
  const [form, setForm] = useState({
    title: '',
    input_type: 'feature_idea',
    main_input: '',
    industry_context: 'Fintech',
    data_sensitivity: [],
    geography: 'US',
    launch_type: 'GA',
    risk_tolerance: 'medium',
  });

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleSensitivity(val) {
    setForm(prev => ({
      ...prev,
      data_sensitivity: prev.data_sensitivity.includes(val)
        ? prev.data_sensitivity.filter(s => s !== val)
        : [...prev.data_sensitivity, val]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const briefId = data.brief.id;

      // Now generate
      setGenerating(true);
      setStage('Extracting entities...');
      const pollInterval = setInterval(async () => {
        try {
          const r = await fetch(`/api/briefs/${briefId}`);
          const d = await r.json();
          const stageMap = {
            entities: 'Building dependency graph...',
            graph: 'Generating PRD sections...',
            prd: 'Generating stakeholder critiques...',
            stakeholders: 'Generating checklists...',
            checklist: 'Building traceability...',
            traceability: 'Finalizing...',
          };
          if (d.brief?.generation_stage) setStage(stageMap[d.brief.generation_stage] || d.brief.generation_stage);
        } catch {}
      }, 2000);

      const genRes = await fetch(`/api/briefs/${briefId}/generate`, { method: 'POST' });
      clearInterval(pollInterval);
      if (genRes.ok) {
        router.push(`/dashboard/briefs/${briefId}`);
      } else {
        router.push(`/dashboard/briefs/${briefId}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#111827] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[#111827] mb-6">New Decision Brief</h1>

        {generating ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-[#3B4F6B] mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[#111827] mb-2">Generating your brief...</h2>
            <p className="text-sm text-gray-500">{stage}</p>
            <div className="mt-6 max-w-xs mx-auto">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#3B4F6B] rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-[#111827] block mb-1.5">Title</label>
              <input value={form.title} onChange={(e) => updateForm('title', e.target.value)} className="pill-input w-full" placeholder="e.g., Instant Payouts for SMB Customers" required />
            </div>

            <div>
              <label className="text-sm font-medium text-[#111827] block mb-1.5">Input Type</label>
              <div className="flex gap-3">
                {['feature_idea', 'prd_excerpt'].map(t => (
                  <button type="button" key={t} onClick={() => updateForm('input_type', t)} className={`pill-button text-sm border ${form.input_type === t ? 'border-[#3B4F6B] bg-[#3B4F6B]/5 text-[#3B4F6B]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {t === 'feature_idea' ? 'Feature Idea' : 'PRD Excerpt'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#111827] block mb-1.5">Description</label>
              <textarea value={form.main_input} onChange={(e) => updateForm('main_input', e.target.value)} rows={5} className="w-full rounded-2xl px-5 py-3 border border-gray-200 focus:ring-2 focus:ring-[#3B4F6B]/20 focus:border-[#3B4F6B] outline-none resize-none text-sm" placeholder="Describe the product decision, feature, or PRD excerpt..." required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#111827] block mb-1.5">Industry Context</label>
                <select value={form.industry_context} onChange={(e) => updateForm('industry_context', e.target.value)} className="pill-input w-full text-sm appearance-none cursor-pointer">
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#111827] block mb-1.5">Geography</label>
                <select value={form.geography} onChange={(e) => updateForm('geography', e.target.value)} className="pill-input w-full text-sm appearance-none cursor-pointer">
                  {GEOGRAPHIES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#111827] block mb-1.5">Data Sensitivity</label>
              <div className="flex flex-wrap gap-2">
                {SENSITIVITIES.map(s => (
                  <button type="button" key={s} onClick={() => toggleSensitivity(s)} className={`text-sm px-3.5 py-1.5 rounded-full border transition-all ${form.data_sensitivity.includes(s) ? 'border-[#3B4F6B] bg-[#3B4F6B] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#111827] block mb-1.5">Launch Type</label>
                <div className="flex gap-2">
                  {LAUNCH_TYPES.map(t => (
                    <button type="button" key={t} onClick={() => updateForm('launch_type', t)} className={`text-sm px-3.5 py-1.5 rounded-full border capitalize transition-all ${form.launch_type === t ? 'border-[#3B4F6B] bg-[#3B4F6B]/5 text-[#3B4F6B]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {t}
                  </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#111827] block mb-1.5">Risk Tolerance</label>
                <div className="flex gap-2">
                  {RISK_LEVELS.map(r => (
                    <button type="button" key={r} onClick={() => updateForm('risk_tolerance', r)} className={`text-sm px-3.5 py-1.5 rounded-full border capitalize transition-all ${form.risk_tolerance === r ? 'border-[#3B4F6B] bg-[#3B4F6B]/5 text-[#3B4F6B]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {r}
                  </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="pill-button w-full bg-[#3B4F6B] text-white hover:bg-[#2d3d52] disabled:opacity-50 flex items-center justify-center gap-2 text-sm py-3">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Zap className="w-4 h-4" /> Generate Decision Brief</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
