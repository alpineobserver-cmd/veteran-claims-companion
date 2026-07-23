export type ServiceEra="pre-vietnam"|"vietnam"|"interwar"|"gulf"|"post911"|"recent";
export type LocationKey="vietnam"|"thailand"|"korea"|"southwest-asia"|"afghanistan"|"other";
export type ExposureKey="burn-pits"|"radiation"|"depleted-uranium"|"embedded-fragments"|"contaminated-water"|"other";

export type ExposureMatch={
  name:string;
  kind:"Registry"|"Program"|"Record";
  reason:string;
  action:string;
  href:string;
};

export const serviceEras:{key:ServiceEra;label:string;detail:string}[]=[
  {key:"pre-vietnam",label:"Before the Vietnam era",detail:"Before 1955"},
  {key:"vietnam",label:"Vietnam era",detail:"1955–1975"},
  {key:"interwar",label:"Post-Vietnam period",detail:"1976–1989"},
  {key:"gulf",label:"Gulf War era",detail:"1990–2001"},
  {key:"post911",label:"Post-9/11",detail:"2001–2021"},
  {key:"recent",label:"Recent service",detail:"2022–present"}
];

export const dutyLocations:{key:LocationKey;label:string}[]=[
  {key:"vietnam",label:"Vietnam or qualifying waters"},
  {key:"thailand",label:"Thailand"},
  {key:"korea",label:"Korean DMZ area"},
  {key:"southwest-asia",label:"Southwest Asia or Persian Gulf"},
  {key:"afghanistan",label:"Afghanistan or a nearby qualifying area"},
  {key:"other",label:"Another duty location"}
];

export const exposureConcerns:{key:ExposureKey;label:string;detail:string}[]=[
  {key:"burn-pits",label:"Smoke, burn pits, sand, or airborne hazards",detail:"Include a known or suspected concern."},
  {key:"radiation",label:"Ionizing radiation",detail:"Testing, occupation, nuclear weapons, treatment, or another radiation-risk activity."},
  {key:"depleted-uranium",label:"Depleted uranium",detail:"Damaged vehicles, friendly fire, munitions, or retained fragments."},
  {key:"embedded-fragments",label:"Embedded fragments",detail:"Fragments retained after a blast or another service injury."},
  {key:"contaminated-water",label:"Contaminated water or installation hazards",detail:"For example, Camp Lejeune or another known contamination event."},
  {key:"other",label:"Another occupational or environmental hazard",detail:"Solvents, asbestos, fuel, PFAS, pesticides, fumes, or a similar hazard."}
];

export function findExposureMatches(era:ServiceEra,locations:LocationKey[],exposures:ExposureKey[]):ExposureMatch[]{
  const matches:ExposureMatch[]=[];
  const registryEra=era==="gulf"||era==="post911";
  const gulfRegistryEra=registryEra||era==="recent";
  const southwestAsia=locations.includes("southwest-asia");
  const afghanistan=locations.includes("afghanistan");
  const burnPitRegistryPath=(registryEra&&(southwestAsia||afghanistan||exposures.includes("burn-pits")))
    ||(era==="recent"&&southwestAsia);

  if(burnPitRegistryPath){
    matches.push({
      name:"Airborne Hazards and Open Burn Pit Registry",
      kind:"Registry",
      reason:"Your service period, location, or airborne-hazard selection may fall within the registry’s published participation criteria. VA generally adds eligible Veterans and service members automatically from military records.",
      action:"Review participation and eligibility information",
      href:"https://www.publichealth.va.gov/exposures/burnpits/registry.asp"
    });
  }
  if(gulfRegistryEra&&southwestAsia){
    matches.push({
      name:"Gulf War Registry",
      kind:"Registry",
      reason:"You selected service from 1990 or later in Southwest Asia or the Persian Gulf. VA must determine whether the specific location and dates meet its criteria.",
      action:"Review the free registry health exam",
      href:"https://www.publichealth.va.gov/exposures/gulfwar/benefits/registry-exam.asp"
    });
  }
  if(era==="vietnam"||locations.some(location=>["vietnam","thailand","korea"].includes(location))){
    matches.push({
      name:"Agent Orange Registry",
      kind:"Registry",
      reason:"Your service era or selected location may overlap a published herbicide-exposure area. Exact duties, locations, and dates still matter.",
      action:"Review the location and date criteria",
      href:"https://www.publichealth.va.gov/exposures/agentorange/benefits/registry-exam.asp"
    });
  }
  if(exposures.includes("radiation")){
    matches.push({
      name:"Ionizing Radiation Registry",
      kind:"Registry",
      reason:"You reported a possible radiation-risk activity during military service. The registry exam does not itself confirm an exposure.",
      action:"Review eligible radiation activities",
      href:"https://www.publichealth.va.gov/exposures/radiation/benefits/registry-exam.asp"
    });
  }
  if(exposures.includes("depleted-uranium")){
    matches.push({
      name:"Depleted Uranium Follow-Up Program",
      kind:"Program",
      reason:"You reported possible depleted-uranium contact or retained fragments.",
      action:"Review testing and follow-up information",
      href:"https://www.publichealth.va.gov/exposures/depleted_uranium/followup_program.asp"
    });
  }
  if(exposures.includes("embedded-fragments")){
    matches.push({
      name:"Toxic Embedded Fragment Surveillance Center",
      kind:"Program",
      reason:"You reported fragments retained after a service injury.",
      action:"Review embedded-fragment evaluation information",
      href:"https://www.publichealth.va.gov/exposures/toxic_fragments/surv_center.asp"
    });
  }
  if(exposures.includes("contaminated-water")||exposures.includes("other")){
    matches.push({
      name:"Military Environmental Exposure Assessment",
      kind:"Program",
      reason:"An exposure concern that does not fit a dedicated registry may still be discussed and documented through VA’s VET-HOME program.",
      action:"Learn about VET-HOME",
      href:"https://www.publichealth.va.gov/PUBLICHEALTH/VET-HOME/index.asp"
    });
  }
  matches.push({
    name:"Individual Longitudinal Exposure Record",
    kind:"Record",
    reason:"ILER may contain occupational and environmental exposure information from assignments, deployments, monitoring systems, and known incidents. Access depends on current service or Veteran access rules.",
    action:"Learn what ILER contains and who can access it",
    href:"https://www.health.mil/Reference-Center/Frequently-Asked-Questions/ILER"
  });
  return matches;
}
