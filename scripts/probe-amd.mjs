// AMD-02 capability probe. Run from the repo root:
//   npm run probe:amd
// Reads AMD_BASE_URL, AMD_API_KEY, AMD_MODEL from the environment (.env.local).
// Output never contains the API key (the adapter redacts it).
import { probeAmdEndpoint } from '../services/orchestrator/src/providers/amdProvider.ts';

const result = await probeAmdEndpoint();
console.log(JSON.stringify({ date: new Date().toISOString(), ...result }, null, 2));
process.exitCode = result.ok ? 0 : 1;

