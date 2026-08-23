import GUI from 'lil-gui';
import type { ConstraintTuning, PointerOptions } from '@tech-kn/constraint';

interface DebugPanelOptions {
    tuning: ConstraintTuning;
    pointer: PointerOptions;
    syncTheme: () => void;
}

export function mountDebugPanel(options: DebugPanelOptions): () => void {
    const gui = new GUI();
    gui.domElement.dataset.constraintIgnorePointer = '';

    const linesGui = gui.addFolder('Motion');
    linesGui.add(options.tuning.motion, 'constraintRatio', 0, 0.15).name('constraint ratio');
    linesGui.add(options.tuning.motion, 'simulationSpeed', 0, 3).name('simulation speed');
    linesGui.add(options.pointer, 'idleTimeout', 100, 1000, 10).name('follow timeout (ms)');

    const envGui = gui.addFolder('Rendering');
    envGui.add(options.tuning.appearance, 'showLightNodes').name('light nodes');
    envGui.add(options.tuning.appearance, 'lightMode').name('light mode').listen().onChange(options.syncTheme);
    envGui.addColor(options.tuning.appearance, 'backgroundDark').name('background dark');
    envGui.addColor(options.tuning.appearance, 'backgroundLight').name('background light');
    envGui.addColor(options.tuning.appearance, 'groundDark').name('ground dark');
    envGui.addColor(options.tuning.appearance, 'groundLight').name('ground light');
    envGui.add(options.tuning.appearance, 'fogDensity', 0, 0.01).name('fog density');

    if (window.screen.width > 480) {
        linesGui.open();
        envGui.open();
    }

    return (): void => {
        gui.destroy();
    };
}
