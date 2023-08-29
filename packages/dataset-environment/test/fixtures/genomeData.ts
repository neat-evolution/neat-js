import type { DefaultNEATGenomeData } from '../../src/neat/DefaultNEATGenome'

export const genomeData: DefaultNEATGenomeData = {
  config: {
    neat: {
      addNodeProbability: 1,
      addLinkProbability: 1,
      initialLinkWeightSize: 0.5,
      mutateLinkWeightProbability: 0,
      mutateLinkWeightSize: 0.5,
      removeNodeProbability: 0,
      removeLinkProbability: 0,
      onlyHiddenNodeDistance: true,
      linkDistanceWeight: 0.5,
      mutateOnlyOneLink: true,
    },
    node: null,
    link: null,
  },
  state: {
    neat: {
      innovationLog: {
        hiddenNodeInnovations: [
          [0, { nodeNumber: 0, innovationNumber: 1 }],
          [1, { nodeNumber: 1, innovationNumber: 4 }],
          [2, { nodeNumber: 2, innovationNumber: 7 }],
          [3, { nodeNumber: 3, innovationNumber: 11 }],
          [4, { nodeNumber: 4, innovationNumber: 14 }],
          [5, { nodeNumber: 5, innovationNumber: 17 }],
          [6, { nodeNumber: 6, innovationNumber: 21 }],
          [7, { nodeNumber: 7, innovationNumber: 25 }],
          [8, { nodeNumber: 8, innovationNumber: 29 }],
          [9, { nodeNumber: 9, innovationNumber: 33 }],
          [10, { nodeNumber: 10, innovationNumber: 38 }],
          [11, { nodeNumber: 11, innovationNumber: 42 }],
          [12, { nodeNumber: 12, innovationNumber: 46 }],
          [13, { nodeNumber: 13, innovationNumber: 50 }],
          [14, { nodeNumber: 14, innovationNumber: 54 }],
          [15, { nodeNumber: 15, innovationNumber: 57 }],
          [16, { nodeNumber: 16, innovationNumber: 61 }],
          [17, { nodeNumber: 17, innovationNumber: 65 }],
          [18, { nodeNumber: 18, innovationNumber: 69 }],
          [19, { nodeNumber: 19, innovationNumber: 73 }],
          [20, { nodeNumber: 20, innovationNumber: 77 }],
          [21, { nodeNumber: 21, innovationNumber: 81 }],
          [22, { nodeNumber: 22, innovationNumber: 85 }],
          [23, { nodeNumber: 23, innovationNumber: 89 }],
          [24, { nodeNumber: 24, innovationNumber: 93 }],
          [25, { nodeNumber: 25, innovationNumber: 97 }],
          [26, { nodeNumber: 26, innovationNumber: 101 }],
          [27, { nodeNumber: 27, innovationNumber: 105 }],
          [28, { nodeNumber: 28, innovationNumber: 109 }],
          [29, { nodeNumber: 29, innovationNumber: 113 }],
          [30, { nodeNumber: 30, innovationNumber: 117 }],
          [31, { nodeNumber: 31, innovationNumber: 121 }],
          [32, { nodeNumber: 32, innovationNumber: 125 }],
          [33, { nodeNumber: 33, innovationNumber: 129 }],
          [34, { nodeNumber: 34, innovationNumber: 133 }],
          [35, { nodeNumber: 35, innovationNumber: 137 }],
          [36, { nodeNumber: 36, innovationNumber: 141 }],
          [37, { nodeNumber: 37, innovationNumber: 145 }],
          [38, { nodeNumber: 38, innovationNumber: 149 }],
          [39, { nodeNumber: 39, innovationNumber: 153 }],
          [40, { nodeNumber: 40, innovationNumber: 157 }],
          [41, { nodeNumber: 41, innovationNumber: 161 }],
          [42, { nodeNumber: 42, innovationNumber: 165 }],
          [43, { nodeNumber: 43, innovationNumber: 169 }],
          [44, { nodeNumber: 44, innovationNumber: 173 }],
          [45, { nodeNumber: 45, innovationNumber: 177 }],
          [46, { nodeNumber: 46, innovationNumber: 181 }],
          [47, { nodeNumber: 47, innovationNumber: 185 }],
        ],
        splitInnovations: [
          [0, { nodeNumber: 0, innovationNumber: 1 }],
          [2, { nodeNumber: 1, innovationNumber: 4 }],
          [5, { nodeNumber: 2, innovationNumber: 7 }],
          [4, { nodeNumber: 3, innovationNumber: 11 }],
          [7, { nodeNumber: 4, innovationNumber: 14 }],
          [10, { nodeNumber: 5, innovationNumber: 17 }],
          [1, { nodeNumber: 6, innovationNumber: 21 }],
          [12, { nodeNumber: 7, innovationNumber: 25 }],
          [11, { nodeNumber: 8, innovationNumber: 29 }],
          [14, { nodeNumber: 9, innovationNumber: 33 }],
          [29, { nodeNumber: 10, innovationNumber: 38 }],
          [20, { nodeNumber: 11, innovationNumber: 42 }],
          [17, { nodeNumber: 12, innovationNumber: 46 }],
          [49, { nodeNumber: 13, innovationNumber: 50 }],
          [25, { nodeNumber: 14, innovationNumber: 54 }],
          [30, { nodeNumber: 15, innovationNumber: 57 }],
          [37, { nodeNumber: 16, innovationNumber: 61 }],
          [42, { nodeNumber: 17, innovationNumber: 65 }],
          [51, { nodeNumber: 18, innovationNumber: 69 }],
          [53, { nodeNumber: 19, innovationNumber: 73 }],
          [50, { nodeNumber: 20, innovationNumber: 77 }],
          [72, { nodeNumber: 21, innovationNumber: 81 }],
          [73, { nodeNumber: 22, innovationNumber: 85 }],
          [65, { nodeNumber: 23, innovationNumber: 89 }],
          [41, { nodeNumber: 24, innovationNumber: 93 }],
          [24, { nodeNumber: 25, innovationNumber: 97 }],
          [28, { nodeNumber: 26, innovationNumber: 101 }],
          [74, { nodeNumber: 27, innovationNumber: 105 }],
          [57, { nodeNumber: 28, innovationNumber: 109 }],
          [60, { nodeNumber: 29, innovationNumber: 113 }],
          [15, { nodeNumber: 30, innovationNumber: 117 }],
          [81, { nodeNumber: 31, innovationNumber: 121 }],
          [92, { nodeNumber: 32, innovationNumber: 125 }],
          [34, { nodeNumber: 33, innovationNumber: 129 }],
          [102, { nodeNumber: 34, innovationNumber: 133 }],
          [64, { nodeNumber: 35, innovationNumber: 137 }],
          [96, { nodeNumber: 36, innovationNumber: 141 }],
          [104, { nodeNumber: 37, innovationNumber: 145 }],
          [110, { nodeNumber: 38, innovationNumber: 149 }],
          [138, { nodeNumber: 39, innovationNumber: 153 }],
          [117, { nodeNumber: 40, innovationNumber: 157 }],
          [18, { nodeNumber: 41, innovationNumber: 161 }],
          [76, { nodeNumber: 42, innovationNumber: 165 }],
          [158, { nodeNumber: 43, innovationNumber: 169 }],
          [43, { nodeNumber: 44, innovationNumber: 173 }],
          [8, { nodeNumber: 45, innovationNumber: 177 }],
          [86, { nodeNumber: 46, innovationNumber: 181 }],
          [136, { nodeNumber: 47, innovationNumber: 185 }],
        ],
        connectInnovations: [
          ['Input[0] -> Output[0]', 0],
          ['Input[0] -> Hidden[0]', 1],
          ['Hidden[0] -> Output[0]', 2],
          ['Hidden[0] -> Hidden[1]', 4],
          ['Hidden[1] -> Output[0]', 5],
          ['Hidden[1] -> Hidden[2]', 7],
          ['Hidden[2] -> Output[0]', 8],
          ['Input[0] -> Hidden[2]', 10],
          ['Hidden[0] -> Hidden[3]', 11],
          ['Hidden[3] -> Hidden[1]', 12],
          ['Hidden[1] -> Hidden[4]', 14],
          ['Hidden[4] -> Hidden[2]', 15],
          ['Input[0] -> Hidden[5]', 17],
          ['Hidden[5] -> Hidden[2]', 18],
          ['Input[0] -> Hidden[4]', 20],
          ['Input[0] -> Hidden[6]', 21],
          ['Hidden[6] -> Hidden[0]', 22],
          ['Hidden[1] -> Hidden[5]', 24],
          ['Hidden[3] -> Hidden[7]', 25],
          ['Hidden[7] -> Hidden[1]', 26],
          ['Hidden[3] -> Hidden[4]', 28],
          ['Hidden[0] -> Hidden[8]', 29],
          ['Hidden[8] -> Hidden[3]', 30],
          ['Hidden[6] -> Hidden[2]', 32],
          ['Hidden[1] -> Hidden[9]', 33],
          ['Hidden[9] -> Hidden[4]', 34],
          ['Hidden[0] -> Hidden[7]', 36],
          ['Hidden[6] -> Hidden[5]', 37],
          ['Hidden[0] -> Hidden[10]', 38],
          ['Hidden[10] -> Hidden[8]', 39],
          ['Hidden[5] -> Hidden[4]', 41],
          ['Input[0] -> Hidden[11]', 42],
          ['Hidden[11] -> Hidden[4]', 43],
          ['Hidden[8] -> Hidden[11]', 45],
          ['Input[0] -> Hidden[12]', 46],
          ['Hidden[12] -> Hidden[5]', 47],
          ['Hidden[11] -> Hidden[1]', 49],
          ['Hidden[11] -> Hidden[13]', 50],
          ['Hidden[13] -> Hidden[1]', 51],
          ['Hidden[11] -> Hidden[2]', 53],
          ['Hidden[3] -> Hidden[14]', 54],
          ['Hidden[14] -> Hidden[7]', 55],
          ['Hidden[8] -> Hidden[15]', 57],
          ['Hidden[15] -> Hidden[3]', 58],
          ['Hidden[5] -> Hidden[9]', 60],
          ['Hidden[6] -> Hidden[16]', 61],
          ['Hidden[16] -> Hidden[5]', 62],
          ['Hidden[13] -> Hidden[5]', 64],
          ['Input[0] -> Hidden[17]', 65],
          ['Hidden[17] -> Hidden[11]', 66],
          ['Hidden[6] -> Hidden[1]', 68],
          ['Hidden[13] -> Hidden[18]', 69],
          ['Hidden[18] -> Hidden[1]', 70],
          ['Hidden[11] -> Hidden[14]', 72],
          ['Hidden[11] -> Hidden[19]', 73],
          ['Hidden[19] -> Hidden[2]', 74],
          ['Hidden[17] -> Hidden[16]', 76],
          ['Hidden[11] -> Hidden[20]', 77],
          ['Hidden[20] -> Hidden[13]', 78],
          ['Hidden[13] -> Hidden[7]', 80],
          ['Hidden[11] -> Hidden[21]', 81],
          ['Hidden[21] -> Hidden[14]', 82],
          ['Hidden[13] -> Hidden[19]', 84],
          ['Hidden[11] -> Hidden[22]', 85],
          ['Hidden[22] -> Hidden[19]', 86],
          ['Hidden[9] -> Hidden[2]', 88],
          ['Input[0] -> Hidden[23]', 89],
          ['Hidden[23] -> Hidden[17]', 90],
          ['Input[0] -> Hidden[20]', 92],
          ['Hidden[5] -> Hidden[24]', 93],
          ['Hidden[24] -> Hidden[4]', 94],
          ['Hidden[10] -> Hidden[13]', 96],
          ['Hidden[1] -> Hidden[25]', 97],
          ['Hidden[25] -> Hidden[5]', 98],
          ['Hidden[6] -> Hidden[11]', 100],
          ['Hidden[3] -> Hidden[26]', 101],
          ['Hidden[26] -> Hidden[4]', 102],
          ['Hidden[20] -> Hidden[3]', 104],
          ['Hidden[19] -> Hidden[27]', 105],
          ['Hidden[27] -> Hidden[2]', 106],
          ['Hidden[22] -> Hidden[1]', 108],
          ['Hidden[8] -> Hidden[28]', 109],
          ['Hidden[28] -> Hidden[15]', 110],
          ['Hidden[3] -> Hidden[2]', 112],
          ['Hidden[5] -> Hidden[29]', 113],
          ['Hidden[29] -> Hidden[9]', 114],
          ['Hidden[14] -> Hidden[25]', 116],
          ['Hidden[4] -> Hidden[30]', 117],
          ['Hidden[30] -> Hidden[2]', 118],
          ['Hidden[29] -> Hidden[19]', 120],
          ['Hidden[11] -> Hidden[31]', 121],
          ['Hidden[31] -> Hidden[21]', 122],
          ['Hidden[6] -> Hidden[26]', 124],
          ['Input[0] -> Hidden[32]', 125],
          ['Hidden[32] -> Hidden[20]', 126],
          ['Hidden[5] -> Output[0]', 128],
          ['Hidden[9] -> Hidden[33]', 129],
          ['Hidden[33] -> Hidden[4]', 130],
          ['Hidden[4] -> Hidden[27]', 132],
          ['Hidden[26] -> Hidden[34]', 133],
          ['Hidden[34] -> Hidden[4]', 134],
          ['Hidden[6] -> Hidden[29]', 136],
          ['Hidden[13] -> Hidden[35]', 137],
          ['Hidden[35] -> Hidden[5]', 138],
          ['Hidden[33] -> Hidden[34]', 140],
          ['Hidden[10] -> Hidden[36]', 141],
          ['Hidden[36] -> Hidden[13]', 142],
          ['Hidden[9] -> Hidden[34]', 144],
          ['Hidden[20] -> Hidden[37]', 145],
          ['Hidden[37] -> Hidden[3]', 146],
          ['Hidden[28] -> Hidden[4]', 148],
          ['Hidden[28] -> Hidden[38]', 149],
          ['Hidden[38] -> Hidden[15]', 150],
          ['Hidden[25] -> Hidden[24]', 152],
          ['Hidden[35] -> Hidden[39]', 153],
          ['Hidden[39] -> Hidden[5]', 154],
          ['Hidden[6] -> Hidden[17]', 156],
          ['Hidden[4] -> Hidden[40]', 157],
          ['Hidden[40] -> Hidden[30]', 158],
          ['Hidden[37] -> Hidden[34]', 160],
          ['Hidden[5] -> Hidden[41]', 161],
          ['Hidden[41] -> Hidden[2]', 162],
          ['Hidden[11] -> Hidden[5]', 164],
          ['Hidden[17] -> Hidden[42]', 165],
          ['Hidden[42] -> Hidden[16]', 166],
          ['Hidden[8] -> Hidden[21]', 168],
          ['Hidden[40] -> Hidden[43]', 169],
          ['Hidden[43] -> Hidden[30]', 170],
          ['Hidden[19] -> Hidden[9]', 172],
          ['Hidden[11] -> Hidden[44]', 173],
          ['Hidden[44] -> Hidden[4]', 174],
          ['Hidden[31] -> Hidden[20]', 176],
          ['Hidden[2] -> Hidden[45]', 177],
          ['Hidden[45] -> Output[0]', 178],
          ['Hidden[6] -> Hidden[27]', 180],
          ['Hidden[22] -> Hidden[46]', 181],
          ['Hidden[46] -> Hidden[19]', 182],
          ['Hidden[16] -> Hidden[31]', 184],
          ['Hidden[6] -> Hidden[47]', 185],
          ['Hidden[47] -> Hidden[29]', 186],
          ['Hidden[3] -> Hidden[41]', 188],
        ],
        reverseConnectInnovations: [
          [
            0,
            [
              { type: 'Input', id: 0 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            1,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 0 },
            ],
          ],
          [
            2,
            [
              { type: 'Hidden', id: 0 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            4,
            [
              { type: 'Hidden', id: 0 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            5,
            [
              { type: 'Hidden', id: 1 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            7,
            [
              { type: 'Hidden', id: 1 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            8,
            [
              { type: 'Hidden', id: 2 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            10,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            11,
            [
              { type: 'Hidden', id: 0 },
              { type: 'Hidden', id: 3 },
            ],
          ],
          [
            12,
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            14,
            [
              { type: 'Hidden', id: 1 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            15,
            [
              { type: 'Hidden', id: 4 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            17,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            18,
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            20,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            21,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 6 },
            ],
          ],
          [
            22,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 0 },
            ],
          ],
          [
            24,
            [
              { type: 'Hidden', id: 1 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            25,
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 7 },
            ],
          ],
          [
            26,
            [
              { type: 'Hidden', id: 7 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            28,
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            29,
            [
              { type: 'Hidden', id: 0 },
              { type: 'Hidden', id: 8 },
            ],
          ],
          [
            30,
            [
              { type: 'Hidden', id: 8 },
              { type: 'Hidden', id: 3 },
            ],
          ],
          [
            32,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            33,
            [
              { type: 'Hidden', id: 1 },
              { type: 'Hidden', id: 9 },
            ],
          ],
          [
            34,
            [
              { type: 'Hidden', id: 9 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            36,
            [
              { type: 'Hidden', id: 0 },
              { type: 'Hidden', id: 7 },
            ],
          ],
          [
            37,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            38,
            [
              { type: 'Hidden', id: 0 },
              { type: 'Hidden', id: 10 },
            ],
          ],
          [
            39,
            [
              { type: 'Hidden', id: 10 },
              { type: 'Hidden', id: 8 },
            ],
          ],
          [
            41,
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            42,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 11 },
            ],
          ],
          [
            43,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            45,
            [
              { type: 'Hidden', id: 8 },
              { type: 'Hidden', id: 11 },
            ],
          ],
          [
            46,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 12 },
            ],
          ],
          [
            47,
            [
              { type: 'Hidden', id: 12 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            49,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            50,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 13 },
            ],
          ],
          [
            51,
            [
              { type: 'Hidden', id: 13 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            53,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            54,
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 14 },
            ],
          ],
          [
            55,
            [
              { type: 'Hidden', id: 14 },
              { type: 'Hidden', id: 7 },
            ],
          ],
          [
            57,
            [
              { type: 'Hidden', id: 8 },
              { type: 'Hidden', id: 15 },
            ],
          ],
          [
            58,
            [
              { type: 'Hidden', id: 15 },
              { type: 'Hidden', id: 3 },
            ],
          ],
          [
            60,
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 9 },
            ],
          ],
          [
            61,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 16 },
            ],
          ],
          [
            62,
            [
              { type: 'Hidden', id: 16 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            64,
            [
              { type: 'Hidden', id: 13 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            65,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 17 },
            ],
          ],
          [
            66,
            [
              { type: 'Hidden', id: 17 },
              { type: 'Hidden', id: 11 },
            ],
          ],
          [
            68,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            69,
            [
              { type: 'Hidden', id: 13 },
              { type: 'Hidden', id: 18 },
            ],
          ],
          [
            70,
            [
              { type: 'Hidden', id: 18 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            72,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 14 },
            ],
          ],
          [
            73,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 19 },
            ],
          ],
          [
            74,
            [
              { type: 'Hidden', id: 19 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            76,
            [
              { type: 'Hidden', id: 17 },
              { type: 'Hidden', id: 16 },
            ],
          ],
          [
            77,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 20 },
            ],
          ],
          [
            78,
            [
              { type: 'Hidden', id: 20 },
              { type: 'Hidden', id: 13 },
            ],
          ],
          [
            80,
            [
              { type: 'Hidden', id: 13 },
              { type: 'Hidden', id: 7 },
            ],
          ],
          [
            81,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 21 },
            ],
          ],
          [
            82,
            [
              { type: 'Hidden', id: 21 },
              { type: 'Hidden', id: 14 },
            ],
          ],
          [
            84,
            [
              { type: 'Hidden', id: 13 },
              { type: 'Hidden', id: 19 },
            ],
          ],
          [
            85,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 22 },
            ],
          ],
          [
            86,
            [
              { type: 'Hidden', id: 22 },
              { type: 'Hidden', id: 19 },
            ],
          ],
          [
            88,
            [
              { type: 'Hidden', id: 9 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            89,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 23 },
            ],
          ],
          [
            90,
            [
              { type: 'Hidden', id: 23 },
              { type: 'Hidden', id: 17 },
            ],
          ],
          [
            92,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 20 },
            ],
          ],
          [
            93,
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 24 },
            ],
          ],
          [
            94,
            [
              { type: 'Hidden', id: 24 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            96,
            [
              { type: 'Hidden', id: 10 },
              { type: 'Hidden', id: 13 },
            ],
          ],
          [
            97,
            [
              { type: 'Hidden', id: 1 },
              { type: 'Hidden', id: 25 },
            ],
          ],
          [
            98,
            [
              { type: 'Hidden', id: 25 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            100,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 11 },
            ],
          ],
          [
            101,
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 26 },
            ],
          ],
          [
            102,
            [
              { type: 'Hidden', id: 26 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            104,
            [
              { type: 'Hidden', id: 20 },
              { type: 'Hidden', id: 3 },
            ],
          ],
          [
            105,
            [
              { type: 'Hidden', id: 19 },
              { type: 'Hidden', id: 27 },
            ],
          ],
          [
            106,
            [
              { type: 'Hidden', id: 27 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            108,
            [
              { type: 'Hidden', id: 22 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            109,
            [
              { type: 'Hidden', id: 8 },
              { type: 'Hidden', id: 28 },
            ],
          ],
          [
            110,
            [
              { type: 'Hidden', id: 28 },
              { type: 'Hidden', id: 15 },
            ],
          ],
          [
            112,
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            113,
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 29 },
            ],
          ],
          [
            114,
            [
              { type: 'Hidden', id: 29 },
              { type: 'Hidden', id: 9 },
            ],
          ],
          [
            116,
            [
              { type: 'Hidden', id: 14 },
              { type: 'Hidden', id: 25 },
            ],
          ],
          [
            117,
            [
              { type: 'Hidden', id: 4 },
              { type: 'Hidden', id: 30 },
            ],
          ],
          [
            118,
            [
              { type: 'Hidden', id: 30 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            120,
            [
              { type: 'Hidden', id: 29 },
              { type: 'Hidden', id: 19 },
            ],
          ],
          [
            121,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 31 },
            ],
          ],
          [
            122,
            [
              { type: 'Hidden', id: 31 },
              { type: 'Hidden', id: 21 },
            ],
          ],
          [
            124,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 26 },
            ],
          ],
          [
            125,
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 32 },
            ],
          ],
          [
            126,
            [
              { type: 'Hidden', id: 32 },
              { type: 'Hidden', id: 20 },
            ],
          ],
          [
            128,
            [
              { type: 'Hidden', id: 5 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            129,
            [
              { type: 'Hidden', id: 9 },
              { type: 'Hidden', id: 33 },
            ],
          ],
          [
            130,
            [
              { type: 'Hidden', id: 33 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            132,
            [
              { type: 'Hidden', id: 4 },
              { type: 'Hidden', id: 27 },
            ],
          ],
          [
            133,
            [
              { type: 'Hidden', id: 26 },
              { type: 'Hidden', id: 34 },
            ],
          ],
          [
            134,
            [
              { type: 'Hidden', id: 34 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            136,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 29 },
            ],
          ],
          [
            137,
            [
              { type: 'Hidden', id: 13 },
              { type: 'Hidden', id: 35 },
            ],
          ],
          [
            138,
            [
              { type: 'Hidden', id: 35 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            140,
            [
              { type: 'Hidden', id: 33 },
              { type: 'Hidden', id: 34 },
            ],
          ],
          [
            141,
            [
              { type: 'Hidden', id: 10 },
              { type: 'Hidden', id: 36 },
            ],
          ],
          [
            142,
            [
              { type: 'Hidden', id: 36 },
              { type: 'Hidden', id: 13 },
            ],
          ],
          [
            144,
            [
              { type: 'Hidden', id: 9 },
              { type: 'Hidden', id: 34 },
            ],
          ],
          [
            145,
            [
              { type: 'Hidden', id: 20 },
              { type: 'Hidden', id: 37 },
            ],
          ],
          [
            146,
            [
              { type: 'Hidden', id: 37 },
              { type: 'Hidden', id: 3 },
            ],
          ],
          [
            148,
            [
              { type: 'Hidden', id: 28 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            149,
            [
              { type: 'Hidden', id: 28 },
              { type: 'Hidden', id: 38 },
            ],
          ],
          [
            150,
            [
              { type: 'Hidden', id: 38 },
              { type: 'Hidden', id: 15 },
            ],
          ],
          [
            152,
            [
              { type: 'Hidden', id: 25 },
              { type: 'Hidden', id: 24 },
            ],
          ],
          [
            153,
            [
              { type: 'Hidden', id: 35 },
              { type: 'Hidden', id: 39 },
            ],
          ],
          [
            154,
            [
              { type: 'Hidden', id: 39 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            156,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 17 },
            ],
          ],
          [
            157,
            [
              { type: 'Hidden', id: 4 },
              { type: 'Hidden', id: 40 },
            ],
          ],
          [
            158,
            [
              { type: 'Hidden', id: 40 },
              { type: 'Hidden', id: 30 },
            ],
          ],
          [
            160,
            [
              { type: 'Hidden', id: 37 },
              { type: 'Hidden', id: 34 },
            ],
          ],
          [
            161,
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 41 },
            ],
          ],
          [
            162,
            [
              { type: 'Hidden', id: 41 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            164,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            165,
            [
              { type: 'Hidden', id: 17 },
              { type: 'Hidden', id: 42 },
            ],
          ],
          [
            166,
            [
              { type: 'Hidden', id: 42 },
              { type: 'Hidden', id: 16 },
            ],
          ],
          [
            168,
            [
              { type: 'Hidden', id: 8 },
              { type: 'Hidden', id: 21 },
            ],
          ],
          [
            169,
            [
              { type: 'Hidden', id: 40 },
              { type: 'Hidden', id: 43 },
            ],
          ],
          [
            170,
            [
              { type: 'Hidden', id: 43 },
              { type: 'Hidden', id: 30 },
            ],
          ],
          [
            172,
            [
              { type: 'Hidden', id: 19 },
              { type: 'Hidden', id: 9 },
            ],
          ],
          [
            173,
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 44 },
            ],
          ],
          [
            174,
            [
              { type: 'Hidden', id: 44 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            176,
            [
              { type: 'Hidden', id: 31 },
              { type: 'Hidden', id: 20 },
            ],
          ],
          [
            177,
            [
              { type: 'Hidden', id: 2 },
              { type: 'Hidden', id: 45 },
            ],
          ],
          [
            178,
            [
              { type: 'Hidden', id: 45 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            180,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 27 },
            ],
          ],
          [
            181,
            [
              { type: 'Hidden', id: 22 },
              { type: 'Hidden', id: 46 },
            ],
          ],
          [
            182,
            [
              { type: 'Hidden', id: 46 },
              { type: 'Hidden', id: 19 },
            ],
          ],
          [
            184,
            [
              { type: 'Hidden', id: 16 },
              { type: 'Hidden', id: 31 },
            ],
          ],
          [
            185,
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 47 },
            ],
          ],
          [
            186,
            [
              { type: 'Hidden', id: 47 },
              { type: 'Hidden', id: 29 },
            ],
          ],
          [
            188,
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 41 },
            ],
          ],
        ],
        hiddenToLink: [
          [
            'Hidden[0]',
            [
              { type: 'Input', id: 0 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            'Hidden[1]',
            [
              { type: 'Hidden', id: 0 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            'Hidden[2]',
            [
              { type: 'Hidden', id: 1 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            'Hidden[3]',
            [
              { type: 'Hidden', id: 0 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            'Hidden[4]',
            [
              { type: 'Hidden', id: 1 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            'Hidden[5]',
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            'Hidden[6]',
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 0 },
            ],
          ],
          [
            'Hidden[7]',
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            'Hidden[8]',
            [
              { type: 'Hidden', id: 0 },
              { type: 'Hidden', id: 3 },
            ],
          ],
          [
            'Hidden[9]',
            [
              { type: 'Hidden', id: 1 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            'Hidden[10]',
            [
              { type: 'Hidden', id: 0 },
              { type: 'Hidden', id: 8 },
            ],
          ],
          [
            'Hidden[11]',
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            'Hidden[12]',
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            'Hidden[13]',
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            'Hidden[14]',
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 7 },
            ],
          ],
          [
            'Hidden[15]',
            [
              { type: 'Hidden', id: 8 },
              { type: 'Hidden', id: 3 },
            ],
          ],
          [
            'Hidden[16]',
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            'Hidden[17]',
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 11 },
            ],
          ],
          [
            'Hidden[18]',
            [
              { type: 'Hidden', id: 13 },
              { type: 'Hidden', id: 1 },
            ],
          ],
          [
            'Hidden[19]',
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            'Hidden[20]',
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 13 },
            ],
          ],
          [
            'Hidden[21]',
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 14 },
            ],
          ],
          [
            'Hidden[22]',
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 19 },
            ],
          ],
          [
            'Hidden[23]',
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 17 },
            ],
          ],
          [
            'Hidden[24]',
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            'Hidden[25]',
            [
              { type: 'Hidden', id: 1 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            'Hidden[26]',
            [
              { type: 'Hidden', id: 3 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            'Hidden[27]',
            [
              { type: 'Hidden', id: 19 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            'Hidden[28]',
            [
              { type: 'Hidden', id: 8 },
              { type: 'Hidden', id: 15 },
            ],
          ],
          [
            'Hidden[29]',
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 9 },
            ],
          ],
          [
            'Hidden[30]',
            [
              { type: 'Hidden', id: 4 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            'Hidden[31]',
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 21 },
            ],
          ],
          [
            'Hidden[32]',
            [
              { type: 'Input', id: 0 },
              { type: 'Hidden', id: 20 },
            ],
          ],
          [
            'Hidden[33]',
            [
              { type: 'Hidden', id: 9 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            'Hidden[34]',
            [
              { type: 'Hidden', id: 26 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            'Hidden[35]',
            [
              { type: 'Hidden', id: 13 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            'Hidden[36]',
            [
              { type: 'Hidden', id: 10 },
              { type: 'Hidden', id: 13 },
            ],
          ],
          [
            'Hidden[37]',
            [
              { type: 'Hidden', id: 20 },
              { type: 'Hidden', id: 3 },
            ],
          ],
          [
            'Hidden[38]',
            [
              { type: 'Hidden', id: 28 },
              { type: 'Hidden', id: 15 },
            ],
          ],
          [
            'Hidden[39]',
            [
              { type: 'Hidden', id: 35 },
              { type: 'Hidden', id: 5 },
            ],
          ],
          [
            'Hidden[40]',
            [
              { type: 'Hidden', id: 4 },
              { type: 'Hidden', id: 30 },
            ],
          ],
          [
            'Hidden[41]',
            [
              { type: 'Hidden', id: 5 },
              { type: 'Hidden', id: 2 },
            ],
          ],
          [
            'Hidden[42]',
            [
              { type: 'Hidden', id: 17 },
              { type: 'Hidden', id: 16 },
            ],
          ],
          [
            'Hidden[43]',
            [
              { type: 'Hidden', id: 40 },
              { type: 'Hidden', id: 30 },
            ],
          ],
          [
            'Hidden[44]',
            [
              { type: 'Hidden', id: 11 },
              { type: 'Hidden', id: 4 },
            ],
          ],
          [
            'Hidden[45]',
            [
              { type: 'Hidden', id: 2 },
              { type: 'Output', id: 0 },
            ],
          ],
          [
            'Hidden[46]',
            [
              { type: 'Hidden', id: 22 },
              { type: 'Hidden', id: 19 },
            ],
          ],
          [
            'Hidden[47]',
            [
              { type: 'Hidden', id: 6 },
              { type: 'Hidden', id: 29 },
            ],
          ],
        ],
      },
      nextInnovation: { nodeNumber: 48, innovationNumber: 189 },
    },
    node: null,
    link: null,
  },
  options: { inputs: 1, outputs: 1, outputActivation: 'Sigmoid' },
  hiddenNodes: [
    { type: 'Hidden', id: 0 },
    { type: 'Hidden', id: 1 },
    { type: 'Hidden', id: 2 },
    { type: 'Hidden', id: 3 },
    { type: 'Hidden', id: 4 },
    { type: 'Hidden', id: 5 },
    { type: 'Hidden', id: 6 },
    { type: 'Hidden', id: 7 },
    { type: 'Hidden', id: 8 },
    { type: 'Hidden', id: 9 },
    { type: 'Hidden', id: 10 },
    { type: 'Hidden', id: 11 },
    { type: 'Hidden', id: 12 },
    { type: 'Hidden', id: 13 },
    { type: 'Hidden', id: 14 },
    { type: 'Hidden', id: 15 },
    { type: 'Hidden', id: 16 },
    { type: 'Hidden', id: 17 },
    { type: 'Hidden', id: 18 },
    { type: 'Hidden', id: 19 },
    { type: 'Hidden', id: 20 },
    { type: 'Hidden', id: 21 },
    { type: 'Hidden', id: 22 },
    { type: 'Hidden', id: 23 },
    { type: 'Hidden', id: 24 },
    { type: 'Hidden', id: 25 },
    { type: 'Hidden', id: 26 },
    { type: 'Hidden', id: 27 },
    { type: 'Hidden', id: 28 },
    { type: 'Hidden', id: 29 },
    { type: 'Hidden', id: 30 },
    { type: 'Hidden', id: 31 },
    { type: 'Hidden', id: 32 },
    { type: 'Hidden', id: 33 },
    { type: 'Hidden', id: 34 },
    { type: 'Hidden', id: 35 },
    { type: 'Hidden', id: 36 },
    { type: 'Hidden', id: 37 },
    { type: 'Hidden', id: 38 },
    { type: 'Hidden', id: 39 },
    { type: 'Hidden', id: 40 },
    { type: 'Hidden', id: 41 },
    { type: 'Hidden', id: 42 },
    { type: 'Hidden', id: 43 },
    { type: 'Hidden', id: 44 },
    { type: 'Hidden', id: 45 },
    { type: 'Hidden', id: 46 },
    { type: 'Hidden', id: 47 },
  ],
  links: [
    {
      from: { type: 'Hidden', id: 1 },
      to: { type: 'Output', id: 0 },
      weight: -0.22990368039510356,
      innovation: 5,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 1 },
      to: { type: 'Hidden', id: 2 },
      weight: 0.23040482487254388,
      innovation: 7,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 0 },
      weight: 1,
      innovation: 22,
      config: null,
      state: null,
    },
    {
      from: { type: 'Input', id: 0 },
      to: { type: 'Hidden', id: 6 },
      weight: 0.2982244744299911,
      innovation: 21,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 7 },
      to: { type: 'Hidden', id: 1 },
      weight: 1,
      innovation: 26,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 2 },
      weight: -0.48915338975787814,
      innovation: 32,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 1 },
      to: { type: 'Hidden', id: 9 },
      weight: 1,
      innovation: 33,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 0 },
      to: { type: 'Hidden', id: 7 },
      weight: -0.4604310049072937,
      innovation: 36,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 0 },
      to: { type: 'Output', id: 0 },
      weight: 1,
      innovation: 2,
      config: null,
      state: null,
    },
    {
      from: { type: 'Input', id: 0 },
      to: { type: 'Hidden', id: 0 },
      weight: -0.4818243884663207,
      innovation: 1,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 0 },
      to: { type: 'Hidden', id: 10 },
      weight: 1,
      innovation: 38,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 10 },
      to: { type: 'Hidden', id: 8 },
      weight: 1,
      innovation: 39,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 8 },
      to: { type: 'Hidden', id: 11 },
      weight: 0.3494946509288481,
      innovation: 45,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 12 },
      to: { type: 'Hidden', id: 5 },
      weight: 1,
      innovation: 47,
      config: null,
      state: null,
    },
    {
      from: { type: 'Input', id: 0 },
      to: { type: 'Hidden', id: 12 },
      weight: -0.028077490374844194,
      innovation: 46,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 3 },
      to: { type: 'Hidden', id: 14 },
      weight: 1,
      innovation: 54,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 14 },
      to: { type: 'Hidden', id: 7 },
      weight: 1,
      innovation: 55,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 0 },
      to: { type: 'Hidden', id: 3 },
      weight: -0.09888501434673547,
      innovation: 11,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 15 },
      to: { type: 'Hidden', id: 3 },
      weight: 1,
      innovation: 58,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 16 },
      weight: 1,
      innovation: 61,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 16 },
      to: { type: 'Hidden', id: 5 },
      weight: -0.22388342464396782,
      innovation: 62,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 17 },
      to: { type: 'Hidden', id: 11 },
      weight: 1,
      innovation: 66,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 1 },
      weight: -0.0051198692006986235,
      innovation: 68,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 13 },
      to: { type: 'Hidden', id: 18 },
      weight: 1,
      innovation: 69,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 18 },
      to: { type: 'Hidden', id: 1 },
      weight: 0.1598533011283687,
      innovation: 70,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 11 },
      to: { type: 'Hidden', id: 20 },
      weight: 1,
      innovation: 77,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 20 },
      to: { type: 'Hidden', id: 13 },
      weight: 1,
      innovation: 78,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 13 },
      to: { type: 'Hidden', id: 7 },
      weight: -0.43644246449898816,
      innovation: 80,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 21 },
      to: { type: 'Hidden', id: 14 },
      weight: -0.29550469564787885,
      innovation: 82,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 13 },
      to: { type: 'Hidden', id: 19 },
      weight: 0.2757935686624642,
      innovation: 84,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 11 },
      to: { type: 'Hidden', id: 22 },
      weight: 1,
      innovation: 85,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 9 },
      to: { type: 'Hidden', id: 2 },
      weight: -0.11993237394323941,
      innovation: 88,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 23 },
      to: { type: 'Hidden', id: 17 },
      weight: 1,
      innovation: 90,
      config: null,
      state: null,
    },
    {
      from: { type: 'Input', id: 0 },
      to: { type: 'Hidden', id: 23 },
      weight: 0.09300132849400922,
      innovation: 89,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 5 },
      to: { type: 'Hidden', id: 24 },
      weight: 1,
      innovation: 93,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 24 },
      to: { type: 'Hidden', id: 4 },
      weight: 0.1125295248424023,
      innovation: 94,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 1 },
      to: { type: 'Hidden', id: 25 },
      weight: 1,
      innovation: 97,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 25 },
      to: { type: 'Hidden', id: 5 },
      weight: 0.3000532788238499,
      innovation: 98,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 11 },
      weight: 0.42837059708481595,
      innovation: 100,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 3 },
      to: { type: 'Hidden', id: 26 },
      weight: 1,
      innovation: 101,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 19 },
      to: { type: 'Hidden', id: 27 },
      weight: 1,
      innovation: 105,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 27 },
      to: { type: 'Hidden', id: 2 },
      weight: -0.2512692745003977,
      innovation: 106,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 22 },
      to: { type: 'Hidden', id: 1 },
      weight: -0.3990180359835931,
      innovation: 108,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 8 },
      to: { type: 'Hidden', id: 28 },
      weight: 1,
      innovation: 109,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 3 },
      to: { type: 'Hidden', id: 2 },
      weight: -0.3111605991155657,
      innovation: 112,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 5 },
      to: { type: 'Hidden', id: 29 },
      weight: 1,
      innovation: 113,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 29 },
      to: { type: 'Hidden', id: 9 },
      weight: 0.10674753890628041,
      innovation: 114,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 14 },
      to: { type: 'Hidden', id: 25 },
      weight: -0.4752896343237527,
      innovation: 116,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 30 },
      to: { type: 'Hidden', id: 2 },
      weight: 1,
      innovation: 118,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 29 },
      to: { type: 'Hidden', id: 19 },
      weight: -0.34325040809040797,
      innovation: 120,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 11 },
      to: { type: 'Hidden', id: 31 },
      weight: 1,
      innovation: 121,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 31 },
      to: { type: 'Hidden', id: 21 },
      weight: 1,
      innovation: 122,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 26 },
      weight: 0.2429843316039415,
      innovation: 124,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 32 },
      to: { type: 'Hidden', id: 20 },
      weight: 1,
      innovation: 126,
      config: null,
      state: null,
    },
    {
      from: { type: 'Input', id: 0 },
      to: { type: 'Hidden', id: 32 },
      weight: 0.02345474171241224,
      innovation: 125,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 5 },
      to: { type: 'Output', id: 0 },
      weight: 0.2475981036443824,
      innovation: 128,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 9 },
      to: { type: 'Hidden', id: 33 },
      weight: 1,
      innovation: 129,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 33 },
      to: { type: 'Hidden', id: 4 },
      weight: 1,
      innovation: 130,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 4 },
      to: { type: 'Hidden', id: 27 },
      weight: -0.13036550021847715,
      innovation: 132,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 26 },
      to: { type: 'Hidden', id: 34 },
      weight: 1,
      innovation: 133,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 34 },
      to: { type: 'Hidden', id: 4 },
      weight: -0.17604040882623884,
      innovation: 134,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 13 },
      to: { type: 'Hidden', id: 35 },
      weight: 1,
      innovation: 137,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 33 },
      to: { type: 'Hidden', id: 34 },
      weight: 0.46080292881399476,
      innovation: 140,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 10 },
      to: { type: 'Hidden', id: 36 },
      weight: 1,
      innovation: 141,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 36 },
      to: { type: 'Hidden', id: 13 },
      weight: -0.06490413963695763,
      innovation: 142,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 9 },
      to: { type: 'Hidden', id: 34 },
      weight: -0.3597519385886918,
      innovation: 144,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 20 },
      to: { type: 'Hidden', id: 37 },
      weight: 1,
      innovation: 145,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 37 },
      to: { type: 'Hidden', id: 3 },
      weight: -0.07642731597849495,
      innovation: 146,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 28 },
      to: { type: 'Hidden', id: 4 },
      weight: 0.4604027409195781,
      innovation: 148,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 28 },
      to: { type: 'Hidden', id: 38 },
      weight: 1,
      innovation: 149,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 38 },
      to: { type: 'Hidden', id: 15 },
      weight: 1,
      innovation: 150,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 25 },
      to: { type: 'Hidden', id: 24 },
      weight: -0.1029982254461641,
      innovation: 152,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 35 },
      to: { type: 'Hidden', id: 39 },
      weight: 1,
      innovation: 153,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 39 },
      to: { type: 'Hidden', id: 5 },
      weight: -0.164248951160042,
      innovation: 154,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 17 },
      weight: -0.35531460334339204,
      innovation: 156,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 4 },
      to: { type: 'Hidden', id: 40 },
      weight: 1,
      innovation: 157,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 37 },
      to: { type: 'Hidden', id: 34 },
      weight: -0.4110178720326816,
      innovation: 160,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 5 },
      to: { type: 'Hidden', id: 41 },
      weight: 1,
      innovation: 161,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 41 },
      to: { type: 'Hidden', id: 2 },
      weight: 1,
      innovation: 162,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 11 },
      to: { type: 'Hidden', id: 5 },
      weight: -0.41200714224793744,
      innovation: 164,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 17 },
      to: { type: 'Hidden', id: 42 },
      weight: 1,
      innovation: 165,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 42 },
      to: { type: 'Hidden', id: 16 },
      weight: -0.40490951797941976,
      innovation: 166,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 8 },
      to: { type: 'Hidden', id: 21 },
      weight: -0.09244437126285354,
      innovation: 168,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 40 },
      to: { type: 'Hidden', id: 43 },
      weight: 1,
      innovation: 169,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 43 },
      to: { type: 'Hidden', id: 30 },
      weight: 1,
      innovation: 170,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 19 },
      to: { type: 'Hidden', id: 9 },
      weight: 0.2607040267346534,
      innovation: 172,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 11 },
      to: { type: 'Hidden', id: 44 },
      weight: 1,
      innovation: 173,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 44 },
      to: { type: 'Hidden', id: 4 },
      weight: 1,
      innovation: 174,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 31 },
      to: { type: 'Hidden', id: 20 },
      weight: -0.09850637292995645,
      innovation: 176,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 2 },
      to: { type: 'Hidden', id: 45 },
      weight: 1,
      innovation: 177,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 45 },
      to: { type: 'Output', id: 0 },
      weight: 1,
      innovation: 178,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 27 },
      weight: -0.14161276785435595,
      innovation: 180,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 22 },
      to: { type: 'Hidden', id: 46 },
      weight: 1,
      innovation: 181,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 46 },
      to: { type: 'Hidden', id: 19 },
      weight: 1,
      innovation: 182,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 16 },
      to: { type: 'Hidden', id: 31 },
      weight: -0.48187624564771325,
      innovation: 184,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 6 },
      to: { type: 'Hidden', id: 47 },
      weight: 1,
      innovation: 185,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 47 },
      to: { type: 'Hidden', id: 29 },
      weight: -0.33924276497842154,
      innovation: 186,
      config: null,
      state: null,
    },
    {
      from: { type: 'Hidden', id: 3 },
      to: { type: 'Hidden', id: 41 },
      weight: -0.4534786767325185,
      innovation: 188,
      config: null,
      state: null,
    },
  ],
}
