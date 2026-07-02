/* ==========================================================================
   Sup' Read With Me AI & Search Services (src/ai-service.js)
   ========================================================================== */

const API_KEYS = {
  OPENAI: 'readem_openai_key',
  ELEVENLABS: 'readem_elevenlabs_key',
  ELEVENLABS_MODEL: 'readem_elevenlabs_model',
  // Huawei Cloud proxy: browser calls this server URL, server signs and forwards to Huawei
  HUAWEI_ENDPOINT: 'readem_huawei_endpoint',
  HUAWEI_API_KEY:  'readem_huawei_api_key',
};

// --- MOCK DATABASE FOR SIMULATION & DEMO MODE ---
const MOCK_WORDS = {
  photosynthesis: {
    syllables: ['pho', 'to', 'syn', 'the', 'sis'],
    phonetics: '/ foh-tuh-sin-thuh-sis /',
    definition: 'How green leaves use sunlight to turn water and air into their food.',
    analogy: 'Think of it like baking a cake. Sunlight is the oven heat, water and carbon dioxide are the flour and sugar, and the leaf is the baker!'
  },
  chlorophyll: {
    syllables: ['chlo', 'ro', 'phyll'],
    phonetics: '/ klawr-uh-fil /',
    definition: 'The green color inside leaves that catches sunlight for photosynthesis.',
    analogy: 'It works like a tiny solar panel inside a leaf, absorbing solar energy.'
  },
  stomata: {
    syllables: ['sto', 'ma', 'ta'],
    phonetics: '/ stoh-muh-tuh /',
    definition: 'Tiny mouth-like holes on the bottom of a leaf that let the leaf breathe in air.',
    analogy: 'Like microscopic nostrils for plants to inhale carbon dioxide and exhale oxygen.'
  },
  carbohydrates: {
    syllables: ['car', 'bo', 'hy', 'drates'],
    phonetics: '/ kahr-boh-hahy-dreytts /',
    definition: 'Sugar foods made by plants that give plants and animals energy.',
    analogy: 'Like tiny biological batteries that store energy for animals and plants.'
  },
  denominator: {
    syllables: ['de', 'nom', 'i', 'na', 'tor'],
    phonetics: '/ dih-nom-uh-ney-ter /',
    definition: 'The bottom number of a fraction. It shows how many equal parts a whole thing is cut into.',
    analogy: 'If you cut a pizza into 4 slices, the denominator is 4, showing the size of each slice.'
  },
  numerator: {
    syllables: ['nu', 'mer', 'a', 'tor'],
    phonetics: '/ noo-muh-rey-ter /',
    definition: 'The top number of a fraction. It shows how many slices or parts you actually have.',
    analogy: 'If you eat 3 slices from a 4-slice pizza, the numerator is 3, representing your share.'
  },
  equivalent: {
    syllables: ['e', 'quiv', 'a', 'lent'],
    phonetics: '/ ih-kwiv-uh-luhnt /',
    definition: 'Having the exact same value or size, even if it looks different.',
    analogy: 'Having two 50-cent coins is equivalent to having one dollar bill.'
  },
  ratio: {
    syllables: ['ra', 'ti', 'o'],
    phonetics: '/ rey-shee-oh /',
    definition: 'A comparison of two amounts, showing how much of one thing there is compared to another.',
    analogy: 'If a recipe calls for 2 cups of sugar for every 3 cups of flour, the ratio is 2 to 3.'
  },
  aqueduct: {
    syllables: ['aq', 'ue', 'duct'],
    phonetics: '/ ak-wih-duhkt /',
    definition: 'A stone bridge channel built by Romans to bring clean water from far away mountains into cities.',
    analogy: 'Like a giant, stone waterslide that serves as a fresh water pipeline.'
  },
  concrete: {
    syllables: ['con', 'crete'],
    phonetics: '/ kon-kreet /',
    definition: 'A strong mixture of sand, gravel, water, and cement that hardens into artificial stone.',
    analogy: 'Liquid mud that dries as hard as rock, making it perfect for building bridges.'
  },
  archaeologist: {
    syllables: ['ar', 'chae', 'ol', 'o', 'gist'],
    phonetics: '/ ahr-kee-ol-uh-jist /',
    definition: 'A scientist who digs into the ground to find clues about how people lived long ago.',
    analogy: 'A real-life detective of ancient history, searching for buried treasure and bones.'
  },
  // Singapore curriculum — Primary Science (water cycle)
  evaporation: {
    syllables: ['e', 'vap', 'o', 'ra', 'tion'],
    phonetics: '/ ee-vap-uh-ray-shun /',
    definition: 'The process where liquid water is heated and turns into invisible water vapour gas.',
    analogy: 'Like a wet puddle disappearing on a sunny day — the water turns invisible and floats up into the sky.'
  },
  condensation: {
    syllables: ['con', 'den', 'sa', 'tion'],
    phonetics: '/ kon-den-say-shun /',
    definition: 'When water vapour in the air cools down and turns back into tiny liquid water droplets.',
    analogy: 'Like the cold drops forming on the outside of a cold drink bottle on a humid day.'
  },
  precipitation: {
    syllables: ['pre', 'cip', 'i', 'ta', 'tion'],
    phonetics: '/ preh-sip-ih-tay-shun /',
    definition: 'Any water falling from clouds to the ground, such as rain or drizzle.',
    analogy: 'Think of it as the sky returning borrowed water back to the Earth as rain.'
  },
  atmosphere: {
    syllables: ['at', 'mos', 'phere'],
    phonetics: '/ at-muh-sfeer /',
    definition: 'The thick layer of air and gases that surrounds the Earth and protects it.',
    analogy: 'Like a giant invisible blanket wrapping around the Earth, full of the air we breathe.'
  },
  // Singapore workplace / adult literacy
  performance: {
    syllables: ['per', 'for', 'mance'],
    phonetics: '/ per-for-mans /',
    definition: 'How well someone does their job or completes a task over a period of time.',
    analogy: 'Like a score report card for your work, showing how well you played on the team.'
  },
  evaluation: {
    syllables: ['e', 'val', 'u', 'a', 'tion'],
    phonetics: '/ ee-val-yoo-ay-shun /',
    definition: 'A careful assessment of how good something or someone is.',
    analogy: 'Like a referee carefully checking if a goal was scored fairly during a match.'
  },
  increment: {
    syllables: ['in', 'cre', 'ment'],
    phonetics: '/ in-kruh-ment /',
    definition: 'A small increase in pay given to an employee after a good performance review.',
    analogy: 'Like levelling up in a game — each increment is a small reward for doing well.'
  },
  eligibility: {
    syllables: ['el', 'i', 'gi', 'bil', 'i', 'ty'],
    phonetics: '/ el-ih-jih-bil-ih-tee /',
    definition: 'Whether a person meets the rules or requirements needed to receive something.',
    analogy: 'Like checking if your score is high enough to enter the next round of a competition.'
  },
  sherwood: {
    syllables: ['sher', 'wood'],
    phonetics: '/ shur-wood /',
    definition: 'A famous royal forest in England known for its oak trees and stories of Robin Hood.',
    analogy: 'A legendary woodland sanctuary that acted as a hideout for outlaws.'
  },
  outlaw: {
    syllables: ['out', 'law'],
    phonetics: '/ out-law /',
    definition: 'A person who has broken the law and is hiding from authorities or soldiers.',
    analogy: 'Like a rebel in stories who lives outside the rules of the king.'
  }
};

