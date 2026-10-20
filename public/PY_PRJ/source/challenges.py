"""'Predict the output' challenges and playground starter snippets.

For every challenge the generator runs the code and uses its real output as the correct option,
so only the three distractors here are hand-written.
"""
from schema import C

CHALLENGES = [
    C(2, "B", 'a = [1, 2, 3]\nb = a\nb += [4]\nprint(a)',
      "`b = a` makes both names point at the same list, and `+=` on a list extends it in place, so `a` sees the change.",
      ["[1, 2, 3]", "[1, 2, 3, [4]]", "TypeError"]),
    C(2, "B", 'print(0.1 + 0.2 == 0.3)',
      "0.1 and 0.2 can't be represented exactly in binary floating point, so their sum is 0.30000000000000004.",
      ["True", "0.3", "TypeError"]),
    C(3, "B", 's = "python"\nprint(s[1:4], s[-2:])',
      "Slices include the start and exclude the stop: `s[1:4]` is indexes 1, 2, 3 → \"yth\". `s[-2:]` is the last two characters.",
      ["pyt on", "ytho on", "yth n"]),
    C(2, "I", 'print(type(True + True).__name__, True + True)',
      "`bool` is a subclass of `int` (True == 1), so adding two booleans gives the integer 2.",
      ["bool True", "bool 2", "TypeError"]),
    C(7, "A", 'def f(x, acc=[]):\n    acc.append(x)\n    return acc\n\nf(1)\nprint(f(2))',
      "The default list is created once, when the function is defined, and is shared between calls.",
      ["[2]", "[1]", "None"]),
    C(14, "A", 'fns = [lambda: i for i in range(3)]\nprint([f() for f in fns])',
      "Late binding: each lambda looks up `i` when it's called, and by then the loop has finished with i = 2.",
      ["[0, 1, 2]", "[0, 0, 0]", "[3, 3, 3]"]),
    C(4, "A", 'grid = [[0] * 2] * 2\ngrid[0][0] = 1\nprint(grid)',
      "`* 2` on the outer list repeats a reference to the same inner list, so both rows change.",
      ["[[1, 0], [0, 0]]", "[[1, 1], [0, 0]]", "[[0, 0], [0, 0]]"]),
    C(6, "I", 'print(0 or [] or "x" or 5)',
      "`or` returns the first truthy operand: 0 and [] are falsy, so the result is \"x\" (and 5 is never evaluated).",
      ["5", "[]", "True"]),
    C(6, "I", 'for i in range(3):\n    pass\nelse:\n    print("done", i)',
      "The loop finishes without `break`, so `else` runs. The loop variable keeps its last value, 2.",
      ["done 3", "NameError", "done 0"]),
    C(9, "I", 'print(round(2.5), round(3.5), round(-0.5))',
      "Python uses banker's rounding: halves go to the nearest even number (2, 4 and 0).",
      ["3 4 -1", "3 4 0", "2 3 0"]),
    C(5, "A", 'd = {True: "a", 1: "b", 1.0: "c"}\nprint(d)',
      "True, 1 and 1.0 are equal and have the same hash, so they are the same key. The first key object is kept and the last value wins.",
      ["{True: 'a', 1: 'b', 1.0: 'c'}", "{1: 'c'}", "{True: 'a'}"]),
    C(8, "I", 'g = (x * 2 for x in range(3))\nprint(sum(g), sum(g))',
      "A generator can be consumed only once. The first `sum` gets 0 + 2 + 4 = 6; the second finds it empty.",
      ["6 6", "0 6", "TypeError"]),
    C(3, "B", 'print("a,b,,c".split(","))',
      "With an explicit separator, consecutive separators produce an empty string between them.",
      ["['a', 'b', 'c']", "['a', 'b', ',', 'c']", "['a,b,,c']"]),
    C(4, "I", 't = (1, [2, 3])\nt[1].append(4)\nprint(t)',
      "The tuple can't be changed, but the list inside it can. The tuple still holds the same list object, which now has 3 items.",
      ["TypeError", "(1, [2, 3])", "(1, [4])"]),
    C(10, "A", 'class A:\n    items = []\n    def add(self, x):\n        self.items.append(x)\n\na, b = A(), A()\na.add(1)\nprint(b.items)',
      "`items` is a class attribute shared by every instance, so appending through `a` affects `b` too.",
      ["[]", "None", "AttributeError"]),
    C(10, "A", 'class A:\n    def who(self): return "A"\nclass B(A):\n    def who(self): return "B"\nclass C(A):\n    def who(self): return "C"\nclass D(B, C):\n    pass\n\nprint(D().who())',
      "The MRO of D is D → B → C → A, so `B.who` is found first.",
      ["C", "A", "TypeError"]),
    C(11, "I", 'def f():\n    try:\n        return "try"\n    finally:\n        print("finally", end=" ")\n\nprint(f())',
      "`finally` runs before the function actually returns, so its print appears before the returned value is printed.",
      ["try", "try finally", "finally"]),
    C(2, "B", 'print([] == [], [] is [])',
      "Two empty lists have equal values but are two different objects.",
      ["True True", "False False", "False True"]),
    C(8, "B", 'print(list(zip([1, 2, 3], "ab")))',
      "`zip` stops at the shortest iterable, so the 3 has no partner and is dropped.",
      ["[(1, 'a'), (2, 'b'), (3, None)]", "[(1, 'a'), (2, 'b'), (3, '')]", "ValueError"]),
    C(6, "B", 'x = 5\nprint(1 < x < 10, 10 > x > 7)',
      "Chained comparisons mean `1 < x and x < 10` (True) and `10 > x and x > 7` (False).",
      ["True True", "False False", "SyntaxError"]),
    C(3, "B", 'print("Py" * 3 + "!")',
      "Multiplying a string repeats it; `*` binds tighter than `+`.",
      ["Py3!", "PyPyPy", "TypeError"]),
    C(7, "I", 'def f(*args, **kw):\n    print(len(args), sorted(kw))\n\nf(1, 2, a=3, b=4)',
      "Positional arguments go into the `args` tuple and keyword arguments into the `kw` dict. `sorted` of a dict gives its keys.",
      ["4 []", "2 [3, 4]", "2 {'a': 3, 'b': 4}"]),
    C(5, "B", 's = {1, 2, 3}\ns.add(2)\ns.add(4)\nprint(len(s))',
      "Sets ignore duplicates: adding 2 again changes nothing, while 4 is new.",
      ["5", "3", "TypeError"]),
    C(8, "B", 'nums = [1, 2, 3, 4]\nprint([n * n for n in nums if n % 2])',
      "`n % 2` is 1 (truthy) for odd numbers, so only 1 and 3 are kept and squared.",
      ["[4, 16]", "[1, 4, 9, 16]", "[2, 4]"]),
    C(9, "I", 'print(sorted(["b", "A", "c", "B"]))',
      "Strings sort by code point, and every uppercase letter comes before every lowercase letter.",
      ["['A', 'b', 'B', 'c']", "['A', 'B', 'c', 'b']", "['b', 'c', 'A', 'B']"]),
    C(14, "A", 'def a(fn):\n    def w(): return "a(" + fn() + ")"\n    return w\n\ndef b(fn):\n    def w(): return "b(" + fn() + ")"\n    return w\n\n@a\n@b\ndef f(): return "f"\n\nprint(f())',
      "Decorators apply bottom-up, `f = a(b(f))`, so a's wrapper is outermost.",
      ["b(a(f))", "a(f)", "f"]),
    C(6, "A", 'nums = [1, 2, 2, 3]\nfor n in nums:\n    if n == 2:\n        nums.remove(n)\nprint(nums)',
      "Removing the first 2 shifts the list left, so the loop skips the second 2.",
      ["[1, 3]", "[1, 2, 2, 3]", "RuntimeError"]),
    C(4, "I", 'a = [3, 1, 2]\nprint(a.sort(), a)',
      "`list.sort()` sorts in place and returns `None`. By the time `a` is printed, it's sorted.",
      ["[1, 2, 3] [1, 2, 3]", "None [3, 1, 2]", "[1, 2, 3] [3, 1, 2]"]),
    C(2, "A", 'print(7 // -2, 7 % -2)',
      "Floor division rounds toward negative infinity (-3.5 → -4), and `%` takes the sign of the divisor.",
      ["-3 1", "-3 -1", "-4 1"]),
    C(7, "A", 'x = 10\ndef f():\n    print(x)\n    x = 5\n\ntry:\n    f()\nexcept Exception as err:\n    print(type(err).__name__)',
      "Because `x` is assigned inside `f`, it's local for the *whole* function, so reading it before the assignment fails.",
      ["10", "5", "NameError"]),
    C(5, "A", 'd = {"a": 1}\nprint(d.get("b", d.setdefault("b", 2)), d)',
      "Arguments are evaluated first: `setdefault` inserts b: 2 and returns 2, and then `get` finds \"b\".",
      ["None {'a': 1}", "2 {'a': 1}", "None {'a': 1, 'b': 2}"]),
    C(3, "I", 'print(len("héllo"), len("héllo".encode("utf-8")))',
      "`len` of a str counts characters (5). In UTF-8, \"é\" takes 2 bytes, so the bytes version has 6.",
      ["5 5", "6 6", "5 10"]),
    C(8, "A", 'it = iter([1, 2, 3])\nprint(list(zip(it, it)))',
      "Both arguments are the same iterator, so zip pulls 1 and 2 for the first pair, then finds only 3 and stops.",
      ["[(1, 1), (2, 2), (3, 3)]", "[(1, 2), (3, None)]", "[(1, 2), (2, 3)]"]),
    C(10, "I", 'from dataclasses import dataclass\n\n@dataclass\nclass P:\n    x: int\n\nprint(P(1) == P(1), P(1) is P(1))',
      "`@dataclass` generates `__eq__` that compares fields, but the two calls still create different objects.",
      ["False False", "True True", "False True"]),
    C(11, "B", 'try:\n    int("3.0")\nexcept ValueError:\n    print("bad")\nelse:\n    print("ok")',
      "`int()` only parses integer text; \"3.0\" raises `ValueError`. (`int(float(\"3.0\"))` would work.)",
      ["ok", "3", "bad ok"]),
    C(4, "I", 'a = [1, 2, 3]\nprint(a[5:], a[-10:2])',
      "Slices never raise IndexError; out-of-range bounds are clipped to the list.",
      ["IndexError", "None [1, 2]", "[] [3]"]),
    C(9, "I", 'print(any([]), all([]))',
      "For an empty iterable, `any` needs one truthy item (there are none) and `all` has no falsy item to fail on.",
      ["False False", "True True", "True False"]),
    C(2, "B", 'print(bool("False"), bool(0.0), bool([0]))',
      "Any non-empty string is truthy, including \"False\"; 0.0 is falsy; a list containing 0 is non-empty, so it's truthy.",
      ["False False True", "False False False", "True False False"]),
    C(3, "I", "print(f\"{3.14159:.2f}|{42:05d}|{'x':>3}|\")",
      "`.2f` gives 2 decimals, `05d` zero-pads to width 5, and `>3` right-aligns in 3 characters.",
      ["3.14|42|x|", "3.14|00042|x  |", "3.1|00042|  x|"]),
    C(8, "A", 'def gen():\n    yield 1\n    return 2\n\nprint(list(gen()))',
      "A generator's `return` value becomes `StopIteration.value`; it isn't yielded, so `list()` only sees 1.",
      ["[1, 2]", "[2]", "SyntaxError"]),
    C(7, "A", 'def f(items):\n    items = items + [4]\n\nx = [1, 2]\nf(x)\nprint(x)',
      "`items + [4]` builds a new list and rebinds the local name; the caller's list is untouched. (`items += [4]` would mutate it.)",
      ["[1, 2, 4]", "None", "[4]"]),
    C(10, "I", 'class Dog:\n    def __init__(self, name):\n        self.name = name\n    def __repr__(self):\n        return f"Dog({self.name!r})"\n\nprint([Dog("Rex")])',
      "Containers display their items with `repr()`, and `!r` adds quotes around the string.",
      ["[Dog(Rex)]", "[<__main__.Dog object>]", "['Rex']"]),
    C(5, "I", 'd = {"b": 2, "a": 1}\nd["c"] = 3\ndel d["b"]\nd["b"] = 4\nprint(list(d))',
      "Dicts keep insertion order. After deleting \"b\", re-inserting it puts it at the end.",
      ["['a', 'b', 'c']", "['b', 'a', 'c']", "['a', 'c']"]),
    C(15, "I", 'import asyncio\n\nasync def hello():\n    return "hi"\n\ncoro = hello()\nprint(type(coro).__name__)\ncoro.close()',
      "Calling an async function doesn't run it; it returns a coroutine object that must be awaited.",
      ["hi", "str", "function"]),
    C(12, "I", 'import json\nprint(json.dumps({"t": (1, 2), "ok": True, "v": None}))',
      "JSON has no tuples (they become arrays), and Python True/None are written as JSON true/null.",
      ['{"t": (1, 2), "ok": True, "v": None}', "{'t': [1, 2], 'ok': true, 'v': null}", "TypeError"]),
]

