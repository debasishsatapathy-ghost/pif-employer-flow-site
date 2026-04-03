import { useState, useEffect, useRef, useCallback } from "react";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";
import { useVoiceSessionStore } from "@/lib/stores/voice-session-store";
import { registerSiteFunctions } from "@/site-functions/register";
import { motion, AnimatePresence } from "framer-motion";
// createJobPosting via direct RPC is not supported by the Mobeus agent.
// The wizard sends a structured lk.chat message instead (see handleFinish).
import { HiringPage } from "./HiringPage";
import { JobPostingTemplate } from "./JobPostingTemplate";
import WorkforcePage from "./WorkforcePage";
import type { JobPostingResponse } from "@/lib/employerApi";
import type { SidebarJob } from "@/components/employer/JobPostingSidebar";
import {
  Search,
  MapPin,
  Mail,
  GraduationCap,
  Plus,
  Bell,
  ChevronDown,
  ArrowRight,
  ArrowUp,
  Loader2,
  Building2,
  Users,
  BookOpen,
  MessageCircle,
  X,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Post-a-Job wizard types & helpers ───────────────────────────────────── */
interface SkillSet { mustHave: string[]; preferred: string[]; niceToHave: string[] }
interface JobFormData {
  title: string; department: string; location: string; employmentType: string;
  description: string; skills: SkillSet; salaryMin: string; salaryMax: string;
}
interface PostedJob { title: string; department: string; location: string; postedAt: Date }

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Internship"];

function inferDescription(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("ml") || t.includes("machine learning"))
    return `We're looking for a ${title} to design, build, and deploy intelligent systems. You'll work across the full model lifecycle — from data prep and training to evaluation and production rollout.`;
  if (t.includes("backend") || t.includes("back-end") || t.includes("server"))
    return `We're hiring a ${title} to build and maintain scalable APIs and services. You'll collaborate with product and frontend teams to ship reliable, high-performance features.`;
  if (t.includes("frontend") || t.includes("front-end") || t.includes("react developer") || t.includes("ui engineer"))
    return `We're looking for a ${title} to craft fast, polished user experiences. You'll own the UI layer end-to-end — from component design to performance optimisation.`;
  if (t.includes("full stack") || t.includes("fullstack"))
    return `We're hiring a ${title} to take features from database schema to polished UI. You'll be equally comfortable in backend services and React components.`;
  if (t.includes("cloud") || t.includes("devops") || t.includes("sre") || t.includes("platform"))
    return `We need a ${title} to design and manage our infrastructure at scale. You'll own provisioning, security hardening, and cost optimisation across our cloud environments.`;
  if (t.includes("data analyst") || t.includes("business analyst"))
    return `We're looking for a ${title} to turn raw data into actionable insights. You'll partner with business teams to define metrics, build dashboards, and surface trends that drive decisions.`;
  if (t.includes("data engineer") || t.includes("etl"))
    return `We need a ${title} to build and maintain the pipelines that power our analytics platform. You'll ensure data is clean, reliable, and accessible at scale.`;
  if (t.includes("product manager") || t.includes("product owner"))
    return `We're hiring a ${title} to own the roadmap for one of our core product areas. You'll translate user needs and business goals into clear, prioritised specs for engineering.`;
  if (t.includes("sales") || t.includes("account executive") || t.includes("business development"))
    return `We're looking for a ${title} to drive revenue growth and own key accounts. You'll build relationships, run discovery calls, and close deals against quarterly targets.`;
  return `We're hiring a ${title} to join our growing team. You'll contribute meaningfully from day one and work alongside talented colleagues to deliver real impact.`;
}

function inferSkills(title: string): SkillSet {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("ml") || t.includes("machine learning"))
    return { mustHave: ["Python", "PyTorch or TensorFlow", "Scikit-learn", "Model evaluation"], preferred: ["MLflow", "SQL / data pipelines", "Docker"], niceToHave: ["LLM fine-tuning", "Kaggle", "Open-source contributions"] };
  if (t.includes("backend") || t.includes("back-end") || t.includes("server"))
    return { mustHave: ["Node.js or Python", "REST API design", "PostgreSQL / MySQL", "Git & CI/CD"], preferred: ["Redis", "Microservices", "Docker"], niceToHave: ["GraphQL", "Kafka / RabbitMQ", "AWS / GCP"] };
  if (t.includes("frontend") || t.includes("front-end") || t.includes("react developer") || t.includes("ui engineer"))
    return { mustHave: ["React / Next.js", "TypeScript", "CSS / Tailwind", "REST integration"], preferred: ["Zustand / Redux", "Vitest / Jest", "Figma handoff"], niceToHave: ["Framer Motion", "Web accessibility", "React Native"] };
  if (t.includes("full stack") || t.includes("fullstack"))
    return { mustHave: ["React / Next.js", "Node.js or Python", "PostgreSQL", "Git & CI/CD"], preferred: ["TypeScript", "Docker", "REST API design"], niceToHave: ["AWS / GCP", "React Native", "DevOps basics"] };
  if (t.includes("cloud") || t.includes("devops") || t.includes("sre") || t.includes("platform"))
    return { mustHave: ["AWS / Azure / GCP", "Terraform", "Linux & networking", "IAM & security"], preferred: ["Kubernetes", "CI/CD pipelines", "Datadog / CloudWatch"], niceToHave: ["FinOps", "Multi-cloud", "AWS / CKA certifications"] };
  if (t.includes("data analyst") || t.includes("business analyst"))
    return { mustHave: ["SQL", "Excel / Google Sheets", "Tableau / Power BI", "Statistical thinking"], preferred: ["Python (Pandas)", "Looker / Metabase", "A/B testing"], niceToHave: ["dbt", "Google Analytics", "Storytelling"] };
  if (t.includes("data engineer") || t.includes("etl"))
    return { mustHave: ["Python", "SQL", "Spark or dbt", "BigQuery / Redshift / Snowflake"], preferred: ["Airflow / Prefect", "Kafka / Kinesis", "Docker"], niceToHave: ["Real-time streaming", "DataOps", "Feature stores"] };
  if (t.includes("product manager") || t.includes("product owner"))
    return { mustHave: ["Product roadmapping", "User story writing", "Stakeholder comms", "Data-driven decisions"], preferred: ["SQL basics", "Figma / wireframing", "Agile / Scrum"], niceToHave: ["Technical background", "A/B testing", "OKR frameworks"] };
  if (t.includes("sales") || t.includes("account executive") || t.includes("business development"))
    return { mustHave: ["B2B sales", "CRM (Salesforce / HubSpot)", "Pipeline management", "Negotiation"], preferred: ["SaaS sales motion", "Account-based selling", "Forecasting"], niceToHave: ["Arabic fluency", "Team leadership", "Channel / partner sales"] };
  return { mustHave: ["Relevant technical skills", "Communication", "Problem solving"], preferred: ["Domain experience", "Team collaboration"], niceToHave: ["Industry certifications", "Mentoring ability"] };
}

function getMarketSalary(title: string): { label: string; min: number; max: number } {
  const t = title.toLowerCase();
  if (t.includes("senior") && (t.includes("ai") || t.includes("ml"))) return { label: "SAR 55K–75K", min: 55000, max: 75000 };
  if (t.includes("ai") || t.includes("ml")) return { label: "SAR 35K–55K", min: 35000, max: 55000 };
  if (t.includes("senior")) return { label: "SAR 45K–65K", min: 45000, max: 65000 };
  if (t.includes("cloud") || t.includes("devops")) return { label: "SAR 40K–60K", min: 40000, max: 60000 };
  return { label: "SAR 30K–50K", min: 30000, max: 50000 };
}

const TOTAL_STEPS = 5;