const MOCK_PARAGRAPHS = {
  "math-word": "You need to compare two groups. Count the first group: it has 4 red blocks. Count the second group: it has 8 blue blocks. What is the ratio? A ratio compares these numbers. Write it as 4 to 8. You can simplify this. Just divide both numbers by 4. Now, the ratio is 1 to 2. This is an equivalent ratio.",
  "science-passage": "Green leaves make food for the plant. They do this by a process called photosynthesis. Leaves contain chlorophyll. This green pigment absorbs sunlight energy. The plant absorbs water from the soil through roots. Leaves breathe in carbon dioxide from air through stomata. Sunlight turns these ingredients into sugar carbohydrates and oxygen. The plant stores the sugars for growth energy.",
  "history-passage": "The Romans built clean cities. They designed clean sanitation pipelines called aqueducts. These stone bridges carried freshwater from mountains to cities. Roman builders mixed volcanic ash and lime. This created concrete. It was very strong. Archaeologists study these structures to see how Roman civilization grew.",
  "english-lit": "Robin Hood was a legendary outlaw. He lived in Sherwood Forest in England. He gathered a band of loyal followers. People called them the Merry Men. Robin Hood fought the greedy Sheriff. He took money from rich lords. He gave that money to poor families who had no food."
};

const MOCK_SENTENCES = {
  // Math
  "in order to evaluate the relationship between two distinct sets of objects, you must perform a comparative analysis of their quantities": "You need to compare two groups.",
  "consider group a, which consists of 4 red blocks, and group b, which consists of 8 blue blocks": "Count the first group: it has 4 red blocks. Count the second group: it has 8 blue blocks.",
  "determine the ratio of group a to group b, expressing the relationship in its simplest equivalent fractional representation": "What is the ratio? A ratio compares these numbers. Write it as 4 to 8. You can simplify this. Just divide both numbers by 4. Now, the ratio is 1 to 2. This is an equivalent ratio.",
  // Science
  "green plants synthesize organic compounds from inorganic materials through a biochemical process called photosynthesis": "Green leaves make food for the plant. They do this by a process called photosynthesis.",
  "the primary catalyst is chlorophyll, a green pigment within leaves that captures light energy": "Leaves contain chlorophyll. This green pigment absorbs sunlight energy.",
  "water is absorbed from the substrate by the root system, while carbon dioxide is taken in from the surrounding atmosphere through microscopic pores called stomata": "The plant absorbs water from the soil through roots. Leaves breathe in carbon dioxide from air through stomata.",
  "sunlight subsequently converts these compounds into glucose carbohydrates and oxygen": "Sunlight turns these ingredients into sugar carbohydrates and oxygen. The plant stores the sugars for growth energy.",
  // History
  "the roman empire pioneered advanced municipal sanitation networks, constructing stone aqueducts to transport freshwater from elevated mountainous regions into urban centers": "The Romans built clean cities. They designed clean sanitation pipelines called aqueducts. These stone bridges carried freshwater from mountains to cities.",
  "their architectural durability was achieved through the invention of a proprietary concrete composed of volcanic ash and lime": "Roman builders mixed volcanic ash and lime. This created concrete. It was very strong.",
  "modern archaeologists analyze these structural relics to chart roman civilization": "Archaeologists study these structures to see how Roman civilization grew.",
  // Literature
  "robin hood, a legendary outlaw of english folklore, resided in sherwood forest where he assembled a band of loyal companions known as the merry men": "Robin Hood was a legendary outlaw. He lived in Sherwood Forest in England. He gathered a band of loyal followers. People called them the Merry Men.",
  "he engaged in persistent conflict against the tyrannical sheriff of nottingham, executing a strategy of redistributing wealth by seizing assets from wealthy noblemen and donating them to destitute peasant families": "Robin Hood fought the greedy Sheriff. He took money from rich lords. He gave that money to poor families who had no food."
};

