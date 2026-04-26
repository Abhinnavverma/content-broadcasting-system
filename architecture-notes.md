# Content Broadcasting System - Architecture Notes

## 1. Core Language & Tooling Decisions
While the assignment requirements specified Node.js/Express, this application is built using **TypeScript**. 
* **Why:** Enforcing static typing at compile-time prevents a massive class of runtime errors, ensures strict API contracts via interfaces, and represents how production-grade Node.js systems are built in the real world (aligning with OOP and clean architecture principles). 
* **Tooling:** The project utilizes ESLint and Prettier, enforced via Husky pre-commit hooks, guaranteeing that no malformed code enters the repository.

## 2. Folder Structure & Separation of Concerns
The project adheres to a strict Layered Architecture to separate HTTP transport from business logic:
* `routes/`: Defines HTTP verbs, paths, and attaches middleware. No business logic resides here.
* `controllers/`: Extracts data from requests (`req.body`, `req.user`) and passes it to the services.
* `services/`: Contains all core business logic, including the scheduling algorithm and approval state machines.
* `middlewares/`: Handles JWT verification, Role-Based Access Control (RBAC), and file upload parsing (Multer).
* `models/` (via Migrations): The database layer schema definitions.

## 3. Database Design Decisions
* **Engine:** PostgreSQL, running via Docker Compose for strict environmental consistency.
* **Migrations:** Schema changes are handled via `node-pg-migrate` rather than an ORM's auto-sync feature. This ensures deterministic database states and clean version control.
* **Schema:** The database is highly normalized. `content_schedule` relies on foreign keys to `content` and `content_slots` with `ON DELETE CASCADE` constraints to prevent orphaned records. 
* **Indexing:** B-Tree indexes are applied to `content(status)` and `content(subject)` to optimize the public broadcasting queries.

## 4. Authentication & RBAC Flow
* [To be implemented: Will detail the JWT signing process and the custom middleware that isolates Teacher vs. Principal routes.]

## 5. Upload Handling Approach
* [To be implemented: Will detail Multer setup, 10MB size limits, and local storage mechanisms.]

## 6. Approval Workflow Design
* [To be implemented: Will detail the state machine transitions (uploaded -> pending -> approved/rejected) and strict Principal-only enforcement.]

## 7. Scheduling & Rotation Logic (Core Algorithm)
Instead of relying on stateful background workers (cron jobs) to update database rows, the system calculates the active content **on-the-fly** at the exact millisecond of the GET request. 
* **The Algorithm:** The system fetches all legally active content for a given subject (where `NOW()` is between `start_time` and `end_time`). It calculates the total cycle duration ($C$) and applies a modulo operation against the current epoch timestamp ($t_{offset}$). 
* **Why:** This mathematically guarantees $O(N)$ resolution of the active item with zero database writes, zero race conditions, and perfect horizontal scalability. 

## 8. Scalability Approach
* **Statelessness:** The API is entirely stateless. Auth is handled via JWTs (no session memory), and rotation is calculated via math rather than in-memory circular linked lists. This allows the API to be horizontally scaled behind a Load Balancer immediately.
* **Future Caching:** Because the `/content/live` endpoint calculation is deterministic based on time, it is a prime candidate for Redis caching (e.g., caching the calculated result with a TTL equal to the remaining seconds of the current item's rotation).