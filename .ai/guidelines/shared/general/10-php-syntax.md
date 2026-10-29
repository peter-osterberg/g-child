# PHP Guidelines

- Do not use Yoda comparisons.
- Always use curly braces for control structures, even single-line branches.
- Use explicit parameter types and return types when the value contract is known.
- Express type contracts with native PHP types where possible, while retaining PHPDoc tags required by the repository's documentation convention.
- Add PHPDoc for public, shared, non-obvious, or complex array-shape APIs unless the repository requires broader documentation.
- Write PHPDoc as multiline blocks with `/**` and `*/` on their own lines, a summary, and a blank `*` line before any tags. Do not collapse PHPDoc into a one-line comment. Match the repository's summary style and tag descriptions.
- For documented functions and methods, include `@param` tags for declared parameters and an explicit `@return` tag, including `@return void` when no value is returned, even when native types repeat this information. Constructors and destructors do not need a return tag.
- Use PHPDoc array-shape types when an array has a meaningful structure that native types cannot express.
- Prefer constructor property promotion when it matches the repository style and only replaces simple property assignment.
- Remove empty zero-argument constructors unless they are intentionally private.
- Follow the repository's existing enum case naming convention.
- PHP spacing rule: do not use column alignment outside multiline arrays. Use one space around assignment and compound-assignment operators, and one space between PHPDoc fields. This overrides nearby aligned code style for touched lines. Preferred: `@param string $form_id Form ID.` and `$this->path = $this->normalize_path( $path );`. Rejected: `@param string              $form_id Form ID.` and `$this->path    = $this->normalize_path( $path );`.
- In multiline arrays, align the `=>` operators for key/value pairs.
- Prefer strict comparisons when the expected type and sentinel value are known, such as `$str !== ''` for a known string.
- In WordPress boundary code with ambiguous optional values or array keys, use `empty()` when missing values and all falsey values should mean "not usable"; `empty()` is safe for undefined array keys.
- Use `isset()` for optional variables or array keys when the value only needs to exist and be non-`null`, especially when falsey values such as `0`, `'0'`, `false`, or `''` are valid.
- Use `array_key_exists()` when `null` is a meaningful present value.
- Avoid `empty()` when `'0'`, `0`, `false`, `null`, `[]`, or `''` have distinct valid meanings.
- Prefer early returns over deep nesting.
- Avoid `??` and inline ternaries when a simple `if` statement is clearer.
- Sanitize input and escape output in WordPress-facing code.
- Keep WordPress templates presentation-focused and avoid moving business logic into template markup.
- Use existing WordPress helpers, field-access patterns, and template-part conventions before introducing new rendering helpers.
- Keep rendered markup semantic and shallow; use buttons for actions, links for navigation, and preserve sensible heading hierarchy.
- Make CMS-driven template content resilient to empty, missing, long, or unexpected values.
- Match existing naming, visibility, and structure in the surrounding code unless it makes the edited code harder to understand.

Example for a method returning no value:

```php
/**
 * Load the custom field only where G-Theme's builder is active.
 *
 * @return void
 */
public function enqueue_editor(): void {
    // Enqueue editor assets.
}
```
