// Omniverse types
export interface Input {
    txid: string;
    index: string;
    amount: string;
    omniAddress: string;
}

export interface Output {
    omniAddress: string;
    amount: string;
}

export interface Deploy {
    metadata: {
        salt: string;
        name: string;
        deployer: string;
        totalSupply: string;
        mintAmount: string;
        price: string;
    };
    signature: string;
    feeInputs: Array<Input>;
    feeOutputs: Array<Output>;
}

export interface Mint {
    assetId: string;
    signature: string;
    outputs: Array<Output>;
    feeInputs: Array<Input>;
    feeOutputs: Array<Output>;
}

export interface Transfer {
    assetId: string;
    signature: string;
    inputs: Array<Input>;
    outputs: Array<Output>;
    feeInputs: Array<Input>;
    feeOutputs: Array<Output>;
}

// abi encoding and decoding
const ABI_DEPLOY_TYPE = [
    'tuple(tuple(bytes8, string, bytes32, uint128, uint128, uint128), bytes, tuple(bytes32, uint64, uint128, bytes32)[], tuple(bytes32, uint128)[])'
];
const ABI_MINT_TYPE = [
    'tuple(bytes32, bytes, tuple(bytes32, uint128)[], tuple(bytes32, uint64, uint128, bytes32)[], tuple(bytes32, uint128)[])'
];
const ABI_TRANSFER_TYPE = [
    'tuple(bytes32, bytes, tuple(bytes32, uint64, uint128, bytes32)[], tuple(bytes32, uint128)[], tuple(bytes32, uint64, uint128, bytes32)[], tuple(bytes32, uint128)[])'
];

// eip712
export const DOMAIN = {
    name: 'Omniverse Transaction',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
};

const EIP712_DEPLOY_TYPES = {
    // This refers to the domain the contract is hosted on.
    Deploy: [
        { name: 'salt', type: 'bytes8' },
        { name: 'name', type: 'string' },
        { name: 'deployer', type: 'bytes32' },
        { name: 'mint_amount', type: 'uint128' },
        { name: 'price', type: 'uint128' },
        { name: 'total_supply', type: 'uint128' },
        { name: 'fee_inputs', type: 'Input[]' },
        { name: 'fee_outputs', type: 'Output[]' }
    ],
    Input: [
        { name: 'txid', type: 'bytes32' },
        { name: 'index', type: 'uint32' },
        { name: 'amount', type: 'uint128' },
        { name: 'address', type: 'bytes32' }
    ],
    Output: [
        { name: 'amount', type: 'uint128' },
        { name: 'address', type: 'bytes32' }
    ]
};

const EIP712_MINT_TYPES = {
    // This refers to the domain the contract is hosted on.
    Mint: [
        { name: 'asset_id', type: 'bytes32' },
        { name: 'outputs', type: 'Output[]' },
        { name: 'fee_inputs', type: 'Input[]' },
        { name: 'fee_outputs', type: 'Output[]' }
    ],
    Input: [
        { name: 'txid', type: 'bytes32' },
        { name: 'index', type: 'uint32' },
        { name: 'amount', type: 'uint128' },
        { name: 'address', type: 'bytes32' }
    ],
    Output: [
        { name: 'amount', type: 'uint128' },
        { name: 'address', type: 'bytes32' }
    ]
};

const EIP712_TRANSFER_TYPES = {
    // This refers to the domain the contract is hosted on.
    Transfer: [
        { name: 'asset_id', type: 'bytes32' },
        { name: 'inputs', type: 'Input[]' },
        { name: 'outputs', type: 'Output[]' },
        { name: 'fee_inputs', type: 'Input[]' },
        { name: 'fee_outputs', type: 'Output[]' }
    ],
    Input: [
        { name: 'txid', type: 'bytes32' },
        { name: 'index', type: 'uint32' },
        { name: 'amount', type: 'uint128' },
        { name: 'address', type: 'bytes32' }
    ],
    Output: [
        { name: 'amount', type: 'uint128' },
        { name: 'address', type: 'bytes32' }
    ]
};

export const TxType = {
    DEPLOY: 0,
    MINt: 1,
    TRANSFER: 2
}

export async function typedSignDeploy(signer: any, deploy: Deploy) {
    let fee_inputs = [];
    for (let i = 0; i < deploy.feeInputs.length; i++) {
        fee_inputs.push({
            txid: deploy.feeInputs[i].txid,
            index: deploy.feeInputs[i].index,
            amount: deploy.feeInputs[i].amount,
            address: deploy.feeInputs[i].omniAddress
        });
    }

    let fee_outputs = [];
    for (let i = 0; i < deploy.feeOutputs.length; i++) {
        fee_outputs.push({
            amount: deploy.feeOutputs[i].amount,
            address: deploy.feeOutputs[i].omniAddress
        });
    }

    return await signer.signTypedData(DOMAIN, EIP712_DEPLOY_TYPES, {
        salt: deploy.metadata.salt,
        name: deploy.metadata.name,
        deployer: deploy.metadata.deployer,
        total_supply: deploy.metadata.totalSupply,
        mint_amount: deploy.metadata.mintAmount,
        price: deploy.metadata.price,
        fee_inputs,
        fee_outputs
    });
}

