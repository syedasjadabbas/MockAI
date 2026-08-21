from datetime import datetime
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
    }
]

def seed_question_bank(force: bool = False) -> dict:
    """
    Seeds default categories and questions if database is empty or force=True.
    """
    cat_count = categories_collection.count_documents({})
    if cat_count > 0 and not force:
        return {"message": "Question bank already populated", "categories_count": cat_count}

    if force:
        categories_collection.delete_many({})
        questions_collection.delete_many({})

    created_categories = 0
    created_questions = 0

    for cat_data in DEFAULT_CATEGORIES_DATA:
        questions = cat_data.get("questions", [])
        category_doc = {
            "name": cat_data["name"],
            "description": cat_data.get("description", ""),
            "icon": cat_data.get("icon", "Folder"),
            "status": cat_data.get("status", "active"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        res = categories_collection.insert_one(category_doc)
        cat_id = str(res.inserted_id)
        created_categories += 1

        for q in questions:
            q_doc = {
                "category_id": cat_id,
                "category_name": cat_data["name"],
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

    return {
        "message": f"Successfully seeded {created_categories} categories and {created_questions} questions.",
        "categories_count": created_categories,
        "questions_count": created_questions
    }

if __name__ == "__main__":
    result = seed_question_bank(force=True)
    print(result)
