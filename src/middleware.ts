export { default } from "next-auth/middleware";

export const config = {
  // Protegge solo le pagine. Le API gestiscono già auth/permessi nei route handler
  // (così evitiamo redirect HTML su fetch JSON).
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
