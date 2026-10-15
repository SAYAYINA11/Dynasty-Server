const SUPABASE_URL = "https://hlkhbmphusfbhiupyrgd.supabase.co";
const SUPABASE_KEY = "sb_publishable_EtU6Q7SUS3pw3upqjRAdpQ_NhCR-gRS";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// LOBBY PUBLICO
const roomList = document.querySelector("#room-list");

// SALAS PRIVADAS
const privateRoomName = document.querySelector("#private-room-name");
const privateRoomCode = document.querySelector("#private-room-code");
const privatePlayerName = document.querySelector("#private-player-name");
const createPrivateButton = document.querySelector("#create-private-room");
const joinPrivateButton = document.querySelector("#join-private-room");
const createRoomMessage = document.querySelector("#create-room-message");
const joinRoomMessage = document.querySelector("#join-room-message");
const privateRoomDetails = document.querySelector("#private-room-details");

const PRIVATE_SESSION_KEY = "dynasty_private_session";
const LAST_PRIVATE_ROOM_KEY = "dynasty_last_created_private_room";

function sessionKey(roomId) {
  return `dynasty_room_${roomId}`;
}

function getSession(roomId) {
  try {
    return JSON.parse(localStorage.getItem(sessionKey(roomId)) || "null");
  } catch {
    return null;
  }
}

function showMessage(container, message, isError = false) {
  if (!container) return;

  const p = document.createElement("p");
  p.textContent = message;
  p.setAttribute("role", "status");

  if (isError) p.className = "error";

  container.replaceChildren(p);
}

// ===================================
// LOBBY PUBLICO
// ===================================

