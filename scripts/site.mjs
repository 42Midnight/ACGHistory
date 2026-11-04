import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {check} from './validate.mjs';
const [action='dev',...args]=process.argv.slice(2);
if(!['dev','build','preview'].includes(action))throw Error('Expected dev, build, or preview');
if(action==='build')check();
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs',import.meta.url)),action,...args],{stdio:'inherit',env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'}});
child.on('exit',code=>process.exitCode=code??1);
child.on('error',e=>{console.error(e.message);process.exitCode=1});
