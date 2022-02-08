// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from './safeMath.js';

const { subtract, add, multiply, floorDivide, power } = natSafeMath;

const A = 1000;
const BASIS_POINTS = 10000n; // TODO change to 10_000n once tooling copes.
// const BASIS_POINTS = 1n; // TODO change to 10_000n once tooling copes.

/**
 * Calculations for constant product markets like Uniswap.
 * https://github.com/runtimeverification/verified-smart-contracts/blob/uniswap/uniswap/x-y-k.pdf
 */

/**
 * Contains the logic for calculating how much should be given
 * back to the user in exchange for what they sent in. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 *
 * @param {any} inputValue - the value of the asset sent
 * in to be swapped.
 * @param {number} inputReserveIndex - index of liquidity of inputReserve
 * in the reserves array.
 * @param {number} outputReserveIndex - index of liquidity of outputReserve
 * in the reserves array.
 * @param {[bigint]} reserves - Array of liquidities of each asset.Which is
 * passed from the contract.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee
 * is taken from inputValue
 * @returns {NatValue} outputValue - the current price, in value form
 *
 */

export const getInputPrice = (
  inputReserveIndex,
  outputReserveIndex,
  reserves,
  inputValue,
  feeBasisPoints = 30n,
) => {
  let number_of_coins = reserves.length;
  console.log('no:', number_of_coins);
  inputValue = Nat(inputValue);
  let inputReserve = Nat(reserves[inputReserveIndex]);
  let outputReserve = Nat(reserves[outputReserveIndex]);
  console.log('inputReserve:', inputReserve);
  console.log('outputReserve:', outputReserve);
  assert(inputValue > 0n, X`inputValue ${inputValue} must be positive`);
  assert(inputReserve > 0n, X`inputReserve ${inputReserve} must be positive`);
  assert(
    outputReserve > 0n,
    X`outputReserve ${outputReserve} must be positive`,
  );
  let sum = reserves.reduce((partialSum, x) => partialSum + x, 0n);
  let product = reserves.reduce((partialProduct, x) => partialProduct * x, 1n);
  const nn = Math.pow(number_of_coins, number_of_coins);
  const Ann = A * nn;
  console.log('Ann:', Ann);
  console.log('Sum:', sum);
  console.log('product:', product);
  let Dprev = sum;
  let D;
  for (let i = 0; i < 100; i++) {
    D = floorDivide(
      multiply(Ann, sum) -
        power(Dprev, number_of_coins + 1) / multiply(nn, product),
      Ann - 1,
    );
    console.log('D:', D);
    console.log('Dprev:', Dprev);
    if (D > Dprev) {
      if (D - Dprev <= 1) break;
    } else {
      if (Dprev - D <= 1) break;
    }
    Dprev = D;
  }
  reserves[inputReserveIndex] = inputValue + reserves[inputReserveIndex];
  // Calculate updated sum and product by adding the new tokens
  sum = reserves.reduce((partialSum, x) => partialSum + x, 0n);
  product = reserves.reduce((partialProduct, x) => partialProduct * x, 1n);
  const sumExclusiveOfOutputReserve = reserves
    .filter((item, i) => i != outputReserveIndex)
    .reduce((partialSum, x) => partialSum + x, 0n);
  const productExclusiveOfOutputReserve = reserves
    .filter((item, i) => i != outputReserveIndex)
    .reduce((partialSum, x) => partialSum + x, 0n);
  console.log('sumExclusiveOfOutput', sumExclusiveOfOutputReserve);
  let outputReserveVal = outputReserve;
  let newOutputReserveVal = 0n;
  for (let i = 0; i < 100; i++) {
    newOutputReserveVal =
      floorDivide(
        multiply(Ann - 1, D) +
          power(D, number_of_coins + 1) /
            multiply(
              nn,
              multiply(productExclusiveOfOutputReserve, outputReserveVal),
            ),
        Ann,
      ) - sumExclusiveOfOutputReserve;
    console.log('newOutputReserveVal:', newOutputReserveVal);
    console.log('outputReserveVal:', outputReserveVal);
    if (newOutputReserveVal > outputReserveVal) {
      if (newOutputReserveVal - outputReserveVal <= 1) break;
    } else {
      if (outputReserveVal - newOutputReserveVal <= 1) break;
    }
    outputReserveVal = newOutputReserveVal;
  }
  let outputValue = outputReserve - newOutputReserveVal;
  console.log('OutputValue:', outputValue);
  console.log(
    'At price:',
    (Number(outputValue) / Number(inputValue)).toFixed(10),
  );
  return 0n;
};

