import { NextResponse } from "next/server";

/**
 * In sviluppo restituisce `process.cwd()` per capire quale copia del progetto sta servendo Next.
 * Disattivato in produzione.
 */
export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ cwd: process.cwd() });
}
