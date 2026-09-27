export interface SpellCheckIssue {
  id: string;
  type: 'accent' | 'apostrophe' | 'punctuation' | 'spacing' | 'common_error';
  original: string;
  replacement: string;
  message: string;
  context: string;
  index: number;
}

const COMMON_RULES = [
  // Double-z in -zione words (e.g. eccezzione -> eccezione, eccezzionale -> eccezionale, stazzionamento -> stazionamento)
  // In Italian, the letter 'z' is never doubled before '-ione', '-iona', etc. (e.g. zzione is always wrong)
  {
    regex: /\b(\w*)zzion(\w*)\b/gi,
    replacement: '$1zion$2',
    message: "In italiano la 'z' non si raddoppia mai nelle parole che contengono '-zione' o derivati (es. 'eccezione', 'stazione', 'eccezionale').",
    type: 'common_error' as const
  },
  // Qual è
  {
    regex: /\bqual['’]è\b/gi,
    replacement: 'qual è',
    message: "In italiano 'qual è' si scrive senza apostrofo (troncamento).",
    type: 'apostrophe' as const
  },
  {
    regex: /\bqual['’]e\b/gi,
    replacement: 'qual è',
    message: "In italiano 'qual è' si scrive senza apostrofo e con l'accento.",
    type: 'apostrophe' as const
  },
  // Un po'
  {
    regex: /\bun\s+po\b(?!\s*['’])/gi,
    replacement: "un po'",
    message: "'Un po'' si scrive con l'apostrofo (troncamento di poco), non senza e non con l'accento.",
    type: 'apostrophe' as const
  },
  {
    regex: /\bun\s+pò\b/gi,
    replacement: "un po'",
    message: "'Un po'' si scrive con l'apostrofo, mai con l'accento (pò non esiste).",
    type: 'apostrophe' as const
  },
  // Accents on e
  {
    regex: /\bperch[e']\b/g,
    replacement: 'perché',
    message: "'Perché' vuole l'accento acuto (é).",
    type: 'accent' as const
  },
  {
    regex: /\bpoich[e']\b/g,
    replacement: 'poiché',
    message: "'Poiché' vuole l'accento acuto (é).",
    type: 'accent' as const
  },
  {
    regex: /\baffinch[e']\b/g,
    replacement: 'affinché',
    message: "'Affinché' vuole l'accento acuto (é).",
    type: 'accent' as const
  },
  {
    regex: /\bcosicch[e']\b/g,
    replacement: 'cosicché',
    message: "'Cosicché' vuole l'accento acuto (é).",
    type: 'accent' as const
  },
  {
    regex: /\bgia'\b/gi,
    replacement: 'già',
    message: "'Già' vuole l'accento grave.",
    type: 'accent' as const
  },
  {
    regex: /\bgiu'\b/gi,
    replacement: 'giù',
    message: "'Giù' vuole l'accento grave.",
    type: 'accent' as const
  },
  {
    regex: /\bpiu'\b/gi,
    replacement: 'più',
    message: "'Più' vuole l'accento grave.",
    type: 'accent' as const
  },
  {
    regex: /\bsi'\b/gi,
    replacement: 'sì',
    message: "'Sì' affermativo vuole l'accento grave per non confondersi con il pronome 'si'.",
    type: 'accent' as const
  },
  // Qui, Qua, Su, Giu, No, Ma accents (qui e qua non vogliono l'accento!)
  {
    regex: /\bquì\b/gi,
    replacement: 'qui',
    message: "'Qui' non vuole mai l'accento.",
    type: 'accent' as const
  },
  {
    regex: /\bquà\b/gi,
    replacement: 'qua',
    message: "'Qua' non vuole mai l'accento.",
    type: 'accent' as const
  },
  {
    regex: /\bsù\b/gi,
    replacement: 'su',
    message: "'Su' non vuole l'accento (lassù, quassù invece sì).",
    type: 'accent' as const
  },
  {
    regex: /\bnò\b/gi,
    replacement: 'no',
    message: "'No' non vuole mai l'accento.",
    type: 'accent' as const
  },
  {
    regex: /\bmà\b/gi,
    replacement: 'ma',
    message: "'Ma' non vuole mai l'accento.",
    type: 'accent' as const
  },
  {
    regex: /\bstà\b/gi,
    replacement: 'sta',
    message: "'Sta' indicativo non vuole l'accento. Usa l'apostrofo 'sta'' solo per l'imperativo (es. sta' calmo).",
    type: 'accent' as const
  },
  {
    regex: /\bvà\b/gi,
    replacement: 'va',
    message: "'Va' indicativo non vuole l'accento. Usa l'apostrofo 'va'' solo per l'imperativo (es. va' via).",
    type: 'accent' as const
  },
  {
    regex: /\bfà\b/gi,
    replacement: 'fa',
    message: "'Fa' indicativo non vuole l'accento. Usa l'apostrofo 'fa'' solo per l'imperativo (es. fa' attenzione).",
    type: 'accent' as const
  },
  // D'accordo
  {
    regex: /\bd['’]\s*accordo\b/gi,
    replacement: "d'accordo",
    message: "Si scrive 'd'accordo' con l'apostrofo e senza spazi.",
    type: 'apostrophe' as const
  },
  {
    regex: /\bdaccordo\b/gi,
    replacement: "d'accordo",
    message: "Si scrive 'd'accordo' con l'apostrofo, non unito.",
    type: 'apostrophe' as const
  },
  {
    regex: /\bdaltronde\b/gi,
    replacement: "d'altronde",
    message: "Si scrive 'd'altronde' con l'apostrofo.",
    type: 'apostrophe' as const
  },
  {
    regex: /\btutt['’]ora\b/gi,
    replacement: "tuttora",
    message: "Si scrive unito 'tuttora' senza apostrofo.",
    type: 'apostrophe' as const
  },
  {
    regex: /\bcent[o0]cinquanta\b/gi,
    replacement: "centocinquanta",
    message: "Correzione numero in lettere.",
    type: 'common_error' as const
  },
  // Efficente / Coscenza common mistakes
  {
    regex: /\befficente\b/gi,
    replacement: 'efficiente',
    message: "Si scrive 'efficiente' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\befficenti\b/gi,
    replacement: 'efficienti',
    message: "Si scrive 'efficienti' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\befficenza\b/gi,
    replacement: 'efficienza',
    message: "Si scrive 'efficienza' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bsufficente\b/gi,
    replacement: 'sufficiente',
    message: "Si scrive 'sufficiente' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bsufficenti\b/gi,
    replacement: 'sufficienti',
    message: "Si scrive 'sufficienti' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bsufficenza\b/gi,
    replacement: 'sufficienza',
    message: "Si scrive 'sufficienza' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bdeficente\b/gi,
    replacement: 'deficiente',
    message: "Si scrive 'deficiente' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bdeficenti\b/gi,
    replacement: 'deficienti',
    message: "Si scrive 'deficienti' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bcoscenza\b/gi,
    replacement: 'coscienza',
    message: "Si scrive 'coscienza' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bcoscenze\b/gi,
    replacement: 'coscienze',
    message: "Si scrive 'coscienze' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bcoscenzioso\b/gi,
    replacement: 'coscienzioso',
    message: "Si scrive 'coscienzioso' con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bingeniere\b/gi,
    replacement: 'ingegnere',
    message: "Si scrive 'ingegnere' con la 'g', non con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bingenieri\b/gi,
    replacement: 'ingegneri',
    message: "Si scrive 'ingegneri' con la 'g', non con la 'i'.",
    type: 'common_error' as const
  },
  {
    regex: /\bconosscere\b/gi,
    replacement: 'conoscere',
    message: "Si scrive 'conoscere' con una sola 's'.",
    type: 'common_error' as const
  },
  // Verb avere "ha" vs preposition "a" common mistakes
  {
    regex: /\ba\s+(scritto|fatto|detto|visto|sentito|parlato|mangiato|preso|capito|creato|letto|vinto|perso|trovato|cercato|saputo|conosciuto|pensato|chiesto|risposto)\b/gi,
    replacement: 'ha $1',
    message: "In questo caso occorre il verbo avere 'ha' con l'acca, non la preposizione 'a'.",
    type: 'common_error' as const
  },
  // anno (year) vs hanno (they have)
  {
    regex: /\bhanno\s+(scorso|passato)\b/gi,
    replacement: 'anno $1',
    message: "In questo caso occorre il sostantivo 'anno' senza acca (es. 'l'anno scorso').",
    type: 'common_error' as const
  },
  {
    regex: /\bquest['’]hanno\b/gi,
    replacement: "quest'anno",
    message: "Si scrive 'quest'anno' con l'apostrofo e senza acca.",
    type: 'common_error' as const
  },
  {
    regex: /\bun\s+hanno\b/gi,
    replacement: 'un anno',
    message: "Si scrive 'un anno' senza acca.",
    type: 'common_error' as const
  },
  {
    regex: /\btutto\s+l['’]hanno\b/gi,
    replacement: "tutto l'anno",
    message: "Si scrive 'l'anno' senza acca.",
    type: 'common_error' as const
  },
  // Punctuation spacing issues
  {
    regex: /\s+([,.;:!?])/g,
    replacement: '$1',
    message: "Non inserire uno spazio prima della punteggiatura.",
    type: 'spacing' as const
  },
  {
    regex: /([,.;:!?])([a-zA-ZàéèìòùÀÉÈÌÒÙ])/g,
    replacement: '$1 $2',
    message: "Inserisci uno spazio dopo la punteggiatura.",
    type: 'spacing' as const
  },
  // Double spaces
  {
    regex: /[ \t]{2,}/g,
    replacement: ' ',
    message: "Rilevati spazi multipli consecutivi.",
    type: 'spacing' as const
  },
  // E' -> È (Common mistake at sentence beginnings)
  {
    regex: /\b[eE]['’]\b/g,
    replacement: 'È',
    message: "Usa la lettera accentata 'È' invece dell'apostrofo 'E''.",
    type: 'accent' as const
  },
  // Common errors
  {
    regex: /\bfa\s+fede\b/gi,
    replacement: "fa fede",
    message: "Verifica della corretta spaziatura.",
    type: 'spacing' as const
  },
  {
    regex: /\bpropio\b/gi,
    replacement: 'proprio',
    message: "Si scrive 'proprio', non 'propio'.",
    type: 'common_error' as const
  },
  {
    regex: /\bbeneficenza\b/gi,
    replacement: 'beneficenza',
    message: "Si scrive 'beneficenza' con una sola 'i' prima della 'c'?",
    type: 'common_error' as const
  },
  {
    regex: /\baccelerare\b/gi,
    replacement: 'accelerare',
    message: "Si scrive 'accelerare' con una sola 'l'.",
    type: 'common_error' as const
  },
  {
    regex: /\bmetereologia\b/gi,
    replacement: 'meteorologia',
    message: "Si scrive 'meteorologia', non 'metereologia'.",
    type: 'common_error' as const
  },
  {
    regex: /\bapposto\b/gi,
    replacement: 'a posto',
    message: "Si scrive 'a posto' (due parole) per indicare ordine. 'Apposto' è il participio del verbo apporre.",
    type: 'common_error' as const
  },
  {
    regex: /\binnanzittutto\b/gi,
    replacement: 'innanzitutto',
    message: "Si scrive 'innanzitutto' con una sola 't' nel mezzo.",
    type: 'common_error' as const
  },
  {
    regex: /\bcentravanti\b/gi,
    replacement: 'centravanti',
    message: "Si scrive 'centravanti' unito.",
    type: 'common_error' as const
  },
];

/**
 * Scans a text for spelling and typing rules.
 */
export function scanText(text: string): SpellCheckIssue[] {
  const issues: SpellCheckIssue[] = [];
  if (!text) return issues;

  COMMON_RULES.forEach((rule, ruleIdx) => {
    // We create a new regex to reset the lastIndex
    const regex = new RegExp(rule.regex);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const index = match.index;
      const original = match[0];
      
      // Determine replacement based on matched casing and group substitutions if needed
      let replacement = typeof rule.replacement === 'string'
        ? original.replace(rule.regex, rule.replacement)
        : rule.replacement;

      if (original === original.toUpperCase()) {
        replacement = replacement.toUpperCase();
      } else if (original[0] === original[0].toUpperCase()) {
        replacement = replacement[0].toUpperCase() + replacement.slice(1);
      }

      // Skip if it matches the replacement already (e.g. spacing regexes)
      if (original === replacement) continue;

      // Extract context
      const start = Math.max(0, index - 25);
      const end = Math.min(text.length, index + original.length + 25);
      let context = text.substring(start, end);
      
      // Add ellipsis if truncated
      if (start > 0) context = '...' + context;
      if (end < text.length) context = context + '...';

      issues.push({
        id: `rule-${ruleIdx}-${index}`,
        type: rule.type,
        original,
        replacement,
        message: rule.message,
        context,
        index
      });

      // Avoid infinite loop on zero-width matches
      if (regex.lastIndex === index) {
        regex.lastIndex++;
      }
    }
  });

  // Sort issues by index
  return issues.sort((a, b) => a.index - b.index);
}

/**
 * Automatically applies a list of corrections to the text.
 */
export function applyCorrection(text: string, issue: SpellCheckIssue): string {
  const before = text.substring(0, issue.index);
  const after = text.substring(issue.index + issue.original.length);
  return before + issue.replacement + after;
}

/**
 * Auto corrects all clear-cut spelling issues automatically.
 */
export function autoCorrectAll(text: string): { correctedText: string; count: number } {
  let tempText = text;
  let count = 0;
  
  // Scan multiple times because indices shift as we modify
  // A safe way is to scan, get the first issue, fix it, then scan again, until no issues remain.
  // To avoid infinite loops, we cap at 100 corrections.
  let iterations = 0;
  while (iterations < 100) {
    const issues = scanText(tempText);
    if (issues.length === 0) break;
    
    // Apply the first issue
    const issue = issues[0];
    tempText = applyCorrection(tempText, issue);
    count++;
    iterations++;
  }

  return { correctedText: tempText, count };
}
