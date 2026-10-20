"""MegaMart: the sample database every example, puzzle and the playground run against.

A small shop with departments, employees (with managers), customers, products, orders and
order items. It deliberately includes NULLs (an employee with no department, a missing email,
the CEO with no manager) and customers without orders, so joins and NULL logic have something
to show.
"""

SCHEMA = """
CREATE TABLE departments (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  location TEXT
);
CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  salary     INTEGER NOT NULL CHECK (salary > 0),
  hire_date  TEXT NOT NULL,
  email      TEXT UNIQUE
);
CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  country     TEXT,
  signup_date TEXT
);
CREATE TABLE products (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL,
  price    INTEGER NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  employee_id INTEGER REFERENCES employees(id),
  order_date  TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled'))
);
CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
"""

SEED = """
INSERT INTO departments VALUES
  (1, 'Sales', 'Cuttack'), (2, 'Engineering', 'Bengaluru'), (3, 'Finance', 'Mumbai'),
  (4, 'Marketing', 'Delhi'), (5, 'HR', 'Cuttack');
INSERT INTO employees VALUES
  (1, 'Asha Rao', 2, NULL, 150000, '2018-04-01', 'asha@megamart.in'),
  (2, 'Ravi Kumar', 1, 1, 90000, '2019-06-15', 'ravi@megamart.in'),
  (3, 'Meera Das', 1, 2, 60000, '2021-01-10', 'meera@megamart.in'),
  (4, 'Arjun Nair', 2, 1, 120000, '2019-09-01', 'arjun@megamart.in'),
  (5, 'Priya Singh', 2, 4, 95000, '2020-03-20', NULL),
  (6, 'Karan Mehta', 2, 4, 95000, '2022-07-11', 'karan@megamart.in'),
  (7, 'Sneha Patel', 3, 1, 88000, '2020-11-02', 'sneha@megamart.in'),
  (8, 'Vikram Joshi', 3, 7, 62000, '2023-02-14', 'vikram@megamart.in'),
  (9, 'Anita Roy', 4, 1, 70000, '2021-08-30', 'anita@megamart.in'),
  (10, 'Rahul Verma', 1, 2, 55000, '2024-01-08', 'rahul@megamart.in'),
  (11, 'Divya Iyer', NULL, 1, 50000, '2024-05-19', 'divya@megamart.in'),
  (12, 'Sameer Khan', 5, 1, 58000, '2022-12-01', 'sameer@megamart.in');
INSERT INTO customers VALUES
  (1, 'Ananya Gupta', 'Cuttack', 'India', '2023-01-05'),
  (2, 'Rohit Sharma', 'Mumbai', 'India', '2023-02-17'),
  (3, 'Emily Clark', 'London', 'UK', '2023-03-09'),
  (4, 'Liam Smith', 'New York', 'USA', '2023-04-22'),
  (5, 'Fatima Ali', 'Dubai', 'UAE', '2023-06-30'),
  (6, 'Karthik Rao', 'Bengaluru', 'India', '2023-08-14'),
  (7, 'Sofia Rossi', 'Milan', 'Italy', '2023-10-01'),
  (8, 'Chen Wei', 'Singapore', 'Singapore', '2024-01-20'),
  (9, 'Neha Jain', 'Delhi', 'India', '2024-03-11'),
  (10, 'Omar Hassan', 'Cairo', 'Egypt', '2024-05-02');
INSERT INTO products VALUES
  (1, 'Laptop Pro 14', 'Electronics', 85000), (2, 'Wireless Mouse', 'Electronics', 1200),
  (3, 'Mechanical Keyboard', 'Electronics', 4500), (4, 'Office Chair', 'Furniture', 12000),
  (5, 'Standing Desk', 'Furniture', 28000), (6, 'Notebook Pack', 'Stationery', 250),
  (7, 'Gel Pens (10)', 'Stationery', 180), (8, 'Coffee Maker', 'Appliances', 6500),
  (9, 'Water Bottle', 'Accessories', 450), (10, 'Backpack', 'Accessories', 2200);
INSERT INTO orders VALUES
  (1, 1, 2, '2024-01-10', 'delivered'), (2, 2, 3, '2024-01-18', 'delivered'),
  (3, 1, 3, '2024-02-02', 'delivered'), (4, 3, 10, '2024-02-14', 'cancelled'),
  (5, 4, 2, '2024-03-01', 'delivered'), (6, 5, 3, '2024-03-15', 'shipped'),
  (7, 2, 2, '2024-04-02', 'delivered'), (8, 6, 10, '2024-04-20', 'delivered'),
  (9, 7, 3, '2024-05-05', 'pending'), (10, 1, 2, '2024-05-28', 'delivered'),
  (11, 8, 10, '2024-06-09', 'shipped'), (12, 3, 2, '2024-06-21', 'delivered'),
  (13, 6, 3, '2024-07-04', 'delivered'), (14, 4, 10, '2024-07-19', 'pending'),
  (15, 2, 3, '2024-08-02', 'delivered');
INSERT INTO order_items VALUES
  (1, 1, 1, 85000), (1, 2, 1, 1200), (2, 4, 2, 12000), (3, 6, 10, 250), (3, 7, 5, 180),
  (4, 8, 1, 6500), (5, 1, 1, 84000), (5, 3, 1, 4500), (6, 5, 1, 28000), (7, 9, 4, 450),
  (7, 10, 1, 2200), (8, 2, 2, 1200), (8, 3, 1, 4500), (9, 4, 1, 12000), (10, 8, 1, 6500),
  (10, 9, 2, 450), (11, 1, 1, 85000), (12, 6, 20, 250), (13, 5, 1, 27500), (13, 4, 1, 12000),
  (14, 10, 2, 2200), (15, 3, 2, 4500), (15, 2, 1, 1200);
"""

# shown in the schema explorer: which columns point at which table
FOREIGN_KEYS = {
    "employees": {"dept_id": "departments.id", "manager_id": "employees.id"},
    "orders": {"customer_id": "customers.id", "employee_id": "employees.id"},
    "order_items": {"order_id": "orders.id", "product_id": "products.id"},
}
