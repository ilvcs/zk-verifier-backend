async function getWebWalletQueryHash() {
	// Define the verification request
	// Define the verification request
	const verificationRequest = {
		backUrl: "https://google.com",
		finishUrl: "https:facebook.com",
		logoUrl: "https://my-app.org/logo.png",
		name: "Login With PrivadoID Demo",
		zkQueries: [
			{
				id: "7f38a193-0918-4a48-9fac-36adfdb8b542",
				thid: "7f38a193-0918-4a48-9fac-36adfdb8b542",
				from: "did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR",
				typ: "application/iden3comm-plain-json",
				type: "https://iden3-communication.io/authorization/1.0/request",
				body: {
					reason: "Basic Test Auth",
					message: "",
					callbackUrl:
						"https://7f27-27-6-156-121.ngrok-free.app/api/callback?sessionId=5b38c4a1-d69f-422f-838c-3eeb99c8d108",
					scope: [
						{
							circuitId: "credentialAtomicQuerySigV2",
							id: 1,
							query: {
								allowedIssuers: ["*"],
								context:
									"https://raw.githubusercontent.com/anima-protocol/claims-polygonid/main/schemas/json-ld/pol-v1.json-ld",
								type: "AnimaProofOfLife",
								credentialSubject: { human: { $eq: true } },
							},
						},
					],
				},
			},
		],
		callbackUrl: "https://7f27-27-6-156-121.ngrok-free.app/api/callback",
		verifierDid:
			"did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR",
	};

	const base64EncodedVerificationRequest = btoa(
		JSON.stringify(verificationRequest),
	);
	console.log(`https://wallet.privado.id/#${base64EncodedVerificationRequest}`);
}

getWebWalletQueryHash();