const MOCK_COMPREHENSION = {
  Science: [
    { q: "What process do green plants use to make their food?", hint: "Think about sunlight, water, and leaves." },
    { q: "What are stomata, and what do they do for a plant?", hint: "Look for the part about leaves breathing." },
    { q: "Name one product that plants make during photosynthesis.", hint: "The passage lists what comes out of the process." },
  ],
  Mathematics: [
    { q: "What is a ratio, and how do you write one?", hint: "Think about how we compare two groups of objects." },
    { q: "If you have 4 red blocks and 8 blue blocks, what is the simplest ratio of red to blue?", hint: "Divide both numbers by the same amount." },
    { q: "What does the word \"equivalent\" mean in maths?", hint: "The passage explains this word with an example." },
  ],
  History: [
    { q: "What did the Romans build to bring fresh water into their cities?", hint: "Think about the large stone structures over rivers." },
    { q: "What two ingredients did Roman builders mix to make their special concrete?", hint: "One ingredient came from volcanoes." },
    { q: "What type of scientist studies ancient structures to learn about old civilisations?", hint: "Think of the word for a history detective." },
  ],
  Literature: [
    { q: "Where did Robin Hood live, and who were his companions?", hint: "Think about the famous forest in England." },
    { q: "Why did Robin Hood take money from the rich?", hint: "Think about who he gave the money to." },
    { q: "Who was Robin Hood's main enemy, and why did they conflict?", hint: "Think about the powerful person who ruled the area." },
  ],
  General: [
    { q: "What is the main topic of this passage?", hint: "Think about what most of the text is about." },
    { q: "What is one important fact you learned from this text?", hint: "Pick something that stood out to you." },
    { q: "Can you explain one key word from the passage in your own words?", hint: "Choose a word you had to think about." },
  ],
};

