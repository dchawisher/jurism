Zotero.Jurism.SyncRecode = {

	"syncJsonRex": /mlzsync1:([0-9][0-9][0-9][0-9])(.*)/,

	"syncKeyValRex": /^([a-zA-Z][_a-zA-Z ]+(?:\-[a-zA-Z]+)*)(?:--([0-9]+))*(?:--([a-z][-_a-zA-Z0-9]+)|--([A-Z][-_a-zA-Z0-9]+))*:\s*(.*)/,

	"fieldInfoSort": function(a, b) {
		if (a.cslField > b.cslField) {
			return 1;
		} else if (a.cslField < b.cslField) {
			return -1;
		} else {
			if (a.creatorIdx > b.creatorIdx) {
				return 1;
			} else if (a.creatorIdx < b.creatorIdx) {
				return -1;
			} else {
				if (a.lang > b.lang) {
					return 1;
				} else if (a.lang < b.lang) {
					return -1;
				} else {
					return 0;
				}
			}
		}
	},

	"normalizeLangTag": function(tag) {
		if (!tag) {
			return false;
		}
		var lst = tag.split(/[-_]/);
		for (var i=0,ilen=lst.length; i<ilen; i++) {
			if (i === 0 || lst[i].length > 4) {
				lst[i] = lst[i].toLowerCase();
			} else if (lst[i].length < 4) {
				lst[i] = lst[i].toUpperCase();
			} else if (lst[i].length === 4) {
				lst[i] = lst[i].slice(0, 1).toUpperCase() + lst[i].slice(1).toLowerCase();
			}
		}
		return lst.join("-");
	},
	
	"decode": function (json) {
		if (!Zotero.Utilities._mapsInitialized) Zotero.Utilities.initMaps();
		if (!json) return;

		var newjson = JSON.parse(JSON.stringify(json));

		// Add multi properties
		newjson.multi = {
			main: {},
			_keys: {}
		}
		// Extract extradata
		var syncJsonMatch = null;
		if (newjson.extra) {
			syncJsonMatch = newjson.extra.match(this.syncJsonRex);
			syncKeyValMatch = newjson.extra.match(this.syncKeyValRex);
			if (syncJsonMatch) {
				var offset = parseInt(syncJsonMatch[1], 10);
				var extradata = JSON.parse(syncJsonMatch[2].slice(0, offset))
				newjson.extra = newjson.extra.slice((offset+13));
				
				if (extradata.xtype) {
					newjson.itemType = extradata.xtype;
				}
				if (extradata.extrafields) {
					for (var zFieldName in extradata.extrafields) {
						newjson[zFieldName] = extradata.extrafields[zFieldName];
					}
				}
				if (extradata.multifields) {
					for (zFieldName in extradata.multifields.main) {
						newjson.multi.main[zFieldName] = extradata.multifields.main[zFieldName];
					}
					for (zFieldName in extradata.multifields._keys) {
						newjson.multi._keys[zFieldName] = {};
						for (zLang in extradata.multifields._keys[zFieldName]) {
							newjson.multi._keys[zFieldName][zLang] = extradata.multifields._keys[zFieldName][zLang];
						}
					}
				}
				if (extradata.extracreators) {
					for (var pos in extradata.extracreators) {
						var extraCreator = extradata.extracreators[pos];
						if (extraCreator.name || extraCreator.lastName) {
							var creator = {
								creatorType: extraCreator.creatorType
							}
							if (extraCreator.name) {
								creator.name = extraCreator.name;
							} else if (extraCreator.fieldMode == "1") {
								creator.name = extraCreator.lastName;
							} else {
								if (extraCreator.lastName) {
									creator.lastName = extraCreator.lastName;
								}
								if (extraCreator.firstName) {
									creator.firstName = extraCreator.firstName;
								}
							}
							newjson.creators.push(extraCreator);
						}
					}
				}
				for (var pos in newjson.creators) {
					var creator = newjson.creators[pos];
					creator.multi = {
						main: false,
						_key: {}
					}
				}
				if (extradata.multicreators) {
					for (var pos in extradata.multicreators) {
						var creator = newjson.creators[pos];
						var multiObj = extradata.multicreators[pos];
						if (multiObj.main) {
							creator.multi.main = multiObj.main;
						}
						if (multiObj._key) {
							for (var langTag in multiObj._key) {
								var nameObj = multiObj._key[langTag];
								if (nameObj.name || nameObj.lastName) {
									creator.multi._key[langTag] = {};
									if (nameObj.name) {
										creator.multi._key[langTag].name = nameObj.name;
									} else if (creator.name) {
										creator.multi._key[langTag].name = nameObj.lastName;
									} else {
										if (nameObj.firstName) {
											creator.multi._key[langTag].firstName = nameObj.firstName;
										}
										if (nameObj.lastName) {
											creator.multi._key[langTag].lastName = nameObj.lastName;
										}
									}
								}
							}
						}
					}
				}
			} else if (syncKeyValMatch) {
				// Sync schema:
				// * Main language on Z headline field
				//   => title--FR:
				// * Extended headline field:
				//   => genre: Some Value
				// * Extended headline field with main language:
				//   => genre--DE: Some Value
				// * Field variant:
				//   => genre--es: Some Value
				//   => title--ja: Some Value
				// * Main language on Z creator:
				//   => author--0--FR:
				// * Extended creator:
				//   => translator--1: Smith||John
				// * Extended creator with headline language:
				//   => translator--1--FR: Jones||Bob
				// * Creator variant:
				//   => author--0--ja: Brown||Richard
				// * Type:
				//   => type: hearing
				var breakIdx = 0;
				var fieldInfo = [];
				var remnants = [];
				var lines = newjson.extra.split("\n");

				// Set remapped type before evaluating fields, dates, and creators
				for (var i=0,ilen=lines.length; i<ilen; i++) {
					var m = lines[i].match(this.syncKeyValRex);
					if (m) {
						breakIdx = (i+1);
						if (m[1] === "type" &&  Zotero.Schema.CSL_TYPE_MAPPINGS[m[5]]) {
							newjson.itemType = m[5];
						} else {
							fieldInfo.push({
								line: m[0],
								isCreator: typeof m[2] === "string",
								isVariant: typeof m[3] === "string",
								cslField: m[1],
								creatorIdx: typeof m[2] === "string" ? parseInt(m[2], 10) : -1,
								lang: this.normalizeLangTag(m[3] || m[4]),
								headlineLang: this.normalizeLangTag(m[4]),
								val: m[5]
							});
						}
					} else {
						break;
					}
				}
				
				fieldInfo.sort(this.fieldInfoSort);

				var itemType = newjson.itemType;

				newjson.multi = {
					main: {},
					_keys: {}
				}

				// Creators and fields adopt the same method to process variants:
				// * Track names of Z-side item fields in a CSL -> Z map.
				// * Use that map to process variants.

				// Process extended creators
				for (var i=fieldInfo.length-1; i>-1; i--) {
					var info = fieldInfo[i];

					if (!info.isCreator || info.isVariant) {
						continue;
					}
					var zField = Zotero.Utilities.DECODE.CREATORS[itemType] && Zotero.Utilities.DECODE.CREATORS[itemType][info.cslField];

					if (!zField) {
						continue;
					}
					if (info.creatorIdx !== newjson.creators.length) {
						continue;
					}
					if (info.val.indexOf("||") > -1) {
						var nameLst = info.val.split("||");
						if (nameLst.length > 2) {
							nameLst[1] = nameLst.slice(1).join("||");
						}
						newjson.creators.push({
							creatorType: zField,
							fieldMode: 0,
							lastName: nameLst[0],
							firstName: nameLst[1],
							multi: {
								main: info.headlineLang,
								_key: {}
							}
						});
					} else {
						newjson.creators.push({
							creatorType: zField,
							fieldMode: 1,
							name: info.val,
							multi: {
								main: info.headlineLang,
								_key: {}
							}
						});
					}
					fieldInfo = fieldInfo.slice(0, i).concat(fieldInfo.slice(i+1));
				}
				
				// Set multilingual field space on original creators
				// Memo each creator type, for use as a filter when processing variants
				var creatorTypes = {};
				for (var pos in newjson.creators) {
					var creator = newjson.creators[pos];
					if (!creator.multi) {
						creator.multi = {
							main: false,
							_key: {}
						}
					}
					var creatorType = Zotero.Utilities.REVERSE.CREATORS[itemType] ?  Zotero.Utilities.REVERSE.CREATORS[itemType][creator.creatorType] : false;
					if (creatorType) {
						creatorTypes[creatorType] = creator.creatorType;
					}
				}

				// Process creator variants
				
				for (var i=fieldInfo.length-1; i>-1; i--) {
					var info = fieldInfo[i];
					if (!info.isCreator) {
						continue;
					}
					var zField = creatorTypes[info.cslField];
					if (!zField) {
						continue;
					}
					var creator = newjson.creators[info.creatorIdx];
					if (!creator) {
						continue;
					}
					if (creator.creatorType !== zField) {
						continue;
					}
					if (info.isVariant) {
						if (info.val.indexOf("||") > -1) {
							var nameLst = info.val.split("||");
							if (nameLst.length > 2) {
								nameLst[1] = nameLst.slice(1).join("||");
							}
							creator.multi._key[info.lang] = {
								fieldMode: 0,
								lastName: nameLst[0],
								firstName: nameLst[1]
							};
						} else {
							creator.multi._key[info.lang] = {
								fieldMode: 1,
								name: info.val
							};
						}
					} else {
						if (info.val.trim()) {
							continue;
						}
						creator.multi.main = info.headlineLang;
					}
					fieldInfo = fieldInfo.slice(0, i).concat(fieldInfo.slice(i+1));
				}

				// Process fields and dates
				for (var i=fieldInfo.length-1; i>-1; i--) {
					var info = fieldInfo[i];
					if (info.isCreator || info.isVariant) {
						continue;
					}

					// OKAY! Here is our problem with the sync failure. After this op, zField is null (medium was not in the map?),
					// so we hit continue.
					var zField = Zotero.Utilities.DECODE.FIELDS[itemType] && Zotero.Utilities.DECODE.FIELDS[itemType][info.cslField];
					if (!zField) {
						zField = Zotero.Utilities.DECODE.DATES[itemType] && Zotero.Utilities.DECODE.DATES[itemType][info.cslField];
					}
					if (!zField) {
						continue;
					}
					// Assumes that dates can be written literally. May need to treat
					// dates differently, depending on the outcome of tests.
					newjson[zField] = info.val;

					// XXX See above
					fieldInfo = fieldInfo.slice(0, i).concat(fieldInfo.slice(i+1));
				}

				// Create a map of content-bearing fields on the item
				var itemFields = {};
				for (var zField in newjson) {
					var field = Zotero.Utilities.REVERSE.FIELDS[itemType] ? Zotero.Utilities.REVERSE.FIELDS[itemType][zField] : false;
					if (field && newjson[zField]) {
						if (Zotero.CachedMultiFields.isMultiFieldName(zField)) {
							itemFields[field] = zField;
						}
					}
				}

				// No map for date variants.
				
				// Process field variants
				for (var i=fieldInfo.length-1; i>-1; i--) {
					var info = fieldInfo[i];
					if (info.isCreator) {
						continue;
					}
					var zField = itemFields[info.cslField];
					if (!zField) {
						continue;
					}
					if (info.isVariant) {
						if (!newjson.multi._keys[zField]) {
							newjson.multi._keys[zField] = {};
						}
						newjson.multi._keys[zField][info.lang] = info.val;
						fieldInfo = fieldInfo.slice(0, i).concat(fieldInfo.slice(i+1));
					} else {
						if (info.val.trim() || !info.headlineLang) {
							continue;
						}
						newjson.multi.main[zField] = info.headlineLang.toLowerCase();
					}
					fieldInfo = fieldInfo.slice(0, i).concat(fieldInfo.slice(i+1));
				}
				
				// Date variants are not processed.
				
				// Restore any remnants and rewrite into extra.
				var newextra = [];
				
				// Sort remnants for stable field content
				fieldInfo = fieldInfo.map(function(obj){
					if (typeof obj.creatorIdx === "string") {
						obj.creatorIdx= parseInt(obj.creatorIdx, 10);
					} else {
						obj.creatorIdx = -1;
					}
					return obj;
				});
				fieldInfo.sort(this.fieldInfoSort);
				
				var remnants = fieldInfo.map(m => m.line).join("\n").trim();
				var txt = lines.slice(breakIdx).join("\n").trim();
				
				if (remnants) {
					newextra.push(remnants);
				}
				if (txt) {
					newextra.push(txt);
				}
				
				newjson.extra = newextra.join("\n");
			}
		}
		return newjson;
	},

	"encode": function (json) {
		if (!Zotero.Utilities._mapsInitialized) Zotero.Utilities.initMaps();
		if (!json.multi) {
			//throw "No multi segment on item JSON. What happened?";
			return json;
		}
		
		var extradata = {};
		
		var newjson = JSON.parse(JSON.stringify(json));
		
		// multifields
		if (Object.keys(newjson.multi.main).length > 0 || Object.keys(newjson.multi._keys).length > 0) {
			extradata.multifields = newjson.multi;
		}
		delete newjson.multi;

		// extrafields
		if (Zotero.Utilities.ENCODE.FIELDS[newjson.itemType]) {
			for (var fieldName in newjson) {
				if (Zotero.Utilities.ENCODE.FIELDS[newjson.itemType][fieldName]) {
					if (newjson[fieldName]) {
						if (!extradata.extrafields) {
							extradata.extrafields = {};
						}
						extradata.extrafields[fieldName] = newjson[fieldName];
					}
					delete newjson[fieldName];
				}
			}
		}

		if (Zotero.Utilities.ENCODE.DATES[newjson.itemType]) {
			for (var fieldName in newjson) {
				if (Zotero.Utilities.ENCODE.DATES[newjson.itemType][fieldName]) {
					if (newjson[fieldName]) {
						if (!extradata.extrafields) {
							extradata.extrafields = {};
						}
						extradata.extrafields[fieldName] = newjson[fieldName];
					}
					delete newjson[fieldName];
				}
			}
		}
		
		if (newjson.creators) {
			// extracreators [1]
			// Move extended creators to the end of the line
			if (Zotero.Utilities.ENCODE.CREATORS[newjson.itemType]) {
				var extendedcreators = [];
				for (var i=newjson.creators.length-1;i > -1; i--) {
					var creator = newjson.creators[i];
					if (Zotero.Utilities.ENCODE.CREATORS[newjson.itemType][creator.creatorType]) {
						extendedcreators.push(creator);
						newjson.creators = newjson.creators.slice(0, i).concat(newjson.creators.slice(i+1))
					}
				}
				newjson.creators = newjson.creators.concat(extendedcreators);
			}
			
			// multicreators
			for (var pos in newjson.creators) {
				var creator = newjson.creators[pos];
				if (creator.multi) {
					if (creator.multi.main || Object.keys(creator.multi._key).length > 0) {
						if (!extradata.multicreators) {
							extradata.multicreators = {};
						}
						extradata.multicreators[pos] = creator.multi;
					}
					delete creator.multi;
				}
			}
			
			// extracreators [2]
			// Move extended creators to extradata property
			if (Zotero.Utilities.ENCODE.CREATORS[newjson.itemType]) {
				if (extendedcreators.length) {
					extradata.extracreators = extendedcreators;
					var creatorsLength = (newjson.creators.length - extendedcreators.length);
					newjson.creators = newjson.creators.slice(0, creatorsLength)
				}
			}
		}

		// xtype
		if (Zotero.Jurism.EXTENDED.TYPES[newjson.itemType]) {
			extradata.xtype = newjson.itemType;
			newjson.itemType = Zotero.Jurism.EXTENDED.TYPES[newjson.itemType].zotero;
		}

		// Bundle it
		if (Object.keys(extradata).length > 0) {
			extradata = JSON.stringify(extradata);
			var extradataLength = ("" + extradata.length);
			while (extradataLength.length < 4) {
				extradataLength = "0" + extradataLength;
			}
			// Check if content exists on extra
			if (newjson.extra) {
				// Remove any preexisting sync object in extra (should never happen, but hey)
				var m = newjson.extra.match(/^mlzsync[1-9]:([0-9][0-9][0-9][0-9])/);
				if (m) {
					var totalOffset = parseInt(m[1]) + 13;
					newjson.extra = newjson.extra.slice(totalOffset);
				}
			} else {
				newjson.extra = "";
			}
			// Prepend sync object to extra
			newjson.extra = 'mlzsync1:' + extradataLength + extradata + newjson.extra;
			// Done!
		}
		return newjson;
	}
}

if (typeof process === 'object' && process + '' === '[object process]'){
    module.exports = Zotero.Jurism.SyncRecode;
}
