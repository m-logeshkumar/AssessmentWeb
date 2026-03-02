const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Validate Gemini response structure
 * @throws {Error} if response doesn't match expected schema
 */
const validateGeminiResponse = (parsed) => {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Response is not a valid object');
    }
    if (!Array.isArray(parsed.evaluations)) {
        throw new Error('Response missing evaluations array');
    }
    for (let i = 0; i < parsed.evaluations.length; i++) {
        const evaluation = parsed.evaluations[i];
        if (typeof evaluation.questionIndex !== 'number') {
            throw new Error(`Evaluation ${i}: questionIndex must be a number`);
        }
        if (typeof evaluation.correctAnswer !== 'string') {
            throw new Error(`Evaluation ${i}: correctAnswer must be a string`);
        }
        if (typeof evaluation.answerDescription !== 'string') {
            throw new Error(`Evaluation ${i}: answerDescription must be a string`);
        }
        if (typeof evaluation.answers !== 'object' || evaluation.answers === null) {
            throw new Error(`Evaluation ${i}: answers must be an object`);
        }
        for (const [key, value] of Object.entries(evaluation.answers)) {
            if (typeof value !== 'boolean') {
                throw new Error(`Evaluation ${i}: answer "${key}" must be boolean`);
            }
        }
    }
};

/**
 * Retry mechanism with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Max number of retries
 * @param {number} initialDelayMs - Initial delay in milliseconds
 */
const retryWithBackoff = async (fn, maxRetries = 3, initialDelayMs = 1000) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            // Check if error is retryable (rate limit or server error)
            const isRetryable = error.status === 429 || (error.status >= 500 && error.status < 600);
            if (!isRetryable || attempt === maxRetries - 1) {
                throw error;
            }
            const delay = initialDelayMs * Math.pow(2, attempt);
            console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
};

/**
 * Evaluate all student submissions for fill-in-the-blank assessment using Gemini AI.
 * Each question is worth 1 mark. Evaluates based on key terms/concepts, not full sentences.
 * Includes validation, retry logic, and error handling.
 *
 * @param {Object} assessment - Assessment with questions
 * @param {Array} submissions - Array of student submissions
 * @returns {Array} Array of { questionIndex, correctAnswer, answers: { studentAnswer: boolean } }
 */
