from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import math
import numpy as np

app = FastAPI()

# =================================================================
# 🧠 SCHEMA DEFINITIONS (Minified Check)
# =================================================================

class WorkerData(BaseModel):
    id: str  # WorkerProfile ID
    userId: str # User ID
    name: str # User Name
    city: str
    isVerified: bool = False
    preferredShift: Optional[str] = None
    roleName: str
    expectedSalary: float = 0
    experienceInRole: float = 0
    skills: List[str] = []
    licenses: List[str] = []

class JobData(BaseModel):
    id: str
    title: str
    location: str
    maxSalary: float
    requirements: List[str] = []
    shift: str = 'Flexible'
    mandatoryLicenses: List[str] = []

class MatchRequest(BaseModel):
    job: JobData
    workers: List[WorkerData]

class MatchResult(BaseModel):
    workerId: str
    userId: str
    matchScore: int
    tier: str
    labels: List[str]
    breakdown: Optional[dict] = None

# =================================================================
# 🧠 MATCHING LOGIC v7.0 (Ported from Node.js)
# =================================================================

CONFIG = {
    'W_SALARY': 0.40,
    'W_SKILLS': 0.33,
    'W_EXPERIENCE': 0.27,
    'SALARY_ACCEPTABLE_SHORTFALL': 0.15,
    'EXPERIENCE_ACCEPTABLE_SHORTFALL': 0.35,
    'SKILLS_ACCEPTABLE_MATCH': 0.50,
    'SALARY_SHARPNESS': 12,
    'EXPERIENCE_SHARPNESS': 6,
    'SKILLS_SHARPNESS': 6,
    'FLOOR_THRESHOLD': 0.40,
    'FLOOR_PENALTY': 0.50,
    'DISPLAY_THRESHOLD': 0.62,
    'SOFT_BONUS_MAX': 0.20
}

STOP_WORDS = {"senior", "junior", "lead", "manager", "specialist", "expert", "consultant", "developer", "engineer", "officer", "executive", "assistant", "associate", "intern", "trainee", "staff", "member"}

def get_tokens(text: str) -> set:
    if not text:
        return set()
    # Filter out stop words to focus on the core role (e.g. "Cook", "Driver", "React")
    tokens = {t for t in text.lower().split() if len(t) > 2 and t not in STOP_WORDS}
    return tokens

def check_hard_gates(job: JobData, worker: WorkerData) -> bool:
    # 1. Shift Gate
    if job.shift and job.shift != 'Flexible' and worker.preferredShift and worker.preferredShift != 'Flexible':
        if job.shift != worker.preferredShift:
            return False

    # 2. Salary Ceiling Gate (Worker Expectation > Job Max + 15%)
    if job.maxSalary > 0 and worker.expectedSalary > 0:
        if worker.expectedSalary > (job.maxSalary * 1.15):
            return False

    # 3. Mandatory Licenses
    if job.mandatoryLicenses:
        worker_licenses = [l.lower() for l in worker.licenses]
        for req in job.mandatoryLicenses:
            req_lower = req.lower()
            if not any(req_lower in wl for wl in worker_licenses):
                return False

    # 4. Location Gate (String Match)
    if job.location and worker.city:
        if job.location.lower().strip() != worker.city.lower().strip():
            return False

    return True

def calculate_salary_score(seeker_exp_sal, job_max_sal):
    if seeker_exp_sal <= 0 or job_max_sal <= 0:
        return 1.0
    
    if job_max_sal >= seeker_exp_sal:
        excess_ratio = (job_max_sal / seeker_exp_sal) - 1.0
        return 0.95 + 0.05 * (1 - math.exp(-2 * excess_ratio))
    else:
        shortfall = (seeker_exp_sal - job_max_sal) / seeker_exp_sal
        x = CONFIG['SALARY_SHARPNESS'] * (CONFIG['SALARY_ACCEPTABLE_SHORTFALL'] - shortfall)
        return 1 / (1 + math.exp(-x))

def calculate_experience_score(seeker_exp, required_exp):
    s_exp = float(seeker_exp)
    r_exp = float(required_exp)

    if s_exp >= r_exp:
        excess_ratio = (s_exp / max(r_exp, 1)) - 1.0
        if excess_ratio > 2.0: return 0.85 # Overqualified
        return min(1.0, 0.95 + 0.05 * excess_ratio)
    else:
        if r_exp == 0: return 1.0
        shortfall = (r_exp - s_exp) / r_exp
        x = CONFIG['EXPERIENCE_SHARPNESS'] * (CONFIG['EXPERIENCE_ACCEPTABLE_SHORTFALL'] - shortfall)
        return 1 / (1 + math.exp(-x))

from fuzzywuzzy import fuzz

