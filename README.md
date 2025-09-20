# Task Sphere - Collaborative Project Management Tool

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

This is the backend for Task Sphere, a progressive and collaborative project management tool built with the [NestJS](https://github.com/nestjs/nest) framework.

---

### 🚀 Live API

**Link:** [https://task-sphere-najim.up.railway.app](https://task-sphere-najim.up.railway.app)

**Note:** This project is deployed on a free-tier service (Railway). The service may spin down due to inactivity and the initial request might be slow. The free trial for this service will end after 30 days, after which the link may no longer be active.

---

## 1. Project Setup

Follow these steps to get the project running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later recommended)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/try/download/community)
- [Redis](https://redis.io/docs/getting-started/installation/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/najim2004/task-sphere.git
    cd task-sphere
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    - Create a `.env` file in the root directory by copying the example file:
      ```bash
      cp .env.example .env
      ```
    - Open the `.env` file and fill in the required values:
      ```env
      MONGO_URI=your_mongodb_connection_string
      JWT_SECRET=your_strong_jwt_secret
      REDIS_HOST=127.0.0.1
      REDIS_PORT=6379
      REDIS_PASSWORD=
      ```

### Running the Application

-   **Development mode with watch:**
    ```bash
    npm run start:dev
    ```
-   **Production mode:**
    ```bash
    npm run build
    npm run start:prod
    ```

## 2. Architecture Overview

The application follows a modular architecture, leveraging the power of NestJS for separation of concerns and scalability.

-   **Core Framework**: [NestJS](https://nestjs.com/)
-   **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) for object data modeling (ODM).
-   **Authentication**: JWT-based authentication using [Passport.js](https://www.passportjs.org/).
-   **Real-time Communication**: [Socket.IO](https://socket.io/) for real-time features, particularly for the notification system.
-   **Caching**: In-memory and [Redis](https://redis.io/) caching via NestJS's `CacheModule` to improve performance.
-   **Background Jobs**: [Bull](https://github.com/OptimalBits/bull) with Redis for managing background jobs and queues.

### Key Modules

-   `/src/modules/auth`: Handles user login and JWT strategy.
-   `/src/modules/users`: Manages user creation and profiles.
-   `/src/modules/projects`: Manages projects and team members.
-   `/src/modules/tasks`: Manages tasks within projects.
-   `/src/modules/notifications`: A complete real-time notification system.

### Notification System Flow

1.  **Event Trigger**: An action in a service (e.g., `TasksService`) triggers a notification.
2.  **Service Call**: The service calls `NotificationsService` with recipient and payload data.
3.  **Persistence**: `NotificationsService` saves the notification to the MongoDB database.
4.  **Real-time Push**: The service then calls `NotificationsGateway`.
5.  **WebSocket Emission**: The gateway pushes the notification to the recipient's private room via Socket.IO, delivering it instantly to the client-side.

## 3. Scalability Considerations

The architecture is designed with scalability in mind:

1.  **Stateless Application Layer**: The NestJS application is stateless. You can run multiple instances of the application behind a load balancer to handle increased traffic.

2.  **Database Scaling**: MongoDB can be scaled horizontally using **sharding** and made highly available using **replica sets**.

3.  **WebSocket Scaling**: To scale the real-time layer across multiple instances, the default Socket.IO server needs a Redis adapter. This allows different server instances to broadcast events to all clients, regardless of which instance a client is connected to. You can implement this using NestJS's platform-socket.io adapters.

4.  **Decoupled Job Queue**: By using Bull and Redis, background tasks (e.g., sending emails, processing data) are decoupled from the main application flow. The queue workers can be scaled independently as needed.

## 4. Contact

-   **Name**: [Najim]
-   **Email**: [najim.developer@gmail.com]
-   **GitHub**: [https://github.com/najim2004]
-   **Portfolio**: [https://najim-dev.vercel.app]

---
*This README was generated and updated by Gemini.*