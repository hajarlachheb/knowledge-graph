"""Seed the database with finance/tax/PMO company data for Knowledia demo."""

import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.db.postgres import engine, async_session
from app.db.models import (
    Base, Department, User, Skill, UserSkill, RexSheet, Tag, RexTag,
    Bookmark, Vote, Comment, Follow, RexView, Notification,
)
from app.auth import hash_password

DEPARTMENTS = [
    {"name": "Tax Advisory", "description": "Corporate tax, VAT compliance, international tax planning, transfer pricing"},
    {"name": "Audit & Assurance", "description": "Financial audits, internal controls, risk assurance, regulatory compliance"},
    {"name": "PMO", "description": "Project management office — governance, portfolio tracking, methodology standards"},
    {"name": "Corporate Finance", "description": "M&A advisory, valuations, due diligence, financial modelling"},
    {"name": "Risk & Compliance", "description": "Regulatory risk, AML/KYC, SOX compliance, internal audit"},
]

SKILLS = [
    "Corporate Tax", "VAT/GST", "Transfer Pricing", "Tax Compliance", "IFRS",
    "Financial Modelling", "Excel Advanced", "Power BI", "SAP FICO", "Oracle Financials",
    "Project Management", "Agile/Scrum", "Prince2", "Stakeholder Management",
    "Risk Assessment", "SOX Compliance", "AML/KYC", "Internal Audit",
    "M&A Due Diligence", "Valuation", "Python", "SQL", "Tableau",
    "Budgeting & Forecasting",
]

USERS = [
    {"username": "n.fontaine", "email": "n.fontaine@company.com", "full_name": "Nicolas Fontaine", "position": "Tax Director", "dept": "Tax Advisory", "skills": ["Corporate Tax", "Transfer Pricing", "IFRS", "Tax Compliance", "SAP FICO"], "admin": True},
    {"username": "a.leclerc", "email": "a.leclerc@company.com", "full_name": "Amandine Leclerc", "position": "Senior Tax Consultant", "dept": "Tax Advisory", "skills": ["VAT/GST", "Tax Compliance", "Excel Advanced", "SAP FICO"]},
    {"username": "m.renard", "email": "m.renard@company.com", "full_name": "Mathieu Renard", "position": "Audit Manager", "dept": "Audit & Assurance", "skills": ["Internal Audit", "SOX Compliance", "Risk Assessment", "IFRS", "Excel Advanced"]},
    {"username": "s.nguyen", "email": "s.nguyen@company.com", "full_name": "Sophie Nguyen", "position": "Senior Auditor", "dept": "Audit & Assurance", "skills": ["Internal Audit", "IFRS", "SOX Compliance", "Oracle Financials"]},
    {"username": "j.martinez", "email": "j.martinez@company.com", "full_name": "Julien Martinez", "position": "PMO Lead", "dept": "PMO", "skills": ["Project Management", "Prince2", "Agile/Scrum", "Stakeholder Management", "Power BI"]},
    {"username": "c.dubois", "email": "c.dubois@company.com", "full_name": "Claire Dubois", "position": "Project Manager", "dept": "PMO", "skills": ["Project Management", "Agile/Scrum", "Budgeting & Forecasting", "Excel Advanced"]},
    {"username": "p.moreau", "email": "p.moreau@company.com", "full_name": "Philippe Moreau", "position": "Corporate Finance Director", "dept": "Corporate Finance", "skills": ["M&A Due Diligence", "Valuation", "Financial Modelling", "IFRS", "Python"]},
    {"username": "l.bernard", "email": "l.bernard@company.com", "full_name": "Léa Bernard", "position": "Financial Analyst", "dept": "Corporate Finance", "skills": ["Financial Modelling", "Valuation", "Excel Advanced", "Python", "SQL"]},
    {"username": "t.girard", "email": "t.girard@company.com", "full_name": "Thomas Girard", "position": "Compliance Director", "dept": "Risk & Compliance", "skills": ["AML/KYC", "SOX Compliance", "Risk Assessment", "Internal Audit", "Stakeholder Management"]},
    {"username": "e.petit", "email": "e.petit@company.com", "full_name": "Emma Petit", "position": "Risk Analyst", "dept": "Risk & Compliance", "skills": ["Risk Assessment", "AML/KYC", "SQL", "Power BI", "Tableau"]},
]

