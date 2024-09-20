const dotenv = require("dotenv");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { auth, resolver, protocol } = require("@iden3/js-iden3-auth");
const getRawBody = require("raw-body");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const JSON_RPC_URL = process.env.JSON_RPC_URL;
const AMOY_STATE_RESOLVER = new resolver.EthStateResolver(
	// @ts-ignore
	JSON_RPC_URL,
	process.env.STATE_CONTRACT_ADDRESS,
);

const resolvers = {
	["polygon:amoy"]: AMOY_STATE_RESOLVER,
};

const app = express();
// @ts-ignore
app.use(express.json());
// Use the CORS middleware
// @ts-ignore
app.use(
	cors({
		origin: "*", // Allow all origins
		methods: "GET,POST", // Allow specific methods
		allowedHeaders: "*", // Allow All headers
	}),
);

const port = 8000;
// Create a map to store the auth requests and their session ids
// NOTE: This is not a good practice for production, it is better to use a database
const requestMap = new Map();
const responseMap = new Map();

// @ts-ignore
app.get("/api/signIn", async (req, res) => {
	console.log(
		"\x1b[34m%s\x1b[0m",
		"------------------ Sign In Request ------------------",
	);
	console.log("\x1b[33m%s\x1b[0m", "Sign in request received");
	getAuthRequest(req, res);
});

// @ts-ignore
app.get("/api/proveGraduate", async (req, res) => {
	console.log(
		"\x1b[34m%s\x1b[0m",
		"---------------- Graduation Query Request ----------------",
	);
	console.log("\x1b[33m%s\x1b[0m", "Graduation query request received");
	getQueryRequest(req, res);
});

// @ts-ignore
app.get("/api/status", async (req, res) => {
	console.log(
		"\x1b[34m%s\x1b[0m",
		"------------------ Status Request ------------------",
	);
	console.log("\x1b[33m%s\x1b[0m", "Status request received");
	const sessionId = req.query.sessionId;
	console.log("\x1b[32m%s\x1b[0m", "Session ID:", sessionId);

	if (!sessionId) {
		console.log("\x1b[31m%s\x1b[0m", "Session ID is missing");
		return res.status(400).send("Session ID is required");
	}

	const authResponse = responseMap.get(sessionId);
	if (!authResponse) {
		console.log("\x1b[31m%s\x1b[0m", "Invalid session ID");
		return res.status(400).send("Invalid session ID");
	}

	console.log(
		"\x1b[32m%s\x1b[0m",
		"Auth response found:",
		JSON.stringify(authResponse),
	);
	return res
		.status(200)
		.set("Content-Type", "application/json")
		.send(JSON.stringify(authResponse));
});

// @ts-ignore
app.post("/api/callback", async (req, res) => {
	console.log(
		"\x1b[34m%s\x1b[0m",
		"------------------ Callback Request ------------------",
	);
	console.log("\x1b[33m%s\x1b[0m", "Callback request received");
	Callback(req, res);
});

// @ts-ignore
const server = app.listen(port, () => {
	console.log(
		"\x1b[32m%s\x1b[0m",
		`Server started at http://localhost:${port}`,
	);
});

server.setTimeout(50000); // Set

async function getAuthRequest(req, res) {
	console.log(
		"\x1b[34m%s\x1b[0m",
		"--------- Generating Auth Request ---------",
	);

	// Public facing url of the server
	const hostUrl = process.env.HOST_URL;
	console.log("\x1b[32m%s\x1b[0m", "Host URL:", hostUrl);

	// random session ID
	const sessionId = uuidv4();
	console.log("\x1b[32m%s\x1b[0m", "Generated Session ID:", sessionId);

	const callbackUrl = `/api/callback`;
	const audience =
		"did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR";
	const uri = `${hostUrl}${callbackUrl}?sessionId=${sessionId}`;
	console.log("\x1b[32m%s\x1b[0m", "Callback URI:", uri);

	// Generate request for basic auth
	const request = auth.createAuthorizationRequest(
		"Basic Test Auth",
		audience,
		uri,
	);

	console.log(
		"\x1b[32m%s\x1b[0m",
		"Generated Auth Request:",
		JSON.stringify(request),
	);

	const proofRequest = {
		circuitId: "credentialAtomicQuerySigV2",
		id: 1725432751,
		query: {
			allowedIssuers: ["*"],
			context: "https://ilvcs.github.io/JsonHosting/poh-context.json",
			type: "pohcheck",
			credentialSubject: {
				human: {
					$eq: true,
				},
			},
		},
	};

	console.log(
		"\x1b[32m%s\x1b[0m",
		"Generated Proof Request:",
		JSON.stringify(proofRequest),
	);

	const scope = request.body.scope ?? [];
	request.body.scope = [...scope, proofRequest];

	// Store auth request in map associated with session ID
	requestMap.set(`${sessionId}`, request);
	console.log("\x1b[32m%s\x1b[0m", "Stored Auth Request in Map");

	try {
		return res
			.status(200)
			.set("Content-Type", "application/json")
			.send(JSON.stringify(request));
	} catch (error) {
		console.error("\x1b[31m%s\x1b[0m", "Error sending JSON response:", error);
		return res
			.status(500)
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ error: "Internal Server Error" }));
	}
}

