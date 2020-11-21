import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/index.ts',
    output: {
        dir: '.',
        format: 'cjs',
        exports: 'named',
        outro: `module.exports.default = module.exports;`,
    },
    plugins: [typescript({}), nodeResolve(), commonjs()],
};
