// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';
import { makeIssuerKit } from '@agoric/ertp';

import {
  getStableInputPrice,
  getStableOutputPrice,
} from '../../../src/contractSupport/index.js';

import { getInputPrice } from '../../../src/contractSupport/index.js';

const coins = ['RUN', 'USDT', 'DAI'];
const values = [100000000n, 1000000n, 1000000n];
let brands = coins.map(coin => makeIssuerKit(coin).brand);

const createTokenAmounts = () => {
  let poolAmounts = [];
  poolAmounts = brands.map((brand, i) => AmountMath.make(brand, values[i]));
  return poolAmounts;
};

const testGetStableInputPrice = (
  t,
  { inputAmount, tokenIndexFrom, tokenIndexTo, centralTokenIndex, poolValues },
  expectedOutput,
) => {
  const output = getStableInputPrice(
    inputAmount,
    tokenIndexFrom,
    tokenIndexTo,
    centralTokenIndex,
    poolValues,
  );
  console.log(output);
  t.deepEqual(output, output);
};

const testGetStableOutputPrice = (
  t,
  { outputAmount, tokenIndexFrom, tokenIndexTo, centralTokenIndex, poolValues },
  expectedOutput,
) => {
  const output = getStableOutputPrice(
    outputAmount,
    tokenIndexFrom,
    tokenIndexTo,
    centralTokenIndex,
    poolValues,
  );
  console.log(output);
  t.deepEqual(output, output);
};

test('Test InputPriceFunction() : Code with Amounts', t => {
  const input = {
    inputAmount: AmountMath.make(brands[1], 1000n),
    tokenIndexFrom: 1,
    tokenIndexTo: 2,
    centralTokenIndex: 0,
    poolValues: createTokenAmounts(),
  };

  const expectedOutput = 0n;
  testGetStableInputPrice(t, input, expectedOutput);
});

test('Test OutputPriceFunction() : Code with Amounts', t => {
  const input = {
    outputAmount: AmountMath.make(brands[2], 1000n),
    tokenIndexFrom: 1,
    tokenIndexTo: 2,
    centralTokenIndex: 0,
    poolValues: createTokenAmounts(),
  };
  const expectedOutput = 0n;
  testGetStableOutputPrice(t, input, expectedOutput);
});
