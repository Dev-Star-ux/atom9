// Registry — modules grouped by topic for sidebar (NAV_GROUPS).
// Module interface: { id, icon, group?, navKey, titleKey, descKey, create(ctx) }

import cathodeRay from './cathode_ray/module.js';
import millikan from './millikan/module.js';
import massSpec from './mass_spec/module.js';
import crossSection from './cross_section/module.js';
import planetary from './planetary/module.js';
import planetaryDisadvantages from './planetary_disadvantages/module.js';
import cloudChamber from './cloud_chamber/module.js';
import rutherford from './rutherford/module.js';
import mechanicalEquilibrium from './mechanical_equilibrium/module.js';
import spectralDensity from './spectral_density/module.js';
import bbFeatures from './bb_features/module.js';
import rayleighJeans from './rayleigh_jeans/module.js';
import planck from './planck/module.js';
import photoelectric from './photoelectric/module.js';
import prismSpectroscope from './prism_spectroscope/module.js';
import frankHertz from './frank_hertz/module.js';
import hydrogenSpectrum from './hydrogen_spectrum/module.js';
import waveTheory from './wave_theory/module.js';
import quantumTheory from './quantum_theory/module.js';
import waveBeam from './wave_beam/module.js';
import doubleSlit from './double_slit/module.js';
import davissonGermer from './davisson_germer/module.js';
import deBroglie from './de_broglie/module.js';
import bohr from './bohr/module.js';
import schrodingerDiscovery from './schrodinger_discovery/module.js';
import infiniteWell from './infinite_well/module.js';
import uncertaintyXp from './uncertainty_xp/module.js';
import uncertaintyEt from './uncertainty_et/module.js';
import waveParticleProbability from './wave_particle_probability/module.js';
import wavefunctionStats from './wavefunction_stats/module.js';
import orbital from './orbital/module.js';
import lightDuality from './light_duality/module.js';
import fourierWaves from './fourier_waves/module.js';
import waveEquation2d from './wave_equation_2d/module.js';
import quantumHo from './quantum_ho/module.js';
import quantumTunneling from './quantum_tunneling/module.js';
import heatDiffusion from './heat_diffusion/module.js';
import eigenvalueLab from './eigenvalue_lab/module.js';
import schrodingerCalculator from './schrodinger_calculator/module.js';
import fourierTransform from './fourier_transform/module.js';
import variationalMethod from './variational_method/module.js';
import complexPhasor from './complex_phasor/module.js';
import sphericalHarmonics from './spherical_harmonics/module.js';
import sturmLiouville from './sturm_liouville/module.js';
import pdeVisual from './pde_visual/module.js';
import numericalMethods from './numerical_methods/module.js';
import xrayDiscovery from './xray_discovery/module.js';
import xrayWave from './xray_wave/module.js';
import xrayParticle from './xray_particle/module.js';
import compton from './compton/module.js';
import nuclearReactor from './nuclear_reactor/module.js';
import nuclearFission from './nuclear_fission/module.js';
import fissionMechanism from './fission_mechanism/module.js';
import atomicBomb from './atomic_bomb/module.js';
import nuclearFusion from './nuclear_fusion/module.js';
import radioactiveDecay from './radioactive_decay/module.js';
import bindingEnergy from './binding_energy/module.js';
import alphaBetaDecay from './alpha_beta_decay/module.js';
import geigerCounter from './geiger_counter/module.js';
import neutronModerator from './neutron_moderator/module.js';
import decayChain from './decay_chain/module.js';
import petTracer from './pet_tracer/module.js';
import naiSpectrometer from './nai_spectrometer/module.js';
import hpgeVsNai from './hpge_vs_nai/module.js';
import gmDeadTime from './gm_dead_time/module.js';
import alphaSpectroscopy from './alpha_spectroscopy/module.js';
import neutronDetector from './neutron_detector/module.js';
import petCoincidence from './pet_coincidence/module.js';
import shieldingDetector from './shielding_detector/module.js';
import atomicNuclearFormulas from './atomic_nuclear_formulas/module.js';
import periodicTable from './periodic_table/module.js';
import chartOfNuclides from './chart_of_nuclides/module.js';
import nuclearReaction from './nuclear_reaction/module.js';
import labCanvas from './lab_canvas/module.js';
import applications from './applications/module.js';
import quantumComputer from './quantum_computer/module.js';
import nmrMri from './nmr_mri/module.js';
import esrEpr from './esr_epr/module.js';
import laserPrinter from './laser_printer/module.js';
import electrostaticShielding from './electrostatic_shielding/module.js';
import electrosprayspinning from './electrospray_spinning/module.js';
import electrostaticPrecipitator from './electrostatic_precipitator/module.js';
import microElectrokinetics from './micro_electrokinetics/module.js';
import meissnerEffect from './meissner_effect/module.js';
import wheatstoneBridge from './wheatstone_bridge/module.js';
import thermionicEmission from './thermionic_emission/module.js';
import photomultiplierTube from './photomultiplier_tube/module.js';
import glowDischarge from './glow_discharge/module.js';
import arcDischarge from './arc_discharge/module.js';
import sparkDischarge from './spark_discharge/module.js';
import coronaDischarge from './corona_discharge/module.js';
import lightningRod from './lightning_rod/module.js';
import electrolysisCopper from './electrolysis_copper/module.js';
import pnJunction from './pn_junction/module.js';
import seebeckEffect from './seebeck_effect/module.js';
import peltierEffect from './peltier_effect/module.js';
import cyclotron from './cyclotron/module.js';
import oscilloscopeCrt from './oscilloscope_crt/module.js';
import electronMicroscope from './electron_microscope/module.js';
import hallEffect from './hall_effect/module.js';
import diamagnetism from './diamagnetism/module.js';
import eddyCurrents from './eddy_currents/module.js';
import faradayDisc from './faraday_disc/module.js';
import acPowerFactor from './ac_power_factor/module.js';
import rotatingMagneticField from './rotating_magnetic_field/module.js';
import forcedEmResonance from './forced_em_resonance/module.js';
import emWaveRadiation from './em_wave_radiation/module.js';
import emWaveRefraction from './em_wave_refraction/module.js';
import radarPrinciples from './radar_principles/module.js';
import stealthTechnology from './stealth_technology/module.js';
import microwaveOven from './microwave_oven/module.js';

