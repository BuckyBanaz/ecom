# High-Scale System Architecture for Millions of Concurrent Users

To handle millions of concurrent users and a massive influx of orders without crashing, the application architecture must evolve from a simple monolithic/single-instance design to a distributed, highly scalable, and event-driven architecture. 

Below is the proposed system architecture specifically tailored to handle massive spikes in traffic (e.g., flash sales, holiday traffic) using caching, message queues, and horizontal scaling.

---

## 1. High-Level Architecture Diagram Flow

1. **Client (Web/Mobile)** -> **CDN** -> **Load Balancer** -> **API Gateway**
2. **API Gateway** -> **Node.js Backend Instances** (Horizontally Scaled)
3. **Backend Instances** -> **Redis Cache** (For fast reads and rate limiting)
4. **Backend Instances** -> **Message Broker (Kafka / RabbitMQ)** (For async order queuing)
5. **Worker Services** -> Pull from Message Broker -> **PostgreSQL Database** (Writes)
6. **Backend Instances** -> **PostgreSQL Read Replicas** (Reads)

---

## 2. Component Breakdown

### A. Content Delivery Network (CDN) & Load Balancing
- **CDN (Cloudflare / AWS CloudFront):** All static frontend assets (React app, images, CSS, JS) are cached globally on edge servers. This ensures the backend only receives API requests, not static file requests.
- **Load Balancer (AWS ALB / Nginx):** Distributes incoming API requests evenly across multiple backend server instances to prevent any single instance from becoming a bottleneck.

### B. Application Servers (Node.js / Express)
- **Horizontal Scaling via Kubernetes:** The backend runs in Docker containers orchestrated by Kubernetes (K8s). When CPU or memory usage spikes, K8s automatically spins up hundreds of new backend instances (pods) to handle the load.
- **Stateless Design:** Backend instances do not store any local session data. This allows any request to be handled by any server instance seamlessly.

### C. The Caching Layer (Redis)
**Redis is critical for surviving massive traffic spikes.**
- **Catalog Caching:** Categories, Product lists, and Product details are stored in Redis. When 1 million users browse the site, 99% of requests are served directly from Redis RAM (sub-millisecond latency) rather than querying PostgreSQL.
- **Inventory Caching:** Available stock limits can be cached in Redis with atomic decrements (`DECR`) to handle concurrent purchases of the same item without database deadlocks.
- **Rate Limiting & DDOS Protection:** Redis is used to track IP requests and block malicious traffic or overly aggressive scraping.

### D. Async Order Processing (Kafka / RabbitMQ / SQS)
When 1 million users try to checkout simultaneously, sending those requests directly to the database will cause connection exhaustion and immediate database crashes. 
- **The Solution (Event-Driven):** 
  1. The user clicks "Checkout".
  2. The backend quickly validates the request, places the order data into a **Kafka Topic** or **RabbitMQ Queue**, and immediately returns a "Pending" or "Processing" response to the user.
  3. The API request is complete in milliseconds.
- **Order Workers:** A separate cluster of internal worker microservices consumes the messages from the queue at a sustainable rate. They process the payment, deduct inventory in the DB, and insert the final order record.
- **Webhooks/Sockets:** Once the worker completes the order, a WebSocket message or polling update notifies the frontend that the order is "Confirmed".

### E. Database Layer (PostgreSQL)
- **Primary-Replica Architecture:** 
  - **1 Primary DB:** Handles all writes (Insert Order, Update User).
  - **Multiple Read Replicas:** Handle all read queries that miss the Redis cache.
- **Connection Pooling:** Using a tool like **PgBouncer**, which sits between the Node apps and PostgreSQL. It manages a pool of connections so that even if there are 10,000 backend instances, the database only maintains a healthy, fixed number of active connections.
- **Database Sharding/Partitioning:** The `Order` table is partitioned by date (e.g., a new partition every month) to ensure fast inserts and index updates even when storing hundreds of millions of records.

### F. Search Engine (Elasticsearch / Typesense)
- Full-text search ("find me blue outdoor string lights") is highly CPU intensive for relational databases.
- We offload search queries to a dedicated search cluster (Elasticsearch), ensuring the primary PostgreSQL database is purely focused on transactional integrity.

---

## 3. The "Flash Sale" Order Flow (Example)

1. **User Browses:** Traffic hits Cloudflare CDN -> Load Balancer -> Node API. The API pulls product data instantly from **Redis**. PostgreSQL is untouched.
2. **User Clicks "Buy":** Node API atomically checks and decrements the inventory count in **Redis** (`HINCRBY inventory:product_id -1`).
3. **Queueing:** Node API publishes an `OrderPlaced` event to **Kafka** and tells the user: *"Your order is being processed."*
4. **Processing (Background):** A Worker service pulls the `OrderPlaced` event, calls the Payment Gateway (Stripe/Razorpay), and upon success, writes the permanent order record to the **PostgreSQL Primary Database**.
5. **Completion:** The Worker updates the order status in Redis, and the frontend updates the UI for the user.

## Summary

By decoupling **Reads** (using Redis + Replicas) from **Writes** (using Message Queues + Workers), the system can absorb sudden, immense spikes in traffic. If 1 million users place an order at the exact same second, the message queue simply absorbs them, and the workers process them as fast as the database allows, without a single dropped connection or server crash.

---

## 4. What We Need To Implement (Step-by-Step)

If we want to start building this into our current codebase, here is the exact order of implementation:

### Phase 1: Implement Redis Caching (High Priority, Easiest)
1. **Setup Redis:** Run a local Redis server (e.g., via Docker).
2. **Backend Integration:** Install `ioredis` in our Express backend.
3. **Cache the Catalog:** Add caching middleware to `GET /api/v1/catalog/products` and categories. If data is in Redis, return it instantly. If not, fetch from PostgreSQL and save it to Redis.
4. **Cache Invalidation:** When an Admin creates/updates a product, delete the related Redis cache key so users get fresh data.

### Phase 2: Async Order Queue (Crucial for Flash Sales)
1. **Setup Message Broker:** Spin up RabbitMQ (easier) or Kafka.
2. **Refactor Checkout API:** Change the checkout endpoint so it *does not* write to PostgreSQL immediately. Instead, it pushes the JSON order data into a RabbitMQ queue (`orders_queue`) and returns a `202 Accepted (Processing)` status to the frontend.
3. **Build the Worker:** Create a separate Node.js script (`worker.ts`) that constantly listens to `orders_queue`. When it gets a message, it safely updates the database and processes the payment one by one.

### Phase 3: Database & Code Optimization
1. **Prisma Connection Pooling:** Update our `.env` database URL to include connection pooling parameters (e.g., `?connection_limit=20`) to prevent Node.js from overwhelming Postgres.
2. **Database Indexing:** Ensure fields we search by frequently (like `slug`, `categoryId`) have `@@index` in our `schema.prisma`.
3. **Rate Limiting:** Add `express-rate-limit` with a Redis store to prevent bots from DDOSing our login and checkout endpoints.

### Phase 4: Production Deployment Architecture
1. **Dockerize:** Write `Dockerfile`s for the frontend, backend, and workers.
2. **Reverse Proxy:** Setup **Nginx** as a load balancer to run 4 or more instances of our Node.js backend.
3. **CDN Integration:** Put Cloudflare in front of the frontend domain to cache all images, CSS, and JS globally.
