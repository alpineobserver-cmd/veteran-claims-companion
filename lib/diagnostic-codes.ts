export type BodySystem = {
  name: string;
  shortName: string;
  section: string;
  description: string;
  sourceUrl: string;
};

export type DiagnosticCodeEntry = {
  code: string;
  name: string;
  bodySystem: string;
  section: string;
  summary: string;
  keywords: string[];
  conditionSlugs: string[];
  sourceUrl: string;
  reviewStatus: "plain-language-summary" | "source-indexed";
};

export const CATALOG_VERIFIED_THROUGH = "July 9, 2026";

const ecfr = (section:string) => `https://www.ecfr.gov/current/title-38/part-4/section-${section}`;

export const bodySystems:BodySystem[] = [
  {name:"Musculoskeletal system",shortName:"Musculoskeletal",section:"§§ 4.40–4.73",description:"Bones, joints, spine, muscles, amputations, and movement-related disabilities.",sourceUrl:ecfr("4.71a")},
  {name:"Organs of special sense",shortName:"Hearing and sensory",section:"§§ 4.75–4.87",description:"Eye conditions, hearing impairment, tinnitus, and ear conditions.",sourceUrl:ecfr("4.85")},
  {name:"Infectious diseases and immune disorders",shortName:"Infectious and immune",section:"§§ 4.88–4.89",description:"Infectious diseases, immune disorders, and nutritional deficiencies.",sourceUrl:ecfr("4.88b")},
  {name:"Respiratory system",shortName:"Respiratory",section:"§§ 4.96–4.97",description:"Nose, throat, lung, sleep-related breathing, and other respiratory conditions.",sourceUrl:ecfr("4.97")},
  {name:"Cardiovascular system",shortName:"Cardiovascular",section:"§§ 4.100–4.104",description:"Heart, arteries, veins, and other cardiovascular conditions.",sourceUrl:ecfr("4.104")},
  {name:"Digestive system",shortName:"Digestive",section:"§§ 4.110–4.114",description:"Esophagus, stomach, intestines, liver, and related digestive conditions.",sourceUrl:ecfr("4.114")},
  {name:"Genitourinary system",shortName:"Genitourinary",section:"§§ 4.115–4.115b",description:"Kidney, urinary, and reproductive-system diagnoses and dysfunctions.",sourceUrl:ecfr("4.115b")},
  {name:"Gynecological conditions and breast",shortName:"Gynecological",section:"§ 4.116",description:"Gynecological conditions and disorders of the breast.",sourceUrl:ecfr("4.116")},
  {name:"Hemic and lymphatic systems",shortName:"Hemic and lymphatic",section:"§ 4.117",description:"Blood, lymphatic, clotting, and related disorders.",sourceUrl:ecfr("4.117")},
  {name:"Skin",shortName:"Skin",section:"§ 4.118",description:"Scars, burns, dermatitis, infections, and other skin conditions.",sourceUrl:ecfr("4.118")},
  {name:"Endocrine system",shortName:"Endocrine",section:"§ 4.119",description:"Thyroid, diabetes, adrenal, pituitary, and other endocrine conditions.",sourceUrl:ecfr("4.119")},
  {name:"Neurological conditions",shortName:"Neurological",section:"§§ 4.120–4.124a",description:"Brain, nerves, seizures, migraines, and other neurological conditions.",sourceUrl:ecfr("4.124a")},
  {name:"Mental disorders",shortName:"Mental health",section:"§§ 4.125–4.130",description:"Trauma-related, depressive, anxiety, psychotic, cognitive, and other mental disorders.",sourceUrl:ecfr("4.130")},
  {name:"Dental and oral conditions",shortName:"Dental and oral",section:"§ 4.150",description:"Jaw, bone, tooth-loss, and other qualifying dental or oral conditions.",sourceUrl:ecfr("4.150")}
];

const d=(entry:DiagnosticCodeEntry)=>entry;
const sectionUrl=(section:string)=>ecfr(section);

