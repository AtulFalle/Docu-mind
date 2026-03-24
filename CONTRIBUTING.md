# Contributing to DocuMind

First off, thank you for considering contributing to DocuMind! It's people like you that make it a great tool.

This document provides guidelines and instructions for contributing to this Nx-powered monorepo.

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js 22.x** (LTS)
- **npm 10.x**
- **Docker & Docker Compose**
- **Nx CLI** (Optional: `npm install -g nx`)

### Setup the Project
1. **Clone the repository:**
   ```bash
   git clone https://github.com/AtulFalle/Docu-mind.git
   cd Docu-mind
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Spin up local infrastructure (MongoDB, etc.):**
   ```bash
   npm run services:dev
   ```

---

## 🛠 Development Workflow

### Nx Commands
This project uses **Nx** for monorepo management. Some common commands:

- **Serve the API:** `npx nx serve api`
- **Serve the UI:** `npx nx serve documind-ui`
- **Run the AI Service:** `cd services/ai-service && python main.py`
- **Run Tests:** `npx nx test <project-name>`
- **Lint Code:** `npx nx lint <project-name>`

### Branching Strategy
We follow **GitHub Flow**:
1. Branch from `master` using a descriptive name (e.g., `feat/auth-integration` or `fix/api-caching`).
2. Commit your changes locally.
3. Push to your branch and create a Pull Request.

---

## 📝 Coding Standards

### Linting & Formatting
We enforce strict linting and formatting to maintain code quality.
- **Linting:** We use ESLint. Run `npx nx lint` before committing.
- **Formatting:** We use Prettier. Run `npx nx format:write` to fix formatting issues.

### Commit Message Convention
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Example:** `feat(api): add resume screening endpoint`

---

## 🤝 Pull Request Process

1. **Keep it Small:** Smaller PRs are easier to review and merge.
2. **Update Documentation:** If you add a new feature, update the relevant README or docs.
3. **Verify CI:** Ensure the GitHub Actions pipeline passes. The pipeline checks:
   - Linting
   - Unit Tests
   - Successful Build
4. **Self-Review:** Look over your code one last time before requesting a review.

### Review Process
At least one maintainer must approve your PR before merging. We might ask for changes to keep the code consistent with the project's architecture.

---
