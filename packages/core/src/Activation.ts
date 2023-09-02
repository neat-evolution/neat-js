export enum Activation {
  None = 'None',
  Linear = 'Linear',
  Step = 'Step',
  ReLU = 'ReLU',
  Sigmoid = 'Sigmoid',
  Tanh = 'Tanh',
  Softmax = 'Softmax',
  Gaussian = 'Gaussian',
  OffsetGaussian = 'OffsetGaussian',
  Sine = 'Sine',
  Cos = 'Cos',
  Square = 'Square',
  Abs = 'Abs',
  Exp = 'Exp',
}

export const activationToNumber = (activation: Activation): number => {
  switch (activation) {
    case Activation.None:
      return 0
    case Activation.Linear:
      return 1
    case Activation.Step:
      return 2
    case Activation.ReLU:
      return 3
    case Activation.Sigmoid:
      return 4
    case Activation.Tanh:
      return 5
    case Activation.Softmax:
      return 6
    case Activation.Gaussian:
      return 7
    case Activation.OffsetGaussian:
      return 8
    case Activation.Sine:
      return 9
    case Activation.Cos:
      return 10
    case Activation.Square:
      return 11
    case Activation.Abs:
      return 12
    case Activation.Exp:
      return 13
    default:
      throw new Error('Unknown activation type')
  }
}

export const activationFromNumber = (number: number): Activation => {
  switch (number) {
    case 0:
      return Activation.None
    case 1:
      return Activation.Linear
    case 2:
      return Activation.Step
    case 3:
      return Activation.ReLU
    case 4:
      return Activation.Sigmoid
    case 5:
      return Activation.Tanh
    case 6:
      return Activation.Softmax
    case 7:
      return Activation.Gaussian
    case 8:
      return Activation.OffsetGaussian
    case 9:
      return Activation.Sine
    case 10:
      return Activation.Cos
    case 11:
      return Activation.Square
    case 12:
      return Activation.Abs
    case 13:
      return Activation.Exp
    default:
      throw new Error('Unknown activation number')
  }
}
