import hre, { ethers } from "hardhat";

export async function waitForTransactionReceipt(txHash: string, confirmationsRequired: number = 1) {
    const provider = ethers.getDefaultProvider();
    let receipt = await provider.getTransactionReceipt(txHash);

    while (!receipt || (await receipt.confirmations()) < confirmationsRequired) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 seconds
        receipt = await provider.getTransactionReceipt(txHash);
    }

    return receipt;
}

export async function waitForConfirmations(currentBlockNumber: number, confirmationsRequired: number = 1) {
    let blockNumber = await ethers.provider.getBlockNumber();

    while (blockNumber < currentBlockNumber + confirmationsRequired) {
    // Wait before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
      try {
        blockNumber = await ethers.provider.getBlockNumber();
      } catch (e) {
        console.log("error", e);
      }
    }
  }