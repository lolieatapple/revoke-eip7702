import {
  createWalletClient,
  createPublicClient,
  http,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const { HIJACKED_PRIVATE_KEY, SENDER_PRIVATE_KEY, RPC_URL } = process.env;

if (!HIJACKED_PRIVATE_KEY || !SENDER_PRIVATE_KEY || !RPC_URL) {
  console.error("Please configure HIJACKED_PRIVATE_KEY, SENDER_PRIVATE_KEY, RPC_URL in .env");
  process.exit(1);
}

const hijackedAccount = privateKeyToAccount(HIJACKED_PRIVATE_KEY as `0x${string}`);
const senderAccount = privateKeyToAccount(SENDER_PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

const senderWallet = createWalletClient({
  account: senderAccount,
  chain: sepolia,
  transport: http(RPC_URL),
});

async function main() {
  console.log("=== EIP-7702 Revoke Tool ===");
  console.log(`Hijacked address: ${hijackedAccount.address}`);
  console.log(`Gas payer address: ${senderAccount.address}`);

  // Check if the hijacked address has delegated code (7702 delegation leaves code on the EOA)
  const code = await publicClient.getCode({ address: hijackedAccount.address });
  console.log(`\nCurrent code on hijacked address: ${code}`);

  if (!code || code === "0x") {
    console.log("\nNo EIP-7702 delegation code found on this address. Nothing to revoke.");
    return;
  }

  // Check sender balance
  const senderBalance = await publicClient.getBalance({ address: senderAccount.address });
  console.log(`Gas payer balance: ${formatEther(senderBalance)} ETH`);

  if (senderBalance === 0n) {
    console.error("\nGas payer address has no ETH. Cannot send transaction.");
    process.exit(1);
  }

  // Sign authorization: set delegation target to 0x0 (revoke)
  console.log("\nSigning revoke authorization...");

  const authorization = await senderWallet.signAuthorization({
    account: hijackedAccount,
    contractAddress: "0x0000000000000000000000000000000000000000",
  });

  console.log("Authorization signed.");

  // Send the transaction from the gas payer with the authorizationList
  console.log("Sending revoke transaction...");

  const hash = await senderWallet.sendTransaction({
    authorizationList: [authorization],
    to: hijackedAccount.address,
    value: 0n,
  });

  console.log(`\nTransaction sent! Hash: ${hash}`);
  console.log(`Etherscan: https://sepolia.etherscan.io/tx/${hash}`);

  // Wait for confirmation
  console.log("\nWaiting for confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Transaction status: ${receipt.status === "success" ? "SUCCESS" : "FAILED"}`);

  if (receipt.status === "success") {
    // Verify the code has been removed
    const codeAfter = await publicClient.getCode({ address: hijackedAccount.address });
    console.log(`\nCode after revocation: ${codeAfter || "0x (cleared)"}`);
    console.log("\nEIP-7702 delegation revoked. Your address is now a normal EOA again.");
  }
}

main().catch((err) => {
  console.error("Execution failed:", err.message || err);
  process.exit(1);
});
