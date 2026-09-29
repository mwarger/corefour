import type { WorkerEnv } from "../../alchemy.run.ts";

// Types `import { env } from "cloudflare:workers"` from the Alchemy stack.
declare global {
	namespace Cloudflare {
		interface Env extends WorkerEnv {}
	}
}
