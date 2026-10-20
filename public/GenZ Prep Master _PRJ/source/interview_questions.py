"""50 Essential Technical Interview Questions (90%+ frequency in Tech Interviews).
Covers Java Internals, Concurrency, JVM, Spring Framework, Database, System Design & Networking.
"""
from schema import Q, S

QUESTIONS = [
    Q("B", "What is the difference between == and .equals() in Java?",
      "== compares primitive values or reference memory addresses (whether two references point to the exact same heap object). .equals() compares logical state or content equality if overridden (like in String, Integer, Date).",
      "If equals() is overridden, hashCode() must also be overridden to satisfy the hashing contract, otherwise hash-based collections like HashMap or HashSet will malfunction.",
      code='''public class Main {
    public static void main(String[] args) {
        String s1 = new String("GenZ");
        String s2 = new String("GenZ");
        System.out.println("s1 == s2: " + (s1 == s2));         // false (distinct heap objects)
        System.out.println("s1.equals(s2): " + s1.equals(s2)); // true (same character sequence)
        
        String s3 = "GenZ";
        String s4 = "GenZ";
        System.out.println("s3 == s4: " + (s3 == s4));         // true (both point to String Pool)
    }
}''',
      category="technical", tags=["Java Core", "Memory", "String Pool"]),

    Q("I", "How does HashMap work internally in Java (put, get, resize)?",
      "HashMap uses an array of Node<K, V> buckets. When putting a key, hash(key) calculates the bucket index: (n - 1) & hash. If collisions occur, entries are stored in a linked list. If a bucket's size exceeds TREEIFY_THRESHOLD (8) and array length >= 64, it converts to a Red-Black Tree (O(log N)).",
      "Default load factor is 0.75. When size exceeds 0.75 * capacity, the table doubles in size (rehashing). Java 8 eliminated the infinite loop bug present in Java 7's head-insertion rehashing by using tail-insertion.",
      code='''import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> map = new HashMap<>();
        map.put("Alice", 95);
        map.put("Bob", 88);
        System.out.println("Alice's score: " + map.get("Alice"));
        System.out.println("Bucket calculation: (table.length - 1) & hash");
    }
}''',
      category="technical", tags=["Collections", "HashMap", "Data Structures"]),

    Q("B", "Why is String immutable in Java? Name 4 key reasons.",
      "Strings cannot be modified after creation. Reasons: 1. String Pool caching (sharing literals saves heap memory), 2. Security (sensitive parameters like DB URLs, passwords, file paths cannot be hijacked), 3. Thread-safety (inherently synchronized, readable across threads without locking), 4. HashCode caching (cached at creation, speeding up HashMap lookups).",
      "If String were mutable, a malicious thread could alter a network socket URL after security verification had already succeeded.",
      code='''public class Main {
    public static void main(String[] args) {
        String original = "Interview";
        String modified = original.concat(" Ready");
        System.out.println("Original String remains unchanged: " + original);
        System.out.println("New String returned: " + modified);
    }
}''',
      category="technical", tags=["Java Core", "Security", "Immutability"]),

    Q("I", "Explain Java Garbage Collection generations: Eden, Survivor, Tenured, Metaspace.",
      "The heap is divided into Young and Old generations based on the Weak Generational Hypothesis (most objects die young). Young contains Eden, S0, and S1. Surviving objects move between S0/S1 via Minor GC and age up. Once threshold (default 15) is reached, they promote to Old Generation (Tenured). Metaspace holds class metadata in native off-heap memory.",
      "Minor GC cleans Young Generation (fast, Stop-The-World is very brief). Major/Full GC cleans Old Generation. Modern GCs like G1, ZGC, and Shenandoah use regional partitioning for sub-millisecond pauses.",
      code='''public class Main {
    public static void main(String[] args) {
        long free = Runtime.getRuntime().freeMemory() / (1024 * 1024);
        long total = Runtime.getRuntime().totalMemory() / (1024 * 1024);
        System.out.println("Allocated Heap: " + total + " MB");
        System.out.println("Free Heap: " + free + " MB");
    }
}''',
      category="technical", tags=["JVM", "Garbage Collection", "Memory"]),

    Q("B", "Difference between Interface and Abstract Class in modern Java (Java 8/17/21)?",
      "Abstract classes can have instance state (fields), constructors, and partial implementation; a class can only extend one abstract class. Interfaces define a contract, support multiple inheritance, can contain default and static methods (Java 8), and private helper methods (Java 9), but cannot hold instance state (only public static final constants).",
      "Use abstract classes for 'is-a' relationships sharing state and code (e.g., AbstractHttpServlet). Use interfaces for 'can-do' capabilities (e.g., Runnable, Comparable, AutoCloseable).",
      code='''interface Flyable {
    default void fly() { System.out.println("Flying using default interface method!"); }
}

abstract class Animal {
    String name;
    Animal(String name) { this.name = name; }
    abstract void sound();
}

public class Main {
    public static void main(String[] args) {
        System.out.println("Interfaces can have default methods since Java 8.");
    }
}''',
      category="technical", tags=["OOP", "Java Core", "Architecture"]),

    Q("I", "What is the difference between Synchronized keyword and ReentrantLock?",
      "synchronized is an implicit JVM-level monitor lock (auto-releases on exit or exception). ReentrantLock (java.util.concurrent.locks) is an explicit API offering advanced features: tryLock() with timeouts, fair lock option, lockInterruptibly(), and multiple Condition variables (await/signal).",
      "Always acquire ReentrantLock before try block and release in finally block to prevent permanent deadlocks.",
      code='''import java.util.concurrent.locks.*;

public class Main {
    private static final Lock lock = new ReentrantLock();
    public static void main(String[] args) {
        lock.lock();
        try {
            System.out.println("Critical section protected by ReentrantLock");
        } finally {
            lock.unlock(); // Guaranteed release
        }
    }
}''',
      category="technical", tags=["Concurrency", "Locking", "Multithreading"]),

    Q("I", "How does ThreadPoolExecutor work? Explain core vs max pool size and queueing.",
      "When a task arrives: 1. If active threads < corePoolSize, a new core thread is spawned. 2. If core threads are busy, task is placed into the BlockingQueue. 3. If queue is full and threads < maxPoolSize, a non-core thread is spawned. 4. If queue is full and maxPoolSize is reached, the RejectedExecutionHandler triggers (Abort, CallerRuns, Discard, DiscardOldest).",
      "Never use Executors.newCachedThreadPool() or newFixedThreadPool() in production because they use unbounded queues or unbounded threads, leading to OutOfMemoryError.",
      code='''import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
            2, 4, 60L, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(10),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
        executor.submit(() -> System.out.println("Task executed on thread: " + Thread.currentThread().getName()));
        executor.shutdown();
    }
}''',
      category="technical", tags=["Concurrency", "ThreadPool", "Production"]),

    Q("I", "What is the volatile keyword and how does it relate to Java Memory Model (JMM)?",
      "volatile guarantees Visibility and Ordering, but NOT Atomicity. It ensures reads and writes go directly to main memory (RAM) instead of being cached in CPU L1/L2 registers. It also prevents instruction reordering via memory barriers (load-load, store-store).",
      "volatile count++ is NOT thread-safe because increment is 3 CPU operations (read, modify, write). For atomicity, use AtomicInteger or LongAdder.",
      code='''public class Main {
    private static volatile boolean running = true;
    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            while (running) { /* CPU reads main memory on each check */ }
            System.out.println("Worker stopped cleanly!");
        });
        worker.start();
        Thread.sleep(100);
        running = false; // Immediately visible to worker thread
        worker.join();
    }
}''',
      category="technical", tags=["Concurrency", "JMM", "Memory Barrier"]),

    Q("B", "What are the 4 Coffman conditions for Deadlock and how do you prevent them?",
      "Deadlock requires: 1. Mutual Exclusion (resource held exclusively), 2. Hold and Wait (holding one lock while waiting for another), 3. No Preemption (resource cannot be forcibly taken), 4. Circular Wait (T1 waits for T2, T2 waits for T1).",
      "Break Circular Wait by always acquiring locks in a strict global alphabetical or numeric order. Alternatively, use tryLock() with timeouts to back off and release held locks.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Rule 1: Always acquire locks in uniform global order.");
        System.out.println("Rule 2: Use tryLock(timeout) instead of blocking indefinitely.");
    }
}''',
      category="technical", tags=["Concurrency", "Deadlock", "OS"]),

    Q("B", "Checked vs Unchecked Exceptions: philosophy and best practices?",
      "Checked exceptions (subclasses of Exception except RuntimeException) must be declared in throws or caught in try-catch. They model recoverable environmental failures (e.g. FileNotFoundException, SQLException). Unchecked exceptions (subclasses of RuntimeException) represent programming logic errors (NullPointerException, IllegalArgumentException).",
      "Modern frameworks (Spring, Hibernate) favor unchecked exceptions so business layers aren't polluted with boilerplate catch-rethrow blocks.",
      code='''public class Main {
    public static void validateAge(int age) {
        if (age < 0) throw new IllegalArgumentException("Age cannot be negative: " + age);
    }
    public static void main(String[] args) {
        validateAge(22);
        System.out.println("Validation passed successfully!");
    }
}''',
      category="technical", tags=["Exceptions", "Java Core", "Error Handling"]),

    Q("I", "Fail-fast vs Fail-safe iterators in Java Collections?",
      "Fail-fast iterators (e.g. ArrayList, HashMap, HashSet) check the collection's modCount. If modified concurrently while iterating, they immediately throw ConcurrentModificationException. Fail-safe (weakly consistent) iterators (e.g. CopyOnWriteArrayList, ConcurrentHashMap) operate on a clone or snapshot and never throw this exception.",
      "To safely delete an element during iteration in fail-fast collections, always use iterator.remove() instead of list.remove().",
      code='''import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));
        Iterator<String> it = list.iterator();
        while (it.hasNext()) {
            if (it.next().equals("B")) it.remove(); // Safe removal
        }
        System.out.println("Remaining items: " + list);
    }
}''',
      category="technical", tags=["Collections", "Concurrency", "Iterators"]),

    Q("B", "Comparable vs Comparator: difference and modern lambda usage?",
      "Comparable<T> defines the natural ordering of a class by implementing int compareTo(T o). Comparator<T> defines external custom ordering logic using int compare(T o1, T o2). A class can have only one natural ordering, but multiple custom Comparators.",
      "Modern Java provides fluent Comparator factory methods like Comparator.comparing(Employee::getSalary).reversed().thenComparing(Employee::getName).",
      code='''import java.util.*;

