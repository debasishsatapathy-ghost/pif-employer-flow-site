import { useState, useEffect, useRef, useCallback } from "react";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";
import { useVoiceSessionStore } from "@/lib/stores/voice-session-store";
import { registerSiteFunctions } from "@/site-functions/register";
import { motion, AnimatePresence } from "framer-motion";
// createJobPosting via direct RPC is not supported by the Mobeus agent.
// The wizard sends a structured lk.chat message instead (see handleFinish).
import { AvatarFAB } from "@/components/ui/AvatarFAB";
import { HiringAvatarPopup } from "@/components/ui/HiringAvatarPopup";
import { HiringPage } from "./HiringPage";
import { JobPostingTemplate } from "./JobPostingTemplate";
import WorkforcePage from "./WorkforcePage";
import { JobProgressionManager } from "@/components/JobProgressionManager";
import type { JobPostingResponse } from "@/lib/employerApi";
import type { SidebarJob } from "@/components/employer/JobPostingSidebar";
import {
  MapPin,
  Plus,
  Bell,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowUp,
  Loader2,
  Building2,
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
function PostJobWizardCard({ onClose, onFinish, initialData, isPreFilled = false }: {
  onClose: () => void;
  onFinish: (job: PostedJob) => void;
  initialData?: Partial<JobFormData>;
  /** When true, show the AI "pre-filled" banner on step 1 instead of the intro text */
  isPreFilled?: boolean;
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
  const [draggedSkill, setDraggedSkill] = useState<{ skill: string; fromTier: keyof SkillSet } | null>(null);
  const [dragOverTier, setDragOverTier] = useState<keyof SkillSet | null>(null);

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

  const moveSkill = (skill: string, fromTier: keyof SkillSet, toTier: keyof SkillSet) => {
    if (fromTier === toTier) return;
    setForm(f => ({
      ...f,
      skills: {
        ...f.skills,
        [fromTier]: f.skills[fromTier].filter(s => s !== skill),
        [toTier]: [...f.skills[toTier], skill],
      },
    }));
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
        className="w-full flex flex-col rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.05)', padding: '32px', height: '620px' }}
      >
        {/* Header — title + close + progress */}
        <div className="flex flex-col gap-4 flex-shrink-0 mb-5">
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

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Role details ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-5">
                {/* AI banner (shown when form is pre-filled from chat card) */}
                {isPreFilled ? (
                  <div className="flex items-stretch overflow-hidden rounded-[12px]"
                    style={{ background: 'rgba(119,220,155,0.05)', border: '1px solid #4ad179' }}>
                    <div className="w-2 flex-shrink-0" style={{ background: '#4ad179' }} />
                    <div className="flex items-start gap-2 px-3 py-[10px]">
                      <SparkleIcon size={24} />
                      <p className="text-base text-[#d2f3de] leading-6">
                        trAIn has pre-filled this information based on your requirements.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-base text-[#d4d4d8]">Let&apos;s start with the basics. What role are you hiring for?</p>
                )}
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
                          style={{ background: 'rgba(255,255,255,0.05)', caretColor: '#1ed25e', letterSpacing: '-0.3125px' }}
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
                  {tierLabels.map(({ key, label, color }) => {
                    const isDropTarget = dragOverTier === key && draggedSkill?.fromTier !== key;
                    return (
                      <div key={key} className="flex flex-col gap-2 rounded-[8px] transition-all duration-150"
                        style={{ outline: isDropTarget ? '2px dashed rgba(255,255,255,0.25)' : '2px solid transparent', padding: isDropTarget ? '6px' : '0px' }}
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverTier(key); }}
                        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverTier(null); }}
                        onDrop={e => { e.preventDefault(); setDragOverTier(null); if (draggedSkill) { moveSkill(draggedSkill.skill, draggedSkill.fromTier, key); setDraggedSkill(null); } }}>
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
                        <div className="flex flex-wrap gap-2 min-h-[28px]">
                          {form.skills[key].map(skill => (
                            <div
                              key={skill}
                              draggable={true}
                              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDraggedSkill({ skill, fromTier: key }); }}
                              onDragEnd={() => { setDraggedSkill(null); setDragOverTier(null); }}
                              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white/75 transition-opacity"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.10)',
                                cursor: draggedSkill ? 'grabbing' : 'grab',
                                opacity: draggedSkill?.skill === skill && draggedSkill?.fromTier === key ? 0.4 : 1,
                              }}>
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
                    );
                  })}
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
                          style={{ background: 'rgba(255,255,255,0.05)', caretColor: '#1ed25e', letterSpacing: '-0.3125px' }} />
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
        </div>

        {/* Save error — outside scroll area, always visible */}
        {saveError && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl flex-shrink-0 mt-3"
            style={{ background: "var(--error-surface-subtle)", border: "1px solid var(--error-border-subtle)" }}>
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">{saveError}</p>
          </div>
        )}

        {/* Navigation buttons — always pinned at bottom, never scroll */}
        <div className="flex items-center justify-between pt-4 mt-auto flex-shrink-0">
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
  );
}

interface EmployerDashboardProps {
  onBack?: () => void;
}

type NavTab = "home" | "hiring" | "workforce";

interface CandidateData {
  id: string;
  name: string;
  role: string;
  matchScore: number;
  location: string;
  experience: string;
  skills: string[];
  avatarColor: string;
  initials: string;
}

// Top-3 mock candidates shown after posting a Senior AI Developer role
const MOCK_SENIOR_AI_CANDIDATES: CandidateData[] = [
  { id: "c1", name: "Sara Khalid",       role: "AI Developer", matchScore: 93, location: "Jeddah", experience: "5 yrs", skills: ["Gen AI", "SQL", "Prompt Eng"], avatarColor: "#2a4a6e", initials: "SK" },
  { id: "c2", name: "Noura Al-Dosari",   role: "AI Developer", matchScore: 90, location: "Jeddah", experience: "4 yrs", skills: ["Gen AI", "Python", "SQL"],       avatarColor: "#afd0ff", initials: "NA" },
  { id: "c3", name: "Faisal Al-Zahrani", role: "AI Developer", matchScore: 88, location: "Riyadh", experience: "4 yrs", skills: ["Gen AI", "Python", "SQL"],       avatarColor: "#d7a5e8", initials: "FA" },
];

