export const ADMIN_SESSION_COOKIE_NAME = "familieappen_admin_session";

export type CookieRequest = { headers?: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string } };
export type CookieResponse = { getHeader?: (name: string) => number | string | string[] | undefined; setHeader?: (name: string, value: number | string | string[]) => void };

export function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getCookieValue(request: CookieRequest, name: string): string | undefined {
  const cookieHeader = firstHeaderValue(request.headers?.cookie);
  return cookieHeader?.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function appendSetCookieHeader(response: CookieResponse, cookie: string): void {
  const existingHeader = response.getHeader?.("Set-Cookie");
  const cookies = Array.isArray(existingHeader) ? [...existingHeader, cookie] : typeof existingHeader === "string" ? [existingHeader, cookie] : [cookie];
  response.setHeader?.("Set-Cookie", cookies);
}