public class Main {
    record Student(String name, int score) {}
    public static void main(String[] args) {
        List<Student> list = Arrays.asList(new Student("Leo", 88), new Student("Zoe", 95));
        list.sort(Comparator.comparing(Student::score).reversed());
        System.out.println("Top student: " + list.get(0).name());
    }
}''',
      category="technical", tags=["Java Core", "Streams", "Lambdas"]),

    Q("I", "Java 8 Streams: Intermediate vs Terminal operations and lazy evaluation?",
      "Intermediate operations (filter, map, flatMap, sorted, distinct) return a new Stream and are lazily evaluated—no computation occurs until a terminal operation is called. Terminal operations (collect, forEach, reduce, count, anyMatch) trigger traversal and consume the stream.",
      "Streams fuse operations into a single pass over the data, avoiding intermediate collection allocations. Streams cannot be reused once terminated.",
      code='''import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("apple", "banana", "apricot", "cherry");
        List<String> result = names.stream()
            .filter(s -> s.startsWith("a"))
            .map(String::toUpperCase)
            .collect(Collectors.toList());
        System.out.println("Result: " + result);
    }
}''',
      category="technical", tags=["Streams", "Functional Programming", "Java 8"]),

    Q("A", "Java 21 Virtual Threads (Project Loom) vs Platform (OS) Threads?",
      "Platform threads map 1:1 to OS kernel threads, consuming ~1MB stack memory and requiring expensive kernel context switches (limiting concurrency to thousands). Virtual threads are lightweight user-mode threads managed by JVM (Project Loom), consuming ~few KBs. When a virtual thread executes blocking I/O, the JVM unmounts it from its OS carrier thread.",
      "Virtual threads enable high-throughput server architectures with simple synchronous code without reactive complexity (WebFlux/RxJava).",
      code='''public class Main {
    public static void main(String[] args) throws Exception {
        Thread vThread = Thread.ofVirtual().start(() -> {
            System.out.println("Running on Virtual Thread: " + Thread.currentThread());
        });
        vThread.join();
    }
}''',
      category="technical", tags=["Java 21", "Project Loom", "High Performance"]),

    Q("B", "Java Records vs Lombok @Data vs traditional POJOs?",
      "Java Records (Java 16+) are immutable data carriers. The compiler automatically synthesizes private final fields, canonical constructor, accessors (x(), not getX()), equals(), hashCode(), and toString(). Unlike Lombok, Records are native bytecode constructs, serialization-safe, and disallow inheritance.",
      "Records represent transparent data tuples. Use traditional classes only when mutable state or inheritance is required.",
      code='''public class Main {
    public record User(String username, String email) {}
    public static void main(String[] args) {
        User user = new User("dev", "dev@genz.com");
        System.out.println("Record toString: " + user);
        System.out.println("Accessor: " + user.username());
    }
}''',
      category="technical", tags=["Java Core", "Records", "Clean Code"]),

    Q("I", "What is the ClassLoader hierarchy and Delegation Model in Java?",
      "ClassLoaders load .class bytecodes into JVM memory. The hierarchy: 1. Bootstrap ClassLoader (loads core rt.jar / java.base), 2. Platform/Extension ClassLoader, 3. Application/System ClassLoader (loads classpath). It follows Delegation Principle: a loader always delegates to its parent before searching locally.",
      "This prevents malicious code from replacing core JDK classes (e.g. java.lang.String) with compromised custom implementations.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("App ClassLoader: " + Main.class.getClassLoader());
        System.out.println("Parent ClassLoader: " + Main.class.getClassLoader().getParent());
        System.out.println("Bootstrap ClassLoader (null in Java): " + String.class.getClassLoader());
    }
}''',
      category="technical", tags=["JVM", "ClassLoader", "Security"]),

    Q("A", "What is the Java Memory Model (JMM) happens-before relationship?",
      "JMM defines rules that guarantee memory visibility between threads without explicit locks: 1. Program order rule (within single thread), 2. Monitor lock rule (unlock happens-before lock), 3. Volatile variable rule (write happens-before subsequent read), 4. Thread start rule (start() happens-before actions in started thread), 5. Transitivity.",
      "Without a happens-before relationship, compiler and CPU hardware can aggressively reorder memory instructions.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Happens-before guarantees visibility without cache staleness.");
    }
}''',
      category="technical", tags=["JMM", "Concurrency", "JVM Internals"]),

    Q("I", "What are Strong, Soft, Weak, and Phantom References in Java?",
      "StrongReference: standard reference (obj = new Object()); never GC'd as long as reachable. SoftReference: GC'd only when heap is low on memory (ideal for memory-sensitive caches). WeakReference: GC'd immediately during next GC cycle if no strong refs exist (WeakHashMap). PhantomReference: used with ReferenceQueue for clean off-heap resource cleanup.",
      "WeakHashMap cleans up cached values automatically when the key is no longer in use anywhere in the application.",
      code='''import java.lang.ref.*;

