/*-
 *
 * Hedera Smart Contracts
 *
 * Copyright (C) 2024 Hedera Hashgraph, LLC
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

import {
  MirrorNodeContract,
  MirrorNodeContractResponse,
  ContractCallData,
} from '../../../src/schemas/MirrorNodeSchemas';
import { ByteCodeAnalyzer } from '../../../src/services/byteCodeAnalyzer';
import { ContractScannerService } from '../../../src/services/contractScanner';
import constants from '../../../src/utils/constants';
import testConstants from '../utils/constants';
import { jest } from '@jest/globals';

describe('ByteCodeAnalyzer', () => {
  let byteCodeAnalyzer: ByteCodeAnalyzer;
  let contractScannerService: ContractScannerService;
  const mockContracts: MirrorNodeContract[] = testConstants.MOCK_MN_CONTRACTS;
  const mockContractCallResponse = testConstants.MOCK_CONTRACT_CALL_RESPONSE;
  const mockValidMirrorNodeUrl = 'mock-mirror-node.com';
  const mockValidMirrorNodeUrlWeb3 = 'mock-mirror-node-web3.com';

  beforeEach(() => {
    byteCodeAnalyzer = new ByteCodeAnalyzer();
    contractScannerService = new ContractScannerService(
      mockValidMirrorNodeUrl,
      mockValidMirrorNodeUrlWeb3
    );
  });

  describe('categorizeERCContracts', () => {
    it('should categorize contracts into ERC20 and ERC721', async () => {
      const expectedErc20Object = {
        contractId: mockContracts[0].contract_id,
        address: mockContracts[0].evm_address,
        name: mockContractCallResponse.erc20.name.decodedValue,
        symbol: mockContractCallResponse.erc20.symbol.decodedValue,
        decimals: mockContractCallResponse.erc20.decimals.decodedValue,
        totalSupply: mockContractCallResponse.erc20.totalSupply.decodedValue,
      };
      const expectedErc721Object = {
        contractId: mockContracts[1].contract_id,
        address: mockContracts[1].evm_address,
        name: mockContractCallResponse.erc721.name.decodedValue,
        symbol: mockContractCallResponse.erc721.symbol.decodedValue,
      };

      jest
        .spyOn(contractScannerService, 'fetchContractObject')
        .mockImplementation(async (contractId) => {
          if (contractId === '0.0.1013') {
            return {
              ...mockContracts[0],
              bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
              runtime_bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
            };
          } else if (contractId === '0.0.1014') {
            return {
              ...mockContracts[1],
              bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
              runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
            };
          }
          return null;
        });

      jest
        .spyOn(byteCodeAnalyzer, 'analyzeErcContract' as any)
        .mockImplementation(async (ercId) => {
          if (ercId === 'ERC20') {
            return expectedErc20Object;
          } else if (ercId === 'ERC721') {
            return expectedErc721Object;
          }
          return null;
        });

      const result = await byteCodeAnalyzer.categorizeERCContracts(
        contractScannerService,
        mockContracts
      );

      expect(result.erc20Contracts).toHaveLength(1);
      expect(result.erc721Contracts).toHaveLength(1);
      expect(result.erc20Contracts[0]).toEqual(expectedErc20Object);
      expect(result.erc721Contracts[0]).toEqual(expectedErc721Object);
    });

    it('should skip contracts with missing data', async () => {
      // Mock the fetchContractObject method to return null
      jest
        .spyOn(contractScannerService, 'fetchContractObject')
        .mockResolvedValue(null);
      const result = await byteCodeAnalyzer.categorizeERCContracts(
        contractScannerService,
        mockContracts
      );
      expect(result.erc20Contracts).toHaveLength(0);
      expect(result.erc721Contracts).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(contractScannerService, 'fetchContractObject')
        .mockImplementation(async () => {
          throw new Error('Fetch error');
        });
      const result = await byteCodeAnalyzer.categorizeERCContracts(
        contractScannerService,
        mockContracts
      );
      expect(result.erc20Contracts).toHaveLength(0);
      expect(result.erc721Contracts).toHaveLength(0);
    });
  });

  describe('analyzeErcContract', () => {
    it('should return ERC20 token info for ERC20 contracts', async () => {
      const expectedTokenInfoObject = {
        contractId: mockContracts[0].contract_id,
        address: mockContracts[0].evm_address,
        name: mockContractCallResponse.erc20.name.decodedValue,
        symbol: mockContractCallResponse.erc20.symbol.decodedValue,
        decimals: mockContractCallResponse.erc20.decimals.decodedValue,
        totalSupply: mockContractCallResponse.erc20.totalSupply.decodedValue,
      };

      jest
        .spyOn(byteCodeAnalyzer, 'getErcTokenInfo' as any)
        .mockResolvedValueOnce(expectedTokenInfoObject);

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[0],
        bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).analyzeErcContract(
        'ERC20',
        mockContractResponse,
        contractScannerService,
        constants.ERC20_TOKEN_INFO_SELECTORS
      );

      expect(result).toEqual(expectedTokenInfoObject);
    });

    it('should return ERC721 token info for ERC721 contracts', async () => {
      const expectedTokenInfoObject = {
        contractId: mockContracts[1].contract_id,
        address: mockContracts[1].evm_address,
        name: mockContractCallResponse.erc721.name.decodedValue,
        symbol: mockContractCallResponse.erc721.symbol.decodedValue,
      };

      jest
        .spyOn(byteCodeAnalyzer, 'getErcTokenInfo' as any)
        .mockResolvedValueOnce(expectedTokenInfoObject);

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[1],
        bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).analyzeErcContract(
        'ERC721',
        mockContractResponse,
        contractScannerService,
        constants.ERC721_TOKEN_INFO_SELECTORS
      );

      expect(result).toEqual(expectedTokenInfoObject);
    });

    it('should return null if the fails to get token info', async () => {
      jest
        .spyOn(byteCodeAnalyzer, 'getErcTokenInfo' as any)
        .mockRejectedValue(new Error('Mocked Error'));

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[1],
        bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).analyzeErcContract(
        'ERC721',
        mockContractResponse,
        contractScannerService,
        constants.ERC721_TOKEN_INFO_SELECTORS
      );

      expect(result).toBeNull();
    });
  });

  describe('getErcTokenInfo', () => {
    it('should return ERC20 token info for ERC20 contracts', async () => {
      jest
        .spyOn(contractScannerService, 'contractCallRequest')
        .mockImplementation(async (callData: ContractCallData) => {
          for (const field of [
            'name',
            'symbol',
            'decimals',
            'totalSupply',
          ] as const) {
            if (
              callData.data === mockContractCallResponse.erc20[field].sighash
            ) {
              return mockContractCallResponse.erc20[field].value;
            }
          }

          return null;
        });

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[0],
        bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).getErcTokenInfo(
        contractScannerService,
        mockContractResponse,
        constants.ERC20_TOKEN_INFO_SELECTORS
      );

      expect(result).toEqual({
        contractId: mockContracts[0].contract_id,
        address: mockContracts[0].evm_address,
        name: mockContractCallResponse.erc20.name.decodedValue,
        symbol: mockContractCallResponse.erc20.symbol.decodedValue,
        decimals: mockContractCallResponse.erc20.decimals.decodedValue,
        totalSupply: mockContractCallResponse.erc20.totalSupply.decodedValue,
      });
    });

    it('should return ERC721 token info for ERC721 contracts', async () => {
      jest
        .spyOn(contractScannerService, 'contractCallRequest')
        .mockImplementation(async (callData: ContractCallData) => {
          for (const field of ['name', 'symbol'] as const) {
            if (
              callData.data === mockContractCallResponse.erc721[field].sighash
            ) {
              return mockContractCallResponse.erc721[field].value;
            }
          }
          return null;
        });

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[1],
        bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).getErcTokenInfo(
        contractScannerService,
        mockContractResponse,
        constants.ERC721_TOKEN_INFO_SELECTORS
      );

      expect(result).toEqual({
        contractId: mockContracts[1].contract_id,
        address: mockContracts[1].evm_address,
        name: mockContractCallResponse.erc721.name.decodedValue,
        symbol: mockContractCallResponse.erc721.symbol.decodedValue,
      });
    });

    it('should NOT throw an error if the contractCallRequest return null tokenInfoResponse', async () => {
      jest
        .spyOn(contractScannerService, 'contractCallRequest')
        .mockResolvedValue(null);

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[1],
        bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
      };

      const tokenInfo = await (byteCodeAnalyzer as any).getErcTokenInfo(
        contractScannerService,
        mockContractResponse,
        constants.ERC721_TOKEN_INFO_SELECTORS
      );

      expect(tokenInfo).toEqual({
        contractId: mockContracts[1].contract_id,
        address: mockContracts[1].evm_address,
        name: null,
        symbol: null,
      });
    });
  });

  describe('isErc', () => {
    enum ERCID {
      ERC20 = 'ERC20',
      ERC721 = 'ERC721',
    }
    const legitimateErc20Bytecode =
      '0x608060405234801561001057600080fd5b50600436106101a95760003560e01c80635c975abb116100f957806395d89b4111610097578063d505accf11610071578063d505accf14610366578063d547741f14610379578063dd62ed3e1461038c578063f5b541a6146103c557600080fd5b806395d89b4114610343578063a217fddf1461034b578063a9059cbb1461035357600080fd5b80637ecebe00116100d35780637ecebe00146102fa5780638456cb591461030d57806384b0196e1461031557806391d148541461033057600080fd5b80635c975abb146102b357806370a08231146102be57806379cc6790146102e757600080fd5b80632f2ff15d1161016657806336568abe1161014057806336568abe146102725780633f4ba83a1461028557806340c10f191461028d57806342966c68146102a057600080fd5b80632f2ff15d14610246578063313ce5671461025b5780633644e5151461026a57600080fd5b806301ffc9a7146101ae57806306fdde03146101d6578063095ea7b3146101eb57806318160ddd146101fe57806323b872dd14610210578063248a9ca314610223575b600080fd5b6101c16101bc366004611208565b6103da565b60405190151581526020015b60405180910390f35b6101de610411565b6040516101cd919061127f565b6101c16101f93660046112ae565b6104a3565b6002545b6040519081526020016101cd565b6101c161021e3660046112d8565b6104bb565b610202610231366004611314565b60009081526006602052604090206001015490565b61025961025436600461132d565b6104df565b005b604051601281526020016101cd565b61020261050a565b61025961028036600461132d565b610519565b610259610551565b61025961029b3660046112ae565b610574565b6102596102ae366004611314565b610596565b60055460ff166101c1565b6102026102cc366004611359565b6001600160a01b031660009081526020819052604090205490565b6102596102f53660046112ae565b6105a0565b610202610308366004611359565b6105b9565b6102596105d7565b61031d6105f7565b6040516101cd9796959493929190611374565b6101c161033e36600461132d565b61063d565b6101de610668565b610202600081565b6101c16103613660046112ae565b610677565b61025961037436600461140d565b610685565b61025961038736600461132d565b6107c4565b61020261039a366004611480565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b61020260008051602061151c83398151915281565b60006001600160e01b03198216637965db0b60e01b148061040b57506301ffc9a760e01b6001600160e01b03198316145b92915050565b606060038054610420906114aa565b80601f016020809104026020016040519081016040528092919081815260200182805461044c906114aa565b80156104995780601f1061046e57610100808354040283529160200191610499565b820191906000526020600020905b81548152906001019060200180831161047c57829003601f168201915b5050505050905090565b6000336104b18185856107e9565b5060019392505050565b6000336104c98582856107f6565b6104d485858561086e565b506001949350505050565b6000828152600660205260409020600101546104fa816108cd565b61050483836108d7565b50505050565b600061051461096b565b905090565b6001600160a01b03811633146105425760405163334bd91960e11b815260040160405180910390fd5b61054c8282610a96565b505050565b60008051602061151c833981519152610569816108cd565b610571610b03565b50565b60008051602061151c83398151915261058c816108cd565b61054c8383610b55565b6105713382610b8b565b6105ab8233836107f6565b6105b58282610b8b565b5050565b6001600160a01b03811660009081526009602052604081205461040b565b60008051602061151c8339815191526105ef816108cd565b610571610bc1565b60006060806000806000606061060b610bfe565b610613610c2b565b60408051600080825260208201909252600f60f81b9b939a50919850469750309650945092509050565b60009182526006602090815260408084206001600160a01b0393909316845291905290205460ff1690565b606060048054610420906114aa565b6000336104b181858561086e565b834211156106ae5760405163313c898160e11b8152600481018590526024015b60405180910390fd5b60007f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98888886106fb8c6001600160a01b0316600090815260096020526040902080546001810190915590565b6040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810186905260e001604051602081830303815290604052805190602001209050600061075682610c58565b9050600061076682878787610c85565b9050896001600160a01b0316816001600160a01b0316146107ad576040516325c0072360e11b81526001600160a01b0380831660048301528b1660248201526044016106a5565b6107b88a8a8a6107e9565b50505050505050505050565b6000828152600660205260409020600101546107df816108cd565b6105048383610a96565b61054c8383836001610cb3565b6001600160a01b038381166000908152600160209081526040808320938616835292905220546000198114610504578181101561085f57604051637dc7a0d960e11b81526001600160a01b038416600482015260248101829052604481018390526064016106a5565b61050484848484036000610cb3565b6001600160a01b03831661089857604051634b637e8f60e11b8152600060048201526024016106a5565b6001600160a01b0382166108c25760405163ec442f0560e01b8152600060048201526024016106a5565b61054c838383610cc7565b6105718133610cda565b60006108e3838361063d565b6109635760008381526006602090815260408083206001600160a01b03861684529091529020805460ff1916600117905561091b3390565b6001600160a01b0316826001600160a01b0316847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a450600161040b565b50600061040b565b6000306001600160a01b037f00000000000000000000000068ff7eb885f8682033c8eaa1c042d31bdeda53ba161480156109c457507f000000000000000000000000000000000000000000000000000000000000012846145b156109ee57507f4a1267f1dccede2722970d8015baa8e79f91cf1b462e10dfcc4e5df0fd4f53b890565b610514604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201527f09b10ecd178092f7d5ffb6ff7acc2ef2e58c270ed139dbff386e29058ced58b4918101919091527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608201524660808201523060a082015260009060c00160405160208183030381529060405280519060200120905090565b6000610aa2838361063d565b156109635760008381526006602090815260408083206001600160a01b0386168085529252808320805460ff1916905551339286917ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b9190a450600161040b565b610b0b610d13565b6005805460ff191690557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa335b6040516001600160a01b03909116815260200160405180910390a1565b6001600160a01b038216610b7f5760405163ec442f0560e01b8152600060048201526024016106a5565b6105b560008383610cc7565b6001600160a01b038216610bb557604051634b637e8f60e11b8152600060048201526024016106a5565b6105b582600083610cc7565b610bc9610d38565b6005805460ff191660011790557f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258610b383390565b60606105147f576562334164766572746973696e67546f6b656e0000000000000000000000146007610d5c565b60606105147f31000000000000000000000000000000000000000000000000000000000000016008610d5c565b600061040b610c6561096b565b8360405161190160f01b8152600281019290925260228201526042902090565b600080600080610c9788888888610e07565b925092509250610ca78282610ed6565b50909695505050505050565b610cbb610d38565b61050484848484610f8f565b610ccf610d38565b61054c838383611064565b610ce4828261063d565b6105b55760405163e2517d3f60e01b81526001600160a01b0382166004820152602481018390526044016106a5565b60055460ff16610d3657604051638dfc202b60e01b815260040160405180910390fd5b565b60055460ff1615610d365760405163d93c066560e01b815260040160405180910390fd5b606060ff8314610d7657610d6f83611077565b905061040b565b818054610d82906114aa565b80601f0160208091040260200160405190810160405280929190818152602001828054610dae906114aa565b8015610dfb5780601f10610dd057610100808354040283529160200191610dfb565b820191906000526020600020905b815481529060010190602001808311610dde57829003601f168201915b5050505050905061040b565b600080807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0841115610e425750600091506003905082610ecc565b604080516000808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa158015610e96573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b038116610ec257506000925060019150829050610ecc565b9250600091508190505b9450945094915050565b6000826003811115610eea57610eea6114e4565b03610ef3575050565b6001826003811115610f0757610f076114e4565b03610f255760405163f645eedf60e01b815260040160405180910390fd5b6002826003811115610f3957610f396114e4565b03610f5a5760405163fce698f760e01b8152600481018290526024016106a5565b6003826003811115610f6e57610f6e6114e4565b036105b5576040516335e2f38360e21b8152600481018290526024016106a5565b6001600160a01b038416610fb95760405163e602df0560e01b8152600060048201526024016106a5565b6001600160a01b038316610fe357604051634a1406b160e11b8152600060048201526024016106a5565b6001600160a01b038085166000908152600160209081526040808320938716835292905220829055801561050457826001600160a01b0316846001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161105691815260200190565b60405180910390a350505050565b61106c610d38565b61054c8383836110b6565b60606000611084836111e0565b604080516020808252818301909252919250600091906020820181803683375050509182525060208101929092525090565b6001600160a01b0383166110e15780600260008282546110d691906114fa565b909155506111539050565b6001600160a01b038316600090815260208190526040902054818110156111345760405163391434e360e21b81526001600160a01b038516600482015260248101829052604481018390526064016106a5565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b03821661116f5760028054829003905561118e565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516111d391815260200190565b60405180910390a3505050565b600060ff8216601f81111561040b57604051632cd44ac360e21b815260040160405180910390fd5b60006020828403121561121a57600080fd5b81356001600160e01b03198116811461123257600080fd5b9392505050565b6000815180845260005b8181101561125f57602081850181015186830182015201611243565b506000602082860101526020601f19601f83011685010191505092915050565b6020815260006112326020830184611239565b80356001600160a01b03811681146112a957600080fd5b919050565b600080604083850312156112c157600080fd5b6112ca83611292565b946020939093013593505050565b6000806000606084860312156112ed57600080fd5b6112f684611292565b925061130460208501611292565b9150604084013590509250925092565b60006020828403121561132657600080fd5b5035919050565b6000806040838503121561134057600080fd5b8235915061135060208401611292565b90509250929050565b60006020828403121561136b57600080fd5b61123282611292565b60ff60f81b881681526000602060e0602084015261139560e084018a611239565b83810360408501526113a7818a611239565b606085018990526001600160a01b038816608086015260a0850187905284810360c08601528551808252602080880193509091019060005b818110156113fb578351835292840192918401916001016113df565b50909c9b505050505050505050505050565b600080600080600080600060e0888a03121561142857600080fd5b61143188611292565b965061143f60208901611292565b95506040880135945060608801359350608088013560ff8116811461146357600080fd5b9699959850939692959460a0840135945060c09093013592915050565b6000806040838503121561149357600080fd5b61149c83611292565b915061135060208401611292565b600181811c908216806114be57607f821691505b6020821081036114de57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052602160045260246000fd5b8082018082111561040b57634e487b7160e01b600052601160045260246000fdfe97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929a2646970667358221220d683924c64ddbd5a18ee54980071f9f9146d47f46b6a34f80ae75a51c2f80aae64736f6c63430008160033';
    const legitimateErc721Bytecode =
      '0x6080604081815260048036101561001557600080fd5b600092833560e01c90816301ffc9a714610c7f5750806306fdde0314610bb2578063081812fc14610b79578063095ea7b314610a7957806323b872dd14610a6157806342842e0e14610a3257806342966c68146108ac5780636352211e1461087c57806370a082311461080e578063715018a6146107a65780638da5cb5b1461077e57806395d89b4114610648578063a14481941461038d578063a22cb465146102d3578063b88d4fde1461023f578063c87b56dd146101ec578063e985e9c51461019a5763f2fde38b146100e957600080fd5b3461019657602060031936011261019657610102610d8f565b9061010b6110a9565b6001600160a01b038092169283156101675750506006548273ffffffffffffffffffffffffffffffffffffffff19821617600655167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e08380a380f35b908460249251917f1e4fbdf7000000000000000000000000000000000000000000000000000000008352820152fd5b8280fd5b5050346101e857806003193601126101e85760ff816020936101ba610d8f565b6101c2610daa565b6001600160a01b0391821683526005875283832091168252855220549151911615158152f35b5080fd5b509190346101e85760206003193601126101e85761020d61023b933561106e565b5081815161021a81610df5565b5280519161022783610df5565b825251918291602083526020830190610d4f565b0390f35b5090346101965760806003193601126101965761025a610d8f565b610262610daa565b60443591856064359567ffffffffffffffff87116101e857366023880112156101e8578601359561029e61029588610e63565b96519687610e40565b86865236602488830101116101e857866102d09760246020930183890137860101526102cb838383610e7f565b6110ed565b80f35b5090346101965780600319360112610196576102ed610d8f565b9060243591821515809303610389576001600160a01b031692831561035b5750338452600560205280842083855260205280842060ff1981541660ff8416179055519081527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c3160203392a380f35b8360249251917f5b08ba18000000000000000000000000000000000000000000000000000000008352820152fd5b8480fd5b50346101965781600319360112610196576103a6610d8f565b60249283356103b36110a9565b8151906103bf82610df5565b8682526001600160a01b03918285169485156106335782895260209360028552858a205416838782151592836105ee575b818d5260038852888d2060018154019055828d5260028852888d208273ffffffffffffffffffffffffffffffffffffffff198254161790557fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8d80a46105c0573b610459578780f35b908288886104b2899a9b9697989995895195869485947f150b7a0200000000000000000000000000000000000000000000000000000000998a875233908701528501526044840152608060648401526084830190610d4f565b0381868a5af1839181610564575b506105155750503d1561050d573d6104d781610e63565b906104e485519283610e40565b81528091833d92013e5b8051918261050a575050505191633250574960e11b8352820152fd5b01fd5b5060606104ee565b7fffffffff00000000000000000000000000000000000000000000000000000000919297969594935016036105535750505050388080808080808780f35b5191633250574960e11b8352820152fd5b9091508481813d83116105b9575b61057c8183610e40565b810103126105b557517fffffffff00000000000000000000000000000000000000000000000000000000811681036105b55790386104c0565b8380fd5b503d610572565b87878a8751917f73c6ac6e000000000000000000000000000000000000000000000000000000008352820152fd5b61061c836000526004602052604060002073ffffffffffffffffffffffffffffffffffffffff198154169055565b808d5260038852888d2060001981540190556103f0565b87878a875191633250574960e11b8352820152fd5b50913461077b578060031936011261077b5781519181600192600154938460011c9160018616958615610771575b6020968785108114610745578899509688969785829a52918260001461071e5750506001146106c2575b50505061023b92916106b3910385610e40565b51928284938452830190610d4f565b9190869350600183527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf65b82841061070657505050820101816106b361023b6106a0565b8054848a0186015288955087949093019281016106ed565b60ff19168782015293151560051b860190930193508492506106b3915061023b90506106a0565b60248360228c7f4e487b7100000000000000000000000000000000000000000000000000000000835252fd5b92607f1692610676565b80fd5b5050346101e857816003193601126101e8576020906001600160a01b03600654169051908152f35b833461077b578060031936011261077b576107bf6110a9565b806001600160a01b0360065473ffffffffffffffffffffffffffffffffffffffff198116600655167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e08280a380f35b50913461077b57602060031936011261077b576001600160a01b03610831610d8f565b1692831561084e5750806020938392526003845220549051908152f35b9060249251917f89c62b64000000000000000000000000000000000000000000000000000000008352820152fd5b50913461077b57602060031936011261077b57506001600160a01b036108a46020933561106e565b915191168152f35b508290346101e8576020908160031936011261019657803591828452600281526001600160a01b0391828686205416923315159081610984575b50505093600284958395949561093f575b85855252822073ffffffffffffffffffffffffffffffffffffffff1981541690557fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8280a480f35b61096d866000526004602052604060002073ffffffffffffffffffffffffffffffffffffffff198154169055565b8385526003815282852060001981540190556108f7565b816109e6575b50156109975780806108e6565b9350506109b2576024925191637e27328960e01b8352820152fd5b60449251917f177e802f00000000000000000000000000000000000000000000000000000000835233908301526024820152fd5b33851491508115610a15575b8115610a00575b508761098a565b858752828452878720541633149050876109f9565b8487526005845287872033885284528787205460ff1691506109f2565b5050346101e8576102d090610a4636610dc0565b91925192610a5384610df5565b8584526102cb838383610e7f565b833461077b576102d0610a7336610dc0565b91610e7f565b509034610196578060031936011261019657610a93610d8f565b91602435610aa08161106e565b33151580610b66575b80610b3e575b610b0f5781906001600160a01b03809616958691167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258880a4845260205282209073ffffffffffffffffffffffffffffffffffffffff1982541617905580f35b83517fa9fbf51f0000000000000000000000000000000000000000000000000000000081523381850152602490fd5b506001600160a01b0381168652600560205283862033875260205260ff848720541615610aaf565b50336001600160a01b0382161415610aa9565b50346101965760206003193601126101965781602093826001600160a01b039335610ba38161106e565b50825285522054169051908152f35b50913461077b578060031936011261077b578151918182549260018460011c9160018616958615610c75575b6020968785108114610745578899509688969785829a52918260001461071e575050600114610c1a5750505061023b92916106b3910385610e40565b91908693508280527f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5635b828410610c5d57505050820101816106b361023b6106a0565b8054848a018601528895508794909301928101610c44565b92607f1692610bde565b9250503461019657602060031936011261019657357fffffffff00000000000000000000000000000000000000000000000000000000811680910361019657602092507f80ac58cd000000000000000000000000000000000000000000000000000000008114908115610d25575b8115610cfb575b5015158152f35b7f01ffc9a70000000000000000000000000000000000000000000000000000000091501438610cf4565b7f5b5e139f0000000000000000000000000000000000000000000000000000000081149150610ced565b919082519283825260005b848110610d7b575050601f19601f8460006020809697860101520116010190565b602081830181015184830182015201610d5a565b600435906001600160a01b0382168203610da557565b600080fd5b602435906001600160a01b0382168203610da557565b6003196060910112610da5576001600160a01b03906004358281168103610da557916024359081168103610da5579060443590565b6020810190811067ffffffffffffffff821117610e1157604052565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b90601f601f19910116810190811067ffffffffffffffff821117610e1157604052565b67ffffffffffffffff8111610e1157601f01601f191660200190565b90916001600160a01b0380931692831561105657600092828452826020956002875260409684888820541696879133151580610fa7575b509060027fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9284610f62575b858352600381528b832060018154019055868352528981208473ffffffffffffffffffffffffffffffffffffffff1982541617905580a41692838303610f285750505050565b6064945051927f64283d7b000000000000000000000000000000000000000000000000000000008452600484015260248301526044820152fd5b610f90876000526004602052604060002073ffffffffffffffffffffffffffffffffffffffff198154169055565b848352600381528b83206000198154019055610ee2565b91939450915080611015575b15610fc357859291879138610eb6565b878688610fe0576024915190637e27328960e01b82526004820152fd5b60449151907f177e802f0000000000000000000000000000000000000000000000000000000082523360048301526024820152fd5b50338714801561103a575b80610fb35750858252600481523385898420541614610fb3565b5086825260058152878220338352815260ff8883205416611020565b6024604051633250574960e11b815260006004820152fd5b8060005260026020526001600160a01b0360406000205416908115611091575090565b60249060405190637e27328960e01b82526004820152fd5b6001600160a01b036006541633036110bd57565b60246040517f118cdaa7000000000000000000000000000000000000000000000000000000008152336004820152fd5b813b6110fa575b50505050565b6001600160a01b03949192939480931693604051937f150b7a0200000000000000000000000000000000000000000000000000000000928386523360048701521660248501526044840152608060648401528261115d6020966084830190610d4f565b039285816000958187895af184918161121f575b506111d0575050503d6000146111c8573d61118b81610e63565b906111996040519283610e40565b81528091843d92013e5b805192836111c35760248360405190633250574960e11b82526004820152fd5b019050fd5b5060606111a3565b9092507fffffffff0000000000000000000000000000000000000000000000000000000091945016036112075750388080806110f4565b60249060405190633250574960e11b82526004820152fd5b9091508681813d8311611270575b6112378183610e40565b8101031261038957517fffffffff0000000000000000000000000000000000000000000000000000000081168103610389579038611171565b503d61122d56fea264697066735822122083a7076874c7a6004f8b29edf014f26728e347a2add5e43d02b02caeda976ab964736f6c63430008190033';
    const nonErcBytecode =
      '0x6080604081815260048036101561001557600080fd5b600092833560e01c90816301';

    it('should correctly identify ERC-20 contract bytecode based on the presence of the required ERC-20 selectors and events', () => {
      const shouldBeErc20 = (byteCodeAnalyzer as any).isErc(
        ERCID.ERC20,
        legitimateErc20Bytecode
      );

      const shouldNotBeErc20WithErc721Bytecode = (
        byteCodeAnalyzer as any
      ).isErc(ERCID.ERC20, legitimateErc721Bytecode);

      const shouldNotBeErc20WithNonErcBytecode = (
        byteCodeAnalyzer as any
      ).isErc(ERCID.ERC20, nonErcBytecode);

      expect(shouldBeErc20).toBe(true);
      expect(shouldNotBeErc20WithErc721Bytecode).toBe(false);
      expect(shouldNotBeErc20WithNonErcBytecode).toBe(false);
    });

    it('should correctly identify ERC-721 contract bytecode based on the presence of the required ERC-721 selectors and events', () => {
      const shouldBeErc721 = (byteCodeAnalyzer as any).isErc(
        ERCID.ERC721,
        legitimateErc721Bytecode
      );

      const shouldNotBeErc20WithErc20Bytecode = (byteCodeAnalyzer as any).isErc(
        ERCID.ERC721,
        legitimateErc20Bytecode
      );

      const shouldNotBeErc721WithNonErcBytecode = (
        byteCodeAnalyzer as any
      ).isErc(ERCID.ERC721, nonErcBytecode);

      expect(shouldBeErc721).toBe(true);
      expect(shouldNotBeErc20WithErc20Bytecode).toBe(false);
      expect(shouldNotBeErc721WithNonErcBytecode).toBe(false);
    });

    it('should perform isErc method within a very small time threshold compared to regular regex-based searching', () => {
      // official isErc() method with Aho-Corasick algorithm
      const startTime = performance.now();
      const largeByteCode = '0x' + '00'.repeat(41120); // ~20KB

      // perform signature matching through official isErc() method
      (byteCodeAnalyzer as any).isErc(ERCID.ERC20, largeByteCode);

      const endTime = performance.now();
      const elapsedTime = endTime - startTime;
      const performanceThreshold = 3; // 3 milliseconds
      expect(elapsedTime).toBeLessThan(performanceThreshold);

      // regex-based approach
      const startTimeRegex = performance.now();
      const exampleErc721RegexPattern =
        /(?=.*dd62ed3e)(?=.*095ea7b3)(?=.*70a08231)(?=.*18160ddd)(?=.*a9059cbb)(?=.*23b872dd)(?=.*8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925)(?=.*ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef)/;
      exampleErc721RegexPattern.test(largeByteCode);
      const endTimeRegex = performance.now();
      const elapsedTimeRegex = endTimeRegex - startTimeRegex;
      const performanceThresholdRegex = 3600; // 3600 milliseconds
      expect(elapsedTimeRegex).toBeGreaterThan(performanceThresholdRegex);
    });
  });
});