export async function typedSignMint(signer: any, mint: Mint) {
    let fee_inputs = [];
    for (let i = 0; i < mint.feeInputs.length; i++) {
        fee_inputs.push({
            txid: mint.feeInputs[i].txid,
            index: mint.feeInputs[i].index,
            amount: mint.feeInputs[i].amount,
            address: mint.feeInputs[i].omniAddress
        });
    }

    let fee_outputs = [];
    for (let i = 0; i < mint.feeOutputs.length; i++) {
        fee_outputs.push({
            amount: mint.feeOutputs[i].amount,
            address: mint.feeOutputs[i].omniAddress
        });
    }

    let outputs = [];
    for (let i = 0; i < mint.outputs.length; i++) {
        outputs.push({
            amount: mint.outputs[i].amount,
            address: mint.outputs[i].omniAddress
        });
    }

    return await signer.signTypedData(DOMAIN, EIP712_MINT_TYPES, {
        asset_id: mint.assetId,
        outputs,
        fee_inputs,
        fee_outputs
    });
}

export async function typedSignTransfer(signer: any, transfer: Transfer) {
    let fee_inputs = [];
    for (let i = 0; i < transfer.feeInputs.length; i++) {
        fee_inputs.push({
            txid: transfer.feeInputs[i].txid,
            index: transfer.feeInputs[i].index,
            amount: transfer.feeInputs[i].amount,
            address: transfer.feeInputs[i].omniAddress
        });
    }

    let fee_outputs = [];
    for (let i = 0; i < transfer.feeOutputs.length; i++) {
        fee_outputs.push({
            amount: transfer.feeOutputs[i].amount,
            address: transfer.feeOutputs[i].omniAddress
        });
    }
    let inputs = [];
    for (let i = 0; i < transfer.inputs.length; i++) {
        inputs.push({
            txid: transfer.inputs[i].txid,
            index: transfer.inputs[i].index,
            amount: transfer.inputs[i].amount,
            address: transfer.inputs[i].omniAddress
        });
    }

    let outputs = [];
    for (let i = 0; i < transfer.outputs.length; i++) {
        outputs.push({
            amount: transfer.outputs[i].amount,
            address: transfer.outputs[i].omniAddress
        });
    }

    return await signer.signTypedData(DOMAIN, EIP712_TRANSFER_TYPES, {
        asset_id: transfer.assetId,
        inputs,
        outputs,
        fee_inputs,
        fee_outputs
    });
}

export function encodeDeploy(deploy: Deploy) {
    let deployData = [
        [
            deploy.metadata.salt,
            deploy.metadata.name,
            deploy.metadata.deployer,
            deploy.metadata.totalSupply,
            deploy.metadata.mintAmount,
            deploy.metadata.price
        ],
        deploy.signature,
        deploy.feeInputs.map((input: Input) => [
            input.txid,
            input.index,
            input.amount,
            input.omniAddress
        ]),
        deploy.feeOutputs.map((output: Output) => [
            output.omniAddress,
            output.amount
        ])
    ];
    const encoded = hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ABI_DEPLOY_TYPE,
        [deployData]
    );
    return encoded;
}

export function encodeMint(mint: Mint) {
    let mintData = [
        mint.assetId,
        mint.signature,
        mint.outputs.map((output: Output) => [
            output.omniAddress,
            output.amount
        ]),
        mint.feeInputs.map((input: Input) => [
            input.txid,
            input.index,
            input.amount,
            input.omniAddress
        ]),
        mint.feeOutputs.map((output: Output) => [
            output.omniAddress,
            output.amount
        ])
    ];
    const encoded = hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ABI_MINT_TYPE,
        [mintData]
    );
    return encoded;
}

export function encodeTransfer(transfer: Transfer) {
    let transferData = [
        transfer.assetId,
        transfer.signature,
        transfer.inputs.map((input: Input) => [
            input.txid,
            input.index,
            input.amount,
            input.omniAddress
        ]),
        transfer.outputs.map((output: Output) => [
            output.omniAddress,
            output.amount
        ]),
        transfer.feeInputs.map((input: Input) => [
            input.txid,
            input.index,
            input.amount,
            input.omniAddress
        ]),
        transfer.feeOutputs.map((output: Output) => [
            output.omniAddress,
            output.amount
        ])
    ];
    const encoded = hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ABI_TRANSFER_TYPE,
        [transferData]
    );
    return encoded;
}