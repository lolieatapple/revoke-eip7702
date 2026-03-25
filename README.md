# EIP-7702 Revoke Tool

Revoke a malicious [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) delegation on your EOA.

## The Problem

If a hacker sets up an EIP-7702 delegation on your address, they can attach contract code to your EOA that automatically drains any ETH you receive. You can't simply send ETH to pay for gas to revoke it — the malicious code will steal it first.

## The Solution

EIP-7702 revocation is a **protocol-level** operation. It does NOT depend on the malicious contract having a "revoke" function. You simply sign a new authorization pointing to the zero address (`0x0`), which tells the Ethereum protocol to remove the delegation.

The key trick: **the authorization is signed by the hijacked address, but the transaction can be sent (and gas paid) by a completely different address.** This means you never need to send ETH to the compromised address.

## How It Works

1. The hijacked address's private key signs an authorization setting the delegation target to `0x0000000000000000000000000000000000000000`
2. A separate gas payer address sends the EIP-7702 transaction with this authorization
3. The Ethereum protocol clears the delegation code from the hijacked EOA
4. Your address is restored to a normal EOA

## Prerequisites

- [Bun](https://bun.sh) runtime
- The private key of the hijacked address
- A separate address with Sepolia ETH (for gas)

## Usage

```bash
# Install dependencies
bun install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your private keys and RPC URL

# Run the revoke script
bun revoke-7702.ts
```

## Environment Variables

| Variable | Description |
|---|---|
| `HIJACKED_PRIVATE_KEY` | Private key of the hijacked EOA (signs the revoke authorization) |
| `SENDER_PRIVATE_KEY` | Private key of the gas payer (must have Sepolia ETH) |
| `RPC_URL` | Sepolia RPC endpoint |

## Network

Currently configured for **Sepolia testnet**. To use on other networks, modify the chain import in `revoke-7702.ts`.

## License

MIT
