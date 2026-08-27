export interface BlueprintTask {
  id: string;
  title: string;
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  assigneeRole: "EXECUTION_LEAD" | "MEMBER" | "UNASSIGNED";
}

export interface BlueprintMilestone {
  id: string;
  stageNumber: number;
  name: string;
  description: string;
  deliverables: string[];
  tasks: BlueprintTask[];
}

export interface ProjectTemplate {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  iconName: string;
  badgeText: string;
  recommendedPriority: "Critical" | "High" | "Medium" | "Low";
  recommendedDeadlineDays: number;
  tools: string[];
  documents: string[];
  milestones: BlueprintMilestone[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "software-product",
    title: "Software Product",
    subtitle: "Complete full-stack application lifecycle from PRD to production deployment.",
    category: "Engineering",
    description: "Standard engineering framework with 6 structured milestone gates, PRD/TRD deliverables, database schema approval, testing, and GitHub release pipeline.",
    iconName: "Code2",
    badgeText: "Most Popular",
    recommendedPriority: "High",
    recommendedDeadlineDays: 45,
    tools: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "GitHub", "Tailwind CSS"],
    documents: ["0. Project Charter", "1. Product Requirements (PRD)", "2. Technical Architecture (TRD)", "5. Database Schema & APIs", "9. Acceptance Test Suite"],
    milestones: [
      {
        id: "m1",
        stageNumber: 1,
        name: "M1 — Project Activation & Charter",
        description: "Validate executive mandate, assign CO-CEO lead, setup GitHub repo, and configure workspace permissions.",
        deliverables: ["Project Charter Document", "Connected GitHub Repo", "Assigned Team Matrix"],
        tasks: [
          { id: "t1-1", title: "Setup GitHub repository & branch protections", description: "Initialize repository with standard main/dev branch rules.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
          { id: "t1-2", title: "Initialize project workspace and member roles", description: "Grant project access to execution lead and assigned engineers.", priority: "Medium", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
      {
        id: "m2",
        stageNumber: 2,
        name: "M2 — Product & Tech Requirements",
        description: "Draft comprehensive PRD and TRD documents detailing specs, security, and application user workflows.",
        deliverables: ["Approved PRD Specification", "Technical Architecture Document (TRD)", "User Flow Wireframes"],
        tasks: [
          { id: "t2-1", title: "Write Product Requirements Document (PRD)", description: "Detail core functional requirements, scope, and user personas.", priority: "High", assigneeRole: "MEMBER" },
          { id: "t2-2", title: "Define Technical Requirements (TRD) & API specs", description: "Map REST/GraphQL API contracts and system dependencies.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m3",
        stageNumber: 3,
        name: "M3 — System Architecture & UI Design",
        description: "Complete relational database design, API schemas, design system components, and interactive mockups.",
        deliverables: ["Database ERD Diagram", "UI/UX High-Fidelity Mockups", "Component Design Tokens"],
        tasks: [
          { id: "t3-1", title: "Design database schema and migrations", description: "Model core entities, indexes, and foreign key relations.", priority: "High", assigneeRole: "MEMBER" },
          { id: "t3-2", title: "Build UI component library & layout system", description: "Create responsive components matching dark/light design system.", priority: "Medium", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m4",
        stageNumber: 4,
        name: "M4 — Application Development & Integration",
        description: "Execute frontend and backend implementation, API integration, and business logic execution.",
        deliverables: ["Functional Web Application", "Integrated Backend Services", "API Endpoints Passed"],
        tasks: [
          { id: "t4-1", title: "Implement API endpoints and controllers", description: "Build backend routes with RBAC middleware and input validation.", priority: "High", assigneeRole: "MEMBER" },
          { id: "t4-2", title: "Develop frontend pages & interactive state", description: "Assemble application views with optimistic UI state.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m5",
        stageNumber: 5,
        name: "M5 — Quality Assurance & Security Audit",
        description: "Conduct automated unit/integration tests, RBAC security verification, and performance optimization.",
        deliverables: ["Test Execution Report", "Security Audit Verification", "Zero Critical Vulnerabilities"],
        tasks: [
          { id: "t5-1", title: "Run end-to-end user path testing", description: "Verify all primary user paths and error fallback scenarios.", priority: "High", assigneeRole: "MEMBER" },
          { id: "t5-2", title: "Audit RBAC security permissions & API guards", description: "Ensure non-privileged users cannot access executive endpoints.", priority: "Critical", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
      {
        id: "m6",
        stageNumber: 6,
        name: "M6 — Final Submission & Deployment",
        description: "Deploy to production environment, verify SSL/DNS settings, post build artifacts, and submit for executive sign-off.",
        deliverables: ["Live Production Deployment", "Build Artifact Registry", "Executive Approval"],
        tasks: [
          { id: "t6-1", title: "Deploy application to production infrastructure", description: "Execute CI/CD build pipeline and verify live health check endpoints.", priority: "Critical", assigneeRole: "EXECUTION_LEAD" },
          { id: "t6-2", title: "Submit project for CEO final review and sign-off", description: "Compile final release notes, link repository, and request sign-off.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
    ],
  },

  {
    id: "ai-ml-project",
    title: "AI / ML Project",
    subtitle: "Data pipeline, model training, evaluation, vector search, and LLM orchestration system.",
    category: "Artificial Intelligence",
    description: "Tailored for AI solutions featuring dataset curation, feature engineering, model fine-tuning/RAG setup, benchmark evaluation, and API endpoint integration.",
    iconName: "Cpu",
    badgeText: "AI Recommended",
    recommendedPriority: "High",
    recommendedDeadlineDays: 60,
    tools: ["Python", "PyTorch", "OpenAI API", "Pinecone/pgvector", "LangChain", "FastAPI"],
    documents: ["0. AI Project Charter", "1. Dataset Specification", "2. Model Architecture & RAG Pipeline", "8. AI Benchmark Evaluation Report"],
    milestones: [
      {
        id: "m1",
        stageNumber: 1,
        name: "M1 — AI Mandate & Dataset Curation",
        description: "Define model metrics, gather training/validation datasets, clean data, and establish benchmark baselines.",
        deliverables: ["Validated Dataset Package", "Data Cleaning Pipeline", "Benchmark Definition"],
        tasks: [
          { id: "t1-1", title: "Collect and preprocess training/evaluation data", description: "Clean raw text/tabular data and structure jsonl schemas.", priority: "High", assigneeRole: "MEMBER" },
          { id: "t1-2", title: "Define accuracy and latency evaluation metrics", description: "Set baseline target thresholds for accuracy, precision, and response latency.", priority: "Medium", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
      {
        id: "m2",
        stageNumber: 2,
        name: "M2 — RAG / Vector Store Setup & Pipeline Architecture",
        description: "Design embedding models, vector database indexing, prompt templates, and retrieval evaluation.",
        deliverables: ["Indexed Vector Database", "RAG Pipeline Architecture", "Prompt Library"],
        tasks: [
          { id: "t2-1", title: "Configure vector database & embedding pipeline", description: "Generate embeddings and index corpus into vector database.", priority: "High", assigneeRole: "MEMBER" },
          { id: "t2-2", title: "Develop prompt engineering & agent orchestration", description: "Build prompt chains with structured output parser validation.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m3",
        stageNumber: 3,
        name: "M3 — Model Training / Integration",
        description: "Connect LLM/Model endpoints to application backend with fallback streaming response controls.",
        deliverables: ["AI Inference API Endpoint", "Fallback Provider Router", "Token Usage Monitor"],
        tasks: [
          { id: "t3-1", title: "Build inference API wrapper service", description: "Expose streaming endpoints with token limit enforcement and rate limiting.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m4",
        stageNumber: 4,
        name: "M4 — Benchmark Testing & Safety Evaluation",
        description: "Evaluate model performance against edge cases, guardrails, hallucinations, and safety constraints.",
        deliverables: ["Benchmark Evaluation Report", "Safety Guardrail Verification"],
        tasks: [
          { id: "t4-1", title: "Execute automated evaluation test suite", description: "Assess accuracy, hallucination rates, and prompt injection resilience.", priority: "Critical", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
      {
        id: "m5",
        stageNumber: 5,
        name: "M5 — Deployment & Executive Sign-off",
        description: "Deploy model services to production infrastructure and monitor real-world accuracy metrics.",
        deliverables: ["Live AI Infrastructure", "Monitoring Dashboard"],
        tasks: [
          { id: "t5-1", title: "Deploy inference microservice & monitor latency", description: "Launch model API with real-time token telemetry.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
    ],
  },

  {
    id: "saas-product",
    title: "SaaS Product",
    subtitle: "Multi-tenant B2B/B2C SaaS with subscription plans, authentication, team RBAC, and analytics.",
    category: "Product Management",
    description: "Built for multi-tenant software platforms including auth workflows, subscription tiers, usage tracking, organization management, and billing dashboards.",
    iconName: "Rocket",
    badgeText: "SaaS Ready",
    recommendedPriority: "High",
    recommendedDeadlineDays: 30,
    tools: ["Next.js", "Stripe", "PostgreSQL", "Tailwind CSS", "Resend", "Lucide Icons"],
    documents: ["0. SaaS Product Scope", "1. Multi-Tenant PRD", "5. Billing & RBAC Architecture", "9. Launch Checklist"],
    milestones: [
      {
        id: "m1",
        stageNumber: 1,
        name: "M1 — Multi-Tenant Architecture & Auth Setup",
        description: "Implement user authentication, organization workspace creation, invite links, and role permissions.",
        deliverables: ["Auth & Workspace Engine", "RBAC Middleware System"],
        tasks: [
          { id: "t1-1", title: "Setup authentication & JWT/Session management", description: "Configure login, signup, password reset, and session cookies.", priority: "High", assigneeRole: "MEMBER" },
          { id: "t1-2", title: "Implement multi-tenant workspace isolation", description: "Ensure database queries strictly scope records by workspaceId.", priority: "Critical", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
      {
        id: "m2",
        stageNumber: 2,
        name: "M2 — Core Feature Development & Dashboard",
        description: "Build main SaaS dashboard views, resource management tools, interactive tables, and user actions.",
        deliverables: ["Interactive Dashboard", "Resource CRUD Modules"],
        tasks: [
          { id: "t2-1", title: "Develop primary SaaS features & analytics charts", description: "Build main product interface and metrics summaries.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m3",
        stageNumber: 3,
        name: "M3 — Billing Integration & Plan Tier Controls",
        description: "Connect Stripe payment webhooks, subscription plan limits, usage tracking, and invoice management.",
        deliverables: ["Stripe Checkout & Billing Portal", "Feature Gating Middleware"],
        tasks: [
          { id: "t3-1", title: "Integrate Stripe subscription webhooks & tiers", description: "Sync customer subscriptions, plan upgrades, and webhook handlers.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m4",
        stageNumber: 4,
        name: "M4 — Launch & Public Release",
        description: "Perform final load testing, domain configuration, onboarding sequence verification, and public launch.",
        deliverables: ["Public Product Launch", "Onboarding Flow Completed"],
        tasks: [
          { id: "t4-1", title: "Final launch checklist & executive review", description: "Submit platform for final CEO approval and DNS rollout.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
    ],
  },

  {
    id: "research-project",
    title: "Research Project",
    subtitle: "Literature review, hypothesis formulation, experimentation, data synthesis, and paper publication.",
    category: "Research",
    description: "Structured research methodology for academic, technical, or market research projects with literature reviews, hypothesis testing, and artifact publication.",
    iconName: "BookOpen",
    badgeText: "Academic",
    recommendedPriority: "Medium",
    recommendedDeadlineDays: 90,
    tools: ["LaTeX", "Python", "Jupyter", "Pandas", "Zotero"],
    documents: ["0. Research Proposal", "1. Literature Review", "4. Experimental Data Log", "10. Final Research Paper"],
    milestones: [
      {
        id: "m1",
        stageNumber: 1,
        name: "M1 — Proposal & Literature Survey",
        description: "Formulate research questions, review existing literature, and draft formal methodology proposal.",
        deliverables: ["Approved Research Proposal", "Annotated Bibliography"],
        tasks: [
          { id: "t1-1", title: "Conduct literature review & gap analysis", description: "Summarize existing research papers and identify unexplored gaps.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m2",
        stageNumber: 2,
        name: "M2 — Experimentation & Data Collection",
        description: "Execute research experiments, gather empirical data, log metrics, and validate reproducibility.",
        deliverables: ["Raw Dataset Log", "Experimental Scripts"],
        tasks: [
          { id: "t2-1", title: "Run experimental benchmarks & record results", description: "Execute test scripts and store structured observations.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m3",
        stageNumber: 3,
        name: "M3 — Data Synthesis & Paper Publication",
        description: "Synthesize findings into charts, draft technical paper manuscript, and submit for peer/executive review.",
        deliverables: ["Final Research Paper Manuscript", "Data Visualizations"],
        tasks: [
          { id: "t3-1", title: "Draft paper manuscript & finalize figures", description: "Compile results, discuss implications, and format LaTeX document.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
    ],
  },

  {
    id: "college-project",
    title: "College Project",
    subtitle: "Student group project with sprint milestones, mentor reviews, repository setup, and presentation.",
    category: "Academic",
    description: "Designed for academic projects with clear milestone deadlines, team role divisions, documentation submissions, GitHub tracking, and presentation deliverables.",
    iconName: "GraduationCap",
    badgeText: "College Focus",
    recommendedPriority: "High",
    recommendedDeadlineDays: 21,
    tools: ["GitHub", "React", "Node.js", "MongoDB / PostgreSQL", "Figma"],
    documents: ["0. Project Abstract", "1. System Requirements Document", "2. Architecture Diagram", "10. Final Project Report & PPT"],
    milestones: [
      {
        id: "m1",
        stageNumber: 1,
        name: "M1 — Abstract & Team Formation",
        description: "Formulate project abstract, assign team roles, create GitHub organization repository, and get mentor sign-off.",
        deliverables: ["Project Abstract Document", "GitHub Repo Link", "Role Assignment List"],
        tasks: [
          { id: "t1-1", title: "Draft project abstract & objective statement", description: "Detail problem statement, scope, and key deliverables.", priority: "High", assigneeRole: "MEMBER" },
          { id: "t1-2", title: "Create GitHub repository & invite group members", description: "Setup repository, branch structure, and initial README.", priority: "Medium", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
      {
        id: "m2",
        stageNumber: 2,
        name: "M2 — System Design & Prototype Development",
        description: "Design UI wireframes, model database entities, and build initial functional prototype.",
        deliverables: ["UI Design Specs", "Working Prototype", "API Schema"],
        tasks: [
          { id: "t2-1", title: "Develop core functional modules", description: "Build frontend UI pages and connected backend APIs.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m3",
        stageNumber: 3,
        name: "M3 — Final Report & Presentation Submission",
        description: "Complete testing, compile final project report document, create presentation slides, and submit for evaluation.",
        deliverables: ["Final Project Documentation PDF", "Presentation PPT Deck", "Live Demonstration"],
        tasks: [
          { id: "t3-1", title: "Prepare presentation slides & live demo script", description: "Draft slides covering objective, architecture, demo, and results.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
    ],
  },

  {
    id: "marketing-project",
    title: "Marketing Project",
    subtitle: "Campaign strategy, content creation, social media rollout, analytics tracking, and performance reports.",
    category: "Marketing",
    description: "Framework for marketing and brand launches, including campaign asset creation, channel schedule, launch sequence, and ROI reporting.",
    iconName: "Megaphone",
    badgeText: "Campaign Focus",
    recommendedPriority: "Medium",
    recommendedDeadlineDays: 14,
    tools: ["Figma", "Google Analytics", "Social Media Scheduler", "Mailchimp"],
    documents: ["0. Campaign Strategy Brief", "1. Content Calendar", "10. Campaign Performance Report"],
    milestones: [
      {
        id: "m1",
        stageNumber: 1,
        name: "M1 — Campaign Brief & Asset Creation",
        description: "Define target audience metrics, write copy briefs, and design visual marketing assets.",
        deliverables: ["Marketing Brief Document", "Approved Visual Assets"],
        tasks: [
          { id: "t1-1", title: "Create campaign graphics & promotional copy", description: "Design banners, social media cards, and write launch copy.", priority: "High", assigneeRole: "MEMBER" },
        ],
      },
      {
        id: "m2",
        stageNumber: 2,
        name: "M2 — Campaign Launch & Rollout",
        description: "Publish content across target marketing channels, execute email newsletter send, and monitor engagement.",
        deliverables: ["Published Social Posts", "Delivered Email Campaign"],
        tasks: [
          { id: "t2-1", title: "Execute multi-channel launch sequence", description: "Distribute posts and track initial conversion metrics.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
    ],
  },

  {
    id: "custom-project",
    title: "Custom Project",
    subtitle: "Blank blueprint builder with custom milestone phases, tasks, and role assignments.",
    category: "General",
    description: "Build a completely customized project structure from scratch with your own custom milestone names, deadlines, tasks, and document requirements.",
    iconName: "Sparkles",
    badgeText: "Full Control",
    recommendedPriority: "Medium",
    recommendedDeadlineDays: 30,
    tools: ["Custom Tools"],
    documents: ["0. Project Mandate"],
    milestones: [
      {
        id: "m1",
        stageNumber: 1,
        name: "M1 — Milestone Phase 1",
        description: "Initial milestone phase for your custom project execution.",
        deliverables: ["Initial Phase Deliverables"],
        tasks: [
          { id: "t1-1", title: "Initial Task 1", description: "Define task execution mandate.", priority: "Medium", assigneeRole: "EXECUTION_LEAD" },
        ],
      },
    ],
  },
];
