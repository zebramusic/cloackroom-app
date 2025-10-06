export type DeclarationTemplateInput = {
  coatNumber: string;
  fullName: string;
  phone?: string;
  email?: string;
  staff?: string;
  notes?: string; // used as description
  createdAt?: number;
};

export function buildDeclarationRO(t: DeclarationTemplateInput) {
  const descriere = t.notes?.trim()
    ? t.notes.trim()
    : "[Marca, modelul, seria, culoarea, starea etc.]";
  const staffText = (t.staff && t.staff.trim()) || "(staff member)";
  const lines = [
    "Declarație pe propria răspundere",
    `Subsemnatul(a) ${t.fullName}, cunoscând prevederile Codului penal în materia falsului, uzului de fals și a înșelăciunii, revendic pe propria răspundere bunul aferent tichetului nr. ${t.coatNumber} cu următoarele caracteristici: ${descriere}, fără prezentarea tichetului primit la predare, întrucât declar că l-am pierdut.`,
    "Sunt de acord cu fotografierea actului meu de identitate, a mea și a bunului revendicat pe propria răspundere și sunt de acord cu prelucrarea și păstrarea datelor mele personale pe o perioadă de 3 ani de la data de azi.",
    "Predarea se face strict pe răspunderea mea și în baza declarațiilor mele.",
    `Aceasta este declarația pe care o dau, o semnez și o susțin în fața domnului ${staffText}, reprezentant al Zebra Music Production s.r.l..`,
    `Data: ${new Date(t.createdAt ?? Date.now()).toLocaleString()}`,
  ];
  return lines.join("\n\n");
}

export function buildDeclarationEN(t: DeclarationTemplateInput) {
  const descriere = t.notes?.trim()
    ? t.notes.trim()
    : "[Brand, model, serial, color, condition, etc.]";
  const staffText = (t.staff && t.staff.trim()) || "(staff member)";
  const lines = [
    "Self-Declaration",
    `I, ${t.fullName}, being aware of the provisions of the Criminal Code regarding forgery, use of forgery and fraud, claim, on my own responsibility, the item corresponding to ticket no. ${t.coatNumber}, with the following characteristics: ${descriere}, without presenting the ticket received at deposit, as I declare I have lost it.`,
    "I agree to the photographing of my identity document, myself, and the claimed item on my own responsibility, and I agree to the processing and storage of my personal data for a period of 3 years from today.",
    "The handover is made strictly under my responsibility and based on my statements.",
    `This is the statement that I make, sign, and uphold in the presence of Mr. ${staffText}, representative of Zebra Music Production S.R.L.`,
    `Date: ${new Date(t.createdAt ?? Date.now()).toLocaleString()}`,
  ];
  return lines.join("\n\n");
}
