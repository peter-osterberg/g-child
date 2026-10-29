# CSS Guidelines

- Prefer low-specificity selectors.
- Keep selectors shallow and avoid deep nesting.
- Do not use `!important` unless there is no reasonable alternative.
- Prefer shared tokens or CSS custom properties over repeated hardcoded values.
- Keep spacing, sizing, and colors consistent with the existing system.
- Reuse existing utilities, mixins, and component variants before adding new styling primitives.
- Add new design tokens only for reusable design decisions, not incidental one-off values.
- Prefer component-local styles with clear modifier and state patterns.
- Keep responsive rules simple and consistent with the repository convention.
- Prefer explicit class or component selectors over broad tag selectors.
