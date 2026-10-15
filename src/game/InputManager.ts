import * as THREE from 'three';

export type InputAction =
  | 'lightAttack'
  | 'heavyAttack'
  | 'dodge'
  | 'jump'
  | 'sprint'
  | 'pause'
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'shoot'
  | 'reload'
  | 'weapon1'
  | 'weapon2'
  | 'weapon3'
  | 'aim';

const KEY_BINDINGS: Record<string, InputAction> = {
  j: 'lightAttack',
  J: 'lightAttack',
  k: 'heavyAttack',
  K: 'heavyAttack',
  q: 'dodge',
  Q: 'dodge',
  ' ': 'jump',
  Shift: 'sprint',
  Escape: 'pause',
  '1': 'ability1',
  '2': 'ability2',
  '3': 'ability3',
  '4': 'ability4',
  l: 'shoot',
  L: 'shoot',
  r: 'reload',
  R: 'reload',
  z: 'weapon1',
  Z: 'weapon1',
  x: 'weapon2',
  X: 'weapon2',
  c: 'weapon3',
  C: 'weapon3',
  Control: 'aim',
};

export class InputManager {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<InputAction>();
  private readonly virtualActions = new Set<InputAction>();
  private readonly virtualMovement = new THREE.Vector2();
  private readonly movement = new THREE.Vector2();
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }

    this.keys.add(event.key);
    const action = KEY_BINDINGS[event.key];
    if (action) {
      this.pressed.add(action);
    }
  };
  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key);
  };
  private readonly onPointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof HTMLCanvasElement)) {
      return;
    }
    if (event.button === 0) {
      this.setVirtualAction('shoot', true);
    }
    if (event.button === 2) {
      this.setVirtualAction('aim', true);
    }
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    if (event.button === 0) {
      this.setVirtualAction('shoot', false);
    }
    if (event.button === 2) {
      this.setVirtualAction('aim', false);
    }
  };
  private readonly onContextMenu = (event: MouseEvent) => event.preventDefault();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('blur', () => this.clear());
  }

  getMovement(): THREE.Vector2 {
    const x = (this.keys.has('d') || this.keys.has('D') || this.keys.has('ArrowRight') ? 1 : 0)
      - (this.keys.has('a') || this.keys.has('A') || this.keys.has('ArrowLeft') ? 1 : 0);
    const y = (this.keys.has('s') || this.keys.has('S') || this.keys.has('ArrowDown') ? 1 : 0)
      - (this.keys.has('w') || this.keys.has('W') || this.keys.has('ArrowUp') ? 1 : 0);

    this.movement.set(x + this.virtualMovement.x, y + this.virtualMovement.y);
    if (this.movement.lengthSq() > 1) {
      this.movement.normalize();
    }
    return this.movement;
  }

  isDown(action: InputAction): boolean {
    if (this.virtualActions.has(action)) {
      return true;
    }

    if (action === 'sprint') {
      return this.keys.has('Shift');
    }

    if (action === 'shoot' || action === 'aim') {
      return this.keys.has('l') || this.keys.has('L') || this.keys.has('Control') || this.virtualActions.has(action);
    }

    return false;
  }

  consume(action: InputAction): boolean {
    if (!this.pressed.has(action)) {
      return false;
    }

    this.pressed.delete(action);
    return true;
  }

  setVirtualAction(action: InputAction, down: boolean): void {
    if (down) {
      this.virtualActions.add(action);
      this.pressed.add(action);
    } else {
      this.virtualActions.delete(action);
    }
  }

  setVirtualMovement(x: number, y: number): void {
    this.virtualMovement.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
  }

  clearVirtualMovement(): void {
    this.virtualMovement.set(0, 0);
  }

  clear(): void {
    this.keys.clear();
    this.pressed.clear();
    this.virtualActions.clear();
    this.clearVirtualMovement();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
    this.clear();
  }
}
