import './styles/global.css';

import { Game } from './game/Game';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Game mount point was not found.');
}

const shell = document.createElement('main');
shell.className = 'game-shell';
app.append(shell);

try {
  new Game(shell);
} catch (error) {
  console.error(error);
  shell.innerHTML = `
    <section class="boot-error">
      <div class="title-kicker"><span class="kicker-dot"></span> SIGNAL INTERRUPTION</div>
      <h1>THE CITY<br><em>WILL RETURN.</em></h1>
      <p>WebGL could not start on this device. Try a current browser with hardware acceleration enabled.</p>
      <button class="action-button primary-button" type="button" onclick="window.location.reload()">TRY AGAIN</button>
    </section>
  `;
}
