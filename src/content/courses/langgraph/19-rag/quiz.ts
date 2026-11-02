import type { Question } from "@/lib/types";

export const quiz: Question[] = [
  {
    id: "lg-rag-why",
    lectures: [19],
    tags: ["rag", "motivation"],
    type: "scenario",
    prompt:
      "Three requests come in for your assistant:\n• A: \"Summarise our Q3 board deck\" (internal, never published).\n• B: \"What changed in the library release that shipped last week?\"\n• C: \"List five papers on topic X with links\" (the model keeps inventing URLs).\nWhich limitation does RAG address in each?",
    fields: [
      { label: "A", options: ["Private data", "Outdated knowledge", "Hallucination", "Context window size"], answer: "Private data" },
      { label: "B", options: ["Private data", "Outdated knowledge", "Hallucination", "Context window size"], answer: "Outdated knowledge" },
      { label: "C", options: ["Private data", "Outdated knowledge", "Hallucination", "Context window size"], answer: "Hallucination" },
    ],
    explanation:
      "The model never saw internal documents (private data), can't know events after its training cutoff (outdated knowledge), and invents plausible details when it lacks facts (hallucination). Supplying the right source text addresses all three.",
    lessonAnchor: "why-models-need-retrieval",
  },
  {
    id: "lg-rag-paste-everything",
    lectures: [19],
    tags: ["rag", "context-window"],
    type: "mcq",
    prompt:
      "A teammate's prototype pastes an entire 600-page manual into every prompt. It errors on some models and is slow and expensive on others. What's the RAG answer?",
    options: [
      "Index the manual and send only the few chunks relevant to each question",
      "Use a model with a bigger context window and keep pasting everything",
      "Summarise the manual into one paragraph and paste that",
      "Fine-tune the model on the manual instead of prompting",
    ],
    answer: "Index the manual and send only the few chunks relevant to each question",
    explanation:
      "In-context learning works, but the context window is finite and every token costs time and money. RAG filters the context to what's relevant. A bigger window postpones the problem, and a one-paragraph summary throws away the details people ask about.",
    lessonAnchor: "in-context-learning",
  },
  {
    id: "lg-rag-pipeline-order",
    lectures: [19],
    tags: ["rag", "pipeline"],
    type: "order",
    prompt: "Put the RAG pipeline in order, from a new PDF to an answer.",
    steps: [
      "Load the PDF into Documents",
      "Split the documents into overlapping chunks",
      "Embed each chunk and store vectors plus text in a vector store",
      "Embed the user's question with the same embedding model",
      "Retrieve the top-k most similar chunks",
      "Send the question plus retrieved chunks to the LLM to generate the answer",
    ],
    explanation:
      "The first three steps are indexing, done once per document. The last three run per question. The question must be embedded with the same model as the chunks, or the similarities are meaningless.",
    lessonAnchor: "how-rag-works",
  },
  {
    id: "lg-rag-chunking",
    lectures: [19],
    tags: ["rag", "chunking"],
    type: "scenario",
    prompt:
      "With chunk_size=8000 and chunk_overlap=0, answers are vague, retrieved chunks cover several unrelated topics, and a key definition is sometimes cut in half between two chunks.",
    fields: [
      {
        label: "chunk_size",
        options: ["Reduce it (e.g. around 1000)", "Increase it to 20000", "Set it to 1", "It doesn't affect retrieval"],
        answer: "Reduce it (e.g. around 1000)",
      },
      {
        label: "chunk_overlap",
        options: ["Add some (e.g. around 200)", "Keep it at 0", "Make it larger than chunk_size", "Overlap only matters for PDFs with images"],
        answer: "Add some (e.g. around 200)",
      },
    ],
    explanation:
      "Huge chunks mix topics, so similarity search is fuzzy and the prompt fills with noise. Overlap means ideas that straddle a boundary appear whole in at least one chunk.",
    lessonAnchor: "building-the-index",
  },
  {
    id: "lg-rag-reembed",
    lectures: [19],
    tags: ["rag", "cost"],
    type: "mcq",
    prompt:
      "Your rag_tool calls PyPDFLoader, splits, and runs FAISS.from_documents inside the tool, so it runs on every question. What's the problem?",
    options: [
      "It re-embeds the whole document on every call, wasting time and money; index once and reuse the retriever",
      "Tools aren't allowed to call FAISS",
      "from_documents only works once per process",
      "Nothing; indexing per question gives fresher results",
    ],
    answer: "It re-embeds the whole document on every call, wasting time and money; index once and reuse the retriever",
    explanation:
      "Indexing calls the embedding model for every chunk. It belongs in an ingest step that runs once per upload. The tool should only call retriever.invoke.",
    lessonAnchor: "building-the-index",
  },
  {
    id: "lg-rag-retriever-k",
    lectures: [19],
    tags: ["rag", "retriever"],
    type: "scenario",
    prompt:
      "You build retriever = vector_store.as_retriever(search_type=\"similarity\", search_kwargs={\"k\": 4}) and call retriever.invoke(\"What is a decision tree?\").",
    fields: [
      { label: "What comes back", options: ["A list of 4 Document objects", "One string with the answer", "4 vectors", "The top chunk only"], answer: "A list of 4 Document objects" },
      { label: "Where the text is", options: ["doc.page_content", "doc.metadata", "doc.id", "doc.vector"], answer: "doc.page_content" },
      { label: "What lets you cite the page", options: ["doc.metadata", "doc.page_content", "search_type", "The embedding model"], answer: "doc.metadata" },
    ],
    explanation:
      "Retrievers return Documents, not answers. page_content holds the chunk text for the prompt, and metadata (source, page) lets the model or UI cite where it came from.",
    lessonAnchor: "the-retriever",
  },
  {
    id: "lg-rag-as-tool",
    lectures: [19],
    tags: ["rag", "agents"],
    type: "mcq",
    prompt:
      "Your graph runs retrieval on every message: START → retrieve → generate. Users complain that \"hi\" is slow, and stock-price questions get answers padded with irrelevant textbook passages. What design fixes both?",
    options: [
      "Wrap the retriever in a tool so the model decides when to retrieve",
      "Lower k to 1",
      "Add a second retrieve node in parallel",
      "Cache the retriever output in the checkpointer",
    ],
    answer: "Wrap the retriever in a tool so the model decides when to retrieve",
    explanation:
      "As a tool, retrieval only happens when the question needs the document, and the model writes the search query. Lowering k still searches on every message and still injects irrelevant text.",
    lessonAnchor: "retrieval-as-a-tool",
  },
  {
    id: "lg-rag-debug-trace",
    lectures: [19],
    tags: ["rag", "langsmith"],
    type: "scenario",
    prompt:
      "A user asks about the refund window and gets \"30 days\"; the policy says 14. In LangSmith, the rag_tool output contains four chunks about shipping times and none mention refunds.",
    fields: [
      {
        label: "Failure type",
        options: ["Retrieval: the right passage wasn't returned", "Generation: the model misread the right passage", "Checkpointing", "Tool routing"],
        answer: "Retrieval: the right passage wasn't returned",
      },
      {
        label: "Worth checking first",
        options: [
          "The query the model wrote, chunking and k",
          "The model's temperature",
          "The Streamlit stream filter",
          "The recursion limit",
        ],
        answer: "The query the model wrote, chunking and k",
      },
    ],
    explanation:
      "If the correct passage never reached the model, no prompt tweak will fix the answer. Look at the search query, how the document was chunked and how many results come back. A misread of a correct chunk would be a generation problem instead.",
    lessonAnchor: "what-the-trace-shows",
  },
  {
    id: "lg-rag-per-thread",
    lectures: [19],
    tags: ["rag", "threads"],
    type: "scenario",
    prompt:
      "In the multi-conversation chatbot, Alice uploads a contract in thread A and Bob uploads a recipe book in thread B. Bob's questions sometimes get contract clauses back, because a single global retriever is replaced on each upload.",
    fields: [
      {
        label: "Storage",
        options: ["Keep one retriever per thread_id", "One global retriever, re-indexed on every question", "Store retrievers in the message history", "Put both PDFs in one index without metadata"],
        answer: "Keep one retriever per thread_id",
      },
      {
        label: "How rag_tool finds the thread",
        options: [
          "Declare a RunnableConfig parameter and read config[\"configurable\"][\"thread_id\"]",
          "Ask the model to pass the thread id as an argument",
          "Parse it from the user's message",
          "Use the most recently uploaded file",
        ],
        answer: "Declare a RunnableConfig parameter and read config[\"configurable\"][\"thread_id\"]",
      },
    ],
    explanation:
      "Each conversation needs its own index (or one shared store filtered by thread metadata). The thread id is already in the run config. An injected RunnableConfig parameter is hidden from the model, so the model can't get it wrong or spoof it.",
    lessonAnchor: "one-document-per-conversation",
  },
  {
    id: "lg-rag-switch-embeddings",
    lectures: [19],
    tags: ["rag", "embeddings"],
    type: "mcq",
    prompt:
      "To cut costs, you switch the query side of your app to a cheaper embedding model but keep the existing index built with the old model. Retrieval quality collapses. Why?",
    options: [
      "Vectors from different embedding models live in different spaces, so similarities are meaningless; re-index with the new model",
      "Cheaper models can't embed questions",
      "The vector store caches old queries",
      "k must be increased whenever the model changes",
    ],
    answer: "Vectors from different embedding models live in different spaces, so similarities are meaningless; re-index with the new model",
    explanation:
      "Similarity search only works when the question and the chunks are embedded by the same model. Changing models means re-embedding the whole corpus; tweaking k can't fix incomparable vectors.",
    lessonAnchor: "what-similarity-means",
  },
  {
    id: "lg-rag-tuning-k",
    lectures: [19],
    tags: ["rag", "tuning"],
    type: "scenario",
    prompt:
      "Your FAQ PDF repeats the same refund paragraph in five sections. With k=4, all four retrieved chunks are copies of that paragraph, and questions that need the exceptions section get incomplete answers.",
    fields: [
      {
        label: "Retrieval change",
        options: ["search_type=\"mmr\" to favour relevant but diverse chunks", "chunk_overlap=0", "k=1", "A bigger chat model"],
        answer: "search_type=\"mmr\" to favour relevant but diverse chunks",
      },
      {
        label: "How to check it worked",
        options: [
          "Run retriever.invoke on known questions and inspect the returned chunks",
          "Ask the model if it's confident",
          "Count the tokens in the final answer",
          "Check the checkpointer size",
        ],
        answer: "Run retriever.invoke on known questions and inspect the returned chunks",
      },
    ],
    explanation:
      "MMR trades a little raw similarity for diversity, so near-duplicates stop crowding out other relevant passages. Retrieval should be evaluated directly on questions with known answers before you touch prompts.",
    lessonAnchor: "tuning-retrieval",
  },
];
