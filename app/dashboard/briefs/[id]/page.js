'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  FileText, Users, CheckSquare, GitBranch, Clock, Download,
  RefreshCw, Loader2, ArrowLeft, Copy, Check, ChevronRight,
  Shield, Scale, Landmark, DollarSign, Code, HeadphonesIcon,
  AlertTriangle, Eye, Plus, X, Gauge, BookOpen, Trash2,
  CircleDot, ArrowUpRight, Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SECTION_LABELS = {
  problem_statement: 'Problem Statement',
  goals: 'Goals',
  non_goals: 'Non-Goals',
  user_stories: 'User Stories',
  functional_requirements: 'Functional Requirements',
  compliance_risk_requirements: 'Compliance & Risk Requirements',
  stakeholder_notes: 'Stakeholder Notes',
  rollout_plan: 'Rollout Plan',
  metrics: 'Metrics',
  open_questions: 'Open Questions',
};

const STAKEHOLDER_ICONS = {
  Security: Shield, Compliance: Scale, Legal: Landmark,
  Finance: DollarSign, Engineering: Code, Support: HeadphonesIcon,
};

const NODE_COLORS = {
  feature: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700' },
  risk: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700' },
  compliance: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700' },
  stakeholder: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700' },
  metric: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700' },
};

function CustomNode({ data }) {
  const colors = NODE_COLORS[data.nodeType] || NODE_COLORS.feature;
  return (
    <div className={`px-4 py-3 rounded-[14px] border-2 shadow-sm ${colors.bg} ${colors.border} min-w-[150px] max-w-[200px]`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text} mb-1 font-mono-ui`}>{data.nodeType}</div>
      <div className="text-xs font-semibold text-[#111827] leading-tight">{data.label}</div>
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

function layoutGraph(graphData) {
  if (!graphData?.nodes?.length) return { nodes: [], edges: [] };
  const typeGroups = { feature: [], risk: [], compliance: [], stakeholder: [], metric: [] };
  graphData.nodes.forEach(n => { const t = n.type || 'feature'; if (typeGroups[t]) typeGroups[t].push(n); });
  const layers = [
    { nodes: typeGroups.feature, y: 40 },
    { nodes: [...typeGroups.risk, ...typeGroups.compliance], y: 200 },
    { nodes: typeGroups.stakeholder, y: 360 },
    { nodes: typeGroups.metric, y: 520 },
  ];
  const positioned = [];
  layers.forEach(layer => {
    const total = layer.nodes.length;
    if (total === 0) return;
    const spacing = Math.max(220, 900 / (total + 1));
    const startX = (900 - spacing * (total - 1)) / 2;
    layer.nodes.forEach((node, i) => {
      positioned.push({ id: node.id, type: 'custom', position: { x: startX + spacing * i, y: layer.y }, data: { ...node, nodeType: node.type || 'feature' } });
    });
  });
  const edges = (graphData.edges || []).map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label, type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#64748b' } }));
  return { nodes: positioned, edges };
}

// ========== STATUS HELPERS ==========
const STATUS_CONFIG = {
  approved: { label: 'Approved', class: 'bg-green-50 text-green-700' },
  needs_review: { label: 'Needs Review', class: 'bg-amber-50 text-amber-700' },
  risk_identified: { label: 'Risk Identified', class: 'bg-red-50 text-red-700' },
};

const RISK_CONFIG = {
  high: { label: 'High Risk', class: 'bg-red-50 text-red-700' },
  medium: { label: 'Medium', class: 'bg-amber-50 text-amber-700' },
  low: { label: 'Low', class: 'bg-green-50 text-green-700' },
};

const RECOMMENDATION_LABELS = {
  go: 'Go', go_with_conditions: 'Go with Conditions',
  no_go: 'No-Go', needs_further_review: 'Needs Further Review',
};

// ========== READINESS SCORE COMPONENT ==========
function ReadinessBar({ readiness }) {
  if (!readiness) return null;
  const { score, tier, factors } = readiness;
  const tierColors = { high: 'bg-green-500', medium: 'bg-amber-400', low: 'bg-red-400' };
  return (
    <div className="px-6 py-3 border-b border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#3B4F6B]" />
          <span className="text-xs font-semibold text-[#111827]">Decision Readiness</span>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${tierColors[tier]}`} style={{ width: `${score}%` }}></div>
          </div>
        </div>
        <span className="text-xs font-semibold font-mono-ui text-[#111827]">{score}%</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${tier === 'high' ? 'bg-green-50 text-green-700' : tier === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{tier} readiness</span>
        {factors.length > 0 && (
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-[#111827]/30 cursor-help" />
            <div className="hidden group-hover:block absolute right-0 top-6 z-20 w-64 bg-white border border-[#E5E7EB] rounded-[14px] p-3 shadow-lg">
              <p className="text-[10px] font-semibold text-[#111827]/40 uppercase tracking-wider mb-2">Contributing factors</p>
              {factors.map((f, i) => <p key={i} className="text-xs text-[#111827]/60 mb-1">{f}</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== DECISION TIMELINE ==========
function DecisionTimeline({ events }) {
  const sortedEvents = [...(events || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const typeIcons = {
    created: CircleDot, generation_started: RefreshCw, entities_extracted: Eye,
    graph_built: GitBranch, prd_generated: FileText, stakeholders_generated: Users,
    checklist_generated: CheckSquare, generation_complete: Check,
    section_regenerated: RefreshCw, stakeholder_regenerated: RefreshCw,
    status_changed: ArrowUpRight, assumption_added: BookOpen, summary_refreshed: Gauge,
  };
  if (sortedEvents.length === 0) return (
    <div className="text-center py-16">
      <Clock className="w-10 h-10 text-[#E5E7EB] mx-auto mb-3" />
      <p className="text-sm text-[#111827]/30">No events recorded yet</p>
      <p className="text-xs text-[#111827]/20 mt-1">Events will appear after generation</p>
    </div>
  );
  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-[#E5E7EB]"></div>
      <div className="space-y-0">
        {sortedEvents.map((ev, i) => {
          const Icon = typeIcons[ev.type] || CircleDot;
          return (
            <div key={ev.id || i} className="flex items-start gap-4 pl-2 py-3 relative">
              <div className="w-7 h-7 rounded-full bg-white border-2 border-[#E5E7EB] flex items-center justify-center z-10 flex-shrink-0">
                <Icon className="w-3 h-3 text-[#3B4F6B]" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm text-[#111827]/70">{ev.label}</p>
                <p className="text-[10px] text-[#111827]/30 font-mono-ui mt-0.5">{new Date(ev.timestamp).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BriefWorkspace() {
  const router = useRouter();
  const params = useParams();
  const briefId = params?.id;
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prd');
  const [activeSection, setActiveSection] = useState('problem_statement');
  const [regenerating, setRegenerating] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphFilter, setGraphFilter] = useState('all');
  const [mounted, setMounted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState('');
  const [newAssumption, setNewAssumption] = useState({ description: '', source: 'user', confidence: 'medium' });
  const [showDiff, setShowDiff] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchBrief = useCallback(async () => {
    if (!briefId) return;
    try {
      const res = await fetch(`/api/briefs/${briefId}`);
      if (res.ok) { const data = await res.json(); setBrief(data.brief); }
    } catch {} finally { setLoading(false); }
  }, [briefId]);

  useEffect(() => { fetchBrief(); }, [fetchBrief]);

  async function handleGenerate() {
    setGenerating(true);
    setGenStage('Starting pipeline...');
    // Reset error status before retrying
    await fetch(`/api/briefs/${briefId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'draft', error_message: null }) }).catch(() => {});
    const pollInterval = setInterval(async () => {
      try {
        const r = await fetch(`/api/briefs/${briefId}`);
        const d = await r.json();
        const stageMap = { entities: 'Extracting entities...', graph: 'Building dependency graph...', prd: 'Generating PRD sections...', stakeholders: 'Generating stakeholder critiques...', checklist: 'Generating checklists...', traceability: 'Building traceability...', done: 'Complete!' };
        if (d.brief?.generation_stage) setGenStage(stageMap[d.brief.generation_stage] || d.brief.generation_stage);
      } catch {}
    }, 2000);
    try {
      const res = await fetch(`/api/briefs/${briefId}/generate`, { method: 'POST' });
      clearInterval(pollInterval);
      if (!res.ok) {
        const text = await res.text();
        try { const d = JSON.parse(text); setGenStage(d.error || 'Generation failed'); } catch { setGenStage('Generation failed. Please try again.'); }
      }
      await fetchBrief();
    } catch {} finally { clearInterval(pollInterval); setGenerating(false); }
  }

  async function handleRegenerateSection(section) {
    setRegenerating(section);
    try {
      const res = await fetch(`/api/briefs/${briefId}/regenerate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'section', target: section }) });
      if (res.ok) { const data = await res.json(); setBrief(data.brief); setShowDiff(section); }
    } catch {} finally { setRegenerating(''); }
  }

  async function handleRegenerateStakeholder(stakeholder) {
    setRegenerating(stakeholder);
    try {
      const res = await fetch(`/api/briefs/${briefId}/regenerate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'stakeholder', target: stakeholder }) });
      if (res.ok) { const data = await res.json(); setBrief(data.brief); }
    } catch {} finally { setRegenerating(''); }
  }

  async function handleSectionStatus(section, status) {
    try {
      const res = await fetch(`/api/briefs/${briefId}/section-status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, status }) });
      if (res.ok) { const data = await res.json(); setBrief(data.brief); }
    } catch {}
  }

  async function handleAddAssumption() {
    if (!newAssumption.description.trim()) return;
    try {
      const res = await fetch(`/api/briefs/${briefId}/assumptions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAssumption) });
      if (res.ok) { const data = await res.json(); setBrief(data.brief); setNewAssumption({ description: '', source: 'user', confidence: 'medium' }); }
    } catch {}
  }

  async function handleDeleteAssumption(aId) {
    try {
      const res = await fetch(`/api/briefs/${briefId}/assumptions/${aId}`, { method: 'DELETE' });
      if (res.ok) { const data = await res.json(); setBrief(data.brief); }
    } catch {}
  }

  async function handleRefreshSummary() {
    setRegenerating('summary');
    try {
      const res = await fetch(`/api/briefs/${briefId}/executive-summary`, { method: 'POST' });
      if (res.ok) { const data = await res.json(); setBrief(data.brief); }
    } catch {} finally { setRegenerating(''); }
  }

  async function handleChecklistToggle(category, index) {
    if (!brief?.checklist) return;
    const updated = { ...brief.checklist };
    updated[category] = [...updated[category]];
    updated[category][index] = { ...updated[category][index], checked: !updated[category][index].checked };
    setBrief(prev => ({ ...prev, checklist: updated }));
    await fetch(`/api/briefs/${briefId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checklist: updated }) });
  }

  function generateMarkdown() {
    if (!brief?.prd_sections) return '';
    let md = `# ${brief.title}\n\n**Industry:** ${brief.industry_context} | **Geography:** ${brief.geography} | **Risk:** ${brief.risk_tolerance} | **Launch:** ${brief.launch_type}\n\n---\n\n`;
    Object.entries(SECTION_LABELS).forEach(([key, label]) => { if (brief.prd_sections[key]) md += `## ${label}\n\n${brief.prd_sections[key]}\n\n`; });
    if (brief.stakeholder_critiques) {
      md += `---\n\n# Stakeholder Critiques\n\n`;
      Object.entries(brief.stakeholder_critiques).forEach(([name, data]) => {
        md += `## ${name}\n\n`;
        if (data.concerns?.length) md += `### Concerns\n${data.concerns.map(c => `- ${c}`).join('\n')}\n\n`;
        if (data.required_controls?.length) md += `### Required Controls\n${data.required_controls.map(c => `- ${c}`).join('\n')}\n\n`;
        if (data.required_approvals?.length) md += `### Required Approvals\n${data.required_approvals.map(c => `- ${c}`).join('\n')}\n\n`;
        if (data.questions?.length) md += `### Questions\n${data.questions.map(q => `- ${q}`).join('\n')}\n\n`;
      });
    }
    if (brief.checklist) {
      md += `---\n\n# Checklist\n\n`;
      Object.entries(brief.checklist).forEach(([cat, items]) => { md += `## ${cat}\n`; items.forEach(item => { md += `- [${item.checked ? 'x' : ' '}] ${item.item}${item.owner ? ` (Owner: ${item.owner})` : ''}\n`; }); md += '\n'; });
    }
    return md;
  }

  function handleCopyMarkdown() { navigator.clipboard.writeText(generateMarkdown()); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  function handleDownloadJSON() { const b = new Blob([JSON.stringify(brief, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${brief.title.replace(/\s+/g, '_')}.json`; a.click(); URL.revokeObjectURL(u); }
  function handleDownloadMarkdown() { const b = new Blob([generateMarkdown()], { type: 'text/markdown' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${brief.title.replace(/\s+/g, '_')}.md`; a.click(); URL.revokeObjectURL(u); }

  const graphData = useMemo(() => {
    if (!brief?.graph) return { nodes: [], edges: [] };
    let fg = brief.graph;
    if (graphFilter !== 'all') {
      const fn = brief.graph.nodes.filter(n => n.type === graphFilter || n.type === 'feature');
      const ids = new Set(fn.map(n => n.id));
      fg = { nodes: fn, edges: brief.graph.edges.filter(e => ids.has(e.source) && ids.has(e.target)) };
    }
    return layoutGraph(fg);
  }, [brief?.graph, graphFilter]);

  const statusColors = { draft: 'bg-[#E5E7EB] text-[#111827]/60', generating: 'bg-blue-50 text-blue-700 animate-pulse-soft', complete: 'bg-green-50 text-green-700', error: 'bg-red-50 text-red-700' };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: Gauge },
    { id: 'prd', label: 'PRD', icon: FileText },
    { id: 'stakeholders', label: 'Stakeholders', icon: Users },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'graph', label: 'Graph', icon: GitBranch },
    { id: 'assumptions', label: 'Assumptions', icon: BookOpen },
    { id: 'history', label: 'Timeline', icon: Clock },
    { id: 'export', label: 'Export', icon: Download },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-[#3B4F6B]" /></div>;
  if (!brief) return <div className="flex flex-col items-center justify-center h-full"><FileText className="w-12 h-12 text-[#E5E7EB] mb-4" /><h2 className="text-lg font-semibold text-[#111827] mb-2">Brief not found</h2><button onClick={() => router.push('/dashboard')} className="text-sm text-[#3B4F6B] hover:underline">Back to Dashboard</button></div>;

  const isGenerated = brief.status === 'complete' && brief.prd_sections;
  const isError = brief.status === 'error';
  const readiness = brief.readiness;
  const execSummary = brief.executive_summary;

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="px-6 py-3 border-b border-[#E5E7EB] bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-1.5 rounded-lg hover:bg-[#E5E7EB]/30 text-[#111827]/30"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-lg font-bold text-[#111827]">{brief.title}</h1>
            <div className="flex items-center gap-3 text-xs text-[#111827]/30">
              <span className={`px-2 py-0.5 rounded-full font-medium ${statusColors[brief.status]}`}>{brief.status}</span>
              <span>{brief.industry_context}</span>
              <span>{brief.geography}</span>
              <span className="font-mono-ui">{new Date(brief.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isGenerated && !generating && <button onClick={handleGenerate} className="pill-button bg-[#3B4F6B] text-white text-sm hover:bg-[#2d3d52] flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Generate</button>}
          {generating && <div className="flex items-center gap-2 text-sm text-[#3B4F6B]"><Loader2 className="w-4 h-4 animate-spin" /><span>{genStage}</span></div>}
        </div>
      </div>

      {/* Readiness Score Bar */}
      {isGenerated && <ReadinessBar readiness={readiness} />}

      {/* Tabs */}
      <div className="px-6 border-b border-[#E5E7EB] bg-white">
        <div className="flex gap-0.5 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-[#3B4F6B] text-[#3B4F6B]' : 'border-transparent text-[#111827]/40 hover:text-[#111827]/60'}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#E5E7EB]/10">
        {!isGenerated && !generating ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            {isError ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
                <h2 className="text-lg font-semibold text-[#111827] mb-2">Generation failed</h2>
                <p className="text-sm text-[#111827]/50 mb-2 max-w-md text-center">{brief.error_message || 'An error occurred during generation.'}</p>
                <p className="text-xs text-[#111827]/30 mb-6">You can retry — the system will attempt fallback AI models automatically.</p>
                <button onClick={handleGenerate} className="pill-button bg-[#3B4F6B] text-white hover:bg-[#2d3d52] flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Retry Generation</button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#3B4F6B]/5 flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-[#3B4F6B]" /></div>
                <h2 className="text-lg font-semibold text-[#111827] mb-2">Ready to generate</h2>
                <p className="text-sm text-[#111827]/40 mb-6 max-w-md text-center">Click &quot;Generate&quot; to run the AI pipeline and create your PRD, stakeholder critiques, checklists, and dependency graph.</p>
                <button onClick={handleGenerate} className="pill-button bg-[#3B4F6B] text-white hover:bg-[#2d3d52] flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Generate Decision Brief</button>
              </>
            )}
          </div>
        ) : generating ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Loader2 className="w-12 h-12 animate-spin text-[#3B4F6B] mb-4" />
            <h2 className="text-lg font-semibold text-[#111827] mb-2">Generating your brief...</h2>
            <p className="text-sm text-[#111827]/40">{genStage}</p>
            <div className="mt-4 w-64 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden"><div className="h-full bg-[#3B4F6B] rounded-full animate-pulse" style={{ width: '50%' }}></div></div>
          </div>
        ) : (
          <>
            {/* ===== SUMMARY TAB ===== */}
            {activeTab === 'summary' && (
              <div className="p-8 overflow-auto tab-content">
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Executive Summary */}
                  <div className="bg-white rounded-[18px] border border-[#E5E7EB] p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-lg font-bold text-[#111827]">Executive Decision Summary</h2>
                      <button onClick={handleRefreshSummary} disabled={regenerating === 'summary'} className="text-xs px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[#111827]/40 hover:bg-[#E5E7EB]/30 flex items-center gap-1 disabled:opacity-50 transition-colors">
                        {regenerating === 'summary' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
                      </button>
                    </div>
                    {execSummary ? (
                      <div className="space-y-5">
                        <div>
                          <p className="text-[10px] font-semibold text-[#111827]/30 uppercase tracking-widest mb-2">Overview</p>
                          <p className="text-sm text-[#111827]/70 leading-relaxed prose-body">{execSummary.overview}</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                            <p className="text-[10px] font-semibold text-[#111827]/30 uppercase tracking-widest mb-2">Top Risks</p>
                            <ul className="space-y-1.5">{(execSummary.top_risks || []).map((r, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-[#111827]/30 mt-2 flex-shrink-0"></span>{r}</li>)}</ul>
                          </div>
                          <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                            <p className="text-[10px] font-semibold text-[#111827]/30 uppercase tracking-widest mb-2">Required Approvals</p>
                            <ul className="space-y-1.5">{(execSummary.required_approvals || []).map((a, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{a}</li>)}</ul>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pt-2 border-t border-[#E5E7EB]">
                          <div>
                            <p className="text-[10px] font-semibold text-[#111827]/30 uppercase tracking-widest mb-1">Recommendation</p>
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${execSummary.recommendation === 'go' ? 'bg-green-50 text-green-700' : execSummary.recommendation === 'no_go' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                              {RECOMMENDATION_LABELS[execSummary.recommendation] || execSummary.recommendation}
                            </span>
                          </div>
                          {execSummary.recommendation_rationale && <p className="text-xs text-[#111827]/40 flex-1 italic">{execSummary.recommendation_rationale}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-[#111827]/30">Executive summary will be generated with the brief</p>
                      </div>
                    )}
                  </div>

                  {/* Risk Overview */}
                  {brief.stakeholder_risk_levels && Object.keys(brief.stakeholder_risk_levels).length > 0 && (
                    <div className="bg-white rounded-[18px] border border-[#E5E7EB] p-6">
                      <h3 className="text-sm font-semibold text-[#111827] mb-4">Stakeholder Risk Overview</h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(brief.stakeholder_risk_levels).map(([name, level]) => (
                          <div key={name} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E7EB]">
                            <span className="text-xs font-medium text-[#111827]">{name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${RISK_CONFIG[level]?.class || ''}`}>{RISK_CONFIG[level]?.label || level}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== PRD TAB ===== */}
            {activeTab === 'prd' && brief.prd_sections && (
              <div className="flex h-full">
                <div className="w-56 border-r border-[#E5E7EB] bg-white p-3 overflow-auto">
                  <p className="text-[10px] font-semibold text-[#111827]/30 uppercase tracking-widest px-2 mb-3">Sections</p>
                  {Object.entries(SECTION_LABELS).map(([key, label]) => {
                    const st = brief.section_statuses?.[key];
                    return (
                      <button key={key} onClick={() => setActiveSection(key)} className={`w-full text-left px-3 py-2 rounded-[12px] text-sm transition-colors flex items-center justify-between ${activeSection === key ? 'bg-[#3B4F6B]/[0.06] text-[#3B4F6B] font-medium' : 'text-[#111827]/60 hover:bg-[#E5E7EB]/30'}`}>
                        <span className="truncate">{label}</span>
                        {st && <span className={`ml-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${st === 'approved' ? 'bg-green-500' : st === 'risk_identified' ? 'bg-red-500' : 'bg-amber-400'}`}></span>}
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 p-8 overflow-auto">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-[#111827]">{SECTION_LABELS[activeSection]}</h2>
                        {brief.section_statuses?.[activeSection] && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[brief.section_statuses[activeSection]]?.class || ''}`}>
                            {STATUS_CONFIG[brief.section_statuses[activeSection]]?.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={brief.section_statuses?.[activeSection] || 'needs_review'} onChange={(e) => handleSectionStatus(activeSection, e.target.value)} className="text-[10px] px-2 py-1 rounded-full border border-[#E5E7EB] bg-white text-[#111827]/60 outline-none cursor-pointer">
                          <option value="needs_review">Needs Review</option>
                          <option value="approved">Approved</option>
                          <option value="risk_identified">Risk Identified</option>
                        </select>
                        <button onClick={() => handleRegenerateSection(activeSection)} disabled={regenerating === activeSection} className="text-xs px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[#111827]/40 hover:bg-[#E5E7EB]/30 flex items-center gap-1 disabled:opacity-50 transition-colors">
                          {regenerating === activeSection ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Regenerate
                        </button>
                      </div>
                    </div>
                    {/* Diff View */}
                    {showDiff === activeSection && brief.regeneration_diffs?.[activeSection] && (
                      <div className="mb-4 bg-[#E5E7EB]/20 rounded-[14px] p-4 border border-[#E5E7EB]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-semibold text-[#111827]/40 uppercase tracking-wider">Section was regenerated</p>
                          <button onClick={() => setShowDiff(null)} className="text-[10px] text-[#3B4F6B] hover:underline">Dismiss</button>
                        </div>
                        <p className="text-xs text-[#111827]/40 font-mono-ui">Previous content replaced at {new Date(brief.regeneration_diffs[activeSection].timestamp).toLocaleString()}</p>
                      </div>
                    )}
                    <div className="bg-white rounded-[18px] border border-[#E5E7EB] p-8 prose-body prose prose-sm max-w-none prose-headings:text-[#111827] prose-headings:font-semibold prose-p:text-[#111827]/60 prose-p:leading-relaxed prose-li:text-[#111827]/60 prose-li:leading-relaxed prose-strong:text-[#111827]">
                      <ReactMarkdown>{brief.prd_sections[activeSection] || 'No content generated for this section.'}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STAKEHOLDERS TAB ===== */}
            {activeTab === 'stakeholders' && brief.stakeholder_critiques && (
              <div className="p-8 overflow-auto tab-content">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-xl font-bold text-[#111827] mb-6">Stakeholder Critiques</h2>
                  <div className="grid gap-6">
                    {Object.entries(brief.stakeholder_critiques).map(([name, data]) => {
                      const Icon = STAKEHOLDER_ICONS[name] || Users;
                      const riskLevel = brief.stakeholder_risk_levels?.[name];
                      return (
                        <div key={name} className="bg-white rounded-[18px] border border-[#E5E7EB] p-6">
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#3B4F6B]/[0.06] flex items-center justify-center"><Icon className="w-5 h-5 text-[#3B4F6B]" /></div>
                              <div>
                                <h3 className="font-semibold text-[#111827]">{name}</h3>
                                {riskLevel && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${RISK_CONFIG[riskLevel]?.class || ''}`}>{RISK_CONFIG[riskLevel]?.label}</span>}
                              </div>
                            </div>
                            <button onClick={() => handleRegenerateStakeholder(name)} disabled={regenerating === name} className="text-xs px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[#111827]/40 hover:bg-[#E5E7EB]/30 flex items-center gap-1 disabled:opacity-50 transition-colors">
                              {regenerating === name ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Regenerate
                            </button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-5">
                            {data.concerns?.length > 0 && (
                              <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                                <h4 className="text-[10px] font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-[#3B4F6B]" /> Concerns</h4>
                                <ul className="space-y-2">{data.concerns.map((c, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2 leading-relaxed"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{c}</li>)}</ul>
                              </div>
                            )}
                            {data.required_controls?.length > 0 && (
                              <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                                <h4 className="text-[10px] font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Shield className="w-3 h-3 text-[#3B4F6B]" /> Required Controls</h4>
                                <ul className="space-y-2">{data.required_controls.map((c, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2 leading-relaxed"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{c}</li>)}</ul>
                              </div>
                            )}
                            {data.required_approvals?.length > 0 && (
                              <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                                <h4 className="text-[10px] font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Check className="w-3 h-3 text-[#3B4F6B]" /> Required Approvals</h4>
                                <ul className="space-y-2">{data.required_approvals.map((c, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2 leading-relaxed"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{c}</li>)}</ul>
                              </div>
                            )}
                            {data.questions?.length > 0 && (
                              <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                                <h4 className="text-[10px] font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Eye className="w-3 h-3 text-[#3B4F6B]" /> Questions</h4>
                                <ul className="space-y-2">{data.questions.map((q, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2 leading-relaxed"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{q}</li>)}</ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ===== CHECKLIST TAB ===== */}
            {activeTab === 'checklist' && brief.checklist && (
              <div className="p-8 overflow-auto tab-content">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-bold text-[#111827] mb-6">Compliance & Launch Checklist</h2>
                  <div className="space-y-6">
                    {Object.entries(brief.checklist).map(([category, items]) => {
                      const checkedCount = items.filter(i => i.checked).length;
                      return (
                        <div key={category} className="bg-white rounded-[18px] border border-[#E5E7EB] p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-[#111827]">{category}</h3>
                            <span className="text-xs text-[#111827]/30 font-mono-ui">{checkedCount}/{items.length}</span>
                          </div>
                          <div className="space-y-1">
                            {items.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-2.5 rounded-[12px] hover:bg-[#E5E7EB]/20 transition-colors">
                                <button onClick={() => handleChecklistToggle(category, idx)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${item.checked ? 'bg-[#3B4F6B] border-[#3B4F6B]' : 'border-[#E5E7EB] hover:border-[#3B4F6B]'}`}>
                                  {item.checked && <Check className="w-3 h-3 text-white" />}
                                </button>
                                <div className="flex-1">
                                  <p className={`text-sm ${item.checked ? 'text-[#111827]/30 line-through' : 'text-[#111827]/70'}`}>{item.item}</p>
                                  {item.owner && <span className="text-[10px] text-[#111827]/30 font-mono-ui">Owner: {item.owner}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ===== GRAPH TAB ===== */}
            {activeTab === 'graph' && brief.graph && (
              <div className="flex flex-col h-full">
                <div className="px-6 py-3 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
                  <div className="flex gap-2">
                    {[{ id: 'all', label: 'Overview' }, { id: 'risk', label: 'Risks' }, { id: 'compliance', label: 'Compliance' }, { id: 'stakeholder', label: 'Stakeholders' }, { id: 'metric', label: 'Metrics' }].map(f => (
                      <button key={f.id} onClick={() => setGraphFilter(f.id)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${graphFilter === f.id ? 'bg-[#3B4F6B] text-white' : 'text-[#111827]/40 hover:bg-[#E5E7EB]/50'}`}>{f.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 relative">
                  {mounted && <ReactFlow nodes={graphData.nodes} edges={graphData.edges} nodeTypes={nodeTypes} fitView minZoom={0.3} maxZoom={2} onNodeClick={(_, node) => setSelectedNode(node)} proOptions={{ hideAttribution: true }}><Background color="#e5e7eb" gap={20} /><Controls position="bottom-left" /><MiniMap nodeColor={(n) => { const type = n.data?.nodeType || 'feature'; const colors = { feature: '#3b82f6', risk: '#ef4444', compliance: '#f59e0b', stakeholder: '#22c55e', metric: '#a855f7' }; return colors[type] || '#E5E7EB'; }} /></ReactFlow>}
                  {selectedNode && (
                    <div className="absolute top-4 right-4 w-80 bg-white rounded-[18px] border border-[#E5E7EB] shadow-lg p-5 z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono-ui ${(NODE_COLORS[selectedNode.data?.nodeType] || NODE_COLORS.feature).text}`}>{selectedNode.data?.nodeType}</span>
                        <button onClick={() => setSelectedNode(null)} className="p-1 rounded-lg hover:bg-[#E5E7EB]/30"><X className="w-3.5 h-3.5 text-[#111827]/30" /></button>
                      </div>
                      <h3 className="font-semibold text-[#111827] mb-2">{selectedNode.data?.label}</h3>
                      <p className="text-sm text-[#111827]/50 leading-relaxed">{selectedNode.data?.description}</p>
                      {selectedNode.data?.severity && <div className="mt-3 text-xs"><span className="font-medium text-[#111827]/40">Severity:</span> <span className="capitalize">{selectedNode.data.severity}</span></div>}
                      {selectedNode.data?.relevance && <div className="mt-1 text-xs"><span className="font-medium text-[#111827]/40">Relevance:</span> <span className="capitalize">{selectedNode.data.relevance}</span></div>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== ASSUMPTIONS TAB ===== */}
            {activeTab === 'assumptions' && (
              <div className="p-8 overflow-auto tab-content">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-bold text-[#111827] mb-2">Assumption Registry</h2>
                  <p className="text-sm text-[#111827]/40 mb-6">Track assumptions underlying this decision. Each assumption has a source and confidence level.</p>

                  {/* Add Assumption */}
                  <div className="bg-white rounded-[18px] border border-[#E5E7EB] p-5 mb-6">
                    <div className="flex gap-3">
                      <input value={newAssumption.description} onChange={(e) => setNewAssumption(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe an assumption..." className="flex-1 pill-input text-sm" onKeyDown={(e) => e.key === 'Enter' && handleAddAssumption()} />
                      <select value={newAssumption.source} onChange={(e) => setNewAssumption(prev => ({ ...prev, source: e.target.value }))} className="text-xs px-3 py-2 rounded-full border border-[#E5E7EB] bg-white text-[#111827]/60 outline-none">
                        <option value="user">User</option>
                        <option value="ai">AI</option>
                        <option value="stakeholder">Stakeholder</option>
                      </select>
                      <select value={newAssumption.confidence} onChange={(e) => setNewAssumption(prev => ({ ...prev, confidence: e.target.value }))} className="text-xs px-3 py-2 rounded-full border border-[#E5E7EB] bg-white text-[#111827]/60 outline-none">
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <button onClick={handleAddAssumption} className="pill-button bg-[#3B4F6B] text-white text-sm px-4"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Assumption List */}
                  {(brief.assumptions || []).length === 0 ? (
                    <div className="text-center py-16">
                      <BookOpen className="w-10 h-10 text-[#E5E7EB] mx-auto mb-3" />
                      <p className="text-sm text-[#111827]/30">No assumptions recorded</p>
                      <p className="text-xs text-[#111827]/20 mt-1">Add assumptions to track decision foundations</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(brief.assumptions || []).map(a => (
                        <div key={a.id} className="bg-white rounded-[14px] border border-[#E5E7EB] p-4 flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm text-[#111827]/70">{a.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5E7EB]/50 text-[#111827]/40 capitalize font-mono-ui">{a.source}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.confidence === 'high' ? 'bg-green-50 text-green-700' : a.confidence === 'low' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{a.confidence} confidence</span>
                              <span className="text-[10px] text-[#111827]/20 font-mono-ui">{new Date(a.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteAssumption(a.id)} className="p-1.5 rounded-lg hover:bg-[#E5E7EB]/30 text-[#111827]/20 hover:text-[#111827]/50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== TIMELINE TAB ===== */}
            {activeTab === 'history' && (
              <div className="p-8 overflow-auto tab-content">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-bold text-[#111827] mb-6">Decision Timeline</h2>
                  <DecisionTimeline events={brief.timeline_events} />
                  {/* Legacy revisions fallback */}
                  {(!brief.timeline_events || brief.timeline_events.length === 0) && brief.revisions?.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[10px] font-semibold text-[#111827]/30 uppercase tracking-widest mb-3">Revisions</p>
                      <div className="space-y-3">
                        {brief.revisions.map((rev, i) => (
                          <div key={rev.id || i} className="bg-white rounded-[18px] border border-[#E5E7EB] p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#3B4F6B]/[0.06] flex items-center justify-center flex-shrink-0"><Clock className="w-5 h-5 text-[#3B4F6B]" /></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[#111827]">{rev.summary}</p>
                              <p className="text-xs text-[#111827]/30 font-mono-ui mt-0.5">{new Date(rev.timestamp).toLocaleString()}</p>
                            </div>
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#E5E7EB]/50 text-[#111827]/50 capitalize font-mono-ui">{rev.type?.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== EXPORT TAB ===== */}
            {activeTab === 'export' && (
              <div className="p-8 overflow-auto tab-content">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-bold text-[#111827] mb-6">Export Decision Brief</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button onClick={handleCopyMarkdown} className="card-hover bg-white rounded-[18px] border border-[#E5E7EB] p-6 text-left transition-all">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">{copied ? <Check className="w-5 h-5 text-blue-600" /> : <Copy className="w-5 h-5 text-blue-600" />}</div>
                      <h3 className="font-semibold text-[#111827] mb-1">{copied ? 'Copied!' : 'Copy Markdown'}</h3>
                      <p className="text-xs text-[#111827]/40">Copy full brief as formatted Markdown</p>
                    </button>
                    <button onClick={handleDownloadMarkdown} className="bg-white rounded-[18px] border border-[#E5E7EB] p-6 text-left hover:shadow-[0_4px_20px_rgba(17,24,39,0.04)] transition-all">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-4"><Download className="w-5 h-5 text-green-600" /></div>
                      <h3 className="font-semibold text-[#111827] mb-1">Download Markdown</h3>
                      <p className="text-xs text-[#111827]/40">Download as .md file</p>
                    </button>
                    <button onClick={handleDownloadJSON} className="bg-white rounded-[18px] border border-[#E5E7EB] p-6 text-left hover:shadow-[0_4px_20px_rgba(17,24,39,0.04)] transition-all">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4"><FileText className="w-5 h-5 text-purple-600" /></div>
                      <h3 className="font-semibold text-[#111827] mb-1">Download JSON</h3>
                      <p className="text-xs text-[#111827]/40">Full structured data export</p>
                    </button>
                  </div>
                  <div className="mt-8 bg-white rounded-[18px] border border-[#E5E7EB] p-6">
                    <h3 className="font-semibold text-[#111827] mb-4">Export Preview</h3>
                    <div className="bg-[#E5E7EB]/20 rounded-[14px] p-5 max-h-96 overflow-auto">
                      <pre className="text-xs text-[#111827]/50 whitespace-pre-wrap font-mono-ui leading-relaxed">{generateMarkdown().slice(0, 2000)}{generateMarkdown().length > 2000 ? '\n\n... (truncated)' : ''}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
