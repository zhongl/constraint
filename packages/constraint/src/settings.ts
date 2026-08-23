export interface Motion {
    constraintRatio: number;
    simulationSpeed: number;
}

export interface Appearance {
    showLightNodes: boolean;
    lightMode: boolean;
    backgroundDark: string;
    backgroundLight: string;
    groundDark: string;
    groundLight: string;
    fogDensity: number;
}

export interface ConstraintTuning {
    motion: Motion;
    appearance: Appearance;
}

export function createConstraintTuning(): ConstraintTuning {
    return {
        motion: {
            constraintRatio: 0.07,
            simulationSpeed: 1
        },
        appearance: {
            showLightNodes: false,
            lightMode: false,
            backgroundDark: '#222222',
            backgroundLight: '#eeeeee',
            groundDark: '#111111',
            groundLight: '#cccccc',
            fogDensity: 0.001
        }
    };
}
