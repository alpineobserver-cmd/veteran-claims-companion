export const conditionGroups = [
  { label: "Head, face, and neurological", options: ["Migraines or other headaches", "Traumatic brain injury (TBI)", "Seizure disorder", "Peripheral neuropathy", "Vertigo or balance condition", "Facial scars or disfigurement"] },
  { label: "Mental health", options: ["Post-traumatic stress disorder (PTSD)", "Anxiety condition", "Depressive condition", "Adjustment disorder", "Insomnia or other sleep-related mental health condition", "Eating disorder"] },
  { label: "Hearing, vision, and sensory", options: ["Tinnitus", "Hearing loss", "Vision or eye condition", "Loss of smell or taste"] },
  { label: "Breathing and sleep", options: ["Sleep apnea", "Asthma", "Chronic bronchitis or COPD", "Sinusitis", "Rhinitis", "Other respiratory condition"] },
  { label: "Back, neck, joints, and muscles", options: ["Cervical spine or neck condition", "Thoracolumbar spine or back condition", "Shoulder or arm condition", "Elbow or forearm condition", "Wrist or hand condition", "Hip or thigh condition", "Knee or lower leg condition", "Ankle or foot condition", "Muscle injury"] },
  { label: "Digestive and abdominal", options: ["GERD or reflux", "Irritable bowel syndrome (IBS)", "Liver condition", "Gallbladder condition", "Hernia", "Other digestive condition"] },
  { label: "Heart, blood, and circulation", options: ["Hypertension", "Heart disease", "Heart rhythm condition", "Varicose veins", "Anemia or other blood condition"] },
  { label: "Skin and scars", options: ["Painful or unstable scar", "Dermatitis or eczema", "Psoriasis", "Acne or chloracne", "Other skin condition"] },
  { label: "Endocrine, urinary, and reproductive", options: ["Diabetes mellitus", "Thyroid condition", "Kidney condition", "Bladder or urinary condition", "Male reproductive condition", "Female reproductive condition"] },
  { label: "Other", options: ["Cancer or residuals of cancer", "Infectious disease or residuals", "Dental or oral condition", "Other / condition not listed"] }
] as const;

export const evidenceOptions = [
  "Service treatment records", "Current medical records", "Private treatment records",
  "VA treatment records", "Personal statement", "Buddy or witness statement",
  "Deployment or personnel records", "Medical opinion or nexus letter", "Photos or symptom log"
] as const;
