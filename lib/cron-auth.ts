import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") || "";
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
