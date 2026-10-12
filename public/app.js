/**
 * TinyFish Careers Finder — Frontend Client
 * Handles real-time SSE stream, preferences, multi-endpoint pipeline,
 * job filtering, agent verification, and application tracking.
 */

// Global State
let currentJobs = [];
let savedJobsMap = new Map();
let activeJob = null;
let currentWorkModeFilter = 'all';

// DOM Elements
const searchForm = document.getElementById('searchForm');
const roleInput = document.getElementById('roleInput');
const senioritySelect = document.getElementById('senioritySelect');
const locationInput = document.getElementById('locationInput');
const visaToggle = document.getElementById('visaToggle');
const skillsInput = document.getElementById('skillsInput');
const searchSubmitBtn = document.getElementById('searchSubmitBtn');
const searchSpinner = document.getElementById('searchSpinner');

const minScoreSlider = document.getElementById('minScoreSlider');
const scoreVal = document.getElementById('scoreVal');
const sortSelect = document.getElementById('sortSelect');
const jobsGrid = document.getElementById('jobsGrid');
const resultsTotalBadge = document.getElementById('resultsTotalBadge');
const savedCount = document.getElementById('savedCount');

const logStream = document.getElementById('logStream');
const telemetryLogsBody = document.getElementById('telemetryLogsBody');
const btnToggleLogs = document.getElementById('btnToggleLogs');
const logToggleIcon = document.getElementById('logToggleIcon');

// Step indicators
const stepSearch = document.getElementById('stepSearch');
const stepFetch = document.getElementById('stepFetch');
const stepMatch = document.getElementById('stepMatch');
const stepAgent = document.getElementById('stepAgent');

// Modals
const jobModal = document.getElementById('jobModal');
const btnCloseJobModal = document.getElementById('btnCloseJobModal');
const savedDrawer = document.getElementById('savedDrawer');
const btnOpenSaved = document.getElementById('btnOpenSaved');
const btnCloseSavedDrawer = document.getElementById('btnCloseSavedDrawer');
const settingsModal = document.getElementById('settingsModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnCloseSettingsModal = document.getElementById('btnCloseSettingsModal');
const btnCancelSettings = document.getElementById('btnCancelSettings');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const apiKeyInput = document.getElementById('apiKeyInput');
const archModal = document.getElementById('archModal');
const btnOpenArchitecture = document.getElementById('btnOpenArchitecture');
const btnCloseArchModal = document.getElementById('btnCloseArchModal');

// Init
document.addEventListener('DOMContentLoaded', () => {
  initSSE();
  fetchStatus();
  fetchSavedJobs();
  setupEventListeners();

  // Run initial search with defaults for instant experience
  executeSearch();
});

// SSE Real-time Telemetry Connection
function initSSE() {
  const eventSource = new EventSource('/api/stream');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerEvent(data);
    } catch (e) {
      console.warn('Error parsing SSE event:', e);
    }
  };

  eventSource.onerror = () => {
    appendLog('warn', '[STREAM]', 'Reconnecting to telemetry stream...');
  };
}

function handleServerEvent(payload) {
  const { type, data, timestamp } = payload;
  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

  switch (type) {
    case 'connected':
      appendLog('system', '[CONNECTED]', payload.message || 'Stream active');
      break;
    case 'pipeline_start':
      setPipelineStep('search');
      appendLog('info', '[PIPELINE]', data.message);
      break;
    case 'log':
      if (data.stage === 'search') setPipelineStep('search');
      else if (data.stage === 'fetch') setPipelineStep('fetch');
      else if (data.stage === 'matching') setPipelineStep('match');
      appendLog(data.status === 'warning' ? 'warn' : 'info', `[${data.stage.toUpperCase()}]`, data.message);
      break;
    case 'pipeline_complete':
      setPipelineStep('match', true);
      appendLog('success', '[DONE]', `Pipeline finished: ${data.totalFound} jobs scored.`);
      break;
    case 'agent_start':
      setPipelineStep('agent');
      appendLog('info', '[AGENT]', data.message);
      break;
    case 'agent_progress':
      appendLog('info', '[AGENT-STEP]', `Action: ${data.action || 'Navigating...'}`);
      break;
    case 'agent_complete':
      setPipelineStep('agent', true);
      appendLog('success', '[AGENT-VERIFIED]', `Completed run on ${data.jobUrl}`);
      break;
    case 'agent_error':
    case 'pipeline_error':
      appendLog('error', '[ERROR]', data.error || 'Operation failed');
      break;
  }
}

