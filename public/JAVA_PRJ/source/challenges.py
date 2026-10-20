"""Java 'Predict the output' challenges and playground starter snippets."""
from schema import C

CHALLENGES = [
    C(2, "B", "Integer Cache Comparison Trap",
      '''public class Test {
    public static void main(String[] args) {
        Integer a = 127;
        Integer b = 127;
        Integer c = 128;
        Integer d = 128;
        System.out.println((a == b) + " " + (c == d));
    }
}''',
      ["true false", "true true", "false false", "Compilation Error"],
      0,
      "Java caches autoboxed Integer values between -128 and 127. 'a' and 'b' reference the exact same cached object in memory (a == b is true). 128 is outside the cache, so 'c' and 'd' are separate heap allocations (c == d is false)."),

    C(3, "B", "String Literal Pool vs new String",
      '''public class Test {
    public static void main(String[] args) {
        String s1 = "Java";
        String s2 = "Java";
        String s3 = new String("Java");
        System.out.println((s1 == s2) + " " + (s1 == s3));
    }
}''',
      ["true false", "true true", "false false", "false true"],
      0,
      "s1 and s2 both point to the canonical literal in the String Constant Pool. s3 explicitly allocates a new distinct object on the heap, so s1 == s3 evaluates to false."),

    C(2, "I", "Post-Increment Assignment Quirk",
      '''public class Test {
    public static void main(String[] args) {
        int i = 0;
        i = i++;
        System.out.println(i);
    }
}''',
      ["0", "1", "2", "Compilation Error"],
      0,
      "i++ evaluates to the old value (0) and queues the increment. Then the assignment '=' writes the old value 0 back into i, overwriting the increment! Hence i remains 0."),

    C(6, "I", "Finally Block Return Override",
      '''public class Test {
    static int getValue() {
        try {
            return 1;
        } finally {
            return 2;
        }
    }
    public static void main(String[] args) {
        System.out.println(getValue());
    }
}''',
      ["2", "1", "3", "Compilation Error"],
      0,
      "A return statement in a finally block always executes and discards any pending return value or unhandled exception from the try or catch block."),

    C(4, "A", "Method Overloading with Null",
      '''public class Test {
    static void print(Object o) { System.out.println("Object"); }
    static void print(String s) { System.out.println("String"); }

    public static void main(String[] args) {
        print(null);
    }
}''',
      ["String", "Object", "Ambiguous Method Call Error", "NullPointerException"],
      0,
      "When resolving overloaded methods with null, the compiler picks the most specific type. Since String is a subtype of Object, String is more specific, so print(String) is selected without ambiguity."),

    C(10, "I", "Stream Lazy Evaluation",
      '''import java.util.stream.Stream;

public class Test {
    public static void main(String[] args) {
        Stream.of("a", "b", "c")
              .filter(s -> {
                  System.out.print(s);
                  return true;
              });
        System.out.print("end");
    }
}''',
      ["end", "abcend", "aend", "endabc"],
      0,
      "Streams are lazy! Intermediate operations like filter() do not execute until a terminal operation (like forEach, collect, count) is attached. Because there is no terminal operation, only 'end' is printed."),

    C(4, "A", "Polymorphism: Field Hiding vs Method Overriding",
      '''class Parent {
    int x = 10;
    int getX() { return x; }
}
class Child extends Parent {
    int x = 20;
    int getX() { return x; }
}
public class Test {
    public static void main(String[] args) {
        Parent p = new Child();
        System.out.println(p.x + " " + p.getX());
    }
}''',
      ["10 20", "20 20", "10 10", "20 10"],
      0,
      "In Java, methods are overridden polymorphically (dynamic dispatch resolves to Child.getX()), but member variables are NOT polymorphic (fields are resolved statically by reference type Parent, giving 10)."),

    C(7, "I", "List.remove(int) vs List.remove(Object)",
      '''import java.util.*;

public class Test {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
        list.remove(1);
        System.out.println(list);
    }
}''',
      ["[1, 3]", "[2, 3]", "[1, 2]", "IndexOutOfBoundsException"],
      0,
      "List has two overloaded methods: remove(int index) and remove(Object o). The literal 1 is a primitive int, so it invokes remove(int index=1), removing element at index 1 (which is 2), leaving [1, 3]. To remove the value 1, you would write list.remove(Integer.valueOf(1))."),

    C(4, "A", "Static Initialization Hierarchy Order",
      '''class A {
    static { System.out.print("1"); }
    { System.out.print("2"); }
    A() { System.out.print("3"); }
}
class B extends A {
    static { System.out.print("4"); }
    { System.out.print("5"); }
    B() { System.out.print("6"); }
}
public class Test {
    public static void main(String[] args) {
        new B();
    }
}''',
      ["142356", "123456", "412356", "143256"],
      0,
      "Initialization order: 1) Superclass static blocks (1), 2) Subclass static blocks (4), 3) Superclass instance initializer (2), 4) Superclass constructor (3), 5) Subclass instance initializer (5), 6) Subclass constructor (6)."),

    C(2, "B", "Binary Floating-Point Precision",
      '''public class Test {
    public static void main(String[] args) {
        double d = 0.1 + 0.2;
        System.out.println(d == 0.3);
    }
}''',
      ["false", "true", "0.3", "Compilation Error"],
      0,
      "0.1 and 0.2 cannot be represented precisely in IEEE 754 binary floating-point. 0.1 + 0.2 evaluates to 0.30000000000000004, so d == 0.3 is false. Use BigDecimal for precise financial math."),

    C(13, "I", "Switch Expression Fallthrough",
      '''public class Test {
    public static void main(String[] args) {
        int x = 2;
        String res = switch (x) {
            case 1 -> "one";
            case 2, 3 -> "two or three";
            default -> "other";
        };
        System.out.println(res);
    }
}''',
      ["two or three", "other", "one", "Compilation Error"],
      0,
      "Modern arrow switch expressions (Java 14+) do not fall through! The matched case 2, 3 returns 'two or three' immediately."),

    C(7, "I", "Map.computeIfAbsent Behavior",
      '''import java.util.*;

public class Test {
    public static void main(String[] args) {
        Map<String, Integer> map = new HashMap<>();
        map.put("a", 10);
        map.computeIfAbsent("a", k -> 20);
        map.computeIfAbsent("b", k -> 30);
        System.out.println(map.get("a") + " " + map.get("b"));
    }
}''',
      ["10 30", "20 30", "10 null", "null 30"],
      0,
      "computeIfAbsent only computes and inserts a new value if the key is not already present or is mapped to null. Since 'a' is already 10, the lambda is not executed and 'a' remains 10. 'b' was absent, so it gets mapped to 30.")
]

