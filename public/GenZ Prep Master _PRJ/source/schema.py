"""Schema helpers for GenZ Interview Prep question banks.

Q(...)  one question: level B/I/A, question, answer, explanation and optional metadata.
        play : whether to show "Run in playground" button
        lang : "java" (default), "bash" or "text"
        category : "coding" | "technical" | "behavioural" | "programming"
        complexity : e.g. "Time: O(N) | Space: O(N)"
        star : optional dict for STAR method in behavioural questions
S(...)  one section / interview track
C(...)  one "predict the output" challenge.
"""
from textwrap import dedent


def _code(code):
    return dedent(code).strip("\n") if code else None


def Q(level, q, a, e, code=None, play=True, lang="java", category="technical", complexity=None, star=None, tags=None):
    assert level in "BIA", level
    return {
        "level": level,
        "q": q,
        "a": a,
        "e": e,
        "code": _code(code),
        "play": play and lang == "java" and code is not None,
        "lang": lang,
        "category": category,
        "complexity": complexity,
        "star": star,
        "tags": tags or []
    }


def S(title, icon, ref, questions, desc=""):
    return {
        "title": title,
        "icon": icon,
        "ref": ref,
        "desc": desc,
        "questions": questions
    }


def C(sid, level, title, code, options, answer, explanation):
    assert level in "BIA" and len(options) == 4
    return {
        "sid": sid,
        "level": level,
        "title": title,
        "code": _code(code),
        "options": options,
        "answer": answer,
        "explanation": explanation
    }
