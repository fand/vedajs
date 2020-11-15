import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/index.ts',
    output: {
        dir: '.',
        format: 'cjs',
        exports: 'named',
    },
    plugins: [
        typescript({
            module: 'es6',
            target: 'es6',
        }),
        nodeResolve(),
        commonjs(),
    ],
};