def calculate_skills_score(seeker_skills: List[str], required_skills: List[str]):
    if not required_skills:
        return 1.0
    
    if not seeker_skills:
        return 0.0 # No skills to match against reqs

    matched_count = 0
    # Clean lists once
    s_list = [s.lower().strip() for s in seeker_skills]
    r_list = [r.lower().strip() for r in required_skills]

    for req in r_list:
        # Check if ANY seeker skill matches this requirement reasonably well
        # We use partial_ratio so "Dosa" matches "Dosa Preparation" (score 100)
        # We also check max score across all seeker skills for this one requirement
        best_match_score = 0
        for skill in s_list:
            score = fuzz.partial_ratio(skill, req)
            if score > best_match_score:
                best_match_score = score
        
        # If the best match is good enough, we count this requirement as met
        if best_match_score >= 80:
            matched_count += 1
    
    match_rate = matched_count / len(r_list)
    
    x = CONFIG['SKILLS_SHARPNESS'] * (match_rate - CONFIG['SKILLS_ACCEPTABLE_MATCH'])
    return 1 / (1 + math.exp(-x))

def calculate_soft_bonus(job: JobData, worker: WorkerData):
    bonus = 0.0
    if worker.isVerified:
        bonus += 0.02
    
    if job.shift and worker.preferredShift and job.shift == worker.preferredShift:
        bonus += 0.04
        
    return min(bonus, CONFIG['SOFT_BONUS_MAX'])

def extract_exp_from_reqs(requirements: List[str]) -> float:
    import re
    text = " ".join(requirements)
    match = re.search(r'(\d+)\s+years?', text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return 0.0

# =================================================================
# 🚀 ENDPOINTS
# =================================================================

@app.get("/")
def read_root():
    return {"status": "Python Logic Engine Operational", "version": "v7.0"}

@app.post("/calculate-matches", response_model=List[MatchResult])
def calculate_matches(payload: MatchRequest):
    results = []
    job = payload.job
    
    # Pre-calc job tokens for speed
    job_tokens = get_tokens(job.title)
    job_req_exp = extract_exp_from_reqs(job.requirements)
    
    print(f"Items to process: {len(payload.workers)}")

    for worker in payload.workers:
        # 0. Role Token Match (Softened)
        job_tokens = get_tokens(job.title)
        role_tokens = get_tokens(worker.roleName)
        
        # A. Strict Overlap
        has_match = bool(job_tokens.intersection(role_tokens))
        
        # B. Fuzzy / Soft Overlap if strict fails
        if not has_match:
            # Check if any job token is contained in any role token or vice versa (e.g. "cook" in "cooking")
            for jt in job_tokens:
                for rt in role_tokens:
                    if jt in rt or rt in jt:
                        has_match = True
                        break
                    # Fuzzy fallback
                    if fuzz.ratio(jt, rt) > 80:
                        has_match = True
                        break
                if has_match: break
        
        if not has_match:
            # print(f"❌ REJECT {worker.name}: Role Token Mismatch '{job.title}' vs '{worker.roleName}'")
            # Commented out verbose log to reduce noise, enable if debugging specific issue
            continue
            
        # 1. Hard Gates
        if not check_hard_gates(job, worker):
            continue
            
        # 2. Scores
        sal_score = calculate_salary_score(worker.expectedSalary, job.maxSalary)
        exp_score = calculate_experience_score(worker.experienceInRole, job_req_exp)
        skill_score = calculate_skills_score(worker.skills, job.requirements)
        
        # 3. Geometric Mean
        EPSILON = 1e-6
        log_geo = (
            CONFIG['W_SALARY'] * math.log(max(sal_score, EPSILON)) +
            CONFIG['W_SKILLS'] * math.log(max(skill_score, EPSILON)) +
            CONFIG['W_EXPERIENCE'] * math.log(max(exp_score, EPSILON))
        )
        geom_mean = math.exp(log_geo)
        
        # Floor Rule
        worst_metric = min(sal_score, skill_score, exp_score)
        if worst_metric < CONFIG['FLOOR_THRESHOLD']:
            print(f"❌ REJECT {worker.name}: Floor Breach. Worst: {worst_metric:.2f} < {CONFIG['FLOOR_THRESHOLD']} (Sal:{sal_score:.2f}, Exp:{exp_score:.2f}, Skl:{skill_score:.2f})")
            geom_mean = worst_metric * CONFIG['FLOOR_PENALTY']
            
        # 4. Final Calc
        bonus = calculate_soft_bonus(job, worker)
        quality = 1.0 # Placeholder for future logic
        
        final_score = (geom_mean + bonus) * quality
        final_score = max(0.0, min(final_score, 1.0))

        print(f"ℹ️ {worker.name} Final Score: {final_score:.2f}")
        
        if final_score >= CONFIG['DISPLAY_THRESHOLD']:
            # Create Labels
            labels = [worker.roleName]
            if skill_score > 0.8:
                labels.append(f"{int(skill_score*100)}% Skill Match")
            if final_score >= 0.85:
                labels.append("Highly Recommended")
            
            tier = "Possible Match"
            if final_score >= 0.85: tier = "Strong Match"
            elif final_score >= 0.75: tier = "Good Match"
            
            results.append(MatchResult(
                workerId=worker.id,
                userId=worker.userId,
                matchScore=int(final_score * 100),
                tier=tier,
                labels=labels,
                breakdown={
                    "salary": round(sal_score, 2),
                    "experience": round(exp_score, 2),
                    "skills": round(skill_score, 2)
                }
            ))
            
    # Sort by score descending
    results.sort(key=lambda x: x.matchScore, reverse=True)
    return results[:50] # Return top 50
