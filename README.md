# 💬 Micro Chat Client

An elegant, real-time chat application frontend built with **Angular** and styled with a modern **Glassmorphism** aesthetic. This project serves as the presentation layer for a robust, distributed microservices backend.

## 🚀 Tech Stack

*   **Framework:** Angular (TypeScript)
*   **Styling:** SCSS with CSS Variables & Glassmorphism UI
*   **State Management & Reactivity:** RxJS
*   **Real-time Communication:** WebSockets (STOMP protocol)
*   **Security:** JWT Authentication handling

## 🏗️ Backend Architecture
This client connects to a scalable backend ecosystem featuring:
*   **Spring Cloud Gateway** for API routing.
*   **Spring Boot Microservices** (User, Messaging, Notification).
*   **RabbitMQ** for message brokering.
*   **Redis** for fast token validation and caching.
*   **PostgreSQL & MongoDB** for relational and document data storage.

## 🛠️ Getting Started

1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/micro-chat-client.git](https://github.com/your-username/micro-chat-client.git)
   ```

2. Install dependencies:
    ```Bash

    cd micro-chat-client
    npm install
    ```

3. Run the development server:
    ```Bash

    ng serve

    ```

4. Navigate to `http://localhost:4200/`.

---
*Developed as part of a distributed systems and modern UI architecture study.*