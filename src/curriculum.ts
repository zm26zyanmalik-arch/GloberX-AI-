export interface Topic {
  name: string;
  description: string;
}

export interface SubjectCurriculum {
  topics: Topic[];
  teachingStyle: string;
}

export const MASTER_CURRICULUM: Record<string, SubjectCurriculum> = {
  Mathematics: {
    teachingStyle: "Step-by-step solving, mental math shortcuts, and shortcut tricks.",
    topics: [
      { name: "Number System", description: "Natural numbers, whole numbers, integers, and their properties." },
      { name: "Place Value & Simplification", description: "Understanding digits value and BODMAS rule for simplification." },
      { name: "Addition & Subtraction", description: "Fast calculation methods and columnar operations for large numbers." },
      { name: "Multiplication Tricks", description: "Vedic math techniques and fast table mastery up to 100." },
      { name: "Division Techniques", description: "Long division, short division, and divisibility rules." },
      { name: "Fractions", description: "Types of fractions, operations, and real-life use in sharing." },
      { name: "Decimals", description: "Conversion from fractions, operations, and decimal place values." },
      { name: "Percentage", description: "Calculating portions of 100 for real-life cases like discount and tax." },
      { name: "Ratio & Proportion", description: "Comparing quantities and solving for unknowns in real-world scenarios." },
      { name: "Algebra Basics", description: "Variables, constant, and construction of algebraic expressions." },
      { name: "Linear Equations", description: "Solving for X and real-life applications of linear equations." },
      { name: "Geometry", description: "Lines, angles, types of triangles, and properties of shapes." },
      { name: "Mensuration", description: "Calculating Area, Perimeter, and Volume for 2D and 3D shapes." },
      { name: "Data Handling", description: "Reading and creating bar charts, pie graphs, and histograms." },
      { name: "Mental Math", description: "Calculating in your head using shortcuts and visualization." }
    ]
  },
  Science: {
    teachingStyle: "Concept-based, experiments simulation descriptions, and real-life examples.",
    topics: [
      { name: "Photosynthesis", description: "How plants use CO2, water, and sunlight to produce food and oxygen." },
      { name: "Human Body Systems", description: "Overview of Circulatory, Respiratory, Nervous, and Digestive systems." },
      { name: "Nutrition & Health", description: "Balanced diet, vitamins, minerals, and healthy lifestyle habits." },
      { name: "Force & Motion", description: "Newton's laws, friction, gravity, and speed calculations." },
      { name: "Work, Energy & Power", description: "Definitions, conservation of energy, and simple machines." },
      { name: "Light", description: "Reflection, refraction, lenses, and the visible spectrum." },
      { name: "Sound", description: "Vibrations, frequency, pitch, and how we hear." },
      { name: "Matter", description: "Physical properties of Solids, Liquids, and Gases." },
      { name: "Atoms & Molecules", description: "Foundations of chemistry: elements, compounds, and mixtures." },
      { name: "Chemistry Reactions", description: "Basic types of chemical reactions seen in daily life." },
      { name: "Electricity & Circuits", description: "Series and parallel circuits, conductors, and home safety." },
      { name: "Environment & Ecosystem", description: "Living organisms, food chains, and ecological balance." },
      { name: "Natural Resources", description: "Renewable vs non-renewable resources and conservation." },
      { name: "Pollution & Climate", description: "Causes of pollution, global warming, and climate change effects." },
      { name: "Everyday Science", description: "Applying scientific principles to cooking, cleaning, and weather." }
    ]
  },
  "Social Science": {
    teachingStyle: "Storytelling, map-based learning, and historical character context.",
    topics: [
      { name: "Ancient History Basics", description: "Civilizations like Harappa, Egypt, and early human life." },
      { name: "Medieval History", description: "Kingdoms, culture, and architecture beyond the ancient era." },
      { name: "Modern History", description: "The freedom movement and India's path to independence." },
      { name: "Indian Constitution Basics", description: "The Preamble, fundamental rights, and the supreme law." },
      { name: "Government System", description: "Lok Sabha, Rajya Sabha, and the executive system." },
      { name: "Rights & Duties", description: "Understanding your role as a citizen and fundamental rights." },
      { name: "Democracy", description: "The concept of 'of the people, by the people, for the people'." },
      { name: "Geography", description: "Internal and external structure of the Earth and plate tectonics." },
      { name: "Climate & Weather", description: "Difference between weather and climate and major climatic zones." },
      { name: "Natural Resources", description: "Land, water, forests, and mineral wealth distribution." },
      { name: "Agriculture & Industry", description: "Types of farming and the industrial revolution effects." },
      { name: "Economy Basics", description: "Needs vs wants, resources, and the concept of scarcity." },
      { name: "Money & Banking", description: "Evolution of money, currency, and how banks operate." },
      { name: "Trade & Business", description: "Local and international trade, imports and exports." },
      { name: "Current Affairs Basics", description: "Understanding news and significant global events today." }
    ]
  },
  English: {
    teachingStyle: "Natural sentence structure, vocabulary memory tricks, and immersive conversation.",
    topics: [
      { name: "Parts of Speech", description: "Nouns, pronouns, verbs, adjectives, adverbs, and more." },
      { name: "Tenses", description: "Past, present, and future timelines and their variations." },
      { name: "Verbs", description: "Main verbs, helping verbs (auxiliary), and modal verbs usage." },
      { name: "Sentence Structure", description: "Subject, verb, and object placement for clear meaning." },
      { name: "Active & Passive Voice", description: "Shifting focus between the doer and the receiver of action." },
      { name: "Direct & Indirect Speech", description: "Reporting someone else's words accurately." },
      { name: "Vocabulary Building", description: "Learning new words and using them in daily contexts." },
      { name: "Synonyms & Antonyms", description: "Words with similar and opposite meanings." },
      { name: "Reading Comprehension", description: "Extracting meaning and analyzing written passages." },
      { name: "Writing Skills", description: "Formal letters, essays, and creative storytelling." },
      { name: "Speaking Practice", description: "Fluency, pronunciation, and confidence building." },
      { name: "Grammar Rules", description: "Articles, prepositions, conjunctions, and punctuation." },
      { name: "Common Errors", description: "Identifying and fixing frequent mistakes in English." },
      { name: "Paragraph Writing", description: "Developing a central idea with supporting sentences." },
      { name: "Communication Skills", description: "Using English effectively in real-life social situations." }
    ]
  },
  Hindi: {
    teachingStyle: "व्याकरण, शब्दावली स्मृति युक्तियाँ, और विसर्जनपूर्ण बातचीत।",
    topics: [
      { name: "वर्णमाला", description: "स्वर और व्यंजन का ज्ञान और उनका उच्चारण।" },
      { name: "संज्ञा", description: "किसी व्यक्ति, वस्तु या स्थान के नाम का ज्ञान।" },
      { name: "सर्वनाम", description: "संज्ञा के स्थान पर प्रयोग होने वाले शब्दों का ज्ञान।" },
      { name: "क्रिया", description: "काम के होने या करने का बोध कराने वाले शब्द।" },
      { name: "विशेषण", description: "संज्ञा या सर्वनाम की विशेषता बताने वाले शब्द।" },
      { name: "विलोम शब्द", description: "विपरीत अर्थ वाले शब्दों का संग्रह और प्रयोग।" },
      { name: "पर्यायवाची शब्द", description: "समान अर्थ रखने वाले विभिन्न शब्दों का ज्ञान।" },
      { name: "मुहावरे", description: "विशेष अर्थ देने वाले वाक्यांशों का प्रयोग।" },
      { name: "लोकोक्तियाँ", description: "कहावतें और उनके पीछे छिपी शिक्षा।" },
      { name: "वाक्य रचना", description: "शुद्ध और सार्थक वाक्य बनाने की कला।" },
      { name: "काल", description: "भूत, वर्तमान और भविष्य काल की पहचान।" },
      { name: "अलंकार", description: "भाषा को सुंदर बनाने वाले तत्वों का परिचय।" },
      { name: "अपठित गद्यांश", description: "अनजान अनुच्छेद को पढ़कर उत्तर देना।" },
      { name: "पत्र लेखन", description: "औपचारिक और अनौपचारिक पत्र लिखने का तरीका।" },
      { name: "दैनिक जीवन भाषा", description: "रोजमर्रा की बातचीत में हिंदी का प्रभावी प्रयोग।" }
    ]
  },
  Urdu: {
    teachingStyle: "بنیادی گرامر، الفاظ ذخیرہ کرنے کی ترکیبیں، اور گفتگو۔",
    topics: [
      { name: "Basic Grammar", description: "بنیادی قواعد: حروف، الفاظ اور جملوں کی بناوٹ۔" },
      { name: "Sentence Formation", description: "اردو میں درست اور بامعنی جملے بنانے کا طریقہ۔" },
      { name: "Vocabulary", description: "روزمرہ استعمال ہونے والے اہم الفاظ کا ذخیرہ۔" },
      { name: "Reading Practice", description: "اردو عبارتوں کو روانی سے پڑھنے کی مشق۔" },
      { name: "Writing Basics", description: "اردو حروف تہجی اور الفاظ لکھنے کی مشق۔" },
      { name: "Daily Conversation", description: "عام سماجی حالات میں اردو کا استعمال۔" },
      { name: "Verb Usage", description: "فعل کی پہچان اور جملوں میں اس کا درست استعمال۔" },
      { name: "Tenses", description: "ماضی، حال اور مستقبل کے لحاظ سے جملوں کی تبدیلی۔" },
      { name: "Basic Literature", description: "اردو کی مشہور کہانیوں اور نظموں کا تعارف۔" },
      { name: "Expression Skills", description: "اپنے خیالات کو اردو میں واضح طور پر بیان کرنا۔" }
    ]
  }
};
