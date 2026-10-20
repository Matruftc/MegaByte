"""Sections 7-12: Collections, Generics, Lambdas, Streams, Multithreading, Virtual Threads."""
from schema import Q, S

SECTIONS = [
    S("Java Collections Framework", "🗂️", "Module 7", [
        Q("B", "What is the difference between ArrayList and LinkedList?",
          "ArrayList uses a dynamically resizing array: O(1) random access by index, O(1) amortized append, but O(N) insertion/deletion in the middle. LinkedList uses a doubly linked list: O(N) traversal access, but O(1) insertion/deletion once the node position is located.",
          "In modern hardware, ArrayList is almost always faster than LinkedList due to CPU cache locality and lower memory footprint per element (no Node pointer overhead).",
          '''import java.util.*;

public class ListDemo {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("Java", "Kotlin", "Scala"));
        list.add("Groovy");
        System.out.println("First element: " + list.get(0));
        System.out.println("Total: " + list.size());
    }
}'''),
        Q("A", "How does HashMap work internally in Java 8+?",
          "HashMap is an array of Node buckets. The hash of a key determines its bucket index: hash(key) & (n - 1). Collisions are stored in linked lists. When a bucket reaches >= 8 elements and total table size >= 64, the linked list is transformed into a Red-Black Tree (TreeNode), lowering worst-case lookup from O(N) to O(log N).",
          "The default load factor is 0.75, balancing time and space overhead. When the size reaches capacity * loadFactor, the bucket array doubles in size (rehashing).",
          '''import java.util.*;

public class HashMapDemo {
    public static void main(String[] args) {
        Map<String, Integer> scores = new HashMap<>();
        scores.put("Ada", 95);
        scores.put("James", 99);
        scores.putIfAbsent("Duke", 100);
        System.out.println("James score: " + scores.get("James"));
        System.out.println("Keys: " + scores.keySet());
    }
}'''),
        Q("I", "What is ConcurrentHashMap and how does it achieve high concurrency?",
          "Unlike Hashtable or Collections.synchronizedMap() which lock the entire map on every operation, ConcurrentHashMap uses fine-grained lock striping and compare-and-swap (CAS) operations on individual bucket heads. Reads are non-blocking.",
          "It does not allow null keys or values to avoid ambiguity in concurrent environments.",
          '''import java.util.concurrent.ConcurrentHashMap;

public class ConcurrentMapDemo {
    public static void main(String[] args) {
        ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
        map.put("active_users", 10);
        map.compute("active_users", (k, v) -> v + 1);
        System.out.println("Users: " + map.get("active_users"));
    }
}''')
    ]),

    S("Generics & Type Erasure", "🧬", "Module 8", [
        Q("I", "What is Type Erasure in Java Generics?",
          "Java generics are purely a compile-time mechanism. During compilation, the compiler checks types and then erases generic type parameters to their raw type (or first bound, e.g. Object or Number), inserting casts where necessary. At runtime, List<String> and List<Integer> are both simply List.",
          "Because of type erasure, you cannot do: new T(), instanceof List<String>, or create generic arrays like new T[10].",
          '''import java.util.*;

public class ErasureDemo {
    public static void main(String[] args) {
        List<String> l1 = new ArrayList<>();
        List<Integer> l2 = new ArrayList<>();
        System.out.println("Same runtime class: " + (l1.getClass() == l2.getClass()));
    }
}'''),
        Q("A", "What is the PECS rule (Producer Extends, Consumer Super)?",
          "PECS determines whether to use <? extends T> or <? super T>. If a parameterized collection produces items (read-only), use <? extends T>. If a collection consumes items (write-only), use <? super T>. If you do both, use exact type <T>.",
          "Collections.copy(List<? super T> dest, List<? extends T> src) is the canonical textbook example of PECS in the standard library.",
          '''import java.util.*;

public class PecsDemo {
    static double sumOfNumbers(List<? extends Number> list) {
        double sum = 0.0;
        for (Number n : list) sum += n.doubleValue();
        return sum;
    }

    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 2, 3, 4);
        List<Double> doubles = List.of(1.5, 2.5);
        System.out.println("Ints sum: " + sumOfNumbers(ints));
        System.out.println("Doubles sum: " + sumOfNumbers(doubles));
    }
}''')
    ]),

    S("Functional Interfaces & Lambdas", "λ", "Module 9", [
        Q("B", "What is a Functional Interface in Java?",
          "An interface that declares exactly one abstract method (Single Abstract Method or SAM). It may declare any number of default or static methods. The optional @FunctionalInterface annotation informs the compiler to enforce this rule.",
          "Standard core functional interfaces: Predicate<T> (T -> boolean), Function<T,R> (T -> R), Consumer<T> (T -> void), Supplier<T> (() -> T).",
          '''import java.util.function.*;

public class LambdaDemo {
    public static void main(String[] args) {
        Predicate<String> isShort = s -> s.length() < 5;
        Function<String, Integer> lengthFunc = String::length;
        System.out.println("Is 'Java' short? " + isShort.test("Java"));
        System.out.println("Length of 'Enterprise': " + lengthFunc.apply("Enterprise"));
    }
}'''),
        Q("I", "What are Method References (::) and their four kinds?",
          "Shorthand syntax for lambdas that only call an existing method: 1) Static method: Math::max, 2) Instance method of particular object: System.out::println, 3) Instance method of arbitrary object of particular type: String::toLowerCase, 4) Constructor: ArrayList::new.",
          "Improves readability and avoids boilerplates like (x) -> System.out.println(x).",
          '''import java.util.*;

public class MethodRefDemo {
    public static void main(String[] args) {
        List<String> names = List.of("ada", "james", "duke");
        names.stream()
             .map(String::toUpperCase)
             .forEach(System.out::println);
    }
}''')
    ]),

    S("Stream API & Data Pipelines", "🌊", "Module 10", [
        Q("B", "What is the difference between intermediate and terminal operations in Streams?",
          "Intermediate operations (filter, map, flatMap, sorted, distinct) are lazy and return a new Stream without performing computation. Terminal operations (collect, forEach, reduce, count, findFirst) trigger stream execution and consume the stream.",
          "A stream can only be consumed once. Attempting to invoke a terminal operation on a stream that has already been closed throws IllegalStateException.",
          '''import java.util.*;

public class StreamDemo {
    public static void main(String[] args) {
        List<Integer> numbers = List.of(1, 2, 3, 4, 5, 6);
        int sumOfEvenSquares = numbers.stream()
            .filter(n -> n % 2 == 0)
            .map(n -> n * n)
            .reduce(0, Integer::sum);
        System.out.println("Result: " + sumOfEvenSquares);
    }
}'''),
        Q("I", "How does flatMap() differ from map()?",
          "map(T -> R) transforms each element into exactly one output element (1-to-1 mapping). flatMap(T -> Stream<R>) transforms each element into a stream and flattens all nested streams into a single top-level stream (1-to-many flattening).",
          "Essential when dealing with nested lists or collections inside objects.",
          '''import java.util.*;

public class FlatMapDemo {
    public static void main(String[] args) {
        List<List<String>> matrix = List.of(
            List.of("Java", "JVM"),
            List.of("Spring", "Quarkus")
        );
        List<String> flat = matrix.stream()
            .flatMap(Collection::stream)
            .toList();
        System.out.println(flat);
    }
}'''),
        Q("A", "How do Collectors.groupingBy and partitioningBy work?",
          "groupingBy(classifier) aggregates elements into a Map<K, List<V>> based on key evaluation. partitioningBy(predicate) divides elements into a Map<Boolean, List<V>> based on a true/false condition.",
          "Both accept downstream collectors like counting(), summingInt(), or mapping().",
          '''import java.util.*;
import java.util.stream.Collectors;

public class GroupingDemo {
    public static void main(String[] args) {
        List<String> words = List.of("apple", "banana", "apricot", "cherry", "avocado");
        Map<Character, Long> counts = words.stream()
            .collect(Collectors.groupingBy(w -> w.charAt(0), Collectors.counting()));
        System.out.println(counts);
    }
}''')
    ]),

    S("Multithreading & Core Concurrency", "🧵", "Module 11", [
        Q("B", "What is the difference between Runnable and Callable?",
          "Runnable represents a task with void run() that returns no result and cannot throw checked exceptions. Callable<V> represents a task with V call() throws Exception that returns a computed value and can throw checked exceptions.",
          "Callable is executed via ExecutorService.submit() which returns a Future<V> handle.",
          '''import java.util.concurrent.*;

public class CallableDemo {
    public static void main(String[] args) throws Exception {
        Callable<String> task = () -> "Task Completed in " + Thread.currentThread().getName();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<String> future = executor.submit(task);
        System.out.println(future.get());
        executor.shutdown();
    }
}'''),
        Q("I", "What does the volatile keyword guarantee in Java?",
          "Visibility: changes made by one thread to a volatile variable are immediately flushed to main memory and visible to all other threads (prevents CPU cache incoherence). Ordering: prevents instruction reordering around the volatile read/write via memory barriers.",
          "volatile does NOT guarantee atomicity! For atomic compound operations like count++, use AtomicInteger or synchronized locks.",
          '''import java.util.concurrent.atomic.AtomicInteger;

public class AtomicDemo {
    public static void main(String[] args) {
        AtomicInteger counter = new AtomicInteger(10);
        int updated = counter.incrementAndGet();
        System.out.println("Counter: " + updated);
    }
}''')
    ]),

    S("Modern Concurrency & Virtual Threads", "⚡", "Module 12", [
        Q("I", "What are Virtual Threads in Java 21 (Project Loom)?",
          "Virtual threads are lightweight, user-mode threads managed by the JVM rather than the operating system. While OS platform threads consume ~1MB of stack memory each, virtual threads consume only hundreds of bytes, enabling applications to spawn millions of concurrent threads without thread pool overhead.",
          "When a virtual thread executes a blocking I/O operation (socket read, sleep), the JVM unmounts it from its underlying OS carrier thread, freeing the carrier thread to run other virtual threads.",
          '''public class VirtualThreadDemo {
    public static void main(String[] args) throws Exception {
        Thread vThread = Thread.ofVirtual().start(() -> {
            System.out.println("Running on: " + Thread.currentThread());
        });
        vThread.join();
        System.out.println("Is virtual: " + vThread.isVirtual());
    }
}'''),
        Q("A", "What is thread pinning in Virtual Threads?",
          "Pinning occurs when a virtual thread is executing inside a synchronized block/method or invoking native JNI methods. When pinned, the virtual thread cannot unmount from its carrier thread upon blocking, temporarily monopolizing the underlying OS thread.",
          "In modern Java 21 applications, replace synchronized blocks with java.util.concurrent.locks.ReentrantLock to ensure virtual threads always unmount cleanly during blocking operations.",
          '''import java.util.concurrent.locks.ReentrantLock;

public class LockDemo {
    private static final ReentrantLock lock = new ReentrantLock();

    public static void main(String[] args) {
        lock.lock();
        try {
            System.out.println("ReentrantLock ensures clean virtual thread unmounting");
        } finally {
            lock.unlock();
        }
    }
}''')
    ])
]
