import {
  Activation,
  type Phenotype,
  PhenotypeActionType,
} from '@neat-evolution/core'

export const phenotype: Phenotype = {
  length: 9,
  inputs: [0, 1, 2, 3],
  outputs: [6, 7, 8],
  actions: [
    [PhenotypeActionType.Activation, 2, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 2, 6, -0.814641636378147],
    [PhenotypeActionType.Link, 2, 7, 0.06250839398099539],
    [PhenotypeActionType.Activation, 3, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 3, 8, -0.2805144561375955],
    [PhenotypeActionType.Activation, 0, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 0, 7, 1.2270305202987735],
    [PhenotypeActionType.Link, 0, 4, -1.197999612418595],
    [PhenotypeActionType.Link, 0, 8, -0.8366915630030012],
    [PhenotypeActionType.Activation, 4, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 4, 6, 0.47411993831123855],
    [PhenotypeActionType.Link, 4, 8, 0.41743343625813945],
    [PhenotypeActionType.Activation, 1, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 1, 7, -1.0797338604387154],
    [PhenotypeActionType.Link, 1, 5, 0.371999232254565],
    [PhenotypeActionType.Link, 1, 6, -0.37739043676467976],
    [PhenotypeActionType.Activation, 6, 0, Activation.Sigmoid],
    [PhenotypeActionType.Activation, 5, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 5, 8, 1.561386778082412],
    [PhenotypeActionType.Activation, 8, 0, Activation.Sigmoid],
    [PhenotypeActionType.Activation, 7, 0, Activation.Sigmoid],
  ],
}
