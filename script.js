
const SUPABASE_URL = "https://hlkhbmphusfbhiupyrgd.supabase.co";
const SUPABASE_KEY = "sb_publishable_EtU6Q7SUS3pw3upqjRAdpQ_NhCR-gRS";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const roomList = document.querySelector("#room-list");

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
  const p = document.createElement("p");
  p.textContent = message;
  p.setAttribute("role", "status");
  if (isError) p.className = "error";
  container.replaceChildren(p);
}

async function loadRooms() {
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


