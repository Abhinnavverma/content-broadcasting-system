# Content Broadcasting System - Comprehensive Architecture & System Design Documentation

## Executive Summary
This document outlines the architectural decisions, structural paradigms, and low-level system mechanics driving the Content Broadcasting System. Designed to function as a highly available, read-heavy API, the system is built upon a stateless, horizontally scalable Node.js foundation. The architecture specifically avoids stateful background workers in favor of deterministic, on-the-fly mathematical calculations to handle time-based content rotation. This document details the database execution engine optimizations, the continuous cyclical time constraint math, the abstract syntax tree (AST) parsing concepts applied to request validation, and the distributed systems principles utilized for future scalability.

---

## 1. Core Language & Tooling Decisions

### 1.1 TypeScript & Static Analysis
While the assignment requirements specified Node.js and Express, this application is built fundamentally using **TypeScript**. Enforcing static typing at compile-time prevents a massive class of runtime anomalies, ensures strict API contracts via interfaces, and represents how production-grade, high-throughput Node.js systems are structured in the real world. 
* **Compile-Time Safety:** By mapping database rows to TypeScript interfaces, we prevent undefined reference errors during runtime. The TypeScript compiler constructs an Abstract Syntax Tree (AST) to validate structural integrity before the code ever reaches the V8 engine.
* **Object-Oriented & Clean Architecture Alignment:** TypeScript allows for robust implementation of Dependency Injection (DI) and Interface Segregation principles, which are critical for scaling monolithic applications into distributed services.

### 1.2 Development Toolchain
* **ESLint & Prettier:** The project utilizes strict ESLint rules coupled with Prettier for opinionated formatting. 
* **Husky & Lint-Staged:** These tools are configured to enforce pre-commit Git hooks. By running static analysis exclusively on staged files via AST parsing, we guarantee that no malformed, unoptimized, or style-violating code can enter the repository. This protects the main branch in high-velocity deployment environments.

---

## 2. Folder Structure & Separation of Concerns

The project adheres to a strict Layered Architecture, heavily influenced by Hexagonal Architecture (Ports and Adapters), to separate the HTTP transport boundaries from the core domain logic.

### 2.1 The Layers
* **`routes/` (The Transport Boundary):** Defines HTTP verbs, URL paths, and attaches middleware. No business logic or state mutation occurs here. It acts strictly as a traffic router.
* **`controllers/` (The Adapters):** Extracts data from incoming HTTP requests (`req.body`, `req.user`, `req.query`). The controllers handle structural validation of the payload, invoke the underlying domain services, and format the final HTTP JSON response. They insulate the services from knowing anything about Express.js.
* **`services/` (The Domain Logic):** Contains all core business logic, algorithm execution, and state machine transitions. Services are completely agnostic to the transport layer. 
* **`middlewares/` (The Interceptors):** Handles JSON Web Token (JWT) verification, Role-Based Access Control (RBAC) injection, and multipart/form-data buffer parsing via Multer.
* **`models/` & `config/` (The Data Layer):** Manages connection pooling, transaction lifecycles, and database schema migrations.

---

## 3. Database Design & Execution Engine Optimization

The relational data model is built on PostgreSQL, chosen for its robust execution engine, Multi-Version Concurrency Control (MVCC), and superior handling of complex relational joins.

### 3.1 Infrastructure & Migrations
* **Containerization:** PostgreSQL runs via Docker Compose, ensuring strict environmental consistency between development, staging, and production.
* **Deterministic Migrations:** Schema changes are handled via `node-pg-migrate` rather than relying on an Object-Relational Mapper's (ORM) auto-synchronization features. This provides a clean, version-controlled audit trail of all Data Definition Language (DDL) operations.

### 3.2 Schema Normalization & Constraints
The database is highly normalized to Third Normal Form (3NF). 
* The `content_schedule` table relies on foreign keys to `content` and `content_slots` with `ON DELETE CASCADE` constraints. This pushes referential integrity enforcement down to the database execution engine, rather than relying on the application layer to clean up orphaned records, saving Node.js CPU cycles.

### 3.3 Indexing Strategy & B-Tree Traversal
To optimize the read-heavy nature of the public broadcasting endpoint, specific indexing strategies were implemented:
* **B-Tree Indexes:** Applied to `content(status)` and `content(subject)`. When the public API queries for active content, the PostgreSQL execution engine utilizes an Index Scan rather than a Sequential Scan. The B-Tree structure allows the engine to traverse the index in $O(\log N)$ time complexity, vastly reducing disk I/O and page cache misses during high-throughput load.
* **Filtering Optimization:** By indexing the `subject` column, the engine can quickly isolate the specific data blocks requested by the student application, preventing memory saturation in the database buffer pool.

