"""'Predict the result' puzzles and playground starter queries.

Every puzzle is run against the MegaMart sample database by the generator; its real result becomes
the correct option (values joined with " | ", one line per row). Only the distractors are written here.
"""
from schema import C

CHALLENGES = [
    C(2, "B", "SELECT COUNT(*) FROM employees WHERE email IS NULL;",
      "Only Priya Singh has no email. `IS NULL` is the correct way to test for missing values.",
      ["0", "12", "NULL"]),
    C(4, "I", "SELECT COUNT(*), COUNT(dept_id), COUNT(DISTINCT dept_id)\nFROM employees;",
      "`COUNT(*)` counts all 12 rows, `COUNT(dept_id)` skips Divya's NULL (11), and there are 5 distinct departments.",
      ["12 | 12 | 5", "12 | 11 | 6", "11 | 11 | 5"]),
    C(2, "A", "-- 4 of the 12 employees are in department 2\nSELECT COUNT(*) FROM employees WHERE dept_id <> 2;",
      "Divya's `dept_id` is NULL, and `NULL <> 2` is UNKNOWN, not TRUE, so she is excluded too: 12 − 4 − 1 = 7.",
      ["8", "12", "4"]),
    C(3, "B", "SELECT 7 / 2, 7 / 2.0;",
      "Integer divided by integer truncates in SQLite (and PostgreSQL, SQL Server). Make one side a decimal to keep the fraction.",
      ["3.5 | 3.5", "3 | 3", "4 | 3.5"]),
    C(3, "I", "SELECT NULL = NULL, NULL IS NULL;",
      "Comparing NULL with `=` gives NULL (unknown), while `IS NULL` gives true (1 in SQLite).",
      ["1 | 1", "0 | 1", "NULL | NULL"]),
    C(3, "B", "SELECT COALESCE(NULL, NULL, 'x', 'y');",
      "`COALESCE` returns the first non-NULL argument.",
      ["NULL", "y", "x | y"]),
    C(3, "I", "SELECT 'SQL' || NULL;",
      "Concatenating with NULL gives NULL in standard SQL (SQLite, PostgreSQL). Wrap nullable parts in `COALESCE`.",
      ["SQL", "SQLNULL", "SQL "]),
    C(4, "A", "SELECT AVG(v) FROM (\n  SELECT 10 AS v UNION ALL SELECT NULL UNION ALL SELECT 20\n);",
      "AVG ignores NULLs: (10 + 20) / 2 = 15, not 30 / 3 = 10.",
      ["10", "NULL", "30"]),
    C(5, "I", "SELECT COUNT(*)\nFROM customers c LEFT JOIN orders o ON o.customer_id = c.id;",
      "15 matched order rows, plus one row each for the two customers without orders (Neha and Omar) = 17.",
      ["15", "10", "25"]),
    C(5, "B", "SELECT COUNT(*)\nFROM customers c JOIN orders o ON o.customer_id = c.id;",
      "An inner join keeps only matching rows: one per order, so 15. Customers without orders disappear.",
      ["10", "17", "8"]),
    C(5, "B", "SELECT COUNT(*) FROM departments CROSS JOIN departments;",
      "A cross join produces every combination: 5 × 5 = 25 rows.",
      ["5", "10", "Error: ambiguous table"]),
    C(2, "A", "SELECT COUNT(*) FROM employees\nWHERE dept_id NOT IN (1, NULL);",
      "`x NOT IN (1, NULL)` means `x <> 1 AND x <> NULL`; the second part is never TRUE, so no row qualifies.",
      ["8", "9", "11"]),
    C(2, "I", "SELECT COUNT(*) FROM employees\nWHERE dept_id NOT IN (1, 2);",
      "Departments 3, 4 and 5 have 2 + 1 + 1 = 4 people. Divya (NULL department) is excluded because `NULL NOT IN (...)` is unknown.",
      ["5", "3", "0"]),
    C(2, "B", "SELECT name FROM products\nORDER BY price DESC LIMIT 1 OFFSET 2;",
      "Prices descending: Laptop Pro 14, Standing Desk, Office Chair… `OFFSET 2` skips the first two.",
      ["Standing Desk", "Laptop Pro 14", "Coffee Maker"]),
    C(2, "B", "SELECT DISTINCT country FROM customers\nWHERE country LIKE 'U%' ORDER BY country;",
      "`U%` means \"starts with U\": UAE, UK and USA, sorted alphabetically.",
      ["UK\nUSA", "USA\nUK\nUAE", "UAE\nUK\nUSA\nUK"]),
    C(4, "I", "SELECT status, COUNT(*) FROM orders\nGROUP BY status HAVING COUNT(*) > 2\nORDER BY 2 DESC;",
      "Only `delivered` (10 orders) has more than 2; shipped and pending have 2 each and cancelled has 1.",
      ["delivered | 10\nshipped | 2\npending | 2", "delivered | 10\npending | 2", "delivered | 15"]),
    C(7, "A", "SELECT salary, RANK() OVER (ORDER BY salary DESC)\nFROM employees ORDER BY salary DESC LIMIT 5;",
      "The two 95,000 salaries tie at rank 3, so RANK skips 4 and the next salary gets rank 5.",
      ["150000 | 1\n120000 | 2\n95000 | 3\n95000 | 4\n90000 | 5", "150000 | 1\n120000 | 2\n95000 | 3\n95000 | 3\n90000 | 4", "150000 | 1\n120000 | 2\n95000 | 3\n90000 | 4\n88000 | 5"]),
    C(7, "A", "SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC)\nFROM employees ORDER BY salary DESC LIMIT 5;",
      "DENSE_RANK also ties the 95,000s at 3 but leaves no gap, so 90,000 gets rank 4.",
      ["150000 | 1\n120000 | 2\n95000 | 3\n95000 | 3\n90000 | 5", "150000 | 1\n120000 | 2\n95000 | 3\n95000 | 4\n90000 | 5", "150000 | 1\n120000 | 2\n95000 | 2\n95000 | 2\n90000 | 3"]),
    C(7, "I", "SELECT SUM(x) OVER (ORDER BY x)\nFROM (SELECT 1 AS x UNION ALL SELECT 2 UNION ALL SELECT 3);",
      "With ORDER BY, SUM becomes a running total: 1, 1+2, 1+2+3.",
      ["6\n6\n6", "1\n2\n3", "6"]),
    C(7, "I", "SELECT x, LAG(x) OVER (ORDER BY x)\nFROM (SELECT 10 AS x UNION ALL SELECT 20 UNION ALL SELECT 30);",
      "LAG returns the previous row's value; the first row has none, so it's NULL.",
      ["10 | 20\n20 | 30\n30 | NULL", "10 | 10\n20 | 10\n30 | 20", "10 | 0\n20 | 10\n30 | 20"]),
    C(6, "B", "SELECT COUNT(*) FROM (SELECT DISTINCT customer_id FROM orders);",
      "15 orders were placed by 8 different customers (Neha and Omar never ordered).",
      ["15", "10", "2"]),
    C(6, "A", "WITH RECURSIVE n(i) AS (\n  SELECT 1 UNION ALL SELECT i * 2 FROM n WHERE i < 20\n)\nSELECT MAX(i) FROM n;",
      "It doubles 1, 2, 4, 8, 16. At 16 the condition `i < 20` is still true, so 32 is produced, then recursion stops.",
      ["16", "20", "64"]),
    C(6, "I", "SELECT name FROM employees\nWHERE salary = (SELECT MAX(salary) FROM employees WHERE dept_id = 3);",
      "Finance (dept 3) has Sneha (88,000) and Vikram (62,000); the maximum is Sneha's.",
      ["Vikram Joshi", "Asha Rao", "Sneha Patel\nVikram Joshi"]),
    C(8, "I", "UPDATE products SET price = price + 50 WHERE category = 'Stationery';\nSELECT SUM(price) FROM products WHERE category = 'Stationery';",
      "Two stationery products (250 and 180) each get +50: 300 + 230 = 530.",
      ["430", "480", "580"]),
    C(12, "B", "BEGIN;\nDELETE FROM customers WHERE id = 10;\nROLLBACK;\nSELECT COUNT(*) FROM customers;",
      "`ROLLBACK` undoes everything since `BEGIN`, so the deleted customer is back and there are still 10.",
      ["9", "0", "Error: cannot delete"]),
    C(9, "I", "INSERT INTO departments (name) VALUES ('Legal');\nSELECT MAX(id) FROM departments;",
      "An `INTEGER PRIMARY KEY` gets the next id automatically: max(id) + 1 = 6.",
      ["NULL", "5", "1"]),
    C(8, "A", "INSERT INTO products (id, name, category, price)\nVALUES (6, 'Notebook Pack', 'Stationery', 300)\nON CONFLICT (id) DO UPDATE SET price = excluded.price;\nSELECT COUNT(*), MAX(price) FROM products WHERE category = 'Stationery';",
      "Id 6 already exists, so the upsert updates its price to 300 instead of inserting: still 2 products, max price 300.",
      ["3 | 300", "2 | 250", "Error: UNIQUE constraint failed"]),
    C(3, "I", "SELECT CASE WHEN NULL = NULL THEN 'equal' ELSE 'not equal' END;",
      "`NULL = NULL` is unknown, which isn't TRUE, so CASE falls through to ELSE.",
      ["equal", "NULL", "Error"]),
    C(4, "B", "SELECT SUM(quantity) FROM order_items WHERE order_id = 3;",
      "Order 3 has 10 notebook packs and 5 gel pen packs.",
      ["2", "10", "4150"]),
    C(2, "B", "SELECT COUNT(*) FROM orders\nWHERE order_date BETWEEN '2024-03-01' AND '2024-03-15';",
      "BETWEEN is inclusive at both ends: orders on 1 March and 15 March both count.",
      ["1", "0", "3"]),
    C(4, "B", "SELECT MIN(name), MAX(name) FROM departments;",
      "MIN and MAX work on text too, comparing alphabetically: Engineering is first, Sales is last.",
      ["Sales | Engineering", "Finance | Sales", "Engineering | Marketing"]),
    C(5, "I", "SELECT 1 UNION SELECT 1 UNION ALL SELECT 1;",
      "Evaluated left to right: `1 UNION 1` removes the duplicate (one row), then `UNION ALL 1` keeps the extra row.",
      ["1", "1\n1\n1", "3"]),
    C(5, "I", "SELECT COUNT(*) FROM (\n  SELECT city FROM customers\n  UNION ALL\n  SELECT location FROM departments\n);",
      "UNION ALL keeps every row: 10 customer cities + 5 department locations.",
      ["10", "13", "12"]),
    C(5, "A", "SELECT COUNT(*) FROM (\n  SELECT city FROM customers\n  UNION\n  SELECT location FROM departments\n);",
      "UNION removes duplicates: Cuttack, Mumbai, Bengaluru and Delhi appear in both lists, and Cuttack twice in departments, leaving 10 distinct cities.",
      ["15", "12", "11"]),
    C(9, "I", "SELECT typeof(1), typeof(1.0), typeof('1');",
      "SQLite's storage classes: 1 is an integer, 1.0 a real (floating point), and '1' in quotes is text.",
      ["integer | integer | integer", "integer | real | integer", "numeric | numeric | text"]),
    C(3, "B", "SELECT LENGTH('  sql  '), LENGTH(TRIM('  sql  '));",
      "Spaces count as characters (2 + 3 + 2 = 7); TRIM removes the leading and trailing ones.",
      ["3 | 3", "7 | 7", "5 | 3"]),
    C(5, "I", "SELECT e.name\nFROM employees e JOIN employees m ON m.id = e.manager_id\nWHERE m.name = 'Arjun Nair' ORDER BY e.name;",
      "A self join: Arjun (id 4) manages Priya and Karan.",
      ["Arjun Nair", "Asha Rao", "Karan Mehta\nPriya Singh\nArjun Nair"]),
    C(7, "A", "SELECT NTILE(3) OVER (ORDER BY id) FROM departments;",
      "5 rows into 3 buckets: sizes 2, 2, 1 (earlier buckets get the extra rows).",
      ["1\n2\n3\n1\n2", "1\n1\n1\n2\n3", "1\n2\n2\n3\n3"]),
    C(5, "A", "SELECT COUNT(*)\nFROM employees e LEFT JOIN departments d ON d.id = e.dept_id\nWHERE d.location = 'Cuttack';",
      "Sales (3 people) and HR (1) are in Cuttack. The WHERE on the right table turns the LEFT JOIN into an inner one.",
      ["12", "3", "5"]),
    C(6, "I", "SELECT COUNT(*) FROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders);",
      "Neha and Omar have no orders. `customer_id` is NOT NULL here, so NOT IN is safe.",
      ["0", "8", "10"]),
    C(14, "I", "SELECT json_extract('{\"a\": {\"b\": [10, 20, 30]}}', '$.a.b[1]');",
      "JSON array indexes start at 0, so `[1]` is the second element.",
      ["10", "[10, 20, 30]", "NULL"]),
    C(15, "A", "SELECT SUM(CASE WHEN status = 'delivered' THEN 1 END),\n       COUNT(CASE WHEN status = 'pending' THEN 1 END)\nFROM orders;",
      "CASE without ELSE gives NULL for other rows; SUM and COUNT both ignore NULLs. 10 delivered, 2 pending.",
      ["15 | 15", "10 | 15", "NULL | 2"]),
]

