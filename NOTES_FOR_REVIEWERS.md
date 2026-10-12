# 📝 Notes for Reviewers — JobsPlanet (TinyFish Careers Finder)

> **Challenge:** TinyBounties — Student Essentials  
> **Submission Type:** Agentic App / Skill  
> **Claimed Scoring Tier:** 3+ Endpoints (`Search`, `Fetch`, `Agent`) — **200 Points Tier**  
> **Live Demo:** [https://stylish-ago-contest-linux.trycloudflare.com](https://stylish-ago-contest-linux.trycloudflare.com)  
> **GitHub Repository:** [https://github.com/Mamtasahu2005/job-portal](https://github.com/Mamtasahu2005/job-portal)  

---

## 📌 1. Project Overview & Problem Solved
As students and early-career engineers, finding internships and entry-level positions is broken:
- Traditional job aggregators (LinkedIn, Indeed) often surface weeks-old expired listings.
- Portals rarely surface whether international students are eligible for **STEM OPT** or **H-1B** sponsorship.
- Job seekers waste countless hours clicking into Greenhouse, Lever, and Ashby portals only to find closed forms.

**JobsPlanet** solves this by orchestrating TinyFish web automation primitives into an autonomous pipeline that discovers fresh postings directly on company ATS sites, strips recruiting noise to check visa eligibility, matches listings against user preferences with a 0–100% score dial, and uses an autonomous agent to test live application forms.

---

## 🛠️ 2. Meaningful Use of TinyFish Endpoints (3+ Endpoints / 200 PTS Tier)

Endpoints contribute meaningfully to distinct stages of the application lifecycle:

### ① TinyFish Search (`api.search.tinyfish.ai`) — Discovery Engine
* **Purpose**: Live discovery across real ATS domains without hardcoded databases.
* **Implementation**: Dynamically constructs search queries targeting ATS platforms (`boards.greenhouse.io`, `jobs.lever.co`, `jobs.ashbyhq.com`) scoped by role, seniority, and location keywords.
* **Why it matters**: Guarantees zero stale mock data. Every search hits the live web.

### ② TinyFish Fetch (`api.fetch.tinyfish.ai`) — Extraction & Parsing Engine
* **Purpose**: JavaScript rendering, boilerplate removal, and structured data extraction.
* **Implementation**: Fetches discovered career pages, executes dynamic client-side JS, strips headers/footers/tracking tags, and returns clean Markdown.
* **Enrichment**: Our regex and natural language engine parses the clean Markdown to extract:
  * **Salary / Hourly Stipend**: e.g., `$45/hr` or `$120,000 - $150,000/yr`.
  * **STEM OPT & Visa Sponsorship**: Detects sponsorship allowances or US citizenship requirements.
  * **Work Mode & Skills**: Remote, Hybrid, or On-site status, plus matched tech stack keywords.

### ③ TinyFish Agent (`agent.tinyfish.ai/v1/automation`) — Verification Engine
* **Purpose**: Autonomous browser verification of live application forms.
* **Implementation**: When a student clicks **Verify Application** or inspects a role, TinyFish Agent navigates directly to the ATS application page in a headless browser, checks for closed posting banners, identifies screening requirements, and confirms whether the direct submission form is active.
* **Why it matters**: Prevents students from wasting time filling out applications on inactive postings.

---

## ✅ 3. Rubric & Approval Criteria Checklist

| Criteria | Implementation Evidence |
| :--- | :--- |
| **1. Working Demo** | Hosted live at [https://stylish-ago-contest-linux.trycloudflare.com](https://stylish-ago-contest-linux.trycloudflare.com). Try entering any custom role (e.g., *"Machine Learning Intern"*), toggle Visa Sponsorship, and observe live SSE telemetry. |
| **2. Configurable Preferences** | Role, Seniority, Location, Visa Sponsorship toggle, Skills stack, and ATS portal selection are all customizable in real time. |
| **3. Live Web Data (No Hardcoding)** | Pipeline queries live ATS endpoints via TinyFish. No hardcoded mock results are used. |
| **4. Works Across Multiple Portals** | Discovers and normalizes listings simultaneously across Ashby (`jobs.ashbyhq.com`), Lever (`jobs.lever.co`), and Greenhouse (`boards.greenhouse.io`). |
| **5. Filtering, Matching & Ranking** | Implements a 5-pillar matching algorithm (Role + Seniority + Location + Visa + Skills) outputting a transparent 0–100% score dial, sortable and filterable by minimum score. |
| **6. Structured, Deduplicated Output** | Canonicalizes URLs, deduplicates identical openings across reposts, and renders direct apply links. |

---

## 🔬 4. Recommended Reviewer Walkthrough (Step-by-Step)

1. **Launch the Demo**: Open [https://stylish-ago-contest-linux.trycloudflare.com](https://stylish-ago-contest-linux.trycloudflare.com).
2. **Execute a Custom Search**:
   * Role: `Software Engineer Intern` (or try a preset like `AI/ML Engineer`).
   * Location: `Remote` or `San Francisco`.
   * Keep **Requires Visa Sponsorship / STEM OPT Friendly** enabled.
   * Click **Find Live Jobs 🔍**.
3. **Observe the Live Telemetry Console**:
   * Watch the 4-step pipeline track in real time: `Search` ➔ `Fetch` ➔ `Match` ➔ `Agent`.
   * Click **View Raw Logs ▾** to inspect live Server-Sent Events (SSE) showing TinyFish CLI/API queries.
4. **Test the Match Breakdown & Inspection Modal**:
   * Click **Inspect Specs** on any job card.
   * Review the clean Markdown extracted by TinyFish Fetch.
   * Switch to the **Match Breakdown** tab to see why the job received its specific match score.
5. **Trigger Autonomous Agent Verification**:
   * Inside the modal (or directly on a card), click **Verify with TinyFish Agent**.
   * Observe the agent inspecting the live application form and confirming active status.
6. **Test Application Tracking**:
   * Click the **⭐ Save** button on any card.
   * Click **Saved Jobs** in the top navigation bar to view the slide-out tracker and update job stages (*Applied*, *Interviewing*, *Offer*).
7. **Inspect Architecture Spec**:
   * Click **Architecture Spec 📖** in the hero or top navigation to view the in-app submission explainer.

---

## 💻 5. Local Reproduction (Optional)

If reviewing locally on your own machine:

```bash
# Clone the repository
git clone https://github.com/Mamtasahu2005/job-portal.git
cd job-portal

# Install dependencies
npm install

# Start the server (TinyFish API key can also be configured in the UI settings)
node server.js
```
Open `http://localhost:3000` in any modern browser.
