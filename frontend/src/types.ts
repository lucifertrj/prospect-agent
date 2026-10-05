export interface ProspectScore {
  account_fit: number;
  persona_fit: number;
  intent: number;
  timing: number;
  total: number;
  label: string;
  confidence: string;
}

export interface Signal {
  signal_id?: string;
  type?: string;
  title?: string;
  date?: string;
  url?: string;
  summary?: string;
  relevance?: string;
}

export interface ProspectDraft {
  subject: string;
  body: string;
  status: string;
  linkedin_note: string;
  cited_signal_ids: string[];
  cited_prop_id?: string;
}

export interface ProspectVerify {
  status: string;
  review_reasons: string[];
}

export interface Prospect {
  apollo_id: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  industry: string;
  employees: number;
  region: string;
  email: string;
  email_status: string;
  months_in_role: number;
  linkedin_url?: string | null;
  score: ProspectScore;
  signals: Signal[];
  draft: ProspectDraft;
  verify: ProspectVerify;
}

export interface SetAside {
  name?: string;
  title?: string;
  company?: string;
  domain?: string;
  total: number;
  reason: string;
}

export interface PipelineEvent {
  tool: string;
  title: string;
  status: string;
  detail: string;
  count?: number | null;
  ms?: number | null;
}

export interface PipelineMetrics {
  sourced: number;
  after_filter: number;
  contacted: number;
  set_aside: number;
  flagged: number;
  apollo_credits: number | null;
}

export interface PipelineResult {
  mode: string;
  requested_count: number;
  returned_count: number;
  prospects: Prospect[];
  set_aside: SetAside[];
  events: PipelineEvent[];
  metrics: PipelineMetrics;
}

export interface KBResultItem {
  id?: string;
  score?: number;
  text?: string;
  metadata?: {
    source?: string;
    file_name?: string;
    file_path?: string;
    creation_date?: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  result?: PipelineResult | null;
}

export interface BriefConfig {
  roles: string;
  region: string;
  count: number;
  signals_mode: 'off' | 'tavily';
  mode: 'seed' | 'live';
}
