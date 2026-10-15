import type { MissionDefinition } from '../game/types';

export interface ScreenCallbacks {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onContinue: () => void;
  onMenu: () => void;
  onToggleSound: () => boolean;
}

function createButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `action-button ${className}`;
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export class Screens {
  readonly root = document.createElement('div');
  private readonly panel = document.createElement('div');

  constructor(private readonly callbacks: ScreenCallbacks) {
    this.root.className = 'screen-layer';
    this.panel.className = 'screen-panel';
    this.root.append(this.panel);
  }

  showMenu(highScore: number, soundEnabled: boolean): void {
    this.render(`
      <div class="title-kicker"><span class="kicker-dot"></span> AN ORIGINAL CINEMATIC ACTION GAME</div>
      <h1>MASS<br><em>METRO</em></h1>
      <p class="title-subtitle">SHADOW OF MUTHU NAGAR</p>
      <p class="title-copy">One street. One promise. One impossible entry.</p>
      <div class="menu-actions"></div>
      <div class="menu-meta"><span>HIGH SCORE <strong>${String(highScore).padStart(6, '0')}</strong></span><span>BUILD 01 · WEB</span></div>
      <div class="control-strip"><span>WASD MOVE</span><span>J STRIKE</span><span>Q DODGE</span><span>1–4 AURA MOVES</span></div>
    `);
    const actions = this.panel.querySelector('.menu-actions') as HTMLDivElement;
    actions.append(createButton('BEGIN THE ENTRY', 'primary-button', this.callbacks.onStart));
    const sound = createButton(soundEnabled ? 'SOUND: ON' : 'SOUND: OFF', 'quiet-button', () => {
      sound.textContent = this.callbacks.onToggleSound() ? 'SOUND: ON' : 'SOUND: OFF';
    });
    actions.append(sound);
    this.setVisible(true);
  }

  showBriefing(mission: MissionDefinition | null, index: number, isBoss = false): void {
    const title = isBoss ? 'THE LAST BELL' : mission?.title ?? 'NEXT STREET';
    const subtitle = isBoss ? 'Rathna Veyil is waiting inside the dead factory.' : mission?.subtitle ?? '';
    const objective = isBoss ? 'Break the syndicate. Bring Nila home.' : mission?.objective ?? '';
    this.render(`
      <div class="briefing-stamp">MISSION ${String(index + 1).padStart(2, '0')} / ${isBoss ? 'FINAL' : '4'}</div>
      <h2>${title}</h2>
      <p class="briefing-subtitle">${subtitle}</p>
      <div class="briefing-objective"><span>OBJECTIVE</span><strong>${objective}</strong></div>
      <p class="briefing-line">No backup. No shortcuts. Just presence.</p>
      <div class="menu-actions"></div>
    `);
    const actions = this.panel.querySelector('.menu-actions') as HTMLDivElement;
    actions.append(createButton(isBoss ? 'ENTER THE ARENA' : 'STEP INTO THE STREET', 'primary-button', this.callbacks.onContinue));
    actions.append(createButton('RETURN TO TITLE', 'quiet-button', this.callbacks.onMenu));
    this.setVisible(true);
  }

  showPause(soundEnabled: boolean): void {
    this.render(`
      <div class="pause-kicker">THE CITY HOLDS ITS BREATH</div>
      <h2>PAUSED</h2>
      <p class="briefing-line">Take the moment. Then make the next one count.</p>
      <div class="menu-actions"></div>
    `);
    const actions = this.panel.querySelector('.menu-actions') as HTMLDivElement;
    actions.append(createButton('RESUME', 'primary-button', this.callbacks.onResume));
    const sound = createButton(soundEnabled ? 'SOUND: ON' : 'SOUND: OFF', 'quiet-button', () => {
      sound.textContent = this.callbacks.onToggleSound() ? 'SOUND: ON' : 'SOUND: OFF';
    });
    actions.append(sound, createButton('QUIT TO TITLE', 'quiet-button', this.callbacks.onMenu));
    this.setVisible(true);
  }

  showMissionComplete(title: string, reward: number, score: number, isFinalMission = false): void {
    this.render(`
      <div class="completion-mark">✦</div>
      <div class="briefing-stamp">${isFinalMission ? 'ARENA CLEARED' : 'STREET CLEARED'}</div>
      <h2>${isFinalMission ? 'THE BELL BREAKS' : title}</h2>
      <p class="briefing-subtitle">${isFinalMission ? 'Muthu Nagar will remember this entry.' : 'The Black Lotus line just lost another link.'}</p>
      <div class="reward-grid"><div><span>REWARD</span><strong>+${reward} CRED</strong></div><div><span>SCORE</span><strong>${String(score).padStart(6, '0')}</strong></div></div>
      <div class="menu-actions"></div>
    `);
    const actions = this.panel.querySelector('.menu-actions') as HTMLDivElement;
    actions.append(createButton(isFinalMission ? 'PLAY AGAIN' : 'NEXT MISSION', 'primary-button', isFinalMission ? this.callbacks.onRestart : this.callbacks.onContinue));
    actions.append(createButton('RETURN TO TITLE', 'quiet-button', this.callbacks.onMenu));
    this.setVisible(true);
  }

  showGameOver(score: number): void {
    this.render(`
      <div class="briefing-stamp">SIGNAL LOST</div>
      <h2>NOT YET.</h2>
      <p class="briefing-subtitle">The street is still yours to reclaim.</p>
      <div class="reward-grid"><div><span>RUN SCORE</span><strong>${String(score).padStart(6, '0')}</strong></div><div><span>STATUS</span><strong>RESET</strong></div></div>
      <div class="menu-actions"></div>
    `);
    const actions = this.panel.querySelector('.menu-actions') as HTMLDivElement;
    actions.append(createButton('RESTART RUN', 'primary-button', this.callbacks.onRestart));
    actions.append(createButton('RETURN TO TITLE', 'quiet-button', this.callbacks.onMenu));
    this.setVisible(true);
  }

  showVictory(score: number, highScore: number): void {
    this.render(`
      <div class="victory-spark">✦ ✦ ✦</div>
      <div class="briefing-stamp">MUTHU NAGAR · SAFE</div>
      <h2>ENTRY<br><em>COMPLETE.</em></h2>
      <p class="briefing-subtitle">Nila is coming home. The city knows your name.</p>
      <div class="reward-grid"><div><span>FINAL SCORE</span><strong>${String(score).padStart(6, '0')}</strong></div><div><span>BEST SCORE</span><strong>${String(highScore).padStart(6, '0')}</strong></div></div>
      <div class="menu-actions"></div>
    `);
    const actions = this.panel.querySelector('.menu-actions') as HTMLDivElement;
    actions.append(createButton('PLAY AGAIN', 'primary-button', this.callbacks.onRestart));
    actions.append(createButton('RETURN TO TITLE', 'quiet-button', this.callbacks.onMenu));
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  private render(markup: string): void {
    this.panel.innerHTML = markup;
  }

  private setVisible(visible: boolean): void {
    this.root.classList.toggle('is-visible', visible);
  }
}
