# RAG
Frontend request
  ↓
routers/rag.py
  ↓
schemas/rag.py
  ↓
services/ember_service.py
  ↓
services/ember_planner.py
  ↓
Either:
  ├─ services/ember_data_tools.py
  └─ services/rag_service.py
        ↓
      rag/retrieval.py
        ↓
      Supabase pgvector + full text search
        ↓
      OpenAI answer generation