REX_CATEGORIES = ["lesson-learned", "best-practice", "incident", "process-improvement", "technical-guide"]

REX_SHEETS = [
    {"author": "n.fontaine", "title": "Restructuring intercompany transfer pricing after OECD Pillar Two", "category": "lesson-learned",
     "problematic": "With OECD Pillar Two introducing a 15% global minimum tax, our existing transfer pricing structure — which routed IP royalties through a low-tax entity in Ireland — created a qualified domestic minimum top-up tax (QDMTT) exposure of ~€3.2M annually. The group's effective tax rate needed recalibration, and our documentation was not aligned with the new GloBE rules.",
     "solution": "1. Conducted a full transfer pricing review across 14 intercompany agreements\n2. Relocated economic substance for IP management functions to France (3 FTEs + decision-making)\n3. Updated the benchmarking study using the Transactional Net Margin Method (TNMM) with fresh comparables\n4. Implemented a QDMTT-compliant computation in our SAP FICO module\n5. Filed a Country-by-Country Report (CbCR) with the updated allocation\n\nResult: QDMTT exposure reduced from €3.2M to €400K. Full alignment with Pillar Two by Q2.",
     "tags": ["transfer-pricing", "pillar-two", "oecd", "tax-restructuring", "compliance"]},
    {"author": "a.leclerc", "title": "Automating VAT reconciliation across 8 EU subsidiaries", "category": "technical-guide",
     "problematic": "Monthly VAT reconciliation was taking 12 person-days across 8 EU entities. Each subsidiary used different invoice formats, some on SAP, others on local ERPs. Discrepancies between EC Sales List declarations and actual VAT returns averaged €180K per quarter, triggering audit risk.",
     "solution": "1. Standardized invoice data extraction into a common CSV template per entity\n2. Built a Python reconciliation script that cross-references purchase/sales ledgers with VAT return boxes\n3. Automated EC Sales List matching — flag mismatches above €500 threshold\n4. Monthly dashboard in Power BI showing reconciliation status per entity\n5. Trained local finance teams on the new process\n\nResult: Reconciliation time dropped from 12 to 3 person-days. Discrepancy rate fell below €15K/quarter.",
     "tags": ["vat", "automation", "reconciliation", "eu-compliance", "python"]},
    {"author": "n.fontaine", "title": "Tax provision process: reducing close cycle from 15 to 5 days", "category": "process-improvement",
     "problematic": "Our quarterly tax provision (ASC 740 / IAS 12) was the bottleneck in the financial close cycle. It took 15 days because each entity calculated provisions manually in Excel, emailed spreadsheets to group tax, and group tax re-keyed everything into the consolidation tool. Errors were frequent, and the CFO was losing patience.",
     "solution": "1. Replaced the Excel-based workflow with a centralized tax provision template in SAP FICO\n2. Each entity enters pre-tax income and permanent/temporary differences directly\n3. Automated ETR calculation with a waterfall for discrete items\n4. Built a review dashboard: group tax sees all entities in one screen, flags anomalies automatically\n5. Parallel review — entities submit by day 3, group tax reviews days 3-5 instead of sequential\n\nResult: Close cycle shortened from 15 to 5 working days. Error rate dropped 85%.",
     "tags": ["tax-provision", "financial-close", "sap", "process-improvement", "ias12"]},
    {"author": "m.renard", "title": "Implementing a risk-based audit approach for SOX compliance", "category": "best-practice",
     "problematic": "We were auditing 100% of SOX controls every quarter — 340 controls, 40 testing hours per cycle. The team was exhausted and audit quality was declining because we were spreading too thin. Several immaterial controls were getting the same attention as critical revenue recognition controls.",
     "solution": "1. Performed a top-down risk assessment: scored each control on likelihood of failure × financial impact\n2. Categorized into Tier 1 (critical, 45 controls — test every quarter), Tier 2 (moderate, 120 — test semi-annually), Tier 3 (low risk, 175 — test annually with rotation)\n3. Increased testing depth for Tier 1: sample size from 25 to 40 items, added walkthroughs\n4. Documented the approach and got external auditor sign-off before implementation\n\nResult: Testing hours per quarter dropped from 40 to 22. Zero additional audit findings versus the prior 100% approach.",
     "tags": ["sox", "risk-based-audit", "internal-controls", "compliance", "audit-methodology"]},
    {"author": "s.nguyen", "title": "Detecting revenue recognition irregularities using data analytics", "category": "incident",
     "problematic": "During an annual audit, we suspected revenue was being recognized prematurely in a subsidiary. Manual sampling of 50 invoices found nothing unusual, but the subsidiary's revenue pattern showed a suspicious spike every quarter-end (last 3 days accounted for 30% of quarterly revenue).",
     "solution": "1. Extracted the full revenue journal (18,000 entries) and loaded into Python/pandas\n2. Applied Benford's Law analysis on invoice amounts — significant deviation in first-digit distribution\n3. Flagged all entries posted in the last 3 days of each quarter with reversal within 15 days — found 47 entries totalling €2.1M\n4. Cross-referenced with delivery confirmations — 32 entries had no proof of delivery before recognition\n5. Presented findings to the audit committee with a visual timeline\n\nResult: €1.4M revenue restatement. Subsidiary implemented a delivery-based recognition trigger.",
     "tags": ["audit", "data-analytics", "revenue-recognition", "benfords-law", "fraud-detection"]},
    {"author": "j.martinez", "title": "Building a PMO governance framework from scratch for a €50M programme", "category": "best-practice",
     "problematic": "The company launched a €50M ERP transformation programme with 12 workstreams but no central governance. Each workstream had its own reporting format, timeline assumptions, and risk register. The steering committee was getting 12 different status updates in 12 different formats and couldn't assess overall programme health.",
     "solution": "1. Established a tiered governance model: weekly workstream leads meeting, biweekly programme board, monthly steering committee\n2. Standardized status reporting: single-page RAG dashboard per workstream with milestones, risks, budget burn\n3. Created a central RAID log (Risks, Actions, Issues, Dependencies) in Jira with escalation SLAs\n4. Implemented earned value management (EVM) to track budget vs. progress — SPI and CPI visible at all levels\n5. Monthly benefits realization tracking against the original business case\n\nResult: Programme delivered on time (18 months) and €2.3M under budget. Zero scope escalations to steering committee after month 4.",
     "tags": ["pmo", "governance", "erp-transformation", "programme-management", "earned-value"]},
    {"author": "c.dubois", "title": "Agile transformation in a traditional finance PMO", "category": "lesson-learned",
     "problematic": "Our PMO ran everything in waterfall — 6-month planning cycles, 80-page project charters, weekly status meetings that lasted 3 hours. Projects were consistently late (average 4 months overrun), and sponsors complained they didn't see any deliverables until month 10 of a 12-month project.",
     "solution": "1. Piloted Agile on 2 mid-size projects: 2-week sprints, product backlog, sprint reviews with sponsors\n2. Replaced the 80-page charter with a 2-page project canvas (vision, outcomes, constraints, first 3 sprints)\n3. Introduced sprint demos — sponsors see working deliverables every 2 weeks\n4. Kept governance light: 15-min daily standups, sprint retrospectives, and a simple Kanban board\n5. Trained 8 PMs in Scrum — each runs 1 agile pilot before converting their main portfolio\n\nResult: Average delivery overrun dropped from 4 months to 3 weeks. Sponsor satisfaction (survey) went from 4.2/10 to 8.1/10.",
     "tags": ["agile", "pmo-transformation", "scrum", "project-management", "change-management"]},
    {"author": "p.moreau", "title": "Financial model for a cross-border acquisition — handling currency risk", "category": "technical-guide",
     "problematic": "We were advising on a €120M acquisition of a UK target. The LBO model was built in GBP but the buyer was EUR-denominated. With GBP/EUR volatility of 8% annually, the IRR swing was ±3pp depending on FX assumptions. The investment committee couldn't make a decision because every meeting the returns looked different.",
     "solution": "1. Built a dual-currency model: operating model in GBP, returns computed in EUR with explicit FX assumptions\n2. Added three FX scenarios: spot forward, 1-year average, and stressed (10% depreciation)\n3. Modelled a hedging strategy: 18-month rolling FX forward covering 75% of expected cash repatriation\n4. Included the cost of hedging (~40bps/year) as a line item in the bridge-to-equity returns\n5. Presented a 'decision matrix' showing IRR under each FX × revenue scenario combination\n\nResult: Committee approved at EUR-denominated IRR of 18-22% (hedged range). Deal closed within 8 weeks.",
     "tags": ["financial-modelling", "m&a", "currency-risk", "lbo", "due-diligence"]},
    {"author": "l.bernard", "title": "Automating DCF valuations with Python — from 3 days to 3 hours", "category": "technical-guide",
     "problematic": "Every deal required a discounted cash flow (DCF) valuation. Building one from scratch in Excel took 3 days: gathering financial data, building projections, computing WACC, running sensitivities. We were doing 15-20 DCFs per quarter and the team was buried in spreadsheets with broken links.",
     "solution": "1. Built a Python-based DCF engine: inputs are revenue, margins, capex, and working capital assumptions in a YAML config\n2. WACC calculation automated: pulls risk-free rate from ECB, beta from Bloomberg API, market premium from Damodaran database\n3. Sensitivity tables auto-generated: growth rate × WACC matrix, tornado chart for key assumptions\n4. Output: formatted PDF report with waterfall bridge, football field chart, and comparable multiples\n5. Version-controlled in Git — every assumption change is tracked\n\nResult: DCF build time dropped from 3 days to 3 hours. Eliminated formula errors. Analysts focus on judgment, not mechanics.",
     "tags": ["valuation", "python", "dcf", "automation", "financial-modelling"]},
    {"author": "t.girard", "title": "Overhauling KYC processes to meet 6AMLD requirements", "category": "process-improvement",
     "problematic": "Our KYC (Know Your Customer) onboarding was taking 23 days on average. With the 6th Anti-Money Laundering Directive expanding the definition of money laundering offences and imposing stricter beneficial ownership requirements, our existing process couldn't scale. We had 200+ pending onboardings and the regulator was asking questions.",
     "solution": "1. Mapped the end-to-end KYC workflow: found 7 handoffs between compliance, operations, and legal — 3 were redundant\n2. Implemented tiered risk scoring: low-risk clients get simplified due diligence (SDD), high-risk get enhanced (EDD) with source-of-wealth verification\n3. Automated beneficial ownership extraction from commercial registries via API (Infogreffe, Companies House)\n4. Built a compliance dashboard in Power BI: real-time KYC pipeline, aging analysis, SLA tracking\n5. Trained 12 analysts on the new triage system\n\nResult: Average onboarding time dropped from 23 to 8 days. Backlog cleared within 6 weeks. Passed regulatory inspection with zero findings.",
     "tags": ["kyc", "aml", "6amld", "compliance", "process-improvement"]},
    {"author": "e.petit", "title": "Building an operational risk heatmap with quantified exposure", "category": "technical-guide",
     "problematic": "Our risk register was a 300-row Excel spreadsheet where risks were rated 'High/Medium/Low' based on gut feeling. Nobody trusted it. When the board asked 'what is our total risk exposure in euros?', the risk team couldn't answer. The matrix hadn't been updated in 9 months.",
     "solution": "1. Redesigned the risk framework: each risk scored on probability (1-5) × impact in € terms (from €50K to €10M+)\n2. Ran 15 workshops with business unit leaders to re-assess all risks with the new methodology\n3. Built an interactive heatmap in Tableau: risks plotted on probability × impact grid, drill-down to mitigations\n4. Added a Monte Carlo simulation (Python) for the top 20 risks — gives a 95th percentile aggregate exposure figure\n5. Quarterly refresh cycle: each BU owner validates their risks, new risks flagged by incident reports\n\nResult: Board now sees a single exposure number (€14.2M at 95th percentile). 3 previously unknown high-impact risks identified and mitigated.",
     "tags": ["risk-management", "heatmap", "monte-carlo", "operational-risk", "tableau"]},
    {"author": "j.martinez", "title": "Resource capacity planning — stopping project overallocation", "category": "process-improvement",
     "problematic": "PMs were committing team members to multiple projects simultaneously without visibility into existing allocations. We had 45 people allocated to 180% capacity on paper. Burnout was rising, delivery dates were slipping, and two senior consultants quit citing 'impossible workload'.",
     "solution": "1. Built a resource capacity model in Power BI connected to our Jira/Tempo time-tracking data\n2. Dashboard shows: each person's allocated vs. actual hours per project per week\n3. Hard rule: nobody can be allocated above 85% capacity (buffer for admin, sick days, training)\n4. Monthly resource committee: PMO + practice leads review the next 8-week demand forecast and rebalance\n5. 'Red flag' alerts when any person exceeds 90% for 2+ consecutive weeks\n\nResult: Average utilization stabilized at 78% (from chaotic 120%+ on paper). Delivery timeliness improved from 55% to 88%. Zero burnout-related departures in the following year.",
     "tags": ["resource-planning", "capacity-management", "power-bi", "pmo", "burnout-prevention"]},
    {"author": "a.leclerc", "title": "Handling a multi-country VAT audit — lessons from a €4.5M assessment", "category": "incident",
     "problematic": "French tax authorities initiated a VAT audit covering 3 fiscal years. They challenged our input VAT deduction on intercompany management fees (€4.5M at stake), arguing the services were insufficiently documented and the pricing was not at arm's length. The audit also flagged missing reverse-charge declarations on cross-border services.",
     "solution": "1. Assembled a war room: tax team + external counsel + transfer pricing specialist\n2. Prepared detailed service benefit documentation: time sheets, deliverables per entity, benchmarking of hourly rates\n3. For the reverse-charge issue: filed corrective declarations for all periods and paid the €85K late interest upfront (good faith gesture)\n4. Negotiated with the inspector: conceded on 2 minor points (€120K) to protect the core management fee deduction\n5. Documented everything for the group — created a 'VAT Audit Readiness Checklist' now used by all entities\n\nResult: Assessment reduced from €4.5M to €120K. Audit closed with no penalties. Checklist prevented similar findings in subsequent German and Dutch audits.",
     "tags": ["vat-audit", "tax-litigation", "cross-border", "documentation", "compliance"]},
    {"author": "p.moreau", "title": "Post-merger integration — harmonizing two chart of accounts in 90 days", "category": "lesson-learned",
     "problematic": "After acquiring a competitor, we had two incompatible charts of accounts: our group used a 6-digit IFRS-aligned structure; the target used a legacy 4-digit local GAAP chart with 800+ accounts (many dormant). Financial consolidation was impossible without manual mapping, which took 5 days per monthly close.",
     "solution": "1. Extracted both charts of accounts and built a mapping table: 800 target accounts → 240 group accounts\n2. Identified 350 dormant accounts in the target (zero balance for 2+ years) — deactivated immediately\n3. Created bridge accounts for 12 cases where 1-to-1 mapping was impossible (e.g., target bundled revenue and rebates)\n4. Tested the mapping on 6 months of historical data — reconciled to <0.1% variance\n5. Switched the target's ERP (Oracle) to the new chart on a single cutover weekend\n\nResult: First consolidated close with the acquired entity completed in 8 days (target was 5). Zero restatement issues. Auditors signed off on the transition without qualification.",
     "tags": ["post-merger", "chart-of-accounts", "ifrs", "consolidation", "erp-migration"]},
]

