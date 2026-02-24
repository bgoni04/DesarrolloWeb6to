(function () {
  function redirectTo(path) {
    window.location.assign(path);
  }

  function createHeader(activePage, isAuthenticated) {
    const header = document.createElement("header");
    header.className = "site-header";

    const authLinks = isAuthenticated
      ? `
        <a href="home.html" class="${activePage === "home" ? "active" : ""}">Home</a>
        <a href="#" id="logout-link">Logout</a>
      `
      : `
        <a href="index.html" class="${activePage === "login" ? "active" : ""}">Login</a>
        <a href="register.html" class="${activePage === "register" ? "active" : ""}">Register</a>
      `;

    header.innerHTML = `
      <div class="site-header__inner">
        <a class="site-brand" href="${isAuthenticated ? "home.html" : "index.html"}">Campus Portal</a>
        <nav class="site-nav">${authLinks}</nav>
      </div>
    `;

    return header;
  }

  function createFooter() {
    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="site-footer__inner">
        <span>2026 Campus Portal</span>
        <span>All rights reserved</span>
      </div>
    `;
    return footer;
  }

  function mountLayout(options) {
    const {
      activePage,
      requireAuth = false,
      guestOnly = false,
    } = options;

    const authState = window.Auth ? window.Auth.validateSession() : null;
    const isAuthenticated = Boolean(authState);

    if (requireAuth && !isAuthenticated) {
      redirectTo("index.html");
      return null;
    }

    if (guestOnly && isAuthenticated) {
      redirectTo("home.html");
      return null;
    }

    const headerRoot = document.getElementById("app-header");
    const footerRoot = document.getElementById("app-footer");

    if (headerRoot) {
      headerRoot.innerHTML = "";
      headerRoot.appendChild(createHeader(activePage, isAuthenticated));
    }

    if (footerRoot) {
      footerRoot.innerHTML = "";
      footerRoot.appendChild(createFooter());
    }

    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
      logoutLink.addEventListener("click", (event) => {
        event.preventDefault();
        window.Auth.clearSession();
        redirectTo("index.html");
      });
    }

    return authState;
  }

  window.Layout = {
    mountLayout,
  };
})();
