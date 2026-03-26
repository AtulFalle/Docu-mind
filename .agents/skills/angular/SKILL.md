# 🏢 Enterprise Angular Engineering Guide (Angular 20+, Nx, Material, Resource API)

## 📌 Context

* Nx Monorepo
* Angular 20+ (Standalone + Signals + Resource API)
* Project: `apps/web-ui/documind-ui`
* Backend: NestJS
* UI: Angular Material (STRICT)
* ❌ RxJS NOT allowed
* ❌ HttpClient NOT allowed
* ❌ `!important` NOT allowed
* ✅ SCSS with BEM methodology

---

# 🎯 1. Core Principles

### 1.1 Signals + Resource First

* `signal()` → state
* `resource()` → async data
* No RxJS usage

---

### 1.2 Angular Material is Mandatory

* All UI must use Angular Material components
* Do NOT build raw HTML equivalents unless necessary
* Wrap Material components inside `ui/` layer

---

### 1.3 Readability First

* Code must be understandable within 30 seconds
* Prefer explicit naming over short forms

---

### 1.4 Size Constraints

* Max **300 lines per file**
* Max **40 lines per function**
* Max **2 levels nesting**

---

# 🧱 2. Project Structure

```id="3u5n1u"
apps/
  we-ui/
    documind-ui/
      src/app/
        core/
        shared/
        ui/
        features/
```

---

# 🎨 3. UI & Angular Material Rules

## 3.1 Usage Rule

✅ Allowed:

```html id="z6m7xw"
<button mat-raised-button color="primary">Upload</button>
```

❌ Forbidden:

```html id="m2pt7m"
<button class="custom-button">Upload</button>
```

---

## 3.2 UI Abstraction Layer

```id="l0jv9f"
ui/
  button/
  input/
  dialog/
```

* Wrap Material components
* Add consistent styling + behavior

---

## 3.3 Theming

* Theme must come from **central UI library**
* Apps must NOT define their own themes

---

# 🧠 4. State Management (Signals)

```ts id="7c0r3t"
readonly documents = signal<Document[]>([]);
readonly isLoading = signal(false);
readonly error = signal<string | null>(null);
```

---

# 🌐 5. Resource API (MANDATORY)

```ts id="p9v2lw"
export const documentResource = resource({
  loader: async () => {
    const response = await fetch('/api/documents');

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    const data: DocumentDto[] = await response.json();
    return data.map(mapToDocument);
  }
});
```

---

# 🔌 6. Component Rules

## 6.1 No API Calls

```ts id="3qg6yt"
// ❌
fetch('/api')

// ❌
HttpClient

// ✅
this.documentStore.reloadDocuments();
```

---

## 6.2 OnPush Mandatory

```ts id="p7kx4y"
changeDetection: ChangeDetectionStrategy.OnPush
```

---

# 🎯 7. SCSS Standards (STRICT BEM)

## 7.1 BEM Format

```scss id="e3kp8h"
.document-card {
  padding: 16px;

  &__title {
    font-weight: 600;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &--highlighted {
    background-color: #f5f5f5;
  }
}
```

---

## 7.2 Naming Rules

| Type     | Format            | Example          |
| -------- | ----------------- | ---------------- |
| Block    | `.component-name` | `.document-card` |
| Element  | `__element`       | `__title`        |
| Modifier | `--modifier`      | `--active`       |

---

## 7.3 Strict Rules

* ❌ No deep nesting (>2 levels)
* ❌ No IDs (`#id`)
* ❌ No inline styles
* ❌ No global overrides

---

## 7.4 ❌ `!important` STRICTLY FORBIDDEN

Instead:

### ✅ Use specificity correctly

```scss id="1nq7h6"
.document-card__title {
  color: var(--primary-color);
}
```

### ✅ Use Angular Material theming

### ✅ Use proper class structure

---

# 🎨 8. Styling with Angular Material

## 8.1 Override via Class (NOT `!important`)

```html id="q8t1vl"
<button mat-raised-button class="document-card__action-btn">
  Upload
</button>
```

```scss id="f5c2km"
.document-card__action-btn {
  border-radius: 8px;
}
```

---

## 8.2 Avoid Global Overrides

❌ Bad:

```scss id="k8n9wp"
.mat-button {
  color: red;
}
```

✅ Good:

```scss id="c3z8yx"
.document-card__button {
  color: red;
}
```

---

# 🔐 9. TypeScript Strict Rules

## 9.1 No `any`

```ts id="j5l2xq"
let data: unknown;
```

---

## 9.2 Naming Standards

```ts id="k7p9zn"
const documentList = [];
const isDocumentLoading = false;

function fetchDocuments(): Promise<Document[]> {}
```

---

## 9.3 Immutability

```ts id="r8v2mp"
readonly documents = signal<Document[]>([]);
```

---

# 🧹 10. Readability Rules

* No abbreviations (`doc`, `tmp`, `val`)
* No complex inline conditions
* Extract logic into functions

---

# 🚀 11. Performance

* Use `trackBy`
* Use `computed()`
* Avoid heavy template logic

---

# 🔒 12. Security

* Validate API responses
* Handle all errors explicitly

---

# 🚫 13. Anti-Patterns

* ❌ `!important`
* ❌ Raw HTML UI instead of Material
* ❌ Global CSS overrides
* ❌ RxJS
* ❌ HttpClient
* ❌ Large components (>300 LOC)

---

# ✅ 14. Code Review Checklist

* [ ] Angular Material used correctly
* [ ] No `!important`
* [ ] BEM naming followed
* [ ] No global CSS leakage
* [ ] Resource API used
* [ ] Signals used
* [ ] Clean naming
* [ ] < 300 LOC

---

# 🏁 Final Note

This ensures:

* Consistent UI across all apps
* Maintainable styling system
* Scalable design system
* Enterprise-grade frontend architecture

Strict adherence is mandatory.
