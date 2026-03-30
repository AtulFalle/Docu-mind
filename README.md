# DocuMind 🧠

DocuMind is an **AI-powered SaaS platform** designed for high-performance document intelligence and automated resume screening. Built as a scalable **Nx Monorepo**, it integrates a NestJS backend with specialized Python AI services to handle complex document extraction and analysis.

---

## 🚀 Key Features

- **Intelligent RAG**: Advanced Retrieval-Augmented Generation for deep document understanding.
- **Automated Screening**: Automated resume analysis using specialized AI models.
- **AI-Powered Chat**: Interactive chat interface to query and analyze documents with real-time AI responses.
- **Event-Driven Architecture**: High-reliability processing using RabbitMQ and MinIO.
- **Nx Monorepo**: Unified development experience for API, UI, and AI Workers.
- **Production-Grade CI/CD**: Optimized GitHub Actions with Docker-native caching.

---

## 💬 Chat Feature

The DocuMind Chat feature enables users to interactively query their documents through a ChatGPT-like interface:

### Overview
- **Real-time Document Querying**: Ask questions about specific documents and receive AI-powered answers
- **Context-Aware Responses**: AI analyzes document content to provide accurate, contextual responses
- **Related Documentation**: System identifies and displays related documents referenced in responses
- **Clean UI**: Material Design-based interface with message history and loading states

### User Flow
1. User uploads a document from the dashboard
2. Once processed, document appears with a **Chat** button in the actions column
3. Clicking **Chat** opens the chat interface for that specific document
4. User can ask questions about the document content
5. Backend processes the query via the LLM service and returns AI-generated answers
6. Chat maintains conversation history within the session

### API Endpoint

**POST** `/api/documents/:docId/query`

**Request Body**:
```json
{
  "question": "What are the main points in this document?"
}
```

**Response**:
```json
{
  "answer": "The document discusses...",
  "relatedDocuments": ["doc-001", "doc-002"]
}
```

### Architecture

```
Frontend (Angular)
    ↓
ChatComponent receives docId from URL
    ↓
ChatService makes API call to /api/documents/:docId/query
    ↓
NestJS Backend (DocumentController)
    ↓
AI Queue Service (RabbitMQ)
    ↓
Python AI Service (LLM Processing)
    ↓
Returns: { answer, relatedDocuments }
    ↓
Frontend displays message with context
```

### Implementation Details

**Frontend**:
- **Component**: `apps/web-ui/documind-ui/src/app/features/chat/`
- **Service**: `apps/web-ui/documind-ui/src/app/core/services/chat.service.ts`
- **SubComponents**: 
  - `MessageListComponent` - Displays chat messages with animations
  - `MessageInputComponent` - Text input for user queries
- **State Management**: Angular Signals for reactive state updates
- **Change Detection**: OnPush for optimal performance

**Backend**:
- **Endpoint**: `apps/backend/api/src/document/document.controller.ts:query()`
- **Service**: Handles document context and AI query delegation
- **Integration**: Integrates with RabbitMQ queue for AI service communication

### Features

✅ **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices  
✅ **Auto-Scroll**: Chat automatically scrolls to latest message  
✅ **Smooth Animations**: Messages appear with slide-in animation  
✅ **Error Handling**: User-friendly error messages for failed queries  
✅ **Loading States**: Visual indicators while processing queries  
✅ **Clear History**: Option to reset chat and start fresh conversation  
✅ **Message Timestamps**: Each message shows when it was sent  
✅ **Related Documents**: Shows which documents are referenced in responses  

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
| **Serve UI** | `npx nx serve documind-ui` |
| **Serve API** | `npx nx serve api` |

---

## 📚 Chat Feature Development Guide

### Accessing the Chat Feature

1. Start the development servers:
   ```bash
   npm run services:dev  # Infrastructure
   npx nx serve api     # Backend
   npx nx serve documind-ui  # Frontend
   ```

2. Navigate to Dashboard (`http://localhost:4200/dashboard`)

3. Upload or select a document and click the **Chat** icon in the actions column

4. Start asking questions about the document

### File Structure

```
apps/web-ui/documind-ui/src/app/
├── features/
│   └── chat/
│       ├── chat.ts              # Main component
│       ├── chat.html            # Template
│       └── chat.scss            # Styles
├── ui/
│   ├── message-input/           # Input component
│   │   ├── message-input.ts
│   │   ├── message-input.html
│   │   └── message-input.scss
│   └── message-list/            # Messages component
│       ├── message-list.ts
│       ├── message-list.html
│       └── message-list.scss
└── core/
    ├── services/
    │   └── chat.service.ts      # API integration
    └── models/
        └── chat.types.ts        # TypeScript interfaces
```

### Extending the Chat Feature

#### Add Custom Response Processing

Update `ChatService.sendMessage()` to add custom logic:

```typescript
async sendMessage(userMessage: string, docId: string): Promise<void> {
  // Add custom preprocessing
  const processedMessage = this.preprocessQuery(userMessage);
  
  // Call API
  const response = await fetch(`/api/documents/${docId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: processedMessage })
  });
  
  // Process response
  const data = await response.json();
  this.addAssistantMessage(data.answer, data.relatedDocuments);
}
```

#### Customize Message Display

Modify `MessageListComponent` template to add custom styling or features:

```html
<div class="message-item__content custom-styling">
  {{ message.content }}
</div>
```

#### Backend Integration (NestJS)

Update the query endpoint in `DocumentController`:

```typescript
@Post(':docId/query')
async query(
  @Param('docId') docId: string,
  @Body() body: { question: string }
): Promise<{ answer: string; relatedDocuments?: string[] }> {
  // Custom logic here
  return this.service.query(docId, body.question);
}
```

### Testing the API Endpoint

Use cURL to test the chat API:

```bash
curl -X POST http://localhost:3000/api/documents/doc-123/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this document about?"}'
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---



wisper path:
cd whisper.cpp
./build/bin/whisper-cli \ -m ./models/ggml-base.en.bin \ -f ../data/audio.wav \ --output-json \ -of /data/output

