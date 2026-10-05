import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Cpu, 
  ArrowRight, 
  Loader2, 
  CheckCircle2 
} from 'lucide-react';
import { sendChatMessage } from '../api';
import type { ChatMessage, PipelineResult } from '../types';

interface SwarmChatPageProps {
  onLoadRunToDashboard: (result: PipelineResult) => void;
}

export const SwarmChatPage: React.FC<SwarmChatPageProps> = ({ onLoadRunToDashboard }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: "Tell me who to prospect—I'll return a ranked shortlist with verified signals and tailored outreach (max 8).",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendChatMessage(text);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: data.result
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Swarm execution notice: ${err.message || 'Error executing agent swarm run.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'find 5 CROs at US software companies',
    'research 3 VP Sales prospects',
    'draft outreach for 2 revops leaders in EU',
    'what are the compliance rules for mentioning percentages?'
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 170px)' }}>
      
      {/* Swarm Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
            <Cpu style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
              SWARM INTELLIGENCE
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Lyzr Swarm Chat
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Direct natural language pipeline execution and prospect research.
          </p>
        </div>

        {/* Active Swarm Nodes Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          background: 'var(--bg-surface)',
          padding: '0.45rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="status-dot"></span>
            <span style={{ color: 'var(--text-primary)' }}>Orchestrator Manager</span>
          </div>
          <span style={{ color: 'var(--border-medium)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="status-dot" style={{ background: 'var(--accent-green)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Research Scribe</span>
          </div>
          <span style={{ color: 'var(--border-medium)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="status-dot" style={{ background: 'var(--text-muted)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Outreach Scribe</span>
          </div>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="surface-card" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '1.25rem', 
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)'
      }}>
        
        {/* Messages Scroll Area */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem', 
          paddingRight: '0.5rem' 
        }}>
          {messages.map((m) => {
            const isBot = m.sender === 'assistant';
            return (
              <div 
                key={m.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: isBot ? 'row' : 'row-reverse', 
                  gap: '0.85rem',
                  alignItems: 'flex-start'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: isBot ? 'var(--bg-surface-elevated)' : 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  flexShrink: 0
                }}>
                  {isBot ? <Bot style={{ width: 16, height: 16 }} /> : <User style={{ width: 16, height: 16 }} />}
                </div>

                {/* Message Bubble */}
                <div style={{ 
                  maxWidth: '75%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.4rem',
                  alignItems: isBot ? 'flex-start' : 'flex-end'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{isBot ? 'Lyzr Swarm' : 'You'}</span>
                    <span>•</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{m.timestamp}</span>
                  </div>

                  <div style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: 'var(--radius-md)',
                    background: isBot ? 'var(--bg-base)' : 'var(--primary)',
                    border: isBot ? '1px solid var(--border-subtle)' : '1px solid var(--primary)',
                    color: isBot ? 'var(--text-primary)' : 'var(--primary-text)',
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {m.text}

                    {/* If result attached, show rich pipeline run summary */}
                    {m.result && (
                      <div style={{ 
                        marginTop: '0.85rem', 
                        paddingTop: '0.85rem', 
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                          <CheckCircle2 style={{ width: 14, height: 14 }} />
                          <span>Pipeline Executed Successfully</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                          <div style={{ background: 'var(--bg-surface)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Qualified</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{m.result.returned_count}</div>
                          </div>
                          <div style={{ background: 'var(--bg-surface)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Set Aside</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{m.result.metrics.set_aside}</div>
                          </div>
                          <div style={{ background: 'var(--bg-surface)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Apollo Cost</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>0 credits</div>
                          </div>
                        </div>

                        <button 
                          className="btn-primary" 
                          style={{ padding: '0.5rem 0.85rem', fontSize: '0.78rem', width: '100%' }}
                          onClick={() => onLoadRunToDashboard(m.result!)}
                        >
                          <span>Load Candidates in Dashboard</span>
                          <ArrowRight style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)'
              }}>
                <Loader2 className="spin" style={{ width: 18, height: 18 }} />
              </div>
              <div style={{
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>Swarm orchestrator dispatching agents and verifying ICP...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Bar */}
        <div style={{ 
          padding: '0.75rem 0 0.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          overflowX: 'auto',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '0.75rem'
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
            Directives:
          </span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(s)}
              disabled={loading}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '999px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-focus)';
                e.currentTarget.style.background = 'var(--bg-surface-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.background = 'var(--bg-base)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Composer */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}
        >
          <input 
            type="text"
            className="form-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message the agent swarm (e.g. 'find 5 CROs at US software companies')..."
            disabled={loading}
          />
          <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="spin" style={{ width: 16, height: 16 }} /> : <Send style={{ width: 16, height: 16 }} />}
            <span>Execute</span>
          </button>
        </form>

      </div>

    </div>
  );
};
