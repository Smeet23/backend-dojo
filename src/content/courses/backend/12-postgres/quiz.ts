import type { Question } from "@/lib/types";

const ON_DELETE = ["ON DELETE CASCADE", "ON DELETE RESTRICT", "ON DELETE SET NULL", "ON DELETE SET DEFAULT"];

export const quiz: Question[] = [
  {
    id: "postgres-lost-update",
    lectures: [12],
    tags: ["concurrency", "transactions"],
    type: "scenario",
    prompt:
      "Production incident: during a flash sale, your shop sold 130 units of a product that only had 100 in stock. The checkout handler does SELECT stock FROM products WHERE id = $1, subtracts the quantity in TypeScript, then runs UPDATE products SET stock = $2 WHERE id = $1.\nWhat happened, and what's the simplest fix?",
    fields: [
      { label: "The bug", options: ["Lost update", "SQL injection", "Missing index", "Deadlock"], answer: "Lost update" },
      {
        label: "Fix",
        options: [
          "UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2",
          "Wrap the same SELECT and UPDATE in BEGIN/COMMIT at the default isolation level",
          "Add an index on products.id",
          "Cache the stock value in Redis",
        ],
        answer: "UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2",
      },
    ],
    explanation:
      "Concurrent requests read the same stock value and each wrote back its own result, overwriting the others. A single atomic UPDATE does the read and write under a row lock, and the stock >= $2 condition refuses to oversell (0 rows updated means out of stock). A transaction at the default Read Committed level doesn't help, because two transactions can still read the same value before either writes.",
    lessonAnchor: "concurrency-and-transactions",
  },
  {
    id: "postgres-column-types",
    lectures: [12],
    tags: ["data-types"],
    type: "scenario",
    prompt:
      "You're designing the orders table for a shop that sells worldwide. Pick a type for each column.",
    fields: [
      { label: "total (the amount charged)", options: ["NUMERIC(12, 2)", "REAL", "DOUBLE PRECISION", "INTEGER"], answer: "NUMERIC(12, 2)" },
      { label: "placed_at", options: ["TIMESTAMPTZ", "TIMESTAMP", "DATE", "TEXT"], answer: "TIMESTAMPTZ" },
      { label: "carrier_payload (different JSON from each shipping carrier, queried by tracking number)", options: ["JSONB", "JSON", "TEXT", "XML"], answer: "JSONB" },
      { label: "gift_message", options: ["TEXT", "VARCHAR(255)", "CHAR(255)", "JSONB"], answer: "TEXT" },
    ],
    explanation:
      "Money needs exact decimals, and floats accumulate rounding errors. TIMESTAMPTZ stores an absolute moment, so customers in different time zones don't cause bugs. JSONB is parsed and indexable, so querying inside it is fast. In Postgres, TEXT performs the same as VARCHAR, and a length rule belongs in API validation, not a magic 255.",
    lessonAnchor: "data-types",
  },
  {
    id: "postgres-model-relationships",
    lectures: [12],
    tags: ["schema-design", "relationships"],
    type: "scenario",
    prompt:
      "Your shop's schema needs three relationships:\n• An order contains many products, and a product appears in many orders, each time with a quantity.\n• Each user has exactly one notification_settings row.\n• Each review belongs to one product; a product has many reviews.\nHow do you model each?",
    fields: [
      {
        label: "Orders ↔ products",
        options: ["order_items table with order_id, product_id and a composite primary key", "products.order_id foreign key", "orders.product_ids UUID[] array", "orders.product_id foreign key"],
        answer: "order_items table with order_id, product_id and a composite primary key",
      },
      { label: "Where quantity lives", options: ["order_items", "orders", "products", "A separate quantities table"], answer: "order_items" },
      {
        label: "notification_settings",
        options: ["user_id is both its primary key and a foreign key to users", "users.settings_id foreign key plus its own id", "A junction table users_settings", "A JSON column on every order"],
        answer: "user_id is both its primary key and a foreign key to users",
      },
      { label: "Reviews", options: ["reviews.product_id foreign key", "products.review_id foreign key", "A junction table product_reviews", "reviews.product_id as the primary key"], answer: "reviews.product_id foreign key" },
    ],
    explanation:
      "Many-to-many needs a junction table, and facts about the pairing (quantity) live on it. One-to-one is a foreign key that is also the primary key, so there can't be a second row. One-to-many puts an ordinary foreign key on the child. Making reviews.product_id the primary key would allow only one review per product.",
    lessonAnchor: "relationships",
  },
  {
    id: "postgres-on-delete",
    lectures: [12],
    tags: ["foreign-keys", "referential-integrity"],
    type: "scenario",
    prompt:
      "A customer deletes their account from your shop. Decide what each foreign key to users should do.\n• cart_items.user_id: their unsaved cart\n• orders.user_id: finance must keep orders for 7 years, so deleting a user with orders should be blocked until they're anonymised\n• reviews.author_id: keep the review, show it as \"Former customer\"",
    fields: [
      { label: "cart_items.user_id", options: ON_DELETE, answer: "ON DELETE CASCADE" },
      { label: "orders.user_id", options: ON_DELETE, answer: "ON DELETE RESTRICT" },
      { label: "reviews.author_id (nullable)", options: ON_DELETE, answer: "ON DELETE SET NULL" },
    ],
    explanation:
      "A cart means nothing without its owner, so cascade. Orders must never disappear as a side effect, so RESTRICT makes the delete fail until they've been handled. SET NULL keeps the review and just removes the link, which only works because author_id is nullable.",
    lessonAnchor: "referential-actions",
  },
  {
    id: "postgres-constraints",
    lectures: [12],
    tags: ["constraints", "integrity"],
    type: "scenario",
    prompt:
      "A background script once inserted tasks with priority 55 and status 'done!!', and the support team found two accounts with the same email. Make the database reject each of these on its own.",
    fields: [
      { label: "priority must be 1–5", options: ["CHECK (priority BETWEEN 1 AND 5)", "NOT NULL", "UNIQUE", "DEFAULT 1"], answer: "CHECK (priority BETWEEN 1 AND 5)" },
      { label: "status must be a known value", options: ["An enum type such as task_status", "A UNIQUE constraint", "A trigger that sets updated_at", "An index on status"], answer: "An enum type such as task_status" },
      { label: "no duplicate emails", options: ["UNIQUE on users.email", "CHECK (email LIKE '%@%')", "An index on created_at", "NOT NULL on email"], answer: "UNIQUE on users.email" },
    ],
    explanation:
      "CHECK enforces a custom condition, an enum limits a column to a declared set (and documents it), and UNIQUE blocks duplicates. API validation alone missed these because the script bypassed the API; constraints hold for every writer.",
    lessonAnchor: "constraints",
  },
  {
    id: "postgres-missing-users",
    lectures: [12],
    tags: ["joins", "sql"],
    type: "mcq",
    prompt:
      "Support says users who just signed up never appear on the admin \"All users\" page until they edit their profile. The query is:\nSELECT u.*, to_jsonb(up.*) AS profile FROM users u INNER JOIN user_profiles up ON u.id = up.user_id ORDER BY u.created_at DESC;\nWhat's wrong?",
    options: [
      "INNER JOIN drops users with no profile row; it should be a LEFT JOIN",
      "ORDER BY created_at DESC hides the newest users",
      "to_jsonb fails on new rows",
      "The query needs a GROUP BY u.id",
    ],
    answer: "INNER JOIN drops users with no profile row; it should be a LEFT JOIN",
    explanation:
      "INNER JOIN keeps only rows that match on both sides. New users have no user_profiles row yet, so they vanish. LEFT JOIN keeps every user and returns NULL profile columns where there's no match.",
    lessonAnchor: "joins",
  },
  {
    id: "postgres-sql-injection",
    lectures: [12],
    tags: ["security", "sql"],
    type: "mcq",
    prompt:
      "Code review: the search endpoint runs db.query(`SELECT * FROM products WHERE name ILIKE '%${q}%'`). A teammate says it's fine because the frontend only sends letters. What do you ask for?",
    options: [
      "Pass q as a parameter: db.query(\"... WHERE name ILIKE '%' || $1 || '%'\", [q])",
      "Strip single quotes from q before inserting it",
      "Validate q in the frontend with a regex",
      "Use LIKE instead of ILIKE",
    ],
    answer: "Pass q as a parameter: db.query(\"... WHERE name ILIKE '%' || $1 || '%'\", [q])",
    explanation:
      "Anyone can call your API directly, so frontend checks don't count. String interpolation lets input become SQL. A parameter is sent separately and always treated as a value. Stripping quotes is a fragile blacklist that attackers routinely get around.",
    lessonAnchor: "parameterized-queries",
  },
  {
    id: "postgres-list-endpoint",
    lectures: [12],
    tags: ["pagination", "sorting", "sql"],
    type: "scenario",
    prompt:
      "You're implementing GET /products?sortBy=price&sortOrder=desc&page=3&limit=20. Fill in how the repository builds the query.",
    fields: [
      {
        label: "How sortBy gets into the SQL",
        options: ["Mapped through a whitelist to a known column name", "Bound as a $1 parameter", "Concatenated exactly as the client sent it", "Ignored; always sort by id"],
        answer: "Mapped through a whitelist to a known column name",
      },
      { label: "OFFSET", options: ["40", "60", "3", "2"], answer: "40" },
      { label: "If the client sends no sortBy", options: ["ORDER BY created_at DESC", "No ORDER BY, so rows come back in table order", "ORDER BY random()", "Return 400 Bad Request"], answer: "ORDER BY created_at DESC" },
    ],
    explanation:
      "Parameters can only carry values, not column names or ASC/DESC, so you pick the identifier from a whitelist in code. OFFSET is zero-based: (3 − 1) × 20 = 40. Without ORDER BY there is no guaranteed order at all, so lists default to newest first.",
    lessonAnchor: "filtering-sorting-and-pagination",
  },
  {
    id: "postgres-fk-index",
    lectures: [12],
    tags: ["indexes", "performance"],
    type: "scenario",
    prompt:
      "Production incident: GET /projects/:id/tasks went from 15 ms to 3 seconds as the tasks table grew to 20 million rows. EXPLAIN ANALYZE shows \"Seq Scan on tasks\" filtering on project_id.",
    fields: [
      {
        label: "Fix",
        options: ["CREATE INDEX CONCURRENTLY ON tasks (project_id)", "CREATE INDEX ON projects (id)", "Switch the JOIN to a LEFT JOIN", "Change project_id to TEXT"],
        answer: "CREATE INDEX CONCURRENTLY ON tasks (project_id)",
      },
      {
        label: "Why wasn't it indexed already?",
        options: ["Postgres doesn't index foreign key columns automatically", "Indexes are dropped when a table passes 10M rows", "UUID columns can't be indexed", "The migration tool skips indexes"],
        answer: "Postgres doesn't index foreign key columns automatically",
      },
    ],
    explanation:
      "Primary keys and UNIQUE columns get indexes automatically, but foreign keys don't, so projects.id was already indexed and tasks.project_id wasn't. CONCURRENTLY builds the index without blocking writes on a busy production table.",
    lessonAnchor: "when-to-add-an-index",
  },
  {
    id: "postgres-index-overhead",
    lectures: [12],
    tags: ["indexes", "performance"],
    type: "mcq",
    prompt:
      "To \"make everything fast\", a teammate added indexes on all 14 columns of the analytics_events table, which receives 5,000 inserts per second and is queried a few times a day. Insert latency doubled. Why?",
    options: [
      "Every insert must also update all 14 indexes",
      "Indexes make reads slower, which blocks inserts",
      "Postgres can only use one index per table, so the rest conflict",
      "Indexes only work on primary keys",
    ],
    answer: "Every insert must also update all 14 indexes",
    explanation:
      "Each index is a separate structure that every write has to maintain. On a write-heavy, rarely-read table, most of those indexes cost far more than they save. Keep the ones frequent queries need and drop the rest.",
    lessonAnchor: "the-cost-of-indexes",
  },
  {
    id: "postgres-updated-at",
    lectures: [12],
    tags: ["triggers"],
    type: "mcq",
    prompt:
      "After shipping PATCH /users/:id/profile, the frontend's \"Recently updated\" sort is wrong: updated_at still equals created_at on every edited profile. Several services and scripts update this table. Best fix?",
    options: [
      "A BEFORE UPDATE trigger that sets NEW.updated_at = now()",
      "Remember to add updated_at = now() in this one PATCH handler",
      "Change the column default to now() again",
      "Sort by created_at instead",
    ],
    answer: "A BEFORE UPDATE trigger that sets NEW.updated_at = now()",
    explanation:
      "A DEFAULT only applies on INSERT. A trigger runs on every UPDATE, whichever code path or script issues it, so nobody can forget. Fixing only the PATCH handler leaves every other writer broken.",
    lessonAnchor: "triggers",
  },
  {
    id: "postgres-migration-flow",
    lectures: [12],
    tags: ["migrations"],
    type: "order",
    prompt: "You need a new due_date column on tasks. Put the migration workflow in order.",
    steps: [
      "Run dbmate new add_due_date_to_tasks to create a timestamped file",
      "Write the up (ADD COLUMN) and down (DROP COLUMN) sections",
      "Run dbmate up locally and test the feature against it",
      "Commit the migration together with the code that uses the column",
      "The deploy runs dbmate up against production",
      "dbmate records the new version in schema_migrations, so it never re-applies the file",
    ],
    explanation:
      "Schema changes are versioned files that travel with the code through review and deploy. The tracking table is how the tool knows which files are new on each run.",
    lessonAnchor: "migrations",
  },
];
