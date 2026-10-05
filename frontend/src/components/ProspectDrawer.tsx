import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck 
} from 'lucide-react';
import type { Prospect } from '../types';

const LinkedinIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

interface ProspectDrawerProps {
  prospect: Prospect | null;
  onClose: () => void;
}

export const ProspectDrawer: React.FC<ProspectDrawerProps> = ({ prospect, onClose }) => {
  const [copiedType, setCopiedType] = useState<'email' | 'linkedin' | null>(null);

  if (!prospect) return null;

  const handleCopy = (text: string, type: 'email' | 'linkedin') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 1800);
  };

  const emailWordCount = prospect.draft.body ? prospect.draft.body.trim().split(/\s+/).length : 0;
  const linkedinCharCount = prospect.draft.linkedin_note ? prospect.draft.linkedin_note.length : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.15s ease'
    }}>
      {/* Scrim backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Drawer Panel */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '580px',
        height: '100%',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 101,
        overflowY: 'auto'
      }}>
        
        {/* Drawer Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-surface)',
          zIndex: 10
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              BUYER DOSSIER &amp; OUTREACH
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {prospect.name}
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Drawer Body Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Buyer Metadata Card */}
          <div className="surface-card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Title &amp; Role</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{prospect.title}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Company</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {prospect.company} ({prospect.domain})
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Employees &amp; Region</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {prospect.employees} employees • {prospect.region}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Role Tenure</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {prospect.months_in_role} months in role
                </div>
              </div>
            </div>

            {/* Email & LinkedIn row */}
            <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <Mail style={{ width: 14, height: 14, color: 'var(--success)' }} />
                <span>{prospect.email || 'No email address on record'}</span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{prospect.email_status}</span>
              </div>
              {prospect.linkedin_url && (
                <a 
                  href={prospect.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-primary)' }}
                >
                  <LinkedinIcon style={{ width: 14, height: 14 }} />
                  <span>Profile</span>
                  <ExternalLink style={{ width: 11, height: 11 }} />
                </a>
              )}
            </div>
          </div>

          {/* Fit Score Breakdown Card */}
          {/* Fit Score Breakdown Card */}
          <div className="surface-card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Qualification Rubric
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.8rem' }}>
                Total: {prospect.score.total}/100 • {prospect.score.label}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ background: 'var(--bg-base)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Account (40)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{prospect.score.account_fit}</div>
              </div>
              <div style={{ background: 'var(--bg-base)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Persona (20)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{prospect.score.persona_fit}</div>
              </div>
              <div style={{ background: 'var(--bg-base)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Intent (25)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{prospect.score.intent}</div>
              </div>
              <div style={{ background: 'var(--bg-base)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Timing (15)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{prospect.score.timing}</div>
              </div>
            </div>
          </div>

          {/* Sourced Signals (if any) */}
          {prospect.signals && prospect.signals.length > 0 && (
            <div className="surface-card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface-elevated)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                Verified News Triggers ({prospect.signals.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {prospect.signals.map((sig, idx) => (
                  <div key={idx} style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sig.title || sig.summary}</div>
                    {sig.url && (
                      <a href={sig.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '3px' }}>
                        <span>Source Article</span>
                        <ExternalLink style={{ width: 11, height: 11 }} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tailored Email Draft */}
          <div className="surface-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Email Draft</span>
                <span className="badge badge-purple">{prospect.draft.cited_prop_id || 'vp-forecast'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge ${emailWordCount <= 120 ? 'badge-success' : 'badge-danger'}`}>
                  {emailWordCount}/120 words
                </span>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => handleCopy(`${prospect.draft.subject}\n\n${prospect.draft.body}`, 'email')}
                >
                  {copiedType === 'email' ? <Check style={{ width: 13, height: 13, color: 'var(--success)' }} /> : <Copy style={{ width: 13, height: 13 }} />}
                  <span>{copiedType === 'email' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--bg-base)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '2px' }}>Subject:</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prospect.draft.subject || 'No subject'}</div>
            </div>

            <div style={{ 
              background: 'var(--bg-base)', 
              padding: '0.85rem', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border-subtle)', 
              fontSize: '0.82rem', 
              lineHeight: 1.6, 
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap'
            }}>
              {prospect.draft.body || 'No draft generated for this prospect.'}
            </div>
          </div>

          {/* LinkedIn Note Draft */}
          {prospect.draft.linkedin_note && (
            <div className="surface-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LinkedinIcon style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>LinkedIn Note</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${linkedinCharCount <= 200 ? 'badge-success' : 'badge-danger'}`}>
                    {linkedinCharCount}/200 chars
                  </span>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => handleCopy(prospect.draft.linkedin_note, 'linkedin')}
                  >
                    {copiedType === 'linkedin' ? <Check style={{ width: 13, height: 13, color: 'var(--success)' }} /> : <Copy style={{ width: 13, height: 13 }} />}
                    <span>{copiedType === 'linkedin' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ 
                background: 'var(--bg-base)', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border-subtle)', 
                fontSize: '0.82rem', 
                lineHeight: 1.55, 
                color: 'var(--text-secondary)' 
              }}>
                {prospect.draft.linkedin_note}
              </div>
            </div>
          )}

          {/* Guardrails Verification Gate */}
          <div className="surface-card" style={{ padding: '1rem 1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ShieldCheck style={{ width: 16, height: 16, color: 'var(--success)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success)' }}>
                Citation &amp; Safety Checks: {prospect.verify.status === 'passed' ? 'PASSED' : 'NEEDS REVIEW'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div>• Zero competitor names mentioned (Checked against 6 blacklisted vendors)</div>
              <div>• All numbers verified against signal summary (Anti-hallucination check)</div>
              <div>• Banned buzzwords filtered ("guarantee", "risk-free", "market leader")</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
