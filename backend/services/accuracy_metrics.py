"""
Agreement metrics between MockAI's automated scores and a human reference
(candidate self-ratings from the survey, or expert ratings loaded by
evaluate_accuracy.py) - Objective 7 "accuracy testing".

Pure Python (no numpy/scipy dependency) so it runs anywhere the backend runs.
"""
import math
from typing import Dict, List, Optional, Sequence


def _mean(xs: Sequence[float]) -> float:
    return sum(xs) / len(xs)


def pearson(xs: Sequence[float], ys: Sequence[float]) -> Optional[float]:
    if len(xs) < 3:
        return None
    mx, my = _mean(xs), _mean(ys)
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    vx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    vy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if vx == 0 or vy == 0:
        return None
    return cov / (vx * vy)


def _ranks(xs: Sequence[float]) -> List[float]:
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        avg_rank = (i + j) / 2.0 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = avg_rank
        i = j + 1
    return ranks


def spearman(xs: Sequence[float], ys: Sequence[float]) -> Optional[float]:
    if len(xs) < 3:
        return None
    return pearson(_ranks(xs), _ranks(ys))


def agreement_report(system: Sequence[float], reference: Sequence[float], tolerance: float = 10.0) -> Dict:
    """
    system / reference: paired 0-100 scores.
    Returns sample size, Pearson r, Spearman rho, mean absolute error, mean
    bias (system - reference) and the share of pairs within `tolerance` points.
    """
    pairs = [(float(s), float(r)) for s, r in zip(system, reference) if s is not None and r is not None]
    n = len(pairs)
    if n == 0:
        return {"n": 0, "pearson_r": None, "spearman_rho": None, "mae": None, "bias": None, "within_tolerance_pct": None, "tolerance": tolerance}
    xs = [p[0] for p in pairs]
    ys = [p[1] for p in pairs]
    diffs = [x - y for x, y in pairs]
    r = pearson(xs, ys)
    rho = spearman(xs, ys)
    return {
        "n": n,
        "pearson_r": round(r, 3) if r is not None else None,
        "spearman_rho": round(rho, 3) if rho is not None else None,
        "mae": round(_mean([abs(d) for d in diffs]), 1),
        "bias": round(_mean(diffs), 1),
        "within_tolerance_pct": round(sum(1 for d in diffs if abs(d) <= tolerance) / n * 100.0, 1),
        "tolerance": tolerance,
    }