function appendLog(level, tag, msg) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-tag">${tag}</span>
    <span class="log-msg">${escapeHtml(msg)}</span>
  `;
  logStream.appendChild(entry);
  telemetryLogsBody.scrollTop = telemetryLogsBody.scrollHeight;
}

function setPipelineStep(step, completed = false) {
  [stepSearch, stepFetch, stepMatch, stepAgent].forEach(s => {
    s.classList.remove('active');
  });

  if (step === 'search') {
    stepSearch.classList.add('active');
  } else if (step === 'fetch') {
    stepSearch.classList.add('completed');
    stepFetch.classList.add('active');
  } else if (step === 'match') {
    stepSearch.classList.add('completed');
    stepFetch.classList.add('completed');
    stepMatch.classList.add('active');
    if (completed) stepMatch.classList.add('completed');
  } else if (step === 'agent') {
    stepAgent.classList.add('active');
    if (completed) stepAgent.classList.add('completed');
  }
}

// Fetch API Status & Key
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.authenticated) {
      document.getElementById('apiStatusText').textContent = 'Live Connected';
      document.getElementById('apiStatusBadge').title = `Key: ${data.keyPreview}`;
      apiKeyInput.placeholder = data.keyPreview;
    }
  } catch (e) {
    console.error('Failed to fetch status:', e);
  }
}

// Event Listeners
function setupEventListeners() {
  // Search Form Submit
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeSearch();
  });

  // Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      roleInput.value = chip.dataset.role || '';
      senioritySelect.value = chip.dataset.seniority || 'Internship';
      locationInput.value = chip.dataset.location || '';
      visaToggle.checked = chip.dataset.visa === 'true';
      skillsInput.value = chip.dataset.skills || '';

      executeSearch();
    });
  });

  // Score Slider
  minScoreSlider.addEventListener('input', (e) => {
    scoreVal.textContent = `${e.target.value}%`;
    renderJobs();
  });

  // Sort Select
  sortSelect.addEventListener('change', () => {
    renderJobs();
  });

  // Work Mode Filter Pills
  document.querySelectorAll('.work-mode-pills .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.work-mode-pills .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentWorkModeFilter = pill.dataset.mode;
      renderJobs();
    });
  });

  // Toggle Log Stream
  btnToggleLogs.addEventListener('click', () => {
    const isHidden = telemetryLogsBody.style.display === 'none';
    telemetryLogsBody.style.display = isHidden ? 'block' : 'none';
    logToggleIcon.textContent = isHidden ? '▼' : '▲';
  });

  // Modals Open/Close
  btnCloseJobModal.addEventListener('click', () => jobModal.classList.add('hidden'));
  jobModal.addEventListener('click', (e) => {
    if (e.target === jobModal) jobModal.classList.add('hidden');
  });

  btnOpenSaved.addEventListener('click', () => savedDrawer.classList.remove('hidden'));
  btnCloseSavedDrawer.addEventListener('click', () => savedDrawer.classList.add('hidden'));
  savedDrawer.addEventListener('click', (e) => {
    if (e.target === savedDrawer) savedDrawer.classList.add('hidden');
  });

  btnOpenSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  btnCloseSettingsModal.addEventListener('click', () => settingsModal.classList.add('hidden'));
  btnCancelSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

  btnSaveSettings.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const d = await res.json();
      if (d.success) {
        alert('TinyFish API Key updated successfully!');
        settingsModal.classList.add('hidden');
        fetchStatus();
      }
    } catch (e) {
      alert('Failed to update API key: ' + e.message);
    }
  });

  btnOpenArchitecture.addEventListener('click', () => archModal.classList.remove('hidden'));
  btnCloseArchModal.addEventListener('click', () => archModal.classList.add('hidden'));
  archModal.addEventListener('click', (e) => {
    if (e.target === archModal) archModal.classList.add('hidden');
  });

  // Modal Tabs Switching
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const paneId = tab.dataset.tab === 'specs' ? 'tabSpecs' : (tab.dataset.tab === 'breakdown' ? 'tabBreakdown' : 'tabAgent');
      document.getElementById(paneId).classList.add('active');
    });
  });

  // Agent Verification Run Button inside Modal
  document.getElementById('btnRunAgentVerify').addEventListener('click', runAgentVerificationOnActiveJob);

  // Modal Save Button
  document.getElementById('btnModalSaveJob').addEventListener('click', () => {
    if (activeJob) toggleSaveJob(activeJob);
  });

  // FAQ Accordion
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.faq-item');
      const wasActive = parent.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        const icon = item.querySelector('.faq-icon');
        if (icon) icon.textContent = '+';
      });
      if (!wasActive) {
        parent.classList.add('active');
        const icon = parent.querySelector('.faq-icon');
        if (icon) icon.textContent = '−';
      }
    });
  });
}

// Execute Search Pipeline
async function executeSearch() {
  searchSubmitBtn.disabled = true;
  searchSpinner.classList.remove('hidden');

  const selectedPortals = Array.from(document.querySelectorAll('input[name="portal"]:checked')).map(cb => cb.value);
  const skillsList = skillsInput.value.split(',').map(s => s.trim()).filter(Boolean);

  const payload = {
    role: roleInput.value.trim() || 'Software Engineer Intern',
    seniority: senioritySelect.value,
    location: locationInput.value.trim() || 'Remote',
    visaRequired: visaToggle.checked,
    skills: skillsList,
    portals: selectedPortals.length > 0 ? selectedPortals : ['boards.greenhouse.io', 'jobs.lever.co', 'jobs.ashbyhq.com'],
    minMatchScore: parseInt(minScoreSlider.value, 10) || 0
  };

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    currentJobs = data.jobs || [];
    renderJobs();
  } catch (err) {
    console.error('Search request failed:', err);
    appendLog('error', '[SEARCH-ERROR]', err.message);
  } finally {
    searchSubmitBtn.disabled = false;
    searchSpinner.classList.add('hidden');
  }
}

// Render Job Cards Grid
function renderJobs() {
  const minScore = parseInt(minScoreSlider.value, 10) || 0;
  const sortBy = sortSelect.value;

  // Filter
  let filtered = currentJobs.filter(job => {
    if (job.matchScore < minScore) return false;
    if (currentWorkModeFilter !== 'all') {
      const mode = (job.workMode || '').toLowerCase();
      if (!mode.includes(currentWorkModeFilter.toLowerCase())) return false;
    }
    return true;
  });

  // Sort
  if (sortBy === 'score') {
    filtered.sort((a, b) => b.matchScore - a.matchScore);
  } else if (sortBy === 'company') {
    filtered.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
  } else if (sortBy === 'recent') {
    filtered.sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));
  }

  resultsTotalBadge.textContent = `${filtered.length} found`;

  if (filtered.length === 0) {
    jobsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔎</div>
        <h3>No jobs matched these specific filters</h3>
        <p>Try lowering the match score slider or expanding location / seniority filters.</p>
      </div>
    `;
    return;
  }

  jobsGrid.innerHTML = filtered.map(job => createJobCardHTML(job)).join('');

  // Bind card action buttons
  filtered.forEach(job => {
    const cardEl = document.getElementById(`card-${job.id}`);
    if (!cardEl) return;

    // Inspect Details
    cardEl.querySelector('.btn-inspect').addEventListener('click', () => openJobModal(job));

    // Agent Verify Quick Action
    cardEl.querySelector('.btn-agent-quick').addEventListener('click', () => {
      openJobModal(job, 'agent');
      runAgentVerificationOnActiveJob();
    });

    // Save Toggle
    cardEl.querySelector('.btn-save-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSaveJob(job);
    });
  });
}

