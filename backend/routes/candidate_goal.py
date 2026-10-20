"""
Interview goal interpretation for the chatbot - FR 07 / Use Case 4
("The user enters the desired interview category through chatbot
interaction. The system interprets the input and selects relevant
interview questions") and Objective 2.

The candidate types a free-text goal ("I'm applying for a junior nurse
job", "help me with React interviews", "HR round for a bank"). It is
encoded with the same BERT-family sentence encoder used for answer scoring
(DistilBERT in the report AI profile) and compared against a profile of
every active category: its name, description and a few of its questions.
The closest categories are returned with similarity scores, and the
interview type (technical / behavioral / situational) is inferred the same
way. Nothing here is generated text - the chatbot only ever picks from the
real Question Bank.

Mounted at prefix /candidate in main.py.
"""
import re
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import categories_collection, questions_collection
from middleware.candidate_auth import verify_candidate
from services.nlp_analyzer import BertSemanticAnalyzer, _calibrate, nlp_model_label

router = APIRouter()

# Calibrated-similarity thresholds (MiniLM scale, see nlp_analyzer.py)
MATCH_THRESHOLD = 0.30     # below this the goal is treated as unrecognised
AMBIGUITY_MARGIN = 0.04    # top-2 closer than this -> ask the candidate to pick

INTERVIEW_TYPE_PROFILES = {
    "technical": "technical domain knowledge interview: tools, methods, concepts, problem solving, practical skills of the profession",
    "behavioral": "HR and behavioral interview: teamwork, communication, leadership, ethics, tell me about a time, strengths and weaknesses",
    "situational": "situational interview: what would you do if, handling a difficult scenario, decision making under pressure",
}
TYPE_KEYWORDS = {
    "behavioral": r"\b(hr|human resource round|behaviou?ral|soft skills?|leadership|teamwork|personality)\b",
    "situational": r"\b(situational|scenario|what would you do|case study|hypothetical)\b",
    "technical": r"\b(technical|coding|domain|skills? test)\b",
}

_profile_cache: Dict[str, object] = {"key": None, "at": 0.0, "profiles": [], "embeddings": None}


class GoalRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=300)


def _category_profiles() -> List[Dict]:
    cats = list(categories_collection.find({"status": "active"}))
    key = tuple(sorted((str(c["_id"]), c.get("name", ""), c.get("updated_at") and str(c.get("updated_at"))) for c in cats))
    if _profile_cache["key"] == key and time.time() - float(_profile_cache["at"]) < 300:
        return _profile_cache["profiles"]  # type: ignore[return-value]

    # One query for all active questions, grouped here (one round trip
    # instead of one per category).
    by_category: Dict[str, List[str]] = {}
    for q in questions_collection.find({"status": "active"}, {"category_id": 1, "question_text": 1}):
        bucket = by_category.setdefault(str(q.get("category_id")), [])
        if len(bucket) < 4:
            bucket.append(q.get("question_text", ""))

    profiles = []
    for c in cats:
        sample_qs = by_category.get(str(c["_id"]), [])
        profiles.append({
            "id": str(c["_id"]),
            "name": c.get("name", ""),
            "description": c.get("description", ""),
            "profile_text": f"{c.get('name', '')}. {c.get('description', '')} " + " ".join(sample_qs),
        })
    _profile_cache.update({"key": key, "at": time.time(), "profiles": profiles, "embeddings": None})
    return profiles


def _profile_similarities(text: str, profiles: List[Dict], analyzer: BertSemanticAnalyzer) -> List[float]:
    """Cosine similarity of the goal to each category profile. Profile
    embeddings are computed once per cache refresh, so each request only
    encodes the candidate's own sentence."""
    import torch
    from sentence_transformers import util

    model = analyzer.get_model()
    with torch.inference_mode():
        if _profile_cache.get("embeddings") is None or _profile_cache.get("profiles") is not profiles:
            _profile_cache["embeddings"] = model.encode(
                [p["profile_text"] for p in profiles], convert_to_tensor=True, show_progress_bar=False
            )
        query = model.encode([text], convert_to_tensor=True, show_progress_bar=False)
        sims = util.cos_sim(query, _profile_cache["embeddings"])[0]
    return [_calibrate(float(v), analyzer._model_name) for v in sims]


def _infer_type(text: str, best_category: Optional[Dict], analyzer: BertSemanticAnalyzer) -> str:
    lower = text.lower()
    for type_id, pattern in TYPE_KEYWORDS.items():
        if re.search(pattern, lower):
            return type_id
    if best_category and re.search(r"behav|leadership", best_category["name"], re.I):
        return "behavioral"
    sims = analyzer.compute_similarities_batch(text, list(INTERVIEW_TYPE_PROFILES.values()))
    types = list(INTERVIEW_TYPE_PROFILES.keys())
    best = max(range(len(types)), key=lambda i: sims[i])
    # Only override the default when the signal is clear.
    return types[best] if sims[best] - sorted(sims)[-2] > 0.05 else "technical"


@router.post("/goal/interpret")
def interpret_goal(data: GoalRequest, token_payload: dict = Depends(verify_candidate)):
    text = data.text.strip()
    profiles = _category_profiles()
    if not profiles:
        raise HTTPException(status_code=404, detail="No active interview categories are available.")

    # Exact / contained name matches need no model.
    lower = text.lower()
    exact = next((p for p in profiles if p["name"].lower() == lower), None)

    analyzer = BertSemanticAnalyzer()
    if analyzer.get_model() is None:
        raise HTTPException(status_code=503, detail="Goal interpretation model is unavailable.")

    sims = _profile_similarities(text, profiles, analyzer)
    ranked = sorted(
        ({"id": p["id"], "name": p["name"], "description": p["description"], "score": round(s, 3)} for p, s in zip(profiles, sims)),
        key=lambda m: m["score"],
        reverse=True,
    )
    if exact:
        ranked = [m for m in ranked if m["id"] == exact["id"]] + [m for m in ranked if m["id"] != exact["id"]]

    top = ranked[0]
    recognised = bool(exact) or top["score"] >= MATCH_THRESHOLD
    ambiguous = (
        not exact
        and recognised
        and len(ranked) > 1
        and top["score"] - ranked[1]["score"] < AMBIGUITY_MARGIN
    )
    best = top if recognised and not ambiguous else None

    return {
        "query": text,
        "status": "matched" if best else ("ambiguous" if ambiguous else "unrecognised"),
        "best": best,
        "suggestions": ranked[:3],
        "interview_type": _infer_type(text, best or (top if recognised else None), analyzer),
        "method": f"semantic-match:{nlp_model_label()}",
    }
