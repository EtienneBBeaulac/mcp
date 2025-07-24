# Contributing to WorkRail

First off, thank you for considering contributing to WorkRail! It's people like you that make open source such a great community. We welcome any and all contributions.

This document provides guidelines for contributing to the project. Please read it carefully to ensure that your contributions can be merged smoothly.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before you start.

## How Can I Contribute?

There are many ways to contribute, from writing tutorials or blog posts, improving the documentation, submitting bug reports and feature requests or writing code which can be incorporated into WorkRail itself.

### Reporting Bugs

If you find a bug, please create an issue in our GitHub repository. When filling out the issue, please provide as much detail as possible, including:
*   A clear and descriptive title.
*   A step-by-step description of how to reproduce the bug.
*   The expected behavior and what actually happened.
*   Your environment details (OS, Node.js version, etc.).

### Suggesting Enhancements

If you have an idea for a new feature or an enhancement to an existing one, please create an issue. This lets us discuss the idea before you spend time on an implementation. When creating the issue, please provide:
*   A clear and descriptive title.
*   A detailed description of the proposed enhancement.
*   The motivation or use case for the change.

### Your First Code Contribution

Unsure where to begin? You can start by looking through `good first issue` and `help wanted` issues:
*   [Good first issues](https://github.com/EtienneBBeaulac/mcp/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) - issues which should only require a few lines of code, and a test or two.
*   [Help wanted issues](https://github.com/EtienneBBeaulac/mcp/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) - issues which should be a bit more involved than `good first issue` issues.

## Development Setup

Ready to contribute code? Here’s how to set up your environment.

1.  **Fork and Clone:** Fork the repository to your own GitHub account and then clone it to your local machine.
    ```bash
    git clone https://github.com/EtienneBBeaulac/mcp.git
    cd mcp/packages/workrail
    ```
2.  **Install Dependencies:** We use `npm` for package management.
    ```bash
    npm install
    ```
3.  **Build the Project:** The project is written in TypeScript and needs to be compiled.
    ```bash
    npm run build
    ```
4.  **Run Tests:** Before making any changes, run the tests to make sure everything is working correctly.
    ```bash
    npm test
    ```

## Pull Request Process

1.  **Create a Branch:** Create a new branch for your changes.
    ```bash
    git checkout -b feature/your-feature-name
    ```
2.  **Make Your Changes:** Make your code changes. Remember to:
    *   Follow the existing code style.
    *   Add or update tests for your changes.
    *   Update the documentation if necessary.
    *   Ensure all tests pass.
3.  **Commit Your Changes:** Use a clear and descriptive commit message. We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
    ```bash
    git commit -m "feat: Add new feature"
    ```
4.  **Push to Your Fork:**
    ```bash
    git push origin feature/your-feature-name
    ```
5.  **Create a Pull Request:** Open a pull request from your fork to the main WorkRail repository. Provide a clear description of your changes and link to any relevant issues.

Thank you for your contribution! 