const MOCK_OFFLINE_ANALOGIES = {
  leaves: "Leaves work like solar panels on a tree, capturing sun rays to make food energy.",
  leaf: "A leaf works like a solar panel, capturing sun rays to make food energy.",
  sunlight: "Sunlight is the power outlet that gives plants all their operational energy.",
  sun: "The sun is like a giant power outlet in the sky, sending energy to plants.",
  water: "Water is like a refreshing drink of fuel that roots suck up like a straw.",
  soil: "Soil is like the pantry where roots find water and nutrients.",
  roots: "Roots work like straws, sucking up water from the deep soil.",
  carbon: "Carbon dioxide is the air that plants breathe in, like humans breathe oxygen.",
  dioxide: "Dioxide is part of the air plants inhale to stay healthy.",
  oxygen: "Oxygen is the fresh air plants breathe out, which humans and animals breathe in!",
  breathe: "Breathe means taking in air; plants breathe in carbon dioxide and breathe out oxygen.",
  romans: "Romans were the ancient master builders of Italy, famous for structures that stand today.",
  cities: "Cities are big, organized towns where thousands of people live and work.",
  pipelines: "Pipelines are long water tubes that act like giant drinking straws for cities.",
  bridges: "Bridges are paths built high in the air to help water or traffic cross over obstacles.",
  concrete: "Concrete is liquid mud that dries as hard as artificial stone.",
  stone: "Stone is natural rock, which Roman builders stacked to make giant bridges.",
  builders: "Builders are the construction crews who stack bricks and concrete to make cities.",
  archaeologists: "Archaeologists are history detectives who search in the ground for ancient clues.",
  archaeologist: "An archaeologist is a history detective who digs in the ground for ancient clues.",
  structures: "Structures are buildings, bridges, or towers constructed by architects.",
  forest: "Sherwood Forest is a legendary woodland hideout in England where Robin Hood lived.",
  hideout: "A hideout is a secret shelter or sanctuary where outlaws hide from soldiers.",
  outlaw: "An outlaw is a storybook rebel who fights against rules they think are unfair.",
  merry: "Merry means happy, joyful, and full of laughter, like Robin Hood's friends.",
  men: "Men are the followers and friends who joined Robin Hood in the forest.",
  money: "Money is the currency used to buy food; Robin Hood shared it with poor families.",
  rich: "Rich means having plenty of wealth, coins, and grand castles.",
  poor: "Poor means having very little food or coins to buy necessary items."
};

// Algorithmic backup chunker if word is not in mock list and no API Key
function fallbackWordSplit(word) {
  const w = word.toLowerCase().trim();
  // Simple heuristic split by vowels for fallback presentation
  const matches = w.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*(?=$|[^aeiouy]))?/g);
  if (!matches) return [w];
  return matches;
}

