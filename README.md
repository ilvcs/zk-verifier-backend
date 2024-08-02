# Verifer-Js

Welcome to ZK-Verifier-Backend. This project is a JavaScript library for ZK proof verification and validation of Privado ID verifiable credentials(VCs).

## Installation

Clone the repository from GitHub:

```bash
git clone https://github.com/ilvcs/zk-verifier-backend.git
```

Copy sample.env file to .env file and update the values

```bash
cp sample.env .env
```

Run ngrok for public facing URL

```bash
ngrok http 8000
```

Update `.env` values

```bash
EXTERNAL_URL= <PUBLIC_FACING_URL LIKE NGROK>
JSON_RPC_URL= <YOUR_JSON_RPC_URL>
STATE_CONTRACT_ADDRESS = <STATE_CONTRACT_ADDRESS use 0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124 for Polygon Amoy Testnet>
```

Install the dependencies:

```bash
npm install
```

Start the server

```bash
node index.js
```

## Documentation

For detailed documentation, please refer to the [Verifer-Js Documentation](https://docs.privado.id/docs/verifier/verification-library/verifier-setup).

## Contributing

Contributions are welcome! If you have any ideas, bug reports, or feature requests, please open an issue or submit a pull request on the [Verifer-Js GitHub repository](https://github.com/ilvcs/zk-verifier-backend.git).
