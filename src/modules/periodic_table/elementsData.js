/** Local offline periodic table + nuclear teaching data (no network). */
export const CATEGORIES = {
  "alkali": {
    "label": "Alkali metal",
    "color": "#f87171"
  },
  "alkaline": {
    "label": "Alkaline earth",
    "color": "#fb923c"
  },
  "transition": {
    "label": "Transition metal",
    "color": "#fbbf24"
  },
  "post": {
    "label": "Post-transition",
    "color": "#a3e635"
  },
  "metalloid": {
    "label": "Metalloid",
    "color": "#34d399"
  },
  "nonmetal": {
    "label": "Reactive nonmetal",
    "color": "#22d3ee"
  },
  "halogen": {
    "label": "Halogen",
    "color": "#38bdf8"
  },
  "noble": {
    "label": "Noble gas",
    "color": "#818cf8"
  },
  "lanthanide": {
    "label": "Lanthanide",
    "color": "#e879f9"
  },
  "actinide": {
    "label": "Actinide",
    "color": "#f472b6"
  }
};

export const ELEMENTS = [
  {
    "z": 1,
    "symbol": "H",
    "name": "Hydrogen",
    "mass": 1.008,
    "category": "nonmetal",
    "period": 1,
    "group": 1,
    "config": "1s¹",
    "isotopes": [
      {
        "a": 1,
        "abundance": 99.98,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2+",
        "bindingMeV": 0
      },
      {
        "a": 2,
        "abundance": 0.02,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1+",
        "bindingMeV": 1.112
      },
      {
        "a": 3,
        "abundance": 0,
        "halfLife": "12.32 y",
        "decay": "β⁻",
        "spin": "1/2+",
        "bindingMeV": 2.827
      }
    ],
    "decayChains": null
  },
  {
    "z": 2,
    "symbol": "He",
    "name": "Helium",
    "mass": 4.003,
    "category": "noble",
    "period": 1,
    "group": 18,
    "config": "1s²",
    "isotopes": [
      {
        "a": 3,
        "abundance": 0.0001,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2+",
        "bindingMeV": 2.573
      },
      {
        "a": 4,
        "abundance": 99.9999,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 7.074
      }
    ],
    "decayChains": null
  },
  {
    "z": 3,
    "symbol": "Li",
    "name": "Lithium",
    "mass": 6.94,
    "category": "alkali",
    "period": 2,
    "group": 1,
    "config": "[He] 2s¹",
    "isotopes": [
      {
        "a": 7,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 4,
    "symbol": "Be",
    "name": "Beryllium",
    "mass": 9.012,
    "category": "alkaline",
    "period": 2,
    "group": 2,
    "config": "[He] 2s²",
    "isotopes": [
      {
        "a": 9,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 5,
    "symbol": "B",
    "name": "Boron",
    "mass": 10.81,
    "category": "metalloid",
    "period": 2,
    "group": 13,
    "config": "[He] 2s² 2p¹",
    "isotopes": [
      {
        "a": 11,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 6,
    "symbol": "C",
    "name": "Carbon",
    "mass": 12.011,
    "category": "nonmetal",
    "period": 2,
    "group": 14,
    "config": "[He] 2s² 2p²",
    "isotopes": [
      {
        "a": 12,
        "abundance": 98.9,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 7.68
      },
      {
        "a": 13,
        "abundance": 1.1,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2−",
        "bindingMeV": 7.47
      },
      {
        "a": 14,
        "abundance": 0,
        "halfLife": "5700 y",
        "decay": "β⁻",
        "spin": "0+",
        "bindingMeV": 7.52
      }
    ],
    "decayChains": null
  },
  {
    "z": 7,
    "symbol": "N",
    "name": "Nitrogen",
    "mass": 14.007,
    "category": "nonmetal",
    "period": 2,
    "group": 15,
    "config": "[He] 2s² 2p³",
    "isotopes": [
      {
        "a": 14,
        "abundance": 99.6,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1+",
        "bindingMeV": 7.476
      },
      {
        "a": 15,
        "abundance": 0.4,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2−",
        "bindingMeV": 7.699
      }
    ],
    "decayChains": null
  },
  {
    "z": 8,
    "symbol": "O",
    "name": "Oxygen",
    "mass": 15.999,
    "category": "nonmetal",
    "period": 2,
    "group": 16,
    "config": "[He] 2s² 2p⁴",
    "isotopes": [
      {
        "a": 16,
        "abundance": 99.76,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 7.976
      },
      {
        "a": 18,
        "abundance": 0.2,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 7.767
      }
    ],
    "decayChains": null
  },
  {
    "z": 9,
    "symbol": "F",
    "name": "Fluorine",
    "mass": 18.998,
    "category": "halogen",
    "period": 2,
    "group": 17,
    "config": "[He] 2s² 2p⁵",
    "isotopes": [
      {
        "a": 19,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2+",
        "bindingMeV": 7.779
      },
      {
        "a": 18,
        "abundance": 0,
        "halfLife": "109.8 min",
        "decay": "β⁺",
        "spin": "1+",
        "bindingMeV": 7.632
      }
    ],
    "decayChains": null
  },
  {
    "z": 10,
    "symbol": "Ne",
    "name": "Neon",
    "mass": 20.18,
    "category": "noble",
    "period": 2,
    "group": 18,
    "config": "[He] 2s² 2p⁶",
    "isotopes": [
      {
        "a": 20,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 11,
    "symbol": "Na",
    "name": "Sodium",
    "mass": 22.99,
    "category": "alkali",
    "period": 3,
    "group": 1,
    "config": "[Ne] 3s¹",
    "isotopes": [
      {
        "a": 23,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 12,
    "symbol": "Mg",
    "name": "Magnesium",
    "mass": 24.305,
    "category": "alkaline",
    "period": 3,
    "group": 2,
    "config": "[Ne] 3s²",
    "isotopes": [
      {
        "a": 24,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 13,
    "symbol": "Al",
    "name": "Aluminium",
    "mass": 26.982,
    "category": "post",
    "period": 3,
    "group": 3,
    "config": "[Ne] 3s² 3p¹",
    "isotopes": [
      {
        "a": 27,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 14,
    "symbol": "Si",
    "name": "Silicon",
    "mass": 28.085,
    "category": "metalloid",
    "period": 3,
    "group": 4,
    "config": "[Ne] 3s² 3p²",
    "isotopes": [
      {
        "a": 28,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 15,
    "symbol": "P",
    "name": "Phosphorus",
    "mass": 30.974,
    "category": "nonmetal",
    "period": 3,
    "group": 5,
    "config": "[Ne] 3s² 3p³",
    "isotopes": [
      {
        "a": 31,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2+",
        "bindingMeV": 8.411
      },
      {
        "a": 32,
        "abundance": 0,
        "halfLife": "14.3 d",
        "decay": "β⁻",
        "spin": "1+",
        "bindingMeV": 8.398
      }
    ],
    "decayChains": null
  },
  {
    "z": 16,
    "symbol": "S",
    "name": "Sulfur",
    "mass": 32.06,
    "category": "nonmetal",
    "period": 3,
    "group": 6,
    "config": "[Ne] 3s² 3p⁴",
    "isotopes": [
      {
        "a": 32,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 17,
    "symbol": "Cl",
    "name": "Chlorine",
    "mass": 35.45,
    "category": "halogen",
    "period": 3,
    "group": 7,
    "config": "[Ne] 3s² 3p⁵",
    "isotopes": [
      {
        "a": 35,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 18,
    "symbol": "Ar",
    "name": "Argon",
    "mass": 39.948,
    "category": "noble",
    "period": 3,
    "group": 8,
    "config": "[Ne] 3s² 3p⁶",
    "isotopes": [
      {
        "a": 40,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 19,
    "symbol": "K",
    "name": "Potassium",
    "mass": 39.098,
    "category": "alkali",
    "period": 4,
    "group": 0,
    "config": "[Ar] 4s¹",
    "isotopes": [
      {
        "a": 39,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 20,
    "symbol": "Ca",
    "name": "Calcium",
    "mass": 40.078,
    "category": "alkaline",
    "period": 4,
    "group": 0,
    "config": "[Ar] 4s²",
    "isotopes": [
      {
        "a": 40,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 21,
    "symbol": "Sc",
    "name": "Scandium",
    "mass": 44.956,
    "category": "transition",
    "period": 4,
    "group": 3,
    "config": "[noble core] … (Z = 21)",
    "isotopes": [
      {
        "a": 45,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 22,
    "symbol": "Ti",
    "name": "Titanium",
    "mass": 47.867,
    "category": "transition",
    "period": 4,
    "group": 4,
    "config": "[noble core] … (Z = 22)",
    "isotopes": [
      {
        "a": 48,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 23,
    "symbol": "V",
    "name": "Vanadium",
    "mass": 50.942,
    "category": "transition",
    "period": 4,
    "group": 5,
    "config": "[noble core] … (Z = 23)",
    "isotopes": [
      {
        "a": 51,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 24,
    "symbol": "Cr",
    "name": "Chromium",
    "mass": 51.996,
    "category": "transition",
    "period": 4,
    "group": 6,
    "config": "[noble core] … (Z = 24)",
    "isotopes": [
      {
        "a": 52,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 25,
    "symbol": "Mn",
    "name": "Manganese",
    "mass": 54.938,
    "category": "transition",
    "period": 4,
    "group": 7,
    "config": "[noble core] … (Z = 25)",
    "isotopes": [
      {
        "a": 55,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 26,
    "symbol": "Fe",
    "name": "Iron",
    "mass": 55.845,
    "category": "transition",
    "period": 4,
    "group": 8,
    "config": "[Ar] 3d⁶ 4s²",
    "isotopes": [
      {
        "a": 56,
        "abundance": 91.8,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 8.79
      },
      {
        "a": 54,
        "abundance": 5.8,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 8.736
      },
      {
        "a": 57,
        "abundance": 2.1,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2−",
        "bindingMeV": 8.768
      }
    ],
    "decayChains": null
  },
  {
    "z": 27,
    "symbol": "Co",
    "name": "Cobalt",
    "mass": 58.933,
    "category": "transition",
    "period": 4,
    "group": 9,
    "config": "[noble core] … (Z = 27)",
    "isotopes": [
      {
        "a": 59,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "7/2−",
        "bindingMeV": 8.768
      },
      {
        "a": 60,
        "abundance": 0,
        "halfLife": "5.27 y",
        "decay": "β⁻",
        "spin": "5+",
        "bindingMeV": 8.747
      }
    ],
    "decayChains": null
  },
  {
    "z": 28,
    "symbol": "Ni",
    "name": "Nickel",
    "mass": 58.693,
    "category": "transition",
    "period": 4,
    "group": 10,
    "config": "[Ar] 3d⁸ 4s²",
    "isotopes": [
      {
        "a": 59,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 29,
    "symbol": "Cu",
    "name": "Copper",
    "mass": 63.546,
    "category": "transition",
    "period": 4,
    "group": 11,
    "config": "[Ar] 3d¹⁰ 4s¹",
    "isotopes": [
      {
        "a": 64,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 30,
    "symbol": "Zn",
    "name": "Zinc",
    "mass": 65.38,
    "category": "transition",
    "period": 4,
    "group": 12,
    "config": "[noble core] … (Z = 30)",
    "isotopes": [
      {
        "a": 65,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 31,
    "symbol": "Ga",
    "name": "Gallium",
    "mass": 69.723,
    "category": "post",
    "period": 4,
    "group": 3,
    "config": "[noble core] … (Z = 31)",
    "isotopes": [
      {
        "a": 70,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 32,
    "symbol": "Ge",
    "name": "Germanium",
    "mass": 72.63,
    "category": "metalloid",
    "period": 4,
    "group": 4,
    "config": "[noble core] … (Z = 32)",
    "isotopes": [
      {
        "a": 73,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 33,
    "symbol": "As",
    "name": "Arsenic",
    "mass": 74.922,
    "category": "metalloid",
    "period": 4,
    "group": 5,
    "config": "[noble core] … (Z = 33)",
    "isotopes": [
      {
        "a": 75,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 34,
    "symbol": "Se",
    "name": "Selenium",
    "mass": 78.971,
    "category": "nonmetal",
    "period": 4,
    "group": 6,
    "config": "[noble core] … (Z = 34)",
    "isotopes": [
      {
        "a": 79,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 35,
    "symbol": "Br",
    "name": "Bromine",
    "mass": 79.904,
    "category": "halogen",
    "period": 4,
    "group": 7,
    "config": "[noble core] … (Z = 35)",
    "isotopes": [
      {
        "a": 80,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 36,
    "symbol": "Kr",
    "name": "Krypton",
    "mass": 83.798,
    "category": "noble",
    "period": 4,
    "group": 8,
    "config": "[Ar] 3d¹⁰ 4s² 4p⁶",
    "isotopes": [
      {
        "a": 84,
        "abundance": 57,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 8.718
      },
      {
        "a": 85,
        "abundance": 0,
        "halfLife": "10.8 y",
        "decay": "β⁻",
        "spin": "9/2+",
        "bindingMeV": 8.707
      }
    ],
    "decayChains": null
  },
  {
    "z": 37,
    "symbol": "Rb",
    "name": "Rubidium",
    "mass": 85.468,
    "category": "alkali",
    "period": 5,
    "group": 0,
    "config": "[noble core] … (Z = 37)",
    "isotopes": [
      {
        "a": 85,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 38,
    "symbol": "Sr",
    "name": "Strontium",
    "mass": 87.62,
    "category": "alkaline",
    "period": 5,
    "group": 0,
    "config": "[noble core] … (Z = 38)",
    "isotopes": [
      {
        "a": 88,
        "abundance": 82.6,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 8.733
      },
      {
        "a": 90,
        "abundance": 0,
        "halfLife": "28.8 y",
        "decay": "β⁻",
        "spin": "0+",
        "bindingMeV": 8.71
      }
    ],
    "decayChains": null
  },
  {
    "z": 39,
    "symbol": "Y",
    "name": "Yttrium",
    "mass": 88.906,
    "category": "transition",
    "period": 5,
    "group": 3,
    "config": "[noble core] … (Z = 39)",
    "isotopes": [
      {
        "a": 89,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 40,
    "symbol": "Zr",
    "name": "Zirconium",
    "mass": 91.224,
    "category": "transition",
    "period": 5,
    "group": 4,
    "config": "[noble core] … (Z = 40)",
    "isotopes": [
      {
        "a": 91,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 41,
    "symbol": "Nb",
    "name": "Niobium",
    "mass": 92.906,
    "category": "transition",
    "period": 5,
    "group": 5,
    "config": "[noble core] … (Z = 41)",
    "isotopes": [
      {
        "a": 93,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 42,
    "symbol": "Mo",
    "name": "Molybdenum",
    "mass": 95.95,
    "category": "transition",
    "period": 5,
    "group": 6,
    "config": "[noble core] … (Z = 42)",
    "isotopes": [
      {
        "a": 96,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 43,
    "symbol": "Tc",
    "name": "Technetium",
    "mass": 98,
    "category": "transition",
    "period": 5,
    "group": 7,
    "config": "[noble core] … (Z = 43)",
    "isotopes": [
      {
        "a": 99,
        "abundance": 0,
        "halfLife": "2.11×10⁵ y",
        "decay": "β⁻",
        "spin": "9/2+",
        "bindingMeV": 8.614
      },
      {
        "a": 99,
        "abundance": 0,
        "halfLife": "6.01 h",
        "decay": "IT",
        "spin": "1/2−",
        "bindingMeV": 8.614,
        "aLabel": "99m"
      }
    ],
    "decayChains": null
  },
  {
    "z": 44,
    "symbol": "Ru",
    "name": "Ruthenium",
    "mass": 101.07,
    "category": "transition",
    "period": 5,
    "group": 8,
    "config": "[noble core] … (Z = 44)",
    "isotopes": [
      {
        "a": 101,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 45,
    "symbol": "Rh",
    "name": "Rhodium",
    "mass": 102.91,
    "category": "transition",
    "period": 5,
    "group": 9,
    "config": "[noble core] … (Z = 45)",
    "isotopes": [
      {
        "a": 103,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 46,
    "symbol": "Pd",
    "name": "Palladium",
    "mass": 106.42,
    "category": "transition",
    "period": 5,
    "group": 10,
    "config": "[noble core] … (Z = 46)",
    "isotopes": [
      {
        "a": 106,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 47,
    "symbol": "Ag",
    "name": "Silver",
    "mass": 107.87,
    "category": "transition",
    "period": 5,
    "group": 11,
    "config": "[noble core] … (Z = 47)",
    "isotopes": [
      {
        "a": 107,
        "abundance": 51.8,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2−",
        "bindingMeV": 8.554
      },
      {
        "a": 109,
        "abundance": 48.2,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2−",
        "bindingMeV": 8.553
      }
    ],
    "decayChains": null
  },
  {
    "z": 48,
    "symbol": "Cd",
    "name": "Cadmium",
    "mass": 112.41,
    "category": "transition",
    "period": 5,
    "group": 12,
    "config": "[noble core] … (Z = 48)",
    "isotopes": [
      {
        "a": 112,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 49,
    "symbol": "In",
    "name": "Indium",
    "mass": 114.82,
    "category": "post",
    "period": 5,
    "group": 3,
    "config": "[noble core] … (Z = 49)",
    "isotopes": [
      {
        "a": 115,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 50,
    "symbol": "Sn",
    "name": "Tin",
    "mass": 118.71,
    "category": "post",
    "period": 5,
    "group": 4,
    "config": "[noble core] … (Z = 50)",
    "isotopes": [
      {
        "a": 119,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 51,
    "symbol": "Sb",
    "name": "Antimony",
    "mass": 121.76,
    "category": "metalloid",
    "period": 5,
    "group": 5,
    "config": "[noble core] … (Z = 51)",
    "isotopes": [
      {
        "a": 122,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 52,
    "symbol": "Te",
    "name": "Tellurium",
    "mass": 127.6,
    "category": "metalloid",
    "period": 5,
    "group": 6,
    "config": "[noble core] … (Z = 52)",
    "isotopes": [
      {
        "a": 128,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 53,
    "symbol": "I",
    "name": "Iodine",
    "mass": 126.9,
    "category": "halogen",
    "period": 5,
    "group": 7,
    "config": "[noble core] … (Z = 53)",
    "isotopes": [
      {
        "a": 127,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "5/2+",
        "bindingMeV": 8.446
      },
      {
        "a": 131,
        "abundance": 0,
        "halfLife": "8.02 d",
        "decay": "β⁻",
        "spin": "7/2+",
        "bindingMeV": 8.424
      }
    ],
    "decayChains": null
  },
  {
    "z": 54,
    "symbol": "Xe",
    "name": "Xenon",
    "mass": 131.29,
    "category": "noble",
    "period": 5,
    "group": 8,
    "config": "[Kr] 4d¹⁰ 5s² 5p⁶",
    "isotopes": [
      {
        "a": 132,
        "abundance": 26.9,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 8.442
      },
      {
        "a": 133,
        "abundance": 0,
        "halfLife": "5.25 d",
        "decay": "β⁻",
        "spin": "3/2+",
        "bindingMeV": 8.436
      }
    ],
    "decayChains": null
  },
  {
    "z": 55,
    "symbol": "Cs",
    "name": "Caesium",
    "mass": 132.91,
    "category": "alkali",
    "period": 6,
    "group": 0,
    "config": "[Xe] 6s¹",
    "isotopes": [
      {
        "a": 133,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "7/2+",
        "bindingMeV": 8.483
      },
      {
        "a": 137,
        "abundance": 0,
        "halfLife": "30.1 y",
        "decay": "β⁻",
        "spin": "7/2+",
        "bindingMeV": 8.389
      }
    ],
    "decayChains": null
  },
  {
    "z": 56,
    "symbol": "Ba",
    "name": "Barium",
    "mass": 137.33,
    "category": "alkaline",
    "period": 6,
    "group": 0,
    "config": "[Xe] 6s²",
    "isotopes": [
      {
        "a": 137,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 57,
    "symbol": "La",
    "name": "Lanthanum",
    "mass": 138.91,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 57)",
    "isotopes": [
      {
        "a": 139,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 58,
    "symbol": "Ce",
    "name": "Cerium",
    "mass": 140.12,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 58)",
    "isotopes": [
      {
        "a": 140,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 59,
    "symbol": "Pr",
    "name": "Praseodymium",
    "mass": 140.91,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 59)",
    "isotopes": [
      {
        "a": 141,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 60,
    "symbol": "Nd",
    "name": "Neodymium",
    "mass": 144.24,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 60)",
    "isotopes": [
      {
        "a": 144,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 61,
    "symbol": "Pm",
    "name": "Promethium",
    "mass": 145,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 61)",
    "isotopes": [
      {
        "a": 145,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 62,
    "symbol": "Sm",
    "name": "Samarium",
    "mass": 150.36,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 62)",
    "isotopes": [
      {
        "a": 150,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 63,
    "symbol": "Eu",
    "name": "Europium",
    "mass": 151.96,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 63)",
    "isotopes": [
      {
        "a": 152,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 64,
    "symbol": "Gd",
    "name": "Gadolinium",
    "mass": 157.25,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 64)",
    "isotopes": [
      {
        "a": 157,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 65,
    "symbol": "Tb",
    "name": "Terbium",
    "mass": 158.93,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 65)",
    "isotopes": [
      {
        "a": 159,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 66,
    "symbol": "Dy",
    "name": "Dysprosium",
    "mass": 162.5,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 66)",
    "isotopes": [
      {
        "a": 163,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 67,
    "symbol": "Ho",
    "name": "Holmium",
    "mass": 164.93,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 67)",
    "isotopes": [
      {
        "a": 165,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 68,
    "symbol": "Er",
    "name": "Erbium",
    "mass": 167.26,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 68)",
    "isotopes": [
      {
        "a": 167,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 69,
    "symbol": "Tm",
    "name": "Thulium",
    "mass": 168.93,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 69)",
    "isotopes": [
      {
        "a": 169,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 70,
    "symbol": "Yb",
    "name": "Ytterbium",
    "mass": 173.05,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 70)",
    "isotopes": [
      {
        "a": 173,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 71,
    "symbol": "Lu",
    "name": "Lutetium",
    "mass": 174.97,
    "category": "lanthanide",
    "period": 6,
    "group": 0,
    "config": "[noble core] … (Z = 71)",
    "isotopes": [
      {
        "a": 175,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 72,
    "symbol": "Hf",
    "name": "Hafnium",
    "mass": 178.49,
    "category": "transition",
    "period": 6,
    "group": 4,
    "config": "[noble core] … (Z = 72)",
    "isotopes": [
      {
        "a": 178,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 73,
    "symbol": "Ta",
    "name": "Tantalum",
    "mass": 180.95,
    "category": "transition",
    "period": 6,
    "group": 5,
    "config": "[noble core] … (Z = 73)",
    "isotopes": [
      {
        "a": 181,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 74,
    "symbol": "W",
    "name": "Tungsten",
    "mass": 183.84,
    "category": "transition",
    "period": 6,
    "group": 6,
    "config": "[noble core] … (Z = 74)",
    "isotopes": [
      {
        "a": 184,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 75,
    "symbol": "Re",
    "name": "Rhenium",
    "mass": 186.21,
    "category": "transition",
    "period": 6,
    "group": 7,
    "config": "[noble core] … (Z = 75)",
    "isotopes": [
      {
        "a": 186,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 76,
    "symbol": "Os",
    "name": "Osmium",
    "mass": 190.23,
    "category": "transition",
    "period": 6,
    "group": 8,
    "config": "[noble core] … (Z = 76)",
    "isotopes": [
      {
        "a": 190,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 77,
    "symbol": "Ir",
    "name": "Iridium",
    "mass": 192.22,
    "category": "transition",
    "period": 6,
    "group": 9,
    "config": "[noble core] … (Z = 77)",
    "isotopes": [
      {
        "a": 192,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 78,
    "symbol": "Pt",
    "name": "Platinum",
    "mass": 195.08,
    "category": "transition",
    "period": 6,
    "group": 10,
    "config": "[noble core] … (Z = 78)",
    "isotopes": [
      {
        "a": 195,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 79,
    "symbol": "Au",
    "name": "Gold",
    "mass": 196.97,
    "category": "transition",
    "period": 6,
    "group": 11,
    "config": "[Xe] 4f¹⁴ 5d¹⁰ 6s¹",
    "isotopes": [
      {
        "a": 197,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "3/2+",
        "bindingMeV": 7.916
      }
    ],
    "decayChains": null
  },
  {
    "z": 80,
    "symbol": "Hg",
    "name": "Mercury",
    "mass": 200.59,
    "category": "transition",
    "period": 6,
    "group": 12,
    "config": "[noble core] … (Z = 80)",
    "isotopes": [
      {
        "a": 201,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 81,
    "symbol": "Tl",
    "name": "Thallium",
    "mass": 204.38,
    "category": "post",
    "period": 6,
    "group": 3,
    "config": "[noble core] … (Z = 81)",
    "isotopes": [
      {
        "a": 204,
        "abundance": 100,
        "halfLife": "stable",
        "decay": "—",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 82,
    "symbol": "Pb",
    "name": "Lead",
    "mass": 207.2,
    "category": "post",
    "period": 6,
    "group": 4,
    "config": "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²",
    "isotopes": [
      {
        "a": 206,
        "abundance": 24.1,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 7.875
      },
      {
        "a": 207,
        "abundance": 22.1,
        "halfLife": "stable",
        "decay": "—",
        "spin": "1/2−",
        "bindingMeV": 7.87
      },
      {
        "a": 208,
        "abundance": 52.4,
        "halfLife": "stable",
        "decay": "—",
        "spin": "0+",
        "bindingMeV": 7.867
      }
    ],
    "decayChains": null
  },
  {
    "z": 83,
    "symbol": "Bi",
    "name": "Bismuth",
    "mass": 208.98,
    "category": "post",
    "period": 6,
    "group": 5,
    "config": "[noble core] … (Z = 83)",
    "isotopes": [
      {
        "a": 209,
        "abundance": 100,
        "halfLife": "1.9×10¹⁹ y",
        "decay": "α",
        "spin": "9/2−",
        "bindingMeV": 7.848
      }
    ],
    "decayChains": null
  },
  {
    "z": 84,
    "symbol": "Po",
    "name": "Polonium",
    "mass": 209,
    "category": "post",
    "period": 6,
    "group": 6,
    "config": "[noble core] … (Z = 84)",
    "isotopes": [
      {
        "a": 210,
        "abundance": 0,
        "halfLife": "138.4 d",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.834
      }
    ],
    "decayChains": null
  },
  {
    "z": 85,
    "symbol": "At",
    "name": "Astatine",
    "mass": 210,
    "category": "halogen",
    "period": 6,
    "group": 7,
    "config": "[noble core] … (Z = 85)",
    "isotopes": [
      {
        "a": 210,
        "abundance": null,
        "halfLife": "long-lived / rare",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 86,
    "symbol": "Rn",
    "name": "Radon",
    "mass": 222,
    "category": "noble",
    "period": 6,
    "group": 8,
    "config": "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶",
    "isotopes": [
      {
        "a": 222,
        "abundance": 0,
        "halfLife": "3.82 d",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.695
      }
    ],
    "decayChains": null
  },
  {
    "z": 87,
    "symbol": "Fr",
    "name": "Francium",
    "mass": 223,
    "category": "alkali",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 87)",
    "isotopes": [
      {
        "a": 223,
        "abundance": null,
        "halfLife": "long-lived / rare",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 88,
    "symbol": "Ra",
    "name": "Radium",
    "mass": 226,
    "category": "alkaline",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 88)",
    "isotopes": [
      {
        "a": 226,
        "abundance": 0,
        "halfLife": "1600 y",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.662
      }
    ],
    "decayChains": [
      {
        "id": "ra226",
        "title": "Radium-226 path (part of U-238 series)",
        "steps": [
          {
            "nuclide": "²²⁶Ra",
            "mode": "α",
            "hl": "1600 y"
          },
          {
            "nuclide": "²²²Rn",
            "mode": "α",
            "hl": "3.82 d"
          },
          {
            "nuclide": "²¹⁸Po",
            "mode": "α",
            "hl": "3.10 min"
          },
          {
            "nuclide": "²¹⁴Pb",
            "mode": "β⁻",
            "hl": "26.8 min"
          },
          {
            "nuclide": "²¹⁴Bi",
            "mode": "β⁻",
            "hl": "19.9 min"
          },
          {
            "nuclide": "²¹⁴Po",
            "mode": "α",
            "hl": "164 µs"
          },
          {
            "nuclide": "²¹⁰Pb",
            "mode": "β⁻",
            "hl": "22.2 y"
          },
          {
            "nuclide": "²¹⁰Bi",
            "mode": "β⁻",
            "hl": "5.01 d"
          },
          {
            "nuclide": "²¹⁰Po",
            "mode": "α",
            "hl": "138.4 d"
          },
          {
            "nuclide": "²⁰⁶Pb",
            "mode": "stable",
            "hl": "—"
          }
        ]
      }
    ]
  },
  {
    "z": 89,
    "symbol": "Ac",
    "name": "Actinium",
    "mass": 227,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 89)",
    "isotopes": [
      {
        "a": 227,
        "abundance": null,
        "halfLife": "long-lived / rare",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 90,
    "symbol": "Th",
    "name": "Thorium",
    "mass": 232.04,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[Rn] 6d² 7s²",
    "isotopes": [
      {
        "a": 232,
        "abundance": 100,
        "halfLife": "1.40×10¹⁰ y",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.614
      },
      {
        "a": 230,
        "abundance": 0,
        "halfLife": "7.54×10⁴ y",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.633
      }
    ],
    "decayChains": [
      {
        "id": "th232",
        "title": "Thorium-232 series (4n)",
        "steps": [
          {
            "nuclide": "²³²Th",
            "mode": "α",
            "hl": "1.40×10¹⁰ y"
          },
          {
            "nuclide": "²²⁸Ra",
            "mode": "β⁻",
            "hl": "5.75 y"
          },
          {
            "nuclide": "²²⁸Ac",
            "mode": "β⁻",
            "hl": "6.15 h"
          },
          {
            "nuclide": "²²⁸Th",
            "mode": "α",
            "hl": "1.91 y"
          },
          {
            "nuclide": "²²⁴Ra",
            "mode": "α",
            "hl": "3.63 d"
          },
          {
            "nuclide": "²²⁰Rn",
            "mode": "α",
            "hl": "55.6 s"
          },
          {
            "nuclide": "²¹⁶Po",
            "mode": "α",
            "hl": "0.145 s"
          },
          {
            "nuclide": "²¹²Pb",
            "mode": "β⁻",
            "hl": "10.6 h"
          },
          {
            "nuclide": "²¹²Bi",
            "mode": "β⁻ / α",
            "hl": "60.6 min"
          },
          {
            "nuclide": "²⁰⁸Pb",
            "mode": "stable",
            "hl": "—"
          }
        ]
      }
    ]
  },
  {
    "z": 91,
    "symbol": "Pa",
    "name": "Protactinium",
    "mass": 231.04,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 91)",
    "isotopes": [
      {
        "a": 231,
        "abundance": null,
        "halfLife": "long-lived / rare",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 92,
    "symbol": "U",
    "name": "Uranium",
    "mass": 238.03,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[Rn] 5f³ 6d¹ 7s²",
    "isotopes": [
      {
        "a": 238,
        "abundance": 99.274,
        "halfLife": "4.468×10⁹ y",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.57
      },
      {
        "a": 235,
        "abundance": 0.72,
        "halfLife": "7.04×10⁸ y",
        "decay": "α",
        "spin": "7/2−",
        "bindingMeV": 7.591
      },
      {
        "a": 234,
        "abundance": 0.005,
        "halfLife": "2.455×10⁵ y",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.601
      },
      {
        "a": 233,
        "abundance": 0,
        "halfLife": "1.592×10⁵ y",
        "decay": "α",
        "spin": "5/2+",
        "bindingMeV": 7.606
      }
    ],
    "decayChains": [
      {
        "id": "u238",
        "title": "Uranium-238 series (4n+2)",
        "steps": [
          {
            "nuclide": "²³⁸U",
            "mode": "α",
            "hl": "4.468×10⁹ y"
          },
          {
            "nuclide": "²³⁴Th",
            "mode": "β⁻",
            "hl": "24.1 d"
          },
          {
            "nuclide": "²³⁴Pa",
            "mode": "β⁻",
            "hl": "1.17 min"
          },
          {
            "nuclide": "²³⁴U",
            "mode": "α",
            "hl": "2.455×10⁵ y"
          },
          {
            "nuclide": "²³⁰Th",
            "mode": "α",
            "hl": "7.54×10⁴ y"
          },
          {
            "nuclide": "²²⁶Ra",
            "mode": "α",
            "hl": "1600 y"
          },
          {
            "nuclide": "²²²Rn",
            "mode": "α",
            "hl": "3.82 d"
          },
          {
            "nuclide": "²¹⁸Po",
            "mode": "α",
            "hl": "3.10 min"
          },
          {
            "nuclide": "²¹⁴Pb",
            "mode": "β⁻",
            "hl": "26.8 min"
          },
          {
            "nuclide": "²¹⁴Bi",
            "mode": "β⁻",
            "hl": "19.9 min"
          },
          {
            "nuclide": "²¹⁴Po",
            "mode": "α",
            "hl": "164 µs"
          },
          {
            "nuclide": "²¹⁰Pb",
            "mode": "β⁻",
            "hl": "22.2 y"
          },
          {
            "nuclide": "²¹⁰Bi",
            "mode": "β⁻",
            "hl": "5.01 d"
          },
          {
            "nuclide": "²¹⁰Po",
            "mode": "α",
            "hl": "138.4 d"
          },
          {
            "nuclide": "²⁰⁶Pb",
            "mode": "stable",
            "hl": "—"
          }
        ]
      },
      {
        "id": "u235",
        "title": "Uranium-235 series (4n+3)",
        "steps": [
          {
            "nuclide": "²³⁵U",
            "mode": "α",
            "hl": "7.04×10⁸ y"
          },
          {
            "nuclide": "²³¹Th",
            "mode": "β⁻",
            "hl": "25.5 h"
          },
          {
            "nuclide": "²³¹Pa",
            "mode": "α",
            "hl": "3.28×10⁴ y"
          },
          {
            "nuclide": "²²⁷Ac",
            "mode": "β⁻",
            "hl": "21.8 y"
          },
          {
            "nuclide": "²²⁷Th",
            "mode": "α",
            "hl": "18.7 d"
          },
          {
            "nuclide": "²²³Ra",
            "mode": "α",
            "hl": "11.4 d"
          },
          {
            "nuclide": "²¹⁹Rn",
            "mode": "α",
            "hl": "3.96 s"
          },
          {
            "nuclide": "²¹⁵Po",
            "mode": "α",
            "hl": "1.78 ms"
          },
          {
            "nuclide": "²¹¹Pb",
            "mode": "β⁻",
            "hl": "36.1 min"
          },
          {
            "nuclide": "²¹¹Bi",
            "mode": "α",
            "hl": "2.14 min"
          },
          {
            "nuclide": "²⁰⁷Tl",
            "mode": "β⁻",
            "hl": "4.77 min"
          },
          {
            "nuclide": "²⁰⁷Pb",
            "mode": "stable",
            "hl": "—"
          }
        ]
      }
    ]
  },
  {
    "z": 93,
    "symbol": "Np",
    "name": "Neptunium",
    "mass": 237,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 93)",
    "isotopes": [
      {
        "a": 237,
        "abundance": 0,
        "halfLife": "2.14×10⁶ y",
        "decay": "α",
        "spin": "5/2+",
        "bindingMeV": 7.575
      }
    ],
    "decayChains": null
  },
  {
    "z": 94,
    "symbol": "Pu",
    "name": "Plutonium",
    "mass": 244,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[Rn] 5f⁶ 7s²",
    "isotopes": [
      {
        "a": 239,
        "abundance": 0,
        "halfLife": "2.411×10⁴ y",
        "decay": "α",
        "spin": "1/2+",
        "bindingMeV": 7.56
      },
      {
        "a": 238,
        "abundance": 0,
        "halfLife": "87.7 y",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.568
      },
      {
        "a": 240,
        "abundance": 0,
        "halfLife": "6561 y",
        "decay": "α",
        "spin": "0+",
        "bindingMeV": 7.556
      }
    ],
    "decayChains": [
      {
        "id": "pu239",
        "title": "Plutonium-239 → uranium-235 series",
        "steps": [
          {
            "nuclide": "²³⁹Pu",
            "mode": "α",
            "hl": "2.411×10⁴ y"
          },
          {
            "nuclide": "²³⁵U",
            "mode": "α",
            "hl": "7.04×10⁸ y"
          },
          {
            "nuclide": "…",
            "mode": "→",
            "hl": "joins U-235 series"
          }
        ]
      }
    ]
  },
  {
    "z": 95,
    "symbol": "Am",
    "name": "Americium",
    "mass": 243,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 95)",
    "isotopes": [
      {
        "a": 241,
        "abundance": 0,
        "halfLife": "432.2 y",
        "decay": "α",
        "spin": "5/2−",
        "bindingMeV": 7.543
      }
    ],
    "decayChains": null
  },
  {
    "z": 96,
    "symbol": "Cm",
    "name": "Curium",
    "mass": 247,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 96)",
    "isotopes": [
      {
        "a": 247,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 97,
    "symbol": "Bk",
    "name": "Berkelium",
    "mass": 247,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 97)",
    "isotopes": [
      {
        "a": 247,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 98,
    "symbol": "Cf",
    "name": "Californium",
    "mass": 251,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 98)",
    "isotopes": [
      {
        "a": 251,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 99,
    "symbol": "Es",
    "name": "Einsteinium",
    "mass": 252,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 99)",
    "isotopes": [
      {
        "a": 252,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 100,
    "symbol": "Fm",
    "name": "Fermium",
    "mass": 257,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 100)",
    "isotopes": [
      {
        "a": 257,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 101,
    "symbol": "Md",
    "name": "Mendelevium",
    "mass": 258,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 101)",
    "isotopes": [
      {
        "a": 258,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 102,
    "symbol": "No",
    "name": "Nobelium",
    "mass": 259,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 102)",
    "isotopes": [
      {
        "a": 259,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 103,
    "symbol": "Lr",
    "name": "Lawrencium",
    "mass": 266,
    "category": "actinide",
    "period": 7,
    "group": 0,
    "config": "[noble core] … (Z = 103)",
    "isotopes": [
      {
        "a": 266,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 104,
    "symbol": "Rf",
    "name": "Rutherfordium",
    "mass": 267,
    "category": "transition",
    "period": 7,
    "group": 4,
    "config": "[noble core] … (Z = 104)",
    "isotopes": [
      {
        "a": 267,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 105,
    "symbol": "Db",
    "name": "Dubnium",
    "mass": 268,
    "category": "transition",
    "period": 7,
    "group": 5,
    "config": "[noble core] … (Z = 105)",
    "isotopes": [
      {
        "a": 268,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 106,
    "symbol": "Sg",
    "name": "Seaborgium",
    "mass": 269,
    "category": "transition",
    "period": 7,
    "group": 6,
    "config": "[noble core] … (Z = 106)",
    "isotopes": [
      {
        "a": 269,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 107,
    "symbol": "Bh",
    "name": "Bohrium",
    "mass": 270,
    "category": "transition",
    "period": 7,
    "group": 7,
    "config": "[noble core] … (Z = 107)",
    "isotopes": [
      {
        "a": 270,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 108,
    "symbol": "Hs",
    "name": "Hassium",
    "mass": 269,
    "category": "transition",
    "period": 7,
    "group": 8,
    "config": "[noble core] … (Z = 108)",
    "isotopes": [
      {
        "a": 269,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 109,
    "symbol": "Mt",
    "name": "Meitnerium",
    "mass": 278,
    "category": "transition",
    "period": 7,
    "group": 9,
    "config": "[noble core] … (Z = 109)",
    "isotopes": [
      {
        "a": 278,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 110,
    "symbol": "Ds",
    "name": "Darmstadtium",
    "mass": 281,
    "category": "transition",
    "period": 7,
    "group": 10,
    "config": "[noble core] … (Z = 110)",
    "isotopes": [
      {
        "a": 281,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 111,
    "symbol": "Rg",
    "name": "Roentgenium",
    "mass": 282,
    "category": "transition",
    "period": 7,
    "group": 11,
    "config": "[noble core] … (Z = 111)",
    "isotopes": [
      {
        "a": 282,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 112,
    "symbol": "Cn",
    "name": "Copernicium",
    "mass": 285,
    "category": "transition",
    "period": 7,
    "group": 12,
    "config": "[noble core] … (Z = 112)",
    "isotopes": [
      {
        "a": 285,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 113,
    "symbol": "Nh",
    "name": "Nihonium",
    "mass": 286,
    "category": "post",
    "period": 7,
    "group": 13,
    "config": "[noble core] … (Z = 113)",
    "isotopes": [
      {
        "a": 286,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 114,
    "symbol": "Fl",
    "name": "Flerovium",
    "mass": 289,
    "category": "post",
    "period": 7,
    "group": 14,
    "config": "[noble core] … (Z = 114)",
    "isotopes": [
      {
        "a": 289,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 115,
    "symbol": "Mc",
    "name": "Moscovium",
    "mass": 290,
    "category": "post",
    "period": 7,
    "group": 15,
    "config": "[noble core] … (Z = 115)",
    "isotopes": [
      {
        "a": 290,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 116,
    "symbol": "Lv",
    "name": "Livermorium",
    "mass": 293,
    "category": "post",
    "period": 7,
    "group": 16,
    "config": "[noble core] … (Z = 116)",
    "isotopes": [
      {
        "a": 293,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 117,
    "symbol": "Ts",
    "name": "Tennessine",
    "mass": 294,
    "category": "halogen",
    "period": 7,
    "group": 17,
    "config": "[noble core] … (Z = 117)",
    "isotopes": [
      {
        "a": 294,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  },
  {
    "z": 118,
    "symbol": "Og",
    "name": "Oganesson",
    "mass": 294,
    "category": "noble",
    "period": 7,
    "group": 18,
    "config": "[noble core] … (Z = 118)",
    "isotopes": [
      {
        "a": 294,
        "abundance": null,
        "halfLife": "synthetic",
        "decay": "α / β",
        "spin": "—",
        "bindingMeV": null
      }
    ],
    "decayChains": null
  }
];

export function getElement(z) {
  for (let i = 0; i < ELEMENTS.length; i++) if (ELEMENTS[i].z === z) return ELEMENTS[i];
  return null;
}

export function getElementBySymbol(sym) {
  const s = String(sym || "");
  for (let i = 0; i < ELEMENTS.length; i++) if (ELEMENTS[i].symbol === s) return ELEMENTS[i];
  return null;
}
