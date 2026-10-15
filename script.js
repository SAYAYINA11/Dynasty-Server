
const SUPABASE_URL = "https://hlkhbmphusfbhiupyrgd.supabase.co";
const SUPABASE_KEY = "sb_publishable_EtU6Q7SUS3pw3upqjRAdpQ_NhCR-gRS";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const roomList = document.querySelector("#room-list");

async function loadRooms() {
  roomList.replaceChildren();

  const loading = document.createElement("p");
  loading.textContent = "Cargando salas de Dynasty...";
  roomList.appendChild(loading);

  const { data: rooms, error } = await supabaseClient
    .from("rooms")
    .select("name, region, players_count, state")
    .order("id");

  roomList.replaceChildren();

  if (error) {
    const message = document.createElement("p");
    message.textContent = "No se pudieron cargar las salas. Revisa la configuración de Supabase.";
    roomList.appendChild(message);
    console.error("Error al cargar salas:", error.message);
    return;
  }

  if (!rooms || rooms.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Todavía no hay salas disponibles.";
    roomList.appendChild(message);
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

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Ver información";

    button.addEventListener("click", () => {
      alert(
        `${room.name}\nRegión: ${room.region}\nJugadores: ${room.players_count}/50\nEstado: ${room.state}`
      );
    });

    card.append(top, region, state, button);
    roomList.appendChild(card);
  });
}

loadRooms();

