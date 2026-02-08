'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, FileText, Users, GitBranch, Download, ArrowRight, CheckCircle2, Zap, BarChart3, Lock, ChevronRight, Menu, X } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3B4F6B] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-[#111827]">RegulaPM Nexus</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-[#111827] transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-[#111827] transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-[#111827] transition-colors">Pricing</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => router.push('/login')} className="text-sm font-medium text-gray-600 hover:text-[#111827] transition-colors px-4 py-2">Login</button>
            <button onClick={() => router.push('/signup')} className="pill-button bg-[#3B4F6B] text-white text-sm hover:bg-[#2d3d52] shadow-sm">Get Started</button>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-600">Features</a>
            <a href="#how-it-works" className="block text-sm text-gray-600">How It Works</a>
            <a href="#pricing" className="block text-sm text-gray-600">Pricing</a>
            <button onClick={() => router.push('/login')} className="block text-sm font-medium text-gray-600">Login</button>
            <button onClick={() => router.push('/signup')} className="pill-button bg-[#3B4F6B] text-white text-sm w-full">Get Started</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3B4F6B]/5 text-[#3B4F6B] text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" /> AI-Powered Product Governance
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-[#111827] leading-tight tracking-tight mb-6">
            AI Governed<br />Product Decisions
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate auditable PRDs, stakeholder critiques, and compliance checklists from a single product change. Built for teams that ship fast and stay compliant.
          </p>
          <div className="flex items-center justify-center gap-4 mb-16">
            <button onClick={() => router.push('/signup')} className="pill-button bg-[#3B4F6B] text-white hover:bg-[#2d3d52] shadow-lg shadow-[#3B4F6B]/20 flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="pill-button border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50">
              Learn More
            </button>
          </div>

          {/* Mock Product Card */}
          <div className="max-w-3xl mx-auto">
            <div className="rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_8px_40px_rgba(17,24,39,0.08)] overflow-hidden">
              <div className="bg-[#E5E7EB]/30 px-6 py-3 border-b border-[#E5E7EB] flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]"></div>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-5 w-64 rounded-full bg-[#E5E7EB]/60 flex items-center justify-center">
                    <span className="text-[10px] text-[#111827]/30 font-mono-ui">regulapm-nexus.app/dashboard/new</span>
                  </div>
                </div>
              </div>
              <div className="flex">
                {/* Mini sidebar */}
                <div className="w-48 border-r border-[#E5E7EB] bg-[#E5E7EB]/10 p-3 hidden md:block">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-5 h-5 rounded bg-[#3B4F6B] flex items-center justify-center">
                      <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-[#111827]">RegulaPM</span>
                  </div>
                  <div className="h-7 rounded-lg bg-[#3B4F6B] mb-3 flex items-center justify-center">
                    <span className="text-[9px] text-white font-medium">+ New Brief</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-6 rounded-lg bg-[#3B4F6B]/5 px-2 flex items-center">
                      <span className="text-[9px] text-[#3B4F6B] font-medium">Instant Payouts...</span>
                    </div>
                    <div className="h-6 rounded-lg px-2 flex items-center">
                      <span className="text-[9px] text-[#111827]/40">Patient Reminders...</span>
                    </div>
                    <div className="h-6 rounded-lg px-2 flex items-center">
                      <span className="text-[9px] text-[#111827]/40">Enterprise SSO...</span>
                    </div>
                  </div>
                </div>
                {/* Form area */}
                <div className="flex-1 p-8 text-left">
                  <h3 className="text-base font-semibold text-[#111827] mb-5">New Decision Brief</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-medium text-[#111827]/40 uppercase tracking-wider">Title</label>
                      <div className="mt-1.5 h-9 rounded-full bg-[#E5E7EB]/30 border border-[#E5E7EB] px-4 flex items-center text-xs text-[#111827]/40">Instant Payouts for SMB Customers</div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-[#111827]/40 uppercase tracking-wider">Description</label>
                      <div className="mt-1.5 h-16 rounded-2xl bg-[#E5E7EB]/30 border border-[#E5E7EB] px-4 pt-2.5 text-xs text-[#111827]/40 leading-relaxed">Enable instant payouts for small and medium business customers...</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-[#111827]/40 uppercase tracking-wider">Industry</label>
                        <div className="mt-1.5 h-9 rounded-full bg-[#E5E7EB]/30 border border-[#E5E7EB] px-4 flex items-center text-xs text-[#111827]/40">Fintech</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-[#111827]/40 uppercase tracking-wider">Geography</label>
                        <div className="mt-1.5 h-9 rounded-full bg-[#E5E7EB]/30 border border-[#E5E7EB] px-4 flex items-center text-xs text-[#111827]/40">US</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-[#111827]/40 uppercase tracking-wider">Risk</label>
                        <div className="mt-1.5 h-9 rounded-full bg-[#E5E7EB]/30 border border-[#E5E7EB] px-4 flex items-center text-xs text-[#111827]/40">Low</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <div className="pill-button bg-[#3B4F6B] text-white text-xs flex items-center gap-1.5 cursor-default py-2 px-5">
                        Generate Decision Brief
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-[#E5E7EB]/20">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#3B4F6B] uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-3xl font-bold text-[#111827] mb-4">Everything you need for governed decisions</h2>
            <p className="text-[#111827]/50 max-w-xl mx-auto">From initial input to exportable compliance packets, RegulaPM Nexus handles the full lifecycle.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: FileText, title: 'Decision Briefs', desc: 'Structured PRD generation with AI-powered sections, compliance requirements, and risk analysis.' },
              { icon: Users, title: 'Stakeholder Critiques', desc: 'Auto-generated critique packs for Security, Legal, Compliance, Finance, Engineering, and Support.' },
              { icon: CheckCircle2, title: 'Compliance Checklists', desc: 'Industry-specific checklists covering approvals, security controls, testing, and release steps.' },
              { icon: GitBranch, title: 'Dependency Graph', desc: 'Visual dependency graph showing risks, compliance signals, stakeholders, and metrics relationships.' },
              { icon: Download, title: 'Export Packets', desc: 'Export complete decision briefs as Markdown, JSON, or formatted PDF with appendices.' },
              { icon: BarChart3, title: 'Traceability', desc: 'Full traceability from requirements to graph nodes with rationale and audit trails.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-[18px] p-7 border border-[#E5E7EB] hover:shadow-[0_4px_20px_rgba(17,24,39,0.04)] transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-[#3B4F6B]/[0.06] flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-[#3B4F6B]" />
                </div>
                <h3 className="font-semibold text-[#111827] mb-2">{f.title}</h3>
                <p className="text-sm text-[#111827]/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#3B4F6B] uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl font-bold text-[#111827] mb-4">How it works</h2>
            <p className="text-[#111827]/50 max-w-xl mx-auto">Four steps from product idea to auditable decision packet.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-0 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-[#E5E7EB]"></div>
            {[
              { step: '01', title: 'Input', desc: 'Describe your product decision with industry context and risk parameters.', icon: FileText },
              { step: '02', title: 'Analyze', desc: 'AI extracts entities, builds dependency graphs, and identifies risks.', icon: GitBranch },
              { step: '03', title: 'Generate', desc: 'Get structured PRD sections, stakeholder critiques, and checklists.', icon: Zap },
              { step: '04', title: 'Export', desc: 'Download complete decision packets as Markdown, PDF, or JSON.', icon: Download },
            ].map((s, i) => (
              <div key={i} className="text-center px-4 relative">
                <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto mb-4 relative z-10">
                  <s.icon className="w-5 h-5 text-[#3B4F6B]" />
                </div>
                <div className="font-mono-ui text-[10px] font-semibold text-[#3B4F6B] mb-2 tracking-wider">{s.step}</div>
                <h3 className="font-semibold text-[#111827] mb-2">{s.title}</h3>
                <p className="text-sm text-[#111827]/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-gray-50/50">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#111827] mb-4">Simple pricing</h2>
            <p className="text-gray-500">Start free, scale when you need to.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="font-semibold text-[#111827] mb-1">Free</h3>
              <p className="text-sm text-gray-500 mb-4">Perfect for trying it out</p>
              <div className="text-4xl font-bold text-[#111827] mb-6">$0<span className="text-sm font-normal text-gray-400">/mo</span></div>
              <ul className="space-y-3 mb-8">
                {['5 decision briefs', 'AI generation', 'Markdown export', 'Dependency graph'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#111827]/70"><CheckCircle2 className="w-4 h-4 text-[#3B4F6B]" />{f}</li>
                ))}
              </ul>
              <button onClick={() => router.push('/signup')} className="pill-button w-full border border-[#E5E7EB] text-[#111827] hover:bg-[#E5E7EB]/30">Get Started</button>
            </div>
            <div className="bg-white rounded-2xl p-8 border-2 border-[#3B4F6B] relative">
              <div className="absolute -top-3 right-6 bg-[#3B4F6B] text-white text-xs px-3 py-1 rounded-full font-medium">Popular</div>
              <h3 className="font-semibold text-[#111827] mb-1">Team</h3>
              <p className="text-sm text-[#111827]/50 mb-4">For growing teams</p>
              <div className="text-4xl font-bold text-[#111827] mb-6">$29<span className="text-sm font-normal text-[#111827]/40">/mo</span></div>
              <ul className="space-y-3 mb-8">
                {['Unlimited briefs', 'Team collaboration', 'PDF export', 'Priority AI', 'Custom templates'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#111827]/70"><CheckCircle2 className="w-4 h-4 text-[#3B4F6B]" />{f}</li>
                ))}
              </ul>
              <button onClick={() => router.push('/signup')} className="pill-button w-full bg-[#3B4F6B] text-white hover:bg-[#2d3d52]">Start Free Trial</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#3B4F6B] flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm text-[#111827]">RegulaPM Nexus</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600">Privacy</a>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600">Terms</a>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600">Contact</a>
          </div>
          <p className="text-xs text-gray-400">2025 RegulaPM Nexus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
