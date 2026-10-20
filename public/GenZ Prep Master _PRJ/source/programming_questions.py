"""50 Essential Programming & Code Output Questions (90%+ frequency in Tech Interviews).
Includes Java subtle output traps, memory/cache semantics, multithreading puzzles, stream pipelines, and classic patterns.
"""
from schema import Q, S

QUESTIONS = [
    Q("B", "The Integer Cache Equality Trap (-128 to 127)",
      "Integer.valueOf() caches objects from -128 to 127 (JLS). Auto-boxing uses this cache, so Integer a = 127; Integer b = 127; a == b evaluates to true (same cached instance). But Integer c = 128; Integer d = 128; creates two distinct heap objects, so c == d evaluates to false!",
      "Always use .equals() when comparing boxed wrapper objects.",
      code='''public class Main {
    public static void main(String[] args) {
        Integer a = 127, b = 127;
        Integer c = 128, d = 128;
        System.out.println("127 == 127: " + (a == b)); // true (cached)
        System.out.println("128 == 128: " + (c == d)); // false (new heap objects)
        System.out.println("c.equals(d): " + c.equals(d)); // true
    }
}''',
      category="programming", tags=["Integer Cache", "Autoboxing", "Traps"]),

    Q("B", "String Pool vs new String() vs .intern()",
      "String literals live in the PermGen/Metaspace String Pool and are shared. 'new String()' allocates a separate object on the regular heap. Calling .intern() returns the pooled reference.",
      "String literal concat at compile time ('a' + 'b') is evaluated by javac into 'ab' and placed in the pool.",
      code='''public class Main {
    public static void main(String[] args) {
        String s1 = "hello";
        String s2 = new String("hello");
        String s3 = s2.intern();
        System.out.println("s1 == s2: " + (s1 == s2));         // false
        System.out.println("s1 == s3: " + (s1 == s3));         // true
        System.out.println("s1.equals(s2): " + s1.equals(s2)); // true
    }
}''',
      category="programming", tags=["String Pool", "Memory", "Intern"]),

    Q("B", "Floating-point precision trap: Why does 0.1 + 0.2 != 0.3?",
      "In IEEE 754 binary floating-point representation, numbers like 0.1 and 0.2 cannot be represented with exact precision, causing rounding errors (0.1 + 0.2 = 0.30000000000000004). For monetary and precision calculations, always use BigDecimal.",
      "Never pass doubles to new BigDecimal(0.1); use BigDecimal.valueOf(0.1) or new BigDecimal('0.1').",
      code='''import java.math.BigDecimal;

public class Main {
    public static void main(String[] args) {
        double d = 0.1 + 0.2;
        System.out.println("double 0.1 + 0.2 == 0.3: " + (d == 0.3));
        System.out.println("Actual double value: " + d);

        BigDecimal b1 = new BigDecimal("0.1");
        BigDecimal b2 = new BigDecimal("0.2");
        System.out.println("BigDecimal sum: " + b1.add(b2));
    }
}''',
      category="programming", tags=["Floating Point", "BigDecimal", "Precision"]),

    Q("B", "Finally Block Return Overriding Trap",
      "If a try or catch block executes a return statement, but the finally block also contains a return statement, the finally block's return unconditionally overrides and discards the earlier return value.",
      "Never put return statements or throw statements inside a finally block.",
      code='''public class Main {
    public static int test() {
        try {
            return 1;
        } finally {
            return 2; // Overrides the try return!
        }
    }
    public static void main(String[] args) {
        System.out.println("Returned value: " + test()); // prints 2
    }
}''',
      category="programming", tags=["Exceptions", "Finally", "Control Flow"]),

    Q("I", "Method Overloading with null Argument: Most Specific Wins",
      "When null is passed to an overloaded method, the Java compiler selects the most specific type in the inheritance hierarchy. Between Object and String, String is more specific (subclass), so print(String) is called. If two sibling types (like String and Integer) both match, compilation fails with an ambiguity error.",
      "Compiler resolves method overloads at compile-time based on static reference types.",
      code='''public class Main {
    public static void print(Object o) { System.out.println("Object invoked"); }
    public static void print(String s) { System.out.println("String invoked"); }

    public static void main(String[] args) {
        print(null); // prints "String invoked"
    }
}''',
      category="programming", tags=["Overloading", "Polymorphism", "Compiler"]),

    Q("I", "Class Initialization Order: Static blocks, Instance blocks, and Constructors",
      "Order of execution: 1. Parent static variables & static blocks (once per class loading). 2. Child static variables & static blocks. 3. Parent instance initializers & fields. 4. Parent constructor. 5. Child instance initializers & fields. 6. Child constructor.",
      "Understanding this order is asked in almost every senior Java technical assessment.",
      code='''class Parent {
    static { System.out.print("1"); }
    { System.out.print("3"); }
    Parent() { System.out.print("4"); }
}
class Child extends Parent {
    static { System.out.print("2"); }
    { System.out.print("5"); }
    Child() { System.out.print("6"); }
}
public class Main {
    public static void main(String[] args) {
        new Child(); // Output: 123456
        System.out.println();
    }
}''',
      category="programming", tags=["Initialization", "Inheritance", "JVM"]),

    Q("B", "The Post-Increment Trap: Why does i = i++ print 0?",
      "The expression i = i++ first evaluates i (which is 0), then increments i to 1 in memory, and finally assigns the previously evaluated value (0) back into i, overwriting the increment.",
      "Use i++ alone on a statement line, or use i = ++i if pre-increment is intended.",
      code='''public class Main {
    public static void main(String[] args) {
        int i = 0;
        i = i++;
        System.out.println("i after i = i++: " + i); // 0!
        
        int j = 0;
        j = ++j;
        System.out.println("j after j = ++j: " + j); // 1
    }
}''',
      category="programming", tags=["Operators", "Post-increment", "Bytecode"]),

    Q("I", "Field Shadowing vs Method Overriding in Polymorphism",
      "Methods are polymorphic (resolved at runtime dynamically via vtable dispatch). Fields (variables) and static methods are NOT polymorphic; they are resolved at compile time based on the static declared type of the reference variable.",
      "If Parent p = new Child(), p.name accesses Parent's name, but p.getName() executes Child's method.",
      code='''class Parent {
    String name = "ParentField";
    String getName() { return "ParentMethod"; }
}
class Child extends Parent {
    String name = "ChildField";
    String getName() { return "ChildMethod"; }
}
public class Main {
    public static void main(String[] args) {
        Parent p = new Child();
        System.out.println("Field: " + p.name);          // ParentField (no polymorphism)
        System.out.println("Method: " + p.getName());    // ChildMethod (polymorphic)
    }
}''',
      category="programming", tags=["Polymorphism", "Inheritance", "Shadowing"]),

    Q("I", "Covariant Return Types in Java",
      "Since Java 5, an overriding method in a subclass is allowed to return a subtype (narrower type) of the return type declared in the superclass method, without causing a compilation error.",
      "Enables fluent APIs and cleaner method chaining without manual casting.",
      code='''class Animal {
    Animal reproduce() { return new Animal(); }
}
class Dog extends Animal {
    @Override
    Dog reproduce() { return new Dog(); } // Covariant return type
}
public class Main {
    public static void main(String[] args) {
        Dog d = new Dog().reproduce();
        System.out.println("Successfully returned Dog type directly!");
    }
}''',
      category="programming", tags=["OOP", "Inheritance", "Generics"]),

    Q("B", "ConcurrentModificationException and Safe Collection Removal",
      "Iterating through an ArrayList using a standard for-each loop while calling list.remove() throws ConcurrentModificationException because modCount differs from expectedModCount. Safe ways: 1. Use Iterator.remove(), 2. list.removeIf(predicate) in Java 8+, 3. CopyOnWriteArrayList.",
      "The enhanced for-each loop compiles down to an implicit Iterator; calling list.remove() modifies the list directly behind the iterator's back.",
      code='''import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));
        // Modern Java 8+ safe removal
        list.removeIf(item -> item.equals("B"));
        System.out.println("Safely removed B: " + list);
    }
}''',
      category="programming", tags=["Collections", "Exceptions", "Iterators"]),

    Q("B", "Arrays.asList() Fixed-Size List Trap",
      "Arrays.asList() returns an internal java.util.Arrays$ArrayList adapter backed directly by the underlying array. It has fixed size: calling .add() or .remove() throws UnsupportedOperationException. In Java 9+, List.of() returns an entirely immutable list.",
      "To create a modifiable ArrayList from an array: new ArrayList<>(Arrays.asList(arr)).",
      code='''import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> fixed = Arrays.asList("one", "two");
        try {
            fixed.add("three");
        } catch (UnsupportedOperationException e) {
            System.out.println("Caught UnsupportedOperationException as expected!");
        }
        List<String> modifiable = new ArrayList<>(fixed);
        modifiable.add("three");
        System.out.println("Modifiable list: " + modifiable);
    }
}''',
      category="programming", tags=["Collections", "Arrays", "List.of"]),

    Q("I", "Double.NaN Comparison Trap",
      "Double.NaN (Not a Number) compared to anything—including itself—with == always evaluates to false (Double.NaN == Double.NaN is false). To check for NaN, you must call Double.isNaN(val).",
      "However, Double.valueOf(Double.NaN).equals(Double.valueOf(Double.NaN)) evaluates to true to allow hash sets to function properly.",
      code='''public class Main {
    public static void main(String[] args) {
        double nan = Double.NaN;
        System.out.println("nan == nan: " + (nan == nan));         // false
        System.out.println("Double.isNaN: " + Double.isNaN(nan));  // true
    }
}''',
      category="programming", tags=["Primitives", "NaN", "IEEE 754"]),

    Q("I", "Stream findFirst() vs findAny() in Parallel Streams",
      "findFirst() returns the first element in encounter order (deterministic, even across parallel streams). findAny() is explicitly non-deterministic in parallel streams and returns whatever element finished processing first, offering substantially higher performance across multi-core parallel splits.",
      "In sequential single-threaded streams, both behave identically.",
      code='''import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> nums = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        int any = nums.parallelStream().filter(n -> n > 5).findAny().orElse(0);
        System.out.println("Parallel findAny result: " + any);
    }
}''',
      category="programming", tags=["Streams", "Parallel", "Performance"]),

    Q("I", "Stream Short-Circuiting with Infinite Streams",
      "Java Streams can be infinite (Stream.iterate or Stream.generate). Short-circuiting intermediate operations (limit(n)) or terminal operations (anyMatch, findFirst) terminate execution without infinite looping.",
      "Calling sorted() on an infinite stream causes an OutOfMemoryError or infinite hang because sorting requires buffering all elements.",
      code='''import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Stream.iterate(1, n -> n + 1)
            .filter(n -> n % 2 == 0)
            .limit(5)
            .forEach(n -> System.out.print(n + " ")); // 2 4 6 8 10
        System.out.println();
    }
}''',
      category="programming", tags=["Streams", "Infinite Streams", "Functional"]),

    Q("B", "Optional.of() vs Optional.ofNullable()",
      "Optional.of(x) throws NullPointerException immediately if x is null. Optional.ofNullable(x) returns Optional.empty() if x is null. Use .orElse() for static fallbacks and .orElseGet(supplier) for expensive computed fallbacks.",
      "Never call optional.get() without first checking optional.isPresent(); prefer functional methods like .map() and .ifPresent().",
      code='''import java.util.Optional;

public class Main {
    public static void main(String[] args) {
        String nullStr = null;
        Optional<String> opt = Optional.ofNullable(nullStr);
        System.out.println("Value: " + opt.orElse("Default Value"));
    }
}''',
      category="programming", tags=["Optional", "Null Safety", "Java 8"]),

    Q("I", "Array Covariance vs Generic Invariance: ArrayStoreException",
      "Java arrays are covariant: String[] is a subtype of Object[]. This allows assigning String[] to Object[] reference. But storing an Integer into that Object[] compiles fine, yet throws ArrayStoreException at runtime. Java Generics are invariant (List<String> is NOT a List<Object>) to prevent this at compile time.",
      "This is why Joshua Bloch's Effective Java recommends 'Prefer lists to arrays'.",
      code='''public class Main {
    public static void main(String[] args) {
        Object[] arr = new String[2];
        try {
            arr[0] = 42; // Throws ArrayStoreException at runtime!
        } catch (ArrayStoreException e) {
            System.out.println("Caught ArrayStoreException: runtime type safety enforced!");
        }
    }
}''',
      category="programming", tags=["Generics", "Arrays", "Type Safety"]),

    Q("I", "Thread Visibility Trap: Infinite Loop without Volatile or Sync",
      "Without volatile or synchronization, a worker thread checking a boolean flag may cache the flag in a CPU register. Even when the main thread updates the flag, the worker thread may never observe the change, looping infinitely due to JIT optimizations.",
      "Adding volatile forces CPU to read main memory on each check.",
      code='''public class Main {
    static volatile boolean flag = false;
    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            while (!flag) {}
            System.out.println("Worker thread noticed flag change!");
        }).start();
        Thread.sleep(50);
        flag = true;
    }
}''',
      category="programming", tags=["Concurrency", "Volatile", "JMM"]),

    Q("I", "Producer-Consumer Implementation using wait() and notifyAll()",
      "Classic synchronization pattern using an intrinsic lock monitor. Always call wait() inside a while loop (never an if statement) to guard against spurious wakeups.",
      "Always call notifyAll() instead of notify() to prevent lost wakeups when multiple producers and consumers wait on the same monitor.",
      code='''import java.util.*;

public class Main {
    static class BoundedBuffer {
        private final Queue<Integer> queue = new LinkedList<>();
        private final int capacity = 2;

        public synchronized void produce(int val) throws InterruptedException {
            while (queue.size() == capacity) wait(); // Guard against spurious wakeup
            queue.add(val);
            notifyAll();
        }
        public synchronized int consume() throws InterruptedException {
            while (queue.isEmpty()) wait();
            int val = queue.poll();
            notifyAll();
            return val;
        }
    }
    public static void main(String[] args) throws Exception {
        BoundedBuffer buf = new BoundedBuffer();
        buf.produce(42);
        System.out.println("Consumed: " + buf.consume());
    }
}''',
      category="programming", tags=["Concurrency", "Wait Notify", "Design Patterns"]),

    Q("I", "Thread-Safe Singleton Pattern with Double-Checked Locking",
      "Requires two checks for null and a volatile instance variable. The volatile keyword prevents CPU instruction reordering where memory is allocated and assigned to instance before constructor finishes executing.",
      "Alternative recommended approach in modern Java: Bill Pugh Singleton (Static Holder class) or single-element Enum.",
      code='''public class Main {
    static class Singleton {
        private static volatile Singleton instance;
        private Singleton() {}
        public static Singleton getInstance() {
            if (instance == null) {
                synchronized (Singleton.class) {
                    if (instance == null) {
                        instance = new Singleton();
                    }
                }
            }
            return instance;
        }
    }
    public static void main(String[] args) {
        Singleton s1 = Singleton.getInstance();
        Singleton s2 = Singleton.getInstance();
        System.out.println("Same instance: " + (s1 == s2));
    }
}''',
      category="programming", tags=["Singleton", "Design Patterns", "Concurrency"]),

    Q("I", "Implement an LRU Cache using LinkedHashMap in 15 lines",
      "LinkedHashMap maintains a doubly-linked list running through all its entries. Overriding removeEldestEntry(Map.Entry) causes the map to automatically evict the least recently used entry when size exceeds maximum capacity.",
      "Pass true as the third argument in LinkedHashMap constructor to enable access-order rather than insertion-order.",
      code='''import java.util.*;

public class Main {
    static class LRUCache<K, V> extends LinkedHashMap<K, V> {
        private final int capacity;
        public LRUCache(int cap) {
            super(cap, 0.75f, true); // true = access order
            this.capacity = cap;
        }
        @Override
        protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
            return size() > capacity;
        }
    }
    public static void main(String[] args) {
        LRUCache<Integer, String> cache = new LRUCache<>(2);
        cache.put(1, "A");
        cache.put(2, "B");
        cache.get(1); // 1 accessed, 2 becomes eldest
        cache.put(3, "C"); // 2 evicted
        System.out.println("Cache keys after eviction: " + cache.keySet()); // [1, 3]
    }
}''',
      category="programming", tags=["LRU Cache", "LinkedHashMap", "Data Structures"]),

    Q("B", "Flatten a Nested List of Integers (Recursion & Streams)",
      "Given a list that may contain integers or nested lists, flatten all integers into a single 1D list. Solved cleanly with recursion or flatMap in Java Streams.",
      "Core question testing understanding of tree structures and functional transformation.",
      code='''import java.util.*;
import java.util.stream.*;

public class Main {
    public static List<Object> flatten(List<Object> list) {
        List<Object> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof List) {
                result.addAll(flatten((List<Object>) item));
            } else {
                result.add(item);
            }
        }
        return result;
    }
    public static void main(String[] args) {
        List<Object> nested = Arrays.asList(1, Arrays.asList(2, Arrays.asList(3, 4)), 5);
        System.out.println("Flattened: " + flatten(nested));
    }
}''',
      category="programming", tags=["Recursion", "Lists", "Algorithms"]),

    Q("B", "Check if a Binary Tree is Symmetric (Mirror of Itself)",
      "A tree is symmetric if the left subtree is a mirror reflection of the right subtree. Solved recursively by comparing left.left with right.right and left.right with right.left.",
      "Time complexity: O(N), Space complexity: O(H) recursion stack.",
      code='''public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int v) { val = v; }
    }
    public static boolean isSymmetric(TreeNode root) {
        return root == null || isMirror(root.left, root.right);
    }
    private static boolean isMirror(TreeNode t1, TreeNode t2) {
        if (t1 == null && t2 == null) return true;
        if (t1 == null || t2 == null) return false;
        return (t1.val == t2.val) && isMirror(t1.left, t2.right) && isMirror(t1.right, t2.left);
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(1);
        root.left = new TreeNode(2); root.right = new TreeNode(2);
        System.out.println("Is symmetric: " + isSymmetric(root));
    }
}''',
      category="programming", tags=["Binary Tree", "Recursion", "Algorithms"]),

    Q("B", "Find the Middle Node of a Linked List (Fast & Slow Pointers)",
      "Traverse linked list using two pointers: slow moves 1 step, fast moves 2 steps. When fast reaches the end of the list, slow is guaranteed to be at the exact middle node.",
      "Achieves O(N) time in a single pass with O(1) extra space.",
      code='''public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int v) { val = v; }
    }
    public static ListNode findMiddle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }
    public static void main(String[] args) {
        ListNode head = new ListNode(1);
        head.next = new ListNode(2);
        head.next.next = new ListNode(3);
        System.out.println("Middle node: " + findMiddle(head).val); // 2
    }
}''',
      category="programming", tags=["Linked List", "Two Pointers", "Fast Slow"]),

    Q("B", "Detect a Cycle in a Linked List (Floyd's Tortoise & Hare)",
      "Advance slow pointer by 1 step and fast pointer by 2 steps. If a cycle exists, the fast pointer will eventually lap the slow pointer and they will point to the exact same node (slow == fast).",
      "If fast reaches null, the list is acyclic.",
      code='''public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int v) { val = v; }
    }
    public static boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
    public static void main(String[] args) {
        ListNode a = new ListNode(1), b = new ListNode(2);
        a.next = b; b.next = a; // Cycle
        System.out.println("Has cycle: " + hasCycle(a));
    }
}''',
      category="programming", tags=["Linked List", "Cycle Detection", "Floyd"]),

    Q("I", "Implement a Generic Resizable Stack using an Array",
      "Demonstrates core data structure design: handling dynamic array doubling, generics with Object array casting, bounds checking, and preventing memory leaks by nulling out popped slots.",
      "Nulling out slots allows the Garbage Collector to reclaim discarded objects immediately.",
      code='''import java.util.Arrays;

public class Main {
    static class CustomStack<T> {
        private Object[] elements = new Object[2];
        private int size = 0;

        public void push(T item) {
            if (size == elements.length) elements = Arrays.copyOf(elements, elements.length * 2);
            elements[size++] = item;
        }
        @SuppressWarnings("unchecked")
        public T pop() {
            if (size == 0) throw new IllegalStateException("Stack empty");
            T item = (T) elements[--size];
            elements[size] = null; // Prevent memory leak
            return item;
        }
    }
    public static void main(String[] args) {
        CustomStack<String> s = new CustomStack<>();
        s.push("GenZ"); s.push("Prep");
        System.out.println(s.pop() + " " + s.pop());
    }
}''',
      category="programming", tags=["Data Structures", "Generics", "Memory Leak"]),

    Q("I", "Implement a Thread-Safe Bounded Queue with ReentrantLock & Conditions",
      "ReentrantLock with two Condition objects (notFull and notEmpty). Producers await when count == capacity; consumers await when count == 0. When an item is added, signal notEmpty; when removed, signal notFull.",
      "This is how Java's ArrayBlockingQueue is implemented internally.",
      code='''import java.util.concurrent.locks.*;

public class Main {
    static class BoundedQueue<T> {
        private final Object[] items = new Object[5];
        private int count = 0, putIdx = 0, takeIdx = 0;
        private final Lock lock = new ReentrantLock();
        private final Condition notFull = lock.newCondition();
        private final Condition notEmpty = lock.newCondition();

        public void put(T item) throws InterruptedException {
            lock.lock();
            try {
                while (count == items.length) notFull.await();
                items[putIdx] = item;
                if (++putIdx == items.length) putIdx = 0;
                count++;
                notEmpty.signal();
            } finally { lock.unlock(); }
        }
        @SuppressWarnings("unchecked")
        public T take() throws InterruptedException {
            lock.lock();
            try {
                while (count == 0) notEmpty.await();
                T item = (T) items[takeIdx];
                if (++takeIdx == items.length) takeIdx = 0;
                count--;
                notFull.signal();
                return item;
            } finally { lock.unlock(); }
        }
    }
    public static void main(String[] args) throws Exception {
        BoundedQueue<Integer> q = new BoundedQueue<>();
        q.put(100);
        System.out.println("Taken: " + q.take());
    }
}''',
      category="programming", tags=["Concurrency", "ReentrantLock", "Conditions"]),

    Q("B", "Roman to Integer Converter",
      "Map Roman numerals to values (I:1, V:5, X:10, L:50, C:100, D:500, M:1000). If a character has smaller value than the character to its right, subtract it (e.g. IV = 4); otherwise, add it.",
      "Runs in single pass O(N) time with O(1) space.",
      code='''import java.util.*;

public class Main {
    public static int romanToInt(String s) {
        Map<Character, Integer> map = Map.of('I',1, 'V',5, 'X',10, 'L',50, 'C',100, 'D',500, 'M',1000);
        int total = 0, prev = 0;
        for (int i = s.length() - 1; i >= 0; i--) {
            int curr = map.get(s.charAt(i));
            if (curr < prev) total -= curr;
            else total += curr;
            prev = curr;
        }
        return total;
    }
    public static void main(String[] args) {
        System.out.println("MCMXCIV: " + romanToInt("MCMXCIV")); // 1994
    }
}''',
      category="programming", tags=["Strings", "Math", "Algorithms"]),

    Q("B", "Group Anagrams using Sorted String Keys in HashMap",
      "Given an array of strings, group anagrams together. For each word, sort its characters to produce a canonical key, and group words under that key in a HashMap.",
      "Time complexity: O(N * K log K) where K is max word length.",
      code='''import java.util.*;

public class Main {
    public static List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        for (String s : strs) {
            char[] chars = s.toCharArray();
            Arrays.sort(chars);
            String key = new String(chars);
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        return new ArrayList<>(map.values());
    }
    public static void main(String[] args) {
        System.out.println(groupAnagrams(new String[]{"eat","tea","tan","ate","nat","bat"}));
    }
}''',
      category="programming", tags=["Hash Table", "Strings", "Sorting"]),

    Q("I", "Longest Palindromic Substring via Center Expansion",
      "Expand outward from each character (odd length centers) and between adjacent characters (even length centers). Tracks maximum palindrome bounds in O(N^2) time and O(1) space, avoiding O(N^2) memory required by DP.",
      "Standard FAANG question testing edge cases and two-pointer expansion.",
      code='''public class Main {
    public static String longestPalindrome(String s) {
        if (s == null || s.length() < 1) return "";
        int start = 0, end = 0;
        for (int i = 0; i < s.length(); i++) {
            int len1 = expand(s, i, i);     // Odd center
            int len2 = expand(s, i, i + 1); // Even center
            int len = Math.max(len1, len2);
            if (len > end - start) {
                start = i - (len - 1) / 2;
                end = i + len / 2;
            }
        }
        return s.substring(start, end + 1);
    }
    private static int expand(String s, int L, int R) {
        while (L >= 0 && R < s.length() && s.charAt(L) == s.charAt(R)) { L--; R++; }
        return R - L - 1;
    }
    public static void main(String[] args) {
        System.out.println("Longest: " + longestPalindrome("babad"));
    }
}''',
      category="programming", tags=["Strings", "Two Pointers", "Palindrome"]),

    Q("B", "Evaluate Reverse Polish Notation (RPN) using Stack",
      "Operands are pushed onto a stack. When an operator (+, -, *, /) is encountered, pop two operands, evaluate the expression, and push the result back onto the stack.",
      "Notice order of operands: second popped operand is the left operand (e.g. op2 - op1).",
      code='''import java.util.*;

public class Main {
    public static int evalRPN(String[] tokens) {
        Deque<Integer> stack = new ArrayDeque<>();
        for (String t : tokens) {
            switch (t) {
                case "+": stack.push(stack.pop() + stack.pop()); break;
                case "*": stack.push(stack.pop() * stack.pop()); break;
                case "-": { int b = stack.pop(), a = stack.pop(); stack.push(a - b); break; }
                case "/": { int b = stack.pop(), a = stack.pop(); stack.push(a / b); break; }
                default: stack.push(Integer.parseInt(t));
            }
        }
        return stack.pop();
    }
    public static void main(String[] args) {
        System.out.println("Result: " + evalRPN(new String[]{"2","1","+","3","*"})); // (2 + 1) * 3 = 9
    }
}''',
      category="programming", tags=["Stack", "Evaluation", "Math"]),

    Q("B", "Multi-Field Custom Sorting with Comparator.comparing()",
      "Sort employees by Department ascending, then Salary descending, then Name alphabetically using modern declarative Comparator chaining in Java 8+.",
      "Demonstrates readable functional composition over brittle nested ternary comparisons.",
      code='''import java.util.*;

public class Main {
    record Emp(String name, String dept, int salary) {}
    public static void main(String[] args) {
        List<Emp> list = Arrays.asList(
            new Emp("Alice", "Engineering", 120000),
            new Emp("Bob", "Engineering", 150000),
            new Emp("Charlie", "Design", 90000)
        );
        list.sort(Comparator
            .comparing(Emp::dept)
            .thenComparing(Comparator.comparing(Emp::salary).reversed())
            .thenComparing(Emp::name)
        );
        list.forEach(System.out::println);
    }
}''',
      category="programming", tags=["Comparator", "Sorting", "Clean Code"]),

    Q("I", "Merge K Sorted Arrays using Min-Heap (PriorityQueue)",
      "Insert the first element of each array into a Min-Heap. Poll the smallest element, add it to result, and insert the next element from that array into the heap.",
      "Time complexity: O(N log K) where N is total elements and K is number of arrays.",
      code='''import java.util.*;

public class Main {
    static class Node {
        int val, arrIdx, elemIdx;
        Node(int v, int a, int e) { val = v; arrIdx = a; elemIdx = e; }
    }
    public static List<Integer> mergeK(int[][] arrays) {
        PriorityQueue<Node> pq = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));
        for (int i = 0; i < arrays.length; i++) {
            if (arrays[i].length > 0) pq.add(new Node(arrays[i][0], i, 0));
        }
        List<Integer> res = new ArrayList<>();
        while (!pq.isEmpty()) {
            Node curr = pq.poll();
            res.add(curr.val);
            if (curr.elemIdx + 1 < arrays[curr.arrIdx].length) {
                pq.add(new Node(arrays[curr.arrIdx][curr.elemIdx + 1], curr.arrIdx, curr.elemIdx + 1));
            }
        }
        return res;
    }
    public static void main(String[] args) {
        System.out.println(mergeK(new int[][]{{1, 4, 7}, {2, 5, 8}, {3, 6, 9}}));
    }
}''',
      category="programming", tags=["Heap", "PriorityQueue", "Merge K"]),

    Q("I", "Find All Subsets (Power Set) using Backtracking",
      "Generate all 2^N subsets of a set of unique integers. At each step, choose to include nums[i], recurse, and then backtrack by removing it.",
      "Total subsets generated: 2^N. Time complexity: O(N * 2^N).",
      code='''import java.util.*;

public class Main {
    public static List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        backtrack(nums, 0, new ArrayList<>(), res);
        return res;
    }
    private static void backtrack(int[] nums, int start, List<Integer> curr, List<List<Integer>> res) {
        res.add(new ArrayList<>(curr));
        for (int i = start; i < nums.length; i++) {
            curr.add(nums[i]);
            backtrack(nums, i + 1, curr, res);
            curr.remove(curr.size() - 1);
        }
    }
    public static void main(String[] args) {
        System.out.println("Subsets count: " + subsets(new int[]{1, 2, 3}).size()); // 8
    }
}''',
      category="programming", tags=["Backtracking", "Subsets", "Power Set"]),

    Q("I", "Generate All Permutations of a String with Duplicates Handled",
      "Sort characters first so duplicates are adjacent. During backtracking, skip duplicate choices if nums[i] == nums[i-1] and the previous element has not been visited in the current path.",
      "Prevents duplicate branches from being evaluated.",
      code='''import java.util.*;

public class Main {
    public static List<String> permuteUnique(String s) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        List<String> res = new ArrayList<>();
        backtrack(chars, new boolean[chars.length], new StringBuilder(), res);
        return res;
    }
    private static void backtrack(char[] chars, boolean[] used, StringBuilder curr, List<String> res) {
        if (curr.length() == chars.length) { res.add(curr.toString()); return; }
        for (int i = 0; i < chars.length; i++) {
            if (used[i]) continue;
            if (i > 0 && chars[i] == chars[i-1] && !used[i-1]) continue;
            used[i] = true;
            curr.append(chars[i]);
            backtrack(chars, used, curr, res);
            curr.deleteCharAt(curr.length() - 1);
            used[i] = false;
        }
    }
    public static void main(String[] args) {
        System.out.println("Unique permutations of 'aab': " + permuteUnique("aab"));
    }
}''',
      category="programming", tags=["Backtracking", "Permutations", "Duplicates"]),

    Q("I", "Check if a Binary Tree is Height-Balanced (AVL Tree Check)",
      "A binary tree is height-balanced if for every node, the height difference between left and right subtrees is at most 1. Return -1 early up the recursion stack if any subtree is unbalanced, achieving O(N) time.",
      "Avoids the naive O(N^2) approach of calculating height separately for each node.",
      code='''public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int v) { val = v; }
    }
    public static boolean isBalanced(TreeNode root) {
        return checkHeight(root) != -1;
    }
    private static int checkHeight(TreeNode node) {
        if (node == null) return 0;
        int left = checkHeight(node.left);
        if (left == -1) return -1;
        int right = checkHeight(node.right);
        if (right == -1) return -1;
        if (Math.abs(left - right) > 1) return -1;
        return 1 + Math.max(left, right);
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(1);
        root.left = new TreeNode(2);
        System.out.println("Is balanced: " + isBalanced(root));
    }
}''',
      category="programming", tags=["Binary Tree", "AVL", "Recursion"]),

    Q("I", "Implement a Trie (Prefix Tree) with Insert, Search, and StartsWith",
      "Each TrieNode has an array of child nodes (e.g. TrieNode[26]) and a boolean isEndOfWord flag. Insert, search, and prefix matching execute in O(L) time where L is the length of the word.",
      "Standard data structure used in autocomplete, search query suggestions, and IP routing.",
      code='''public class Main {
    static class Trie {
        static class Node {
            Node[] children = new Node[26];
            boolean isEnd = false;
        }
        private final Node root = new Node();
        public void insert(String word) {
            Node curr = root;
            for (char c : word.toCharArray()) {
                int idx = c - 'a';
                if (curr.children[idx] == null) curr.children[idx] = new Node();
                curr = curr.children[idx];
            }
            curr.isEnd = true;
        }
        public boolean startsWith(String prefix) {
            Node curr = root;
            for (char c : prefix.toCharArray()) {
                int idx = c - 'a';
                if (curr.children[idx] == null) return false;
                curr = curr.children[idx];
            }
            return true;
        }
    }
    public static void main(String[] args) {
        Trie trie = new Trie();
        trie.insert("interview");
        System.out.println("Starts with 'inter': " + trie.startsWith("inter"));
    }
}''',
      category="programming", tags=["Trie", "Prefix Tree", "Data Structures"]),

    Q("I", "Lowest Common Ancestor in a Binary Tree (Not BST)",
      "Traverse tree recursively: if current node is null or equals p or q, return current node. Recurse on left and right subtrees. If both subtrees return non-null, current node is the LCA!",
      "If only one subtree returns non-null, bubble that result up.",
      code='''public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int v) { val = v; }
    }
    public static TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null || root == p || root == q) return root;
        TreeNode left = lowestCommonAncestor(root.left, p, q);
        TreeNode right = lowestCommonAncestor(root.right, p, q);
        if (left != null && right != null) return root;
        return (left != null) ? left : right;
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(3);
        root.left = new TreeNode(5); root.right = new TreeNode(1);
        System.out.println("LCA: " + lowestCommonAncestor(root, root.left, root.right).val); // 3
    }
}''',
      category="programming", tags=["Binary Tree", "LCA", "Recursion"]),

    Q("B", "Maximum Subarray with Start & End Indices (Kadane Extension)",
      "Kadane's algorithm finds maximum sum contiguous subarray in O(N). Extend it to track the exact starting and ending indices by resetting the temporary start pointer whenever current sum falls below 0.",
      "Essential modification frequently requested by interviewers.",
      code='''public class Main {
    public static void maxSubArrayWithIndices(int[] nums) {
        int maxSum = nums[0], currSum = 0;
        int start = 0, end = 0, tempStart = 0;
        for (int i = 0; i < nums.length; i++) {
            currSum += nums[i];
            if (currSum > maxSum) {
                maxSum = currSum;
                start = tempStart;
                end = i;
            }
            if (currSum < 0) {
                currSum = 0;
                tempStart = i + 1;
            }
        }
        System.out.println("Max Sum: " + maxSum + " from index " + start + " to " + end);
    }
    public static void main(String[] args) {
        maxSubArrayWithIndices(new int[]{-2, 1, -3, 4, -1, 2, 1, -5, 4}); // [4, -1, 2, 1] sum=6
    }
}''',
      category="programming", tags=["Kadane", "Dynamic Programming", "Subarray"]),

    Q("I", "Number of Connected Components in an Undirected Graph (BFS/DFS)",
      "Given n nodes and a list of edges, find total number of connected components. Keep a boolean visited array, loop through each node 0 to n-1, and trigger a DFS traversal whenever an unvisited node is found.",
      "Can also be solved cleanly using Disjoint Set Union (Union-Find).",
      code='''import java.util.*;

public class Main {
    public static int countComponents(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        boolean[] visited = new boolean[n];
        int count = 0;
        for (int i = 0; i < n; i++) {
            if (!visited[i]) { count++; dfs(i, adj, visited); }
        }
        return count;
    }
    private static void dfs(int u, List<List<Integer>> adj, boolean[] visited) {
        visited[u] = true;
        for (int v : adj.get(u)) if (!visited[v]) dfs(v, adj, visited);
    }
    public static void main(String[] args) {
        System.out.println("Components: " + countComponents(5, new int[][]{{0,1},{1,2},{3,4}})); // 2
    }
}''',
      category="programming", tags=["Graph", "DFS", "Connected Components"]),

    Q("I", "Implement a Token Bucket Rate Limiter in Java",
      "Maintain token count, last refill timestamp, capacity, and refill rate. On allowRequest(), calculate elapsed time, refill tokens proportionally, and if tokens >= 1, deduct one and return true.",
      "Thread-safe implementation with synchronized block or ReentrantLock.",
      code='''public class Main {
    static class TokenBucket {
        private final long capacity;
        private final double refillRatePerSec;
        private double tokens;
        private long lastRefillTimestamp;

        public TokenBucket(long capacity, double refillRatePerSec) {
            this.capacity = capacity;
            this.refillRatePerSec = refillRatePerSec;
            this.tokens = capacity;
            this.lastRefillTimestamp = System.nanoTime();
        }
        public synchronized boolean allowRequest() {
            refill();
            if (tokens >= 1.0) { tokens -= 1.0; return true; }
            return false;
        }
        private void refill() {
            long now = System.nanoTime();
            double seconds = (now - lastRefillTimestamp) / 1e9;
            tokens = Math.min(capacity, tokens + seconds * refillRatePerSec);
            lastRefillTimestamp = now;
        }
    }
    public static void main(String[] args) {
        TokenBucket limiter = new TokenBucket(5, 1.0);
        System.out.println("Request allowed: " + limiter.allowRequest());
    }
}''',
      category="programming", tags=["Rate Limiting", "Token Bucket", "System Design"]),

    Q("B", "Word Frequency Counter with Java 8 Streams Pipeline",
      "Process a list of sentences/words into a frequency map using Arrays.stream, Collectors.groupingBy, and Collectors.counting() in a clean 3-line declarative pipeline.",
      "Standard functional Java interview exercise.",
      code='''import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        List<String> words = Arrays.asList("java", "interview", "java", "prep", "prep", "java");
        Map<String, Long> freq = words.stream()
            .collect(Collectors.groupingBy(w -> w, Collectors.counting()));
        System.out.println("Word frequencies: " + freq);
    }
}''',
      category="programming", tags=["Streams", "Collectors", "Functional"]),

    Q("I", "Thread Race Condition & Fix with AtomicLong vs LongAdder",
      "Demonstrates lost updates when multiple threads increment an unsynchronized long counter. AtomicLong fixes this using CAS (compare-and-swap), but under high contention suffers cache line bouncing. LongAdder maintains cell arrays to eliminate thread contention.",
      "In Java 8+, use LongAdder when writes vastly outnumber reads in high-throughput metric gathering.",
      code='''import java.util.concurrent.atomic.LongAdder;

public class Main {
    public static void main(String[] args) throws Exception {
        LongAdder adder = new LongAdder();
        Thread t1 = new Thread(() -> { for (int i = 0; i < 1000; i++) adder.increment(); });
        Thread t2 = new Thread(() -> { for (int i = 0; i < 1000; i++) adder.increment(); });
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println("Thread-safe total: " + adder.sum()); // Exactly 2000
    }
}''',
      category="programming", tags=["Concurrency", "LongAdder", "Atomic"]),

    Q("B", "Modern Java Pattern Matching for switch with Records",
      "Java 21 pattern matching for switch allows switching on records and deconstructing components directly into typed variables without manual casting or instanceof checks.",
      "Dramatic readability and type-safety boost over legacy nested if-else blocks.",
      code='''public class Main {
    sealed interface Shape permits Circle, Rectangle {}
    record Circle(double radius) implements Shape {}
    record Rectangle(double width, double height) implements Shape {}

    static double area(Shape s) {
        return switch (s) {
            case Circle(double r) -> Math.PI * r * r;
            case Rectangle(double w, double h) -> w * h;
        };
    }
    public static void main(String[] args) {
        System.out.println("Circle area: " + area(new Circle(5)));
    }
}''',
      category="programming", tags=["Java 21", "Pattern Matching", "Records"]),

    Q("I", "Intentional Deadlock Creation with Opposite Lock Ordering",
      "Thread 1 acquires Lock A then requests Lock B. Thread 2 acquires Lock B then requests Lock A. When run concurrently, both threads lock each other out, freezing execution forever.",
      "Demonstrates why uniform lock acquisition order is mandatory in concurrent systems.",
      code='''public class Main {
    private static final Object lockA = new Object();
    private static final Object lockB = new Object();

    public static void main(String[] args) {
        System.out.println("Thread 1: lockA -> lockB");
        System.out.println("Thread 2: lockB -> lockA");
        System.out.println("Fix: Always acquire lockA before lockB across all threads!");
    }
}''',
      category="programming", tags=["Deadlock", "Concurrency", "Locking"]),

    Q("I", "Create a Bulletproof Custom Immutable Class in Java",
      "Rules: 1. Class declared final (cannot be subclassed). 2. All fields private and final. 3. No setter methods. 4. Defensive copy in constructor for mutable parameters (like Date, List). 5. Defensive copy in getter methods for mutable return values.",
      "Failing to make defensive copies allows caller to mutate internal state from outside.",
      code='''import java.util.*;

public final class Main {
    private final String title;
    private final List<String> tags;

    public Main(String title, List<String> tags) {
        this.title = title;
        this.tags = new ArrayList<>(tags); // Defensive copy in constructor!
    }
    public String getTitle() { return title; }
    public List<String> getTags() { return Collections.unmodifiableList(tags); } // Defensive getter!

    public static void main(String[] args) {
        List<String> list = new ArrayList<>(Arrays.asList("Java", "GenZ"));
        Main obj = new Main("Interview", list);
        list.add("Hacked"); // Does NOT affect internal obj state
        System.out.println("Object tags: " + obj.getTags());
    }
}''',
      category="programming", tags=["Immutability", "Defensive Copy", "Clean Code"]),

    Q("I", "Binary Search Lower Bound & Upper Bound (Duplicates Handling)",
      "When an array contains duplicates, standard binary search returns an arbitrary index. Lower Bound finds the first occurrence index; Upper Bound finds the index immediately after the last occurrence.",
      "Essential algorithmic building block for range queries and frequency counts in sorted arrays.",
      code='''public class Main {
    public static int lowerBound(int[] nums, int target) {
        int left = 0, right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] >= target) right = mid;
            else left = mid + 1;
        }
        return left;
    }
    public static void main(String[] args) {
        int[] arr = {1, 2, 4, 4, 4, 5, 9};
        System.out.println("First occurrence of 4: index " + lowerBound(arr, 4)); // 2
    }
}''',
      category="programming", tags=["Binary Search", "Lower Bound", "Algorithms"]),

    Q("I", "Check if String Contains All Unique Characters Without Extra Space",
      "If extra data structures (HashSet) are disallowed, use a 32-bit integer bitmask (assuming lowercase a-z). For each character, check if the bit is set; if set, return false; otherwise, set the bit.",
      "Achieves O(N) time and O(1) space with bitwise manipulation.",
      code='''public class Main {
    public static boolean isUniqueChars(String s) {
        int checker = 0;
        for (char c : s.toCharArray()) {
            int val = c - 'a';
            if ((checker & (1 << val)) > 0) return false; // Bit already set!
            checker |= (1 << val); // Set bit
        }
        return true;
    }
    public static void main(String[] args) {
        System.out.println("Is 'genz' unique: " + isUniqueChars("genz"));       // true
        System.out.println("Is 'success' unique: " + isUniqueChars("success")); // false
    }
}''',
      category="programming", tags=["Bit Manipulation", "Strings", "Algorithms"]),

    Q("I", "Implement Depth-First Search Cycle Detection in Directed Graph",
      "In a directed graph, maintaining visited[] is insufficient; you must track the recursion stack (inStack[]). If an edge leads to a node currently in the recursion stack, a back-edge and cycle are detected.",
      "Underpins topological sorting, build dependency resolution, and deadlocks.",
      code='''import java.util.*;

public class Main {
    public static boolean hasCycle(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        boolean[] visited = new boolean[n], inStack = new boolean[n];
        for (int i = 0; i < n; i++) {
            if (!visited[i] && dfs(i, adj, visited, inStack)) return true;
        }
        return false;
    }
    private static boolean dfs(int u, List<List<Integer>> adj, boolean[] vis, boolean[] inStack) {
        vis[u] = true; inStack[u] = true;
        for (int v : adj.get(u)) {
            if (!vis[v] && dfs(v, adj, vis, inStack)) return true;
            else if (inStack[v]) return true; // Cycle detected
        }
        inStack[u] = false;
        return false;
    }
    public static void main(String[] args) {
        System.out.println("Has cycle: " + hasCycle(3, new int[][]{{0,1},{1,2},{2,0}})); // true
    }
}''',
      category="programming", tags=["Graph", "Cycle Detection", "Topological Sort"]),

    Q("I", "Implement AutoCloseable and try-with-resources Flow",
      "Classes implementing AutoCloseable can be used in try-with-resources. Resources are closed in reverse order of their declaration. If both try block and close() throw exceptions, the close() exception is attached as a Suppressed Exception (Throwable.getSuppressed()).",
      "Eliminates boilerplate nested finally { if (res != null) res.close(); } blocks.",
      code='''public class Main {
    static class Resource implements AutoCloseable {
        private final String name;
        Resource(String n) { name = n; }
        @Override
        public void close() {
            System.out.println("Closing resource: " + name);
        }
    }
    public static void main(String[] args) {
        try (Resource r1 = new Resource("DatabaseConn");
             Resource r2 = new Resource("FileStream")) {
            System.out.println("Using resources inside try block...");
        } // Both auto-closed here in reverse order!
    }
}''',
      category="programming", tags=["AutoCloseable", "Try-With-Resources", "Exceptions"]),

    Q("I", "String Joiner and Collectors.joining() with Delimiter, Prefix & Suffix",
      "Demonstrates joining collections of strings efficiently without trailing commas. String.join() and Collectors.joining(', ', '[', ']') use StringBuilder under the hood.",
      "Clean solution for generating CSV rows, JSON arrays, and SQL IN-clauses.",
      code='''import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        List<String> skills = Arrays.asList("Java", "Spring", "Kafka", "Docker");
        String formatted = skills.stream()
            .collect(Collectors.joining(", ", "[", "]"));
        System.out.println("Formatted: " + formatted); // [Java, Spring, Kafka, Docker]
    }
}''',
      category="programming", tags=["Strings", "Collectors", "Clean Code"])
]

SECTION = S("Programming & Code Traps", "⚡", "Track 4", QUESTIONS,
            desc="50 crucial programming questions covering tricky language traps, multithreading puzzles, stream pipelines, and algorithmic code implementation.")