SNIPPETS = [
    {"id": "tour", "icon": "👋", "title": "Tour the tables", "code": """-- MegaMart: 6 related tables. Press Run (Ctrl/⌘ + Enter).
SELECT name AS table_name,
       (SELECT COUNT(*) FROM pragma_table_info(name)) AS columns
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;"""},
    {"id": "top", "icon": "🏆", "title": "Top customers", "code": """SELECT c.name, c.city,
       COUNT(DISTINCT o.id) AS orders,
       SUM(oi.quantity * oi.unit_price) AS spent
FROM customers c
JOIN orders o       ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY c.id
ORDER BY spent DESC
LIMIT 5;"""},
    {"id": "org", "icon": "🌳", "title": "Org chart (recursive CTE)", "code": """WITH RECURSIVE org(id, name, level, path) AS (
  SELECT id, name, 0, name FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, o.level + 1, o.path || ' > ' || e.name
  FROM employees e JOIN org o ON e.manager_id = o.id
)
SELECT substr('            ', 1, level * 3) || name AS org_chart, level
FROM org
ORDER BY path;"""},
    {"id": "rank", "icon": "🪟", "title": "Rank within department", "code": """SELECT d.name AS department, e.name, e.salary,
       RANK() OVER (PARTITION BY d.id ORDER BY e.salary DESC) AS rank_in_dept,
       ROUND(e.salary * 100.0 / SUM(e.salary) OVER (PARTITION BY d.id), 1) AS pct_of_dept
FROM employees e
JOIN departments d ON d.id = e.dept_id
ORDER BY department, rank_in_dept;"""},
    {"id": "monthly", "icon": "📈", "title": "Monthly revenue + growth", "code": """WITH monthly AS (
  SELECT strftime('%Y-%m', o.order_date) AS month,
         SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders o JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY month
)
SELECT month, revenue,
       SUM(revenue) OVER (ORDER BY month) AS running_total,
       revenue - LAG(revenue) OVER (ORDER BY month) AS change
FROM monthly;"""},
    {"id": "pivot", "icon": "🔄", "title": "Pivot: status by customer", "code": """SELECT c.name,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) AS delivered,
  COUNT(CASE WHEN o.status = 'shipped'   THEN 1 END) AS shipped,
  COUNT(CASE WHEN o.status = 'pending'   THEN 1 END) AS pending,
  COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) AS cancelled
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id
ORDER BY delivered DESC, c.name;"""},
    {"id": "crud", "icon": "✏️", "title": "Insert, update, rollback", "code": """-- Changes persist in the playground until you press Reset DB
BEGIN;
INSERT INTO products (name, category, price) VALUES ('USB-C Hub', 'Electronics', 3200);
UPDATE products SET price = price * 0.9 WHERE category = 'Furniture';
SELECT id, name, category, price FROM products ORDER BY id DESC LIMIT 4;
ROLLBACK;   -- undo everything above; try COMMIT instead
SELECT COUNT(*) AS products_after_rollback FROM products;"""},
    {"id": "plan", "icon": "⚡", "title": "Index & query plan", "code": """-- Without an index: a full SCAN of orders
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 2;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- With the index: SEARCH using idx_orders_customer
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 2;"""},
]

# typed out on the home page; the generator runs them and stores the real result table
HERO = [
    {"file": "customers.sql", "code": "SELECT name, city\nFROM customers\nWHERE country = 'India'\nLIMIT 3;"},
    {"file": "categories.sql", "code": "SELECT category, COUNT(*) AS items\nFROM products\nGROUP BY category\nORDER BY items DESC\nLIMIT 3;"},
    {"file": "salaries.sql", "code": "SELECT d.name, ROUND(AVG(e.salary)) AS avg_pay\nFROM employees e\nJOIN departments d ON d.id = e.dept_id\nGROUP BY d.name\nORDER BY avg_pay DESC\nLIMIT 3;"},
    {"file": "ranking.sql", "code": "SELECT name, salary,\n  RANK() OVER (ORDER BY salary DESC) AS rnk\nFROM employees\nORDER BY salary DESC\nLIMIT 4;"},
]
