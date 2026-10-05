import type { BriefConfig, KBResultItem, PipelineResult } from './types';

export interface ServerConfig {
  agents: {
    manager: string;
    research: string;
    outreach: string;
  };
  kb: string;
  live: boolean;
  key: string;
  user_id: string;
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) {
    throw new Error(`Failed to load server config: ${res.statusText}`);
  }
  return res.json();
}

export async function runProspectingJob(brief: BriefConfig): Promise<PipelineResult> {
  const payload = {
    brief: {
      roles: brief.roles,
      region: brief.region,
      count: brief.count,
    },
    mode: brief.mode,
    signals_mode: brief.signals_mode,
  };

  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Run failed: ${res.statusText}`);
  }
  return data;
}

export async function queryKnowledgeBase(query: string, top_k: number = 8): Promise<KBResultItem[]> {
  const res = await fetch('/api/kb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `KB retrieval failed: ${res.statusText}`);
  }
  return data.results || [];
}

export async function sendChatMessage(message: string): Promise<{ reply: string; result?: PipelineResult | null }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Chat failed: ${res.statusText}`);
  }
  return data;
}
