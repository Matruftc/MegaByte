"""Sections 13-18: Modern Java Evolution, JVM & GC, NIO.2, JUnit 5, Spring Boot, Interview Challenges."""
from schema import Q, S

SECTIONS = [
    S("Modern Java Evolution (Java 11 - 21)", "🚀", "Module 13", [
        Q("B", "How does Pattern Matching for instanceof work (Java 16+)?",
          "Eliminates the tedious boilerplate of explicit type casting. You write if (obj instanceof String s) { ... } and s is automatically cast and scoped to the conditional branch.",
          "Scope extends logically to downstream expressions, e.g. if (obj instanceof String s && s.length() > 5).",
          '''public class PatternInstanceof {
    static void printDetails(Object obj) {
        if (obj instanceof String s) {
            System.out.println("String of length: " + s.length());
        } else if (obj instanceof Integer i) {
            System.out.println("Integer doubled: " + (i * 2));
        }
    }

    public static void main(String[] args) {
        printDetails("Java Academy");
        printDetails(21);
    }
}'''),
        Q("I", "What are Switch Expressions and the yield keyword (Java 14+)?",
          "Switch can be used as an expression that produces a value directly using the arrow (->) syntax without break fall-through. If a block is required for a case, yield is used to return the value.",
          "The compiler enforces completeness (all possible enum or sealed type cases must be handled).",
          '''public class SwitchExpression {
    public static void main(String[] args) {
        int day = 3;
        String type = switch (day) {
            case 1, 7 -> "Weekend";
            case 2, 3, 4, 5, 6 -> "Weekday";
            default -> throw new IllegalArgumentException("Invalid day");
        };
        System.out.println("Day " + day + " is a " + type);
    }
}'''),
        Q("I", "What are Sequenced Collections in Java 21?",
          "Java 21 introduced SequencedCollection, SequencedSet, and SequencedMap interfaces with uniform methods for accessing first/last elements (addFirst, addLast, getFirst, getLast, removeFirst, removeLast) and reversed() views.",
          "Resolves the long-standing inconsistency where accessing the last element required different code for ArrayList (list.get(list.size()-1)), LinkedHashSet (iterator traversal), and TreeSet (set.last()).",
          '''import java.util.*;

public class SequencedDemo {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("alpha", "beta", "gamma"));
        System.out.println("First: " + list.getFirst());
        System.out.println("Last: " + list.getLast());
        System.out.println("Reversed: " + list.reversed());
    }
}''')
    ]),

    S("JVM Internals, GC & Memory Tuning", "⚙️", "Module 14", [
        Q("I", "What is Metaspace and how does it differ from the old PermGen?",
          "Metaspace replaced PermGen in Java 8. It holds class metadata, constant pool, and method bytecode. Crucially, Metaspace is allocated from native memory rather than contiguous heap memory, resizing dynamically up to OS physical limits (or MaxMetaspaceSize).",
          "Eliminated the notorious java.lang.OutOfMemoryError: PermGen space that plagued enterprise classloaders.",
          '''public class MetaspaceDemo {
    public static void main(String[] args) {
        long maxMemory = Runtime.getRuntime().maxMemory();
        long totalMemory = Runtime.getRuntime().totalMemory();
        System.out.println("Max Heap (MB): " + (maxMemory / (1024 * 1024)));
        System.out.println("Total Allocated Heap (MB): " + (totalMemory / (1024 * 1024)));
    }
}'''),
        Q("A", "How does the G1 (Garbage-First) GC differ from ZGC?",
          "G1 divides heap into ~2048 equal regions and prioritizes collecting regions with the most garbage ('garbage first') with target pause times (e.g. 200ms). ZGC (Z Garbage Collector) is a generational concurrent low-latency collector that performs all major phases concurrently, keeping max pause times strictly under 1 millisecond regardless of multi-terabyte heap sizes.",
          "ZGC achieves sub-millisecond pauses using colored pointers and load barriers.",
          '''public class GCDemo {
    public static void main(String[] args) {
        System.out.println("Available processors: " + Runtime.getRuntime().availableProcessors());
    }
}''')
    ]),

    S("File I/O, NIO.2 & Buffers", "📁", "Module 15", [
        Q("B", "What is the difference between java.io and java.nio?",
          "java.io is stream-oriented and blocking (byte by byte / char by char with thread blocked on wait). java.nio (New I/O) is buffer- and channel-oriented and non-blocking (selectors allow one thread to monitor multiple I/O channels simultaneously).",
          "NIO.2 (Java 7+) added the java.nio.file package (Path, Files) which revolutionized modern file manipulation.",
          '''import java.nio.file.Path;

public class NioDemo {
    public static void main(String[] args) {
        Path path = Path.of("app", "config", "application.properties");
        System.out.println("Filename: " + path.getFileName());
        System.out.println("Parent: " + path.getParent());
    }
}''')
    ]),

    S("Unit Testing with JUnit 5 & Mockito", "🧪", "Module 16", [
        Q("B", "What are the core annotations in JUnit 5 (Jupiter)?",
          "@Test (marks test method), @BeforeEach (runs before every test), @AfterEach, @BeforeAll (static method run once before all tests), @AfterAll, @Disabled (skips test), and @ParameterizedTest (runs with multiple test arguments).",
          "In JUnit 5, test classes and methods do not need to be public (package-private is standard).",
          '''class Calculator {
    int add(int a, int b) { return a + b; }
}
public class TestDemo {
    public static void main(String[] args) {
        Calculator calc = new Calculator();
        int result = calc.add(10, 20);
        assert result == 30 : "Addition failed";
        System.out.println("Test passed: 10 + 20 == " + result);
    }
}'''),
        Q("I", "What is the difference between @Mock and @Spy in Mockito?",
          "A @Mock creates a completely synthetic dummy object where every method returns default values (null, 0, false) unless stubbed with when(...). A @Spy creates a wrapper around a real instance; calling unstubbed methods invokes the real production code.",
          "Use @Spy when you want to test partial behavior of an existing class.",
          '''public class MockitoPrinciple {
    public static void main(String[] args) {
        System.out.println("@Mock = complete fake; @Spy = real object with selective intercepts");
    }
}''')
    ]),

    S("Spring Boot & Enterprise Architecture", "🌱", "Module 17", [
        Q("B", "What is Inversion of Control (IoC) and Dependency Injection (DI)?",
          "IoC is the architectural principle where the control of object creation and lifecycle is delegated to a framework container (Spring ApplicationContext). Dependency Injection is the mechanism where the container injects required dependent beans via constructors, setters, or fields.",
          "Constructor injection is preferred over @Autowired field injection because it ensures immutability (final fields) and simplifies unit testing without Spring context reflection.",
          '''public class IoCDemo {
    interface Engine { String start(); }
    static class V8Engine implements Engine {
        public String start() { return "V8 Roar!"; }
    }
    static class Car {
        private final Engine engine;
        Car(Engine engine) { this.engine = engine; } // DI
        void drive() { System.out.println(engine.start()); }
    }
    public static void main(String[] args) {
        Car car = new Car(new V8Engine());
        car.drive();
    }
}'''),
        Q("I", "What does @SpringBootApplication encapsulate?",
          "It is a meta-annotation combining three essential annotations: 1) @SpringBootConfiguration (declares configuration bean), 2) @EnableAutoConfiguration (guesses beans based on classpath dependencies), 3) @ComponentScan (scans current package and subpackages for @Component, @Service, @Repository, @Controller).",
          "Auto-configuration is conditional; annotations like @ConditionalOnClass and @ConditionalOnMissingBean inspect whether you already configured custom beans.",
          '''public class BootMeta {
    public static void main(String[] args) {
        System.out.println("@SpringBootApplication = @Configuration + @EnableAutoConfiguration + @ComponentScan");
    }
}''')
    ]),

    S("Interview Algorithms & Coding Challenges", "🎯", "Module 18", [
        Q("A", "How do you implement Two Sum in O(N) time in Java?",
          "Iterate through the array while maintaining a HashMap of value -> index. For each number num, compute complement = target - num. If complement exists in map, return indices. Otherwise store num in map.",
          "Reduces brute force O(N^2) double loops to a single O(N) pass with O(1) hash lookups.",
          '''import java.util.*;

public class TwoSum {
    static int[] solve(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[]{map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        return new int[]{};
    }
    public static void main(String[] args) {
        int[] result = solve(new int[]{2, 7, 11, 15}, 9);
        System.out.println(Arrays.toString(result));
    }
}'''),
        Q("A", "How do you implement an LRU (Least Recently Used) Cache using LinkedHashMap?",
          "Extend LinkedHashMap<K, V> with accessOrder=true in the constructor so gets and puts reorder keys. Override removeEldestEntry(Map.Entry) to return size() > capacity.",
          "In interviews, you can also write it from scratch using a HashMap paired with a custom Doubly Linked List for O(1) get and put.",
          '''import java.util.*;

public class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;
    public LRUCache(int capacity) {
        super(capacity, 0.75f, true); // true = access-order
        this.capacity = capacity;
    }
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;
    }
    public static void main(String[] args) {
        LRUCache<String, Integer> cache = new LRUCache<>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.get("a"); // accessed 'a', so 'b' becomes eldest
        cache.put("c", 3); // evicts 'b'
        System.out.println(cache.keySet());
    }
}'''),
        Q("I", "How do you check for Valid Parentheses using Deque?",
          "Use an ArrayDeque<Character> as a stack. Push expected closing brackets whenever an opening bracket is seen. On seeing a closing bracket, pop from stack and ensure match.",
          "ArrayDeque is preferred over the legacy java.util.Stack class because Stack inherits from Vector with synchronized method overhead.",
          '''import java.util.*;

public class ValidParentheses {
    static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
    public static void main(String[] args) {
        System.out.println("()[]{}: " + isValid("()[]{}"));
        System.out.println("(]: " + isValid("(]"));
    }
}''')
    ])
]