public class Main {
    public static void main(String[] args) {
        WeakReference<String> weakRef = new WeakReference<>(new String("Temp Data"));
        System.out.println("Before GC: " + weakRef.get());
        System.gc();
        System.out.println("After GC, WeakReference may be collected.");
    }
}''',
      category="technical", tags=["JVM", "Memory", "Garbage Collection"]),

    Q("I", "Java Serialization: serialVersionUID, transient keyword, and security risks?",
      "Serialization converts an object into a byte stream. serialVersionUID verifies that sender and receiver have compatible classes. If omitted, JVM computes one at runtime—any minor code change causes InvalidClassException. transient fields are skipped during serialization (e.g. passwords).",
      "Native Java serialization is notorious for Remote Code Execution (RCE) gadget chains. Enterprise systems standardize on JSON, Protocol Buffers, or Avro.",
      code='''import java.io.*;

public class Main {
    static class Account implements Serializable {
        private static final long serialVersionUID = 1L;
        String user = "admin";
        transient String token = "secret123"; // Excluded from serialization
    }
    public static void main(String[] args) {
        System.out.println("Transient fields are excluded during serialization.");
    }
}''',
      category="technical", tags=["Java Core", "Serialization", "Security"]),

    Q("B", "Explain ACID properties in Database transactions and their real-world meaning.",
      "A - Atomicity: all operations succeed or all rollback (no partial state). C - Consistency: database moves from one valid state to another, preserving integrity constraints. I - Isolation: concurrent transactions do not interfere with each other. D - Durability: once committed, data survives power outages and crashes via Write-Ahead Log (WAL).",
      "In bank transfers: debiting Account A and crediting Account B must be atomic. If server crashes midway, WAL ensures atomicity.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("ACID: Atomicity, Consistency, Isolation, Durability");
    }
}''',
      category="technical", tags=["Database", "ACID", "Transactions"]),

    Q("I", "What are SQL Transaction Isolation Levels and read phenomena (Dirty, Non-repeatable, Phantom)?",
      "1. Read Uncommitted: allows Dirty Reads (reading uncommitted changes). 2. Read Committed (Postgres/Oracle default): prevents dirty reads, allows Non-repeatable Reads (re-reading a row gets updated data). 3. Repeatable Read (MySQL default): prevents non-repeatable reads, allows Phantom Reads (new rows inserted). 4. Serializable: full isolation using locks or MVCC range locks.",
      "Higher isolation levels prevent anomalies at the cost of concurrency and throughput.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Postgres default: Read Committed | MySQL default: Repeatable Read");
    }
}''',
      category="technical", tags=["Database", "SQL", "Isolation Levels"]),

    Q("B", "SQL vs NoSQL: how do you choose the right database for a project?",
      "Choose SQL (PostgreSQL, MySQL) when: relational schemas, complex JOINs, ACID guarantees, financial transactions, and structured schemas are required. Choose NoSQL: Document (MongoDB) for flexible hierarchical JSON; Key-Value (Redis) for ultra-fast caching and sessions; Wide-Column (Cassandra) for massive write-heavy timeseries; Graph (Neo4j) for social networks.",
      "Modern enterprise architectures use Polyglot Persistence: PostgreSQL as source of truth, Redis for caching, Elasticsearch for search.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Polyglot Persistence: Pick the right tool for each access pattern.");
    }
}''',
      category="technical", tags=["Database", "System Design", "Architecture"]),

    Q("I", "Database Indexing: B-Tree vs Hash index, clustered vs non-clustered, leftmost prefix rule?",
      "B-Tree indices store sorted data in balanced tree nodes, supporting range queries (<, >) and sorting (O(log N)). Hash index supports exact lookups (O(1)) but cannot do range queries. Clustered index determines physical storage order of table rows (one per table, usually Primary Key). Non-clustered index stores index key with pointer to row ID.",
      "Composite index on (A, B, C) can only be used by queries filtering on (A), (A, B), or (A, B, C) due to the Leftmost Prefix Rule.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("EXPLAIN ANALYZE SELECT * FROM users WHERE status = 'ACTIVE';");
    }
}''',
      category="technical", tags=["Database", "Indexing", "Performance"]),

    Q("I", "What is the N+1 Query Problem in ORMs (Hibernate/JPA) and how to fix it?",
      "Occurs when fetching a list of N entities and then accessing a lazily-loaded relationship on each entity, resulting in 1 initial query plus N individual queries to fetch related entities (N+1 total queries). Fixes: 1. JOIN FETCH in JPQL, 2. @EntityGraph, 3. @BatchSize(size = 20) to batch IDs with WHERE id IN (...).",
      "Always inspect generated SQL queries using spring.jpa.show-sql=true or p6spy during development.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Fix in JPQL: SELECT u FROM User u JOIN FETCH u.orders");
    }
}''',
      category="technical", tags=["JPA", "Hibernate", "Performance"]),

    Q("I", "Database Sharding vs Partitioning vs Replication?",
      "Replication copies the full database to multiple servers (Master handles writes, Replicas handle read traffic). Partitioning splits a large table into smaller physical chunks on the same database server (e.g. partition by year). Sharding distributes rows across entirely separate physical database instances based on a Shard Key (e.g. user_id % 4).",
      "Sharding scales writes horizontally but introduces complex distributed transactions and cross-shard join challenges.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Replication = scale reads. Sharding = scale writes across servers.");
    }
}''',
      category="technical", tags=["Database", "Scaling", "System Design"]),

    Q("I", "Explain the CAP Theorem and PACELC Extension with examples.",
      "CAP: In a distributed system with Network Partitions (P), you must choose between Consistency (C - all nodes see same data simultaneously) or Availability (A - every request gets non-error response). CP systems (HBase, MongoDB, ZooKeeper) favor consistency; AP systems (Cassandra, DynamoDB) favor availability.",
      "PACELC adds: If Partition (P), choose A or C; Else (E), choose Latency (L) or Consistency (C). Even in normal network state, there is a trade-off between speed and data freshness.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Network partitions are inevitable in distributed systems. Choose CP or AP.");
    }
}''',
      category="technical", tags=["Distributed Systems", "CAP Theorem", "Architecture"]),

    Q("B", "REST vs GraphQL vs gRPC: when to use each in enterprise systems?",
      "REST: HTTP/JSON, standard verbs (GET, POST, PUT, DELETE), universal caching via HTTP headers, best for public web APIs. GraphQL: single endpoint where clients request exact fields, eliminating over-fetching/under-fetching, best for complex frontend dashboards and mobile apps. gRPC: HTTP/2 binary Protocol Buffers, bidirectional streaming, lowest latency, best for internal microservice-to-microservice RPC.",
      "Use REST or GraphQL on the API Gateway facing frontend clients; use gRPC internally between backend microservices.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Frontend -> Gateway: REST/GraphQL. Microservice <-> Microservice: gRPC.");
    }
}''',
      category="technical", tags=["API", "REST", "gRPC", "GraphQL"]),

    Q("B", "What happens when you type a URL into a browser and press Enter?",
      "1. Browser checks DNS cache (browser -> OS -> router -> ISP recursive resolver -> Authoritative DNS). 2. TCP 3-way handshake established with server IP. 3. TLS handshake completes (certificate validation, session key negotiation). 4. Browser sends HTTP GET request. 5. Reverse proxy (Nginx) / Load Balancer routes to backend server. 6. Server returns HTML/CSS/JS. 7. Browser parses DOM, builds Render Tree, and paints screen.",
      "Understanding this entire lifecycle is asked in 90% of full-stack and backend interviews.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("DNS -> TCP -> TLS -> HTTP GET -> Server Process -> Render Tree");
    }
}''',
      category="technical", tags=["Networking", "Web", "System Design"]),

    Q("I", "HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)?",
      "HTTP/1.1 suffers from Head-of-Line (HoL) blocking on TCP connections; browsers open 6 parallel TCP connections per domain. HTTP/2 introduces binary framing and multiplexing over a single TCP connection, HPACK header compression, and server push. HTTP/3 replaces TCP with QUIC over UDP, eliminating TCP packet loss HoL blocking and providing 0-RTT handshakes.",
      "HTTP/3 dramatically improves mobile page loads when users transition between Wi-Fi and cellular networks.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("HTTP/2 = TCP multiplexing. HTTP/3 = QUIC over UDP.");
    }
}''',
      category="technical", tags=["Networking", "HTTP", "Protocols"]),

    Q("I", "Microservices vs Monolith: distributed tracing, API Gateways, and Circuit Breakers?",
      "Monolith is simpler to deploy, debug, and maintain for small teams. Microservices allow independent deployments, horizontal scaling, and tech stack flexibility, but add network latency, distributed transactions, and partial failures. Solutions: API Gateway (routing, auth, rate limiting), Distributed Tracing (OpenTelemetry, Zipkin with traceId/spanId), Circuit Breakers (Resilience4j).",
      "Circuit Breaker pattern states: CLOSED (normal), OPEN (fails fast when failure threshold exceeded, sparing struggling service), HALF-OPEN (tests test traffic before reopening).",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Circuit Breaker prevents cascading failure across distributed systems.");
    }
}''',
      category="technical", tags=["Microservices", "System Design", "Resilience"]),

    Q("I", "Caching strategies: Cache-Aside vs Write-Through vs Write-Behind (Write-Back)?",
      "Cache-Aside (Lazy Loading): app reads cache; if miss, reads DB and populates cache; on write, app invalidates/updates DB and evicts cache. Write-Through: app writes to cache, cache synchronously writes to DB before returning. Write-Behind (Write-Back): app writes to cache, cache acknowledges immediately and batches writes to DB asynchronously (high throughput, risk of data loss on crash).",
      "Redis is typically implemented using Cache-Aside with TTLs to prevent serving stale data forever.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Cache-Aside pattern is the industry standard for Redis and Memcached.");
    }
}''',
      category="technical", tags=["Caching", "Redis", "System Design"]),

    Q("A", "Distributed Locking: Redis Redlock algorithm vs ZooKeeper?",
      "Single-node Redis SET key uuid NX PX 30000 provides basic locking, but if master crashes before replication, another client can acquire the same lock. Redlock algorithm acquires locks across N independent Redis masters sequentially with strict timeouts. ZooKeeper uses sequential ephemeral znodes: the lowest sequence number holds lock, others set watches on the node immediately preceding them.",
      "ZooKeeper provides stronger CP guarantees, while Redis provides higher throughput and sub-millisecond latencies.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Redis: SET lock_key uuid NX PX 30000 (auto-release on crash)");
    }
}''',
      category="technical", tags=["Distributed Systems", "Locking", "Redis"]),

    Q("I", "Message Queues: Apache Kafka vs RabbitMQ?",
      "RabbitMQ is an AMQP smart message broker with flexible routing (exchanges, queues) and message acknowledgments; messages are deleted once consumed. Apache Kafka is a distributed append-only commit log partitioned across topics; messages are retained for days/months; consumers track their own offsets, allowing replayability and massive streaming throughput (millions msg/sec).",
      "Use RabbitMQ for transactional job queues and task routing. Use Kafka for event-driven architecture, metrics, CDC, and high-throughput streaming.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Kafka = Distributed Partitioned Log. RabbitMQ = Smart Broker Queue.");
    }
}''',
      category="technical", tags=["Kafka", "Message Queue", "Architecture"]),

    Q("I", "Rate Limiting algorithms: Token Bucket vs Leaky Bucket vs Sliding Window Counter?",
      "Token Bucket: tokens added to bucket at steady rate up to max capacity; request consumes token; permits bursts of traffic. Leaky Bucket: requests enter queue and leak out at a constant rate; smooths bursts into steady stream. Sliding Window Counter: partitions time into sub-windows, calculating weighted request count across current and previous window to prevent boundary spikes.",
      "Redis token bucket implemented via Lua script ensures atomic token deduction and zero race conditions.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Token Bucket allows traffic bursts; Leaky Bucket forces smooth flow.");
    }
}''',
      category="technical", tags=["System Design", "Rate Limiting", "Security"]),

    Q("B", "Explain SOLID Principles with concrete software examples.",
      "S - Single Responsibility: class should have one reason to change. O - Open/Closed: open for extension, closed for modification (interfaces/strategies). L - Liskov Substitution: subtypes must be substitutable for base types without breaking behavior. I - Interface Segregation: client should not depend on methods it doesn't use (small, focused interfaces). D - Dependency Inversion: depend on abstractions, not concrete implementations.",
      "Applying SOLID creates maintainable code that can be refactored and tested in isolation.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("SOLID: Single-Resp, Open-Closed, Liskov, Interface-Seg, Dep-Inversion");
    }
}''',
      category="technical", tags=["OOP", "SOLID", "Clean Code"]),

    Q("B", "What is Dependency Injection (DI) and Inversion of Control (IoC) in Spring?",
      "IoC transfers control of object lifecycle and configuration from programmer to container (Spring ApplicationContext). DI is the mechanism where the container injects dependent objects via Constructor Injection, Setter Injection, or Field Injection. Constructor injection is recommended because it enables immutability (final fields) and easy unit testing with mock objects.",
      "Avoid @Autowired field injection because it prevents testing without a heavy Spring context runner.",
      code='''// Modern Spring constructor injection