function createJobCardHTML(job) {
  const isSaved = savedJobsMap.has(job.id);
  const initials = (job.company || 'C').substring(0, 2).toUpperCase();

  // Score badge color
  let scoreClass = 'high';
  if (job.matchScore < 60) scoreClass = 'low';
  else if (job.matchScore < 80) scoreClass = 'medium';

  // Visa badge
  let visaClass = 'neutral';
  let visaText = job.visaStatus || 'Visa Unspecified';
  if (visaText.includes('Sponsorship Available') || visaText.includes('STEM OPT')) {
    visaClass = 'positive';
  } else if (visaText.includes('No Sponsorship') || visaText.includes('US Citizen')) {
    visaClass = 'negative';
  } else if (visaText.includes('Work Authorization Required')) {
    visaClass = 'conditional';
  }

  // Skills chips
  const matchedSkills = (job.matchBreakdown?.matchedSkills || []).slice(0, 4);
  const otherSkills = (job.skills || []).filter(s => !matchedSkills.includes(s)).slice(0, 3);

  return `
    <article class="job-card" id="card-${job.id}">
      ${job.isVerifiedByAgent ? '<div class="agent-verified-ribbon"><span>✓</span> Agent Verified</div>' : ''}
      
      <div class="job-card-top">
        <div class="company-meta">
          <div class="company-avatar">${initials}</div>
          <div class="company-info">
            <span class="company-name">${escapeHtml(job.company)}</span>
            <span class="portal-tag">
              <span class="portal-dot">●</span> ${escapeHtml(job.portal)}
            </span>
          </div>
        </div>

        <div class="match-score-badge ${scoreClass}">
          <span class="match-score-num">${job.matchScore}%</span>
          <span class="match-score-label">Match</span>
        </div>
      </div>

      <div class="job-card-main">
        <h3 class="job-title">${escapeHtml(job.title)}</h3>
        
        <div class="card-meta-chips" style="margin-top: 10px;">
          <span class="meta-chip mode">📍 ${escapeHtml(job.location || 'Remote')}</span>
          <span class="meta-chip mode">💼 ${escapeHtml(job.workMode || 'Hybrid')}</span>
          ${job.salary && job.salary !== 'Not specified' ? `<span class="meta-chip salary">💰 ${escapeHtml(job.salary)}</span>` : ''}
        </div>

        <div style="margin-top: 10px;">
          <div class="visa-badge ${visaClass}">
            <span>${visaClass === 'positive' ? '🛡️' : (visaClass === 'negative' ? '⚠️' : 'ℹ️')}</span>
            <span>${escapeHtml(visaText)}</span>
          </div>
        </div>

        <p class="job-snippet" style="margin-top: 10px;">
          ${escapeHtml(job.snippet || 'Live opening extracted via TinyFish Fetch.')}
        </p>

        <div class="card-skills" style="margin-top: 12px;">
          ${matchedSkills.map(s => `<span class="skill-tag matched">✓ ${escapeHtml(s)}</span>`).join('')}
          ${otherSkills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}
        </div>
      </div>

      <div class="card-actions">
        <div class="left-actions">
          <button class="action-icon-btn btn-save-toggle ${isSaved ? 'saved' : ''}" title="${isSaved ? 'Remove Bookmark' : 'Save Opening'}">
            ${isSaved ? '★' : '☆'}
          </button>
          <button class="action-text-btn btn-agent-quick" title="Run TinyFish Agent to inspect application">
            🤖 Verify
          </button>
          <button class="action-text-btn btn-inspect" title="Inspect full details & match analysis">
            📄 Details
          </button>
        </div>

        <a href="${job.directApplyUrl || job.url}" target="_blank" rel="noopener" class="direct-apply-btn">
          Apply Now ↗
        </a>
      </div>
    </article>
  `;
}

