// Salas demostrativas. No son partidas reales todavía.
const rooms = [
  { name: "Sala de entrenamiento", region: "Latinoamérica", players: "12 / 50", state: "Demostración" },
  { name: "Dynasty Night", region: "Latinoamérica", players: "08 / 50", state: "Demostración" },
  { name: "Tripulación abierta", region: "Por definir", players: "00 / 50", state: "En preparación" }
];

const roomList = document.querySelector("#room-list");
rooms.forEach((room) => {
  const card = document.createElement("article");
  card.className = "room";
  card.innerHTML = `
    <div class="room-top">
      <h3>${room.name}</h3>
      <span class="count">${room.players}</span>
    </div>
    <p>Región: ${room.region}</p>
    <p>Estado: ${room.state}</p>
    <button type="button" aria-label="Ver información de ${room.name}">Ver información</button>
  `;
  card.querySelector("button").addEventListener("click", () => {
    alert("Esta es una sala de demostración. Las partidas reales se conectarán en una etapa posterior.");
  });
  roomList.appendChild(card);
});
