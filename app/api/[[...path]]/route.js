import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { GoogleGenAI } from '@google/genai';

let _genAI = null;
function getGenAI() {
  if (!_genAI) {
    _genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _genAI;
}

// ========== AUTH HELPERS ==========
async function getUser(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return null;
    const db = await connectToDatabase();
    const session = await db.collection('sessions').findOne({ token });
    if (!session) return null;
    const user = await db.collection('users').findOne({ id: session.user_id });
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  } catch { return null; }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// ========== GEMINI AI ==========
async function callGemini(prompt) {
  const response = await getGenAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });
  const text = response.text;
  return JSON.parse(text);
}

// ========== AI PIPELINE STAGES ==========
async function stage1ExtractEntities(brief) {
  const prompt = `You are a product analysis AI. Analyze this product decision and extract structured entities.

Product Decision:
Title: ${brief.title}
Description: ${brief.main_input}
Input Type: ${brief.input_type}
Industry: ${brief.industry_context}
Data Sensitivity: ${(brief.data_sensitivity || []).join(', ')}
Geography: ${brief.geography}
Launch Type: ${brief.launch_type}
Risk Tolerance: ${brief.risk_tolerance}

Return a JSON object with exactly this structure:
{
  "feature_summary": "2-3 sentence summary of the feature",
  "entities": ["entity1", "entity2", "entity3"],
  "risks": [{"name": "risk name", "severity": "high", "description": "description"}],
  "compliance_signals": [{"regulation": "regulation name", "relevance": "high", "description": "description"}],
  "stakeholders": ["Security", "Compliance", "Legal", "Finance", "Engineering", "Support"],
  "metrics": [{"name": "metric name", "type": "success", "description": "description"}],
  "rollout_hints": ["hint1", "hint2"]
}`;
  return await callGemini(prompt);
}

function stage2BuildGraph(entities, brief) {
  const nodes = [];
  const edges = [];
  nodes.push({ id: 'feature-main', type: 'feature', label: brief.title, description: entities.feature_summary });
  (entities.risks || []).forEach((risk, i) => {
    const nid = `risk-${i}`;
    nodes.push({ id: nid, type: 'risk', label: risk.name, description: risk.description, severity: risk.severity });
    edges.push({ id: `e-f-${nid}`, source: 'feature-main', target: nid, label: 'has risk' });
  });
  (entities.compliance_signals || []).forEach((c, i) => {
    const nid = `compliance-${i}`;
    nodes.push({ id: nid, type: 'compliance', label: c.regulation, description: c.description, relevance: c.relevance });
    edges.push({ id: `e-f-${nid}`, source: 'feature-main', target: nid, label: 'requires' });
  });
  (entities.stakeholders || []).forEach((s, i) => {
    const nid = `stakeholder-${i}`;
    nodes.push({ id: nid, type: 'stakeholder', label: s, description: `${s} team stakeholder` });
    edges.push({ id: `e-f-${nid}`, source: 'feature-main', target: nid, label: 'involves' });
  });
  (entities.metrics || []).forEach((m, i) => {
    const nid = `metric-${i}`;
    nodes.push({ id: nid, type: 'metric', label: m.name, description: m.description });
    edges.push({ id: `e-f-${nid}`, source: 'feature-main', target: nid, label: 'measured by' });
  });
  // Cross-link risks to compliance based on sensitivity
  if (brief.data_sensitivity?.includes('PII') || brief.data_sensitivity?.includes('Financial transactions')) {
    const riskNodes = nodes.filter(n => n.type === 'risk');
    const compNodes = nodes.filter(n => n.type === 'compliance');
    riskNodes.forEach(rn => {
      compNodes.forEach(cn => {
        edges.push({ id: `e-${rn.id}-${cn.id}`, source: rn.id, target: cn.id, label: 'triggers' });
      });
    });
  }
  return { nodes, edges };
}

