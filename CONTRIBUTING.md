# Contributing to Orivon

Thank you for your interest in contributing to **Orivon**! We welcome bug fixes, documentation, feature requests, and code improvements.

---

## 1. Development Workflow

1.  **Fork and Clone**: Fork the repository on GitHub and clone your fork locally.
2.  **Branching**: Create a clean feature branch off the `main` branch:
    ```bash
    git checkout -b feature/your-awesome-feature
    ```
3.  **Local Development Setup**: Follow the setup instructions in the [README.md](README.md) file.
4.  **Verification Check**: Before opening a pull request, run the unified verification script to ensure formatting, linting, type checks, and tests pass:
    ```bash
    ./scripts/verify.sh
    ```

---

## 2. Coding Standards

### Python (Backend)
-   We use [Ruff](https://github.com/astral-sh/ruff) for linting and code formatting.
-   Format code automatically:
    ```bash
    cd backend
    pip install ruff
    ruff format .
    ruff check --fix .
    ```

### TypeScript/React (Frontend)
-   We use **ESLint** and **TypeScript** for code quality.
-   Run linting and compile validations:
    ```bash
    cd frontend
    npm run lint
    npm run typecheck
    ```

---

## 3. Testing Policies

-   **Backend Unit Tests**: Covered by `pytest`. Run `pytest -v` inside the `backend` folder.
-   **Frontend End-to-End (E2E) Tests**: Covered by `playwright`. Run `npx playwright test` inside the `frontend` folder.
-   **No Broken Tests**: Every pull request must pass all existing tests before it can be merged.

---

## 4. Commit Message Standards

We use structured semantic commit messages (similar to Angular/Conventional Commits):
*   `feat(...)`: New user-facing features (e.g. `feat(frontend): add Google sign-in integration`).
*   `fix(...)`: Technical bug fixes (e.g. `fix(backend): patch rate limit token reset timestamp`).
*   `style(...)`: Code style-only changes (formatting, spacing, imports cleanup).
*   `docs(...)`: Documentation additions or corrections (e.g. `docs: update API schemas in TRD`).
*   `chore(...)`: Repo tooling, dependency updates, and environment scripts.
