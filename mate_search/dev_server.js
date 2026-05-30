const fs = require("fs");
const http = require("http");
const path = require("path");
const {URL} = require("url");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 4173;
const STARTING_STATES_JSON = path.join(ROOT, "mate_search", "mate_starting_states.json");
const STARTING_STATES_JS = path.join(ROOT, "mate_search", "mate_starting_states.js");

const CONTENT_TYPES = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif"
};

function send(response, status, body, contentType){
	response.writeHead(status, {"Content-Type": contentType || "text/plain; charset=utf-8"});
	response.end(body);
}

function isInsideRoot(filePath){
	const relative = path.relative(ROOT, filePath);
	return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function normalizeStartingStates(rawBody){
	const parsed = JSON.parse(rawBody);
	if(!Array.isArray(parsed)) throw new Error("Expected a JSON array.");
	return parsed.map((entry, index) => {
		if(!entry || typeof entry.game_state !== "string"){
			throw new Error("Entry " + index + " is missing game_state.");
		}
		const matePlies = Number(entry.mate_plies);
		if(!Number.isFinite(matePlies)){
			throw new Error("Entry " + index + " is missing numeric mate_plies.");
		}
		return {
			game_state: entry.game_state,
			mate_plies: matePlies
		};
	});
}

function writeStartingStates(rawBody, response){
	let body = "";
	rawBody.on("data", (chunk) => {
		body += chunk;
		if(body.length > 50 * 1024 * 1024){
			response.destroy();
		}
	});
	rawBody.on("end", () => {
		try {
			const records = normalizeStartingStates(body);
			const json = JSON.stringify(records, null, 4) + "\n";
			fs.writeFileSync(STARTING_STATES_JSON, json);
			fs.writeFileSync(STARTING_STATES_JS, "window.MATE_STARTING_STATES = " + json.trimEnd() + ";\n");
			send(response, 200, JSON.stringify({ok: true, count: records.length}) + "\n", "application/json; charset=utf-8");
		} catch (error) {
			send(response, 400, JSON.stringify({ok: false, error: error.message}) + "\n", "application/json; charset=utf-8");
		}
	});
}

function serveStatic(requestUrl, response){
	const url = new URL(requestUrl, "http://localhost");
	const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
	const filePath = path.resolve(ROOT, "." + cleanPath);
	if(!isInsideRoot(filePath)){
		send(response, 403, "Forbidden");
		return;
	}
	fs.readFile(filePath, (error, data) => {
		if(error){
			send(response, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "Server error");
			return;
		}
		send(response, 200, data, CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream");
	});
}

const server = http.createServer((request, response) => {
	if(request.method === "PUT" && request.url.split("?")[0] === "/mate_search/mate_starting_states.json"){
		writeStartingStates(request, response);
		return;
	}
	if(request.method !== "GET" && request.method !== "HEAD"){
		send(response, 405, "Method not allowed");
		return;
	}
	serveStatic(request.url, response);
});

server.listen(PORT, () => {
	console.log("Onitama mate search server: http://localhost:" + PORT + "/matesearch.html");
});
