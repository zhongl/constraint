import GUI from 'lil-gui';
import type { ConstraintBackground, ConstraintTuning } from '@constraint/effect';

interface DebugPanelOptions {
    tuning: ConstraintTuning;
    background: ConstraintBackground;
    syncTheme: () => void;
}

export function mountDebugPanel(options: DebugPanelOptions): () => void {
    const gui = new GUI();
    const linesGui = gui.addFolder('Motion');
    linesGui.add(options.tuning.motion, 'constraintRatio', 0, 0.15).name('constraint ratio');
    linesGui.add(options.tuning.motion, 'simulationSpeed', 0, 3).name('simulation speed');
    linesGui.add(options.background, 'followTimeout', 100, 1000, 10).name('follow timeout (ms)');

    const envGui = gui.addFolder('Rendering');
    envGui.add(options.tuning.appearance, 'showLightNodes').name('light nodes');
    envGui.add(options.tuning.appearance, 'lightMode').name('light mode').listen().onChange(options.syncTheme);
    envGui.addColor(options.tuning.appearance, 'backgroundDark').name('background dark');
    envGui.addColor(options.tuning.appearance, 'backgroundLight').name('background light');
    envGui.addColor(options.tuning.appearance, 'groundDark').name('ground dark');
    envGui.addColor(options.tuning.appearance, 'groundLight').name('ground light');
    envGui.add(options.tuning.appearance, 'fogDensity', 0, 0.01).name('fog density');

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

    return (): void => {
        gui.destroy();
    };
}
