```markdown
# medschoolprep-dev Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill covers the core development conventions and patterns used in the `medschoolprep-dev` repository, a React-based JavaScript codebase. It documents file naming, import/export styles, commit patterns, and testing practices to ensure consistency and maintainability across the project.

## Coding Conventions

### File Naming
- **Convention:** camelCase for filenames.
- **Example:**  
  - `userProfile.js`
  - `dashboardHeader.jsx`

### Import Style
- **Convention:** Use relative imports for modules within the project.
- **Example:**
  ```javascript
  import userService from '../services/userService';
  import { DashboardHeader } from './dashboardHeader';
  ```

### Export Style
- **Convention:** Use named exports for all modules.
- **Example:**
  ```javascript
  // userProfile.js
  export function UserProfile(props) {
    // ...
  }
  ```

### Commit Patterns
- **Type:** Freeform, no strict prefixes.
- **Average length:** 94 characters per commit message.
- **Example:**
  ```
  Add validation to registration form and update error handling for edge cases
  ```

## Workflows

### Adding a New Component
**Trigger:** When you need to introduce a new UI component.
**Command:** `/add-component`

1. Create a new file using camelCase naming (e.g., `myNewComponent.jsx`).
2. Implement the component using React functional components.
3. Use named exports.
4. Import the component where needed using a relative path.
5. If applicable, create a corresponding test file (`myNewComponent.test.jsx`).

### Refactoring Code
**Trigger:** When improving or restructuring existing code for clarity or performance.
**Command:** `/refactor-code`

1. Identify the target file(s) using camelCase naming.
2. Update imports/exports to maintain relative and named conventions.
3. Update or add tests as needed.
4. Commit changes with a descriptive, freeform message.

### Writing Tests
**Trigger:** When adding new features or fixing bugs.
**Command:** `/write-test`

1. Create a test file with the pattern `*.test.js` or `*.test.jsx` (e.g., `userProfile.test.jsx`).
2. Write tests for each exported function or component.
3. Use the project's preferred testing framework (framework not specified).
4. Run tests to ensure correctness.

## Testing Patterns

- **File Pattern:** Test files use the `*.test.*` naming convention.
- **Placement:** Test files are typically placed alongside the modules they test.
- **Framework:** Not specified, but follow standard JavaScript/React testing practices.
- **Example:**
  ```javascript
  // userProfile.test.jsx
  import { UserProfile } from './userProfile';

  test('renders user profile with correct name', () => {
    // ...test implementation
  });
  ```

## Commands
| Command         | Purpose                                             |
|-----------------|-----------------------------------------------------|
| /add-component  | Scaffold and integrate a new React component        |
| /refactor-code  | Refactor existing code while maintaining conventions|
| /write-test     | Create and run tests for a component or module      |
```
