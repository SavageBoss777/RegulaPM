'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  FileText, Users, CheckSquare, GitBranch, Clock, Download,
  RefreshCw, Loader2, ArrowLeft, Copy, Check, ChevronRight,
  Shield, Scale, Landmark, DollarSign, Code, HeadphonesIcon,
  AlertTriangle, Eye, Plus, X, ChevronDown
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
  Security: Shield,
  Compliance: Scale,
  Legal: Landmark,
  Finance: DollarSign,
  Engineering: Code,
  Support: HeadphonesIcon,
};

const NODE_COLORS = {
  feature: { bg: 'bg-[#3B4F6B]/[0.08]', border: 'border-[#3B4F6B]', text: 'text-[#3B4F6B]' },
  risk: { bg: 'bg-[#111827]/[0.04]', border: 'border-[#111827]/40', text: 'text-[#111827]/70' },
  compliance: { bg: 'bg-[#3B4F6B]/[0.04]', border: 'border-[#3B4F6B]/30', text: 'text-[#3B4F6B]/80' },
  stakeholder: { bg: 'bg-[#E5E7EB]/50', border: 'border-[#3B4F6B]/20', text: 'text-[#3B4F6B]/70' },
  metric: { bg: 'bg-white', border: 'border-[#E5E7EB]', text: 'text-[#111827]/50' },
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
  graphData.nodes.forEach(n => {
    const t = n.type || 'feature';
    if (typeGroups[t]) typeGroups[t].push(n);
  });

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
      positioned.push({
        id: node.id,
        type: 'custom',
        position: { x: startX + spacing * i, y: layer.y },
        data: { ...node, nodeType: node.type || 'feature' },
      });
    });
  });

  const edges = (graphData.edges || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: '#64748b' },
  }));

  return { nodes: positioned, edges };
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

  useEffect(() => { setMounted(true); }, []);

  const fetchBrief = useCallback(async () => {
    if (!briefId) return;
    try {
      const res = await fetch(`/api/briefs/${briefId}`);
      if (res.ok) {
        const data = await res.json();
        setBrief(data.brief);
      }
    } catch {} finally { setLoading(false); }
  }, [briefId]);

  useEffect(() => { fetchBrief(); }, [fetchBrief]);

  async function handleGenerate() {
    setGenerating(true);
    setGenStage('Starting pipeline...');
    const pollInterval = setInterval(async () => {
      try {
        const r = await fetch(`/api/briefs/${briefId}`);
        const d = await r.json();
        const stageMap = {
          entities: 'Extracting entities...',
          graph: 'Building dependency graph...',
          prd: 'Generating PRD sections...',
          stakeholders: 'Generating stakeholder critiques...',
          checklist: 'Generating checklists...',
          traceability: 'Building traceability...',
          done: 'Complete!',
        };
        if (d.brief?.generation_stage) setGenStage(stageMap[d.brief.generation_stage] || d.brief.generation_stage);
      } catch {}
    }, 2000);

    try {
      await fetch(`/api/briefs/${briefId}/generate`, { method: 'POST' });
      clearInterval(pollInterval);
      await fetchBrief();
    } catch {} finally {
      clearInterval(pollInterval);
      setGenerating(false);
    }
  }

  async function handleRegenerateSection(section) {
    setRegenerating(section);
    try {
      const res = await fetch(`/api/briefs/${briefId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'section', target: section }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrief(data.brief);
      }
    } catch {} finally { setRegenerating(''); }
  }

  async function handleRegenerateStakeholder(stakeholder) {
    setRegenerating(stakeholder);
    try {
      const res = await fetch(`/api/briefs/${briefId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stakeholder', target: stakeholder }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrief(data.brief);
      }
    } catch {} finally { setRegenerating(''); }
  }

  async function handleChecklistToggle(category, index) {
    if (!brief?.checklist) return;
    const updated = { ...brief.checklist };
    updated[category] = [...updated[category]];
    updated[category][index] = { ...updated[category][index], checked: !updated[category][index].checked };
    setBrief(prev => ({ ...prev, checklist: updated }));
    await fetch(`/api/briefs/${briefId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: updated }),
    });
  }

  function generateMarkdown() {
    if (!brief?.prd_sections) return '';
    let md = `# ${brief.title}\n\n`;
    md += `**Industry:** ${brief.industry_context} | **Geography:** ${brief.geography} | **Risk:** ${brief.risk_tolerance} | **Launch:** ${brief.launch_type}\n\n---\n\n`;
    Object.entries(SECTION_LABELS).forEach(([key, label]) => {
      if (brief.prd_sections[key]) {
        md += `## ${label}\n\n${brief.prd_sections[key]}\n\n`;
      }
    });
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
      Object.entries(brief.checklist).forEach(([cat, items]) => {
        md += `## ${cat}\n`;
        items.forEach(item => {
          md += `- [${item.checked ? 'x' : ' '}] ${item.item}${item.owner ? ` (Owner: ${item.owner})` : ''}\n`;
        });
        md += '\n';
      });
    }
    return md;
  }

  function handleCopyMarkdown() {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadJSON() {
    const blob = new Blob([JSON.stringify(brief, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brief.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadMarkdown() {
    const blob = new Blob([generateMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brief.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const graphData = useMemo(() => {
    if (!brief?.graph) return { nodes: [], edges: [] };
    let filteredGraph = brief.graph;
    if (graphFilter !== 'all') {
      const filteredNodes = brief.graph.nodes.filter(n => n.type === graphFilter || n.type === 'feature');
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredEdges = brief.graph.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
      filteredGraph = { nodes: filteredNodes, edges: filteredEdges };
    }
    return layoutGraph(filteredGraph);
  }, [brief?.graph, graphFilter]);

  const statusColors = {
    draft: 'bg-[#E5E7EB] text-[#111827]/60',
    generating: 'bg-[#3B4F6B]/10 text-[#3B4F6B]',
    complete: 'bg-[#3B4F6B]/10 text-[#3B4F6B]',
    error: 'bg-[#111827]/10 text-[#111827]/70',
  };

  const tabs = [
    { id: 'prd', label: 'PRD', icon: FileText },
    { id: 'stakeholders', label: 'Stakeholders', icon: Users },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'graph', label: 'Graph', icon: GitBranch },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'export', label: 'Export', icon: Download },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-[#3B4F6B]" />
    </div>
  );

  if (!brief) return (
    <div className="flex flex-col items-center justify-center h-full">
      <FileText className="w-12 h-12 text-gray-300 mb-4" />
      <h2 className="text-lg font-semibold text-[#111827] mb-2">Brief not found</h2>
      <button onClick={() => router.push('/dashboard')} className="text-sm text-[#3B4F6B] hover:underline">Back to Dashboard</button>
    </div>
  );

  const isGenerated = brief.status === 'complete' && brief.prd_sections;

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="px-6 py-3 border-b border-[#E5E7EB] bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <ArrowLeft className="w-4 h-4" />
          </button>
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
          {!isGenerated && !generating && (
            <button onClick={handleGenerate} className="pill-button bg-[#3B4F6B] text-white text-sm hover:bg-[#2d3d52] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Generate
            </button>
          )}
          {generating && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{genStage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-[#E5E7EB] bg-white">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#3B4F6B] text-[#3B4F6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#E5E7EB]/10">
        {!isGenerated && !generating ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#3B4F6B]/5 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[#3B4F6B]" />
            </div>
            <h2 className="text-lg font-semibold text-[#111827] mb-2">Ready to generate</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md text-center">
              Click &quot;Generate&quot; to run the AI pipeline and create your PRD, stakeholder critiques, checklists, and dependency graph.
            </p>
            <button onClick={handleGenerate} className="pill-button bg-[#3B4F6B] text-white hover:bg-[#2d3d52] flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Generate Decision Brief
            </button>
          </div>
        ) : generating ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Loader2 className="w-12 h-12 animate-spin text-[#3B4F6B] mb-4" />
            <h2 className="text-lg font-semibold text-[#111827] mb-2">Generating your brief...</h2>
            <p className="text-sm text-gray-500">{genStage}</p>
            <div className="mt-4 w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#3B4F6B] rounded-full animate-pulse" style={{ width: '50%' }}></div>
            </div>
          </div>
        ) : (
          <>
            {/* PRD Tab */}
            {activeTab === 'prd' && brief.prd_sections && (
              <div className="flex h-full">
                <div className="w-56 border-r border-[#E5E7EB] bg-white p-3 overflow-auto">
                  <p className="text-[10px] font-semibold text-[#111827]/30 uppercase tracking-widest px-2 mb-3">Sections</p>
                  {Object.entries(SECTION_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setActiveSection(key)} className={`w-full text-left px-3 py-2 rounded-[12px] text-sm transition-colors ${activeSection === key ? 'bg-[#3B4F6B]/[0.06] text-[#3B4F6B] font-medium' : 'text-[#111827]/60 hover:bg-[#E5E7EB]/30'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-8 overflow-auto">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-xl font-bold text-[#111827]">{SECTION_LABELS[activeSection]}</h2>
                      <button onClick={() => handleRegenerateSection(activeSection)} disabled={regenerating === activeSection} className="text-xs px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[#111827]/40 hover:bg-[#E5E7EB]/30 flex items-center gap-1 disabled:opacity-50 transition-colors">
                        {regenerating === activeSection ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Regenerate
                      </button>
                    </div>
                    <div className="bg-white rounded-[18px] border border-[#E5E7EB] p-8 prose-body prose prose-sm max-w-none prose-headings:text-[#111827] prose-headings:font-semibold prose-p:text-[#111827]/60 prose-p:leading-relaxed prose-li:text-[#111827]/60 prose-li:leading-relaxed prose-strong:text-[#111827]">
                      <ReactMarkdown>{brief.prd_sections[activeSection] || 'No content generated for this section.'}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stakeholders Tab */}
            {activeTab === 'stakeholders' && brief.stakeholder_critiques && (
              <div className="p-8 overflow-auto">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-xl font-bold text-[#111827] mb-6">Stakeholder Critiques</h2>
                  <div className="grid gap-6">
                    {Object.entries(brief.stakeholder_critiques).map(([name, data]) => {
                      const Icon = STAKEHOLDER_ICONS[name] || Users;
                      return (
                        <div key={name} className="bg-white rounded-2xl border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#3B4F6B]/5 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-[#3B4F6B]" />
                              </div>
                              <h3 className="font-semibold text-[#111827]">{name}</h3>
                            </div>
                            <button onClick={() => handleRegenerateStakeholder(name)} disabled={regenerating === name} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50">
                              {regenerating === name ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              Regenerate
                            </button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-5">
                            {data.concerns?.length > 0 && (
                              <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                                <h4 className="text-[10px] font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-[#3B4F6B]" /> Concerns</h4>
                                <ul className="space-y-2">
                                  {data.concerns.map((c, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2 leading-relaxed"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{c}</li>)}
                                </ul>
                              </div>
                            )}
                            {data.required_controls?.length > 0 && (
                              <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                                <h4 className="text-[10px] font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Shield className="w-3 h-3 text-[#3B4F6B]" /> Required Controls</h4>
                                <ul className="space-y-2">
                                  {data.required_controls.map((c, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2 leading-relaxed"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{c}</li>)}
                                </ul>
                              </div>
                            )}
                            {data.required_approvals?.length > 0 && (
                              <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                                <h4 className="text-[10px] font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Check className="w-3 h-3 text-[#3B4F6B]" /> Required Approvals</h4>
                                <ul className="space-y-2">
                                  {data.required_approvals.map((c, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2 leading-relaxed"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{c}</li>)}
                                </ul>
                              </div>
                            )}
                            {data.questions?.length > 0 && (
                              <div className="bg-[#E5E7EB]/20 rounded-[14px] p-4">
                                <h4 className="text-[10px] font-semibold text-[#111827] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Eye className="w-3 h-3 text-[#3B4F6B]" /> Questions</h4>
                                <ul className="space-y-2">
                                  {data.questions.map((q, i) => <li key={i} className="text-sm text-[#111827]/60 flex items-start gap-2 leading-relaxed"><span className="w-1 h-1 rounded-full bg-[#3B4F6B]/40 mt-2 flex-shrink-0"></span>{q}</li>)}
                                </ul>
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

            {/* Checklist Tab */}
            {activeTab === 'checklist' && brief.checklist && (
              <div className="p-8 overflow-auto">
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

            {/* Graph Tab */}
            {activeTab === 'graph' && brief.graph && (
              <div className="flex flex-col h-full">
                <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: 'Overview' },
                      { id: 'risk', label: 'Risks' },
                      { id: 'compliance', label: 'Compliance' },
                      { id: 'stakeholder', label: 'Stakeholders' },
                      { id: 'metric', label: 'Metrics' },
                    ].map(f => (
                      <button key={f.id} onClick={() => setGraphFilter(f.id)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${graphFilter === f.id ? 'bg-[#3B4F6B] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 relative">
                  {mounted && (
                    <ReactFlow
                      nodes={graphData.nodes}
                      edges={graphData.edges}
                      nodeTypes={nodeTypes}
                      fitView
                      minZoom={0.3}
                      maxZoom={2}
                      onNodeClick={(_, node) => setSelectedNode(node)}
                      proOptions={{ hideAttribution: true }}
                    >
                      <Background color="#e5e7eb" gap={20} />
                      <Controls position="bottom-left" />
                      <MiniMap nodeColor={(n) => {
                        const type = n.data?.nodeType || 'feature';
                        const colors = { feature: '#3B4F6B', risk: '#111827', compliance: '#3B4F6B', stakeholder: '#3B4F6B', metric: '#E5E7EB' };
                        return colors[type] || '#E5E7EB';
                      }} />
                    </ReactFlow>
                  )}
                  {selectedNode && (
                    <div className="absolute top-4 right-4 w-72 bg-white rounded-2xl border border-gray-200 shadow-lg p-5 z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${(NODE_COLORS[selectedNode.data?.nodeType] || NODE_COLORS.feature).text}`}>
                          {selectedNode.data?.nodeType}
                        </span>
                        <button onClick={() => setSelectedNode(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-3.5 h-3.5 text-gray-400" /></button>
                      </div>
                      <h3 className="font-semibold text-[#111827] mb-2">{selectedNode.data?.label}</h3>
                      <p className="text-sm text-gray-500">{selectedNode.data?.description}</p>
                      {selectedNode.data?.severity && (
                        <div className="mt-3 text-xs"><span className="font-medium text-gray-500">Severity:</span> <span className="capitalize">{selectedNode.data.severity}</span></div>
                      )}
                      {selectedNode.data?.relevance && (
                        <div className="mt-1 text-xs"><span className="font-medium text-gray-500">Relevance:</span> <span className="capitalize">{selectedNode.data.relevance}</span></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="p-8 overflow-auto">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-bold text-[#111827] mb-6">Revision History</h2>
                  {brief.revisions?.length > 0 ? (
                    <div className="space-y-3">
                      {brief.revisions.map((rev, i) => (
                        <div key={rev.id || i} className="bg-white rounded-[18px] border border-[#E5E7EB] p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#3B4F6B]/[0.06] flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5 text-[#3B4F6B]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#111827]">{rev.summary}</p>
                            <p className="text-xs text-[#111827]/30 font-mono-ui mt-0.5">{new Date(rev.timestamp).toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#E5E7EB]/50 text-[#111827]/50 capitalize font-mono-ui">{rev.type?.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No revisions yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <div className="p-8 overflow-auto">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-bold text-[#111827] mb-6">Export Decision Brief</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button onClick={handleCopyMarkdown} className="bg-white rounded-[18px] border border-[#E5E7EB] p-6 text-left hover:shadow-[0_4px_20px_rgba(17,24,39,0.04)] transition-all">
                      <div className="w-10 h-10 rounded-xl bg-[#3B4F6B]/[0.06] flex items-center justify-center mb-4">
                        {copied ? <Check className="w-5 h-5 text-[#3B4F6B]" /> : <Copy className="w-5 h-5 text-[#3B4F6B]" />}
                      </div>
                      <h3 className="font-semibold text-[#111827] mb-1">{copied ? 'Copied!' : 'Copy Markdown'}</h3>
                      <p className="text-xs text-[#111827]/40">Copy the full brief as formatted Markdown text</p>
                    </button>
                    <button onClick={handleDownloadMarkdown} className="bg-white rounded-[18px] border border-[#E5E7EB] p-6 text-left hover:shadow-[0_4px_20px_rgba(17,24,39,0.04)] transition-all">
                      <div className="w-10 h-10 rounded-xl bg-[#3B4F6B]/[0.06] flex items-center justify-center mb-4">
                        <Download className="w-5 h-5 text-[#3B4F6B]" />
                      </div>
                      <h3 className="font-semibold text-[#111827] mb-1">Download Markdown</h3>
                      <p className="text-xs text-[#111827]/40">Download as a .md file for docs or repos</p>
                    </button>
                    <button onClick={handleDownloadJSON} className="bg-white rounded-[18px] border border-[#E5E7EB] p-6 text-left hover:shadow-[0_4px_20px_rgba(17,24,39,0.04)] transition-all">
                      <div className="w-10 h-10 rounded-xl bg-[#3B4F6B]/[0.06] flex items-center justify-center mb-4">
                        <FileText className="w-5 h-5 text-[#3B4F6B]" />
                      </div>
                      <h3 className="font-semibold text-[#111827] mb-1">Download JSON</h3>
                      <p className="text-xs text-[#111827]/40">Full structured data export for integrations</p>
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
