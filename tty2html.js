var streamTransform = require('stream').Transform;

function fnToggle(itm) {
	this._is[itm] = !this._is[itm];
}

function fnReset(itm) {
	if(itm === true) {
		for(var i in this._is)
			this._is[i] = false;
		this.background = this.dftBackground;
		this.foreground = this.dftForeground;
	}
	else {
		this._is[itm] = false;
	}
}

function fnAdvCol(color, isfg) {
	if(isfg)
		this.foreground = color;
	else
		this.background = color;
}

function fnFgCol(color) {
	this.foreground = color;
}

function fnBgCol(color) {
	this.background = color;
}

function tty2html(mode) {
	if(!(this instanceof tty2html))
		return(new tty2html(mode));
	
	streamTransform.call(this);
	
	this.prefix = 'tty2html-';
	this.suffix = '';
	this.filter = false;
	
	this.dftForeground = this.foreground = 'dft-fg';
	this.dftBackground = this.background = 'dft-bg';
	
	this.loadCodes(mode);
	
	this._is = {
		bold:      false,
		dim:       false,
		italic:    false,
		underline: false,
		blink:     false,
		reversed:  false,
		hidden:    false,
		strike:    false,
	};
	
	this._buffer = '';
}

require('util').inherits(tty2html, streamTransform);

tty2html.prototype.loadCodes = function(mode) {
	var self = this;
	
	function initSmall(obj, fn, start, tab) {
		var a  = [
			['bold', 'dim', 'italic', 'underline', 'blink', false, 'reversed', 'hidden', 'strike'],
			['black',  'red',   'green',   'yellow',   'blue',   'magenta',   'cyan',   'l-gray'],
			['d-gray', 'l-red', 'l-green', 'l-yellow', 'l-blue', 'l-magenta', 'l-cyan', 'white'],
		];
		
		for(var i = 0 ; i < a[tab].length ; i++) {
			if(a[tab][i] !== false)
				obj[i+start] = fn.bind(self, a[tab][i]);
		}
	}
	
	this.baseCodes = {
		0:   fnReset.bind(this, true),
		
		39:  fnFgCol.bind(this, this.dftForeground),
		49:  fnBgCol.bind(this, this.dftBackground),
	};
	
	initSmall(this.baseCodes, fnToggle, 1,   0);
	initSmall(this.baseCodes, fnReset,  21,  0);
	initSmall(this.baseCodes, fnFgCol,  30,  1);
	initSmall(this.baseCodes, fnBgCol,  40,  1);
	initSmall(this.baseCodes, fnFgCol,  90,  2);
	initSmall(this.baseCodes, fnBgCol,  100, 2);
	
	this.colorCodes = {};
	
	initSmall(this.colorCodes, fnAdvCol, 0, 1);
	initSmall(this.colorCodes, fnAdvCol, 8, 2);
	
	function toHex(x) {
		return(new Buffer([x]).toString('hex'));
	}
	
	if(mode == 256) {
		for(var r = 0 ; r < 6 ; r++) {
			for(var g = 0 ; g < 6 ; g++) {
				for(var b = 0 ; b < 6 ; b++) {
					var id = 16 + (r * 36) + (g * 6) + b;
					this.colorCodes[id] = fnAdvCol.bind(
						this,
						"#" + toHex(r?r*40+55:0) + toHex(g?g*40+55:0) + toHex(b?b*40+55:0)
					);
				}
			}
		}
		
		for(var i = 0 ; i < 24 ; i++) {
			var id = 232 + i;
			var x = toHex(i*10+8);
			this.colorCodes[id] = fnAdvCol.bind(
				this,
				"#" + x + x + x
			);
		}
	}
	else if(mode == 88) {
		var steps = ['00', '8b', 'cd', 'ff'];
		for(var r = 0 ; r < 4 ; r++) {
			for(var g = 0 ; g < 4 ; g++) {
				for(var b = 0 ; b < 4 ; b++) {
					var id = 16 + (r * 16) + (g * 4) + b;
					this.colorCodes[id] = fnAdvCol.bind(
						this,
						"#" + steps[r] + steps[g] + steps[b]
					);
				}
			}
		}
		
		for(var i = 0 ; i < 8 ; i++) {
			var x = (i * 23.18181818) + 46.36363636;
			if( i > 0 )
				x += 23.18181818;
			x = toHex(x|0);
			var id = 80 + i;
			
			this.colorCodes[id] = fnAdvCol.bind(
				this,
				"#" + x + x + x
			);
		}
	}
}

