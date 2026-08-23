export class NodeLayout {
    readonly amount: number;

    constructor(readonly size: number) {
        this.amount = size ** 2;
    }

    u(index: number): number {
        return (index % this.size) / this.size;
    }

    v(index: number): number {
        return Math.floor(index / this.size) / this.size;
    }
}
