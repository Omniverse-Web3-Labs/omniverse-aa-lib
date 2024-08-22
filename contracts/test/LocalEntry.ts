import {
    time,
    loadFixture
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import ecdsa from 'secp256k1';
import * as utils from './utils';

const CHAIN_ID = '31337';
const SIG_CHAIN_ID = ', chain id: '
const SIG_PREFIX = 'Register to Omniverse AA: ';
const PERSONAL_SIGN_PREFIX = '\x19Ethereum Signed Message:\n';
const TX_ID =
    '0x1234567812345678123456781234567812345678123456781234567812345678';
const TX_DATA = '0x12345678';
const SIGNATURE =
    '0x1234567812345678123456781234567812345678123456781234567812345678';

const TOKEN_ASSET_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000001';
const INPUT_AMOUNT = '1234605616436508552';
const UTXO_INDEX = '287454020';

const DOMAIN = {
    name: 'Omniverse Transaction',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
};

describe('LocalEntry', function () {
    async function getTxData(signer: any) {
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
        
        return {txType: utils.TxType.TRANSFER, txData: encoded, signature};
    }

    async function deployLocalEntrySC() {
        const OmniverseEIP712 = await hre.ethers.getContractFactory('OmniverseEIP712');
        const eip712 = await OmniverseEIP712.deploy(
            DOMAIN.name,
            DOMAIN.version,
            DOMAIN.chainId,
            DOMAIN.verifyingContract
        );

        const LocalEntrySC = await hre.ethers.getContractFactory('LocalEntry');
        const localEntry = await LocalEntrySC.deploy(eip712.target);

        return { localEntry };
    }

    async function deployLocalEntrySCWithPublicKeys() {
        const { localEntry } = await deployLocalEntrySC();

        const wallets = getWallets();
        const signers = await hre.ethers.getSigners();
        let signatures = [];
        let publicKeys = [];
        for (let i = 0; i < 2; i++) {
            let message = Buffer.from(
                `${SIG_PREFIX}${signers[0].address.toString().toLowerCase()}${SIG_CHAIN_ID}${CHAIN_ID}`
            );
            const sig = await signers[i].signMessage(message);
            signatures.push(sig);
            publicKeys.push(wallets[i].publicKey);
        }
        await localEntry.register(publicKeys, signatures);

        return { localEntry, signer1: { signer: signers[0], wallet: wallets[0] },
        signer2: { signer: signers[1], wallet: wallets[1] },
        other: { signer: signers[2], wallet: wallets[2] } };
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
                compressed: '0x' + wallet.publicKey.substring(4),
                privateKey: wallet.privateKey,
                publicKey:
                    '0x' + Buffer.from(pubKey).toString('hex').substring(2)
            });
        }
        return wallets;
    }

    describe('Register pubkeys', function () {
        it('Should fail with lenght of pubkeys and signatures not equal', async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySC);

            const wallets = getWallets();
            await expect(
                localEntry.register(
                    [wallets[0].publicKey, wallets[1].publicKey],
                    []
                )
            ).to.be.revertedWithCustomError(
                localEntry,
                'LengthOfPublickeysAndSignaturesNotEqual'
            );
        });

        it('Should fail with it failed to verify signatures', async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySC);

            const wallets = getWallets();
            const signers = await hre.ethers.getSigners();
            let signatures = [];
            // mismatched signatures
            for (let i = 1; i < 3; i++) {
                let message = Buffer.from(
                    `${SIG_PREFIX}${localEntry.target.toString().toLowerCase()}${SIG_CHAIN_ID}${CHAIN_ID}`
                );
                const sig = await signers[0].signMessage(message);
                signatures.push(sig);
            }
            await expect(
                localEntry.register(
                    [wallets[0].publicKey, wallets[1].publicKey],
                    signatures
                )
            ).to.be.revertedWithCustomError(
                localEntry,
                'FailedToVerifySignature'
            );
        });

        it('Should pass with signatures verification passed', async function () {
            const { localEntry } = await loadFixture(deployLocalEntrySC);

            const wallets = getWallets();
            const signers = await hre.ethers.getSigners();
            let signatures = [];
            let publicKeys = [];
            
            for (let i = 0; i < 2; i++) {
                let message = Buffer.from(
                    `${SIG_PREFIX}${signers[0].address.toString().toLowerCase()}${SIG_CHAIN_ID}${CHAIN_ID}`
                );
                const sig = await signers[i].signMessage(message);
                const hash = ethers.keccak256(Buffer.concat([Buffer.from(PERSONAL_SIGN_PREFIX), Buffer.from(message.length.toString()), message]));
                const signature = ecdsa.ecdsaSign(Buffer.from(hash.substring(2), 'hex'), Buffer.from(wallets[i].privateKey.substring(2), 'hex'))
                const sigXY = '0x' + Buffer.from(signature.signature).toString('hex');
                expect(sig).to.equal(signature.recid == 0 ? sigXY + '1b' : sigXY + '1c');
                signatures.push(sig);
                publicKeys.push(wallets[i].publicKey);
            }
            await localEntry.register(publicKeys, signatures);
            let pks = await localEntry.getPubkeys(
                signers[0].address.toString()
            );
            expect(pks.length).to.equal(2);
            expect(pks[0]).to.equal(wallets[0].publicKey);
            expect(pks[1]).to.equal(wallets[1].publicKey);
        });

        it('Should fail with any public key registered before', async function () {
            const { localEntry } = await loadFixture(
                deployLocalEntrySCWithPublicKeys
            );

            const wallets = getWallets();
            const signers = await hre.ethers.getSigners();
            let signatures = [];
            let publicKeys = [];
            
            for (let i = 0; i < 2; i++) {
                let message = Buffer.from(
                    `${SIG_PREFIX}${signers[0].address.toString().toLowerCase()}${SIG_CHAIN_ID}${CHAIN_ID}`
                );
                const sig = await signers[i].signMessage(message);
                signatures.push(sig);
                publicKeys.push(wallets[i].publicKey);
            }
            await expect(
                localEntry.register(publicKeys, signatures)
            ).to.be.revertedWithCustomError(
                localEntry,
                'PublicKeyAlreadyRegistered'
            );
        });
    });

    describe('Submit transactions', function () {
        it('Should fail with sender not registered', async function () {
            const { localEntry, signer1, signer2 } = await loadFixture(
                deployLocalEntrySCWithPublicKeys
            );

            let signers = await hre.ethers.getSigners();
            await expect(
                localEntry.connect(signers[2]).submitTx(0,
                    TX_DATA, signer1.wallet.publicKey)
            ).to.be.revertedWithCustomError(localEntry, 'SenderNotRegistered');
        });

        it('Should fail with public key not bound to AA contract', async function () {
            const { localEntry, signer1, signer2, other } = await loadFixture(
                deployLocalEntrySCWithPublicKeys
            );

            await expect(
                localEntry.submitTx(0, TX_DATA, other.wallet.publicKey)
            ).to.be.revertedWithCustomError(localEntry, 'PublicKeyNotBoundToAAContract')
            .withArgs(other.wallet.publicKey, signer1.signer.address);
        });

        it('Should pass with sender registered', async function () {
            const { localEntry, signer1 } = await loadFixture(
                deployLocalEntrySCWithPublicKeys
            );

            const NEW_TX_ID =
                '0x1234567812345678123456781234567812345678123456781234567812345679';
            const txData = await getTxData(signer1);
            await localEntry.submitTx(txData.txType, txData.txData, signer1.wallet.publicKey);
            let signedTx = await localEntry.getTransaction(NEW_TX_ID);
            expect(signedTx.address).not.to.equal('0x');
            signedTx = await localEntry.getTransactionByIndex(0);
            expect(signedTx.address).not.to.equal('0x');
            const txNumber = await localEntry.getTransactionNumber();
            expect(txNumber).to.equal(1);
        });

        it('Should fail with transaction with the same txid exists', async function () {
            const { localEntry, signer1 } = await loadFixture(
                deployLocalEntrySCWithPublicKeys
            );

            const txData = await getTxData(signer1);
            await localEntry.submitTx(txData.txType, txData.txData, signer1.wallet.publicKey);
            await expect(
                localEntry.submitTx(txData.txType, txData.txData, signer1.wallet.publicKey)
            ).to.be.revertedWithCustomError(localEntry, 'TransactionExists');
        });
    });
});
