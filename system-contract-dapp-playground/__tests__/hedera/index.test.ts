/*-
 *
 * Hedera Smart Contracts
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { ContractFactory } from 'ethers';
import { deploySmartContract } from '@/api/hedera';
import { HederaSmartContractResult } from '@/types/interfaces';
import { HEDERA_SMART_CONTRACTS_ASSETS } from '@/utils/constants';

// Mock ethers
jest.mock('ethers', () => {
  const actualEthers = jest.requireActual('ethers');
  return {
    ...actualEthers,
    ContractFactory: jest.fn(),
  };
});

// Mock the getWalletProvider function
jest.mock('../../src/api/wallet', () => {
  const actualModule = jest.requireActual('../../src/api/wallet');

  return {
    ...actualModule,
    getWalletProvider: jest.fn().mockImplementation(() => ({
      err: null,
      walletProvider: { getSigner: jest.fn() },
    })),
  };
});

describe('deploySmartContract', () => {
  beforeEach(() => {
    (ContractFactory as unknown as jest.Mock).mockClear();
  });

  it('should deploy the smart contract', async () => {
    // prepare states
    const deployParams = [100];
    const contractAddr = '0x8f18eCFeC4dB88ACe84dD1c8d11eBFeDd9274324';
    const contractABI = HEDERA_SMART_CONTRACTS_ASSETS.EXCHANGE_RATE.contractABI;
    const contractBytecode = HEDERA_SMART_CONTRACTS_ASSETS.EXCHANGE_RATE.contractBytecode;

    // mock contractDeployTx
    const mockContractDeployTx = {
      getAddress: jest.fn().mockResolvedValue(contractAddr),
    };

    // mock contract
    const mockContract = {
      deploy: jest.fn().mockResolvedValue(mockContractDeployTx),
    };

    // mock contract factory
    (ContractFactory as unknown as jest.Mock).mockImplementation(() => mockContract);

    // execute deploySmartContract API
    const result: HederaSmartContractResult = await deploySmartContract(
      contractABI,
      contractBytecode,
      deployParams
    );

    // validation
    expect(result.err).toBeNull;
    expect(deploySmartContract).toBeCalled;
    expect(result.contractAddress).toEqual(contractAddr);
    expect(mockContractDeployTx.getAddress).toHaveBeenCalled();
    expect(mockContract.deploy).toHaveBeenCalledWith(...deployParams, { gasLimit: 4_000_000 });
  });
});