export const AIService = {
  saveKeys(openaiKey, elevenlabsKey, elevenlabsModel) {
    localStorage.setItem(API_KEYS.OPENAI, openaiKey.trim());
    localStorage.setItem(API_KEYS.ELEVENLABS, elevenlabsKey.trim());
    localStorage.setItem(API_KEYS.ELEVENLABS_MODEL, elevenlabsModel || 'eleven_turbo_v2_5');
  },

  // Save Huawei Cloud proxy config (server URL + the shared API key for the proxy)
  saveHuaweiConfig(endpoint, apiKey) {
    localStorage.setItem(API_KEYS.HUAWEI_ENDPOINT, endpoint.trim());
    localStorage.setItem(API_KEYS.HUAWEI_API_KEY, apiKey.trim());
  },

  getKeys() {
    return {
      openai: localStorage.getItem(API_KEYS.OPENAI) || import.meta.env.VITE_OPENAI_API_KEY || '',
      elevenlabs: localStorage.getItem(API_KEYS.ELEVENLABS) || import.meta.env.VITE_ELEVENLABS_API_KEY || '',
      elevenlabsModel: localStorage.getItem(API_KEYS.ELEVENLABS_MODEL) || import.meta.env.VITE_ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5',
      // Huawei: browser-side config pointing to the secure server proxy
      huaweiEndpoint: localStorage.getItem(API_KEYS.HUAWEI_ENDPOINT) || import.meta.env.VITE_HUAWEI_ENDPOINT || '',
      huaweiApiKey:   localStorage.getItem(API_KEYS.HUAWEI_API_KEY)  || import.meta.env.VITE_HUAWEI_API_KEY  || '',
    };
  },

  isUsingHuawei() {
    const { huaweiEndpoint, huaweiApiKey } = this.getKeys();
    return !!(huaweiEndpoint && huaweiApiKey);
  },

  // Internal: send a request to the Huawei proxy server
  async _callHuaweiProxy(route, payload) {
    const { huaweiEndpoint, huaweiApiKey } = this.getKeys();
    const response = await fetch(`${huaweiEndpoint}/api/huawei/${route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': huaweiApiKey,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Huawei proxy error: ${response.status}`);
    }
    return response.json();
  },

  hasKeys() {
    const keys = this.getKeys();
    return !!keys.openai || !!keys.elevenlabs || this.isUsingHuawei();
  },

  /**
   * Simplifies dense paragraphs, preserving subject-specific terminology.
   */
  async simplifyParagraph(text, subject = 'General') {
    const keys = this.getKeys();

    // 1. Try Huawei NLP proxy first (when configured)
    if (this.isUsingHuawei()) {
      try {
        const result = await this._callHuaweiProxy('nlp/simplify', { text, subject });
        return result.simplified || result.text;
      } catch (e) {
        console.warn('[Huawei NLP] simplify failed, falling back:', e.message);
      }
    }

    // 2. OpenAI fallback / demo mock fallback
    if (!keys.openai) {
      const cleanText = text.trim().toLowerCase().replace(/[^a-z0-9\s,.-]/g, '');
      
      // 1. Check direct sentence map matches first (substring check or exact match)
      for (const [denseKey, simpleVal] of Object.entries(MOCK_SENTENCES)) {
        if (cleanText.includes(denseKey) || denseKey.includes(cleanText)) {
          return simpleVal;
        }
      }

      // 2. Find matching mock paragraph
      for (const [key, mock] of Object.entries(MOCK_PARAGRAPHS)) {
        if (text.toLowerCase().includes(key.replace('-', '')) || 
            text.length > 50 && mock.toLowerCase().substring(0, 30) === text.toLowerCase().substring(0, 30) ||
            text.includes("photosynthesis") && key === "science-passage" ||
            text.includes("ratio") && key === "math-word" ||
            text.includes("aqueduct") && key === "history-passage" ||
            text.includes("Sherwood") && key === "english-lit") {
          return mock;
        }
      }
      
      // Heuristic fallback text simplification (splitting sentences to make them short)
      return text
        .split(/[.;:]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('. ') + '.';
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.openai}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert educational therapist assisting dyslexic children. Your task is to rewrite the student's text to reduce reading load.
Rules:
1. Simplify complex, passive, or nested sentence structures into very short, direct active-voice sentences.
2. IMPORTANT: Keep all subject-specific technical terminology (e.g., 'photosynthesis', 'denominator', 'aqueduct', 'equivalent', 'chlorophyll') completely unchanged. Do not replace them with simpler words.
3. Keep the meaning and information content exactly the same. Do not shorten content excessively; only simplify the language structures.
4. Avoid idioms or complex phrases.
5. Return ONLY the simplified plain text.`
            },
            {
              role: 'user',
              content: text
            }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'OpenAI request failed');
      }

      const result = await response.json();
      return result.choices[0].message.content.trim();
    } catch (e) {
      console.error('OpenAI simplify error:', e);
      throw e;
    }
  },

  /**
   * Word decoder: fetches syllables, phonetics, and simple definitions.
   */
  async decodeWord(word, subject = 'General') {
    const cleanWord = word.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
    const keys = this.getKeys();

    // 1. Check Mock Data Database first
    if (MOCK_WORDS[cleanWord]) {
      return { ...MOCK_WORDS[cleanWord] };
    }

    // 2. Fallback: If no OpenAI key, generate algorithmic fallback
    if (!keys.openai) {
      const syllables = fallbackWordSplit(cleanWord);
      const offlineAnalogy = MOCK_OFFLINE_ANALOGIES[cleanWord];
      return {
        syllables: syllables,
        phonetics: `/ ${syllables.join('-')} /`,
        definition: `A term used in ${subject}. (Add an OpenAI API Key for dynamic definitions).`,
        analogy: offlineAnalogy || `To see live AI analogies for "${cleanWord}", add an OpenAI API key. In Simulation Mode, try clicking terms like "photosynthesis", "denominator", "aqueduct", or "outlaw" to see mock analogies!`
      };
    }

    // 3. Active OpenAI Query
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.openai}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: "json_object" },
          messages: [
            {
              role: 'system',
              content: `You are an expert reading tutor for children with dyslexia. Analyze the provided word.
Provide a JSON response containing:
1. "syllables": A list of strings representing the word broken down into visually distinct syllable chunks.
2. "phonetics": A clean, simple, phonetic pronunciation guide (e.g. for kids, like "/ foh-tuh-sin-thuh-sis /").
3. "definition": A short (1 sentence), highly concrete, child-friendly definition.
Response JSON structure:
{
  "syllables": ["syllable1", "syllable2"],
  "phonetics": "/ phonetic-string /",
  "definition": "Simple definition string"
}`
            },
            {
              role: 'user',
              content: `Word: ${cleanWord}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI word decode request failed');
      }

      const resJson = await response.json();
      const aiData = JSON.parse(resJson.choices[0].message.content);
      
      // Generate a kid-friendly analogy
      const analogy = MOCK_OFFLINE_ANALOGIES[cleanWord] || await this.getOpenAIAnalogy(cleanWord);

      return {
        syllables: aiData.syllables || fallbackWordSplit(cleanWord),
        phonetics: aiData.phonetics || `/ ${cleanWord} /`,
        definition: aiData.definition || 'Simple meaning is unavailable.',
        analogy: analogy
      };
    } catch (e) {
      console.error('Word decode error:', e);
      // Heuristic fallback
      const syllables = fallbackWordSplit(cleanWord);
      return {
        syllables: syllables,
        phonetics: `/ ${syllables.join('-')} /`,
        definition: `Failed to fetch definition: ${e.message}`,
        analogy: 'No analogy available.'
      };
    }
  },

  /**
   * Helper to retrieve simple analogies using OpenAI.
   */
  async getOpenAIAnalogy(word) {
    const keys = this.getKeys();
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.openai}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Write a short (1-2 sentences) creative, simplified analogy comparing this word to an everyday concept. Speak directly to a child.'
            },
            {
              role: 'user',
              content: `Word: ${word}`
            }
          ]
        })
      });
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (e) {
      return 'Analogy search is unavailable.';
    }
  },

  /**
   * Extract the most complex words from a passage for vocab pre-teaching.
   * Returns array of {word, syllables, phonetics, definition, analogy}.
   */
  async extractVocabWords(text, subject = 'General', maxWords = 6) {
    const STOP_WORDS = new Set(['the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'that', 'this', 'these', 'those', 'from', 'with', 'into', 'about', 'through', 'which', 'their', 'there', 'they', 'them', 'then', 'than', 'what', 'when', 'where', 'while', 'also', 'both', 'each', 'more', 'other', 'same', 'such', 'some', 'most', 'very', 'just', 'only', 'over', 'even', 'like', 'well', 'back', 'after', 'first', 'last', 'long', 'little', 'right', 'high', 'every', 'near', 'between', 'would', 'could', 'should', 'being', 'been', 'will', 'called', 'known', 'used', 'made', 'make', 'take', 'taken', 'using', 'while', 'during', 'without', 'within', 'among', 'along', 'where', 'because', 'however', 'therefore', 'although', 'carbon', 'water', 'light', 'green', 'black', 'white', 'large', 'small', 'young', 'around', 'under', 'above', 'below', 'before', 'after', 'since']);
    const words = [...new Set((text.match(/\b[a-zA-Z]{7,}\b/g) || []).map(w => w.toLowerCase()))];
    const filtered = words.filter(w => !STOP_WORDS.has(w)).slice(0, maxWords);
    const results = [];
    for (const word of filtered) {
      try {
        const data = await this.decodeWord(word, subject);
        results.push({ word, ...data });
      } catch (e) { /* skip */ }
    }
    return results;
  },

  /**
   * Generate 3 comprehension questions about the passage.
   */
  async generateComprehensionQuestions(text, subject = 'General') {
    const keys = this.getKeys();
    if (!keys.openai) {
      return MOCK_COMPREHENSION[subject] || MOCK_COMPREHENSION.General;
    }
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.openai}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a literacy teacher writing reading comprehension questions for dyslexic students aged 8-15. Generate exactly 3 clear, simple, dyslexia-friendly questions with short hints. Return JSON: {"questions": [{"q": "...", "hint": "..."}, ...]}' },
            { role: 'user', content: `Subject: ${subject}\n\nText:\n${text.substring(0, 1000)}` }
          ]
        })
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      return parsed.questions || MOCK_COMPREHENSION[subject] || MOCK_COMPREHENSION.General;
    } catch (e) {
      return MOCK_COMPREHENSION[subject] || MOCK_COMPREHENSION.General;
    }
  },

  /**
   * Transcribes recorded PCM audio via Huawei SIS for oral reading fluency scoring.
   * audioBase64: base64-encoded PCM16k16bit captured by the browser's PcmRecorder.
   */
  async transcribeAudio(audioBase64, format = 'pcm16k16bit') {
    if (!this.isUsingHuawei()) {
      throw new Error('Oral reading assessment requires the Huawei Cloud proxy. Configure it to enable this feature.');
    }
    const result = await this._callHuaweiProxy('asr', { audio: audioBase64, format });
    return result.transcript || '';
  },

  /**
   * Extracts domain-specific / complex vocabulary from a passage using Huawei NLP.
   * Falls back to a word-length heuristic when Huawei is not configured.
   * Returns string[].
   */
  async extractHardWords(text, subject = 'General') {
    if (this.isUsingHuawei()) {
      // Try NER first — identifies domain-specific terms more accurately than keyword frequency
      try {
        const nerResult = await this._callHuaweiProxy('nlp/ner', { text });
        if (Array.isArray(nerResult.entities) && nerResult.entities.length > 0) {
          const domainWords = nerResult.entities
            .filter(e => e.type !== 'PER' && e.type !== 'LOC')
            .map(e => e.word.toLowerCase())
            .filter(w => w.length >= 4);
          if (domainWords.length > 0) return [...new Set(domainWords)].slice(0, 25);
        }
      } catch (e) {
        console.warn('[Huawei NER] falling back to keyword extraction:', e.message);
      }
      // Fall back to keyword frequency extraction
      try {
        const result = await this._callHuaweiProxy('nlp/keywords', { text, limit: 25 });
        if (Array.isArray(result.keywords) && result.keywords.length > 0) {
          return result.keywords;
        }
      } catch (e) {
        console.warn('[Huawei NLP Keywords] falling back to heuristic:', e.message);
      }
    }
    // Heuristic fallback: words ≥6 chars that are not very common function words
    const COMMON = new Set(['about','after','again','against','because','before','between','could','during','every','first','found','going','large','learn','likely','never','other','place','provide','right','seems','since','small','sound','still','their','there','these','three','through','together','toward','under','until','using','water','where','while','world','would','write','years']);
    const words = text.toLowerCase().match(/\b[a-z]{6,}\b/g) || [];
    return [...new Set(words.filter(w => !COMMON.has(w)))].slice(0, 25);
  },

  /**
   * Synthesises speech via Huawei SIS TTS.
   * voice: Huawei SIS voice property string (e.g. 'english_rose_16k', 'chinese_huaxiaomei_16k').
   * speed: playback rate multiplier (1.0 = normal).
   * Returns base64-encoded MP3 string, or null if Huawei is not configured.
   */
  async synthesizeSpeech(text, voice = 'english_rose_16k', speed = 1.0) {
    if (!this.isUsingHuawei()) return null;
    try {
      const result = await this._callHuaweiProxy('tts', { text: text.slice(0, 500), voice, speed });
      return result.audio || null;
    } catch (e) {
      console.warn('[Huawei TTS]', e.message);
      return null;
    }
  },

  /**
   * Detects the academic subject of a text passage using keyword signal matching.
   * Uses Huawei NLP keyword extraction when configured; falls back to a built-in
   * subject vocabulary table.
   * Returns one of: 'Science' | 'Mathematics' | 'History' | 'Literature' | 'General'
   */
  async detectSubject(text) {
    const SUBJECT_SIGNALS = {
      Science:      ['photosynthesis','chlorophyll','evaporation','condensation','precipitation','organism','ecosystem','stomata','atmosphere','molecule','oxygen','carbon','biology','chemistry','physics','hypothesis','experiment','nucleus','membrane','digestion','respiration','habitat','adaptation','food','chain','water','cycle','soil','roots'],
      Mathematics:  ['equation','fraction','denominator','numerator','ratio','percentage','geometry','algebra','multiply','divide','subtract','perimeter','volume','probability','integer','decimal','marbles','containers','remainder','remainder','polygon','calculate','average','median','mode','total','equal','parts'],
      History:      ['empire','civilization','century','ancient','conquest','dynasty','parliament','revolution','archaeologist','aqueduct','medieval','colony','treaty','republic','monarchy','roman','renaissance','independence','war','soldiers','kingdom','pharaoh','siege','feudal','colonial','historic'],
      Literature:   ['protagonist','metaphor','narrative','villain','legend','folklore','outlaw','poetry','stanza','theme','character','conflict','symbolism','plot','setting','sheriff','forest','merry','folklore','fable','epic','tragedy','comedy','sonnet','soliloquy','allegory'],
    };

    let words;
    if (this.isUsingHuawei()) {
      try {
        const result = await this._callHuaweiProxy('nlp/keywords', { text, limit: 30 });
        if (Array.isArray(result.keywords) && result.keywords.length > 0) {
          words = result.keywords;
        }
      } catch (e) { /* fall through to text scan */ }
    }

    const lower = text.toLowerCase();
    const scores = {};
    for (const [subject, signals] of Object.entries(SUBJECT_SIGNALS)) {
      if (words) {
        scores[subject] = signals.filter(s => words.some(w => w.includes(s) || s.includes(w))).length;
      } else {
        scores[subject] = signals.filter(s => lower.includes(s)).length;
      }
    }
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] > 0 ? best[0] : 'General';
  },

  /**
   * Translates a word/phrase to a target language via Huawei NLP Machine Translation.
   * targetLang: 'zh' (Mandarin) | 'ms' (Malay) | 'ta' (Tamil)
   * Returns translated string, or null if Huawei is not configured.
   */
  async translateWord(text, targetLang) {
    if (!text || !targetLang) return null;
    if (!this.isUsingHuawei()) return null;
    try {
      const result = await this._callHuaweiProxy('nlp/translate', { text, from: 'en', to: targetLang });
      return result.translation || null;
    } catch (e) {
      console.warn('[Huawei MT]', e.message);
      return null;
    }
  },

  /**
   * OCR vision: processes image files and extracts clean text using OpenAI GPT-4o
   */
  async transcribeImage(file) {
    const keys = this.getKeys();

    // Convert file to base64 (needed by both Huawei OCR and OpenAI Vision)
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

    // 1. Try Huawei Cloud OCR first (when configured) — no OpenAI key needed
    if (this.isUsingHuawei()) {
      try {
        const result = await this._callHuaweiProxy('ocr', { image: base64Image });
        if (result.text && result.text.trim().length > 0) return result.text;
      } catch (e) {
        console.warn('[Huawei OCR] failed, falling back:', e.message);
      }
    }

    // 2. OpenAI Vision fallback
    if (!keys.openai) {
      throw new Error('Image OCR requires either a Huawei Cloud proxy or an OpenAI API Key. Configure one in settings.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keys.openai}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an OCR extraction assistant. Transcribe all readable text from this worksheet image. 
Rules:
1. Reconstruct logical reading layouts: paragraphs, headings, math word problems.
2. Remove unrelated noise, crop marks, handwritings (unless it is part of the question text).
3. Do not add markdown framing, explanations, or labels (like "Here is the text"). Return ONLY the clean extracted text.`
          },
          {
            role: 'user',
            content: [
              {
                type: "text",
                text: "Extract and transcribe all textbook text from this image."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI OCR vision failed');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
};
