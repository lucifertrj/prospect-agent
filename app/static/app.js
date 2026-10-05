// Gong Prospector — Modern SaaS Frontend
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
let LAST = null; // Last run results cache

const TOOL_ICONS = {
  seed: "📁",
  apollo: "🛰️",
  filter: "🔍",
  tavily: "🌐",
  score: "📊",
  gate: "⚖️",
  outreach: "✍️",
  verify: "🛡️",
};

// ---- Tab Navigation ----
$$("nav.tabs button").forEach(btn => {
  btn.onclick = () => {
    $$("nav.tabs button").forEach(x => x.classList.toggle("active", x === btn));
    ["dashboard", "chat", "kb"].forEach(tab => {
      const section = $(`#tab-${tab}`);
      if (section) section.classList.toggle("hidden", tab !== btn.dataset.tab);
    });
  };
});


// ---- Quick ICP Preset Buttons ----
$$(".preset-chip").forEach(btn => {
  btn.onclick = () => {
    if (btn.dataset.roles) $("#roles").value = btn.dataset.roles;
    if (btn.dataset.region) $("#region").value = btn.dataset.region;
    if (btn.dataset.count) $("#count").value = btn.dataset.count;
    // Highlight input briefly
    const rolesInput = $("#roles");
    rolesInput.style.borderColor = "var(--primary)";
    setTimeout(() => { rolesInput.style.borderColor = ""; }, 800);
  };
});

// ---- Prospecting Pipeline Execution ----
const runBtn = $("#runBtn");
if (runBtn) runBtn.onclick = runFromForm;

async function runFromForm() {
  const brief = {
    count: +$("#count").value || 5,
    region: $("#region").value,
    roles: $("#roles").value,
  };
  await doRun(brief, $("#signals").value, runBtn);
}

async function doRun(brief, signals_mode, btn) {
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> <span>Running Engine…</span>';
  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, mode: "seed", signals_mode }),
    }).then(r => r.json());

    if (res.error) {
      alert("Pipeline error: " + res.error);
      return null;
    }
    LAST = res;
    render(res);
    return res;
  } catch (err) {
    alert("Network or pipeline error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ---- Render Dashboard Results ----
function render(r) {
  const emptyState = $("#emptyState");
  if (emptyState) emptyState.style.display = "none";

  const m = r.metrics || {};
  // Update stat tiles
  const elSourced = $("#statSourced");
  const elFilter = $("#statFilter");
  const elContacted = $("#statContacted");
  const elSetAside = $("#statSetAside");
  const elMode = $("#statMode");

  if (elSourced) elSourced.textContent = m.sourced ?? "0";
  if (elFilter) elFilter.textContent = m.after_filter ?? "0";
  if (elContacted) elContacted.textContent = m.contacted ?? "0";
  if (elSetAside) elSetAside.textContent = m.set_aside ?? "0";
  if (elMode) elMode.textContent = r.mode === "live" ? "Live" : "Seed (0 Cr)";

  // Tool Timeline
  const tlHeader = $("#tlHeader");
  if (tlHeader) tlHeader.style.display = "flex";
  const tl = $("#timeline");
  tl.innerHTML = "";
  (r.events || []).forEach((e, i) => {
    const step = document.createElement("div");
    step.className = "step" + (e.status === "error" ? " err" : "");
    const icon = TOOL_ICONS[e.tool] || "•";
    step.innerHTML = `
      <div class="ic">${icon}</div>
      <div>
        <div class="t">${esc(e.title)}</div>
        <div class="d">${esc(e.detail || "")}</div>
      </div>
      <div class="ms">${e.ms != null ? e.ms + "ms" : ""}</div>
    `;
    tl.appendChild(step);
    setTimeout(() => step.classList.add("show"), 80 * i);
  });

  // Prospects Table
  renderProspectRows(r.prospects || []);
  const tblHeader = $("#tblHeader");
  const tableCard = $("#tableCard");
  if (tblHeader) tblHeader.style.display = r.prospects && r.prospects.length ? "flex" : "none";
  if (tableCard) tableCard.style.display = r.prospects && r.prospects.length ? "block" : "none";

  // Search filter
  const searchInput = $("#prospectSearch");
  if (searchInput) {
    searchInput.value = "";
    searchInput.oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!LAST || !LAST.prospects) return;
      const filtered = LAST.prospects.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.company && p.company.toLowerCase().includes(q)) ||
        (p.title && p.title.toLowerCase().includes(q))
      );
      renderProspectRows(filtered);
    };
  }

  // Set Aside Table
  const asideHeader = $("#asideHeader");
  const asideCard = $("#asideCard");
  const asideRows = $("#asideRows");
  asideRows.innerHTML = "";
  const setAsideList = r.set_aside || [];
  setAsideList.forEach(s => {
    asideRows.innerHTML += `
      <tr>
        <td class="who">
          <div class="nm">${esc(s.name || "—")}</div>
          <div class="ti">${esc(s.title || "")}</div>
        </td>
        <td><span class="company-cell">${esc(s.company || "")}</span></td>
        <td><span class="score-cell">${s.total ?? "—"}</span></td>
        <td style="color: var(--text-muted); font-size: 12px;">${esc(s.reason || "")}</td>
      </tr>
    `;
  });
  const hasAside = setAsideList.length > 0;
  if (asideHeader) asideHeader.style.display = hasAside ? "flex" : "none";
  if (asideCard) asideCard.style.display = hasAside ? "block" : "none";
}

