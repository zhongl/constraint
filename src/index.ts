import './styles/normalize.css';
import './styles/index.css';
import { ConstraintBackground, createConstraintTuning, type PointerOptions } from '@tech-kn/constraint';
import { mountDebugPanel } from './debug-panel';

class App {
    private readonly tuning = createConstraintTuning();
    private readonly pointer: PointerOptions = { idleTimeout: 500 };
    private readonly background: ConstraintBackground;
    private readonly disposeDebugPanel: () => void;

    private readonly onKeyUp = (evt: KeyboardEvent): void => {
        if (evt.key === ' ') {
            this.tuning.appearance.lightMode = !this.tuning.appearance.lightMode;
            this.syncTheme();
        }
    };

    private readonly syncTheme = (): void => {
        document.documentElement.classList.toggle('is-light', this.tuning.appearance.lightMode);
    };

    constructor() {
        this.background = new ConstraintBackground(document.body, {
            tuning: this.tuning,
            pointer: this.pointer
        });
        this.disposeDebugPanel = mountDebugPanel({
            tuning: this.tuning,
            pointer: this.pointer,
            syncTheme: this.syncTheme
        });
        document.addEventListener('keyup', this.onKeyUp);
    }

    dispose(): void {
        document.removeEventListener('keyup', this.onKeyUp);
        this.disposeDebugPanel();
        this.background.dispose();
    }

}

function showInitializationError(error: Error): void {
    document.body.innerHTML = `<main class="compatibility-message"><h1>无法运行此实验</h1><p>${error.message}</p><p>请尝试使用最新版 Chrome、Safari 或 Firefox，并开启硬件加速。</p></main>`;
}

function main(): void {
    try {
        new App();
    } catch (error) {
        console.error(error);
        showInitializationError(error as Error);
    }
}

main();