export const NAV_GROUPS = [
  { id: 'intro', titleKey: 'nav.groups.intro' },
  { id: 'thermal', titleKey: 'nav.groups.thermal' },
  { id: 'waves', titleKey: 'nav.groups.waves' },
  { id: 'quantum', titleKey: 'nav.groups.quantum' },
  { id: 'math_physics', titleKey: 'nav.groups.mathPhysics' },
  { id: 'xray', titleKey: 'nav.groups.xray' },
  { id: 'nuclear', titleKey: 'nav.groups.nuclear' },
  { id: 'detectors', titleKey: 'nav.groups.detectors' },
  { id: 'applications', titleKey: 'nav.groups.applications' },
  { id: 'electromagnetics', titleKey: 'nav.groups.electromagnetics' },
];

const GROUP_LISTS = {
  intro: [cathodeRay, millikan, massSpec, crossSection, planetary, planetaryDisadvantages, cloudChamber, rutherford, mechanicalEquilibrium],
  thermal: [spectralDensity, bbFeatures, rayleighJeans, planck, photoelectric, prismSpectroscope, frankHertz, hydrogenSpectrum],
  waves: [waveTheory, quantumTheory, waveBeam, doubleSlit, davissonGermer, deBroglie],
  quantum: [bohr, schrodingerDiscovery, infiniteWell, uncertaintyXp, uncertaintyEt, waveParticleProbability, wavefunctionStats, orbital, lightDuality],
  math_physics: [
    fourierWaves, waveEquation2d, quantumHo, quantumTunneling, heatDiffusion, eigenvalueLab,
    schrodingerCalculator, fourierTransform, variationalMethod, complexPhasor,
    sphericalHarmonics, sturmLiouville, pdeVisual, numericalMethods,
  ],
  xray: [xrayDiscovery, xrayWave, xrayParticle, compton],
  nuclear: [
    labCanvas, atomicNuclearFormulas, periodicTable, chartOfNuclides, nuclearReaction,
    nuclearReactor, nuclearFission, fissionMechanism, atomicBomb, nuclearFusion, radioactiveDecay, bindingEnergy, alphaBetaDecay,
    neutronModerator, decayChain, petTracer,
  ],
  detectors: [naiSpectrometer, hpgeVsNai, gmDeadTime, geigerCounter, alphaSpectroscopy, neutronDetector, petCoincidence, shieldingDetector],
  applications: [applications, quantumComputer, nmrMri, esrEpr],
  electromagnetics: [
    laserPrinter, electrostaticShielding, electrosprayspinning,
    electrostaticPrecipitator, microElectrokinetics, meissnerEffect,
    wheatstoneBridge, thermionicEmission, photomultiplierTube,
    glowDischarge, arcDischarge, sparkDischarge, coronaDischarge,
    lightningRod, electrolysisCopper,
    pnJunction, seebeckEffect, peltierEffect, cyclotron, oscilloscopeCrt,
    electronMicroscope, hallEffect, diamagnetism,
    eddyCurrents, faradayDisc, acPowerFactor, rotatingMagneticField, forcedEmResonance,
    emWaveRadiation, emWaveRefraction, radarPrinciples, stealthTechnology, microwaveOven,
  ],
};

function tagGroup(mod, groupId) {
  if (mod.group) return mod;
  return Object.assign({}, mod, { group: groupId });
}

export const MODULES = NAV_GROUPS.reduce(function (acc, grp) {
  const list = GROUP_LISTS[grp.id] || [];
  for (let i = 0; i < list.length; i++) acc.push(tagGroup(list[i], grp.id));
  return acc;
}, []);