tty2html.prototype._transform = function(chunk, encoding, done) {
	var reg = /\x1b\[([0-9;]+)m/g;
	this._buffer += chunk.toString();
	
	var prevPos = 0;
	var match;
	while((match = reg.exec(this._buffer))) {
		var cmds = match[1].split(';');
		if(match.index != prevPos) {
			render.call(this, this._buffer.substr(prevPos, match.index - prevPos));
		}
		
		for(var i = 0 ; i < cmds.length ; i++)
			cmds[i] = parseInt(cmds[i]);
		
		for(var i = 0 ; i < cmds.length ; i++) {
			if(cmds[i] == 38 || cmds[i] == 48) {
				if(cmds[i+1] == 5) {
					processColorCode.call(this, cmds[i] == 38, cmds[i+2]);
					i += 2;
					continue;
				}
			}
			
			processBaseCode.call(this, cmds[i]);
		}
		
		prevPos = match.index + match[0].length;
	}
	
	if(prevPos > 0)
		this._buffer = this._buffer.substr(prevPos);
	
	done();
}

tty2html.prototype._flush = function(done) {
	if(this._buffer.length > 0) {
		render.call(this, this._buffer);
		this._buffer = '';
	}
	
	done();
}

function processBaseCode(code) {
	if(!this.baseCodes.hasOwnProperty(code))
		return;
	
	this.baseCodes[code]();
}

function processColorCode(isfg, code) {
	if(!this.colorCodes.hasOwnProperty(code))
		return;
	
	this.colorCodes[code](isfg);
}

function render(str) {
	var classes = [];
	var styles = [];
	var classMap = {
		bold: 'bold',
		dim: 'dim',
		hidden: 'hidden',
		italic: 'italic',
	};
	for(var i in classMap) {
		if(this._is[i])
			classes.push(this.prefix + classMap[i] + this.suffix);
	}
	
	var decoration = [];
	if(this._is.underline)
		decoration.push('underline');
	if(this._is.strike)
		decoration.push('strike');
	if(this._is.blink)
		decoration.push('blink');
	if(decoration.length > 0)
		classes.push(this.prefix + decoration.join('-') + this.suffix);
	
	if(this._is.reversed) {
		if(this.foreground[0] == "#")
			styles.push('background-color: ' + this.foreground + ';');
		else
			classes.push(this.prefix + 'bg-color-' + this.foreground + this.suffix);
		
		if(this.background[0] == "#")
			styles.push('color: ' + this.background + ';');
		else
			classes.push(this.prefix + 'fg-color-' + this.background + this.suffix);
	}
	else {
		if(this.foreground[0] == "#")
			styles.push('color: ' + this.foreground + ';');
		else
			classes.push(this.prefix + 'fg-color-' + this.foreground + this.suffix);
		
		if(this.background[0] == "#")
			styles.push('background-color: ' + this.background + ';');
		else
			classes.push(this.prefix + 'bg-color-' + this.background + this.suffix);
	}
	
	if(this.filter)
		str = this.filter(str);
	
	classes = ((classes.length == 0) ? '' : ' class="' + classes.join(' ') + '"');
	styles =  ((styles.length == 0)  ? '' : ' style="' + styles.join(' ') + '"');
	
	this.push('<span' + classes + styles + '>' + str + '</span>');
}

module.exports = tty2html;
