# DocuMind 🧠

DocuMind is an **AI-powered SaaS platform** designed for high-performance document intelligence and automated resume screening. Built as a scalable **Nx Monorepo**, it integrates a NestJS backend with specialized Python AI services to handle complex document extraction and analysis.

---

## 🚀 Key Features

- **Intelligent RAG**: Advanced Retrieval-Augmented Generation for deep document understanding.
- **Automated Screening**: Automated resume analysis using specialized AI models.
- **Event-Driven Architecture**: High-reliability processing using RabbitMQ and MinIO.
- **Nx Monorepo**: Unified development experience for API, UI, and AI Workers.
- **Production-Grade CI/CD**: Optimized GitHub Actions with Docker-native caching.

---

## 🏗 System Architecture

DocuMind follows a decoupled, event-driven pattern for document processing:

1.  **API (`apps/backend/api`)**: Handles user uploads, virus scanning, and initial storage in **MinIO**.
2.  **Messaging**: Publishes a `document.uploaded` event to **RabbitMQ**.
3.  **AI Service (`services/ai-service`)**: Consumes the event, fetches the document, and runs the extraction/vectorization pipeline.
4.  **Storage**: Extracted data and embeddings are stored in specialized databases (MongoDB/Qdrant).

---

## 🛠 Tech Stack

- **Monorepo**: [Nx](https://nx.dev/)
- **Backend**: [NestJS](https://nestjs.com/) (Node.js 22)
- **AI/ML**: Python 3.11, [Uvicorn](https://www.uvicorn.org/)
- **Databases**: [MongoDB](https://www.mongodb.com/), [Qdrant](https://qdrant.tech/)
- **Messaging**: [RabbitMQ](https://www.rabbitmq.com/)
- **Storage**: [MinIO](https://min.io/) (S3 Compatible)
- **DevOps**: Docker, [GitHub Actions](https://github.com/features/actions)

---

## 🚥 Getting Started

### Prerequisites
- Node.js 22.x
- Docker & Docker Compose
- Nx CLI (`npm i -g nx`)

### Setup
1.  **Install Dependencies**:
    ```bash
    npm install --legacy-peer-deps
    ```

2.  **Run Infrastructure**:
    ```bash
    npm run services:dev
    ```

3.  **Start Development Servers**:
    - **API**: `npx nx serve api`
    - **UI**: `npx nx serve documind-ui`
    - **AI**: `cd services/ai-service && python main.py`

---

## 📈 Development Commands

| Task | Command |
| :--- | :--- |
| **Lint All** | `npx nx run-many -t lint` |
| **Test All** | `npx nx run-many -t test` |
| **Build All** | `npx nx run-many -t build --prod` |
| **Project Graph** | `npx nx graph` |

---

