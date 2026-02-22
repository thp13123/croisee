"use strict";
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
/** Durées en millisecondes */
const ORANGE_DURATION_MS = 2000;
const WALK_DURATION_S = 10;
/** Circonférence du cercle SVG (r=34) : 2π × 34 ≈ 213.6 */
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 34;
const DIRECTIONS = ['n', 's', 'e', 'w'];
// ─── Helpers DOM ──────────────────────────────────────────────────────────────
function el(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Élément introuvable : #${id}`);
    return element;
}
// ─── TrafficController ────────────────────────────────────────────────────────
class TrafficController {
    constructor() {
        this.state = "green" /* State.GREEN */;
        /** Handle du setTimeout de passage orange → rouge */
        this.orangeTimer = null;
        /** Handle du setInterval de décompte */
        this.walkInterval = null;
        /** Secondes restantes pendant RED_WALK */
        this.remainingSeconds = WALK_DURATION_S;
        // Boutons piétons (8 au total : 2 par coin)
        const buttonIds = [
            'btn-n-w', 'btn-n-e', // Nord  (côté ouest et est)
            'btn-s-w', 'btn-s-e', // Sud   (côté ouest et est)
            'btn-w-n', 'btn-w-s', // Ouest (côté nord et sud)
            'btn-e-n', 'btn-e-s', // Est   (côté nord et sud)
        ];
        this.buttons = buttonIds.map(id => el(id));
        this.statusLabel = el('status-label');
        this.countdownRing = el('countdown-ring');
        this.countdownNumber = el('countdown-number');
        this.countdownProgress = el('countdown-progress');
        // Attacher les écouteurs
        this.buttons.forEach(btn => {
            btn.addEventListener('click', () => this.requestCrossing());
        });
        // Afficher l'état initial (vert)
        this.renderState();
    }
    // ─── API publique ──────────────────────────────────────────────────────────
    /** Appelé lorsqu'un piéton appuie sur un bouton. Ignoré si cycle en cours. */
    requestCrossing() {
        if (this.state !== "green" /* State.GREEN */)
            return;
        this.transitionToOrange();
    }
    // ─── Transitions ──────────────────────────────────────────────────────────
    transitionToOrange() {
        this.state = "orange" /* State.ORANGE */;
        this.renderState();
        this.orangeTimer = setTimeout(() => {
            this.orangeTimer = null;
            this.transitionToRedWalk();
        }, ORANGE_DURATION_MS);
    }
    transitionToRedWalk() {
        this.state = "red" /* State.RED_WALK */;
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
        }, 1000);
    }
    transitionToGreen() {
        this.state = "green" /* State.GREEN */;
        this.renderState();
    }
    // ─── Rendu DOM ────────────────────────────────────────────────────────────
    /** Met à jour tous les éléments visuels selon l'état courant. */
    renderState() {
        this.updateCarLights();
        this.updatePedestrianSignals();
        this.updateButtons();
        this.updateStatusLabel();
        this.updateCountdownVisibility();
    }
    /** Active le bon bulbe de chaque feu voiture. */
    updateCarLights() {
        DIRECTIONS.forEach(dir => {
            const red = el(`light-${dir}-red`);
            const orange = el(`light-${dir}-orange`);
            const green = el(`light-${dir}-green`);
            red.classList.toggle('active', this.state === "red" /* State.RED_WALK */);
            orange.classList.toggle('active', this.state === "orange" /* State.ORANGE */);
            green.classList.toggle('active', this.state === "green" /* State.GREEN */);
        });
    }
    /** Active stop ou walk sur chaque signal piéton. */
    updatePedestrianSignals() {
        const walking = this.state === "red" /* State.RED_WALK */;
        DIRECTIONS.forEach(dir => {
            const stop = el(`ped-${dir}-stop`);
            const walk = el(`ped-${dir}-walk`);
            stop.classList.toggle('active', !walking);
            walk.classList.toggle('active', walking);
        });
    }
    /** Désactive les boutons pendant le cycle, les réactive en mode vert. */
    updateButtons() {
        const disabled = this.state !== "green" /* State.GREEN */;
        this.buttons.forEach(btn => {
            btn.disabled = disabled;
        });
    }
    updateStatusLabel() {
        const messages = {
            ["green" /* State.GREEN */]: 'Circulation normale – feux au vert',
            ["orange" /* State.ORANGE */]: 'Attention – passage piétons demandé…',
            ["red" /* State.RED_WALK */]: 'Traversée en cours – piétons prioritaires',
        };
        this.statusLabel.textContent = messages[this.state];
        this.statusLabel.className = `status-label ${this.state}`;
    }
    updateCountdownVisibility() {
        const visible = this.state === "red" /* State.RED_WALK */;
        this.countdownRing.classList.toggle('visible', visible);
    }
    /** Met à jour le chiffre et l'arc SVG du décompte. */
    updateCountdownUI() {
        this.countdownNumber.textContent = String(this.remainingSeconds);
        // strokeDashoffset : 0 = plein, CIRCUMFERENCE = vide
        const fraction = this.remainingSeconds / WALK_DURATION_S;
        const offset = CIRCLE_CIRCUMFERENCE * (1 - fraction);
        this.countdownProgress.style.strokeDashoffset = String(offset);
    }
    // ─── Nettoyage ────────────────────────────────────────────────────────────
    clearWalkInterval() {
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
