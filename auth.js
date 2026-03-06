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
  const pokemonGridElement = document.getElementById("pokemon-grid");
  const pokemonStatusElement = document.getElementById("pokemon-status");
  const pokemonPageLabelElement = document.getElementById("pokemon-page-label");
  const pokemonPrevButton = document.getElementById("pokemon-prev");
  const pokemonNextButton = document.getElementById("pokemon-next");
  const POKEMON_LIMIT = 16;
  let pokemonPageIndex = 0;

  function getStatValue(pokemon, statName) {
    const stat = pokemon.stats.find((item) => item.stat && item.stat.name === statName);
    return stat ? stat.base_stat : 0;
  }

  function createPokemonCard(pokemon) {
    const article = document.createElement("article");
    article.className = "pokemon-card";

    const imageUrl =
      pokemon.sprites.other["official-artwork"].front_default ||
      pokemon.sprites.front_default ||
      "";

    const types = pokemon.types
      .map((typeItem) => typeItem.type.name)
      .join(" • ");

    const power =
      getStatValue(pokemon, "hp") +
      getStatValue(pokemon, "attack") +
      getStatValue(pokemon, "defense") +
      getStatValue(pokemon, "speed");

    article.innerHTML = `
      <img src="${imageUrl}" alt="${pokemon.name}" class="pokemon-img" />
      <h3>${pokemon.name}</h3>
      <p class="pokemon-type">${types}</p>
      <ul class="pokemon-stats">
        <li><span>Power</span><strong>${power}</strong></li>
        <li><span>HP</span><strong>${getStatValue(pokemon, "hp")}</strong></li>
        <li><span>Attack</span><strong>${getStatValue(pokemon, "attack")}</strong></li>
        <li><span>Defense</span><strong>${getStatValue(pokemon, "defense")}</strong></li>
        <li><span>Speed</span><strong>${getStatValue(pokemon, "speed")}</strong></li>
        <li><span>Weight</span><strong>${pokemon.weight}</strong></li>
      </ul>
    `;

    return article;
  }

  function updatePokemonControls() {
    if (pokemonPageLabelElement) {
      pokemonPageLabelElement.textContent = `Index ${pokemonPageIndex + 1}`;
    }

    if (pokemonPrevButton) {
      pokemonPrevButton.disabled = pokemonPageIndex === 0;
    }
  }

  async function loadPokemonPage() {
    if (!pokemonGridElement || !pokemonStatusElement) {
      return;
    }

    pokemonStatusElement.textContent = "Loading Pokémon...";
    pokemonGridElement.innerHTML = "";
    updatePokemonControls();

    const offset = pokemonPageIndex * POKEMON_LIMIT;

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${POKEMON_LIMIT}&offset=${offset}`);
      const listData = await response.json();

      const detailResponses = await Promise.all(
        listData.results.map((pokemonItem) => fetch(pokemonItem.url).then((result) => result.json()))
      );

      detailResponses.forEach((pokemon) => {
        pokemonGridElement.appendChild(createPokemonCard(pokemon));
      });

      pokemonStatusElement.textContent = `Showing ${detailResponses.length} Pokémon`;
      updatePokemonControls();
    } catch (error) {
      pokemonStatusElement.textContent = "Unable to load Pokémon right now.";
      console.error(error);
    }
  }

  if (pokemonGridElement && pokemonStatusElement) {
    if (pokemonPrevButton) {
      pokemonPrevButton.addEventListener("click", () => {
        if (pokemonPageIndex > 0) {
          pokemonPageIndex -= 1;
          loadPokemonPage();
        }
      });
    }

    if (pokemonNextButton) {
      pokemonNextButton.addEventListener("click", () => {
        pokemonPageIndex += 1;
        loadPokemonPage();
      });
    }

    loadPokemonPage();
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
