# Building UI with @hive/contracts

Sting MVPs share API shapes with bagend through **@hive/contracts**. Presentational components live in `src/app/shared/ui/` and only accept typed inputs — never Mongoose documents or ad-hoc JSON.

## Workflow

1. **Define the contract** — Add types in [hive-contracts](https://github.com/farseer89/hive-contracts) (e.g. `UserPublic`, future `JobSummary`).
2. **Map bagend responses** — Use allowlist mappers (`toUserPublic`) in bagend; never `...user.toJSON()`.
3. **Create shared UI** — Standalone component with `input.required<YourType>()`.
4. **Wire the feature** — Smart components call services; templates compose `shared/ui` pieces.
5. **Register in playground** — Add a `hive` category entry in `dev-ui-catalog.ts` for discoverability.

## Example: User card

```typescript
import { Component, input } from '@angular/core';
import { Card } from 'primeng/card';
import { Avatar } from 'primeng/avatar';
import type { UserPublic } from '@hive/contracts';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [Card, Avatar],
  template: `
    <div class="flex align-items-center gap-2">
      <p-avatar [label]="initials()" shape="circle" />
      <p-card>
        <p class="m-0 font-medium">{{ user().firstName }} {{ user().lastName }}</p>
        <p class="m-0 text-sm text-600">{{ user().email }}</p>
      </p-card>
    </div>
  `,
})
export class UserCardComponent {
  user = input.required<UserPublic>();

  initials(): string {
    const u = this.user();
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`;
  }
}
```

## Auth session typing

```typescript
import type { SignInResponse, StoredUserSession } from '@hive/contracts';

this.http.post<SignInResponse>(url, body).subscribe((data) => {
  const session: StoredUserSession = data;
  localStorage.setItem('currentUserData', JSON.stringify(session));
});
```

## Sheriff boundaries

- `features/*` may import `shared/ui`, `core/*`, and `@hive/contracts`.
- `shared/ui` must **not** import feature modules or HTTP services.
- Keep DTOs in hive-contracts; keep API clients in `core/`.

## Playground

Local dev: **UI Playground** in the shell (`/dev/ui`) when `enableDevRoutes` is true. Use it to browse PrimeNG components and Hive examples before extracting to `shared/ui/`.