// For setting the query for graduation status
async function getQueryRequest(req, res) {
	console.log(
		"\x1b[34m%s\x1b[0m",
		"--------- Generating Graduation Query Request ---------",
	);

	// Public facing url of the server
	const hostUrl = process.env.HOST_URL;
	console.log("\x1b[32m%s\x1b[0m", "Host URL:", hostUrl);

	// random session ID
	const sessionId = uuidv4();
	console.log("\x1b[32m%s\x1b[0m", "Generated Session ID:", sessionId);

	const callbackUrl = `/api/callback`;
	const audience =
		"did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR";
	const uri = `${hostUrl}${callbackUrl}?sessionId=${sessionId}`;
	console.log("\x1b[32m%s\x1b[0m", "Callback URI:", uri);

	// Generate request for basic auth
	const request = auth.createAuthorizationRequest("Query Auth", audience, uri);

	console.log(
		"\x1b[32m%s\x1b[0m",
		"Generated Query Request:",
		JSON.stringify(request),
	);

	const proofRequest = {
		circuitId: "credentialAtomicQuerySigV2",
		id: 1725436217,
		query: {
			allowedIssuers: ["*"],
			context: "https://ilvcs.github.io/JsonHosting/graduation-context.json",
			type: "graduationcertificate",
			credentialSubject: {
				isGraduated: {
					$eq: true,
				},
			},
		},
	};

	console.log(
		"\x1b[32m%s\x1b[0m",
		"Generated Proof Request:",
		JSON.stringify(proofRequest),
	);

	const scope = request.body.scope ?? [];
	request.body.scope = [...scope, proofRequest];

	// Store auth request in map associated with session ID
	requestMap.set(`${sessionId}`, request);
	console.log("\x1b[32m%s\x1b[0m", "Stored Query Request in Map");

	return res
		.status(200)
		.set("Content-Type", "application/json")
		.send(JSON.stringify(request));
}

async function Callback(req, res) {
	console.log(
		"\x1b[34m%s\x1b[0m",
		"------------------ Processing Callback ------------------",
	);

	const sessionId = req.query.sessionId;
	console.log("\x1b[32m%s\x1b[0m", "Session ID from Callback:", sessionId);

	if (!sessionId) {
		console.log("\x1b[31m%s\x1b[0m", "Session ID is missing");
		return res.status(400).send("Session ID is required");
	}

	// Get JWZ token params from the post request
	const rawBody = await getRawBody(req);
	const tokenString = rawBody.toString().trim();
	console.log("\x1b[32m%s\x1b[0m", "Received Token String:", tokenString);

	// Fetch auth request from session ID
	const authRequest = requestMap.get(sessionId);
	if (!authRequest) {
		console.log("\x1b[31m%s\x1b[0m", "Invalid session ID");
		return res.status(400).send("Invalid session ID");
	}

	console.log(
		"\x1b[32m%s\x1b[0m",
		"Auth Request found:",
		JSON.stringify(authRequest),
	);

	// Execute the auth request
	const verifier = await auth.Verifier.newVerifier({
		stateResolver: resolvers,
		circuitsDir: path.join(__dirname, "./keys"),
	});

	let authResponse;
	try {
		const opts = {
			acceptedStateTransitionDelay: 5 * 60 * 1000, // 5 minutes
		};
		authResponse = await verifier.fullVerify(tokenString, authRequest, opts);
		// @ts-ignore
		authResponse.body.message = tokenString;

		// Store the auth response in the map associated with the session ID
		responseMap.set(sessionId, authResponse);
		console.log(
			"\x1b[32m%s\x1b[0m",
			`Auth Response Stored: ${JSON.stringify(authResponse)}`,
		);
		return res
			.status(200)
			.set("Content-Type", "application/json")
			.send(JSON.stringify(authResponse));
	} catch (error) {
		console.error("\x1b[31m%s\x1b[0m", "Error verifying auth response:", error);
		return res.status(500).send(JSON.stringify(error));
	}
}
