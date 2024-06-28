import {
    time,
    loadFixture
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import hre from 'hardhat';
import ecdsa from 'secp256k1';
import * as utils from './utils';

const SIG_PREFIX = 'Register to Omniverse AA:';

// common params
const TX_ID =
    '0x1122334455667788112233445566778811223344556677881122334455667788';
const SIGNATURE =
    '0x3a42c95c375c019bb6dfdac8bc15bb06de455ce88edb211756d3edea69dbdc526d4f8b99ad86f33b07137649d6c8ef78b398e95d6a21748ae00db750e3814f7b1c';
const GAS_PER_UTXO = 1000;
const INPUT_AMOUNT = '1234605616436508552';
const UTXO_INDEX = '287454020';

const TOKEN_ASSET_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000001';

// gas config
const GAS_ASSET_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
const GAS_RECEIVER =
    '0x1234567812345678123456781234567812345678123456781234567812345678';
const GAS_FEE = '10';

// sys config
const UTXO_NUM = 10;
const DECIMALS = 18;
const STATE_KEEPER = '0x0000000000000000000000000000000000000000';
const LOCAL_ENTRY = '0x0000000000000000000000000000000000000000';

// default metadata
const METADATA_SALT = '0x1122334455667788';
const METADATA_NAME = 'test_token';
const METADATA_TOTAL_SUPPLY = '1234605616436508552';
const METADATA_LIMIT = '1234605616436508552';
const METADATA_PRICE = '1234605616436508552';

describe('OmniverseAA', function () {
    let localEntry: any;

    function generateUTXOs(pubkey: string) {
        let UTXOs = [];
        for (let i = 0; i < UTXO_NUM; i++) {
            let txid = `0x${i.toString().padStart(64, '0')}`;
            let UTXO: {
                omniAddress: string;
                assetId: string;
                txid: string;
                index: string;
                amount: string;
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

    async function deployLocalEntry() {
        if (!localEntry) {
            const MockLocalEntry =
                await hre.ethers.getContractFactory('MockLocalEntry');
            localEntry = await MockLocalEntry.deploy();
            console.log('localEntry', localEntry.target)
        }

        return localEntry;
    }

    async function deployOmniverseAAWithNoUTXO() {
        const wallets = getWallets();
        const OmniverseEIP712 =
            await hre.ethers.getContractFactory('OmniverseEIP712');
        const eip712 = await OmniverseEIP712.deploy(
            utils.DOMAIN.name,
            utils.DOMAIN.version,
            utils.DOMAIN.chainId,
            utils.DOMAIN.verifyingContract
        );

        const Poseidon = await hre.ethers.getContractFactory('Poseidon');
        const poseidon = await Poseidon.deploy();

        const OmniverseAABase = await hre.ethers.getContractFactory(
            'OmniverseAABaseTest'
        );
        const omniverseAA = await OmniverseAABase.deploy(
            [],
            poseidon.target,
            eip712.target
        );

        await omniverseAA.setLocalEntry(localEntry.target);
        await omniverseAA.register(wallets[0].publicKey, SIGNATURE);

        return { omniverseAA };
    }

    async function deployOmniverseAAWithUTXOs() {
        const wallets = getWallets();
        const OmniverseEIP712 =
            await hre.ethers.getContractFactory('OmniverseEIP712');
        const eip712 = await OmniverseEIP712.deploy(
            utils.DOMAIN.name,
            utils.DOMAIN.version,
            utils.DOMAIN.chainId,
            utils.DOMAIN.verifyingContract
        );

        const Poseidon = await hre.ethers.getContractFactory('Poseidon');
        const poseidon = await Poseidon.deploy();

        const OmniverseAABase = await hre.ethers.getContractFactory(
            'OmniverseAABaseTest'
        );
        const omniverseAA = await OmniverseAABase.deploy(
            generateUTXOs(wallets[0].compressed),
            poseidon.target,
            eip712.target
        );

        const localEntry = await deployLocalEntry();
        await omniverseAA.setLocalEntry(localEntry.target);

        omniverseAA.register(wallets[0].publicKey, SIGNATURE);
        const pk2 = await omniverseAA.register2(wallets[0].publicKey, SIGNATURE);
        console.log('pk2', pk2)

        return {
            omniverseAA,
            localEntry,
            signer: wallets[0].compressed,
            user: wallets[1].compressed
        };
    }

    async function deployOmniverseAAWithStateKeeper(env: string) {
        const wallets = getWallets();
        const signers = await hre.ethers.getSigners();
        const OmniverseEIP712 =
            await hre.ethers.getContractFactory('OmniverseEIP712');
        const eip712 = await OmniverseEIP712.deploy(
            utils.DOMAIN.name,
            utils.DOMAIN.version,
            utils.DOMAIN.chainId,
            utils.DOMAIN.verifyingContract
        );

        const Poseidon = await hre.ethers.getContractFactory('Poseidon');
        const poseidon = await Poseidon.deploy();

        let MockStateKeeper = null;
        let OmniverseAA = null;
        if (env == 'local') {
            MockStateKeeper = await hre.ethers.getContractFactory(
                'MockStateKeeperLocal'
            );
            OmniverseAA = await hre.ethers.getContractFactory(
                'OmniverseAALocalTest'
            );
        } else {
            MockStateKeeper = await hre.ethers.getContractFactory(
                'MockStateKeeperBeacon'
            );
            OmniverseAA = await hre.ethers.getContractFactory(
                'OmniverseAABeaconTest'
            );
        }

        const stateKeeper = await MockStateKeeper.deploy();
        const omniverseAA = await OmniverseAA.deploy(
            generateUTXOs(wallets[0].compressed),
            poseidon.target,
            eip712.target
        );

        const localEntry = await deployLocalEntry();

        await omniverseAA.setLocalEntry(localEntry.target);
        await omniverseAA.setStateKeeper(stateKeeper.target);

        await omniverseAA.register(wallets[0].publicKey, SIGNATURE)

        return {
            omniverseAA,
            localEntry,
            eip712,
            stateKeeper,
            signer: { signer: signers[0], wallet: wallets[0] },
            user: { signer: signers[1], wallet: wallets[1] }
        };
    }

    async function deployOmniverseAAWithStateKeeperBeacon() {
        return await deployOmniverseAAWithStateKeeper('beacon');
    }

    function getWallets() {
        let accounts = hre.config.networks.hardhat.accounts;
        let wallets = [];
        for (let index = 0; index < 10; index++) {
            const wallet = hre.ethers.HDNodeWallet.fromPhrase(
                accounts.mnemonic,
                accounts.password,
                `${accounts.path}/${index}`
            );
            var pubKey = ecdsa.publicKeyCreate(
                Buffer.from(wallet.privateKey.substring(2), 'hex'),
                false
            );
            wallets.push({
                privateKey: wallet.privateKey,
                publicKey:
                    '0x' + Buffer.from(pubKey).toString('hex').substring(2),
                compressed: '0x' + wallet.publicKey.substring(4)
            });
        }
        return wallets;
    }

    describe('Deploy contracts', function () {
        it('Should pass with no UTXO set', async function () {
            const wallets = getWallets();
            const OmniverseEIP712 =
                await hre.ethers.getContractFactory('OmniverseEIP712');
            const eip712 = await OmniverseEIP712.deploy(
                utils.DOMAIN.name,
                utils.DOMAIN.version,
                utils.DOMAIN.chainId,
                utils.DOMAIN.verifyingContract
            );

            const Poseidon = await hre.ethers.getContractFactory('Poseidon');
            const poseidon = await Poseidon.deploy();

            await deployLocalEntry();

            const OmniverseAALocal = await hre.ethers.getContractFactory(
                'OmniverseAABaseTest'
            );
            const omniverseAA = await OmniverseAALocal.deploy(
                [],
                poseidon.target,
                eip712.target
            );

            await omniverseAA.setLocalEntry(localEntry.target);
            await omniverseAA.register(wallets[0].publicKey, SIGNATURE);

            const utxos = await omniverseAA.getUTXOs(GAS_ASSET_ID);
            expect(utxos.length).to.equal(0);
        });

        it('Should pass with UTXOs set', async function () {
            const wallets = getWallets();
            const OmniverseEIP712 =
                await hre.ethers.getContractFactory('OmniverseEIP712');
            const eip712 = await OmniverseEIP712.deploy(
                utils.DOMAIN.name,
                utils.DOMAIN.version,
                utils.DOMAIN.chainId,
                utils.DOMAIN.verifyingContract
            );

            const Poseidon = await hre.ethers.getContractFactory('Poseidon');
            const poseidon = await Poseidon.deploy();

            const OmniverseAALocal = await hre.ethers.getContractFactory(
                'OmniverseAABaseTest'
            );
            console.log('wallets[0].compressed', wallets[0]);
            const omniverseAA = await OmniverseAALocal.deploy(
                generateUTXOs(wallets[0].compressed),
                poseidon.target,
                eip712.target
            );

            await omniverseAA.setLocalEntry(localEntry.target);
            await omniverseAA.register(wallets[0].publicKey, SIGNATURE);

            const utxos = await omniverseAA.getUTXOs(GAS_ASSET_ID);
            expect(utxos.length).to.equal(UTXO_NUM);
        });
    });

    describe('Construct omniverse transactions', function () {
        it('Should fail with gas not enough', async function () {
            const { omniverseAA } = await loadFixture(
                deployOmniverseAAWithNoUTXO
            );

            await expect(omniverseAA.mint(TOKEN_ASSET_ID, []))
                .to.be.revertedWithCustomError(
                    omniverseAA,
                    'TokenOfAAContractNotEnough'
                )
                .withArgs(GAS_ASSET_ID);
        });

        it('Should fail with used gas UTXO number exceed the limit', async function () {
            const { omniverseAA } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

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
            await expect(omniverseAA.mint(TOKEN_ASSET_ID, []))
                .to.be.revertedWithCustomError(
                    omniverseAA,
                    'UTXONumberExceedLimit'
                )
                .withArgs(3);
        });

        it('Should fail with used token UTXO number exceed the limit', async function () {
            const { omniverseAA, signer, user } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

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
                });
            }

            await expect(omniverseAA.mint(TOKEN_ASSET_ID, outputs))
                .to.be.revertedWithCustomError(
                    omniverseAA,
                    'UTXONumberExceedLimit'
                )
                .withArgs(8);
        });

        it('Should fail with minting gas token', async function () {
            const { omniverseAA } = await loadFixture(
                deployOmniverseAAWithNoUTXO
            );

            await expect(
                omniverseAA.mint(GAS_ASSET_ID, [])
            ).to.be.revertedWithCustomError(
                omniverseAA,
                'GasTokenCanNotBeMinted'
            );
        });

        it('Should fail with token not enough to construct omniverse transfer transaction', async function () {
            const { omniverseAA, user } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

            let outputs = [];
            for (let i = 0; i < 20; i++) {
                outputs.push({
                    omniAddress: user,
                    amount: 10
                });
            }
            await expect(omniverseAA.transfer(TOKEN_ASSET_ID, outputs))
                .to.be.revertedWithCustomError(
                    omniverseAA,
                    'TokenOfAAContractNotEnough'
                )
                .withArgs(TOKEN_ASSET_ID);
        });

        it('Should fail to construct deploy transaction with token name length larger than 24', async function () {
            const { omniverseAA, signer } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

            const metadata = {
                salt: METADATA_SALT,
                name: 'asdfasdfasdfasdfasdfasdfasdf',
                deployer: signer,
                totalSupply: METADATA_TOTAL_SUPPLY,
                limit: METADATA_LIMIT,
                price: METADATA_PRICE
            };
            await expect(omniverseAA.deploy(metadata))
                .to.be.revertedWithCustomError(
                    omniverseAA,
                    'TokenNameLengthExceedLimit'
                )
                .withArgs(28);
        });

        it('Should pass when contructing deploy transaction', async function () {
            const { omniverseAA, signer } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

            const metadata = {
                salt: METADATA_SALT,
                name: METADATA_NAME,
                deployer: signer,
                totalSupply: METADATA_TOTAL_SUPPLY,
                limit: METADATA_LIMIT,
                price: METADATA_PRICE
            };
            await omniverseAA.deploy(metadata);
            const tx= await omniverseAA.getUnsignedTx();
            expect(tx.txIndex).to.equal('0');
            expect(tx.unsignedTx.txid).not.to.equal(
                '0x0000000000000000000000000000000000000000000000000000000000000000'
            );
        });

        it('Should pass when contructing mint transaction', async function () {
            const { omniverseAA, signer } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

            let outputs = [];
            for (let i = 0; i < 20; i++) {
                outputs.push({
                    omniAddress: signer,
                    amount: 10
                });
            }
            const pk = await omniverseAA.getPubkey();
            console.log('pk++++', pk, signer)
            await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
            const utxos = await omniverseAA.getUTXOs(TOKEN_ASSET_ID);
            expect(utxos.length).to.equal(outputs.length);
            const tx= await omniverseAA.getUnsignedTx();
            expect(tx.txIndex).to.equal('0');
            expect(tx.unsignedTx.txid).not.to.equal(
                '0x0000000000000000000000000000000000000000000000000000000000000000'
            );
        });

        it('Should pass when contructing transfer transaction', async function () {
            const { omniverseAA, signer } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

            let outputs = [];
            for (let i = 0; i < 20; i++) {
                outputs.push({
                    omniAddress: signer,
                    amount: 10
                });
            }
            await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
            const utxos = await omniverseAA.getUTXOs(TOKEN_ASSET_ID);
            expect(utxos.length).to.equal(outputs.length);
            const tx= await omniverseAA.getUnsignedTx();
            expect(tx.txIndex).to.equal('0');
            expect(tx.unsignedTx.txid).not.to.equal(
                '0x0000000000000000000000000000000000000000000000000000000000000000'
            );
        });
    });

    describe('Submit transactions', function () {
        it('Should fail with sender not registered as AA signer', async function () {
            const { omniverseAA } = await loadFixture(
                deployOmniverseAAWithNoUTXO
            );

            const signers = await hre.ethers.getSigners();
            await expect(
                omniverseAA.connect(signers[1]).submitTx(TX_ID, SIGNATURE)
            ).to.be.revertedWithCustomError(omniverseAA, 'SenderNotRegistered');
        });

        it('Should fail with transaction not exists', async function () {
            const { omniverseAA } = await loadFixture(
                deployOmniverseAAWithNoUTXO
            );

            await expect(
                omniverseAA.submitTx(TX_ID, SIGNATURE)
            ).to.be.revertedWithCustomError(
                omniverseAA,
                'TransactionNotExists'
            );
        });

        it('Should fail with submitted transaction index error', async function () {
            const { omniverseAA, localEntry, user } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

            let outputs = [
                {
                    omniAddress: user,
                    amount: 10
                }
            ];
            await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
            await expect(omniverseAA.submitTx(1, SIGNATURE))
                .to.be.revertedWithCustomError(
                    omniverseAA,
                    'TransactionIndexNotMatch'
                )
                .withArgs(0, 1);
        });

        it('Should fail with it is reverted in local entry contract', async function () {
            const { omniverseAA, localEntry, user } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

            let outputs = [
                {
                    omniAddress: user,
                    amount: 10
                }
            ];

            await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
            await localEntry.setSubmitRet(false);
            await expect(
                omniverseAA.submitTx(0, SIGNATURE)
            ).to.be.revertedWithCustomError(
                localEntry,
                'SubmitToLocalEntryFailed'
            );
            let tx = await omniverseAA.getUnsignedTx();
            expect(tx.txIndex).to.equal('0');
            expect(tx.unsignedTx.txid).not.to.equal(
                '0x0000000000000000000000000000000000000000000000000000000000000000'
            );
        });

        it('Should pass with calling entry contract successfully', async function () {
            const { omniverseAA, signer } = await loadFixture(
                deployOmniverseAAWithUTXOs
            );

            let outputs = [
                {
                    omniAddress: signer,
                    amount: 10
                },
                {
                    omniAddress: signer,
                    amount: 10
                }
            ];
            await omniverseAA.mint(TOKEN_ASSET_ID, outputs);
            await omniverseAA.submitTx(0, SIGNATURE);
            let tx = await omniverseAA.getUnsignedTx();
            // txid is computed in contract
            expect(tx.txIndex).to.equal('0');
            expect(tx.unsignedTx.txid).to.equal(
                '0x0000000000000000000000000000000000000000000000000000000000000000'
            );
            // update UTXOs stored in contract
            const utxos = await omniverseAA.getUTXOs(TOKEN_ASSET_ID);
            expect(utxos.length).to.equal(2);
        });
    });

    describe('Handle omniverse transaction', function () {
        describe('Beacon chain', function () {
            describe('Deploy', function () {
                it('Should fail with transaction data error', async function () {
                    const { omniverseAA, user, stateKeeper } =
                        await loadFixture(
                            deployOmniverseAAWithStateKeeperBeacon
                        );

                    await stateKeeper.setIsIncluded(true);

                    const encoded = '0x';
                    const customData =
                        hre.ethers.AbiCoder.defaultAbiCoder().encode(
                            ['uint256'],
                            ['0']
                        );
                    await expect(
                        omniverseAA.handleOmniverseTx(
                            { txType: 0, txData: encoded },
                            [],
                            user.wallet.publicKey,
                            customData
                        )
                    ).to.revertedWithoutReason();
                });

                it('Should fail with signer not UTXO owner', async function () {
                    const { omniverseAA, signer, eip712, user, stateKeeper } =
                        await loadFixture(
                            deployOmniverseAAWithStateKeeperBeacon
                        );

                    await stateKeeper.setIsIncluded(true);
                    let deploy: Deploy = {
                        metadata: {
                            salt: METADATA_SALT,
                            name: METADATA_NAME,
                            deployer: user.wallet.compressed,
                            totalSupply: METADATA_TOTAL_SUPPLY,
                            limit: METADATA_LIMIT,
                            price: METADATA_PRICE
                        },
                        signature: SIGNATURE,
                        feeInputs: [
                            {
                                txid: TX_ID,
                                index: '0',
                                amount: '1000',
                                omniAddress: signer.wallet.compressed
                            }
                        ],
                        feeOutputs: []
                    };
                    const signature = await utils.typedSignDeploy(
                        user.signer,
                        deploy
                    );
                    deploy.signature = signature;
                    const encoded = utils.encodeDeploy(deploy);
                    const customData =
                        hre.ethers.AbiCoder.defaultAbiCoder().encode(
                            ['uint256'],
                            ['0']
                        );
                    await expect(
                        omniverseAA.handleOmniverseTx(
                            { txType: 0, txData: encoded },
                            [],
                            user.wallet.publicKey,
                            customData
                        )
                    )
                        .to.revertedWithCustomError(eip712, 'NotUTXOOwner')
                        .withArgs(
                            user.wallet.compressed,
                            signer.wallet.compressed
                        );
                });

                it('Should fail with failing to verify signature', async function () {
                    const { omniverseAA, signer, eip712, user, stateKeeper } =
                        await loadFixture(
                            deployOmniverseAAWithStateKeeperBeacon
                        );

                    await stateKeeper.setIsIncluded(true);
                    let deploy: utils.Deploy = {
                        metadata: {
                            salt: METADATA_SALT,
                            name: METADATA_NAME,
                            deployer: user.wallet.compressed,
                            totalSupply: METADATA_TOTAL_SUPPLY,
                            limit: METADATA_LIMIT,
                            price: METADATA_PRICE
                        },
                        signature: SIGNATURE,
                        feeInputs: [
                            {
                                txid: TX_ID,
                                index: '0',
                                amount: '1000',
                                omniAddress: user.wallet.compressed
                            }
                        ],
                        feeOutputs: []
                    };
                    const encoded = utils.encodeDeploy(deploy);
                    const customData =
                        hre.ethers.AbiCoder.defaultAbiCoder().encode(
                            ['uint256'],
                            ['0']
                        );
                    await expect(
                        omniverseAA.handleOmniverseTx(
                            { txType: 0, txData: encoded },
                            [],
                            user.wallet.publicKey,
                            customData
                        )
                    ).to.revertedWithCustomError(
                        eip712,
                        'SignatureVerifyFailed'
                    );
                });

                it('Should fail with transaction not exists in state keeper', async function () {
                    const { omniverseAA, signer, eip712, user, stateKeeper } =
                        await loadFixture(
                            deployOmniverseAAWithStateKeeperBeacon
                        );

                    let deploy: utils.Deploy = {
                        metadata: {
                            salt: METADATA_SALT,
                            name: METADATA_NAME,
                            // deployer: user.wallet.compressed,
                            deployer:
                                '0x1122334455667788112233445566778811223344556677881122334455667788',
                            totalSupply: METADATA_TOTAL_SUPPLY,
                            limit: METADATA_LIMIT,
                            price: METADATA_PRICE
                        },
                        signature: SIGNATURE,
                        feeInputs: [
                            {
                                txid: TX_ID,
                                index: UTXO_INDEX,
                                amount: INPUT_AMOUNT,
                                omniAddress: signer.wallet.compressed
                            }
                        ],
                        feeOutputs: [
                            {
                                omniAddress:
                                    '0x1122334455667788112233445566778811223344556677881122334455667788',
                                amount: '1234605616436508552'
                            }
                        ]
                    };
                    const signature = await utils.typedSignDeploy(
                        signer.signer,
                        deploy
                    );
                    deploy.signature = signature;
                    const encoded = utils.encodeDeploy(deploy);
                    const customData =
                        hre.ethers.AbiCoder.defaultAbiCoder().encode(
                            ['uint256'],
                            ['0']
                        );
                    await expect(
                        omniverseAA.handleOmniverseTx(
                            { txType: 0, txData: encoded },
                            [],
                            signer.wallet.publicKey,
                            customData
                        )
                    ).to.revertedWithCustomError(
                        omniverseAA,
                        'TransactionNotExistsInStateKeeper'
                    );
                });

                it('Should pass with all conditions satisfied', async function () {
                    const { omniverseAA, signer, eip712, user, stateKeeper } =
                        await loadFixture(
                            deployOmniverseAAWithStateKeeperBeacon
                        );

                    let deploy: utils.Deploy = {
                        metadata: {
                            salt: METADATA_SALT,
                            name: METADATA_NAME,
                            // deployer: user.wallet.compressed,
                            deployer:
                                '0x1122334455667788112233445566778811223344556677881122334455667788',
                            totalSupply: METADATA_TOTAL_SUPPLY,
                            limit: METADATA_LIMIT,
                            price: METADATA_PRICE
                        },
                        signature: SIGNATURE,
                        feeInputs: [
                            {
                                txid: TX_ID,
                                index: UTXO_INDEX,
                                amount: INPUT_AMOUNT,
                                omniAddress: signer.wallet.compressed
                            }
                        ],
                        feeOutputs: [
                            {
                                omniAddress:
                                    '0x1122334455667788112233445566778811223344556677881122334455667788',
                                amount: '1234605616436508552'
                            }
                        ]
                    };
                    const signature = await utils.typedSignDeploy(
                        signer.signer,
                        deploy
                    );
                    deploy.signature = signature;
                    const encoded = utils.encodeDeploy(deploy);
                    const customData =
                        hre.ethers.AbiCoder.defaultAbiCoder().encode(
                            ['uint256'],
                            ['0']
                        );
                    await stateKeeper.setIsIncluded(true);
                    await omniverseAA.handleOmniverseTx(
                        { txType: 0, txData: encoded },
                        [],
                        signer.wallet.publicKey,
                        customData
                    );
                });

                it('Should fail with transaction already handled', async function () {
                    const { omniverseAA, signer, eip712, user, stateKeeper } =
                        await loadFixture(
                            deployOmniverseAAWithStateKeeperBeacon
                        );

                    let deploy: utils.Deploy = {
                        metadata: {
                            salt: METADATA_SALT,
                            name: METADATA_NAME,
                            // deployer: user.wallet.compressed,
                            deployer:
                                '0x1122334455667788112233445566778811223344556677881122334455667788',
                            totalSupply: METADATA_TOTAL_SUPPLY,
                            limit: METADATA_LIMIT,
                            price: METADATA_PRICE
                        },
                        signature: SIGNATURE,
                        feeInputs: [
                            {
                                txid: TX_ID,
                                index: UTXO_INDEX,
                                amount: INPUT_AMOUNT,
                                omniAddress: signer.wallet.compressed
                            }
                        ],
                        feeOutputs: [
                            {
                                omniAddress:
                                    '0x1122334455667788112233445566778811223344556677881122334455667788',
                                amount: '1234605616436508552'
                            }
                        ]
                    };
                    const signature = await utils.typedSignDeploy(
                        signer.signer,
                        deploy
                    );
                    deploy.signature = signature;
                    const encoded = utils.encodeDeploy(deploy);
                    const customData =
                        hre.ethers.AbiCoder.defaultAbiCoder().encode(
                            ['uint256'],
                            ['0']
                        );
                    await stateKeeper.setIsIncluded(true);
                    await omniverseAA.handleOmniverseTx(
                        { txType: 0, txData: encoded },
                        [],
                        signer.wallet.publicKey,
                        customData
                    );
                    await expect(
                        omniverseAA.handleOmniverseTx(
                            { txType: 0, txData: encoded },
                            [],
                            signer.wallet.publicKey,
                            customData
                        )
                    ).to.revertedWithCustomError(
                        omniverseAA,
                        'TransactionAlreadyHandled'
                    );
                });
            });

            describe('Mint', function () {
                it('Should pass with all conditions satisfied', async function () {
                    const { omniverseAA, signer, eip712, user, stateKeeper } =
                        await loadFixture(
                            deployOmniverseAAWithStateKeeperBeacon
                        );

                    let mint: utils.Mint = {
                        assetId: TOKEN_ASSET_ID,
                        signature: SIGNATURE,
                        outputs: [
                            {
                                omniAddress:
                                    '0x1122334455667788112233445566778811223344556677881122334455667788',
                                amount: '1234605616436508552'
                            }
                        ],
                        feeInputs: [
                            {
                                txid: TX_ID,
                                index: UTXO_INDEX,
                                amount: INPUT_AMOUNT,
                                omniAddress: signer.wallet.compressed
                            }
                        ],
                        feeOutputs: [
                            {
                                omniAddress:
                                    '0x1122334455667788112233445566778811223344556677881122334455667788',
                                amount: '1234605616436508552'
                            }
                        ]
                    };
                    const signature = await utils.typedSignMint(signer.signer, mint);
                    mint.signature = signature;
                    const encoded = utils.encodeMint(mint);
                    const customData =
                        hre.ethers.AbiCoder.defaultAbiCoder().encode(
                            ['uint256'],
                            ['0']
                        );
                    await stateKeeper.setIsIncluded(true);
                    await omniverseAA.handleOmniverseTx(
                        { txType: 1, txData: encoded },
                        [],
                        signer.wallet.publicKey,
                        customData
                    );
                });
            });

            describe('Transfer', function () {
                it('Should pass with all conditions satisfied', async function () {
                    const { omniverseAA, signer, eip712, user, stateKeeper } =
                        await loadFixture(
                            deployOmniverseAAWithStateKeeperBeacon
                        );

                    let transfer: utils.Transfer = {
                        assetId: TOKEN_ASSET_ID,
                        signature: SIGNATURE,
                        inputs: [
                            {
                                txid: TX_ID,
                                index: UTXO_INDEX,
                                amount: INPUT_AMOUNT,
                                omniAddress: signer.wallet.compressed
                            }
                        ],
                        outputs: [
                            {
                                omniAddress:
                                    '0x1122334455667788112233445566778811223344556677881122334455667788',
                                amount: '1234605616436508552'
                            }
                        ],
                        feeInputs: [
                            {
                                txid: TX_ID,
                                index: UTXO_INDEX,
                                amount: INPUT_AMOUNT,
                                omniAddress: signer.wallet.compressed
                            }
                        ],
                        feeOutputs: [
                            {
                                omniAddress:
                                    '0x1122334455667788112233445566778811223344556677881122334455667788',
                                amount: '1234605616436508552'
                            }
                        ]
                    };
                    const signature = await utils.typedSignTransfer(
                        signer.signer,
                        transfer
                    );
                    transfer.signature = signature;
                    const encoded = utils.encodeTransfer(transfer);
                    const customData =
                        hre.ethers.AbiCoder.defaultAbiCoder().encode(
                            ['uint256'],
                            ['0']
                        );
                    await stateKeeper.setIsIncluded(true);
                    await omniverseAA.handleOmniverseTx(
                        { txType: 2, txData: encoded },
                        [],
                        signer.wallet.publicKey,
                        customData
                    );
                });
            });
        });

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
