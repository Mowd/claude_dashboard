import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach } from "bun:test";

// Register happy-dom BEFORE any testing-library imports,
// so that @testing-library/dom sees `document` when it initializes `screen`.
GlobalRegistrator.register();

const { cleanup } = await import("@testing-library/react");
afterEach(cleanup);
