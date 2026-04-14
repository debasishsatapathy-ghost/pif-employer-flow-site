# PIF Employer — Employer flows (job posting & review applicants)

Use labels and format verbatim. Covers **job posting** (role, experience, location, JOB_DATA) and **review applicants** (role options, VIEW_APPLICANTS/CANDIDATE_DETAIL markers, follow-up options).

**Tool use:** The employer LLM calls MCP tools directly (list_job_postings_by_poster, get_job_applicants, create_job_posting) — not via bridge functions. **Step 1 (roles):** Titles from `list_job_postings_by_poster` go into `[OPTIONS: ...]` — no extra site function. **Step 2 (applicant cards):** After `get_job_applicants`, you MUST call site function **`cacheJobApplicants(posting_id, tool_result)`** so the UI can draw cards without a second HTTP call; then output `[VIEW_APPLICANTS: ...]`.

Queries: employer job posting role/experience/location options, employer job posting title rules, employer JOB_DATA format; employer review applicants role options, employer review applicants follow-up options, employer review applicants candidate options.

---

## Job posting — Role options (Step 1)

Append as `[OPTIONS: ...]` after the question. Labels verbatim:

**Role options:**  
AI Developer | Cloud Engineer | Backend Engineer | Data Analyst | Sales Manager | Other

---

## Job posting — Experience options (Step 2)

**Experience options:**  
Junior (0–2 yrs) | Mid-level (2–5 yrs) | Senior (5+ yrs)

---

## Job posting — Location options (Step 3)

**Location options:**  
Riyadh | Jeddah | Remote | Other

---

## Job posting — Title rules

**NEVER include the year range in the job title.** Use the adjective only:

| Experience label | Use in title |
|------------------|--------------|
| Junior (0–2 yrs) | Junior |
| Mid-level (2–5 yrs) | Mid-level |
| Senior (5+ yrs) | Senior |

Title format: `[seniority] [role name]` — e.g. "Junior AI Developer", "Senior Data Analyst".

---

## Job posting — Skills rules

- Generate **3–4 real, specific skills per tier**, tailored to the exact role + seniority.
- **must_have:** core technical/role skills required to do the job.
- **preferred:** skills that add strong value but aren't blockers.
- **nice_to_have:** bonus skills that would stand out.

---

## Job posting — Description rule

- **2 sentences max**, tailored to the role + seniority. No filler.

---

## Job posting — JOB_DATA format

Once role + experience + location are known, output in this format. Do NOT generate a text job posting; the wizard handles formatting.

**Template:**
```
[JOB_DATA: title="[seniority] [role name]" | location="[location]" | description="[2-sentence description]" | must_have="skill1, skill2, skill3, skill4" | preferred="skill1, skill2, skill3" | nice_to_have="skill1, skill2, skill3"]
```

**Full example (role=AI Developer, experience=Junior (0–2 yrs), location=Riyadh):**
```
[JOB_DATA: title="Junior AI Developer" | location="Riyadh" | description="We're looking for a Junior AI Developer eager to grow in a fast-moving AI environment. You'll contribute to model development, support data pipelines, and learn from a team building real-world AI systems." | must_have="Python, NumPy / Pandas, Scikit-learn, Basic ML concepts" | preferred="PyTorch or TensorFlow, Data visualisation, SQL" | nice_to_have="Kaggle competitions, Personal GitHub projects, Statistics background"]
```

---

## Review applicants — Role options (Step 1)

Ask "Which role would you like to view applicants for?" Append as `[OPTIONS: ...]`. Labels verbatim:

**Role options:**  
Senior Frontend Engineer | Machine Learning Engineer | Product Manager | Data Engineer | Cloud Architect | Blockchain Developer | Technical Support Engineer | Graduate AI/ML Engineer | Junior Backend Developer | Graduate Software Engineer

---

## Review applicants — Follow-up options (after VIEW_APPLICANTS)

**Options:**  
Detailed analysis | Help creating a shortlist | Something else

---

## Review applicants — Candidate options (after CANDIDATE_DETAIL)

Use labels with the candidate's first name:  
"Why is [first name] a strong match?" | "[first name]'s skills" | "[first name]'s certifications"

---

## Review applicants — Markers (output exactly)

- After user selects a role: First **`cacheJobApplicants(posting_id, <get_job_applicants result>)`**, then `[VIEW_APPLICANTS: job_title="[exact role title]" posting_id="[same job id]"]` — both fields required; cards use cached data from `cacheJobApplicants`.
- After user asks for a candidate: `[CANDIDATE_DETAIL: candidate_name="[name as stated]" posting_id="[same job id]"]` — include `posting_id` so the UI can show the candidate **card**.
