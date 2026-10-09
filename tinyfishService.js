const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

/**
 * TinyFish API Client & Orchestration Service
 * Integrates:
 * 1. TinyFish Search API (api.search.tinyfish.ai / tinyfish search query)
 * 2. TinyFish Fetch API (api.fetch.tinyfish.ai / tinyfish fetch content get)
 * 3. TinyFish Agent API (agent.tinyfish.ai/v1/automation/run / tinyfish agent run)
 */
class TinyFishService {
  constructor() {
    this.apiKey = this.loadApiKey();
    this.searchBaseUrl = 'https://api.search.tinyfish.ai';
    this.fetchBaseUrl = 'https://api.fetch.tinyfish.ai';
    this.agentBaseUrl = 'https://agent.tinyfish.ai/v1/automation';
    this.cliJsPath = 'C:\\Users\\Hp\\AppData\\Roaming\\npm\\node_modules\\@tiny-fish\\cli\\dist\\index.js';
  }

  loadApiKey() {
    // 1. Environment variable
    if (process.env.TINYFISH_API_KEY && process.env.TINYFISH_API_KEY.trim()) {
      return process.env.TINYFISH_API_KEY.trim();
    }
    // 2. ~/.tinyfish/config.json
    try {
      const configPath = path.join(os.homedir(), '.tinyfish', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.api_key) return config.api_key;
      }
    } catch (e) {
      console.warn('Could not read ~/.tinyfish/config.json:', e.message);
    }
    // Default fallback (can be overridden via UI)
    return 'sk-tinyfish-jErYFt5M3diIDl0tIdx2Wd7YaZXF7vgX';
  }

  setApiKey(key) {
    if (key && key.trim()) {
      this.apiKey = key.trim();
      process.env.TINYFISH_API_KEY = this.apiKey;
    }
  }

  getApiKeyPreview() {
    if (!this.apiKey) return 'Not configured';
    return this.apiKey.substring(0, 14) + '...' + this.apiKey.slice(-4);
  }

  /**
   * Helper to execute CLI command with direct Node spawn
   */
  execCli(args) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const child = spawn(process.execPath, [this.cliJsPath, ...args], {
        env: { ...process.env, TINYFISH_API_KEY: this.apiKey }
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => { stdout += d.toString(); });
      child.stderr.on('data', d => { stderr += d.toString(); });
      child.on('close', code => {
        if (code !== 0 && !stdout.trim()) {
          return reject(new Error(stderr || `CLI process exited with code ${code}`));
        }
        resolve(stdout);
      });
      child.on('error', err => reject(err));
    });
  }

  // ==========================================
  // 1. TINYFISH SEARCH API (Endpoint 1)
  // ==========================================
  /**
   * Discover job postings across live careers portals (Greenhouse, Lever, Ashby, Workday, etc.)
   */
  async searchJobs({ query, location, domains = [], recencyMinutes, page = 0, onProgress }) {
    if (onProgress) onProgress({ stage: 'search', status: 'started', query });

    let finalQuery = query || 'Software Engineer Intern';

    // Construct domain inclusion list if specified
    const targetDomains = domains.length > 0 
      ? domains.join(',') 
      : 'boards.greenhouse.io,jobs.lever.co,jobs.ashbyhq.com';

    let searchResults = [];

    // Attempt CLI search first for exact domain filtering support
    try {
      const output = await this.execCli(['search', 'query', finalQuery, '--include-domains', targetDomains, '--page', page.toString()]);
      const data = JSON.parse(output.trim());
      searchResults = data.results || [];
    } catch (cliErr) {
      // Fallback to direct REST Search API
      try {
        const url = new URL(this.searchBaseUrl);
        url.searchParams.append('query', finalQuery);
        if (location) url.searchParams.append('location', location);
        url.searchParams.append('include_domains', targetDomains);
        url.searchParams.append('page', page.toString());
        if (recencyMinutes) url.searchParams.append('recency_minutes', recencyMinutes.toString());

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          searchResults = data.results || [];
        } else {
          throw new Error(`REST Error ${res.status}`);
        }
      } catch (restErr) {
        console.error('TinyFish Search failed:', restErr.message);
        throw new Error(`TinyFish Search failed: ${restErr.message}`);
      }
    }

    if (onProgress) onProgress({ stage: 'search', status: 'completed', count: searchResults.length });

    // Structure raw search results into preliminary job listings
    return searchResults.map((item, index) => {
      const parsed = this.parseSearchItem(item, index);
      return parsed;
    });
  }

  parseSearchItem(item, index) {
    const title = item.title || 'Untitled Opening';
    const url = item.url || '';
    const snippet = item.snippet || '';
    const site = item.site_name || '';

    // Extract company name and clean job title
    let company = 'Company';
    let cleanTitle = title;

    // 1. Extract from URL slug
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('lever.co') || urlObj.hostname.includes('ashbyhq.com') || urlObj.hostname.includes('greenhouse.io')) {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const compSlug = pathParts[0];
          company = compSlug.charAt(0).toUpperCase() + compSlug.slice(1);
        }
      }
    } catch (e) {}

    // 2. Refine with title formats
    if (title.includes(' @ ')) {
      const parts = title.split(' @ ');
      cleanTitle = parts[0].trim();
      company = parts[1].replace(/\s*-\s*Jobs$/i, '').trim();
    } else if (title.includes(' - Lever')) {
      const clean = title.replace(/\s*-\s*Lever$/i, '');
      const parts = clean.split(' - ');
      if (parts.length >= 2) {
        company = parts[0].trim();
        cleanTitle = parts.slice(1).join(' - ').trim();
      }
    } else if (title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts.length >= 2) {
        if (parts[1].toLowerCase().includes('technologies') || parts[1].toLowerCase().includes('inc') || parts[1].toLowerCase().includes('corp') || parts[1].length < 30) {
          company = parts[1].replace(/\s*-\s*Jobs$/i, '').trim();
          cleanTitle = parts[0].trim();
        } else {
          company = parts[0].trim();
          cleanTitle = parts.slice(1).join(' - ').trim();
        }
      }
    } else if (title.includes(' | ')) {
      const parts = title.split(' | ');
      cleanTitle = parts[0].trim();
      company = parts[1].replace(/\s*-\s*Jobs$/i, '').trim();
    } else if (title.includes(' at ')) {
      const parts = title.split(' at ');
      cleanTitle = parts[0].trim();
      company = parts[1].replace(/\s*-\s*Jobs$/i, '').trim();
    }

    // Determine ATS Portal type
    let portal = 'Careers Page';
    if (url.includes('greenhouse.io')) portal = 'Greenhouse';
    else if (url.includes('lever.co')) portal = 'Lever';
    else if (url.includes('ashbyhq.com')) portal = 'Ashby';
    else if (url.includes('workday')) portal = 'Workday';
    else if (url.includes('smartrecruiters')) portal = 'SmartRecruiters';

    return {
      id: `job-${Date.now()}-${index}`,
      title: cleanTitle,
      company: company,
      url: url,
      snippet: snippet,
      portal: portal,
      siteName: site,
      location: 'Determining...',
      workMode: 'Hybrid/On-site',
      seniority: 'Internship',
      salary: 'Not specified',
      visaStatus: 'Pending analysis',
      skills: [],
      directApplyUrl: url,
      matchScore: 0,
      matchDetails: {},
      isVerifiedByAgent: false,
      fetchedAt: new Date().toISOString()
    };
  }

  // ==========================================
  // 2. TINYFISH FETCH API (Endpoint 2)
  // ==========================================
  /**
   * Fetch clean, noise-free Markdown content from URLs, rendering JS-heavy career pages.
   */
  async fetchJobDetails(urls, { onProgress } = {}) {
    if (!urls || urls.length === 0) return [];
    if (onProgress) onProgress({ stage: 'fetch', status: 'started', urlsCount: urls.length });

    const results = [];
    const urlBatches = [];
    
    // Batch into chunks of up to 5 URLs for high reliability
    for (let i = 0; i < urls.length; i += 5) {
      urlBatches.push(urls.slice(i, i + 5));
    }

    for (const batch of urlBatches) {
      try {
        const res = await fetch(this.fetchBaseUrl, {
          method: 'POST',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            urls: batch,
            format: 'markdown',
            links: true
          })
        });

        if (res.ok) {
          const data = await res.json();
          // data format: [{ url, status, text, format }, ...]
          if (Array.isArray(data)) {
            results.push(...data);
          } else if (data.results) {
            results.push(...data.results);
          }
        } else {
          const errText = await res.text();
          console.warn(`Fetch REST failed with ${res.status}: ${errText}. Using CLI fallback...`);
          throw new Error(`Fetch REST error ${res.status}`);
        }
      } catch (e) {
        // Fallback to CLI per URL in batch
        for (const url of batch) {
          try {
            const cliOut = await this.execCli(['fetch', 'content', 'get', url, '--format', 'markdown']);
            const parsed = JSON.parse(cliOut.trim());
            if (Array.isArray(parsed)) results.push(...parsed);
            else if (parsed.results) results.push(...parsed.results);
            else results.push(parsed);
          } catch (cliErr) {
            console.error(`CLI fetch failed for ${url}:`, cliErr.message);
            results.push({ url, status: 'error', text: '' });
          }
        }
      }
    }

    if (onProgress) onProgress({ stage: 'fetch', status: 'completed', extractedCount: results.length });
    return results;
  }

  /**
   * Extract rich structured data from fetched Markdown job text
   */
  enrichJobWithMarkdown(job, markdownText) {
    if (!markdownText) return job;

    const lower = markdownText.toLowerCase();

    // 1. Extract Salary / Stipend
    const salaryMatch = markdownText.match(/(?:salary|compensation|hourly|stipend|pay rate)[^\n]{0,60}?(\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:\/|per)\s*(?:month|year|yr|mo|hr|hour))?)/i)
      || markdownText.match(/(\$[\d,]+(?:\s*-\s*\$[\d,]+)?\s*(?:\/|per)\s*(?:month|year|yr|mo|hr|hour))/i)
      || markdownText.match(/(\$[\d]{2,3}(?:,\d{3})*(?:\s*-\s*\$[\d]{2,3}(?:,\d{3})*))/i);
    
    if (salaryMatch) {
      job.salary = salaryMatch[1].trim();
    }

    // 2. Extract Work Mode & Location
    if (lower.includes('remote') && lower.includes('hybrid')) {
      job.workMode = 'Hybrid / Remote Friendly';
    } else if (lower.includes('remote') || lower.includes('work from anywhere')) {
      job.workMode = 'Remote';
    } else if (lower.includes('hybrid')) {
      job.workMode = 'Hybrid';
    } else if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('in-office')) {
      job.workMode = 'On-site';
    }

    const locMatches = markdownText.match(/(?:location|offices?|based in)[:\s]*([A-Z][a-zA-Z\s,]+(?:CA|NY|WA|TX|MA|IL|CO|GA|Remote|UK|London|San Francisco|New York|Seattle|Austin))/i);
    if (locMatches) {
      job.location = locMatches[1].replace(/^(location|offices?|based in)[:\s]*/i, '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    } else if (job.workMode === 'Remote') {
      job.location = 'Remote (US / Global)';
    } else {
      job.location = 'See Career Posting';
    }

    // 3. Visa Sponsorship & Work Authorization analysis
    let visaStatus = 'Not Explicitly Stated';
    let visaScoreImpact = 0;
    let visaDetails = '';

    if (lower.includes('visa sponsorship is available') || 
        lower.includes('visa sponsorship will be provided') || 
        lower.includes('we sponsor visas') || 
        lower.includes('stem opt eligible') || 
        lower.includes('opt/cpt eligible')) {
      visaStatus = 'Sponsorship Available / STEM OPT Friendly';
      visaScoreImpact = 15;
      visaDetails = 'Explicitly mentions visa sponsorship or OPT/CPT eligibility.';
    } else if (lower.includes('does not provide visa sponsorship') || 
               lower.includes('will not sponsor') || 
               lower.includes('no visa sponsorship') || 
               lower.includes('not able to sponsor') || 
               lower.includes('security clearance') || 
               lower.includes('us citizen or permanent resident only') || 
               lower.includes('us citizenship required')) {
      visaStatus = 'No Sponsorship / US Citizen Required';
      visaScoreImpact = -10;
      visaDetails = 'Posting explicitly indicates no sponsorship or citizenship/clearance requirement.';
    } else if (lower.includes('authorized to work in the u.s.') || lower.includes('work authorization')) {
      visaStatus = 'Work Authorization Required (Check Form)';
      visaScoreImpact = 5;
      visaDetails = 'Standard work authorization language; requires agent verification on application form.';
    }

    job.visaStatus = visaStatus;
    job.visaDetails = visaDetails;
    job.visaScoreImpact = visaScoreImpact;

    // 4. Skills extraction
    const commonSkills = [
      'Python', 'TypeScript', 'JavaScript', 'React', 'Node.js', 'Go', 'Golang', 
      'Rust', 'Java', 'C++', 'C#', 'SQL', 'PostgreSQL', 'Docker', 'Kubernetes', 
      'AWS', 'GCP', 'Azure', 'PyTorch', 'TensorFlow', 'LLM', 'FastAPI', 'GraphQL',
      'Next.js', 'Tailwind', 'Linux', 'Distributed Systems', 'Git'
    ];
    const foundSkills = [];
    for (const skill of commonSkills) {
      const reg = new RegExp(`\\b${skill.replace('+', '\\+')}\\b`, 'i');
      if (reg.test(markdownText)) {
        foundSkills.push(skill);
      }
    }
    job.skills = foundSkills;
    job.fullMarkdown = markdownText;

    // 5. Seniority Detection
    if (lower.includes('intern') || lower.includes('co-op') || lower.includes('fellowship')) {
      job.seniority = 'Internship';
    } else if (lower.includes('new grad') || lower.includes('university graduate') || lower.includes('campus')) {
      job.seniority = 'New Grad';
    } else if (lower.includes('junior') || lower.includes('associate') || lower.includes('entry level') || lower.includes('entry-level')) {
      job.seniority = 'Junior / Entry-Level';
    } else if (lower.includes('senior') || lower.includes('sr.') || lower.includes('lead')) {
      job.seniority = 'Senior';
    } else {
      job.seniority = 'Mid-Level';
    }

    return job;
  }

  // ==========================================
  // 3. TINYFISH AGENT API (Endpoint 3)
  // ==========================================
  /**
   * Run autonomous agent automation to inspect the live application page,
   * verify if the listing is active, extract direct application URLs and analyze questions.
   */
  async verifyWithAgent(jobUrl, { goal, onProgress } = {}) {
    const finalGoal = goal || 'Navigate to the job application page. Verify if the job is actively accepting applications, extract the direct application submission link, and check if US work authorization / visa sponsorship is questioned.';

    if (onProgress) onProgress({ stage: 'agent', status: 'started', url: jobUrl, goal: finalGoal });

    let agentResult = null;

    try {
      // Direct REST call to agent automation
      const res = await fetch(`${this.agentBaseUrl}/run`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: jobUrl,
          goal: finalGoal
        })
      });

      if (res.ok) {
        agentResult = await res.json();
      } else {
        const errText = await res.text();
        console.warn(`Agent REST returned ${res.status}: ${errText}. Falling back to CLI...`);
        throw new Error(`Agent REST status ${res.status}`);
      }
    } catch (e) {
      // CLI fallback: tinyfish agent run <goal> --url <url> --sync
      try {
        const stdout = await this.execCli(['agent', 'run', finalGoal, '--url', jobUrl, '--sync']);
        
        // Find JSON in output (since CLI prints "Waiting for result..." first)
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          agentResult = JSON.parse(jsonMatch[0]);
        } else {
          agentResult = { status: 'COMPLETED', rawOutput: stdout };
        }
      } catch (cliErr) {
        console.error('Agent CLI execution failed:', cliErr.message);
        throw new Error(`TinyFish Agent failed: ${cliErr.message}`);
      }
    }

    if (onProgress) onProgress({ stage: 'agent', status: 'completed', result: agentResult });

    return {
      status: agentResult.status || 'COMPLETED',
      runId: agentResult.run_id || `run-${Date.now()}`,
      runUrl: agentResult.run_url || (agentResult.run_id ? `https://agent.tinyfish.ai/runs/${agentResult.run_id}` : null),
      stepsCount: agentResult.num_of_steps || 3,
      result: agentResult.result || {},
      applyLink: (agentResult.result && agentResult.result.apply_link) ? agentResult.result.apply_link : `${jobUrl}/apply`,
      verifiedAt: new Date().toISOString()
    };
  }

  // ==========================================
  // MATCHING, SCORING & DEDUPLICATION
  // ==========================================
  calculateMatchScore(job, preferences = {}) {
    let score = 0;
    const matchBreakdown = {
      roleScore: 0,
      seniorityScore: 0,
      locationScore: 0,
      visaScore: 0,
      skillsScore: 0,
      reasons: []
    };

    const targetRole = (preferences.role || '').toLowerCase();
    const targetSeniority = (preferences.seniority || 'all').toLowerCase();
    const targetLocation = (preferences.location || '').toLowerCase();
    const requireVisa = preferences.visaRequired === true || preferences.visaRequired === 'true';
    const userSkills = preferences.skills || [];

    const jobTitle = job.title.toLowerCase();
    const jobSeniority = (job.seniority || '').toLowerCase();
    const jobLocation = (job.location || '').toLowerCase();
    const jobMode = (job.workMode || '').toLowerCase();

    // 1. Role Score (Max 35 points)
    if (targetRole) {
      const roleKeywords = targetRole.split(/\s+/).filter(w => w.length > 2);
      let matchedCount = 0;
      for (const kw of roleKeywords) {
        if (jobTitle.includes(kw)) matchedCount++;
      }
      if (jobTitle.includes(targetRole)) {
        matchBreakdown.roleScore = 35;
        matchBreakdown.reasons.push(`Exact role match for "${preferences.role}" (+35)`);
      } else if (matchedCount > 0) {
        const partial = Math.round((matchedCount / roleKeywords.length) * 30);
        matchBreakdown.roleScore = partial;
        matchBreakdown.reasons.push(`Partial role match (${matchedCount}/${roleKeywords.length} terms) (+${partial})`);
      } else {
        matchBreakdown.roleScore = 10;
        matchBreakdown.reasons.push('General engineering profile match (+10)');
      }
    } else {
      matchBreakdown.roleScore = 30;
      matchBreakdown.reasons.push('Role open (+30)');
    }

    // 2. Seniority Score (Max 20 points)
    if (targetSeniority && targetSeniority !== 'all') {
      if (jobSeniority.includes(targetSeniority) || targetSeniority.includes(jobSeniority)) {
        matchBreakdown.seniorityScore = 20;
        matchBreakdown.reasons.push(`Target seniority "${job.seniority}" perfectly matched (+20)`);
      } else if (targetSeniority === 'internship' && (jobTitle.includes('intern') || jobTitle.includes('co-op'))) {
        matchBreakdown.seniorityScore = 20;
        matchBreakdown.reasons.push(`Internship title matched (+20)`);
      } else if (targetSeniority === 'new grad' && (jobSeniority === 'junior / entry-level' || jobTitle.includes('grad'))) {
        matchBreakdown.seniorityScore = 18;
        matchBreakdown.reasons.push(`New grad/entry level alignment (+18)`);
      } else {
        matchBreakdown.seniorityScore = 5;
        matchBreakdown.reasons.push(`Level mismatch: target ${preferences.seniority} vs ${job.seniority} (+5)`);
      }
    } else {
      matchBreakdown.seniorityScore = 20;
    }

    // 3. Location & Work Mode Score (Max 20 points)
    if (preferences.remoteOnly) {
      if (jobMode.includes('remote')) {
        matchBreakdown.locationScore = 20;
        matchBreakdown.reasons.push('100% Remote verified (+20)');
      } else if (jobMode.includes('hybrid')) {
        matchBreakdown.locationScore = 10;
        matchBreakdown.reasons.push('Hybrid work mode (+10)');
      } else {
        matchBreakdown.locationScore = 0;
        matchBreakdown.reasons.push('On-site role (remote preferred) (+0)');
      }
    } else if (targetLocation) {
      if (jobLocation.includes(targetLocation) || jobMode.includes('remote')) {
        matchBreakdown.locationScore = 20;
        matchBreakdown.reasons.push(`Location matched "${preferences.location}" or Remote (+20)`);
      } else {
        matchBreakdown.locationScore = 8;
        matchBreakdown.reasons.push(`Alternative location (${job.location}) (+8)`);
      }
    } else {
      matchBreakdown.locationScore = 20;
    }

    // 4. Visa Sponsorship Score (Max 15 points)
    if (requireVisa) {
      if (job.visaStatus.includes('Sponsorship Available') || job.visaStatus.includes('STEM OPT')) {
        matchBreakdown.visaScore = 15;
        matchBreakdown.reasons.push('Visa sponsorship / STEM OPT friendly (+15)');
      } else if (job.visaStatus.includes('No Sponsorship') || job.visaStatus.includes('US Citizen Required')) {
        matchBreakdown.visaScore = -15;
        matchBreakdown.reasons.push('No visa sponsorship or security clearance required (-15)');
      } else {
        matchBreakdown.visaScore = 5;
        matchBreakdown.reasons.push('Visa sponsorship unspecified (+5)');
      }
    } else {
      matchBreakdown.visaScore = 15;
    }

    // 5. Skills Score (Max 10 points)
    if (userSkills && userSkills.length > 0) {
      const matched = [];
      const missing = [];
      for (const skill of userSkills) {
        if (job.skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
          matched.push(skill);
        } else {
          missing.push(skill);
        }
      }
      matchBreakdown.matchedSkills = matched;
      matchBreakdown.missingSkills = missing;

      if (matched.length > 0) {
        const skillPoints = Math.min(10, Math.round((matched.length / userSkills.length) * 10));
        matchBreakdown.skillsScore = skillPoints;
        matchBreakdown.reasons.push(`Matched skills: ${matched.join(', ')} (+${skillPoints})`);
      } else {
        matchBreakdown.skillsScore = 2;
      }
    } else {
      matchBreakdown.skillsScore = 10;
      matchBreakdown.matchedSkills = job.skills || [];
      matchBreakdown.missingSkills = [];
    }

    score = matchBreakdown.roleScore + 
            matchBreakdown.seniorityScore + 
            matchBreakdown.locationScore + 
            matchBreakdown.visaScore + 
            matchBreakdown.skillsScore;

    // Clamp between 5% and 99%
    score = Math.max(5, Math.min(99, score));

    return {
      matchScore: score,
      matchBreakdown
    };
  }

  /**
   * Deduplicate listings across multiple portals and search results
   */
  deduplicateJobs(jobs) {
    const seen = new Map();
    const deduplicated = [];

    for (const job of jobs) {
      // Normalize URL (strip tracking query params like ?gh_jid or utm_source)
      let cleanUrl = job.url;
      try {
        const parsed = new URL(job.url);
        cleanUrl = `${parsed.origin}${parsed.pathname}`;
      } catch (e) {}

      // Form normalized key: company + normalized title
      const normalizedKey = `${(job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}_${(job.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      if (seen.has(cleanUrl) || seen.has(normalizedKey)) {
        // Skip duplicate
        continue;
      }

      seen.set(cleanUrl, true);
      seen.set(normalizedKey, true);
      deduplicated.push(job);
    }

    return deduplicated;
  }
}

module.exports = new TinyFishService();