COMMENTS = [
    (0, "a.leclerc", "This is incredibly detailed. How long did the full TP review take across 14 agreements?"),
    (0, "n.fontaine", "About 4 months end-to-end, including the benchmarking update. The hardest part was getting buy-in from the Irish entity."),
    (0, "p.moreau", "We had a similar challenge with our Luxembourg structure. Would love to compare notes."),
    (1, "n.fontaine", "The Python script approach is elegant. Have you considered using dbt for the transformations?"),
    (1, "a.leclerc", "Not yet, but that's a great suggestion for the next iteration. Right now the script handles edge cases that dbt might struggle with."),
    (3, "t.girard", "The risk-based tiering is exactly what we need for our compliance testing. Can you share the scoring template?"),
    (3, "m.renard", "Happy to — I'll send it over. The key insight was getting external auditor buy-in before implementation."),
    (4, "m.renard", "Brilliant use of Benford's Law. This should be standard practice for all revenue audits."),
    (4, "l.bernard", "Did the subsidiary push back on the findings initially?"),
    (4, "s.nguyen", "Yes, initially. But once we showed the timeline visualization with the delivery gaps, it was undeniable."),
    (5, "c.dubois", "The EVM tracking was key — we adopted it for our smaller projects too after seeing the results here."),
    (7, "l.bernard", "The decision matrix was a game-changer for the IC. Clear, visual, and it eliminated the FX debate."),
    (8, "p.moreau", "This is exactly the kind of automation our team needs. How hard was the Bloomberg API integration?"),
    (8, "l.bernard", "Surprisingly straightforward — the Python Bloomberg API wrapper handles most of the complexity. Happy to walk you through the setup."),
    (9, "e.petit", "The tiered risk scoring approach mirrors what we did for operational risk. Great to see it applied to KYC."),
    (10, "t.girard", "The Monte Carlo layer adds real credibility. The board loves having a single quantified exposure number."),
    (12, "n.fontaine", "The war room approach is the right call for audits of this scale. We used the same strategy for our German tax audit."),
]

