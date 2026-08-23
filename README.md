# Constraint

![](https://raw.githubusercontent.com/edankwan/Constraint/master/app/images/screenshot.jpg)

This project is based on [Edan Kwan's Constraint](https://github.com/edankwan/Constraint) and continues to evolve from it. Many thanks to Edan Kwan for creating and releasing this work under the MIT License.

## Demo

See it in action at the [Constraint Demo](https://tech-kn.github.io/constraint/).

## Usage

Install the dependencies:

```bash
pnpm add @tech-kn/constraint
```

Create a sized container and initialize the background:

```ts
import { ConstraintBackground } from '@tech-kn/constraint';

const host = document.querySelector<HTMLElement>('#constraint')!;
const background = new ConstraintBackground(host, {
  theme: 'dark'
});

// Release WebGL and other resources when the page is unmounted.
background.dispose();
```

## License

MIT. See [LICENSE.md](LICENSE.md).