function renderProspectRows(prospects) {
  const rows = $("#rows");
  rows.innerHTML = "";
  prospects.forEach((p, i) => {
    // Find original index in LAST for drawer
    const originalIndex = LAST && LAST.prospects ? LAST.prospects.indexOf(p) : i;
    const tr = document.createElement("tr");
    tr.onclick = () => openDrawer(originalIndex >= 0 ? originalIndex : i);
    tr.innerHTML = `
      <td class="rank">${i + 1}</td>
      <td class="who">
        <div class="nm">${esc(p.name || "—")}</div>
        <div class="ti">${esc(p.title || "")}</div>
      </td>
      <td>
        <div class="company-cell">${esc(p.company || "")}</div>
        <div class="domain-pill">${esc(p.domain || "")}</div>
      </td>
      <td class="hide-sm">${p.employees ? p.employees.toLocaleString() : "—"}</td>
      <td>
        <span class="score-cell">${p.score.total}</span>
        ${labelChip(p.score.label)}
      </td>
      <td class="hide-sm">${emailChip(p.email_status)}</td>
      <td>${verifyChip(p.verify ? p.verify.status : "nodraft")}</td>
      <td style="text-align: right;"><span class="action-hint">View Dossier →</span></td>
    `;
    rows.appendChild(tr);
  });
}

function labelChip(l) {
  const cls = l === "Priority now" ? "prio" : l === "Strong fit" ? "strong" : "notnow";
  return `<span class="chip ${cls}">${esc(l)}</span>`;
}

function emailChip(s) {
  const isVerified = s === "verified";
  return `<span class="chip ${isVerified ? "pass" : "notnow"}">${esc(s || "—")}</span>`;
}

function verifyChip(s) {
  if (s === "passed") return '<span class="chip pass">✓ Verified</span>';
  if (s === "needs_review") return '<span class="chip review">⚠ Review</span>';
  return '<span class="chip nodraft">No draft</span>';
}

