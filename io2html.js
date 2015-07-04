var tty2html = require('./tty2html.js');

var inst = tty2html(256);

process.stdin.pipe(inst).pipe(process.stdout);
