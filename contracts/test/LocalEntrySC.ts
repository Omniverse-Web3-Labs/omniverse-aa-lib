import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import hre from "hardhat";
  import ecdsa from 'secp256k1';

  const SIG_PREFIX = "Register to AATransformer:";
  const TX_ID = "0x1234567812345678123456781234567812345678123456781234567812345678";
  const TX_DATA = "0x12345678";
  const SIGNATURE = "0x1234567812345678123456781234567812345678123456781234567812345678";
  
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
        let publicKeys = [];
        for (let i = 0; i < 2; i++) {
          let message = Buffer.from(SIG_PREFIX + signers[0].address.toString().toLowerCase());
            const sig = signers[i].signMessage(message);
            signatures.push(sig);
            publicKeys.push(wallets[i].publicKey);
        }
        await localEntry.register(publicKeys, signatures);
      
      return { localEntry };
    }

    function getWallets() {
        let accounts = hre.config.networks.hardhat.accounts;
        let wallets = [];
        for (let index = 0; index < 10; index++) {
            const wallet = hre.ethers.HDNodeWallet.fromPhrase(accounts.mnemonic, accounts.password, `${accounts.path}/${index}`);
            var pubKey = ecdsa.publicKeyCreate(Buffer.from(wallet.privateKey.substring(2), 'hex'), false);
            wallets.push({
              privateKey: wallet.privateKey,
              publicKey: '0x' + Buffer.from(pubKey).toString('hex').substring(2),
            });
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
            let message = Buffer.concat([Buffer.from(SIG_PREFIX), Buffer.from(localEntry.target.toString(), "hex")]);
            const sig = signers[0].signMessage(message);
            signatures.push(sig);
          }
          await expect(localEntry.register([wallets[0].publicKey, wallets[1].publicKey], signatures)).to.be.revertedWithCustomError(
            localEntry,
            "FailedToVerifySignature"
          );
        });

        it("Should pass with signatures verification passed", async function () {
          const { localEntry } = await loadFixture(deployLocalEntrySC);
        
          const wallets = getWallets();
          const signers = await hre.ethers.getSigners();
          let signatures = [];
          let publicKeys = [];
          // mismatched signatures
          for (let i = 0; i < 2; i++) {
            let message = Buffer.from(SIG_PREFIX + signers[0].address.toString().toLowerCase());
            const sig = await signers[i].signMessage(message);
            signatures.push(sig);
            publicKeys.push(wallets[i].publicKey);
          }
          await localEntry.register(publicKeys, signatures);
          let pks = await localEntry.getPubkeys(signers[0].address.toString());
          expect(pks.length).to.equal(2);
          expect(pks[0]).to.equal(wallets[0].publicKey);
          expect(pks[1]).to.equal(wallets[1].publicKey);
        });

        it("Should fail with any public key registered before", async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySCWithPublicKeys);
        
            const wallets = getWallets();
            const signers = await hre.ethers.getSigners();
            let signatures = [];
            let publicKeys = [];
            // mismatched signatures
            for (let i = 0; i < 2; i++) {
              let message = Buffer.from(SIG_PREFIX + signers[0].address.toString().toLowerCase());
              const sig = await signers[i].signMessage(message);
              signatures.push(sig);
              publicKeys.push(wallets[i].publicKey);
            }
            await expect(localEntry.register(publicKeys, signatures)).to.be.revertedWithCustomError(
              localEntry,
              "PublicKeyAlreadyRegistered"
            );
        });
    });
  
    describe("Submit transactions", function () {
        it("Should fail with sender not registered", async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySCWithPublicKeys);
        
            let signers = await hre.ethers.getSigners();
            let pks = await localEntry.connect(signers[2]).getPubkeysLenght();
            await expect(localEntry.connect(signers[2]).submitTx({txid: TX_ID, txType: 0, txData: TX_DATA, signature: SIGNATURE})).to.be.revertedWithCustomError(
              localEntry,
              "SenderNotRegistered"
            );
        });

        it("Should fail with signature empty", async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySCWithPublicKeys);
        
            await expect(localEntry.submitTx({txid: TX_ID, txType: 0, txData: TX_DATA, signature: "0x"})).to.be.revertedWithCustomError(
                localEntry,
                "SignatureEmpty"
              );
        });

        it("Should pass with sender registered", async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySCWithPublicKeys);
        
            const NEW_TX_ID = "0x1234567812345678123456781234567812345678123456781234567812345679";
            await localEntry.submitTx({txid: NEW_TX_ID, txType: 0, txData: TX_DATA, signature: SIGNATURE});
            let signedTx = await localEntry.getTransaction(NEW_TX_ID);
            expect(signedTx.address).not.to.equal('0x');
            signedTx = await localEntry.getTransactionByIndex(0);
            expect(signedTx.address).not.to.equal('0x');
        });

        it("Should fail with transaction with the same txid exists", async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySCWithPublicKeys);
        
            await localEntry.submitTx({txid: TX_ID, txType: 0, txData: TX_DATA, signature: SIGNATURE});
            await expect(localEntry.submitTx({txid: TX_ID, txType: 0, txData: TX_DATA, signature: SIGNATURE})).to.be.revertedWithCustomError(
                localEntry,
                "TransactionExists"
              );
        });
    });
  });
  