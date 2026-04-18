# DocuMind

> AI-powered SaaS platform for high-performance document intelligence and automated resume screening.

DocuMind is a scalable, enterprise-grade solution built with a comprehensive tech stack including NestJS, Angular, and Python. It leverages Retrieval-Augmented Generation (RAG) and specialized AI models to deliver intelligent document analysis and automated screening capabilities.

---

## Core Capabilities

- **Intelligent Document Analysis**: Advanced RAG-powered extraction and understanding of document content
- **Resume Screening**: Automated analysis using specialized ML models
- **Interactive Query Interface**: Real-time chat for document exploration and Q&A
- **Event-Driven Processing**: High-reliability document pipeline with RabbitMQ and MinIO
- **Scalable Architecture**: Built on Nx monorepo for organized, maintainable codebase

---

## System Architecture

DocuMind uses an event-driven, microservices architecture:

```
[User Upload] → [NestJS API] → [RabbitMQ Queue] → [Python AI Service] → [Database]
                      ↓                                    ↓
                   MinIO Storage                      MongoDB / Qdrant
```

**Components:**
- **API Layer** (`apps/backend/api`): Document management, user uploads, virus scanning
- **Message Queue**: RabbitMQ for reliable event processing
- **AI Service** (`services/ai-service`): Python-based document processing and embedding generation
- **Storage**: MinIO (document storage), MongoDB/Qdrant (metadata and embeddings)

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Monorepo** | [Nx](https://nx.dev/) |
| **Backend** | [NestJS](https://nestjs.com/) (Node.js 22) |
| **Frontend** | Angular with RxJS, Material Design |
| **AI/ML** | Python 3.11, FastAPI/Uvicorn |
| **Databases** | MongoDB, Qdrant (vector store) |
| **Message Queue** | RabbitMQ |
| **Object Storage** | MinIO (S3-compatible) |
| **Containerization** | Docker |
| **CI/CD** | GitHub Actions |

## Quick Start

### Prerequisites

- Node.js 22.x or higher
- Docker and Docker Compose
- Nx CLI: `npm install -g nx`
- Python 3.11+ (for AI service development)

### Installation

1. **Clone and Install**:
   ```bash
   git clone https://github.com/your-org/docu-mind.git
   cd docu-mind
   npm install --legacy-peer-deps
   ```

2. **Start Infrastructure**:
   ```bash
   npm run services:dev
   ```
   This starts RabbitMQ, MongoDB, MinIO, and other required services.

3. **Run Development Servers**:
   ```bash
   # In separate terminals:
   npx nx serve api              # Backend on http://localhost:3000
   npx nx serve documind-ui      # Frontend on http://localhost:4200
   python services/ai-service/main.py  # AI service
   ```

4. **Access the Application**:
   - UI: http://localhost:4200
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api

---

## Development

### Common Commands

```bash
# Linting
npx nx run-many --target=lint

# Testing
npx nx run-many --target=test
npx nx run-many --target=test --coverage

# Building
npx nx run-many --target=build --configuration=production

# Visualization
npx nx graph

# Run specific project
npx nx serve <project-name>
npx nx build <project-name>
```

### Project Structure

```
.
├── apps/
│   ├── backend/api/          # NestJS API server
│   ├── web-ui/documind-ui/   # Angular frontend
│   └── transcription-worker/ # Transcription service
├── services/
│   └── ai-service/           # Python AI service
├── packages/                 # Shared libraries
├── docker/                   # Docker configurations
└── monitoring/              # Prometheus, Loki config
```

---

## Contributing

We welcome contributions from the community. Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** with clear messages: `git commit -am 'Add feature: description'`
4. **Push** to your branch: `git push origin feature/your-feature-name`
5. **Submit** a Pull Request

For major changes, please open an issue first to discuss proposed changes.

---

## Resources

- **Documentation**: See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Security**: Review [SECURITY.md](SECURITY.md)
- **License**: This project is licensed under the MIT License - see [LICENSE](LICENSE) for details

---

## Support

For questions and support, please open an issue on GitHub or reach out to the maintainers.

---

**Built with ❤️ for intelligent document processing**