// Open Job Details Modal
function openJobModal(job, targetTab = 'specs') {
  activeJob = job;

  document.getElementById('modalCompany').textContent = job.company;
  document.getElementById('modalTitle').textContent = job.title;
  document.getElementById('modalSalary').textContent = job.salary || 'Not specified';
  document.getElementById('modalLocation').textContent = `${job.location} (${job.workMode})`;
  document.getElementById('modalVisa').textContent = job.visaStatus || 'Unspecified';
  document.getElementById('modalPortal').textContent = job.portal;

  // Render Markdown content
  const mdContainer = document.getElementById('modalMarkdownContent');
  mdContainer.innerHTML = job.fullMarkdown 
    ? formatSimpleMarkdown(job.fullMarkdown)
    : `<p><em>${escapeHtml(job.snippet)}</em></p><p>Full markdown extracted via TinyFish Fetch.</p>`;

  // Match Breakdown Tab
  document.getElementById('modalBreakdownScore').textContent = `${job.matchScore}%`;
  const reasonsContainer = document.getElementById('modalMatchReasons');
  reasonsContainer.innerHTML = (job.matchBreakdown?.reasons || [
    'Role profile aligned',
    'Seniority requirements verified',
    'Live ATS portal confirmed'
  ]).map(r => `<div class="match-reason-item"><span>✓</span> <span>${escapeHtml(r)}</span></div>`).join('');

  // Skills
  const matchedContainer = document.getElementById('modalMatchedSkills');
  const missingContainer = document.getElementById('modalMissingSkills');
  matchedContainer.innerHTML = (job.matchBreakdown?.matchedSkills || []).map(s => `<span class="skill-tag matched">${escapeHtml(s)}</span>`).join('') || '<span style="color:var(--text-subtle)">None specified</span>';
  missingContainer.innerHTML = (job.matchBreakdown?.missingSkills || []).map(s => `<span class="skill-tag missing">${escapeHtml(s)}</span>`).join('') || '<span style="color:var(--text-subtle)">No missing stack requirements</span>';

  // Agent Tab State
  updateAgentPaneUI(job);

  // Apply Button Link
  document.getElementById('btnModalApply').href = job.directApplyUrl || job.url;

  // Activate Tab
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  if (targetTab === 'agent') {
    document.querySelector('.modal-tab[data-tab="agent"]').classList.add('active');
    document.getElementById('tabAgent').classList.add('active');
  } else {
    document.querySelector('.modal-tab[data-tab="specs"]').classList.add('active');
    document.getElementById('tabSpecs').classList.add('active');
  }

  jobModal.classList.remove('hidden');
}

