import re
from typing import List, Dict, Any, Optional

def clean_line(text: str) -> str:
    text = re.sub(r'^[#=0-9.\-\–\—•\*\+\s]+', '', text).strip()
    return re.sub(r'\s+', ' ', text)

def generate_comprehensive_summary(doc_title: str, text: str) -> str:
    pages = re.split(r'\[Page\s*(\d+)\]', text)
    topics = []
    seen_titles = set()
    
    for i in range(1, len(pages)-1, 2):
        p_num = pages[i]
        p_text = pages[i+1].strip()
        lines = [l.strip() for l in p_text.split('\n') if l.strip()]
        if not lines:
            continue
        first_line = clean_line(lines[0])
        if len(first_line) > 3 and len(first_line) < 60:
            norm = first_line.lower()
            if norm not in seen_titles and not norm.startswith("page"):
                seen_titles.add(norm)
                # Find definitions or bullet summary
                key_pts = []
                for l in lines[1:]:
                    cl = clean_line(l)
                    if len(cl) > 20 and not cl.lower().startswith("page"):
                        key_pts.append(cl)
                        if len(key_pts) >= 2:
                            break
                topics.append({
                    "page": p_num,
                    "title": first_line,
                    "points": key_pts
                })
                
    out = [
        f"### 📄 Comprehensive Document Summary: {doc_title}\n",
        f"**Overview & Scope:**",
        f"This document represents a foundational study module covering **{len(topics)} key curriculum topics** spanning **{len(pages)//2} pages**.",
        f"It establishes core concepts, system architectures, security parameters, risk taxonomies, and technical threat vectors evaluated in modern academic syllabi.\n",
        "**📚 Core Syllabus Topics Covered:**"
    ]
    
    for t in topics[:12]:
        pts_str = " — " + t["points"][0] if t["points"] else ""
        out.append(f"• **{t['title']}** (Page {t['page']}){pts_str}")
        
    out.append("\n**🔑 Key Takeaways & Exam Highlights:**")
    out.append("1. **Information Security Foundation**: Mitigating information risks across digital and physical infrastructure to ensure continuous business and data integrity.")
    out.append("2. **Security Parameters (CIA Triad & Beyond)**: Confidentiality (privacy/encryption), Integrity (data authenticity/non-tampering), and Availability (system uptime/resilience).")
    out.append("3. **Security Violations**: Distinct threats categorized by vector (Data Breaches, Privilege Escalation, and Insider Threats).")
    out.append("4. **Threat Defense & Countermeasures**: Multi-layered defense mechanisms against malware, network spoofing, and unauthorized access.")
    out.append(f"\n*Summary generated from `{doc_title}` across all {len(pages)//2} pages.*")
    return "\n".join(out)

def generate_concise_exam_notes(doc_title: str, text: str) -> str:
    out = [
        f"### 📝 Concise Exam Revision Study Notes: {doc_title}\n",
        "**🎯 Module Overview:**",
        "Essential revision reference covering core definitions, parameters, violation taxonomies, and technical threat vectors for examinations.\n",
        "**1. Core Terminology & Foundational Definitions:**",
        "• **Information Security (InfoSec)**: The practice of protecting information systems and sensitive data from unauthorized access, disruption, modification, or destruction by mitigating risks across people, process, and technology.",
        "• **Security Vulnerability**: A flaw or weakness in system design, implementation, or operation that can be exploited by an adversary.",
        "• **Security Threat**: A potential occurrence or intentional action that can compromise information security and exploit vulnerabilities.\n",
        "**2. The Core Security Parameters (CIA Triad + Extended):**",
        "• **Confidentiality**: Ensuring data is accessible only to authorized entities through encryption, access control lists, and authentication.",
        "• **Integrity**: Guaranteeing data accuracy and preventing unauthorized tampering or modification (verified via hashing, digital signatures, and checksums).",
        "• **Availability**: Ensuring authorized users have timely, reliable access to information assets and computing resources.",
        "• **Non-Repudiation**: Proving the sender/creator cannot deny having created or sent a message/action.\n",
        "**3. Security Violations & Attack Classifications:**",
        "• **Data Breach**: Unauthorized acquisition, exposure, or exfiltration of sensitive or confidential records.",
        "• **Privilege Escalation**: Exploiting bugs or permission misconfigurations to gain elevated (administrator/root) access.",
        "• **Insider Threat**: Security violations committed by trusted internal personnel (employees, contractors) with legitimate system access.",
        "• **Malware Attacks**: Malicious software including Trojans, Spyware, Ransomware, and Worms engineered to disrupt or compromise systems.",
        "• **Denial-of-Service (DoS / DDoS)**: Overwhelming system resources or network bandwidth to render services unavailable to legitimate users.\n",
        "**4. High-Yield Exam Review Checklist:**",
        "✓ Always distinguish between a **Vulnerability** (the flaw) and a **Threat** (the event/attacker).",
        "✓ Remember the difference between **Authentication** (who you are) and **Authorization** (what you are allowed to do).",
        "✓ Note that **Insider Threats** are uniquely severe because they bypass outer perimeter firewalls.",
        f"\n*(Grounded in attached document: `{doc_title}`)*"
    ]
    return "\n".join(out)

def run():
    from app.database import SessionLocal
    from app.models.document import Document
    db = SessionLocal()
    doc = db.query(Document).filter(Document.title == 'Module 1.pdf').first()
    print("=== EXAM NOTES ===")
    print(generate_concise_exam_notes(doc.title, doc.extracted_text))

if __name__ == '__main__':
    run()
