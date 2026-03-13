(function () {
  const oneInput = document.getElementById("pokemon-one-input");
  const twoInput = document.getElementById("pokemon-two-input");
  const loadButton = document.getElementById("battle-load-btn");
  const nextTurnButton = document.getElementById("battle-next-turn-btn");
  const resetButton = document.getElementById("battle-reset-btn");
  const statusElement = document.getElementById("battle-status");
  const stageElement = document.getElementById("battle-stage");
  const logElement = document.getElementById("battle-log");
  const winnerElement = document.getElementById("battle-winner");
  const optionsList = document.getElementById("pokemon-name-options");

  if (!oneInput || !twoInput || !loadButton || !nextTurnButton || !statusElement || !stageElement || !logElement || !winnerElement || !optionsList) {
    return;
  }

  const ATTACK_FAIL_CHANCE = 0.18;
  const DEFENSE_FAIL_CHANCE = 0.2;
  const SPECIAL_ATTACK_TURN_REQUIREMENT = 3;
  const SPECIAL_DEFENSE_TURN_REQUIREMENT = 2;

  let battleState = null;

  function getStatValue(pokemon, statName) {
    const foundStat = pokemon.stats.find((item) => item.stat && item.stat.name === statName);
    return foundStat ? foundStat.base_stat : 0;
  }

  function toBattlePokemon(pokemon) {
    const hp = getStatValue(pokemon, "hp");
    const attack = getStatValue(pokemon, "attack");
    const defense = getStatValue(pokemon, "defense");
    const speed = getStatValue(pokemon, "speed");
    const specialAttack = getStatValue(pokemon, "special-attack");
    const specialDefense = getStatValue(pokemon, "special-defense");

    return {
      id: pokemon.id,
      name: pokemon.name,
      image:
        pokemon.sprites.other["official-artwork"].front_default ||
        pokemon.sprites.front_default ||
        "",
      stats: {
        hp,
        attack,
        defense,
        speed,
        specialAttack,
        specialDefense,
      },
      maxHealth: 100,
      currentHealth: 100,
      turnsTaken: 0,
      defenseBoostTurns: 0,
    };
  }

  function getHealthPercent(pokemon) {
    return Math.max(0, Math.round((pokemon.currentHealth / pokemon.maxHealth) * 100));
  }

  function getDisplayName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function appendLog(message) {
    const item = document.createElement("li");
    item.textContent = message;
    logElement.appendChild(item);
    logElement.scrollTop = logElement.scrollHeight;
  }

  function createFighterCard(pokemon) {
    const card = document.createElement("article");
    card.className = "battle-card";

    const health = getHealthPercent(pokemon);

    card.innerHTML = `
      <img src="${pokemon.image}" alt="${pokemon.name}" class="battle-pokemon-img" />
      <h3>${getDisplayName(pokemon.name)}</h3>
      <p class="battle-meta">HP restante: ${health}%</p>
      <div class="battle-health-bar">
        <div class="battle-health-value" style="width: ${health}%;"></div>
      </div>
      <p class="battle-meta">Turnos jugados: ${pokemon.turnsTaken}</p>
    `;

    return card;
  }

  function renderStage() {
    if (!battleState) {
      stageElement.innerHTML = "";
      return;
    }

    stageElement.innerHTML = "";
    stageElement.appendChild(createFighterCard(battleState.fighters[0]));
    stageElement.appendChild(createFighterCard(battleState.fighters[1]));
  }

  function getDamageWithVariance(baseDamage) {
    const variance = 0.85 + Math.random() * 0.3;
    return Math.max(1, Math.round(baseDamage * variance));
  }

  function canUseSpecialAttack(pokemon) {
    return pokemon.turnsTaken >= SPECIAL_ATTACK_TURN_REQUIREMENT;
  }

  function canUseSpecialDefense(pokemon) {
    return pokemon.turnsTaken >= SPECIAL_DEFENSE_TURN_REQUIREMENT;
  }

  function chooseAction(attacker) {
    const actionPool = ["normalAttack", "normalAttack", "normalAttack"];

    if (canUseSpecialAttack(attacker)) {
      actionPool.push("specialAttack");
    }

    if (canUseSpecialDefense(attacker)) {
      actionPool.push("specialDefense");
    }

    const randomIndex = Math.floor(Math.random() * actionPool.length);
    return actionPool[randomIndex];
  }

  function calculateBaseDamage(attacker, defender, action) {
    if (action === "specialAttack") {
      return (attacker.stats.specialAttack * 1.15) / Math.max(1, defender.stats.specialDefense * 0.6);
    }

    return attacker.stats.attack / Math.max(1, defender.stats.defense * 0.65);
  }

  function executeTurn() {
    if (!battleState || battleState.finished) {
      return;
    }

    const attacker = battleState.fighters[battleState.currentTurnIndex];
    const defender = battleState.fighters[battleState.currentTurnIndex === 0 ? 1 : 0];
    const action = chooseAction(attacker);

    battleState.turnNumber += 1;
    attacker.turnsTaken += 1;

    let damageDone = 0;
    let actionLabel = "Ataque normal";

    if (action === "specialDefense") {
      actionLabel = "Defensa especial";

      if (Math.random() < DEFENSE_FAIL_CHANCE) {
        appendLog(`Turno ${battleState.turnNumber}: ${getDisplayName(attacker.name)} intento Defensa especial, pero fallo.`);
      } else {
        attacker.defenseBoostTurns = 2;
        appendLog(`Turno ${battleState.turnNumber}: ${getDisplayName(attacker.name)} activo Defensa especial y reducira dano recibido por 2 turnos.`);
      }
    } else {
      if (action === "specialAttack") {
        actionLabel = "Ataque especial";
      }

      if (Math.random() < ATTACK_FAIL_CHANCE) {
        appendLog(`Turno ${battleState.turnNumber}: ${getDisplayName(attacker.name)} uso ${actionLabel}, pero fallo el ataque.`);
      } else {
        const baseDamage = calculateBaseDamage(attacker, defender, action);
        damageDone = getDamageWithVariance(baseDamage * 11);

        if (defender.defenseBoostTurns > 0) {
          damageDone = Math.max(1, Math.round(damageDone * 0.55));
        }

        defender.currentHealth = Math.max(0, defender.currentHealth - damageDone);

        appendLog(
          `Turno ${battleState.turnNumber}: ${getDisplayName(attacker.name)} uso ${actionLabel} e hizo ${damageDone} de dano. ` +
            `${getDisplayName(defender.name)} queda con ${getHealthPercent(defender)}% de vida.`
        );
      }
    }

    if (defender.defenseBoostTurns > 0) {
      defender.defenseBoostTurns -= 1;
    }

    renderStage();

    if (defender.currentHealth <= 0) {
      battleState.finished = true;
      showWinner(attacker);
      statusElement.textContent = `La batalla termino en ${battleState.turnNumber} turnos.`;
      nextTurnButton.disabled = true;
      return;
    }

    battleState.currentTurnIndex = battleState.currentTurnIndex === 0 ? 1 : 0;

    const nextFighter = battleState.fighters[battleState.currentTurnIndex];
    statusElement.textContent = `Siguiente turno: ${getDisplayName(nextFighter.name)}.`;
  }

  function showWinner(pokemon) {
    winnerElement.innerHTML = `
      <h3 class="winner-title">Ganador</h3>
      <img src="${pokemon.image}" alt="Ganador ${pokemon.name}" class="winner-image" />
      <p class="winner-name">${getDisplayName(pokemon.name)}</p>
    `;
  }

  function resetBattleView() {
    battleState = null;
    stageElement.innerHTML = "";
    logElement.innerHTML = "";
    winnerElement.innerHTML = "";
    statusElement.textContent = "Selecciona dos Pokemon para comenzar.";
    nextTurnButton.disabled = true;
    resetButton.disabled = true;
  }

  async function fetchPokemon(query) {
    const sanitized = query.trim().toLowerCase();
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(sanitized)}`);

    if (!response.ok) {
      throw new Error(`No se encontro el Pokemon: ${query}`);
    }

    return response.json();
  }

  function initializeBattle(pokemonOne, pokemonTwo) {
    const fighterOne = toBattlePokemon(pokemonOne);
    const fighterTwo = toBattlePokemon(pokemonTwo);

    battleState = {
      fighters: [fighterOne, fighterTwo],
      turnNumber: 0,
      currentTurnIndex: fighterOne.stats.speed >= fighterTwo.stats.speed ? 0 : 1,
      finished: false,
    };

    logElement.innerHTML = "";
    winnerElement.innerHTML = "";
    renderStage();

    const firstFighter = battleState.fighters[battleState.currentTurnIndex];
    appendLog(`Comienza la batalla: ${getDisplayName(fighterOne.name)} vs ${getDisplayName(fighterTwo.name)}.`);
    statusElement.textContent = `Primer turno: ${getDisplayName(firstFighter.name)}.`;

    nextTurnButton.disabled = false;
    resetButton.disabled = false;
  }

  async function loadPokemonNameSuggestions() {
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=151");
      const data = await response.json();

      data.results.forEach((pokemon) => {
        const option = document.createElement("option");
        option.value = pokemon.name;
        optionsList.appendChild(option);
      });
    } catch (error) {
      console.error(error);
    }
  }

  loadButton.addEventListener("click", async () => {
    const firstValue = oneInput.value.trim();
    const secondValue = twoInput.value.trim();

    if (!firstValue || !secondValue) {
      statusElement.textContent = "Escribe los dos Pokemon para iniciar la batalla.";
      return;
    }

    if (firstValue.toLowerCase() === secondValue.toLowerCase()) {
      statusElement.textContent = "Elige dos Pokemon diferentes para la batalla.";
      return;
    }

    loadButton.disabled = true;
    nextTurnButton.disabled = true;
    statusElement.textContent = "Cargando Pokemon...";

    try {
      const [pokemonOne, pokemonTwo] = await Promise.all([fetchPokemon(firstValue), fetchPokemon(secondValue)]);
      initializeBattle(pokemonOne, pokemonTwo);
    } catch (error) {
      statusElement.textContent = error.message || "No fue posible cargar esos Pokemon.";
      resetButton.disabled = true;
    } finally {
      loadButton.disabled = false;
    }
  });

  nextTurnButton.addEventListener("click", () => {
    executeTurn();
  });

  resetButton.addEventListener("click", () => {
    resetBattleView();
  });

  loadPokemonNameSuggestions();
})();