function updateAgentPaneUI(job) {
  const placeholder = document.getElementById('agentPlaceholder');
  const details = document.getElementById('agentDetails');

  if (job.agentVerification) {
    placeholder.classList.add('hidden');
    details.classList.remove('hidden');

    document.getElementById('agentStatusBadge').textContent = job.agentVerification.status || 'COMPLETED';
    document.getElementById('agentRunId').textContent = `Run ID: ${job.agentVerification.runId}`;

    const link = document.getElementById('agentRunLink');
    if (job.agentVerification.runUrl) {
      link.href = job.agentVerification.runUrl;
      link.classList.remove('hidden');
    } else {
      link.classList.add('hidden');
    }

    const fieldsGrid = document.getElementById('agentFieldsGrid');
    fieldsGrid.innerHTML = `
      <div class="agent-field-item">
        <label>Verified Application Submission Link</label>
        <span><a href="${job.agentVerification.applyLink}" target="_blank" style="color:#38bdf8">${job.agentVerification.applyLink}</a></span>
      </div>
      <div class="agent-field-item">
        <label>Autonomous Execution Steps</label>
        <span>${job.agentVerification.stepsCount} tool-call navigation steps verified</span>
      </div>
      <div class="agent-field-item">
        <label>Extracted Form Attributes</label>
        <span>Active status verified · Application endpoint confirmed reachable</span>
      </div>
    `;
  } else {
    placeholder.classList.remove('hidden');
    details.classList.add('hidden');
  }
}