---

## 4. Authentication & RBAC Flow

Security is handled via stateless JWTs, avoiding the need to store session identifiers in a central datastore (which can become a bottleneck in high-throughput environments).

### 4.1 Cryptography & Password Hashing
* **Bcrypt:** Passwords are mathematically hashed using the bcrypt algorithm with a configurable salt round (work factor). Bcrypt is intentionally designed to be computationally slow, protecting the system against brute-force and rainbow table attacks.
* **Timing Attack Mitigation:** Password comparisons are executing using secure, constant-time comparison algorithms within the underlying C++ cryptographic bindings of Node.js, ensuring attackers cannot infer password validity based on CPU response times.

### 4.2 The JWT Lifecycle
1.  Upon successful authentication, the server generates a JWT containing the user's `id` and `role` in the payload.
2.  The token is signed using an HMAC SHA-256 algorithm with a cryptographically secure secret. 
3.  Because the token is stateless, the server does not need to perform a database lookup to verify a user's identity on subsequent requests.

### 4.3 Role-Based Access Control (RBAC) Injection
The authorization flow utilizes a middleware pipeline:
* The `authenticate` middleware parses the `Authorization` header, verifies the SHA-256 signature, decodes the payload, and injects the `user` object directly into the Express `Request` context.
* The `requireRole` factory middleware acts as a state gatekeeper. If a Teacher attempts to access a Principal route, the middleware intercepts the request and terminates the lifecycle with a `403 Forbidden` response before the controller is ever invoked.

---

## 5. Upload Handling Approach

Handling physical file uploads requires careful memory management to prevent the Node.js event loop from blocking or crashing due to Out-Of-Memory (OOM) exceptions.

### 5.1 Multipart/Form-Data Parsing
The system utilizes Multer to parse incoming `multipart/form-data` streams. Instead of buffering the entire payload into the V8 heap memory space—which would quickly crash the server under concurrent upload load—the files are streamed directly to the local disk.

### 5.2 Security & Constraints
* **Buffer Limits:** A strict 10MB file size limit is enforced. If a stream exceeds this byte count, the connection is forcefully severed, preventing Denial of Service (DoS) attacks via memory exhaustion.
* **MIME Type Sniffing:** The middleware intercepts the incoming file stream and validates the `mimetype` property against an explicit allowlist (`image/jpeg`, `image/png`, `image/gif`). Any deviation results in an immediate rejection.
* **Atomic Filenames:** To prevent naming collisions on the disk, files are saved using a mathematically randomized suffix combined with the current epoch timestamp.

---

## 6. Approval Workflow Design

The approval workflow represents a finite state machine, where content transitions from `UPLOADED` -> `PENDING` -> `APPROVED` or `REJECTED`.

### 6.1 Optimistic Concurrency Control
When a Principal approves or rejects a piece of content, the system must ensure that the state transition is atomic and immune to race conditions (e.g., two Principals attempting to approve the same document simultaneously).
* Instead of implementing expensive row-level locks (`SELECT ... FOR UPDATE`), the system utilizes Optimistic Concurrency Control directly within the SQL `UPDATE` statement.
* The query explicitly includes `WHERE id = $4 AND status = 'pending'`. If another thread has already mutated the state to `approved`, the execution engine will return `0` affected rows, and the application layer safely throws a validation error. This ensures absolute ACID compliance without bottlenecking connection pools.

### 6.2 Data Integrity
If a file is rejected, the system mandates that a `rejection_reason` is provided and stored. If approved, the timestamp (`approved_at`) and the Principal's identifier (`approved_by`) are recorded to maintain a strict, auditable chain of custody.

---

## 7. Scheduling & Rotation Logic (Core Algorithm)

The most complex requirement of this system is determining which piece of content should be actively broadcasted to students at any given millisecond. 

### 7.1 The Stateful Worker Anti-Pattern
A naive approach would involve running a background worker (e.g., a Cron job or a message broker) every 60 seconds to evaluate the schedule, mutate an `is_active` boolean in the database, and sleep. This approach introduces massive latency, requires constant disk I/O, is prone to race conditions, and is incredibly difficult to scale horizontally without introducing complex distributed locking mechanisms.

### 7.2 The Deterministic On-The-Fly Algorithm
Instead, the system leverages a mathematically deterministic, stateless algorithm that calculates the active content precisely at the moment the `GET` request is received.

