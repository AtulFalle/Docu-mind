# DocuMind

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/nx-api/js?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Generate a library

```sh
npx nx g @nx/js:lib packages/pkg1 --publishable --importPath=@my-org/pkg1
```

## Run tasks

To build the library use:

```sh
npx nx build pkg1
```

To run any task with Nx use:

```sh
npx nx <target> <project-name>
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Versioning and releasing

To version and release the library use

```
npx nx release
```

Pass `--dry-run` to see what would happen without actually releasing the library.

[Learn more about Nx release &raquo;](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Keep TypeScript project references up to date

Nx automatically updates TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) in `tsconfig.json` files to ensure they remain accurate based on your project dependencies (`import` or `require` statements). This sync is automatically done when running tasks such as `build` or `typecheck`, which require updated references to function correctly.

To manually trigger the process to sync the project graph dependencies information to the TypeScript project references, run the following command:

```sh
npx nx sync
```

You can enforce that the TypeScript project references are always in the correct state when running in CI by adding a step to your CI job configuration that runs the following command:

```sh
npx nx sync:check
```

[Learn more about nx sync](https://nx.dev/reference/nx-commands#sync)

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/nx-api/js?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Document upload & extraction flow (api → rabbitmq → ai-service)

This section describes the runtime path for a user-uploaded document through the system to the AI extraction service.

### 1) Upload entrypoint: `apps/backend/api`

1. User uploads file via POST `/documents/upload` handled by `DocumentController`.
2. `DocumentService.upload(file)` executes:
   - `VirusService.scan(file.buffer)` checks malware; rejects with `400` if infected.
   - `StorageService.ensureBucket('documents')` creates MinIO bucket as needed.
   - `StorageService.upload('documents', \\${docId}.pdf', buffer)` stores the payload in MinIO.
   - `QueueService.publish({event:'document.uploaded', data:{docId,bucket,key,type:'resume'}})` sends RabbitMQ event.

### 2) Queue bus: `QueueService` (`document_queue`)

- Config is resolved from env:
  - `RABBITMQ_URL` if set, else
  - `amqp://<user>:<password>@<host>:<port>` with defaults `guest:guest@rabbitmq:5672`.
- On module init (`OnModuleInit`): `connect()` establishes RabbitMQ connection and channel, asserts `document_queue` durable.
- Reconnection logic:
  - On errors/close it resets channel and tries reconnect with exponential backoff.
  - `publish()` re-checks channel; if missing it calls `connect()` before sending.
- Message payload (JSON):
  - `event: 'document.uploaded'`
  - `data: { docId, bucket:'documents', key:'uuid.pdf', type:'resume' }`
  - `timestamp`, `id`

### 3) AI consumer: `services/ai-service` (RabbitMQ subscriber)

1. `consumer.py` (in `services/ai-service`) listens to the same queue `document_queue`.
2. When message arrives, it reads payload:
   - `docId`, `bucket`, `key` from `data`
   - `event` (upload event type)
3. It then fetches document from MinIO using configured `MINIO_HOST`, access key/secret.
4. Applies text extraction / vectorization pipeline (e.g., `service/pipeline.py`, `service/extractor.py`, `service/chunker.py`), then stores embeddings in Qdrant or DB depending project design.

### 4) Success path and retries

- If RabbitMQ or channel is down during publish, the API logs clearly and still returns upload success to user (non-blocking queue). This prevents upload failure while queue is temporarily unreachable.
- AI consumer should acknowledge or reject messages based on extraction success. `service/consumer.py` retries or dead-letters failing rows if configured.

### Environment variables (minimum for local dev)

- `QUEUE_ENABLED=true`
- `RABBITMQ_HOST=rabbitmq` (or `localhost` if direct local broker)
- `RABBITMQ_PORT=5672`
- `RABBITMQ_USER=guest`
- `RABBITMQ_PASSWORD=guest`
- `MINIO_HOST=minio:9000`
- `MINIO_ACCESS_KEY=minioadmin`
- `MINIO_SECRET_KEY=minioadmin`

### Local dev run (no Docker rebuild for small API changes)

- `npm run serve:api:watch` (hot reload via Nx)
- `npm run build:api:watch` (keep incremental builds running)

### Validation checklist

- Create a test file and `POST /documents/upload` → response should include `docId`, `status: 'uploaded'`.
- Check API logs for `Message published to queue...` and `RabbitMQ connection established successfully`.
- Visit RabbitMQ management at `http://localhost:15672`, check `document_queue` delivery count.
- Confirm `ai-service` received event and processed document from MinIO, writing to storage (Qdrant/db) as expected.
