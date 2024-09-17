module.exports = async function getWebWalletQueryHash(verificationRequest) {
	// Define the verification request
	// Define the verification request

	const base64EncodedVerificationRequest = Buffer.from(
		JSON.stringify(verificationRequest),
	).toString("base64");

	return base64EncodedVerificationRequest;
};
