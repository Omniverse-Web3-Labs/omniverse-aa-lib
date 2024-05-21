import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import hre from "hardhat";

  const SIG_PREFIX = "Register to AATransformer:";
  const AA_TRANSFORMER_ADDRESS = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955";
  const TX_ID = "0x1234567812345678123456781234567812345678123456781234567812345678";
  const TX_DATA = "0x12345678";
  
  describe("LocalEntrySC", function () {
    async function deployLocalEntrySC() {
      const LocalEntrySC = await hre.ethers.getContractFactory("LocalEntrySC");
      const localEntry = await LocalEntrySC.deploy();
      
      return { localEntry };
    }

    async function deployLocalEntrySCWithPublicKeys() {
      const {localEntry} = await deployLocalEntrySC();
      
      const wallets = getWallets();
        const signers = await hre.ethers.getSigners();
        let signatures = [];
        for (let i = 0; i < 2; i++) {
            const sig = signers[0].signMessage(SIG_PREFIX + localEntry.target);
            signatures.push(sig);
        }
        await localEntry.register([wallets[0].publicKey, wallets[1].publicKey], signatures);
      
      return { localEntry };
    }

    function getWallets() {
        let accounts = hre.config.networks.hardhat.accounts;
        let wallets = [];
        for (let index = 0; index < 10; index++) {
            const wallet = hre.ethers.HDNodeWallet.fromPhrase(accounts.mnemonic, accounts.password, `${accounts.path}/${index}`);
            wallets.push(wallet);
        }
        return wallets;
    }
  
    describe("Register pubkeys", function () {
        it("Should fail with lenght of pubkeys and signatures not equal", async function () {
          const { localEntry } = await loadFixture(deployLocalEntrySC);
        
          const wallets = getWallets();
          await expect(localEntry.register([wallets[0].publicKey, wallets[1].publicKey], [])).to.be.revertedWithCustomError(
            localEntry,
            "LengthOfPublickeysAndSignaturesNotEqual"
          );
        });

        it("Should fail with it failed to verify signatures", async function () {
          const { localEntry } = await loadFixture(deployLocalEntrySC);
        
          const wallets = getWallets();
          const signers = await hre.ethers.getSigners();
          let signatures = [];
          // mismatched signatures
          for (let i = 1; i < 3; i++) {
            const sig = signers[0].signMessage(SIG_PREFIX + localEntry.target);
            signatures.push(sig);
          }
          await expect(localEntry.register([wallets[0].publicKey, wallets[1].publicKey], signatures)).to.be.revertedWithCustomError(
            localEntry,
            "FailedToVerifySignatures"
          );
        });

        it("Should pass with signatures verification passed", async function () {
          const { localEntry } = await loadFixture(deployLocalEntrySC);
        
          const wallets = getWallets();
          const signers = await hre.ethers.getSigners();
          let signatures = [];
          // mismatched signatures
          for (let i = 0; i < 2; i++) {
            const sig = signers[0].signMessage(SIG_PREFIX + localEntry.target);
            signatures.push(sig);
          }
          await localEntry.register([wallets[0].publicKey, wallets[1].publicKey], signatures);
          let pks = await localEntry.getPubkeys(AA_TRANSFORMER_ADDRESS);
          expect(pks.length).to.equal(2);
          expect(pks[0]).to.equal(wallets[0].publicKey);
          expect(pks[1]).to.equal(wallets[1].publicKey);
        });

        it("Should fail with any public key registered before", async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySCWithPublicKeys);
        
            const wallets = getWallets();
            const signers = await hre.ethers.getSigners();
            let signatures = [];
            // mismatched signatures
            for (let i = 0; i < 2; i++) {
              const sig = signers[0].signMessage(SIG_PREFIX + AA_TRANSFORMER_ADDRESS);
              signatures.push(sig);
            }
            await expect(localEntry.register([wallets[0].publicKey, wallets[1].publicKey], signatures)).to.be.revertedWithCustomError(
              localEntry,
              "PublicKeyAlreadyRegistered"
            );
        });
    });
  
    describe("Submit transactions", function () {
        it("Should fail with sender not registered", async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySCWithPublicKeys);
        
            let signers = await hre.ethers.getSigners();
            await expect(localEntry.connect(signers[1]).submitTx(TX_ID, TX_DATA)).to.be.revertedWithCustomError(
              localEntry,
              "SenderNotRegisterd"
            );
        });

        it("Should pass with sender registered", async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySCWithPublicKeys);
        
            await localEntry.submitTx(TX_ID, TX_DATA);
            let signedTx = await localEntry.getTx(TX_ID);
            expect(signedTx.address).not.to.equal('0x');
            signedTx = await localEntry.getTxByIndex(0);
            expect(signedTx.address).not.to.equal('0x');
        });
    });
  });
  