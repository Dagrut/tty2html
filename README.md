tty2html
========

tty2html is a nodejs library that can take text from a colorized command line output and produce a colorized html that would look the same.
The file io2html.js is an example of how to use this library. It takes the standard input and produce html on the output :

	ls -l --color=yes | node io2html.js

The 16 base colors and the text effects can be configured in a css file (see example.css for an example). The other colors (88 or 256 colors for terminals that 
allows it) are hardcoded the way they are in xterm.

Note that many programs check if the output is a tty and remove colors if it is not, so if you want to use it, you may need to comment a few lines or give some 
special parameters to force colorized output.

Finally, note that no optimizations were made about the output code size. It may be improved but that may also increase the code complexity.

Library usage
-------------

### tty2html([mode])

Returns a new instance of tty2html, with or without a `new`. `mode` can be either 88 to load the 88 colors set, 256 for the 256 colors set, or something else if 
you don't want to load any extended colors set.

The returned object is a stream, so you can use it like any stream.

#### .prefix

A variable that contains the prefix added to each css classes. Defauls to `tty2html-`.

#### .suffix

A variable that contains the suffix added to each css classes. Defauls to an empty string.

#### .filter

A callback function that can be used to format each piece of text that will be produced on the output (like htmlentities). If false, not used.

#### .dftForeground

The default foreground color to use (as a class name). Defaults to `dft-fg`. Call .loadCodes() after changing this.

#### .dftBackground

The default background color to use (as a class name). Defaults to `dft-bg`. Call .loadCodes() after changing this.

#### .loadCodes([mode])

(Re)Load the tty escape codes. The mode is the same as in the constructor.

Examples
--------

For output examples, see the .html files included in this directory.

Licence
-------

WTFPLv2 ( http://www.wtfpl.net/ ) :

DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
Version 2, December 2004
 
Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>
 
Everyone is permitted to copy and distribute verbatim or modified
copies of this license document, and changing it is allowed as long
as the name is changed.

DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

0. You just DO WHAT THE FUCK YOU WANT TO.
