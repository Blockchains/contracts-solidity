const { expect } = require('chai');
const { expectRevert, expectEvent, constants, BN } = require('@openzeppelin/test-helpers');

const { ETH_RESERVE_ADDRESS, registry } = require('./helpers/Constants');
const { ZERO_ADDRESS } = constants;

const ERC20Token = artifacts.require('ERC20Token');
const EtherToken = artifacts.require('EtherToken');
const SmartToken = artifacts.require('SmartToken');
const ContractRegistry = artifacts.require('ContractRegistry');
const ConverterFactory = artifacts.require('ConverterFactory');
const ConverterBase = artifacts.require('ConverterBase');
const IConverterAnchor = artifacts.require('IConverterAnchor');
const LiquidTokenConverter = artifacts.require('LiquidTokenConverter');
const LiquidityPoolV1Converter = artifacts.require('LiquidityPoolV1Converter');
const LiquidTokenConverterFactory = artifacts.require('LiquidTokenConverterFactory');
const LiquidityPoolV1ConverterFactory = artifacts.require('LiquidityPoolV1ConverterFactory');
const LiquidityPoolV2ConverterFactory = artifacts.require('LiquidityPoolV2ConverterFactory');
const LiquidityPoolV2ConverterAnchorFactory = artifacts.require('LiquidityPoolV2ConverterAnchorFactory');
const LiquidityPoolV2ConverterCustomFactory = artifacts.require('LiquidityPoolV2ConverterCustomFactory');
const ConverterRegistryData = artifacts.require('ConverterRegistryData');
const TestConverterRegistry = artifacts.require('TestConverterRegistry');