async function stage3GeneratePRD(entities, graph, brief) {
  const prompt = `Generate a comprehensive PRD for this product decision. Use markdown formatting.

Feature: ${brief.title}
Summary: ${entities.feature_summary}
Industry: ${brief.industry_context}
Geography: ${brief.geography}
Risk Tolerance: ${brief.risk_tolerance}
Launch Type: ${brief.launch_type}
Data Sensitivity: ${(brief.data_sensitivity || []).join(', ')}
Key Risks: ${(entities.risks || []).map(r => r.name).join(', ')}
Compliance: ${(entities.compliance_signals || []).map(c => c.regulation).join(', ')}

Return JSON with these exact keys, each value being detailed markdown text (3-8 bullet points or paragraphs):
{
  "problem_statement": "...",
  "goals": "...",
  "non_goals": "...",
  "user_stories": "...",
  "functional_requirements": "...",
  "compliance_risk_requirements": "...",
  "stakeholder_notes": "...",
  "rollout_plan": "...",
  "metrics": "...",
  "open_questions": "..."
}`;
  return await callGemini(prompt);
}

async function stage4GenerateStakeholders(entities, graph, brief) {
  const prompt = `Generate stakeholder critique packs for this product decision.

Feature: ${brief.title}
Summary: ${entities.feature_summary}
Industry: ${brief.industry_context}
Data Sensitivity: ${(brief.data_sensitivity || []).join(', ')}
Geography: ${brief.geography}
Risks: ${JSON.stringify(entities.risks)}
Compliance: ${JSON.stringify(entities.compliance_signals)}

Return JSON with exactly these stakeholder keys. Each has arrays of strings:
{
  "Security": {"concerns": ["..."], "required_controls": ["..."], "required_approvals": ["..."], "questions": ["..."]},
  "Compliance": {"concerns": ["..."], "required_controls": ["..."], "required_approvals": ["..."], "questions": ["..."]},
  "Legal": {"concerns": ["..."], "required_controls": ["..."], "required_approvals": ["..."], "questions": ["..."]},
  "Finance": {"concerns": ["..."], "required_controls": ["..."], "required_approvals": ["..."], "questions": ["..."]},
  "Engineering": {"concerns": ["..."], "required_controls": ["..."], "required_approvals": ["..."], "questions": ["..."]},
  "Support": {"concerns": ["..."], "required_controls": ["..."], "required_approvals": ["..."], "questions": ["..."]}
}
Make each detailed and realistic for ${brief.industry_context}.`;
  return await callGemini(prompt);
}

async function stage5GenerateChecklist(entities, graph, brief) {
  const prompt = `Generate a launch and compliance checklist for this product decision.

Feature: ${brief.title}
Industry: ${brief.industry_context}
Launch Type: ${brief.launch_type}
Data Sensitivity: ${(brief.data_sensitivity || []).join(', ')}
Geography: ${brief.geography}

Return JSON with checklist categories. Each category is an array of items:
{
  "Approvals": [{"item": "description", "checked": false, "owner": "", "include_in_export": true}],
  "Security Controls": [{"item": "...", "checked": false, "owner": "", "include_in_export": true}],
  "Testing Requirements": [{"item": "...", "checked": false, "owner": "", "include_in_export": true}],
  "Monitoring and Alerts": [{"item": "...", "checked": false, "owner": "", "include_in_export": true}],
  "Documentation Updates": [{"item": "...", "checked": false, "owner": "", "include_in_export": true}],
  "Release Steps": [{"item": "...", "checked": false, "owner": "", "include_in_export": true}]
}
3-5 items per category. Make items specific and actionable.`;
  return await callGemini(prompt);
}

async function stage6BuildTraceability(prd, graph) {
  const prompt = `Map PRD requirements to graph nodes for traceability.

PRD Sections: ${JSON.stringify(Object.keys(prd))}
Graph Nodes: ${JSON.stringify(graph.nodes.map(n => ({ id: n.id, label: n.label, type: n.type })))}

Return a JSON array of 8-12 traceability mappings:
[{"requirement": "short requirement text", "prd_section": "section_key", "linked_node_ids": ["node-id"], "rationale": "why linked"}]`;
  return await callGemini(prompt);
}