async function loadRooms() {
  if (!roomList) return;

  showMessage(roomList, "Cargando salas de Dynasty...");

  const { data: rooms, error } = await supabaseClient
    .from("rooms")
    .select("id, name, region, players_count, state")
    .order("id");

  if (error) {
    showMessage(
      roomList,
      "No se pudieron cargar las salas. Revisa la configuración de Supabase.",
      true
    );
    console.error("Error al cargar salas:", error.message);
    return;
  }

  roomList.replaceChildren();

  if (!rooms || rooms.length === 0) {
    showMessage(roomList, "Todavía no hay salas disponibles.");
    return;
  }

  rooms.forEach((room) => {
    const card = document.createElement("article");
    card.className = "room";

    const top = document.createElement("div");
    top.className = "room-top";

    const heading = document.createElement("h3");
    heading.textContent = room.name;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${room.players_count} / 50`;

    top.append(heading, count);

    const region = document.createElement("p");
    region.textContent = `Región: ${room.region}`;

    const state = document.createElement("p");
    state.textContent = `Estado: ${room.state}`;

    const form = document.createElement("form");
    const input = document.createElement("input");

    input.type = "text";
    input.placeholder = "Escribe tu nombre";
    input.setAttribute("aria-label", `Nombre para ${room.name}`);
    input.minLength = 2;
    input.maxLength = 20;
    input.required = true;
    input.autocomplete = "nickname";

    const action = document.createElement("button");
    action.type = "submit";

    const message = document.createElement("p");
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");

    const session = getSession(room.id);

    if (session?.player_id && session?.session_token) {
      input.value = session.player_name || "";
      input.disabled = true;
      action.textContent = "Salir de la sala";
    } else {
      action.textContent = "Unirse a la sala";
      action.disabled = room.players_count >= 50;
    }

    form.append(input, action);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      action.disabled = true;
      message.textContent = "Procesando...";

      try {
        const currentSession = getSession(room.id);

        if (currentSession?.player_id && currentSession?.session_token) {
          const { error } = await supabaseClient.rpc("leave_room", {
            p_player_id: currentSession.player_id,
            p_session_token: currentSession.session_token
          });

          if (error) throw error;

          localStorage.removeItem(sessionKey(room.id));
          await loadRooms();
          return;
        }

        const name = input.value.trim();

        if (name.length < 2 || name.length > 20) {
          throw new Error("El nombre debe tener entre 2 y 20 caracteres.");
        }

        const { data, error } = await supabaseClient.rpc("join_room", {
          p_room_id: room.id,
          p_player_name: name
        });

        if (error) throw error;

        if (!data?.player_id || !data?.session_token) {
          throw new Error("No se recibió la confirmación de la sala.");
        }

        localStorage.setItem(
          sessionKey(room.id),
          JSON.stringify({
            player_id: data.player_id,
            session_token: data.session_token,
            player_name: data.player_name
          })
        );

        await loadRooms();
      } catch (error) {
        message.textContent =
          error.message || "Ocurrió un error. Inténtalo de nuevo.";
        action.disabled = false;
        console.error("Error en la sala:", error.message);
      }
    });

    card.append(top, region, state, form, message);
    roomList.appendChild(card);
  });
}

// ===================================
// SALAS PRIVADAS
// ===================================

function getPrivateSession() {
  try {
    return JSON.parse(
      localStorage.getItem(PRIVATE_SESSION_KEY) || "null"
    );
  } catch {
    return null;
  }
}

function renderPrivateDetails(room, isJoined = false) {
  if (!privateRoomDetails || !room) return;

  const card = document.createElement("article");
  card.className = "room";

  const heading = document.createElement("h3");
  heading.textContent = room.name || "Sala privada de Dynasty";

  const code = document.createElement("p");
  code.textContent = `Código de acceso: ${room.access_code}`;

  const count = document.createElement("p");
  count.textContent =
    `Jugadores: ${room.players_count ?? 0} / ${room.max_players ?? 50}`;

  const status = document.createElement("p");
  status.textContent = isJoined
    ? "Estás dentro de esta sala privada."
    : "Comparte este código únicamente con las personas que quieras invitar.";

  card.append(heading, code, count, status);

  if (isJoined) {
    const leaveButton = document.createElement("button");
    leaveButton.type = "button";
    leaveButton.className = "button secondary";
    leaveButton.textContent = "Salir de la sala";

    leaveButton.addEventListener("click", leavePrivateRoom);

    card.appendChild(leaveButton);
  }

  privateRoomDetails.replaceChildren(card);
}

// Crear una sala privada
if (createPrivateButton) {
  createPrivateButton.addEventListener("click", async () => {
    const name = privateRoomName.value.trim();

    if (name.length < 2 || name.length > 40) {
      showMessage(
        createRoomMessage,
        "El nombre de la sala debe tener entre 2 y 40 caracteres.",
        true
      );
      return;
    }

    createPrivateButton.disabled = true;
    showMessage(createRoomMessage, "Creando tu sala privada...");

    try {
      const { data, error } = await supabaseClient.rpc(
        "create_private_room",
        { p_name: name }
      );

      if (error) throw error;

      if (!data?.access_code || !data?.room_id) {
        throw new Error("No se recibió el código de la sala.");
      }

      const room = {
        room_id: data.room_id,
        name: data.name || name,
        access_code: data.access_code,
        players_count: data.players_count ?? 0,
        max_players: data.max_players ?? 50
      };

      localStorage.setItem(
        LAST_PRIVATE_ROOM_KEY,
        JSON.stringify(room)
      );

      privateRoomCode.value = room.access_code;

      showMessage(
        createRoomMessage,
        `¡Sala creada! Tu código es ${room.access_code}. Compártelo con tus amigos.`
      );

      renderPrivateDetails(room);
    } catch (error) {
      showMessage(
        createRoomMessage,
        error.message || "No se pudo crear la sala.",
        true
      );
      console.error("Error al crear sala privada:", error);
    } finally {
      createPrivateButton.disabled = false;
    }
  });
}

// Entrar a una sala privada
if (joinPrivateButton) {
  joinPrivateButton.addEventListener("click", async () => {
    const accessCode = privateRoomCode.value.trim().toUpperCase();
    const playerName = privatePlayerName.value.trim();

    if (accessCode.length !== 8) {
      showMessage(
        joinRoomMessage,
        "Escribe el código completo de 8 caracteres.",
        true
      );
      return;
    }

    if (playerName.length < 2 || playerName.length > 20) {
      showMessage(
        joinRoomMessage,
        "Tu nombre debe tener entre 2 y 20 caracteres.",
        true
      );
      return;
    }

    joinPrivateButton.disabled = true;
    showMessage(joinRoomMessage, "Buscando la sala...");

    try {
      const { data, error } = await supabaseClient.rpc(
        "join_private_room",
        {
          p_access_code: accessCode,
          p_player_name: playerName
        }
      );

      if (error) throw error;

      if (!data?.room_id || !data?.player_id || !data?.session_token) {
        throw new Error("No se recibió la confirmación de entrada.");
      }

      let roomName = "Sala privada de Dynasty";

      try {
        const lastRoom = JSON.parse(
          localStorage.getItem(LAST_PRIVATE_ROOM_KEY) || "null"
        );

        if (
          lastRoom &&
          String(lastRoom.room_id) === String(data.room_id) &&
          lastRoom.name
        ) {
          roomName = lastRoom.name;
        }
      } catch {
        // Se conserva el nombre genérico si no hay datos guardados.
      }

      const session = {
        room_id: data.room_id,
        player_id: data.player_id,
        session_token: data.session_token,
        player_name: data.player_name || playerName,
        access_code: accessCode,
        name: roomName,
        players_count: data.players_count ?? 1,
        max_players: 50
      };

      localStorage.setItem(
        PRIVATE_SESSION_KEY,
        JSON.stringify(session)
      );

      showMessage(joinRoomMessage, "¡Entraste a la sala privada!");
      renderPrivateDetails(session, true);
    } catch (error) {
      showMessage(
        joinRoomMessage,
        error.message || "No se pudo entrar a la sala.",
        true
      );
      console.error("Error al entrar a sala privada:", error);
    } finally {
      joinPrivateButton.disabled = false;
    }
  });
}

// Salir de una sala privada
async function leavePrivateRoom() {
  const session = getPrivateSession();

  if (!session?.player_id || !session?.session_token) {
    showMessage(
      joinRoomMessage,
      "No encontramos una sesión privada activa.",
      true
    );
    return;
  }

  const leaveButton = privateRoomDetails?.querySelector("button");

  if (leaveButton) leaveButton.disabled = true;

  showMessage(joinRoomMessage, "Saliendo de la sala...");

  try {
    const { data, error } = await supabaseClient.rpc(
      "leave_private_room",
      {
        p_player_id: session.player_id,
        p_session_token: session.session_token
      }
    );

    if (error) throw error;

    if (data?.success === false) {
      throw new Error("No se pudo confirmar la salida de la sala.");
    }

    localStorage.removeItem(PRIVATE_SESSION_KEY);

    showMessage(joinRoomMessage, "Has salido de la sala privada.");
    privateRoomDetails.replaceChildren();

    const lastRoom = JSON.parse(
      localStorage.getItem(LAST_PRIVATE_ROOM_KEY) || "null"
    );

    if (lastRoom) renderPrivateDetails(lastRoom);
  } catch (error) {
    showMessage(
      joinRoomMessage,
      error.message || "No se pudo salir de la sala.",
      true
    );
    console.error("Error al salir de sala privada:", error);
    if (leaveButton) leaveButton.disabled = false;
  }
}

// Restaurar la información al volver a abrir la página
const savedPrivateSession = getPrivateSession();

if (savedPrivateSession) {
  renderPrivateDetails(savedPrivateSession, true);
} else {
  try {
    const lastRoom = JSON.parse(
      localStorage.getItem(LAST_PRIVATE_ROOM_KEY) || "null"
    );

    if (lastRoom) renderPrivateDetails(lastRoom);
  } catch {
    localStorage.removeItem(LAST_PRIVATE_ROOM_KEY);
  }
}

// Iniciar lobby público y actualizaciones en tiempo real
loadRooms();

supabaseClient
  .channel("dynasty-rooms-live")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "rooms"
    },
    () => {
      loadRooms();
    }
  )
  .subscribe((status) => {
    console.log("Estado del lobby en tiempo real:", status);
  });