SNIPPETS = [
    {
        "id": "hello_java21",
        "icon": "☕",
        "title": "Hello Java 21 & Records",
        "description": "Modern Java with record classes, formatted strings, and compact syntax",
        "filename": "HelloJava21.java",
        "code": '''public class Main {
    record Developer(String name, String role, int experienceYears) {
        public String greeting() {
            return "Hello, I am " + name + " (" + role + ") with " + experienceYears + " years in Java!";
        }
    }

    public static void main(String[] args) {
        Developer dev = new Developer("Matru", "Lead Data & Backend Engineer", 5);
        System.out.println(dev.greeting());

        for (int i = 1; i <= 3; i++) {
            System.out.println(">>> Welcome to Java Academy [Iteration " + i + "]");
        }
    }
}'''
    },
    {
        "id": "fizzbuzz",
        "icon": "🎯",
        "title": "Stream FizzBuzz",
        "description": "Classic FizzBuzz implemented with concise Java Streams",
        "filename": "StreamFizzBuzz.java",
        "code": '''import java.util.stream.IntStream;

public class Main {
    public static void main(String[] args) {
        IntStream.rangeClosed(1, 20)
            .mapToObj(n -> {
                if (n % 15 == 0) return "FizzBuzz";
                if (n % 3 == 0) return "Fizz";
                if (n % 5 == 0) return "Buzz";
                return String.valueOf(n);
            })
            .forEach(s -> System.out.print(s + " "));
        System.out.println();
    }
}'''
    },
    {
        "id": "virtual_threads",
        "icon": "⚡",
        "title": "Virtual Threads Simulator",
        "description": "Java 21 Project Loom lightweight concurrent task execution",
        "filename": "VirtualThreads.java",
        "code": '''public class Main {
    public static void main(String[] args) {
        System.out.println("Starting Virtual Threads Concurrent Pipeline...");
        int taskCount = 5;
        for (int i = 1; i <= taskCount; i++) {
            int taskId = i;
            System.out.println("[VirtualThread-" + taskId + "] Executing I/O simulated operation");
        }
        System.out.println("All virtual tasks completed with sub-millisecond footprint!");
    }
}'''
    },
    {
        "id": "stream_grouping",
        "icon": "📊",
        "title": "Stream Aggregation & Grouping",
        "description": "Business analytics grouping transactions by department with Collectors",
        "filename": "SalesAnalytics.java",
        "code": '''import java.util.*;
import java.util.stream.Collectors;

public class Main {
    record Sale(String department, double amount) {}

    public static void main(String[] args) {
        List<Sale> sales = List.of(
            new Sale("Engineering", 1200.0),
            new Sale("Marketing", 450.0),
            new Sale("Engineering", 800.0),
            new Sale("Design", 600.0),
            new Sale("Marketing", 750.0)
        );

        Map<String, Double> totalByDept = sales.stream()
            .collect(Collectors.groupingBy(
                Sale::department,
                Collectors.summingDouble(Sale::amount)
            ));

        System.out.println("=== Sales Summary by Department ===");
        totalByDept.forEach((dept, total) -> {
            System.out.println(dept + ": $" + total);
        });
    }
}'''
    },
    {
        "id": "lru_cache",
        "icon": "🏗️",
        "title": "LRU Cache Implementation",
        "description": "Least Recently Used memory cache using LinkedHashMap",
        "filename": "LRUCacheDemo.java",
        "code": '''import java.util.*;

public class Main {
    static class LRUCache<K, V> extends LinkedHashMap<K, V> {
        private final int capacity;
        public LRUCache(int capacity) {
            super(capacity, 0.75f, true); // access-order
            this.capacity = capacity;
        }
        @Override
        protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
            return size() > capacity;
        }
    }

    public static void main(String[] args) {
        LRUCache<String, String> cache = new LRUCache<>(3);
        cache.put("item1", "Java");
        cache.put("item2", "Spring");
        cache.put("item3", "Docker");
        
        System.out.println("Initial cache keys: " + cache.keySet());
        cache.get("item1"); // touch item1
        cache.put("item4", "Kubernetes"); // should evict item2
        
        System.out.println("After access & insertion: " + cache.keySet());
    }
}'''
    },
    {
        "id": "word_frequency",
        "icon": "🔠",
        "title": "Word Frequency Counter",
        "description": "Text parsing and word frequency counting using Java Streams",
        "filename": "WordFrequency.java",
        "code": '''import java.util.*;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) {
        String text = "Java is powerful and Java is fast and Java is scalable";
        String[] words = text.toLowerCase().split("\\\\s+");

        Map<String, Long> freq = Arrays.stream(words)
            .collect(Collectors.groupingBy(w -> w, Collectors.counting()));

        System.out.println("=== Word Frequencies ===");
        freq.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .forEach(e -> System.out.println(e.getKey() + ": " + e.getValue()));
    }
}'''
    }
]
