require("dotenv").config();
const express = require("express");
const { auth, resolver, protocol } = require("@iden3/js-iden3-auth");
const getRawBody = require("raw-body");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const JSON_RPC_URL = process.env.JSON_RPC_URL;

const keyDIR = "../keys";
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
const port = 8000;
// Create a mapp to store the auth reqeses and their session ids
// NOTE: This is not a good practice for production, it is better to use a database
const requestMap = new Map();

// @ts-ignore
app.get("/api/signIn", async (req, res) => {
	console.log("Sign in request received");
	getAuthRequest(req, res);
});

// @ts-ignore
app.post("/api/callback", async (req, res) => {
	console.log("Callback request received");
	Callback(req, res);
});

// @ts-ignore
app.listen(port, () => {
	console.log(`Server started at http://localhost:${port}`);
});

async function getAuthRequest(req, res) {
	const hostUrl = "https://4346-106-208-28-36.ngrok-free.app";
	// random session ID
	const sessionId = uuidv4();
	const callbackUrl = `/api/callback`;
	const audience =
		"did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR";
	const uri = `${hostUrl}${callbackUrl}?sessionId=${sessionId}`;

	// Genarate request for basic auth
	const request = auth.createAuthorizationRequest(
		"Basic Test Auth",
		audience,
		uri,
	);

	request.id = "7f38a193-0918-4a48-9fac-36adfdb8b542";
	request.thid = "7f38a193-0918-4a48-9fac-36adfdb8b542";

	// Add request for a specific proof
	const proofRequest = {
		id: 1,
		circuitId: "credentialAtomicQuerySigV2",
		query: {
			allowedIssuers: ["*"],
			type: "KYCAgeCredential",
			context:
				"https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
			credentialSubject: {
				birthday: {
					$lt: 20000101,
				},
			},
		},
	};
	const scope = request.body.scope ?? [];
	request.body.scope = [...scope, proofRequest];

	// Store auth request in map associated with session ID
	requestMap.set(`${sessionId}`, request);

	return res.status(200).set("Content-Type", "application/json").send(request);
}

async function Callback(req, res) {
	const sessionId = req.query.sessionId;

	if (!sessionId) {
		return res.status(400).send("Session ID is required");
	}

	// get JWZ token parms from the post request
	const rawBody = await getRawBody(req);
	const tokenString = rawBody.toString().trim();
	console.log("Token string: ", tokenString);

	// Fethch auth request from session ID
	const authRequest = requestMap.get(sessionId);
	if (!authRequest) {
		return res.status(400).send("Invalid session ID");
	}

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
		console.log(`Auth Response: ${JSON.stringify(authResponse)}`);
	} catch (error) {
		return res.status(500).send(error);
	}
	return res
		.status(200)
		.set("Content-Type", "application/json")
		.send(authResponse);
}