/**
 * Contains the logic for calculating how much should be taken
 * from the user in exchange for what they want to obtain. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 *
 * @param {any} outputValue - the value of the asset the user wants
 * to get
 * @param {any} inputReserve - the value in the liquidity
 * pool of the asset being spent
 * @param {any} outputReserve - the value in the liquidity
 * pool of the kind of asset to be sent out
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * outputValue
 * @returns {NatValue} inputValue - the value of input required to purchase output
 */
export const getOutputPrice = (
  outputValue,
  inputReserve,
  outputReserve,
  feeBasisPoints = 30n,
) => {
  outputValue = Nat(outputValue);
  inputReserve = Nat(inputReserve);
  outputReserve = Nat(outputReserve);

  assert(inputReserve > 0n, X`inputReserve ${inputReserve} must be positive`);
  assert(
    outputReserve > 0n,
    X`outputReserve ${outputReserve} must be positive`,
  );
  assert(
    outputReserve > outputValue,
    X`outputReserve ${outputReserve} must be greater than outputValue ${outputValue}`,
  );

  const oneMinusFeeScaled = subtract(BASIS_POINTS, feeBasisPoints);
  const numerator = multiply(multiply(outputValue, inputReserve), BASIS_POINTS);
  const denominator = multiply(
    subtract(outputReserve, outputValue),
    oneMinusFeeScaled,
  );
  return add(floorDivide(numerator, denominator), 1n);
};

// Calculate how many liquidity tokens we should be minting to send back to the
// user when adding liquidity. We provide new liquidity equal to the existing
// liquidity multiplied by the ratio of new central tokens to central tokens
// already held. If the current supply is zero, return the inputValue as the
// initial liquidity to mint is arbitrary.
/**
 *
 * @param {bigint} liqTokenSupply
 * @param {bigint} inputValue
 * @param {bigint} inputReserve
 * @returns {NatValue}
 */
export const calcLiqValueToMint = (
  liqTokenSupply,
  inputValue,
  inputReserve,
) => {
  liqTokenSupply = Nat(liqTokenSupply);
  inputValue = Nat(inputValue);
  inputReserve = Nat(inputReserve);

  if (liqTokenSupply === 0n) {
    return inputValue;
  }
  return floorDivide(multiply(inputValue, liqTokenSupply), inputReserve);
};

/**
 * Calculate how much of the secondary token is required from the user when
 * adding liquidity. We require that the deposited ratio of central to secondary
 * match the current ratio of holdings in the pool.
 *
 * @param {any} centralIn - The value of central assets being deposited
 * @param {any} centralPool - The value of central assets in the pool
 * @param {any} secondaryPool - The value of secondary assets in the pool
 * @param {any} secondaryIn - The value of secondary assets provided. If
 * the pool is empty, the entire amount will be accepted
 * @returns {NatValue} - the amount of secondary required
 */
export const calcSecondaryRequired = (
  centralIn,
  centralPool,
  secondaryPool,
  secondaryIn,
) => {
  centralIn = Nat(centralIn);
  centralPool = Nat(centralPool);
  secondaryPool = Nat(secondaryPool);
  secondaryIn = Nat(secondaryIn);

  if (centralPool === 0n || secondaryPool === 0n) {
    return secondaryIn;
  }

  const scaledSecondary = floorDivide(
    multiply(centralIn, secondaryPool),
    centralPool,
  );
  const exact =
    multiply(centralIn, secondaryPool) ===
    multiply(scaledSecondary, centralPool);

  // doesn't match the x-y-k.pdf paper, but more correct. When the ratios are
  // exactly equal, lPrime is exactly l * (1 + alpha) and adding one is wrong
  return exact ? scaledSecondary : 1n + scaledSecondary;
};

// Calculate how many underlying tokens (in the form of a value) should be
// returned when removing liquidity.
export const calcValueToRemove = (
  liqTokenSupply,
  poolValue,
  liquidityValueIn,
) => {
  liqTokenSupply = Nat(liqTokenSupply);
  liquidityValueIn = Nat(liquidityValueIn);
  poolValue = Nat(poolValue);

  return floorDivide(multiply(liquidityValueIn, poolValue), liqTokenSupply);
};