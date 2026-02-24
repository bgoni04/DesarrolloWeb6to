(function () {
  const USERS_KEY = "users";
  const SESSION_KEY = "authSession";
  const SESSION_HOURS = 8;

  function parseJson(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function getUsers() {
    const users = parseJson(localStorage.getItem(USERS_KEY), []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findUserByUsername(username) {
    return getUsers().find((user) => user.username === username) || null;
  }

  function hashString(text) {
    let hash = 5381;

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 33) ^ text.charCodeAt(index);
    }

    return (hash >>> 0).toString(16);
  }

  function generateTokenSignature(username, password, issuedAt, nonce) {
    const seed = `${username}::${password}::${issuedAt}::${nonce}`;
    return hashString(seed);
  }

  function createSession(user) {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + SESSION_HOURS * 60 * 60 * 1000;
    const nonce = `${issuedAt}-${Math.random().toString(36).slice(2)}`;
    const token = generateTokenSignature(user.username, user.password, issuedAt, nonce);

    const session = {
      username: user.username,
      issuedAt,
      expiresAt,
      nonce,
      token,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getSession() {
    return parseJson(localStorage.getItem(SESSION_KEY), null);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function validateSession() {
    const session = getSession();

    if (!session || !session.username || !session.token || !session.issuedAt || !session.nonce) {
      clearSession();
      return null;
    }

    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }

    const user = findUserByUsername(session.username);

    if (!user) {
      clearSession();
      return null;
    }

    const expectedToken = generateTokenSignature(user.username, user.password, session.issuedAt, session.nonce);

    if (expectedToken !== session.token) {
      clearSession();
      return null;
    }

    return { session, user };
  }

  window.Auth = {
    getUsers,
    saveUsers,
    findUserByUsername,
    createSession,
    getSession,
    clearSession,
    validateSession,
    SESSION_HOURS,
  };
})();