// ---- Prospect Detail Drawer ----
function openDrawer(i) {
  if (!LAST || !LAST.prospects || !LAST.prospects[i]) return;
  const p = LAST.prospects[i];
  const s = p.score;
  const bars = [
    ["Account Fit", s.account_fit, 40],
    ["Persona Fit", s.persona_fit, 20],
    ["Signal Intent", s.intent, 25],
    ["Timing", s.timing, 15],
  ];

  const drawer = $("#drawer");
  drawer.innerHTML = `
    <div class="drawer-topbar">
      <span class="drawer-badge">Prospect Dossier</span>
      <button class="ghost" id="closeDrawer">✕ Close</button>
    </div>

    <div>
      <h2>${esc(p.name || "—")}</h2>
      <div class="sub">${esc(p.title || "")} · <strong>${esc(p.company || "")}</strong></div>
    </div>

    <div class="facts">
      <div><div class="k">Company Domain</div>${esc(p.domain || "—")}</div>
      <div><div class="k">Industry</div>${esc(p.industry || "—")}</div>
      <div><div class="k">Company Size</div>${p.employees ? p.employees.toLocaleString() + " employees" : "—"}</div>
      <div><div class="k">Location / Region</div>${esc(p.region || "—")}</div>
      <div><div class="k">Direct Email</div>${esc(p.email || "—")} ${emailChip(p.email_status)}</div>
      <div><div class="k">Tenure in Role</div>${p.months_in_role ? p.months_in_role + " months" : "—"}</div>
    </div>

    <div class="score-breakdown-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:700; font-size:13px; color:var(--text-main);">Score Breakdown: ${p.score.total}/100</span>
        ${labelChip(p.score.label)}
      </div>
      <div class="bars">
        ${bars.map(([l, v, max]) => `
          <div class="bar">
            <span>${l}</span>
            <div class="track"><div class="fill" style="width:${Math.round((v / max) * 100)}%"></div></div>
            <span style="text-align:right; font-family:var(--font-mono);">${v}/${max}</span>
          </div>
        `).join("")}
      </div>
    </div>

    <div>
      <div class="section-title">Detected Buying Signals</div>
      <div class="sig-list">
        ${(p.signals && p.signals.length
          ? p.signals.map(sg => `
            <div class="sig">
              <span class="ty">${esc(sg.type)}</span> · ${esc(sg.summary)}<br>
              <a href="${sg.url}" target="_blank" rel="noopener noreferrer">${esc(sg.date || "View Source")} ↗</a>
            </div>
          `).join("")
          : '<div style="font-size:12px; color:var(--text-muted); padding:10px 12px; background:var(--bg-subtle); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">No active external signal in 180 days — generated role-based conversational draft.</div>'
        )}
      </div>
    </div>

    <div>
      <div class="section-title">Personalized Outreach Drafts</div>
      <div class="tabsline">
        <button class="active" data-d="email">✉️ Cold Email Draft</button>
        <button data-d="linkedin">💬 LinkedIn InMail</button>
      </div>
      <div id="draftPane"></div>
    </div>

    ${p.verify && p.verify.status === "needs_review"
      ? `<div class="review-note"><strong>⚠ Guardrail Review Flag:</strong><br>${p.verify.review_reasons.map(esc).join("; ")}</div>`
      : ""
    }

    <div class="rowbtns" style="padding-top:10px; border-top:1px solid var(--border-subtle);">
      <button class="ghost" id="exportBtn">📥 Export All to CSV</button>
    </div>
  `;

  const paint = (which) => {
    const d = p.draft || {};
    const draftPane = $("#draftPane");
    if (which === "email") {
      draftPane.innerHTML = `
        <div class="draftbox">
          <div class="subj">Subject: ${esc(d.subject || "(No subject)")}</div>
          <div>${esc(d.body || "(No body generated)")}</div>
        </div>
        <div class="rowbtns">
          <button class="ghost" data-copy="${enc((d.subject ? "Subject: " + d.subject + "\n\n" : "") + (d.body || ""))}">📋 Copy Email Draft</button>
        </div>
      `;
    } else {
      draftPane.innerHTML = `
        <div class="draftbox">
          <div>${esc(d.linkedin_note || "(No LinkedIn note)")}</div>
        </div>
        <div class="rowbtns">
          <button class="ghost" data-copy="${enc(d.linkedin_note || "")}">📋 Copy InMail Note</button>
        </div>
      `;
    }
    wireCopy();
  };

  paint("email");
  $$("#drawer .tabsline button").forEach(b => {
    b.onclick = () => {
      $$("#drawer .tabsline button").forEach(x => x.classList.toggle("active", x === b));
      paint(b.dataset.d);
    };
  });

  const closeBtn = $("#closeDrawer");
  if (closeBtn) closeBtn.onclick = closeDrawer;
  const exportBtn = $("#exportBtn");
  if (exportBtn) exportBtn.onclick = exportCSV;

  $("#drawerWrap").classList.add("open");
}

