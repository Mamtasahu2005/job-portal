# 🐟 JobsPlanet — TinyFish Careers Finder & Live Portal

> **TinyBounties Challenge Submission — Student Essentials Category**  
> **Scoring Tier:** 3+ Endpoints (`Search`, `Fetch`, `Agent`) — **200 Points Tier**  
> **Submission Type:** Agentic App / Skill  
> **Live Deployed Demo:** [https://stylish-ago-contest-linux.trycloudflare.com](https://stylish-ago-contest-linux.trycloudflare.com)  
> **GitHub Repository:** [https://github.com/Mamtasahu2005/job-portal](https://github.com/Mamtasahu2005/job-portal)  

---

## 🌟 Overview

**TinyFish Careers Finder** is a production-grade, autonomous job and internship discovery portal. Built for students and engineers tired of refreshing dozens of career pages every week, it leverages TinyFish's entire suite of web primitives—**Search**, **Fetch**, and **Agent**—to find, parse, verify, and match live openings directly from company career sites.

Instead of maintaining a stale database or dumping raw HTML, TinyFish Careers Finder executes a real-time 3-stage agentic pipeline:
1. **TinyFish Search (`api.search.tinyfish.ai`)**: Discovers fresh openings across live Applicant Tracking Systems (**Greenhouse**, **Lever**, **Ashby**, **Workday**).
2. **TinyFish Fetch (`api.fetch.tinyfish.ai`)**: Renders dynamic JavaScript career pages and extracts clean, token-efficient Markdown, automatically parsing compensation ranges, skills, and **F-1 / STEM OPT / H-1B visa sponsorship**.
3. **TinyFish Agent (`agent.tinyfish.ai/v1/automation`)**: Dispatches an autonomous AI browser agent to navigate live application forms, inspect screening requirements (e.g., citizenship/clearance, graduation dates), verify whether the job is still actively accepting applicants, and retrieve the direct 1-click apply URL.

---

## 🏆 Bounty Criteria & Verification Checklist

| Requirement | Implementation in TinyFish Careers Finder | Status |
| :--- | :--- | :--- |
| **1. Working Demo** | Full-stack application with dark glassmorphic UI, live SSE telemetry console, and interactive inspection modals. | **✓ Verified** |
| **2. User Preferences** | User-defined Role, Seniority, Location, Remote/Hybrid mode, Visa Sponsorship toggle (H-1B, STEM OPT), and Tech Stack skills. | **✓ Verified** |
| **3. Multiple Live Portals** | Pulls live listings across Greenhouse, Lever, Ashby, Workday, and company career portals using live web search rather than hardcoded mock data. | **✓ Verified** |
| **4. Structured, Deduplicated Listings** | Canonical URL and title deduplication, extracted salary/stipend ranges, match score breakdowns, and direct apply links. | **✓ Verified** |
| **5. Meaningful 3+ Endpoints** | Uses **TinyFish Search**, **TinyFish Fetch**, and **TinyFish Agent** meaningfully in the core workflow. | **✓ 200 Pts Tier** |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node.js 24)
- TinyFish API Key (free tier available at [agent.tinyfish.ai](https://agent.tinyfish.ai))

### 1. Installation
Clone or navigate to the repository directory:
```bash
cd tinyfish-careers-portal
npm install
```

### 2. Configure API Key
The server automatically detects your key from:
1. `TINYFISH_API_KEY` environment variable, or
2. `~/.tinyfish/config.json` (created automatically by the `tinyfish` CLI), or
3. Interactive Settings modal directly in the web UI.

To set it manually in your shell:
```bash
export TINYFISH_API_KEY="sk-tinyfish-your-key-here"
```
*(On Windows PowerShell: `$env:TINYFISH_API_KEY="sk-tinyfish-your-key-here"`)*

### 3. Launch the Application
```bash
npm start
```

Visit the dashboard in your browser:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🏗️ How TinyFish Primitives Are Used (Scoring: 200 Pts)

### 1. TinyFish Search API (`https://api.search.tinyfish.ai`)
* **Endpoint Type**: Search / Discovery
* **Role**: Real-time cross-ATS job discovery
* **Parameters Used**:
  - `query`: Dynamic queries constructed from user role, seniority, and year (e.g. `"Software Engineer Intern 2025 OR 2026"`)
  - `include_domains`: Restricts discovery to live career platforms (`boards.greenhouse.io`, `jobs.lever.co`, `jobs.ashbyhq.com`, `myworkdayjobs.com`)
  - `location`: Geo-targeting filter
  - `page`: Result pagination
* **Why it matters**: Eliminates the need for scraping scrapers or stale job scrapers; delivers rank-stable, structured JSON directly from the live web.

### 2. TinyFish Fetch API (`https://api.fetch.tinyfish.ai`)
* **Endpoint Type**: JS Rendering & Content Extraction
* **Role**: Noise-free Markdown conversion and deep attribute parsing
* **Parameters Used**:
  - `urls`: Batched candidate job URLs
  - `format`: `"markdown"`
  - `links`: `true`
* **Why it matters**: Modern career pages (Greenhouse, Lever, Ashby) are heavily rendered in client-side JavaScript with cookie popups and boilerplate footers. TinyFish Fetch cleans all noise and provides structured text for our parser to extract:
  - **Compensation**: Parses monthly intern stipends (e.g. `$10,500/month`) or annual base salaries.
  - **Work Mode**: Identifies Remote, Hybrid, or On-site policies.
  - **Visa Analysis**: Scans specifically for `"STEM OPT eligible"`, `"CPT/OPT accepted"`, `"visa sponsorship available"`, or `"US Citizen / clearance required"`.
  - **Required Tech Stack**: Maps technologies against the user's skillset.

### 3. TinyFish Agent API (`https://agent.tinyfish.ai/v1/automation`)
* **Endpoint Type**: Goal-Driven Autonomous Browser Agent
* **Role**: Live application form verification & screening analysis
* **Parameters Used**:
  - `url`: Direct job posting link
  - `goal`: Natural language automation goal:
    > *"Navigate to the application page. Verify if the position is actively accepting applicants, extract the direct application submission link, and check if US work authorization / visa sponsorship is questioned."*
* **Why it matters**: Many job postings remain indexed on search engines even after closing. TinyFish Agent navigates the actual interactive application flow, confirms that the job is open, detects screening friction (e.g., custom graduation year cutoffs, mandatory clearance questions), and retrieves the un-redirected apply endpoint.

---

## 🎯 Intelligent Matching & Ranking Algorithm

Each listing is scored on a **0 – 100% Match Index**:
* **Role Relevance (35 pts)**: Semantic and title match against the user's target job title.
* **Seniority Alignment (20 pts)**: Validates target level (Internship, New Grad, Junior, Mid, Senior).
* **Location & Work Mode (20 pts)**: Rewards Remote openings when preferred, or validates specified cities.
* **Visa Sponsorship Match (15 pts)**: Critical for international students and visa holders. Penalizes positions requiring US Citizenship or refusing sponsorship; boosts positions explicitly stating STEM OPT or sponsorship support.
* **Tech Stack Match (10 pts)**: Compares required technologies against the candidate's skills.

---

## 🎨 UI/UX Features

- **Dark Glassmorphic Theme**: Designed with modern CSS custom properties, backdrop filters, and subtle glowing accents.
- **Live SSE Telemetry Monitor**: Visual 4-step pipeline status tracker and live console stream displaying real-time agent execution traces and latencies.
- **Preset Quick-Launchers**: One-click presets for popular searches (Summer 2026 Internships, New Grad SWE, AI/ML Research).
- **Match Breakdown Modal**: Transparent breakdown showing why a job matched your profile, including matched vs. missing skills.
- **Autonomous Agent Inspector**: Interactive button on each card to trigger real-time TinyFish Agent verification.
- **Application Tracker (Saved Jobs Drawer)**: Keep track of application progress (`Saved`, `Applied`, `Interviewing`, `Offer`, `Rejected`).

---

## 📄 License
MIT License. Built for the TinyBounties Community.