async function runFullPipeline(briefId) {
  const db = await connectToDatabase();
  const brief = await db.collection('decision_briefs').findOne({ id: briefId });
  if (!brief) throw new Error('Brief not found');

  await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { status: 'generating', generation_stage: 'entities', updated_at: new Date().toISOString() } });

  // Stage 1
  const entities = await stage1ExtractEntities(brief);
  await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { entities, generation_stage: 'graph' } });

  // Stage 2
  const graph = stage2BuildGraph(entities, brief);
  await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { graph, generation_stage: 'prd' } });

  // Stage 3
  const prd_sections = await stage3GeneratePRD(entities, graph, brief);
  await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { prd_sections, generation_stage: 'stakeholders' } });

  // Stage 4
  const stakeholder_critiques = await stage4GenerateStakeholders(entities, graph, brief);
  await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { stakeholder_critiques, generation_stage: 'checklist' } });

  // Stage 5
  const checklist = await stage5GenerateChecklist(entities, graph, brief);
  await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { checklist, generation_stage: 'traceability' } });

  // Stage 6
  const traceability = await stage6BuildTraceability(prd_sections, graph);

  // Save revision
  const revision = { id: uuidv4(), timestamp: new Date().toISOString(), type: 'full_generation', summary: 'Initial AI generation complete' };

  await db.collection('decision_briefs').updateOne({ id: briefId }, {
    $set: {
      traceability,
      status: 'complete',
      generation_stage: 'done',
      updated_at: new Date().toISOString(),
    },
    $push: { revisions: revision }
  });

  return await db.collection('decision_briefs').findOne({ id: briefId });
}

// ========== AUTH HANDLERS ==========
async function handleSignup(request) {
  const { email, password, name } = await request.json();
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  const db = await connectToDatabase();
  const exists = await db.collection('users').findOne({ email });
  if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  const hashedPw = bcrypt.hashSync(password, 10);
  const user = { id: uuidv4(), email, password: hashedPw, name: name || email.split('@')[0], created_at: new Date().toISOString() };
  await db.collection('users').insertOne(user);
  const token = uuidv4();
  await db.collection('sessions').insertOne({ id: uuidv4(), user_id: user.id, token, created_at: new Date().toISOString() });
  const { password: _, ...safeUser } = user;
  const response = NextResponse.json({ user: safeUser });
  response.cookies.set('session_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' });
  return response;
}

async function handleLogin(request) {
  const { email, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  const db = await connectToDatabase();
  const user = await db.collection('users').findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const token = uuidv4();
  await db.collection('sessions').insertOne({ id: uuidv4(), user_id: user.id, token, created_at: new Date().toISOString() });
  const { password: _, ...safeUser } = user;
  const response = NextResponse.json({ user: safeUser });
  response.cookies.set('session_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' });
  return response;
}

async function handleLogout(request) {
  const token = request.cookies.get('session_token')?.value;
  if (token) {
    const db = await connectToDatabase();
    await db.collection('sessions').deleteMany({ token });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set('session_token', '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' });
  return response;
}

async function handleMe(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ user });
}

// ========== BRIEF HANDLERS ==========
async function handleListBriefs(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await connectToDatabase();
  const briefs = await db.collection('decision_briefs').find({ user_id: user.id }).sort({ updated_at: -1 }).project({ prd_sections: 0, stakeholder_critiques: 0, checklist: 0, traceability: 0, entities: 0 }).toArray();
  return NextResponse.json({ briefs });
}

