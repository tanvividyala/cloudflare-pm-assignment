/**
 * Feedback Aggregation Tool
 * Uses: Workers, D1, Workers AI, Vectorize
 */

interface Feedback {
	id: string;
	source: string;
	content: string;
	sentiment: string | null;
	category: string | null;
	created_at: string;
	analyzed_at: string | null;
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', ...corsHeaders },
	});
}

function error(message: string, status = 400): Response {
	return json({ error: message }, status);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		if (method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// GET /api/stats - Dashboard statistics
			if (path === '/api/stats' && method === 'GET') {
				const total = await env.DB.prepare(
					'SELECT COUNT(*) as count FROM feedback'
				).first<{ count: number }>();

				const bySentiment = await env.DB.prepare(
					`SELECT sentiment, COUNT(*) as count FROM feedback
					 WHERE sentiment IS NOT NULL GROUP BY sentiment`
				).all<{ sentiment: string; count: number }>();

				const byCategory = await env.DB.prepare(
					`SELECT category, COUNT(*) as count FROM feedback
					 WHERE category IS NOT NULL GROUP BY category`
				).all<{ category: string; count: number }>();

				const recent = await env.DB.prepare(
					'SELECT * FROM feedback ORDER BY created_at DESC LIMIT 5'
				).all<Feedback>();

				const sentimentMap: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
				bySentiment.results.forEach(row => {
					sentimentMap[row.sentiment] = row.count;
				});

				const categoryMap: Record<string, number> = {};
				byCategory.results.forEach(row => {
					categoryMap[row.category] = row.count;
				});

				return json({
					total: total?.count || 0,
					sentiment: sentimentMap,
					categories: categoryMap,
					recent: recent.results,
				});
			}

			// GET /api/feedback - List feedback with optional filters
			if (path === '/api/feedback' && method === 'GET') {
				const limit = parseInt(url.searchParams.get('limit') || '50');
				const offset = parseInt(url.searchParams.get('offset') || '0');
				const sentiment = url.searchParams.get('sentiment');
				const category = url.searchParams.get('category');

				let query = 'SELECT * FROM feedback';
				const conditions: string[] = [];
				const params: (string | number)[] = [];

				if (sentiment) {
					conditions.push('sentiment = ?');
					params.push(sentiment);
				}
				if (category) {
					conditions.push('category = ?');
					params.push(category);
				}

				if (conditions.length > 0) {
					query += ' WHERE ' + conditions.join(' AND ');
				}

				query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
				params.push(limit, offset);

				const result = await env.DB.prepare(query).bind(...params).all<Feedback>();
				return json({ feedback: result.results, meta: { limit, offset } });
			}

			// POST /api/search - Semantic search using Workers AI
			if (path === '/api/search' && method === 'POST') {
				const body = await request.json() as { query: string; limit?: number };

				if (!body.query) {
					return error('Missing query field');
				}

				// Generate embedding for search query using Workers AI
				const embeddingResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
					text: body.query,
				});
				const queryEmbedding = (embeddingResponse as { data: number[][] }).data[0];

				// Search Vectorize
				const vectorResults = await env.VECTORIZE.query(queryEmbedding, {
					topK: body.limit || 10,
					returnMetadata: 'all',
				});

				if (vectorResults.matches.length === 0) {
					return json({ results: [] });
				}

				// Fetch full feedback for matched IDs
				const ids = vectorResults.matches.map(m => m.id);
				const placeholders = ids.map(() => '?').join(',');
				const feedback = await env.DB.prepare(
					`SELECT * FROM feedback WHERE id IN (${placeholders})`
				).bind(...ids).all<Feedback>();

				// Combine with similarity scores
				const results = vectorResults.matches.map(match => ({
					score: match.score,
					feedback: feedback.results.find(f => f.id === match.id),
				}));

				return json({ results });
			}

			// GET /api/insights - AI-generated insights from feedback
			if (path === '/api/insights' && method === 'GET') {
				// Get negative and bug feedback for analysis (most actionable)
				const issues = await env.DB.prepare(
					`SELECT content, category, sentiment FROM feedback
					 WHERE sentiment = 'negative' OR category IN ('bug', 'complaint')
					 ORDER BY created_at DESC LIMIT 15`
				).all<{ content: string; category: string; sentiment: string }>();

				const allFeedback = await env.DB.prepare(
					'SELECT content FROM feedback LIMIT 50'
				).all<{ content: string }>();

				// Generate word frequency for word cloud
				const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if', 'any', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'because', 'as', 'until', 'while', 'although', 'though', 'even', 'still', 'already', 'always', 'never', 'ever', 'really', 've', 'm', 't', 's', 'like', 'get', 'got', 'much', 'many', 'way', 'make', 'made', 'find', 'need', 'try', 'take', 'know', 'think', 'come', 'want', 'use', 'work', 'going', 'been', 'dont', 'cant', 'didnt', 'ive', 'im', 'its']);

				const wordFreq: Record<string, number> = {};
				allFeedback.results.forEach(item => {
					const words = item.content.toLowerCase()
						.replace(/[^a-z\s]/g, '')
						.split(/\s+/)
						.filter(w => w.length > 3 && !stopWords.has(w));
					words.forEach(word => {
						wordFreq[word] = (wordFreq[word] || 0) + 1;
					});
				});

				const topWords = Object.entries(wordFreq)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 25)
					.map(([word, count]) => ({ word, count }));

				// Use Workers AI to generate insights
				const issuesSummary = issues.results.map(i => `- ${i.content}`).join('\n');

				const prompt = `You are a product manager analyzing user feedback. Based on these user complaints and bug reports, write a concise 2-3 sentence summary of the TOP 3 most critical issues that need immediate attention. Be specific and actionable.

Feedback:
${issuesSummary}

Summary of top issues:`;

				const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
					prompt,
					max_tokens: 200,
				});

				const summary = (aiResponse as { response: string }).response.trim();

				return json({
					summary,
					wordCloud: topWords,
					issueCount: issues.results.length,
				});
			}

			// POST /api/vectorize - Generate embeddings for all feedback (one-time setup)
			if (path === '/api/vectorize' && method === 'POST') {
				const allFeedback = await env.DB.prepare(
					'SELECT id, source, content, sentiment, category FROM feedback'
				).all<Feedback>();

				const vectors: { id: string; values: number[]; metadata: Record<string, string> }[] = [];

				for (const item of allFeedback.results) {
					const embeddingResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
						text: item.content,
					});
					const embedding = (embeddingResponse as { data: number[][] }).data[0];

					vectors.push({
						id: item.id,
						values: embedding,
						metadata: {
							source: item.source,
							sentiment: item.sentiment || '',
							category: item.category || '',
						},
					});
				}

				// Upsert in batches of 10
				for (let i = 0; i < vectors.length; i += 10) {
					const batch = vectors.slice(i, i + 10);
					await env.VECTORIZE.upsert(batch);
				}

				return json({ success: true, vectorized: vectors.length });
			}

			return error('Not found', 404);

		} catch (e) {
			console.error('Error:', e);
			return error(`Internal error: ${e instanceof Error ? e.message : 'Unknown'}`, 500);
		}
	},
} satisfies ExportedHandler<Env>;
