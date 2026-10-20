"""Tiny helpers the content files use to describe the question bank.

Q(...)  one question: level B/I/A, question, answer, explanation and an optional code example.
        SQL examples run against a fresh copy of the MegaMart sample database while generating,
        and the real result is stored with the question.
        run=False  : don't execute it (e.g. PostgreSQL/Snowflake-only syntax SQLite doesn't have)
        play=False : no "Run in playground" button
        lang       : "sql" (default), "python", "bash" or "text"
        error=True : the example is *meant* to fail (e.g. a constraint violation); its error is shown
C(...)  one "predict the result" puzzle. The correct option is produced by actually running the
        query, so answers can never be wrong; `wrong` holds three plausible distractors.
"""
from textwrap import dedent


def _code(code):
    return dedent(code).strip("\n") if code else None


def Q(level, q, a, e, code=None, run=True, play=True, lang="sql", error=False):
    assert level in "BIA", level
    runnable = lang == "sql" and code is not None
    return {"level": level, "q": q, "a": a, "e": e, "code": _code(code),
            "run": run and runnable, "play": play and runnable, "lang": lang, "error": error}


def S(title, icon, ref, questions):
    return {"title": title, "icon": icon, "ref": ref, "questions": questions}


def C(sid, level, code, e, wrong):
    assert level in "BIA" and len(wrong) == 3
    return {"sid": sid, "level": level, "code": _code(code), "e": e, "wrong": wrong}