contract('ConverterRegistry', () => {
    let contractRegistry;
    let converterFactory;
    let converterRegistry;
    let converterRegistryData;

    before(async () => {
        // The following contracts are unaffected by the underlying tests, this can be shared.
        converterFactory = await ConverterFactory.new();

        await converterFactory.registerTypedConverterFactory((await LiquidTokenConverterFactory.new()).address);
        await converterFactory.registerTypedConverterFactory((await LiquidityPoolV1ConverterFactory.new()).address);
        await converterFactory.registerTypedConverterFactory((await LiquidityPoolV2ConverterFactory.new()).address);

        await converterFactory.registerTypedConverterAnchorFactory((await LiquidityPoolV2ConverterAnchorFactory.new()).address);
        await converterFactory.registerTypedConverterCustomFactory((await LiquidityPoolV2ConverterCustomFactory.new()).address);
    });

    beforeEach(async () => {
        contractRegistry = await ContractRegistry.new();

        converterRegistry = await TestConverterRegistry.new(contractRegistry.address);
        converterRegistryData = await ConverterRegistryData.new(contractRegistry.address);

        await contractRegistry.registerAddress(registry.CONVERTER_FACTORY, converterFactory.address);
        await contractRegistry.registerAddress(registry.CONVERTER_REGISTRY, converterRegistry.address);
        await contractRegistry.registerAddress(registry.CONVERTER_REGISTRY_DATA, converterRegistryData.address);
    });

    const testRemove = async (converter) => {
        const res = await converterRegistry.removeConverter(converter.address);

        return testEvents(res, converter, 'Removed');
    };

    const testEvents = async (res, converter, suffix) => {
        const anchor = await converter.anchor.call();
        const count = await converter.connectorTokenCount.call();

        expectEvent(res, `ConverterAnchor${suffix}`, { _anchor: anchor });

        if (count.gt(new BN(1))) {
            expectEvent(res, `LiquidityPool${suffix}`, { _liquidityPool: anchor });
        }
        else {
            expectEvent(res, `ConvertibleToken${suffix}`, { _convertibleToken: anchor, _smartToken: anchor });
        }

        for (let i = 0; count.gt(new BN(i)); ++i) {
            const connectorToken = await converter.connectorTokens.call(i);
            expectEvent(res, `ConvertibleToken${suffix}`, { _convertibleToken: connectorToken, _smartToken: anchor });
        }
    };

    describe('add converters', () => {
        const testAdd = async (converter) => {
            const res = await converterRegistry.addConverter(converter.address);

            return testEvents(res, converter, 'Added');
        };

        let converter1;
        let converter2;
        let converter3;
        let converter4;
        let converter5;
        let converter6;
        let converter7;
        let etherToken;
        let anchor1;
        let anchor2;
        let anchor3;
        let anchor4;
        let anchor5;
        let anchor6;
        let anchor7;
        let anchor8;
        let anchorA;
        let anchorC;
        let anchorE;

        beforeEach(async () => {
            etherToken = await EtherToken.new('Token0', 'TKN0');
            anchor1 = await SmartToken.new('Token1', 'TKN1', 18);
            anchor2 = await SmartToken.new('Token2', 'TKN2', 18);
            anchor3 = await SmartToken.new('Token3', 'TKN3', 18);
            anchor4 = await SmartToken.new('Token4', 'TKN4', 18);
            anchor5 = await SmartToken.new('Token5', 'TKN5', 18);
            anchor6 = await SmartToken.new('Token6', 'TKN6', 18);
            anchor7 = await SmartToken.new('Token7', 'TKN7', 18);
            anchor8 = await SmartToken.new('Token8', 'TKN8', 18);
            anchorA = await SmartToken.new('TokenA', 'TKNA', 18);
            anchorC = await SmartToken.new('TokenC', 'TKNC', 18);
            anchorE = await SmartToken.new('TokenE', 'TKNE', 18);

            converter1 = await LiquidTokenConverter.new(anchor1.address, contractRegistry.address, 0);
            converter2 = await LiquidityPoolV1Converter.new(anchor2.address, contractRegistry.address, 0);
            converter3 = await LiquidityPoolV1Converter.new(anchor3.address, contractRegistry.address, 0);
            converter4 = await LiquidityPoolV1Converter.new(anchor4.address, contractRegistry.address, 0);
            converter5 = await LiquidityPoolV1Converter.new(anchor5.address, contractRegistry.address, 0);
            converter6 = await LiquidityPoolV1Converter.new(anchor6.address, contractRegistry.address, 0);
            converter7 = await LiquidityPoolV1Converter.new(anchor7.address, contractRegistry.address, 0);

            await converter1.addReserve(etherToken.address, 0x1000);
            await converter2.addReserve(anchor4.address, 0x2400);
            await converter3.addReserve(anchor6.address, 0x3600);
            await converter4.addReserve(anchor8.address, 0x4800);
            await converter5.addReserve(anchorA.address, 0x5A00);
            await converter6.addReserve(anchorC.address, 0x6C00);
            await converter7.addReserve(anchorE.address, 0x7E00);

            await converter2.addReserve(anchor1.address, 0x2100);
            await converter3.addReserve(anchor1.address, 0x3100);
            await converter4.addReserve(anchor1.address, 0x4100);
            await converter5.addReserve(anchor1.address, 0x5100);
            await converter6.addReserve(anchor1.address, 0x6100);
            await converter7.addReserve(anchor2.address, 0x7200);

            await anchor1.transferOwnership(converter1.address);
            await anchor2.transferOwnership(converter2.address);
            await anchor3.transferOwnership(converter3.address);
            await anchor4.transferOwnership(converter4.address);
            await anchor5.transferOwnership(converter5.address);
            await anchor6.transferOwnership(converter6.address);
            await anchor7.transferOwnership(converter7.address);

            await converter1.acceptAnchorOwnership();
            await converter2.acceptAnchorOwnership();
            await converter3.acceptAnchorOwnership();
            await converter4.acceptAnchorOwnership();
            await converter5.acceptAnchorOwnership();
            await converter6.acceptAnchorOwnership();
            await converter7.acceptAnchorOwnership();
        });

        const addConverters = async () => {
            await testAdd(converter1);
            await testAdd(converter2);
            await testAdd(converter3);
            await testAdd(converter4);
            await testAdd(converter5);
            await testAdd(converter6);
            await testAdd(converter7);
        };

        const removeConverters = async () => {
            await testRemove(converter1);
            await testRemove(converter2);
            await testRemove(converter3);
            await testRemove(converter4);
            await testRemove(converter5);
            await testRemove(converter6);
            await testRemove(converter7);
        };

        it('should add converters', async () => {
            await addConverters();
        });

        context('with registered converters', async () => {
            beforeEach(async () => {
                await addConverters();
            });

            it('should not allow to add the same converter twice', async () => {
                await expectRevert(converterRegistry.addConverter(converter1.address), 'ERR_INVALID_ITEM');
                await expectRevert(converterRegistry.addConverter(converter2.address), 'ERR_INVALID_ITEM');
                await expectRevert(converterRegistry.addConverter(converter3.address), 'ERR_INVALID_ITEM');
                await expectRevert(converterRegistry.addConverter(converter4.address), 'ERR_INVALID_ITEM');
                await expectRevert(converterRegistry.addConverter(converter5.address), 'ERR_INVALID_ITEM');
                await expectRevert(converterRegistry.addConverter(converter6.address), 'ERR_INVALID_ITEM');
                await expectRevert(converterRegistry.addConverter(converter7.address), 'ERR_INVALID_ITEM');
            });

            it('should find liquidity pool by its configuration', async () => {
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([etherToken.address], [0x1000]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor4.address], [0x2400, 0x2100]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor6.address], [0x3600, 0x3100]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchorA.address], [0x5A00, 0x5100]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor8.address], [0x4800, 0x4100]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchorC.address], [0x6C00, 0x6100]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor2.address, anchorE.address], [0x7E00, 0x7200]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor4.address, anchor1.address], [0x2100, 0x2400]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor6.address, anchor1.address], [0x3100, 0x3600]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor8.address, anchor1.address], [0x4100, 0x4800]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorA.address, anchor1.address], [0x5100, 0x5A00]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorC.address, anchor1.address], [0x6100, 0x6C00]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorE.address, anchor2.address], [0x7200, 0x7E00]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor4.address], [0x2100, 0x2400]))
                    .to.eql(anchor2.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor6.address], [0x3100, 0x3600]))
                    .to.eql(anchor3.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor8.address], [0x4100, 0x4800]))
                    .to.eql(anchor4.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchorA.address], [0x5100, 0x5A00]))
                    .to.eql(anchor5.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchorC.address], [0x6100, 0x6C00]))
                    .to.eql(anchor6.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor2.address, anchorE.address], [0x7200, 0x7E00]))
                    .to.eql(anchor7.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor4.address, anchor1.address], [0x2400, 0x2100]))
                    .to.eql(anchor2.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor6.address, anchor1.address], [0x3600, 0x3100]))
                    .to.eql(anchor3.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor8.address, anchor1.address], [0x4800, 0x4100]))
                    .to.eql(anchor4.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorA.address, anchor1.address], [0x5A00, 0x5100]))
                    .to.eql(anchor5.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorC.address, anchor1.address], [0x6C00, 0x6100]))
                    .to.eql(anchor6.address);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorE.address, anchor2.address], [0x7E00, 0x7200]))
                    .to.eql(anchor7.address);
            });

            it('should return a list of converters for a list of anchors', async () => {
                const tokens = [anchor1.address, anchor2.address, anchor3.address];
                const expected = [converter1.address, converter2.address, converter3.address];
                const actual = await converterRegistry.getConvertersByAnchors.call(tokens);
                expect(actual).to.deep.eql(expected);
            });

            it('should remove converters', async () => {
                await removeConverters();
            });

            context('with unregistered converters', async () => {
                beforeEach(async () => {
                    await removeConverters();
                });

                it('should not allow to remove the same converter twice', async () => {
                    await expectRevert(converterRegistry.removeConverter(converter1.address), 'ERR_INVALID_ITEM');
                    await expectRevert(converterRegistry.removeConverter(converter2.address), 'ERR_INVALID_ITEM');
                    await expectRevert(converterRegistry.removeConverter(converter3.address), 'ERR_INVALID_ITEM');
                    await expectRevert(converterRegistry.removeConverter(converter4.address), 'ERR_INVALID_ITEM');
                    await expectRevert(converterRegistry.removeConverter(converter5.address), 'ERR_INVALID_ITEM');
                    await expectRevert(converterRegistry.removeConverter(converter6.address), 'ERR_INVALID_ITEM');
                    await expectRevert(converterRegistry.removeConverter(converter7.address), 'ERR_INVALID_ITEM');
                });

                it('should not be able to find liquidity pool by its configuration', async () => {
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([etherToken.address], [0x1000]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor4.address], [0x2400, 0x2100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor6.address], [0x3600, 0x3100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor8.address], [0x4800, 0x4100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchorA.address], [0x5A00, 0x5100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchorC.address], [0x6C00, 0x6100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor2.address, anchorE.address], [0x7E00, 0x7200]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor4.address, anchor1.address], [0x2100, 0x2400]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor6.address, anchor1.address], [0x3100, 0x3600]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor8.address, anchor1.address], [0x4100, 0x4800]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorA.address, anchor1.address], [0x5100, 0x5A00]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorC.address, anchor1.address], [0x6100, 0x6C00]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorE.address, anchor2.address], [0x7200, 0x7E00]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor4.address], [0x2100, 0x2400]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor6.address], [0x3100, 0x3600]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchor8.address], [0x4100, 0x4800]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchorA.address], [0x5100, 0x5A00]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor1.address, anchorC.address], [0x6100, 0x6C00]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor2.address, anchorE.address], [0x7200, 0x7E00]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor4.address, anchor1.address], [0x2400, 0x2100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor6.address, anchor1.address], [0x3600, 0x3100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchor8.address, anchor1.address], [0x4800, 0x4100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorA.address, anchor1.address], [0x5A00, 0x5100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorC.address, anchor1.address], [0x6C00, 0x6100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([anchorE.address, anchor2.address], [0x7E00, 0x7200]))
                        .to.eql(ZERO_ADDRESS);
                });
            });
        });
    });

    describe('create converters', () => {
        const testCreate = async (type, name, symbol, decimals, maxConversionFee, reserveTokens, reserveWeights) => {
            const res = await converterRegistry.newConverter(type, name, symbol, decimals, maxConversionFee,
                reserveTokens, reserveWeights);
            const converter = await ConverterBase.at(await converterRegistry.createdConverter.call());
            await testEvents(res, converter, 'Added');

            await converter.acceptOwnership();
        };

        let erc20Token1;
        let erc20Token2;

        beforeEach(async () => {
            erc20Token1 = await ERC20Token.new('ERC20Token1', 'ET1', 18, 1000000000);
            erc20Token2 = await ERC20Token.new('ERC20Token2', 'ET2', 18, 1000000000);
        });

        const createConverters = async () => {
            await testCreate(0, 'Liquid1', 'ST1', 18, 0, [ETH_RESERVE_ADDRESS], [0x1000]);
            await testCreate(0, 'Liquid2', 'ST2', 18, 0, [erc20Token1.address], [0x2100]);
            await testCreate(0, 'Liquid3', 'ST3', 18, 0, [erc20Token2.address], [0x3200]);
            await testCreate(1, 'Pool1', 'ST4', 18, 0, [ETH_RESERVE_ADDRESS, erc20Token1.address], [0x4000, 0x4100]);
            await testCreate(1, 'Pool2', 'ST5', 18, 0, [erc20Token1.address, erc20Token2.address], [0x5100, 0x5200]);
            await testCreate(1, 'Pool3', 'ST6', 18, 0, [erc20Token2.address, ETH_RESERVE_ADDRESS], [0x6200, 0x6000]);
            await testCreate(2, 'Pool4', 'ST7', 18, 0, [ETH_RESERVE_ADDRESS, erc20Token1.address], [0x4000, 0x4100]);
            await testCreate(2, 'Pool5', 'ST8', 18, 0, [erc20Token1.address, erc20Token2.address], [0x5100, 0x5200]);
            await testCreate(2, 'Pool6', 'ST9', 18, 0, [erc20Token2.address, ETH_RESERVE_ADDRESS], [0x6200, 0x6000]);
        };

        it('should create converters', async () => {
            await createConverters();
        });

        context('with created converters', async () => {
            const removeConverters = async () => {
                for (const converter of converters) {
                    await testRemove(converter);
                }
            };

            let converters;
            let anchors;

            beforeEach(async () => {
                await createConverters();

                anchors = await converterRegistry.getAnchors();
                const converterAnchors = await Promise.all(anchors.map(anchor => IConverterAnchor.at(anchor)));
                const converterAddresses = await Promise.all(converterAnchors.map(anchor => anchor.owner.call()));
                converters = await Promise.all(converterAddresses.map(address => ConverterBase.at(address)));
            });

            it('should not allow to add the same converter twice', async () => {
                for (const converter of converters) {
                    await expectRevert(converterRegistry.addConverter(converter.address), 'ERR_INVALID_ITEM');
                }
            });

            it('should find liquidity pool by its configuration', async () => {
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([ETH_RESERVE_ADDRESS], [0x1000]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([erc20Token1.address], [0x2100]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([erc20Token2.address], [0x3200]))
                    .to.eql(ZERO_ADDRESS);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([ETH_RESERVE_ADDRESS, erc20Token1.address], [0x4000, 0x4100]))
                    .to.eql(anchors[3]);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([erc20Token1.address, erc20Token2.address], [0x5100, 0x5200]))
                    .to.eql(anchors[4]);
                expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([erc20Token2.address, ETH_RESERVE_ADDRESS], [0x6200, 0x6000]))
                    .to.eql(anchors[5]);
            });

            it('should return a list of converters for a list of anchors', async () => {
                expect(await converterRegistry.getConvertersByAnchors.call(anchors)).to.have.members(converters.map(converter => converter.address));
            });

            it('should remove converters', async () => {
                await removeConverters();
            });

            context('with removed converters', async () => {
                beforeEach(async () => {
                    await removeConverters();
                });

                it('should not allow to remove the same converter twice', async () => {
                    for (const converter of converters) {
                        await expectRevert(converterRegistry.removeConverter(converter.address), 'ERR_INVALID_ITEM');
                    }
                });

                it('should not be able to find liquidity pool by its configuration', async () => {
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([ETH_RESERVE_ADDRESS], [0x1000]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([erc20Token1.address], [0x2100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([erc20Token2.address], [0x3200]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([ETH_RESERVE_ADDRESS, erc20Token1.address], [0x4000, 0x4100]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([erc20Token1.address, erc20Token2.address], [0x5100, 0x5200]))
                        .to.eql(ZERO_ADDRESS);
                    expect(await converterRegistry.getLiquidityPoolByReserveConfig.call([erc20Token2.address, ETH_RESERVE_ADDRESS], [0x6200, 0x6000]))
                        .to.eql(ZERO_ADDRESS);
                });
            });
        });
    });
});