const evaluateWithGemini = async (assessment, submissions) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in .env');
    }

    if (!assessment || !Array.isArray(assessment.questions)) {
        throw new Error('Invalid assessment: missing questions');
    }
    if (!Array.isArray(submissions)) {
        throw new Error('Invalid submissions: must be an array');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const questions = assessment.questions;

    // Build a prompt with all questions and all student answers
    const questionsBlock = questions.map((q, i) => {
        // Gather all unique student answers for this question
        const studentAnswers = new Set();
        for (const sub of submissions) {
            const ans = sub.answers.find(a => a.questionId.toString() === q._id.toString());
            if (ans && ans.answer && ans.answer.trim()) {
                studentAnswers.add(ans.answer.trim());
            }
        }

        return `Q${i + 1}: "${q.questionText}"
Student answers to evaluate: ${JSON.stringify([...studentAnswers])}`;
    }).join('\n\n');

    const prompt = `You are an assessment evaluator for FILL-IN-THE-BLANK questions.
Each question is worth 1 MARK and expects a SHORT ANSWER (single word/phrase, NOT full sentences).

Evaluate each student answer based on KEY TERMS and CONCEPTS only.

${questionsBlock}

RESPOND ONLY with valid JSON in this exact format, nothing else:
{
  "evaluations": [
    {
      "questionIndex": 0,
      "correctAnswer": "the correct answer",
      "answerDescription": "Brief explanation (1-2 sentences) of why this is correct",
      "answers": {
        "student answer text": true,
        "wrong answer text": false
      }
    }
  ]
}

EVALUATION RULES (1 mark per question):
- Answers should be SHORT (1-3 words typically, not full sentences)
- Evaluate based on KEY TERMS, not sentence structure or grammar
- Accept abbreviations: "JS" = "JavaScript", "HTML" = "HyperText Markup Language"
- Accept synonyms: "method" = "function", "array" = "list"
- Case-insensitive matching: "double" = "Double", "javascript" = "JavaScript"
- Accept minor spelling variations
- Focus on FACTUAL CORRECTNESS of the core concept
- If the key term/concept is correct, award the mark even if wording differs

⚠️ PROGRAMMING LANGUAGE SPECIFIC RULES:
- Java primitives vs wrapper classes are interchangeable (represent same concept):
  "int" = "Integer", "double" = "Double", "boolean" = "Boolean", "char" = "Character"
  Example: Q: "What is the result type?" + A: "double" when answer is "Double" → TRUE
- Accept both lowercase and capitalized versions of data types
- For getClass() results, accept both primitive name and wrapper class name

⚠️ CONTEXT-AWARE EVALUATION:
- If question asks for SPECIFICS ("which kind", "what type", "name the error"), require detailed answer
  Example: Q: "Which kind of error is it?" + A: "error" → FALSE (too generic, needs "syntax error")
- If question asks GENERAL outcome ("what happens", "result of"), accept generic answer
  Example: Q: "What happens if it runs?" + A: "error" → TRUE (generic is acceptable)
- Don't accept INCOMPLETE answers for specific questions
  Example: Q: "What does SQL stand for?" + A: "Query Language" → FALSE (missing "Structured")
- Generic answers only valid when question doesn't ask for specificity

Examples of CORRECT evaluation:
Q: "What language runs in the browser?"
- "JavaScript" → TRUE (correct)
- "javascript" → TRUE (case doesn't matter)
- "JS" → TRUE (abbreviation accepted)
- "Java" → FALSE (wrong language)

Q: "What does HTML stand for?"
- "HyperText Markup Language" → TRUE
- "Hypertext markup language" → TRUE (case variation)
- "Markup Language" → FALSE (incomplete)

Q: "Which kind of error is it?" (asks for specific type)
- "syntax error" → TRUE (specific type provided)
- "SyntaxError" → TRUE (case variation)
- "error" → FALSE (too generic, question asks "which kind")

Q: "What happens if the code runs?" (asks for general outcome)
- "error" → TRUE (generic acceptable here)
- "syntax error" → TRUE (specific also acceptable)
- "it throws an error" → TRUE (descriptive acceptable)

Q: "What is the result of getClass().getSimpleName()?" (Java question)
- "Double" → TRUE (wrapper class name)
- "double" → TRUE (primitive type, same concept)
- "java.lang.Double" → TRUE (fully qualified, but accepts simple name)

DESCRIPTION GUIDELINES:
- Keep descriptions brief (1-2 sentences)
- Explain WHY the answer is correct or provide helpful context
- Help students learn and understand the concept
- Use simple, clear language

Examples:
Q: "What language runs in the browser?"
- correctAnswer: "JavaScript"
- answerDescription: "JavaScript is the programming language that runs client-side in web browsers to create interactive web pages."

Q: "Which kind of error is it?"
- correctAnswer: "syntax error"
- answerDescription: "A syntax error occurs when code violates the language's grammar rules and prevents the program from running."

Q: "What does SQL stand for?"
- correctAnswer: "Structured Query Language"
- answerDescription: "SQL is the standard language for managing and manipulating relational databases."

Q: "What is the result of getClass().getSimpleName()?" (Java autoboxing question)
- correctAnswer: "Double"
- answerDescription: "When an 'int' and a 'double' are added, the 'int' is promoted to 'double', resulting in a 'double' value. This 'double' value is then autoboxed into a 'java.lang.Double' object. The 'getClass().getSimpleName()' method returns the simple name of this wrapper class, which is 'Double'."`;

    // Call API with retry logic
    const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt);
    });

    const responseText = result.response.text();
    if (!responseText) {
        throw new Error('Gemini API returned empty response');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (parseError) {
        throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
    }

    // Validate response structure
    validateGeminiResponse(parsed);

    return parsed.evaluations;
};

/**
 * Apply Gemini evaluations to score all submissions
 * Fill-in-the-blank: 1 mark per correct answer
 * Matching: exact → case-insensitive → synonym/abbreviation
 */
const applyGeminiScores = (assessment, submissions, evaluations) => {
    if (!Array.isArray(submissions) || !Array.isArray(evaluations)) {
        throw new Error('Invalid input: submissions and evaluations must be arrays');
    }

    const results = [];

    for (const submission of submissions) {
        let score = 0;
        const totalQuestions = assessment.questions.length;
        const detailedScores = [];

        for (const evaluation of evaluations) {
            // Validate evaluation index
            if (typeof evaluation.questionIndex !== 'number' || evaluation.questionIndex < 0) {
                console.warn(`⚠️ Skipping invalid question index: ${evaluation.questionIndex}`);
                continue;
            }

            const question = assessment.questions[evaluation.questionIndex];
            if (!question) {
                console.warn(`⚠️ Question not found at index ${evaluation.questionIndex}`);
                continue;
            }

            const studentAns = submission.answers.find(
                a => a.questionId.toString() === question._id.toString()
            );

            let isCorrect = false;
            if (studentAns && studentAns.answer && studentAns.answer.trim()) {
                const studentAnswer = studentAns.answer.trim();
                isCorrect = evaluateAnswer(studentAnswer, evaluation.answers);
            }

            if (isCorrect) score++;
            detailedScores.push({
                questionIndex: evaluation.questionIndex,
                isCorrect,
                studentAnswer: studentAns?.answer?.trim() || '(no answer)',
            });
        }

        results.push({
            submissionId: submission._id,
            score,
            totalQuestions,
            maxMarks: totalQuestions,
            detailedScores,
        });
    }

    return results;
};