class OrderService {
    private final PaymentGateway gateway;
    public OrderService(PaymentGateway gateway) { // Injected automatically
        this.gateway = gateway;
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println("Constructor injection guarantees dependencies are initialized and non-null.");
    }
}''',
      category="technical", tags=["Spring", "IoC", "Dependency Injection"]),

    Q("I", "What are Spring Bean Scopes and what are the concurrency dangers of Singleton scope?",
      "Scopes: Singleton (default, one instance per Spring container), Prototype (new instance every injection), Request (one per HTTP request), Session (one per HTTP session), Application (one per ServletContext). Singleton beans are shared across all incoming web request threads simultaneously; if a singleton bean has mutable instance fields, race conditions will occur.",
      "Spring controllers and services should always be stateless, or encapsulate state inside method-local variables.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Spring Singleton beans MUST be stateless to ensure thread-safety.");
    }
}''',
      category="technical", tags=["Spring", "Concurrency", "Bean Scopes"]),

    Q("I", "How does Spring @Transactional work under the hood and why does self-invocation fail?",
      "Spring uses dynamic proxies (JDK dynamic proxy or CGLIB). When a method annotated with @Transactional is called from another bean, the proxy intercepts the call, starts a DB transaction, invokes target method, commits if successful, and rolls back on RuntimeException. If methodA() calls methodB() within the same class (self-invocation), the call bypasses the proxy, and @Transactional is completely ignored.",
      "By default, @Transactional only rolls back on unchecked exceptions (RuntimeException / Error); use @Transactional(rollbackFor = Exception.class) to include checked exceptions.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Self-invocation bypasses Spring AOP proxy, disabling @Transactional!");
    }
}''',
      category="technical", tags=["Spring", "Transactions", "AOP"]),

    Q("I", "OAuth 2.0 vs JWT: Authorization Code Grant flow and token structure?",
      "OAuth 2.0 is an authorization delegation framework. The standard Authorization Code Grant flow: 1. User redirects to Auth Server login. 2. Auth Server redirects to client app with temporary auth_code. 3. Client exchanges code + client_secret with Auth Server on backend for Access Token and Refresh Token. JWT is a self-contained token format: Header (algorithm), Payload (claims, expiry), Signature (HMAC or RSA).",
      "Never store sensitive JWTs in browser localStorage due to XSS vulnerability; use httpOnly, secure, sameSite cookies.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("JWT Structure: Base64(Header) . Base64(Payload) . HMAC-SHA256(Signature)");
    }
}''',
      category="technical", tags=["Security", "OAuth", "JWT"]),

    Q("B", "What is CORS (Cross-Origin Resource Sharing) and how do preflight requests work?",
      "CORS is a browser security mechanism that blocks web pages from making AJAX requests to a different domain, port, or protocol unless the target server explicitly permits it. For non-simple requests (custom headers like Authorization, or PUT/DELETE/PATCH), browser first sends an HTTP OPTIONS preflight request to check Access-Control-Allow-Origin and allowed methods.",
      "CORS is enforced by the browser, not the server. Postman or backend curl commands are unaffected by CORS.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Response Header: Access-Control-Allow-Origin: https://app.genz.com");
    }
}''',
      category="technical", tags=["Security", "CORS", "Web"]),

    Q("B", "Process vs Thread: context switching, memory sharing, and IPC?",
      "A process is an executing program instance with its own private virtual memory address space (heap, stack, data, file descriptors). A thread is the smallest unit of execution within a process; all threads in a process share the same heap, global variables, and open files, but have their own private execution stacks. Inter-Process Communication (IPC) requires sockets, pipes, or shared memory.",
      "Thread context switching is fast because memory page tables don't need to be swapped; process context switching is expensive because CPU TLB cache must be flushed.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Threads share process heap memory; processes have isolated memory spaces.");
    }
}''',
      category="technical", tags=["OS", "Processes", "Concurrency"]),

    Q("I", "Virtual Memory & Paging: page tables, TLB, and thrashing?",
      "Virtual memory provides each process the illusion of a large, contiguous memory space while mapping virtual addresses to non-contiguous physical RAM frames via Page Tables. Translation Lookaside Buffer (TLB) is a fast hardware CPU cache of recent virtual-to-physical address mappings. Thrashing occurs when system RAM is exhausted and the OS spends more time swapping pages to disk than executing code.",
      "When a process accesses an unmapped virtual address, the CPU raises a Page Fault interrupt to load the page from disk into RAM.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("TLB cache hit: < 1ns. Page fault disk fetch: ~10,000,000ns (10ms).");
    }
}''',
      category="technical", tags=["OS", "Virtual Memory", "Paging"]),

    Q("B", "TCP 3-Way Handshake and 4-Way Teardown (SYN, ACK, FIN, TIME_WAIT)?",
      "Handshake: 1. Client sends SYN (seq=x). 2. Server replies SYN-ACK (seq=y, ack=x+1). 3. Client sends ACK (ack=y+1) and connection is ESTABLISHED. Teardown: 1. Client sends FIN. 2. Server sends ACK. 3. Server sends FIN. 4. Client sends ACK and enters TIME_WAIT state (typically 2 * MSL = 60s) before closing.",
      "TIME_WAIT ensures late duplicate packets from the closed connection do not corrupt a newly opened connection reusing the same port number.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Handshake: SYN -> SYN-ACK -> ACK. Teardown: FIN -> ACK -> FIN -> ACK.");
    }
}''',
      category="technical", tags=["Networking", "TCP", "Protocols"]),

    Q("I", "HTTPS & TLS Handshake: symmetric vs asymmetric encryption?",
      "HTTPS secures HTTP using TLS. Asymmetric encryption (RSA or ECDHE public/private key pairs) is slow and used only during the initial handshake to authenticate server identity via CA certificates and securely negotiate a shared session key. Symmetric encryption (AES-256-GCM) is extremely fast and encrypts the actual ongoing application data.",
      "Modern TLS 1.3 optimizes the handshake to a single round-trip (1-RTT) and supports 0-RTT resumption.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Handshake: Asymmetric encryption -> Data transfer: Fast symmetric AES.");
    }
}''',
      category="technical", tags=["Security", "HTTPS", "Cryptography"]),

    Q("B", "How to prevent SQL Injection and Cross-Site Scripting (XSS)?",
      "SQL Injection prevention: always use PreparedStatements or ORMs with parameterized queries. Parameterization treats user input strictly as literal data rather than executable SQL syntax. XSS prevention: HTML entity encoding of dynamic outputs, validating inputs, using Content Security Policy (CSP) HTTP headers, and storing session tokens in httpOnly cookies.",
      "Never construct SQL via string concatenation: 'SELECT * FROM users WHERE user = \\'' + input + '\\''.",
      code='''import java.sql.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Always use: PreparedStatement ps = conn.prepareStatement(\\\"SELECT * FROM users WHERE id = ?\\\");");
        System.out.println("ps.setInt(1, userId);");
    }
}''',
      category="technical", tags=["Security", "SQL Injection", "XSS"]),

    Q("B", "Docker vs Virtual Machines: Linux namespaces, cgroups, and image layers?",
      "VMs run a complete guest OS on top of a Hypervisor, allocating dedicated virtual hardware (heavy, gigabytes, minutes to boot). Docker containers run as isolated processes directly on the host OS kernel using Linux Namespaces (isolated PID, net, mount, IPC) and Cgroups (CPU, RAM, I/O limits). Docker images consist of immutable read-only layers with copy-on-write storage.",
      "Containers share the host kernel, enabling sub-second startup times and high density per server.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Containers isolate process via Namespaces & Control Groups (cgroups).");
    }
}''',
      category="technical", tags=["DevOps", "Docker", "Containers"]),

    Q("I", "Kubernetes Architecture: Pods, Services, Deployments, and Control Plane?",
      "Control Plane: kube-apiserver (REST gateway), etcd (distributed key-value store of cluster state), kube-scheduler (assigns pods to nodes), kube-controller-manager (enforces desired state). Worker Nodes: kubelet (node agent communicating with apiserver), kube-proxy (network routing and load balancing), container runtime (containerd).",
      "A Pod is the smallest deployable unit (one or more tightly-coupled containers sharing network namespace and storage volumes).",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("K8s control loop continuously reconciles actual state to match desired state.");
    }
}''',
      category="technical", tags=["Kubernetes", "DevOps", "Cloud"]),

    Q("A", "Eventual Consistency vs Strong Consistency: Quorum Reads and Writes?",
      "In distributed databases like Cassandra or DynamoDB: N is replication factor, W is write quorum, R is read quorum. If W + R > N, you get Strong Consistency because read and write sets must overlap at least one up-to-date node. If W + R <= N, you get Eventual Consistency (faster, lower latency, higher availability, but client might read stale data).",
      "Example: with N=3, setting W=2 and R=2 guarantees reading the latest written value.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Strong Consistency Quorum Formula: W + R > N");
    }
}''',
      category="technical", tags=["Distributed Systems", "Cassandra", "Consistency"]),

    Q("A", "Consistent Hashing: why is it used in DynamoDB, Memcached, and CDNs?",
      "Traditional hash mod N (hash(key) % N) requires remapping almost 100% of keys when adding or removing a node (disastrous for caches and storage). Consistent Hashing maps both keys and servers to points on a 360-degree hash ring (0 to 2^32 - 1). A key is assigned to the first server encountered clockwise. Adding/removing a server only remaps K / N keys on average.",
      "Virtual Nodes (vnodes) are used to distribute load evenly across physical nodes and eliminate hot spots.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Consistent Hashing reallocates only K/N keys when cluster size changes.");
    }
}''',
      category="technical", tags=["System Design", "Consistent Hashing", "Architecture"]),

    Q("A", "How would you design a URL Shortener like Bitly (System Design)?",
      "Requirements: Shorten long URL to 7 alphanumeric characters (base62: a-z, A-Z, 0-9 = 62^7 ~ 3.5 trillion URLs). High read-to-write ratio (100:1). Architecture: 1. API Gateway routes requests. 2. Distributed ID generator (Snowflake or DB auto-increment sequence) produces a 64-bit integer ID. 3. Convert ID to Base62 string. 4. Store in NoSQL/RDBMS (short_hash, original_url, created_at, user_id). 5. Cache hot URLs in Redis with LRU. 6. Return HTTP 302 (Found) redirect for analytics tracking (or 301 for browser caching).",
      "Handling collisions: by using unique auto-increment sequence IDs converted to Base62, collisions are mathematically impossible.",
      code='''public class Main {
    public static void main(String[] args) {
        System.out.println("Base62 Encoding: 62^7 = 3,521,614,606,208 unique short URLs!");
    }
}''',
      category="technical", tags=["System Design", "High Scale", "Bitly"])
]

SECTION = S("Technical Interview Questions", "🎯", "Track 2", QUESTIONS,
            desc="50 core technical questions asked in 90%+ of engineering interviews covering Java Internals, Concurrency, Spring Boot, Databases, Networking, and System Design.")
