import { useState, useEffect } from 'react';
import { 
  Compass, 
  LayoutDashboard, 
  BookOpen, 
  Terminal,
  Sun,
  Moon 
} from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { DashboardPage } from './components/DashboardPage';
import { PlaybookKBPage } from './components/PlaybookKBPage';
import { SwarmChatPage } from './components/SwarmChatPage';
import type { BriefConfig, PipelineResult } from './types';
import { runProspectingJob } from './api';

export type NavTab = 'landing' | 'dashboard' | 'kb' | 'chat';
export type ThemeMode = 'dark' | 'cream';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash === 'dashboard' || hash === 'kb' || hash === 'chat') {
      return hash;
    }
    return 'landing';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('gong_theme');
    return (saved === 'cream' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gong_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'cream' : 'dark'));
  };

  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash === 'dashboard' || hash === 'kb' || hash === 'chat' || hash === 'landing') {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tab: NavTab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRunProspecting = async (brief: BriefConfig) => {
    setLoading(true);
    setError(null);
    try {
      const data = await runProspectingJob(brief);
      setPipelineResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to complete prospecting job.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRunToDashboard = (result: PipelineResult) => {
    setPipelineResult(result);
    navigateTo('dashboard');
  };

  return (
    <div className="app-container">
      
      {/* Top Application Bar */}
      <header className="app-navbar">
        <div className="brand-section">
          <div className="brand-logo-mark">
            ◆
          </div>
          <div className="brand-text-block">
            <div className="brand-title">
              <span>Gong Prospect</span>
              <span className="brand-badge">Agentic Engine</span>
            </div>
            <div className="brand-subtitle">Autonomous Outbound Intelligence</div>
          </div>
        </div>

        {/* Navigation & Theme Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <nav className="nav-links" aria-label="Main Navigation">
            <button 
              className={`nav-tab-btn ${activeTab === 'landing' ? 'active' : ''}`}
              onClick={() => navigateTo('landing')}
            >
              <Compass style={{ width: 14, height: 14 }} />
              <span>Overview</span>
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigateTo('dashboard')}
            >
              <LayoutDashboard style={{ width: 14, height: 14 }} />
              <span>Dashboard</span>
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'kb' ? 'active' : ''}`}
              onClick={() => navigateTo('kb')}
            >
              <BookOpen style={{ width: 14, height: 14 }} />
              <span>Playbook KB</span>
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => navigateTo('chat')}
            >
              <Terminal style={{ width: 14, height: 14 }} />
              <span>Lyzr Swarm Chat</span>
            </button>
          </nav>

          <button 
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light-Cream Theme' : 'Switch to Dark Studio Theme'}
          >
            {theme === 'dark' ? <Sun style={{ width: 15, height: 15 }} /> : <Moon style={{ width: 15, height: 15 }} />}
          </button>
        </div>
      </header>

      {/* Main View Router */}
      <main className="app-main">
        {activeTab === 'landing' && (
          <LandingPage onNavigate={navigateTo} />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage 
            result={pipelineResult}
            onRun={handleRunProspecting}
            loading={loading}
            error={error}
          />
        )}

        {activeTab === 'kb' && (
          <PlaybookKBPage />
        )}

        {activeTab === 'chat' && (
          <SwarmChatPage 
            onLoadRunToDashboard={handleLoadRunToDashboard}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span>Gong Prospect</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigateTo('kb')}
            style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Playbook Specs
          </button>
          <span>•</span>
          <button 
            onClick={() => navigateTo('dashboard')}
            style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Prospecting
          </button>
          <span>•</span>
          <button 
            onClick={() => navigateTo('chat')}
            style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Lyzr Swarm Chat
          </button>
        </div>
      </footer>

    </div>
  );
}

export default App;