function wireCopy() {
  $$("[data-copy]").forEach(b => {
    b.onclick = () => {
      navigator.clipboard.writeText(dec(b.dataset.copy));
      const originalText = b.textContent;
      b.textContent = "✓ Copied to Clipboard";
      setTimeout(() => { b.textContent = originalText; }, 1400);
    };
  });
}

function closeDrawer() {
  $("#drawerWrap").classList.remove("open");
}

const scrim = $("#scrim");
if (scrim) scrim.onclick = closeDrawer;

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

// ---- CSV Export ----
function exportCSV() {
  if (!LAST || !LAST.prospects) return;
  const head = [
    "name", "title", "company", "domain", "employees", "email", "email_status",
    "score", "label", "verify", "subject", "body", "linkedin_note"
  ];
  const rows = LAST.prospects.map(p => [
    p.name, p.title, p.company, p.domain, p.employees,
    p.email, p.email_status, p.score.total, p.score.label,
    p.verify ? p.verify.status : "",
    p.draft ? p.draft.subject : "",
    p.draft ? p.draft.body : "",
    p.draft ? p.draft.linkedin_note : ""
  ]);
  const csv = [head, ...rows]
    .map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gong_prospects_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Lyzr Swarms Chat ----
const chatSend = $("#chatSend");
const chatInput = $("#chatInput");

if (chatSend) chatSend.onclick = sendChat;
if (chatInput) {
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") sendChat();
  });
}

$$(".suggests button").forEach(b => {
  b.onclick = () => {
    chatInput.value = b.textContent;
    sendChat();
  };
});

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  addMsg(text, "user");
  const thinking = addMsg('<span class="spinner spinner-dark"></span> <span>Lyzr Swarms orchestrating…</span>', "bot");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    }).then(r => r.json());

    thinking.remove();
    let html = esc(res.reply || "");
    if (res.result) {
      LAST = res.result;
      render(res.result);
      html += `
        <div class="mini-steps">
          ${res.result.events.map(e => `
            <span class="pill">${TOOL_ICONS[e.tool] || "•"} ${esc(e.title)}</span>
          `).join("")}
        </div>
        <div style="margin-top: 10px;">
          <button class="ghost" id="toDash" style="background:#fff;">📊 View ${res.result.returned_count} prospects on Dashboard →</button>
        </div>
      `;
    }
    const bot = addMsg(html, "bot");
    const link = $("#toDash", bot);
    if (link) {
      link.onclick = (e) => {
        e.preventDefault();
        $('nav.tabs button[data-tab="dashboard"]').click();
      };
    }
  } catch {
    thinking.remove();
    addMsg("Network error connecting to Lyzr Swarms service.", "bot");
  }
}

function addMsg(html, who) {
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.innerHTML = html;
  const messages = $("#messages");
  messages.appendChild(d);
  messages.scrollTop = messages.scrollHeight;
  return d;
}

// ---- Knowledge Base (KB) Explorer & Sample Queries ----
const kbBtn = $("#kbBtn");
const kbQuery = $("#kbQuery");

if (kbBtn) kbBtn.onclick = kbSearch;
if (kbQuery) {
  kbQuery.addEventListener("keydown", e => {
    if (e.key === "Enter") kbSearch();
  });
}

// Wire up the 3 Sample Query Cards
$$(".kb-sample-card").forEach(card => {
  card.onclick = () => {
    const query = card.dataset.query;
    if (query && kbQuery) {
      kbQuery.value = query;
      kbSearch();
    }
  };
});