async function handleCreateBrief(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const db = await connectToDatabase();
  const brief = {
    id: uuidv4(),
    user_id: user.id,
    title: body.title || 'Untitled Brief',
    status: 'draft',
    input_type: body.input_type || 'feature_idea',
    main_input: body.main_input || '',
    industry_context: body.industry_context || 'Enterprise SaaS',
    data_sensitivity: body.data_sensitivity || [],
    geography: body.geography || 'US',
    launch_type: body.launch_type || 'GA',
    risk_tolerance: body.risk_tolerance || 'medium',
    entities: null,
    graph: null,
    prd_sections: null,
    stakeholder_critiques: null,
    checklist: null,
    traceability: null,
    revisions: [],
    timeline_events: [{ id: uuidv4(), type: 'created', label: 'Decision brief created', timestamp: new Date().toISOString() }],
    section_statuses: {},
    assumptions: [],
    executive_summary: null,
    stakeholder_risk_levels: {},
    regeneration_diffs: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await db.collection('decision_briefs').insertOne(brief);
  return NextResponse.json({ brief });
}

async function handleGetBrief(request, briefId) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await connectToDatabase();
  const brief = await db.collection('decision_briefs').findOne({ id: briefId, user_id: user.id });
  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ brief });
}

async function handleUpdateBrief(request, briefId) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const db = await connectToDatabase();
  const { _id, id, user_id, created_at, ...updates } = body;
  updates.updated_at = new Date().toISOString();
  await db.collection('decision_briefs').updateOne({ id: briefId, user_id: user.id }, { $set: updates });
  const brief = await db.collection('decision_briefs').findOne({ id: briefId });
  return NextResponse.json({ brief });
}

async function handleDeleteBrief(request, briefId) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await connectToDatabase();
  await db.collection('decision_briefs').deleteOne({ id: briefId, user_id: user.id });
  return NextResponse.json({ success: true });
}