SNIPPETS = [
    {"id": "hello", "icon": "👋", "title": "Hello, Python", "code": '''name = "MegaByte"
for i in range(3):
    print(f"{'>' * (i + 1)} Hello from {name}!")

print("Python can do maths too:", 2 ** 64)'''},
    {"id": "fizzbuzz", "icon": "🎯", "title": "FizzBuzz", "code": '''for n in range(1, 31):
    word = ("Fizz" if n % 3 == 0 else "") + ("Buzz" if n % 5 == 0 else "")
    print(word or n, end="  ")'''},
    {"id": "fib", "icon": "🌀", "title": "Fibonacci generator", "code": '''from itertools import islice

def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

for i, n in enumerate(islice(fibonacci(), 15)):
    print(f"F({i:2}) = {n:>4}  " + "█" * (n // 25))'''},
    {"id": "mandel", "icon": "🌌", "title": "ASCII Mandelbrot", "code": '''chars = " .:-=+*#%@"
for y in range(-12, 13):
    line = ""
    for x in range(-39, 18):
        c = complex(x / 20, y / 10)
        z, i = 0, 0
        while abs(z) < 2 and i < 30:
            z = z * z + c
            i += 1
        line += chars[i % len(chars)] if i < 30 else "@"
    print(line)'''},
    {"id": "words", "icon": "📊", "title": "Word frequency", "code": '''import re
from collections import Counter

text = """Python is readable. Python is powerful.
Readable code is maintainable code, and Python makes readable code easy."""

words = re.findall(r"[a-z]+", text.lower())
for word, count in Counter(words).most_common(5):
    print(f"{word:<10} {'■' * count} {count}")'''},
    {"id": "classes", "icon": "🏗️", "title": "Dataclasses & sorting", "code": '''from dataclasses import dataclass

@dataclass(order=True)
class Course:
    level: int
    name: str

courses = [Course(3, "Decorators"), Course(1, "Variables"), Course(2, "Functions")]
for c in sorted(courses):
    print(f"Level {c.level}: {c.name}")'''},
    {"id": "pandas", "icon": "🐼", "title": "pandas mini-analysis", "code": '''import pandas as pd

df = pd.DataFrame({
    "region": ["EU", "US", "EU", "APAC", "US", "EU"],
    "product": ["A", "A", "B", "B", "B", "A"],
    "sales": [120, 340, 90, 200, 60, 150],
})
print(df.groupby("region")["sales"].agg(["sum", "mean", "count"]))
print()
print(df.pivot_table(index="region", columns="product", values="sales", aggfunc="sum", fill_value=0))'''},
    {"id": "primes", "icon": "🔢", "title": "Sieve of Eratosthenes", "code": '''def primes_up_to(n):
    sieve = [True] * (n + 1)
    sieve[0] = sieve[1] = False
    for i in range(2, int(n ** 0.5) + 1):
        if sieve[i]:
            sieve[i * i::i] = [False] * len(sieve[i * i::i])
    return [i for i, is_p in enumerate(sieve) if is_p]

ps = primes_up_to(100)
print(len(ps), "primes below 100:")
print(ps)'''},
]
