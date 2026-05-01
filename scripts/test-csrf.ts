/**
 * Smoke test per assertCsrf: metodi sicuri, POST senza Origin, origine valida/invalida.
 */
import { assertCsrf } from "../src/lib/security/csrf";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}

function mustThrow(fn: () => void, msg: string) {
  try {
    fn();
    console.error("FAIL (expected throw):", msg);
    failed++;
  } catch (e) {
    assert(e instanceof Error && e.message === "CSRF_BLOCKED", `${msg}: wrong error`);
  }
}

process.env.NEXTAUTH_URL = "http://localhost:3000";

assertCsrf(new Request("http://localhost:3000/api/x", { method: "GET" }));
assertCsrf(new Request("http://localhost:3000/api/x", { method: "HEAD" }));

// Senza header Origin non blocchiamo (CLI, server-to-server)
assertCsrf(new Request("http://localhost:3000/api/x", { method: "POST" }));

assertCsrf(
  new Request("http://localhost:3000/api/x", {
    method: "PATCH",
    headers: { origin: "http://localhost:3000" },
  })
);

mustThrow(
  () =>
    assertCsrf(
      new Request("http://localhost:3000/api/x", {
        method: "DELETE",
        headers: { origin: "https://evil.example" },
      })
    ),
  "wrong origin must block"
);

if (failed > 0) {
  console.error(`csrf: ${failed} failure(s)`);
  process.exit(1);
}
console.log("csrf: tutti i check OK.");