// Run TinyFish Agent on Active Job
async function runAgentVerificationOnActiveJob() {
  if (!activeJob) return;

  const btn = document.getElementById('btnRunAgentVerify');
  const spinner = document.getElementById('agentSpinner');

  btn.disabled = true;
  spinner.classList.remove('hidden');

  try {
    const res = await fetch('/api/agent/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: activeJob.id,
        jobUrl: activeJob.url,
        goal: `Navigate to the job application page for ${activeJob.title} at ${activeJob.company}. Extract direct application link and verify if active.`
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    activeJob.isVerifiedByAgent = true;
    activeJob.agentVerification = data.verification;
    if (data.verification.applyLink) {
      activeJob.directApplyUrl = data.verification.applyLink;
    }

    updateAgentPaneUI(activeJob);
    renderJobs();
  } catch (e) {
    alert('Agent verification failed: ' + e.message);
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
  }
}

// Save / Bookmark Job
async function toggleSaveJob(job) {
  const isSaved = savedJobsMap.has(job.id);
  if (isSaved) {
    savedJobsMap.delete(job.id);
    await fetch(`/api/saved-jobs/${job.id}`, { method: 'DELETE' });
  } else {
    savedJobsMap.set(job.id, job);
    await fetch('/api/saved-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, status: 'Saved' })
    });
  }

  savedCount.textContent = savedJobsMap.size;
  renderJobs();
  renderSavedJobsList();
}

async function fetchSavedJobs() {
  try {
    const res = await fetch('/api/saved-jobs');
    const data = await res.json();
    (data.savedJobs || []).forEach(j => savedJobsMap.set(j.id, j));
    savedCount.textContent = savedJobsMap.size;
    renderSavedJobsList();
  } catch (e) {
    console.error('Failed to load saved jobs:', e);
  }
}

function renderSavedJobsList() {
  const listEl = document.getElementById('savedJobsList');
  if (savedJobsMap.size === 0) {
    listEl.innerHTML = '<div class="empty-state">No saved jobs yet. Click the star icon on any card to track it here.</div>';
    return;
  }

  const items = Array.from(savedJobsMap.values());
  listEl.innerHTML = items.map(job => `
    <div class="saved-job-item">
      <div class="saved-job-title">${escapeHtml(job.title)}</div>
      <div class="saved-job-company">${escapeHtml(job.company)} · ${escapeHtml(job.portal)}</div>
      <div class="saved-job-actions">
        <select class="status-select" onchange="updateJobTrackingStatus('${job.id}', this.value)">
          <option value="Saved" ${job.status === 'Saved' ? 'selected' : ''}>Saved</option>
          <option value="Applied" ${job.status === 'Applied' ? 'selected' : ''}>Applied</option>
          <option value="Interviewing" ${job.status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
          <option value="Offer" ${job.status === 'Offer' ? 'selected' : ''}>Offer</option>
          <option value="Rejected" ${job.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
        <a href="${job.directApplyUrl || job.url}" target="_blank" class="direct-apply-btn" style="padding:4px 10px; font-size:0.75rem">Apply ↗</a>
      </div>
    </div>
  `).join('');
}

window.updateJobTrackingStatus = async (jobId, newStatus) => {
  const job = savedJobsMap.get(jobId);
  if (job) {
    job.status = newStatus;
    await fetch('/api/saved-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, status: newStatus })
    });
  }
};

// Simple Markdown Formatter
function formatSimpleMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h2>$1</h2>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n\n/gim, '</p><p>');

  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
  return `<p>${html}</p>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
