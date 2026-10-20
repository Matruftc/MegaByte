"""Tiny helpers the content files use to describe the Java question bank.

Q(...)  one question: level B/I/A, question, answer, explanation and an optional code example.
        play : whether to show "Run in playground" button
        lang : "java" (default), "bash" or "text"
S(...)  one section / curriculum module
C(...)  one "predict the output" challenge.
"""
from textwrap import dedent


def _code(code):
    return dedent(code).strip("\n") if code else None


def Q(level, q, a, e, code=None, play=True, lang="java"):
    assert level in "BIA", level
    return {
        "level": level,
        "q": q,
        "a": a,
        "e": e,
        "code": _code(code),
        "play": play and lang == "java",
        "lang": lang
    }


def S(title, icon, ref, questions):
    return {
        "title": title,
        "icon": icon,
        "ref": ref,
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
