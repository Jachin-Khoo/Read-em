/* ==========================================================================
   Sup' Read With Me AI & Search Services (src/ai-service.js)
   ========================================================================== */

const API_KEYS = {
  OPENAI: 'readem_openai_key',
  EXA: 'readem_exa_key',
  ELEVENLABS: 'readem_elevenlabs_key',
  ELEVENLABS_MODEL: 'readem_elevenlabs_model',
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
  saveKeys(openaiKey, exaKey, elevenlabsKey, elevenlabsModel) {
    localStorage.setItem(API_KEYS.OPENAI, openaiKey.trim());
    localStorage.setItem(API_KEYS.EXA, exaKey.trim());
    localStorage.setItem(API_KEYS.ELEVENLABS, elevenlabsKey.trim());
    localStorage.setItem(API_KEYS.ELEVENLABS_MODEL, elevenlabsModel || 'eleven_turbo_v2_5');
  },

  getKeys() {
    return {
      openai: localStorage.getItem(API_KEYS.OPENAI) || import.meta.env.VITE_OPENAI_API_KEY || '',
      exa: localStorage.getItem(API_KEYS.EXA) || import.meta.env.VITE_EXA_API_KEY || '',
      elevenlabs: localStorage.getItem(API_KEYS.ELEVENLABS) || import.meta.env.VITE_ELEVENLABS_API_KEY || '',
      elevenlabsModel: localStorage.getItem(API_KEYS.ELEVENLABS_MODEL) || import.meta.env.VITE_ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5',
    };
  },

  hasKeys() {
    const keys = this.getKeys();
    return !!keys.openai || !!keys.elevenlabs;
  },

  /**
   * Simplifies dense paragraphs, preserving subject-specific terminology.
   */
  async simplifyParagraph(text, subject = 'General') {
    const keys = this.getKeys();
    
    // Fallback: If no OpenAI key, check if text matches one of our demo text headers
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

    // Helper to generate mock Exa citations offline
    const getMockCitations = (w) => [
      { title: `${w.charAt(0).toUpperCase() + w.slice(1)} - Simple Kid Explanation`, url: `https://exa.ai/search?q=${w}+child+friendly+analogy` },
      { title: `What is ${w.charAt(0).toUpperCase() + w.slice(1)}? - WikiKids`, url: `https://exa.ai/search?q=what+is+${w}+for+kids` }
    ];

    // 1. Check Mock Data Database first
    if (MOCK_WORDS[cleanWord]) {
      const mockResult = { ...MOCK_WORDS[cleanWord] };
      mockResult.citations = getMockCitations(cleanWord);
      
      if (keys.exa) {
        try {
          const exaData = await this.fetchExaAnalogy(cleanWord);
          mockResult.analogy = exaData.analogy;
          mockResult.citations = exaData.citations;
        } catch (err) {
          console.warn('Exa fetch failed, using mock analogy:', err);
        }
      }
      return mockResult;
    }

    // 2. Fallback: If no OpenAI key, generate algorithmic fallback
    if (!keys.openai) {
      const syllables = fallbackWordSplit(cleanWord);
      const offlineAnalogy = MOCK_OFFLINE_ANALOGIES[cleanWord];
      return {
        syllables: syllables,
        phonetics: `/ ${syllables.join('-')} /`,
        definition: `A term used in ${subject}. (Add an OpenAI API Key for dynamic definitions).`,
        analogy: offlineAnalogy || `To see live AI analogies for "${cleanWord}", please save your OpenAI or Exa API Key in the settings. In Simulation Mode, try clicking terms like "photosynthesis", "denominator", "aqueduct", or "outlaw" to see mock analogies!`,
        citations: offlineAnalogy ? getMockCitations(cleanWord) : []
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
      
      // Let's get the Exa analogy
      let analogy = 'Add an Exa API Key to generate real-time analogies from the web.';
      let citations = [];
      
      if (keys.exa) {
        try {
          const exaData = await this.fetchExaAnalogy(cleanWord);
          analogy = exaData.analogy;
          citations = exaData.citations;
        } catch (e) {
          analogy = `Could not fetch live web analogy: ${e.message}`;
        }
      } else {
        // Fallback OpenAI analogy if no Exa key but we have OpenAI key
        if (MOCK_OFFLINE_ANALOGIES[cleanWord]) {
          analogy = MOCK_OFFLINE_ANALOGIES[cleanWord];
          citations = getMockCitations(cleanWord);
        } else {
          analogy = await this.getOpenAIAnalogy(cleanWord);
        }
      }

      return {
        syllables: aiData.syllables || fallbackWordSplit(cleanWord),
        phonetics: aiData.phonetics || `/ ${cleanWord} /`,
        definition: aiData.definition || 'Simple meaning is unavailable.',
        analogy: analogy,
        citations: citations
      };
    } catch (e) {
      console.error('Word decode error:', e);
      // Heuristic fallback
      const syllables = fallbackWordSplit(cleanWord);
      return {
        syllables: syllables,
        phonetics: `/ ${syllables.join('-')} /`,
        definition: `Failed to fetch definition: ${e.message}`,
        analogy: 'No analogy available.',
        citations: []
      };
    }
  },

  /**
   * Helper to retrieve simple analogies using OpenAI when Exa is missing
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
   * Fetch analogy explanation via Exa Search
   */
  async fetchExaAnalogy(word) {
    const keys = this.getKeys();
    if (!keys.exa) throw new Error('Exa Key not set');

    // Query Exa search to retrieve kids analogies
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keys.exa
      },
      body: JSON.stringify({
        query: `simple child friendly analogy explaining what ${word} is`,
        useAutoprompt: true,
        numResults: 2,
        highlights: {
          numSentences: 2
        }
      })
    });

    if (!response.ok) {
      throw new Error('Exa request failed');
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const bestHighlight = data.results[0].highlights?.[0] || data.results[0].text || '';
      const analogyText = bestHighlight.replace(/<[^>]*>/g, '').trim();
      
      const citations = data.results.map(r => ({
        title: r.title || r.url,
        url: r.url
      }));

      return {
        analogy: analogyText,
        citations: citations
      };
    }
    
    return {
      analogy: `Searched the web for "${word}" but found no simple child analogies.`,
      citations: []
    };
  },

  /**
   * OCR vision: processes image files and extracts clean text using OpenAI GPT-4o
   */
  async transcribeImage(file) {
    const keys = this.getKeys();
    if (!keys.openai) {
      throw new Error('An OpenAI API Key is required to perform OCR image text extraction. Please configure your key in settings.');
    }

    // Convert file to base64
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

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
