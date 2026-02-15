/**
 * FigPal Web Search Integration
 * 
 * Allows users to perform web searches directly from FigPal.
 * The actual search is performed by the AI service (server-side)
 * and results are streamed back to the chat.
 */

(function () {
    const FP = window.FigPal;

    const SearchEngine = {
        /**
         * Perform a web search
         * @param {string} query - Search query
         */
        async search(query) {
            if (!query) {
                FP.chat.addMessage('Usage: /search <query>', 'error');
                return;
            }

            FP.chat.addMessage(`🔍 Searching for "**${query}**"...`, 'bot');

            try {
                // We delegate the search to the AI layer with an explicit trigger
                await FP.ai.chat(
                    `search the web for: "${query}". \n` +
                    `Return the top 3-5 results with titles, brief summaries, and URLs. \n` +
                    `Format the output as a Markdown list.`
                );
            } catch (error) {
                console.error('Search failed:', error);
                FP.chat.addMessage('❌ Search failed. Please try again.', 'error');
            }
        },

        /**
         * Search for documentation
         * @param {string} topic - Documentation topic
         */
        async docs(topic) {
            if (!topic) {
                FP.chat.addMessage('Usage: /docs <topic>', 'error');
                return;
            }

            FP.chat.addMessage(`📚 Searching docs for "**${topic}**"...`, 'bot');

            try {
                await FP.ai.chat(
                    `search the web for official documentation for: "${topic}". \n` +
                    `Prioritize official sources (e.g., Figma API, React Docs, MDN). \n` +
                    `Return links to specific pages/sections.`
                );
            } catch (error) {
                console.error('Docs search failed:', error);
                FP.chat.addMessage('❌ Docs search failed.', 'error');
            }
        }
    };

    // Register module
    FP.search = SearchEngine;
    console.log('🔍 FigPal Search Engine Loaded');

})();