async function handleGenerate(request, briefId) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runFullPipeline(briefId);
    return NextResponse.json({ brief: result });
  } catch (error) {
    const db = await connectToDatabase();
    await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { status: 'error', error_message: error.message, updated_at: new Date().toISOString() } });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleRegenerate(request, briefId) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { type, target } = await request.json();
  const db = await connectToDatabase();
  const brief = await db.collection('decision_briefs').findOne({ id: briefId, user_id: user.id });
  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    if (type === 'section' && target && brief.entities && brief.graph) {
      const sectionPrompt = `Regenerate ONLY the "${target}" section of a PRD for: ${brief.title}\n\nContext: ${brief.entities.feature_summary}\nIndustry: ${brief.industry_context}\n\nReturn JSON: {"${target}": "detailed markdown content for this section"}`;
      const result = await callGemini(sectionPrompt);
      const updateKey = `prd_sections.${target}`;
      await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { [updateKey]: result[target], updated_at: new Date().toISOString() }, $push: { revisions: { id: uuidv4(), timestamp: new Date().toISOString(), type: 'section_regeneration', summary: `Regenerated ${target}` } } });
    } else if (type === 'stakeholder' && target && brief.entities) {
      const shPrompt = `Regenerate critique for the ${target} stakeholder regarding: ${brief.title}\n\nContext: ${brief.entities.feature_summary}\nIndustry: ${brief.industry_context}\n\nReturn JSON: {"concerns": ["..."], "required_controls": ["..."], "required_approvals": ["..."], "questions": ["..."]}`;
      const result = await callGemini(shPrompt);
      const updateKey = `stakeholder_critiques.${target}`;
      await db.collection('decision_briefs').updateOne({ id: briefId }, { $set: { [updateKey]: result, updated_at: new Date().toISOString() }, $push: { revisions: { id: uuidv4(), timestamp: new Date().toISOString(), type: 'stakeholder_regeneration', summary: `Regenerated ${target} critique` } } });
    }
    const updated = await db.collection('decision_briefs').findOne({ id: briefId });
    return NextResponse.json({ brief: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ========== SEED HANDLER ==========
async function handleSeed(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await connectToDatabase();
  const existingBriefs = await db.collection('decision_briefs').countDocuments({ user_id: user.id });
  if (existingBriefs > 0) return NextResponse.json({ message: 'Briefs already exist', count: existingBriefs });

  const seedBriefs = [
    {
      id: uuidv4(), user_id: user.id, title: 'Instant Payouts for SMB Customers', status: 'draft',
      input_type: 'feature_idea', main_input: 'Enable instant payouts for small and medium business customers, allowing them to receive funds within minutes instead of the standard 2-3 business day settlement. This involves integrating with real-time payment rails (RTP/FedNow), implementing fraud detection for instant transactions, and building a tiered eligibility system based on merchant risk profiles.',
      industry_context: 'Fintech', data_sensitivity: ['PII', 'Financial transactions'], geography: 'US', launch_type: 'beta', risk_tolerance: 'low',
      entities: null, graph: null, prd_sections: null, stakeholder_critiques: null, checklist: null, traceability: null,
      revisions: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(), user_id: user.id, title: 'Patient Appointment Reminders via SMS', status: 'draft',
      input_type: 'feature_idea', main_input: 'Implement automated SMS appointment reminders for patients, including confirmation, rescheduling options, and no-show follow-ups. Must comply with HIPAA for PHI handling, support multiple languages, and integrate with existing EHR systems. Include opt-in/opt-out management and audit trails.',
      industry_context: 'Healthcare', data_sensitivity: ['PII', 'Health data'], geography: 'US', launch_type: 'GA', risk_tolerance: 'low',
      entities: null, graph: null, prd_sections: null, stakeholder_critiques: null, checklist: null, traceability: null,
      revisions: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(), user_id: user.id, title: 'Enterprise SSO Rollout', status: 'draft',
      input_type: 'feature_idea', main_input: 'Roll out SAML-based Single Sign-On for enterprise customers, supporting identity providers like Okta, Azure AD, and Google Workspace. Includes just-in-time user provisioning, role mapping from IdP groups, session management policies, and admin dashboard for SSO configuration. Must support multi-tenant isolation.',
      industry_context: 'Enterprise SaaS', data_sensitivity: ['PII'], geography: 'Global', launch_type: 'GA', risk_tolerance: 'medium',
      entities: null, graph: null, prd_sections: null, stakeholder_critiques: null, checklist: null, traceability: null,
      revisions: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }
  ];

  await db.collection('decision_briefs').insertMany(seedBriefs);
  return NextResponse.json({ message: 'Seeded 3 demo briefs', briefs: seedBriefs });
}

// ========== ROUTE MATCHING ==========
async function routeRequest(request, path, method) {
  const p = path || [];
  const pathStr = p.join('/');

  // Auth
  if (pathStr === 'auth/signup' && method === 'POST') return handleSignup(request);
  if (pathStr === 'auth/login' && method === 'POST') return handleLogin(request);
  if (pathStr === 'auth/logout' && method === 'POST') return handleLogout(request);
  if (pathStr === 'auth/me' && method === 'GET') return handleMe(request);

  // Briefs collection
  if (pathStr === 'briefs' && method === 'GET') return handleListBriefs(request);
  if (pathStr === 'briefs' && method === 'POST') return handleCreateBrief(request);

  // Single brief
  if (p.length === 2 && p[0] === 'briefs') {
    if (method === 'GET') return handleGetBrief(request, p[1]);
    if (method === 'PUT') return handleUpdateBrief(request, p[1]);
    if (method === 'DELETE') return handleDeleteBrief(request, p[1]);
  }

  // Brief actions
  if (p.length === 3 && p[0] === 'briefs') {
    if (p[2] === 'generate' && method === 'POST') return handleGenerate(request, p[1]);
    if (p[2] === 'regenerate' && method === 'POST') return handleRegenerate(request, p[1]);
  }

  // Seed
  if (pathStr === 'seed' && method === 'POST') return handleSeed(request);

  // Health check
  if (pathStr === '' && method === 'GET') return NextResponse.json({ status: 'ok', app: 'RegulaPM Nexus' });

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(request, { params }) {
  const { path } = params;
  return routeRequest(request, path, 'GET');
}

export async function POST(request, { params }) {
  const { path } = params;
  return routeRequest(request, path, 'POST');
}

export async function PUT(request, { params }) {
  const { path } = params;
  return routeRequest(request, path, 'PUT');
}

export async function DELETE(request, { params }) {
  const { path } = params;
  return routeRequest(request, path, 'DELETE');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}
