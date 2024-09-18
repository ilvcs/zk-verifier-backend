const dotenv = require("dotenv");
const getWebWalletQueryHash = require("./utils");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { auth, resolver, protocol } = require("@iden3/js-iden3-auth");
const getRawBody = require("raw-body");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const JSON_RPC_URL = process.env.SEPOLIA_JSON_RPC_URL;
const LINEA_SEPOLIA_STATE_RESOLVER = new resolver.EthStateResolver(
	// @ts-ignore
	JSON_RPC_URL,
	process.env.SEPOLIA_STATE_CONTRACT_ADDRESS,
);

const AMOY_STATE_RESOLVER = new resolver.EthStateResolver(
	// @ts-ignore
	JSON_RPC_URL,
	process.env.STATE_CONTRACT_ADDRESS,
);

const PRIVADO_ID_STATE_RESOLVER = new resolver.EthStateResolver(
	// @ts-ignore
	process.env.PRIVADO_ID_JSON_RPC_URL,
	process.env.PRIVADO_ID_STATE_CONTRACT_ADDRESS,
);

const resolvers = {
	["sepolia:linea"]: LINEA_SEPOLIA_STATE_RESOLVER,
	["polygon:amoy"]: AMOY_STATE_RESOLVER,
	["privado:main"]: new resolver.EthStateResolver(
		"https://rpc-mainnet.privado.id",
		"0x975556428F077dB5877Ea2474D783D6C69233742",
	),
	["privado:test"]: new resolver.EthStateResolver(
		"https://rpc-testnet.privado.id/",
		"0x975556428F077dB5877Ea2474D783D6C69233742",
	),
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
// Create a mapp to store the auth reqeses and their session ids
// NOTE: This is not a good practice for production, it is better to use a database
const requestMap = new Map();
const responseMap = new Map();

// @ts-ignore
app.get("/api/signIn", async (req, res) => {
	console.log("Sign in request received");
	getAuthRequest(req, res);
});

// @ts-ignore
app.get("/api/status", async (req, res) => {
	console.log("Status request received");
	const sessionId = req.query.sessionId;
	if (!sessionId) {
		return res.status(400).send("Session ID is required");
	}
	const authResponse = responseMap.get(sessionId);
	if (!authResponse) {
		return res.status(400).send("Invalid session ID");
	}
	return res
		.status(200)
		.set("Content-Type", "application/json")
		.send(JSON.stringify(authResponse));
});

// @ts-ignore
app.post("/api/callback", async (req, res) => {
	console.log("Callback request received");
	Callback(req, res);
});

// @ts-ignore
const server = app.listen(port, () => {
	console.log(`Server started at http://localhost:${port}`);
});

server.setTimeout(50000); // Set

async function getAuthRequest(req, res) {
	// Public facing url of the server
	const hostUrl = process.env.HOST_URL;
	// random session ID
	const sessionId = uuidv4();
	const callbackUrl = `/api/callback`;
	const audience =
		"did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR";
	const uri = `${hostUrl}${callbackUrl}?sessionId=${sessionId}`;

	const request = auth.createAuthorizationRequest(
		"Basic Test Auth",
		audience,
		uri,
	);
	// Define the verification request

	const proofRequest = {
		circuitId: "credentialAtomicQuerySigV2",
		id: 1726561707,
		query: {
			allowedIssuers: ["*"],
			context: "ipfs://Qmd6UWP2MgdooDjjxEVJiWhYyNDf8fRmXVMRgW8hxp2ei1",
			type: "hackathonschema",
			credentialSubject: {
				isAttended: {
					$eq: true,
				},
			},
		},
	};
	const quryRequest = {
		backUrl: "https://my-app.org/back",
		finishUrl: "https://my-app.org/finish",
		logoUrl: "https://my-app.org/logo.png",
		name: "My app",
		zkQueries: [{ ...proofRequest }],
		callbackUrl: uri,
		verifierDid: audience,
	};
	//console.log("Request: ", proofRequest);

	const scope = request.body.scope ?? [];
	request.body.scope = [...scope, proofRequest];

	// Store auth request in map associated with session ID
	requestMap.set(`${sessionId}`, request);
	const queryHash = await getWebWalletQueryHash(quryRequest);
	//console.log("Query hash: ", queryHash);
	const queryUrl = `https://wallet-dev.privado.id/#${queryHash}`;

	try {
		return res
			.status(200)
			.set("Content-Type", "application/json")
			.send(JSON.stringify(queryUrl));
	} catch (error) {
		console.error("Error sending JSON response:", error);
		return res
			.status(500)
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ error: "Internal Server Error" }));
	}
}

async function Callback(req, res) {
	const sessionId = req.query.sessionId;

	if (!sessionId) {
		return res.status(400).send("Session ID is required");
	}

	// get JWZ token parms from the post request
	const rawBody = await getRawBody(req);
	const tokenString = rawBody.toString().trim();
	//console.log("Token string: ", tokenString);

	// Fethch auth request from session ID
	const authRequest = requestMap.get(sessionId);
	if (!authRequest) {
		return res.status(400).send("Invalid session ID");
	}

	console.log("resolvers", resolvers);
	console.log("Auth Request: ", authRequest);

	// exicute the auth request
	const verifier = await auth.Verifier.newVerifier({
		stateResolver: resolvers,
		circuitsDir: path.join(__dirname, "./keys"),
	});

	let authResponse;
	try {
		const opts = {
			acceptedStateTransitionDelay: 5 * 60 * 1000, // 5 minute
		};
		authResponse = await verifier.fullVerify(tokenString, authRequest, opts);
		// @ts-ignore
		authResponse.body.message = tokenString;
		// Store the auth response in the map associated with the session ID
		responseMap.set(sessionId, authResponse);
		console.log(`Auth Response: ${JSON.stringify(authResponse)}`);
		return res
			.status(200)
			.set("Content-Type", "application/json")
			.send(JSON.stringify(authResponse));
	} catch (error) {
		console.error("Error verifying auth response:", error);
		return res.status(500).send(JSON.stringify(error));
	}
}