export const diagnosticCodes:DiagnosticCodeEntry[] = [
  d({code:"5003",name:"Degenerative arthritis, other than post-traumatic",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Evaluated using limitation of motion of the affected joint, with additional schedule provisions when motion is noncompensable.",keywords:["arthritis","osteoarthritis","joint pain","knee"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"5055",name:"Knee resurfacing or replacement",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Addresses prosthetic knee replacement or resurfacing and qualifying residuals.",keywords:["knee replacement","prosthesis","resurfacing"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"5237",name:"Lumbosacral or cervical strain",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Generally evaluated under the General Rating Formula for Diseases and Injuries of the Spine.",keywords:["back pain","lower back","neck","lumbar","cervical","strain"],conditionSlugs:["lumbar-strain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"plain-language-summary"}),
  d({code:"5243",name:"Intervertebral disc syndrome",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"May use the general spine formula or the formula for qualifying incapacitating episodes, whichever method results in the higher evaluation when properly combined.",keywords:["ivds","disc","back pain","radiculopathy"],conditionSlugs:["lumbar-strain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"5256",name:"Ankylosis of the knee",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Addresses fixation of the knee at specified angles or positions.",keywords:["knee","ankylosis","stiffness"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"5257",name:"Recurrent subluxation, instability, or patellar instability",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Uses separate criteria for recurrent subluxation or instability and for patellar instability.",keywords:["knee gives way","unstable knee","patella","subluxation","brace"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"5258",name:"Dislocated semilunar cartilage",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Addresses frequent locking, pain, and joint effusion associated with dislocated cartilage.",keywords:["meniscus","locking","effusion","knee"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"5259",name:"Symptomatic removal of semilunar cartilage",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Addresses symptomatic residuals following removal of semilunar cartilage.",keywords:["meniscus surgery","cartilage removal","knee"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"5260",name:"Limitation of flexion of the leg",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Uses measured limitation of knee flexion.",keywords:["knee bend","flexion","range of motion"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"plain-language-summary"}),
  d({code:"5261",name:"Limitation of extension of the leg",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Uses measured limitation of knee extension.",keywords:["straighten knee","extension","range of motion"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"plain-language-summary"}),
  d({code:"5262",name:"Impairment of the tibia and fibula",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Addresses specified tibia or fibula impairment, including qualifying malunion or nonunion residuals.",keywords:["tibia","fibula","shin","knee","ankle"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"5263",name:"Genu recurvatum",bodySystem:"Musculoskeletal",section:"§ 4.71a",summary:"Addresses acquired, traumatic hyperextension of the knee with weakness and insecurity in weight-bearing.",keywords:["hyperextension","knee","genu recurvatum"],conditionSlugs:["knee-pain"],sourceUrl:sectionUrl("4.71a"),reviewStatus:"source-indexed"}),
  d({code:"6100",name:"Hearing impairment",bodySystem:"Hearing and sensory",section:"§§ 4.85–4.86",summary:"The percentage is mechanically derived from authorized pure-tone and speech-discrimination test results using regulatory tables.",keywords:["hearing loss","deafness","audiogram","Maryland CNC"],conditionSlugs:["hearing-loss"],sourceUrl:sectionUrl("4.85"),reviewStatus:"plain-language-summary"}),
  d({code:"6260",name:"Tinnitus, recurrent",bodySystem:"Hearing and sensory",section:"§ 4.87",summary:"The schedule provides a single evaluation for recurrent tinnitus, subject to the regulatory notes.",keywords:["ringing ears","buzzing","ear noise"],conditionSlugs:["tinnitus"],sourceUrl:sectionUrl("4.87"),reviewStatus:"plain-language-summary"}),
  ...["6510:Pansinusitis","6511:Ethmoid sinusitis","6512:Frontal sinusitis","6513:Maxillary sinusitis","6514:Sphenoid sinusitis"].map(value=>{const [code,name]=value.split(":");return d({code,name,bodySystem:"Respiratory",section:"§ 4.97",summary:"Evaluated under the General Rating Formula for Sinusitis.",keywords:["sinus infection","sinusitis","headache","discharge"],conditionSlugs:["sinusitis"],sourceUrl:sectionUrl("4.97"),reviewStatus:"plain-language-summary"})}),
  d({code:"6522",name:"Allergic or vasomotor rhinitis",bodySystem:"Respiratory",section:"§ 4.97",summary:"Criteria focus on qualifying nasal obstruction and the presence of polyps.",keywords:["allergies","nasal obstruction","polyps","rhinitis"],conditionSlugs:["rhinitis"],sourceUrl:sectionUrl("4.97"),reviewStatus:"plain-language-summary"}),
  d({code:"6523",name:"Bacterial rhinitis",bodySystem:"Respiratory",section:"§ 4.97",summary:"Uses separate criteria for qualifying bacterial rhinitis findings.",keywords:["rhinitis","bacterial","nasal"],conditionSlugs:["rhinitis"],sourceUrl:sectionUrl("4.97"),reviewStatus:"source-indexed"}),
  d({code:"6524",name:"Granulomatous rhinitis",bodySystem:"Respiratory",section:"§ 4.97",summary:"Uses separate criteria for qualifying granulomatous rhinitis findings.",keywords:["rhinitis","granulomatous","nasal"],conditionSlugs:["rhinitis"],sourceUrl:sectionUrl("4.97"),reviewStatus:"source-indexed"}),
  d({code:"6847",name:"Sleep apnea syndromes",bodySystem:"Respiratory",section:"§ 4.97",summary:"Distinguishes documented asymptomatic disease, persistent daytime symptoms, prescribed breathing assistance, and severe complications.",keywords:["sleep apnea","CPAP","hypersomnolence","snoring"],conditionSlugs:["sleep-apnea"],sourceUrl:sectionUrl("4.97"),reviewStatus:"plain-language-summary"}),
  d({code:"7206",name:"Gastroesophageal reflux disease",bodySystem:"Digestive",section:"§ 4.114",summary:"Current criteria address documented esophageal stricture and dysphagia treatment or complications.",keywords:["GERD","acid reflux","heartburn","dysphagia"],conditionSlugs:["gerd"],sourceUrl:sectionUrl("4.114"),reviewStatus:"plain-language-summary"}),
  d({code:"7319",name:"Irritable bowel syndrome",bodySystem:"Digestive",section:"§ 4.114",summary:"Uses the frequency of defecation-related abdominal pain together with accompanying bowel symptoms.",keywords:["IBS","bowel","diarrhea","constipation","abdominal pain"],conditionSlugs:["ibs"],sourceUrl:sectionUrl("4.114"),reviewStatus:"plain-language-summary"}),
  d({code:"8100",name:"Migraine",bodySystem:"Neurological",section:"§ 4.124a",summary:"Uses the frequency and severity of characteristic prostrating attacks and, at the highest level, economic impact.",keywords:["migraine","headache","prostrating","light sensitivity"],conditionSlugs:["migraines"],sourceUrl:sectionUrl("4.124a"),reviewStatus:"plain-language-summary"}),
  d({code:"9411",name:"Posttraumatic stress disorder",bodySystem:"Mental health",section:"§ 4.130",summary:"Evaluated under the General Rating Formula for Mental Disorders using overall occupational and social impairment.",keywords:["PTSD","post-traumatic stress","trauma","mental health"],conditionSlugs:["ptsd"],sourceUrl:sectionUrl("4.130"),reviewStatus:"plain-language-summary"})
];

export const conditionAliases:Record<string,string[]> = {
  "migraines":["headache","head pain","light sensitivity"], "ptsd":["post-traumatic stress","trauma","mental health"],
  "sleep-apnea":["snoring","CPAP","daytime sleepiness"], "tinnitus":["ringing ears","buzzing ears"],
  "hearing-loss":["hearing impairment","deafness","audiogram"], "lumbar-strain":["back pain","lower back","spine","lumbosacral"],
  "gerd":["acid reflux","heartburn","dysphagia"], "ibs":["irritable bowel","diarrhea","constipation"],
  "knee-pain":["knee instability","meniscus","knee replacement","arthritis","limited motion"],
  "sinusitis":["sinus infection","sinus headache"], "rhinitis":["allergies","nasal obstruction","polyps"]
};

export function codesForCondition(slug:string){return diagnosticCodes.filter(entry=>entry.conditionSlugs.includes(slug))}
export function bodySystemForCategory(category:string){return bodySystems.find(system=>system.shortName===category)}