/**
 * Calculate similarity ratio between two strings (Levenshtein distance based)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity ratio between 0 and 1
 */
const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(shorter, longer);
    return (longer.length - editDistance) / longer.length;
};

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
const getEditDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
};

/**
 * Normalize string by removing spaces and converting to lowercase
 * @param {string} str - Input string
 * @returns {string} Normalized string
 */
const normalizeString = (str) => {
    return str.toLowerCase().replace(/\s+/g, '');
};

/**
 * Check if two answers are Java primitive/wrapper equivalents
 * @param {string} answer1 - First answer
 * @param {string} answer2 - Second answer
 * @returns {boolean} Whether they represent the same Java type
 */
const areJavaTypeEquivalents = (answer1, answer2) => {
    const primitiveWrapperMap = {
        'int': 'integer',
        'integer': 'int',
        'double': 'double',
        'float': 'float',
        'long': 'long',
        'short': 'short',
        'byte': 'byte',
        'char': 'character',
        'character': 'char',
        'boolean': 'boolean'
    };
    
    const lower1 = answer1.toLowerCase();
    const lower2 = answer2.toLowerCase();
    
    // Check if they're the same when lowercased
    if (lower1 === lower2) return true;
    
    // Check if one is primitive and other is wrapper
    if (primitiveWrapperMap[lower1]) {
        return primitiveWrapperMap[lower1] === lower2;
    }
    
    return false;
};

/**
 * Evaluate a student answer against expected answers
 * Try: exact match → case-insensitive → Java type equivalence → fuzzy match (75% similarity with length check)
 * @returns {boolean} Whether answer is correct
 */
const evaluateAnswer = (studentAnswer, expectedAnswers) => {
    if (!studentAnswer || typeof studentAnswer !== 'string') return false;
    if (typeof expectedAnswers !== 'object' || expectedAnswers === null) return false;

    const SIMILARITY_THRESHOLD = 0.75; // 75% similarity required
    const LENGTH_RATIO_THRESHOLD = 0.60; // Answer must be at least 60% of expected length

    // Normalize student answer (remove spaces, lowercase)
    const normalizedStudent = normalizeString(studentAnswer);

    // Exact match
    if (expectedAnswers[studentAnswer] === true) return true;

    // Case-insensitive match
    const lowerStudentAnswer = studentAnswer.toLowerCase();
    for (const [key, value] of Object.entries(expectedAnswers)) {
        if (value === true && key.toLowerCase() === lowerStudentAnswer) {
            return true;
        }
    }

    // Java primitive/wrapper type equivalence (e.g., "double" = "Double", "int" = "Integer")
    for (const [key, value] of Object.entries(expectedAnswers)) {
        if (value === true && areJavaTypeEquivalents(studentAnswer, key)) {
            console.log(`✓ Java type match: "${studentAnswer}" ≈ "${key}" (primitive/wrapper equivalence)`);
            return true;
        }
    }

    // Fuzzy match with 75% similarity (ignoring case and spaces)
    // IMPORTANT: Also check length ratio to prevent accepting incomplete answers
    // Example: "error" should NOT match "syntax error" (too short/generic)
    for (const [key, value] of Object.entries(expectedAnswers)) {
        if (value === true) {
            const normalizedExpected = normalizeString(key);
            
            // Check length ratio - reject if student answer is too short compared to expected
            const lengthRatio = normalizedStudent.length / normalizedExpected.length;
            if (lengthRatio < LENGTH_RATIO_THRESHOLD) {
                console.log(`✗ Too short: "${studentAnswer}" vs "${key}" (${(lengthRatio * 100).toFixed(0)}% length)`);
                continue;
            }
            
            const similarity = calculateSimilarity(normalizedStudent, normalizedExpected);
            
            if (similarity >= SIMILARITY_THRESHOLD) {
                console.log(`✓ Fuzzy match: "${studentAnswer}" ≈ "${key}" (${(similarity * 100).toFixed(1)}% similar, ${(lengthRatio * 100).toFixed(0)}% length)`);
                return true;
            }
        }
    }

    // If no match found, answer is wrong
    return false;
};

module.exports = { evaluateWithGemini, applyGeminiScores };
