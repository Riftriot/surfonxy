import { CookieJar, CookieAccessInfo } from "cookiejar";

/** Current sessions handled by Surfonxy. */
export const sessions: Record<string, Session> = {};

const createUniqueSessionID = (): string => {
  let id = crypto.randomUUID();

  // While the ID is still used, we regenerate a new one.
  while (id in sessions) {
    id = crypto.randomUUID();
  }

  return id;
}

class Session {
  public cookies: CookieJar;
  /** Tokens allowed to access this session. */
  public auth_tokens: string[];
  public id: string;

  constructor (authTokenOfCreator: string, id?: string) {
    this.auth_tokens = [authTokenOfCreator];
    this.id = id ?? createUniqueSessionID();
    this.cookies = new CookieJar();
  }

  public getCookiesFor (domain: string, path: string) {
    const information = new CookieAccessInfo(domain, path, true, false);
    return this.cookies.getCookies(information);
  }

  public getCookiesAsStringFor (domain: string, path: string) {
    const cookies = this.getCookiesFor(domain, path);
    return cookies.map(
      cookie => cookie.name + "=" + cookie.value
    ).join("; ");
  }

  public addCookies (cookies: string[]) {
    this.cookies.setCookies(cookies);
  }
}

/**
 * Creates a new session and store
 * it in the `sessions` object.
 */
export const createSession = (authTokenOfCreator: string): Session => {
  const session = new Session(authTokenOfCreator);
  sessions[session.id] = session;

  return session;
}

export default Session;
