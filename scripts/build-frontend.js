const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '..', 'frontend');
const destination = path.resolve(__dirname, '..', 'public');
const dropDestination = path.resolve(__dirname, '..', 'vercel-upload');
const lenisDist = path.resolve(__dirname, '..', 'node_modules', 'lenis', 'dist');
fs.mkdirSync(path.join(source, 'js', 'vendor'), { recursive: true });
fs.copyFileSync(path.join(lenisDist, 'lenis.min.js'), path.join(source, 'js', 'vendor', 'lenis.min.js'));
fs.copyFileSync(path.join(lenisDist, 'lenis.css'), path.join(source, 'css', 'lenis.css'));
fs.cpSync(source, destination, { recursive: true });
console.log(`Copied frontend files to ${destination}`);
fs.cpSync(source, dropDestination, { recursive: true });
console.log(`Prepared Vercel Drop files in ${dropDestination}`);