function getJobCandidates(_title: string): CandidateData[] {
  // For this prototype all postings return the same top-3 matched candidates
  return MOCK_SENIOR_AI_CANDIDATES;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  type?: "text" | "job-posted";
  job?: PostedJob;
  options?: string[];
  candidates?: CandidateData[];
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

/* ── Candidate card — matches Figma node 8678:31468 ─────────────────────── */
function CandidateCard({ candidate }: { candidate: CandidateData }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minWidth: 0, // let CSS Grid control width
    }}>
      {/* Top row: avatar + name + match score */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: candidate.avatarColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#fff",
        }}>
          {candidate.initials}
        </div>
        {/* Name + role */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#fafafa", lineHeight: "20px" }}>{candidate.name}</p>
          <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>{candidate.role}</p>
        </div>
        {/* Match score circle — green ring */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          border: "3.5px solid #1dc558",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#fff", lineHeight: "24px" }}>{candidate.matchScore}</span>
        </div>
      </div>
      {/* Location + experience */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <MapPin size={14} style={{ color: "#d4d4d8", flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>{candidate.location}</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <Building2 size={14} style={{ color: "#d4d4d8", flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>{candidate.experience}</span>
        </div>
      </div>
      {/* Skill chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {candidate.skills.map((skill) => (
          <span key={skill} style={{
            background: "#27272a", borderRadius: 8, padding: "4px 8px",
            fontSize: 14, color: "#fafafa", lineHeight: "20px", whiteSpace: "nowrap",
          }}>{skill}</span>
        ))}
      </div>
    </div>
  );
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
 * Skips muting when skipRef.current is true (e.g. hiring avatar popup is open).
 */
function startMuteLoop(skipRef?: React.RefObject<boolean>): () => void {
  const skip = () => skipRef?.current === true;

  // Mute all existing media elements
  document.querySelectorAll("audio, video").forEach((el) => {
    if (!skip()) {
      (el as HTMLMediaElement).muted = true;
      (el as HTMLMediaElement).volume = 0;
    }
  });

  // Watch for new media elements and mute them immediately
  const obs = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (skip()) return;
        if (node instanceof HTMLMediaElement) {
          node.muted = true;
          node.volume = 0;
        } else if (node instanceof HTMLElement) {
          node.querySelectorAll("audio, video").forEach((el) => {
            if (!skip()) {
              (el as HTMLMediaElement).muted = true;
              (el as HTMLMediaElement).volume = 0;
            }
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
  { img: "/Agentic Assist Icons.png", label: "Talent Search Agent" },
  { img: "/Agentic Assist Icons (1).png", label: "Screening Agent" },
  { img: "/Agentic Assist Icons (2).png", label: "Communications Agent" },
  { img: "/Agentic Assist Icons (3).png", label: "Training Agent" },
  { img: "/Agentic Assist Icons (4).png", label: "Add Agents" },
];

/* ── Sparkle icon (Home Page Sparkle — Figma svg/Home Page Sparkle.svg) ─── */
const SparkleIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.72851 15.7548C8.95336 15.9144 9.22212 16.0005 9.49788 16.0013C9.77363 16.002 10.0428 15.9173 10.2685 15.7588C10.4705 15.6148 10.6295 15.4178 10.7265 15.1893L11.3445 13.3048C11.4957 12.8506 11.7506 12.4379 12.0891 12.0994C12.4276 11.7609 12.8403 11.506 13.2945 11.3548L15.11 10.7633C15.3705 10.6714 15.5961 10.501 15.7557 10.2755C15.9153 10.05 16.001 9.78057 16.001 9.50432C16.001 9.22807 15.9153 8.95862 15.7557 8.73312C15.5961 8.50763 15.3705 8.33719 15.11 8.24532L13.26 7.64882C12.8073 7.49726 12.3958 7.24285 12.0579 6.90556C11.72 6.56828 11.4649 6.15728 11.3125 5.70482L10.723 3.89032C10.6313 3.62969 10.4608 3.40407 10.235 3.24482C10.0084 3.08795 9.73936 3.00391 9.46376 3.00391C9.18816 3.00391 8.91911 3.08795 8.69251 3.24482C8.46277 3.40751 8.2901 3.63844 8.19901 3.90482L7.60251 5.73832C7.45097 6.17926 7.20146 6.58011 6.87272 6.91076C6.54398 7.2414 6.14457 7.49323 5.70451 7.64732L3.89101 8.23632C3.6291 8.32858 3.40248 8.50022 3.2427 8.72733C3.08293 8.95444 2.99795 9.22573 2.9996 9.50341C3.00125 9.78109 3.08945 10.0513 3.25191 10.2765C3.41438 10.5017 3.64302 10.6707 3.90601 10.7598L5.69951 11.3423C6.15388 11.4949 6.56662 11.7509 6.90518 12.0901C7.24375 12.4294 7.49889 12.8426 7.65051 13.2973L8.24051 15.1088C8.33201 15.3693 8.50301 15.5953 8.72851 15.7548ZM16.437 20.3208C16.6013 20.4372 16.7976 20.5 16.999 20.5003L17.0015 20.5018C17.2053 20.5014 17.4039 20.4371 17.5692 20.318C17.7346 20.1989 17.8585 20.031 17.9235 19.8378L18.208 18.9628C18.2663 18.7882 18.3644 18.6295 18.4944 18.4992C18.6245 18.3688 18.783 18.2705 18.9575 18.2118L19.8525 17.9208C19.9943 17.8707 20.1225 17.7884 20.2271 17.6803C20.3317 17.5723 20.4098 17.4415 20.4553 17.2982C20.5009 17.1549 20.5126 17.003 20.4895 16.8544C20.4665 16.7058 20.4093 16.5646 20.3225 16.4418C20.199 16.2689 20.0227 16.1408 19.82 16.0768L18.9415 15.7923C18.767 15.7338 18.6085 15.6356 18.4783 15.5055C18.3482 15.3754 18.25 15.2168 18.1915 15.0423L17.9005 14.1478C17.8334 13.9565 17.7081 13.791 17.5422 13.6744C17.3763 13.5578 17.1781 13.496 16.9754 13.4976C16.7726 13.4993 16.5755 13.5643 16.4115 13.6836C16.2476 13.8029 16.125 13.9704 16.061 14.1628L15.775 15.0413C15.7182 15.2132 15.6229 15.3699 15.4964 15.4995C15.3699 15.629 15.2155 15.728 15.045 15.7888L14.15 16.0798C13.9588 16.1469 13.7933 16.272 13.6768 16.4378C13.5602 16.6036 13.4984 16.8016 13.5 17.0042C13.5016 17.2069 13.5665 17.4039 13.6857 17.5678C13.8048 17.7317 13.9723 17.8543 14.1645 17.9183L15.0405 18.2033C15.2155 18.2618 15.3745 18.3603 15.5047 18.491C15.6349 18.6217 15.7328 18.7811 15.7905 18.9563L16.0815 19.8503C16.1485 20.0403 16.273 20.2048 16.437 20.3208Z" fill="currentColor"/>
  </svg>
);

/* ── Business Center icon (Post a job — Figma svg/business_center.svg) ───── */
const BusinessCenterIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.6667 5.83333H13.3333V4.16667L11.6667 2.5H8.33334L6.66667 4.16667V5.83333H3.33334C2.41667 5.83333 1.66667 6.58333 1.66667 7.5V11.6667C1.66667 12.2917 2.00001 12.8167 2.50001 13.1083V15.8333C2.50001 16.7583 3.24167 17.5 4.16667 17.5H15.8333C16.7583 17.5 17.5 16.7583 17.5 15.8333V13.1C17.9917 12.8083 18.3333 12.275 18.3333 11.6667V7.5C18.3333 6.58333 17.5833 5.83333 16.6667 5.83333ZM8.33334 4.16667H11.6667V5.83333H8.33334V4.16667ZM3.33334 7.5H16.6667V11.6667H12.5V9.16667H7.5V11.6667H3.33334V7.5ZM10.8333 12.5H9.16667V10.8333H10.8333V12.5ZM15.8333 15.8333H4.16667V13.3333H7.5V14.1667H12.5V13.3333H15.8333V15.8333Z" fill="currentColor"/>
  </svg>
);

/* ── People Alt icon (Review applicants — Figma svg/people_alt.svg) ─────── */
const PeopleAltIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.8917 10.9414C15.0333 11.7164 15.8333 12.7664 15.8333 14.1664V16.6664H19.1667V14.1664C19.1667 12.3497 16.1917 11.2747 13.8917 10.9414Z" fill="currentColor"/>
    <path d="M12.5 10.0007C14.3417 10.0007 15.8333 8.50898 15.8333 6.66732C15.8333 4.82565 14.3417 3.33398 12.5 3.33398C12.1083 3.33398 11.7417 3.41732 11.3917 3.53398C12.0833 4.39232 12.5 5.48398 12.5 6.66732C12.5 7.85065 12.0833 8.94232 11.3917 9.80065C11.7417 9.91732 12.1083 10.0007 12.5 10.0007Z" fill="currentColor"/>
    <path d="M7.5 10.0007C9.34166 10.0007 10.8333 8.50898 10.8333 6.66732C10.8333 4.82565 9.34166 3.33398 7.5 3.33398C5.65833 3.33398 4.16666 4.82565 4.16666 6.66732C4.16666 8.50898 5.65833 10.0007 7.5 10.0007ZM7.5 5.00065C8.41666 5.00065 9.16666 5.75065 9.16666 6.66732C9.16666 7.58398 8.41666 8.33398 7.5 8.33398C6.58333 8.33398 5.83333 7.58398 5.83333 6.66732C5.83333 5.75065 6.58333 5.00065 7.5 5.00065Z" fill="currentColor"/>
    <path d="M7.5 10.834C5.275 10.834 0.833332 11.9507 0.833332 14.1673V16.6673H14.1667V14.1673C14.1667 11.9507 9.725 10.834 7.5 10.834ZM12.5 15.0007H2.5V14.1757C2.66667 13.5757 5.25 12.5007 7.5 12.5007C9.75 12.5007 12.3333 13.5757 12.5 14.1673V15.0007Z" fill="currentColor"/>
  </svg>
);

/* ── Psychology icon (Track Development — Figma svg/psychology.svg) ─────── */
const PsychologyIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.1833 6.01667L12.35 6.35C12.175 6.21667 11.9917 6.10833 11.7917 6.025L11.6667 5.14167C11.65 5.05833 11.5833 5 11.5 5H10.1667C10.0833 5 10.0167 5.05833 10.0083 5.14167L9.88335 6.025C9.68335 6.10833 9.49168 6.21667 9.32501 6.35L8.49168 6.01667C8.41668 5.99167 8.32501 6.01667 8.29168 6.09167L7.62501 7.24167C7.58335 7.31667 7.60001 7.40833 7.66668 7.45833L8.37501 8.00833C8.35001 8.10833 8.33335 8.225 8.33335 8.33333C8.33335 8.44167 8.34168 8.55 8.35835 8.65833L7.65835 9.20833C7.59168 9.25833 7.57501 9.35 7.61668 9.41667L8.28335 10.575C8.32501 10.65 8.40835 10.675 8.49168 10.65L9.31668 10.3167C9.49168 10.45 9.67501 10.5583 9.88335 10.6417L10 11.525C10.0167 11.6083 10.0833 11.6667 10.1667 11.6667H11.5C11.5833 11.6667 11.65 11.6083 11.6667 11.525L11.7917 10.6417C11.9917 10.5583 12.1833 10.45 12.35 10.3167L13.175 10.65C13.25 10.6833 13.3417 10.65 13.375 10.575L14.0417 9.41667C14.0833 9.34167 14.0667 9.25833 14 9.20833L13.3083 8.65833C13.325 8.55 13.3333 8.44167 13.3333 8.33333C13.3333 8.21667 13.325 8.10833 13.3083 8.00833L14.0167 7.45833C14.0833 7.40833 14.1 7.31667 14.0583 7.24167L13.3917 6.09167C13.35 6.01667 13.2583 5.99167 13.1833 6.01667ZM10.8333 9.525C10.175 9.525 9.64168 8.99167 9.64168 8.33333C9.64168 7.675 10.175 7.14167 10.8333 7.14167C11.4917 7.14167 12.025 7.675 12.025 8.33333C12.025 8.99167 11.4917 9.525 10.8333 9.525Z" fill="currentColor"/>
    <path d="M16.6167 7.55C16.2583 4.825 13.925 2.66667 11.175 2.50833C11.0583 2.5 10.95 2.5 10.8333 2.5C7.89167 2.5 5.475 4.675 5.06667 7.5L3.45834 10.4C3.11667 10.95 3.51667 11.6667 4.16667 11.6667H5V13.3333C5 14.25 5.75 15 6.66667 15H7.5V17.5H13.3333V13.6C15.5167 12.5583 16.9583 10.2 16.6167 7.55ZM12.4083 12.1917L11.6667 12.5417V15.8333H9.16667V13.3333H6.66667V10H5.58334L6.69167 8.05833C6.84167 5.88333 8.625 4.16667 10.8333 4.16667C13.1333 4.16667 15 6.03333 15 8.33333C15 10.075 13.925 11.5667 12.4083 12.1917Z" fill="currentColor"/>
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
  onJobDetailChange,
}: {
  onPostJob?: () => void;
  /** Jobs pre-fetched by the parent on mount — skips the internal fetch when provided. */
  prefetchedJobs?: JobPostingResponse[];
  prefetchedJobsLoading?: boolean;
  /** Notifies the parent when a job detail page is opened (true) or closed (false). */
  onJobDetailChange?: (isOpen: boolean) => void;
}) {
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);
  // Seed from parent-provided data; stays in sync via the effect below.
  const [apiJobs, setApiJobs] = useState<JobPostingResponse[]>(prefetchedJobs ?? []);
  const [jobsLoading, setJobsLoading] = useState(prefetchedJobsLoading ?? false);

  // Keep local state in sync when the parent updates (new job posted, AI fetch done).
  useEffect(() => {
    setApiJobs(prefetchedJobs ?? []);
    setJobsLoading(prefetchedJobsLoading ?? false);
  }, [prefetchedJobs, prefetchedJobsLoading]);

  // No internal fetch — callMcpTool RPC is not supported by the Mobeus agent.
  // Jobs are populated by the parent via prefetchedJobs (either session-created
  // jobs or those retrieved via the [FETCH_JOBS] → [JOB_LIST: ...] chat flow).

  const sidebarJobs = toSidebarJobs(apiJobs);

  const handleSelectJob = useCallback(
    (id: string, job: { title: string; department: string; location: string; status: string; posted_at?: string }) => {
      setSelectedJob({ id, ...job });
      onJobDetailChange?.(true);
    },
    [onJobDetailChange],
  );

  const handleBackToHiring = useCallback(() => {
    setSelectedJob(null);
    onJobDetailChange?.(false);
  }, [onJobDetailChange]);

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
          // Already in job detail view — stays true, no state change needed
          onJobDetailChange?.(true);
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
              {/* Soundwave icon — Figma svg/proicons_soundwave.svg */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 20.75V3.25M20 14.96V9.04M4 14.96V9.04M16 17.912V6.088M8 17.912V6.088" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
  wizardOpen = false,
  wizardInitialData,
  wizardPreFilled = false,
  onWizardClose,
  onWizardFinish,
  onGoToHiring,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string) => void;
  onChipClick: (chip: string) => void;
  onCreateJobPosting: (jobCard: NonNullable<ChatMessage["jobCard"]>) => void;
  sessionReady?: boolean;
  wizardOpen?: boolean;
  wizardInitialData?: Partial<JobFormData>;
  wizardPreFilled?: boolean;
  onWizardClose?: () => void;
  onWizardFinish?: (job: PostedJob) => void;
  onGoToHiring?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, wizardOpen]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Message list — centered 800px container matching Figma layout */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-6 pb-4">
        <div className="max-w-[800px] mx-auto w-full px-5 sm:px-8 flex flex-col gap-10">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {msg.role === "user" ? (
                /* ── User bubble — right-aligned, dark semi-transparent, no border ── */
                <div className="flex justify-end">
                  <div
                    className="max-w-[510px] rounded-[16px] p-4"
                    style={{ background: "rgba(39,39,42,0.5)" }}
                  >
                    <p className="text-base text-[#f4f4f5] leading-[24px] whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ) : msg.type === "job-posted" && msg.job ? (
                /* Use full chat width so all 3 candidate cards fit side-by-side */
                <div className="flex flex-col gap-4 w-full">
                  {/* Divider */}
                  <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)" }} />
                  {/* Success text */}
                  <p className="text-base text-white/80 leading-6">Success! This role has been posted successfully.</p>
                  {/* Compact job card — constrained width so it doesn't stretch too wide */}
                  <div className="flex items-start justify-between px-4 py-3.5 rounded-2xl"
                    style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-soft)", maxWidth: 480 }}>
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
                  {/* Candidate cards — full width row, 3 cards share available space equally */}
                  {msg.candidates && msg.candidates.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-white/80 leading-relaxed">
                        <span className="text-[#1dc558] font-semibold underline">{msg.candidates[0].name}</span>
                        {` looks like a great fit for this role. Her skills in ${msg.candidates[0].skills.join(", ")} make her a `}
                        <span className="font-semibold">{msg.candidates[0].matchScore}% match</span>
                        {` for your `}
                        <span className="text-[#1dc558] underline">{msg.job.title}</span>
                        {` posting. You can see the Job Posting in the Hiring Dashboard. `}
                        {onGoToHiring && (
                          <button
                            onClick={onGoToHiring}
                            className="text-[#1dc558] font-semibold underline hover:brightness-125 transition-all bg-transparent border-0 p-0 cursor-pointer"
                          >
                            Here is the link to Hiring Dashboard
                          </button>
                        )}
                      </p>
                      {/* Equal-width columns; horizontal scroll only if viewport is very narrow */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                        {msg.candidates.map((c) => (
                          <CandidateCard key={c.id} candidate={c} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── AI message — left-aligned, plain text + pill option bubbles ── */
                <div className="flex flex-col gap-6 w-full">
                  <p
                    className={`text-base leading-[24px] text-[#f4f4f5] ${
                      msg.options && msg.options.length > 0 ? "font-semibold" : "font-normal"
                    }`}
                  >
                    {msg.text}
                  </p>
                  {/* Option bubbles — Figma: rounded-[100px] h-[40px] px-[16px] py-[8px] gap-[16px], no border */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-4">
                      {msg.options.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => onChipClick(chip)}
                          className="h-10 px-4 rounded-full text-base text-[#f4f4f5] border-0 hover:brightness-125 active:scale-[0.97] transition-all duration-150"
                          style={{ background: "rgba(255,255,255,0.05)", border: "none", outline: "none" }}
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
                      style={{ background: "rgba(255,255,255,0.05)", maxWidth: 280, width: "fit-content" }}
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
                        onClick={() => onCreateJobPosting(msg.jobCard!)}
                        className="h-10 w-full rounded-full text-base font-semibold text-[#f4f4f5] transition-opacity hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: "rgba(29,197,88,0.5)" }}
                      >
                        Create Job Posting
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

          {/* Post-a-Job wizard — inline below conversation history */}
          {wizardOpen && onWizardClose && onWizardFinish && (
            <motion.div key="wizard-inline"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
              <PostJobWizardCard
                initialData={wizardInitialData}
                isPreFilled={wizardPreFilled}
                onClose={onWizardClose}
                onFinish={onWizardFinish}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Pinned input — stays aligned with the 800px message container */}
      <div className="pb-6 pt-3 flex-shrink-0">
        <div className="max-w-[800px] mx-auto w-full px-5 sm:px-8">
          <ChatInputBar onSend={onSend} waiting={isTyping || !sessionReady}
            placeholder={!sessionReady ? "Connecting to AI…" : "Ask anything"} />
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function EmployerDashboard({ onBack }: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [hiringKey, setHiringKey] = useState(0);
  const [hoveredSidebarIcon, setHoveredSidebarIcon] = useState<number | null>(null);
  const [hoveredNavTab, setHoveredNavTab] = useState<string | null>(null);
  const [hoveredDashboardBack, setHoveredDashboardBack] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [avatarMode, setAvatarMode] = useState(false); // default: text home (image 2); avatar (image 1) on explicit click
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  // True when the wizard is opened from a chat job card (pre-filled fields)
  const [wizardPreFilled, setWizardPreFilled] = useState(false);

  // sessionReady is derived from the Zustand store's real connection state
  const sessionState = useVoiceSessionStore((s) => s.sessionState);
  const sessionReady = sessionState === 'connected';
  // Gate the avatar FAB: only allow opening the popup once the video track has
  // been received from the avatar worker. This eliminates the race where the
  // user opens the popup before the track arrives (which caused infinite loading).
  const avatarVideoTrackReady = useVoiceSessionStore((s) => !!s.avatarVideoTrack);
  const [wizardInitialData, setWizardInitialData] = useState<Partial<JobFormData>>({});

  // Jobs available in the Hiring tab. Populated two ways:
  // (a) Jobs created in this session (wizard Finish or chat card "Create Job Posting").
  // (b) Existing jobs fetched from the AI via [FETCH_JOBS] → [JOB_LIST: ...] flow.
  // Note: callMcpTool RPC is NOT supported by the Mobeus agent (returns "Method not
  // supported"), so we cannot use the MCP bridge directly. The only working channel
  // is sendTextMessage (lk.chat). On connect we send [FETCH_JOBS]; the AI (if its
  // prompt handles it) responds with [JOB_LIST: id|title|location|status, ...].
  const [sessionCreatedJobs, setSessionCreatedJobs] = useState<JobPostingResponse[]>([]);
  // True while waiting for the AI to respond to the [FETCH_JOBS] request.
  const [jobsFetching, setJobsFetching] = useState(false);
  // Set to true right before sending [FETCH_JOBS]; cleared once the response arrives.
  const fetchJobsRequestedRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const muteCleanupRef = useRef<(() => void) | null>(null);
  const hiringAvatarActiveRef = useRef<boolean>(false);
  const hiringAudioRef = useRef<HTMLAudioElement | null>(null);
  // Prevents the agent greeting kick from firing more than once per popup open.
  const greetingFiredRef = useRef(false);
  // Cleanup for the avatarVideoTrack subscription + fallback timer used by the greeting kick.
  const greetingCleanupRef = useRef<(() => void) | null>(null);
  // Single source of truth for which avatar popup context is open.
  // null = popup hidden (avatar worker stays running so video track is preserved).
  // 'home' = home-tab silent presence popup.
  // 'hiring' = hiring-tab interactive popup.
  const [avatarPopupMode, setAvatarPopupMode] = useState<'home' | 'hiring' | null>(null);
  // Set to true the first time any avatar popup is opened. Once true it never
  // flips back — keeps HiringAvatarPopup mounted in the DOM so the <video>
  // element persists across home/hiring transitions (no re-attach = no loading).
  const [avatarEverStarted, setAvatarEverStarted] = useState(false);
  // True when the user has drilled into a JobPostingTemplate within the hiring tab.
  // The avatar popup must not be shown or openable on that sub-page.
  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);

  // Fixed option pills for the home avatar popup (display-only, non-interactive).
  const HOME_AVATAR_OPTIONS: { label: string; value: string }[] = [
    { label: 'Find talent',       value: 'find-talent' },
    { label: 'Hiring update',     value: 'hiring-update' },
    { label: 'Training progress', value: 'training-progress' },
  ];

  // Auto-hide avatar popup when user navigates away from its tab or into a sub-page.
  // The avatar worker stays running (no toggleAvatarHard(off)) so the track is live.
  useEffect(() => {
    if (avatarPopupMode === 'hiring' && (activeTab !== 'hiring' || isJobDetailOpen)) {
      setAvatarPopupMode(null);
    } else if (avatarPopupMode === 'home' && activeTab !== 'home') {
      setAvatarPopupMode(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isJobDetailOpen]);

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

    // ── Global guard: wait for complete [JOB_LIST: ...] marker ───────────────
    // This fires regardless of fetchJobsRequestedRef state. If the LLM sends a
    // [JOB_LIST: ...] whose closing ] is split into a later speech chunk, we wait
    // 1.5 s for the rest rather than letting a partial / unclosed marker reach the
    // chat UI where the safeText regex (which requires ]) cannot strip it.
    if (/\[JOB_LIST:/i.test(full) && !/\[JOB_LIST:[\s\S]*?\]/i.test(full)) {
      silenceTimerRef.current = setTimeout(flushResponse, 1500);
      return;
    }

    // ── 0. Intercept [FETCH_JOBS] response — never show in chat UI ────────────
    // The AI responds with [JOB_LIST: id|title|location|status, ...] or plain
    // text if it doesn't understand the request. Either way: parse jobs if
    // present, then suppress the message from the visible chat.
    if (fetchJobsRequestedRef.current) {
      // Wait for the complete [JOB_LIST: ...] marker before processing.
      // IMPORTANT: Do NOT reset the flag here — if the marker is incomplete we
      // need the flag to still be true when the 1.5s retry fires flushResponse.
      if (/\[JOB_LIST:/i.test(full) && !/\[JOB_LIST:[\s\S]*?\]/i.test(full)) {
        // Marker arrived but closing ] hasn't — wait for the rest
        silenceTimerRef.current = setTimeout(flushResponse, 1500);
        return;
      }
      // Marker is complete (or wasn't present at all) — now clear the flag
      fetchJobsRequestedRef.current = false;
      setJobsFetching(false);
      const listMatch = full.match(/\[JOB_LIST:([\s\S]*?)\]/i);
      if (listMatch) {
        const entries = listMatch[1].split(",").map(e => e.trim()).filter(Boolean);
        const parsed: JobPostingResponse[] = entries.map((entry) => {
          const parts = entry.split("|").map(p => p.trim());
          return {
            id: parts[0] || `fetched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: parts[1] || "Untitled Role",
            location: parts[2] || null,
            status: parts[3] || "active",
            department: null,
            employment_type: null,
            description: null,
            skills: null,
            salary_min: null,
            salary_max: null,
            posted_by: "Omar S.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });
        if (parsed.length > 0) {
          // Only show the two designated prototype jobs from the DB.
          // Any other jobs the DB returns are silently dropped.
          const ALLOWED_DB_TITLES = ["Senior AI Developer", "Cloud Engineer"];
          const allowedParsed = parsed.filter((j) => ALLOWED_DB_TITLES.includes(j.title));

          // Merge: session-posted jobs (id starts with "session-") ALWAYS take
          // priority over DB jobs of the same title. This is critical because
          // the session job's ID is what the Zustand progression is keyed on.
          // If the DB returned a different ID for the same title, using that DB
          // ID would cause LiveJobCard to find no progression → talentPool = 0.
          setSessionCreatedJobs((prev) => {
            const sessionJobs = prev.filter((j) => j.id.startsWith("session-"));
            // Start with session jobs (correct IDs, linked to progressions).
            // Then append allowed DB jobs whose title isn't covered by a session job.
            const merged = [...sessionJobs];
            for (const dbJob of allowedParsed) {
              if (!merged.some((j) => j.title === dbJob.title)) merged.push(dbJob);
            }
            return merged;
          });
          console.log(`[Employer] Loaded ${allowedParsed.length} job(s) from AI (filtered from ${parsed.length})`);
        }
      }
      // Suppress from visible chat (whether or not parsing succeeded).
      chunkBufferRef.current = [];
      setIsTyping(false);
      return;
    }

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
    // Safety: strip any bracket markers that leaked through (e.g. [JOB_LIST:...]
    // arriving outside the fetchJobsRequestedRef guard due to AI timing).
    // [^\]]*\]? matches the marker body with OR without a closing ] — handles
    // the case where the LLM omitted the bracket or it was truncated.
    const safeText = full
      .replace(/\[JOB_LIST:[^\]]*\]?/gi, "")
      .replace(/\[FETCH_JOBS\]/gi, "")
      .trim();
    // If stripping left us with nothing, suppress silently
    if (!safeText) { chunkBufferRef.current = []; setIsTyping(false); return; }

    const { displayText, options: inlineOptions } = parseInlineOptions(safeText);
    const options = inlineOptions.length > 0
      ? inlineOptions
      : resolveFallbackOptions(safeText, promptOptionsRef.current);

    // If the AI sent ONLY [OPTIONS: ...] with no preceding text, infer the
    // question from the chip content so the chat never renders a blank message.
    const inferredText = (() => {
      if (displayText) return displayText;
      if (options.some(o => /junior|mid-level|senior/i.test(o))) return "What experience level are you looking for?";
      if (options.some(o => /riyadh|jeddah|remote/i.test(o))) return "Where is this role based?";
      if (options.some(o => /ai developer|cloud engineer|backend engineer|data analyst/i.test(o))) return "Firstly, what type of role are you hiring for?";
      return safeText;
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

    // Keep microphone disabled (employer dashboard is always listen-only)
    if (room?.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
    }
    // NOTE: We intentionally do NOT call pub.track.detach() here.
    // Detaching permanently removes the <audio> element from the DOM; when the
    // hiring avatar popup later opens and applyAudioRouting() tries to unmute
    // the avatar audio element, the agent element is orphaned and audio stays
    // silent.  Muting via muted=true (done by hideMatching below) is sufficient
    // to silence audio — LiveKit's own TrackUnsubscribed handler detaches when
    // the track actually goes away.

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
      // Mute all media elements (skip when hiring avatar popup is open)
      root.querySelectorAll("audio, video").forEach((el) => {
        if (!hiringAvatarActiveRef.current) {
          (el as HTMLMediaElement).muted = true;
          (el as HTMLMediaElement).volume = 0;
        }
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
          if (hiringAvatarActiveRef.current) return;
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

  /* ── Unified avatar-mode effect ─────────────────────────────────────────────
     Manages audio, live video, and greeting for all avatar contexts.
     Key design principle: we NEVER call toggleAvatarHard(off) when the popup is
     hidden/closed. The avatar worker stays running so the avatarVideoTrack in the
     store remains subscribed and live. HiringAvatarPopup's <video> element (kept
     in the DOM via display:none / visuallyHidden) retains the MediaStream and
     videoReady stays true. When the popup becomes visible again (hiring tab open)
     it shows the live face immediately — no loading spinner.             */
  useEffect(() => {
    if (avatarPopupMode === 'hiring') {
      hiringAvatarActiveRef.current = true;
      // Stop the mute loop so audio elements are no longer silenced
      muteCleanupRef.current?.();

      // Belt-and-suspenders: explicitly unmute after AUDIO_SWALLOW_MS.
      // HiringAvatarPopup's unmute effect also handles this (via visuallyHidden
      // dep), but scheduling an explicit unmute here ensures audio plays even if
      // the component effect is delayed by React's batched render cycle.
      const { avatarAudioElement: ael } = useVoiceSessionStore.getState();
      if (ael) {
        setTimeout(() => {
          // Only unmute if still in hiring mode (popup not closed in between)
          if (!hiringAvatarActiveRef.current) return;
          ael.muted = false;
          ael.volume = 1;
          ael.play().catch(() => {});
        }, 2600); // slightly past AUDIO_SWALLOW_MS=2500 to align with swallow window
      }

      const { avatarAvailable, sessionState } = useVoiceSessionStore.getState();

      if (avatarAvailable) {
        // If avatar is already enabled (running from home session) — nothing to do.
        // The video track is still live; the popup will render it instantly.
        // If not yet enabled (first-ever open), turn it on now.
        const { avatarEnabled, toggleAvatarHard: tog } = useVoiceSessionStore.getState();
        if (!avatarEnabled) {
          tog().catch((e) => console.warn('[HiringAvatar] toggleAvatarHard(on) failed:', e));
        }
      } else if (!avatarAvailable) {
        // Fallback: no live avatar feature — unmute agent TTS audio element
        const { agentAudioTrack, agentAudioElement } = useVoiceSessionStore.getState();
        let audioEl: HTMLAudioElement | null = null;
        if (agentAudioElement) {
          agentAudioElement.muted = false;
          agentAudioElement.volume = 1;
          if (!document.body.contains(agentAudioElement)) document.body.appendChild(agentAudioElement);
          audioEl = agentAudioElement;
        } else if (agentAudioTrack) {
          try {
            audioEl = (agentAudioTrack as any).attach() as HTMLAudioElement;
            audioEl.muted = false;
            audioEl.volume = 1;
            audioEl.autoplay = true;
            document.body.appendChild(audioEl);
            useVoiceSessionStore.setState({ agentAudioElement: audioEl });
          } catch (e) {
            console.warn('[HiringAvatar] Could not attach agent audio:', e);
          }
        }
        hiringAudioRef.current = audioEl;
      }

      // Kick the agent greeting AFTER the avatar video track delivers frames.
      // HiringAvatarPopup dispatches 'hiring-avatar-video-ready' when its
      // <video> fires canplay — OR when visuallyHidden flips false and videoReady
      // is already true (home→hiring transition, track already warm).
      if (sessionState === 'connected' && !greetingFiredRef.current) {
        const sendGreeting = () => {
          if (greetingFiredRef.current) return;
          greetingFiredRef.current = true;
          greetingCleanupRef.current?.();
          greetingCleanupRef.current = null;
          const { room: liveRoom, sessionState: ss } = useVoiceSessionStore.getState();
          if (ss !== 'connected') return;
          liveRoom?.localParticipant
            ?.sendText('[HIRING_ASSISTANT]', { topic: 'lk.chat' })
            .catch(() => {});
        };

        let greetingDelayTimer: ReturnType<typeof setTimeout> | null = null;
        const onVideoReady = () => {
          greetingDelayTimer = setTimeout(sendGreeting, 2000);
        };
        window.addEventListener('hiring-avatar-video-ready', onVideoReady, { once: true });

        // If video is already ready (avatar was running from home session),
        // HiringAvatarPopup's visuallyHidden→false effect re-dispatches the event.
        // Belt-and-suspenders: also dispatch from here to cover the case where the
        // popup effect runs slightly before this dashboard effect subscribes.
        if (useVoiceSessionStore.getState().avatarVideoTrack) {
          setTimeout(
            () => window.dispatchEvent(new CustomEvent('hiring-avatar-video-ready')),
            150,
          );
        }

        // Hard fallback: greet after 20 s if event never fires
        const fallbackTimer = setTimeout(sendGreeting, 20_000);
        greetingCleanupRef.current = () => {
          window.removeEventListener('hiring-avatar-video-ready', onVideoReady);
          if (greetingDelayTimer !== null) clearTimeout(greetingDelayTimer);
          clearTimeout(fallbackTimer);
        };
      }

    } else if (avatarPopupMode === 'home') {
      hiringAvatarActiveRef.current = false;
      // Intentionally NOT stopping the mute loop — all audio stays muted.
      // hiringAvatarActiveRef.current = false makes startMuteLoop's skip() return
      // false so every audio/video element is muted on each tick.

      const {
        avatarAvailable,
        avatarEnabled,
        toggleAvatarHard,
        sessionState: ss,
      } = useVoiceSessionStore.getState();

      // Enable the avatar worker if not already running (first-ever open)
      if (avatarAvailable && !avatarEnabled) {
        toggleAvatarHard().catch((e) =>
          console.warn('[HomeAvatar] toggleAvatarHard(on) failed:', e),
        );
      }

      // Assign the silent role — suppressResponse() returns
      // disableNewResponseCreation:true so the platform generates no speech turn.
      if (ss === 'connected') {
        const { room: liveRoom } = useVoiceSessionStore.getState();
        liveRoom?.localParticipant
          ?.sendText('[HOME_ASSISTANT_SILENT]', { topic: 'lk.chat' })
          .catch(() => {});
      }

    } else {
      // avatarPopupMode = null: popup is hidden (display:none via visuallyHidden prop).
      // The avatar WORKER STAYS RUNNING — we do NOT call toggleAvatarHard(off).
      // This keeps avatarVideoTrack subscribed in the store and the <video>
      // element's MediaStream intact. Next popup open is instant (no re-attach).
      hiringAvatarActiveRef.current = false;
      greetingFiredRef.current = false;
      greetingCleanupRef.current?.();
      greetingCleanupRef.current = null;

      // Mute avatar audio immediately (worker still running but popup hidden)
      const { avatarAudioElement } = useVoiceSessionStore.getState();
      if (avatarAudioElement) {
        avatarAudioElement.muted = true;
      }

      // Clean up audio fallback element if present (no-avatar path)
      if (hiringAudioRef.current) {
        hiringAudioRef.current.muted = true;
        hiringAudioRef.current.volume = 0;
        if (document.body.contains(hiringAudioRef.current)) hiringAudioRef.current.remove();
        hiringAudioRef.current = null;
      }
      document.querySelectorAll('audio, video').forEach((el) => {
        (el as HTMLMediaElement).muted = true;
        (el as HTMLMediaElement).volume = 0;
      });

      // Clear any scene state (resets conversation context without disconnecting)
      useVoiceSessionStore.getState().clearScene();

      // Restart the mute loop so audio stays silent while popup is hidden
      muteCleanupRef.current = startMuteLoop(hiringAvatarActiveRef);
    }
  }, [avatarPopupMode]);

  /* Connect the AI session on mount via the Zustand store */
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    // Register site functions (e.g. cacheJobApplicants) for agent RPC calls
    registerSiteFunctions();

    // Start mute loop immediately to suppress any platform audio/video overlays
    muteCleanupRef.current = startMuteLoop(hiringAvatarActiveRef);

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
          // Ask the AI to list existing job postings. The system prompt handles
          // [FETCH_JOBS] by calling list_job_postings_by_poster and responding
          // with [JOB_LIST: id|title|location|status, ...]. flushResponse will
          // parse that marker and populate sessionCreatedJobs silently.
          fetchJobsRequestedRef.current = true;
          setJobsFetching(true);
          useVoiceSessionStore.getState().sendTextMessage('[FETCH_JOBS]').catch(() => {
            fetchJobsRequestedRef.current = false;
            setJobsFetching(false);
          });
        }, 2000);
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

  // Called when the user clicks "Create Job Posting" on an inline chat job card.
  // Opens the full wizard pre-filled with the chat-collected data so the employer
  // can review / edit all fields before publishing (matches images 2-8 in spec).
  const handleCreateJobPosting = useCallback((jobCard: NonNullable<ChatMessage["jobCard"]>) => {
    const inferredSkills = inferSkills(jobCard.title);
    setWizardInitialData({
      title:          jobCard.title,
      location:       jobCard.location || "",
      description:    jobCard.description || inferDescription(jobCard.title),
      employmentType: "Full Time",
      department:     "Engineering",
      skills: {
        mustHave:    jobCard.mustHave?.length    ? jobCard.mustHave    : inferredSkills.mustHave,
        preferred:   jobCard.preferred?.length   ? jobCard.preferred   : inferredSkills.preferred,
        niceToHave:  jobCard.niceToHave?.length  ? jobCard.niceToHave  : inferredSkills.niceToHave,
      },
    });
    setWizardPreFilled(true);
    setWizardOpen(true);
  }, []);


  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col gap-6" style={{ zIndex: 100, position: "relative" }}>
      {/* Singleton timer — drives job progression regardless of active page */}
      <JobProgressionManager />

      {/* ── Background — Figma node 3509:46544 "Widescreen background" ──
           Uses CSS radial-gradient (not filter:blur) so overflow:hidden never clips them.
           Gradient centers match Figma exactly; CSS renders only the in-bounds portion. ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 950px 950px at calc(50% - 720px) 319px,
            rgba(0,130,75,0.72) 0%, rgba(0,85,50,0.36) 38%, transparent 65%),
          radial-gradient(ellipse 1800px 1800px at calc(50% + 608px) 1452px,
            rgba(0,115,64,0.58) 0%, rgba(0,72,38,0.24) 38%, transparent 60%),
          #09090b
        `,
      }} />

      {/* ── Full-width Header — Figma 3921:21663 (1728px wide, h:96px, padding: 20px 32px) ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
        className="relative z-20 w-full flex items-center justify-between px-8 py-5 flex-shrink-0">

        {/* Left — Logo (flex: 1 0 0 to push nav to center) */}
        <div className="flex items-center" style={{ flex: '1 0 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-train-transparent.png"
            alt="trAIn"
            draggable={false}
            style={{ height: 48, width: 'auto', display: 'block', userSelect: 'none' }}
          />
        </div>

        {/* Center — nav pill (Home / Hiring / Workforce) */}
        <div className="glass-wrap hidden sm:flex flex-shrink-0" style={{ borderRadius: '100px' }}>
          <div className="glass-filter"></div>
          <div className="glass-overlay"></div>
          <div className="glass-specular"></div>
          <div className="glass-content p-2 gap-2">
            {(["home", "hiring", "workforce"] as NavTab[]).map((tab) => {
              const isActive = activeTab === tab && !chatMode && !isJobDetailOpen;
              const isHovered = hoveredNavTab === tab;
              const showGlass = isActive || isHovered;
              return (
                <button
                  key={tab}
                  className={cn(
                    showGlass ? "nav-tab-active" : "nav-tab-inactive",
                    "font-semibold text-base whitespace-nowrap",
                    isActive ? "text-[#f4f4f5]" : "text-[#f4f4f5]/50"
                  )}
                  onClick={() => {
                    if (tab === "hiring" && activeTab === "hiring") setHiringKey((k) => k + 1);
                    setActiveTab(tab);
                    setChatMode(false);
                  }}
                  onMouseEnter={() => setHoveredNavTab(tab)}
                  onMouseLeave={() => setHoveredNavTab(null)}
                >
                  <span style={{
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                  }}>
                    {tab === "home" ? "Home" : tab === "hiring" ? "Hiring" : "Workforce"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — notification bell + user menu (flex: 1 0 0, justify-end) */}
        <div className="flex items-center gap-3" style={{ flex: '1 0 0', justifyContent: 'flex-end' }}>
          {chatMode && (
            <button
              onClick={() => setChatMode(false)}
              onMouseEnter={() => setHoveredDashboardBack(true)}
              onMouseLeave={() => setHoveredDashboardBack(false)}
              className="text-xs transition-all duration-200 mr-1"
              style={{
                color: hoveredDashboardBack ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                padding: '6px 12px',
                borderRadius: 100,
                background: hoveredDashboardBack ? 'rgba(255,255,255,0.12)' : 'transparent',
                backdropFilter: hoveredDashboardBack ? 'blur(12px)' : 'none',
                WebkitBackdropFilter: hoveredDashboardBack ? 'blur(12px)' : 'none',
                border: hoveredDashboardBack ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                boxShadow: hoveredDashboardBack ? '0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
              }}>
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
          {/* Notification bell — 40×40, rounded-[100px] (glass outer layer) */}
          <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
            <div
              className="glass-wrap cursor-pointer"
              style={{ width: 40, height: 40, borderRadius: '100px' }}
            >
              <div className="glass-filter"></div>
              <div className="glass-overlay"></div>
              <div className="glass-specular"></div>
              <div
                className="glass-content"
                style={{
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center',
                }}
              >
                <Bell size={18} className="text-white/70" />
              </div>
            </div>
            {/* Notification dot — positioned OUTSIDE glass-wrap to avoid overflow clipping */}
            <span
              className="absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-[#09090b]"
              style={{ background: '#ff4040', zIndex: 10 }}
            />
          </div>
          {/* User menu pill — avatar + name + role + chevron (glass outer layer) */}
          <div className="glass-wrap flex-shrink-0" style={{ borderRadius: '100px' }}>
            <div className="glass-filter"></div>
            <div className="glass-overlay"></div>
            <div className="glass-specular"></div>
            <button
              className="glass-content gap-3 pl-2 pr-3 py-1.5"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <img
                  src="/avatar/omar-s.png"
                  alt="Omar S."
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
                <span className="text-[14px] font-bold text-[#fafafa] leading-5">Omar S.</span>
                <span className="text-[12px] leading-4" style={{ color: 'rgba(250,250,250,0.5)' }}>Hiring Manager</span>
              </div>
              <ChevronDown size={14} className="hidden sm:block flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Below-header row — sidebar (left) + centered content (right) ── */}
      <div className={`flex-1 min-h-0 flex pl-8 ${activeTab === "hiring" ? "overflow-y-hidden overflow-x-auto" : "overflow-hidden"}`}>

      {/* Left sidebar — Figma pill container: 396px from viewport top (header=96px, so 300px top-pad here) */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}
        className="hidden md:flex relative z-20 items-start justify-center"
        style={{ width: 68, flexShrink: 0, paddingTop: 300 }}>
        <div className="glass-wrap" style={{ borderRadius: '100px' }}>
          <div className="glass-filter"></div>
          <div className="glass-overlay"></div>
          <div className="glass-specular"></div>
          <div
            className="glass-content"
            style={{
              padding: 8,
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
          {sidebarIcons.map(({ img, label }, i) => {
            const isHovered = hoveredSidebarIcon === i;
            return (
              <div key={label} style={{ position: 'relative' }}>
                <button
                  aria-label={label}
                  className="transition-all duration-200"
                  style={{
                    boxSizing: 'border-box',
                    display: 'flex',
                    width: 40,
                    height: 40,
                    padding: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: '100px',
                    background: isHovered ? 'rgba(255,255,255,0.12)' : 'transparent',
                    backdropFilter: isHovered ? 'blur(12px)' : 'none',
                    WebkitBackdropFilter: isHovered ? 'blur(12px)' : 'none',
                    border: isHovered ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                    boxShadow: isHovered ? '0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                  }}
                  onMouseEnter={() => setHoveredSidebarIcon(i)}
                  onMouseLeave={() => setHoveredSidebarIcon(null)}
                >
                  <img
                    src={img}
                    alt={label}
                    style={{
                      display: 'block',
                      objectFit: 'contain',
                      width: 32,
                      height: 32,
                      filter: (i >= 2 && !isHovered)
                        ? 'brightness(0) saturate(0) invert(47%) opacity(0.85)'
                        : 'none',
                    }}
                  />
                </button>

                {/* Tooltip label — appears to the right on hover */}
                {isHovered && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 'calc(100% + 20px)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      whiteSpace: 'nowrap',
                      color: '#f4f4f5',
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '20px',
                      pointerEvents: 'none',
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </motion.aside>

      {/* ── Centering wrapper — fills remaining space after sidebar ── */}
      <div className={`relative z-10 flex-1 flex justify-center overflow-hidden ${(activeTab === "home" && chatMode) || activeTab === "hiring" ? "h-full" : "min-h-full"}`}>
      {/* ── Main frame — responsive up to 1264px, centered ── */}
      <div className={`w-full max-w-[1264px] flex flex-col ${activeTab === "home" && chatMode ? "h-full overflow-hidden" : activeTab === "hiring" ? "h-full" : "min-h-full"}`}>

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

        {/* Content — single unified layout; chatMode only changes home-tab content */}
        <AnimatePresence mode="wait">

          <motion.div key="dashboard"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 flex flex-col overflow-hidden">

              {/* When chatMode is active on the Home tab, show ChatView inline
                  (full-height, within the same outer dashboard layout — no separate screen).
                  All other tabs and the greeting/cards view are in the scrollable div below. */}
              {activeTab === "home" && !avatarMode && chatMode && (
                <ChatView
                  messages={messages}
                  isTyping={isTyping}
                  onSend={handleSend}
                  onChipClick={handleChipClick}
                  onCreateJobPosting={handleCreateJobPosting}
                  sessionReady={sessionReady}
                  wizardOpen={wizardOpen}
                  wizardInitialData={wizardInitialData}
                  wizardPreFilled={wizardPreFilled}
                  onGoToHiring={() => { setActiveTab("hiring"); setChatMode(false); }}
                  onWizardClose={() => {
                    setWizardOpen(false);
                    setWizardInitialData({});
                    setWizardPreFilled(false);
                  }}
                  onWizardFinish={(job) => {
                    setWizardOpen(false);
                    setWizardInitialData({});
                    setWizardPreFilled(false);

                    // Generate the job id here so we can stamp progression
                    // immediately — before HiringPage even mounts. This ensures
                    // talentPool shows 13 the instant the card appears, and the
                    // JobProgressionManager interval has a postedAt to work from.
                    const newJobId = `session-${Date.now()}`;
                    const postedAt = Date.now();

                    setSessionCreatedJobs((prev) => {
                      const alreadyExists = prev.some(
                        (j) => j.title === job.title && j.location === (job.location || null)
                      );
                      if (alreadyExists) return prev;
                      return [...prev, {
                        id: newJobId,
                        title: job.title,
                        location: job.location || null,
                        status: 'active',
                        department: job.department || null,
                        employment_type: null,
                        description: null,
                        skills: null,
                        salary_min: null,
                        salary_max: null,
                        posted_by: 'Omar S.',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      }];
                    });

                    // Stamp a progression record so LiveJobCard can identify this
                    // as an AI Developer job and show 0 screened / 13 talent pool.
                    // Matches any variant: "Senior AI Developer", "Mid-level AI Developer", etc.
                    // No timed stage transitions — the job detail view always shows
                    // 3 in Screening + 5 in Shortlisted directly.
                    if (/ai\s*developer/i.test(job.title)) {
                      const store = useVoiceSessionStore.getState();
                      if (!store.getJobProgression(newJobId)) {
                        store.setJobProgression(newJobId, {
                          jobId: newJobId,
                          stage: 'shortlisted',
                          postedAt,
                          screeningCount: 3,
                          shortlistCount: 5,
                          interviewCount: 0,
                          hireCount: 0,
                        });
                      }
                    }

                    const candidates = getJobCandidates(job.title);
                    setMessages(prev => [
                      ...prev,
                      {
                        id: `job-${Date.now()}`,
                        role: "assistant" as const,
                        text: "",
                        type: "job-posted" as const,
                        job,
                        candidates,
                      },
                    ]);
                  }}
                />
              )}

              <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden${(activeTab === "home" && !avatarMode && chatMode) || activeTab === "hiring" ? " hidden" : ""}`}>

                {activeTab === "home" && (
                  <motion.div key="home"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={avatarMode ? "h-full flex flex-col" : "flex flex-col items-center px-5 sm:px-8"}
                    style={!avatarMode ? { paddingTop: '14vh', paddingBottom: '10vh' } : undefined}
                  >

                    {avatarMode ? (
                      /* ══ AVATAR MODE — Figma 3764:30878 + 3764:31106 + 3764:31064 ══ */
                      <div className="flex-1 flex flex-col items-center justify-between overflow-hidden"
                        style={{ paddingBottom: '88px' /* leave room for fixed bottom nav */ }}>

                        {/* Speech bubble — Figma 3764:31106 */}
                        <div style={{ marginTop: '6vh', zIndex: 2, flexShrink: 0 }}>
                          <div style={{
                            background: 'rgba(39,39,42,0.5)',
                            borderRadius: 100,
                            padding: '12px 32px',
                            textAlign: 'center',
                          }}>
                            <p className="text-base font-bold text-white leading-[24px]">Welcome back, Omar.</p>
                            <p className="text-base font-light text-white leading-[24px]">Where should we begin?</p>
                          </div>
                        </div>

                        {/* Avatar image — Figma 3764:30878 */}
                        <div className="flex-1 flex items-end justify-center w-full" style={{ overflow: 'hidden' }}>
                          <img
                            src="/avatar/avatar-full.png"
                            alt="AI Assistant"
                            style={{
                              height: '65vh',
                              maxHeight: 620,
                              objectFit: 'contain',
                              objectPosition: 'bottom',
                              pointerEvents: 'none',
                              userSelect: 'none',
                            }}
                          />
                        </div>

                        {/* Action cards — Figma 3764:31064 */}
                        <div className="w-full px-5 sm:px-8 flex-shrink-0" style={{ marginTop: 12 }}>
                          <div className="flex gap-4 sm:gap-6 max-w-3xl mx-auto">
                            {/* Post a job */}
                            <button
                              className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border-0"
                              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', minWidth: 0 }}
                              onClick={() => {
                                setAvatarMode(false);
                                setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", text: "Post a job" }]);
                                setChatMode(true);
                                setTimeout(() => setWizardOpen(true), 200);
                              }}>
                              <div className="flex items-center gap-2" style={{ color: '#1ed25e' }}>
                                <BusinessCenterIcon size={20} />
                                <span className="text-base font-normal text-[#fafafa]">Post a job</span>
                              </div>
                              <ChevronRight size={18} className="text-white/40" />
                            </button>
                            {/* Review applicants */}
                            <button
                              className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border-0"
                              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', minWidth: 0 }}
                              onClick={() => { setAvatarMode(false); handleSend("Review applicants"); }}>
                              <div className="flex items-center gap-2" style={{ color: '#51a2ff' }}>
                                <PeopleAltIcon size={20} />
                                <span className="text-base font-normal text-[#fafafa]">Review applicants</span>
                              </div>
                              <ChevronRight size={18} className="text-white/40" />
                            </button>
                            {/* Track Development */}
                            <button
                              className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border-0"
                              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', minWidth: 0 }}
                              onClick={() => { setAvatarMode(false); handleSend("How is my training program?"); }}>
                              <div className="flex items-center gap-2" style={{ color: '#a78bfa' }}>
                                <PsychologyIcon size={20} />
                                <span className="text-base font-normal text-[#fafafa]">Track Development</span>
                              </div>
                              <ChevronRight size={18} className="text-white/40" />
                            </button>
                          </div>
                        </div>

                      </div>
                    ) : (
                      /* ══ TEXT HOME MODE ══ */
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

                        {/* Action cards */}
                        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 w-full">
                          <button
                            className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border-0"
                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', minWidth: 0 }}
                            onClick={() => {
                              setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", text: "Post a job" }]);
                              setChatMode(true);
                              setTimeout(() => setWizardOpen(true), 200);
                            }}>
                            <div className="flex items-center gap-2" style={{ color: '#1ed25e' }}>
                              <BusinessCenterIcon size={20} />
                              <span className="text-base font-normal text-[#fafafa]">Post a job</span>
                            </div>
                            <ArrowRight size={20} className="text-white/40" />
                          </button>
                          <button
                            className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border-0"
                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', minWidth: 0 }}
                            onClick={() => handleSend("Review applicants")}>
                            <div className="flex items-center gap-2" style={{ color: '#51a2ff' }}>
                              <PeopleAltIcon size={20} />
                              <span className="text-base font-normal text-[#fafafa]">Review applicants</span>
                            </div>
                            <ArrowRight size={20} className="text-white/40" />
                          </button>
                          <button
                            className="flex flex-1 h-[52px] items-center justify-between px-4 rounded-2xl transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border-0"
                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', minWidth: 0 }}
                            onClick={() => handleSend("How is my training program?")}>
                            <div className="flex items-center gap-2" style={{ color: '#a78bfa' }}>
                              <PsychologyIcon size={20} />
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
                    )}
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

              {/* Hiring tab — scrollable container; content sets its own minimum height */}
              {activeTab === "hiring" && (
                <motion.div key="hiring"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 min-h-0 flex flex-col overflow-y-auto"
                  style={{ maxHeight: 1040 }}>
                  <HiringTabContent
                    key={hiringKey}
                    prefetchedJobs={sessionCreatedJobs}
                    prefetchedJobsLoading={jobsFetching}
                    onJobDetailChange={(isOpen) => {
                      setIsJobDetailOpen(isOpen);
                      // Auto-hide the avatar popup when navigating into a job detail
                      if (isOpen) setAvatarPopupMode(null);
                    }}
                    onPostJob={() => {
                      setActiveTab("home");
                      setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", text: "Post a job" }]);
                      setChatMode(true);
                      setTimeout(() => setWizardOpen(true), 200);
                    }}
                  />
                </motion.div>
              )}

            </motion.div>
        </AnimatePresence>


        {/* Mobile tab bar (xs only) */}
        <div className="sm:hidden flex-shrink-0 flex items-center justify-around px-4 py-2"
          style={{ background: "var(--surface-sidebar)", borderTop: "1px solid var(--surface-elevated)" }}>
          {sidebarIcons.slice(0, 4).map(({ img, label }) => (
            <button key={label} aria-label={label}
              className="flex flex-col items-center gap-1 text-white/30 hover:text-white/60 transition-colors">
              <img src={img} alt={label} width={18} height={18} style={{ display: 'block', objectFit: 'contain', opacity: 0.5 }} />
            </button>
          ))}
          <button
            onClick={() => chatMode ? setChatMode(false) : null}
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-[10px]">
            <ChevronDown size={18} style={{ transform: chatMode ? "rotate(180deg)" : "none" }} />
            <span>{chatMode ? "Home" : "More"}</span>
          </button>
        </div>
      </div>{/* end 1264px main frame */}
      </div>{/* end centering wrapper */}
      </div>{/* end below-header row */}

      {/* Single persistent avatar popup.
          open={avatarEverStarted} keeps it mounted once activated so the <video>
          element is never destroyed — the live MediaStream stays attached.
          visuallyHidden puts it in display:none when not in use so it's invisible
          but the track keeps flowing. Mode switches (home↔hiring) are instant. */}
      {avatarEverStarted && (
        <HiringAvatarPopup
          open={avatarEverStarted}
          visuallyHidden={avatarPopupMode === null}
          silent={avatarPopupMode === 'home'}
          staticOptions={avatarPopupMode === 'home' ? HOME_AVATAR_OPTIONS : undefined}
          onClose={() => setAvatarPopupMode(null)}
          onOptionClick={(label) => {
            if (avatarPopupMode !== 'hiring') return;
            const { room: liveRoom } = useVoiceSessionStore.getState();
            liveRoom?.localParticipant
              ?.sendText(`[HIRING_ASSISTANT] user selected: ${label}`, { topic: 'lk.chat' })
              .catch(() => {});
          }}
        />
      )}

      {/* Glassmorphic AI Avatar FAB — bottom-right corner, all screens */}
      <AvatarFAB
        avatarReady={avatarVideoTrackReady}
        onPersonClick={() => {
          if (activeTab === 'hiring' && !isJobDetailOpen) {
            setAvatarEverStarted(true);
            setAvatarPopupMode((prev) => (prev === 'hiring' ? null : 'hiring'));
          } else if (activeTab === 'home') {
            setAvatarEverStarted(true);
            setAvatarPopupMode((prev) => (prev === 'home' ? null : 'home'));
          }
        }}
        hidden={
          (avatarPopupMode === 'hiring' && activeTab === 'hiring' && !isJobDetailOpen) ||
          (avatarPopupMode === 'home' && activeTab === 'home')
        }
      />
    </div>
  );
}
