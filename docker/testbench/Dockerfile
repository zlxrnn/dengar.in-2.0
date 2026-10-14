# Test bench runner: workspace deps baked in, sources bind-mounted by
# docker-compose.testbench.yml (so edits are picked up without a rebuild).
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/prompts/package.json packages/prompts/
COPY packages/types/package.json packages/types/
COPY services/auth/package.json services/auth/
COPY services/crisis-engine/package.json services/crisis-engine/
COPY services/orchestrator/package.json services/orchestrator/
COPY services/persistence/package.json services/persistence/
COPY services/validator/package.json services/validator/
RUN npm ci --no-audit --no-fund
ENTRYPOINT ["node", "--experimental-strip-types", "--no-warnings"]
CMD ["scripts/testbench/bench.mjs", "all"]
