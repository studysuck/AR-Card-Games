import { Game } from './game';

export function setupUI(root: HTMLElement) {
  root.innerHTML = `
    <div class="app-grid">
      <aside class="cards-panel">
        <h2>Cards</h2>
        <div id="cards" class="cards"></div>
      </aside>
      <main class="view-panel">
        <div id="camera" class="camera">
          <div class="camera-overlay">Camera feed (simulated)</div>
        </div>
        <div id="hud" class="hud"></div>
      </main>
    </div>
  `;

  const game = new Game(document.getElementById('camera')!, document.getElementById('hud')!);
  game.init();

  // create sample cards
  const cards = document.getElementById('cards')!;
  const sample = [
    { id: 'c1', name: 'Warrior', hp: 100, atk: 20, def: 5 },
    { id: 'c2', name: 'Archer', hp: 75, atk: 25, def: 3 },
    { id: 'c3', name: 'Tank', hp: 150, atk: 10, def: 12 },
  ];

  sample.forEach(c => {
    const el = document.createElement('div');
    el.className = 'card';
    el.draggable = true;
    el.dataset.card = JSON.stringify(c);
    el.innerHTML = `<strong>${c.name}</strong><div>HP ${c.hp}</div><div>ATK ${c.atk}</div><div>DEF ${c.def}</div>`;

    el.addEventListener('dragstart', (ev: DragEvent) => {
      ev.dataTransfer!.setData('application/json', el.dataset.card!);
    });

    cards.appendChild(el);
  });

  // handle drop on camera
  const camera = document.getElementById('camera')!;
  camera.addEventListener('dragover', ev => ev.preventDefault());
  camera.addEventListener('drop', (ev: DragEvent) => {
    ev.preventDefault();
    const data = ev.dataTransfer!.getData('application/json');
    if (!data) return;
    const card = JSON.parse(data);
    const rect = (ev.target as HTMLElement).getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    game.spawnCharacter(card, x, y);
  });
}
