import { Activation } from '@neat-js/executor/Activation.js'
import type { Tensor } from 'webgpu-torch'
import * as torch from 'webgpu-torch'

export type WebGPUTensorActivationFunction = (x: Tensor) => Tensor

// webgpu-torch does not support the following functions, so we implement them here
// https://github.com/praeclarum/webgpu-torch/tree/main
const gt = (input: Tensor, value: Tensor): Tensor => {
  const valueTensor = torch.ones(input.shape).mul(value)
  const diff = input.sub(valueTensor)
  return diff
    .sign()
    .add(torch.tensor([1]))
    .div(torch.tensor([2])) // Result is 1 where input > value, 0 otherwise
}

const lt = (input: Tensor, value: Tensor): Tensor => {
  const valueTensor = torch.ones(input.shape).mul(value)
  const diff = input.sub(valueTensor)
  return diff
    .sign()
    .mul(torch.tensor([-1]))
    .add(torch.tensor([1]))
    .div(torch.tensor([2])) // Result is 1 where input < value, 0 otherwise
}

const min = (input: Tensor, value: Tensor): Tensor => {
  // Find where the input is less than the value
  const isLessThan = lt(input, value)

  // If input is less than value, keep input value, otherwise replace with scalar value
  return isLessThan
    .mul(input)
    .add(
      torch
        .ones(input.shape)
        .mul(value)
        .mul(torch.ones(input.shape).sub(isLessThan))
    )
}

const max = (input: Tensor, value: Tensor): Tensor => {
  // Find where the input is greater than the value
  const isGreaterThan = gt(input, value)

  // If input is greater than value, keep input value, otherwise replace with scalar value
  return isGreaterThan
    .mul(input)
    .add(
      torch
        .ones(input.shape)
        .mul(value)
        .mul(torch.ones(input.shape).sub(isGreaterThan))
    )
}

const clamp = (input: Tensor, minValue: Tensor, maxValue: Tensor): Tensor => {
  const clampedMin = max(input, minValue)
  return min(clampedMin, maxValue)
}

/**
 * Exponential function with a maximum value of 1
 * Matches the EXP function in des-hyperneat, not a standard activation function
 * @see https://github.com/tenstad/des-hyperneat/blob/431d3bf99789111dd8093cae7c26bdfb9930f9f0/network/src/activation.rs#L47
 * @param {Tensor} input Tensor
 * @returns {Tensor} Tensor
 */
const exp = (input: Tensor): Tensor => {
  return torch.exp(min(input, torch.tensor([1.0])))
}

const softmax = (input: Tensor): Tensor => {
  const exps = torch.exp(input)
  const sumExps = exps.sum()
  return exps.div(sumExps)
}

// https://github.com/tenstad/des-hyperneat/blob/master/network/src/activation.rs
export const toActivationFunction = (
  activation: Activation
): WebGPUTensorActivationFunction => {
  switch (activation) {
    case Activation.None:
      return (x: Tensor) => x

    case Activation.Linear:
      return (x: Tensor) => clamp(x, torch.tensor([-1.0]), torch.tensor([1.0]))

    case Activation.Step:
      return (x: Tensor) => gt(x, torch.tensor([0]))

    case Activation.ReLU:
      return torch.relu

    case Activation.Sigmoid:
      return torch.sigmoid

    case Activation.Tanh:
      return torch.tanh

    case Activation.Softmax:
      return softmax

    case Activation.Gaussian:
      return (x: Tensor) =>
        torch.exp(
          torch
            .tensor([-2.5])
            .mul(x)
            .pow(torch.tensor([2]))
        )

    case Activation.OffsetGaussian:
      return (x: Tensor) =>
        torch
          .tensor([2.0])
          .mul(
            torch.exp(
              torch
                .tensor([-2.5])
                .mul(x)
                .pow(torch.tensor([2]))
            )
          )
          .sub(torch.tensor([1.0]))

    case Activation.Sine:
      return (x: Tensor) => x.mul(torch.tensor([2.0])).sin()

    case Activation.Cos:
      return (x: Tensor) => x.mul(torch.tensor([2.0])).cos()

    case Activation.Square:
      return (x: Tensor) => x.mul(x)

    case Activation.Abs:
      return torch.abs

    case Activation.Exp:
      return exp

    default:
      throw new Error('Unsupported activation function')
  }
}
