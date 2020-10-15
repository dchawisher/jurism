Zotero.JurisAbbrevs = new function() {
	var _initialized = false;
	var _populated = false;
	var _initializationDeferred = false;
	var _jurisAbbrevs;
	
	Components.utils.import("resource://gre/modules/Services.jsm");
	Components.utils.import("resource://gre/modules/FileUtils.jsm");
	
	this.init = Zotero.Promise.coroutine(function* (options = {}) {
		Zotero.debug("[Jurism] Running JurisAbbrevs init to load abbrev file metadata", 1);
		// Wait until bundled files have been updated, except when this is called by the schema update
		// code itself
		if (!options.fromSchemaUpdate) {
			yield Zotero.Schema.schemaUpdatePromise;
		}
		
		if (Zotero.test) {
			this.versionFile = "versions-zz.json";
		} else {
			this.versionFile = "versions.json";
		}
		
		// If an initialization has already started, a regular init() call should return the promise
		// for that (which may already be resolved). A reinit should yield on that but then continue
		// with reinitialization.
		if (_initializationDeferred) {
			let promise = _initializationDeferred.promise;
			if (options.reinit) {
				yield promise;
			}
			else {
				return promise;
			}
		}
		
		_initializationDeferred = Zotero.Promise.defer();
		
		Zotero.debug("Initializing juris abbrevs");
		var start = new Date;
		
		_jurisAbbrevs = {};
		
		// main dir
		var dir = Zotero.getJurisAbbrevsDirectory().path;
		var num = yield this.readAbbrevsFromDirectory(dir);
		
		Zotero.debug("Cached " + num + " juris abbrevs in " + (new Date - start) + " ms");
		
		_initializationDeferred.resolve();
		_initialized = true;
	});
	
	this.reinit = function (options = {}) {
		return this.init(Object.assign({}, options, { reinit: true }));
	};
	
	/**
	 * Reads all abbrevs from a given directory and caches their metadata
	 * @private
	 */
	this.readAbbrevsFromDirectory = Zotero.Promise.coroutine(function* (dir) {
		var numCached = 0;
		
		var iterator = new OS.File.DirectoryIterator(dir);
		try {
			while (true) {
				let entries = yield iterator.nextBatch(10); // TODO: adjust as necessary
				if (!entries.length) break;
				
				for (let i = 0; i < entries.length; i++) {
					let entry = entries[i];
					let path = entry.path;
					let fileName = entry.name;
					if (!fileName || fileName[0] === "."
						|| fileName.substr(-5) !== ".json"
						|| (fileName.substr(0, 6) !== "juris-" && fileName !== this.versionFile)
						|| entry.isDir) continue;
					try {
						var id = fileName.slice(0, -5);
						var abbrevinfo = new Zotero.JurisAbbrev(id, path);
					}
					catch (e) {
						Components.utils.reportError(e);
						Zotero.debug(e, 1);
						continue;
					}
					if(abbrevinfo.jurisAbbrevID) {
						// same abbrev set is already cached
						if (_jurisAbbrevs[abbrevinfo.jurisAbbrevID]) {
							Components.utils.reportError('Juris abbrev with ID ' + abbrevinfo.jurisAbbrevID
								+ ' already loaded from ' + _jurisAbbrevs[abbrevinfo.jurisAbbrevID].fileName);
						} else {
							// add to cache
							_jurisAbbrevs[abbrevinfo.jurisAbbrevID] = abbrevinfo;
						}
					}
					numCached++;
				}
			}
		}
		finally {
			iterator.close();
		}
		return numCached;
	});
	
	/**
	 * Gets an abbrev set with a given ID
	 * @param {String} id
	 */
	this.get = function (id) {
		if (!_initialized) {
			throw new Zotero.Exception.UnloadedDataException("Juris abbrevs not yet loaded (1)", 'juris-abbrevs');
		}
		return _jurisAbbrevs[id] || false;
	};

};

/**
 * @class Represents a style module file
 * @property {String} id The id of the style module derived from its filename
 * @property {String} path The path to the style file
 */
Zotero.JurisAbbrev = function (id, path) {
	if (path) {
		this.path = path;
		this.fileName = OS.Path.basename(path);
	}
	this.jurisAbbrevID = id;
	this.title = id;
}

