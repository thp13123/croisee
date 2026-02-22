/**
 * Contrôleur de feux de signalisation – Croisée à 4 voies
 *
 * Cycle déclenché par un bouton piéton :
 *   GREEN  ──(immédiat)──► ORANGE
 *   ORANGE ──(2 s)───────► RED_WALK  (piétons traversent, 10 s de décompte)
 *   RED_WALK ──(10 s)────► GREEN
 *
 * 4 feux voitures (N, S, E, O), 4 signaux piétons, 8 boutons piétons.
 * Tout bouton pressé pendant un cycle en cours est ignoré.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

const enum State {
  GREEN    = 'green',
  ORANGE   = 'orange',
  RED_WALK = 'red',
}

/** Durées en millisecondes */
const ORANGE_DURATION_MS  = 2_000;
const WALK_DURATION_S     = 10;

/** Circonférence du cercle SVG (r=34) : 2π × 34 ≈ 213.6 */
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 34;

// ─── Directions ───────────────────────────────────────────────────────────────

type Direction = 'n' | 's' | 'e' | 'w';
const DIRECTIONS: Direction[] = ['n', 's', 'e', 'w'];

// ─── Helpers DOM ──────────────────────────────────────────────────────────────

function el<T extends Element = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément introuvable : #${id}`);
  return element as unknown as T;
}

// ─── TrafficController ────────────────────────────────────────────────────────

class TrafficController {
  private state: State = State.GREEN;

  /** Handle du setTimeout de passage orange → rouge */
  private orangeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Handle du setInterval de décompte */
  private walkInterval: ReturnType<typeof setInterval> | null = null;

  /** Secondes restantes pendant RED_WALK */
  private remainingSeconds: number = WALK_DURATION_S;

  // Éléments DOM mis en cache
  private readonly buttons: HTMLButtonElement[];
  private readonly statusLabel: HTMLElement;
  private readonly countdownRing: HTMLElement;
  private readonly countdownNumber: HTMLElement;
  private readonly countdownProgress: SVGCircleElement;

  constructor() {
    // Boutons piétons (8 au total : 2 par coin)
    const buttonIds = [
      'btn-n-w', 'btn-n-e',   // Nord  (côté ouest et est)
      'btn-s-w', 'btn-s-e',   // Sud   (côté ouest et est)
      'btn-w-n', 'btn-w-s',   // Ouest (côté nord et sud)
      'btn-e-n', 'btn-e-s',   // Est   (côté nord et sud)
    ];

    this.buttons = buttonIds.map(id => el<HTMLButtonElement>(id));
    this.statusLabel       = el('status-label');
    this.countdownRing     = el('countdown-ring');
    this.countdownNumber   = el('countdown-number');
    this.countdownProgress = el<SVGCircleElement>('countdown-progress');

    // Attacher les écouteurs
    this.buttons.forEach(btn => {
      btn.addEventListener('click', () => this.requestCrossing());
    });

    // Afficher l'état initial (vert)
    this.renderState();
  }

  // ─── API publique ──────────────────────────────────────────────────────────

  /** Appelé lorsqu'un piéton appuie sur un bouton. Ignoré si cycle en cours. */
  requestCrossing(): void {
    if (this.state !== State.GREEN) return;
    this.transitionToOrange();
  }

  // ─── Transitions ──────────────────────────────────────────────────────────

  private transitionToOrange(): void {
    this.state = State.ORANGE;
    this.renderState();

    this.orangeTimer = setTimeout(() => {
      this.orangeTimer = null;
      this.transitionToRedWalk();
    }, ORANGE_DURATION_MS);
  }

  private transitionToRedWalk(): void {
    this.state            = State.RED_WALK;
    this.remainingSeconds = WALK_DURATION_S;
    this.renderState();
    this.updateCountdownUI();

    this.walkInterval = setInterval(() => {
      this.remainingSeconds--;
      this.updateCountdownUI();

      if (this.remainingSeconds <= 0) {
        this.clearWalkInterval();
        this.transitionToGreen();
      }
    }, 1_000);
  }

  private transitionToGreen(): void {
    this.state = State.GREEN;
    this.renderState();
  }

  // ─── Rendu DOM ────────────────────────────────────────────────────────────

  /** Met à jour tous les éléments visuels selon l'état courant. */
  private renderState(): void {
    this.updateCarLights();
    this.updatePedestrianSignals();
    this.updateButtons();
    this.updateStatusLabel();
    this.updateCountdownVisibility();
  }

  /** Active le bon bulbe de chaque feu voiture. */
  private updateCarLights(): void {
    DIRECTIONS.forEach(dir => {
      const red    = el(`light-${dir}-red`);
      const orange = el(`light-${dir}-orange`);
      const green  = el(`light-${dir}-green`);

      red.classList.toggle   ('active', this.state === State.RED_WALK);
      orange.classList.toggle('active', this.state === State.ORANGE);
      green.classList.toggle ('active', this.state === State.GREEN);
    });
  }

  /** Active stop ou walk sur chaque signal piéton. */
  private updatePedestrianSignals(): void {
    const walking = this.state === State.RED_WALK;

    DIRECTIONS.forEach(dir => {
      const stop = el(`ped-${dir}-stop`);
      const walk = el(`ped-${dir}-walk`);

      stop.classList.toggle('active', !walking);
      walk.classList.toggle('active',  walking);
    });
  }

  /** Désactive les boutons pendant le cycle, les réactive en mode vert. */
  private updateButtons(): void {
    const disabled = this.state !== State.GREEN;
    this.buttons.forEach(btn => {
      btn.disabled = disabled;
    });
  }

  private updateStatusLabel(): void {
    const messages: Record<State, string> = {
      [State.GREEN]:    'Circulation normale – feux au vert',
      [State.ORANGE]:   'Attention – passage piétons demandé…',
      [State.RED_WALK]: 'Traversée en cours – piétons prioritaires',
    };
    this.statusLabel.textContent = messages[this.state];
    this.statusLabel.className   = `status-label ${this.state}`;
  }

  private updateCountdownVisibility(): void {
    const visible = this.state === State.RED_WALK;
    this.countdownRing.classList.toggle('visible', visible);
  }

  /** Met à jour le chiffre et l'arc SVG du décompte. */
  private updateCountdownUI(): void {
    this.countdownNumber.textContent = String(this.remainingSeconds);

    // strokeDashoffset : 0 = plein, CIRCUMFERENCE = vide
    const fraction = this.remainingSeconds / WALK_DURATION_S;
    const offset   = CIRCLE_CIRCUMFERENCE * (1 - fraction);
    this.countdownProgress.style.strokeDashoffset = String(offset);
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────

  private clearWalkInterval(): void {
    if (this.walkInterval !== null) {
      clearInterval(this.walkInterval);
      this.walkInterval = null;
    }
  }
}

// ─── Démarrage ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  new TrafficController();
});