/* ── Post-a-Job Wizard ───────────────────────────────────────────────────── */
function PostJobWizardCard({ onClose, onFinish, initialData }: {
  onClose: () => void;
  onFinish: (job: PostedJob) => void;
  initialData?: Partial<JobFormData>;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<JobFormData>({
    title: initialData?.title || "",
    department: initialData?.department || "",
    location: initialData?.location || "",
    employmentType: initialData?.employmentType || "",
    description: initialData?.description || "",
    skills: initialData?.skills || { mustHave: [], preferred: [], niceToHave: [] },
    salaryMin: initialData?.salaryMin || "",
    salaryMax: initialData?.salaryMax || "",
  });
  const [addingSkillTier, setAddingSkillTier] = useState<keyof SkillSet | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = (k: keyof JobFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const goNext = () => {
    // When advancing from step 1, silently apply inferred description & skills for empty fields
    if (step === 1 && form.title.trim()) {
      setForm(f => ({
        ...f,
        description: f.description || inferDescription(f.title),
        skills: {
          mustHave: f.skills.mustHave.length ? f.skills.mustHave : inferSkills(f.title).mustHave,
          preferred: f.skills.preferred.length ? f.skills.preferred : inferSkills(f.title).preferred,
          niceToHave: f.skills.niceToHave.length ? f.skills.niceToHave : inferSkills(f.title).niceToHave,
        },
      }));
    }
    setStep(s => s + 1);
  };
  const goBack = () => setStep(s => s - 1);

  const removeSkill = (skill: string, tier: keyof SkillSet) => {
    setForm(f => ({ ...f, skills: { ...f.skills, [tier]: f.skills[tier].filter(s => s !== skill) } }));
  };

  const addSkill = (tier: keyof SkillSet) => {
    const s = newSkill.trim();
    if (!s) return;
    setForm(f => ({ ...f, skills: { ...f.skills, [tier]: [...f.skills[tier], s] } }));
    setNewSkill(""); setAddingSkillTier(null);
  };

  const market = getMarketSalary(form.title);
  const salaryMinNum = parseInt(form.salaryMin.replace(/\D/g, "")) || 0;
  const salaryMaxNum = parseInt(form.salaryMax.replace(/\D/g, "")) || 0;
  const belowMarket = (salaryMaxNum > 0 && salaryMaxNum < market.min) || (salaryMinNum > 0 && salaryMinNum < market.min * 0.7);

  const handleFinish = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // The Mobeus agent does not expose a callMcpTool RPC endpoint.
      // Instead, send a structured lk.chat message that the agent's system
      // prompt is already instructed to handle: it parses the key-value lines
      // and calls create_job_posting via its own MCP function-calling pipeline.
      const lines: string[] = ["Create job posting with the following details:"];
      if (form.title)                    lines.push(`title: ${form.title}`);
      if (form.department)               lines.push(`department: ${form.department}`);
      if (form.location)                 lines.push(`location: ${form.location}`);
      if (form.employmentType)           lines.push(`employment_type: ${form.employmentType}`);
      if (form.description)              lines.push(`description: ${form.description}`);
      if (form.skills.mustHave.length)   lines.push(`must_have: ${form.skills.mustHave.join(", ")}`);
      if (form.skills.preferred.length)  lines.push(`preferred: ${form.skills.preferred.join(", ")}`);
      if (form.skills.niceToHave.length) lines.push(`nice_to_have: ${form.skills.niceToHave.join(", ")}`);
      if (form.salaryMin)                lines.push(`salary_min: ${form.salaryMin}`);
      if (form.salaryMax)                lines.push(`salary_max: ${form.salaryMax}`);
      lines.push("posted_by: Omar S.");

      await useVoiceSessionStore.getState().sendTextMessage(lines.join("\n"));
      onFinish({ title: form.title, department: form.department, location: form.location, postedAt: new Date() });
    } catch (err) {
      setSaveError((err as Error).message ?? "Failed to post job. Please try again.");
      setSaving(false);
    }
  };

  const tierLabels: { key: keyof SkillSet; label: string; color: string }[] = [
    { key: "mustHave", label: "MUST-HAVE", color: "#ef4444" },
    { key: "preferred", label: "PREFERRED", color: "#f59e0b" },
    { key: "niceToHave", label: "NICE-TO-HAVE", color: "#60a5fa" },
  ];

  const step1Valid = form.title.trim().length > 0;

  return (
      <div
        className="w-full max-w-xl flex flex-col gap-6 rounded-2xl mx-auto"
        style={{ background: 'rgba(255,255,255,0.05)', padding: '32px' }}
      >
        {/* Header — title + close + progress */}
        <div className="flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[24px] font-semibold leading-7 tracking-tight text-[#fafafa]">Post a job</span>
            <button onClick={onClose} className="text-white/25 hover:text-white/55 transition-colors ml-4 flex-shrink-0"><X size={15} /></button>
          </div>
          {/* Progress bar — 8px tall, green for completed steps */}
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex-1 h-2 rounded-full transition-all duration-300"
                style={{ background: i < step ? '#1ed25e' : 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex flex-col gap-5" style={{ maxHeight: 'calc(100dvh - 320px)' }}>
          <AnimatePresence mode="wait">
            {/* ── Step 1: Role details ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-5">
                <p className="text-base text-[#d4d4d8]">Let's start with the basics. What role are you hiring for?</p>
                <div className="flex flex-col gap-4">
                  <p className="text-[20px] font-semibold text-[#fafafa]">Role details</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Title", key: "title" as const, placeholder: "Eg. Senior Engineer" },
                      { label: "Department", key: "department" as const, placeholder: "Eg. Engineering" },
                      { label: "Location", key: "location" as const, placeholder: "Eg. Riyadh" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className="flex flex-col gap-2">
                        <label className="text-[14px] text-[#d4d4d8]">{label}</label>
                        <input
                          value={form[key] as string}
                          onChange={e => set(key, e.target.value)}
                          placeholder={placeholder}
                          className="h-[54px] w-full px-3 rounded-[10px] text-base text-white outline-none transition-colors"
                          style={{ background: 'rgba(255,255,255,0.05)', caretColor: '#1ed25e' }}
                        />
                      </div>
                    ))}
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] text-[#d4d4d8]">Employment Type</label>
                      <div className="relative">
                        <select
                          value={form.employmentType}
                          onChange={e => set("employmentType", e.target.value)}
                          className="h-[54px] w-full px-3 rounded-[10px] text-base outline-none appearance-none transition-colors"
                          style={{ background: 'rgba(255,255,255,0.05)', color: form.employmentType ? '#fff' : '#71717b' }}
                        >
                          <option value="" disabled>Eg. Full Time</option>
                          {EMPLOYMENT_TYPES.map(t => <option key={t} value={t} style={{ background: 'var(--surface-card)' }}>{t}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Job description ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
                {/* AI banner */}
                <div className="flex items-stretch overflow-hidden rounded-[12px]"
                  style={{ background: 'rgba(119,220,155,0.05)', border: '1px solid #4ad179' }}>
                  <div className="w-2 flex-shrink-0" style={{ background: '#4ad179' }} />
                  <div className="flex items-start gap-2 px-3 py-[10px]">
                    <span className="text-[#4ad179] flex-shrink-0 mt-0.5 text-base">✦</span>
                    <p className="text-base text-[#d2f3de] leading-6">
                      trAIn has generated this job description based on the role you&apos;re hiring for and an analysis of the tone of your previous job listings. Edit or continue.
                    </p>
                  </div>
                </div>
                <p className="text-[20px] font-semibold text-[#fafafa]">Job Description</p>
                <div className="rounded-[10px] p-[17px]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <textarea
                    value={form.description}
                    onChange={e => set("description", e.target.value)}
                    rows={7}
                    className="w-full bg-transparent text-base outline-none resize-none leading-6"
                    style={{ color: '#a1a1aa', caretColor: '#1ed25e' }}
                  />
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Skills ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
                {/* AI banner */}
                <div className="flex items-stretch overflow-hidden rounded-[12px]"
                  style={{ background: 'rgba(119,220,155,0.05)', border: '1px solid #4ad179' }}>
                  <div className="w-2 flex-shrink-0" style={{ background: '#4ad179' }} />
                  <div className="flex items-start gap-2 px-3 py-[10px]">
                    <span className="text-[#4ad179] flex-shrink-0 mt-0.5 text-base">✦</span>
                    <p className="text-base text-[#d2f3de] leading-6">
                      trAIn has pre-filled these skills based on the Saudi skills framework. You may add or edit.
                    </p>
                  </div>
                </div>
                <p className="text-[20px] font-semibold text-[#fafafa]">Skills</p>
                <div className="rounded-[10px] p-4 flex flex-col gap-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {tierLabels.map(({ key, label, color }) => (
                    <div key={key} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-[11px] font-semibold tracking-widest text-white/60">{label}</span>
                        </div>
                        {addingSkillTier !== key && (
                          <button onClick={() => setAddingSkillTier(key)}
                            className="flex items-center gap-1 text-[13px] text-white/40 hover:text-white/70 transition-colors">
                            <Plus size={12} /> Add a skill
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {form.skills[key].map(skill => (
                          <div key={skill} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white/75"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span>{skill}</span>
                            <button onClick={() => removeSkill(skill, key)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-white/35 hover:text-red-400">
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                        {addingSkillTier === key && (
                          <div className="flex items-center gap-1.5">
                            <input autoFocus value={newSkill} onChange={e => setNewSkill(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") addSkill(key); if (e.key === "Escape") { setAddingSkillTier(null); setNewSkill(""); } }}
                              className="px-3 py-1.5 rounded-full text-sm text-white outline-none w-32"
                              style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${color}60`, caretColor: '#1ed25e' }}
                              placeholder="Skill name" />
                            <button onClick={() => addSkill(key)}
                              className="text-xs px-2.5 py-1.5 rounded-full font-semibold"
                              style={{ background: color, color: '#18181b' }}>Add</button>
                            <button onClick={() => { setAddingSkillTier(null); setNewSkill(""); }}
                              className="text-white/30 hover:text-white/60 transition-colors"><X size={13} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Salary ── */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
                {/* AI banner */}
                <div className="flex items-stretch overflow-hidden rounded-[12px]"
                  style={{ background: 'rgba(119,220,155,0.05)', border: '1px solid #4ad179' }}>
                  <div className="w-2 flex-shrink-0" style={{ background: '#4ad179' }} />
                  <div className="flex items-start gap-2 px-3 py-[10px]">
                    <span className="text-[#4ad179] flex-shrink-0 mt-0.5 text-base">✦</span>
                    <p className="text-base text-[#d2f3de] leading-6">
                      Enter your salary range. trAIn will give you feedback based on market insights.
                    </p>
                  </div>
                </div>
                <p className="text-[20px] font-semibold text-[#fafafa]">Salary Range</p>
                <div className="rounded-[10px] p-4 flex flex-col gap-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Lower Boundary", key: "salaryMin" as const, placeholder: "SAR 5,000" },
                      { label: "Upper Boundary", key: "salaryMax" as const, placeholder: "SAR 5,000" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className="flex flex-col gap-2">
                        <label className="text-[14px] text-[#d4d4d8]">{label}</label>
                        <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                          className="h-[54px] w-full px-3 rounded-[10px] text-base text-white outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', caretColor: '#1ed25e' }} />
                      </div>
                    ))}
                  </div>
                  {belowMarket && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-[10px]"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-300 leading-relaxed">
                        Below market: {form.title || "this role"} median is {market.label}. This may reduce your candidate pool by ~40%.
                      </p>
                    </div>
                  )}
                  {!belowMarket && (form.salaryMin || form.salaryMax) && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-[10px]"
                      style={{ background: 'rgba(29,197,88,0.08)', border: '1px solid rgba(29,197,88,0.25)' }}>
                      <span className="text-[#1ed25e] flex-shrink-0">✓</span>
                      <p className="text-sm text-[#d2f3de] leading-relaxed">Competitive range. Market benchmark: {market.label}.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Step 5: Summary ── */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
                <p className="text-[20px] font-semibold text-[#fafafa]">Summary</p>
                <div className="rounded-[10px] p-4 flex flex-col gap-3 min-h-[180px]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-base font-semibold text-white">{form.title || "Untitled role"}</p>
                  <p className="text-sm text-white/45">
                    {[form.department, form.location,
                      form.salaryMin && form.salaryMax
                        ? `SAR ${form.salaryMin} – ${form.salaryMax}`
                        : market.label
                    ].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-base text-[#a1a1aa] leading-6">{form.description}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save error */}
          {saveError && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl flex-shrink-0"
              style={{ background: "var(--error-surface-subtle)", border: "1px solid var(--error-border-subtle)" }}>
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">{saveError}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2 flex-shrink-0">
            {step > 1 ? (
              <button onClick={goBack} disabled={saving}
                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
                <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> Back
              </button>
            ) : <div />}
            <button
              onClick={step === TOTAL_STEPS ? handleFinish : goNext}
              disabled={(step === 1 && !step1Valid) || saving}
              className="flex items-center gap-2 h-[52px] px-4 rounded-[10px] text-base font-semibold transition-all"
              style={{
                background: '#1dc558',
                color: '#18181b',
                opacity: ((step === 1 && !step1Valid) || saving) ? 0.5 : 1,
              }}>
              {step === TOTAL_STEPS
                ? saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Finish"
                : <>Continue <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
  );
}

interface EmployerDashboardProps {
  onBack?: () => void;
}

type NavTab = "home" | "hiring" | "workforce";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  type?: "text" | "job-posted";
  job?: PostedJob;
  options?: string[];
  jobCard?: {
    title: string;
    location: string;
    description: string;
    skills: string[];
    mustHave: string[];
    preferred: string[];
    niceToHave: string[];
  };
}

/* ── Options parsed from the loaded prompt markdown ──────────────────────── */
interface PromptStepOptions {
  step1: string[];
  step2: string[];
  step3: string[];
}

/* ── Mobeus Platform helpers (for deployment on mobeus.ai) ────────────────── */

/** Loads the employer system prompt from the public folder at runtime. */
async function loadEmployerPrompt(): Promise<string> {
  const res = await fetch("/prompts/speak-llm-system-prompt.md");
  if (!res.ok) throw new Error("Failed to load speak-llm-system-prompt.md");
  return res.text();
}

/**
 * Suppresses all audio/video for the employer session.
 * Uses MutationObserver to mute any dynamically added media elements.
 */
function startMuteLoop(): () => void {
  // Mute all existing media elements
  document.querySelectorAll("audio, video").forEach((el) => {
    (el as HTMLMediaElement).muted = true;
    (el as HTMLMediaElement).volume = 0;
  });

  // Watch for new media elements and mute them immediately
  const obs = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLMediaElement) {
          node.muted = true;
          node.volume = 0;
        } else if (node instanceof HTMLElement) {
          node.querySelectorAll("audio, video").forEach((el) => {
            (el as HTMLMediaElement).muted = true;
            (el as HTMLMediaElement).volume = 0;
          });
        }
      });
    }
  });
  
  obs.observe(document.body, { subtree: true, childList: true });
  return () => { obs.disconnect(); };
}

/** 
 * Sends a visible user message to the AI via the Zustand store's LiveKit room.
 */
async function sendChatText(text: string) {
  const { room } = useVoiceSessionStore.getState();
  if (!room?.localParticipant) {
    console.warn('[Employer] No room available for sending message — session not yet connected');
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    await room.localParticipant.sendText(trimmed, { topic: 'lk.chat' });
    console.log('[Employer] Message sent:', trimmed);
  } catch (error) {
    console.error('[Employer] Failed to send message:', error);
  }
}


/* ── Option / job-data parsing ───────────────────────────────────────────── */

/** Strips [OPTIONS: ...] from text and returns the cleaned text + option list. */
function parseInlineOptions(text: string): { displayText: string; options: string[] } {
  const match = text.match(/\[OPTIONS:\s*([^\]]+)\]/i);
  if (!match) return { displayText: text, options: [] };
  const options = match[1].split("|").map((s) => s.trim()).filter(Boolean);
  return { displayText: text.replace(/\[OPTIONS:[^\]]*\]/gi, "").trim(), options };
}

/**
 * Reads every Step N block from the prompt and extracts the [OPTIONS: ...] list.
 * No option values are hardcoded here — they come from the file.
 */
function extractOptionsFromPrompt(promptText: string): PromptStepOptions {
  const getStepOptions = (stepNum: number): string[] => {
    const pattern = new RegExp(
      `\\*\\*Step\\s+${stepNum}[^*]*\\*\\*[\\s\\S]{0,600}?\\[OPTIONS:\\s*([^\\]]+)\\]`,
      "i"
    );
    const match = promptText.match(pattern);
    if (!match) return [];
    return match[1].split("|").map((s) => s.trim()).filter(Boolean);
  };
  return { step1: getStepOptions(1), step2: getStepOptions(2), step3: getStepOptions(3) };
}

/**
 * When the SDK strips [OPTIONS: ...] from the AI reply, fall back to matching
 * the question text against known patterns and return the prompt-sourced options.
 */
function resolveFallbackOptions(text: string, opts: PromptStepOptions): string[] {
  // Step 1 — Role question
  if (/what (type of )?role|which role|role are you (hiring|looking)|role.*hire for|type of role are you hiring/i.test(text)) return opts.step1;
  // Step 2 — Experience / grade / seniority question (broad: covers context-aware phrasings)
  if (/experience level|seniority|senior grade|junior|mid.level|appropriate for the|which grade|focus on candidates (who are )?appropriate/i.test(text)) return opts.step2;
  // Step 3 — Location question (broad: covers "Where is this role based?", "Which location are you hiring for?", etc.)
  if (/which location|where is (this|the) role|location are you hiring|where are you hiring|role based\?|hiring for\?/i.test(text)) return opts.step3;
  return [];
}

/** Returns which job field the AI is currently asking for. */
function resolveCurrentStep(text: string): "role" | "experience" | "location" | null {
  if (/what (type of )?role|which role|role are you (hiring|looking)|role.*hire for|type of role are you hiring/i.test(text)) return "role";
  if (/experience level|seniority|senior grade|junior|mid.level|appropriate for the|which grade|focus on candidates (who are )?appropriate/i.test(text)) return "experience";
  if (/which location|where is (this|the) role|location are you hiring|where are you hiring|role based\?|hiring for\?/i.test(text)) return "location";
  return null;
}

/** Strips year-range suffixes like "(0–2 yrs)" or "(5+ yrs)" from a title. */
function cleanTitle(t: string): string {
  return t.replace(/\s*\(\d+[–\-+]?\d*\s*yrs?\)/gi, "").replace(/\s+/g, " ").trim();
}

/**
 * Parses a [JOB_DATA: ...] marker emitted by the AI.
 * Handles both quoted (key="value") and unquoted (key=value) formats.
 * Returns null if the marker is absent or the title is an unfilled placeholder.
 */
function parseJobData(text: string): {
  displayText: string;
  jobCard: NonNullable<ChatMessage["jobCard"]> | null;
} {
  const match = text.match(/`?\[JOB_DATA:\s*([\s\S]*?)\]`?/i);
  if (!match) return { displayText: text, jobCard: null };

  // Strip the marker and clean up any orphaned wrapping characters the AI
  // may have added around it (parentheses, backticks, stray brackets).
  const displayText = text
    .replace(/`?\[JOB_DATA:[\s\S]*?\]`?/gi, "")
    .replace(/[\s([{]*$/, "")   // trailing orphaned open-brackets / whitespace
    .replace(/[)\]}`]+$/, "")   // trailing orphaned close-brackets
    .trim();
  const raw = match[1];
  const get = (key: string) => {
    const quoted = raw.match(new RegExp(`${key}="([^"]*)"`, "i"));
    if (quoted) return quoted[1].trim();
    const unquoted = raw.match(new RegExp(`${key}=([^|\\]]+)`, "i"));
    return unquoted ? unquoted[1].trim() : "";
  };
  const parseList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const title = cleanTitle(get("title"));
  if (!title || /^\[|seniority|role name/i.test(title)) return { displayText: text, jobCard: null };

  const location = get("location") || "Remote";
  const description = get("description");
  const mustHave = parseList(get("must_have"));
  const preferred = parseList(get("preferred"));
  const niceToHave = parseList(get("nice_to_have"));

  return {
    displayText,
    jobCard: { title, location, description, skills: mustHave.slice(0, 3), mustHave, preferred, niceToHave },
  };
}

/* ── Sidebar icons ───────────────────────────────────────────────────────── */
const sidebarIcons = [
  { icon: Search, label: "Search" },
  { icon: MapPin, label: "Locations" },
  { icon: Mail, label: "Messages" },
  { icon: GraduationCap, label: "Training" },
  { icon: Plus, label: "New" },
];

/* ── Sparkle icon ────────────────────────────────────────────────────────── */
const SparkleIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1.5 L13.6 6.8 L19 8 L13.6 9.2 L12 14.5 L10.4 9.2 L5 8 L10.4 6.8 Z" />
    <path d="M5 15 L5.9 17.6 L8.5 18.5 L5.9 19.4 L5 22 L4.1 19.4 L1.5 18.5 L4.1 17.6 Z" opacity="0.7" />
    <path d="M19 12.5 L19.7 14.6 L21.8 15.3 L19.7 16 L19 18.1 L18.3 16 L16.2 15.3 L18.3 14.6 Z" opacity="0.5" />
  </svg>
);


/* ── Action card ─────────────────────────────────────────────────────────── */
function ActionCard({ icon, label, color, onClick }: {
  icon: React.ReactNode; label: string; color: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-left flex-1 min-w-0"
      style={{
        background: hovered ? "var(--surface-hover)" : "var(--surface-elevated)",
        border: hovered ? `1px solid ${color}30` : "1px solid var(--border-faint)",
        backdropFilter: "blur(12px)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span style={{
          color,
          background: `${color}18`,
          borderRadius: 8,
          padding: "5px 6px",
          display: "flex",
          alignItems: "center",
        }} className="flex-shrink-0">{icon}</span>
        <span className="text-sm font-medium text-white truncate">{label}</span>
      </div>
      <ArrowRight size={13} className="flex-shrink-0 text-white/25" />
    </button>
  );
}

/* ── Suggestion chip — Figma style ───────────────────────────────────────── */
function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center h-10 px-4 rounded-full text-base font-normal text-[#f4f4f5] whitespace-nowrap hover:bg-white/10 transition-all duration-200 flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      {label}
    </button>
  );
}

/* ── Hiring tab with sub-navigation ──────────────────────────────────────── */
interface SelectedJob {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  posted_at?: string;
}

function toRelativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)       return "just now";
  if (diff < 3600)     return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)   return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000)  return `${Math.floor(diff / 604800)}w`;
  return `${Math.floor(diff / 2592000)}mo`;
}

function toSidebarJobs(apiJobs: JobPostingResponse[]): SidebarJob[] {
  return apiJobs.map((j) => ({
    id: j.id,
    title: j.title,
    department: j.department || undefined,
    location: j.location || undefined,
    postedAt: toRelativeDate(j.created_at),
    status: j.status,
  }));
}

function HiringTabContent({
  onPostJob,
  prefetchedJobs,
  prefetchedJobsLoading,
}: {
  onPostJob?: () => void;
  /** Jobs pre-fetched by the parent on mount — skips the internal fetch when provided. */
  prefetchedJobs?: JobPostingResponse[];
  prefetchedJobsLoading?: boolean;
}) {
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);
  // Seed local state from pre-fetched data immediately (no loading flash).
  const [apiJobs, setApiJobs] = useState<JobPostingResponse[]>(prefetchedJobs ?? []);
  const [jobsLoading, setJobsLoading] = useState(prefetchedJobs !== undefined ? (prefetchedJobsLoading ?? false) : true);

  // Keep local state in sync if the parent's pre-fetch completes after mount.
  useEffect(() => {
    if (prefetchedJobs !== undefined) {
      setApiJobs(prefetchedJobs);
      setJobsLoading(prefetchedJobsLoading ?? false);
    }
  }, [prefetchedJobs, prefetchedJobsLoading]);

  // Only run an internal fetch when no pre-fetched data was supplied.
  // Uses the direct REST client (no agent session required).
  useEffect(() => {
    if (prefetchedJobs !== undefined) return;
    let cancelled = false;
    setJobsLoading(true);

    import('@/lib/employerApi')
      .then(({ fetchJobPostings }) => fetchJobPostings(50, 0))
      .then((data) => { if (!cancelled) setApiJobs(data.items ?? []); })
      .catch((e: unknown) => console.error("[HiringTabContent] fetch jobs:", e))
      .finally(() => { if (!cancelled) setJobsLoading(false); });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sidebarJobs = toSidebarJobs(apiJobs);

  const handleSelectJob = useCallback(
    (id: string, job: { title: string; department: string; location: string; status: string; posted_at?: string }) => {
      setSelectedJob({ id, ...job });
    },
    [],
  );

  const handleBackToHiring = useCallback(() => {
    setSelectedJob(null);
  }, []);

  if (selectedJob) {
    return (
      <JobPostingTemplate
        jobPosting={selectedJob}
        postingId={selectedJob.id}
        onNavigateToHiring={handleBackToHiring}
        jobs={sidebarJobs}
        onSelectJob={(id, job) => {
          setSelectedJob({
            id,
            title: job.title,
            department: job.department || "",
            location: job.location || "",
            status: job.status,
            posted_at: job.postedAt,
          });
        }}
      />
    );
  }

  return <HiringPage onSelectJob={handleSelectJob} apiJobs={apiJobs} apiJobsLoading={jobsLoading} onPostJob={onPostJob} />;
}

function WorkforceTabContent() {
  return <WorkforcePage />;
}

/* ── Chat input bar ──────────────────────────────────────────────────────── */
function ChatInputBar({
  onSend,
  waiting = false,
  placeholder = "Ask anything",
}: {
  onSend: (text: string) => void;
  waiting?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const msg = value.trim();
    if (!msg || waiting) return;
    onSend(msg);
    setValue("");
  };

  return (
    <div className="w-full overflow-hidden flex flex-col justify-between p-6 cursor-text"
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        minHeight: 96,
      }}
      onClick={() => document.getElementById('employer-chat-input')?.focus()}
    >
      <input
        id="employer-chat-input"
        type="text"
        value={value}
        disabled={waiting}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="w-full bg-transparent text-base text-white outline-none disabled:cursor-wait"
        style={{ color: value ? '#fff' : undefined, caretColor: '#1ed25e' }}
      />
      <style>{`#employer-chat-input::placeholder { color: rgba(113,113,123,1); }`}</style>
      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          onClick={(e) => { e.stopPropagation(); }}>
          <Plus size={20} />
        </button>
        <AnimatePresence mode="wait">
          {waiting ? (
            <motion.div key="spin" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Loader2 size={16} className="animate-spin" style={{ color: '#1ed25e' }} />
            </motion.div>
          ) : value.trim() ? (
            <motion.button key="send"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); submit(); }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-black transition-colors"
              style={{ background: '#1ed25e' }}>
              <ArrowUp size={15} />
            </motion.button>
          ) : (
            <motion.div key="wave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center text-white/35">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="9" width="2.5" height="6" rx="1.25" opacity="0.4" />
                <rect x="6" y="6" width="2.5" height="12" rx="1.25" opacity="0.6" />
                <rect x="10" y="3" width="2.5" height="18" rx="1.25" />
                <rect x="14" y="6" width="2.5" height="12" rx="1.25" opacity="0.6" />
                <rect x="18" y="9" width="2.5" height="6" rx="1.25" opacity="0.4" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Chat conversation view ──────────────────────────────────────────────── */
function ChatView({
  messages,
  isTyping,
  onSend,
  onChipClick,
  onCreateJobPosting,
  sessionReady = true,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string) => void;
  onChipClick: (chip: string) => void;
  onCreateJobPosting: (jobCard: NonNullable<ChatMessage["jobCard"]>) => Promise<void>;
  sessionReady?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Tracks which job card message is currently being posted to show loading state.
  const [postingMsgId, setPostingMsgId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 sm:px-12 pt-6 pb-4 space-y-5">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[380px] rounded-2xl px-4 py-3"
                    style={{ background: "var(--surface-muted)", border: "1px solid var(--surface-faint)" }}>
                    <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ) : msg.type === "job-posted" && msg.job ? (
                <div className="flex justify-start">
                  <div className="flex flex-col gap-2 max-w-[480px] w-full">
                    <p className="text-sm text-white/55">Success! This role has been posted successfully.</p>
                    <div className="flex items-start justify-between px-4 py-3.5 rounded-2xl"
                      style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-soft)" }}>
                      <div>
                        <p className="text-sm font-semibold text-white">{msg.job.title}</p>
                        <p className="text-xs text-white/35 mt-0.5">
                          {[msg.job.department, msg.job.location, "Just Now"].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <button className="text-white/30 hover:text-white/60 transition-colors mt-0.5">
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start flex-col gap-3 max-w-[520px]">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {msg.text}
                  </p>
                  {/* Option chips */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.options.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => onChipClick(chip)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/70 hover:text-white/95 hover:border-white/25 transition-all duration-150"
                          style={{ background: "var(--surface-elevated)", border: "1px solid var(--glass-btn-border)" }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Inline job card — styled per Figma node 3509-48092 */}
                  {msg.jobCard && (
                    <div
                      className="flex flex-col gap-4 p-4 rounded-[12px] shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      {/* Title + Location */}
                      <div className="flex flex-col gap-1">
                        <p className="text-base font-semibold leading-6 text-[#fafafa]">
                          {msg.jobCard.title}
                        </p>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" style={{ color: "#d4d4d8" }} />
                          <span className="text-sm leading-5 text-[#d4d4d8]">
                            {msg.jobCard.location}
                          </span>
                        </div>
                      </div>

                      {/* Skill chips */}
                      {msg.jobCard.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                          {msg.jobCard.skills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="px-[11px] py-1 rounded-[8px] text-[13px] leading-[19.5px] text-[#d4d4d8] whitespace-nowrap"
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* CTA button — semi-transparent green, rounded-full */}
                      <button
                        onClick={async () => {
                          if (postingMsgId) return;
                          setPostingMsgId(msg.id);
                          try {
                            await onCreateJobPosting(msg.jobCard!);
                          } finally {
                            setPostingMsgId(null);
                          }
                        }}
                        disabled={!!postingMsgId}
                        className="h-10 w-full rounded-full text-base font-semibold text-[#f4f4f5] transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                        style={{ background: "rgba(29,197,88,0.5)" }}
                      >
                        {postingMsgId === msg.id && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {postingMsgId === msg.id ? "Posting…" : "Create Job Posting"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div key="typing"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex justify-start">
              <div className="flex items-center gap-1.5 py-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/35 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pinned input */}
      <div className="px-5 sm:px-12 pb-6 pt-3 flex-shrink-0">
        <ChatInputBar onSend={onSend} waiting={isTyping || !sessionReady}
          placeholder={!sessionReady ? "Connecting to AI…" : "Ask anything"} />
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function EmployerDashboard({ onBack }: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [hiringKey, setHiringKey] = useState(0);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // sessionReady is derived from the Zustand store's real connection state
  const sessionState = useVoiceSessionStore((s) => s.sessionState);
  const sessionReady = sessionState === 'connected';
  const [wizardInitialData, setWizardInitialData] = useState<Partial<JobFormData>>({});

  // Pre-fetch job postings in the background the moment the dashboard mounts
  // so the Hiring tab shows data instantly (no loading flash on tab switch).
  // Uses the direct REST client — independent of the Mobeus agent session.
  const [prefetchedJobs, setPrefetchedJobs] = useState<JobPostingResponse[] | undefined>(undefined);
  const [prefetchedJobsLoading, setPrefetchedJobsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    import('@/lib/employerApi')
      .then(({ fetchJobPostings }) => fetchJobPostings(50, 0))
      .then((data) => { if (!cancelled) setPrefetchedJobs(data.items ?? []); })
      .catch(() => { if (!cancelled) setPrefetchedJobs([]); }) // silent fail — HiringTabContent will show empty state
      .finally(() => { if (!cancelled) setPrefetchedJobsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const sessionStartedRef = useRef(false);
  const muteCleanupRef = useRef<(() => void) | null>(null);
  const promptOptionsRef = useRef<PromptStepOptions>({ step1: [], step2: [], step3: [] });
  const collectedJobRef = useRef<{ role?: string; experience?: string; location?: string }>({});
  const pendingFieldRef = useRef<"role" | "experience" | "location" | null>(null);
  // Set to true once a job card has been emitted; suppresses any AI follow-up
  // messages (description paragraphs etc.) that arrive in later speech turns.
  const jobCardShownRef = useRef(false);

  // useTeleSpeech captures the AI's text via the LiveKit data channel
  // (avatar_talking_message → avatar_start_talking → avatar_stop_talking).
  // Avatar stays connected so the data channel is alive; all audio is
  // suppressed by the mute loop (volume=0, muted=true on all elements).
  const { speech, isTalking } = useTeleSpeech();
  const prevIsTalkingRef = useRef(false);
  // Accumulates ALL speech chunks for the current AI response. Long replies
  // (e.g. full job postings) arrive as multiple start/stop talking cycles.
  const chunkBufferRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Safety timeout: cleared when AI actually responds; fires after 30 s of silence.
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced display: collect every speech chunk and only commit the combined
  // response once the avatar has been silent for 900 ms.
  const flushResponse = useCallback(() => {
    // Clear the 30-second safety timeout — a real response arrived.
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    const full = chunkBufferRef.current.join(" ").trim();
    if (!full || !sessionReady) { chunkBufferRef.current = []; return; }

    // If [JOB_DATA: is present but the closing ] hasn't arrived yet, the SDK
    // split the marker across speech cycles. Keep the buffer and wait another
    // 1.5 s for the rest of the marker before flushing.
    if (/\[JOB_DATA:/i.test(full) && !/\[JOB_DATA:[\s\S]*?\]/i.test(full)) {
      silenceTimerRef.current = setTimeout(flushResponse, 1500);
      return;
    }

    chunkBufferRef.current = [];

    // If a job card was already shown, suppress any AI follow-up messages
    // (e.g. description paragraphs the AI sends in a second speech turn).
    // Reset the flag only when the AI starts a brand-new role question.
    if (jobCardShownRef.current) {
      if (/what role|which role|role are you (hiring|looking)|role.*hire for/i.test(full)) {
        jobCardShownRef.current = false; // new conversation — allow messages again
      } else {
        setIsTyping(false);
        return;
      }
    }

    // ── 1. Try to parse [JOB_DATA: ...] — primary job-card trigger ────────────
    const { displayText: afterJobData, jobCard } = parseJobData(full);
    if (jobCard) {
      // Keep only the first two sentences (the short confirmation); discard any
      // description the AI appended before or after the marker.
      const confirmText = (afterJobData.match(/(?:[^.!?]*[.!?]){1,2}/) ?? [""])[0].trim();
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`, role: "assistant",
        text: confirmText,
        jobCard,
      }]);
      jobCardShownRef.current = true;
      setIsTyping(false);
      return;
    }

    // ── 2. Fallback: SDK stripped [JOB_DATA:...] but AI confirmed it's ready ──
    // Only fire when all three fields were collected in THIS conversation to
    // prevent stale data from a previous conversation creating a wrong card.
    if (/opening the posting form|pre-filled now/i.test(full)) {
      const c = collectedJobRef.current;
      if (c.role && c.experience && c.location) {
        const title = cleanTitle([c.experience, c.role].filter(Boolean).join(" ")) || "New Role";
        // Keep only the first two sentences of the confirmation; strip anything after.
        const confirmText = (full.match(/(?:[^.!?]*[.!?]){1,2}/) ?? [""])[0].trim();
        setMessages((prev) => [...prev, {
          id: `ai-${Date.now()}`, role: "assistant", text: confirmText,
          jobCard: { title, location: c.location!, description: "", skills: [], mustHave: [], preferred: [], niceToHave: [] },
        }]);
        jobCardShownRef.current = true;
        setIsTyping(false);
        return;
      }
      // Collected data incomplete — fall through to show as plain text,
      // the [JOB_DATA:] chunk will arrive in the next speech turn.
    }

    // ── 3. Normal message — resolve chips and track current step ─────────────
    const { displayText, options: inlineOptions } = parseInlineOptions(full);
    const options = inlineOptions.length > 0
      ? inlineOptions
      : resolveFallbackOptions(full, promptOptionsRef.current);

    // If the AI sent ONLY [OPTIONS: ...] with no preceding text, infer the
    // question from the chip content so the chat never renders a blank message.
    const inferredText = (() => {
      if (displayText) return displayText;
      if (options.some(o => /junior|mid-level|senior/i.test(o))) return "What experience level are you looking for?";
      if (options.some(o => /riyadh|jeddah|remote/i.test(o))) return "Where is this role based?";
      if (options.some(o => /ai developer|cloud engineer|backend engineer|data analyst/i.test(o))) return "What role are you hiring for?";
      return full;
    })();

    const step = resolveCurrentStep(inferredText);
    if (step === "role") {
      // New job posting flow starting — clear any data collected in a prior conversation
      collectedJobRef.current = {};
    }
    if (step) pendingFieldRef.current = step;

    // Deduplicate: if the AI sends the same question+chips in two speech cycles
    // (text cycle + options-only cycle), discard the second one.
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      const sameOptions = options.length > 0
        && last?.role === "assistant"
        && last.options?.join("|") === options.join("|");
      if (sameOptions) return prev; // already shown — skip duplicate
      return [...prev, {
        id: `ai-${Date.now()}`, role: "assistant", text: inferredText,
        ...(options.length ? { options } : {}),
      }];
    });
    setIsTyping(false);
  }, [sessionReady]);

  useEffect(() => {
    if (isTalking) {
      // New chunk starting — cancel pending flush so we keep accumulating
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (speech) chunkBufferRef.current.push(speech);
      // Re-show loading indicator when a new chunk starts (the AI may send a
      // short acknowledgement like "Understood." then pause before the full
      // response; flushResponse would have cleared isTyping during that gap).
      if (sessionReady) setIsTyping(true);
    }
    if (!isTalking && prevIsTalkingRef.current) {
      // Avatar just went silent — wait 900 ms before committing. If another
      // chunk starts within that window the timer is cancelled above.
      silenceTimerRef.current = setTimeout(flushResponse, 900);
    }
    prevIsTalkingRef.current = isTalking;
  }, [isTalking, speech, flushResponse, sessionReady]);

  /* Block navigateToSection — employer AI must never trigger talent templates */
  useEffect(() => {
    // Register a no-op handler to prevent navigation
    const room = useVoiceSessionStore.getState().room;
    if (room?.localParticipant) {
      try {
        room.localParticipant.registerRpcMethod('navigateToSection', async () => {
          console.warn("[EmployerDashboard] navigateToSection blocked");
          return JSON.stringify({ disableNewResponseCreation: false });
        });
      } catch (err) {
        console.warn("[EmployerDashboard] Could not register RPC method:", err);
      }
    }
  }, []);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      muteCleanupRef.current?.();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      console.log('[Employer] Cleaned up employer mode');
    };
  }, []);

  /* Suppress all Mobeus platform avatar/scene visuals on every render.
     Must run on mount (chatMode=false) — platform injects overlay elements
     before the user enters chat, which covers main content at z-0. */
  useEffect(() => {
    const room = useVoiceSessionStore.getState().room;

    // Mute all audio via LiveKit if room is available
    if (room) {
      try {
        // Ensure mic stays disabled
        if (room.localParticipant) {
          room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
        }
        
        // Mute all remote audio tracks
        if (room.remoteParticipants) {
          room.remoteParticipants.forEach((participant: any) => {
            if (participant.audioTrackPublications) {
              participant.audioTrackPublications.forEach((pub: any) => {
                if (pub.track) {
                  pub.track.detach();
                }
              });
            }
          });
        }
      } catch (err) {
        console.warn('[Employer] Failed to mute audio:', err);
      }
    }

    // Hide any avatar-related UI elements
    const avatarSelectors = [
      '[data-layer="bg"]', 
      '[data-layer="avatar"]', 
      '[class*="voice-widget"]', 
      '[class*="avatar-container"]', 
      '[class*="heygen"]', 
      '[id*="avatar"]'
    ];

    const hideMatching = (root: ParentNode) => {
      // Mute all media elements
      root.querySelectorAll("audio, video").forEach((el) => {
        (el as HTMLMediaElement).muted = true;
        (el as HTMLMediaElement).volume = 0;
      });
      
      // Hide avatar UI elements
      avatarSelectors.forEach((sel) => {
        root.querySelectorAll(sel).forEach((el) => { 
          (el as HTMLElement).style.display = "none"; 
        });
      });
    };

    hideMatching(document);

    // Watch for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLMediaElement) {
            node.muted = true;
            node.volume = 0;
          } else if (node instanceof HTMLElement) {
            hideMatching(node);
          }
        });
      }
    });
    
    observer.observe(document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [chatMode]);

  /* Connect the AI session on mount via the Zustand store */
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    // Register site functions (e.g. cacheJobApplicants) for agent RPC calls
    registerSiteFunctions();

    // Start mute loop immediately to suppress any platform audio/video overlays
    muteCleanupRef.current = startMuteLoop();

    // Load the employer system prompt for fallback option-chip extraction (non-fatal)
    loadEmployerPrompt()
      .then((prompt) => { promptOptionsRef.current = extractOptionsFromPrompt(prompt); })
      .catch(() => {});

    // Connect via the Zustand store — uses NEXT_PUBLIC_WIDGET_API_KEY from .env.local
    const { preWarm, connect } = useVoiceSessionStore.getState();
    preWarm()
      .then(() => connect())
      .then(() => {
        // Force microphone off — this is a text-only employer chat
        const { room } = useVoiceSessionStore.getState();
        room?.localParticipant?.setMicrophoneEnabled(false).catch(() => {});
        // Discard any speech chunks captured during the connect window
        setTimeout(() => {
          chunkBufferRef.current = [];
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          console.log('[Employer] Session ready for chat');
        }, 1500);
      })
      .catch((err) => {
        console.error('[Employer] Connection failed:', err);
      });
  }, []);

  const handleSend = useCallback((text: string) => {
    const field = pendingFieldRef.current;
    if (field) {
      collectedJobRef.current[field] = text;
      pendingFieldRef.current = null;
    }
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setChatMode(true);
    setIsTyping(true);
    chunkBufferRef.current = [];
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    // Safety net: if no AI transcript arrives within 30 s, stop spinning so
    // the user isn't stuck with a permanently disabled input.
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 30000);
    sendChatText(text);
  }, []);

  const handleChipClick = useCallback((chip: string) => {
    handleSend(chip);
  }, [handleSend]);

  const handleCreateJobPosting = useCallback(async (jobCard: NonNullable<ChatMessage["jobCard"]>) => {
    // Send the same structured message the wizard's Finish button sends.
    // The Mobeus agent's system prompt parses "Create job posting with the
    // following details:" and calls create_job_posting via MCP function-calling.
    const lines: string[] = ["Create job posting with the following details:"];
    if (jobCard.title)                  lines.push(`title: ${jobCard.title}`);
    if (jobCard.location)               lines.push(`location: ${jobCard.location}`);
    if (jobCard.description)            lines.push(`description: ${jobCard.description}`);
    if (jobCard.mustHave?.length)       lines.push(`must_have: ${jobCard.mustHave.join(", ")}`);
    if (jobCard.preferred?.length)      lines.push(`preferred: ${jobCard.preferred.join(", ")}`);
    if (jobCard.niceToHave?.length)     lines.push(`nice_to_have: ${jobCard.niceToHave.join(", ")}`);
    lines.push("posted_by: Omar S.");

    await useVoiceSessionStore.getState().sendTextMessage(lines.join("\n"));

    // Optimistic UI: show a job-posted card immediately; the AI's textual
    // confirmation will follow in a subsequent chat message.
    setMessages((prev) => [
      ...prev,
      {
        id: `posted-${Date.now()}`,
        role: "assistant" as const,
        type: "job-posted" as const,
        text: "",
        job: {
          title: jobCard.title,
          department: "",
          location: jobCard.location,
          postedAt: new Date(),
        },
      },
    ]);
  }, []);


  return (
    <div className="relative w-screen h-screen overflow-hidden flex" style={{ background: "var(--bg)", zIndex: 100, position: "relative" }}>

      {/* Background — matches Figma Widescreen background */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: '#09090b' }} />
      {/* Large blurred green glow — top-right */}
      <div className="absolute pointer-events-none" style={{
        width: 712, height: 712, top: -60, right: -80,
        background: 'radial-gradient(ellipse at center, rgba(29,197,88,0.30) 0%, rgba(0,110,55,0.16) 40%, transparent 70%)',
        filter: 'blur(90px)',
      }} />
      {/* Subtle bottom-left ambient tint */}
      <div className="absolute pointer-events-none" style={{
        width: 900, height: 900, bottom: '-30%', left: '-20%',
        background: 'radial-gradient(ellipse at center, rgba(0,60,35,0.18) 0%, transparent 60%)',
        filter: 'blur(90px)',
      }} />

      {/* Left sidebar — Figma pill container */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}
        className="hidden md:flex relative z-20 flex-col items-center justify-center"
        style={{ width: 68, flexShrink: 0 }}>
        <div className="flex flex-col items-center gap-2 p-2 rounded-[100px]"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          {sidebarIcons.map(({ icon: Icon, label }, i) => (
            <button key={label} aria-label={label}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={i === 1
                ? { background: 'rgba(30,210,94,0.15)', color: '#1ed25e' }
                : { color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={(e) => { if (i !== 1) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={(e) => { if (i !== 1) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}>
              <Icon size={20} />
            </button>
          ))}
        </div>
      </motion.aside>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* Header — Figma Employer Header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
          className="relative z-20 flex items-center justify-between px-6 sm:px-8 pt-4 pb-3 flex-shrink-0">

          {/* Logo — trAIn with green AI */}
          <div className="flex items-center min-w-0" style={{ flex: '1 0 0' }}>
            <span className="font-bold tracking-tight text-white select-none"
              style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.02em' }}>
              tr<span style={{ color: '#1dc558' }}>AI</span>n
            </span>
          </div>

          {/* Center nav pill — Figma Top Nav */}
          <div className="hidden sm:flex items-center p-2 gap-2 rounded-[100px] flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.05)',
              boxShadow: '0px 0px 48px 48px rgba(9,9,11,0.25)',
            }}>
            {(["home", "hiring", "workforce"] as NavTab[]).map((tab) => (
              <button key={tab}
                onClick={() => {
                  if (tab === "hiring" && activeTab === "hiring") setHiringKey((k) => k + 1);
                  setActiveTab(tab);
                  setChatMode(false);
                }}
                className={cn(
                  "flex items-center justify-center h-10 rounded-[100px] font-semibold text-base transition-all duration-200 whitespace-nowrap",
                  "w-[110px] sm:w-[132px]",
                  activeTab === tab && !chatMode
                    ? "text-[#f4f4f5]"
                    : "text-[#f4f4f5]/50 hover:text-[#f4f4f5]/75",
                )}
                style={activeTab === tab && !chatMode
                  ? { background: 'rgba(255,255,255,0.10)' }
                  : {}}>
                {tab === "home" ? "Home" : tab === "hiring" ? "Hiring" : "Workforce"}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3" style={{ flex: '1 0 0', justifyContent: 'flex-end' }}>
            {chatMode && (
              <button onClick={() => setChatMode(false)}
                className="text-xs text-white/40 hover:text-white/70 transition-colors mr-1">
                ← Dashboard
              </button>
            )}
            {!chatMode && onBack && (
              <button onClick={onBack}
                className="hidden sm:flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.08)' }}>
                ← Switch role
              </button>
            )}
            {/* Notification bell */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Bell size={18} className="text-white/70" />
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-[#09090b]"
                style={{ background: '#ff4040' }} />
            </div>
            {/* User profile */}
            <button className="flex items-center gap-3 rounded-[100px] pl-2 pr-3 py-1.5 hover:bg-white/5 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold"
                style={{ background: 'linear-gradient(135deg, #d2f3de, #a0e8b8)' }}>
                <span style={{ color: '#09090b' }}>O</span>
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
                <span className="text-[14px] font-bold text-[#fafafa] leading-5">Omar S.</span>
                <span className="text-[12px] text-[#fafafa]/50 leading-4">Hiring Manager</span>
              </div>
              <ChevronDown size={14} className="text-white/40 hidden sm:block" />
            </button>
          </div>
        </motion.header>

        {/* Mobile tab nav */}
        {!chatMode && (
          <div className="sm:hidden flex items-center gap-1 px-5 pb-2 flex-shrink-0">
            {(["home", "hiring", "workforce"] as NavTab[]).map((tab) => (
              <button key={tab} onClick={() => {
                  if (tab === "hiring" && activeTab === "hiring") setHiringKey((k) => k + 1);
                  setActiveTab(tab);
                }}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all duration-200",
                  activeTab === tab ? "text-white" : "text-white/45")}
                style={activeTab === tab
                  ? { background: "var(--border-soft)", border: "1px solid var(--border-medium)" }
                  : { border: "1px solid transparent" }}>
                {tab === "home" ? "Home" : tab === "hiring" ? "Hiring" : "Workforce"}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">

          {chatMode && (
            <motion.div key="chat"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col overflow-hidden">

              <AnimatePresence mode="wait">
                {wizardOpen ? (
                  /* Wizard inline — user message bubble + wizard card stacked, chat input pinned below */
                  <motion.div key="wizard-inline"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 flex flex-col overflow-hidden">
                    {/* Scrollable: "Post a job" user bubble → wizard card */}
                    <div className="flex-1 overflow-y-auto px-5 sm:px-8 pt-5 pb-3 flex flex-col gap-5">
                      {/* User message bubble — right-aligned, Figma 3921:20661 */}
                      <div className="flex justify-end">
                        <div className="rounded-2xl px-4 py-4"
                          style={{ background: 'rgba(39,39,42,0.5)' }}>
                          <p className="text-base text-[#f4f4f5]">Post a job</p>
                        </div>
                      </div>
                      {/* Wizard card */}
                      <PostJobWizardCard
                        initialData={wizardInitialData}
                        onClose={() => { setWizardOpen(false); setWizardInitialData({}); }}
                        onFinish={(job) => {
                          setWizardOpen(false);
                          setWizardInitialData({});
                          setMessages(prev => [
                            ...prev,
                            {
                              id: `job-${Date.now()}`,
                              role: "assistant",
                              text: "",
                              type: "job-posted",
                              job,
                            },
                          ]);
                        }}
                      />
                    </div>
                    {/* Pinned input always visible at bottom */}
                    <div className="px-5 sm:px-12 pb-6 pt-3 flex-shrink-0">
                      <ChatInputBar onSend={handleSend} waiting={!sessionReady} placeholder="Ask anything" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="chat-messages"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 flex flex-col overflow-hidden">
                    <ChatView
                      messages={messages}
                      isTyping={isTyping}
                      onSend={handleSend}
                      onChipClick={handleChipClick}
                      onCreateJobPosting={handleCreateJobPosting}
                      sessionReady={sessionReady}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {!chatMode && (
            <motion.div key="dashboard"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col overflow-hidden">

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">

                {activeTab === "home" && (
                  <motion.div key="home"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center px-5 sm:px-8"
                    style={{ paddingTop: '14vh', paddingBottom: '10vh' }}>

                    <div className="w-full max-w-3xl flex flex-col gap-5 sm:gap-6">

                      {/* Greeting + Heading */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2" style={{ color: '#1ed25e' }}>
                          <SparkleIcon size={14} />
                          <span className="text-[20px] font-normal leading-6 text-white">Hello Omar</span>
                        </div>
                        <h1 className="text-[32px] sm:text-[36px] font-normal text-white leading-[1.25]">
                          Where should we begin?
                        </h1>
                      </div>

                      {/* Action cards — Figma compact pill row */}
                      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 w-full">
                        {/* Post a job */}
                        <button
                          className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
                          style={{ background: 'rgba(255,255,255,0.05)', minWidth: 0 }}
                          onClick={() => {
                            setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", text: "Post a job" }]);
                            setChatMode(true);
                            // Brief pause so step 1-a (user bubble on blank canvas) is visible
                            // before the wizard card animates in
                            setTimeout(() => setWizardOpen(true), 200);
                          }}>
                          <div className="flex items-center gap-2">
                            <Building2 size={20} style={{ color: '#1ed25e' }} />
                            <span className="text-base font-normal text-[#fafafa]">Post a job</span>
                          </div>
                          <ArrowRight size={20} className="text-white/40" />
                        </button>
                        {/* Review applicants */}
                        <button
                          className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
                          style={{ background: 'rgba(255,255,255,0.05)', minWidth: 0 }}
                          onClick={() => handleSend("Review applicants")}>
                          <div className="flex items-center gap-2">
                            <Users size={20} style={{ color: '#51a2ff' }} />
                            <span className="text-base font-normal text-[#fafafa]">Review applicants</span>
                          </div>
                          <ArrowRight size={20} className="text-white/40" />
                        </button>
                        {/* Track Development */}
                        <button
                          className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
                          style={{ background: 'rgba(255,255,255,0.05)', minWidth: 0 }}
                          onClick={() => handleSend("How is my training program?")}>
                          <div className="flex items-center gap-2">
                            <BookOpen size={20} style={{ color: '#a78bfa' }} />
                            <span className="text-base font-normal text-[#fafafa]">Track Development</span>
                          </div>
                          <ArrowRight size={20} className="text-white/40" />
                        </button>
                      </div>

                      {/* Chat input */}
                      <ChatInputBar onSend={handleSend} waiting={!sessionReady} placeholder={sessionReady ? "Or ask anything" : "Connecting to AI…"} />

                      {/* Suggestion chips */}
                      <div className="flex flex-wrap gap-3">
                        {[
                          "Where are our biggest gaps?",
                          "What needs my attention today?",
                          "How is our hiring?",
                        ].map((chip) => (
                          <SuggestionChip key={chip} label={chip} onClick={() => handleSend(chip)} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}


                {activeTab === "hiring" && (
                  <motion.div key="hiring"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <HiringTabContent
                      key={hiringKey}
                      prefetchedJobs={prefetchedJobs}
                      prefetchedJobsLoading={prefetchedJobsLoading}
                      onPostJob={() => {
                        // Mirror the Home screen "Post a job" button behavior:
                        // switch to the home tab, add the user bubble, enter chat
                        // mode, then open the wizard after a brief animation pause.
                        setActiveTab("home");
                        setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", text: "Post a job" }]);
                        setChatMode(true);
                        setTimeout(() => setWizardOpen(true), 200);
                      }}
                    />
                  </motion.div>
                )}

                {activeTab === "workforce" && (
                  <motion.div key="workforce"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col px-5 sm:px-8 pb-8 min-h-full">
                    <WorkforceTabContent />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating bottom nav — fixed so it persists over wizard + chat views */}
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="relative flex items-center pointer-events-auto"
            style={{
              background: '#18181b',
              border: '1px solid #27272a',
              borderRadius: 100,
              padding: '8px 16px',
              gap: 8,
              boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25), 0px 0px 8px 0px rgba(255,255,255,0.08)',
            }}>
            {/* Sparkle / expand */}
            <button
              className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
              style={{ transform: 'rotate(-90deg)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {/* Soundwave */}
            <button className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="9" width="2" height="6" rx="1" opacity="0.4" />
                <rect x="6" y="6" width="2" height="12" rx="1" opacity="0.6" />
                <rect x="10" y="3" width="2" height="18" rx="1" />
                <rect x="14" y="6" width="2" height="12" rx="1" opacity="0.6" />
                <rect x="18" y="9" width="2" height="6" rx="1" opacity="0.4" />
              </svg>
            </button>
            {/* Chat toggle — active with green glow */}
            <button
              onClick={() => chatMode ? setChatMode(false) : setChatMode(true)}
              className="w-14 h-8 rounded-full flex items-center justify-center transition-all"
              style={chatMode
                ? { background: '#1c1c1e', border: '1px solid #1ed25e', boxShadow: '0px 0px 8px 0px #1ed25e' }
                : { background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.15)' }}>
              <MessageCircle size={16} style={{ color: chatMode ? '#1ed25e' : 'rgba(255,255,255,0.5)' }} />
            </button>
          </div>
        </div>

        {/* Mobile tab bar (xs only) */}
        <div className="sm:hidden flex-shrink-0 flex items-center justify-around px-4 py-2"
          style={{ background: "var(--surface-sidebar)", borderTop: "1px solid var(--surface-elevated)" }}>
          {sidebarIcons.slice(0, 4).map(({ icon: Icon, label }) => (
            <button key={label} aria-label={label}
              className="flex flex-col items-center gap-1 text-white/30 hover:text-white/60 transition-colors">
              <Icon size={18} />
            </button>
          ))}
          <button
            onClick={() => chatMode ? setChatMode(false) : null}
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-[10px]">
            <ChevronDown size={18} style={{ transform: chatMode ? "rotate(180deg)" : "none" }} />
            <span>{chatMode ? "Home" : "More"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
