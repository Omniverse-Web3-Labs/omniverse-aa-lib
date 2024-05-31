import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import hre from "hardhat";
  import ecdsa from 'secp256k1';

  interface Input {
    txid: string,
    index: string,
    amount: string,
    omniAddress: string,
  }

  interface Output {
    omniAddress: string,
    amount: string,
  }

  interface Deploy {
    metadata: {
      salt: string,
      name: string,
      deployer: string,
      totalSupply: string,
      limit: string,
      price: string
    },
    signature: string,
    feeInputs: Array<Input>,
    feeOutputs: Array<Output>
  }

  interface Mint {
    assetId: string,
    signature: string,
    outputs: Array<Output>
    feeInputs: Array<Input>,
    feeOutputs: Array<Output>
  }

  interface Transfer {
    assetId: string,
    signature: string,
    inputs: Array<Input>,
    outputs: Array<Output>
    feeInputs: Array<Input>,
    feeOutputs: Array<Output>
  }

  const SIG_PREFIX = "Register to Omniverse AA:";

  // common params
  const TX_ID = "0x1234567812345678123456781234567812345678123456781234567812345678";
  const TX_DATA = "0x12345678";
  const SIGNATURE = "0x1234567812345678123456781234567812345678123456781234567812345678";
  const GAS_PER_UTXO = 1000;

  const TOKEN_ASSET_ID = "0x0000000000000000000000000000000000000000000000000000000000000001";

  // gas config
  const GAS_ASSET_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const GAS_RECEIVER = "0x1234567812345678123456781234567812345678123456781234567812345678";
  const GAS_FEE = "10";

  // sys config
  const UTXO_NUM = 10;
  const DECIMALS = 18;
  const STATE_KEEPER = "0x0000000000000000000000000000000000000000";
  const LOCAL_ENTRY = "0x0000000000000000000000000000000000000000";

  // default metadata
  const METADATA_SALT = "0x0000000000000001";
  const METADATA_NAME = "test",
  const METADATA_TOTAL_SUPPLY = 1000;
  const METADATA_LIMIT = 100;
  const METADATA_PRICE = 10;

  const DEPLOY_TYPE = ["tuple(tuple(bytes8, string, bytes32, uint128, uint128, uint128), bytes, tuple(bytes32, uint64, uint128, bytes32)[], tuple(bytes32, uint128)[])"];
  const MINT_TYPE = ["tuple(bytes32, bytes, tuple(bytes32, uint128)[], tuple(bytes32, uint64, uint128, bytes32)[], tuple(bytes32, uint128)[])"];
  const TRANSFER_TYPE = ["tuple(bytes32, bytes, tuple(bytes32, uint64, uint128, bytes32)[], tuple(bytes32, uint128)[], tuple(bytes32, uint64, uint128, bytes32)[], tuple(bytes32, uint128)[])"];
  
  describe("OmniverseAA", function () {
    function generateUTXOs(pubkey: string) {
      let UTXOs = [];
      for (let i = 0; i < UTXO_NUM; i++) {
        let txid = `0x${i.toString().padStart(64, '0')}`;
        let UTXO: {
          omniAddress: string,
          assetId: string,
          txid: string,
          index: string,
          amount: string
        } = {
          txid,
          omniAddress: pubkey,
          assetId: GAS_ASSET_ID,
          index: i.toString(),
          amount: ((i + 1) * GAS_PER_UTXO).toString()
        };
        UTXOs.push(UTXO);
      }
      return UTXOs;
    }

    function encodeDeploy(deploy: Deploy) {
      let deployData = [
        [
          deploy.metadata.salt,
          deploy.metadata.name,
          deploy.metadata.deployer,
          deploy.metadata.totalSupply,
          deploy.metadata.limit,
          deploy.metadata.price,
        ],
        deploy.signature,
        deploy.feeInputs,
        deploy.feeOutputs
      ];
      const encoded = hre.ethers.AbiCoder.defaultAbiCoder().encode(DEPLOY_TYPE, [deployData]);
      return encoded;
    }

    function encodeMint(mint: Mint) {
      let mintData = [
        mint.assetId,
        mint.signature,
        mint.outputs,
        mint.feeInputs,
        mint.feeOutputs
      ];
      const encoded = hre.ethers.AbiCoder.defaultAbiCoder().encode(MINT_TYPE, [mintData]);
      return encoded;
    }

    function encodeTransfer(transfer: Transfer) {
      let transferData = [
        transfer.assetId,
        transfer.signature,
        transfer.inputs,
        transfer.outputs,
        transfer.feeInputs,
        transfer.feeOutputs
      ];
      const encoded = hre.ethers.AbiCoder.defaultAbiCoder().encode(TRANSFER_TYPE, [transferData]);
      return encoded;
    }

    async function deployLocalEntry() {
      const MockLocalEntry = await hre.ethers.getContractFactory("MockLocalEntry");
      const localEntry = await MockLocalEntry.deploy();
      
      return localEntry;
    }

    async function deployOmniverseAAWithNoUTXO() {
      const wallets = getWallets();
      const OmniverseEIP712 = await hre.ethers.getContractFactory("OmniverseEIP712");
      const eip712 = await OmniverseEIP712.deploy("Omniverse Transaction", "1");

      const Poseidon = await hre.ethers.getContractFactory("Poseidon");
      const poseidon = await Poseidon.deploy();

      const OmniverseAABase = await hre.ethers.getContractFactory("OmniverseAABaseTest");
      const omniverseAA = await OmniverseAABase.deploy(wallets[0].publicKey, [], poseidon.target, eip712.target);
      
      return { omniverseAA};
    }

    async function deployOmniverseAAWithUTXOs() {
      const wallets = getWallets();
      const OmniverseEIP712 = await hre.ethers.getContractFactory("OmniverseEIP712");
      const eip712 = await OmniverseEIP712.deploy("Omniverse Transaction", "1");
      
      const Poseidon = await hre.ethers.getContractFactory("Poseidon");
      const poseidon = await Poseidon.deploy();

      const OmniverseAABase = await hre.ethers.getContractFactory("OmniverseAABaseTest");
      const omniverseAA = await OmniverseAABase.deploy(wallets[0].publicKey, generateUTXOs(wallets[0].compressed), poseidon.target, eip712.target);

      const localEntry = await deployLocalEntry();
      await omniverseAA.setLocalEntry(localEntry.target);
      
      return { omniverseAA, localEntry, signer: wallets[0].compressed, user: wallets[1].compressed };
    }

    async function deployOmniverseAAWithStateKeeper(env: string) {
      const wallets = getWallets();
      const signers = await hre.ethers.getSigners();
      const OmniverseEIP712 = await hre.ethers.getContractFactory("OmniverseEIP712");
      const eip712 = await OmniverseEIP712.deploy("Omniverse Transaction", "1");
      
      const Poseidon = await hre.ethers.getContractFactory("Poseidon");
      const poseidon = await Poseidon.deploy();

      let MockStateKeeper = null;
      let OmniverseAA = null;
      if (env == 'local') {
        MockStateKeeper = await hre.ethers.getContractFactory("MockStateKeeperLocal");
        OmniverseAA = await hre.ethers.getContractFactory("OmniverseAALocalTest");
      }
      else {
        MockStateKeeper = await hre.ethers.getContractFactory("MockStateKeeperBeacon");
        OmniverseAA = await hre.ethers.getContractFactory("OmniverseAABeaconTest");
      }
      
      const stateKeeper = await MockStateKeeper.deploy();
      const omniverseAA = await OmniverseAA.deploy(wallets[0].publicKey, generateUTXOs(wallets[0].compressed), poseidon.target, eip712.target);

      const localEntry = await deployLocalEntry();

      await omniverseAA.setLocalEntry(localEntry.target);
      await omniverseAA.setStateKeeper(stateKeeper.target);
      
      return {omniverseAA, localEntry, stateKeeper, signer: {signer: signers[0], wallet: wallets[0]}, user: {signer: signers[1], wallet: wallets[1]}};
    }

    async function deployOmniverseAAWithStateKeeperBeacon() {
      return await deployOmniverseAAWithStateKeeper('beacon');
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
              compressed: '0x' + wallet.publicKey.substring(4),
            });
        }
        return wallets;
    }
  
    describe("Deploy contracts", function () {
        it("Should pass with no UTXO set", async function () {
          const wallets = getWallets();
          const OmniverseEIP712 = await hre.ethers.getContractFactory("OmniverseEIP712");
          const eip712 = await OmniverseEIP712.deploy("Omniverse Transaction", "1");

          const Poseidon = await hre.ethers.getContractFactory("Poseidon");
          const poseidon = await Poseidon.deploy();

          const OmniverseAALocal = await hre.ethers.getContractFactory("OmniverseAABaseTest");
          const omniverseAA = await OmniverseAALocal.deploy(wallets[0].publicKey, [], poseidon.target, eip712.target);
        
          const utxos = await omniverseAA.getUTXOs(GAS_ASSET_ID);
          expect(utxos.length).to.equal(0);
        });

        it("Should pass with UTXOs set", async function () {
          const wallets = getWallets();
          const OmniverseEIP712 = await hre.ethers.getContractFactory("OmniverseEIP712");
          const eip712 = await OmniverseEIP712.deploy("Omniverse Transaction", "1");

          const Poseidon = await hre.ethers.getContractFactory("Poseidon");
          const poseidon = await Poseidon.deploy();

          const OmniverseAALocal = await hre.ethers.getContractFactory("OmniverseAABaseTest");
          console.log('wallets[0].compressed', wallets[0])
          const omniverseAA = await OmniverseAALocal.deploy(wallets[0].publicKey, generateUTXOs(wallets[0].compressed), poseidon.target, eip712.target);
        
          const utxos = await omniverseAA.getUTXOs(GAS_ASSET_ID);
          expect(utxos.length).to.equal(UTXO_NUM);
        });
      })

      describe("Construct omniverse transactions", function () {
        it("Should fail with gas not enough", async function () {
          const { omniverseAA } = await loadFixture(deployOmniverseAAWithNoUTXO);
        
          await expect(omniverseAA.mint(TOKEN_ASSET_ID, [])).to.be.revertedWithCustomError(
            omniverseAA,
            "TokenOfAAContractNotEnough"
          )
          .withArgs(GAS_ASSET_ID);
        });

        it("Should fail with used gas UTXO number exceed the limit", async function () {
          const { omniverseAA } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          await omniverseAA.updateSystemConfig({
            feeConfig: {
              assetId: GAS_ASSET_ID,
              receiver: GAS_RECEIVER,
              amount: GAS_FEE
            },
            maxTxUTXO: 1,
            decimals: DECIMALS,
            stateKeeper: STATE_KEEPER,
            localEntry: LOCAL_ENTRY
          });
          await expect(omniverseAA.mint(TOKEN_ASSET_ID, [])).to.be.revertedWithCustomError(
            omniverseAA,
            "UTXONumberExceedLimit"
          )
          .withArgs(3);
        });

        it("Should fail with used token UTXO number exceed the limit", async function () {
          const { omniverseAA, signer, user } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          await omniverseAA.updateSystemConfig({
            feeConfig: {
              assetId: GAS_ASSET_ID,
              receiver: GAS_RECEIVER,
              amount: GAS_FEE
            },
            maxTxUTXO: 5,
            decimals: DECIMALS,
            stateKeeper: STATE_KEEPER,
            localEntry: LOCAL_ENTRY
          });

          let outputs = [];
          for (let i = 0; i < 5; i++) {
            outputs.push({
              omniAddress: user,
              amount: 10
            })
          }

          await expect(omniverseAA.mint(TOKEN_ASSET_ID, outputs)).to.be.revertedWithCustomError(
            omniverseAA,
            "UTXONumberExceedLimit"
          )
          .withArgs(8);
        });

        it("Should fail with token not enough to construct omniverse transfer transaction", async function () {
          const { omniverseAA, user } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          let outputs = [];
          for (let i = 0; i < 20; i++) {
            outputs.push({
              omniAddress: user,
              amount: 10
            })
          }
          await expect(omniverseAA.transfer(TOKEN_ASSET_ID, outputs)).to.be.revertedWithCustomError(
            omniverseAA,
            "TokenOfAAContractNotEnough"
          )
          .withArgs(TOKEN_ASSET_ID);
        });

        it("Should fail to construct deploy transaction with token name length larger than 24", async function () {
          const { omniverseAA, signer } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          const metadata = {
            salt: METADATA_SALT,
            name: 'asdfasdfasdfasdfasdfasdfasdf',
            deployer: signer,
            totalSupply: METADATA_TOTAL_SUPPLY,
            limit: METADATA_LIMIT,
            price: METADATA_PRICE,
          };
          await expect(omniverseAA.deploy(metadata)).to.be.revertedWithCustomError(
            omniverseAA,
            "TokenNameLengthExceedLimit"
          )
          .withArgs(28);
        });

        it("Should pass when contructing deploy transaction", async function () {
          const { omniverseAA, signer } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          const metadata = {
            salt: METADATA_SALT,
            name: METADATA_NAME,
            deployer: signer,
            totalSupply: METADATA_TOTAL_SUPPLY,
            limit: METADATA_LIMIT,
            price: METADATA_PRICE,
          };
          await omniverseAA.deploy(metadata);
        });

        it("Should pass when contructing mint transaction", async function () {
          const { omniverseAA, signer } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          let outputs = [];
          for (let i = 0; i < 20; i++) {
            outputs.push({
              omniAddress: signer,
              amount: 10
            })
          }
          await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
          const utxos = await omniverseAA.getUTXOs(TOKEN_ASSET_ID);
          expect(utxos.length).to.equal(outputs.length);
        });

        it("Should pass when contructing transfer transaction", async function () {
          const { omniverseAA, signer } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          let outputs = [];
          for (let i = 0; i < 20; i++) {
            outputs.push({
              omniAddress: signer,
              amount: 10
            })
          }
          await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
          const utxos = await omniverseAA.getUTXOs(TOKEN_ASSET_ID);
          expect(utxos.length).to.equal(outputs.length);
        });
      });
  
    describe("Submit transactions", function () {
      it("Should fail with sender not registered as AA signer", async function () {
        const { omniverseAA } = await loadFixture(deployOmniverseAAWithNoUTXO);

        const signers = await hre.ethers.getSigners();
        await expect(omniverseAA.connect(signers[1]).submitTx(TX_ID, SIGNATURE)).to.be.revertedWithCustomError(
          omniverseAA,
          "SenderNotRegistered"
        );
      });

        it("Should fail with transaction not exists", async function () {
          const { omniverseAA } = await loadFixture(deployOmniverseAAWithNoUTXO);
        
          await expect(omniverseAA.submitTx(TX_ID, SIGNATURE)).to.be.revertedWithCustomError(
            omniverseAA,
            "TransactionNotExists"
          );
        });

        it("Should fail with submitted transaction index error", async function () {
          const { omniverseAA, localEntry, user } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          let outputs = [
            {
              omniAddress: user,
              amount: 10
            }
          ]
          await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
          await expect(omniverseAA.submitTx(1, SIGNATURE)).to.be.revertedWithCustomError(
            omniverseAA,
            "TransactionIndexNotMatch"
          )
          .withArgs(0, 1);
        });

        it("Should fail with it is reverted in local entry contract", async function () {
          const { omniverseAA, localEntry, user } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          let outputs = [
            {
              omniAddress: user,
              amount: 10
            }
          ]
          
          await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
          await localEntry.setSubmitRet(false);
          await expect(omniverseAA.submitTx(0, SIGNATURE)).to.be.revertedWithCustomError(
            localEntry,
            "SubmitToLocalEntryFailed"
          );
          let tx = await omniverseAA.getUnsignedTx();
          expect(tx.txIndex).to.equal('0');
          expect(tx.unsignedTx.txid).not.to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
        });

        it("Should pass with calling entry contract successfully", async function () {
          const { omniverseAA, signer } = await loadFixture(deployOmniverseAAWithUTXOs);
        
          let outputs = [
            {
              omniAddress: signer,
              amount: 10
            },
            {
              omniAddress: signer,
              amount: 10
            }
          ]
          await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
            await omniverseAA.submitTx(0, SIGNATURE);
            let tx = await omniverseAA.getUnsignedTx();
            // txid is computed in contract
            expect(tx.txIndex).to.equal('0');
            expect(tx.unsignedTx.txid).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
            // update UTXOs stored in contract
            const utxos = await omniverseAA.getUTXOs(TOKEN_ASSET_ID);
            expect(utxos.length).to.equal(2);
        });
    });
  
    describe("Handle omniverse transaction", function () {
    //   describe("Beacon chain", function () {
    //     describe("Deploy", function () {
    //     it("Should fail with signer not UTXO owner", async function () {
    //       const { omniverseAA, user } = await loadFixture(deployOmniverseAAWithStateKeeperBeacon);
        
    //       const deploy = [
    //         [
    //           METADATA_SALT,
    //           METADATA_NAME,
    //           user.compressed,
    //           METADATA_TOTAL_SUPPLY,
    //           METADATA_LIMIT,
    //           METADATA_PRICE
    //         ],
    //         "0x",
    //         [],
    //         []
    //       ];
    //       const deployData = hre.ethers.AbiCoder.defaultAbiCoder().encode(DEPLOY_TYPE, [deploy]);
    //       const customData = hre.ethers.AbiCoder.defaultAbiCoder().encode(['0'], ['uint256']);
    //         await expect(omniverseAA.handleOmniverseTx({txType: 0, txData: deployData}, [], user.publicKey, customData)).to.be.revertedWithCustomError(
    //           omniverseAA,
    //           "TransactionNotExistsInStateKeeper"
    //         );
    //     });

    //     it("Should fail with transaction not exists in state keeper", async function () {
    //       const { omniverseAA } = await loadFixture(deployOmniverseAAWithStateKeeperBeacon);
        
    //         await expect(omniverseAA.handleOmniverseTx({txType: 0, txData: TX_DATA}, [])).to.be.revertedWithCustomError(
    //           omniverseAA,
    //           "TransactionNotExistsInStateKeeper"
    //         );
    //     });
    //   });

    //       describe("Transaction existing", function () {
    //       it("Should pass with handle deploy transaction", async function () {
    //         const { omniverseAA, user, stateKeeper } = await loadFixture(deployOmniverseAAWithStateKeeperBeacon);
            
    //         await stateKeeper.setIsIncluded(true);
    //         const deploy: Deploy = {
    //           metadata: {
    //             salt: METADATA_SALT,
    //             name: METADATA_NAME,
    //             deployer: user,
    //             totalSupply: METADATA_TOTAL_SUPPLY,
    //             limit: METADATA_LIMIT,
    //             price: METADATA_PRICE
    //           },
    //           signature: "0x",
    //           feeInputs: [],
    //           feeOutputs: []
    //         }
    //         const signature = user.signer.signTypedData();
    //         const encoded = encodeDeploy(deploy);
    //         await omniverseAA.handleOmniverseTx({txType: 0, txData: deployData}, []);
    //       });
    //     });
    // });

  //   describe("Local chain", function () {
  //     it("Should fail with transaction not exists in state keeper", async function () {
  //       const { omniverseAA } = await loadFixture(deployOmniverseAAWithStateKeeper);
      
  //         await expect(omniverseAA.handleOmniverseTx({txType: 0, txData: TX_DATA}, [])).to.be.revertedWithCustomError(
  //           omniverseAA,
  //           "TransactionNotExistsInStateKeeper"
  //         );
  //     });

  //     it("Should pass with handling times if transaction exists in state keeper", async function () {
  //       const { omniverseAA } = await loadFixture(deployOmniverseAAWithStateKeeper);
      
  //         await omniverseAA.handleOmniverseTx({txType: 0, txData: TX_DATA});
  //     });
  // });
  });
  
});