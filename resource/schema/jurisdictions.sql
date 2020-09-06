-- 65

DROP TABLE IF EXISTS jurisVersion;
CREATE TABLE jurisVersion (
    schema TEXT PRIMARY KEY,
    version INT NOT NULL
);

DROP TABLE IF EXISTS courtNames;
DROP TABLE IF EXISTS countryCourtLinks;
DROP TABLE IF EXISTS courtJurisdictionLinks;

DROP TABLE IF EXISTS jurisdictions;
CREATE TABLE jurisdictions (
	jurisdictionIdx INTEGER PRIMARY KEY,
	jurisdictionID NOT NULL,
	jurisdictionName TEXT NOT NULL,
    segmentCount INTEGER NOT NULL,
	langIdx INTEGER,
	UNIQUE (jurisdictionID, langIdx)
);

DROP TABLE IF EXISTS courts;
CREATE TABLE courts (
	courtIdx INTEGER PRIMARY KEY,
	countryIdx INTEGER,
	courtID NOT NULL,
	courtName TEXT NOT NULL,
	langIdx INTEGER,
	UNIQUE (courtID, countryIdx, langIdx)
);

DROP TABLE IF EXISTS jurisdictionCourts;
CREATE TABLE jurisdictionCourts (
    jurisdictionCourtIdx INTEGER PRIMARY KEY,
	jurisdictionIdx INTEGER NOT NULL,
	courtIdx INTEGER NOT NULL,
	langIdx INTEGER,
	UNIQUE(jurisdictionIdx, courtIdx, langIdx)
    FOREIGN KEY (jurisdictionIdx) REFERENCES jurisdictions(jurisdictionIdx) ON DELETE CASCADE
);

DROP TABLE IF EXISTS uiLanguages;
CREATE TABLE uiLanguages (
	langIdx INTEGER PRIMARY KEY,
	lang TEXT NOT NULL,
	UNIQUE(lang)
);

DROP TABLE IF EXISTS countries;
CREATE TABLE countries (
	countryIdx INTEGER PRIMARY KEY,
	countryID TEXT,
	UNIQUE(countryID)
);