async function kbSearch() {
  const q = kbQuery.value.trim();
  if (!q) return;

  const box = $("#kbResults");
  box.innerHTML = `
    <div class="empty">
      <span class="spinner spinner-dark" style="margin-bottom:12px;"></span>
      <p>Searching Gong Sales Playbook &amp; Guardrails…</p>
    </div>
  `;

  try {
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, top_k: 8 }),
    }).then(r => r.json());

    if (res.error) {
      box.innerHTML = `<div class="empty" style="color:var(--danger)">Knowledge Base error: ${esc(res.error)}</div>`;
      return;
    }

    const items = res.results || [];
    if (!items.length) {
      box.innerHTML = '<div class="empty">No matching playbook chunks found for this query.</div>';
      return;
    }

    box.innerHTML = `
      <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
        Retrieved ${items.length} Playbook Chunks
      </div>
    ` + items.map((it, idx) => {
      const rawText = it.text || it.content || it.page_content || JSON.stringify(it);
      const score = it.score != null ? (+it.score).toFixed(3) : null;
      const fileName = it.metadata && it.metadata.file_name ? it.metadata.file_name : "";
      const category = detectCategory(fileName, rawText);
      const formattedContent = formatKbChunk(rawText);

      return `
        <div class="kb-chunk-card">
          <div class="kb-chunk-header">
            <span class="kb-source-tag">${category.icon} ${category.label}</span>
            ${score ? `<span class="kb-chunk-score">Relevance Score: ${score}</span>` : ""}
          </div>
          <div class="kb-chunk-content">${formattedContent}</div>
          <div class="kb-chunk-actions">
            <button class="ghost" data-copy="${enc(rawText)}">📋 Copy Chunk</button>
          </div>
        </div>
      `;
    }).join("");

    wireCopy();
  } catch (err) {
    box.innerHTML = `<div class="empty" style="color:var(--danger)">Network error: ${esc(err.message)}</div>`;
  }
}

function detectCategory(fileName, text) {
  const lower = (fileName + " " + text).toLowerCase();
  if (lower.includes("value_prop") || lower.includes("vp-forecast") || lower.includes("vp-visibility") || lower.includes("mechanism")) {
    return { label: "Approved Value Props", icon: "💎" };
  }
  if (lower.includes("blocked") || lower.includes("guarantee") || lower.includes("competitor") || lower.includes("anti-hallucination")) {
    return { label: "Compliance & Blocked Claims", icon: "🛡️" };
  }
  if (lower.includes("persona") || lower.includes("pain") || lower.includes("cro") || lower.includes("vp sales")) {
    return { label: "Persona Pain Map", icon: "🎯" };
  }
  if (lower.includes("template") || lower.includes("skeleton") || lower.includes("compliance_templates")) {
    return { label: "Outreach Structure & Rules", icon: "📋" };
  }
  return { label: fileName || "Playbook Reference", icon: "📑" };
}

function formatKbChunk(text) {
  if (typeof text !== "string") return esc(JSON.stringify(text));
  // Clean basic markdown tables if found
  if (text.includes("|") && text.includes("\n|")) {
    const lines = text.split("\n");
    let inTable = false;
    let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12px;">';
    let result = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        // Skip separator row like |---|---|
        if (/^\|[\s\-:|]+\|$/.test(trimmed)) return;
        const cells = trimmed.split("|").slice(1, -1).map(c => esc(c.trim()));
        if (!inTable) {
          inTable = true;
          tableHtml += "<thead><tr>" + cells.map(c => `<th style="padding:6px 8px; border:1px solid var(--border-subtle); background:var(--bg-subtle); text-align:left;">${c}</th>`).join("") + "</tr></thead><tbody>";
        } else {
          tableHtml += "<tr>" + cells.map(c => `<td style="padding:6px 8px; border:1px solid var(--border-subtle);">${c}</td>`).join("") + "</tr>";
        }
      } else {
        if (inTable) {
          tableHtml += "</tbody></table>";
          result.push(tableHtml);
          inTable = false;
          tableHtml = '<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12px;">';
        }
        result.push(esc(line));
      }
    });
    if (inTable) {
      tableHtml += "</tbody></table>";
      result.push(tableHtml);
    }
    return result.join("<br>");
  }

  return esc(text);
}

// ---- Safe Encoding / Escaping Utilities ----
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function enc(s) {
  return encodeURIComponent(String(s ?? ""));
}

function dec(s) {
  return decodeURIComponent(s);
}
