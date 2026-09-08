const fs = require("fs");
const path = require("path");
const MateRecords = require('./record_schema');

const DEFAULT_TOTAL_CONFIGS = 6041280;
const DEFAULT_MAX_DEPTH = 11;

function parsePayloadText(text, sourceName){
	const parsed = JSON.parse(text);
	const records = Array.isArray(parsed) ? parsed : parsed.starting_states;
	if(!Array.isArray(records)){
		throw new Error((sourceName || "Payload") + " must be a JSON array or contain a starting_states array.");
	}
	const metadata = Array.isArray(parsed) ? {} : {
		schema_version: Number(parsed.schema_version) || 2,
		exported_at: typeof parsed.exported_at === "string" ? parsed.exported_at : "",
		search: parsed.search && typeof parsed.search === "object" ? parsed.search : {},
		audit: parsed.audit || null
	};
	return {
		metadata,
		records: records.map((entry, index) => normalizeRecord(entry, index, sourceName))
	};
}

function normalizeRecord(entry, index, sourceName){
	if(!entry || typeof entry.game_state !== "string"){
		throw new Error((sourceName || "Payload") + " entry " + index + " is missing game_state.");
	}
	const matePlies = Number(entry.mate_plies);
	if(!Number.isFinite(matePlies)){
		throw new Error((sourceName || "Payload") + " entry " + index + " is missing numeric mate_plies.");
	}
	return MateRecords.normalize(entry);
}

function mergePayloads(payloads, options = {}){
	const records = [];
	const byState = new Map();
	let bestSearch = {};
	let bestNextIndex = -1;
	let audit = null;

	for(const payload of payloads){
		const normalizedPayload = normalizePayloadInput(payload);
		audit = audit || normalizedPayload.metadata.audit || null;
		for(const record of normalizedPayload.records){
			addRecord(records, byState, record);
		}
		const search = normalizedPayload.metadata.search || {};
		const nextIndex = getNextIndex(search);
		if(nextIndex > bestNextIndex){
			bestNextIndex = nextIndex;
			bestSearch = {...search, next_index: nextIndex};
		}
	}

	const exportedAt = options.exportedAt || new Date().toISOString();
	return {
		metadata: {
			schema_version: 3,
			audit,
			exported_at: exportedAt,
			search: {
				...bestSearch,
				next_index: Math.max(0, bestNextIndex),
				max_depth: Number(bestSearch.max_depth) || options.maxDepth || DEFAULT_MAX_DEPTH,
				total_configs: Number(bestSearch.total_configs) || options.totalConfigs || DEFAULT_TOTAL_CONFIGS
			}
		},
		records
	};
}

function normalizePayloadInput(payload){
	if(Array.isArray(payload)){
		return {metadata: {}, records: payload.map((entry, index) => normalizeRecord(entry, index))};
	}
	if(payload && Array.isArray(payload.records)){
		return {
			metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
			records: payload.records
		};
	}
	if(payload && Array.isArray(payload.starting_states)){
		return {
			metadata: {
				schema_version: Number(payload.schema_version) || 2,
				exported_at: typeof payload.exported_at === "string" ? payload.exported_at : "",
				search: payload.search && typeof payload.search === "object" ? payload.search : {},
				audit: payload.audit || null
			},
			records: payload.starting_states.map((entry, index) => normalizeRecord(entry, index))
		};
	}
	throw new Error("Unsupported starting-state payload.");
}

function addRecord(records, byState, record){
	if(!record || typeof record.game_state !== "string" || !Number.isFinite(Number(record.mate_plies))) return;
	const normalized = MateRecords.normalize(record);
	const existingIndex = byState.get(normalized.game_state);
	if(existingIndex === undefined){
		byState.set(normalized.game_state, records.length);
		records.push(normalized);
		return;
	}
	records[existingIndex] = MateRecords.prefer(records[existingIndex], normalized);
}

function getNextIndex(search){
	const value = search && (search.next_index ?? search.nextIndex);
	const number = Math.floor(Number(value) || 0);
	return Math.max(0, number);
}

function buildJsonPayload(records, metadata){
	return {
		schema_version: metadata.schema_version || 2,
		exported_at: metadata.exported_at || new Date().toISOString(),
		search: metadata.search || {},
		audit: metadata.audit || null,
		starting_states: records
	};
}

function buildJsonText(records, metadata){
	const {starting_states, ...header} = buildJsonPayload(records, metadata);
	return JSON.stringify(header).slice(0,-1) + ',"starting_states":[\n'
		+ records.map(record=>JSON.stringify(record)).join(',\n') + '\n]}\n';
}

function buildJsText(records, metadata){
	return "window.MATE_STARTING_STATES = [\n" + records.map(record=>JSON.stringify(record)).join(',\n') + "\n];\n"
		+ "window.MATE_STARTING_STATES_META = " + JSON.stringify({
			schema_version: metadata.schema_version || 2,
			exported_at: metadata.exported_at || new Date().toISOString(),
			search: metadata.search || {},
			audit: metadata.audit || null
		}, null, 4) + ";\n";
}

function readPayloadFile(filePath){
	return parsePayloadText(fs.readFileSync(filePath, "utf8"), filePath);
}

function writeMergedFiles(records, metadata, jsonPath, jsPath){
	fs.writeFileSync(jsonPath, buildJsonText(records, metadata));
	fs.writeFileSync(jsPath, buildJsText(records, metadata));
}

function runCli(){
	const args = process.argv.slice(2);
	if(args.length < 3){
		console.error("Usage: node mate_search/merge_starting_states.js <output-json> <output-js> <input-json> [input-json...]");
		process.exit(1);
	}
	const [outputJson, outputJs, ...inputs] = args;
	const payloads = inputs.map(readPayloadFile);
	const merged = mergePayloads(payloads);
	writeMergedFiles(merged.records, merged.metadata, outputJson, outputJs);
	console.log("Merged " + merged.records.length + " unique states into " + path.basename(outputJson) + ".");
	console.log("Resume index: " + merged.metadata.search.next_index + ".");
}

if(require.main === module){
	runCli();
}

module.exports = {
	parsePayloadText,
	mergePayloads,
	buildJsonPayload,
	buildJsonText,
	buildJsText,
	readPayloadFile,
	writeMergedFiles
};
