from datetime import datetime
import re
from database import categories_collection, questions_collection

DEFAULT_CATEGORIES_DATA = [
    {
        "name": "Frontend Development",
        "description": "Core web concepts, React, modern JavaScript, CSS architecture, browser APIs, and frontend performance.",
        "icon": "Code",
        "status": "active",
        "questions": [
            {
                "question_text": "Explain the Virtual DOM and reconciliation process in React. How does React determine when and what to re-render?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["React", "Virtual DOM", "Performance"],
                "expected_answer": "The Virtual DOM is a lightweight in-memory JavaScript representation of the real DOM. React maintains two fiber trees (current and workInProgress). During state updates, React diffs trees using heuristic O(n) algorithm comparing element types and keys, calculating minimal DOM mutations to commit.",
                "status": "active"
            },
            {
                "question_text": "What are React Server Components (RSC) and how do they differ from traditional Client Components?",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["React", "Next.js", "Architecture"],
                "expected_answer": "RSC execute purely on the server and return a serialized stream (not HTML or JS bundle), adding zero KB to client JavaScript bundles. They can access server-side resources directly without client-side API waterfalls.",
                "status": "active"
            },
            {
                "question_text": "Describe the JavaScript Event Loop, the Microtask Queue vs Macrotask Queue, and execution precedence.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["JavaScript", "Event Loop", "Async"],
                "expected_answer": "JavaScript is single-threaded. Synchronous code runs on the Call Stack. When stack empties, the Event Loop drains the Microtask queue (Promises, queueMicrotask, MutationObserver) completely before picking the next Macrotask (setTimeout, setInterval, I/O, UI rendering).",
                "status": "active"
            },
            {
                "question_text": "How do you optimize Core Web Vitals (LCP, INP, CLS) in a modern single-page application?",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["Web Vitals", "Performance", "Optimization"],
                "expected_answer": "LCP: Preload hero assets, use responsive images (webp/avif), server-render critical markup. INP: Avoid long tasks on main thread, yield using requestIdleCallback/scheduler.postTask. CLS: Set explicit dimensions on images/embeds, reserve layout space for dynamic banners.",
                "status": "active"
            },
            {
                "question_text": "What is the difference between CSS Flexbox and CSS Grid, and when should each be used?",
                "difficulty": "Easy",
                "type": "Conceptual",
                "tags": ["CSS", "Layout", "Responsive"],
                "expected_answer": "Flexbox is 1-dimensional (arranges items in a single row or column), best for component-level alignment and linear layouts. Grid is 2-dimensional (controls both rows and columns simultaneously), best for complete page layouts and complex overlapping designs.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Backend & Distributed Systems",
        "description": "API design, SQL & NoSQL databases, microservices, authentication security, caching, and scalability.",
        "icon": "Server",
        "status": "active",
        "questions": [
            {
                "question_text": "Explain how JWT authentication works and what security vulnerabilities need to be mitigated in production.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Auth", "Security", "JWT"],
                "expected_answer": "JWT contains Header, Payload, Signature. Stored in httpOnly Secure cookies to prevent XSS. CSRF protection using SameSite cookies or double-submit tokens. Mitigate stale tokens using short expiration (15m) + refresh token rotation and revocation lists.",
                "status": "active"
            },
            {
                "question_text": "Compare SQL and NoSQL databases: In what scenarios would you choose PostgreSQL over MongoDB?",
                "difficulty": "Medium",
                "type": "Conceptual",
                "tags": ["Database", "SQL", "MongoDB", "Architecture"],
                "expected_answer": "Choose PostgreSQL for strong relational schemas, ACID compliance across tables, complex analytical queries, and foreign key integrity. Choose MongoDB for rapid schema evolution, hierarchical/nested document models, high-volume unstructured data, and easy horizontal sharding.",
                "status": "active"
            },
            {
                "question_text": "How would you design a distributed rate limiter capable of handling 100,000 requests/sec across multiple API nodes?",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["System Design", "Rate Limiting", "Redis"],
                "expected_answer": "Use Redis with sliding window log or token bucket algorithm. Execute rate-limiting checks via atomic Redis Lua scripts to prevent race conditions. Return standard HTTP 429 status with Retry-After and X-RateLimit headers.",
                "status": "active"
            },
            {
                "question_text": "Explain B-Tree indexing in relational databases and why having too many indexes degrades write throughput.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Database", "Indexing", "Performance"],
                "expected_answer": "B-Trees keep keys sorted for logarithmic O(log N) lookups, range scans, and sorting. Every INSERT, UPDATE, or DELETE requires rebalancing and rewriting index pages to disk, multiplying I/O and locking overhead.",
                "status": "active"
            },
            {
                "question_text": "What is the difference between synchronous HTTP communication and asynchronous message queues like Kafka or RabbitMQ?",
                "difficulty": "Easy",
                "type": "Conceptual",
                "tags": ["API", "Message Queue", "Architecture"],
                "expected_answer": "Synchronous HTTP blocks the caller waiting for immediate response, tightly coupling services. Asynchronous queues decouple producer and consumer, buffer burst traffic, guarantee eventual processing, and prevent cascading system failures.",
                "status": "active"
            }
        ]
    },
    {
        "name": "AI & Machine Learning",
        "description": "Deep learning architectures, LLMs, NLP pipelines, vector search, embeddings, and model evaluation.",
        "icon": "Cpu",
        "status": "active",
        "questions": [
            {
                "question_text": "Explain the Multi-Head Self-Attention mechanism in the Transformer architecture.",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["Deep Learning", "Transformers", "LLM"],
                "expected_answer": "Computes Query (Q), Key (K), and Value (V) projections. Softmax((Q * K^T) / sqrt(d_k)) * V produces attention weights showing token dependencies across the whole sequence in parallel, capturing multiple contextual representations simultaneously across heads.",
                "status": "active"
            },
            {
                "question_text": "What is Retrieval-Augmented Generation (RAG) and how does it prevent hallucinations in Large Language Models?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["AI", "RAG", "Embeddings", "LLM"],
                "expected_answer": "RAG converts documents into vector embeddings stored in a vector DB. When a prompt arrives, cosine similarity retrieves relevant document chunks and injects them as grounding context into the model's prompt, constraining outputs to verified facts.",
                "status": "active"
            },
            {
                "question_text": "Explain Precision, Recall, F1-Score, and ROC-AUC: Which metric would you prioritize for a credit card fraud detection system?",
                "difficulty": "Medium",
                "type": "Conceptual",
                "tags": ["Evaluation", "Metrics", "Data Science"],
                "expected_answer": "Prioritize Recall (Sensitivity) to catch as many fraudulent cases as possible (minimizing False Negatives), while monitoring Precision and PR-AUC due to extreme class imbalance in fraud datasets.",
                "status": "active"
            },
            {
                "question_text": "What is the difference between Supervised Learning, Unsupervised Learning, and Reinforcement Learning?",
                "difficulty": "Easy",
                "type": "Conceptual",
                "tags": ["ML Basics", "AI", "Foundations"],
                "expected_answer": "Supervised learning trains on labeled input-output pairs (classification/regression). Unsupervised learning identifies hidden patterns in unlabeled data (clustering/PCA). Reinforcement learning trains agents to maximize cumulative rewards through trial and error.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Behavioral & Leadership",
        "description": "Team collaboration, conflict resolution, ownership, engineering ethics, and leadership scenarios.",
        "icon": "Users",
        "status": "active",
        "questions": [
            {
                "question_text": "Describe a situation where you had a significant technical disagreement with a colleague. How did you resolve it?",
                "difficulty": "Medium",
                "type": "Behavioral",
                "tags": ["Collaboration", "Conflict Resolution", "Communication"],
                "expected_answer": "Candidate should use the STAR method: explain the context, focus on objective data and empirical testing/benchmarks, practice active listening, and reach consensus aligned with business priorities rather than ego.",
                "status": "active"
            },
            {
                "question_text": "Tell me about a high-severity production outage or bug that occurred under your watch. How did you handle the response?",
                "difficulty": "Hard",
                "type": "Behavioral",
                "tags": ["Incident Response", "Accountability", "Leadership"],
                "expected_answer": "STAR framework: Immediate mitigation/rollback, clear and transparent stakeholder communication, blameless post-mortem analysis (5 Whys), root cause identification, and implementation of automated safeguards.",
                "status": "active"
            },
            {
                "question_text": "How do you handle ambiguous requirements and competing deadlines from multiple stakeholders?",
                "difficulty": "Easy",
                "type": "Situational",
                "tags": ["Prioritization", "Time Management", "Communication"],
                "expected_answer": "Clarify core requirements by creating quick prototypes/specs, prioritize based on business value and effort (e.g. RICE or Eisenhower matrix), and proactively communicate trade-offs with stakeholders.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Data Analytics & SQL",
        "description": "SQL querying, window functions, statistical data cleaning, ETL processes, and dashboarding metrics.",
        "icon": "BarChart3",
        "status": "active",
        "questions": [
            {
                "question_text": "Explain SQL Window Functions (ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG) and their real-world applications.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["SQL", "Analytics", "Database"],
                "expected_answer": "Window functions perform calculations across a set of rows related to the current row without collapsing rows like GROUP BY. Applications include ranking top performers per category, computing running totals, and calculating month-over-month growth with LAG.",
                "status": "active"
            },
            {
                "question_text": "How do you detect and handle outliers in a dataset prior to training predictive statistical models?",
                "difficulty": "Easy",
                "type": "Conceptual",
                "tags": ["Statistics", "Data Cleaning", "Analytics"],
                "expected_answer": "Detection via IQR rule (1.5 * IQR above Q3 or below Q1), Z-scores (> 3 sigma), and boxplot visualizations. Handled via capping/winsorization, log transformations, or removal if confirmed as data entry errors.",
                "status": "active"
            }
        ]
    },
    # -----------------------------------------------------------------------
    # NON-IT PROFESSIONAL CATEGORIES & ROLE INTERVIEW QUESTION SETS
    # -----------------------------------------------------------------------
    {
        "name": "Healthcare & Medicine",
        "description": "Clinical diagnosis, patient consultation, emergency triage, pharmacology, and medical ethics for physicians and healthcare providers.",
        "icon": "Stethoscope",
        "status": "active",
        "questions": [
            {
                "question_text": "Walk me through your clinical approach to a patient presenting with acute chest pain in the emergency department. What differential diagnoses do you prioritize?",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["Clinical Diagnosis", "Emergency Medicine", "Cardiology", "Triage"],
                "expected_answer": "Immediate ABC assessment, vital signs, ECG within 10 minutes, and targeted history. Prioritize life-threatening differentials: acute coronary syndrome (STEMI/NSTEMI), aortic dissection, pulmonary embolism, tension pneumothorax, and esophageal rupture. Order cardiac biomarkers (troponin), chest X-ray, and start oxygen/aspirin/heparin as indicated.",
                "status": "active"
            },
            {
                "question_text": "How do you handle a situation where a patient refuses a life-saving medical procedure due to personal or religious convictions?",
                "difficulty": "Medium",
                "type": "Behavioral",
                "tags": ["Medical Ethics", "Patient Autonomy", "Communication", "Informed Consent"],
                "expected_answer": "Assess decision-making capacity and ensure informed consent/refusal. Practice empathetic listening without judgment, explore underlying concerns, clarify risks including death, and discuss permissible alternatives. Respect patient autonomy if competent, document thoroughly, and involve hospital ethics or legal counsel if capacity is impaired.",
                "status": "active"
            },
            {
                "question_text": "Explain your approach to antibiotic stewardship and how you prevent the over-prescription of broad-spectrum antimicrobials in clinical practice.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Pharmacology", "Infectious Disease", "Antimicrobial Stewardship", "Safety"],
                "expected_answer": "Distinguish viral from bacterial etiologies using clinical criteria and rapid testing. Obtain appropriate cultures prior to starting empirical therapy. De-escalate or narrow antimicrobial spectrum based on microbiological sensitivity results, use the shortest effective duration, and consult local antibiograms.",
                "status": "active"
            },
            {
                "question_text": "Using the SPIKES protocol or a structured framework, describe how you deliver bad news or a terminal prognosis to a patient and their family.",
                "difficulty": "Hard",
                "type": "Situational",
                "tags": ["Patient Communication", "SPIKES Protocol", "Empathy", "Palliative Care"],
                "expected_answer": "SPIKES framework: Setting (private, uninterrupted), Perception (ask what they understand), Invitation (confirm how much detail they want), Knowledge (warn beforehand, deliver clearly without medical jargon), Empathy (acknowledge emotional reactions with warmth), and Strategy/Summary (outline concrete next steps and care plan).",
                "status": "active"
            },
            {
                "question_text": "What steps do you take when you realize you or a colleague have made a medication dosing or diagnostic error?",
                "difficulty": "Easy",
                "type": "Behavioral",
                "tags": ["Patient Safety", "Accountability", "Error Reporting", "Ethics"],
                "expected_answer": "Immediate priority is patient safety: assess the patient, stabilize vital signs, and provide corrective medical countermeasures. Promptly and transparently disclose the error to the patient and attending team, complete formal hospital incident reporting, and participate in root cause analysis.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Nursing & Patient Care",
        "description": "Inpatient nursing, medication administration, vitals monitoring, patient safety, and interdisciplinary clinical handoffs.",
        "icon": "HeartPulse",
        "status": "active",
        "questions": [
            {
                "question_text": "Explain the 'Five Rights' of medication administration and how you verify patient safety when handling high-risk drugs.",
                "difficulty": "Easy",
                "type": "Technical",
                "tags": ["Medication Safety", "Patient Care", "Pharmacology", "Nursing Protocols"],
                "expected_answer": "Right patient (two unique identifiers), right drug, right dose, right route, right time, with right documentation. For high-alert medications (e.g. insulin, heparin, concentrated electrolytes), conduct independent double-checks with a second registered nurse and cross-reference allergy records.",
                "status": "active"
            },
            {
                "question_text": "How do you structure a critical clinical handoff or physician notification during an acute patient deterioration using the SBAR technique?",
                "difficulty": "Medium",
                "type": "Behavioral",
                "tags": ["SBAR", "Clinical Handoff", "Communication", "Emergency Response"],
                "expected_answer": "SBAR technique: Situation (who, room, current acute concern), Background (admitting diagnosis, baseline vitals, relevant history), Assessment (current vital signs, mental status, clinical impression of decline), and Recommendation (specific action requested: immediate bedside evaluation, transfer, or specific orders).",
                "status": "active"
            },
            {
                "question_text": "Describe your protocol for preventing catheter-associated urinary tract infections (CAUTI) and hospital-acquired pressure ulcers.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Infection Control", "Wound Care", "Patient Safety", "Clinical Guidelines"],
                "expected_answer": "CAUTI: Maintain strict aseptic insertion, maintain closed drainage system below bladder level, daily review of catheter necessity, and prompt removal. Pressure ulcers: Regular Braden Scale risk assessments, scheduled repositioning every 2 hours, pressure-relieving support surfaces, skin moisture barriers, and nutritional support.",
                "status": "active"
            },
            {
                "question_text": "How do you de-escalate an anxious, agitated, or combative patient while maintaining a safe therapeutic environment?",
                "difficulty": "Medium",
                "type": "Situational",
                "tags": ["De-escalation", "Mental Health", "Safety", "Therapeutic Communication"],
                "expected_answer": "Maintain a calm, non-threatening posture, speak in low and steady tones, and keep a safe physical distance. Practice active listening to validate the patient's distress, address immediate physical comfort needs, avoid arguing, and call for designated security/de-escalation team support if physical harm is threatened.",
                "status": "active"
            },
            {
                "question_text": "Tell me about a time when you noticed subtle physiological changes in a patient that prevented a serious clinical complication.",
                "difficulty": "Hard",
                "type": "Behavioral",
                "tags": ["Critical Thinking", "Clinical Vigilance", "Assessment", "Patient Safety"],
                "expected_answer": "Using STAR: describe noticing early signs of sepsis or shock (subtle tachypnea, mild confusion, trending oliguria, widening pulse pressure). Detail taking prompt repeat vitals, notifying the physician with clear clinical evidence, obtaining blood cultures/lactate, and initiating early fluid resuscitation.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Education & Teaching",
        "description": "Pedagogical design, curriculum differentiation, student engagement, classroom management, and formative assessment.",
        "icon": "GraduationCap",
        "status": "active",
        "questions": [
            {
                "question_text": "How do you implement differentiated instruction in a classroom with diverse learning abilities, neurodiverse students, and English language learners?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Differentiation", "Pedagogy", "Inclusive Education", "Lesson Planning"],
                "expected_answer": "Differentiate content, process, and products: provide tiered assignments, multimodal instruction (visual, auditory, kinesthetic), scaffolded reading levels, graphic organizers, and flexible grouping. Ensure alignment with Individualized Education Programs (IEP) and provide multiple avenues for students to demonstrate mastery.",
                "status": "active"
            },
            {
                "question_text": "What is the difference between formative and summative assessment, and how do you use formative assessment data to adapt your day-to-day teaching?",
                "difficulty": "Easy",
                "type": "Conceptual",
                "tags": ["Assessment", "Curriculum", "Data-Driven Instruction", "Pedagogy"],
                "expected_answer": "Formative assessments are ongoing low-stakes checks during learning (exit tickets, think-pair-share, digital polls) used to identify gaps in real time and adjust pacing. Summative assessments evaluate cumulative learning at unit ends (final exams, projects). Use formative feedback to re-teach difficult concepts or regroup students.",
                "status": "active"
            },
            {
                "question_text": "Describe your philosophy and practical strategies for positive classroom management and handling persistent disruptive behavior.",
                "difficulty": "Medium",
                "type": "Behavioral",
                "tags": ["Classroom Management", "Restorative Justice", "Student Engagement"],
                "expected_answer": "Establish clear, consistent expectations and co-created classroom norms on day one. Focus on positive reinforcement, restorative conversations over punitive measures, identifying underlying triggers (boredom, academic struggle, emotional trauma), and partnering with parents and counselors for persistent challenges.",
                "status": "active"
            },
            {
                "question_text": "How do you foster critical thinking and inquiry-based learning rather than passive memorization in your subject area?",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["Critical Thinking", "Inquiry-Based Learning", "STEM/Humanities"],
                "expected_answer": "Utilize Socratic questioning, open-ended problem-based investigations, case studies, and debate. Encourage students to formulate hypotheses, analyze primary sources or experimental data, defend arguments with empirical evidence, and reflect on metacognitive problem-solving strategies.",
                "status": "active"
            },
            {
                "question_text": "How do you handle a difficult meeting with angry or defensive parents who disagree with their child's academic grades or behavioral intervention?",
                "difficulty": "Medium",
                "type": "Situational",
                "tags": ["Parent-Teacher Communication", "Conflict Resolution", "Empathy"],
                "expected_answer": "Approach with empathy and common purpose: affirming that both teacher and parents want the student to succeed. Come prepared with concrete objective evidence (rubrics, student work samples, observation logs), listen actively without defensiveness, and co-create an actionable, agreed-upon improvement plan with scheduled follow-up.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Accounting & Financial Analysis",
        "description": "Financial statements, GAAP & IFRS accounting standards, taxation, audit procedures, and working capital analysis.",
        "icon": "Calculator",
        "status": "active",
        "questions": [
            {
                "question_text": "Explain the core differences between GAAP and IFRS regarding revenue recognition (ASC 606 / IFRS 15) and lease accounting (ASC 842 / IFRS 16).",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["GAAP", "IFRS", "Revenue Recognition", "Lease Accounting"],
                "expected_answer": "Revenue recognition under ASC 606/IFRS 15 shares a 5-step model, but differs in specific guidance for warranties, licenses, and collectibility thresholds. For leases, IFRS 16 treats all leases as finance leases (single model), recognizing depreciation and interest expense. ASC 842 retains operating vs finance classification, recognizing operating lease expense on a straight-line basis.",
                "status": "active"
            },
            {
                "question_text": "Walk me through how a $10,000 increase in depreciation expense flows through the Income Statement, Balance Sheet, and Cash Flow Statement.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Financial Statements", "Depreciation", "Cash Flow", "Financial Modeling"],
                "expected_answer": "Income Statement: Operating income and pre-tax income decrease by $10,000. At a 20% tax rate, net income falls by $8,000. Cash Flow Statement: Net income down $8,000, but $10,000 depreciation is non-cash and added back in Operating Cash Flow, increasing cash by $2,000. Balance Sheet: PP&E decreases by $10,000, cash increases by $2,000 (net assets down $8,000), and retained earnings decrease by $8,000, keeping the balance sheet balanced.",
                "status": "active"
            },
            {
                "question_text": "What procedures and internal controls (SOX compliance) do you implement during month-end close to detect reconciliatory errors and prevent fraud?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Internal Controls", "SOX Compliance", "Month-End Close", "Auditing"],
                "expected_answer": "Enforce strict segregation of duties between journal preparers and approvers. Mandate comprehensive subledger-to-general-ledger reconciliations for cash, inventory, and accounts payable. Review journal entry descriptions for unusual round-dollar amounts, implement automated variance analysis (flux analysis), and secure audit trails.",
                "status": "active"
            },
            {
                "question_text": "How do you evaluate working capital efficiency and liquidity using the Current Ratio, Quick Ratio, and Cash Conversion Cycle (CCC)?",
                "difficulty": "Medium",
                "type": "Conceptual",
                "tags": ["Working Capital", "Liquidity", "Ratios", "Financial Analysis"],
                "expected_answer": "Current Ratio (Current Assets / Current Liabilities) evaluates short-term solvency (>1.5 is standard). Quick Ratio strips out illiquid inventory to test immediate liquidity. The Cash Conversion Cycle (DIO + DSO - DPO) tracks the days required to convert operational investments into cash; a shorter or negative CCC signals superior operational capital efficiency.",
                "status": "active"
            },
            {
                "question_text": "Describe a scenario where you uncovered a significant accounting anomaly or revenue leakage during a financial audit. How did you investigate it?",
                "difficulty": "Hard",
                "type": "Behavioral",
                "tags": ["Audit", "Investigative Accounting", "Integrity", "Problem Solving"],
                "expected_answer": "STAR method: describe identifying the anomaly (e.g. unbilled WIP, duplicate vendor payments, unearned revenue misclassification). Detail gathering supporting invoices and contracts, cross-checking journal entries, calculating the financial statement impact, presenting findings to the controller, and implementing permanent control safeguards.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Law & Legal Practice",
        "description": "Contractual analysis, corporate governance, litigation strategy, statutory interpretation, and legal ethics for attorneys and legal counsel.",
        "icon": "Scale",
        "status": "active",
        "questions": [
            {
                "question_text": "Explain the doctrine of promissory estoppel and outline the requisite elements an attorney must establish to prevail in court.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Contract Law", "Promissory Estoppel", "Litigation", "Common Law"],
                "expected_answer": "Promissory estoppel serves as an equitable substitute for consideration. Required elements: (1) an unambiguous promise made by the promisor, (2) reasonable and foreseeable reliance by the promisee on that promise, (3) substantial detriment incurred by the promisee due to reliance, and (4) injustice that can only be avoided by enforcing the promise.",
                "status": "active"
            },
            {
                "question_text": "How do you navigate and advise a corporate client that is faced with a concurrent conflict of interest under the Model Rules of Professional Conduct?",
                "difficulty": "Hard",
                "type": "Behavioral",
                "tags": ["Legal Ethics", "Model Rules", "Conflict of Interest", "Corporate Law"],
                "expected_answer": "Rule 1.7 analysis: determine if representing one client is directly adverse to another or materially limits representation. Representation may proceed only if the lawyer reasonably believes they can provide competent and diligent representation to each affected client, the representation is not prohibited by law, does not involve direct claims between clients in the same litigation, and each client gives informed consent, confirmed in writing.",
                "status": "active"
            },
            {
                "question_text": "What key legal risks and regulatory hurdles do you analyze when conducting due diligence for a cross-border corporate merger or acquisition (M&A)?",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["M&A", "Corporate Law", "Due Diligence", "Antitrust", "Regulatory"],
                "expected_answer": "Review material contracts (change of control clauses, indemnities), antitrust/competition clearances, intellectual property ownership and licensing, employment liabilities and collective bargaining agreements, litigation exposure, regulatory compliance (FCPA, GDPR/data privacy), and tax structure optimization.",
                "status": "active"
            },
            {
                "question_text": "A corporate client receives an urgent government subpoena or civil document discovery request. What immediate legal protocols do you enact?",
                "difficulty": "Medium",
                "type": "Situational",
                "tags": ["Litigation Hold", "Discovery", "Compliance", "Subpoena"],
                "expected_answer": "Immediately issue a comprehensive written litigation hold to suspend all routine document destruction, auto-deletion policies, and data purging. Identify key custodians, preserve electronic records (ESI), assert attorney-client and work-product privileges via a privilege log, and engage in meet-and-confer discussions regarding scope.",
                "status": "active"
            },
            {
                "question_text": "Describe the legal fiduciary duties of care and loyalty owed by corporate directors, and explain the protection afforded by the Business Judgment Rule.",
                "difficulty": "Easy",
                "type": "Conceptual",
                "tags": ["Corporate Governance", "Fiduciary Duty", "Business Judgment Rule"],
                "expected_answer": "Duty of Care requires directors to act on an informed basis with the diligence of a prudent person in similar circumstances. Duty of Loyalty requires directors to prioritize the corporation's interests above self-interest, prohibiting self-dealing or usurpation of corporate opportunities. The Business Judgment Rule provides a rebuttable presumption that directors acted in good faith, on an informed basis, and in honest belief that action was in the company's best interest.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Marketing & Brand Management",
        "description": "Multi-channel marketing strategy, customer acquisition (CAC/LTV), brand positioning, performance analytics, and growth campaigns.",
        "icon": "TrendingUp",
        "status": "active",
        "questions": [
            {
                "question_text": "How do you formulate a comprehensive Go-To-Market (GTM) strategy for a new B2B or consumer product launch?",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["GTM Strategy", "Product Marketing", "Customer Personas", "Growth"],
                "expected_answer": "Define target customer personas (ICP) and conduct competitive positioning. Develop a distinct value proposition and messaging framework. Establish pricing models, select appropriate multi-channel distribution channels (content, paid acquisition, PR, email, partnerships), define marketing KPIs (CAC, conversion rates, payback period), and align sales enablement with marketing collateral.",
                "status": "active"
            },
            {
                "question_text": "Compare First-Touch, Last-Touch, and Multi-Touch Attribution models: How do you determine the true return on ad spend (ROAS) across complex customer journeys?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Attribution Modeling", "Analytics", "ROAS", "Performance Marketing"],
                "expected_answer": "First-Touch credits initial discovery, overvaluing top-of-funnel channels. Last-Touch credits final conversion, overvaluing branded search and retargeting. Multi-Touch (linear, time-decay, W-shaped, or algorithmic/data-driven) distributes credit across touchpoints. Use data-driven or incrementality testing (conversion lift studies) to measure true incrementality and optimize channel budget allocation.",
                "status": "active"
            },
            {
                "question_text": "How do you balance short-term direct response performance marketing with long-term brand equity building?",
                "difficulty": "Medium",
                "type": "Conceptual",
                "tags": ["Brand Equity", "Performance Marketing", "Marketing Strategy", "LTV"],
                "expected_answer": "Follow the 60/40 rule (Binet & Field): invest ~60% in broad-reach, emotional brand-building and ~40% in targeted direct-response sales activation. Performance marketing drives immediate quarterly revenue but suffers diminishing returns without strong brand awareness to lower blended CAC and expand organic search demand.",
                "status": "active"
            },
            {
                "question_text": "Your brand experiences a sudden viral social media public relations crisis regarding product quality or marketing messaging. How do you respond?",
                "difficulty": "Medium",
                "type": "Situational",
                "tags": ["Crisis Management", "Brand Reputation", "Public Relations", "Communication"],
                "expected_answer": "Pause all scheduled marketing campaigns immediately. Gather verified facts from product and legal teams, acknowledge the issue swiftly and transparently without defensiveness, express genuine empathy, outline concrete remediations (recalls, refunds, policy revisions), and monitor sentiment continuously while communicating on primary channels.",
                "status": "active"
            },
            {
                "question_text": "Tell me about a high-budget marketing campaign you led where the initial results underperformed expectations. How did you pivot to achieve success?",
                "difficulty": "Hard",
                "type": "Behavioral",
                "tags": ["Campaign Optimization", "A/B Testing", "Agile Marketing", "Data Analysis"],
                "expected_answer": "STAR framework: Explain the campaign objective and initial low conversion/high CAC. Detail analyzing the funnel analytics (drop-off points, CTR, bounce rates), conducting rapid creative and copy A/B tests, restructuring audience targeting, and reallocating budget to top-performing segments to achieve target CAC and revenue goals.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Human Resources & Talent Management",
        "description": "Talent acquisition, organizational culture, employee relations, labor compliance, performance management, and retention.",
        "icon": "Users",
        "status": "active",
        "questions": [
            {
                "question_text": "How do you design an equitable, competency-based talent acquisition process that eliminates unconscious bias in hiring?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Talent Acquisition", "DEI", "Structured Interviews", "Hiring"],
                "expected_answer": "Implement standardized job descriptions focused on core competencies rather than pedigree. Use blind resume screening where identifying details are redacted, deploy structured rubric-based behavioral interviews with consistent scoring criteria across all candidates, ensure diverse interview panels, and regularly audit hiring funnel metrics for disparate impact.",
                "status": "active"
            },
            {
                "question_text": "Walk me through your protocol for conducting a sensitive internal workplace investigation regarding allegations of harassment or discrimination.",
                "difficulty": "Hard",
                "type": "Behavioral",
                "tags": ["Employee Relations", "Workplace Investigation", "Compliance", "Ethics"],
                "expected_answer": "Ensure confidentiality and protection against retaliation. Review relevant policies, formulate an investigation plan, interview the complainant in a safe environment, interview identified witnesses, and interview the respondent fairly. Gather documentation (emails, chat logs), assess credibility, write a formal findings report with evidentiary conclusions, and recommend appropriate corrective disciplinary action.",
                "status": "active"
            },
            {
                "question_text": "How do you handle a scenario where an executive manager wants to immediately terminate an employee without prior documentation or a Performance Improvement Plan (PIP)?",
                "difficulty": "Medium",
                "type": "Situational",
                "tags": ["Employment Law", "Performance Management", "PIP", "Risk Mitigation"],
                "expected_answer": "Advise the manager on legal and organizational risks (wrongful termination, discrimination claims, morale impact). Differentiate between gross misconduct (which permits immediate termination) and performance deficiencies. Guide the manager to establish objective performance benchmarks, document clear expectations in a structured 30-to-60-day PIP, and provide constructive coaching support.",
                "status": "active"
            },
            {
                "question_text": "What proactive strategies do you implement to reduce high employee turnover and combat burnout in high-stress organizations?",
                "difficulty": "Medium",
                "type": "Conceptual",
                "tags": ["Employee Retention", "Burnout Prevention", "Culture", "Engagement"],
                "expected_answer": "Analyze quantitative turnover data and conduct authentic exit interviews to uncover root causes. Implement competitive compensation benchmarking, clear internal career progression ladders, flexible work arrangements, manager leadership training, anonymous pulse surveys, and wellness support programs.",
                "status": "active"
            },
            {
                "question_text": "How do you align HR initiatives (compensation, talent development, succession planning) with overall strategic company business objectives?",
                "difficulty": "Easy",
                "type": "Conceptual",
                "tags": ["Strategic HR", "Business Partnering", "Organizational Design"],
                "expected_answer": "Act as a strategic business partner: translate company revenue, growth, and market expansion goals into workforce planning requirements. Identify critical competency gaps, design incentive compensation that drives target business KPIs, and build succession pipelines for key leadership roles.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Graphic & Visual Design",
        "description": "Design systems, typography, color theory, digital visual hierarchy, branding, and accessibility standards (WCAG).",
        "icon": "Palette",
        "status": "active",
        "questions": [
            {
                "question_text": "How do you establish a cohesive Design System from scratch, including color palettes, typography scales, spacing grids, and component tokens?",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["Design Systems", "Typography", "Color Theory", "Figma", "Tokens"],
                "expected_answer": "Audit existing brand assets and UI interfaces. Define semantic color palettes (primary, secondary, neutral, feedback states) tested for WCAG contrast. Establish a mathematical typographic scale (e.g. 1.25 major third) and 8pt/4pt spatial layout grid. Tokenize primitives into semantic design tokens (spacing, typography, elevation) for scalable synchronization between design tools and code.",
                "status": "active"
            },
            {
                "question_text": "How do you design for accessibility (WCAG 2.1 AA/AAA compliance) regarding contrast ratios, touch targets, and visual readability?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Accessibility", "WCAG", "UI Design", "Inclusivity"],
                "expected_answer": "Ensure a minimum contrast ratio of 4.5:1 for normal body text and 3:1 for large text/icons against backgrounds. Never rely solely on color to convey meaning (incorporate iconography and text labels). Ensure touch targets meet minimum 44x44 CSS pixel dimensions, support dynamic type resizing without layout breakage, and design clear focus states.",
                "status": "active"
            },
            {
                "question_text": "Walk me through how you pitch and defend a bold brand redesign to skeptical executive stakeholders who prefer the existing legacy look.",
                "difficulty": "Medium",
                "type": "Behavioral",
                "tags": ["Stakeholder Management", "Design Presentation", "Brand Strategy"],
                "expected_answer": "Anchor design choices in business goals and customer data rather than personal aesthetic taste. Show how the legacy identity fails current market positioning, demonstrate user research insights and competitive gap analysis, present side-by-side contextual mockups, and walk through how the new system drives customer recognition and conversion.",
                "status": "active"
            },
            {
                "question_text": "What principles guide your decisions when pairing contrasting typefaces and establishing visual hierarchy on a content-heavy digital page?",
                "difficulty": "Easy",
                "type": "Conceptual",
                "tags": ["Typography", "Visual Hierarchy", "Layout", "Composition"],
                "expected_answer": "Limit primary type families (typically one serif for expressive editorial headers paired with a clean, highly legible sans-serif for UI/body, or varying weights of a versatile grotesque sans). Ensure distinct contrast in weight, scale, and x-height. Use size, weight, color contrast, and whitespace to guide the viewer's eye along a clear cognitive reading path.",
                "status": "active"
            },
            {
                "question_text": "Describe a project where you received contradictory or vague client feedback. How did you clarify requirements and deliver an outstanding visual asset?",
                "difficulty": "Medium",
                "type": "Situational",
                "tags": ["Client Communication", "Iteration", "Problem Solving", "Design Process"],
                "expected_answer": "STAR framework: Conduct an interactive discovery workshop with visual moodboards, style tiles, and spectrum exercises (e.g. 'Playful vs Serious') to decode subjective phrases like 'make it pop'. Translate findings into two distinct high-fidelity directions with documented rationale, guiding stakeholders to aligned consensus.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Civil & Structural Engineering",
        "description": "Structural mechanics, reinforced concrete design, foundation engineering, building codes, and municipal infrastructure safety.",
        "icon": "Building",
        "status": "active",
        "questions": [
            {
                "question_text": "Explain how you calculate structural dead loads, live loads, wind loads, and seismic shear forces when designing a multi-story building frame.",
                "difficulty": "Hard",
                "type": "Technical",
                "tags": ["Structural Engineering", "Load Calculations", "Seismic Design", "ASCE 7"],
                "expected_answer": "Calculate dead loads from self-weight of permanent materials (concrete, steel, finishes) and live loads from occupancy standards per building codes (IBC/ASCE 7). Calculate lateral wind loads based on velocity pressure, exposure category, and aerodynamic drag. For seismic design, compute equivalent lateral force (ELF) using seismic design category, response modification factor (R), and fundamental building period.",
                "status": "active"
            },
            {
                "question_text": "What geotechnical and soil mechanics factors do you evaluate when deciding between shallow foundations (spread footings/mat) versus deep foundations (piles/drilled shafts)?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Geotechnical Engineering", "Foundations", "Soil Mechanics"],
                "expected_answer": "Evaluate soil boring logs, Standard Penetration Test (SPT) N-values, shear strength, groundwater table elevation, and soil compressibility. Use shallow foundations when upper soil strata possess adequate allowable bearing capacity and acceptable settlement limits. Choose deep pile foundations when surface soils are liquefiable, expansive, or weak, transferring structural loads to bedrock or dense load-bearing strata.",
                "status": "active"
            },
            {
                "question_text": "Describe the critical quality assurance protocols for reinforced concrete curing, slump testing, and compressive strength cylinder testing on a construction site.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Concrete Technology", "Quality Control", "ASTM Standards", "Construction"],
                "expected_answer": "Perform slump tests upon batch delivery to verify workability and water-cement ratio per mix design. Cast standard test cylinders (ASTM C31) for 7-day and 28-day compressive break tests. Enforce proper curing practices (wet burlap, curing compounds, moisture maintenance) for a minimum of 7 days to prevent plastic shrinkage cracking and ensure design strength.",
                "status": "active"
            },
            {
                "question_text": "How do you manage municipal zoning restrictions, environmental impact permits, and community feedback when designing urban civil infrastructure?",
                "difficulty": "Medium",
                "type": "Situational",
                "tags": ["Urban Planning", "Environmental Compliance", "Zoning", "Permitting"],
                "expected_answer": "Review local municipal comprehensive plans, setback requirements, and stormwater runoff regulations. Prepare detailed Environmental Impact Statements (EIS) addressing traffic, noise, runoff, and biodiversity impact. Hold public informational hearings to address community concerns, and incorporate sustainable design elements like bioswales or permeable surfaces.",
                "status": "active"
            },
            {
                "question_text": "Tell me about a time you identified a structural flaw or safety hazard on-site during construction. What immediate corrective actions did you mandate?",
                "difficulty": "Hard",
                "type": "Behavioral",
                "tags": ["Site Safety", "Structural Integrity", "Ethics", "Crisis Management"],
                "expected_answer": "STAR framework: Describe discovering a defect (e.g. improper rebar spacing, insufficient lap splice length, honeycombing in load-bearing columns). Immediately halt affected construction work, notify the general contractor and client, issue a formal non-conformance report (NCR), engineer an approved structural retrofit, and re-inspect before releasing the hold.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Business Analysis & Strategy",
        "description": "Business process modeling (BPMN), requirements engineering, gap analysis, backlog prioritization, and strategic ROI evaluation.",
        "icon": "Briefcase",
        "status": "active",
        "questions": [
            {
                "question_text": "How do you elicit and translate ambiguous stakeholder requests into crisp, measurable functional requirements and acceptance criteria?",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["Requirements Engineering", "User Stories", "Acceptance Criteria", "Agile"],
                "expected_answer": "Conduct structured stakeholder discovery workshops, user shadowing, and process mapping. Break down high-level business goals into epics and granular User Stories with INVEST criteria. Write testable acceptance criteria using the Given-When-Then (Gherkin) format to establish unambiguous definitions of done between business stakeholders and technical delivery teams.",
                "status": "active"
            },
            {
                "question_text": "Explain Business Process Model and Notation (BPMN) and how you perform an 'As-Is' versus 'To-Be' gap analysis for an operational workflow.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["BPMN", "Process Mapping", "Gap Analysis", "Operational Excellence"],
                "expected_answer": "Map current-state 'As-Is' workflows using standard BPMN swimlanes, events, gateways, and activities. Identify bottlenecks, manual handoffs, redundancy, and cycle-time delays. Design optimized 'To-Be' process architectures leveraging automation, eliminating non-value-add steps, and defining clear transition change management milestones.",
                "status": "active"
            },
            {
                "question_text": "How do you manage scope creep and prioritize competing feature requests from powerful departmental stakeholders under fixed deadlines?",
                "difficulty": "Medium",
                "type": "Behavioral",
                "tags": ["Scope Management", "Prioritization", "Stakeholder Alignment", "MoSCoW"],
                "expected_answer": "Employ transparent prioritization frameworks like MoSCoW (Must, Should, Could, Won't have) or Weighted Shortest Job First (WSJF). Align features with strategic business objectives and ROI. When new scope emerges, evaluate trade-offs objectively against schedule and budget, presenting stakeholders with clear options rather than unilateral rejections.",
                "status": "active"
            },
            {
                "question_text": "How do you build a comprehensive business case and calculate Return on Investment (ROI) and Net Present Value (NPV) for a capital software investment?",
                "difficulty": "Hard",
                "type": "Conceptual",
                "tags": ["Financial Modeling", "Business Case", "ROI", "NPV", "Strategy"],
                "expected_answer": "Quantify total cost of ownership (TCO) across licensing, development, implementation, and maintenance. Quantify both tangible financial benefits (labor cost reduction, revenue expansion, inventory savings) and strategic intangibles. Discount future cash inflows using appropriate cost of capital (WACC) to establish positive NPV, IRR, and payback period benchmarks.",
                "status": "active"
            },
            {
                "question_text": "Describe a project where key business stakeholders resisted adopting a newly implemented process or software system. How did you achieve adoption?",
                "difficulty": "Hard",
                "type": "Situational",
                "tags": ["Change Management", "User Adoption", "Training", "Stakeholder Buy-In"],
                "expected_answer": "STAR framework: Identify root causes of resistance (fear of redundancy, lack of training, workflow disruption). Engage end-users as champions early in UAT, provide role-based interactive training and quick-reference guides, establish continuous feedback channels, and demonstrate immediate productivity wins to drive sustained organic adoption.",
                "status": "active"
            }
        ]
    },
    {
        "name": "Sales Leadership & Client Acquisition",
        "description": "Enterprise B2B consultative sales, pipeline forecasting, value propositions, client discovery, and strategic negotiation.",
        "icon": "TrendingUp",
        "status": "active",
        "questions": [
            {
                "question_text": "Walk me through your consultative discovery methodology (e.g. MEDDIC, BANT, or Challenger Sale) for qualifying high-value enterprise B2B accounts.",
                "difficulty": "Medium",
                "type": "Technical",
                "tags": ["MEDDIC", "B2B Sales", "Discovery", "Pipeline Qualification"],
                "expected_answer": "Apply MEDDIC framework: Metrics (quantifiable business impact the client seeks), Economic Buyer (identifying who controls the budget), Decision Criteria (technical, commercial, and legal evaluation factors), Decision Process (timeline and internal governance steps), Identify Pain (critical operational bottleneck costing them money), and Champion (internal advocate with access and influence).",
                "status": "active"
            },
            {
                "question_text": "How do you handle aggressive price objections from prospective clients without eroding product value or gross profit margins?",
                "difficulty": "Medium",
                "type": "Behavioral",
                "tags": ["Negotiation", "Objection Handling", "Value Selling", "Pricing"],
                "expected_answer": "Acknowledge the budget concern and pause before reacting. Reframe the conversation from unit price to total cost of ownership and return on investment (ROI). Ask clarifying questions to uncover whether price is a hard constraint or a negotiation tactic. If concessions are necessary, never discount unilaterally; trade price for commitment (longer contract term, upfront payment, reference case study).",
                "status": "active"
            },
            {
                "question_text": "How do you coach and turn around an underperforming sales representative who is falling behind on their quarterly quota?",
                "difficulty": "Hard",
                "type": "Behavioral",
                "tags": ["Sales Coaching", "Leadership", "Performance Management", "Mentorship"],
                "expected_answer": "Analyze pipeline conversion telemetry to diagnose the root issue (top-of-funnel outbound volume, discovery depth, objection handling, or closing velocity). Conduct call shadow reviews, co-design actionable weekly activity and pipeline milestones, role-play challenging objections, and celebrate incremental wins while maintaining firm accountability.",
                "status": "active"
            },
            {
                "question_text": "Describe your methodology for quarterly sales pipeline forecasting and distinguishing between committed deals and pipeline fluff.",
                "difficulty": "Medium",
                "type": "Conceptual",
                "tags": ["Sales Forecasting", "Pipeline Velocity", "Revenue Operations"],
                "expected_answer": "Avoid relying on rep sentiment. Evaluate objective milestone evidence: verified access to the economic buyer, agreed-upon mutual evaluation plans (MAP), legal/security review progression, and historical sales cycle velocity. Categorize pipeline into weighted stages and conduct rigorous pipeline stress-testing.",
                "status": "active"
            },
            {
                "question_text": "Describe the most complex, multi-stakeholder enterprise deal you personally closed. How did you navigate executive procurement and security scrutiny?",
                "difficulty": "Hard",
                "type": "Situational",
                "tags": ["Enterprise Sales", "Closing", "Procurement", "Champion Building"],
                "expected_answer": "STAR framework: Detail the deal context, value size, and buying committee (IT, security, finance, legal). Detail building a strong champion, presenting a tailored business case to the CFO, working collaboratively with InfoSec on compliance questionnaires, and accelerating procurement review to close on target.",
                "status": "active"
            }
        ]
    }
]

def seed_question_bank(force: bool = False) -> dict:
    """
    Seeds default categories and questions.
    If force=True, wipes collections and reseeds all categories.
    If force=False, performs an intelligent idempotent upsert: adds any missing
    categories and their questions without disrupting existing categories or user data.
    """
    if force:
        categories_collection.delete_many({})
        questions_collection.delete_many({})

    created_categories = 0
    created_questions = 0
    updated_categories = 0

    for cat_data in DEFAULT_CATEGORIES_DATA:
        cat_name = cat_data["name"]
        questions = cat_data.get("questions", [])

        # Check if category already exists
        existing_cat = categories_collection.find_one({"name": {"$regex": f"^{re.escape(cat_name)}$", "$options": "i"}})

        if not existing_cat:
            category_doc = {
                "name": cat_name,
                "description": cat_data.get("description", ""),
                "icon": cat_data.get("icon", "Folder"),
                "status": cat_data.get("status", "active"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            res = categories_collection.insert_one(category_doc)
            cat_id = str(res.inserted_id)
            created_categories += 1
        else:
            cat_id = str(existing_cat["_id"])
            # Update icon and description if they were updated
            categories_collection.update_one(
                {"_id": existing_cat["_id"]},
                {"$set": {
                    "icon": cat_data.get("icon", existing_cat.get("icon", "Folder")),
                    "description": cat_data.get("description", existing_cat.get("description", "")),
                    "status": "active",
                    "updated_at": datetime.utcnow()
                }}
            )
            updated_categories += 1

        for q in questions:
            # Check if question text already exists for this category
            existing_q = questions_collection.find_one({
                "category_id": cat_id,
                "question_text": q["question_text"]
            })
            if not existing_q:
                q_doc = {
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "question_text": q["question_text"],
                    "difficulty": q.get("difficulty", "Medium"),
                    "type": q.get("type", "Technical"),
                    "expected_answer": q.get("expected_answer", ""),
                    "tags": q.get("tags", []),
                    "status": q.get("status", "active"),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                questions_collection.insert_one(q_doc)
                created_questions += 1

    total_cats = categories_collection.count_documents({})
    total_qs = questions_collection.count_documents({})

    return {
        "message": f"Question bank synchronized. {created_categories} new categories created, {updated_categories} existing updated, {created_questions} new questions added.",
        "created_categories": created_categories,
        "created_questions": created_questions,
        "total_categories": total_cats,
        "total_questions": total_qs
    }

if __name__ == "__main__":
    result = seed_question_bank(force=False)
    print(result)
