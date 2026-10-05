import React from 'react';
import { 
  ShieldCheck, 
  Search, 
  FileText, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Layers, 
  Cpu
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (tab: 'dashboard' | 'chat' | 'kb') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* Hero Section */}
      <section style={{ 
        textAlign: 'center', 
        padding: '3rem 1rem 1.5rem', 
        maxWidth: '880px', 
        margin: '0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '4px 12px',
          borderRadius: '999px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          color: 'var(--text-secondary)',
          fontSize: '0.78rem',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)'
        }}>
          <Cpu style={{ width: 14, height: 14 }} />
          GONG REVENUE INTELLIGENCE · AUTONOMOUS PROSPECTING SWARM
        </div>

        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          lineHeight: 1.18, 
          letterSpacing: '-0.025em', 
          color: 'var(--text-primary)' 
        }}>
          Deterministic qualification and grounded outreach for Gong's sales pipeline.
        </h1>

        <p style={{ 
          fontSize: '1.08rem', 
          lineHeight: 1.6, 
          color: 'var(--text-secondary)', 
          maxWidth: '720px' 
        }}>
          Replaces manual Apollo list scouring and generic AI hallucinated emails with an autonomous 3-agent pipeline, deterministic safety gates, fresh Tavily news triggers, and strict Gong playbook compliance.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            className="btn-primary" 
            onClick={() => onNavigate('dashboard')}
            style={{ padding: '0.75rem 1.6rem', fontSize: '0.92rem' }}
          >
            <span>Launch Prospecting Cockpit</span>
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
          
          <button 
            className="btn-secondary" 
            onClick={() => onNavigate('chat')}
            style={{ padding: '0.75rem 1.4rem', fontSize: '0.92rem' }}
          >
            <Terminal style={{ width: 16, height: 16 }} />
            <span>Lyzr Swarm Chat</span>
          </button>

          <button 
            className="btn-secondary" 
            onClick={() => onNavigate('kb')}
            style={{ padding: '0.75rem 1.4rem', fontSize: '0.92rem' }}
          >
            <FileText style={{ width: 16, height: 16 }} />
            <span>Explore Playbook KB</span>
          </button>
        </div>
      </section>

      {/* The 4-Stage Autonomous Architecture */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
              SYSTEM ARCHITECTURE
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
              How the multi-agent pipeline operates
            </h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Code filters run deterministically between agent steps
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.25rem' }}>
          {/* Card 1 */}
          <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                <Search style={{ width: 16, height: 16 }} />
              </div>
              <span className="badge badge-neutral">Stage 01</span>
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Target Discovery &amp; ICP Ingestion</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Sources target buyers across defined regions (US, EU, UK) and roles (CRO, VP Sales, RevOps). In seed mode, consumes validated records with verified emails and zero Apollo credit burn.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <CheckCircle2 style={{ width: 13, height: 13, color: 'var(--success)' }} />
              <span>Verified title tenure &amp; employee headcount</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                <ShieldCheck style={{ width: 16, height: 16 }} />
              </div>
              <span className="badge badge-danger">Deterministic Gate</span>
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>DNC &amp; Competitor Interceptor</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Executes python regex domain matches against 291 active Gong enterprise customers and 6 direct competitors (ZoomInfo, Chorus, Clari, Salesloft, Outreach, Avoma). Also enforces 1 buyer per account.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <CheckCircle2 style={{ width: 13, height: 13, color: 'var(--success)' }} />
              <span>Zero risk of pitching existing clients</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                <Sliders style={{ width: 16, height: 16 }} />
              </div>
              <span className="badge badge-neutral">Stage 03</span>
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Signal Search &amp; Multi-Factor Scoring</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tavily scans verified news within 180 days (funding, hiring expansions, new executives). Prospects are deterministically ranked on a 100-pt rubric (Account fit 40, Persona 20, Intent 25, Timing 15).
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <CheckCircle2 style={{ width: 13, height: 13, color: 'var(--success)' }} />
              <span>Deterministic qualification gate (65+ score)</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                <FileText style={{ width: 16, height: 16 }} />
              </div>
              <span className="badge badge-success">Stage 04</span>
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Playbook Scribe &amp; Verification Gate</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Generates customized emails and LinkedIn notes mapped to Gong's approved value props. Post-generation code checks verify citations, drop ungrounded statistics, and ensure word count compliance.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <CheckCircle2 style={{ width: 13, height: 13, color: 'var(--success)' }} />
              <span>Automated citation checker flags hallucinations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison / Unhyped Truth Section */}
      <section className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            STRICT GUARDRAILS VS STANDARD OUTBOUND
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
            Why deterministic controls matter in B2B outbound
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.75rem' }}>
              <AlertTriangle style={{ width: 16, height: 16 }} />
              <span>Standard "AI Sales" Bots</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--danger)' }}>✕</span>
                <span>Fabricates ROI statistics (e.g. "increases win rates by 43.7%") without grounding.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--danger)' }}>✕</span>
                <span>Frequently spams existing paid Gong customers or direct competitors.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--danger)' }}>✕</span>
                <span>Writes long, generic multi-paragraph essays that trigger spam filters.</span>
              </li>
            </ul>
          </div>

          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.75rem' }}>
              <CheckCircle2 style={{ width: 16, height: 16 }} />
              <span>Gong Prospect Deterministic Engine</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>Hard rule: every number in a draft must appear verbatim in a cited news signal.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>Immediate pre-filter drops all 291 Gong accounts and 6 competitors prior to drafting.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>Strict 120-word email cap, 200-char LinkedIn note, and approved Gong value propositions.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer navigation banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-medium)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layers style={{ width: 20, height: 20, color: 'var(--text-primary)' }} />
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>Ready to prospect high-fit revenue leaders?</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Launch the dashboard with curated presets or chat with the autonomous swarm.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => onNavigate('kb')}>
            Playbook Specs
          </button>
          <button className="btn-primary" onClick={() => onNavigate('dashboard')}>
            <span>Open Dashboard</span>
            <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

    </div>
  );
};
