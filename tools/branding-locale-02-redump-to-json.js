var fs = require("fs");
var path = require("path");

const getScriptDir = (fn) => {
	var pth = path.join(__dirname);
	if (fn) {
		return path.join(pth, fn);
	} else {
		return pth;
	}
}

const initObj = () => {
	var obj = {
		"about.dtd": {},
		"csledit.dtd": {},
		"cslpreview.dtd": {},
		"preferences.dtd": {},
		"publications.dtd": {},
		"searchbox.dtd": {},
		"standalone.dtd": {},
		"timeline.properties": {},
		"zotero.dtd": {},
		"zotero.properties": {}
	};
	return obj;
}

const processStringEdits = (repl) => {
	var txt = fs.readFileSync("BRANDO.txt").toString();
	var lines = txt.split("\n");

	for (var i=0,ilen=lines.length;i<ilen;i++) {
		let line = lines[i];
		let m = line.match(/^(.*)?@(.*)?/);
		if (!m) continue;

		let key = m[1];
		let fn = m[2];
		let str = lines[i+1].trim();
		var mm = str.match(/(Juris-M|Jurism|Zotero)/g);
		if (!mm) {
			throw new Error(`No replacement in: ${str}`);
		}
		if (!repl[fn][key]) {
			repl[fn][key] = {};
		}
		repl[fn][key].words = mm;
	}
	return repl;
}

const processStringReplacements = (repl) => {
	var txt = fs.readFileSync("BRANDO-FORCE.txt").toString();
	var lines = txt.split("\n");
	for (var i=0,ilen=lines.length;i<ilen;i++) {
		var line = lines[i];
		if (line.match(/^\s+/)) continue;
		if (line.indexOf("@") === -1) continue;
		var m = line.match(/^(.*)@(.*)$/);
		var fn = m[2];
		var key = m[1];
		var str = lines[i+1].trim();
		if (!repl[fn][key]) {
			repl[fn][key] = {};
		}
		repl[fn][key].text = str;
	}
	return repl;
};

const run = () => {
	var repl = initObj();
	repl = processStringReplacements(repl);
	repl = processStringEdits(repl);
	fs.writeFileSync(getScriptDir("branding-locale-replacements.json"), JSON.stringify(repl, null, 2));
	
};

run();
