# adierkens-strapi

Strapi backend for `api.adierkens.com`.

## Local development

Strapi now defaults to MySQL for local development. Copy `.env.example` to `.env`, point the
`DATABASE_*` values at a local MySQL instance, then install dependencies and run Strapi:

```bash
cp .env.example .env
npm install
npm run develop
```

Build or start the production app:

```bash
npm run build
npm run start
```

Health endpoint:

```bash
curl http://localhost:1337/health
```

## Production deployment

The backend runs on AWS ECS Fargate behind the shared `adierkens-prod` Application Load Balancer and
uses Amazon S3 for uploads. The application config now supports `DATABASE_CLIENT=mysql`,
`DATABASE_CLIENT=postgres`, and `DATABASE_CLIENT=sqlite`, with MySQL as the local default.

The current deployed environment still uses Amazon RDS PostgreSQL. Moving the running deployment to
MySQL should be handled as a separate migration after the local MySQL path is verified.

### AWS resources

- **ECR repository:** `adierkens-strapi-backend`
- **ECS cluster:** `adierkens-prod`
- **ECS service:** `adierkens-strapi-backend`
- **Task definition family:** `adierkens-strapi-backend`
- **Public hostname:** `https://api.adierkens.com`
- **RDS instance:** `adierkens-strapi-db`
- **S3 bucket:** `adierkens-strapi-media-429178716268-us-east-1`

### Required runtime configuration

The application reads `DATABASE_CLIENT` to decide which connection settings to use:

- `mysql` (local default): `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`,
  `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and optional SSL flags
- `postgres` (current deployment): `DATABASE_URL` or discrete `DATABASE_*` settings, optional
  `DATABASE_SCHEMA`, and SSL flags
- `sqlite`: `DATABASE_FILENAME`

The current ECS task expects these PostgreSQL-oriented runtime values:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `DATABASE_CLIENT=postgres`
- `PORT=1337`
- `DATABASE_URL`
- `DATABASE_SCHEMA=public`
- `DATABASE_SSL=true`
- `DATABASE_SSL_REJECT_UNAUTHORIZED=false` for the current RDS deployment
- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`
- `AWS_REGION`
- `AWS_BUCKET`

Secrets are stored in AWS Secrets Manager and injected into ECS at runtime.

### GitHub Actions deployment flow

`.github/workflows/deploy-backend.yml` runs on pushes to `main` and:

1. installs dependencies
2. builds the Strapi project
3. builds and pushes the Docker image to ECR
4. registers a new ECS task definition revision
5. updates the ECS service

The workflow uses GitHub OIDC with the `AWS_ROLE_TO_ASSUME` secret.

Repository variables used by the workflow:

- `AWS_REGION`
- `ECR_REPOSITORY`
- `ECS_CLUSTER`
- `ECS_SERVICE`
- `ECS_TASK_DEFINITION`
- `ECS_CONTAINER_NAME`

### Rollback

To roll back the backend:

1. identify the last known-good task definition revision
2. point the ECS service back to that revision

Example:

```bash
aws ecs update-service \
  --region us-east-1 \
  --cluster adierkens-prod \
  --service adierkens-strapi-backend \
  --task-definition adierkens-strapi-backend:<revision>
```
