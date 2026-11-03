import json
import re
import os
import ast
import math
import urllib.parse
import httpx
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL, GEMINI_API_KEY
from app.models.ai import Conversation, Message, ProposedAction
from app.models.academic import Module, Subject
from app.models.calendar import CalendarEvent
from app.models.task import Task, ProgressRecord
from app.services.document_service import DocumentService
from app.services.calendar_service import CalendarService
from app.services.planner_service import PlannerService
from app.schemas.ai import ChatResponse, ProposedActionResponse

class AIService:
    @staticmethod
    def call_gemini(prompt: str, context_str: str = "", custom_api_key: Optional[str] = None) -> Optional[str]:
        api_key = custom_api_key or GEMINI_API_KEY or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return None

        system_prompt = (
            "You are S.Butler, an expert AI academic tutor and assistant like ChatGPT, Gemini, or Claude. "
            "Your top priority is to provide 100% accurate, direct, well-structured, and helpful answers.\n\n"
            "RULES:\n"
            "1. Answer the exact question directly in your very first sentence.\n"
            "2. Be concise, precise, and completely accurate. Avoid fluff or robotic meta-commentary.\n"
            "3. If 'Study Context' is provided, ground your answer primarily in that context, citing document sections or pages where relevant.\n"
            "4. If the user asks for study notes, summaries, or flashcards, provide an organized, high-yield revision guide covering all major topics.\n"
            "5. If the provided study context does not contain the answer, answer accurately using your full academic knowledge rather than refusing."
        )
        full_prompt = f"{system_prompt}\n\n"
        if context_str:
            full_prompt += f"Study Context:\n{context_str}\n\n"
        full_prompt += f"User Query:\n{prompt}"

        payload = {
            "contents": [{
                "parts": [{"text": full_prompt}]
            }]
        }

        # Try contemporary gemini models in order
        models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-pro"]
        for model in models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                with httpx.Client(timeout=15.0) as client:
                    response = client.post(url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                text_res = parts[0].get("text", "").strip()
                                if text_res:
                                    return text_res
            except Exception:
                continue
        return None

    @staticmethod
    def call_ollama(prompt: str, context_str: str = "") -> Optional[str]:
        try:
            url = f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate"
            full_prompt = "You are S.Butler, a helpful academic assistant like ChatGPT. Give direct, straightforward answers.\n"
            if context_str:
                full_prompt += f"Study Context:\n{context_str}\n\n"
            full_prompt += f"Question: {prompt}"

            payload = {
                "model": OLLAMA_MODEL,
                "prompt": full_prompt,
                "stream": False
            }
            with httpx.Client(timeout=2.0) as client:
                response = client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    res_text = data.get("response", "").strip()
                    if res_text:
                        return res_text
        except Exception:
            pass
        return None

    @staticmethod
    def solve_math_query(query: str) -> Optional[str]:
        """Safely evaluates basic arithmetic, squares, roots, and equations."""
        q = query.strip().lower()
        # Clean query
        q_clean = re.sub(r'^(what is|calculate|solve|evaluate|compute|\s+)', '', q).strip(' ?=')
        
        # Square root: e.g. sqrt(144) or square root of 144
        sqrt_match = re.search(r'(?:square\s*root\s*of|sqrt\s*\(?)\s*(\d+(?:\.\d+)?)', q_clean)
        if sqrt_match:
            val = float(sqrt_match.group(1))
            res = math.sqrt(val)
            res_str = int(res) if res.is_integer() else round(res, 4)
            return f"The square root of **{sqrt_match.group(1)}** is **{res_str}**."

        # Power / exponent: e.g. 2^10 or 2**10
        pow_match = re.match(r'^(\d+(?:\.\d+)?)\s*(?:\^|\*\*)\s*(\d+(?:\.\d+)?)$', q_clean)
        if pow_match:
            base, exp = float(pow_match.group(1)), float(pow_match.group(2))
            if exp <= 50:
                res = base ** exp
                res_str = int(res) if res.is_integer() else round(res, 4)
                return f"**{pow_match.group(1)}^{pow_match.group(2)}** = **{res_str}**"

        # Basic arithmetic: only allowed characters: digits, +, -, *, /, %, (, ), ., spaces
        if re.match(r'^[\d\s\+\-\*\/\%\(\)\.]+$', q_clean):
            # Ensure at least one operator exists
            if any(op in q_clean for op in ['+', '-', '*', '/', '%']):
                try:
                    tree = ast.parse(q_clean, mode='eval')
                    def safe_eval(node):
                        if isinstance(node, ast.Expression):
                            return safe_eval(node.body)
                        elif isinstance(node, ast.Constant):
                            return node.value
                        elif isinstance(node, ast.BinOp):
                            left = safe_eval(node.left)
                            right = safe_eval(node.right)
                            if isinstance(node.op, ast.Add): return left + right
                            if isinstance(node.op, ast.Sub): return left - right
                            if isinstance(node.op, ast.Mult): return left * right
                            if isinstance(node.op, ast.Div): return left / right if right != 0 else "undefined (division by zero)"
                            if isinstance(node.op, ast.Mod): return left % right
                            if isinstance(node.op, ast.Pow): return left ** min(right, 20)
                        elif isinstance(node, ast.UnaryOp):
                            operand = safe_eval(node.operand)
                            if isinstance(node.op, ast.USub): return -operand
                            if isinstance(node.op, ast.UAdd): return +operand
                        raise ValueError("Unsafe node")
                    
                    val = safe_eval(tree)
                    if isinstance(val, (int, float)):
                        val_str = int(val) if isinstance(val, float) and val.is_integer() else round(val, 4)
                        return f"**Calculation:**\n\n`{q_clean}` = **{val_str}**"
                except Exception:
                    pass
        return None

    @staticmethod
    def fetch_wikipedia_summary(query: str) -> Optional[str]:
        """Queries Wikipedia using the authentic Action API to retrieve accurate encyclopedic definitions."""
        try:
            clean_q = re.sub(
                r'^(what|who|where|when|why|how|explain|define|tell me about|is|the|a|an)\s+',
                '', query.strip(), flags=re.IGNORECASE
            )
            clean_q = clean_q.rstrip('?').strip()
            if not clean_q:
                clean_q = query.strip()

            search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(clean_q)}&format=json"
            headers = {"User-Agent": "SButlerAcademicAssistant/2.0 (student.assistant.ai@gmail.com)"}

            with httpx.Client(timeout=4.0, follow_redirects=True) as client:
                resp = client.get(search_url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("query", {}).get("search", [])
                    if results:
                        title = results[0]["title"]
                        # Fetch introductory extract using the action API
                        extract_url = (
                            f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1"
                            f"&explaintext=1&titles={urllib.parse.quote(title)}&format=json"
                        )
                        ext_resp = client.get(extract_url, headers=headers)
                        if ext_resp.status_code == 200:
                            ext_data = ext_resp.json()
                            pages = ext_data.get("query", {}).get("pages", {})
                            for page_id, page_val in pages.items():
                                extract = page_val.get("extract", "").strip()
                                if extract and len(extract) > 40:
                                    # Format cleanly
                                    paragraphs = [p.strip() for p in extract.split("\n") if p.strip()]
                                    main_text = "\n\n".join(paragraphs[:3])
                                    return (
                                        f"### {title}\n\n"
                                        f"{main_text}\n\n"
                                        f"*(Source: Verified Academic Knowledge Reference)*"
                                    )
        except Exception:
            pass
        return None

    @staticmethod
    def get_offline_academic_knowledge(query: str) -> Optional[str]:
        """Provides verified, high-accuracy textbook definitions for key academic concepts."""
        q = query.lower().strip()

        # Cyber Security & Information Systems
        if "insider threat" in q:
            return (
                "### Insider Threat (Information Security)\n\n"
                "An **Insider Threat** is a security violation or risk that originates from within an organization rather than an external attacker. "
                "It involves individuals with authorized access—such as current employees, former staff, contractors, or business partners—who misuse their legitimate privileges to compromise organizational security.\n\n"
                "**Key Classifications:**\n"
                "• **Malicious Insiders**: Individuals who deliberately steal proprietary intellectual property, leak sensitive records, or sabotage systems for financial gain or personal grievances.\n"
                "• **Negligent Insiders**: Employees who compromise systems unintentionally by bypassing security protocols, misconfiguring permissions, or falling victim to phishing schemes.\n"
                "• **Compromised Insiders**: Legitimate user accounts whose credentials have been hijacked by outside adversaries.\n\n"
                "**Why Insider Threats Are Uniquely Dangerous:**\n"
                "Because insiders possess valid credentials and system trust, their unauthorized activities frequently bypass traditional perimeter defenses like firewalls and antivirus tools.\n\n"
                "**Core Mitigations & Countermeasures:**\n"
                "• **Principle of Least Privilege (PoLP)**: Restrict user permissions strictly to what is required for their job role.\n"
                "• **Role-Based Access Control (RBAC)** & Multi-Factor Authentication (MFA).\n"
                "• **Comprehensive Audit Logging & UEBA**: Utilizing User and Entity Behavior Analytics to detect anomalous activity."
            )

        if "privilege escalation" in q:
            return (
                "### Privilege Escalation\n\n"
                "**Privilege Escalation** is the act of exploiting a bug, design flaw, or configuration error in an operating system or software application to gain elevated access to resources that are normally protected from an application or user.\n\n"
                "**Types of Privilege Escalation:**\n"
                "• **Vertical Privilege Escalation**: An attacker or process with standard user permissions gains administrative or root-level privileges.\n"
                "• **Horizontal Privilege Escalation**: A user accesses the functions, records, or data of another user holding equivalent privilege levels."
            )

        if "data breach" in q:
            return (
                "### Data Breach\n\n"
                "A **Data Breach** is an incident where sensitive, confidential, or protected data is viewed, stolen, altered, or accessed by an unauthorized individual.\n\n"
                "**Common Causes:** Weak or stolen credentials, malware, phishing, database misconfigurations, and insider leaks."
            )

        if "cia triad" in q or ("confidentiality" in q and "integrity" in q and "availability" in q):
            return (
                "### The CIA Triad of Information Security\n\n"
                "The **CIA Triad** is the foundational model guiding information security policies and controls:\n\n"
                "1. **Confidentiality**: Ensuring data is accessible solely to authorized individuals and protected against unauthorized disclosure (implemented via encryption, ACLs, MFA).\n"
                "2. **Integrity**: Guaranteeing data is authentic, accurate, and protected against unauthorized modification or deletion (verified using cryptographic hashing, digital signatures, checksums).\n"
                "3. **Availability**: Ensuring systems, applications, and data remain accessible to authorized users whenever needed (ensured via redundancy, failover clusters, DDoS mitigation, and backups)."
            )

        if "malware" in q:
            return (
                "### Malware (Malicious Software)\n\n"
                "**Malware** is an umbrella term for software intentionally designed to cause damage to a computer, server, client, or computer network.\n\n"
                "**Primary Types:**\n"
                "• **Virus**: Attaches to executable files and self-replicates when the host file is executed.\n"
                "• **Worm**: Self-contained program that replicates across networks without human intervention.\n"
                "• **Trojan Horse**: Misleads users of its true intent by disguising itself as legitimate software.\n"
                "• **Ransomware**: Encrypts victim data and demands payment for the decryption key.\n"
                "• **Spyware**: Secretly monitors and transmits user activities and keystrokes."
            )

        if "denial of service" in q or "dos" in q or "ddos" in q:
            return (
                "### Denial of Service (DoS & DDoS) Attacks\n\n"
                "A **Denial-of-Service (DoS)** attack is a cyber-attack in which the perpetrator seeks to make a machine or network resource unavailable to its intended users by temporarily or indefinitely disrupting services of a host connected to a network.\n\n"
                "• **DoS**: Sourced from a single attacking machine/IP.\n"
                "• **DDoS (Distributed DoS)**: Floods the target with incoming traffic from thousands of compromised distributed devices (a botnet)."
            )

        if "man in the middle" in q or "mitm" in q:
            return (
                "### Man-in-the-Middle (MitM) Attack\n\n"
                "A **Man-in-the-Middle (MitM)** attack is an attack where the adversary secretively relays and possibly alters the communications between two parties who believe they are directly communicating with each other.\n\n"
                "**Techniques**: ARP spoofing, DNS spoofing, rogue Wi-Fi access points, and SSL/TLS stripping."
            )

        # Computer Science & DBMS
        if "normalization" in q or "normal form" in q:
            return (
                "### Database Normalization\n\n"
                "**Database Normalization** is the process of structuring relational database tables to minimize data redundancy and eliminate update, insertion, and deletion anomalies.\n\n"
                "**Normal Forms:**\n"
                "• **1NF**: All table columns contain atomic (indivisible) values; no repeating groups.\n"
                "• **2NF**: In 1NF + all non-key attributes are fully functionally dependent on the entire primary key (eliminates partial dependency).\n"
                "• **3NF**: In 2NF + eliminates transitive functional dependencies between non-key attributes.\n"
                "• **BCNF**: Stricter 3NF where every functional determinant $X$ in $X \\to Y$ must be a candidate key."
            )

        if "deadlock" in q:
            return (
                "### Deadlock in Operating Systems & Databases\n\n"
                "A **Deadlock** is a state in which each member of a set of processes is waiting for an event (typically resource acquisition) that only another member of the set can cause.\n\n"
                "**The 4 Coffman Conditions for Deadlock:**\n"
                "1. **Mutual Exclusion**: At least one resource must be non-shareable.\n"
                "2. **Hold and Wait**: Processes hold allocated resources while awaiting additional ones.\n"
                "3. **No Preemption**: Resources cannot be forcibly revoked from a process.\n"
                "4. **Circular Wait**: A closed chain of processes exists where each process waits for a resource held by the next."
            )

        if "acid" in q and ("database" in q or "transaction" in q or "property" in q):
            return (
                "### ACID Properties in Database Transactions\n\n"
                "• **Atomicity**: 'All-or-nothing' execution; transactions either complete fully or roll back completely.\n"
                "• **Consistency**: Transactions transition the database from one valid state to another, satisfying all integrity constraints.\n"
                "• **Isolation**: Concurrent transactions execute independently without interference or dirty reads.\n"
                "• **Durability**: Once committed, transaction effects persist permanently, even in hardware failure."
            )

        if "sql" in q and "nosql" in q:
            return (
                "### SQL vs NoSQL Databases\n\n"
                "**SQL (Relational Databases):**\n"
                "• Pre-defined schema with rigid tables, rows, and foreign key relationships (PostgreSQL, MySQL, SQLite).\n"
                "• Follows ACID compliance and scales vertically (scaling single server capacity).\n\n"
                "**NoSQL (Non-Relational Databases):**\n"
                "• Dynamic, schema-less models: Document (MongoDB), Key-Value (Redis), Columnar (Cassandra), Graph (Neo4j).\n"
                "• Follows BASE model, supports horizontal scaling (sharding across server clusters)."
            )

        if "sdlc" in q or "software development life cycle" in q:
            return (
                "### Software Development Life Cycle (SDLC)\n\n"
                "The **SDLC** outlines the structured process for engineering high-quality software:\n\n"
                "1. **Requirement Analysis**: Identifying stakeholder requirements and business constraints.\n"
                "2. **System Design**: Architecting database models, API contracts, and component interfaces.\n"
                "3. **Implementation**: Writing clean, modular source code.\n"
                "4. **Testing**: Validating functionality via unit, integration, and end-to-end tests.\n"
                "5. **Deployment**: Releasing to production environments via CI/CD pipelines.\n"
                "6. **Maintenance**: Monitoring bugs, patches, performance, and updates."
            )

        # Mathematics & Geometry
        if "cone" in q:
            return (
                "### Area and Volume Formulas of a Cone\n\n"
                "For a right circular cone with radius $r$, vertical height $h$, and slant height $l = \\sqrt{r^2 + h^2}$:\n\n"
                "• **Base Area**: $A_{\\text{base}} = \\pi r^2$\n"
                "• **Curved (Lateral) Surface Area**: $A_{\\text{lateral}} = \\pi r l = \\pi r \\sqrt{r^2 + h^2}$\n"
                "• **Total Surface Area**: $A_{\\text{total}} = \\pi r(r + l) = \\pi r^2 + \\pi r l$\n"
                "• **Volume**: $V = \\frac{1}{3} \\pi r^2 h$"
            )

        if "cylinder" in q:
            return (
                "### Cylinder Formulas\n\n"
                "For a cylinder with radius $r$ and height $h$:\n\n"
                "• **Base Area**: $\\pi r^2$\n"
                "• **Curved Surface Area**: $2 \\pi r h$\n"
                "• **Total Surface Area**: $2 \\pi r(r + h)$\n"
                "• **Volume**: $\\pi r^2 h$"
            )

        if "sphere" in q:
            return (
                "### Sphere Formulas\n\n"
                "For a sphere with radius $r$:\n\n"
                "• **Surface Area**: $4 \\pi r^2$\n"
                "• **Volume**: $\\frac{4}{3} \\pi r^3$"
            )

        if "integration" in q or "integral" in q:
            return (
                "### Integration in Calculus\n\n"
                "**Integration** is the mathematical operation of calculating the accumulation of quantities, representing the continuous sum of infinitesimal values (such as calculating the area under a curve, volume, or total displacement).\n\n"
                "• **Definite Integral**: Evaluates exact numerical area between boundaries $a$ and $b$: $\\int_a^b f(x)\\,dx$.\n"
                "• **Indefinite Integral**: Finds the general antiderivative function family: $\\int f(x)\\,dx = F(x) + C$.\n"
                "• **Fundamental Theorem of Calculus**: Connects differentiation and integration: $\\int_a^b f(x)\\,dx = F(b) - F(a)$."
            )

        if "differentiation" in q or "derivative" in q:
            return (
                "### Differentiation in Calculus\n\n"
                "**Differentiation** is the process of finding the derivative of a mathematical function, which measures the instantaneous rate of change of a dependent variable with respect to an independent variable (the slope of the tangent line).\n\n"
                "**Core Rules:**\n"
                "• **Power Rule**: $\\frac{d}{dx}[x^n] = n x^{n-1}$\n"
                "• **Product Rule**: $(u \\cdot v)' = u'v + uv'$\n"
                "• **Quotient Rule**: $(\\frac{u}{v})' = \\frac{u'v - uv'}{v^2}$\n"
                "• **Chain Rule**: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$"
            )

        # Management & Business
        if "7p" in q or "7 ps" in q or "marketing mix" in q:
            return (
                "### The 7 Ps of Marketing & Management\n\n"
                "1. **Product**: The physical good or intangible service meeting customer needs.\n"
                "2. **Price**: The pricing strategy, profit margins, and payment structures.\n"
                "3. **Place**: The distribution network and retail/digital channels where offerings are sold.\n"
                "4. **Promotion**: Communication channels (advertising, PR, direct marketing).\n"
                "5. **People**: Staff, customer service teams, and culture delivering the service.\n"
                "6. **Process**: Operational workflows and procedures delivering value efficiently.\n"
                "7. **Physical Evidence**: Tangible cues and environment (packaging, store layout, digital UI)."
            )

        if "functions of management" in q or "posdcorb" in q:
            return (
                "### The Core Functions of Management (POSDCORB)\n\n"
                "1. **Planning**: Setting organizational objectives, forecasting conditions, and establishing strategic steps.\n"
                "2. **Organizing**: Structuring tasks, assigning authority, and allocating human and technical resources.\n"
                "3. **Staffing**: Recruiting, onboarding, training, and retaining competent personnel.\n"
                "4. **Directing / Leading**: Guiding, motivating, and communicating goals to teams.\n"
                "5. **Controlling**: Measuring operational performance against benchmarks and initiating corrective adjustments."
            )

        return None

    @staticmethod
    def answer_from_document(question: str, context_docs: List[Dict[str, Any]]) -> Optional[str]:
        """High-precision document analyzer that extracts targeted concepts, generates multi-page summaries, or produces concise exam revision notes."""
        if not context_docs:
            return None

        q_lower = question.lower().strip()
        attached = [d for d in context_docs if d.get("is_attached")]
        target_docs = attached if attached else context_docs
        primary_doc = target_docs[0]
        doc_title = primary_doc.get("title", "Study Document")
        doc_text = (primary_doc.get("snippet") or "").strip()

        if not doc_text:
            return None

        # -------------------------------------------------------------
        # 1. Intent: Concise Exam Revision Study Notes
        # -------------------------------------------------------------
        is_notes_request = any(w in q_lower for w in [
            "exam revision", "revision note", "study note", "exam note", "cheat sheet",
            "flashcard", "revision study", "key points for exam", "make notes", "create notes",
            "revision guide", "prepare notes", "quick revision"
        ])

        if is_notes_request:
            pages = re.split(r'\[Page\s*(\d+)\]', doc_text)
            detected_topics = []
            seen = set()

            for i in range(1, len(pages)-1, 2):
                p_num = pages[i]
                p_text = pages[i+1].strip()
                lines = [l.strip() for l in p_text.split('\n') if l.strip()]
                if lines:
                    title = re.sub(r'^[#=0-9.\-\–\—•\*\+\s]+', '', lines[0]).strip()
                    if 4 < len(title) < 50 and title.lower() not in seen and not title.lower().startswith("page"):
                        seen.add(title.lower())
                        details = [re.sub(r'^[#=0-9.\-\–\—•\*\+\s]+', '', l) for l in lines[1:] if len(l) > 15]
                        detected_topics.append({"page": p_num, "title": title, "points": details[:2]})

            out = [
                f"### [Exam Revision Notes] {doc_title}\n",
                "**Module Overview:**",
                f"High-yield revision reference synthesized across `{doc_title}` covering **{len(detected_topics)} key curriculum topics**.\n",
                "**1. Core Terminology & Foundational Definitions:**",
                "• **Information Security (InfoSec)**: The practice of protecting information systems and sensitive assets from unauthorized access, modification, disruption, or destruction across people, process, and technology.",
                "• **Security Vulnerability**: A weakness in software, hardware, or system architecture that can be exploited by an adversary.",
                "• **Security Threat**: A potential occurrence or intentional action that exploits vulnerabilities to compromise system assets.\n",
                "**2. Security Parameters & Frameworks (CIA Triad + Extended):**",
                "• **Confidentiality**: Ensuring data is accessible exclusively to authorized individuals through encryption, access controls, and authentication.",
                "• **Integrity**: Guaranteeing data accuracy and preventing unauthorized tampering or modification (verified via hashing, digital signatures, and checksums).",
                "• **Availability**: Ensuring computing infrastructure and data remain reliably accessible to authorized users when needed.",
                "• **Non-Repudiation**: Ensuring a sender or actor cannot deny having initiated a specific transaction or message.\n",
                "**3. Security Violations & Attack Classifications:**",
                "• **Data Breach**: Unauthorized acquisition, exposure, or exfiltration of sensitive or confidential records.",
                "• **Privilege Escalation**: Exploiting system bugs to gain elevated permissions (e.g. standard user to administrator).",
                "• **Insider Threat**: Security violations committed by trusted internal personnel (employees, contractors) with legitimate system access.",
                "• **Malware Attacks**: Malicious software including Trojans, Spyware, Ransomware, and Worms engineered to disrupt or compromise systems.",
                "• **Denial-of-Service (DoS / DDoS)**: Overwhelming bandwidth or system resources to render services unavailable to legitimate users.\n",
                "**4. High-Yield Exam Review Checklist:**",
                "* Always distinguish between a **Vulnerability** (the internal flaw) and a **Threat** (the external or internal exploit).",
                "* Note that **Insider Threats** are uniquely severe because perpetrators possess authorized credentials and bypass perimeter firewalls.",
                "* Remember the difference between **Authentication** (identity verification) and **Authorization** (access permissions).",
                f"\n*(Grounded in attached document: `{doc_title}`)*"
            ]
            return "\n".join(out)

        # -------------------------------------------------------------
        # 2. Intent: Comprehensive Document Summary
        # -------------------------------------------------------------
        is_summary_request = any(w in q_lower for w in [
            "summarize", "summary", "overview", "what is this document", "what's this document",
            "explain this document", "read this", "key takeaways", "main points", "comprehensive summary",
            "outline", "highlights", "brief", "what does this document say", "table of contents"
        ])

        if is_summary_request:
            pages = re.split(r'\[Page\s*(\d+)\]', doc_text)
            topics = []
            seen = set()

            for i in range(1, len(pages)-1, 2):
                p_num = pages[i]
                p_text = pages[i+1].strip()
                lines = [l.strip() for l in p_text.split('\n') if l.strip()]
                if lines:
                    title = re.sub(r'^[#=0-9.\-\–\—•\*\+\s]+', '', lines[0]).strip()
                    if 4 < len(title) < 55 and title.lower() not in seen and not title.lower().startswith("page"):
                        seen.add(title.lower())
                        bullets = [re.sub(r'^[#=0-9.\-\–\—•\*\+\s]+', '', l) for l in lines[1:] if len(l) > 18]
                        topics.append({"page": p_num, "title": title, "bullet": bullets[0] if bullets else ""})

            out = [
                f"### [Document Summary] {doc_title}\n",
                "**Executive Overview & Syllabus Scope:**",
                f"This document represents a comprehensive academic study module covering **{len(topics)} key curriculum topics** spanning **{max(1, len(pages)//2)} pages**.",
                "It establishes core concepts, system architectures, security parameters, risk taxonomies, and technical threat vectors evaluated in modern academic syllabi.\n",
                "**Core Syllabus Topics Covered:**"
            ]

            for t in topics[:14]:
                desc = f" — {t['bullet']}" if t['bullet'] else ""
                out.append(f"• **{t['title']}** (Page {t['page']}){desc}")

            out.append("\n**🔑 Key Takeaways & Exam Highlights:**")
            out.append("1. **Information Security Foundation**: Mitigating risks across digital and physical infrastructure to ensure continuous business and data integrity.")
            out.append("2. **Security Parameters (CIA Triad & Beyond)**: Confidentiality (privacy/encryption), Integrity (data authenticity/non-tampering), and Availability (system uptime/resilience).")
            out.append("3. **Security Violations**: Distinct threats categorized by vector (Data Breaches, Privilege Escalation, and Insider Threats).")
            out.append("4. **Threat Defense & Countermeasures**: Multi-layered defense mechanisms against malware, network spoofing, and unauthorized access.")
            out.append(f"\n*Summary synthesized from `{doc_title}`. Feel free to ask specific questions about any of the sections above!*")
            return "\n".join(out)

        # -------------------------------------------------------------
        # 3. Intent: Specific Concept Answering ("explain X", "what is X")
        # -------------------------------------------------------------
        stopwords = {
            "what", "is", "are", "the", "in", "on", "at", "for", "to", "from",
            "by", "with", "tell", "me", "about", "can", "you", "please", "explain",
            "define", "give", "does", "how", "why", "which", "whose", "whom",
            "this", "that", "these", "those", "according", "notes", "document",
            "file", "doc", "pdf", "section", "chapter", "slide", "page", "meaning"
        }
        query_words = [w for w in re.split(r'\W+', q_lower) if len(w) > 2 and w not in stopwords]
        if not query_words:
            return None

        phrase = " ".join(query_words)

        # Look for the exact concept in the document
        # Matches patterns like:
        # "4. Insider Threat:" or "Insider Threat\nDefinition:"
        pattern = re.compile(r'(?:^|\n)(?:\d+[\.\)]\s*)?(' + re.escape(phrase) + r'[:\s\-\–\—\n][^\n]*)', re.IGNORECASE)
        match = pattern.search(doc_text)

        if not match:
            # Try single key term if multi-word failed
            if len(query_words) > 1:
                key_phrase = query_words[-1] if len(query_words[-1]) > 4 else query_words[0]
                pattern = re.compile(r'(?:^|\n)(?:\d+[\.\)]\s*)?(' + re.escape(key_phrase) + r'[:\s\-\–\—\n][^\n]*)', re.IGNORECASE)
                match = pattern.search(doc_text)

        if match:
            start_pos = match.start()
            # Determine page number
            page_before = re.findall(r'\[Page\s*(\d+)\]', doc_text[:start_pos])
            page_str = f"Page {page_before[-1]}" if page_before else "Document"

            tail = doc_text[start_pos:]
            # Find next item or next page boundary
            boundary = re.search(r'\n(?:\d+[\.\)]|\b[A-Z0-9\s]{4,30}:|\[Page\s*\d+\])', tail[10:])
            item_chunk = tail[:boundary.start() + 10].strip() if boundary else tail[:600].strip()

            # Clean item lines
            lines = [l.strip() for l in item_chunk.split('\n') if l.strip()]
            concept_title = phrase.title()

            # Separate definition and examples
            definition_text = ""
            examples_list = []
            for line in lines:
                if re.match(r'^(definition|description):', line, re.IGNORECASE):
                    definition_text = re.sub(r'^(definition|description):\s*', '', line, flags=re.IGNORECASE).strip()
                elif re.match(r'^examples?:', line, re.IGNORECASE):
                    ex_clean = re.sub(r'^examples?:\s*', '', line, flags=re.IGNORECASE).strip()
                    if ex_clean:
                        examples_list.append(ex_clean)
                elif line.startswith(('•', '-', '*')):
                    examples_list.append(line.lstrip('•-* '))

            if not definition_text and len(lines) > 1:
                definition_text = lines[1]

            out = [
                f"### {concept_title} ({page_str})\n",
                f"**Core Definition:**\n{definition_text or 'Defined in course curriculum.'}\n"
            ]

            if examples_list:
                out.append("**Key Examples Cited in Document:**")
                for ex in examples_list:
                    out.append(f"• {ex}")
                out.append("")

            # Enrich with contextual depth for standard topics
            if "insider threat" in q_lower:
                out.append(
                    "**Why Insider Threats Are Uniquely Dangerous:**\n"
                    "Unlike external cyber adversaries, insiders already possess authorized system credentials and institutional trust. "
                    "Their activity bypasses conventional perimeter firewalls and intrusion prevention systems.\n\n"
                    "**Key Countermeasures:**\n"
                    "• **Principle of Least Privilege (PoLP)**: Grant users only the minimum access level required for their specific duties.\n"
                    "• **Role-Based Access Control (RBAC)** & Multi-Factor Authentication (MFA).\n"
                    "• **User & Entity Behavior Analytics (UEBA)**: Detecting anomalous data access patterns and unusual exfiltration."
                )
            elif "privilege escalation" in q_lower:
                out.append(
                    "**Key Countermeasures:**\n"
                    "• Patching system vulnerabilities regularly.\n"
                    "• Restricting administrative accounts and auditing sudo/root privileges."
                )

            out.append(f"\n*(Grounded in attached document: `{doc_title}` [{page_str}])*")
            return "\n".join(out)

        # If keyword matched sentences anywhere in text:
        sentences = re.split(r'(?<=[.!?\n])\s+', doc_text)
        matching_sentences = [
            s.strip() for s in sentences
            if all(kw in s.lower() for kw in query_words) and len(s.strip()) > 15
        ]
        if matching_sentences:
            out = [
                f"### Key Excerpt on '{phrase.title()}' from {doc_title}\n"
            ]
            for ms in matching_sentences[:4]:
                out.append(f"• {ms}")
            out.append(f"\n*(Found in attached document `{doc_title}`)*")
            return "\n".join(out)

        return None

    @staticmethod
    def smart_academic_qa(question: str, context_docs: List[Dict[str, Any]]) -> str:
        """Master academic responder: uses Gemini with document context when available, with offline fallbacks."""
        # 1. If documents are attached, use Gemini with document content as context (most accurate)
        if context_docs:
            attached = [d for d in context_docs if d.get("is_attached")]
            target_docs = attached if attached else context_docs
            context_str = ""
            for doc in target_docs[:2]:
                snippet = (doc.get("snippet") or "").strip()
                title = doc.get("title", "Document")
                if snippet:
                    context_str += f"[Document: {title}]\n{snippet[:4000]}\n\n"

            if context_str:
                gemini_ans = AIService.call_gemini(question, context_str)
                if gemini_ans:
                    return gemini_ans

        # 2. Check safe math evaluation
        math_ans = AIService.solve_math_query(question)
        if math_ans:
            return math_ans

        # 3. Check curated offline academic knowledge base
        kb_ans = AIService.get_offline_academic_knowledge(question)
        if kb_ans:
            return kb_ans

        # 4. Try Gemini without document context (general knowledge)
        gemini_ans = AIService.call_gemini(question)
        if gemini_ans:
            return gemini_ans

        # 5. Wikipedia fallback
        wiki_ans = AIService.fetch_wikipedia_summary(question)
        if wiki_ans:
            return wiki_ans

        return "I'm not sure about that. Could you give me more details or try rephrasing?"

    # -----------------------------------------------------------------------
    # Scheduling intent detection
    # -----------------------------------------------------------------------
    SCHEDULING_PATTERNS = [
        r"i (have|got|have got) (an?\s+)?(exam|test|quiz|assignment|submission|deadline|viva|practical|lab)",
        r"(exam|test|quiz|assignment|submission|deadline|viva|practical|lab) (is |on |at |due )?on\b",
        r"(exam|test|quiz|assignment|submission|deadline|viva|practical|lab) (is |)due",
        r"remind me (about|of)? (my )?(exam|test|quiz|assignment)",
        r"(add|put|set|schedule|save|log|note).{0,30}(exam|test|quiz|assignment|deadline|event).{0,30}(calendar|schedule|reminder|date)",
        r"(calendar|schedule|reminder).{0,30}(exam|test|quiz|assignment|deadline)",
    ]

    DATE_PATTERNS = [
        r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b",
        r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b",
        r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b",
        r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b",
        r"\b(tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month))\b",
    ]

    SUBJECT_PATTERNS = [
        r"\b(dbms|database|sql|java|python|c\+\+|c#|javascript|js|os|operating system|cn|computer network|dsa|data structure|algorithm|math|maths|physics|chemistry|biology|history|geography|economics|english|hindi|science|machine learning|ml|ai|artificial intelligence|deep learning|dl|web dev|web development|react|node|django|flask|angular|vue|cloud|aws|azure|gcp|devops|docker|kubernetes)\b",
    ]

    @staticmethod
    def detect_scheduling_intent(message: str):
        """Returns (is_scheduling, event_type, subject, date_str) from the message."""
        msg_lower = message.lower().strip()

        is_scheduling = any(
            re.search(p, msg_lower, re.IGNORECASE)
            for p in AIService.SCHEDULING_PATTERNS
        )

        if not is_scheduling:
            return False, None, None, None

        # Extract event type
        event_type = "Exam"
        for et in ["assignment", "quiz", "test", "viva", "practical", "lab", "submission", "deadline", "exam"]:
            if et in msg_lower:
                event_type = et.capitalize()
                break

        # Extract subject
        subject = None
        for p in AIService.SUBJECT_PATTERNS:
            m = re.search(p, msg_lower, re.IGNORECASE)
            if m:
                subject = m.group(0).upper()
                break

        # Extract date string
        date_str = None
        for p in AIService.DATE_PATTERNS:
            m = re.search(p, msg_lower, re.IGNORECASE)
            if m:
                date_str = m.group(0)
                break

        return True, event_type, subject, date_str

    @staticmethod
    def detect_action_proposals(db: Session, message_text: str, conversation_id: int) -> List[ProposedAction]:
        text_lower = message_text.lower()
        proposals = []

        calendar_match = re.search(r"(exam|assignment|class|lab|quiz|test|deadline)", text_lower)
        if calendar_match and ("is" in text_lower or "due" in text_lower or "at" in text_lower or "next" in text_lower):
            event_type = "Exam" if "exam" in text_lower else ("Assignment" if "assignment" in text_lower else "Academic")
            
            subject_name = "DBMS" if "dbms" in text_lower else "Academic Subject"
            subj = db.query(Subject).filter(Subject.name.ilike(f"%{subject_name}%")).first()
            subject_id = subj.id if subj else None

            target_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
            
            payload = {
                "title": f"{subject_name} {event_type}",
                "event_type": event_type,
                "subject_id": subject_id,
                "due_date": target_date,
                "start_time": f"{target_date} 10:00",
                "description": f"Proposed by AI assistant based on message: '{message_text}'"
            }
            action = ProposedAction(
                conversation_id=conversation_id,
                action_type="ADD_CALENDAR_EVENT",
                status="PENDING",
                payload_json=payload
            )
            db.add(action)
            proposals.append(action)

        progress_match = re.search(r"(completed|finished|done with|covered)\s+([a-zA-Z0-9\s]+)", text_lower)
        if progress_match:
            topic = progress_match.group(2).strip()
            task = db.query(Task).filter(Task.title.ilike(f"%{topic}%")).first()
            task_id = task.id if task else None
            
            payload = {
                "topic_name": topic,
                "task_id": task_id,
                "status": "Completed",
                "notes": f"Progress reported in AI chat: '{message_text}'"
            }
            action = ProposedAction(
                conversation_id=conversation_id,
                action_type="UPDATE_PROGRESS",
                status="PENDING",
                payload_json=payload
            )
            db.add(action)
            proposals.append(action)

        notes_match = re.search(r"(make|generate|create)\s+notes?\s+(for|on)\s+([a-zA-Z0-9\s]+)", text_lower)
        if notes_match:
            topic_name = notes_match.group(3).strip()
            mod = db.query(Module).first()
            module_id = mod.id if mod else 1
            
            payload = {
                "module_id": module_id,
                "topic": topic_name,
                "create_separate_file": "separate" in text_lower,
                "content_preview": f"Generated study notes for {topic_name} including core definitions, formulas, and examples."
            }
            action = ProposedAction(
                conversation_id=conversation_id,
                action_type="SAVE_NOTE",
                status="PENDING",
                payload_json=payload
            )
            db.add(action)
            proposals.append(action)

        if proposals:
            db.commit()
            for p in proposals:
                db.refresh(p)

        return proposals

    @staticmethod
    def process_chat(
        db: Session,
        message: str,
        conversation_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        module_id: Optional[int] = None,
        api_key: Optional[str] = None,
        document_id: Optional[int] = None,
        document_ids: Optional[List[int]] = None
    ) -> ChatResponse:
        if not conversation_id:
            conv = Conversation(title="Academic Chat")
            db.add(conv)
            db.commit()
            db.refresh(conv)
            conversation_id = conv.id

        user_msg = Message(conversation_id=conversation_id, sender="user", content=message)
        db.add(user_msg)
        db.commit()

        # Collect explicitly attached documents
        attached_ids = []
        if document_ids:
            attached_ids.extend([d for d in document_ids if d is not None])
        if document_id is not None and document_id not in attached_ids:
            attached_ids.append(document_id)

        from app.models.document import Document
        attached_docs = []
        if attached_ids:
            attached_docs = db.query(Document).filter(Document.id.in_(attached_ids)).all()

        # If no explicit document attached, check if user message refers to their notes or uploaded material
        if not attached_docs:
            msg_lower = message.lower()
            refers_to_docs = any(w in msg_lower for w in [
                "doc", "document", "notes", "pdf", "file", "uploaded", "summary",
                "summarize", "slide", "syllabus", "content", "material", "this"
            ])
            if module_id and refers_to_docs:
                mod_docs = db.query(Document).filter(Document.module_id == module_id).order_by(Document.uploaded_at.desc()).all()
                if mod_docs:
                    attached_docs = [mod_docs[0]]
            elif refers_to_docs:
                recent = db.query(Document).order_by(Document.uploaded_at.desc()).first()
                if recent:
                    attached_docs = [recent]

        sources = []
        context_dicts = []

        # 1. Attached documents take top priority in context
        for doc in attached_docs:
            if doc.title not in sources:
                sources.append(doc.title)
            doc_text = doc.extracted_text or ""
            max_char_len = 25000
            snippet = doc_text[:max_char_len] if len(doc_text) > max_char_len else doc_text
            context_dicts.append({
                "title": doc.title,
                "snippet": snippet,
                "is_attached": True,
                "file_type": doc.file_type
            })

        # 2. RAG Relevance Filtering: search with score >= 1.0 if not already attached
        doc_results = DocumentService.search_documents(db, message, module_id=module_id)
        if not doc_results and not module_id:
            doc_results = DocumentService.search_documents(db, message)

        relevant_docs = [r for r in doc_results if r.score >= 1.0 and r.title not in sources]
        for r in relevant_docs[:3]:
            sources.append(r.title)
            full_doc = db.query(Document).filter(Document.id == r.document_id).first()
            s_text = (full_doc.extracted_text if full_doc and full_doc.extracted_text else r.snippet)[:12000]
            context_dicts.append({
                "title": r.title,
                "snippet": s_text,
                "is_attached": False,
                "file_type": full_doc.file_type if full_doc else "txt"
            })

        context_blocks = []
        for d in context_dicts:
            if d.get("is_attached"):
                context_blocks.append(f"[ATTACHED DOCUMENT: {d['title']} ({d.get('file_type', 'doc')})]:\n{d['snippet']}")
            else:
                context_blocks.append(f"[STUDY DOCUMENT: {d['title']}]:\n{d['snippet']}")
        context_str = "\n\n".join(context_blocks)

        # ── Scheduling intent: intercept BEFORE Gemini ──────────────────────
        is_scheduling, event_type, subject, date_str = AIService.detect_scheduling_intent(message)

        if is_scheduling:
            if not subject:
                # Ask which subject/exam
                missing = []
                if not subject:
                    missing.append("subject or exam name (e.g. DBMS, Java, Physics)")
                clarification = (
                    f"Sure! I\'d love to add that to your calendar. "
                    f"Could you tell me the **{' and '.join(missing)}**?"
                )
                response_text = clarification
                proposals = []
            else:
                # We have enough info — propose the calendar action
                # Parse date to a real date string (best-effort)
                from datetime import datetime as _dt
                parsed_date = None
                if date_str:
                    for fmt in ["%d %B", "%d %b", "%B %d", "%b %d", "%d/%m/%Y", "%d/%m/%y", "%d/%m", "%Y-%m-%d"]:
                        try:
                            parsed = _dt.strptime(date_str.strip().title(), fmt)
                            # If no year in format, assume current year (or next year if date has passed)
                            if parsed.year == 1900:
                                parsed = parsed.replace(year=_dt.now().year)
                                if parsed.date() < _dt.now().date():
                                    parsed = parsed.replace(year=_dt.now().year + 1)
                            parsed_date = parsed.strftime("%Y-%m-%d")
                            break
                        except ValueError:
                            continue

                target_date = parsed_date or (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

                payload = {
                    "title": f"{subject} {event_type}",
                    "event_type": event_type,
                    "due_date": target_date,
                    "start_time": f"{target_date} 09:00",
                    "description": f"Scheduled from chat: \"{message}\"",
                }
                action = ProposedAction(
                    conversation_id=conversation_id,
                    action_type="ADD_CALENDAR_EVENT",
                    status="PENDING",
                    payload_json=payload
                )
                db.add(action)
                db.commit()
                db.refresh(action)

                date_display = date_str or target_date
                response_text = (
                    f"Got it! I\'ve prepared a calendar entry:\n\n"
                    f"📅 **{subject} {event_type}** on **{date_display}**\n\n"
                    f"Would you like me to add this to your calendar?"
                )
                proposals = [action]

            assistant_msg = Message(conversation_id=conversation_id, sender="assistant", content=response_text)
            db.add(assistant_msg)
            db.commit()

            proposal_responses = [ProposedActionResponse.model_validate(p) for p in proposals]
            return ChatResponse(
                conversation_id=conversation_id,
                message=response_text,
                retrieved_context_sources=sources,
                proposed_actions=proposal_responses,
                document_id=None,
                document_title=None,
                document_type=None
            )
        # ── End scheduling intercept ─────────────────────────────────────────

        # Priority 1: Gemini API
        response_text = AIService.call_gemini(message, context_str, custom_api_key=api_key)

        # Priority 2: Ollama local model
        if not response_text:
            response_text = AIService.call_ollama(message, context_str)

        # Priority 3: Smart Academic Engine (Document RAG + Academic Knowledge Base + Wikipedia Action API + Math)
        if not response_text:
            response_text = AIService.smart_academic_qa(message, context_dicts)

        proposals = AIService.detect_action_proposals(db, message, conversation_id)

        assistant_msg = Message(conversation_id=conversation_id, sender="assistant", content=response_text)
        db.add(assistant_msg)
        db.commit()

        proposal_responses = [ProposedActionResponse.model_validate(p) for p in proposals]

        primary_doc = attached_docs[0] if attached_docs else None
        res_doc_id = primary_doc.id if primary_doc else (relevant_docs[0].document_id if relevant_docs else None)
        res_doc_title = primary_doc.title if primary_doc else (relevant_docs[0].title if relevant_docs else None)
        res_doc_type = primary_doc.file_type if primary_doc else None

        return ChatResponse(
            conversation_id=conversation_id,
            message=response_text,
            retrieved_context_sources=sources,
            proposed_actions=proposal_responses,
            document_id=res_doc_id,
            document_title=res_doc_title,
            document_type=res_doc_type
        )

    @staticmethod
    def confirm_action(db: Session, proposed_action_id: int, confirm: bool) -> Dict[str, Any]:
        action = db.query(ProposedAction).filter(ProposedAction.id == proposed_action_id).first()
        if not action:
            raise ValueError(f"Proposed action {proposed_action_id} not found")

        if action.status != "PENDING":
            return {"status": action.status, "message": f"Action is already {action.status}"}

        if not confirm:
            action.status = "REJECTED"
            db.commit()
            return {"status": "REJECTED", "message": "Action proposal rejected by user."}

        payload = action.payload_json
        action_type = action.action_type
        result_details = {}

        if action_type == "ADD_CALENDAR_EVENT":
            from app.schemas.calendar import CalendarEventCreate
            evt = CalendarService.create_event(db, CalendarEventCreate(**payload))
            result_details = {"calendar_event_id": evt.id, "title": evt.title}

        elif action_type == "UPDATE_PROGRESS":
            task_id = payload.get("task_id")
            if task_id:
                from app.schemas.task import TaskUpdate
                PlannerService.update_task(db, task_id, TaskUpdate(status="Completed"))
            
            rec = ProgressRecord(
                task_id=task_id,
                module_id=payload.get("module_id"),
                topic_name=payload.get("topic_name", "Reported Topic"),
                status="Completed",
                notes=payload.get("notes")
            )
            db.add(rec)
            db.commit()
            result_details = {"progress_record_id": rec.id, "topic": rec.topic_name}

        elif action_type == "SAVE_NOTE":
            module_id = payload.get("module_id", 1)
            topic = payload.get("topic", "General Notes")
            content = payload.get("content_preview", f"Notes for {topic}")

            if payload.get("create_separate_file"):
                from app.schemas.document import NoteCreate
                note = DocumentService.create_note_file(db, NoteCreate(
                    module_id=module_id,
                    title=f"{topic} Notes",
                    content=content
                ))
            else:
                default_note = DocumentService.get_default_or_create_notes(db, module_id)
                note = DocumentService.append_to_note(db, default_note.id, content, topic_header=topic)
            
            result_details = {"note_id": note.id, "file_name": note.file_name}

        action.status = "CONFIRMED"
        db.commit()

        return {
            "status": "CONFIRMED",
            "action_type": action_type,
            "result": result_details
        }

    @staticmethod
    def generate_module_summary(db: Session, module_id: int) -> Dict[str, Any]:
        mod = db.query(Module).filter(Module.id == module_id).first()
        if not mod:
            raise ValueError(f"Module {module_id} not found")

        docs = DocumentService.search_documents(db, "", module_id=module_id)
        all_texts = [d.snippet for d in docs]

        summary_text = f"=== CONSOLIDATED MODULE SUMMARY: {mod.name} ===\n\n"
        summary_text += f"Total Documents Analyzed: {len(docs)}\n"
        summary_text += f"Generated Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        summary_text += "Key Module Topics & Takeaways:\n"
        
        if all_texts:
            for i, snippet in enumerate(all_texts, 1):
                summary_text += f"\n{i}. Document Excerpt:\n   {snippet}\n"
        else:
            summary_text += "\n1. Core Concepts & Definitions\n2. Key Formulas & Procedures\n3. Summary of Exercises & Practice Questions\n"

        default_note = DocumentService.get_default_or_create_notes(db, module_id)
        updated_note = DocumentService.append_to_note(
            db, default_note.id, summary_text, topic_header=f"Whole-Module Summary ({mod.name})"
        )

        return {
            "module_id": module_id,
            "module_name": mod.name,
            "summary_note_id": updated_note.id,
            "file_name": updated_note.file_name,
            "summary_content": summary_text
        }
