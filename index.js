//EPL2 Docs: http://www.servopack.de/support/zebra/EPL2_Manual.pdf

var fs = require('fs')
	, writeQueue = {}
	, wq = require('write-file-queue')
	;

module.exports = function (options) {
	return new EPL(options);
};

module.exports.EPL = EPL;

function EPL (options) {
	var self = this;
	options = options || {};

	self.output = "";
	self.font = "5";
	self.xOffset = 0;
	self.yOffset = 0;
	self.bookmarks = {};
	
	self.options = {
		  dpi : 203
		, labelWidth : 4
		, labelHeight : 6
		, lineSpacing : 25
		, device : "/dev/usblp0"
	};

	for (var key in options) {
		if (options.hasOwnProperty(key)) {
			self.options[key] = options[key];
		}
	}

	self.ELPFonts300 = {
		"1" : { "x" : 20, "y" : 12 },
		"2" : { "x" : 28, "y" : 16 },
		"3" : { "x" : 36, "y" : 20 },
		"4" : { "x" : 44, "y" : 24 },
		"5" : { "x" : 80, "y" : 48 }
	};

	self.ELPFonts203 = {
		"1" :  { "x" : 12, "y" : 8 },
		"2" :  { "x" : 16, "y" : 10 },
		"3" :  { "x" : 20, "y" : 12 },
		"4" :  { "x" : 24, "y" : 14 },
		"5" :  { "x" : 48, "y" : 32 }
	};

	self.setFont = function (fontNumber) {
		self.font = fontNumber;
		
		return self;
	};

	self.addText = function (text, size, advance) {
		size = (size || size === 0) ? size : 1;
		
		self.commands.a(self.xOffset, self.yOffset, 0, self.font, size, size, false, text);
		
		if (advance === undefined || advance === true || (advance && ~advance.indexOf("y"))) {
			self.yOffset += (size * self["ELPFonts" + self.options.dpi ][self.font]["y"]) + self.options.lineSpacing;
		}
		
		if (advance && advance.indexOf("x")) {
			self.xOffset += (size * self["ELPFonts" + self.options.dpi ][self.font]["x"]);
		}
		
		return self;
	};
	
	self.addTextCentered = function (text, size) {
		size = (size || size === 0) ? size : 1;
		
		xdots = (self.options.dpi * self.options.labelWidth) ;
		textWidth = ((text ||"").length * self["ELPFonts" + self.options.dpi ][self.font]["x"] * size);

		x = (xdots - textWidth) / 2;
		//print("xdots .. textWidth .. " . self["ELPFonts" + self.options.dpi ][self.font]["y"] . " ..x<br>\n");
		
		self.commands.a(x, self.yOffset, 0, self.font, size, size, false, text);
		self.yOffset += (size * self["ELPFonts" + self.options.dpi ][self.font]["y"]) + self.options.lineSpacing;
		
		return self;
	};

	self.drawBarcode = function (text, height, size, humanreadable) {
		height = (height || height === 0) ? height : 100;
		size = (size || size === 0) ? size : 1;
		
		self.commands.b(self.xOffset, self.yOffset, 0, 1, size, size, height, humanreadable, text);
		self.yOffset += height + self.options.lineSpacing + 20;
		
		return self;
	};
	
	self.drawUCC128Barcode = function (text, height, size, humanreadable) {
		height = (height || height === 0) ? height : 100;
		size = (size || size === 0) ? size : 1;
		
		self.commands.b(self.xOffset, self.yOffset, 0, 0, size, size, height, humanreadable, text);
		self.yOffset += height + self.options.lineSpacing + 20;
		
		return self;
	};

	self.drawUPC = function (text, height, size, humanreadable) {
		height = (height || height === 0) ? height : 100;
		size = (size || size === 2) ? size : 2;
		
		if (size < 2 || size > 4) {
			throw new Error("barcode size must be between 2 and 4 inclusive");
		}

		self.commands.b(self.xOffset, self.yOffset, 0, 'UA0', size, size, height, humanreadable, text);
		self.yOffset += height + self.options.lineSpacing + 20;
		
		return self;
	};
	
	self.drawEAN13 = function (text, height, size, humanreadable) {
		height = (height || height === 0) ? height : 100;
		size = (size || size === 2) ? size : 2;
		
		if (size < 2 || size > 4) {
			throw new Error("barcode size must be between 2 and 4 inclusive");
		}

		self.commands.b(self.xOffset, self.yOffset, 0, 'E30', size, size, height, humanreadable, text);
		self.yOffset += height + self.options.lineSpacing + 20;
		
		return self;
	};

	self.drawLine = function (length, height, xor) {
		self.commands[(xor) ? "le" : "lo"](self.xOffset, self.yOffset, length, height);
		self.yOffset += height;
		self.xOffset += length;
		
		return self;
	};
	
	self.drawBox = function (length, height, stroke) {
		self.commands.x(self.xOffset, self.yOffset, stroke, self.xOffset + length, self.yOffset + height);
		self.xOffset += length;
		
		return self;
	};
	
	self.start = function () {
		self.commands.n();
		return self;
	};
	
	self.end = function () {
		self.commands.p();
		return self;
	};

	self.position = function (x, y) {
		if (x !== null && x !== undefined) {
			self.xOffset = x;
		}
		
		if (y !== null && y !== undefined) {
			self.yOffset = y;
		}
		
		return self;
	};
	
	self.move = function (x, y) {
		if (x !== null && x !== undefined) {
			self.xOffset += x;
		}
		
		if (y !== null && y !== undefined) {
			self.yOffset += y;
		}
		
		return self;
	};
	
	self.print = function (callback) {
		writeQueue[self.options.device] = writeQueue[self.options.device] || wq({ retries : 60 * 5 * 1000 });
		
		writeQueue[self.options.device](self.options.device, self.output, callback);
		
		return self;
	};
	
	self.bookmark = function (name, xy) {
		var self = this;
		
		self.bookmarks[name] = {
			x : (!xy || xy === "x") ? self.xOffset : null
			, y : (!xy || xy === "y") ? self.yOffset : null
		}
		
		return self;
	};
	
	self.recall = function (name) {
		var self = this
			, bm = self.bookmarks[name]
			;
		
		return self.position(bm.x, bm.y);
	};
	
	self.commands = {
		a : function (x, y, rotation, font, hMultiplier, vMultiplier, reverseImage, data) {
			data = (data || "").toUpperCase();
			data = cleanString(data);

			if (reverseImage) {
				reverseImage = "R";
			}
			else {
				reverseImage = "N";
			}
			
			self.output += ["A" + x, y, rotation, font, hMultiplier, vMultiplier, reverseImage, "\"" + data + "\"\n"].join(',');
		}
		, b : function (x, y, rotation, barcodeType, narrowBarWidth, wideBarWidth, height, humanReadable, data) {
			data = (data || "").toUpperCase();
			data = cleanString(data);
			
			if (humanReadable) {
				humanReadable = "B";
			}
			else {
				humanReadable = "N";
			}
			
			self.output += ["B" + x, y, rotation, barcodeType, narrowBarWidth, wideBarWidth, height, humanReadable, "\"" + data + "\"\n"].join(',');
		}
		, lo : function (x, y, length, height) {
			self.output += ["LO" + x, y, length, height + "\n"].join(',');
		}
		, le : function (x, y, length, height) {
			self.output += ["LE" + x, y, length, height + "\n"].join(',');
		}
		, x : function (x, y, thickness, xEnd, yEnd) {
			self.output += ["X" + x, y, thickness, xEnd, yEnd + "\n"].join(',');
		}
		, n : function () {
			self.output += "N\n";
		}
		, p : function (){
			self.output += "P1\n";
		}
		, z : function (direction) {
			self.output += "Z" + direction + "\n";
		}
	};
}

function cleanString(str) {
	return str.replace(/\\/gi,"\\\\")
		.replace(/"/gi,"\\\"")
		.replace(/[\r\n]+/gi," ");
}