FOLLOWS = [
    ("a.leclerc", "n.fontaine"), ("m.renard", "n.fontaine"), ("s.nguyen", "m.renard"),
    ("j.martinez", "p.moreau"), ("c.dubois", "j.martinez"), ("l.bernard", "p.moreau"),
    ("t.girard", "n.fontaine"), ("e.petit", "t.girard"), ("p.moreau", "n.fontaine"),
    ("l.bernard", "a.leclerc"), ("n.fontaine", "p.moreau"), ("n.fontaine", "m.renard"),
    ("a.leclerc", "s.nguyen"), ("j.martinez", "c.dubois"), ("e.petit", "l.bernard"),
]

VOTES = [
    ("a.leclerc", 0, 1), ("m.renard", 0, 1), ("s.nguyen", 0, 1), ("j.martinez", 0, 1),
    ("p.moreau", 0, 1), ("l.bernard", 0, 1), ("t.girard", 0, 1), ("e.petit", 0, 1),
    ("n.fontaine", 1, 1), ("m.renard", 1, 1), ("j.martinez", 1, 1), ("c.dubois", 1, 1),
    ("t.girard", 1, 1), ("e.petit", 1, 1),
    ("a.leclerc", 2, 1), ("m.renard", 2, 1), ("s.nguyen", 2, 1), ("p.moreau", 2, 1),
    ("l.bernard", 2, 1), ("j.martinez", 2, 1), ("c.dubois", 2, 1),
    ("n.fontaine", 3, 1), ("s.nguyen", 3, 1), ("t.girard", 3, 1), ("e.petit", 3, 1), ("j.martinez", 3, 1),
    ("m.renard", 4, 1), ("n.fontaine", 4, 1), ("p.moreau", 4, 1), ("l.bernard", 4, 1),
    ("t.girard", 4, 1), ("e.petit", 4, 1), ("j.martinez", 4, 1),
    ("c.dubois", 5, 1), ("p.moreau", 5, 1), ("n.fontaine", 5, 1), ("m.renard", 5, 1),
    ("t.girard", 5, 1), ("l.bernard", 5, 1),
    ("j.martinez", 6, 1), ("l.bernard", 6, 1), ("e.petit", 6, 1), ("n.fontaine", 6, -1),
    ("l.bernard", 7, 1), ("n.fontaine", 7, 1), ("a.leclerc", 7, 1), ("m.renard", 7, 1),
    ("j.martinez", 7, 1), ("t.girard", 7, 1), ("s.nguyen", 7, 1),
    ("p.moreau", 8, 1), ("n.fontaine", 8, 1), ("a.leclerc", 8, 1), ("j.martinez", 8, 1),
    ("c.dubois", 8, 1), ("e.petit", 8, 1), ("m.renard", 8, 1), ("t.girard", 8, 1),
    ("e.petit", 9, 1), ("n.fontaine", 9, 1), ("m.renard", 9, 1), ("s.nguyen", 9, 1),
    ("j.martinez", 9, 1), ("a.leclerc", 9, 1),
    ("t.girard", 10, 1), ("m.renard", 10, 1), ("j.martinez", 10, 1), ("p.moreau", 10, 1), ("n.fontaine", 10, 1),
    ("c.dubois", 11, 1), ("p.moreau", 11, 1), ("l.bernard", 11, 1), ("t.girard", 11, 1),
    ("n.fontaine", 12, 1), ("m.renard", 12, 1), ("s.nguyen", 12, 1), ("t.girard", 12, 1),
    ("j.martinez", 12, 1), ("p.moreau", 12, 1), ("e.petit", 12, 1),
    ("l.bernard", 13, 1), ("n.fontaine", 13, 1), ("m.renard", 13, 1), ("a.leclerc", 13, 1),
    ("s.nguyen", 13, 1), ("j.martinez", 13, 1),
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        dept_map = {}
        for d in DEPARTMENTS:
            dept = Department(name=d["name"], description=d["description"])
            session.add(dept)
            await session.flush()
            dept_map[d["name"]] = dept.id

        skill_map = {}
        for s in SKILLS:
            skill = Skill(name=s)
            session.add(skill)
            await session.flush()
            skill_map[s] = skill.id

        user_map = {}
        for u in USERS:
            user = User(
                username=u["username"], email=u["email"],
                password_hash=hash_password("password"),
                full_name=u["full_name"], position=u["position"],
                department_id=dept_map[u["dept"]],
                is_admin=u.get("admin", False),
                bio=f'{u["full_name"]} — {u["position"]} at the {u["dept"]} department.',
            )
            session.add(user)
            await session.flush()
            user_map[u["username"]] = user.id
            for sk in u["skills"]:
                session.add(UserSkill(user_id=user.id, skill_id=skill_map[sk]))

        tag_map = {}
        for rex_data in REX_SHEETS:
            for t in rex_data["tags"]:
                if t not in tag_map:
                    tag = Tag(name=t)
                    session.add(tag)
                    await session.flush()
                    tag_map[t] = tag.id

        rex_id_map = {}
        for i, rex_data in enumerate(REX_SHEETS):
            rex = RexSheet(
                author_id=user_map[rex_data["author"]],
                title=rex_data["title"],
                problematic=rex_data["problematic"],
                solution=rex_data["solution"],
                category=rex_data.get("category", "lesson-learned"),
                status="published",
            )
            session.add(rex)
            await session.flush()
            rex_id_map[i] = rex.id
            for t in rex_data["tags"]:
                session.add(RexTag(rex_id=rex.id, tag_id=tag_map[t]))

        for voter_username, rex_idx, value in VOTES:
            session.add(Vote(
                user_id=user_map[voter_username],
                rex_id=rex_id_map[rex_idx],
                value=value,
            ))

        for rex_idx, author_username, text in COMMENTS:
            is_q = text.strip().endswith("?")
            session.add(Comment(
                rex_id=rex_id_map[rex_idx],
                author_id=user_map[author_username],
                text=text,
                is_question=is_q,
            ))

        for follower, followed in FOLLOWS:
            session.add(Follow(
                follower_id=user_map[follower],
                followed_id=user_map[followed],
            ))

        import random
        for rex_idx in range(len(REX_SHEETS)):
            viewers = random.sample(list(user_map.keys()), k=random.randint(3, 8))
            for v in viewers:
                session.add(RexView(
                    rex_id=rex_id_map[rex_idx],
                    user_id=user_map[v],
                ))

        session.add(Bookmark(user_id=user_map["a.leclerc"], rex_id=rex_id_map[0]))
        session.add(Bookmark(user_id=user_map["m.renard"], rex_id=rex_id_map[4]))
        session.add(Bookmark(user_id=user_map["j.martinez"], rex_id=rex_id_map[7]))
        session.add(Bookmark(user_id=user_map["p.moreau"], rex_id=rex_id_map[8]))
        session.add(Bookmark(user_id=user_map["t.girard"], rex_id=rex_id_map[1]))
        session.add(Bookmark(user_id=user_map["l.bernard"], rex_id=rex_id_map[5]))
        session.add(Bookmark(user_id=user_map["e.petit"], rex_id=rex_id_map[3]))
        session.add(Bookmark(user_id=user_map["n.fontaine"], rex_id=rex_id_map[9]))
        session.add(Bookmark(user_id=user_map["s.nguyen"], rex_id=rex_id_map[12]))
        session.add(Bookmark(user_id=user_map["c.dubois"], rex_id=rex_id_map[11]))

        await session.commit()

    print("Seeded Knowledia (Finance/Tax/PMO) with:")
    print(f"  {len(DEPARTMENTS)} departments")
    print(f"  {len(SKILLS)} skills")
    print(f"  {len(USERS)} employees (1 admin: n.fontaine)")
    print(f"  {len(REX_SHEETS)} REX sheets with categories")
    print(f"  {len(VOTES)} votes")
    print(f"  {len(COMMENTS)} comments")
    print(f"  {len(FOLLOWS)} follows")
    print(f"  Random views seeded for all REX sheets")
    print(f"\nLogin: email=n.fontaine@company.com  password=password")


if __name__ == "__main__":
    asyncio.run(seed())