**Step 1: Time-Window Filtering**
The database execution engine evaluates the legality of the content by ensuring the current server timestamp (`NOW()`) falls strictly within the `start_time` and `end_time` boundaries defined by the teacher.

**Step 2: The Continuous Cyclical Math**
For the remaining valid items, the system groups them by subject. For any given subject containing $N$ valid items, the total cycle duration $C$ (in milliseconds) is defined as the sum of all individual item durations:

$$C = \sum_{i=1}^{n} \text{duration\_ms}_i$$

To find the current position within this infinite time loop, we calculate the offset ($t_{offset}$) by applying a modulo operation using the current epoch timestamp ($T_{current}$):

$$t_{offset} = T_{current} \pmod C$$

**Step 3: Algorithmic Resolution**
The system then iterates through the sorted array of items, keeping a running sum of the durations. The algorithm evaluates:

$$\text{runningSum}_{k} = \sum_{i=1}^{k} \text{duration\_ms}_i$$

The first item $k$ where $\text{runningSum}_{k} > t_{offset}$ is mathematically guaranteed to be the currently active item.

### 7.3 Computational Advantages
* **Time Complexity:** The mathematical resolution operates in strict $O(N)$ time, where $N$ is the number of currently active items for a subject. Because $N$ is practically bounded (a teacher will realistically only have a few dozen active items simultaneously), the CPU execution time is fractions of a millisecond.
* **Zero Database Writes:** The algorithm requires absolutely zero database mutations, saving immense I/O throughput.
* **Zero-Division Safeguards:** The implementation includes mathematical bounds checking (`Math.max(1, duration)`) to ensure that malformed data with a duration of 0 cannot trigger a division-by-zero (`NaN`) memory panic during the modulo operation.

---

## 8. Scalability & High-Throughput Strategy

While the current architecture is deployed as a monolithic Node.js process, it is architected to seamlessly transition into a distributed system capable of handling tens of thousands of concurrent student connections.

### 8.1 Horizontal Scaling & Statelessness
Because the core scheduling algorithm relies purely on mathematics and the current epoch clock, the API is 100% stateless. There are no in-memory circular linked lists or stateful arrays to maintain.
* This means the application can be instantly horizontally scaled. We can spin up 50 instances of this Node.js API behind a Load Balancer (like NGINX or AWS ALB), and any student hitting any instance will receive the exact same deterministic JSON response.

### 8.2 Future Log Ingestion & Event Driven Parallels
As the system scales, tracking content analytics (e.g., how many students viewed a specific math worksheet) will require high-throughput event ingestion. 
* The current decoupled folder structure allows us to easily implement a distributed log ingestion engine. Future analytics routes can push view events to an in-memory queue or an Apache Kafka topic, buffering the I/O so the primary PostgreSQL database is not overwhelmed by simple counter updates.

### 8.3 Caching Strategies
The `/content/live/:teacher_id` endpoint is incredibly read-heavy. Because the response is mathematically predictable, it is a prime candidate for distributed Redis caching.
* **Dynamic TTL:** When the Node.js server calculates the active item, it also knows exactly how many milliseconds remain until that specific item's duration expires. The system can serialize the JSON response and write it to a Redis cluster, setting the Time-To-Live (TTL) exactly equal to the remaining rotation time. 
* This reduces the time complexity from $O(N)$ with a database hit, down to $O(1)$ memory retrieval, allowing the system to handle massive traffic spikes with near-zero latency.

---

## 9. API Contract & Edge Case Handling

The public-facing APIs are designed with consumer resilience in mind, ensuring frontend clients do not crash due to malformed backend responses.

### 9.1 Graceful Degradation
* **Empty States:** If a student requests content for a teacher that has no approved files, or if the current time falls outside the scheduled windows, the API gracefully returns a structured empty array `{ "data": [] }` rather than a `404 Not Found`. This allows frontend carousel UI components to render empty states smoothly without writing heavy error-catching logic.
* **Pagination:** The Principal approval queue implements offset-based pagination (`LIMIT` and `OFFSET`), protecting the database from executing unbounded queries that could cause memory exhaustion as the system grows.

## 10. Conclusion
This architecture provides a fault-tolerant, horizontally scalable, and mathematically precise backend system. By offloading referential integrity to PostgreSQL, utilizing AST-level static typing, and abandoning stateful cron-jobs in favor of deterministic continuous-time modulo logic, the system is engineered to handle real-world educational deployment loads efficiently.