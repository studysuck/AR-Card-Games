type CardSpec = { id: string; name: string; hp: number; atk: number; def: number };

export class Character {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  el: HTMLElement;

  constructor(spec: CardSpec, x: number, y: number) {
    this.id = spec.id + '-' + Math.floor(Math.random() * 10000);
    this.name = spec.name;
    this.maxHp = spec.hp;
    this.hp = spec.hp;
    this.atk = spec.atk;
    this.def = spec.def;

    this.el = document.createElement('div');
    this.el.className = 'character';
    this.el.innerHTML = `
      <div class="char-name">${this.name}</div>
      <div class="hp-bar"><div class="hp-fill" style="width:${(this.hp/this.maxHp)*100}%"></div></div>
      <div class="status-badge" style="display:none"></div>
    `;
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
    this.el.dataset.charId = this.id;

    // emergence animation
    this.el.style.transform = 'scale(0)';
    requestAnimationFrame(() => {
      this.el.style.transition = 'transform 300ms ease, opacity 300ms ease';
      this.el.style.transform = 'scale(1)';
      this.el.style.opacity = '1';
    });
  }

  takeDamage(amount: number) {
    const dmg = Math.max(0, amount - this.def);
    this.hp = Math.max(0, this.hp - dmg);
    this.updateHpBar();
    return dmg;
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updateHpBar();
  }

  updateHpBar() {
    const fill = this.el.querySelector('.hp-fill') as HTMLElement;
    fill.style.width = (this.hp / this.maxHp * 100) + '%';
  }
}

export class Game {
  camera: HTMLElement;
  hud: HTMLElement;
  characters: Character[] = [];
  selected?: Character;

  constructor(camera: HTMLElement, hud: HTMLElement) {
    this.camera = camera;
    this.hud = hud;
  }

  init() {
    this.hud.innerHTML = `<div class="info">Drop a card to spawn a character. Click a character to select it.</div>`;

    this.camera.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      const charEl = target.closest('.character') as HTMLElement | null;
      if (charEl) {
        // if a character is already selected and click another, attack it
        const clicked = this.findByElement(charEl);
        if (this.selected && clicked && clicked !== this.selected) {
          // selected attacks clicked
          const dmg = clicked.takeDamage(this.selected.atk);
          this.showCombatText(clicked, `-${dmg}`);
          if (clicked.hp <= 0) this.removeCharacter(clicked);
          this.updateHudForSelected();
        } else {
          this.selectCharacterByElement(charEl);
        }
      } else {
        this.clearSelection();
      }
    });
  }

  spawnCharacter(spec: CardSpec, x: number, y: number) {
    const rect = this.camera.getBoundingClientRect();
    // clamp positions inside camera
    x = Math.max(0, Math.min(x, rect.width - 60));
    y = Math.max(0, Math.min(y, rect.height - 60));

    const c = new Character(spec, x, y);
    this.characters.push(c);
    this.camera.appendChild(c.el);

    c.el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      // right-click to remove
      this.removeCharacter(c);
    });

    c.el.addEventListener('dblclick', () => {
      // double-click to attack nearest enemy
      this.autoAttack(c);
    });

    // click selects
    c.el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.selectCharacterByElement(c.el);
    });

    return c;
  }

  removeCharacter(c: Character) {
    this.characters = this.characters.filter(x => x !== c);
    if (c.el.parentElement) c.el.parentElement.removeChild(c.el);
    if (this.selected === c) this.selected = undefined;
  }

  selectCharacterByElement(el: HTMLElement) {
    const id = el.dataset.charId;
    const c = this.characters.find(ch => ch.id === id);
    if (!c) return;
    // toggle selection
    if (this.selected === c) {
      this.clearSelection();
      return;
    }
    this.selected = c;
    this.updateHudForSelected();
    this.updateSelectionVisuals();
  }

  clearSelection() {
    this.selected = undefined;
    this.updateHudForSelected();
    this.updateSelectionVisuals();
  }

  updateHudForSelected() {
    if (!this.selected) {
      this.hud.innerHTML = `<div class="info">Drop a card to spawn a character. Click a character to select it.</div>`;
      return;
    }
    this.hud.innerHTML = `
      <div class="selected">
        <div><strong>${this.selected.name}</strong></div>
        <div>HP: ${this.selected.hp}/${this.selected.maxHp}</div>
        <div>ATK: ${this.selected.atk} DEF: ${this.selected.def}</div>
        <div class="actions">
          <button id="btn-attack">Attack</button>
          <button id="btn-defend">Defend</button>
          <button id="btn-heal">Heal</button>
        </div>
      </div>
    `;

    (document.getElementById('btn-attack')!).addEventListener('click', () => this.commandAttack());
    (document.getElementById('btn-defend')!).addEventListener('click', () => this.commandDefend());
    (document.getElementById('btn-heal')!).addEventListener('click', () => this.commandHeal());
  }

  updateSelectionVisuals() {
    for (const c of this.characters) {
      if (c === this.selected) c.el.classList.add('selected');
      else c.el.classList.remove('selected');
    }
  }

  findNearest(target: Character) {
    let best: Character | null = null;
    let bestDist = Infinity;
    const tRect = target.el.getBoundingClientRect();
    const tX = tRect.left + tRect.width/2;
    const tY = tRect.top + tRect.height/2;
    for (const c of this.characters) {
      if (c === target) continue;
      const r = c.el.getBoundingClientRect();
      const x = r.left + r.width/2;
      const y = r.top + r.height/2;
      const d = Math.hypot(x - tX, y - tY);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    return best;
  }

  findByElement(el: HTMLElement) {
    const id = el.dataset.charId;
    return this.characters.find(c => c.id === id) || null;
  }

  autoAttack(attacker: Character) {
    const target = this.findNearest(attacker);
    if (!target) return;
    const dmg = target.takeDamage(attacker.atk);
    this.showCombatText(target, `-${dmg}`);
    if (target.hp <= 0) this.removeCharacter(target);
  }

  commandAttack() {
    if (!this.selected) return;
    const target = this.findNearest(this.selected);
    if (!target) return;
    const dmg = target.takeDamage(this.selected.atk);
    this.showCombatText(target, `-${dmg}`);
    if (target.hp <= 0) this.removeCharacter(target);
    this.updateHudForSelected();
  }

  commandDefend() {
    if (!this.selected) return;
    // temporary defend increases def for a short time
    const who = this.selected;
    const oldDef = who.def;
    who.def += 5;
    this.showCombatText(who, `DEF+5`);
    // show status badge
    const badge = who.el.querySelector('.status-badge') as HTMLElement | null;
    if (badge) { badge.textContent = 'DEF+5'; badge.style.display = 'block'; }
    setTimeout(() => { who.def = oldDef; if (badge) badge.style.display = 'none'; }, 3000);
    this.updateHudForSelected();
  }

  commandHeal() {
    if (!this.selected) return;
    this.selected.heal(20);
    this.showCombatText(this.selected, `+20`);
    this.updateHudForSelected();
  }

  showCombatText(target: Character, text: string) {
    const t = document.createElement('div');
    t.className = 'combat-text';
    t.textContent = text;
    t.style.left = (parseFloat(target.el.style.left) + 10) + 'px';
    t.style.top = (parseFloat(target.el.style.top) - 10) + 'px';
    this.camera.appendChild(t);
    setTimeout(() => { t.style.transform = 'translateY(-20px)'; }, 20);
    setTimeout(() => { if (t.parentElement) t.parentElement.removeChild(t); }, 1200);
  }
}
