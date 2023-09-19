import { Activation } from '@neat-js/core'
import { PhenotypeActionType, type Phenotype } from '@neat-js/phenotype'

export const phenotype: Phenotype = {
  length: 9,
  inputs: [0, 1, 2, 3],
  outputs: [6, 7, 8],
  actions: [
    {
      type: PhenotypeActionType.Activation,
      node: 2,
      bias: 0,
      activation: Activation.Sigmoid,
    },
    {
      type: PhenotypeActionType.Link,
      from: 2,
      to: 6,
      weight: -0.814641636378147,
    },
    {
      type: PhenotypeActionType.Link,
      from: 2,
      to: 7,
      weight: 0.06250839398099539,
    },
    {
      type: PhenotypeActionType.Activation,
      node: 3,
      bias: 0,
      activation: Activation.Sigmoid,
    },
    {
      type: PhenotypeActionType.Link,
      from: 3,
      to: 8,
      weight: -0.2805144561375955,
    },
    {
      type: PhenotypeActionType.Activation,
      node: 0,
      bias: 0,
      activation: Activation.Sigmoid,
    },
    {
      type: PhenotypeActionType.Link,
      from: 0,
      to: 7,
      weight: 1.2270305202987735,
    },
    {
      type: PhenotypeActionType.Link,
      from: 0,
      to: 4,
      weight: -1.197999612418595,
    },
    {
      type: PhenotypeActionType.Link,
      from: 0,
      to: 8,
      weight: -0.8366915630030012,
    },
    {
      type: PhenotypeActionType.Activation,
      node: 4,
      bias: 0,
      activation: Activation.Sigmoid,
    },
    {
      type: PhenotypeActionType.Link,
      from: 4,
      to: 6,
      weight: 0.47411993831123855,
    },
    {
      type: PhenotypeActionType.Link,
      from: 4,
      to: 8,
      weight: 0.41743343625813945,
    },
    {
      type: PhenotypeActionType.Activation,
      node: 1,
      bias: 0,
      activation: Activation.Sigmoid,
    },
    {
      type: PhenotypeActionType.Link,
      from: 1,
      to: 7,
      weight: -1.0797338604387154,
    },
    {
      type: PhenotypeActionType.Link,
      from: 1,
      to: 5,
      weight: 0.371999232254565,
    },
    {
      type: PhenotypeActionType.Link,
      from: 1,
      to: 6,
      weight: -0.37739043676467976,
    },
    {
      type: PhenotypeActionType.Activation,
      node: 6,
      bias: 0,
      activation: Activation.Sigmoid,
    },
    {
      type: PhenotypeActionType.Activation,
      node: 5,
      bias: 0,
      activation: Activation.Sigmoid,
    },
    {
      type: PhenotypeActionType.Link,
      from: 5,
      to: 8,
      weight: 1.561386778082412,
    },
    {
      type: PhenotypeActionType.Activation,
      node: 8,
      bias: 0,
      activation: Activation.Sigmoid,
    },
    {
      type: PhenotypeActionType.Activation,
      node: 7,
      bias: 0,
      activation: Activation.Sigmoid,
    },
  ],
}
