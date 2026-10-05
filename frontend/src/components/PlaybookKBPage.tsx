import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  BookOpen, 
  ShieldAlert, 
  Sparkles, 
  Check, 
  Loader2, 
  Layers, 
  AlertOctagon,
  Copy
} from 'lucide-react';
import { queryKnowledgeBase } from '../api';
import type { KBResultItem } from '../types';

export const PlaybookKBPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KBResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'props' | 'pains' | 'compliance' | 'dnc'>('search');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setQuery(q);

    try {
      const data = await queryKnowledgeBase(q, 6);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve knowledge base context');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const sampleQueries = [
    {
      title: 'CRO Forecasting Value Prop',
      query: 'Value prop for a CRO on forecasting accuracy',
      category: 'Value Props'
    },
    {
      title: 'Blocked Claims & Anti-Hallucination',
      query: 'Blocked claims, guarantees, competitor rules and anti-hallucination guardrails',
      category: 'Compliance'
    },
    {
      title: 'VP Sales Persona Pains & Ramp',
      query: 'VP of Sales persona pains, rep ramp velocity and conversation visibility',
      category: 'Personas'
    },
    {
      title: 'RevOps Automatic CRM Capture',
      query: 'RevOps persona pains and CRM data quality',
      category: 'RevOps'
    }
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* KB Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
            <BookOpen style={{ width: 18, height: 18, color: 'var(--cyan)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
              GONG PLAYBOOK KNOWLEDGE BASE
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Playbook Specifications &amp; Vector RAG
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '680px', marginTop: '4px' }}>
            The deterministic knowledge store used by the Outreach Scribe to anchor every outreach draft in verified Gong messaging, role pains, and anti-hallucination guardrails.
          </p>
        </div>

        {/* View Switcher */}
        <div style={{ 
          display: 'flex', 
          background: 'var(--bg-base)', 
          padding: '3px', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid var(--border-subtle)',
          flexWrap: 'wrap'
        }}>
          <button 
            className={`nav-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search style={{ width: 14, height: 14 }} />
            <span>RAG Search</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'props' ? 'active' : ''}`}
            onClick={() => setActiveTab('props')}
          >
            <Sparkles style={{ width: 14, height: 14 }} />
            <span>Value Props</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'pains' ? 'active' : ''}`}
            onClick={() => setActiveTab('pains')}
          >
            <Layers style={{ width: 14, height: 14 }} />
            <span>Persona Pains</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            <ShieldAlert style={{ width: 14, height: 14 }} />
            <span>Blocked Claims</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'dnc' ? 'active' : ''}`}
            onClick={() => setActiveTab('dnc')}
          >
            <AlertOctagon style={{ width: 14, height: 14 }} />
            <span>DNC &amp; Competitors</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: RAG SEARCH */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Search Box */}
          <div className="surface-card" style={{ padding: '1.5rem' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Semantic query in Gong playbook (e.g. Value prop for CRO on forecasting, blocked claims...)"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading || !query.trim()}>
                {loading ? <Loader2 className="spin" style={{ width: 16, height: 16 }} /> : <Search style={{ width: 16, height: 16 }} />}
                <span>Retrieve Context</span>
              </button>
            </form>

            {/* Quick Queries */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
                Pre-indexed Playbook Prompts:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem' }}>
                {sampleQueries.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSearch(item.query)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.75rem 0.9rem',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-focus)';
                      e.currentTarget.style.background = 'var(--bg-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.background = 'var(--bg-base)';
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>"{item.query.slice(0, 48)}…"</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Display */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <Loader2 className="spin" style={{ width: 28, height: 28, margin: '0 auto 0.75rem', color: 'var(--primary)' }} />
              <div>Querying Vector RAG store with Maximum Marginal Relevance...</div>
            </div>
          )}

          {error && (
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: '0.85rem' }}>
              <strong>Retrieval Notice:</strong> {error}
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && !error && (
            <div className="surface-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No matching chunks found in the playbook for "{query}".</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Retrieved {results.length} semantic chunks
                </span>
                <span className="badge badge-purple">MMR Vector Ranking</span>
              </div>

              {results.map((item, idx) => (
                <div key={idx} className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText style={{ width: 15, height: 15, color: 'var(--text-primary)' }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {item.metadata?.file_name || item.metadata?.source || 'Playbook Document'}
                      </span>
                    </div>
                    {item.score !== undefined && (
                      <span className="badge badge-cyan">
                        Relevance: {(item.score * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '0.84rem', 
                    lineHeight: 1.6, 
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-base)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: item.text?.includes('|') ? 'var(--font-mono)' : 'inherit'
                  }}>
                    {item.text}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => copyText(item.text || '', `res-${idx}`)}
                    >
                      {copiedId === `res-${idx}` ? (
                        <>
                          <Check style={{ width: 13, height: 13, color: 'var(--success)' }} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy style={{ width: 13, height: 13 }} />
                          <span>Copy Chunk</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: VALUE PROPOSITIONS */}
      {activeTab === 'props' && (
        <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Approved Gong Value Propositions</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              The Outreach Scribe is hard-coded to cite exactly one approved value prop per buyer. Extrapolating beyond these mechanisms is strictly prohibited.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>Prop ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Headline</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Mechanism (Approved Claim)</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Target Persona</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' }}>vp-forecast</td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Forecast from buyer conversations</td>
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                    Gong reads actual customer interactions behind each deal, so forecasts reflect what buyers said rather than rep sentiment.
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}><span className="badge badge-purple">CRO</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' }}>vp-visibility</td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Visibility into every conversation</td>
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                    Every call and email is captured and analyzed, so leaders can see what happens in deals instead of relying on rep recall.
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}><span className="badge badge-cyan">VP Sales (Win Rate)</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' }}>vp-ramp</td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Faster rep ramp</td>
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                    New reps learn from the team's real winning customer conversations, shortening time to productivity.
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}><span className="badge badge-cyan">VP Sales (Hiring)</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' }}>vp-coaching</td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Coaching at scale</td>
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                    Managers coach from real calls across the whole team, not only the few they attend.
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}><span className="badge badge-neutral">Sales Enablement</span></td>
                </tr>
                <tr>
                  <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' }}>vp-dataquality</td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Less manual CRM logging</td>
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                    Calls and emails are captured automatically, so activity data depends less on manual logging.
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}><span className="badge badge-success">RevOps</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: PERSONA PAIN MAPS */}
      {activeTab === 'pains' && (
        <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Persona Pain Maps &amp; Title Tiers</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Used to bridge a buyer's cited signal to the specific value proposition. Only one pain is ever introduced per email.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Chief Revenue Officer</span>
                <span className="badge badge-purple">CRO</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Primary Pain: Forecast Accuracy</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Forecasts miss because they rest on rep opinion and stale CRM fields rather than buyer statements. Misses are caught too late in the quarter to correct.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>VP of Sales / Director</span>
                <span className="badge badge-cyan">VP Sales</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Primary Pain: Rep Ramp &amp; Win Rate</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                New reps take too long to reach quota; win rate varies wildly because leadership cannot see which customer conversations actually close deals.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Revenue Operations</span>
                <span className="badge badge-success">RevOps</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Primary Pain: CRM Data Quality</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                CRM data is incomplete because account executives log activity by hand. Pipeline reporting and board forecasts inherit large gaps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: BLOCKED CLAIMS */}
      {activeTab === 'compliance' && (
        <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Deterministic Anti-Hallucination &amp; Blocked Claims</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Enforced by the Python verification tool. Any generated draft that violates these rules is flagged or regenerated.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                <ShieldAlert style={{ width: 16, height: 16 }} />
                <span>The Verbatim Number Rule</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong>Every number in a draft must appear verbatim in the summary of a cited signal.</strong> Any other number is automatically blocked.
              </p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', padding: '0.5rem', borderRadius: '4px' }}>
                <div style={{ color: 'var(--success)' }}>✓ "15 AE roles" (matches Tavily headline) &rarr; PASS</div>
                <div style={{ color: 'var(--danger)', marginTop: '3px' }}>✕ "32% faster ramp" (invented stat) &rarr; BLOCKED</div>
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                <ShieldAlert style={{ width: 16, height: 16 }} />
                <span>Banned Buzzwords &amp; Hype Phrases</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                {['guarantee', 'risk-free', 'proven to', 'best-in-class', 'market leader', 'revolutionary', 'game-changer', 'cutting-edge', 'world-class', 'return on investment', 'boost revenue by'].map((w, i) => (
                  <span key={i} className="badge badge-danger">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: DNC & COMPETITORS */}
      {activeTab === 'dnc' && (
        <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Do Not Contact (DNC) Registry &amp; Competitor Shield</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              All target domains and account names are filtered against the local DNC database before any outreach is drafted.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Direct Competitors (Hard Blocked)
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <li>• ZoomInfo (zoominfo.com)</li>
                <li>• Chorus (chorus.ai)</li>
                <li>• Clari (clari.com)</li>
                <li>• Salesloft (salesloft.com)</li>
                <li>• Outreach (outreach.io)</li>
                <li>• Avoma (avoma.com)</li>
              </ul>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Current Gong Customers (291 Accounts)
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Includes enterprise teams like Snowflake, HubSpot, MongoDB, WalkMe, Zscaler, Datadog, and Gong itself. Any prospect from these companies is automatically disqualified.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
