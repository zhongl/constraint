import './styles/normalize.css';
import './styles/index.css';
import GUI from 'lil-gui';
import { ConstraintBackground, createConstraintTuning } from '@constraint/effect';

class App {
    private readonly tuning = createConstraintTuning();
    private readonly background: ConstraintBackground;
    private readonly gui: GUI;

    private readonly isPointerIgnored = (target: EventTarget | null): boolean => {
        return target instanceof Element && target.closest('.lil-gui') !== null;
    };

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
            followTimeout: 500,
            isPointerIgnored: this.isPointerIgnored
        });
        this.gui = this.createGui();
        document.addEventListener('keyup', this.onKeyUp);
    }

    dispose(): void {
        document.removeEventListener('keyup', this.onKeyUp);
        this.gui.destroy();
        this.background.dispose();
    }

    private createGui(): GUI {
        const gui = new GUI();
        const linesGui = gui.addFolder('Motion');
        linesGui.add(this.tuning.motion, 'constraintRatio', 0, 0.15).name('constraint ratio');
        linesGui.add(this.tuning.motion, 'simulationSpeed', 0, 3).name('simulation speed');
        linesGui.add(this.background, 'followTimeout', 100, 1000, 10).name('follow timeout (ms)');

        const envGui = gui.addFolder('Rendering');
        envGui.add(this.tuning.appearance, 'showLightNodes').name('light nodes');
        envGui.add(this.tuning.appearance, 'lightMode').name('light mode').listen().onChange(this.syncTheme);
        envGui.addColor(this.tuning.appearance, 'backgroundDark').name('background dark');
        envGui.addColor(this.tuning.appearance, 'backgroundLight').name('background light');
        envGui.addColor(this.tuning.appearance, 'groundDark').name('ground dark');
        envGui.addColor(this.tuning.appearance, 'groundLight').name('ground light');
        envGui.add(this.tuning.appearance, 'fogDensity', 0, 0.01).name('fog density');

        const preventDefault = (evt: KeyboardEvent) => {
            evt.preventDefault();
            (evt.currentTarget as HTMLElement).blur();
        };
        Array.prototype.forEach.call(gui.domElement.querySelectorAll('input[type="checkbox"],select'), function(elem: HTMLInputElement | HTMLSelectElement) {
            elem.onkeyup = elem.onkeydown = preventDefault;
            elem.style.color = '#000';
        });

        if (window.screen.width > 480) {
            linesGui.open();
            envGui.open();
        }

        return gui;
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
