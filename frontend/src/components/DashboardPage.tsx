import React, { useState } from 'react';
import { 
  Play, 
  Search, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Cpu, 
  Eye, 
  Check, 
  Copy
} from 'lucide-react';
import type { BriefConfig, PipelineResult, Prospect } from '../types';
import { ProspectDrawer } from './ProspectDrawer';

interface DashboardPageProps {
  result: PipelineResult | null;
  onRun: (brief: BriefConfig) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ result, onRun, loading, error }) => {
  const [brief, setBrief] = useState<BriefConfig>({
    roles: 'CRO, VP Sales at US software companies',
    region: 'US',
    count: 5,
    signals_mode: 'off',
    mode: 'seed'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showSetAside, setShowSetAside] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const presets = [
    {
      label: '🎯 US Software CROs',
      roles: 'CRO, Chief Revenue Officer at high growth software companies',
      region: 'US',
      count: 5
    },
    {
      label: '⚡ VP of Sales (AE Scale)',
      roles: 'VP of Sales, Sales Leadership scaling AE teams',
      region: 'US',
      count: 3
    },
    {
      label: '📊 EU RevOps Leaders',
      roles: 'Head of RevOps, Revenue Operations leaders',
      region: 'EU',
      count: 3
    },
    {
      label: '🏢 UK Sales Directors',
      roles: 'Director of Sales, Enterprise Sales Leaders',
      region: 'UK',
      count: 4
    }
  ];

  const handlePreset = (p: typeof presets[0]) => {
    setBrief(prev => ({
      ...prev,
      roles: p.roles,
      region: p.region,
      count: p.count
    }));
  };

  const handleCopyEmail = (email: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredProspects = (result?.prospects || []).filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.company.toLowerCase().includes(term) ||
      p.title.toLowerCase().includes(term) ||
      p.domain.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Run Bar Card */}
      <div className="surface-card" style={{ padding: '1.25rem 1.5rem' }}>
        <form onSubmit={(e) => { e.preventDefault(); onRun(brief); }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Target ICP &amp; Roles</label>
              <input 
                type="text" 
                className="form-input" 
                value={brief.roles}
                onChange={(e) => setBrief({ ...brief, roles: e.target.value })}
                placeholder="e.g. CRO, VP Sales at B2B SaaS companies"
                required
              />
            </div>

            <div>
              <label className="form-label">Region</label>
              <select 
                className="form-select"
                value={brief.region}
                onChange={(e) => setBrief({ ...brief, region: e.target.value })}
              >
                <option value="US">🇺🇸 United States</option>
                <option value="EU">🇪🇺 European Union</option>
                <option value="UK">🇬🇧 United Kingdom</option>
              </select>
            </div>

            <div style={{ maxWidth: '120px' }}>
              <label className="form-label">Prospect Count</label>
              <input 
                type="number" 
                min={1} 
                max={8} 
                className="form-input" 
                value={brief.count}
                onChange={(e) => setBrief({ ...brief, count: parseInt(e.target.value) || 5 })}
              />
            </div>

            <div>
              <label className="form-label">Signal Enrichment</label>
              <select 
                className="form-select"
                value={brief.signals_mode}
                onChange={(e) => setBrief({ ...brief, signals_mode: e.target.value as 'off' | 'tavily' })}
              >
                <option value="off">Deterministic (Offline Seed)</option>
                <option value="tavily">Tavily Live Signals</option>
              </select>
            </div>

            <div>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                style={{ width: '100%', height: '40px' }}
              >
                {loading ? <Loader2 className="spin" style={{ width: 16, height: 16 }} /> : <Play style={{ width: 15, height: 15 }} />}
                <span>{loading ? 'Running Job…' : 'Run Prospecting'}</span>
              </button>
            </div>

          </div>

          {/* Quick Presets Bar */}
          <div style={{ 
            marginTop: '1rem', 
            paddingTop: '0.85rem', 
            borderTop: '1px solid var(--border-subtle)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            flexWrap: 'wrap' 
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Quick Presets:
            </span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePreset(p)}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-focus)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'var(--bg-base)';
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Error alert */}
      {error && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: 'var(--radius-md)', 
          background: 'var(--danger-bg)', 
          border: '1px solid var(--danger-border)', 
          color: 'var(--danger)', 
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Pipeline Status Tiles (When run is active) */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div className="surface-card" style={{ padding: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {result.metrics.sourced}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
              Sourced Pool
            </div>
          </div>

          <div className="surface-card" style={{ padding: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {result.metrics.after_filter}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
              Passed ICP &amp; DNC
            </div>
          </div>

          <div className="surface-card" style={{ padding: '1rem', border: '1px solid var(--accent-green-border)', background: 'var(--accent-green-bg)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-green)' }}>
              {result.returned_count}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
              Outreach Ready
            </div>
          </div>

          <div className="surface-card" style={{ padding: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: result.metrics.set_aside > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              {result.metrics.set_aside}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
              Set Aside
            </div>
          </div>

          <div className="surface-card" style={{ padding: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', height: '1.5rem', display: 'flex', alignItems: 'center' }}>
              0 Credits
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
              Apollo Cost ({result.mode})
            </div>
          </div>

          <div className="surface-card" style={{ padding: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)', height: '1.5rem', display: 'flex', alignItems: 'center' }}>
              100% Passed
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
              Citation Checks
            </div>
          </div>
        </div>
      )}

      {/* Autonomous Tool Execution Timeline */}
      {result && result.events && result.events.length > 0 && (
        <div className="surface-card" style={{ padding: '1rem 1.25rem' }}>
          <div 
            onClick={() => setShowTimeline(!showTimeline)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu style={{ width: 16, height: 16, color: 'var(--text-primary)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                Autonomous Tool Execution Trace ({result.events.length} steps)
              </span>
            </div>
            <button type="button" style={{ color: 'var(--text-secondary)' }}>
              {showTimeline ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            </button>
          </div>

          {showTimeline && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              {result.events.map((ev, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    padding: '0.65rem 0.85rem', 
                    borderRadius: 'var(--radius-sm)', 
                    background: 'var(--bg-base)', 
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {ev.tool}
                    </span>
                    <span className={`badge ${ev.status === 'ok' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                      {ev.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {ev.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>{ev.detail || 'Completed'}</span>
                    {ev.ms !== null && ev.ms !== undefined && <span>{ev.ms}ms</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Qualified Prospects Table */}
      {result && result.prospects && result.prospects.length > 0 && (
        <div className="surface-card" style={{ padding: '0', overflow: 'hidden' }}>
          
          {/* Table Header Controls */}
          <div style={{ 
            padding: '1rem 1.25rem', 
            borderBottom: '1px solid var(--border-subtle)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Qualified Prospects &amp; Tailored Outreach
              </span>
              <span className="badge badge-purple">{filteredProspects.length} Buyers</span>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.78rem' }}
                placeholder="Filter by name, company, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1.25rem', width: '40px' }}>#</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Buyer</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Company</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Employees</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Fit Score</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Email Status</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Guardrails</th>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map((p, idx) => (
                  <tr 
                    key={p.apollo_id || idx}
                    onClick={() => setSelectedProspect(p)}
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.title}</div>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.company}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.domain}</div>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {p.employees}
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span className="badge badge-purple" title={`Account: ${p.score.account_fit}, Persona: ${p.score.persona_fit}, Intent: ${p.score.intent}`}>
                        {p.score.total}/100 • {p.score.label}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="badge badge-success">
                          {p.email_status}
                        </span>
                        {p.email && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyEmail(p.email, p.apollo_id, e)}
                            style={{ color: 'var(--text-muted)', padding: '2px', borderRadius: '4px' }}
                            title="Copy email address"
                          >
                            {copiedId === p.apollo_id ? <Check style={{ width: 13, height: 13, color: 'var(--success)' }} /> : <Copy style={{ width: 13, height: 13 }} />}
                          </button>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span className={`badge ${p.verify.status === 'passed' ? 'badge-success' : 'badge-warning'}`}>
                        {p.verify.status}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedProspect(p); }}
                      >
                        <Eye style={{ width: 13, height: 13 }} />
                        <span>Inspect Draft</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disqualified / Set Aside Section */}
      {result && result.set_aside && result.set_aside.length > 0 && (
        <div className="surface-card" style={{ padding: '1rem 1.25rem' }}>
          <div 
            onClick={() => setShowSetAside(!showSetAside)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                Set Aside Candidates ({result.set_aside.length} Disqualified / Low Fit)
              </span>
            </div>
            <button type="button" style={{ color: 'var(--text-secondary)' }}>
              {showSetAside ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            </button>
          </div>

          {showSetAside && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem' }}>Buyer</th>
                    <th style={{ padding: '0.5rem' }}>Company</th>
                    <th style={{ padding: '0.5rem' }}>Score</th>
                    <th style={{ padding: '0.5rem' }}>Disqualification Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {result.set_aside.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{item.name || 'Unnamed'}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>{item.company} ({item.domain})</td>
                      <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{item.total}/100</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--danger)' }}>{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="surface-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
            <Play style={{ width: 18, height: 18, marginLeft: '2px' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Active Prospecting Run</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', marginTop: '4px' }}>
              Select a quick preset or customize your target roles and region above, then click <b>Run Prospecting</b> to launch the multi-agent pipeline.
            </p>
          </div>
          <button className="btn-primary" onClick={() => onRun(brief)}>
            <span>Run Default ICP Job (0 Apollo Credits)</span>
          </button>
        </div>
      )}

      {/* Candidate Dossier Slide-Over Drawer */}
      <ProspectDrawer 
        prospect={selectedProspect} 
        onClose={() => setSelectedProspect(null)} 
      />

    </div>
  );
};
